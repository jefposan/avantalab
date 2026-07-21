import Link from 'next/link';

export function PageIntro({ eyebrow, title, description, action }: { eyebrow?: string; title?: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.18em] text-teal-700">{eyebrow}</p>}{title && <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>}{description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}</div>{action}</div>;
}

export function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) { return <button type="button" onClick={onClick} className="min-h-11 rounded-lg bg-[#0c567f] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#073f67]">{children}</button>; }
export function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) { return <button type="button" onClick={onClick} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">{children}</button>; }

export function Panel({ title, subtitle, action, children, className = '' }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`overflow-hidden rounded-xl bg-white shadow-[0_2px_14px_rgba(15,23,42,.055)] ${className}`}><div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4"><div><h3 className="font-semibold text-[#07355d]">{title}</h3>{subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}</div>{action}</div><div className="p-5">{children}</div></section>;
}

export function StatGrid({ items }: { items: (readonly [string, string, string?])[] }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{items.map(([label, value, note], index) => <div key={label} className="relative overflow-hidden rounded-xl bg-white p-5 shadow-[0_2px_14px_rgba(15,23,42,.055)]"><span className={`absolute inset-y-0 left-0 w-1 ${index > 5 ? 'bg-amber-400' : index > 1 && index < 4 ? 'bg-teal-400' : 'bg-[#0c567f]'}`} /><p className="text-sm text-slate-500">{label}</p><div className="mt-2 flex items-end justify-between gap-2"><strong className="text-3xl font-semibold text-slate-900">{value}</strong>{note && <span className="text-right text-[11px] text-slate-400">{note}</span>}</div></div>)}</div>;
}

export function StatusBadge({ value }: { value: string }) {
  const tone = /Válido|Ativo|Aprovado|Concluído|Contratado/.test(value) ? 'bg-emerald-50 text-emerald-700' : /Vencido|Recusado|Afastado|Desligado|Atrasad/.test(value) ? 'bg-red-50 text-red-700' : /Próximo|Pendente|experiência|Planejado|Entrevista/.test(value) ? 'bg-amber-50 text-amber-700' : /férias|Em férias/.test(value) ? 'bg-cyan-50 text-cyan-700' : 'bg-slate-100 text-slate-600';
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${tone}`}>{value}</span>;
}

export function DataTable({ headers, rows, linkColumn }: { headers: string[]; rows: (string | React.ReactNode)[][]; linkColumn?: { index: number; href: (row: (string | React.ReactNode)[]) => string } }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-slate-200">{headers.map(h => <th key={h} className="whitespace-nowrap px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}</tr></thead><tbody>{rows.map((row, ri) => <tr key={ri} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">{row.map((cell, ci) => <td key={ci} className="px-3 py-3.5 text-slate-600">{linkColumn?.index === ci ? <Link href={linkColumn.href(row)} className="font-medium text-[#0c567f] hover:underline">{cell}</Link> : cell}</td>)}</tr>)}</tbody></table></div>;
}

export function Filters({ search = 'Buscar...', selects = [] }: { search?: string; selects?: string[] }) { return <div className="mb-4 flex flex-col gap-2 md:flex-row"><label className="relative min-w-0 flex-1"><span className="sr-only">Buscar</span><input placeholder={search} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#0c7190]" /></label>{selects.map(s => <select key={s} aria-label={s} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none"><option>{s}</option></select>)}</div>; }

export function PlaceholderModal({ open, title, onClose }: { open: boolean; title: string; onClose: () => void }) {
  if (!open) return null; return <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-4" onMouseDown={onClose}><div onMouseDown={e => e.stopPropagation()} className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"><div className="flex justify-between"><h3 className="text-lg font-semibold text-[#07355d]">{title}</h3><button onClick={onClose} className="text-xl text-slate-400">×</button></div><p className="mt-3 text-sm text-slate-500">Estrutura visual do protótipo. O cadastro definitivo será conectado em uma etapa futura.</p><div className="mt-5 grid gap-3"><input placeholder="Nome" className="h-11 rounded-lg border border-slate-200 px-3"/><textarea placeholder="Descrição" className="min-h-24 rounded-lg border border-slate-200 p-3"/><PrimaryButton onClick={onClose}>Simular cadastro</PrimaryButton></div></div></div>;
}
