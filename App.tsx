
import React, { useReducer, useEffect, useState, useMemo } from 'react';
import { AppState, Action, Archive, InventoryItem, CombatFeature } from './types';
import { SEED_DATA } from './constants';
import { getDerivedStats, exportToJson } from './utils';

// Components
import CharacterTab from './components/CharacterTab';
import EquipmentTab from './components/EquipmentTab';
import SpellsTab from './components/SpellsTab';
import CombatTab from './components/CombatTab';

const ARCHIVES_KEY = 'DND_COMPANION_ARCHIVES_V4'; 
const ACTIVE_ARCHIVE_ID_KEY = 'DND_COMPANION_ACTIVE_ID_V4';

const getInitialSaves = (): Record<string, Archive> => {
  const saved = localStorage.getItem(ARCHIVES_KEY);
  if (saved) return JSON.parse(saved);
  const defaultId = 'save-default';
  return {
    [defaultId]: {
      id: defaultId,
      name: '初始存档',
      lastUpdated: Date.now(),
      state: SEED_DATA
    }
  };
};

const getInitialActiveId = (saves: Record<string, Archive>): string => {
  const savedId = localStorage.getItem(ACTIVE_ARCHIVE_ID_KEY);
  if (savedId && saves[savedId]) return savedId;
  return Object.keys(saves)[0];
};

function reducer(state: AppState & { history?: AppState }, action: Action): AppState & { history?: AppState } {
  const riskyActions = [
    'UPDATE_COMBAT', 'END_TURN', 'CAST_SKILL', 'EQUIP_ITEM', 
    'UNEQUIP_ITEM', 'RESET_SKILLS', 'DELETE_SKILL', 'ADD_SKILL', 'UPDATE_SKILL', 'ARCHIVE_SKILL',
    'ADD_PASSIVE', 'UPDATE_PASSIVE', 'DELETE_PASSIVE'
  ];
  
  let nextState = { ...state };
  if (riskyActions.includes(action.type)) {
    const { history, ...pureState } = state;
    nextState.history = pureState;
  }

  switch (action.type) {
    case 'SET_STATE': return { ...action.payload };
    case 'UPDATE_CHARACTER': return { ...nextState, character: { ...nextState.character, ...action.payload } };
    case 'UPDATE_COMBAT': return { ...nextState, combat: { ...nextState.combat, ...action.payload } };
    case 'UPDATE_CONDITION': {
      const existingIdx = nextState.combat.conditions.findIndex(c => c.name === action.name);
      let nextConditions = [...nextState.combat.conditions];
      if (action.updates === null) {
        nextConditions = nextConditions.filter(c => c.name !== action.name);
      } else if (existingIdx > -1) {
        nextConditions[existingIdx] = { ...nextConditions[existingIdx], ...action.updates };
      } else {
        nextConditions.push({ name: action.name, stacks: 1, rounds_left: 0, ...action.updates });
      }
      return { ...nextState, combat: { ...nextState.combat, conditions: nextConditions } };
    }
    case 'UNDO': return state.history ? { ...state.history } : state;
    case 'RESET_SKILLS':
      return { ...nextState, combat: { ...nextState.combat, cooldown_skills: nextState.combat.cooldown_skills.map(s => ({ ...s, current_cd: 0 })) } };
    case 'END_TURN':
      return {
        ...nextState,
        combat: {
          ...nextState.combat,
          turn_count: nextState.combat.turn_count + 1,
          cooldown_skills: nextState.combat.cooldown_skills.map(s => ({ ...s, current_cd: Math.max(0, s.current_cd - 1) })),
          conditions: nextState.combat.conditions
            .map(c => ({ ...c, rounds_left: c.rounds_left > 0 ? c.rounds_left - 1 : 0 }))
            .filter(c => c.rounds_left > 0 || c.stacks > 0)
        }
      };
    case 'CAST_SKILL':
      return { ...nextState, combat: { ...nextState.combat, cooldown_skills: nextState.combat.cooldown_skills.map(s => s.id === action.id ? { ...s, current_cd: s.base_cd } : s) } };
    case 'EQUIP_ITEM': {
      const oldItem = nextState.equipment.slots[action.slot];
      let updatedInv = [...nextState.inventory];
      if (oldItem) updatedInv.push({ ...oldItem, quantity: 1 } as InventoryItem);
      if (action.item) updatedInv = updatedInv.filter(i => i.id !== action.item?.id);
      return { ...nextState, equipment: { ...nextState.equipment, slots: { ...nextState.equipment.slots, [action.slot]: action.item } }, inventory: updatedInv };
    }
    case 'UNEQUIP_ITEM': {
      const itemToUnequip = nextState.equipment.slots[action.slot];
      if (!itemToUnequip) return nextState;
      return { ...nextState, equipment: { ...nextState.equipment, slots: { ...nextState.equipment.slots, [action.slot]: null } }, inventory: [...nextState.inventory, { ...itemToUnequip, quantity: 1 } as InventoryItem] };
    }
    case 'UPDATE_INVENTORY_ITEM': return { ...nextState, inventory: nextState.inventory.map(i => i.id === action.id ? { ...i, ...action.payload } : i) };
    case 'ADD_INVENTORY_ITEM': return { ...nextState, inventory: [...nextState.inventory, action.item] };
    case 'DELETE_INVENTORY_ITEM': return { ...nextState, inventory: nextState.inventory.filter(i => i.id !== action.id) };
    case 'ADD_SKILL': return { ...nextState, combat: { ...nextState.combat, cooldown_skills: [...nextState.combat.cooldown_skills, action.skill] } };
    case 'UPDATE_SKILL': return { ...nextState, combat: { ...nextState.combat, cooldown_skills: nextState.combat.cooldown_skills.map(s => s.id === action.id ? { ...s, ...action.payload } : s) } };
    case 'DELETE_SKILL':
      // 强制创建全新的 cooldown_skills 数组副本，确保 UI 检测到物理删除
      const filteredSkills = nextState.combat.cooldown_skills.filter(s => s.id !== action.id);
      return { 
        ...nextState, 
        combat: { 
          ...nextState.combat, 
          cooldown_skills: filteredSkills 
        } 
      };
    case 'ARCHIVE_SKILL':
      return { ...nextState, combat: { ...nextState.combat, cooldown_skills: nextState.combat.cooldown_skills.map(s => s.id === action.id ? { ...s, isArchived: action.archived } : s) } };
    
    // Passive Traits Reducers
    case 'ADD_PASSIVE': 
      return { ...nextState, combat: { ...nextState.combat, features: [...nextState.combat.features, action.passive] } };
    case 'UPDATE_PASSIVE':
      return { ...nextState, combat: { ...nextState.combat, features: nextState.combat.features.map(f => f.id === action.id ? { ...f, ...action.payload } : f) } };
    case 'DELETE_PASSIVE':
      const filteredFeatures = nextState.combat.features.filter(f => f.id !== action.id);
      return { 
        ...nextState, 
        combat: { 
          ...nextState.combat, 
          features: filteredFeatures
        } 
      };
    case 'DUPLICATE_PASSIVE': {
      const source = nextState.combat.features.find(f => f.id === action.id);
      if (!source) return nextState;
      const copy = { ...source, id: `passive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, name: `${source.name} (Copy)` };
      return { ...nextState, combat: { ...nextState.combat, features: [...nextState.combat.features, copy] } };
    }

    case 'UPDATE_CHARACTER_SPELL': {
      const charSpellIdx = nextState.characterSpells.findIndex(cs => cs.spell_id === action.metadata.spell_id);
      let nextCharSpells = [...nextState.characterSpells];
      if (charSpellIdx > -1) nextCharSpells[charSpellIdx] = action.metadata;
      else nextCharSpells.push(action.metadata);
      return { ...nextState, characterSpells: nextCharSpells };
    }
    case 'ADD_SPELLS': return { ...nextState, spells: [...nextState.spells, ...action.spells] };
    default: return state;
  }
}

const App: React.FC = () => {
  const [archives, setArchives] = useState<Record<string, Archive>>(getInitialSaves());
  const [activeId, setActiveId] = useState<string>(getInitialActiveId(archives));
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [newArchiveName, setNewArchiveName] = useState('');
  const [state, dispatch] = useReducer(reducer, archives[activeId]?.state || SEED_DATA);
  const [activeTab, setActiveTab] = useState<'character' | 'equipment' | 'spells' | 'combat'>('character');

  const derived = useMemo(() => getDerivedStats(state), [state]);

  useEffect(() => {
    const updatedArchives = { ...archives, [activeId]: { ...archives[activeId], lastUpdated: Date.now(), state: state } };
    setArchives(updatedArchives);
    localStorage.setItem(ARCHIVES_KEY, JSON.stringify(updatedArchives));
    localStorage.setItem(ACTIVE_ARCHIVE_ID_KEY, activeId);
  }, [state, activeId]);

  const loadArchive = (id: string) => { setActiveId(id); dispatch({ type: 'SET_STATE', payload: archives[id].state }); setIsArchiveModalOpen(false); };

  const deleteArchive = (id: string) => {
    if (Object.keys(archives).length <= 1) { alert("至少需要保留一个存档。"); return; }
    // 移除 confirm 拦截，防止预览环境下无法删除存档
    const updated = { ...archives }; delete updated[id]; setArchives(updated);
    if (id === activeId) { const nextId = Object.keys(updated)[0]; setActiveId(nextId); dispatch({ type: 'SET_STATE', payload: updated[nextId].state }); }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 font-sans selection:bg-amber-500/30 text-slate-100 overflow-x-hidden">
      <header className="bg-slate-900/80 backdrop-blur-xl px-12 py-8 flex justify-between items-center sticky top-0 z-[60] border-b border-white/5 shadow-2xl">
        <div className="flex items-center space-x-6">
          <div className="bg-amber-500 w-12 h-12 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)]">
            <span className="material-icons text-slate-950 text-2xl">fort</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-[-0.05em] uppercase leading-none">D&D Companion</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">Chronicle System</span>
              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">v{state.version}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex bg-slate-950 px-6 py-3 rounded-2xl border border-white/5 gap-6 mr-4 shadow-inner">
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Armor Class</span>
              <span className="text-lg font-black text-amber-500">{derived.ac}</span>
            </div>
            <div className="w-px h-8 bg-white/5"></div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Spell DC</span>
              <span className="text-lg font-black text-blue-400">{derived.saveDc}</span>
            </div>
          </div>
          <button onClick={() => setIsArchiveModalOpen(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-2xl transition border border-white/5 group">
            <span className="material-icons text-amber-500 group-hover:rotate-12 transition-transform">auto_stories</span>
            <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">存档管理</span>
          </button>
          <button onClick={() => exportToJson(state, `dnd-${state.character.name}`)} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-2xl transition border border-white/5" title="导出 JSON">
            <span className="material-icons text-slate-400">download</span>
          </button>
        </div>
      </header>

      <nav className="bg-slate-900/40 border-b border-white/5 sticky top-[108px] z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex px-8">
          {(['character', 'equipment', 'spells', 'combat'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-8 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative group ${activeTab === tab ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>
              <div className="flex items-center justify-center gap-3">
                <span className={`material-icons text-lg transition-transform group-hover:scale-125 ${activeTab === tab ? 'scale-110' : ''}`}>
                  {tab === 'character' && 'assignment_ind'} {tab === 'equipment' && 'shield'} {tab === 'spells' && 'auto_stories'} {tab === 'combat' && 'gavel'}
                </span>
                <span className="hidden sm:inline">{tab === 'character' && '英雄之魂'} {tab === 'equipment' && '戎装行囊'} {tab === 'spells' && '至高奥秘'} {tab === 'combat' && '战场博弈'}</span>
              </div>
              {activeTab === tab && <div className="absolute bottom-0 left-8 right-8 h-1 bg-amber-500 rounded-full shadow-[0_-4px_20px_rgba(245,158,11,0.6)]"></div>}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8 lg:p-12 pb-40">
        <div className="animate-fade-in">
          {activeTab === 'character' && <CharacterTab state={state} dispatch={dispatch} derived={derived} />}
          {activeTab === 'equipment' && <EquipmentTab state={state} dispatch={dispatch} derived={derived} />}
          {activeTab === 'spells' && <SpellsTab state={state} dispatch={dispatch} />}
          {activeTab === 'combat' && <CombatTab state={state} dispatch={dispatch} derived={derived} />}
        </div>
      </main>

      {state.history && (
        <button onClick={() => dispatch({ type: 'UNDO' })} className="fixed bottom-12 left-12 bg-slate-800 text-amber-500 w-16 h-16 rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[70] border border-white/10 group" title="时间溯行 (Undo)">
          <span className="material-icons text-3xl group-hover:rotate-[-90deg] transition-transform duration-500">history</span>
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-amber-500 rounded-full animate-ping"></div>
        </button>
      )}

      {/* Save Management Modal */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-8">
           <div className="bg-slate-900 rounded-[3rem] border border-white/10 w-full max-w-2xl p-12 shadow-2xl animate-scale-in">
              <div className="flex justify-between items-center mb-10">
                 <h2 className="text-3xl font-black text-white tracking-tighter">存档位点 (Checkpoints)</h2>
                 <button onClick={() => setIsArchiveModalOpen(false)} className="material-icons text-slate-500 hover:text-white transition-colors">close</button>
              </div>
              
              <div className="space-y-4 mb-10 max-h-96 overflow-y-auto pr-2 no-scrollbar">
                 {Object.values(archives).map((save: Archive) => (
                    <div key={save.id} className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${save.id === activeId ? 'bg-amber-500/10 border-amber-500/40 shadow-lg' : 'bg-slate-950 border-white/5 hover:border-white/10'}`}>
                       <div>
                          <p className="font-black text-white">{save.name}</p>
                          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">最后更新: {new Date(save.lastUpdated).toLocaleString()}</p>
                       </div>
                       <div className="flex gap-2">
                          {save.id !== activeId && <button onClick={() => loadArchive(save.id)} className="material-icons text-amber-500 hover:scale-110 transition-transform">login</button>}
                          <button onClick={() => deleteArchive(save.id)} className="material-icons text-rose-500 hover:scale-110 transition-transform">delete_outline</button>
                       </div>
                    </div>
                 ))}
              </div>

              <div className="bg-slate-950 p-8 rounded-[2rem] border border-white/5">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">创建新存档位点</p>
                 <div className="flex gap-4">
                    <input 
                      value={newArchiveName} 
                      onChange={e => setNewArchiveName(e.target.value)} 
                      placeholder="存档备注..." 
                      className="flex-1 bg-slate-900 border border-white/5 rounded-xl px-5 py-3 outline-none focus:border-amber-500/50 transition-all font-bold"
                    />
                    <button 
                      onClick={() => {
                        const name = newArchiveName.trim() || `存档 ${Object.keys(archives).length + 1}`;
                        const id = `save-${Date.now()}`;
                        const newArchive = { id, name, lastUpdated: Date.now(), state: JSON.parse(JSON.stringify(state)) };
                        setArchives({ ...archives, [id]: newArchive });
                        setActiveId(id);
                        setNewArchiveName('');
                      }} 
                      className="bg-amber-500 text-slate-950 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-500/10 hover:scale-105 active:scale-95 transition-all"
                    >保存状态</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes scale-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-scale-in { animation: scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
export default App;
