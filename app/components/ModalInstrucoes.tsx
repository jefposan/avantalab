type ModalInstrucoesProps = {
  aberto: boolean;
  aoFechar: () => void;
  bgCard: string;
  textMuted: string;
  textStrong: string;
  corPrimaria: string;
  textoSobreCorPrimaria: string;
  corEhClara: (hex: string) => boolean;
};

export default function ModalInstrucoes({
  aberto,
  aoFechar,
  bgCard,
  textMuted,
  textStrong,
  corPrimaria,
  textoSobreCorPrimaria,
  corEhClara,
}: ModalInstrucoesProps) {
  if (!aberto) return null;

  const estiloTemaPrimario = {
    backgroundColor: corPrimaria,
    borderColor: corPrimaria,
    color: textoSobreCorPrimaria,
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[5000] flex items-center justify-center p-4"
      onClick={aoFechar}
    >
      <div
        className={`${bgCard} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 flex flex-col`}
        style={{ borderColor: corPrimaria }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 px-5 py-3 border-b border-slate-200/20 flex justify-between items-center shadow-md z-10"
          style={estiloTemaPrimario}
        >
          <h2 className="text-base font-bold uppercase">
            Instruções sobre Categorias
          </h2>

          <button
            type="button"
            onClick={aoFechar}
            className="px-3 py-1 rounded-lg text-sm font-bold transition-colors cursor-pointer"
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

        <div className={`p-5 space-y-3 text-xs ${textMuted} leading-snug overflow-y-auto`}>
          <div>
            <strong className={textStrong}>AMORTIZAÇÃO:</strong>
            <br />
            - Gastos para dividir o custo de coisas que não são físicas.
            <br />
            - Exemplos: softwares comprados, valor pago por patente.
          </div>

          <div>
            <strong className={textStrong}>CUSTOS VARIÁVEIS:</strong>
            <br />
            - Gastos que aumentam ou diminuem conforme a quantidade produzida ou vendida.
            <br />
            - Exemplos: embalagens, matéria-prima, frete, comissões.
          </div>

          <div>
            <strong className={textStrong}>DEPRECIAÇÃO:</strong>
            <br />
            - Gastos para dividir o custo de coisas físicas que a empresa usa.
            <br />
            - Exemplos: desgaste de máquinas, veículos e equipamentos.
          </div>

          <div>
            <strong className={textStrong}>DESPESAS FINANCEIRAS:</strong>
            <br />
            - Gastos relacionados a dinheiro, bancos, juros e operações financeiras.
            <br />
            - Exemplos: juros, tarifas bancárias, taxas e variações de câmbio.
          </div>

          <div>
            <strong className={textStrong}>DESPESAS OPERACIONAIS:</strong>
            <br />
            - Gastos necessários para manter a empresa funcionando.
            <br />
            - Exemplos: aluguel, água, luz, salários, manutenção, pró-labore e publicidade.
          </div>

          <div>
            <strong className={textStrong}>IMPOSTOS SOBRE LUCRO:</strong>
            <br />
            - Tributos que a empresa paga sobre o lucro apurado.
            <br />
            - Exemplos: imposto de renda e CSLL.
          </div>

          <div className="px-3 py-2 bg-yellow-500/10 border-l-4 border-yellow-500 rounded-lg text-[11px] leading-snug text-yellow-700 dark:text-yellow-400 mt-3">
            <strong>Observações:</strong> Se tiver dúvida sobre onde classificar algum gasto,
            consulte o contador. Estes são exemplos gerais para facilitar a organização.
          </div>
        </div>
      </div>
    </div>
  );
}
