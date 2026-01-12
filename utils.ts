
import { AppState, StatKey, Modifier, EquipmentItem } from './types';

// Formula: adjust = trunc(((N / 5) - 10) / 2)
export const getAbilityMod = (val: number) => Math.trunc(((val / 5) - 10) / 2);

// New requested algorithm: proficiencyBonus = trunc(Level / 5)
export const getProficiencyBonus = (level: number) => Math.trunc(level / 5);

export const getDerivedStats = (state: AppState) => {
  const baseStats = { ...state.character.stats };
  const equipmentBonus: Record<StatKey, number> = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
  
  let hpMaxBonus = 0;
  let saveDcBonus = 0;

  // Aggregate bonuses from all slots
  Object.values(state.equipment.slots).forEach((item: EquipmentItem | null) => {
    if (item) {
      // Direct Stat Bonuses
      (Object.keys(item.statBonus) as StatKey[]).forEach(s => {
        equipmentBonus[s] += item.statBonus[s];
      });
      // Other Modifiers
      item.otherModifiers.forEach(m => {
        if (m.kind === 'hp') hpMaxBonus += m.value;
        if (m.kind === 'save_dc') saveDcBonus += m.value;
      });
    }
  });

  const totalStats: Record<StatKey, number> = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
  (Object.keys(baseStats) as StatKey[]).forEach(s => {
    totalStats[s] = baseStats[s] + (equipmentBonus[s] || 0);
  });

  const pb = getProficiencyBonus(state.character.level);

  return {
    baseStats,
    equipmentBonus,
    totalStats,
    hpMax: state.combat.hp_max + hpMaxBonus,
    saveDc: state.character.save_dc + saveDcBonus,
    pb
  };
};

export const exportToJson = (data: any, fileName: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.json`;
  link.click();
  URL.revokeObjectURL(url);
};
