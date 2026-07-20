import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
import signpdf from '@signpdf/signpdf';
import { P12Signer } from '@signpdf/signer-p12';
import { descriptografarSegredoRepP } from '@/app/lib/rep-p-cofre';

export const runtime = 'nodejs';

function erro(mensagem: string, status = 400) { return NextResponse.json({ erro: true, mensagem }, { status }); }
const nomes: Record<string, string> = { entrada: 'Entrada', saida_refeicao: 'Saída para refeição', retorno_refeicao: 'Retorno da refeição', saida: 'Saída' };

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const auth = request.headers.get('authorization');
    if (!url || !anon || !service || !auth) return erro('Sessão não encontrada.', 401);
    const usuario = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await usuario.auth.getUser();
    if (!user) return erro('Sessão não encontrada.', 401);
    const db = createClient(url, service);
    const { data: ponto, error: erroPonto } = await db.from('ponto_registros').select('id, empresa_id, user_id, tipo, registrado_em, dia, latitude, longitude, precisao_m').eq('id', id).maybeSingle();
    if (erroPonto || !ponto || ponto.user_id !== user.id) return erro('Comprovante não encontrado.', 404);
    const [{ data: funcionario }, { data: empresa }, { data: certificado }] = await Promise.all([
      db.from('ponto_funcionarios').select('nome').eq('empresa_id', ponto.empresa_id).eq('user_id', user.id).maybeSingle(),
      db.from('empresas').select('nome').eq('id', ponto.empresa_id).maybeSingle(),
      db.from('rep_p_certificados').select('modo, arquivo_criptografado, senha_criptografada, validade_fim').eq('ativo', true).maybeSingle(),
    ]);
    if (!certificado) return erro('A assinatura do REP-P ainda não foi configurada.', 409);
    const vencido = new Date(certificado.validade_fim) < new Date();
    if (certificado.modo === 'producao' && vencido) return erro('O certificado de produção está vencido.', 409);
    const pdf = await PDFDocument.create();
    const pagina = pdf.addPage([595.28, 841.89]);
    const fonte = await pdf.embedFont(StandardFonts.Helvetica);
    const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
    const quando = new Date(ponto.registrado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    pagina.drawText('COMPROVANTE DE REGISTRO DE PONTO', { x: 48, y: 780, size: 16, font: negrito, color: rgb(0, 0.24, 0.45) });
    pagina.drawText(certificado.modo === 'homologacao' ? 'HOMOLOGAÇÃO — SEM VALIDADE LEGAL' : 'REP-P', { x: 48, y: 754, size: 9, font: negrito, color: certificado.modo === 'homologacao' ? rgb(0.7, 0.2, 0.1) : rgb(0, 0.24, 0.45) });
    const linhas = [
      ['Trabalhador', funcionario?.nome || 'Não identificado'], ['Empresa', empresa?.nome || 'Não identificada'], ['Marcação', nomes[ponto.tipo] || ponto.tipo], ['Data e hora', quando], ['Código do registro', ponto.id], ['Data de referência', ponto.dia], ['Localização', `${Number(ponto.latitude).toFixed(6)}, ${Number(ponto.longitude).toFixed(6)} (precisão ${Math.round(Number(ponto.precisao_m))} m)`],
    ];
    let y = 710;
    for (const [rotulo, valor] of linhas) { pagina.drawText(`${rotulo}:`, { x: 48, y, size: 10, font: negrito }); pagina.drawText(valor, { x: 180, y, size: 10, font: fonte }); y -= 30; }
    pagina.drawText('Assinatura eletrônica PAdES do desenvolvedor REP-P.', { x: 48, y: 120, size: 9, font: fonte, color: rgb(0.3, 0.3, 0.3) });
    pdflibAddPlaceholder({ pdfDoc: pdf, pdfPage: pagina, reason: 'Comprovante de registro de ponto REP-P', contactInfo: 'AvantaLab', name: 'AvantaLab REP-P', location: 'Brasil', signatureLength: 30000, widgetRect: [48, 45, 300, 95], appName: 'AvantaLab REP-P' });
    const comPlaceholder = Buffer.from(await pdf.save({ useObjectStreams: false }));
    const pfx = descriptografarSegredoRepP(certificado.arquivo_criptografado);
    const senha = descriptografarSegredoRepP(certificado.senha_criptografada).toString('utf8');
    const assinado = await signpdf.sign(comPlaceholder, new P12Signer(pfx, { passphrase: senha }));
    return new NextResponse(new Uint8Array(assinado), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="comprovante-ponto-${ponto.id}.pdf"`, 'Cache-Control': 'no-store', 'X-REP-P-Modo': certificado.modo } });
  } catch (causa) {
    console.error('Erro ao gerar comprovante REP-P:', causa instanceof Error ? causa.message : causa);
    const detalhe = causa instanceof Error && /placeholder|signature/i.test(causa.message) ? ' A assinatura excedeu o espaço reservado no PDF.' : '';
    return erro(`Não foi possível gerar o comprovante assinado.${detalhe}`, 500);
  }
}
