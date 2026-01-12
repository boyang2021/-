
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
        } else {
          return;
        }
      }

      if (currentType === 'horizontal' || currentType === 'handle_current') {
        const newVal = calculateValueFromX(e.clientX);
        onUpdate({ hp_current: Math.min(newVal, hp_max) });
      } else if (currentType === 'vertical') {
        if (dy < -30 && hp_temp === 0) {
          onUpdate({ hp_temp: 5 }); 
        }
      } else if (currentType === 'handle_temp') {
        const newVal = calculateValueFromX(e.clientX);
        const valRelativeToCurrent = Math.max(0, newVal - hp_current);
        onUpdate({ hp_temp: valRelativeToCurrent });
      }
    };

    const handleMouseUp = () => setInteraction(null);

    if (interaction) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [interaction, calculateValueFromX, hp_max, hp_current, hp_temp, onUpdate]);

  const onSurfaceDown = (e: React.MouseEvent) => {
    const startX = e.clientX;
    const startY = e.clientY;
    setInteraction({
      type: 'detecting',
      startX,
      startY,
      initialCurrent: hp_current,
      initialTemp: hp_temp,
    });
  };

  const hpPercent = Math.min(100, (hp_current / hp_max) * 100);
  const tempPercent = (hp_temp / hp_max) * 100;

  const PrecisionButtons = ({ onAdjust, colorClass }: { onAdjust: (val: number) => void, colorClass: string }) => (
    <div className="flex gap-1 pointer-events-auto">
      {[-5, -1, 1, 5].map(val => (
        <button
          key={val}
          onClick={(e) => { e.stopPropagation(); onAdjust(val); }}
          className={`w-10 h-8 flex items-center justify-center rounded-lg text-[10px] font-black transition-all active:scale-90 border border-white/5 hover:border-${colorClass}-500/50 hover:bg-${colorClass}-500/10 ${val > 0 ? `text-${colorClass}-400` : 'text-slate-500'}`}
        >
          {val > 0 ? `+${val}` : val}
        </button>
      ))}
    </div>
  );

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
          <PrecisionButtons onAdjust={adjustHP} colorClass="rose" />
        </div>
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-white/5 to-transparent self-center"></div>
        <div className="flex flex-col items-center gap-3">
          <div className="text-[9px] font-black text-blue-400/50 uppercase tracking-[0.3em]">Aegis</div>
          <div className={`flex items-center gap-2 font-black tabular-nums tracking-tighter transition-all px-4 py-1 rounded-2xl ${hp_temp > 0 ? 'bg-blue-500/10 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'opacity-30'}`}>
            <span className="material-icons text-blue-400 text-sm">shield</span>
            <span className="text-4xl text-blue-400">+{hp_temp}</span>
          </div>
          <PrecisionButtons onAdjust={adjustShield} colorClass="blue" />
        </div>
      </div>

      <div 
        ref={containerRef}
        onMouseDown={onSurfaceDown}
        className={`h-16 bg-slate-950 rounded-[2.5rem] p-1.5 relative shadow-inner border border-white/5 flex items-center transition-all overflow-hidden ${interaction?.type === 'vertical' ? 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.2)]' : 'cursor-crosshair'}`}
      >
        <div className="flex h-full w-full rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)] ${hpPercent > 20 ? 'bg-rose-500' : 'bg-rose-600 animate-pulse'}`}
            style={{ 
              width: `${hpPercent}%`,
              borderRadius: hp_temp > 0 ? '2rem 0 0 2rem' : '2rem'
            }}
          ></div>
          {hp_temp > 0 && (
            <div 
              className="h-full bg-blue-500/70 transition-all duration-300 border-l border-white/20 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)] relative"
              style={{ 
                width: `${tempPercent}%`,
                borderRadius: '0 2rem 2rem 0'
              }}
            >
              <div className="w-full h-full opacity-20 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' }}></div>
              <div className="absolute inset-0 bg-blue-400/20 animate-pulse"></div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute w-full mt-4 flex items-start pointer-events-none" style={{ height: '40px' }}>
        <div 
          onMouseDown={(e) => {
            e.stopPropagation();
            setInteraction({
              type: 'handle_current',
              startX: e.clientX,
              startY: e.clientY,
              initialCurrent: hp_current,
              initialTemp: hp_temp
            });
          }}
          className="absolute top-0 pointer-events-auto cursor-grab active:cursor-grabbing group/handle"
          style={{ left: `${hpPercent}%`, transform: 'translateX(-50%)' }}
        >
          <div className="flex flex-col items-center">
            <div className="w-1 h-3 bg-rose-500/50 mb-1"></div>
            <div className="bg-slate-800 border-2 border-rose-500 w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl group-hover/handle:scale-110 transition-transform">
              <span className="material-icons text-rose-500 text-xl">favorite</span>
            </div>
          </div>
        </div>

        {hp_temp > 0 && (
          <div 
            onMouseDown={(e) => {
              e.stopPropagation();
              setInteraction({
                type: 'handle_temp',
                startX: e.clientX,
                startY: e.clientY,
                initialCurrent: hp_current,
                initialTemp: hp_temp
              });
            }}
            className="absolute top-0 pointer-events-auto cursor-grab active:cursor-grabbing group/handle transition-opacity duration-300"
            style={{ left: `${hpPercent + tempPercent}%`, transform: 'translateX(-50%)' }}
          >
            <div className="flex flex-col items-center">
              <div className="w-1 h-3 bg-blue-500/50 mb-1"></div>
              <div className="bg-slate-800 border-2 border-blue-400 w-8 h-8 rounded-xl flex items-center justify-center shadow-xl group-hover/handle:scale-110 transition-transform">
                <span className="material-icons text-blue-400 text-sm">shield</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {hp_temp === 0 && !interaction && (
        <div className="absolute top-[140px] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none flex flex-col items-center">
          <span className="material-icons text-blue-400 text-xs animate-bounce">expand_less</span>
          <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter">Swipe up to summon shield</span>
        </div>
      )}
    </div>
  );
};

const CombatTab: React.FC<Props> = ({ state, dispatch, derived }) => {
  const { combat } = state;
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [tempSkill, setTempSkill] = useState<CooldownSkill | null>(null);

  const toggleStatus = (name: string, isStackable: boolean) => {
    const existing = combat.conditions.find(c => c.name === name);
    if (existing) {
      if (isStackable) dispatch({ type: 'UPDATE_CONDITION', name, updates: { stacks: existing.stacks + 1 } });
      else dispatch({ type: 'UPDATE_CONDITION', name, updates: null });
    } else dispatch({ type: 'UPDATE_CONDITION', name, updates: { stacks: 1, rounds_left: 3 } });
  };

  const handleHealthUpdate = (updates: { hp_current?: number; hp_temp?: number }) => {
    dispatch({ type: 'UPDATE_COMBAT', payload: updates });
  };

  const openSkillEditor = (skill: CooldownSkill) => {
    setEditingSkillId(skill.id);
    setTempSkill({ ...skill });
  };

  const saveSkillEdit = () => {
    if (tempSkill) {
      dispatch({ type: 'UPDATE_SKILL', id: tempSkill.id, payload: tempSkill });
      setEditingSkillId(null);
      setTempSkill(null);
    }
  };

  const deleteSkill = (id?: string) => {
    const targetId = id || editingSkillId;
    if (targetId && confirm('确定要遗忘此项武技吗？这将从本存档中永久移除此条目。')) {
      dispatch({ type: 'DELETE_SKILL', id: targetId });
      setEditingSkillId(null);
      setTempSkill(null);
    }
  };

  return (
    <div className="flex flex-col gap-12">
      <section className="bg-slate-900 rounded-[4rem] p-16 shadow-[0_40px_80px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 via-rose-500/20 to-rose-500/0"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start relative z-10">
          <div className="lg:col-span-8">
            <CombatHealthBar 
              hp_max={combat.hp_max}
              hp_current={combat.hp_current}
              hp_temp={combat.hp_temp}
              onUpdate={handleHealthUpdate}
            />
          </div>
          <div className="lg:col-span-4 grid grid-cols-1 gap-12 border-l border-white/5 pl-16 py-4">
            <div className="space-y-3 group cursor-help">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">豁免判定 (Saving DC)</span>
              <div className="flex items-center gap-4">
                <div className="text-6xl font-black text-amber-500 tabular-nums tracking-tighter">{combat.save_dc}</div>
                <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
                  <span className="text-[8px] font-black text-amber-500 uppercase">Target</span>
                </div>
              </div>
            </div>
            <div className="space-y-3 group cursor-help">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">护甲等级 (Armor Class)</span>
              <div className="flex items-center gap-4">
                <div className="text-6xl font-black text-white tabular-nums tracking-tighter">{combat.others.AC || 10}</div>
                <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                  <span className="text-[8px] font-black text-slate-400 uppercase">Defense</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
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
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${skill.current_cd === 0 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-700'}`}>{skill.current_cd === 0 ? 'READY' : `${skill.current_cd} ROUNDS`}</span>
                  </div>
                  <div className="mb-10 flex-1"><p className="text-xs text-slate-500 leading-relaxed italic">{skill.description}</p></div>
                  <button disabled={skill.current_cd > 0} onClick={() => dispatch({type:'CAST_SKILL', id: skill.id})} className={`w-full py-6 rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all ${skill.current_cd === 0 ? 'bg-amber-500 text-slate-950 hover:scale-[1.03] shadow-2xl' : 'bg-slate-900 text-slate-700 cursor-not-allowed'}`}>CAST ACTION</button>
                  
                  {/* Action Overlay */}
                  <div className="absolute top-6 right-8 opacity-0 group-hover:opacity-100 flex gap-3 transition-all z-20">
                    <button onClick={() => openSkillEditor(skill)} className="bg-slate-900/90 hover:bg-white p-2.5 rounded-xl border border-white/10 transition-all shadow-xl group/btn" title="编辑武技">
                      <span className="material-icons text-lg text-amber-500 group-hover/btn:scale-110 transition-transform">edit</span>
                    </button>
                    <button onClick={() => deleteSkill(skill.id)} className="bg-slate-900/90 hover:bg-rose-600 p-2.5 rounded-xl border border-white/10 transition-all shadow-xl group/btn" title="快速遗忘">
                      <span className="material-icons text-lg text-rose-500 group-hover/btn:text-white group-hover/btn:scale-110 transition-transform">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-20 flex flex-col items-center gap-6">
              <button onClick={() => dispatch({type:'END_TURN'})} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-24 py-8 rounded-[3rem] font-black text-2xl tracking-[0.5em] uppercase shadow-[0_20px_60px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-2 active:scale-95 group">
                <div className="flex items-center gap-4"><span className="material-icons text-3xl group-hover:rotate-180 transition-transform duration-700">hourglass_bottom</span>结束回合</div>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Skill Editor Modal */}
      {editingSkillId && tempSkill && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-8">
          <div className="bg-slate-900 rounded-[3.5rem] p-14 w-full max-w-2xl shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 animate-scale-in">
            <h2 className="text-4xl font-black mb-12 flex justify-between items-center text-white tracking-tighter">
              武技铭刻 (Skill Engraving)
              <button onClick={() => setEditingSkillId(null)} className="material-icons text-slate-600 hover:text-white transition-colors">close</button>
            </h2>
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                <div className="md:col-span-8 space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-2">武技全称</label>
                  <input 
                    value={tempSkill.name} 
                    onChange={e => setTempSkill({...tempSkill, name: e.target.value})} 
                    className="w-full bg-slate-950 border-2 border-white/5 p-6 rounded-2xl font-black text-xl outline-none focus:border-amber-500 transition-all text-white"
                    placeholder="输入武技名称..."
                  />
                </div>
                <div className="md:col-span-4 space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-2">基础冷却 (Rounds)</label>
                  <input 
                    type="number" 
                    min="0" max="7"
                    value={tempSkill.base_cd} 
                    onChange={e => setTempSkill({...tempSkill, base_cd: Math.max(0, Math.min(7, parseInt(e.target.value) || 0))})} 
                    className="w-full bg-slate-950 border-2 border-white/5 p-6 rounded-2xl font-black outline-none focus:border-amber-500 transition-all text-amber-500 text-center text-2xl"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-2">秘法描述 (Skill Description)</label>
                <textarea 
                  value={tempSkill.description} 
                  onChange={e => setTempSkill({...tempSkill, description: e.target.value})} 
                  className="w-full h-40 bg-slate-950 border-2 border-white/5 p-8 rounded-[2rem] font-bold text-sm outline-none focus:border-amber-500 transition-all text-slate-400 resize-none leading-relaxed"
                  placeholder="详细描述此项武技的效果与奥秘..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-14">
              <button 
                onClick={() => deleteSkill()}
                className="md:col-span-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all border border-rose-500/20 flex flex-col items-center justify-center gap-1 group"
              >
                <span className="material-icons text-xl group-hover:scale-110 transition-transform">delete_forever</span>
                遗忘武技
              </button>
              <button 
                onClick={saveSkillEdit} 
                className="md:col-span-3 bg-amber-500 text-slate-950 font-black py-6 rounded-[2rem] shadow-2xl shadow-amber-500/20 active:scale-95 transition-all uppercase tracking-widest text-lg flex items-center justify-center gap-4"
              >
                <span className="material-icons">history_edu</span>
                铭刻修改 (Save)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CombatTab;
