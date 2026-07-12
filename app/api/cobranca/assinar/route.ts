import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { atualizarClienteAsaas, criarClienteAsaas, criarAssinaturaAsaas, listarCobrancasAssinaturaAsaas, removerAssinaturaAsaas } from '../../../lib/asaas';
import { PRECOS, type PlanoPago, type Ciclo } from '../../../lib/cobranca';

export const runtime = 'nodejs';
const STATUS_FATURA_PAGAVEL = new Set(['PENDING', 'OVERDUE']);

function hojeSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function limparTexto(valor: unknown) {
  return String(valor || '').trim().replace(/\s+/g, ' ');
}

// Inicia a assinatura: cria (ou reaproveita) o cliente na Asaas, cria a
// assinatura recorrente e devolve o link de pagamento (invoiceUrl).
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !anonKey || !serviceRole) return NextResponse.json({ erro: true }, { status: 500 });

  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const plano = String(corpo.plano || '') as PlanoPago;
  const ciclo = String(corpo.ciclo || '') as Ciclo;
  const dadosCobranca = corpo.cobranca && typeof corpo.cobranca === 'object' ? corpo.cobranca : {};
  let nomeCobranca = limparTexto(dadosCobranca.nome || corpo.nomeCobranca);
  let emailCobranca = limparTexto(dadosCobranca.email || corpo.emailCobranca).toLowerCase();
  let telefoneCobranca = String(dadosCobranca.telefone || corpo.telefoneCobranca || '').replace(/\D/g, '');
  let cpfCnpj = String(dadosCobranca.cpfCnpj || corpo.cpfCnpj || '').replace(/\D/g, ''); // só dígitos
  if (!empresaId || !(plano in PRECOS) || (ciclo !== 'mensal' && ciclo !== 'anual')) {
    return NextResponse.json({ erro: true, mensagem: 'dados inválidos' }, { status: 400 });
  }
  // 1) Autentica o usuário e pega o e-mail.
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return NextResponse.json({ erro: true }, { status: 401 });
  let userId = '';
  let userEmail = '';
  try {
    const sb = createClient(supabaseUrl, anonKey);
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return NextResponse.json({ erro: true }, { status: 401 });
    userId = data.user.id;
    userEmail = data.user.email || '';
  } catch {
    return NextResponse.json({ erro: true }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRole);

  // 2) Confirma vínculo e carrega dados do perfil.
  const { data: vinculo } = await admin
    .from('usuarios_empresa')
    .select('id, perfil, status')
    .eq('user_id', userId)
    .eq('empresa_id', empresaId)
    .eq('status', 'ativo')
    .limit(1)
    .maybeSingle();
  if (!vinculo) return NextResponse.json({ erro: true, mensagem: 'sem acesso a este perfil' }, { status: 403 });
  if (!['gestor_master', 'administrador'].includes(vinculo.perfil || '')) {
    return NextResponse.json({ erro: true, mensagem: 'Somente gestores e administradores podem contratar um plano.' }, { status: 403 });
  }

  const { data: cadastroPerfil } = await admin
    .from('cadastros_perfil')
    .select('nome_fantasia, nome_responsavel, razao_social, documento, email_empresa, telefone, whatsapp, cep, rua, numero, complemento, bairro, inscricao_estadual, inscricao_estadual_isento, inscricao_municipal, inscricao_municipal_isento, concluido_em')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (!cadastroPerfil?.concluido_em) {
    return NextResponse.json({ erro: true, mensagem: 'Complete o cadastro do perfil antes de iniciar a assinatura.' }, { status: 409 });
  }
  nomeCobranca = limparTexto(cadastroPerfil.razao_social || cadastroPerfil.nome_responsavel || cadastroPerfil.nome_fantasia);
  cpfCnpj = String(cadastroPerfil.documento || '').replace(/\D/g, '');
  emailCobranca = limparTexto(cadastroPerfil.email_empresa).toLowerCase();
  telefoneCobranca = String(cadastroPerfil.whatsapp || cadastroPerfil.telefone || '').replace(/\D/g, '');
  if (nomeCobranca.length < 3) {
    return NextResponse.json({ erro: true, mensagem: 'O cadastro não possui nome ou razão social válido.' }, { status: 400 });
  }
  if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
    return NextResponse.json({ erro: true, mensagem: 'O cadastro não possui CPF ou CNPJ válido.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCobranca)) {
    return NextResponse.json({ erro: true, mensagem: 'O cadastro não possui e-mail de cobrança válido.' }, { status: 400 });
  }
  if (telefoneCobranca.length < 10 || telefoneCobranca.length > 13) {
    return NextResponse.json({ erro: true, mensagem: 'O cadastro não possui telefone de cobrança válido.' }, { status: 400 });
  }

  const dadosCliente = {
    name: nomeCobranca,
    email: emailCobranca || userEmail || undefined,
    cpfCnpj,
    phone: String(cadastroPerfil.telefone || '').replace(/\D/g, '') || undefined,
    mobilePhone: telefoneCobranca,
    address: limparTexto(cadastroPerfil.rua) || undefined,
    addressNumber: limparTexto(cadastroPerfil.numero) || undefined,
    complement: limparTexto(cadastroPerfil.complemento) || undefined,
    province: limparTexto(cadastroPerfil.bairro) || undefined,
    postalCode: String(cadastroPerfil.cep || '').replace(/\D/g, '') || undefined,
    stateInscription: cadastroPerfil.inscricao_estadual_isento ? undefined : limparTexto(cadastroPerfil.inscricao_estadual) || undefined,
    municipalInscription: cadastroPerfil.inscricao_municipal_isento ? undefined : limparTexto(cadastroPerfil.inscricao_municipal) || undefined,
    externalReference: empresaId,
  };

  const { data: emp } = await admin
    .from('empresas').select('nome, tipo_perfil').eq('id', empresaId).maybeSingle();
  const nomePerfil = emp?.nome || 'Cliente AvantaLab';
  const tipoPerfil = emp?.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa';
  const planoEsperado: PlanoPago = tipoPerfil === 'pessoal' ? 'pessoal_premium' : 'empresa';
  if (plano !== planoEsperado) {
    return NextResponse.json({ erro: true, mensagem: 'O plano informado não corresponde ao tipo deste perfil.' }, { status: 400 });
  }

  // 3) Reaproveita o cliente Asaas se já houver; senão cria.
  const { data: assinExistente } = await admin
    .from('assinaturas')
    .select('status, plano, ciclo, gateway_customer_id, gateway_subscription_id')
    .eq('empresa_id', empresaId)
    .maybeSingle();

  // Um segundo clique (ou uma repetição de rede) deve reutilizar a cobrança já
  // criada, nunca abrir outra assinatura recorrente para o mesmo perfil.
  if (
    assinExistente?.gateway_subscription_id
    && assinExistente.status !== 'cancelada'
  ) {
    const existentes = await listarCobrancasAssinaturaAsaas(assinExistente.gateway_subscription_id);
    const cobranca = existentes.data?.data?.find((item) => item.invoiceUrl && STATUS_FATURA_PAGAVEL.has(item.status || ''));
    if (existentes.ok && cobranca?.invoiceUrl) {
      if (assinExistente.plano !== plano || assinExistente.ciclo !== ciclo) {
        await removerAssinaturaAsaas(assinExistente.gateway_subscription_id).catch(() => null);
        await admin.from('assinaturas').update({
          gateway_subscription_id: null,
          atualizado_em: new Date().toISOString(),
        }).eq('empresa_id', empresaId);
      } else {
        return NextResponse.json({
          ok: true,
          reutilizada: true,
          invoiceUrl: cobranca.invoiceUrl,
          assinaturaId: assinExistente.gateway_subscription_id,
        });
      }
    } else {
      await removerAssinaturaAsaas(assinExistente.gateway_subscription_id).catch(() => null);
      await admin.from('assinaturas').update({
        gateway_subscription_id: null,
        atualizado_em: new Date().toISOString(),
      }).eq('empresa_id', empresaId);
    }
  }

  let clienteId = assinExistente?.gateway_customer_id || '';
  if (!clienteId) {
    const c = await criarClienteAsaas(dadosCliente);
    if (!c.ok || !c.data?.id) return NextResponse.json({ erro: true, mensagem: c.erro || 'falha ao criar cliente' }, { status: 502 });
    clienteId = c.data.id;
  } else {
    const c = await atualizarClienteAsaas(clienteId, dadosCliente);
    if (!c.ok) return NextResponse.json({ erro: true, mensagem: c.erro || 'falha ao atualizar cliente' }, { status: 502 });
  }

  // 4) Cria a assinatura recorrente. billingType UNDEFINED = cliente escolhe
  //    (Pix/cartão/boleto) e informa os dados dele na página da Asaas.
  const valor = PRECOS[plano][ciclo];
  const a = await criarAssinaturaAsaas({
    customer: clienteId,
    billingType: 'UNDEFINED',
    value: valor,
    nextDueDate: hojeSaoPaulo(),
    cycle: ciclo === 'anual' ? 'YEARLY' : 'MONTHLY',
    description: `AvantaLab — ${plano} (${ciclo})`,
    externalReference: empresaId,
  });
  if (!a.ok || !a.data?.id) return NextResponse.json({ erro: true, mensagem: a.erro || 'falha ao criar assinatura' }, { status: 502 });
  const assinaturaGwId = a.data.id;

  // 5) Pega o link de pagamento da primeira cobrança.
  let invoiceUrl = '';
  const pgs = await listarCobrancasAssinaturaAsaas(assinaturaGwId);
  const primeiraCobranca = pgs.data?.data?.find((item) => item.invoiceUrl && STATUS_FATURA_PAGAVEL.has(item.status || ''));
  if (pgs.ok && primeiraCobranca) invoiceUrl = primeiraCobranca.invoiceUrl || '';

  // 6) Guarda os identificadores no nosso banco (status vira 'ativa' via webhook).
  const base = {
    empresa_id: empresaId,
    tipo_perfil: tipoPerfil,
    plano,
    ciclo,
    gateway: 'asaas',
    gateway_customer_id: clienteId,
    gateway_subscription_id: assinaturaGwId,
    cobranca_nome: nomeCobranca || nomePerfil,
    cobranca_documento: cpfCnpj,
    cobranca_email: emailCobranca || userEmail || null,
    cobranca_telefone: telefoneCobranca,
    atualizado_em: new Date().toISOString(),
  };
  if (assinExistente) {
    await admin.from('assinaturas').update(base).eq('empresa_id', empresaId);
  } else {
    // Novo registro aguardando pagamento (bloqueado até o webhook confirmar).
    await admin.from('assinaturas').insert({ ...base, status: 'expirada' });
  }

  return NextResponse.json({ ok: true, invoiceUrl, assinaturaId: assinaturaGwId });
}
