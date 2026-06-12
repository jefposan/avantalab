'use client';

export default function Tabela({
  lancamentos, despesasCadastradas, adicionarDespesa, apagarDespesa,
  form, setForm, formatarMoeda, darkMode, corPrimaria
}: any) {
  const bgCard = darkMode ? 'bg-slate-800' : 'bg-white';
  const textStrong = darkMode ? 'text-white' : 'text-slate-800';

 return (
  <div className={`${bgCard} rounded-xl shadow-lg border p-6 border-t-4`} style={{ borderTopColor: corPrimaria }}>
    <table className="w-full text-left">
        <thead>
          <tr className="border-b uppercase text-xs text-slate-400">
            <th className="p-4">Dia</th>
            <th className="p-4">Tipo</th>
            <th className="p-4">Descrição</th>
            <th className="p-4 text-right">Valor</th>
            <th className="p-4 text-center">Ação</th>
          </tr>
        </thead>
        <tbody>
          {/* Linha de Cadastro */}
          <tr className="bg-blue-50/50">
            <td className="p-2"><input type="number" value={form.dia} onChange={e => setForm({...form, dia: e.target.value})} className="w-full p-2 border rounded" placeholder="Dia" /></td>
            <td className="p-2">
              <select value={form.despesa} onChange={e => setForm({...form, despesa: e.target.value})} className="w-full p-2 border rounded">
                <option value="">Selecione...</option>
                {despesasCadastradas.map((d: any) => <option key={d.nome} value={d.nome}>{d.nome}</option>)}
              </select>
            </td>
            <td className="p-2"><input type="text" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="w-full p-2 border rounded" placeholder="Descrição..." /></td>
            <td className="p-2"><input type="text" value={form.valorVis} onChange={form.handleValor} className="w-full p-2 border rounded text-right" placeholder="R$ 0,00" /></td>
            <td className="p-2"><button onClick={adicionarDespesa} style={{backgroundColor: corPrimaria}} className="text-white px-4 py-2 rounded font-bold w-full">Salvar</button></td>
          </tr>
          {/* Listagem */}
          {lancamentos.map((l: any) => (
            <tr key={l.id} className="border-b">
              <td className="p-4 font-bold">{l.dia}</td>
              <td className="p-4">{l.despesa}</td>
              <td className="p-4">{l.descricao}</td>
              <td className="p-4 text-right text-red-500 font-bold">{formatarMoeda(l.valor)}</td>
              <td className="p-4 text-center"><button onClick={() => apagarDespesa(l.id)} className="text-red-500 font-bold">X</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}