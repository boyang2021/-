
import { AppState, StatKey, Modifier, EquipmentItem } from './types';

// Formula: adjust = trunc(((N / 5) - 10) / 2)
export const getAbilityMod = (val: number) => Math.trunc(((val / 5) - 10) / 2);

export const getProficiencyBonus = (level: number) => 2 + Math.floor((level - 1) / 4);

export const getDerivedStats = (state: AppState) => {
  const totalStats = { ...state.character.stats };
  let hpMaxBonus = 0;
  let saveDcBonus = 0;

  // Aggregate bonuses from all slots
  Object.values(state.equipment.slots).forEach((item: EquipmentItem | null) => {
    if (item) {
      // Direct Stat Bonuses
      (Object.keys(item.statBonus) as StatKey[]).forEach(s => {
        totalStats[s] += item.statBonus[s];
      });
      // Other Modifiers
      item.otherModifiers.forEach(m => {
        if (m.kind === 'hp') hpMaxBonus += m.value;
        if (m.kind === 'save_dc') saveDcBonus += m.value;
      });
    }
  });

  const pb = getProficiencyBonus(state.character.level);

  return {
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
