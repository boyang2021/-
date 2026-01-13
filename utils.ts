
import { AppState, StatKey, Modifier, EquipmentItem } from './types';

export const getAbilityMod = (val: number) => Math.trunc(((val / 5) - 10) / 2);
export const getProficiencyBonus = (level: number) => Math.trunc(level / 5);

export const getDerivedStats = (state: AppState) => {
  const baseStats = { ...state.character.stats };
  const equipmentBonus: Record<StatKey, number> = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
  
  let hpMaxBonus = 0;
  let saveDcBonus = 0;

  Object.values(state.equipment.slots).forEach((item: EquipmentItem | null) => {
    if (item) {
      (Object.keys(item.statBonus) as StatKey[]).forEach(s => {
        equipmentBonus[s] += item.statBonus[s];
      });
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
    ac: state.combat.others.AC || 10,
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

export const rollDiceExpression = (expression: string) => {
  const cleanExpr = expression.toLowerCase().replace(/\s/g, '');
  const regex = /^(\d+)d(\d+)([+-]\d+)?$/;
  const match = cleanExpr.match(regex);
  if (!match) return null;
  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  const diceTotal = rolls.reduce((acc, r) => acc + r, 0);
  const total = diceTotal + modifier;
  return { expression, rolls, modifier, total };
};
