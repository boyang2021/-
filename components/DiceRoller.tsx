
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
        <h2 className="text-lg font-bold flex items-center">
          <span className="material-icons mr-2 text-amber-400">casino</span> 投掷骰子
        </h2>
        <button 
          onClick={rollDice}
          className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-3 py-1 rounded-md text-sm font-bold transition"
        >
          全部投掷
        </button>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {DICE_TYPES.map(d => (
            <div key={d} className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 mb-1">D{d}</span>
              <input 
                type="number"
                value={quantities[d]}
                onChange={e => updateQty(d, parseInt(e.target.value) || 0)}
                className="w-10 text-center text-xs border rounded p-1"
              />
            </div>
          ))}
        </div>

        {results.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-3 border border-dashed border-slate-300">
            <div className="text-xs font-bold text-slate-500 mb-2 uppercase flex justify-between">
              <span>结果</span>
              <span className="text-amber-600">总和: {total}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {results.map((r, i) => (
                <div key={i} className="bg-white px-2 py-1 rounded border border-slate-200 text-xs shadow-sm">
                  <span className="text-slate-400 mr-1">D{r.die}:</span>
                  <span className="font-bold text-slate-700">{r.roll}</span>
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
