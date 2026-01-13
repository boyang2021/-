
export type StatKey = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export interface Modifier {
  kind: 'stat' | 'hp' | 'save_dc' | 'custom';
  target: string;
  value: number;
}

export interface EquipmentItem {
  id: string;
  name: string;
  type: string;
  description: string;
  statBonus: Record<StatKey, number>;
  otherModifiers: Modifier[];
  tags: string[];
}

export interface InventoryItem extends EquipmentItem {
  quantity: number;
}

export interface Spell {
  id: string;
  name: string;
  level: number;
  school?: string;
  casting_time: string;
  range: string;
  duration: string;
  components: ('V' | 'S' | 'M')[];
  material?: string;
  concentration: boolean;
  ritual: boolean;
  classes: string[];
  tags: string[];
  source?: string;
  description: string;
  higher_level?: string;
}

export interface CharacterSpellMetadata {
  spell_id: string;
  known: boolean;
  prepared: boolean;
  favorite: boolean;
  notes: string;
}

export interface Condition {
  name: string;
  stacks: number;
  rounds_left: number;
}

export interface CombatFeature {
  id: string;
  name: string;
  description: string;
}

export interface CooldownSkill {
  id: string;
  name: string;
  base_cd: number;
  current_cd: number;
  description: string;
  damage?: string;
  source: 'system' | 'custom';
  isArchived?: boolean;
}

export interface AppState {
  version: string;
  // Added history to support undo functionality within the serializable state
  history?: AppState;
  character: {
    id: string;
    name: string;
    race: string;
    class: string;
    level: number;
    exp: number;
    inspiration: number;
    save_dc: number;
    stats: Record<StatKey, number>;
    skill_proficiencies: Record<string, boolean>;
    saving_throw_proficiencies: Record<StatKey, boolean>;
    background: string;
  };
  equipment: {
    slots: {
      head: EquipmentItem | null;
      chest: EquipmentItem | null;
      hands: EquipmentItem | null;
      feet: EquipmentItem | null;
      weapon: EquipmentItem | null;
      offhand: EquipmentItem | null;
      accessory: EquipmentItem | null;
    };
  };
  inventory: InventoryItem[];
  spells: Spell[];
  characterSpells: CharacterSpellMetadata[];
  combat: {
    hp_max: number;
    hp_current: number;
    hp_temp: number;
    stamina_current: number;
    save_dc: number;
    inspiration: number;
    others: Record<string, any>;
    conditions: Condition[];
    features: CombatFeature[];
    cooldown_skills: CooldownSkill[];
    turn_count: number;
  };
}

export interface Archive {
  id: string;
  name: string;
  lastUpdated: number;
  state: AppState;
}

export type Action = 
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'UPDATE_CHARACTER'; payload: Partial<AppState['character']> }
  | { type: 'UPDATE_COMBAT'; payload: Partial<AppState['combat']> }
  | { type: 'UPDATE_CONDITION'; name: string, updates: Partial<Condition> | null }
  | { type: 'UNDO' }
  | { type: 'CAST_SKILL'; id: string }
  | { type: 'RESET_SKILLS' }
  | { type: 'END_TURN' }
  | { type: 'EQUIP_ITEM'; slot: keyof AppState['equipment']['slots'], item: EquipmentItem | null }
  | { type: 'UNEQUIP_ITEM'; slot: keyof AppState['equipment']['slots'] }
  | { type: 'UPDATE_INVENTORY_ITEM'; id: string, payload: Partial<InventoryItem> }
  | { type: 'ADD_INVENTORY_ITEM'; item: InventoryItem }
  | { type: 'DELETE_INVENTORY_ITEM'; id: string }
  | { type: 'ADD_SKILL'; skill: CooldownSkill }
  | { type: 'UPDATE_SKILL'; id: string, payload: Partial<CooldownSkill> }
  | { type: 'DELETE_SKILL'; id: string }
  | { type: 'ARCHIVE_SKILL'; id: string; archived: boolean }
  | { type: 'UPDATE_CHARACTER_SPELL'; metadata: CharacterSpellMetadata }
  | { type: 'ADD_SPELLS'; spells: Spell[] }
  | { type: 'ADD_PASSIVE'; passive: CombatFeature }
  | { type: 'UPDATE_PASSIVE'; id: string, payload: Partial<CombatFeature> }
  | { type: 'DELETE_PASSIVE'; id: string }
  | { type: 'DUPLICATE_PASSIVE'; id: string }
  | { type: 'RESET_SKILLS_INTERNAL' };
