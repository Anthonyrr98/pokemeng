import { GenMon } from '../types';

/** 升到下一级所需经验（当前等级 → 下一级） */
export function getExpToNextLevel(level: number): number {
  return level * 80;
}

/** 战斗胜利获得的基础经验（敌方等级 * 系数） */
export function getExpFromBattle(enemyLevel: number, caught: boolean): number {
  const base = enemyLevel * 12;
  return Math.floor(caught ? base * 1.5 : base);
}

/** 参战精灵单条贡献（对野怪输出 + 在场回合 + 承伤） */
export interface BattleContribution {
  teamIndex: number;
  damageDealt: number;
  turnsActive: number;
  damageTaken: number;
}

/** 按贡献把总经验分配给参战精灵：对野怪伤害 + 在场回合 + 对队伍承伤，公式化分给所有参战 */
export function distributeExpByContribution(
  totalExp: number,
  contributions: BattleContribution[]
): { teamIndex: number; exp: number }[] {
  if (!contributions.length) return [];
  const WEIGHT_TURNS = 5;
  const WEIGHT_DAMAGE_TAKEN = 0.5;
  const weights = contributions.map((c) => {
    const w =
      c.damageDealt + c.turnsActive * WEIGHT_TURNS + c.damageTaken * WEIGHT_DAMAGE_TAKEN;
    return Math.max(0, w);
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    const per = Math.floor(totalExp / contributions.length);
    return contributions.map((c) => ({ teamIndex: c.teamIndex, exp: per }));
  }
  let remaining = totalExp;
  const result: { teamIndex: number; exp: number }[] = [];
  for (let i = 0; i < contributions.length; i++) {
    if (i === contributions.length - 1) {
      result.push({ teamIndex: contributions[i].teamIndex, exp: remaining });
    } else {
      const exp = Math.floor((totalExp * weights[i]) / sum);
      result.push({ teamIndex: contributions[i].teamIndex, exp });
      remaining -= exp;
    }
  }
  return result;
}

/** 给精灵加经验并处理升级，返回更新后的精灵与升级次数 */
export function addExpAndLevelUp(monster: GenMon, expGain: number): { monster: GenMon; levelUps: number } {
  const currentExp = typeof monster.exp === 'number' ? monster.exp : 0;
  let mon = { ...monster, exp: currentExp + expGain };
  let levelUps = 0;
  const maxLevel = 100;

  while (mon.level < maxLevel) {
    const need = getExpToNextLevel(mon.level);
    if (mon.exp < need) break;

    mon = {
      ...mon,
      level: mon.level + 1,
      exp: mon.exp - need,
      stats: growStats(mon.stats),
    };
    levelUps++;
  }

  if (mon.exp < 0) mon = { ...mon, exp: 0 };

  return { monster: mon, levelUps };
}

function growStats(stats: GenMon['stats']): GenMon['stats'] {
  const grow = (n: number, rate: number) => Math.max(1, Math.floor(n * (1 + rate)));
  return {
    maxHp: Math.min(999, grow(stats.maxHp, 0.04)),
    currentHp: stats.currentHp,
    attack: Math.min(999, grow(stats.attack, 0.03)),
    defense: Math.min(999, grow(stats.defense, 0.03)),
    spAttack: Math.min(999, grow(stats.spAttack ?? stats.attack, 0.03)),
    spDefense: Math.min(999, grow(stats.spDefense ?? stats.defense, 0.03)),
    speed: Math.min(999, grow(stats.speed, 0.03)),
  };
}

const WILD_LEVEL_OFFSET = 2;

/** 野怪等级区间 [min, max]（相对首发等级 ±OFFSET，裁剪到 1～100） */
export function getWildLevelRange(leadLevel: number): [number, number] {
  const min = Math.max(1, leadLevel - WILD_LEVEL_OFFSET);
  const max = Math.min(100, leadLevel + WILD_LEVEL_OFFSET);
  return [min, max];
}

/** 在野怪等级区间内随机一个等级（闭区间，均匀） */
export function pickRandomWildLevel(leadLevel: number): number {
  const [min, max] = getWildLevelRange(leadLevel);
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** 将精灵属性从 fromLevel 缩放到 toLevel；toLevel <= fromLevel 时只改 level 不改 stats */
export function scaleMonsterToLevel(monster: GenMon, fromLevel: number, toLevel: number): GenMon {
  if (toLevel <= fromLevel) {
    return { ...monster, level: toLevel };
  }
  let stats = { ...monster.stats };
  for (let i = fromLevel; i < toLevel; i++) {
    stats = growStats(stats);
  }
  return {
    ...monster,
    level: toLevel,
    stats: {
      ...stats,
      currentHp: stats.maxHp,
    },
  };
}
