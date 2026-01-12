
import React, { useState } from 'react';
import { AppState, Action, StatKey } from '../types';
import { SKILLS_BY_STAT } from '../constants';
import { getAbilityMod } from '../utils';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  derived: any;
}

const CharacterTab: React.FC<Props> = ({ state, dispatch, derived }) => {
  const { character } = state;
  const [rollResult, setRollResult] = useState<{name: string, roll: number, total: number} | null>(null);

  const roll = (name: string, bonus: number) => {
    const r = Math.floor(Math.random() * 20) + 1;
    setRollResult({ name, roll: r, total: r + bonus });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Stats View */}
      <aside className="lg:col-span-4 space-y-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-slate-100">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">核心属性</h2>
          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(character.stats) as StatKey[]).map(s => {
              const val = derived.totalStats[s];
              const mod = getAbilityMod(val);
              return (
                <div key={s} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center relative group">
                  <span className="text-[9px] font-black text-slate-400 uppercase block">{s}</span>
                  <div className="text-2xl font-black text-slate-800">{val}</div>
                  <div className="text-xs font-bold text-amber-600">({mod >= 0 ? '+' : ''}{mod})</div>
                  <button onClick={() => roll(s, mod)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                    <span className="material-icons text-[14px] text-slate-300">casino</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {rollResult && (
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-2xl animate-bounce-in">
            <h3 className="text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest">{rollResult.name} ROLL</h3>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">D20 ({rollResult.roll})</span>
              <span className="text-3xl font-black text-amber-400">= {rollResult.total}</span>
            </div>
          </div>
        )}
      </aside>

      {/* Grouped Skills View */}
      <section className="lg:col-span-8 bg-white rounded-3xl p-8 shadow-sm border-2 border-slate-100">
        <div className="flex justify-between items-end mb-8 border-b pb-8">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">英雄名称</label>
            <input value={character.name} onChange={e => dispatch({type:'UPDATE_CHARACTER', payload:{name:e.target.value}})} className="text-4xl font-black outline-none w-full"/>
          </div>
          <div className="text-center">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">熟练加值</label>
            <div className="text-3xl font-black text-amber-600">+{derived.pb}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {(Object.entries(SKILLS_BY_STAT) as [StatKey, string[]][]).map(([stat, skills]) => (
            <div key={stat} className="border-t-2 border-slate-100 pt-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">{stat} 技能系</h4>
                <span className="text-[10px] font-bold text-slate-400">调整: {getAbilityMod(derived.totalStats[stat]) >= 0 ? '+' : ''}{getAbilityMod(derived.totalStats[stat])}</span>
              </div>
              <div className="space-y-1">
                {skills.length === 0 && <div className="text-[10px] italic text-slate-300">暂无关联技能</div>}
                {skills.map(sName => {
                  const sId = `${stat}_${sName}`;
                  const prof = character.skill_proficiencies[sId];
                  const bonus = getAbilityMod(derived.totalStats[stat]) + (prof ? derived.pb : 0);
                  return (
                    <div key={sId} className={`group flex items-center p-2 rounded-xl transition ${prof ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                      <button onClick={() => dispatch({type:'UPDATE_CHARACTER', payload:{skill_proficiencies: {...character.skill_proficiencies, [sId]: !prof}}})} className={`w-5 h-5 rounded-lg border-2 mr-3 flex items-center justify-center ${prof ? 'bg-amber-500 border-amber-500 text-white shadow-sm' : 'border-slate-300'}`}>
                        {prof && <span className="material-icons text-[14px]">check</span>}
                      </button>
                      <span className="flex-1 text-sm font-bold text-slate-700">{sName}</span>
                      <button onClick={() => roll(sName, bonus)} className="opacity-0 group-hover:opacity-100 mr-3 px-2 py-0.5 bg-white shadow-sm rounded-lg text-[10px] font-black text-amber-600">ROLL</button>
                      <span className="text-sm font-black text-slate-800 w-8 text-right">{bonus >= 0 ? `+${bonus}` : bonus}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
export default CharacterTab;
