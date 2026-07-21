import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { autorizarEmpresa } from '@/app/api/ponto/documentos-rep-p/route';

export const runtime = 'nodejs';
const BUCKET = 'ponto-comprovantes';
const MIME_PERMITIDOS = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const LIMITE_ANEXO = 5 * 1024 * 1024;
const erro = (mensagem: string, status = 400) => NextResponse.json({ erro: true, mensagem }, { status });
const dataValida = (valor: unknown) => typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(`${valor}T12:00:00Z`));
const horaValida = (valor: unknown) => typeof valor === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
const texto = (valor: unknown, maximo: number) => String(valor || '').trim().slice(0, maximo);

function nomeSeguro(nome: string) { return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(-120) || 'comprovante'; }
function arquivoConfereConteudo(arquivo: Buffer, mime: string) {
  if (mime === 'application/pdf') return arquivo.subarray(0, 5).toString('ascii') === '%PDF-';
  if (mime === 'image/png') return arquivo.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return arquivo.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
}
async function lerCorpo(request: Request) {
  if (!request.headers.get('content-type')?.includes('multipart/form-data')) return { corpo: await request.json() as Record<string, unknown>, arquivo: null as File | null };
  const formulario = await request.formData(); const corpo: Record<string, unknown> = {};
  for (const [chave, valor] of formulario.entries()) if (typeof valor === 'string') corpo[chave] = valor;
  if (typeof corpo.dadosPropostos === 'string') try { corpo.dadosPropostos = JSON.parse(corpo.dadosPropostos); } catch { corpo.dadosPropostos = {}; }
  const anexo = formulario.get('anexo'); return { corpo, arquivo: anexo instanceof File && anexo.size ? anexo : null };
}
function situacaoAtual(item: Record<string, unknown>, decisoes: Array<Record<string, unknown>>, campo: 'ajuste_id' | 'abono_id') {
  const decisao = decisoes.filter((registro) => registro[campo] === item.id).sort((a, b) => String(b.decidido_em).localeCompare(String(a.decidido_em)))[0] || null;
  return { ...item, situacao: decisao?.decisao || 'pendente', decisao };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url); const empresaId = url.searchParams.get('empresaId'); if (!empresaId) return erro('Empresa não informada.');
    const contexto = await autorizarEmpresa(request, empresaId); if (!contexto) return erro('Acesso não autorizado.', 403);
    const anexoId = url.searchParams.get('anexoId'); const anexoTipo = url.searchParams.get('anexoTipo');
    if (anexoId && (anexoTipo === 'ajuste' || anexoTipo === 'abono')) {
      const tabela = anexoTipo === 'ajuste' ? 'ponto_ajustes' : 'ponto_abonos'; const { data: tratamento, error } = await contexto.db.from(tabela).select('comprovante_path').eq('empresa_id', empresaId).eq('id', anexoId).maybeSingle();
      if (error) throw error; if (!tratamento?.comprovante_path) return erro('Este tratamento não possui comprovante.', 404);
      const { data: arquivo, error: erroArquivo } = await contexto.db.storage.from(BUCKET).download(tratamento.comprovante_path); if (erroArquivo || !arquivo) throw erroArquivo || new Error('Comprovante indisponível.');
      return new NextResponse(arquivo, { headers: { 'Content-Type': arquivo.type || 'application/octet-stream', 'Content-Disposition': `attachment; filename="${nomeSeguro(tratamento.comprovante_path.split('/').at(-1) || 'comprovante')}"`, 'Cache-Control': 'private, no-store' } });
    }
    const [ajustes, abonos, decisoes, regras, lancamentos, jornadas] = await Promise.all([
      contexto.db.from('ponto_ajustes').select('*').eq('empresa_id', empresaId).order('solicitado_em', { ascending: false }),
      contexto.db.from('ponto_abonos').select('*').eq('empresa_id', empresaId).order('solicitado_em', { ascending: false }),
      contexto.db.from('ponto_tratamentos_decisoes').select('*').eq('empresa_id', empresaId).order('decidido_em', { ascending: false }),
      contexto.db.from('ponto_banco_horas_regras').select('*').eq('empresa_id', empresaId).order('vigencia_inicio', { ascending: false }),
      contexto.db.from('ponto_banco_horas_lancamentos').select('*').eq('empresa_id', empresaId).order('data_referencia', { ascending: false }),
      contexto.db.from('ponto_jornadas_contratuais').select('*').eq('empresa_id', empresaId).order('vigencia_inicio', { ascending: false }),
    ]);
    const falha = [ajustes, abonos, decisoes, regras, lancamentos, jornadas].find((resultado) => resultado.error)?.error; if (falha) throw falha;
    const eventos = (decisoes.data || []) as Array<Record<string, unknown>>;
    const saldoPorFuncionario = (lancamentos.data || []).reduce<Record<string, number>>((saldos, item) => { saldos[item.funcionario_user_id] = (saldos[item.funcionario_user_id] || 0) + Number(item.minutos || 0); return saldos; }, {});
    return NextResponse.json({ ajustes: (ajustes.data || []).map((item) => situacaoAtual(item, eventos, 'ajuste_id')), abonos: (abonos.data || []).map((item) => situacaoAtual(item, eventos, 'abono_id')), regras: regras.data || [], lancamentos: lancamentos.data || [], jornadas: jornadas.data || [], saldoPorFuncionario }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (causa) { console.error('Erro ao consultar tratamentos de ponto:', causa instanceof Error ? causa.message : causa); return erro('Não foi possível consultar os tratamentos.', 500); }
}

export async function POST(request: Request) {
  let comprovantePath: string | null = null; let dbParaLimpeza: Awaited<ReturnType<typeof autorizarEmpresa>> = null;
  try {
    const { corpo, arquivo } = await lerCorpo(request); const empresaId = texto(corpo.empresaId, 60); const contexto = await autorizarEmpresa(request, empresaId);
    if (!contexto) return erro('Acesso não autorizado.', 403); dbParaLimpeza = contexto; const { db, solicitante } = contexto; const acao = texto(corpo.acao, 30); const funcionarioId = texto(corpo.funcionarioId, 60);
    if (funcionarioId) { const { data: funcionario, error } = await db.from('ponto_funcionarios').select('user_id').eq('empresa_id', empresaId).eq('user_id', funcionarioId).maybeSingle(); if (error) throw error; if (!funcionario) return erro('Funcionário não pertence a esta empresa.', 404); }

    if (acao === 'decidir') {
      const decisao = texto(corpo.decisao, 10); if (!['aprovado', 'recusado', 'cancelado'].includes(decisao)) return erro('Decisão inválida.');
      const ajusteId = texto(corpo.ajusteId, 60); const abonoId = texto(corpo.abonoId, 60); if ((!ajusteId && !abonoId) || (ajusteId && abonoId)) return erro('Informe um único tratamento para decidir.');
      const tabela = ajusteId ? 'ponto_ajustes' : 'ponto_abonos'; const id = ajusteId || abonoId; const campo = ajusteId ? 'ajuste_id' : 'abono_id';
      const { data: tratamento, error: erroTratamento } = await db.from(tabela).select('id').eq('empresa_id', empresaId).eq('id', id).maybeSingle(); if (erroTratamento) throw erroTratamento; if (!tratamento) return erro('Tratamento não encontrado.', 404);
      const { data: anteriores, error: erroAnteriores } = await db.from('ponto_tratamentos_decisoes').select('decisao, decidido_em').eq('empresa_id', empresaId).eq(campo, id).order('decidido_em', { ascending: false }).limit(1); if (erroAnteriores) throw erroAnteriores;
      const atual = anteriores?.[0]?.decisao || 'pendente'; const motivo = texto(corpo.motivo, 500);
      if ((decisao === 'recusado' || decisao === 'cancelado') && !motivo) return erro('Informe o motivo da decisão.');
      if (atual === 'cancelado' || (atual !== 'pendente' && decisao !== 'cancelado')) return erro('O tratamento já possui uma decisão final.', 409);
      const chave = ajusteId ? { ajuste_id: ajusteId, abono_id: null } : { ajuste_id: null, abono_id: abonoId };
      const { error } = await db.from('ponto_tratamentos_decisoes').insert({ empresa_id: empresaId, ...chave, decisao, motivo: motivo || 'Aprovação registrada.', decidido_por: solicitante }); if (error) throw error;
      return NextResponse.json({ erro: false });
    }

    if (acao === 'ajuste' || acao === 'abono') {
      if (!funcionarioId || !texto(corpo.motivo, 500)) return erro('Informe funcionário e motivo.'); const dataReferencia = texto(corpo.dataReferencia || corpo.dataInicio, 10); const dataFim = texto(corpo.dataFim || dataReferencia, 10);
      if (!dataValida(dataReferencia) || !dataValida(dataFim) || dataReferencia > dataFim) return erro('Informe um período válido.');
      const tipoAjuste = texto(corpo.tipo, 30); if (acao === 'ajuste' && !['inclusao', 'desconsideracao', 'correcao'].includes(tipoAjuste)) return erro('Tipo de ajuste inválido.');
      const minutosAbonados = Number(corpo.minutosAbonados || 0); if (acao === 'abono' && (!Number.isInteger(minutosAbonados) || minutosAbonados <= 0)) return erro('Informe os minutos abonados.');
      if (!arquivo && acao === 'abono') return erro('Anexe o comprovante do abono em PDF, JPG ou PNG.');
      if (arquivo) { if (arquivo.size > LIMITE_ANEXO) return erro('O comprovante deve ter no máximo 5 MB.', 413); if (!MIME_PERMITIDOS.has(arquivo.type)) return erro('Envie o comprovante em PDF, JPG ou PNG.'); const binario = Buffer.from(await arquivo.arrayBuffer()); if (!arquivoConfereConteudo(binario, arquivo.type)) return erro('O conteúdo do comprovante não corresponde ao formato informado.'); comprovantePath = `${empresaId}/${randomUUID()}-${nomeSeguro(arquivo.name)}`; const { error } = await db.storage.from(BUCKET).upload(comprovantePath, binario, { contentType: arquivo.type, upsert: false }); if (error) throw error; }
      if (acao === 'ajuste') {
        const dadosPropostos = typeof corpo.dadosPropostos === 'object' && corpo.dadosPropostos ? corpo.dadosPropostos as Record<string, unknown> : {}; const horario = dadosPropostos.horario; const tipoMarcacao = dadosPropostos.tipoMarcacao;
        if ((tipoAjuste === 'inclusao' || tipoAjuste === 'correcao') && (!horaValida(horario) || !['entrada', 'saida'].includes(String(tipoMarcacao)))) return erro('Informe horário e tipo de marcação válidos.');
        const registroOriginalId = texto(corpo.registroOriginalId, 60) || null; if ((tipoAjuste === 'desconsideracao' || tipoAjuste === 'correcao') && !registroOriginalId) return erro('Informe a marcação original para desconsiderar ou corrigir.');
        const { error } = await db.from('ponto_ajustes').insert({ empresa_id: empresaId, funcionario_user_id: funcionarioId, registro_original_id: registroOriginalId, data_referencia: dataReferencia, tipo: tipoAjuste, dados_propostos: dadosPropostos, motivo: texto(corpo.motivo, 500), comprovante_path: comprovantePath, solicitado_por: solicitante }); if (error) throw error;
      } else { const { error } = await db.from('ponto_abonos').insert({ empresa_id: empresaId, funcionario_user_id: funcionarioId, data_inicio: dataReferencia, data_fim: dataFim, minutos_abonados: minutosAbonados, tipo: texto(corpo.tipo, 60) || 'abono_justificado', motivo: texto(corpo.motivo, 500), comprovante_path: comprovantePath, solicitado_por: solicitante }); if (error) throw error; }
      return NextResponse.json({ erro: false });
    }

    if (acao === 'jornada') {
      if (!funcionarioId || !dataValida(corpo.vigenciaInicio) || !horaValida(corpo.horaEntrada) || !horaValida(corpo.horaSaida)) return erro('Informe funcionário, vigência e horários válidos.');
      const intervalo = Number(corpo.intervaloMinutos || 0); const dias = Array.isArray(corpo.diasTrabalho) ? corpo.diasTrabalho.map(Number) : []; if (!Number.isInteger(intervalo) || intervalo < 0 || intervalo > 720 || new Set(dias).size !== dias.length || dias.some((dia) => !Number.isInteger(dia) || dia < 0 || dia > 6)) return erro('Jornada inválida.');
      const { data: conflito, error: erroConflito } = await db.from('ponto_jornadas_contratuais').select('id').eq('empresa_id', empresaId).eq('funcionario_user_id', funcionarioId).lte('vigencia_inicio', corpo.vigenciaFim || '9999-12-31').or(`vigencia_fim.is.null,vigencia_fim.gte.${corpo.vigenciaInicio}`).limit(1); if (erroConflito) throw erroConflito; if (conflito?.length) return erro('Já existe jornada contratual sobreposta para este funcionário.', 409);
      const { error } = await db.from('ponto_jornadas_contratuais').insert({ empresa_id: empresaId, funcionario_user_id: funcionarioId, vigencia_inicio: corpo.vigenciaInicio, vigencia_fim: corpo.vigenciaFim || null, dias_trabalho: dias, hora_entrada: corpo.horaEntrada, hora_saida: corpo.horaSaida, intervalo_minutos: intervalo, duracao_minutos: corpo.duracaoMinutos || null, matricula_esocial: texto(corpo.matriculaEsocial, 30) || null, criado_por: solicitante }); if (error) throw error; return NextResponse.json({ erro: false });
    }

    if (acao === 'banco_regra') { const prazo = Number(corpo.prazoCompensacaoDias); const limite = corpo.limiteMinutos === '' || corpo.limiteMinutos == null ? null : Number(corpo.limiteMinutos); if (!texto(corpo.nome, 120) || !dataValida(corpo.vigenciaInicio) || !texto(corpo.acordoReferencia, 200) || !Number.isInteger(prazo) || prazo < 1 || prazo > 365 || (limite != null && (!Number.isInteger(limite) || limite <= 0))) return erro('Informe a regra, instrumento, prazo de compensação e limite válidos.'); const { error } = await db.from('ponto_banco_horas_regras').insert({ empresa_id: empresaId, nome: texto(corpo.nome, 120), vigencia_inicio: corpo.vigenciaInicio, vigencia_fim: corpo.vigenciaFim || null, acordo_referencia: texto(corpo.acordoReferencia, 200), prazo_compensacao_dias: prazo, limite_minutos: limite, criado_por: solicitante }); if (error) throw error; return NextResponse.json({ erro: false }); }
    if (acao === 'banco_lancamento') { const dataReferencia = texto(corpo.dataReferencia, 10); const minutosInformados = Number(corpo.minutos); const natureza = texto(corpo.natureza, 30); if (!funcionarioId || !dataValida(dataReferencia) || !Number.isInteger(minutosInformados) || minutosInformados === 0 || !texto(corpo.motivo, 500) || !['saldo_inicial', 'credito', 'debito', 'compensacao', 'ajuste'].includes(natureza)) return erro('Informe um lançamento de banco de horas válido.'); const { data: regras, error: erroRegras } = await db.from('ponto_banco_horas_regras').select('*').eq('empresa_id', empresaId).eq('ativo', true).lte('vigencia_inicio', dataReferencia).or(`vigencia_fim.is.null,vigencia_fim.gte.${dataReferencia}`).order('vigencia_inicio', { ascending: false }).limit(1); if (erroRegras) throw erroRegras; if (!regras?.[0]) return erro('Cadastre uma regra de banco de horas vigente antes de lançar movimentos.', 409); const regra = regras[0]; const minutos = ['debito', 'compensacao'].includes(natureza) ? -Math.abs(minutosInformados) : natureza === 'credito' ? Math.abs(minutosInformados) : minutosInformados; const { data: existentes, error: erroExistentes } = await db.from('ponto_banco_horas_lancamentos').select('minutos').eq('empresa_id', empresaId).eq('funcionario_user_id', funcionarioId).eq('regra_id', regra.id); if (erroExistentes) throw erroExistentes; const saldo = (existentes || []).reduce((total, item) => total + Number(item.minutos), 0) + minutos; if (regra.limite_minutos && Math.abs(saldo) > Number(regra.limite_minutos)) return erro('O lançamento ultrapassa o limite previsto na regra de banco de horas.', 409); const { error } = await db.from('ponto_banco_horas_lancamentos').insert({ empresa_id: empresaId, funcionario_user_id: funcionarioId, regra_id: regra.id, data_referencia: dataReferencia, minutos, natureza, origem: 'manual', motivo: texto(corpo.motivo, 500), criado_por: solicitante }); if (error) throw error; return NextResponse.json({ erro: false }); }
    return erro('Ação de tratamento inválida.');
  } catch (causa) { if (comprovantePath && dbParaLimpeza) await dbParaLimpeza.db.storage.from(BUCKET).remove([comprovantePath]); console.error('Erro no tratamento de ponto:', causa instanceof Error ? causa.message : causa); return erro(causa instanceof Error ? causa.message : 'Não foi possível registrar o tratamento.', 500); }
}
