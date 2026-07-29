import Link from 'next/link';

export default function LegalPageBackLink() {
  return (
    <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-sky-800 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-300">
      <span aria-hidden="true">←</span> Voltar à página inicial
    </Link>
  );
}
