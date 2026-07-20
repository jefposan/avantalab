import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { exigirAdmin } from '@/app/lib/admin-server';
import { descriptografarSegredoRepP } from '@/app/lib/rep-p-cofre';
import { assinarCadesDestacado, gerarAfdRepP } from '@/app/lib/rep-p-afd';

export const runtime = 'nodejs';
const erro = (mensagem: string, status = 400) => NextResponse.json({ erro: true, mensagem }, { status });
const dataValida = (valor: string | null) => Boolean(valor && /^\d{4}-\d{2}-\d{2}$/.test(valor));
const coletor = (dispositivo: unknown) => /android|iphone|ipad|mobile/i.test(String(dispositivo || '')) ? '01' : '02';

export async function GET(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return erro('Acesso não autorizado.', 401);
    const url = new URL(request.url); const empresaId = url.searchParams.get('empresaId'); const inicio = url.searchParams.get('inicio'); const fim = url.searchParams.get('fim');
    if (!empresaId || !dataValida(inicio) || !dataValida(fim) || inicio! > fim!) return erro('Informe a empresa e um intervalo de datas válido.');
    const [{ data: empresa }, { data: perfil }, { data: configuracao }, { data: certificado }] = await Promise.all([
      db.from('empresas').select('nome').eq('id', empresaId).maybeSingle(),
      db.from('cadastros_perfil').select('tipo_documento, documento, razao_social, nome_fantasia').eq('empresa_id', empresaId).maybeSingle(),
      db.from('rep_p_configuracoes').select('registro_inpi, documento_desenvolvedor').eq('id', 'principal').maybeSingle(),
      db.from('rep_p_certificados').select('modo, validade_fim, arquivo_criptografado, senha_criptografada').eq('ativo', true).maybeSingle(),
    ]);
    if (!empresa || !perfil || !configuracao || !certificado) return erro('Configuração REP-P incompleta para gerar o AFD.', 409);
    if (certificado.modo === 'producao' && new Date(certificado.validade_fim) < new Date()) return erro('O certificado de produção está vencido.', 409);
    const registros: Array<{ nsr: number; data_hora: string; criado_em: string; trabalhador_user_id: string; dados_registro: { dispositivo?: string } }> = [];
    for (let inicioPagina = 0; ; inicioPagina += 1000) {
      const { data, error } = await db.from('ponto_arp').select('nsr, data_hora, criado_em, trabalhador_user_id, dados_registro').eq('empresa_id', empresaId).lte('data_hora', `${fim}T23:59:59.999-03:00`).order('nsr').range(inicioPagina, inicioPagina + 999);
      if (error) throw error; registros.push(...(data || []) as typeof registros); if (!data || data.length < 1000) break;
    }
    const ids = [...new Set(registros.map((registro) => registro.trabalhador_user_id))];
    const { data: funcionarios, error: erroFuncionarios } = await db.from('ponto_funcionarios').select('user_id, cpf').eq('empresa_id', empresaId).in('user_id', ids);
    if (erroFuncionarios) throw erroFuncionarios;
    const cpfs = new Map((funcionarios || []).map((funcionario) => [funcionario.user_id, String(funcionario.cpf || '')]));
    if (registros.some((registro) => !/^\d{11}$/.test(cpfs.get(registro.trabalhador_user_id) || ''))) return erro('Há marcações sem CPF do trabalhador disponível; regularize o cadastro antes de gerar o AFD.', 409);
    const arquivo = gerarAfdRepP({ documentoEmpregador: perfil.documento || '', tipoDocumento: perfil.tipo_documento === 'cpf' ? 'cpf' : 'cnpj', nomeEmpregador: perfil.razao_social || perfil.nome_fantasia || empresa.nome, registroInpi: configuracao.registro_inpi, documentoDesenvolvedor: configuracao.documento_desenvolvedor, inicio: inicio!, fim: fim!, registros: registros.map((registro) => ({ nsr: registro.nsr, dataHora: registro.data_hora, gravadoEm: registro.criado_em, cpf: cpfs.get(registro.trabalhador_user_id) || '', coletor: coletor(registro.dados_registro?.dispositivo), offline: false })) });
    const p7s = assinarCadesDestacado(arquivo, descriptografarSegredoRepP(certificado.arquivo_criptografado), descriptografarSegredoRepP(certificado.senha_criptografada).toString('utf8'));
    const prefixo = certificado.modo === 'homologacao' ? 'HOMOLOGACAO-' : ''; const nome = `${prefixo}AFD${configuracao.registro_inpi.replace(/\D/g, '')}${perfil.documento}REP_P.txt`;
    const zip = new JSZip(); zip.file(nome, arquivo); zip.file(`${nome}.p7s`, p7s);
    const conteudo = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return new NextResponse(new Uint8Array(conteudo), { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${nome.replace(/\.txt$/, '')}.zip"`, 'Cache-Control': 'no-store', 'X-REP-P-Modo': certificado.modo } });
  } catch (causa) { console.error('Erro ao gerar AFD REP-P:', causa instanceof Error ? causa.message : causa); return erro(causa instanceof Error ? causa.message : 'Não foi possível gerar o AFD.', 500); }
}
