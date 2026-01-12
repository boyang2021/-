
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppState, Action, Condition, CooldownSkill, CombatFeature } from '../types';
import { STATUS_LIST } from '../constants';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  derived: any;
}

const CombatHealthBar: React.FC<{
  hp_max: number;
  hp_current: number;
  hp_temp: number;
  onUpdate: (updates: { hp_current?: number; hp_temp?: number }) => void;
}> = ({ hp_max, hp_current, hp_temp, onUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [interaction, setInteraction] = useState<{
    type: 'detecting' | 'horizontal' | 'vertical' | 'handle_current' | 'handle_temp';
    startX: number;
    startY: number;
    initialCurrent: number;
    initialTemp: number;
  } | null>(null);

  const calculateValueFromX = useCallback((clientX: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return Math.round((x / rect.width) * hp_max);
  }, [hp_max]);

  const adjustHP = (offset: number) => {
    onUpdate({ hp_current: Math.max(0, Math.min(hp_max, hp_current + offset)) });
  };

  const adjustShield = (offset: number) => {
    onUpdate({ hp_temp: Math.max(0, hp_temp + offset) });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!interaction) return;
      const dx = e.clientX - interaction.startX;
      const dy = e.clientY - interaction.startY;
      let currentType = interaction.type;
      if (currentType === 'detecting') {
        const threshold = 5;
        if (Math.abs(dy) > threshold && Math.abs(dy) > Math.abs(dx)) {
          currentType = 'vertical';
          setInteraction(prev => prev ? { ...prev, type: 'vertical' } : null);
        } else if (Math.abs(dx) > threshold) {
          currentType = 'horizontal';
          setInteraction(prev => prev ? { ...prev, type: 'horizontal' } : null);
        } else return;
      }
      if (currentType === 'horizontal' || currentType === 'handle_current') {
        onUpdate({ hp_current: calculateValueFromX(e.clientX) });
      } else if (currentType === 'vertical') {
        if (dy < -30 && hp_temp === 0) onUpdate({ hp_temp: 5 }); 
      } else if (currentType === 'handle_temp') {
        onUpdate({ hp_temp: Math.max(0, calculateValueFromX(e.clientX) - hp_current) });
      }
    };
    const handleMouseUp = () => setInteraction(null);
    if (interaction) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [interaction, calculateValueFromX, hp_max, hp_current, hp_temp, onUpdate]);

  const onSurfaceDown = (e: React.MouseEvent) => {
    setInteraction({ type: 'detecting', startX: e.clientX, startY: e.clientY, initialCurrent: hp_current, initialTemp: hp_temp });
  };

  const hpPercent = Math.min(100, (hp_current / hp_max) * 100);
  const tempPercent = (hp_temp / hp_max) * 100;

  return (
    <div className="relative pt-6 pb-16 select-none group">
      <div className="flex justify-center gap-12 mb-10 pointer-events-none">
        <div className="flex flex-col items-center gap-3">
          <div className="text-[9px] font-black text-rose-500/50 uppercase tracking-[0.3em]">Vitality</div>
          <div className="flex items-baseline font-black tabular-nums tracking-tighter drop-shadow-2xl">
            <span className="text-5xl text-white">{hp_current}</span>
            <span className="text-xl text-slate-700 mx-2">/</span>
            <span className="text-2xl text-slate-500">{hp_max}</span>
          </div>
          <div className="flex gap-1 pointer-events-auto">
            {[-5, -1, 1, 5].map(v => <button key={v} onClick={e => {e.stopPropagation(); adjustHP(v);}} className="w-10 h-8 flex items-center justify-center rounded-lg text-[10px] font-black transition-all active:scale-90 border border-white/5 hover:border-rose-500/50 hover:bg-rose-500/10 text-rose-400">{v > 0 ? `+${v}` : v}</button>)}
          </div>
        </div>
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-white/5 to-transparent self-center"></div>
        <div className="flex flex-col items-center gap-3">
          <div className="text-[9px] font-black text-blue-400/50 uppercase tracking-[0.3em]">Aegis</div>
          <div className={`flex items-center gap-2 font-black tabular-nums tracking-tighter px-4 py-1 rounded-2xl ${hp_temp > 0 ? 'bg-blue-500/10 border border-blue-500/20' : 'opacity-30'}`}>
            <span className="material-icons text-blue-400 text-sm">shield</span>
            <span className="text-4xl text-blue-400">+{hp_temp}</span>
          </div>
          <div className="flex gap-1 pointer-events-auto">
            {[-5, -1, 1, 5].map(v => <button key={v} onClick={e => {e.stopPropagation(); adjustShield(v);}} className="w-10 h-8 flex items-center justify-center rounded-lg text-[10px] font-black transition-all active:scale-90 border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/10 text-blue-400">{v > 0 ? `+${v}` : v}</button>)}
          </div>
        </div>
      </div>
      <div ref={containerRef} onMouseDown={onSurfaceDown} className="h-16 bg-slate-950 rounded-[2.5rem] p-1.5 relative shadow-inner border border-white/5 flex items-center transition-all overflow-hidden cursor-crosshair">
        <div className="flex h-full w-full rounded-full overflow-hidden">
          <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${hpPercent}%`, borderRadius: hp_temp > 0 ? '2rem 0 0 2rem' : '2rem' }} />
          {hp_temp > 0 && <div className="h-full bg-blue-500/70 transition-all duration-300 border-l border-white/20" style={{ width: `${tempPercent}%`, borderRadius: '0 2rem 2rem 0' }} />}
        </div>
      </div>
    </div>
  );
};

const SkillCard: React.FC<{
  skill: CooldownSkill;
  dispatch: React.Dispatch<Action>;
  onEdit: (s: CooldownSkill) => void;
}> = ({ skill, dispatch, onEdit }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleDelete = () => {
    if (skill.source === 'system') {
      alert("系统固有技能无法彻底遗忘，请使用‘从栏位移除’。");
      return;
    }
    if (confirm(`确定要铭除武技 [${skill.name}] 吗？此操作无法通过简单的回合结束找回。`)) {
      dispatch({ type: 'DELETE_SKILL', id: skill.id });
    }
    setMenuOpen(false);
  };

  const handleArchive = () => {
    dispatch({ type: 'ARCHIVE_SKILL', id: skill.id, archived: !skill.isArchived });
    setMenuOpen(false);
  };

  if (skill.isArchived) return null;

  return (
    <div className={`p-10 rounded-[3rem] border-2 transition-all duration-500 group relative flex flex-col ${skill.current_cd === 0 ? 'bg-slate-950 border-amber-500/40 shadow-2xl' : 'bg-slate-950/30 border-white/5 opacity-40'}`}>
      <div className="flex justify-between mb-8 items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-black text-xl text-white tracking-tighter">{skill.name}</span>
            {skill.source === 'system' && <span className="bg-white/10 text-white/40 px-2 py-0.5 rounded-md text-[7px] font-black uppercase">Core</span>}
          </div>
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Base CD {skill.base_cd}</p>
        </div>
        <div className="flex items-center gap-2">
           <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${skill.current_cd === 0 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-700'}`}>{skill.current_cd === 0 ? 'READY' : `${skill.current_cd} ROUNDS`}</span>
           <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen(!menuOpen)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                 <span className="material-icons text-slate-500 text-lg">more_vert</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[50] animate-scale-in">
                   <button onClick={() => { onEdit(skill); setMenuOpen(false); }} className="w-full text-left px-6 py-4 text-[10px] font-black text-slate-400 hover:bg-white/5 hover:text-white flex items-center gap-3">
                      <span className="material-icons text-sm">edit</span> 编辑详情
                   </button>
                   <button onClick={handleArchive} className="w-full text-left px-6 py-4 text-[10px] font-black text-slate-400 hover:bg-white/5 hover:text-white flex items-center gap-3">
                      <span className="material-icons text-sm">visibility_off</span> 从栏位移除
                   </button>
                   <div className="h-px bg-white/5" />
                   <button onClick={handleDelete} className={`w-full text-left px-6 py-4 text-[10px] font-black flex items-center gap-3 transition-colors ${skill.source === 'custom' ? 'text-rose-500 hover:bg-rose-500 hover:text-white' : 'text-slate-700 cursor-not-allowed'}`}>
                      <span className="material-icons text-sm">delete_forever</span> 彻底遗忘
                   </button>
                </div>
              )}
           </div>
        </div>
      </div>
      <div className="mb-10 flex-1"><p className="text-xs text-slate-500 leading-relaxed italic">{skill.description}</p></div>
      <button disabled={skill.current_cd > 0} onClick={() => dispatch({type:'CAST_SKILL', id: skill.id})} className={`w-full py-6 rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all ${skill.current_cd === 0 ? 'bg-amber-500 text-slate-950 hover:scale-[1.03] shadow-2xl' : 'bg-slate-900 text-slate-700 cursor-not-allowed'}`}>CAST ACTION</button>
    </div>
  );
};

const CombatTab: React.FC<Props> = ({ state, dispatch, derived }) => {
  const { combat } = state;
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [tempSkill, setTempSkill] = useState<CooldownSkill | null>(null);

  const toggleStatus = (name: string, isStackable: boolean) => {
    const existing = combat.conditions.find(c => c.name === name);
    if (existing) dispatch({ type: 'UPDATE_CONDITION', name, updates: isStackable ? { stacks: existing.stacks + 1 } : null });
    else dispatch({ type: 'UPDATE_CONDITION', name, updates: { stacks: 1, rounds_left: 3 } });
  };

  const handleHealthUpdate = (updates: { hp_current?: number; hp_temp?: number }) => dispatch({ type: 'UPDATE_COMBAT', payload: updates });

  const openSkillEditor = (skill: CooldownSkill) => { setEditingSkillId(skill.id); setTempSkill({ ...skill }); };

  const saveSkillEdit = () => { if (tempSkill) { dispatch({ type: 'UPDATE_SKILL', id: tempSkill.id, payload: tempSkill }); setEditingSkillId(null); setTempSkill(null); } };

  return (
    <div className="flex flex-col gap-12">
      <section className="bg-slate-900 rounded-[4rem] p-16 shadow-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 via-rose-500/20 to-rose-500/0" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start relative z-10">
          <div className="lg:col-span-8">
            <CombatHealthBar hp_max={combat.hp_max} hp_current={combat.hp_current} hp_temp={combat.hp_temp} onUpdate={handleHealthUpdate} />
          </div>
          <div className="lg:col-span-4 grid grid-cols-1 gap-12 border-l border-white/5 pl-16 py-4">
            <div className="space-y-3"><span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">Saving DC</span><div className="text-6xl font-black text-amber-500 tabular-nums tracking-tighter">{combat.save_dc}</div></div>
            <div className="space-y-3"><span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">Armor Class</span><div className="text-6xl font-black text-white tabular-nums tracking-tighter">{combat.others.AC || 10}</div></div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4 space-y-12">
          <section className="space-y-6">
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.4em] px-6">状态列表</h3>
            <div className="bg-slate-900 rounded-[3rem] p-10 border border-white/5 shadow-2xl grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto no-scrollbar">
              {STATUS_LIST.map(s => {
                const active = combat.conditions.find(c => c.name === s.name);
                return (
                  <button key={s.name} onClick={() => toggleStatus(s.name, s.stackable)} className={`p-4 rounded-2xl text-[11px] font-black border transition-all ${active ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xl' : 'bg-slate-950 border-white/5 text-slate-700 hover:border-slate-500'}`}>
                    {s.name}{active && active.stacks > 1 && <span className="block text-[9px] mt-1 opacity-60">x{active.stacks}</span>}
                  </button>
                );
              })}
            </div>
          </section>
          <section className="space-y-6">
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.4em] px-6">常驻特性</h3>
            <div className="bg-slate-900 rounded-[3rem] border border-white/5 p-10 shadow-2xl space-y-8">
              {combat.features.map(f => (
                <div key={f.id} className="group border-b border-white/5 pb-6 last:border-0 last:pb-0">
                  <div className="flex items-center font-black text-slate-100 text-sm tracking-tight mb-2">{f.pinned && <span className="material-icons text-amber-500 text-xs mr-2">push_pin</span>}{f.name}</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{f.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="lg:col-span-8 flex flex-col gap-12">
          <div className="bg-slate-900 rounded-[4rem] p-12 shadow-2xl border border-white/5 flex flex-col flex-1">
            <div className="flex justify-between items-center mb-12">
              <h3 className="text-lg font-black uppercase tracking-[0.2em] flex items-center text-white"><span className="material-icons text-amber-500 mr-4">history_toggle_off</span>冷却武技</h3>
              <div className="flex gap-4">
                <button onClick={() => dispatch({type:'RESET_SKILLS'})} className="bg-slate-950 hover:bg-slate-800 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 border border-white/5">Reset CD</button>
                <button onClick={() => dispatch({type:'ADD_SKILL', skill: {id:'sk_'+Date.now(), name:'新武技', base_cd:3, current_cd:0, description:'技能奥秘...', source: 'custom', isArchived: false}})} className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl">铭刻技能</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
              {combat.cooldown_skills.filter(s => !s.isArchived).map(skill => (
                <SkillCard key={skill.id} skill={skill} dispatch={dispatch} onEdit={openSkillEditor} />
              ))}
              {combat.cooldown_skills.every(s => s.isArchived) && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-20"><p className="text-xs font-black uppercase tracking-widest">目前无激活的武技栏位</p></div>
              )}
            </div>
            <div className="mt-20 flex flex-col items-center">
              <button onClick={() => dispatch({type:'END_TURN'})} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-24 py-8 rounded-[3rem] font-black text-2xl tracking-[0.5em] uppercase shadow-lg transition-all hover:-translate-y-2 active:scale-95 group">
                <div className="flex items-center gap-4"><span className="material-icons text-3xl group-hover:rotate-180 transition-transform duration-700">hourglass_bottom</span>结束回合</div>
              </button>
            </div>
          </div>
        </section>
      </div>

      {editingSkillId && tempSkill && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-8">
          <div className="bg-slate-900 rounded-[3.5rem] p-14 w-full max-w-2xl shadow-2xl border border-white/10 animate-scale-in">
            <h2 className="text-4xl font-black mb-12 flex justify-between items-center text-white tracking-tighter">武技铭刻<button onClick={() => { setEditingSkillId(null); setTempSkill(null); }} className="material-icons text-slate-600 hover:text-white transition-colors">close</button></h2>
            <div className="space-y-10">
              <div className="grid grid-cols-12 gap-10">
                <div className="col-span-8 space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">武技名称</label>
                  <input value={tempSkill.name} onChange={e => setTempSkill({...tempSkill, name: e.target.value})} className="w-full bg-slate-950 border-2 border-white/5 p-6 rounded-2xl font-black text-xl outline-none focus:border-amber-500 text-white" />
                </div>
                <div className="col-span-4 space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">基础 CD</label>
                  <input type="number" min="0" max="7" value={tempSkill.base_cd} onChange={e => setTempSkill({...tempSkill, base_cd: Math.max(0, Math.min(7, parseInt(e.target.value) || 0))})} className="w-full bg-slate-950 border-2 border-white/5 p-6 rounded-2xl font-black outline-none focus:border-amber-500 text-amber-500 text-center text-2xl" />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">秘法描述</label>
                <textarea value={tempSkill.description} onChange={e => setTempSkill({...tempSkill, description: e.target.value})} className="w-full h-40 bg-slate-950 border-2 border-white/5 p-8 rounded-[2rem] font-bold text-sm outline-none focus:border-amber-500 text-slate-400 resize-none leading-relaxed" />
              </div>
            </div>
            <button onClick={saveSkillEdit} className="w-full bg-amber-500 text-slate-950 font-black py-6 rounded-[2rem] mt-14 shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-lg">铭刻修改 (Save)</button>
          </div>
        </div>
      )}
    </div>
  );
};
export default CombatTab;
