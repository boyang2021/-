
import React, { useReducer, useEffect, useState, useMemo } from 'react';
import { AppState, Action, Spell, CharacterSpellMetadata, EquipmentItem, InventoryItem, Condition, CooldownSkill } from './types';
import { SEED_DATA } from './constants';
import { getDerivedStats, exportToJson } from './utils';

// Components
import CharacterTab from './components/CharacterTab';
import EquipmentTab from './components/EquipmentTab';
import SpellsTab from './components/SpellsTab';
import CombatTab from './components/CombatTab';

const LOCAL_STORAGE_KEY = 'DND_COMPANION_STATE_V1_3';

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
      // Basic swap: move old item to inventory if exists
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
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <header className="bg-slate-900 text-white p-4 shadow-xl flex justify-between items-center sticky top-0 z-50 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <span className="material-icons text-amber-500">auto_fix_high</span>
          <h1 className="text-xl font-black tracking-tighter uppercase">Player Companion</h1>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => exportToJson(state, `dnd-${state.character.name}`)} className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700 transition">SAVE</button>
          <button onClick={() => confirm("Reset all data?") && dispatch({ type: 'SET_STATE', payload: SEED_DATA })} className="bg-red-900/40 hover:bg-red-900/60 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/30 transition">RESET</button>
        </div>
      </header>
      <nav className="bg-white border-b sticky top-[64px] z-40">
        <div className="max-w-6xl mx-auto flex">
          {(['character', 'equipment', 'spells', 'combat'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === tab ? 'border-amber-500 text-amber-600 bg-amber-50/20' : 'border-transparent text-slate-400 hover:text-slate-800'}`}>
              {tab === 'character' && '属性技能'} {tab === 'equipment' && '装备背包'} {tab === 'spells' && '法术书本'} {tab === 'combat' && '战斗面板'}
            </button>
          ))}
        </div>
      </nav>
      <main className="flex-1 max-w-6xl mx-auto w-full p-6 pb-24">
        {activeTab === 'character' && <CharacterTab state={state} dispatch={dispatch} derived={derived} />}
        {activeTab === 'equipment' && <EquipmentTab state={state} dispatch={dispatch} derived={derived} />}
        {activeTab === 'spells' && <SpellsTab state={state} dispatch={dispatch} />}
        {activeTab === 'combat' && <CombatTab state={state} dispatch={dispatch} derived={derived} />}
      </main>
      {state.history && (
        <button onClick={() => dispatch({ type: 'UNDO' })} className="fixed bottom-6 left-6 bg-slate-900 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition z-50 border-2 border-slate-700">
          <span className="material-icons">history</span>
        </button>
      )}
    </div>
  );
};
export default App;
