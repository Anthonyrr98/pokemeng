import { GenMon } from '../types';

/** 每 N 级可进化一次 */
export const EVOLUTION_LEVEL_INTERVAL = 10;

/** 当前精灵是否满足进化条件：有进化形态 且 等级达到下一档（10、20、30…） */
export function canEvolve(monster: GenMon): boolean {
  if (!monster.evolution) return false;
  const count = monster.evolutionCount ?? 0;
  const requiredLevel = (count + 1) * EVOLUTION_LEVEL_INTERVAL;
  return monster.level >= requiredLevel;
}

/** 达到下一档进化所需等级 */
export function getNextEvolutionLevel(monster: GenMon): number {
  const count = monster.evolutionCount ?? 0;
  return (count + 1) * EVOLUTION_LEVEL_INTERVAL;
}
