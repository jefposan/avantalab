import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
import signpdf from '@signpdf/signpdf';
import { P12Signer } from '@signpdf/signer-p12';
import { createHash, randomUUID } from 'node:crypto';
import { descriptografarSegredoRepP } from '@/app/lib/rep-p-cofre';
import { autorizarEmpresa } from '../route';

export const runtime = 'nodejs';
const erro = (mensagem: string, status = 400) => NextResponse.json({ erro: true, mensagem }, { status });
const tipo: Record<string, string> = { entrada: 'Entrada', saida_refeicao: 'Saída refeição', retorno_refeicao: 'Retorno refeição', saida: 'Saída' };
const br = (v: string) => `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}`;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url); const empresaId = url.searchParams.get('empresaId'); const funcionarioId = url.searchParams.get('funcionarioId'); const inicio = url.searchParams.get('inicio'); const fim = url.searchParams.get('fim');
    if (!empresaId || !funcionarioId || !inicio || !fim || inicio > fim) return erro('Informe funcionário e período válidos.');
    const contexto = await autorizarEmpresa(request, empresaId); if (!contexto) return erro('Acesso não autorizado para esta empresa.', 403);
    const { db, solicitante } = contexto;
    const [{ data: empresa }, { data: perfil }, { data: funcionario }, { data: registros }, { data: certificado }, { data: decisoes }, { data: bancoHoras }] = await Promise.all([
      db.from('empresas').select('nome').eq('id', empresaId).maybeSingle(),
      db.from('cadastros_perfil').select('documento, razao_social, nome_fantasia').eq('empresa_id', empresaId).maybeSingle(),
      db.from('ponto_funcionarios').select('nome, cpf').eq('empresa_id', empresaId).eq('user_id', funcionarioId).maybeSingle(),
      db.from('ponto_registros').select('tipo, registrado_em, dia').eq('empresa_id', empresaId).eq('user_id', funcionarioId).gte('dia', inicio).lte('dia', fim).order('registrado_em'),
      db.from('rep_p_certificados').select('modo, validade_fim, arquivo_criptografado, senha_criptografada').eq('ativo', true).maybeSingle(),
      db.from('ponto_tratamentos_decisoes').select('ajuste_id, abono_id, decisao').eq('empresa_id', empresaId).eq('decisao', 'aprovado'),
      db.from('ponto_banco_horas_lancamentos').select('data_referencia, minutos, natureza, motivo').eq('empresa_id', empresaId).eq('funcionario_user_id', funcionarioId).gte('data_referencia', inicio).lte('data_referencia', fim).order('data_referencia'),
    ]);
    if (!empresa || !perfil || !funcionario || !certificado) return erro('Configuração REP-P incompleta para gerar o Espelho.', 409);
    if (certificado.modo === 'producao' && new Date(certificado.validade_fim) < new Date()) return erro('O certificado de produção está vencido.', 409);
    const ajusteIds = (decisoes || []).flatMap((item) => item.ajuste_id ? [item.ajuste_id] : []); const abonoIds = (decisoes || []).flatMap((item) => item.abono_id ? [item.abono_id] : []);
    const [{ data: ajustes }, { data: abonos }] = await Promise.all([
      ajusteIds.length ? db.from('ponto_ajustes').select('data_referencia, tipo, motivo').eq('empresa_id', empresaId).eq('funcionario_user_id', funcionarioId).in('id', ajusteIds).gte('data_referencia', inicio).lte('data_referencia', fim) : Promise.resolve({ data: [] }),
      abonoIds.length ? db.from('ponto_abonos').select('data_inicio, data_fim, minutos_abonados, tipo, motivo').eq('empresa_id', empresaId).eq('funcionario_user_id', funcionarioId).in('id', abonoIds).lte('data_inicio', fim).gte('data_fim', inicio) : Promise.resolve({ data: [] }),
    ]);
    const pdf = await PDFDocument.create(); const regular = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let pagina = pdf.addPage([595.28, 841.89]); let y = 790;
    const cabecalho = () => { pagina.drawText('ESPELHO DE PONTO ELETRÔNICO', { x: 45, y, size: 15, font: bold, color: rgb(0, .24, .45) }); y -= 25; pagina.drawText(certificado.modo === 'homologacao' ? 'HOMOLOGAÇÃO — SEM VALIDADE LEGAL' : 'REP-P', { x: 45, y, size: 9, font: bold, color: rgb(.65, .2, .1) }); y -= 22; };
    cabecalho();
    const linhas = [['Empregador', perfil.razao_social || perfil.nome_fantasia || empresa.nome], ['Documento', perfil.documento || '-'], ['Trabalhador', funcionario.nome], ['CPF', funcionario.cpf || '-'], ['Período', `${br(inicio)} a ${br(fim)}`], ['Emitido em', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })]];
    for (const [a, b] of linhas) { pagina.drawText(`${a}:`, { x: 45, y, size: 9, font: bold }); pagina.drawText(b, { x: 140, y, size: 9, font: regular }); y -= 17; }
    y -= 8; pagina.drawText('Data', { x: 45, y, size: 9, font: bold }); pagina.drawText('Hora', { x: 125, y, size: 9, font: bold }); pagina.drawText('Marcação', { x: 200, y, size: 9, font: bold }); y -= 13;
    for (const registro of registros || []) { if (y < 85) { pagina = pdf.addPage([595.28, 841.89]); y = 790; cabecalho(); } pagina.drawText(br(registro.dia), { x: 45, y, size: 9, font: regular }); pagina.drawText(new Date(registro.registrado_em).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }), { x: 125, y, size: 9, font: regular }); pagina.drawText(tipo[registro.tipo] || registro.tipo, { x: 200, y, size: 9, font: regular }); y -= 14; }
    y -= 8; pagina.drawText('TRATAMENTOS APROVADOS E BANCO DE HORAS', { x: 45, y, size: 9, font: bold, color: rgb(0, .24, .45) }); y -= 16;
    const tratamentos = [
      ...(ajustes || []).map((item) => `${br(item.data_referencia)} · Ajuste ${item.tipo}: ${item.motivo}`),
      ...(abonos || []).map((item) => `${br(item.data_inicio)}${item.data_fim !== item.data_inicio ? ` a ${br(item.data_fim)}` : ''} · Abono${item.minutos_abonados ? ` (${item.minutos_abonados} min)` : ''}: ${item.motivo}`),
      ...(bancoHoras || []).map((item) => `${br(item.data_referencia)} · Banco de horas ${Number(item.minutos) >= 0 ? '+' : ''}${item.minutos} min: ${item.motivo}`),
    ];
    if (!tratamentos.length) { pagina.drawText('Nenhum ajuste aprovado, abono aprovado ou movimento no período.', { x: 45, y, size: 8, font: regular, color: rgb(.3, .3, .3) }); y -= 13; }
    for (const linha of tratamentos) { if (y < 85) { pagina = pdf.addPage([595.28, 841.89]); y = 790; cabecalho(); } pagina.drawText(linha.slice(0, 105), { x: 45, y, size: 8, font: regular }); y -= 13; }
    pdflibAddPlaceholder({ pdfDoc: pdf, pdfPage: pagina, reason: 'Espelho de Ponto Eletrônico REP-P', contactInfo: 'AvantaLab', name: 'AvantaLab REP-P', location: 'Brasil', signatureLength: 30000, widgetRect: [45, 20, 300, 48], appName: 'AvantaLab REP-P' });
    const base = Buffer.from(await pdf.save({ useObjectStreams: false })); const assinado = await signpdf.sign(base, new P12Signer(descriptografarSegredoRepP(certificado.arquivo_criptografado), { passphrase: descriptografarSegredoRepP(certificado.senha_criptografada).toString('utf8') }));
    const documentoId = randomUUID(); const arquivoNome = `espelho-ponto-${funcionario.cpf || funcionarioId}-${inicio}-${fim}.pdf`; const storagePath = `${empresaId}/${documentoId}/${arquivoNome}`;
    const { error: upload } = await db.storage.from('rep-p-documentos').upload(storagePath, assinado, { contentType: 'application/pdf', upsert: false }); if (upload) throw upload;
    const { error: inserir } = await db.from('rep_p_documentos_gerados').insert({ id: documentoId, empresa_id: empresaId, tipo: 'espelho', periodo_inicio: inicio, periodo_fim: fim, arquivo_nome: arquivoNome, storage_path: storagePath, sha256: createHash('sha256').update(assinado).digest('hex'), modo: certificado.modo, solicitado_por: solicitante }); if (inserir) throw inserir;
    await db.from('rep_p_documentos_auditoria').insert({ documento_id: documentoId, empresa_id: empresaId, ator_user_id: solicitante, evento: 'gerado' });
    return new NextResponse(new Uint8Array(assinado), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${arquivoNome}"`, 'Cache-Control': 'private, no-store' } });
  } catch (causa) { console.error('Erro ao gerar Espelho REP-P:', causa); return erro('Não foi possível gerar o Espelho de Ponto Eletrônico.', 500); }
}
