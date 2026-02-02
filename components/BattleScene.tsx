import React, { useState, useEffect, useRef } from 'react';
import { GenMon, Move, ElementType, Inventory } from '../types';
import type { BattleContribution } from '../services/exp';
import { Swords, Briefcase, LogOut, Search, Zap, Play, Gauge, List, ChevronLeft, ChevronRight, Eye, Users } from 'lucide-react';

interface BattleSceneProps {
  playerMon: GenMon;
  enemyMon: GenMon;
  /** 背包内精灵（出战名单），按顺序 */
  rosterMonsters: GenMon[];
  /** 背包内精灵对应的队伍下标，rosterMonsters[i] = playerTeam[rosterTeamIndices[i]] */
  rosterTeamIndices: number[];
  /** 当前出战精灵在队伍中的下标 */
  currentLeadTeamIndex: number;
  onSwitchMonster: (teamIndex: number) => void;
  inventory: Inventory;
  onWin: (caught: boolean, contributions?: BattleContribution[]) => void;
  onLose: () => void;
  onRun: () => void;
  onUpdatePlayerMon: (mon: GenMon) => void;
  onConsumeItem: (item: 'potion' | 'ball') => void;
}

const TYPE_CHART: Record<string, Record<string, number>> = {
  [ElementType.Fire]: { [ElementType.Grass]: 2, [ElementType.Water]: 0.5, [ElementType.Rock]: 0.5, [ElementType.Bug]: 2 },
  [ElementType.Water]: { [ElementType.Fire]: 2, [ElementType.Electric]: 0.5, [ElementType.Grass]: 0.5, [ElementType.Rock]: 2 },
  [ElementType.Grass]: { [ElementType.Water]: 2, [ElementType.Fire]: 0.5, [ElementType.Electric]: 0.5, [ElementType.Rock]: 2 },
  [ElementType.Electric]: { [ElementType.Water]: 2, [ElementType.Grass]: 0.5, [ElementType.Rock]: 0.5 },
  [ElementType.Rock]: { [ElementType.Fire]: 2, [ElementType.Electric]: 2, [ElementType.Grass]: 0.5, [ElementType.Fighting]: 0.5 },
  [ElementType.Psychic]: { [ElementType.Fighting]: 2, [ElementType.Dark]: 0 },
  [ElementType.Dark]: { [ElementType.Psychic]: 2, [ElementType.Fighting]: 0.5 },
  [ElementType.Fighting]: { [ElementType.Normal]: 2, [ElementType.Rock]: 2, [ElementType.Dark]: 2, [ElementType.Psychic]: 0.5 },
  [ElementType.Normal]: { [ElementType.Rock]: 0.5 },
  [ElementType.Bug]: { [ElementType.Grass]: 2, [ElementType.Psychic]: 2, [ElementType.Fighting]: 0.5, [ElementType.Fire]: 0.5 }
};

// Define Special vs Physical types
const SPECIAL_TYPES = new Set([
    ElementType.Fire, ElementType.Water, ElementType.Grass, 
    ElementType.Electric, ElementType.Psychic, ElementType.Dark
]);

const ElementColors: Record<ElementType, string> = {
  [ElementType.Fire]: 'bg-red-500',
  [ElementType.Water]: 'bg-blue-500',
  [ElementType.Grass]: 'bg-green-500',
  [ElementType.Electric]: 'bg-yellow-400',
  [ElementType.Rock]: 'bg-stone-500',
  [ElementType.Psychic]: 'bg-purple-500',
  [ElementType.Normal]: 'bg-gray-400',
  [ElementType.Dark]: 'bg-slate-800 text-white',
  [ElementType.Fighting]: 'bg-orange-700',
  [ElementType.Bug]: 'bg-lime-600',
};

const getTypeEffectiveness = (moveType: ElementType, defenderType: ElementType): number => {
  if (TYPE_CHART[moveType] && TYPE_CHART[moveType][defenderType] !== undefined) {
    return TYPE_CHART[moveType][defenderType];
  }
  return 1;
};

const BattleScene: React.FC<BattleSceneProps> = ({
  playerMon,
  enemyMon,
  rosterMonsters,
  rosterTeamIndices,
  currentLeadTeamIndex,
  onSwitchMonster,
  inventory,
  onWin,
  onLose,
  onRun,
  onUpdatePlayerMon,
  onConsumeItem,
}) => {
  const [playerState, setPlayerState] = useState<GenMon>(playerMon);
  const [enemyState, setEnemyState] = useState<GenMon>(enemyMon);
  const [logs, setLogs] = useState<string[]>([]);
  const [menuState, setMenuState] = useState<'main' | 'moves' | 'bag' | 'roster'>('main');
  const [isPlayerTurn, setIsPlayerTurn] = useState<boolean>(true);
  const [turnProcessing, setTurnProcessing] = useState<boolean>(false);
  const [turnCount, setTurnCount] = useState(1);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const currentLeadRef = useRef(currentLeadTeamIndex);
  const contributionRef = useRef<Record<number, { damageDealt: number; turnsActive: number; damageTaken: number }>>({});

  useEffect(() => {
    currentLeadRef.current = currentLeadTeamIndex;
  }, [currentLeadTeamIndex]);

  useEffect(() => {
    rosterTeamIndices.forEach((idx) => {
      contributionRef.current[idx] = { damageDealt: 0, turnsActive: 0, damageTaken: 0 };
    });
  }, [rosterTeamIndices.join(',')]);

  useEffect(() => {
    setPlayerState(playerMon);
  }, [playerMon.id, playerMon.stats.currentHp]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    setLogs([`野生的 ${enemyMon.name} 出现了!`, `就决定是你了! ${playerMon.name}!`]);
    if (playerMon.stats.speed < enemyMon.stats.speed) {
        setIsPlayerTurn(false);
        setTimeout(() => enemyTurn(playerState, enemyState), 1000);
    }
  }, []);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const calculateDamage = (attacker: GenMon, defender: GenMon, move: Move) => {
    const effectiveness = getTypeEffectiveness(move.type, defender.element);
    const randomVar = (Math.random() * 0.4) + 0.8;
    
    // Determine Physical vs Special
    const isSpecial = SPECIAL_TYPES.has(move.type);
    const attackStat = isSpecial ? attacker.stats.spAttack : attacker.stats.attack;
    const defenseStat = isSpecial ? defender.stats.spDefense : defender.stats.defense;

    // Fallback if spAttack/spDefense are undefined (migration safety)
    const finalAtk = attackStat || attacker.stats.attack;
    const finalDef = defenseStat || defender.stats.defense;

    let damage = (((2 * attacker.level / 5 + 2) * move.power * (finalAtk / finalDef)) / 50 + 2) * effectiveness * randomVar;
    damage = Math.floor(damage);
    return { damage, effectiveness, isSpecial };
  };

  const handlePlayerAttack = (move: Move) => {
    if (turnProcessing) return;
    setTurnProcessing(true);
    setMenuState('main');

    const { damage, effectiveness, isSpecial } = calculateDamage(playerState, enemyState, move);
    let effectMsg = "";
    if (effectiveness > 1) effectMsg = "效果拔群!";
    if (effectiveness < 1) effectMsg = "效果一般...";
    // const categoryMsg = isSpecial ? "(特攻)" : "(物攻)";

    addLog(`${playerState.name} 使用了 ${move.name}! ${effectMsg}`);

    const leadIdx = currentLeadRef.current;
    if (!contributionRef.current[leadIdx]) contributionRef.current[leadIdx] = { damageDealt: 0, turnsActive: 0, damageTaken: 0 };
    contributionRef.current[leadIdx].damageDealt += damage;
    contributionRef.current[leadIdx].turnsActive += 1;

    const newEnemyHp = Math.max(0, enemyState.stats.currentHp - damage);
    const newEnemyState = { ...enemyState, stats: { ...enemyState.stats, currentHp: newEnemyHp } };
    setEnemyState(newEnemyState);

    const getContributions = (): BattleContribution[] =>
      rosterTeamIndices
        .map((idx) => ({
          teamIndex: idx,
          ...(contributionRef.current[idx] ?? { damageDealt: 0, turnsActive: 0, damageTaken: 0 }),
        }))
        .filter((c) => (c.damageDealt + c.turnsActive + c.damageTaken) > 0);

    if (newEnemyHp <= 0) {
        setTimeout(() => {
            addLog(`野生的 ${enemyState.name} 倒下了!`);
            onWin(false, getContributions());
        }, 1000);
        return;
    }

    setTurnCount(c => c + 1);
    setTimeout(() => enemyTurn(playerState, newEnemyState), 1500);
  };

  const handleUsePotion = () => {
    if (turnProcessing) return;
    if (inventory.potions <= 0) {
      addLog("你没有伤药了!");
      return;
    }
    setTurnProcessing(true);
    setMenuState('main');
    
    onConsumeItem('potion');
    const healAmount = 50;
    const newHp = Math.min(playerState.stats.maxHp, playerState.stats.currentHp + healAmount);
    addLog(`你使用了伤药. ${playerState.name} 恢复了 ${newHp - playerState.stats.currentHp} 点HP!`);
    
    const newPlayerState = { ...playerState, stats: { ...playerState.stats, currentHp: newHp } };
    setPlayerState(newPlayerState);
    onUpdatePlayerMon(newPlayerState);

    setTimeout(() => enemyTurn(newPlayerState, enemyState), 1500);
  };

  const handleThrowBall = () => {
    if (turnProcessing) return;
    if (inventory.balls <= 0) {
      addLog("你没有精灵球了!");
      return;
    }
    setTurnProcessing(true);
    setMenuState('main');
    
    onConsumeItem('ball');
    addLog("你扔出了精灵球!");

    const hpPercent = enemyState.stats.currentHp / enemyState.stats.maxHp;
    const catchChance = 1 - (hpPercent * 0.8); 
    const roll = Math.random();

    const getContributionsForCatch = (): BattleContribution[] =>
      rosterTeamIndices
        .map((idx) => ({
          teamIndex: idx,
          ...(contributionRef.current[idx] ?? { damageDealt: 0, turnsActive: 0, damageTaken: 0 }),
        }))
        .filter((c) => (c.damageDealt + c.turnsActive + c.damageTaken) > 0);

    setTimeout(() => {
        if (roll < catchChance) {
            addLog(`太好了! ${enemyState.name} 被抓住了!`);
            setTimeout(() => onWin(true, getContributionsForCatch()), 1500);
        } else {
            addLog(`哎呀! 它挣脱了!`);
             setTimeout(() => enemyTurn(playerState, enemyState), 1500);
        }
    }, 1000);
  };

  const enemyTurn = (currentPlayer: GenMon, currentEnemy: GenMon) => {
    const randomMove = currentEnemy.moves[Math.floor(Math.random() * currentEnemy.moves.length)];
    const { damage, effectiveness } = calculateDamage(currentEnemy, currentPlayer, randomMove);
    const leadIdx = currentLeadRef.current;
    if (!contributionRef.current[leadIdx]) contributionRef.current[leadIdx] = { damageDealt: 0, turnsActive: 0, damageTaken: 0 };
    contributionRef.current[leadIdx].damageTaken += damage;
    contributionRef.current[leadIdx].turnsActive += 1;

    let effectMsg = "";
    if (effectiveness > 1) effectMsg = "效果拔群!";
    if (effectiveness < 1) effectMsg = "效果一般...";

    addLog(`野生的 ${currentEnemy.name} 使用了 ${randomMove.name}! ${effectMsg}`);

    const newPlayerHp = Math.max(0, currentPlayer.stats.currentHp - damage);
    const newPlayerState = {
        ...currentPlayer,
        stats: { ...currentPlayer.stats, currentHp: newPlayerHp }
    };
    setPlayerState(newPlayerState);
    onUpdatePlayerMon(newPlayerState);

    if (newPlayerHp <= 0) {
        setTimeout(() => {
            addLog(`${currentPlayer.name} 倒下了!`);
            onLose();
        }, 1000);
    } else {
        setTurnCount(c => c + 1);
        setTurnProcessing(false);
        setIsPlayerTurn(true);
    }
  };

  const playerVsEnemy = getTypeEffectiveness(playerState.element, enemyState.element);
  const playerHpPct = (playerState.stats.currentHp / playerState.stats.maxHp) * 100;
  const enemyHpPct = (enemyState.stats.currentHp / enemyState.stats.maxHp) * 100;

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-white relative overflow-hidden">
      {/* 顶部状态栏 */}
      <header className="flex-shrink-0 h-[14%] min-h-[72px] flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
        {/* 我方精灵 */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-cyan-400/50 flex-shrink-0 bg-slate-800">
            {playerState.imageUrl ? (
              <img src={playerState.imageUrl} alt={playerState.name} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-cyan-400 text-xs">?</div>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-white font-bold pixel-font text-sm truncate">Lv.{playerState.level} {playerState.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="h-2 w-24 sm:w-28 bg-red-900/80 rounded-full overflow-hidden border border-red-500/50">
                <div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: `${playerHpPct}%` }} />
              </div>
              <span className="text-[10px] text-cyan-200 tabular-nums">{playerState.stats.currentHp}/{playerState.stats.maxHp}</span>
            </div>
          </div>
        </div>

        {/* 中央：属性克制 + 回合 */}
        <div className="flex flex-col items-center gap-0.5 px-4 flex-shrink-0">
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-amber-400 flex items-center gap-0.5"><ChevronLeft size={12} /> 微弱 {playerVsEnemy < 1 ? playerVsEnemy.toFixed(3) : '1.000'}</span>
            <span className="text-slate-500">» «</span>
            <span className="text-emerald-400 flex items-center gap-0.5">克制 {playerVsEnemy > 1 ? playerVsEnemy.toFixed(3) : '1.000'} <ChevronRight size={12} /></span>
          </div>
          <div className="flex items-center gap-2 text-cyan-300/90 text-xs">
            <span className="flex items-center gap-0.5"><Eye size={10} /> {turnCount}</span>
            <span className="pixel-font">第{turnCount}回合</span>
            <span className="flex items-center gap-0.5"><Eye size={10} /> 1</span>
          </div>
        </div>

        {/* 敌方精灵 */}
        <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
          <div className="min-w-0 text-right">
            <div className="text-white font-bold pixel-font text-sm truncate">Lv.{enemyState.level} {enemyState.name}</div>
            <div className="flex items-center gap-2 mt-0.5 justify-end">
              <span className="text-[10px] text-cyan-200 tabular-nums">{enemyState.stats.currentHp}/{enemyState.stats.maxHp}</span>
              <div className="h-2 w-24 sm:w-28 bg-red-900/80 rounded-full overflow-hidden border border-red-500/50">
                <div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: `${enemyHpPct}%` }} />
              </div>
            </div>
          </div>
          <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-rose-400/50 flex-shrink-0 bg-slate-800">
            {enemyState.imageUrl ? (
              <img src={enemyState.imageUrl} alt={enemyState.name} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-rose-400 text-xs">?</div>
            )}
          </div>
        </div>
      </header>

      {/* 中央对战区 + 右侧栏 */}
      <div className="flex-1 min-h-0 flex flex-row">
        {/* 对战舞台 */}
        <div className="flex-1 min-h-0 relative flex items-center justify-center bg-gradient-to-b from-indigo-950/80 via-slate-900 to-slate-950 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-purple-500/5" aria-hidden />
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-cyan-900/20 to-transparent border-t border-cyan-500/20 rounded-t-full" style={{ clipPath: 'ellipse(80% 100% at 50% 100%)' }} aria-hidden />
          <div className="absolute inset-0 flex items-center justify-between px-[10%] py-4 z-10">
            <div className="w-[35%] max-w-[200px] aspect-square flex items-end justify-center">
              {playerState.imageUrl ? (
                <img src={playerState.imageUrl} alt={playerState.name} className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(6,182,212,0.3)]" style={{ imageRendering: 'pixelated' }} />
              ) : (
                <div className="w-full h-full rounded-full bg-cyan-500/20 border-2 border-cyan-400/50 flex items-center justify-center text-cyan-400">?</div>
              )}
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 pixel-font text-sm font-bold shadow-[0_0_24px_rgba(6,182,212,0.4)]">
                {turnProcessing ? '对方回合' : isPlayerTurn ? '你的回合' : '对方回合'}
              </div>
            </div>
            <div className="w-[35%] max-w-[200px] aspect-square flex items-end justify-center">
              {enemyState.imageUrl ? (
                <img src={enemyState.imageUrl} alt={enemyState.name} className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(244,63,94,0.3)]" style={{ imageRendering: 'pixelated' }} />
              ) : (
                <div className="w-full h-full rounded-full bg-rose-500/20 border-2 border-rose-400/50 flex items-center justify-center text-rose-400">?</div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧竖排按钮 */}
        <div className="flex-shrink-0 w-12 flex flex-col items-center justify-center gap-2 py-4 border-l border-cyan-500/30 bg-slate-900/50">
          {[
            { icon: Search, label: '信息' },
            { icon: Zap, label: '技能' },
            { icon: Play, label: '自动' },
            { icon: Gauge, label: '加速' },
            { icon: List, label: '菜单' }
          ].map(({ icon: Icon, label }, i) => (
            <button key={i} className="w-9 h-9 rounded-full border-2 border-cyan-400/60 bg-cyan-500/10 flex items-center justify-center text-cyan-300 hover:bg-cyan-500/25 hover:border-cyan-400 transition-colors" title={label}>
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="flex-shrink-0 border-t-2 border-cyan-500/40 bg-slate-900/95 shadow-[0_0_24px_rgba(6,182,212,0.12)]">
        <div className="flex flex-row items-stretch min-h-[28vh] max-h-[200px]">
          {/* 战斗日志（左侧） */}
          <div className="flex-shrink-0 w-[42%] min-w-[200px] max-w-[420px] overflow-y-auto px-3 py-2 border-r border-slate-700/80 bg-black/20 font-mono text-[10px] text-green-400/90 scrollbar-hide flex flex-col">
            {logs.map((log, i) => <div key={i} className="leading-tight">{'>'} {log}</div>)}
            <div ref={logsEndRef} />
          </div>

          {/* 中间：四个技能常驻，仅切到道具或回合处理时变化 */}
          <div className="flex-1 min-w-0 p-3 flex flex-col overflow-hidden">
            {turnProcessing && (
              <div className="text-cyan-400/80 animate-pulse pixel-font text-sm flex items-center h-full">处理中...</div>
            )}
            {!turnProcessing && menuState === 'bag' && (
              <div className="flex flex-wrap gap-2 items-center">
                <button onClick={handleUsePotion} className="px-4 py-2 rounded-lg border border-emerald-500/50 bg-emerald-900/30 hover:bg-emerald-800/40 pixel-font text-xs">🧪 伤药 x{inventory.potions}</button>
                <button onClick={handleThrowBall} className="px-4 py-2 rounded-lg border border-amber-500/50 bg-amber-900/30 hover:bg-amber-800/40 pixel-font text-xs">🔴 精灵球 x{inventory.balls}</button>
                <button onClick={() => setMenuState('main')} className="px-3 py-1.5 rounded bg-slate-700 text-slate-400 text-[10px]">返回</button>
              </div>
            )}
            {!turnProcessing && menuState === 'roster' && (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[10px] text-cyan-400/80 pixel-font flex items-center gap-1">
                    <Users size={12} /> 背包精灵 · 选择切换出战
                  </div>
                  <button onClick={() => setMenuState('main')} className="px-2 py-0.5 rounded bg-slate-700 text-slate-400 text-[10px] pixel-font hover:bg-slate-600">返回</button>
                </div>
                <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
                  {rosterMonsters.map((mon, idx) => {
                    const teamIndex = rosterTeamIndices[idx];
                    const isCurrent = teamIndex === currentLeadTeamIndex;
                    const canSwitch = mon.stats.currentHp > 0 && !isCurrent;
                    return (
                      <button
                        key={mon.id}
                        onClick={() => {
                          if (canSwitch) {
                            onSwitchMonster(teamIndex);
                            addLog(`${playerState.name} 回来了! ${mon.name} 去吧!`);
                            setMenuState('main');
                          }
                        }}
                        disabled={!canSwitch}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-all pixel-font text-xs ${
                          isCurrent
                            ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 cursor-default'
                            : canSwitch
                              ? 'bg-slate-700/80 border-slate-600 text-slate-200 hover:bg-slate-600/80 hover:border-cyan-500/50'
                              : 'bg-slate-800/60 border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <div className="w-8 h-8 rounded overflow-hidden border border-slate-600 bg-slate-800 flex-shrink-0">
                          {mon.imageUrl ? (
                            <img src={mon.imageUrl} alt={mon.name} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px]">?</div>
                          )}
                        </div>
                        <span className="flex-1 truncate font-bold">{mon.name}</span>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          {mon.stats.currentHp}/{mon.stats.maxHp}
                        </span>
                        {isCurrent && <span className="px-1.5 py-0.5 rounded bg-amber-500/80 text-black text-[9px] font-bold">出战中</span>}
                        {!isCurrent && mon.stats.currentHp <= 0 && <span className="text-[9px] text-red-400">倒下</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {!turnProcessing && menuState !== 'bag' && menuState !== 'roster' && (
              <>
                <div className="text-[10px] text-cyan-400/80 pixel-font mb-1.5">技能</div>
                <div className="flex flex-wrap gap-2 overflow-y-auto flex-1">
                  {playerState.moves.map((move, idx) => {
                    const effectiveness = getTypeEffectiveness(move.type, enemyState.element);
                    let effectLabel = '';
                    if (effectiveness > 1) effectLabel = '拔群';
                    else if (effectiveness < 1) effectLabel = '一般';
                    return (
                      <button
                        key={idx}
                        onClick={() => handlePlayerAttack(move)}
                        className="flex flex-col items-start px-3 py-2 rounded-lg border border-cyan-500/40 bg-slate-800/80 hover:bg-slate-700/80 hover:border-cyan-400/60 transition-all pixel-font text-xs min-w-[100px]"
                      >
                        <span className="text-white font-bold">{move.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                          <span className={`${ElementColors[move.type]} px-1.5 py-0.5 rounded`}>{move.type}</span>
                          <span className="text-slate-400">威力 {move.power}</span>
                          {effectLabel && <span className={effectiveness > 1 ? 'text-emerald-400' : 'text-amber-400'}>{effectLabel}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 右侧：2x2 主指令 */}
          <div className="flex-shrink-0 w-36 p-2 border-l border-cyan-500/30 flex flex-col justify-center gap-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMenuState('moves')}
                className={`py-2.5 rounded-lg pixel-font text-xs font-bold flex items-center justify-center gap-1 transition-all ${menuState === 'moves' ? 'bg-cyan-500/30 border-2 border-cyan-400 text-cyan-200' : 'bg-slate-700/80 border border-slate-600 text-slate-300 hover:border-cyan-500/50'}`}
              >
                <Swords size={14} /> 战斗
              </button>
              <button
                onClick={() => setMenuState('bag')}
                className={`py-2.5 rounded-lg pixel-font text-xs font-bold flex items-center justify-center gap-1 transition-all ${menuState === 'bag' ? 'bg-cyan-500/30 border-2 border-cyan-400 text-cyan-200' : 'bg-slate-700/80 border border-slate-600 text-slate-300 hover:border-cyan-500/50'}`}
              >
                <Briefcase size={14} /> 道具
              </button>
              <button
                onClick={() => setMenuState('roster')}
                className={`py-2.5 rounded-lg pixel-font text-xs font-bold flex items-center justify-center gap-1 transition-all ${menuState === 'roster' ? 'bg-cyan-500/30 border-2 border-cyan-400 text-cyan-200' : 'bg-slate-700/80 border border-slate-600 text-slate-300 hover:border-cyan-500/50'}`}
              >
                <Users size={14} /> 精灵
              </button>
              <button onClick={onRun} className="py-2.5 rounded-lg pixel-font text-xs font-bold flex items-center justify-center gap-1 bg-slate-700/80 border border-slate-600 text-slate-300 hover:border-rose-500/50 hover:bg-rose-900/20 transition-all">
                <LogOut size={14} /> 撤退
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BattleScene;