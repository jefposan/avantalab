import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { autorizarEmpresa } from '../route';
import { descriptografarSegredoRepP } from '@/app/lib/rep-p-cofre';
import { assinarCadesDestacado } from '@/app/lib/rep-p-afd';
import { gerarAej, type AejMarcacao } from '@/app/lib/rep-p-aej';
import { APP_VERSION } from '@/app/lib/version';

export const runtime = 'nodejs';
const erro = (mensagem: string, status = 400) => NextResponse.json({ erro: true, mensagem }, { status });
const dataValida = (valor: string | null) => Boolean(valor && /^\d{4}-\d{2}-\d{2}$/.test(valor));

function minutosEntre(inicio: string, fim: string, intervalo: number) {
  const [hi, mi] = inicio.slice(0, 5).split(':').map(Number); const [hf, mf] = fim.slice(0, 5).split(':').map(Number);
  let total = hf * 60 + mf - (hi * 60 + mi); if (total <= 0) total += 1440;
  return Math.max(1, total - intervalo);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url); const empresaId = url.searchParams.get('empresaId'); const inicio = url.searchParams.get('inicio'); const fim = url.searchParams.get('fim');
    if (!empresaId || !dataValida(inicio) || !dataValida(fim) || inicio! > fim!) return erro('Informe a empresa e um intervalo de datas válido.');
    const contexto = await autorizarEmpresa(request, empresaId);
    if (!contexto) return erro('Acesso não autorizado para esta empresa.', 403);
    const { db, solicitante } = contexto;
    const [{ data: empresa }, { data: perfil }, { data: configuracao }, { data: certificado }, { data: registros }, { data: jornadas }, { data: lancamentos }, { data: decisoes }] = await Promise.all([
      db.from('empresas').select('nome').eq('id', empresaId).maybeSingle(),
      db.from('cadastros_perfil').select('tipo_documento, documento, razao_social, nome_fantasia').eq('empresa_id', empresaId).maybeSingle(),
      db.from('rep_p_configuracoes').select('registro_inpi, documento_desenvolvedor').eq('id', 'principal').maybeSingle(),
      db.from('rep_p_certificados').select('modo, validade_fim, arquivo_criptografado, senha_criptografada').eq('ativo', true).maybeSingle(),
      db.from('ponto_registros').select('id, user_id, tipo, registrado_em, dia').eq('empresa_id', empresaId).gte('dia', inicio!).lte('dia', fim!).order('registrado_em'),
      db.from('ponto_jornadas_contratuais').select('*').eq('empresa_id', empresaId).lte('vigencia_inicio', fim!).order('vigencia_inicio', { ascending: false }),
      db.from('ponto_banco_horas_lancamentos').select('*').eq('empresa_id', empresaId).gte('data_referencia', inicio!).lte('data_referencia', fim!).order('data_referencia'),
      db.from('ponto_tratamentos_decisoes').select('ajuste_id').eq('empresa_id', empresaId).eq('decisao', 'aprovado').not('ajuste_id', 'is', null),
    ]);
    if (!empresa || !perfil || !configuracao || !certificado) return erro('Configuração REP-P incompleta para gerar o AEJ.', 409);
    if (!configuracao.registro_inpi?.replace(/\D/g, '')) return erro('Cadastre o registro do REP-P no INPI antes de gerar o AEJ.', 409);
    if (certificado.modo === 'producao' && new Date(certificado.validade_fim) < new Date()) return erro('O certificado de produção está vencido.', 409);

    const ajustesIds = (decisoes || []).flatMap((item) => item.ajuste_id ? [item.ajuste_id] : []);
    const ajustesResultado = ajustesIds.length
      ? await db.from('ponto_ajustes').select('*').eq('empresa_id', empresaId).in('id', ajustesIds).gte('data_referencia', inicio!).lte('data_referencia', fim!)
      : { data: [], error: null };
    if (ajustesResultado.error) throw ajustesResultado.error;
    const ajustes = ajustesResultado.data || [];
    const ids = [...new Set([...(registros || []).map((item) => item.user_id), ...(lancamentos || []).map((item) => item.funcionario_user_id), ...ajustes.map((item) => item.funcionario_user_id)])];
    const funcionariosResultado = ids.length
      ? await db.from('ponto_funcionarios').select('user_id, nome, cpf, hora_entrada, hora_saida').eq('empresa_id', empresaId).in('user_id', ids)
      : { data: [], error: null };
    if (funcionariosResultado.error) throw funcionariosResultado.error;
    const funcionarios = funcionariosResultado.data || [];
    if (funcionarios.some((item) => !/^\d{11}$/.test(String(item.cpf || '')))) return erro('Há trabalhador no período sem CPF válido; regularize o cadastro antes de gerar o AEJ.', 409);
    const funcionarioPorId = new Map(funcionarios.map((item, indice) => [item.user_id, { ...item, vinculoId: indice + 1 }]));

    type JornadaAej = { id: string; funcionario_user_id: string; vigencia_inicio: string; vigencia_fim: string | null; hora_entrada: string | null; hora_saida: string | null; intervalo_minutos: number | null; duracao_minutos: number | null; matricula_esocial: string | null };
    const jornadasHistoricas = (jornadas || []) as JornadaAej[];
    const jornadaNaData = (funcionarioId: string, data: string): JornadaAej | undefined => {
      const historica = jornadasHistoricas.find((jornada) => jornada.funcionario_user_id === funcionarioId && jornada.vigencia_inicio <= data && (!jornada.vigencia_fim || jornada.vigencia_fim >= data));
      if (historica) return historica;
      const funcionario = funcionarioPorId.get(funcionarioId);
      if (!funcionario?.hora_entrada || !funcionario.hora_saida) return undefined;
      return { id: `cadastro-${funcionarioId}`, funcionario_user_id: funcionarioId, vigencia_inicio: '0001-01-01', vigencia_fim: null, hora_entrada: funcionario.hora_entrada, hora_saida: funcionario.hora_saida, intervalo_minutos: 0, duracao_minutos: null, matricula_esocial: null };
    };
    const funcionariosComMarcacao = new Set([...(registros || []).map((item) => item.user_id), ...ajustes.map((item) => item.funcionario_user_id)]);
    if ([...(registros || []), ...ajustes].some((item) => !jornadaNaData(item.user_id || item.funcionario_user_id, item.dia || item.data_referencia))) return erro('Há marcação ou tratamento aprovado sem jornada contratual vigente na respectiva data.', 409);
    const jornadasUsadas = new Map<string, JornadaAej>();
    for (const registro of registros || []) { const jornada = jornadaNaData(registro.user_id, registro.dia); if (jornada) jornadasUsadas.set(jornada.id, jornada); }
    for (const ajuste of ajustes) { const jornada = jornadaNaData(ajuste.funcionario_user_id, ajuste.data_referencia); if (jornada) jornadasUsadas.set(jornada.id, jornada); }
    const codigoJornada = (jornada: JornadaAej) => `H${String(jornada.id).replace(/-/g, '').slice(0, 24)}`;
    const horarios = [...jornadasUsadas.values()].flatMap((jornada) => {
      if (!jornada.hora_entrada || !jornada.hora_saida) return [];
      return [{ codigo: codigoJornada(jornada), duracaoMinutos: Number(jornada.duracao_minutos) || minutosEntre(jornada.hora_entrada, jornada.hora_saida, Number(jornada.intervalo_minutos || 0)), pares: [{ entrada: jornada.hora_entrada, saida: jornada.hora_saida }] }];
    });

    const marcacoes: AejMarcacao[] = []; const contadores = new Map<string, { entrada: number; saida: number }>();
    for (const registro of registros || []) {
      const funcionario = funcionarioPorId.get(registro.user_id); if (!funcionario) continue;
      const chave = `${registro.user_id}:${registro.dia}`; const contador = contadores.get(chave) || { entrada: 0, saida: 0 };
      const entrada = registro.tipo === 'entrada' || registro.tipo === 'retorno_refeicao';
      if (entrada) contador.entrada += 1; else contador.saida += 1; contadores.set(chave, contador);
      const sequencia = entrada ? contador.entrada : Math.max(1, contador.saida);
      const jornada = jornadaNaData(registro.user_id, registro.dia); if (!jornada) continue;
      marcacoes.push({ vinculoId: funcionario.vinculoId, dataHora: registro.registrado_em, repId: 1, tipo: entrada ? 'E' : 'S', sequencia, fonte: 'O', codigoHorario: entrada && sequencia === 1 ? codigoJornada(jornada) : undefined });
    }
    for (const ajuste of ajustes) {
      const funcionario = funcionarioPorId.get(ajuste.funcionario_user_id); if (!funcionario) continue;
      const proposto = (ajuste.dados_propostos || {}) as Record<string, unknown>; const hora = String(proposto.horario || '');
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) continue;
      const entrada = String(proposto.tipoMarcacao || 'entrada') === 'entrada'; const sequencia = Math.max(1, Number(proposto.sequencia || 1));
      const jornada = jornadaNaData(ajuste.funcionario_user_id, ajuste.data_referencia); if (!jornada) continue;
      marcacoes.push({ vinculoId: funcionario.vinculoId, dataHora: `${ajuste.data_referencia}T${hora}:00-03:00`, tipo: ajuste.tipo === 'desconsideracao' ? 'D' : entrada ? 'E' : 'S', sequencia, fonte: 'I', codigoHorario: entrada && sequencia === 1 ? codigoJornada(jornada) : undefined, motivo: ajuste.motivo });
    }
    marcacoes.sort((a, b) => a.dataHora.localeCompare(b.dataHora));

    const documento = String(perfil.documento || '').replace(/\D/g, ''); const documentoDesenvolvedor = String(configuracao.documento_desenvolvedor || '').replace(/\D/g, '');
    const arquivo = gerarAej({
      empregador: { tipoDocumento: perfil.tipo_documento === 'cpf' ? 'cpf' : 'cnpj', documento, razaoSocial: perfil.razao_social || perfil.nome_fantasia || empresa.nome }, inicio: inicio!, fim: fim!, geradoEm: new Date().toISOString(), reps: [{ id: 1, tipo: 3, numero: configuracao.registro_inpi }],
      vinculos: funcionarios.map((item, indice) => ({ id: indice + 1, cpf: item.cpf || '', nome: item.nome, matriculaEsocial: jornadasHistoricas.find((jornada) => jornada.funcionario_user_id === item.user_id)?.matricula_esocial || undefined })), horarios, marcacoes,
      movimentos: (lancamentos || []).flatMap((item) => { const funcionario = funcionarioPorId.get(item.funcionario_user_id); return funcionario ? [{ vinculoId: funcionario.vinculoId, tipo: 3 as const, data: item.data_referencia, minutos: Math.abs(Number(item.minutos)), movimentoBanco: Number(item.minutos) >= 0 ? 1 as const : 2 as const }] : []; }),
      ptrp: { nome: 'AvantaLab Gestão', versao: APP_VERSION.slice(0, 8), tipoDocumentoDesenvolvedor: documentoDesenvolvedor.length === 11 ? 'cpf' : 'cnpj', documentoDesenvolvedor, nomeDesenvolvedor: process.env.REP_P_DESENVOLVEDOR_NOME || 'AvantaLab', emailDesenvolvedor: process.env.REP_P_DESENVOLVEDOR_EMAIL || 'suporte@avantalab.com.br' },
    });
    const p7s = assinarCadesDestacado(arquivo, descriptografarSegredoRepP(certificado.arquivo_criptografado), descriptografarSegredoRepP(certificado.senha_criptografada).toString('utf8'));
    const prefixo = certificado.modo === 'homologacao' ? 'HOMOLOGACAO-' : ''; const nomeTxt = `${prefixo}AEJ-${documento}-${inicio}-${fim}.txt`;
    const zip = new JSZip(); zip.file(nomeTxt, arquivo); zip.file(`${nomeTxt}.p7s`, p7s); const conteudo = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const arquivoNome = nomeTxt.replace(/\.txt$/, '.zip'); const documentoId = randomUUID(); const storagePath = `${empresaId}/${documentoId}/${arquivoNome}`;
    const { error: erroUpload } = await db.storage.from('rep-p-documentos').upload(storagePath, conteudo, { contentType: 'application/zip', upsert: false }); if (erroUpload) throw erroUpload;
    const { error: erroDocumento } = await db.from('rep_p_documentos_gerados').insert({ id: documentoId, empresa_id: empresaId, tipo: 'aej', periodo_inicio: inicio, periodo_fim: fim, arquivo_nome: arquivoNome, storage_path: storagePath, sha256: createHash('sha256').update(conteudo).digest('hex'), modo: certificado.modo, solicitado_por: solicitante });
    if (erroDocumento) { await db.storage.from('rep-p-documentos').remove([storagePath]); throw erroDocumento; }
    await db.from('rep_p_documentos_auditoria').insert({ documento_id: documentoId, empresa_id: empresaId, ator_user_id: solicitante, evento: 'gerado' });
    return new NextResponse(new Uint8Array(conteudo), { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${arquivoNome}"`, 'Cache-Control': 'private, no-store', 'X-REP-P-Modo': certificado.modo } });
  } catch (causa) { console.error('Erro ao gerar AEJ REP-P:', causa instanceof Error ? causa.message : causa); return erro(causa instanceof Error ? causa.message : 'Não foi possível gerar o AEJ.', 500); }
}
