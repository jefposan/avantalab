import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { fiscalDocumentForSale, importNfeForSale, issueNfeForSale, loadFiscalSale, reconcileFiscal } from '@/app/modules/marketplaces/services/mercadolivre-fiscal';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get('content-length') || 0) > 3 * 1024 * 1024) throw new MarketplaceError(413, 'file_too_large', 'Use um XML de até 2 MB.');
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 3 * 1024 * 1024) throw new MarketplaceError(413, 'file_too_large', 'Use um XML de até 2 MB.');
    const body = JSON.parse(raw);
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, ['issue_nfe', 'import_nfe'].includes(body.action) ? 'manage' : 'view');
    if (body.action === 'consult') {
      const { sale, connection, shipmentId } = await loadFiscalSale(db, empresaId, body.connectionId, body.saleId);
      const fiscal = await reconcileFiscal(db, connection, sale, shipmentId);
      return NextResponse.json({ fiscal }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (body.action === 'download') {
      const result = await fiscalDocumentForSale(db, empresaId, body.connectionId, body.saleId, body.kind, body.documentId, body.format);
      const mime = result.format === 'pdf' ? 'application/pdf' : result.format === 'xml' ? 'application/xml' : 'application/json';
      return new NextResponse(new Uint8Array(result.bytes), { headers: { 'Content-Type': mime, 'Content-Disposition': `attachment; filename="documento-fiscal.${result.format}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    }
    if (body.confirmed !== true) throw new MarketplaceError(400, 'confirmation_required', 'Confirme a operação fiscal deste pedido.');
    const result = body.action === 'issue_nfe' ? await issueNfeForSale(db, empresaId, body.connectionId, body.saleId, body.faturadorConfigured === true, usuario.id)
      : body.action === 'import_nfe' ? await importNfeForSale(db, empresaId, body.connectionId, body.saleId, body.xml, body.replaceInvoiceId, usuario.id)
      : null;
    if (!result) throw new MarketplaceError(400, 'invalid_action', 'Ação fiscal inválida.');
    return NextResponse.json({ ...result, message: 'Solicitação fiscal aceita. Consulte documentos e etiqueta para acompanhar o processamento.' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
