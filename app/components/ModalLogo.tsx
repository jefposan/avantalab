import type { RefObject } from 'react';

type LogoSettings = {
  scale: number;
  x: number;
  y: number;
};

type ModalLogoProps = {
  aberto: boolean;
  aoFechar: () => void;

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
      className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4"
      onClick={aoFechar}
    >
      <div
        className={`${bgCard} rounded-2xl shadow-2xl max-w-md w-full border-2 p-5`}
        style={{ borderColor: corPrimaria }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
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
              Escolher imagem do computador
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

          <button
  type="button"
  onClick={aoFechar}
  style={estiloTemaPrimario}
  className="w-full py-3 rounded-xl font-bold shadow hover:brightness-110 cursor-pointer"
>
  Concluir
</button>
        </div>
      </div>
    </div>
  );
}
