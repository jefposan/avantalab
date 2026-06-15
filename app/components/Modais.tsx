// app/components/Modais.tsx
export default function Modais({ config, handlers }: any) {
  const { modalInstrucoes, modalDespesasBase, modalLogo, darkMode, corPrimaria } = config;
  const { setModalInstrucoes, setModalDespesasBase, setModalLogo, setLogoUrl, handleImageUpload } = handlers;
  
  const bgCard = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const textStrong = darkMode ? 'text-white' : 'text-slate-800';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <>
      {/* Modal Instruções */}
      {modalInstrucoes && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setModalInstrucoes(false)}
        >
          <div
            className={`${bgCard} rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] border flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 p-6 border-b border-slate-200/20 flex justify-between items-center z-10" style={{ backgroundColor: corPrimaria }}>
              <h2 className="text-xl font-bold text-white uppercase">Instruções sobre Categorias</h2>
              <button onClick={() => setModalInstrucoes(false)} className="text-white hover:bg-white/20 px-3 py-1 rounded-lg font-bold">X</button>
            </div>
            <div className={`p-8 space-y-6 text-sm ${textMuted} overflow-y-auto`}>
               {/* Insira aqui o texto de instruções que você passou antes */}
               <p>Orientações de exemplo aqui...</p>
            </div>
          </div>
        </div>
      )}
      {/* (Adicione a estrutura dos outros modais de Logo e Despesas Base seguindo este padrão) */}
    </>
  );
}
