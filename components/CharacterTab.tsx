
import React, { useState } from 'react';
import { AppState, Action, StatKey } from '../types';
import { SKILLS_BY_STAT } from '../constants';
import { getAbilityMod } from '../utils';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  derived: {
    baseStats: Record<StatKey, number>;
    equipmentBonus: Record<StatKey, number>;
    totalStats: Record<StatKey, number>;
    pb: number;
  };
}

const STAT_NAME_MAP: Record<StatKey, string> = {
  STR: '力量',
  DEX: '敏捷',
  CON: '体质',
  INT: '智力',
  WIS: '感知',
  CHA: '魅力'
};

const CharacterTab: React.FC<Props> = ({ state, dispatch, derived }) => {
  const { character } = state;
  const [rollResult, setRollResult] = useState<{name: string, roll: number, total: number} | null>(null);
  const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);

  const roll = (name: string, bonus: number) => {
    const r = Math.floor(Math.random() * 20) + 1;
    setRollResult({ name, roll: r, total: r + bonus });
  };

  const updateBaseStat = (s: StatKey, val: string) => {
    const num = parseInt(val) || 0;
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: {
        stats: { ...character.stats, [s]: num }
      }
    });
  };

  return (
    <div className="space-y-12">
      {/* Hero Identity Banner */}
      <section className="bg-slate-900 rounded-[3rem] p-12 shadow-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] -mr-32 -mt-32"></div>
        
        <div className="relative z-10 flex flex-col xl:flex-row gap-12 items-start xl:items-center">
          <div className="flex-1 space-y-6 w-full">
            <input 
              value={character.name} 
              onChange={e => dispatch({type:'UPDATE_CHARACTER', payload:{name:e.target.value}})} 
              className="text-7xl font-black outline-none w-full bg-transparent text-white tracking-[-0.05em] placeholder:text-slate-800 transition-all border-b-4 border-transparent focus:border-amber-500/20"
              placeholder="无名之辈"
            />
            
            <div className="flex flex-wrap items-center gap-8 text-slate-400 font-black">
              <div className="flex items-center bg-slate-950 px-6 py-3 rounded-2xl border border-white/5 shadow-inner">
                <span className="text-[10px] uppercase mr-3 tracking-[0.3em] text-slate-600">Level</span>
                <input 
                  type="number"
                  value={character.level}
                  onChange={e => dispatch({type:'UPDATE_CHARACTER', payload:{level: parseInt(e.target.value) || 1}})}
                  className="bg-transparent outline-none w-12 font-black text-amber-500 text-2xl"
                />
              </div>

              <div className="h-8 w-px bg-white/5"></div>

              <div className="flex items-center flex-shrink-0">
                <span className="text-slate-500 mr-2 font-bold whitespace-nowrap uppercase tracking-widest text-[10px]">种族：</span>
                <input 
                  value={character.race} 
                  onChange={e => dispatch({type:'UPDATE_CHARACTER', payload:{race:e.target.value}})}
                  className="bg-transparent outline-none font-black text-slate-100 text-lg w-40 border-b border-transparent focus:border-amber-500 transition-all"
                  placeholder="未定义"
                />
              </div>

              <div className="flex items-center flex-shrink-0">
                <span className="text-slate-500 mr-2 font-bold whitespace-nowrap uppercase tracking-widest text-[10px]">职业：</span>
                <input 
                  value={character.class} 
                  onChange={e => dispatch({type:'UPDATE_CHARACTER', payload:{class:e.target.value}})}
                  className="bg-transparent outline-none font-black text-slate-100 text-lg w-40 border-b border-transparent focus:border-amber-500 transition-all"
                  placeholder="开拓者"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center xl:items-end gap-4 flex-shrink-0">
             <div className="bg-amber-500 text-slate-950 px-8 py-5 rounded-[2rem] shadow-[0_20px_40px_rgba(245,158,11,0.2)] text-center">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-80 block mb-1">熟练加值</span>
                <span className="text-4xl font-black">+{derived.pb}</span>
             </div>
             <div className="flex gap-2">
               <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">EXP 0</span>
               <div className="w-32 h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                  <div className="w-1/3 h-full bg-slate-600"></div>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Core Attributes Panel */}
      <section className="space-y-6">
        <h2 className="text-xs font-black text-slate-600 uppercase tracking-[0.4em] px-4">核心属性与修正</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {(Object.keys(character.stats) as StatKey[]).map(s => {
            const total = derived.totalStats[s];
            const mod = getAbilityMod(total);
            const bonus = derived.equipmentBonus[s];
            
            return (
              <div key={s} className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/5 flex flex-col items-center group relative hover:border-amber-500/40 transition-all hover:translate-y-[-4px] shadow-xl">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">{STAT_NAME_MAP[s]}</span>
                
                <div className="bg-slate-950 w-20 h-20 rounded-[2rem] flex items-center justify-center border border-white/5 mb-6 group-hover:border-amber-500/20 transition-all">
                  <span className="text-4xl font-black text-white tabular-nums">{total}</span>
                </div>
                
                <div className={`text-xl font-black px-6 py-2 rounded-2xl ${mod >= 0 ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'} shadow-lg shadow-black/20`}>
                  {mod >= 0 ? '+' : ''}{mod}
                </div>

                <div className="mt-6 flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-600">BASE</span>
                  <input 
                    type="number"
                    value={character.stats[s]}
                    onChange={e => updateBaseStat(s, e.target.value)}
                    className="w-10 bg-transparent text-center text-xs font-black text-slate-400 outline-none focus:text-amber-500"
                  />
                </div>

                {bonus !== 0 && (
                  <div className="absolute top-4 right-4 bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg">
                    +{bonus}
                  </div>
                )}
                
                <button onClick={() => roll(STAT_NAME_MAP[s], mod)} className="absolute -bottom-2 right-4 bg-slate-800 text-amber-500 p-2.5 rounded-xl border border-white/5 shadow-xl hover:scale-110 active:scale-95 transition-all">
                  <span className="material-icons text-lg">casino</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Skills & Knowledge Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Skills Column */}
        <div className="lg:col-span-8 space-y-6">
          <h2 className="text-xs font-black text-slate-600 uppercase tracking-[0.4em] px-4">技能熟练度</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 bg-slate-900 rounded-[3rem] p-12 border border-white/5 shadow-2xl">
            {(Object.entries(SKILLS_BY_STAT) as [StatKey, string[]][])
              .filter(([stat]) => stat !== 'CON')
              .map(([stat, skills]) => (
                <div key={stat} className="space-y-3 mb-4">
                  <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] border-b border-white/5 pb-2 mb-4 flex justify-between">
                    <span>{STAT_NAME_MAP[stat]} 相关</span>
                    <span className="text-amber-500/50">MOD {getAbilityMod(derived.totalStats[stat]) >= 0 ? '+' : ''}{getAbilityMod(derived.totalStats[stat])}</span>
                  </div>
                  {skills.map(sName => {
                    const sId = `${stat}_${sName}`;
                    const prof = character.skill_proficiencies[sId];
                    const bonus = getAbilityMod(derived.totalStats[stat]) + (prof ? derived.pb : 0);
                    return (
                      <div key={sId} className="group flex items-center justify-between p-1">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => dispatch({type:'UPDATE_CHARACTER', payload:{skill_proficiencies: {...character.skill_proficiencies, [sId]: !prof}}})} 
                            className={`w-4 h-4 rounded-full border-2 transition-all ${prof ? 'bg-amber-500 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'border-slate-800 bg-slate-950'}`}
                          ></button>
                          <span className={`text-sm font-bold transition-colors ${prof ? 'text-white' : 'text-slate-500'}`}>{sName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                           <button onClick={() => roll(sName, bonus)} className="opacity-0 group-hover:opacity-100 material-icons text-slate-600 hover:text-amber-500 text-sm transition-all">casino</button>
                           <span className={`w-8 text-right font-black tabular-nums ${prof ? 'text-amber-500' : 'text-slate-600'}`}>{bonus >= 0 ? `+${bonus}` : bonus}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        </div>

        {/* Story & Background */}
        <div className="lg:col-span-4 space-y-6">
          <h2 className="text-xs font-black text-slate-600 uppercase tracking-[0.4em] px-4">传记与背景</h2>
          <div className={`bg-slate-900 rounded-[3rem] border border-white/5 shadow-2xl transition-all ${isBackgroundOpen ? 'p-10' : 'p-2'}`}>
            <button 
              onClick={() => setIsBackgroundOpen(!isBackgroundOpen)}
              className="w-full flex items-center justify-between p-6 hover:bg-white/5 rounded-[2rem] transition-all"
            >
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <span className="material-icons mr-3 text-amber-500">history_edu</span>
                角色设定
              </span>
              <span className="material-icons text-slate-600 transition-transform" style={{transform: isBackgroundOpen ? 'rotate(180deg)' : ''}}>expand_more</span>
            </button>
            {isBackgroundOpen && (
              <div className="mt-4 animate-fade-in">
                <textarea 
                  value={character.background} 
                  onChange={e => dispatch({type:'UPDATE_CHARACTER', payload:{background:e.target.value}})}
                  className="w-full h-96 bg-slate-950/50 p-8 rounded-2xl text-slate-300 text-sm leading-relaxed outline-none focus:ring-1 ring-amber-500/20 resize-none border border-white/5"
                  placeholder="书写你的史诗..."
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Roll Results Portal */}
      {rollResult && (
        <div className="fixed bottom-12 right-12 z-[100] bg-slate-900 border border-amber-500/30 text-white rounded-[2.5rem] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] animate-bounce-in min-w-[320px]">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-[10px] font-black uppercase text-amber-500 tracking-[0.5em]">{rollResult.name} CHECK</h3>
            <button onClick={() => setRollResult(null)} className="material-icons text-slate-600 hover:text-white transition-colors">close</button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-black mb-1">D20 ROLL</span>
              <span className="text-4xl font-black text-slate-400">{rollResult.roll}</span>
            </div>
            <div className="w-12 h-px bg-white/5"></div>
            <div className="text-center">
               <span className="text-[10px] text-amber-500 font-black block mb-1">TOTAL</span>
               <span className="text-7xl font-black text-white">{rollResult.total}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterTab;
