import { useState, useRef } from 'react';

interface CalculadoraProps {
  onClose: () => void;
  corPrimaria: string;
  darkMode: boolean;
}

export default function Calculadora({ onClose, corPrimaria, darkMode }: CalculadoraProps) {
  const [calcPos, setCalcPos] = useState({ x: 50, y: 50 });
  const [calcDisplay, setCalcDisplay] = useState('');
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0 });

  const calcEval = () => {
    try { setCalcDisplay(eval(calcDisplay).toString()); } 
    catch (e) { setCalcDisplay('Erro'); }
  };

  const startDrag = (e: React.PointerEvent) => {
    dragRef.current = { isDragging: true, startX: e.clientX - calcPos.x, startY: e.clientY - calcPos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const doDrag = (e: React.PointerEvent) => {
    if (dragRef.current.isDragging) setCalcPos({ x: e.clientX - dragRef.current.startX, y: e.clientY - dragRef.current.startY });
  };
  const stopDrag = (e: React.PointerEvent) => {
    dragRef.current.isDragging = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div 
      className={`fixed shadow-2xl rounded-lg border flex flex-col z-50 overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
      style={{ left: calcPos.x, top: calcPos.y, width: 220 }}
    >
      <div onPointerDown={startDrag} onPointerMove={doDrag} onPointerUp={stopDrag} className="p-2 cursor-grab active:cursor-grabbing flex justify-between items-center text-white select-none" style={{ backgroundColor: corPrimaria }}>
        <span className="text-xs font-bold tracking-widest pl-2">CALCULADORA</span>
        <button onClick={onClose} className="hover:bg-black/20 rounded px-2 font-bold">✕</button>
      </div>
      <div className="p-3">
        <input type="text" readOnly value={calcDisplay} className={`w-full p-2 mb-3 text-right text-lg font-mono rounded border ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} placeholder="0" />
        <div className="grid grid-cols-4 gap-2">
          {['7','8','9','/','4','5','6','*','1','2','3','-','C','0','=','+'].map(btn => (
            <button 
              key={btn} 
              onClick={() => {
                if(btn === 'C') setCalcDisplay('');
                else if(btn === '=') calcEval();
                else setCalcDisplay(prev => prev + btn);
              }}
              className={`py-2 rounded font-bold transition-colors ${btn === '=' || btn === 'C' ? 'text-white' : darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
              style={btn === '=' || btn === 'C' ? { backgroundColor: corPrimaria } : {}}
            >
              {btn}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}