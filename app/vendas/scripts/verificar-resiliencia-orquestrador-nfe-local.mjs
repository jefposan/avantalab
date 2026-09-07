import { pathToFileURL } from 'node:url';

import { createSyntheticNfeOrchestratorLab } from './verificar-orquestrador-nfe-local.mjs';

export const NFE_ORCHESTRATOR_RESILIENCE_LAB_REFERENCE = '2026-09-04';

const RECEIPT = '351000000000001';

function soap(body) {
  return `<?xml version="1.0"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body>${body}</soap:Body></soap:Envelope>`;
}

function authorizationPendingResponse() {
  return soap(`<retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cStat>103</cStat><xMotivo>Lote recebido com sucesso</xMotivo><cUF>35</cUF><infRec><nRec>${RECEIPT}</nRec><tMed>1</tMed></infRec></retEnviNFe>`);
}

function authorizationRejectedResponse(accessKey) {
  return soap(`<retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cStat>104</cStat><xMotivo>Lote processado</xMotivo><cUF>35</cUF><protNFe versao="4.00"><infProt><tpAmb>2</tpAmb><chNFe>${accessKey}</chNFe><dhRecbto>2026-09-04T12:00:01-03:00</dhRecbto><cStat>778</cStat><xMotivo>Informado NCM inexistente</xMotivo></infProt></protNFe></retEnviNFe>`);
}

function receiptPendingResponse() {
  return soap(`<retConsReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>35</cUF><cStat>105</cStat><xMotivo>Lote em processamento</xMotivo><nRec>${RECEIPT}</nRec><tMed>1</tMed></retConsReciNFe>`);
}

function receiptDuplicateResponse(accessKey) {
  return soap(`<retConsReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>35</cUF><cStat>104</cStat><xMotivo>Lote processado</xMotivo><nRec>${RECEIPT}</nRec><protNFe versao="4.00"><infProt><tpAmb>2</tpAmb><chNFe>${accessKey}</chNFe><dhRecbto>2026-09-04T12:00:02-03:00</dhRecbto><nProt>135260000000001</nProt><digVal>SINTETICO</digVal><cStat>204</cStat><xMotivo>Duplicidade de NF-e</xMotivo></infProt></protNFe></retConsReciNFe>`);
}

function protocolNotFoundResponse(accessKey) {
  return soap(`<retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>35</cUF><cStat>217</cStat><xMotivo>NF-e não consta na base</xMotivo><chNFe>${accessKey}</chNFe></retConsSitNFe>`);
}

function protocolAuthorizedResponse(accessKey) {
  return soap(`<retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>35</cUF><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo><chNFe>${accessKey}</chNFe><protNFe versao="4.00"><infProt><tpAmb>2</tpAmb><chNFe>${accessKey}</chNFe><dhRecbto>2026-09-04T12:00:03-03:00</dhRecbto><nProt>135260000000001</nProt><digVal>SINTETICO</digVal><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe></retConsSitNFe>`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runTimeoutRecoveryScenario() {
  const lab = await createSyntheticNfeOrchestratorLab({
    authorizationResponder: () => new Error('timeout sintético depois do registro do envio'),
    returnResponder: ({ kind, accessKey, call }) => {
      assert(kind === 'protocol', 'O timeout deve ser reconciliado pela chave, não por recibo.');
      return call === 1 ? protocolNotFoundResponse(accessKey) : protocolAuthorizedResponse(accessKey);
    },
  });
  try {
    const first = await lab.continueEmission({ idempotencyKey: 'ensaio-timeout-sintetico-001' });
    let snapshot = lab.snapshot();
    assert(first.ok === false && first.pendingRecovery === true, 'O timeout deve deixar a transmissão sob recuperação.');
    assert(snapshot.state === 'submitted' && snapshot.attempts === 1, 'O envio deve ficar registrado uma única vez antes da recuperação.');

    const repeated = await lab.continueEmission({ expectedVersion: snapshot.version, idempotencyKey: 'ensaio-timeout-repetido-001' });
    assert(repeated.ok === false && lab.metrics.syntheticAuthorizationCalls === 1, 'Repetir a ação não pode retransmitir uma NF-e já submetida.');

    const notFound = await lab.runRecoveryOnce({ limit: 1 });
    assert(notFound.retried === 1, 'A primeira consulta sem protocolo deve reagendar a mesma tarefa.');
    lab.advanceSeconds(16);
    const reconciled = await lab.runRecoveryOnce({ limit: 1 });
    assert(reconciled.completed === 1 && lab.snapshot().state === 'authorized', 'A consulta seguinte deve reconciliar a autorização pela chave.');
    await lab.runRecoveryOnce();
    await lab.runRecoveryOnce();

    snapshot = lab.snapshot();
    const artifacts = await lab.inspectFinalArtifacts();
    assert(snapshot.state === 'danfe_ready' && artifacts.processed && artifacts.danfe, 'A recuperação do timeout deve terminar com procNFe e DANFE.');
    assert(lab.metrics.syntheticAuthorizationCalls === 1 && lab.metrics.protocolQueries === 2 && lab.metrics.receiptQueries === 0, 'O timeout deve usar um envio e duas consultas por chave.');
    assert(snapshot.jobs.every((job) => job.state === 'completed') && snapshot.jobs.length === 3, 'Todas as três tarefas do cenário de timeout devem concluir.');
    return {
      state: snapshot.state,
      transmissionAttempts: snapshot.attempts,
      authorizationCalls: lab.metrics.syntheticAuthorizationCalls,
      protocolQueries: lab.metrics.protocolQueries,
      retriedJobs: notFound.retried,
      completedJobs: snapshot.jobs.length,
    };
  } finally {
    await lab.cleanup();
  }
}

async function runPendingReceiptScenario() {
  const lab = await createSyntheticNfeOrchestratorLab({
    authorizationResponder: () => authorizationPendingResponse(),
    returnResponder: ({ kind, accessKey, call }) => {
      if (kind === 'receipt') return call <= 2 ? receiptPendingResponse() : receiptDuplicateResponse(accessKey);
      return protocolAuthorizedResponse(accessKey);
    },
  });
  try {
    const first = await lab.continueEmission({ idempotencyKey: 'ensaio-recibo-sintetico-001' });
    let snapshot = lab.snapshot();
    assert(first.ok === true && first.result?.state === 'processing' && first.result?.receiptConsultationPending === true, 'O lote 103 deve persistir o recibo e aguardar consulta.');
    assert(snapshot.attempts === 1, 'O lote com recibo deve possuir uma única tentativa de transmissão.');

    const repeated = await lab.continueEmission({ expectedVersion: snapshot.version, idempotencyKey: 'ensaio-recibo-repetido-001' });
    assert(repeated.ok === true && repeated.result?.processing === true && lab.metrics.syntheticAuthorizationCalls === 1, 'Continuar durante o processamento deve apenas reler o estado existente.');

    const pending = await lab.runRecoveryOnce({ limit: 2 });
    assert(pending.retried === 2 && lab.metrics.receiptQueries === 2, 'As respostas 105 devem reagendar as consultas sem transmitir novamente.');
    lab.advanceSeconds(16);
    const reconciled = await lab.runRecoveryOnce({ limit: 1 });
    assert(reconciled.completed === 1 && lab.snapshot().state === 'authorized', 'A duplicidade deve ser conferida pela consulta de protocolo antes de autorizar.');
    await lab.runRecoveryOnce();
    await lab.runRecoveryOnce();

    snapshot = lab.snapshot();
    const artifacts = await lab.inspectFinalArtifacts();
    assert(snapshot.state === 'danfe_ready' && artifacts.processed && artifacts.danfe, 'O recibo pendente deve terminar com procNFe e DANFE.');
    assert(lab.metrics.syntheticAuthorizationCalls === 1 && lab.metrics.receiptQueries === 3 && lab.metrics.protocolQueries === 1, 'O cenário deve usar um envio, três consultas de recibo e uma consulta de protocolo.');
    assert(snapshot.jobs.every((job) => job.state === 'completed') && snapshot.jobs.length === 4, 'Todas as quatro tarefas do cenário de recibo devem concluir.');
    return {
      state: snapshot.state,
      transmissionAttempts: snapshot.attempts,
      authorizationCalls: lab.metrics.syntheticAuthorizationCalls,
      receiptQueries: lab.metrics.receiptQueries,
      protocolQueries: lab.metrics.protocolQueries,
      retriedJobs: pending.retried,
      completedJobs: snapshot.jobs.length,
    };
  } finally {
    await lab.cleanup();
  }
}

async function runRejectedScenario() {
  const lab = await createSyntheticNfeOrchestratorLab({
    authorizationResponder: ({ accessKey }) => authorizationRejectedResponse(accessKey),
  });
  try {
    const first = await lab.continueEmission({ idempotencyKey: 'ensaio-rejeicao-sintetica-001' });
    let snapshot = lab.snapshot();
    assert(first.ok === true && first.result?.state === 'rejected' && first.result?.statusCode === '778', 'A rejeição deve preservar código, motivo e estado sem criar autorização.');
    assert(snapshot.state === 'rejected' && snapshot.attempts === 1, 'A rejeição deve registrar uma única tentativa de transmissão.');

    const repeated = await lab.continueEmission({ expectedVersion: snapshot.version, idempotencyKey: 'ensaio-rejeicao-repetida-001' });
    assert(repeated.ok === true && repeated.result?.rejected === true && lab.metrics.syntheticAuthorizationCalls === 1, 'Continuar uma nota rejeitada deve apenas devolver o estado existente.');
    const staleRecovery = await lab.runRecoveryOnce({ limit: 1 });
    assert(staleRecovery.completed === 1 && lab.metrics.protocolQueries === 0 && lab.metrics.receiptQueries === 0, 'A tarefa anterior deve encerrar como obsoleta sem consulta adicional.');

    snapshot = lab.snapshot();
    const status = await lab.getStatus();
    assert(status.ok === true && status.emission.actionRequired === true, 'A rejeição deve exigir uma ação manual clara.');
    assert(status.emission.recommendedAction === 'review_fiscal_data' && status.emission.recommendedActionLabel === 'Revisar dados fiscais', 'A orientação da rejeição deve levar à correção fiscal.');
    assert(snapshot.artifacts.join(',') === 'signed_xml', 'Uma nota rejeitada não pode possuir protocolo autorizado, procNFe ou DANFE.');
    return {
      state: snapshot.state,
      statusCode: first.result.statusCode,
      transmissionAttempts: snapshot.attempts,
      authorizationCalls: lab.metrics.syntheticAuthorizationCalls,
      automaticRetransmissions: 0,
      recommendedAction: status.emission.recommendedAction,
      completedJobs: snapshot.jobs.filter((job) => job.state === 'completed').length,
    };
  } finally {
    await lab.cleanup();
  }
}

async function runRetryExhaustionScenario() {
  const lab = await createSyntheticNfeOrchestratorLab({
    authorizationResponder: () => new Error('timeout sintético persistente depois do registro do envio'),
    returnResponder: ({ kind, accessKey }) => {
      assert(kind === 'protocol', 'A emissão sem recibo deve ser consultada somente pela chave.');
      return protocolNotFoundResponse(accessKey);
    },
  });
  try {
    const first = await lab.continueEmission({ idempotencyKey: 'ensaio-esgotamento-sintetico-001' });
    assert(first.ok === false && first.pendingRecovery === true, 'A ausência de resposta deve iniciar recuperação protegida.');
    let retriedJobs = 0;
    let deadLetterJobs = 0;
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      const result = await lab.runRecoveryOnce({ limit: 1 });
      retriedJobs += result.retried;
      deadLetterJobs += result.deadLetter;
      if (attempt < 8) lab.advanceSeconds(901);
    }

    const snapshot = lab.snapshot();
    const status = await lab.getStatus();
    assert(snapshot.state === 'submitted' && snapshot.attempts === 1, 'Esgotar consultas não pode alterar a nota nem registrar outro envio.');
    assert(snapshot.jobs.length === 1 && snapshot.jobs[0].state === 'dead_letter' && snapshot.jobs[0].attemptCount === 8, 'A oitava falha deve encerrar a tarefa para revisão manual.');
    assert(retriedJobs === 7 && deadLetterJobs === 1 && lab.metrics.protocolQueries === 8, 'A política deve retentar sete vezes e interromper na oitava consulta.');
    assert(status.ok === true && status.emission.needsTechnicalAttention === true && status.emission.recoveryPending === false, 'A Central Fiscal deve distinguir revisão necessária de recuperação ativa.');
    assert(status.emission.recommendedAction === 'review_emission' && status.emission.recommendedActionLabel === 'Revisar emissão', 'A fila esgotada deve orientar revisão sem afirmar que alguém já foi avisado.');

    const repeated = await lab.continueEmission({ expectedVersion: snapshot.version, idempotencyKey: 'ensaio-esgotamento-repetido-001' });
    assert(repeated.ok === false && lab.metrics.syntheticAuthorizationCalls === 1, 'A revisão manual não pode ser substituída por retransmissão automática.');
    return {
      state: snapshot.state,
      queueState: snapshot.jobs[0].state,
      queueAttempts: snapshot.jobs[0].attemptCount,
      transmissionAttempts: snapshot.attempts,
      authorizationCalls: lab.metrics.syntheticAuthorizationCalls,
      protocolQueries: lab.metrics.protocolQueries,
      retriedJobs,
      deadLetterJobs,
      automaticRetransmissions: 0,
      recommendedAction: status.emission.recommendedAction,
    };
  } finally {
    await lab.cleanup();
  }
}

export async function runSyntheticNfeOrchestratorResilienceRehearsal() {
  const timeout = await runTimeoutRecoveryScenario();
  const pendingReceipt = await runPendingReceiptScenario();
  const rejected = await runRejectedScenario();
  const retryExhaustion = await runRetryExhaustionScenario();
  return Object.freeze({
    ok: true,
    environment: 'homologacao',
    scenarios: Object.freeze({ timeout, pendingReceipt, rejected, retryExhaustion }),
    totalAuthorizationCalls: timeout.authorizationCalls + pendingReceipt.authorizationCalls + rejected.authorizationCalls + retryExhaustion.authorizationCalls,
    totalTransmissionAttempts: timeout.transmissionAttempts + pendingReceipt.transmissionAttempts + rejected.transmissionAttempts + retryExhaustion.transmissionAttempts,
    retransmissions: 0,
    externalNetworkCalls: 0,
    realCertificateUsed: false,
    contentReturned: false,
  });
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const result = await runSyntheticNfeOrchestratorResilienceRehearsal();
  process.stdout.write(`AVANTALAB_NFE_ORCHESTRATOR_RESILIENCE_OK scenarios=${Object.keys(result.scenarios).length} retransmissions=${result.retransmissions} network=${result.externalNetworkCalls}\n`);
}
