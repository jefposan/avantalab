import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { atualizarClienteAsaas, criarClienteAsaas, criarAssinaturaAsaas, listarCobrancasAssinaturaAsaas, obterAssinaturaAsaas, removerAssinaturaAsaas } from '../../../lib/asaas';
import { COBRANCA_ATIVA, PRECOS, type PlanoPago, type Ciclo, type StatusAssinatura } from '../../../lib/cobranca';
import { assinaturaBloqueiaNovoCheckout, STATUS_FATURA_PAGA, STATUS_FATURA_PAGAVEL } from '../../../lib/cobranca-fluxo';
import { normalizarPlanoComercial } from '../../../lib/planos-comerciais';

export const runtime = 'nodejs';

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
  if (!COBRANCA_ATIVA) {
    return NextResponse.json({ erro: true, mensagem: 'A contratação está temporariamente indisponível.' }, { status: 409 });
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !anonKey || !serviceRole) return NextResponse.json({ erro: true }, { status: 500 });

  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const planoRecebido = String(corpo.plano || '');
  const planoNormalizado = normalizarPlanoComercial(planoRecebido);
  const plano = (planoNormalizado || planoRecebido) as PlanoPago;
  const ciclo = String(corpo.ciclo || '') as Ciclo;
  const assinaturaPropriaSolicitada = corpo.assinaturaPropria === true;
  const dadosCobranca = corpo.cobranca && typeof corpo.cobranca === 'object' ? corpo.cobranca : {};
  let nomeCobranca = limparTexto(dadosCobranca.nome || corpo.nomeCobranca);
  let emailCobranca = limparTexto(dadosCobranca.email || corpo.emailCobranca).toLowerCase();
  let telefoneCobranca = String(dadosCobranca.telefone || corpo.telefoneCobranca || '').replace(/\D/g, '');
  let cpfCnpj = String(dadosCobranca.cpfCnpj || corpo.cpfCnpj || '').replace(/\D/g, ''); // só dígitos
  if (!empresaId || !['pessoal_premium', 'business', 'business_pro'].includes(plano) || (ciclo !== 'mensal' && ciclo !== 'anual')) {
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
  // O checkout não exige a conclusão do cadastro operacional do perfil. Para
  // cobrar no Asaas bastam os dados de cobrança, informados nesta etapa e
  // complementados pelo que já existir no perfil.
  nomeCobranca = nomeCobranca || limparTexto(cadastroPerfil?.razao_social || cadastroPerfil?.nome_responsavel || cadastroPerfil?.nome_fantasia);
  cpfCnpj = cpfCnpj || String(cadastroPerfil?.documento || '').replace(/\D/g, '');
  emailCobranca = emailCobranca || limparTexto(cadastroPerfil?.email_empresa || userEmail).toLowerCase();
  telefoneCobranca = telefoneCobranca || String(cadastroPerfil?.whatsapp || cadastroPerfil?.telefone || '').replace(/\D/g, '');
  if (nomeCobranca.length < 3) {
    return NextResponse.json({ erro: true, mensagem: 'Informe um nome de cobrança válido.' }, { status: 400 });
  }
  if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
    return NextResponse.json({ erro: true, mensagem: 'Informe um CPF ou CNPJ válido.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCobranca)) {
    return NextResponse.json({ erro: true, mensagem: 'Informe um e-mail de cobrança válido.' }, { status: 400 });
  }
  if (telefoneCobranca.length < 10 || telefoneCobranca.length > 13) {
    return NextResponse.json({ erro: true, mensagem: 'Informe um telefone de cobrança válido.' }, { status: 400 });
  }

  const dadosCliente = {
    name: nomeCobranca,
    email: emailCobranca || userEmail || undefined,
    cpfCnpj,
    phone: String(cadastroPerfil?.telefone || '').replace(/\D/g, '') || undefined,
    mobilePhone: telefoneCobranca,
    address: limparTexto(cadastroPerfil?.rua) || undefined,
    addressNumber: limparTexto(cadastroPerfil?.numero) || undefined,
    complement: limparTexto(cadastroPerfil?.complemento) || undefined,
    province: limparTexto(cadastroPerfil?.bairro) || undefined,
    postalCode: String(cadastroPerfil?.cep || '').replace(/\D/g, '') || undefined,
    stateInscription: cadastroPerfil?.inscricao_estadual_isento ? undefined : limparTexto(cadastroPerfil?.inscricao_estadual) || undefined,
    municipalInscription: cadastroPerfil?.inscricao_municipal_isento ? undefined : limparTexto(cadastroPerfil?.inscricao_municipal) || undefined,
    externalReference: empresaId,
  };

  const { data: emp } = await admin
    .from('empresas').select('nome, tipo_perfil, assinatura_origem_empresa_id').eq('id', empresaId).maybeSingle();
  if (!emp) {
    return NextResponse.json({ erro: true, mensagem: 'Perfil não encontrado.' }, { status: 404 });
  }
  const perfilCompartilhado = Boolean(emp.assinatura_origem_empresa_id);
  if (perfilCompartilhado && !assinaturaPropriaSolicitada) {
    return NextResponse.json({
      erro: true,
      mensagem: 'Este perfil usa uma assinatura compartilhada. Escolha Criar assinatura própria para continuar.',
    }, { status: 409 });
  }
  if (perfilCompartilhado) {
    const [{ data: assinaturaOrigem }, { data: moduloRecorrente }] = await Promise.all([
      admin
        .from('assinaturas')
        .select('status, valido_ate')
        .eq('empresa_id', emp.assinatura_origem_empresa_id)
        .maybeSingle(),
      admin
        .from('assinaturas_modulos')
        .select('id')
        .eq('empresa_id', empresaId)
        .not('gateway_subscription_id', 'is', null)
        .neq('status', 'cancelada')
        .limit(1)
        .maybeSingle(),
    ]);
    const cortesiaVigente = assinaturaOrigem?.status === 'cortesia'
      && (!assinaturaOrigem.valido_ate || new Date(assinaturaOrigem.valido_ate) > new Date());
    if (cortesiaVigente) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Este perfil recebe uma cortesia. Solicite ao administrador do AvantaLab a revogação antes de contratar.',
      }, { status: 409 });
    }
    if (moduloRecorrente) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Cancele primeiro a renovação dos módulos avulsos deste perfil para evitar cobranças no plano de origem.',
      }, { status: 409 });
    }
  }
  const nomePerfil = emp?.nome || 'Cliente AvantaLab';
  const tipoPerfil = emp?.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa';
  const planoPermitido = tipoPerfil === 'pessoal'
    ? plano === 'pessoal_premium'
    : plano === 'business' || plano === 'business_pro';
  if (!planoPermitido) {
    return NextResponse.json({ erro: true, mensagem: 'O plano informado não corresponde ao tipo deste perfil.' }, { status: 400 });
  }

  // 3) Reaproveita o cliente Asaas se já houver; senão cria.
  const { data: assinExistente } = await admin
    .from('assinaturas')
    .select('status, plano, ciclo, trial_fim, valido_ate, gateway_customer_id, gateway_subscription_id')
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (!perfilCompartilhado && assinExistente && assinaturaBloqueiaNovoCheckout(
    assinExistente.status as StatusAssinatura,
    assinExistente.valido_ate,
  )) {
    return NextResponse.json({
      erro: true,
      mensagem: assinExistente.status === 'cancelada'
        ? 'Esta assinatura ainda mantém um período pago. Aguarde o término ou gerencie o plano atual.'
        : 'Este perfil já possui acesso vigente. Use a área de gerenciamento da assinatura.',
    }, { status: 409 });
  }

  // Um segundo clique (ou uma repetição de rede) deve reutilizar a cobrança já
  // criada, nunca abrir outra assinatura recorrente para o mesmo perfil.
  if (
    assinExistente?.gateway_subscription_id
  ) {
    const [assinaturaRemota, existentes] = await Promise.all([
      obterAssinaturaAsaas(assinExistente.gateway_subscription_id),
      listarCobrancasAssinaturaAsaas(assinExistente.gateway_subscription_id),
    ]);
    const assinaturaRemotaAusente = assinaturaRemota.status === 404 && existentes.status === 404;
    if ((!existentes.ok || !assinaturaRemota.ok) && !assinaturaRemotaAusente) {
      return NextResponse.json({
        erro: true,
        mensagem: existentes.erro || 'Não foi possível verificar a cobrança já existente. Tente novamente.',
      }, { status: 502 });
    }
    const possuiPagamento = (existentes.data?.data || []).some((item) => STATUS_FATURA_PAGA.has(item.status || ''));
    const assinaturaRemotaEncerrada = assinaturaRemotaAusente
      || ['INACTIVE', 'EXPIRED'].includes(assinaturaRemota.data?.status || '');
    if (possuiPagamento && !assinaturaRemotaEncerrada) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Já existe uma assinatura com pagamento neste perfil. Atualize a página e gerencie o plano atual.',
      }, { status: 409 });
    }
    const cobranca = existentes.data?.data?.find((item) => item.invoiceUrl && STATUS_FATURA_PAGAVEL.has(item.status || ''));
    if (cobranca?.invoiceUrl && !assinaturaRemotaEncerrada && assinExistente.plano === plano && assinExistente.ciclo === ciclo) {
      return NextResponse.json({
        ok: true,
        reutilizada: true,
        invoiceUrl: cobranca.invoiceUrl,
        assinaturaId: assinExistente.gateway_subscription_id,
      });
    }

    const removida = await removerAssinaturaAsaas(assinExistente.gateway_subscription_id);
    if (!removida.ok && removida.status !== 404) {
      return NextResponse.json({
        erro: true,
        mensagem: removida.erro || 'Não foi possível substituir a cobrança anterior com segurança.',
      }, { status: 502 });
    }
    const { error: erroLimpeza } = await admin.from('assinaturas').update({
      gateway_subscription_id: null,
      atualizado_em: new Date().toISOString(),
    }).eq('empresa_id', empresaId);
    if (erroLimpeza) {
      return NextResponse.json({ erro: true, mensagem: 'Não foi possível preparar a nova contratação.' }, { status: 500 });
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
    description: `AvantaLab — ${plano === 'business_pro' ? 'Business Pro' : plano === 'business' ? 'Business' : 'Pessoal Premium'} (${ciclo})`,
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
  // Uma cortesia revogada também termina como "cancelada". Ao contratar de
  // novo, esse é um ciclo novo: o estado precisa voltar a aguardar pagamento,
  // sem que o cancelamento histórico impeça a confirmação da nova cobrança.
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
  const trialAindaVigente = !perfilCompartilhado
    && assinExistente?.status === 'trial'
    && !!assinExistente.trial_fim
    && new Date(assinExistente.trial_fim) > new Date();
  const persistencia = assinExistente
    ? await admin.from('assinaturas').update({
      ...base,
      status: trialAindaVigente ? 'trial' : 'expirada',
      valido_ate: null,
      trial_fim: trialAindaVigente ? assinExistente.trial_fim : null,
    }).eq('empresa_id', empresaId)
    : await admin.from('assinaturas').insert({ ...base, status: 'expirada' });
  if (persistencia.error) {
    await removerAssinaturaAsaas(assinaturaGwId).catch(() => null);
    return NextResponse.json({
      erro: true,
      mensagem: 'A cobrança foi desfeita porque não foi possível registrar a assinatura. Tente novamente.',
    }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    invoiceUrl,
    assinaturaId: assinaturaGwId,
    assinaturaPropriaPendente: perfilCompartilhado,
  });
}
