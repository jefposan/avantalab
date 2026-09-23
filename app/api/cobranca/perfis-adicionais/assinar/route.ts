import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  atualizarClienteAsaas,
  criarAssinaturaAsaas,
  criarClienteAsaas,
  listarCobrancasAssinaturaAsaas,
  removerAssinaturaAsaas,
} from '../../../../lib/asaas';
import { COBRANCA_ATIVA } from '../../../../lib/cobranca';
import { STATUS_FATURA_PAGAVEL } from '../../../../lib/cobranca-fluxo';
import { criarReferenciaPerfilAdicional } from '../../../../lib/cobranca-referencia';
import { resolverDireitoDePerfisDoPerfil } from '../../../../lib/cobranca-servidor';
import { VALOR_PERFIL_EMPRESARIAL_ADICIONAL_MENSAL } from '../../../../lib/planos-comerciais';

export const runtime = 'nodejs';

function limparTexto(valor: unknown) {
  return String(valor || '').trim().replace(/\s+/g, ' ');
}

function hojeSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function respostaErro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: true, mensagem }, { status });
}

/**
 * A assinatura adicional é criada no servidor e associada ao perfil ainda
 * pendente. O perfil recebe a origem Business apenas para a estrutura de dados;
 * resolverEstadoAcesso bloqueia seu uso até o webhook da Asaas marcá-lo ativo.
 */
export async function POST(request: Request) {
  if (!COBRANCA_ATIVA) return respostaErro('A contratação está temporariamente indisponível.', 409);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !anonKey || !serviceRole) return respostaErro('Configuração do servidor incompleta.', 500);

  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return respostaErro('Sessão não encontrada.', 401);
  const clienteSessao = createClient(supabaseUrl, anonKey);
  const { data: auth, error: erroAuth } = await clienteSessao.auth.getUser(token);
  if (erroAuth || !auth.user) return respostaErro('Sessão não encontrada.', 401);

  const corpo = await request.json().catch(() => ({}));
  const empresaOrigemId = String(corpo.empresaOrigemId || '').trim();
  const nomePerfil = limparTexto(corpo.nomePerfil);
  const cobranca = corpo.cobranca && typeof corpo.cobranca === 'object' ? corpo.cobranca as Record<string, unknown> : {};
  const nomeCobranca = limparTexto(cobranca.nome);
  const documento = String(cobranca.cpfCnpj || '').replace(/\D/g, '');
  const emailCobranca = limparTexto(cobranca.email).toLowerCase();
  const telefone = String(cobranca.telefone || '').replace(/\D/g, '');
  if (!empresaOrigemId || nomePerfil.length < 2) return respostaErro('Informe um nome válido para o novo perfil.');
  if (nomeCobranca.length < 3) return respostaErro('Informe o nome ou a razão social da cobrança.');
  if (documento.length !== 11 && documento.length !== 14) return respostaErro('Informe um CPF ou CNPJ válido para a cobrança.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCobranca)) return respostaErro('Informe um e-mail de cobrança válido.');
  if (telefone.length < 10 || telefone.length > 13) return respostaErro('Informe um telefone válido para a cobrança.');

  const db = createClient(supabaseUrl, serviceRole);
  const direito = await resolverDireitoDePerfisDoPerfil(db, auth.user.id, empresaOrigemId);
  if (!['business_pro', 'business_premium'].includes(direito.plano) || direito.origemEmpresaId !== empresaOrigemId || direito.usados < direito.limite) {
    return respostaErro('Este perfil adicional só pode ser contratado depois que todas as vagas incluídas do Business Pro ou Premium estiverem em uso.', 409);
  }

  const { data: existente } = await db
    .from('assinaturas_perfis_adicionais')
    .select('empresa_id, gateway_subscription_id')
    .eq('empresa_origem_id', empresaOrigemId)
    .eq('solicitante_user_id', auth.user.id)
    .eq('status', 'pendente_pagamento')
    .eq('nome_perfil', nomePerfil)
    .maybeSingle();
  if (existente?.gateway_subscription_id) {
    const cobrancas = await listarCobrancasAssinaturaAsaas(existente.gateway_subscription_id);
    const fatura = cobrancas.data?.data?.find((item) => item.invoiceUrl && STATUS_FATURA_PAGAVEL.has(item.status || ''));
    if (fatura?.invoiceUrl) return NextResponse.json({ ok: true, reutilizada: true, invoiceUrl: fatura.invoiceUrl, empresaId: existente.empresa_id });
  }

  const [{ data: assinaturaOrigem }, { data: cadastroPerfil }, { data: empresaOrigem }] = await Promise.all([
    db.from('assinaturas').select('gateway_customer_id').eq('empresa_id', empresaOrigemId).maybeSingle(),
    db.from('cadastros_perfil').select('telefone, whatsapp, cep, rua, numero, complemento, bairro, inscricao_estadual, inscricao_estadual_isento, inscricao_municipal, inscricao_municipal_isento').eq('empresa_id', empresaOrigemId).maybeSingle(),
    db.from('empresas').select('nome').eq('id', empresaOrigemId).maybeSingle(),
  ]);
  if (!empresaOrigem) return respostaErro('Perfil assinante não encontrado.', 404);

  const dadosCliente = {
    name: nomeCobranca,
    cpfCnpj: documento,
    email: emailCobranca,
    phone: String(cadastroPerfil?.telefone || '').replace(/\D/g, '') || undefined,
    mobilePhone: telefone,
    address: limparTexto(cadastroPerfil?.rua) || undefined,
    addressNumber: limparTexto(cadastroPerfil?.numero) || undefined,
    complement: limparTexto(cadastroPerfil?.complemento) || undefined,
    province: limparTexto(cadastroPerfil?.bairro) || undefined,
    postalCode: String(cadastroPerfil?.cep || '').replace(/\D/g, '') || undefined,
    stateInscription: cadastroPerfil?.inscricao_estadual_isento ? undefined : limparTexto(cadastroPerfil?.inscricao_estadual) || undefined,
    municipalInscription: cadastroPerfil?.inscricao_municipal_isento ? undefined : limparTexto(cadastroPerfil?.inscricao_municipal) || undefined,
    externalReference: empresaOrigemId,
  };
  let clienteId = String(assinaturaOrigem?.gateway_customer_id || '');
  if (clienteId) {
    const atualizacao = await atualizarClienteAsaas(clienteId, dadosCliente);
    if (!atualizacao.ok) return respostaErro(atualizacao.erro || 'Não foi possível atualizar os dados de cobrança.', 502);
  } else {
    const novoCliente = await criarClienteAsaas(dadosCliente);
    if (!novoCliente.ok || !novoCliente.data?.id) return respostaErro(novoCliente.erro || 'Não foi possível criar o cadastro de cobrança.', 502);
    clienteId = novoCliente.data.id;
  }

  const assinaturaAdicionalId = crypto.randomUUID();
  const recorrencia = await criarAssinaturaAsaas({
    customer: clienteId,
    billingType: 'UNDEFINED',
    value: VALOR_PERFIL_EMPRESARIAL_ADICIONAL_MENSAL,
    nextDueDate: hojeSaoPaulo(),
    cycle: 'MONTHLY',
    description: `AvantaLab — perfil empresarial adicional: ${nomePerfil}`,
    externalReference: criarReferenciaPerfilAdicional({ assinaturaAdicionalId }),
  });
  if (!recorrencia.ok || !recorrencia.data?.id) return respostaErro(recorrencia.erro || 'Não foi possível preparar a assinatura adicional.', 502);

  const { data: criacao, error: erroCriacao } = await db.rpc('criar_perfil_adicional_business_pendente', {
    p_assinatura_adicional_id: assinaturaAdicionalId,
    p_user_id: auth.user.id,
    p_origem_empresa_id: empresaOrigemId,
    p_nome: nomePerfil,
    p_nome_usuario: String(auth.user.user_metadata?.nome || auth.user.email?.split('@')[0] || 'Usuário'),
    p_email: String(auth.user.email || '').toLowerCase(),
    p_gateway_customer_id: clienteId,
    p_gateway_subscription_id: recorrencia.data.id,
    p_cobranca_nome: nomeCobranca,
    p_cobranca_documento: documento,
    p_cobranca_email: emailCobranca,
    p_cobranca_telefone: telefone,
  });
  const resultado = criacao && typeof criacao === 'object' ? criacao as Record<string, unknown> : {};
  if (erroCriacao || resultado.ok !== true) {
    await removerAssinaturaAsaas(recorrencia.data.id).catch(() => null);
    return respostaErro('A cobrança foi desfeita porque não foi possível preparar o perfil adicional.', 500);
  }

  const cobrancas = await listarCobrancasAssinaturaAsaas(recorrencia.data.id);
  const primeiraFatura = cobrancas.data?.data?.find((item) => item.invoiceUrl && STATUS_FATURA_PAGAVEL.has(item.status || ''));
  const empresa = resultado.empresa && typeof resultado.empresa === 'object' ? resultado.empresa as Record<string, unknown> : null;
  return NextResponse.json({
    ok: true,
    empresa,
    empresaId: empresa?.id || null,
    assinaturaId: recorrencia.data.id,
    invoiceUrl: primeiraFatura?.invoiceUrl || null,
  });
}
