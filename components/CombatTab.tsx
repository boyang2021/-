
import React, { useState } from 'react';
import { AppState, Action, Condition, CooldownSkill, CombatFeature } from '../types';
import { STATUS_LIST } from '../constants';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  derived: any;
}

const CombatTab: React.FC<Props> = ({ state, dispatch, derived }) => {
  const { combat } = state;
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [isEditingHUD, setIsEditingHUD] = useState(false);

  const [tempHUD, setTempHUD] = useState({
    hp_current: combat.hp_current,
    hp_max: combat.hp_max,
    hp_temp: combat.hp_temp,
    save_dc: combat.save_dc
  });

  const hpPercent = (combat.hp_current / (combat.hp_max || 1)) * 100;
  const tempHpPercent = (combat.hp_temp / (combat.hp_max || 1)) * 100;

  const toggleStatus = (name: string, isStackable: boolean) => {
    const existing = combat.conditions.find(c => c.name === name);
    if (existing) {
      if (isStackable) dispatch({ type: 'UPDATE_CONDITION', name, updates: { stacks: existing.stacks + 1 } });
      else dispatch({ type: 'UPDATE_CONDITION', name, updates: null });
    } else dispatch({ type: 'UPDATE_CONDITION', name, updates: { stacks: 1, rounds_left: 3 } });
  };

  const handleHUDSave = () => {
    dispatch({ type: 'UPDATE_COMBAT', payload: { ...tempHUD } });
    dispatch({ type: 'UPDATE_CHARACTER', payload: { save_dc: tempHUD.save_dc } });
    setIsEditingHUD(false);
  };

  return (
    <div className="flex flex-col gap-12">
      {/* Prime Battle HUD */}
      <section className="bg-slate-900 rounded-[4rem] p-16 shadow-[0_40px_80px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 via-rose-500/20 to-rose-500/0"></div>
        <button 
          onClick={() => { setTempHUD({ ...combat }); setIsEditingHUD(true); }}
          className="absolute top-10 right-12 text-slate-700 hover:text-amber-500 transition-colors material-icons text-2xl"
        >
          settings
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative z-10">
          <div className="lg:col-span-7 space-y-10">
            <div className="flex justify-between items-end">
               <div className="space-y-2">
                  <span className="text-[11px] font-black text-rose-500 uppercase tracking-[0.4em]">Vitality Pulse</span>
                  <div className="font-black text-8xl tabular-nums tracking-tighter text-white">
                    {combat.hp_current}<span className="text-slate-800 text-4xl font-normal mx-2">/</span><span className="text-slate-500 text-5xl font-black">{combat.hp_max}</span>
                  </div>
               </div>
               {combat.hp_temp > 0 && (
                  <div className="bg-blue-500/10 text-blue-400 px-6 py-3 rounded-2xl border border-blue-500/20 text-center shadow-lg">
                    <span className="text-[9px] font-black uppercase block opacity-60 mb-1">Temp HP</span>
                    <span className="text-2xl font-black">+{combat.hp_temp}</span>
                  </div>
               )}
            </div>
            
            <div className="h-10 bg-slate-950 rounded-[1.5rem] p-2 relative overflow-hidden shadow-inner border border-white/5">
              <div 
                className={`h-full rounded-full transition-all duration-700 shadow-[0_0_30px_rgba(244,63,94,0.3)] ${hpPercent > 30 ? 'bg-rose-500' : 'bg-rose-600 animate-pulse'}`} 
                style={{ width: `${Math.min(100, hpPercent)}%` }}
              ></div>
              {combat.hp_temp > 0 && (
                <div 
                  className="absolute top-2 bottom-2 bg-blue-400/60 rounded-full transition-all duration-700 border-l-2 border-white/20" 
                  style={{ left: `${Math.min(100, hpPercent)}%`, width: `${Math.min(100 - hpPercent, tempHpPercent)}%` }}
                ></div>
              )}
            </div>
          </div>
          
          <div className="lg:col-span-5 grid grid-cols-2 gap-8 border-l border-white/5 pl-16">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">豁免 DC</span>
              <div className="text-6xl font-black text-amber-500 tabular-nums">DC {combat.save_dc}</div>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">当前体力</span>
              <div className="text-6xl font-black text-white tabular-nums">{combat.stamina_current}</div>
            </div>
            <div className="col-span-2 pt-6 border-t border-white/5 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">Active Round</span>
                <span className="text-2xl font-black text-slate-500 ml-4 tabular-nums">{combat.turn_count}</span>
              </div>
              <div className="flex gap-4">
                 <div className="text-center">
                   <span className="text-[9px] font-black text-slate-700 uppercase block mb-1">AC</span>
                   <span className="text-xl font-black text-amber-500">{combat.others.AC || 10}</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Battleground Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left: Features & Conditions */}
        <div className="lg:col-span-4 space-y-12">
          <section className="space-y-6">
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.4em] px-6">负面/正面 状态</h3>
            <div className="bg-slate-900 rounded-[3rem] p-10 border border-white/5 shadow-2xl grid grid-cols-3 md:grid-cols-4 lg:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto no-scrollbar">
              {STATUS_LIST.map(s => {
                const active = combat.conditions.find(c => c.name === s.name);
                return (
                  <button 
                    key={s.name} 
                    onClick={() => toggleStatus(s.name, s.stackable)} 
                    className={`p-4 rounded-2xl text-[11px] font-black border transition-all ${active ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xl' : 'bg-slate-950 border-white/5 text-slate-700 hover:border-slate-500'}`}
                  >
                    {s.name}
                    {active && active.stacks > 1 && <span className="block text-[9px] mt-1 opacity-60">x{active.stacks}</span>}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.4em] px-6">关键常驻特性</h3>
            <div className="bg-slate-900 rounded-[3rem] border border-white/5 p-10 shadow-2xl space-y-8 max-h-[400px] overflow-y-auto no-scrollbar">
              {combat.features.map(f => (
                <div key={f.id} className="group border-b border-white/5 pb-6 last:border-0 last:pb-0">
                  <div className="flex items-center font-black text-slate-100 text-sm tracking-tight mb-2">
                    {f.pinned && <span className="material-icons text-amber-500 text-xs mr-2">push_pin</span>}
                    {f.name}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium group-hover:text-slate-400 transition-colors">{f.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Tactics & Skills */}
        <section className="lg:col-span-8 flex flex-col gap-12">
          <div className="bg-slate-900 rounded-[4rem] p-12 shadow-2xl border border-white/5 flex flex-col flex-1">
            <div className="flex justify-between items-center mb-12">
              <h3 className="text-lg font-black uppercase tracking-[0.2em] flex items-center text-white">
                <span className="material-icons text-amber-500 mr-4">history_toggle_off</span> 
                冷却武技 / 技能
              </h3>
              <div className="flex gap-4">
                <button onClick={() => dispatch({type:'RESET_SKILLS'})} className="bg-slate-950 hover:bg-slate-800 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition text-slate-600 border border-white/5">Reset CD</button>
                <button onClick={() => dispatch({type:'ADD_SKILL', skill: {id:'sk_'+Date.now(), name:'新武技', base_cd:3, current_cd:0, description:'技能奥秘...'}})} className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition shadow-2xl">铭刻技能</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
              {combat.cooldown_skills.map(skill => (
                <div 
                  key={skill.id} 
                  className={`p-10 rounded-[3rem] border-2 transition-all duration-500 group relative flex flex-col ${skill.current_cd === 0 ? 'bg-slate-950 border-amber-500/40 shadow-2xl' : 'bg-slate-950/30 border-white/5 opacity-40'}`}
                >
                  <div className="flex justify-between mb-8 items-start">
                    <div className="space-y-1">
                      <span className="font-black text-xl text-white tracking-tighter">{skill.name}</span>
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Base CD {skill.base_cd}</p>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${skill.current_cd === 0 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-700'}`}>
                      {skill.current_cd === 0 ? 'READY' : `${skill.current_cd} ROUNDS`}
                    </span>
                  </div>
                  
                  <div className="mb-10 flex-1">
                    <p className="text-xs text-slate-500 leading-relaxed italic">{skill.description}</p>
                  </div>

                  <button 
                    disabled={skill.current_cd > 0} 
                    onClick={() => dispatch({type:'CAST_SKILL', id: skill.id})} 
                    className={`w-full py-6 rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all ${skill.current_cd === 0 ? 'bg-amber-500 text-slate-950 hover:scale-[1.03] shadow-2xl' : 'bg-slate-900 text-slate-700 cursor-not-allowed'}`}
                  >
                    CAST ACTION
                  </button>

                  <div className="absolute top-4 right-6 opacity-0 group-hover:opacity-100 flex gap-4 transition-all">
                    <button onClick={() => setEditingSkillId(skill.id)} className="material-icons text-lg text-slate-700 hover:text-white">edit</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-20 flex flex-col items-center gap-6">
              <button 
                onClick={() => dispatch({type:'END_TURN'})} 
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-24 py-8 rounded-[3rem] font-black text-2xl tracking-[0.5em] uppercase shadow-[0_20px_60px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-2 active:scale-95 group"
              >
                <div className="flex items-center gap-4">
                  <span className="material-icons text-3xl group-hover:rotate-180 transition-transform duration-700">hourglass_bottom</span>
                  结束回合
                </div>
              </button>
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">End the current round and update status effects</span>
            </div>
          </div>
        </section>
      </div>

      {/* Resource Modal */}
      {isEditingHUD && (
        <div className="fixed inset-0 z-[300] bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center p-8">
          <div className="bg-slate-900 rounded-[4rem] p-16 w-full max-w-xl shadow-2xl border border-white/10 animate-scale-in">
             <h2 className="text-4xl font-black mb-12 text-white tracking-tighter uppercase">调整基础资源</h2>
             <div className="space-y-8">
               <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-600 uppercase ml-2">当前 HP</label>
                   <input type="number" value={tempHUD.hp_current} onChange={e => setTempHUD({...tempHUD, hp_current: parseInt(e.target.value)||0})} className="w-full bg-slate-950 border border-white/5 p-6 rounded-2xl text-3xl font-black text-white outline-none focus:border-rose-500"/>
                 </div>
                 <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-600 uppercase ml-2">最大 HP</label>
                   <input type="number" value={tempHUD.hp_max} onChange={e => setTempHUD({...tempHUD, hp_max: parseInt(e.target.value)||0})} className="w-full bg-slate-950 border border-white/5 p-6 rounded-2xl text-3xl font-black text-slate-500 outline-none focus:border-rose-500"/>
                 </div>
               </div>
               <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-600 uppercase ml-2">豁免 DC</label>
                 <input type="number" value={tempHUD.save_dc} onChange={e => setTempHUD({...tempHUD, save_dc: parseInt(e.target.value)||0})} className="w-full bg-slate-950 border border-white/5 p-6 rounded-2xl text-5xl font-black text-amber-500 outline-none focus:border-amber-500 text-center"/>
               </div>
               <button onClick={handleHUDSave} className="w-full bg-emerald-500 text-slate-950 font-black py-8 rounded-[2rem] text-xl uppercase tracking-widest shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all mt-4">确认变更</button>
               <button onClick={() => setIsEditingHUD(false)} className="w-full py-4 text-slate-600 font-black uppercase text-[10px] tracking-widest">取消</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CombatTab;
