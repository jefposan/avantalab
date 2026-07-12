import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  ESTADOS_BRASIL,
  REGIMES_TRIBUTARIOS,
  TIPOS_EMPRESA,
  somenteDigitos,
  validarCnpj,
  validarCpf,
} from '../../lib/cadastro-perfil';

export const runtime = 'nodejs';

function texto(valor: unknown, limite = 180) {
  return String(valor || '').trim().replace(/\s+/g, ' ').slice(0, limite);
}

const TIPOS_EMPRESA_VALIDOS = new Set<string>(TIPOS_EMPRESA.map(([valor]) => valor));
const REGIMES_VALIDOS = new Set<string>(REGIMES_TRIBUTARIOS.map(([valor]) => valor));
const ESTADOS_VALIDOS = new Set<string>(ESTADOS_BRASIL);

function normalizarCadastro(cadastro: Record<string, unknown>) {
  return {
    ...cadastro,
    empresa_id: texto(cadastro.empresa_id, 60),
    nome_fantasia: texto(cadastro.nome_fantasia),
    nome_responsavel: texto(cadastro.nome_responsavel),
    razao_social: texto(cadastro.razao_social),
    tipo_documento: cadastro.tipo_documento === 'cpf' ? 'cpf' : 'cnpj',
    documento: somenteDigitos(cadastro.documento, 14),
    tipo_empresa: texto(cadastro.tipo_empresa, 30),
    cep: somenteDigitos(cadastro.cep, 8),
    rua: texto(cadastro.rua),
    numero: texto(cadastro.numero, 30),
    complemento: texto(cadastro.complemento),
    bairro: texto(cadastro.bairro),
    cidade: texto(cadastro.cidade),
    estado: texto(cadastro.estado, 2).toUpperCase(),
    telefone: somenteDigitos(cadastro.telefone, 13),
    whatsapp: somenteDigitos(cadastro.whatsapp, 13),
    email_empresa: texto(cadastro.email_empresa).toLowerCase(),
    site: texto(cadastro.site),
    instagram: texto(cadastro.instagram, 80),
    inscricao_estadual: texto(cadastro.inscricao_estadual, 40),
    inscricao_estadual_isento: cadastro.inscricao_estadual_isento === true,
    inscricao_municipal: texto(cadastro.inscricao_municipal, 40),
    inscricao_municipal_isento: cadastro.inscricao_municipal_isento === true,
    regime_tributario: texto(cadastro.regime_tributario, 40),
    obrigatorio_em: String(cadastro.obrigatorio_em || ''),
    concluido_em: cadastro.concluido_em ? String(cadastro.concluido_em) : null,
  };
}

async function contexto(request: Request, empresaId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!url || !anon || !service || !token || !empresaId) return null;

  const cliente = createClient(url, anon);
  const { data } = await cliente.auth.getUser(token);
  if (!data.user) return null;

  const admin = createClient(url, service);
  const { data: vinculo } = await admin
    .from('usuarios_empresa')
    .select('id, perfil, nome, email, telefone, status')
    .eq('empresa_id', empresaId)
    .eq('user_id', data.user.id)
    .eq('status', 'ativo')
    .limit(1)
    .maybeSingle();
  if (!vinculo) return null;

  return { admin, usuario: data.user, vinculo };
}

function statusCadastro(cadastro: Record<string, unknown>, tipoPerfil: 'empresa' | 'pessoal', podeEditar: boolean) {
  const normalizado = normalizarCadastro(cadastro);
  const agora = Date.now();
  const obrigatorioEm = new Date(normalizado.obrigatorio_em).getTime();
  return {
    cadastro: normalizado,
    completo: Boolean(normalizado.concluido_em),
    obrigatorio: !normalizado.concluido_em && Number.isFinite(obrigatorioEm) && obrigatorioEm <= agora,
    diasRestantes: normalizado.concluido_em ? 0 : Math.max(0, Math.ceil((obrigatorioEm - agora) / 86400000)),
    podeEditar,
    tipoPerfil,
  };
}

export async function GET(request: Request) {
  const empresaId = texto(new URL(request.url).searchParams.get('empresaId'), 60);
  const ctx = await contexto(request, empresaId);
  if (!ctx) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });

  const [{ data: empresa }, { data: assinatura }, { data: cadastroAtual }] = await Promise.all([
    ctx.admin.from('empresas').select('id, nome, tipo_perfil').eq('id', empresaId).maybeSingle(),
    ctx.admin.from('assinaturas').select('cobranca_nome, cobranca_documento, cobranca_email, cobranca_telefone').eq('empresa_id', empresaId).maybeSingle(),
    ctx.admin.from('cadastros_perfil').select('*').eq('empresa_id', empresaId).maybeSingle(),
  ]);
  if (!empresa) return NextResponse.json({ erro: true, mensagem: 'Perfil não encontrado.' }, { status: 404 });

  let cadastro = cadastroAtual;
  if (!cadastro) {
    const { data } = await ctx.admin.from('cadastros_perfil').insert({
      empresa_id: empresaId,
      nome_fantasia: empresa.nome,
      nome_responsavel: ctx.vinculo.nome || ctx.usuario.user_metadata?.nome || '',
      obrigatorio_em: new Date(Date.now() + 7 * 86400000).toISOString(),
    }).select('*').single();
    cadastro = data;
  }
  if (!cadastro) return NextResponse.json({ erro: true, mensagem: 'Não foi possível carregar o cadastro.' }, { status: 500 });

  const tipoPerfil = empresa.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa';
  const documentoCobranca = somenteDigitos(assinatura?.cobranca_documento, 14);
  const preenchido = {
    ...normalizarCadastro(cadastro),
    nome_fantasia: cadastro.nome_fantasia || empresa.nome || '',
    nome_responsavel: cadastro.nome_responsavel || ctx.vinculo.nome || ctx.usuario.user_metadata?.nome || '',
    razao_social: cadastro.razao_social || assinatura?.cobranca_nome || '',
    documento: cadastro.documento || documentoCobranca,
    tipo_documento: cadastro.tipo_documento || (documentoCobranca.length === 11 ? 'cpf' : 'cnpj'),
    telefone: cadastro.telefone || ctx.vinculo.telefone || assinatura?.cobranca_telefone || '',
    whatsapp: cadastro.whatsapp || ctx.vinculo.telefone || assinatura?.cobranca_telefone || '',
    email_empresa: cadastro.email_empresa || assinatura?.cobranca_email || ctx.vinculo.email || ctx.usuario.email || '',
  };

  return NextResponse.json({
    ok: true,
    ...statusCadastro(preenchido, tipoPerfil, ['gestor_master', 'administrador'].includes(ctx.vinculo.perfil || '')),
  });
}

export async function PUT(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = texto(corpo.empresaId, 60);
  const ctx = await contexto(request, empresaId);
  if (!ctx) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });
  if (!['gestor_master', 'administrador'].includes(ctx.vinculo.perfil || '')) {
    return NextResponse.json({ erro: true, mensagem: 'Somente gestores e administradores podem concluir este cadastro.' }, { status: 403 });
  }

  const [{ data: empresa }, { data: cadastroAtual }] = await Promise.all([
    ctx.admin.from('empresas').select('nome, tipo_perfil').eq('id', empresaId).maybeSingle(),
    ctx.admin.from('cadastros_perfil').select('concluido_em').eq('empresa_id', empresaId).maybeSingle(),
  ]);
  if (!empresa) return NextResponse.json({ erro: true, mensagem: 'Perfil não encontrado.' }, { status: 404 });
  const pessoal = empresa.tipo_perfil === 'pessoal';
  const dados = corpo.dados && typeof corpo.dados === 'object' ? corpo.dados : {};
  const tipoEmpresaInformado = texto(dados.tipo_empresa, 30);
  const tipoEmpresa = pessoal ? 'outro' : (TIPOS_EMPRESA_VALIDOS.has(tipoEmpresaInformado) ? tipoEmpresaInformado : '');
  const tipoDocumento = pessoal || tipoEmpresa === 'autonomo' ? 'cpf' : 'cnpj';
  const documento = somenteDigitos(dados.documento, tipoDocumento === 'cpf' ? 11 : 14);
  const concluir = corpo.concluir === true;

  const regimeInformado = texto(dados.regime_tributario, 40);
  const estadoInformado = texto(dados.estado, 2).toUpperCase();
  const valores = {
    nome_fantasia: texto(dados.nome_fantasia || empresa.nome),
    nome_responsavel: texto(dados.nome_responsavel),
    razao_social: texto(dados.razao_social),
    tipo_documento: tipoDocumento,
    documento,
    tipo_empresa: tipoEmpresa,
    cep: somenteDigitos(dados.cep, 8),
    rua: texto(dados.rua),
    numero: texto(dados.numero, 30),
    complemento: texto(dados.complemento),
    bairro: texto(dados.bairro),
    cidade: texto(dados.cidade),
    estado: ESTADOS_VALIDOS.has(estadoInformado) ? estadoInformado : '',
    telefone: somenteDigitos(dados.telefone, 13),
    whatsapp: somenteDigitos(dados.whatsapp, 13),
    email_empresa: texto(dados.email_empresa).toLowerCase(),
    site: texto(dados.site),
    instagram: texto(dados.instagram, 80),
    inscricao_estadual: texto(dados.inscricao_estadual, 40),
    inscricao_estadual_isento: dados.inscricao_estadual_isento === true,
    inscricao_municipal: texto(dados.inscricao_municipal, 40),
    inscricao_municipal_isento: dados.inscricao_municipal_isento === true,
    regime_tributario: pessoal ? 'nao_aplicavel' : (REGIMES_VALIDOS.has(regimeInformado) ? regimeInformado : ''),
    atualizado_em: new Date().toISOString(),
  };

  if (concluir) {
    const faltantes: string[] = [];
    if (!valores.nome_fantasia) faltantes.push('Nome Fantasia');
    if (!valores.nome_responsavel) faltantes.push(pessoal ? 'Nome completo' : 'Responsável');
    if (!pessoal && !valores.razao_social) faltantes.push('Razão Social');
    if (!pessoal && !valores.tipo_empresa) faltantes.push('Tipo de Empresa');
    if (tipoDocumento === 'cpf' ? !validarCpf(documento) : !validarCnpj(documento)) faltantes.push(tipoDocumento.toUpperCase());
    if (!valores.cep || !valores.rua || !valores.numero || !valores.bairro || !valores.cidade || !valores.estado) faltantes.push('Endereço completo');
    if (!valores.telefone || !valores.whatsapp || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valores.email_empresa)) faltantes.push('Contato');
    if (!pessoal && !valores.inscricao_estadual_isento && !valores.inscricao_estadual) faltantes.push('Inscrição Estadual ou Isento');
    if (!pessoal && !valores.inscricao_municipal_isento && !valores.inscricao_municipal) faltantes.push('Inscrição Municipal ou Isento');
    if (!pessoal && !valores.regime_tributario) faltantes.push('Regime Tributário');
    if (faltantes.length) {
      return NextResponse.json({ erro: true, mensagem: `Revise: ${faltantes.join(', ')}.` }, { status: 400 });
    }
  }

  const { data: salvo, error } = await ctx.admin.from('cadastros_perfil').upsert({
    empresa_id: empresaId,
    ...valores,
    documento: valores.documento || null,
    tipo_empresa: valores.tipo_empresa || null,
    regime_tributario: valores.regime_tributario || null,
    ...(concluir ? { concluido_em: cadastroAtual?.concluido_em || new Date().toISOString() } : {}),
  }, { onConflict: 'empresa_id' }).select('*').single();
  if (error) {
    const duplicado = error.code === '23505';
    return NextResponse.json({
      erro: true,
      mensagem: duplicado ? 'Este CNPJ já está vinculado a outro perfil.' : 'Não foi possível salvar o cadastro.',
    }, { status: duplicado ? 409 : 500 });
  }

  if (valores.nome_fantasia && valores.nome_fantasia !== empresa.nome) {
    await ctx.admin.from('empresas').update({ nome: valores.nome_fantasia }).eq('id', empresaId);
  }

  return NextResponse.json({
    ok: true,
    ...statusCadastro(salvo, pessoal ? 'pessoal' : 'empresa', true),
    cobranca: {
      nome: valores.razao_social || valores.nome_responsavel || valores.nome_fantasia,
      cpfCnpj: documento,
      email: valores.email_empresa,
      telefone: valores.whatsapp || valores.telefone,
    },
  });
}
