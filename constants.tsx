
import { AppState, StatKey } from './types';

export const SKILLS_BY_STAT: Record<StatKey, string[]> = {
  STR: ['攀爬', '威吓', '擒抱', '冲撞'],
  DEX: ['巧手', '隐匿', '运动', '偷窃'],
  CON: [],
  INT: ['记忆', '奥秘', '调查', '历史'],
  WIS: ['宗教', '洞悉', '察觉', '求生'],
  CHA: ['威吓', '游说', '欺瞒', '表演'],
};

export const STATUS_LIST = [
  { name: '眩晕', stackable: false },
  { name: '鹰眼', stackable: false },
  { name: '不屈', stackable: false },
  { name: '倒地', stackable: false },
  { name: '气喘', stackable: false },
  { name: '鼓舞士气', stackable: false },
  { name: '恐惧', stackable: false },
  { name: '演出时间', stackable: false },
  { name: '剑气苍破', stackable: false },
  { name: '中毒', stackable: false },
  { name: '风刃乱舞', stackable: false },
  { name: '触电', stackable: true },
  { name: '束缚', stackable: false },
  { name: '格挡', stackable: false },
  { name: '狂暴', stackable: true },
  { name: '混乱', stackable: false },
  { name: '挑衅', stackable: false },
  { name: '燃烧', stackable: true },
  { name: '流血', stackable: false },
  { name: '信仰之誓', stackable: false },
  { name: '冰冻', stackable: true },
  { name: '隐身', stackable: false },
  { name: '战吼', stackable: false },
  { name: '静心', stackable: false },
  { name: '钢铁意志', stackable: false },
];

export const EMPTY_BONUS = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };

export const SEED_DATA: AppState = {
  "version": "1.2.0",
  "character": {
    "id": "char_001",
    "name": "炼",
    "race": "木精灵",
    "class": "炼金",
    "level": 15,
    "exp": 0,
    "inspiration": 3,
    "save_dc": 15,
    "stats": { "STR": 70, "DEX": 85, "CON": 75, "INT": 95, "WIS": 70, "CHA": 80 },
    "skill_proficiencies": { "INT_奥秘": true, "INT_调查": true, "WIS_察觉": true, "CHA_游说": true },
    "background": "在游历各地的旅途中，炼逐渐形成了独特的炼金体系。"
  },
  "equipment": {
    "slots": { "head": null, "chest": null, "hands": null, "feet": null, "weapon": null, "offhand": null, "accessory": null }
  },
  "inventory": [
    {
      "id": "item_001",
      "name": "贤者之冠",
      "type": "head",
      "description": "增加思维敏锐度的头饰。",
      "quantity": 1,
      "statBonus": { ...EMPTY_BONUS, INT: 10 },
      "otherModifiers": [],
      "tags": ["arcane"]
    }
  ],
  "spells": [],
  "characterSpells": [],
  "combat": {
    "hp_max": 100,
    "hp_current": 100,
    "hp_temp": 15,
    "stamina_current": 50,
    "save_dc": 15,
    "inspiration": 3,
    "others": { "AC": 18, "Speed": "30ft" },
    "conditions": [{ "name": "触电", "stacks": 2, "rounds_left": 3 }],
    "features": [
      { "id": "feat_1", "name": "炼金狂热", "description": "使用药剂时效果翻倍。", "pinned": true }
    ],
    "cooldown_skills": [
      { 
        "id": "skill_1", 
        "name": "毒云喷射", 
        "base_cd": 3, 
        "current_cd": 0, 
        "description": "制造一片持续3回合的毒云。", 
        "source": "system",
        "isArchived": false 
      }
    ],
    "turn_count": 1
  }
};
