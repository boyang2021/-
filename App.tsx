
import React, { useReducer, useEffect, useState, useMemo } from 'react';
import { AppState, Action, Spell, CharacterSpellMetadata, EquipmentItem, InventoryItem, Condition, CooldownSkill } from './types';
import { SEED_DATA } from './constants';
import { getDerivedStats, exportToJson } from './utils';

// Components
import CharacterTab from './components/CharacterTab';
import EquipmentTab from './components/EquipmentTab';
import SpellsTab from './components/SpellsTab';
import CombatTab from './components/CombatTab';

const LOCAL_STORAGE_KEY = 'DND_COMPANION_STATE_V1_4';

const initialState: AppState & { history?: AppState } = (() => {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  return saved ? JSON.parse(saved) : SEED_DATA;
})();

function reducer(state: AppState & { history?: AppState }, action: Action): AppState & { history?: AppState } {
  const riskyActions = ['UPDATE_COMBAT', 'END_TURN', 'CAST_SKILL', 'EQUIP_ITEM', 'UNEQUIP_ITEM', 'RESET_SKILLS'];
  const newState = { ...state };
  if (riskyActions.includes(action.type)) {
    const { history, ...pureState } = state;
    newState.history = pureState;
  }

  switch (action.type) {
    case 'SET_STATE': return { ...action.payload };
    case 'UPDATE_CHARACTER': return { ...state, character: { ...state.character, ...action.payload } };
    case 'UPDATE_COMBAT': return { ...state, combat: { ...state.combat, ...action.payload } };
    case 'UPDATE_CONDITION':
      const existingIdx = state.combat.conditions.findIndex(c => c.name === action.name);
      let nextConditions = [...state.combat.conditions];
      if (action.updates === null) {
        nextConditions = nextConditions.filter(c => c.name !== action.name);
      } else if (existingIdx > -1) {
        nextConditions[existingIdx] = { ...nextConditions[existingIdx], ...action.updates };
      } else {
        nextConditions.push({ name: action.name, stacks: 1, rounds_left: 0, ...action.updates });
      }
      return { ...state, combat: { ...state.combat, conditions: nextConditions } };
    case 'UNDO': return state.history ? { ...state.history } : state;
    case 'RESET_SKILLS':
      return { ...state, combat: { ...state.combat, cooldown_skills: state.combat.cooldown_skills.map(s => ({ ...s, current_cd: 0 })) } };
    case 'END_TURN':
      return {
        ...state,
        combat: {
          ...state.combat,
          turn_count: state.combat.turn_count + 1,
          cooldown_skills: state.combat.cooldown_skills.map(s => ({ ...s, current_cd: Math.max(0, s.current_cd - 1) })),
          conditions: state.combat.conditions
            .map(c => ({ ...c, rounds_left: c.rounds_left > 0 ? c.rounds_left - 1 : 0 }))
            .filter(c => c.rounds_left > 0 || c.stacks > 0)
        }
      };
    case 'CAST_SKILL':
      return { ...state, combat: { ...state.combat, cooldown_skills: state.combat.cooldown_skills.map(s => s.id === action.id ? { ...s, current_cd: s.base_cd } : s) } };
    case 'EQUIP_ITEM':
      const oldItem = state.equipment.slots[action.slot];
      let updatedInv = [...state.inventory];
      if (oldItem) {
        updatedInv.push({ ...oldItem, quantity: 1 } as InventoryItem);
      }
      if (action.item) {
        updatedInv = updatedInv.filter(i => i.id !== action.item?.id);
      }
      return { ...state, equipment: { ...state.equipment, slots: { ...state.equipment.slots, [action.slot]: action.item } }, inventory: updatedInv };
    case 'UNEQUIP_ITEM':
      const itemToUnequip = state.equipment.slots[action.slot];
      if (!itemToUnequip) return state;
      return {
        ...state,
        equipment: { ...state.equipment, slots: { ...state.equipment.slots, [action.slot]: null } },
        inventory: [...state.inventory, { ...itemToUnequip, quantity: 1 } as InventoryItem]
      };
    case 'UPDATE_INVENTORY_ITEM':
      return { ...state, inventory: state.inventory.map(i => i.id === action.id ? { ...i, ...action.payload } : i) };
    case 'ADD_INVENTORY_ITEM':
      return { ...state, inventory: [...state.inventory, action.item] };
    case 'DELETE_INVENTORY_ITEM':
      return { ...state, inventory: state.inventory.filter(i => i.id !== action.id) };
    case 'ADD_SKILL':
      return { ...state, combat: { ...state.combat, cooldown_skills: [...state.combat.cooldown_skills, action.skill] } };
    case 'UPDATE_SKILL':
      return { ...state, combat: { ...state.combat, cooldown_skills: state.combat.cooldown_skills.map(s => s.id === action.id ? { ...s, ...action.payload } : s) } };
    case 'DELETE_SKILL':
      return { ...state, combat: { ...state.combat, cooldown_skills: state.combat.cooldown_skills.filter(s => s.id !== action.id) } };
    case 'UPDATE_CHARACTER_SPELL':
      const charSpellIdx = state.characterSpells.findIndex(cs => cs.spell_id === action.metadata.spell_id);
      let nextCharSpells = [...state.characterSpells];
      if (charSpellIdx > -1) nextCharSpells[charSpellIdx] = action.metadata;
      else nextCharSpells.push(action.metadata);
      return { ...state, characterSpells: nextCharSpells };
    case 'ADD_SPELLS':
      return { ...state, spells: [...state.spells, ...action.spells] };
    default:
      return state;
  }
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [activeTab, setActiveTab] = useState<'character' | 'equipment' | 'spells' | 'combat'>('character');

  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state)); }, [state]);
  const derived = useMemo(() => getDerivedStats(state), [state]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 font-sans selection:bg-amber-500/30 text-slate-100 overflow-x-hidden">
      {/* Cinematic Header */}
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
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Inspiration</span>
              <span className="text-lg font-black text-blue-400">{state.combat.inspiration}</span>
            </div>
          </div>
          <button onClick={() => exportToJson(state, `dnd-${state.character.name}`)} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-2xl transition border border-white/5">
            <span className="material-icons text-slate-400">save</span>
          </button>
          <button onClick={() => confirm("Reset all data?") && dispatch({ type: 'SET_STATE', payload: SEED_DATA })} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 p-3 rounded-2xl transition border border-rose-500/10">
            <span className="material-icons">refresh</span>
          </button>
        </div>
      </header>

      {/* Hero Navigation */}
      <nav className="bg-slate-900/40 border-b border-white/5 sticky top-[108px] z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex px-8">
          {(['character', 'equipment', 'spells', 'combat'] as const).map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`flex-1 py-8 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative group ${activeTab === tab ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <div className="flex items-center justify-center gap-3">
                <span className={`material-icons text-lg transition-transform group-hover:scale-125 ${activeTab === tab ? 'scale-110' : ''}`}>
                  {tab === 'character' && 'assignment_ind'}
                  {tab === 'equipment' && 'shield'}
                  {tab === 'spells' && 'auto_stories'}
                  {tab === 'combat' && 'gavel'}
                </span>
                <span className="hidden sm:inline">
                  {tab === 'character' && '英雄之魂'} 
                  {tab === 'equipment' && '戎装行囊'} 
                  {tab === 'spells' && '至高奥秘'} 
                  {tab === 'combat' && '战场博弈'}
                </span>
              </div>
              {activeTab === tab && (
                <div className="absolute bottom-0 left-8 right-8 h-1 bg-amber-500 rounded-full shadow-[0_-4px_20px_rgba(245,158,11,0.6)]"></div>
              )}
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

      {/* Undo Ritual */}
      {state.history && (
        <button 
          onClick={() => dispatch({ type: 'UNDO' })} 
          className="fixed bottom-12 left-12 bg-slate-800 text-amber-500 w-16 h-16 rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[70] border border-white/10 group"
          title="时间溯行 (Undo)"
        >
          <span className="material-icons text-3xl group-hover:rotate-[-90deg] transition-transform duration-500">history</span>
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-amber-500 rounded-full animate-ping"></div>
        </button>
      )}
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&display=swap');
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          70% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in { animation: bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        h1, h2, h3 { font-family: 'Inter', sans-serif; }
      `}</style>
    </div>
  );
};
export default App;
