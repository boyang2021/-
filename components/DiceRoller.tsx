
import React, { useState } from 'react';

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];

const DiceRoller: React.FC = () => {
  const [quantities, setQuantities] = useState<Record<number, number>>(
    Object.fromEntries(DICE_TYPES.map(d => [d, 1]))
  );
  const [results, setResults] = useState<{ die: number; roll: number }[]>([]);
  const [total, setTotal] = useState<number | null>(null);

  const rollDice = () => {
    const newResults: { die: number; roll: number }[] = [];
    let sum = 0;
    DICE_TYPES.forEach(d => {
      for (let i = 0; i < quantities[d]; i++) {
        const roll = Math.floor(Math.random() * d) + 1;
        newResults.push({ die: d, roll });
        sum += roll;
      }
    });
    setResults(newResults);
    setTotal(sum);
  };

  const updateQty = (d: number, val: number) => {
    setQuantities(prev => ({ ...prev, [d]: Math.max(0, val) }));
  };

  return (
    <div className="bg-slate-900 rounded-[2rem] shadow-2xl border border-white/5 overflow-hidden">
      <div className="bg-slate-950 p-6 flex justify-between items-center border-b border-white/5">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] flex items-center text-slate-100">
          <span className="material-icons mr-3 text-amber-500">casino</span> 投掷骰子
        </h2>
        <button 
          onClick={rollDice}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-amber-500/10 active:scale-95"
        >
          全部投掷
        </button>
      </div>
      <div className="p-8">
        <div className="grid grid-cols-4 md:grid-cols-7 gap-4 mb-8">
          {DICE_TYPES.map(d => (
            <div key={d} className="flex flex-col items-center bg-slate-950/50 p-3 rounded-2xl border border-white/5">
              <span className="text-[10px] font-black text-slate-600 mb-2 uppercase tracking-tighter">D{d}</span>
              <input 
                type="number"
                value={quantities[d]}
                onChange={e => updateQty(d, parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 text-center text-sm font-black text-slate-200 outline-none focus:text-amber-500 border border-transparent focus:border-amber-500/30 rounded-lg p-1 transition-all"
              />
            </div>
          ))}
        </div>

        {results.length > 0 && (
          <div className="bg-slate-950 rounded-3xl p-6 border border-dashed border-white/10 animate-fade-in">
            <div className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-[0.2em] flex justify-between items-center">
              <span>ROLL RESULTS</span>
              <span className="text-amber-500 text-lg">TOTAL: {total}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {results.map((r, i) => (
                <div key={i} className="bg-slate-900 px-4 py-2 rounded-xl border border-white/5 text-xs shadow-inner flex items-baseline gap-2 group hover:border-amber-500/30 transition-all">
                  <span className="text-slate-600 text-[9px] font-black uppercase">D{r.die}</span>
                  <span className="font-black text-slate-100 text-lg">{r.roll}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiceRoller;