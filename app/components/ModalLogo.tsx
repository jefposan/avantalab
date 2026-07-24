import type { RefObject } from 'react';
import DraggableModalCard from './DraggableModalCard';

type LogoSettings = {
  scale: number;
  x: number;
  y: number;
};

type ModalLogoProps = {
  aberto: boolean;
  aoFechar: () => void;
  aoLimpar: () => void;
  aoOcultar: () => void;

  bgCard: string;
  textMuted: string;
  textStrong: string;

  corPrimaria: string;
  estiloTemaPrimario: React.CSSProperties;

  logoUrl: string;
  logoSettings: LogoSettings;
  setLogoSettings: React.Dispatch<React.SetStateAction<LogoSettings>>;

  painelAjusteLogo: boolean;
  setPainelAjusteLogo: React.Dispatch<React.SetStateAction<boolean>>;

  fileInputRef: RefObject<HTMLInputElement | null>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function ModalLogo({
  aberto,
  aoFechar,
  aoLimpar,
  aoOcultar,

  bgCard,
  textMuted,
  textStrong,

  corPrimaria,
  estiloTemaPrimario,

  logoUrl,
  logoSettings,
  setLogoSettings,

  setPainelAjusteLogo,

  fileInputRef,
  handleImageUpload,
}: ModalLogoProps) {
  if (!aberto) return null;

  const concluir = () => {
    setPainelAjusteLogo(false);
    aoFechar();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-3 sm:p-4"
      onClick={aoFechar}
    >
      <DraggableModalCard
        className={`${bgCard} max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl border-2 p-4 shadow-2xl sm:p-5`}
        style={{ borderColor: corPrimaria }}
        onClick={(e) => e.stopPropagation()}
      >
        <div data-modal-drag-handle className="flex justify-between items-center mb-6 cursor-grab active:cursor-grabbing">
          <div>
            <h2 className={`text-lg font-bold ${textStrong}`}>
              Adicionar Logo
            </h2>

            <p className={`text-xs mt-1 ${textMuted}`}>
  Escolha, ajuste e clique em concluir.
</p>
          </div>

          <button
  type="button"
  onClick={aoFechar}
  className={`${textMuted} cursor-pointer hover:opacity-70 text-lg`}
>
  ✕
</button>
        </div>

        <div className="space-y-3">
          <div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={estiloTemaPrimario}
              className="w-full py-3 rounded-xl font-bold shadow hover:brightness-110 cursor-pointer"
            >
              Adicionar logo
            </button>
          </div>

          <div className="rounded-xl border border-slate-200/20 p-4">
            <p className={`text-sm font-semibold mb-3 ${textMuted}`}>
              Prévia da logomarca
            </p>

            <div className="h-24 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{
                    transform: `translate(${logoSettings.x}px, ${logoSettings.y}px) scale(${logoSettings.scale / 100})`,
                    maxWidth: '80%',
                    maxHeight: '80%',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <span className="text-sm font-semibold text-slate-400">
                  Nenhuma imagem selecionada
                </span>
              )}
            </div>
          </div>

          <div
            className={`rounded-xl border border-slate-200/20 p-3 space-y-2 ${
              !logoUrl ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold ${textStrong}`}>
                Ajustar logo
              </h3>

              {!logoUrl && (
                <span className="text-[11px] font-bold text-slate-400">
                  escolha uma imagem primeiro
                </span>
              )}
            </div>

            <label className={`block text-xs font-semibold ${textMuted}`}>
              Escala ({logoSettings.scale}%)
            </label>

            <input
              type="range"
              min="10"
              max="300"
              value={logoSettings.scale}
              onChange={(e) =>
                setLogoSettings({
                  ...logoSettings,
                  scale: parseInt(e.target.value, 10),
                })
              }
              className="w-full"
              style={{ accentColor: corPrimaria }}
            />

            <label className={`block text-xs font-semibold ${textMuted}`}>
              Eixo X ({logoSettings.x})
            </label>

            <input
              type="range"
              min="-100"
              max="100"
              value={logoSettings.x}
              onChange={(e) =>
                setLogoSettings({
                  ...logoSettings,
                  x: parseInt(e.target.value, 10),
                })
              }
              className="w-full"
              style={{ accentColor: corPrimaria }}
            />

            <label className={`block text-xs font-semibold ${textMuted}`}>
              Eixo Y ({logoSettings.y})
            </label>

            <input
              type="range"
              min="-100"
              max="100"
              value={logoSettings.y}
              onChange={(e) =>
                setLogoSettings({
                  ...logoSettings,
                  y: parseInt(e.target.value, 10),
                })
              }
              className="w-full"
              style={{ accentColor: corPrimaria }}
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={aoLimpar}
              className="py-2.5 rounded-xl font-bold border cursor-pointer transition-all text-xs flex items-center justify-center gap-1.5 border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remover logo
            </button>

            <button
              type="button"
              onClick={aoOcultar}
              className="py-2.5 rounded-xl font-bold border cursor-pointer transition-all text-xs flex items-center justify-center gap-1.5 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              Esconder logo
            </button>

            <button
              type="button"
              onClick={aoFechar}
              style={estiloTemaPrimario}
              className="py-2.5 rounded-xl font-bold shadow hover:brightness-110 cursor-pointer text-xs"
            >
              Concluir
            </button>
          </div>
        </div>
      </DraggableModalCard>
    </div>
  );
}
