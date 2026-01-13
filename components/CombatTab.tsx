
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppState, Action, CooldownSkill, CombatFeature } from '../types';
import { STATUS_LIST } from '../constants';
import { rollDiceExpression } from '../utils';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  derived: any;
}

// 可视化生命条组件
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

// 武技卡片组件
const SkillCard: React.FC<{
  skill: CooldownSkill;
  dispatch: React.Dispatch<Action>;
  onEdit: (s: CooldownSkill) => void;
  onCast: (s: CooldownSkill) => void;
}> = ({ skill, dispatch, onEdit, onCast }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  if (skill.isArchived) return null;

  return (
    <div key={skill.id} className={`p-10 rounded-[3rem] border-2 transition-all duration-500 group relative flex flex-col animate-fade-in ${skill.current_cd === 0 ? 'bg-slate-950 border-amber-500/40 shadow-2xl' : 'bg-slate-950/30 border-white/5 opacity-40'}`}>
      <div className="flex justify-between mb-8 items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-black text-xl text-white tracking-tighter">{skill.name}</span>
            {skill.source === 'system' && <span className="bg-white/10 text-white/40 px-2 py-0.5 rounded-md text-[7px] font-black uppercase">Core</span>}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Base CD {skill.base_cd}</p>
            {skill.damage && <span className="text-[10px] text-rose-500 font-black flex items-center gap-1"><span className="material-icons text-[12px]">casino</span> {skill.damage}</span>}
          </div>
        </div>
        <div ref={menuRef} className="relative">
           <button onClick={() => setMenuOpen(!menuOpen)} className="material-icons text-slate-700 hover:text-white transition-colors">more_vert</button>
           {menuOpen && (
             <div className="absolute right-0 mt-4 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-20 py-2 animate-scale-in">
                <button onClick={() => { onEdit(skill); setMenuOpen(false); }} className="w-full text-left px-6 py-3 text-[10px] font-black text-slate-400 hover:bg-white/5 hover:text-white uppercase tracking-widest">编辑详情</button>
                <div className="h-px bg-white/5 mx-4 my-2"></div>
                <button 
                  onClick={() => { 
                    dispatch({ type: 'DELETE_SKILL', id: skill.id }); 
                    setMenuOpen(false); 
                  }} 
                  className="w-full text-left px-6 py-3 text-[10px] font-black text-rose-500 hover:bg-rose-500/10 uppercase tracking-widest"
                >彻底遗忘武技</button>
             </div>
           )}
        </div>
      </div>
      <p className="text-sm text-slate-500 font-bold leading-relaxed mb-8 flex-1 line-clamp-3 italic">{skill.description}</p>
      <button 
        disabled={skill.current_cd > 0} 
        onClick={() => onCast(skill)}
        className={`w-full py-6 rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all ${skill.current_cd === 0 ? 'bg-amber-500 text-slate-950 hover:scale-[1.03] shadow-2xl shadow-amber-500/20 active:scale-95' : 'bg-slate-900 text-slate-700 cursor-not-allowed'}`}
      >
        {skill.current_cd === 0 ? '发动武技' : `冷却中 (${skill.current_cd}R)`}
      </button>
    </div>
  );
};

// 被动特性卡片组件
const TraitCard: React.FC<{
  trait: CombatFeature;
  dispatch: React.Dispatch<Action>;
  onEdit: (t: CombatFeature) => void;
}> = ({ trait, dispatch, onEdit }) => {
  return (
    <div key={trait.id} className="group bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] hover:border-amber-500/30 transition-all relative overflow-hidden flex flex-col h-full min-h-[220px] shadow-lg animate-fade-in">
      <div className="flex justify-between items-start mb-6">
        <h4 className="text-xl font-black text-white tracking-tight leading-tight">{trait.name}</h4>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button onClick={() => onEdit(trait)} className="material-icons text-slate-600 hover:text-amber-500 transition-colors">edit_note</button>
          <button 
            onClick={() => { 
              dispatch({ type: 'DELETE_PASSIVE', id: trait.id }); 
            }} 
            className="material-icons text-slate-600 hover:text-rose-500 transition-colors"
          >delete_forever</button>
        </div>
      </div>
      <div className="relative flex-1">
        <p className="text-xs text-slate-400 font-bold leading-relaxed line-clamp-6 whitespace-pre-wrap italic">
          {trait.description}
        </p>
        <div className="absolute inset-0 bg-slate-900/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 z-10 pointer-events-none text-center">
           <span className="material-icons text-amber-500 mb-2">auto_awesome</span>
           <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
             点击右上角编辑或彻底删除
           </span>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 h-1 w-0 group-hover:w-full bg-amber-500/40 transition-all duration-700 shadow-[0_0_20px_rgba(245,158,11,0.2)]"></div>
    </div>
  );
};

// 主战斗面板
const CombatTab: React.FC<Props> = ({ state, dispatch, derived }) => {
  const { combat } = state;
  const [editingSkill, setEditingSkill] = useState<CooldownSkill | null>(null);
  const [editingTrait, setEditingTrait] = useState<CombatFeature | null>(null);
  const [castResult, setCastResult] = useState<{ skillName: string, result: any } | null>(null);

  const STACKABLE_NAMES = ['触电', '狂暴', '燃烧', '冰冻'];

  const handleStatusClick = (name: string, isStackable: boolean) => {
    const existing = combat.conditions.find(c => c.name === name);
    if (existing) {
      dispatch({ type: 'UPDATE_CONDITION', name, updates: isStackable ? { stacks: existing.stacks + 1 } : null });
    } else {
      dispatch({ type: 'UPDATE_CONDITION', name, updates: { stacks: 1, rounds_left: 3 } });
    }
  };

  const handleStatusContextMenu = (e: React.MouseEvent, name: string) => {
    // 只有指定的四个状态支持右键减层
    if (!STACKABLE_NAMES.includes(name)) return;
    
    e.preventDefault(); // 阻止浏览器菜单
    const existing = combat.conditions.find(c => c.name === name);
    if (!existing) return;

    if (existing.stacks > 1) {
      dispatch({ type: 'UPDATE_CONDITION', name, updates: { stacks: existing.stacks - 1 } });
    } else {
      dispatch({ type: 'UPDATE_CONDITION', name, updates: null }); // 移除状态
    }
  };

  const handleCast = (skill: CooldownSkill) => {
    if (skill.current_cd > 0) return;
    if (skill.damage) {
      const result = rollDiceExpression(skill.damage);
      if (result) setCastResult({ skillName: skill.name, result });
    }
    dispatch({ type: 'CAST_SKILL', id: skill.id });
  };

  return (
    <div className="space-y-16 pb-20">
      {/* 1. 生命与状态栏 */}
      <section className="bg-slate-900 rounded-[3rem] p-12 border border-white/5 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 blur-[120px] -mr-48 -mt-48"></div>
        <div className="flex justify-between items-center mb-12 relative z-10">
          <div>
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em]">战场战况实时监控</h2>
            <div className="text-4xl font-black text-white mt-2 tracking-tighter">回合 {state.combat.turn_count}</div>
          </div>
          <button onClick={() => dispatch({ type: 'END_TURN' })} className="bg-white text-slate-950 px-12 py-5 rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
            <span className="material-icons text-xl">hourglass_empty</span>
            结束回合
          </button>
        </div>
        
        <CombatHealthBar 
          hp_max={derived.hpMax} 
          hp_current={state.combat.hp_current} 
          hp_temp={state.combat.hp_temp} 
          onUpdate={updates => dispatch({ type: 'UPDATE_COMBAT', payload: updates })} 
        />

        <div className="mt-8 bg-slate-950/40 rounded-[2.5rem] border border-white/5 p-8 relative z-10">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {STATUS_LIST.map(st => {
              const active = combat.conditions.find(c => c.name === st.name);
              return (
                <button 
                  key={st.name} 
                  onClick={() => handleStatusClick(st.name, st.stackable)}
                  onContextMenu={(e) => handleStatusContextMenu(e, st.name)}
                  title={STACKABLE_NAMES.includes(st.name) ? "左键: 增加 / 右键: 减少" : ""}
                  className={`py-2 px-3 rounded-xl text-[10px] font-black text-center border transition-all truncate select-none ${active ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-lg' : 'bg-slate-900 border-white/5 text-slate-600 hover:border-slate-500 hover:text-slate-300'}`}
                >
                  {st.name}{active && active.stacks > 1 ? ` x${active.stacks}` : ''}
                </button>
              );
            })}
          </div>
          <div className="mt-4 px-2">
            <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest italic">
              * 提示: 右键点击“触电、狂暴、燃烧、冰冻”可减少层数。
            </p>
          </div>
        </div>

        <div className="bg-slate-950/60 p-8 rounded-[2.5rem] border border-white/5 mt-8 relative z-10">
            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-6">当前激活状态</h3>
            <div className="flex flex-wrap gap-3">
               {combat.conditions.map(c => (
                 <div key={c.name} className="bg-slate-900 border border-white/5 pl-4 pr-2 py-2 rounded-xl flex items-center gap-3 group">
                    <span className="text-sm font-black text-white">{c.name} {c.stacks > 1 ? `(x${c.stacks})` : ''}</span>
                    <div className="w-px h-4 bg-white/5"></div>
                    <span className="text-[10px] font-black text-amber-500">{c.rounds_left}R</span>
                    <button onClick={() => dispatch({ type: 'UPDATE_CONDITION', name: c.name, updates: null })} className="material-icons text-slate-700 hover:text-rose-500 text-xs">close</button>
                 </div>
               ))}
               {combat.conditions.length === 0 && <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest italic opacity-20">无活动状态</span>}
            </div>
         </div>
      </section>

      {/* 2. 武技冷却栏 */}
      <section className="space-y-10">
        <div className="flex justify-between items-end px-4">
           <div>
             <h2 className="text-xs font-black text-slate-600 uppercase tracking-[0.4em] mb-4">武技秘传刻印</h2>
             <p className="text-slate-400 font-bold text-sm">点击“发动武技”将自动掷出对应伤害骰</p>
           </div>
           <div className="flex gap-4">
             <button onClick={() => dispatch({type:'RESET_SKILLS'})} className="bg-slate-900 text-slate-500 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5">冷却重置</button>
             <button 
               onClick={() => setEditingSkill({ id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, name: '', base_cd: 1, current_cd: 0, description: '', damage: '1d8', source: 'custom', isArchived: false })}
               className="bg-amber-500 text-slate-950 px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-amber-500/10 active:scale-95 transition-all"
             >铭刻武技</button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {combat.cooldown_skills.map(s => (
             <SkillCard key={s.id} skill={s} dispatch={dispatch} onEdit={setEditingSkill} onCast={handleCast} />
           ))}
           {combat.cooldown_skills.length === 0 && (
             <div className="col-span-full py-24 text-center bg-slate-900/10 rounded-[4rem] border-2 border-dashed border-white/5 opacity-40">
                <span className="material-icons text-slate-800 text-6xl mb-4">casino</span>
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em]">武技库尚无刻印，点击上方铭刻你的战斗奥秘</p>
             </div>
           )}
        </div>
      </section>

      {/* 3. 被动特性栏 */}
      <section className="space-y-10">
        <div className="flex justify-between items-end px-4">
           <div>
             <h2 className="text-xs font-black text-slate-600 uppercase tracking-[0.4em] mb-4">神魂被动特性</h2>
             <p className="text-slate-400 font-bold text-sm">长期生效的奥秘能力。点击删除将彻底消失。</p>
           </div>
           <button 
             onClick={() => setEditingTrait({ id: `trait_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, name: '', description: '' })}
             className="bg-slate-800 text-amber-500 border border-amber-500/20 px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-slate-950 transition-all shadow-xl"
           >显化特性</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           {combat.features.map(f => (
             <TraitCard 
               key={f.id} 
               trait={f} 
               dispatch={dispatch} 
               onEdit={setEditingTrait} 
             />
           ))}
           
           {combat.features.length === 0 && (
             <div className="col-span-full py-24 text-center bg-slate-900/10 rounded-[4rem] border-2 border-dashed border-white/5 opacity-40">
                <span className="material-icons text-slate-800 text-6xl mb-4">auto_awesome</span>
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em]">神魂之海风平浪静，点击上方显化新的特性</p>
             </div>
           )}
        </div>
      </section>

      {/* --- 弹窗与遮罩层 --- */}

      {/* 伤害掷骰结果遮罩 */}
      {castResult && (
        <div className="fixed inset-0 z-[250] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-8" onClick={() => setCastResult(null)}>
          <div className="bg-slate-900 border border-rose-500/30 text-white rounded-[3.5rem] p-12 shadow-[0_40px_100px_rgba(0,0,0,0.8)] animate-scale-in min-w-[450px]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-12">
              <div>
                <h3 className="text-[10px] font-black uppercase text-rose-500 tracking-[0.5em] mb-2">{castResult.skillName} 发动成功</h3>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">奥秘律动: {castResult.result.expression}</p>
              </div>
              <button onClick={() => setCastResult(null)} className="material-icons text-slate-600 hover:text-white transition-colors">close</button>
            </div>
            
            <div className="flex flex-col gap-12 text-center">
              <div className="flex flex-wrap gap-4 justify-center">
                {castResult.result.rolls.map((r: number, i: number) => (
                  <div key={i} className="bg-slate-950 w-16 h-16 flex flex-col items-center justify-center rounded-[1.5rem] border border-white/5 shadow-inner">
                    <span className="text-[8px] font-black text-slate-700 uppercase mb-1">ROLL</span>
                    <span className="text-2xl font-black text-slate-200">{r}</span>
                  </div>
                ))}
                {castResult.result.modifier !== 0 && (
                   <div className="flex flex-col justify-center px-6 h-16 bg-rose-500/10 rounded-[1.5rem] border border-rose-500/20">
                      <span className="text-[8px] font-black text-rose-500 uppercase mb-1">MOD</span>
                      <span className="text-xl font-black text-rose-500">{castResult.result.modifier > 0 ? '+' : ''}{castResult.result.modifier}</span>
                   </div>
                )}
              </div>
              <div className="relative inline-block py-4">
                 <div className="absolute inset-0 bg-rose-500/20 blur-[60px] rounded-full"></div>
                 <span className="text-[11px] text-rose-500 font-black block mb-4 tracking-[0.4em] uppercase relative z-10">Total Damage Dealt</span>
                 <div className="relative z-10 flex items-center justify-center gap-4">
                    <span className="material-icons text-rose-500 text-4xl animate-pulse">flash_on</span>
                    <span className="text-9xl font-black text-white tracking-tighter tabular-nums drop-shadow-2xl">{castResult.result.total}</span>
                    <span className="material-icons text-rose-500 text-4xl animate-pulse">flash_on</span>
                 </div>
              </div>
              <button onClick={() => setCastResult(null)} className="w-full py-6 bg-slate-800 hover:bg-slate-700 rounded-3xl text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 transition-all border border-white/5 mt-4">收回气劲</button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑武技弹窗 */}
      {editingSkill && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-8">
           <div className="bg-slate-900 rounded-[3.5rem] p-14 w-full max-w-2xl border border-white/10 animate-scale-in shadow-2xl">
              <h2 className="text-4xl font-black mb-12 text-white tracking-tighter">武技刻印仪轨</h2>
              <div className="space-y-10">
                 <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4 ml-2">武技全称</label>
                    <input value={editingSkill.name} onChange={e => setEditingSkill({...editingSkill, name: e.target.value})} className="w-full bg-slate-950 border-2 border-white/5 p-6 rounded-2xl font-black text-white text-xl outline-none focus:border-amber-500" />
                 </div>
                 <div className="grid grid-cols-2 gap-8">
                    <div>
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4 ml-2">冷却回合 (CD)</label>
                       <input type="number" min="0" max="10" value={editingSkill.base_cd} onChange={e => setEditingSkill({...editingSkill, base_cd: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border-2 border-white/5 p-6 rounded-2xl font-black text-amber-500 text-center text-2xl outline-none focus:border-amber-500" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4 ml-2">伤害骰 (如 1d8+2)</label>
                       <input value={editingSkill.damage || ''} onChange={e => setEditingSkill({...editingSkill, damage: e.target.value})} className="w-full bg-slate-950 border-2 border-white/5 p-6 rounded-2xl font-black text-rose-500 text-center text-2xl outline-none focus:border-rose-500" placeholder="e.g. 1d8+2" />
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4 ml-2">效果详述</label>
                    <textarea value={editingSkill.description} onChange={e => setEditingSkill({...editingSkill, description: e.target.value})} className="w-full h-32 bg-slate-950 border-2 border-white/5 p-8 rounded-[2rem] font-bold text-slate-400 outline-none focus:border-amber-500 resize-none leading-relaxed" />
                 </div>
              </div>
              <div className="flex gap-4 mt-16">
                 <button onClick={() => setEditingSkill(null)} className="flex-1 bg-slate-800 text-white font-black py-6 rounded-2xl uppercase tracking-widest text-xs">取消</button>
                 <button onClick={() => {
                   if (!combat.cooldown_skills.find(s => s.id === editingSkill.id)) {
                     dispatch({ type: 'ADD_SKILL', skill: editingSkill });
                   } else {
                     dispatch({ type: 'UPDATE_SKILL', id: editingSkill.id, payload: editingSkill });
                   }
                   setEditingSkill(null);
                 }} className="flex-1 bg-amber-500 text-slate-950 font-black py-6 rounded-2xl uppercase tracking-widest text-xs">完成刻印</button>
              </div>
           </div>
        </div>
      )}

      {/* 编辑特性弹窗 */}
      {editingTrait && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-8">
           <div className="bg-slate-900 rounded-[3.5rem] p-14 w-full max-w-2xl border border-white/10 animate-scale-in shadow-2xl">
              <h2 className="text-4xl font-black mb-12 text-white tracking-tighter">特性刻印仪轨</h2>
              <div className="space-y-10">
                 <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4 ml-2">特性全称</label>
                    <input value={editingTrait.name} onChange={e => setEditingTrait({...editingTrait, name: e.target.value})} className="w-full bg-slate-950 border-2 border-white/5 p-6 rounded-2xl font-black text-white text-xl outline-none focus:border-amber-500" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4 ml-2">效果详述</label>
                    <textarea value={editingTrait.description} onChange={e => setEditingTrait({...editingTrait, description: e.target.value})} className="w-full h-64 bg-slate-950 border-2 border-white/5 p-8 rounded-[2rem] font-bold text-slate-400 outline-none focus:border-amber-500 resize-none leading-relaxed" />
                 </div>
              </div>
              <div className="flex gap-4 mt-16">
                 <button onClick={() => setEditingTrait(null)} className="flex-1 bg-slate-800 text-white font-black py-6 rounded-2xl uppercase tracking-widest text-xs">取消</button>
                 <button onClick={() => {
                   if (!combat.features.find(f => f.id === editingTrait.id)) {
                     dispatch({ type: 'ADD_PASSIVE', passive: editingTrait });
                   } else {
                     dispatch({ type: 'UPDATE_PASSIVE', id: editingTrait.id, payload: editingTrait });
                   }
                   setEditingTrait(null);
                 }} className="flex-1 bg-amber-500 text-slate-950 font-black py-6 rounded-2xl uppercase tracking-widest text-xs">完成刻印</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CombatTab;
