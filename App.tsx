
import React, { useReducer, useEffect, useState, useMemo } from 'react';
import { AppState, Action, Archive, InventoryItem } from './types';
import { SEED_DATA } from './constants';
import { getDerivedStats, exportToJson } from './utils';

// Components
import CharacterTab from './components/CharacterTab';
import EquipmentTab from './components/EquipmentTab';
import SpellsTab from './components/SpellsTab';
import CombatTab from './components/CombatTab';

const ARCHIVES_KEY = 'DND_COMPANION_ARCHIVES_V2';
const ACTIVE_ARCHIVE_ID_KEY = 'DND_COMPANION_ACTIVE_ID_V2';

const getInitialSaves = (): Record<string, Archive> => {
  const saved = localStorage.getItem(ARCHIVES_KEY);
  if (saved) return JSON.parse(saved);
  const defaultId = 'default-save';
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
    'UNEQUIP_ITEM', 'RESET_SKILLS', 'DELETE_SKILL', 'ADD_SKILL', 'UPDATE_SKILL', 'ARCHIVE_SKILL'
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
      return { ...nextState, combat: { ...nextState.combat, cooldown_skills: nextState.combat.cooldown_skills.filter(s => s.id !== action.id) } };
    case 'ARCHIVE_SKILL':
      return { ...nextState, combat: { ...nextState.combat, cooldown_skills: nextState.combat.cooldown_skills.map(s => s.id === action.id ? { ...s, isArchived: action.archived } : s) } };
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

  const createSnapshot = () => {
    const name = newArchiveName.trim() || `${state.character.name} (等级 ${state.character.level})`;
    const id = `save-${Date.now()}`;
    const newArchive: Archive = { id, name, lastUpdated: Date.now(), state: JSON.parse(JSON.stringify(state)) };
    const updated = { ...archives, [id]: newArchive };
    setArchives(updated);
    setActiveId(id);
    setNewArchiveName('');
  };

  const loadArchive = (id: string) => { setActiveId(id); dispatch({ type: 'SET_STATE', payload: archives[id].state }); setIsArchiveModalOpen(false); };

  const deleteArchive = (id: string) => {
    if (Object.keys(archives).length <= 1) { alert("至少需要保留一个存档。"); return; }
    if (confirm("确定要删除此存档吗？此操作无法撤销。")) {
      const updated = { ...archives }; delete updated[id]; setArchives(updated);
      if (id === activeId) { const nextId = Object.keys(updated)[0]; setActiveId(nextId); dispatch({ type: 'SET_STATE', payload: updated[nextId].state }); }
    }
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
              <span className="text-lg font-black text-amber-500">{(state.combat.others.AC as number) || 10}</span>
            </div>
            <div className="w-px h-8 bg-white/5"></div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Active Save</span>
              <span className="text-[10px] font-black text-blue-400 max-w-[100px] truncate">{archives[activeId]?.name}</span>
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

      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 lg:p-12">
          <div className="bg-slate-900/60 border border-white/10 rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_40px_100px_rgba(0,0,0,0.8)] animate-scale-in">
            <div className="p-10 border-b border-white/5 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">英雄编年史</h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Archive Management & Snapshots</p>
              </div>
              <button onClick={() => setIsArchiveModalOpen(false)} className="material-icons text-slate-600 hover:text-white transition-colors">close</button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar">
              <div className="bg-slate-950/50 p-8 rounded-[2rem] border border-amber-500/20">
                <h3 className="text-[11px] font-black text-amber-500 uppercase tracking-widest mb-4">创建新快照 (Create Snapshot)</h3>
                <div className="flex gap-4">
                  <input type="text" placeholder="为你的快照命名..." value={newArchiveName} onChange={e => setNewArchiveName(e.target.value)} className="flex-1 bg-slate-900 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-amber-500 transition-all text-white" />
                  <button onClick={createSnapshot} className="bg-amber-500 text-slate-950 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all">保存快照</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(Object.values(archives) as Archive[]).sort((a, b) => b.lastUpdated - a.lastUpdated).map(arc => (
                  <div key={arc.id} className={`p-8 rounded-[2.5rem] border-2 transition-all group relative overflow-hidden ${activeId === arc.id ? 'bg-amber-500/5 border-amber-500 shadow-2xl' : 'bg-slate-950/30 border-white/5 hover:border-slate-700'}`}>
                    {activeId === arc.id && <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 px-4 py-1 text-[8px] font-black uppercase tracking-widest rounded-bl-xl">ACTIVE</div>}
                    <div className="space-y-2 mb-8">
                      <h4 className={`text-xl font-black tracking-tight ${activeId === arc.id ? 'text-amber-500' : 'text-white'}`}>{arc.name}</h4>
                      <div className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <span>{arc.state.character.race} · {arc.state.character.class}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                        <span>Level {arc.state.character.level}</span>
                      </div>
                      <p className="text-[9px] text-slate-700 font-bold">最后更新: {new Date(arc.lastUpdated).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-3">
                      {activeId !== arc.id && <button onClick={() => loadArchive(arc.id)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">加载存档</button>}
                      <button onClick={() => deleteArchive(arc.id)} className="p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all" title="删除存档"><span className="material-icons text-sm">delete</span></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
