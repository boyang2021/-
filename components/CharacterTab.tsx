
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
    <div className="space-y-8">
      {/* 1. Identity Header & Core Stats Section */}
      <section className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
          
          {/* Left: Identity Info */}
          <div className="flex-1 w-full lg:w-auto">
            <input 
              value={character.name} 
              onChange={e => dispatch({type:'UPDATE_CHARACTER', payload:{name:e.target.value}})} 
              className="text-5xl font-black outline-none w-full bg-transparent mb-4 text-slate-900 tracking-tighter"
              placeholder="角色名称"
            />
            <div className="flex flex-wrap items-center gap-4 text-slate-500 font-bold">
              <div className="flex items-center bg-slate-100 px-4 py-2 rounded-2xl">
                <span className="text-xs text-slate-400 uppercase mr-2 tracking-widest">Level</span>
                <input 
                  type="number"
                  value={character.level}
                  onChange={e => dispatch({type:'UPDATE_CHARACTER', payload:{level: parseInt(e.target.value) || 1}})}
                  className="bg-transparent outline-none w-10 font-black text-slate-800"
                />
              </div>
              <span className="text-slate-300">·</span>
              <input 
                value={character.race} 
                onChange={e => dispatch({type:'UPDATE_CHARACTER', payload:{race:e.target.value}})}
                className="bg-transparent outline-none font-black text-slate-700 w-24 border-b-2 border-transparent focus:border-amber-200"
                placeholder="种族"
              />
              <span className="text-slate-300">·</span>
              <input 
                value={character.class} 
                onChange={e => dispatch({type:'UPDATE_CHARACTER', payload:{class:e.target.value}})}
                className="bg-transparent outline-none font-black text-slate-700 w-32 border-b-2 border-transparent focus:border-amber-200"
                placeholder="职业"
              />
              <div className="lg:ml-8 bg-amber-500 text-white px-6 py-2 rounded-2xl shadow-lg shadow-amber-200">
                <span className="text-[10px] font-black uppercase tracking-widest block opacity-80 leading-none mb-1">熟练加值</span>
                <span className="text-xl font-black">+{derived.pb}</span>
              </div>
            </div>
          </div>

          {/* Right: Core Stats Display (Total & Base Editor) */}
          <div className="flex flex-col items-end gap-4 w-full lg:w-auto">
            
            {/* Base Stat Editor (Secondary) */}
            <div className="flex flex-wrap gap-2 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">基础属性</span>
              {(Object.keys(character.stats) as StatKey[]).map(s => (
                <div key={`base-${s}`} className="flex items-center gap-1">
                  <span className="text-[9px] font-bold text-slate-400">{s}</span>
                  <input 
                    type="number"
                    value={character.stats[s]}
                    onChange={e => updateBaseStat(s, e.target.value)}
                    className="w-10 bg-white border border-slate-200 rounded-lg text-center text-xs font-black p-1 focus:border-amber-500 outline-none"
                  />
                </div>
              ))}
            </div>

            {/* Total Stats Row (Horizontal, Prominent) */}
            <div className="flex flex-wrap lg:flex-nowrap gap-3 w-full lg:w-auto">
              {(Object.keys(character.stats) as StatKey[]).map(s => {
                const total = derived.totalStats[s];
                const mod = getAbilityMod(total);
                const bonus = derived.equipmentBonus[s];
                
                return (
                  <div key={s} className="flex-1 lg:flex-none bg-white rounded-2xl p-4 border-2 border-slate-100 text-center min-w-[100px] group relative shadow-md hover:border-amber-200 transition-all">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">{STAT_NAME_MAP[s]}</span>
                    <div className="text-3xl font-black text-slate-900 tabular-nums">
                      {total}
                    </div>
                    <div className="text-sm font-bold text-amber-600 bg-amber-50 inline-block px-3 py-1 rounded-full mt-2 border border-amber-100">
                      调整 {mod >= 0 ? '+' : ''}{mod}
                    </div>

                    {/* Equipment Tooltip Info (Only visible if bonus exists) */}
                    {bonus !== 0 && (
                      <div className="absolute -top-1 -left-1 bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                        {bonus > 0 ? '+' : ''}{bonus}
                      </div>
                    )}
                    
                    <button onClick={() => roll(STAT_NAME_MAP[s], mod)} className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-all bg-white rounded-full shadow-lg p-1.5 text-slate-400 hover:text-amber-500 border border-slate-100">
                      <span className="material-icons text-[18px]">casino</span>
                    </button>
                    
                    {/* Detailed breakdown on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 text-white text-[10px] p-2 rounded-lg whitespace-nowrap shadow-xl z-20">
                      基础 {character.stats[s]} {bonus !== 0 ? `+ 装备 ${bonus}` : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Roll Result Overlay */}
      {rollResult && (
        <div className="fixed bottom-10 right-10 z-[60] bg-slate-900 text-white rounded-[2rem] p-8 shadow-2xl animate-bounce-in min-w-[240px] border border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{rollResult.name} 判定</h3>
            <button onClick={() => setRollResult(null)} className="material-icons text-sm opacity-50 hover:opacity-100">close</button>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">D20</span>
              <span className="text-2xl font-black text-slate-300">{rollResult.roll}</span>
            </div>
            <div className="text-5xl font-black text-amber-400 tabular-nums">
              <span className="text-2xl mr-1 text-amber-600">=</span>{rollResult.total}
            </div>
          </div>
        </div>
      )}

      {/* 2. Skill Groups Grid (Excluding CON) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {(Object.entries(SKILLS_BY_STAT) as [StatKey, string[]][])
          .filter(([stat]) => stat !== 'CON') 
          .map(([stat, skills]) => (
          <div key={stat} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:border-slate-200 transition-colors">
            <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2"></span>
                {STAT_NAME_MAP[stat]} 技能系
              </h4>
              <div className="text-[11px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase">
                调整: <span className="text-amber-600">{getAbilityMod(derived.totalStats[stat]) >= 0 ? '+' : ''}{getAbilityMod(derived.totalStats[stat])}</span>
              </div>
            </div>
            <div className="space-y-2">
              {skills.map(sName => {
                const sId = `${stat}_${sName}`;
                const prof = character.skill_proficiencies[sId];
                const bonus = getAbilityMod(derived.totalStats[stat]) + (prof ? derived.pb : 0);
                return (
                  <div key={sId} className={`group flex items-center p-3 rounded-2xl transition-all ${prof ? 'bg-amber-50 shadow-sm border border-amber-100/50' : 'hover:bg-slate-50 border border-transparent'}`}>
                    <button 
                      onClick={() => dispatch({type:'UPDATE_CHARACTER', payload:{skill_proficiencies: {...character.skill_proficiencies, [sId]: !prof}}})} 
                      className={`w-6 h-6 rounded-lg border-2 mr-4 flex items-center justify-center transition-all ${prof ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200' : 'border-slate-200 bg-white'}`}
                    >
                      {prof && <span className="material-icons text-[16px]">check</span>}
                    </button>
                    <span className="flex-1 text-sm font-bold text-slate-700">{sName}</span>
                    <button onClick={() => roll(sName, bonus)} className="opacity-0 group-hover:opacity-100 mr-4 px-3 py-1 bg-white shadow-md rounded-xl text-[10px] font-black text-amber-600 uppercase transition-all hover:scale-105 active:scale-95">ROLL</button>
                    <span className="text-base font-black text-slate-900 w-10 text-right tabular-nums">{bonus >= 0 ? `+${bonus}` : bonus}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* 3. Character Background (Bottom, Collapsible) */}
      <section className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <button 
          onClick={() => setIsBackgroundOpen(!isBackgroundOpen)}
          className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
        >
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center">
            <span className="material-icons text-xl mr-3 text-slate-300">{isBackgroundOpen ? 'expand_more' : 'chevron_right'}</span>
            英雄背景与故事
          </span>
          {!isBackgroundOpen && character.background && (
            <span className="text-[10px] text-slate-400 font-bold truncate max-w-xs">{character.background}</span>
          )}
        </button>
        {isBackgroundOpen && (
          <div className="p-8 pt-0 animate-slide-down">
            <textarea 
              value={character.background} 
              onChange={e => dispatch({type:'UPDATE_CHARACTER', payload:{background:e.target.value}})}
              className="w-full min-h-[180px] p-6 bg-slate-50 rounded-[2rem] text-sm text-slate-600 outline-none border-2 border-transparent focus:border-amber-200 transition-all resize-none shadow-inner leading-relaxed"
              placeholder="填写你的英雄出身、旅途见闻或是独特的炼金心得..."
            />
          </div>
        )}
      </section>
    </div>
  );
};

export default CharacterTab;
