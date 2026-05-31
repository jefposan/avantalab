type DespesaCadastrada = {
  nome: string;
  categoria: string;
};

type ModalDespesasBaseProps = {
  aberto: boolean;
  aoFechar: () => void;

  bgCard: string;
  textMuted: string;
  textStrong: string;
  darkMode: boolean;

  corPrimaria: string;
  textoSobreCorPrimaria: string;
  estiloTemaPrimario: React.CSSProperties;
  corEhClara: (hex: string) => boolean;

  ajudaCategoriasAberta: boolean;
  setAjudaCategoriasAberta: (valor: boolean) => void;

  novaBaseNome: string;
  setNovaBaseNome: (valor: string) => void;

  novaBaseCat: string;
  setNovaBaseCat: (valor: string) => void;

  despesasCadastradas: DespesaCadastrada[];

  adicionarDespesaBase: () => void;
  apagarDespesaBase: (nome: string) => void;
};

export default function ModalDespesasBase({
  aberto,
  aoFechar,

  bgCard,
  textMuted,
  textStrong,
  darkMode,

  corPrimaria,
  textoSobreCorPrimaria,
  estiloTemaPrimario,
  corEhClara,

  ajudaCategoriasAberta,
  setAjudaCategoriasAberta,

  novaBaseNome,
  setNovaBaseNome,

  novaBaseCat,
  setNovaBaseCat,

  despesasCadastradas,

  adicionarDespesaBase,
  apagarDespesaBase,
}: ModalDespesasBaseProps) {
  if (!aberto) return null;

  const fecharTudo = () => {
    aoFechar();
    setAjudaCategoriasAberta(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div
        className={`${bgCard} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border-2 overflow-hidden`}
        style={{ borderColor: corPrimaria }}
      >
        <div
          className="sticky top-0 p-6 border-b border-slate-200/20 flex justify-between items-center z-10"
          style={estiloTemaPrimario}
        >
          <div className="flex w-full items-center justify-between gap-4">
            <h2 className="text-lg font-bold uppercase">
              Gerenciar Despesas
            </h2>

            <div className="flex items-center gap-6 pr-4">
              <button
                type="button"
                onClick={() => setAjudaCategoriasAberta(!ajudaCategoriasAberta)}
                className="group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition hover:scale-[1.02] hover:shadow-md active:scale-[0.98] cursor-pointer"
                style={{
                  borderColor: textoSobreCorPrimaria,
                  color: textoSobreCorPrimaria,
                  backgroundColor: ajudaCategoriasAberta
                    ? corEhClara(corPrimaria)
                      ? 'rgba(15, 23, 42, 0.14)'
                      : 'rgba(255, 255, 255, 0.22)'
                    : corEhClara(corPrimaria)
                      ? 'rgba(15, 23, 42, 0.08)'
                      : 'rgba(255, 255, 255, 0.14)',
                }}
                title="Entenda as categorias"
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black"
                  style={{
                    border: `1px solid ${textoSobreCorPrimaria}`,
                    color: textoSobreCorPrimaria,
                  }}
                >
                  ?
                </span>

                <span>Entenda as categorias</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={fecharTudo}
            className="px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer"
            style={{
              color: textoSobreCorPrimaria,
              backgroundColor: corEhClara(corPrimaria)
                ? 'rgba(15, 23, 42, 0.08)'
                : 'rgba(255, 255, 255, 0.16)',
            }}
          >
            X
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div
            className={`p-5 rounded-xl border shadow-sm ${
              darkMode
                ? 'bg-slate-800 border-slate-700'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <h3 className={`font-bold mb-4 ${textStrong}`}>
              Nova Despesa
            </h3>

            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Nome (Ex: Aluguel)"
                value={novaBaseNome}
                onChange={(e) => setNovaBaseNome(e.target.value)}
                className={`flex-1 min-w-[200px] p-2.5 rounded-lg border focus:outline-none focus:ring-2 ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-slate-300'
                }`}
                style={{ outlineColor: corPrimaria }}
              />

              <select
                value={novaBaseCat}
                onChange={(e) => setNovaBaseCat(e.target.value)}
                className={`flex-1 min-w-[200px] p-2.5 rounded-lg border focus:outline-none focus:ring-2 ${
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-white border-slate-300'
                }`}
                style={{ outlineColor: corPrimaria }}
              >
                <option value="">Categoria (Obrigatória)</option>
                <option value="Amortização">Amortização</option>
                <option value="Custos Variáveis">Custos Variáveis</option>
                <option value="Depreciação">Depreciação</option>
                <option value="Despesas Financeiras">Despesas Financeiras</option>
                <option value="Despesas Operacionais">Despesas Operacionais</option>
                <option value="Imposto sobre Lucro">Imposto sobre Lucro</option>
              </select>

              <button
                type="button"
                onClick={adicionarDespesaBase}
                style={estiloTemaPrimario}
                className="px-6 py-2.5 rounded-lg font-bold hover:brightness-110 w-full sm:w-auto shadow cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </div>

          <div className="space-y-2 pr-2">
            {despesasCadastradas.map((d) => (
              <div
                key={d.nome}
                className={`flex justify-between items-center p-3 rounded-lg border border-slate-200/10 ${
                  darkMode ? 'bg-slate-700' : 'bg-white shadow-sm'
                }`}
              >
                <div>
                  <span className={`font-bold ${textStrong}`}>
                    {d.nome}
                  </span>

                  <span className={`text-xs ml-2 px-2 py-1 rounded-md bg-slate-500/20 ${textMuted}`}>
                    {d.categoria}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => apagarDespesaBase(d.nome)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-lg font-bold px-3 py-1 text-lg transition-colors cursor-pointer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {ajudaCategoriasAberta && (
        <div className="ml-4 hidden lg:block w-80 max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase text-slate-900">
              Entenda as categorias
            </h3>

            <button
              type="button"
              onClick={() => setAjudaCategoriasAberta(false)}
              className="rounded-lg px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              X
            </button>
          </div>

          <div className="space-y-3 text-xs leading-relaxed">
            <div>
              <strong>Amortização:</strong> pagamentos de dívidas, empréstimos ou parcelamentos.
            </div>

            <div>
              <strong>Custos Variáveis:</strong> despesas que variam conforme vendas ou produção.
            </div>

            <div>
              <strong>Depreciação:</strong> perda de valor de bens ao longo do tempo.
            </div>

            <div>
              <strong>Despesas Financeiras:</strong> juros, taxas bancárias e custos financeiros.
            </div>

            <div>
              <strong>Despesas Operacionais:</strong> gastos do funcionamento diário da empresa.
            </div>

            <div>
              <strong>Imposto sobre Lucro:</strong> tributos calculados sobre o resultado/lucro.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}