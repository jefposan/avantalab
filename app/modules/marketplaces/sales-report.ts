/** Read-only reporting contract. Money is always aggregated in integer cents. */
export type ReportLine = {
  date: string; provider: string; accountId: string; warehouseId: string;
  gross: number | null; units: number; status: string; currency: string;
};
export type ReportMonth = { month: number; gross: number; orders: number; units: number; missingGross: number; pendingCosts: number };
export type SalesReport = {
  year: number; months: ReportMonth[]; generatedAt: string;
  accounts: { value: string; label: string; provider: string }[];
  warehouses: { value: string; label: string }[];
};
export type ReportFilters = { provider: string; accountId: string; warehouseId: string };
export const REPORT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
export function reportPeriod(date: string): { year: number; month: number } | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const parsed = new Date(`${date}T12:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === date ? { year: parsed.getUTCFullYear(), month: parsed.getUTCMonth() + 1 } : null;
  }
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA',{ timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit' }).formatToParts(parsed);
  return { year: Number(parts.find(p=>p.type==='year')?.value), month: Number(parts.find(p=>p.type==='month')?.value) };
}
export function aggregateSalesReport(lines: ReportLine[], year: number, filters: ReportFilters): ReportMonth[] {
  const months = Array.from({length:12},(_,i)=>({month:i+1,gross:0,orders:0,units:0,missingGross:0,pendingCosts:0}));
  for (const line of lines) {
    // Pending payments, cancelled/refunded and ambiguous partial refunds never become confirmed revenue.
    if (!(line.status==='paid' || line.status==='confirmed' && ['magalu','direct'].includes(line.provider)) || line.currency !== 'BRL') continue;
    if (filters.provider && line.provider!==filters.provider || filters.accountId && line.accountId!==filters.accountId || filters.warehouseId && line.warehouseId!==filters.warehouseId) continue;
    const period=reportPeriod(line.date);
    if (!period || period.year!==year) continue;
    const bucket=months[period.month-1];
    bucket.orders++; bucket.units+=line.units;
    if (line.gross===null) bucket.missingGross++; else bucket.gross+=line.gross;
    // Stored sales do not yet contain verified seller fees and freight, including direct-sale expenses.
    bucket.pendingCosts++;
  }
  return months;
}
export function reportTotal(months: ReportMonth[]): ReportMonth {
  return months.reduce((total,m)=>({month:0,gross:total.gross+m.gross,orders:total.orders+m.orders,units:total.units+m.units,missingGross:total.missingGross+m.missingGross,pendingCosts:total.pendingCosts+m.pendingCosts}),{month:0,gross:0,orders:0,units:0,missingGross:0,pendingCosts:0});
}
export function toggleReportMonth(current: number | null, selected: number): number | null { return current===selected ? null : selected; }
