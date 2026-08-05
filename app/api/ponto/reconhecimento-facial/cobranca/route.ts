import { NextResponse } from 'next/server';
import {
  atualizarAssinaturaAsaas,
  criarAssinaturaAsaas,
  criarCobrancaAvulsaAsaas,
  listarCobrancasAssinaturaAsaas,
  obterAssinaturaAsaas,
  removerCobrancaAsaas,
  removerAssinaturaAsaas,
} from '../../../../lib/asaas';
import { assinaturaVigente } from '../../../../lib/cobranca';
import { autenticarPerfilCobranca, resolverEstadoAcesso } from '../../../../lib/cobranca-servidor';
import { normalizarPlanoComercial } from '../../../../lib/planos-comerciais';
import {
  calcularProporcionalFacialCentavos,
  PONTO_FACIAL_VALOR_UNITARIO_CENTAVOS,
  type ResumoAlteracaoFacial,
} from '../../../../lib/ponto-facial-cobranca';
import {
  buscarAssinaturaFacial,
  montarEstadoCobrancaFacial,
} from '../../../../lib/ponto-facial-cobranca-servidor';

export const runtime = 'nodejs';

const TIPOS_MARCACAO = ['entrada', 'saida_refeicao', 'retorno_refeicao', 'saida'];
const STATUS_PAGAVEL = new Set(['PENDING', 'OVERDUE']);

function erro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: true, mensagem }, { status });
}

function idsValidos(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return Array.from(new Set(valor.filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id))));
}

function tiposValidos(valor: unknown): string[] {
  if (!Array.isArray(valor)) return ['entrada'];
  const tipos = Array.from(new Set(valor.filter((tipo): tipo is string => typeof tipo === 'string' && TIPOS_MARCACAO.includes(tipo))));
  return tipos.length ? tipos : ['entrada'];
}

function hojeSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

async function validarPlanoEmpresa(empresaId: string) {
  const estado = await resolverEstadoAcesso(empresaId);
  const plano = normalizarPlanoComercial(estado?.plano);
  return Boolean(
    estado
    && estado.tipoPerfil === 'empresa'
    && assinaturaVigente(estado)
    && (!plano || plano === 'business' || plano === 'business_pro'),
  );
}

async function validarFuncionarios(
  db: Awaited<ReturnType<typeof autenticarPerfilCobranca>> extends infer T ? T extends { db: infer D } ? D : never : never,
  empresaId: string,
  funcionariosIds: string[],
) {
  if (!funcionariosIds.length) return true;
  const { data, error } = await db.from('ponto_funcionarios').select('user_id')
    .eq('empresa_id', empresaId).eq('ativo', true).in('user_id', funcionariosIds);
  return !error && (data || []).length === funcionariosIds.length;
}

async function funcionariosSelecionados(db: Parameters<typeof montarEstadoCobrancaFacial>[0], empresaId: string) {
  const { data } = await db.from('ponto_facial_funcionarios')
    .select('funcionario_user_id, status')
    .eq('empresa_id', empresaId).neq('status', 'removido');
  return (data || []) as Array<{ funcionario_user_id: string; status: string }>;
}

function montarResumo(
  quantidadeAnterior: number,
  quantidadeNova: number,
  adicionados: number,
  removidos: number,
  proximoVencimento: string | null,
  assinaturaExistente: boolean,
): ResumoAlteracaoFacial {
  const aumentoLiquido = Math.max(0, quantidadeNova - quantidadeAnterior);
  const tipo = !assinaturaExistente
    ? 'contratacao'
    : quantidadeNova > quantidadeAnterior
      ? 'aumento'
      : quantidadeNova < quantidadeAnterior
        ? 'reducao'
        : 'sem_alteracao';
  const valorAgoraCentavos = !assinaturaExistente
    ? quantidadeNova * PONTO_FACIAL_VALOR_UNITARIO_CENTAVOS
    : calcularProporcionalFacialCentavos(aumentoLiquido, proximoVencimento);
  return {
    tipo,
    quantidadeAnterior,
    quantidadeNova,
    adicionados,
    removidos,
    valorAgoraCentavos,
    valorMensalCentavos: quantidadeNova * PONTO_FACIAL_VALOR_UNITARIO_CENTAVOS,
    proximoVencimento,
    exigePagamento: valorAgoraCentavos > 0,
  };
}

export async function GET(request: Request) {
  const empresaId = new URL(request.url).searchParams.get('empresaId')?.trim() || '';
  const acesso = await autenticarPerfilCobranca(request, empresaId, true);
  if (!acesso) return erro('Acesso não autorizado.', 403);
  return NextResponse.json({ erro: false, cobranca: await montarEstadoCobrancaFacial(acesso.db, empresaId) });
}

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const acao = String(corpo.acao || 'resumir');
  const acesso = await autenticarPerfilCobranca(request, empresaId, true);
  if (!acesso) return erro('Acesso não autorizado.', 403);

  if (acao === 'cancelar') return cancelar(acesso, empresaId, corpo.desativarAgora === true);
  if (!await validarPlanoEmpresa(empresaId)) {
    return erro('O adicional facial exige uma assinatura Business ou Business Pro ativa.', 409);
  }

  const funcionariosIds = idsValidos(corpo.funcionariosIds);
  const tiposMarcacao = tiposValidos(corpo.tiposMarcacao);
  if (!funcionariosIds.length) return erro('Selecione ao menos um funcionário ou use a opção de cancelar a assinatura.');
  if (!await validarFuncionarios(acesso.db, empresaId, funcionariosIds)) return erro('Selecione apenas funcionários ativos da empresa.');

  const [assinatura, atuais] = await Promise.all([
    buscarAssinaturaFacial(acesso.db, empresaId),
    funcionariosSelecionados(acesso.db, empresaId),
  ]);
  if (assinatura?.status === 'cancelamento_programado') {
    return erro('A renovação facial já foi cancelada. Você pode manter o uso até o fim do período pago ou desativá-lo agora.', 409);
  }
  const assinaturaContratada = Boolean(assinatura && ['ativa', 'inadimplente', 'cancelamento_programado'].includes(assinatura.status));
  const quantidadeAnterior = assinaturaContratada ? Number(assinatura?.quantidade_atual || 0) : 0;
  const atuaisIds = new Set(assinaturaContratada ? atuais.map((item) => item.funcionario_user_id) : []);
  const novosIds = new Set(funcionariosIds);
  const adicionados = funcionariosIds.filter((id) => !atuaisIds.has(id));
  const removidos = [...atuaisIds].filter((id) => !novosIds.has(id));
  const resumo = montarResumo(
    quantidadeAnterior,
    funcionariosIds.length,
    adicionados.length,
    removidos.length,
    assinatura?.proximo_vencimento || null,
    assinaturaContratada,
  );

  if (acao === 'resumir') return NextResponse.json({ erro: false, resumo });
  if (acao !== 'contratar') return erro('Ação de cobrança inválida.');
  if (corpo.aceite !== true) return erro('Confirme que a empresa informou os funcionários e possui um procedimento alternativo para falhas na validação facial.');
  const { data: alteracaoPendente } = await acesso.db.from('ponto_facial_alteracoes_cobranca')
    .select('id').eq('empresa_id', empresaId).eq('status', 'pendente_pagamento')
    .order('criado_em', { ascending: false }).limit(1).maybeSingle();
  if (assinatura?.status === 'pendente_pagamento' || alteracaoPendente) {
    return NextResponse.json({
      erro: false,
      pendente: true,
      mensagem: 'Já existe uma cobrança facial aguardando pagamento.',
      cobranca: await montarEstadoCobrancaFacial(acesso.db, empresaId),
    });
  }

  if (!assinaturaContratada) {
    return criarContratacaoInicial(acesso, empresaId, funcionariosIds, tiposMarcacao, resumo);
  }
  return alterarContratacao(acesso, empresaId, assinatura!, funcionariosIds, tiposMarcacao, adicionados, removidos, resumo);
}

async function criarContratacaoInicial(
  acesso: NonNullable<Awaited<ReturnType<typeof autenticarPerfilCobranca>>>,
  empresaId: string,
  funcionariosIds: string[],
  tiposMarcacao: string[],
  resumo: ResumoAlteracaoFacial,
) {
  const { data: assinaturaPrincipal } = await acesso.db.from('assinaturas')
    .select('gateway_customer_id').eq('empresa_id', empresaId).maybeSingle();
  if (!assinaturaPrincipal?.gateway_customer_id) return erro('Não foi possível localizar o cadastro de cobrança desta empresa.', 409);

  const agora = new Date().toISOString();
  const { data: alteracao, error: erroAlteracao } = await acesso.db.from('ponto_facial_alteracoes_cobranca').insert({
    empresa_id: empresaId,
    tipo: 'contratacao',
    status: 'pendente_pagamento',
    quantidade_anterior: 0,
    quantidade_nova: funcionariosIds.length,
    valor_cobrado_centavos: resumo.valorAgoraCentavos,
    funcionarios_adicionados: funcionariosIds,
    funcionarios_removidos: [],
    criado_por: acesso.usuario.id,
    atualizado_em: agora,
  }).select('id').single();
  if (erroAlteracao || !alteracao) return erro('Não foi possível preparar a contratação facial.', 500);

  const criada = await criarAssinaturaAsaas({
    customer: assinaturaPrincipal.gateway_customer_id,
    billingType: 'UNDEFINED',
    value: resumo.valorMensalCentavos / 100,
    nextDueDate: hojeSaoPaulo(),
    cycle: 'MONTHLY',
    description: `AvantaLab — reconhecimento facial (${funcionariosIds.length} funcionário${funcionariosIds.length === 1 ? '' : 's'})`,
    externalReference: `ponto_facial:${empresaId}`,
  });
  if (!criada.ok || !criada.data?.id) {
    await acesso.db.from('ponto_facial_alteracoes_cobranca').update({ status: 'cancelada', atualizado_em: new Date().toISOString() }).eq('id', alteracao.id);
    return erro(criada.erro || 'Não foi possível gerar a assinatura facial.', 502);
  }

  const cobrancas = await listarCobrancasAssinaturaAsaas(criada.data.id);
  const fatura = cobrancas.data?.data?.find((item) => item.id && STATUS_PAGAVEL.has(item.status || '')) || null;
  const { data: assinatura, error: erroAssinatura } = await acesso.db.from('ponto_facial_assinaturas').upsert({
    empresa_id: empresaId,
    status: 'pendente_pagamento',
    quantidade_atual: 0,
    quantidade_proxima: funcionariosIds.length,
    valor_unitario_centavos: PONTO_FACIAL_VALOR_UNITARIO_CENTAVOS,
    valor_mensal_centavos: resumo.valorMensalCentavos,
    gateway_customer_id: assinaturaPrincipal.gateway_customer_id,
    gateway_subscription_id: criada.data.id,
    proximo_vencimento: hojeSaoPaulo(),
    valido_ate: null,
    cancelamento_solicitado_em: null,
    desativacao_imediata: false,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: 'empresa_id' }).select('id').single();
  if (erroAssinatura || !assinatura) {
    await removerAssinaturaAsaas(criada.data.id);
    await acesso.db.from('ponto_facial_alteracoes_cobranca').update({
      status: 'cancelada', atualizado_em: new Date().toISOString(),
    }).eq('id', alteracao.id);
    return erro('A cobrança foi cancelada porque não foi possível registrar a assinatura facial.', 500);
  }

  await acesso.db.from('ponto_facial_alteracoes_cobranca').update({
    assinatura_id: assinatura.id,
    gateway_payment_id: fatura?.id || null,
    invoice_url: fatura?.invoiceUrl || null,
    vencimento: fatura?.dueDate || hojeSaoPaulo(),
    atualizado_em: new Date().toISOString(),
  }).eq('id', alteracao.id);
  if (fatura?.id) await salvarFatura(acesso.db, empresaId, assinatura.id, alteracao.id, criada.data.id, fatura);

  await aplicarSelecaoPendente(acesso, empresaId, funcionariosIds, tiposMarcacao);
  await auditar(acesso, empresaId, 'reconhecimento_facial_cobranca_criada', {
    quantidade: funcionariosIds.length, valor_centavos: resumo.valorMensalCentavos, tipo: 'contratacao',
  });
  return NextResponse.json({
    erro: false,
    pendente: true,
    invoiceUrl: fatura?.invoiceUrl || null,
    mensagem: fatura?.invoiceUrl ? 'Cobrança facial gerada.' : 'A cobrança está sendo preparada pela Asaas.',
    cobranca: await montarEstadoCobrancaFacial(acesso.db, empresaId),
  });
}

async function alterarContratacao(
  acesso: NonNullable<Awaited<ReturnType<typeof autenticarPerfilCobranca>>>,
  empresaId: string,
  assinatura: NonNullable<Awaited<ReturnType<typeof buscarAssinaturaFacial>>>,
  funcionariosIds: string[],
  tiposMarcacao: string[],
  adicionados: string[],
  removidos: string[],
  resumo: ResumoAlteracaoFacial,
) {
  const aumentoLiquido = Math.max(0, resumo.quantidadeNova - resumo.quantidadeAnterior);
  const vagasLiberadas = removidos.length;
  const adicionadosCobertos = adicionados.slice(0, vagasLiberadas);
  const adicionadosPagos = adicionados.slice(vagasLiberadas);
  const agora = new Date().toISOString();

  if (!aumentoLiquido) {
    if (assinatura.gateway_subscription_id) {
      const atualizada = await atualizarAssinaturaAsaas(assinatura.gateway_subscription_id, {
        value: resumo.valorMensalCentavos / 100,
        description: `AvantaLab — reconhecimento facial (${funcionariosIds.length} funcionário${funcionariosIds.length === 1 ? '' : 's'})`,
        updatePendingPayments: false,
      });
      if (!atualizada.ok) return erro(atualizada.erro || 'Não foi possível atualizar a próxima mensalidade facial.', 502);
    }
    await aplicarAlteracaoImediata(acesso, empresaId, funcionariosIds, tiposMarcacao, adicionadosCobertos, removidos);
    const { data: alteracao } = await acesso.db.from('ponto_facial_alteracoes_cobranca').insert({
      empresa_id: empresaId, assinatura_id: assinatura.id,
      tipo: resumo.quantidadeNova < resumo.quantidadeAnterior ? 'reducao' : 'ajuste',
      status: 'aplicada', quantidade_anterior: resumo.quantidadeAnterior, quantidade_nova: resumo.quantidadeNova,
      valor_cobrado_centavos: 0, funcionarios_adicionados: adicionadosCobertos,
      funcionarios_removidos: removidos, criado_por: acesso.usuario.id, aplicado_em: agora, atualizado_em: agora,
    }).select('id').single();
    await acesso.db.from('ponto_facial_assinaturas').update({
      status: 'ativa', quantidade_atual: resumo.quantidadeNova, quantidade_proxima: resumo.quantidadeNova,
      valor_mensal_centavos: resumo.valorMensalCentavos, valido_ate: null, atualizado_em: agora,
    }).eq('id', assinatura.id);
    await auditar(acesso, empresaId, resumo.quantidadeNova < resumo.quantidadeAnterior
      ? 'reconhecimento_facial_configuracao_reduzida'
      : 'reconhecimento_facial_configuracao_alterada', {
      alteracao_id: alteracao?.id || null, quantidade_anterior: resumo.quantidadeAnterior,
      quantidade_nova: resumo.quantidadeNova, sem_credito: true,
    });
    return NextResponse.json({ erro: false, pendente: false, mensagem: 'Configuração facial atualizada.', cobranca: await montarEstadoCobrancaFacial(acesso.db, empresaId) });
  }

  const { data: alteracao, error: erroAlteracao } = await acesso.db.from('ponto_facial_alteracoes_cobranca').insert({
    empresa_id: empresaId, assinatura_id: assinatura.id, tipo: 'aumento', status: 'pendente_pagamento',
    quantidade_anterior: resumo.quantidadeAnterior, quantidade_nova: resumo.quantidadeNova,
    valor_cobrado_centavos: resumo.valorAgoraCentavos, funcionarios_adicionados: adicionadosPagos,
    funcionarios_removidos: removidos, criado_por: acesso.usuario.id, atualizado_em: agora,
  }).select('id').single();
  if (erroAlteracao || !alteracao) return erro('Não foi possível preparar o aumento da assinatura facial.', 500);
  if (!assinatura.gateway_customer_id) {
    await acesso.db.from('ponto_facial_alteracoes_cobranca').update({ status: 'cancelada', atualizado_em: new Date().toISOString() }).eq('id', alteracao.id);
    return erro('Não foi possível localizar o cadastro de cobrança desta empresa.', 409);
  }
  const cobranca = await criarCobrancaAvulsaAsaas({
    customer: assinatura.gateway_customer_id, billingType: 'UNDEFINED',
    value: resumo.valorAgoraCentavos / 100, dueDate: hojeSaoPaulo(),
    description: `AvantaLab — inclusão proporcional de ${aumentoLiquido} funcionário${aumentoLiquido === 1 ? '' : 's'} no reconhecimento facial`,
    externalReference: `ponto_facial_alteracao:${alteracao.id}`,
  });
  if (!cobranca.ok || !cobranca.data?.id) {
    await acesso.db.from('ponto_facial_alteracoes_cobranca').update({ status: 'cancelada', atualizado_em: new Date().toISOString() }).eq('id', alteracao.id);
    return erro(cobranca.erro || 'Não foi possível gerar a cobrança proporcional.', 502);
  }

  await acesso.db.from('ponto_facial_alteracoes_cobranca').update({
    gateway_payment_id: cobranca.data.id, invoice_url: cobranca.data.invoiceUrl || null,
    vencimento: cobranca.data.dueDate || hojeSaoPaulo(), atualizado_em: new Date().toISOString(),
  }).eq('id', alteracao.id);
  await salvarFatura(acesso.db, empresaId, assinatura.id, alteracao.id, assinatura.gateway_subscription_id, cobranca.data);
  await aplicarAlteracaoPendente(acesso, empresaId, funcionariosIds, tiposMarcacao, adicionadosCobertos, adicionadosPagos, removidos);
  await acesso.db.from('ponto_facial_assinaturas').update({
    quantidade_proxima: resumo.quantidadeNova, valor_mensal_centavos: resumo.valorMensalCentavos, atualizado_em: new Date().toISOString(),
  }).eq('id', assinatura.id);
  await auditar(acesso, empresaId, 'reconhecimento_facial_cobranca_criada', {
    alteracao_id: alteracao.id, quantidade_adicional: aumentoLiquido, valor_proporcional_centavos: resumo.valorAgoraCentavos,
  });
  return NextResponse.json({
    erro: false, pendente: true, invoiceUrl: cobranca.data.invoiceUrl || null,
    mensagem: 'Cobrança proporcional gerada.', cobranca: await montarEstadoCobrancaFacial(acesso.db, empresaId),
  });
}

async function cancelar(
  acesso: NonNullable<Awaited<ReturnType<typeof autenticarPerfilCobranca>>>,
  empresaId: string,
  desativarAgora: boolean,
) {
  const assinatura = await buscarAssinaturaFacial(acesso.db, empresaId);
  if (!assinatura || assinatura.status === 'cancelada') return NextResponse.json({ erro: false, jaCancelada: true, cobranca: await montarEstadoCobrancaFacial(acesso.db, empresaId) });
  const { data: alteracoesPendentes } = await acesso.db.from('ponto_facial_alteracoes_cobranca')
    .select('id, tipo, gateway_payment_id').eq('empresa_id', empresaId).eq('status', 'pendente_pagamento');
  for (const alteracao of alteracoesPendentes || []) {
    if (alteracao.tipo !== 'aumento' || !alteracao.gateway_payment_id) continue;
    const removida = await removerCobrancaAsaas(alteracao.gateway_payment_id);
    if (!removida.ok && removida.status !== 404) {
      return erro('Existe uma cobrança proporcional que não pôde ser cancelada. Atualize o status do pagamento e tente novamente.', 409);
    }
  }
  let validoAte = assinatura.valido_ate;
  if (assinatura.gateway_subscription_id) {
    if (!validoAte) {
      const detalhe = await obterAssinaturaAsaas(assinatura.gateway_subscription_id);
      const proximoVencimento = detalhe.data?.nextDueDate || assinatura.proximo_vencimento;
      if (proximoVencimento) validoAte = new Date(`${proximoVencimento}T00:00:00-03:00`).toISOString();
    }
    const removida = await removerAssinaturaAsaas(assinatura.gateway_subscription_id);
    if (!removida.ok && removida.status !== 404) return erro(removida.erro || 'Não foi possível interromper a renovação facial.', 502);
  }
  const agora = new Date().toISOString();
  const status = desativarAgora || !validoAte || new Date(validoAte) <= new Date() ? 'cancelada' : 'cancelamento_programado';
  await acesso.db.from('ponto_facial_assinaturas').update({
    status, valido_ate: status === 'cancelada' ? agora : validoAte,
    quantidade_proxima: assinatura.quantidade_atual,
    valor_mensal_centavos: assinatura.quantidade_atual * PONTO_FACIAL_VALOR_UNITARIO_CENTAVOS,
    cancelamento_solicitado_em: agora, desativacao_imediata: desativarAgora, atualizado_em: agora,
  }).eq('id', assinatura.id);
  await acesso.db.from('ponto_facial_alteracoes_cobranca').update({
    status: 'cancelada', atualizado_em: agora,
  }).eq('empresa_id', empresaId).eq('status', 'pendente_pagamento');
  await acesso.db.from('ponto_facial_faturas').update({
    status: 'CANCELED', atualizado_em: agora,
  }).eq('empresa_id', empresaId).in('status', ['PENDING', 'OVERDUE']);
  await acesso.db.from('ponto_facial_funcionarios').update({
    status: 'removido', removido_em: agora, atualizado_em: agora,
  }).eq('empresa_id', empresaId).eq('status', 'pendente_pagamento');
  if (status === 'cancelada') {
    await acesso.db.from('ponto_config').update({ reconhecimento_facial_status: 'suspenso', atualizado_em: agora }).eq('empresa_id', empresaId);
    await acesso.db.from('ponto_facial_funcionarios').update({
      status: 'removido', removido_em: agora, atualizado_em: agora,
    }).eq('empresa_id', empresaId).neq('status', 'removido');
  }
  const { data: alteracao } = await acesso.db.from('ponto_facial_alteracoes_cobranca').insert({
    empresa_id: empresaId, assinatura_id: assinatura.id, tipo: 'cancelamento',
    status: status === 'cancelada' ? 'aplicada' : 'agendada', quantidade_anterior: assinatura.quantidade_atual,
    quantidade_nova: 0, valor_cobrado_centavos: 0, funcionarios_adicionados: [], funcionarios_removidos: [],
    criado_por: acesso.usuario.id, aplicado_em: status === 'cancelada' ? agora : null, atualizado_em: agora,
  }).select('id').single();
  await auditar(acesso, empresaId, status === 'cancelada' ? 'reconhecimento_facial_desativado' : 'reconhecimento_facial_cancelamento_programado', {
    alteracao_id: alteracao?.id || null, valido_ate: status === 'cancelada' ? agora : validoAte,
    desativacao_imediata: desativarAgora, sem_estorno: true, sem_credito: true,
  });
  return NextResponse.json({ erro: false, cobranca: await montarEstadoCobrancaFacial(acesso.db, empresaId) });
}

async function aplicarSelecaoPendente(
  acesso: NonNullable<Awaited<ReturnType<typeof autenticarPerfilCobranca>>>,
  empresaId: string,
  funcionariosIds: string[],
  tiposMarcacao: string[],
) {
  const agora = new Date().toISOString();
  await acesso.db.from('ponto_config').upsert({
    empresa_id: empresaId, reconhecimento_facial_status: 'desativado', reconhecimento_facial_tipos: tiposMarcacao,
    reconhecimento_facial_valor_centavos: PONTO_FACIAL_VALOR_UNITARIO_CENTAVOS,
    reconhecimento_facial_franquia_mensal: 120, reconhecimento_facial_aceite_versao: 'facial-v2-cobranca',
    reconhecimento_facial_aceite_em: agora, reconhecimento_facial_aceite_por: acesso.usuario.id, atualizado_em: agora,
  }, { onConflict: 'empresa_id' });
  await acesso.db.from('ponto_facial_funcionarios').update({ status: 'removido', removido_em: agora, atualizado_em: agora })
    .eq('empresa_id', empresaId).neq('status', 'removido')
    .not('funcionario_user_id', 'in', `(${funcionariosIds.join(',')})`);
  await acesso.db.from('ponto_facial_funcionarios').upsert(funcionariosIds.map((id) => ({
    empresa_id: empresaId, funcionario_user_id: id, status: 'pendente_pagamento', removido_em: null, atualizado_em: agora,
  })), { onConflict: 'empresa_id,funcionario_user_id' });
}

async function aplicarAlteracaoImediata(
  acesso: NonNullable<Awaited<ReturnType<typeof autenticarPerfilCobranca>>>,
  empresaId: string,
  funcionariosIds: string[],
  tiposMarcacao: string[],
  adicionados: string[],
  removidos: string[],
) {
  const agora = new Date().toISOString();
  if (removidos.length) await acesso.db.from('ponto_facial_funcionarios').update({ status: 'removido', removido_em: agora, atualizado_em: agora })
    .eq('empresa_id', empresaId).in('funcionario_user_id', removidos);
  if (adicionados.length) await acesso.db.from('ponto_facial_funcionarios').upsert(adicionados.map((id) => ({
    empresa_id: empresaId, funcionario_user_id: id, status: 'pendente_cadastro', removido_em: null, atualizado_em: agora,
  })), { onConflict: 'empresa_id,funcionario_user_id' });
  await acesso.db.from('ponto_config').upsert({
    empresa_id: empresaId, reconhecimento_facial_status: funcionariosIds.length ? 'ativo' : 'desativado',
    reconhecimento_facial_tipos: tiposMarcacao, atualizado_em: agora,
  }, { onConflict: 'empresa_id' });
}

async function aplicarAlteracaoPendente(
  acesso: NonNullable<Awaited<ReturnType<typeof autenticarPerfilCobranca>>>,
  empresaId: string,
  funcionariosIds: string[],
  tiposMarcacao: string[],
  adicionadosCobertos: string[],
  adicionadosPagos: string[],
  removidos: string[],
) {
  await aplicarAlteracaoImediata(acesso, empresaId, funcionariosIds, tiposMarcacao, adicionadosCobertos, removidos);
  if (adicionadosPagos.length) {
    const agora = new Date().toISOString();
    await acesso.db.from('ponto_facial_funcionarios').upsert(adicionadosPagos.map((id) => ({
      empresa_id: empresaId, funcionario_user_id: id, status: 'pendente_pagamento', removido_em: null, atualizado_em: agora,
    })), { onConflict: 'empresa_id,funcionario_user_id' });
  }
}

async function salvarFatura(
  db: Parameters<typeof montarEstadoCobrancaFacial>[0],
  empresaId: string,
  assinaturaId: string,
  alteracaoId: string,
  gatewaySubscriptionId: string | null,
  fatura: { id: string; status?: string; value?: number; dueDate?: string; invoiceUrl?: string; billingType?: string; paymentDate?: string; confirmedDate?: string },
) {
  await db.from('ponto_facial_faturas').upsert({
    empresa_id: empresaId, assinatura_id: assinaturaId, alteracao_id: alteracaoId,
    gateway_payment_id: fatura.id, gateway_subscription_id: gatewaySubscriptionId,
    status: fatura.status || 'PENDING', valor_centavos: Math.round(Number(fatura.value || 0) * 100),
    vencimento: fatura.dueDate || null, pagamento_em: fatura.paymentDate || fatura.confirmedDate || null,
    forma_pagamento: fatura.billingType || null, invoice_url: fatura.invoiceUrl || null,
    payload: fatura, atualizado_em: new Date().toISOString(),
  }, { onConflict: 'gateway_payment_id' });
}

async function auditar(
  acesso: NonNullable<Awaited<ReturnType<typeof autenticarPerfilCobranca>>>,
  empresaId: string,
  evento: string,
  dados: Record<string, unknown>,
) {
  await acesso.db.from('ponto_auditoria').insert({
    empresa_id: empresaId, ator_user_id: acesso.usuario.id, evento,
    origem: 'gestao_web', motivo: 'Gestão da cobrança do reconhecimento facial.', dados,
  });
}
