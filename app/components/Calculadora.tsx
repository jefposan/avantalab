import { useState, useRef, useEffect } from 'react';

interface CalculadoraProps {
  onClose: () => void;
  corPrimaria: string;
  darkMode: boolean;
}

interface CalcState {
  display: string;
  expression: string;
  previousValue: number | null;
  operator: string | null;
  waitingForSecond: boolean;
  justEvaluated: boolean;
}

const INITIAL_STATE: CalcState = {
  display: '0',
  expression: '',
  previousValue: null,
  operator: null,
  waitingForSecond: false,
  justEvaluated: false,
};

function formatResult(num: number): string {
  if (!isFinite(num) || isNaN(num)) return 'Erro';
  const result = parseFloat(num.toPrecision(12));
  return result.toString().replace('.', ',');
}

function parseDisplay(display: string): number {
  return parseFloat(display.replace(',', '.'));
}

function calcular(a: number, b: number, op: string): number {
  if (op === '+') return a + b;
  if (op === '-') return a - b;
  if (op === '*') return a * b;
  if (op === '/') return b === 0 ? NaN : a / b;
  return b;
}

function opSymbol(op: string): string {
  if (op === '*') return '×';
  if (op === '/') return '÷';
  return op;
}

export default function Calculadora({ onClose, corPrimaria, darkMode }: CalculadoraProps) {
  const [calcPos, setCalcPos] = useState({ x: 50, y: 50 });
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0 });
  const calcRef = useRef<HTMLDivElement | null>(null);
  const [calc, setCalc] = useState<CalcState>(INITIAL_STATE);

  const limitarPosicao = (x: number, y: number) => {
    const margem = 12;
    const viewport = window.visualViewport;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const largura = calcRef.current?.offsetWidth || 260;
    const altura = calcRef.current?.offsetHeight || 0;
    const minX = viewportLeft + margem;
    const minY = viewportTop + margem;
    const maxX = Math.max(minX, viewportLeft + viewportWidth - largura - margem);
    const maxY = Math.max(minY, viewportTop + viewportHeight - altura - margem);
    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY),
    };
  };

  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = { isDragging: true, startX: e.clientX - calcPos.x, startY: e.clientY - calcPos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const doDrag = (e: React.PointerEvent) => {
    if (dragRef.current.isDragging)
      setCalcPos(limitarPosicao(e.clientX - dragRef.current.startX, e.clientY - dragRef.current.startY));
  };
  const stopDrag = (e: React.PointerEvent) => {
    dragRef.current.isDragging = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleNumber = (num: string) => {
    setCalc(prev => {
      if (prev.display === 'Erro') return { ...prev, display: num, expression: '', waitingForSecond: false, justEvaluated: false };
      if (prev.waitingForSecond || prev.justEvaluated)
        return { ...prev, display: num, waitingForSecond: false, justEvaluated: false };
      const newDisplay = prev.display === '0' ? num : prev.display + num;
      return { ...prev, display: newDisplay };
    });
  };

  const handleDecimal = () => {
    setCalc(prev => {
      if (prev.display === 'Erro') return { ...prev, display: '0,', waitingForSecond: false, justEvaluated: false };
      if (prev.waitingForSecond || prev.justEvaluated)
        return { ...prev, display: '0,', waitingForSecond: false, justEvaluated: false };
      if (prev.display.includes(',')) return prev;
      return { ...prev, display: prev.display + ',' };
    });
  };

  const handleOperator = (op: string) => {
    setCalc(prev => {
      if (prev.display === 'Erro') return INITIAL_STATE;
      const current = parseDisplay(prev.display);
      if (prev.previousValue !== null && !prev.waitingForSecond) {
        const result = calcular(prev.previousValue, current, prev.operator!);
        const resultStr = formatResult(result);
        return {
          display: resultStr,
          expression: `${resultStr} ${opSymbol(op)}`,
          previousValue: parseDisplay(resultStr),
          operator: op,
          waitingForSecond: true,
          justEvaluated: false,
        };
      }
      return {
        ...prev,
        expression: `${prev.display} ${opSymbol(op)}`,
        previousValue: current,
        operator: op,
        waitingForSecond: true,
        justEvaluated: false,
      };
    });
  };

  const handleEquals = () => {
    setCalc(prev => {
      if (prev.operator === null || prev.previousValue === null) return prev;
      if (prev.display === 'Erro') return INITIAL_STATE;
      const current = parseDisplay(prev.display);
      const result = calcular(prev.previousValue, current, prev.operator);
      const resultStr = formatResult(result);
      return {
        display: resultStr,
        expression: `${formatResult(prev.previousValue)} ${opSymbol(prev.operator)} ${prev.display} =`,
        previousValue: null,
        operator: null,
        waitingForSecond: false,
        justEvaluated: true,
      };
    });
  };

  const handleClear = () => setCalc(INITIAL_STATE);

  const handleBackspace = () => {
    setCalc(prev => {
      if (prev.display === 'Erro' || prev.waitingForSecond || prev.justEvaluated)
        return { ...prev, display: '0', waitingForSecond: false, justEvaluated: false };
      if (prev.display.length <= 1 || (prev.display.length === 2 && prev.display.startsWith('-')))
        return { ...prev, display: '0' };
      return { ...prev, display: prev.display.slice(0, -1) };
    });
  };

  const handleToggleSign = () => {
    setCalc(prev => {
      if (prev.display === '0' || prev.display === 'Erro') return prev;
      const val = parseDisplay(prev.display);
      return { ...prev, display: formatResult(-val), justEvaluated: false };
    });
  };

  const handlePercent = () => {
    setCalc(prev => {
      if (prev.display === 'Erro') return prev;
      const val = parseDisplay(prev.display);
      return { ...prev, display: formatResult(val / 100), justEvaluated: false };
    });
  };

  // Suporte a teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key >= '0' && e.key <= '9') { e.preventDefault(); handleNumber(e.key); }
      else if (e.key === ',' || e.key === '.') { e.preventDefault(); handleDecimal(); }
      else if (e.key === '+') { e.preventDefault(); handleOperator('+'); }
      else if (e.key === '-') { e.preventDefault(); handleOperator('-'); }
      else if (e.key === '*') { e.preventDefault(); handleOperator('*'); }
      else if (e.key === '/') { e.preventDefault(); handleOperator('/'); }
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); handleEquals(); }
      else if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); }
      else if (e.key === 'Escape') { e.preventDefault(); handleClear(); }
      else if (e.key === '%') { e.preventDefault(); handlePercent(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    const ajustarAoViewport = () => setCalcPos((posicao) => limitarPosicao(posicao.x, posicao.y));
    ajustarAoViewport();
    window.addEventListener('resize', ajustarAoViewport);
    window.visualViewport?.addEventListener('resize', ajustarAoViewport);
    window.visualViewport?.addEventListener('scroll', ajustarAoViewport);
    return () => {
      window.removeEventListener('resize', ajustarAoViewport);
      window.visualViewport?.removeEventListener('resize', ajustarAoViewport);
      window.visualViewport?.removeEventListener('scroll', ajustarAoViewport);
    };
  }, []);

  const corEhClara = (hex: string) => {
    const c = hex.replace('#', '');
    if (c.length !== 6) return false;
    const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 180;
  };
  const textoPrimario = corEhClara(corPrimaria) ? '#1e293b' : '#ffffff';

  const bg = darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200';
  const btnNum = darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800';
  const btnFn = darkMode ? 'bg-slate-600 hover:bg-slate-500 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700';

  const opAtivo = calc.operator && calc.waitingForSecond ? calc.operator : null;

  type BtnDef = { label: string; action: () => void; type: 'num' | 'fn' | 'op' | 'primary' | 'danger'; colSpan?: number };

  const buttons: BtnDef[] = [
    { label: 'C',  action: handleClear,              type: 'danger' },
    { label: '±',  action: handleToggleSign,          type: 'fn' },
    { label: '%',  action: handlePercent,             type: 'fn' },
    { label: '÷',  action: () => handleOperator('/'), type: 'op' },
    { label: '7',  action: () => handleNumber('7'),   type: 'num' },
    { label: '8',  action: () => handleNumber('8'),   type: 'num' },
    { label: '9',  action: () => handleNumber('9'),   type: 'num' },
    { label: '×',  action: () => handleOperator('*'), type: 'op' },
    { label: '4',  action: () => handleNumber('4'),   type: 'num' },
    { label: '5',  action: () => handleNumber('5'),   type: 'num' },
    { label: '6',  action: () => handleNumber('6'),   type: 'num' },
    { label: '−',  action: () => handleOperator('-'), type: 'op' },
    { label: '1',  action: () => handleNumber('1'),   type: 'num' },
    { label: '2',  action: () => handleNumber('2'),   type: 'num' },
    { label: '3',  action: () => handleNumber('3'),   type: 'num' },
    { label: '+',  action: () => handleOperator('+'), type: 'op' },
    { label: '0',  action: () => handleNumber('0'),   type: 'num', colSpan: 2 },
    { label: ',',  action: handleDecimal,             type: 'num' },
    { label: '=',  action: handleEquals,              type: 'primary' },
  ];

  return (
    <div
      ref={calcRef}
      className={`fixed shadow-2xl rounded-xl border flex max-h-[calc(var(--av-viewport-height)-var(--av-safe-top)-var(--av-safe-bottom)-24px)] flex-col z-[5000] overflow-y-auto overscroll-contain select-none ${bg}`}
      style={{ left: calcPos.x, top: calcPos.y, width: 'min(260px, calc(100vw - 24px))' }}
      role="dialog"
      aria-label="Calculadora"
    >
      {/* Título / drag */}
      <div
        onPointerDown={startDrag}
        onPointerMove={doDrag}
        onPointerUp={stopDrag}
        className="px-3 py-2 cursor-grab active:cursor-grabbing flex justify-between items-center"
        style={{ backgroundColor: corPrimaria }}
      >
        <span className="text-xs font-black tracking-widest" style={{ color: textoPrimario }}>
          CALCULADORA
        </span>
        <button
          onClick={onClose}
          className="av-touch-target rounded px-2 py-0.5 text-sm font-bold hover:bg-black/20 transition-colors cursor-pointer"
          style={{ color: textoPrimario }}
          aria-label="Fechar calculadora"
        >
          ✕
        </button>
      </div>

      {/* Display */}
      <div className={`px-3 pt-3 pb-2 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className={`h-5 text-right text-xs font-medium truncate ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {calc.expression || ' '}
        </div>
        <div className="flex items-center justify-between mt-0.5 gap-1">
          <button
            onClick={handleBackspace}
            title="Apagar (Backspace)"
            className={`shrink-0 text-base px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
              darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
            }`}
          >
            ⌫
          </button>
          <div
            className={`text-right font-black tracking-tight truncate flex-1 ${
              calc.display === 'Erro' ? 'text-red-500' : darkMode ? 'text-white' : 'text-slate-800'
            }`}
            style={{ fontSize: calc.display.length > 12 ? '1.2rem' : calc.display.length > 9 ? '1.5rem' : '2rem' }}
          >
            {calc.display}
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="grid grid-cols-4 gap-1.5 p-3">
        {buttons.map((btn, i) => {
          const isOpAtivo = btn.type === 'op' && opAtivo !== null &&
            ((btn.label === '÷' && opAtivo === '/') ||
             (btn.label === '×' && opAtivo === '*') ||
             (btn.label === '−' && opAtivo === '-') ||
             (btn.label === '+' && opAtivo === '+'));

          let cls = `py-3 rounded-lg font-bold text-base transition-all active:scale-95 cursor-pointer `;
          if (btn.colSpan === 2) cls += 'col-span-2 ';

          if (btn.type === 'primary' || isOpAtivo) {
            cls += '';
          } else if (btn.type === 'danger') {
            cls += 'bg-red-100 hover:bg-red-200 text-red-600 ';
          } else if (btn.type === 'fn' || btn.type === 'op') {
            cls += btnFn + ' ';
          } else {
            cls += btnNum + ' ';
          }

          const style: React.CSSProperties =
            btn.type === 'primary' || isOpAtivo
              ? { backgroundColor: corPrimaria, color: textoPrimario }
              : {};

          return (
            <button key={i} onClick={btn.action} className={cls} style={style}>
              {btn.label}
            </button>
          );
        })}
      </div>

      <div className={`pb-2 text-center text-[10px] ${darkMode ? 'text-slate-600' : 'text-slate-300'}`}>
        Teclado: números · operadores · Enter · Backspace · Esc
      </div>
    </div>
  );
}
