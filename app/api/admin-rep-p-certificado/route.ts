import { NextResponse } from 'next/server';
import { exigirAdmin } from '@/app/lib/admin-server';
import { criptografarSegredoRepP, impressaoCertificadoRepP } from '@/app/lib/rep-p-cofre';
import { diagnosticarCertificadoA1, lerMetadadosCertificadoA1 } from '@/app/lib/rep-p-assinatura';

export const runtime = 'nodejs';

function erro(mensagem: string, status = 400) { return NextResponse.json({ erro: true, mensagem }, { status }); }
function resumo(linha: { id: string; modo: 'homologacao' | 'producao'; validade_inicio: string; validade_fim: string; impressao_sha256: string; criado_em: string } | null) {
  if (!linha) return null;
  return { id: linha.id, modo: linha.modo, validadeInicio: linha.validade_inicio, validadeFim: linha.validade_fim, impressaoSha256: linha.impressao_sha256, criadoEm: linha.criado_em };
}

export async function GET(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return erro('Acesso não autorizado.', 401);
    const [{ data, error }, { data: configuracao, error: erroConfiguracao }] = await Promise.all([
      db.from('rep_p_certificados').select('id, modo, validade_inicio, validade_fim, impressao_sha256, criado_em').eq('ativo', true).maybeSingle(),
      db.from('rep_p_configuracoes').select('registro_inpi, documento_desenvolvedor').eq('id', 'principal').maybeSingle(),
    ]);
    if (error && error.code !== '42P01' && error.code !== 'PGRST205') throw error;
    if (erroConfiguracao && erroConfiguracao.code !== '42P01' && erroConfiguracao.code !== 'PGRST205') throw erroConfiguracao;
    return NextResponse.json({ erro: false, certificado: resumo(data as never), configuracao: configuracao || { registro_inpi: '', documento_desenvolvedor: '' } });
  } catch (causa) {
    console.error('Erro ao consultar certificado REP-P:', causa);
    return erro('Não foi possível consultar o certificado. Execute a migração do REP-P.', 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return erro('Acesso não autorizado.', 401);
    const corpo = await request.json();
    const registroInpi = String(corpo?.registroInpi || '').replace(/\D/g, '').slice(0, 17);
    const documentoDesenvolvedor = String(corpo?.documentoDesenvolvedor || '').replace(/\D/g, '');
    if (!registroInpi) return erro('Informe o número de registro no INPI.');
    if (![11, 14].includes(documentoDesenvolvedor.length)) return erro('Informe o CPF ou CNPJ do desenvolvedor do REP-P.');
    const { error } = await db.from('rep_p_configuracoes').upsert({ id: 'principal', registro_inpi: registroInpi, documento_desenvolvedor: documentoDesenvolvedor, atualizado_em: new Date().toISOString() });
    if (error) throw error;
    return NextResponse.json({ erro: false, configuracao: { registro_inpi: registroInpi, documento_desenvolvedor: documentoDesenvolvedor } });
  } catch (causa) { console.error('Erro ao salvar configuração REP-P:', causa); return erro('Não foi possível guardar a configuração do AFD.', 500); }
}

export async function POST(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return erro('Acesso não autorizado.', 401);
    const formulario = await request.formData();
    const arquivo = formulario.get('certificado');
    const senha = String(formulario.get('senha') || '');
    const modo = formulario.get('modo') === 'producao' ? 'producao' : 'homologacao';
    if (!(arquivo instanceof File) || arquivo.size === 0) return erro('Selecione o certificado A1 (.pfx ou .p12).');
    if (arquivo.size > 2 * 1024 * 1024) return erro('O certificado excede o limite de 2 MB.');
    if (!/\.(pfx|p12)$/i.test(arquivo.name)) return erro('Envie um arquivo A1 .pfx ou .p12.');
    if (!senha) return erro('Informe a senha do certificado.');

    const binario = Buffer.from(await arquivo.arrayBuffer());
    const diagnostico = diagnosticarCertificadoA1(binario, senha);
    const metadados = lerMetadadosCertificadoA1(binario, senha);
    if (diagnostico.situacao === 'invalido' || !metadados) return erro('Não foi possível ler o certificado. Confira o arquivo e a senha.');
    if (modo === 'producao' && diagnostico.situacao !== 'valido') return erro('Somente certificado vigente pode ser cadastrado em produção.');

    const impressaoSha256 = impressaoCertificadoRepP(binario);
    const { data: novo, error: erroNovo } = await db.from('rep_p_certificados').insert({
      modo,
      arquivo_criptografado: criptografarSegredoRepP(binario),
      senha_criptografada: criptografarSegredoRepP(Buffer.from(senha, 'utf8')),
      impressao_sha256: impressaoSha256,
      validade_inicio: metadados.validadeInicio,
      validade_fim: metadados.validadeFim,
      ativo: false,
    }).select('id, modo, validade_inicio, validade_fim, impressao_sha256, criado_em').single();
    if (erroNovo || !novo) throw erroNovo || new Error('Certificado não gravado.');

    const { data: anterior } = await db.from('rep_p_certificados').select('id').eq('ativo', true).maybeSingle();
    if (anterior) await db.from('rep_p_certificados').update({ ativo: false, substituido_em: new Date().toISOString() }).eq('id', anterior.id);
    const { error: erroAtivar } = await db.from('rep_p_certificados').update({ ativo: true }).eq('id', novo.id);
    if (erroAtivar) throw erroAtivar;
    await db.from('rep_p_certificados_auditoria').insert({ certificado_id: novo.id, evento: anterior ? 'certificado_substituido' : 'certificado_cadastrado', modo, validade_fim: metadados.validadeFim, impressao_sha256: impressaoSha256 });
    return NextResponse.json({ erro: false, certificado: resumo(novo as never), situacao: diagnostico.situacao });
  } catch (causa) {
    console.error('Erro ao cadastrar certificado REP-P:', causa instanceof Error ? causa.message : causa);
    return erro(causa instanceof Error && causa.message.includes('chave mestra') ? causa.message : 'Não foi possível guardar o certificado.', 500);
  }
}
