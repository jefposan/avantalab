import { alerts, departmentDistribution, events, stats } from './data/mockData';
import { Panel, StatGrid, StatusBadge } from './components/RhUi';
import AvaRhCard from './components/AvaRhCard';

export default function RhDashboard() { const max = Math.max(...departmentDistribution.map(d => d[1] as number)); return <div className="space-y-6">
  <div><p className="text-sm text-slate-500">Sexta-feira, 11 de julho</p><h2 className="mt-1 text-2xl font-semibold text-slate-900">Bom dia, Patrícia</h2><p className="mt-1 text-sm text-slate-500">Aqui está o panorama mais recente da sua equipe.</p></div>
  <StatGrid items={stats as [string,string,string][]}/>
  <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
    <Panel title="Alertas importantes" subtitle="Itens que precisam de acompanhamento"><div className="divide-y divide-slate-100">{alerts.map(([level,text]) => <div key={text} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className={`h-2 w-2 shrink-0 rounded-full ${level === 'urgente' ? 'bg-red-400' : level === 'atenção' ? 'bg-amber-400' : 'bg-cyan-500'}`} /><p className="flex-1 text-sm text-slate-600">{text}</p><StatusBadge value={level}/></div>)}</div></Panel>
    <AvaRhCard />
  </div>
  <div className="grid gap-6 xl:grid-cols-2">
    <Panel title="Equipe por departamento" subtitle="42 colaboradores distribuídos em 6 áreas"><div className="space-y-4">{departmentDistribution.map(([name,count]) => <div key={name as string}><div className="mb-1.5 flex justify-between text-sm"><span className="text-slate-600">{name}</span><span className="font-medium text-slate-800">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0c7190]" style={{width:`${(Number(count)/max)*100}%`}}/></div></div>)}</div></Panel>
    <Panel title="Próximos eventos" subtitle="Agenda dos próximos 30 dias"><div className="divide-y divide-slate-100">{events.map(([date,title,type]) => <div key={title} className="flex gap-4 py-3 first:pt-0 last:pb-0"><span className="grid h-11 w-12 shrink-0 place-items-center rounded-lg bg-[#eaf2f6] text-[10px] font-semibold text-[#07355d]">{date}</span><div><p className="text-sm font-medium text-slate-700">{title}</p><p className="mt-1 text-xs text-slate-400">{type}</p></div></div>)}</div></Panel>
  </div>
</div>; }
