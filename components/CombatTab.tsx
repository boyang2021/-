
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

  // Local state for HUD editing to facilitate validation before dispatch
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
    const max = Math.max(0, tempHUD.hp_max);
    const current = Math.min(max, Math.max(0, tempHUD.hp_current));
    const temp = Math.max(0, tempHUD.hp_temp);
    const dc = Math.min(99, Math.max(0, tempHUD.save_dc));

    dispatch({
      type: 'UPDATE_COMBAT',
      payload: {
        hp_max: max,
        hp_current: current,
        hp_temp: temp,
        save_dc: dc
      }
    });
    // Also update character base save_dc for consistency if needed, 
    // but the combat object specifically tracks session DC.
    dispatch({ type: 'UPDATE_CHARACTER', payload: { save_dc: dc } });
    
    setIsEditingHUD(false);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Top HUD with Editable Resources */}
      <section className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl border border-slate-800 relative group">
        <button 
          onClick={() => {
            setTempHUD({ 
              hp_current: combat.hp_current, 
              hp_max: combat.hp_max, 
              hp_temp: combat.hp_temp, 
              save_dc: combat.save_dc 
            });
            setIsEditingHUD(true);
          }}
          className="absolute top-6 right-8 text-slate-500 hover:text-amber-500 transition-colors material-icons text-xl"
        >
          edit
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-8">
            <div className="flex justify-between items-end mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">战斗状态</span>
                <div className="font-black text-4xl tabular-nums flex items-baseline gap-2">
                  <span>HP {combat.hp_current}</span>
                  <span className="text-slate-600 text-xl font-normal">/ {combat.hp_max}</span>
                  {combat.hp_temp > 0 && <span className="text-blue-400 text-lg font-bold"> (+{combat.hp_temp} Temp)</span>}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">豁免 DC</span>
                <div className="text-3xl font-black text-amber-500 tabular-nums">DC {combat.save_dc}</div>
              </div>
            </div>
            
            {/* Integrated HP + TempHP Bar */}
            <div className="h-5 bg-slate-800 rounded-full p-[3px] relative overflow-hidden shadow-inner border border-slate-700">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                style={{ width: `${Math.min(100, hpPercent)}%` }}
              ></div>
              {combat.hp_temp > 0 && (
                <div 
                  className="absolute top-[3px] bottom-[3px] bg-blue-400/40 rounded-full transition-all duration-500 border-l border-blue-300/30" 
                  style={{ 
                    left: `${Math.min(100, hpPercent)}%`, 
                    width: `${Math.min(100 - hpPercent, tempHpPercent)}%` 
                  }}
                ></div>
              )}
            </div>
          </div>
          
          <div className="lg:col-span-4 flex justify-around border-l border-slate-800">
            <div className="text-center">
              <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">当前体力</span>
              <div className="text-3xl font-black text-white tabular-nums">{combat.stamina_current}</div>
            </div>
            <div className="text-center">
              <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">战斗轮次</span>
              <div className="text-3xl font-black text-amber-500 tabular-nums">{combat.turn_count}</div>
            </div>
          </div>
        </div>
      </section>

      {/* HUD Edit Modal */}
      {isEditingHUD && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] p-10 w-full max-w-lg shadow-2xl animate-scale-in">
            <h2 className="text-2xl font-black mb-8 flex justify-between items-center uppercase tracking-tight">
              资源调整
              <button onClick={() => setIsEditingHUD(false)} className="material-icons text-slate-400 hover:text-slate-900 transition-colors">close</button>
            </h2>
            
            <div className="grid grid-cols-2 gap-8 mb-10">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">当前 HP</label>
                  <input 
                    type="number" 
                    value={tempHUD.hp_current} 
                    onChange={e => setTempHUD({...tempHUD, hp_current: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-black text-2xl outline-none focus:border-amber-500 transition-all tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">最大 HP</label>
                  <input 
                    type="number" 
                    value={tempHUD.hp_max} 
                    onChange={e => setTempHUD({...tempHUD, hp_max: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-black text-2xl outline-none focus:border-amber-500 transition-all tabular-nums"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">临时 HP (Temp)</label>
                  <input 
                    type="number" 
                    value={tempHUD.hp_temp} 
                    onChange={e => setTempHUD({...tempHUD, hp_temp: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-black text-2xl text-blue-600 outline-none focus:border-blue-500 transition-all tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">豁免 DC</label>
                  <input 
                    type="number" 
                    value={tempHUD.save_dc} 
                    onChange={e => setTempHUD({...tempHUD, save_dc: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-black text-2xl text-amber-600 outline-none focus:border-amber-500 transition-all tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setIsEditingHUD(false)}
                className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleHUDSave}
                className="flex-[2] bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-200 active:scale-95 transition-all uppercase tracking-widest"
              >
                保存变更
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conditions Selector */}
      <section className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-sm">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center"><span className="material-icons text-amber-500 mr-2">waves</span> 状态选择器</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {STATUS_LIST.map(s => {
            const active = combat.conditions.find(c => c.name === s.name);
            return (
              <button key={s.name} onClick={() => toggleStatus(s.name, s.stackable)} className={`p-3 rounded-2xl text-[11px] font-bold border transition-all ${active ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'}`}>
                {s.name} {active && (active.stacks > 1 ? `x${active.stacks}` : '')}
                {active && active.rounds_left > 0 && <span className="block text-[8px] opacity-50 mt-0.5">{active.rounds_left} 轮</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Split Layout: Left Features, Right Cooldowns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-5 space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">关键特性</h3>
          <div className="bg-white rounded-3xl border-2 border-slate-100 p-6 shadow-sm divide-y divide-slate-100">
            {combat.features.map(f => (
              <div key={f.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center font-bold text-slate-800 mb-1">{f.pinned && <span className="material-icons text-amber-500 text-[14px] mr-1">push_pin</span>}{f.name}</div>
                <p className="text-xs text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </aside>

        <section className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-slate-800 rounded-3xl p-8 shadow-xl text-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center"><span className="material-icons text-amber-500 mr-2">timer</span> 冷却技能</h3>
              <div className="flex gap-2">
                <button onClick={() => dispatch({type:'RESET_SKILLS'})} className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition border border-slate-600">RESET CD</button>
                <button onClick={() => dispatch({type:'ADD_SKILL', skill: {id:'sk_'+Date.now(), name:'新技能', base_cd:3, current_cd:0, description:'技能描述...'}})} className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition">NEW SKILL</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {combat.cooldown_skills.map(skill => (
                <div key={skill.id} className={`p-5 rounded-2xl border-2 transition-all duration-300 group relative ${skill.current_cd === 0 ? 'bg-slate-700 border-amber-500/50 shadow-lg' : 'bg-slate-900/50 border-slate-800 opacity-60'}`}>
                  <div className="flex justify-between mb-4 items-start">
                    <span className="font-bold text-sm">{skill.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${skill.current_cd === 0 ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-500'}`}>{skill.current_cd === 0 ? 'READY' : `${skill.current_cd} 轮`}</span>
                  </div>
                  <button disabled={skill.current_cd > 0} onClick={() => dispatch({type:'CAST_SKILL', id: skill.id})} className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition ${skill.current_cd === 0 ? 'bg-white text-slate-900 hover:bg-amber-50' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>CAST</button>
                  <div className="mt-4 pt-4 border-t border-slate-700/50 hidden group-hover:block transition-all"><p className="text-[10px] text-slate-400 leading-relaxed italic">{skill.description}</p></div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-2"><button onClick={() => setEditingSkillId(skill.id)} className="material-icons text-xs text-slate-500 hover:text-white">edit</button></div>
                </div>
              ))}
            </div>
            <div className="mt-10 border-t border-slate-700 pt-8 flex justify-center">
              <button onClick={() => dispatch({type:'END_TURN'})} className="bg-white hover:bg-amber-50 text-slate-900 px-16 py-5 rounded-[2rem] font-black text-xl tracking-[0.3em] uppercase shadow-2xl transition hover:-translate-y-1 active:scale-95">结束回合</button>
            </div>
          </div>
        </section>
      </div>

      {editingSkillId && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black mb-6 uppercase flex justify-between">编辑技能 <button onClick={() => setEditingSkillId(null)} className="material-icons">close</button></h2>
            <div className="space-y-4">
              <input value={combat.cooldown_skills.find(s=>s.id===editingSkillId)?.name} onChange={e => dispatch({type:'UPDATE_SKILL', id: editingSkillId, payload:{name:e.target.value}})} className="w-full border-b py-2 font-bold outline-none"/>
              <div className="flex gap-4"><label className="flex-1">CD:<input type="number" value={combat.cooldown_skills.find(s=>s.id===editingSkillId)?.base_cd} onChange={e => dispatch({type:'UPDATE_SKILL', id: editingSkillId, payload:{base_cd:parseInt(e.target.value)||0}})} className="w-full border p-2 mt-1"/></label></div>
              <textarea value={combat.cooldown_skills.find(s=>s.id===editingSkillId)?.description} onChange={e => dispatch({type:'UPDATE_SKILL', id: editingSkillId, payload:{description:e.target.value}})} className="w-full border p-2 h-24 mt-1"/>
              <button onClick={() => dispatch({type:'DELETE_SKILL', id: editingSkillId}) || setEditingSkillId(null)} className="w-full bg-red-50 text-red-600 font-bold py-2 rounded-xl mt-4">删除技能</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CombatTab;
