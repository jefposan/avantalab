import DraggableModalCard from './DraggableModalCard';

interface ModalTermosProps {
  aberto: boolean;
  onClose: () => void;
  darkMode: boolean;
  corPrimaria: string;
  textoSobreCorPrimaria: string;
  bordaSobreCorPrimaria: string;
  textMuted: string;
  estiloTemaPrimario: React.CSSProperties;
}

export default function ModalTermos({
  aberto,
  onClose,
  darkMode,
  corPrimaria,
  textoSobreCorPrimaria,
  bordaSobreCorPrimaria,
  textMuted,
  estiloTemaPrimario,
}: ModalTermosProps) {
  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <DraggableModalCard
        className={`w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${
          darkMode
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div data-modal-drag-handle
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{
            backgroundColor: corPrimaria,
            color: textoSobreCorPrimaria,
            borderColor: bordaSobreCorPrimaria,
          }}
        >
          <div className="min-w-0">
            <h2 className="break-words text-base font-black uppercase tracking-wide sm:text-lg">
              Termos de Uso
            </h2>
            <p className="text-xs opacity-80 mt-1">AvantaLab Gestão</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center font-black text-lg hover:bg-black/20 transition-colors cursor-pointer"
            aria-label="Fechar termos de uso"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-4 text-sm leading-relaxed sm:p-6">
          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              1. Aceitação dos termos
            </h3>
            <p className={textMuted}>
              Ao acessar e utilizar o AvantaLab Gestão, o usuário declara estar ciente e de acordo com estes Termos de Uso. Caso não concorde com qualquer condição aqui apresentada, recomenda-se não utilizar o sistema.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              2. Finalidade do sistema
            </h3>
            <p className={textMuted}>
              O AvantaLab Gestão é uma ferramenta destinada ao apoio na organização, controle e análise de informações financeiras e administrativas, incluindo lançamentos, faturamentos, despesas, relatórios e indicadores gerenciais.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              3. Responsabilidade pelas informações
            </h3>
            <p className={textMuted}>
              O usuário é responsável pela veracidade, atualização e conferência dos dados inseridos no sistema. As informações apresentadas nos relatórios dependem diretamente dos dados cadastrados pelo próprio usuário.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              4. Uso adequado
            </h3>
            <p className={textMuted}>
              O usuário compromete-se a utilizar o sistema de forma lícita, ética e adequada, não realizando ações que possam comprometer a segurança, estabilidade, funcionamento ou integridade da plataforma.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              5. Disponibilidade do sistema
            </h3>
            <p className={textMuted}>
              Embora sejam adotados esforços para manter o sistema disponível e funcional, podem ocorrer interrupções temporárias por manutenção, atualizações, falhas técnicas, instabilidades de serviços externos ou outros fatores operacionais.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              6. Limitação de responsabilidade
            </h3>
            <p className={textMuted}>
              O AvantaLab Gestão é uma ferramenta de apoio gerencial. As decisões tomadas com base nas informações exibidas no sistema são de responsabilidade exclusiva do usuário.
            </p>
          </section>

          <section>
            <h3 className="font-black uppercase text-xs tracking-widest mb-2">
              7. Alterações nos termos
            </h3>
            <p className={textMuted}>
              Estes Termos de Uso poderão ser atualizados periodicamente para refletir melhorias, mudanças operacionais, legais ou funcionais do sistema.
            </p>
          </section>
        </div>

        <div
          className={`px-6 py-4 border-t flex justify-end ${
            darkMode ? 'border-slate-700' : 'border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg font-bold text-sm transition-all hover:scale-[1.03] active:scale-95 cursor-pointer"
            style={estiloTemaPrimario}
          >
            Entendi
          </button>
        </div>
      </DraggableModalCard>
    </div>
  );
}
