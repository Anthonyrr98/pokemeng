import React, { useState, useEffect } from 'react';
import { GameState, GenMon, Biome, ElementType, Inventory } from './types';
import { generateMonster, generateMonsterImage } from './services/geminiService';
import { syncMonsterToServer } from './services/monsterSync';
import { getExpFromBattle, addExpAndLevelUp, pickRandomWildLevel, scaleMonsterToLevel, distributeExpByContribution } from './services/exp';
import type { BattleContribution } from './services/exp';
import BattleScene from './components/BattleScene';
import Exploration from './components/Exploration';
import TeamView from './components/TeamView';
import BattleBackpack from './components/BattleBackpack';
import Lab from './components/Lab';
import EvolutionScene from './components/EvolutionScene';
import SettingsPanel from './components/SettingsPanel';
import AuthPanel from './components/AuthPanel';
import { Flame, Droplets, Leaf, TestTube, Save, Disc, Settings } from 'lucide-react';

const SAVE_KEY = 'GENMON_SAVE_DATA_V1';
const DEFAULT_USERNAME = 'player1';
const SAVE_SLOT = 1;
const BACKEND_BASE_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:4000';

const WILD_BOSS_THRESHOLD = 15;

interface SaveData {
  team: GenMon[];
  inventory: Inventory;
  timestamp: number;
  /** 首发精灵在队伍中的下标 */
  leadIndex?: number;
  /** 可参战精灵在队伍中的下标列表 */
  battleRosterIndices?: number[];
  /** 各地区连续击败野怪数量（达到 WILD_BOSS_THRESHOLD 后下一场为该地区 BOSS） */
  biomeDefeatCount?: Record<string, number>;
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [gameState, setGameState] = useState<GameState>(GameState.START_MENU);
  const [playerTeam, setPlayerTeam] = useState<GenMon[]>([]);
  const [wildMonster, setWildMonster] = useState<GenMon | null>(null);
  const [activeMonsterIndex, setActiveMonsterIndex] = useState<number>(0);
  /** 可参战的队伍下标，未设置时默认全部参战 */
  const [battleRosterIndices, setBattleRosterIndices] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [inventory, setInventory] = useState<Inventory>({ potions: 5, balls: 10 });
  const [hasSaveFile, setHasSaveFile] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  /** 战斗结算：胜利/失败，点「继续」后才返回探索 */
  const [battleResult, setBattleResult] = useState<{ type: 'win' | 'lose'; caught?: boolean; expGain?: number; levelUps?: number; enemyName?: string } | null>(null);
  /** 各地区连续击败野怪数 */
  const [biomeDefeatCount, setBiomeDefeatCount] = useState<Record<string, number>>({});
  /** 当前这场遭遇是否为该地区野怪 BOSS（用于胜利后不重复累加计数） */
  const [lastEncounterWasRegionalBoss, setLastEncounterWasRegionalBoss] = useState(false);
  /** 当前遭遇所在地区（用于胜利后累加计数） */
  const [lastEncounterBiome, setLastEncounterBiome] = useState<Biome | null>(null);

  const getCurrentUsername = () => {
    return localStorage.getItem('GENMON_USERNAME') || DEFAULT_USERNAME;
  };

  // 检查认证状态（组件挂载时）
  useEffect(() => {
    const token = localStorage.getItem('GENMON_AUTH_TOKEN');
    const username = localStorage.getItem('GENMON_USERNAME');
    
    if (token && username) {
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);
  }, []);

  // Check for save file on mount (prefer后端，失败时回退到 localStorage)
  useEffect(() => {
    if (!isAuthenticated) return; // 未认证时不检查存档

    const checkSave = async () => {
      const username = getCurrentUsername();
      try {
        const res = await fetch(
          `${BACKEND_BASE_URL}/api/saves/${encodeURIComponent(username)}/${SAVE_SLOT}`
        );
        if (res.ok) {
          setHasSaveFile(true);
          return;
        }
      } catch {
        // ignore, fallback to local
      }

      const savedData = localStorage.getItem(SAVE_KEY);
      if (savedData) {
        setHasSaveFile(true);
      }
    };

    checkSave();
  }, [isAuthenticated]);

  // 处理认证成功
  const handleAuthSuccess = (username: string, token: string) => {
    setIsAuthenticated(true);
    // 认证成功后，检查是否有存档
    setTimeout(() => {
      const checkSave = async () => {
        try {
          const res = await fetch(
            `${BACKEND_BASE_URL}/api/saves/${encodeURIComponent(username)}/${SAVE_SLOT}`
          );
          if (res.ok) {
            setHasSaveFile(true);
          }
        } catch {
          // ignore
        }
      };
      checkSave();
    }, 100);
  };

  // 定时自动保存：每30秒自动保存一次（仅在游戏进行中时）
  useEffect(() => {
    // 只在游戏进行中时启用自动保存（不在开始菜单）
    if (gameState === GameState.START_MENU || gameState === GameState.STARTER_SELECT) {
      return;
    }

    // 如果队伍为空，也不需要保存
    if (playerTeam.length === 0) {
      return;
    }

    const autoSaveInterval = setInterval(() => {
      handleSaveGame();
    }, 30000); // 30秒 = 30000毫秒

    return () => {
      clearInterval(autoSaveInterval);
    };
  }, [gameState, playerTeam.length]);

  // 默认参战名单：未设置时全部参战
  const effectiveRoster = battleRosterIndices.length > 0
    ? battleRosterIndices.filter(i => i >= 0 && i < playerTeam.length)
    : playerTeam.map((_, i) => i);

  // Auto-save Game（静默保存到服务器，不显示提示）
  const handleSaveGame = async () => {
    const data: SaveData = {
      team: playerTeam,
      inventory: inventory,
      timestamp: Date.now(),
      leadIndex: activeMonsterIndex,
      battleRosterIndices: effectiveRoster.length === playerTeam.length ? [] : effectiveRoster,
      biomeDefeatCount: Object.keys(biomeDefeatCount).length > 0 ? biomeDefeatCount : undefined,
    };
    const username = getCurrentUsername();

    // 后端保存（静默）
    try {
      const res = await fetch(
        `${BACKEND_BASE_URL}/api/saves/${encodeURIComponent(username)}/${SAVE_SLOT}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (res.ok) {
        setHasSaveFile(true);
        // 同步一份到本地，作为离线备份
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        return;
      }
    } catch (e) {
      console.error('Auto-save to server failed', e);
    }

    // 本地回退（静默）
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      setHasSaveFile(true);
    } catch (e) {
      console.error('Auto-save failed', e);
    }
  };

  // Load Game（优先从后端读取，失败时回退 localStorage）
  const handleLoadGame = async () => {
    const username = getCurrentUsername();

    // 尝试从服务器读取
    try {
      const res = await fetch(
        `${BACKEND_BASE_URL}/api/saves/${encodeURIComponent(username)}/${SAVE_SLOT}`
      );
      if (res.ok) {
        const payload = await res.json();
        const data: SaveData = payload.data;

        data.team.forEach((mon) => {
          if (mon.stats.spAttack === undefined)
            mon.stats.spAttack = mon.stats.attack;
          if (mon.stats.spDefense === undefined)
            mon.stats.spDefense = mon.stats.defense;
        });

        setPlayerTeam(data.team);
        setInventory(data.inventory);
        const len = data.team.length;
        const lead = data.leadIndex != null ? Math.max(0, Math.min(data.leadIndex, len - 1)) : 0;
        setActiveMonsterIndex(len ? lead : 0);
        setBattleRosterIndices(
          data.battleRosterIndices && data.battleRosterIndices.length > 0
            ? data.battleRosterIndices.filter((i: number) => i >= 0 && i < len)
            : []
        );
        setBiomeDefeatCount(data.biomeDefeatCount && typeof data.biomeDefeatCount === 'object' ? data.biomeDefeatCount : {});
        setGameState(GameState.EXPLORE);
        // 同步一份到本地
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        return;
      }
    } catch (e) {
      console.error('Remote load failed, fallback to local', e);
    }

    // 本地回退
    try {
      const savedStr = localStorage.getItem(SAVE_KEY);
      if (!savedStr) return;

      const data: SaveData = JSON.parse(savedStr);

      data.team.forEach((mon: GenMon) => {
        if (mon.stats.spAttack === undefined)
          mon.stats.spAttack = mon.stats.attack;
        if (mon.stats.spDefense === undefined)
          mon.stats.spDefense = mon.stats.defense;
      });

      setPlayerTeam(data.team);
      setInventory(data.inventory);
      const len = data.team.length;
      const lead = data.leadIndex != null ? Math.max(0, Math.min(data.leadIndex, len - 1)) : 0;
      setActiveMonsterIndex(len ? lead : 0);
      setBattleRosterIndices(
        data.battleRosterIndices && data.battleRosterIndices.length > 0
          ? data.battleRosterIndices.filter((i: number) => i >= 0 && i < len)
          : []
      );
      setBiomeDefeatCount(data.biomeDefeatCount && typeof data.biomeDefeatCount === 'object' ? data.biomeDefeatCount : {});
      setGameState(GameState.EXPLORE);
    } catch (e) {
      console.error('Load failed', e);
      alert('存档损坏或无法读取。');
    }
  };

  // Start Game
  const startGame = () => {
    if (playerTeam.length === 0) {
        setGameState(GameState.STARTER_SELECT);
    } else {
        setGameState(GameState.EXPLORE);
    }
  };

  const handleSelectStarter = async (type: ElementType) => {
    setIsLoading(true);
    setLoadingMessage("正在合成你的初始伙伴...");
    try {
        const starter = await generateMonster('STARTER', type);
        setLoadingMessage("正在生成视觉矩阵...");
        const image = await generateMonsterImage(starter.visualPrompt);
        if (image) starter.imageUrl = image;

        // 同步精灵到服务器
        syncMonsterToServer(starter);

        setPlayerTeam([starter]);
        setGameState(GameState.EXPLORE);
    } catch (e) {
        console.error(e);
        alert("初始伙伴生成失败，请重试。");
    } finally {
        setIsLoading(false);
    }
  };

  const handleEncounter = async (biome: Biome, isGym: boolean = false) => {
    setLastEncounterBiome(isGym ? null : biome);
    const count = biomeDefeatCount[biome] ?? 0;
    const isRegionalBoss = !isGym && count >= WILD_BOSS_THRESHOLD;
    if (isRegionalBoss) {
      setBiomeDefeatCount(prev => ({ ...prev, [biome]: 0 }));
      setLastEncounterWasRegionalBoss(true);
    } else {
      setLastEncounterWasRegionalBoss(false);
    }

    setIsLoading(true);
    setLoadingMessage(isRegionalBoss ? `该地区霸主出现! 正在扫描 ${biome}...` : isGym ? "正在挑战道馆馆主..." : `正在扫描 ${biome}...`);
    try {
        let monster = await generateMonster(biome, undefined, isGym, undefined, isRegionalBoss);
        if (!isGym && !isRegionalBoss) {
          const leadLevel = playerTeam[activeMonsterIndex]?.level ?? 5;
          const wildLevel = pickRandomWildLevel(leadLevel);
          monster = scaleMonsterToLevel(monster, 5, wildLevel);
        }
        setLoadingMessage(`目标锁定! 正在可视化...`);
        const image = await generateMonsterImage(monster.visualPrompt);
        if (image) monster.imageUrl = image;
        // 同步精灵到服务器
        syncMonsterToServer(monster);
        setWildMonster(monster);
        setGameState(GameState.BATTLE);
    } catch (e) {
        console.error(e);
        alert("由于大气干扰，探索失败。");
        setGameState(GameState.EXPLORE);
    } finally {
        setIsLoading(false);
    }
  };

  const handleVisitTown = () => {
      healAll();
      // Refill supplies slightly?
      setInventory(prev => ({ 
          potions: Math.max(prev.potions, 3), 
          balls: Math.max(prev.balls, 5) 
      }));
      handleSaveGame(); // Auto-save on town visit (silent)
      alert("欢迎来到像素镇！你的队伍已完全恢复，物资已补充。");
  };

  const handleConsumeItem = (item: 'potion' | 'ball') => {
      setInventory(prev => ({
          potions: item === 'potion' ? prev.potions - 1 : prev.potions,
          balls: item === 'ball' ? prev.balls - 1 : prev.balls,
      }));
  };

  const handleBattleWin = (caught: boolean, contributions?: BattleContribution[]) => {
    const enemyLevel = wildMonster ? wildMonster.level : 5;
    const totalExp = getExpFromBattle(enemyLevel, caught);
    const shares =
      contributions && contributions.length > 0
        ? distributeExpByContribution(totalExp, contributions)
        : [{ teamIndex: activeMonsterIndex, exp: totalExp }];
    let totalLevelUps = 0;
    shares.forEach(({ teamIndex, exp }) => {
      const mon = playerTeam[teamIndex];
      if (mon) totalLevelUps += addExpAndLevelUp(mon, exp).levelUps;
    });

    setBattleResult({
      type: 'win',
      caught,
      expGain: totalExp,
      levelUps: totalLevelUps,
      enemyName: wildMonster?.name ?? '野生精灵',
    });

    setPlayerTeam(prev => {
      let newTeam = [...prev];
      shares.forEach(({ teamIndex, exp }) => {
        const a = newTeam[teamIndex];
        if (a) {
          const { monster: updatedMon } = addExpAndLevelUp(a, exp);
          newTeam[teamIndex] = {
            ...updatedMon,
            stats: { ...updatedMon.stats, currentHp: Math.min(updatedMon.stats.currentHp, updatedMon.stats.maxHp) },
          };
          syncMonsterToServer(newTeam[teamIndex]);
        }
      });
      if (caught && wildMonster) {
        const caughtMon = { ...wildMonster, stats: { ...wildMonster.stats, currentHp: wildMonster.stats.maxHp } };
        syncMonsterToServer(caughtMon);
        newTeam = [...newTeam, caughtMon];
      }
      setTimeout(() => handleSaveGame(), 100);
      return newTeam;
    });

    setWildMonster(null);
    if (lastEncounterBiome != null && !lastEncounterWasRegionalBoss) {
      setBiomeDefeatCount(prev => ({
        ...prev,
        [lastEncounterBiome]: (prev[lastEncounterBiome] ?? 0) + 1,
      }));
    }
    setGameState(GameState.BATTLE_RESULT);
  };

  const handleBattleLose = () => {
    setBattleResult({ type: 'lose' });
    setGameState(GameState.BATTLE_RESULT);
  };

  const handleBattleResultContinue = () => {
    if (battleResult?.type === 'lose') {
      healAll();
      setWildMonster(null);
    }
    setGameState(GameState.EXPLORE);
    setBattleResult(null);
  };

  const healAll = () => {
    setPlayerTeam(prev => prev.map(mon => ({
        ...mon,
        stats: { ...mon.stats, currentHp: mon.stats.maxHp }
    })));
  };

  const updatePlayerMonsterState = (updatedMon: GenMon) => {
    setPlayerTeam(prev => {
        const newTeam = [...prev];
        newTeam[activeMonsterIndex] = updatedMon;
        return newTeam;
    });
  };

  const handleAddLabMonster = (mon: GenMon) => {
    // 实验室生成的精灵在生成时已经同步过了，这里确保同步
    syncMonsterToServer(mon);
    setPlayerTeam(prev => {
      const newTeam = [...prev, mon];
      // Auto-save after adding monster from lab
      setTimeout(() => handleSaveGame(), 100);
      return newTeam;
    });
    alert(`${mon.name} 已成功加入你的队伍！`);
    setGameState(GameState.EXPLORE);
  };

  const handleStartEvolution = (index: number) => {
    setActiveMonsterIndex(index);
    setGameState(GameState.EVOLVING);
  };

  const handleEvolutionComplete = (newMonster: GenMon) => {
    setPlayerTeam(prev => {
        const newTeam = [...prev];
        newTeam[activeMonsterIndex] = newMonster;
        // Auto-save after evolution
        setTimeout(() => handleSaveGame(), 100);
        return newTeam;
    });
    setGameState(GameState.TEAM_VIEW);
  };

  // --- Render Helpers ---

  const renderContent = () => {
    if (isLoading) {
        return (
            <div className="h-full w-full bg-gray-900 flex flex-col items-center justify-center text-white p-6">
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="pixel-font text-center animate-pulse">{loadingMessage}</p>
            </div>
        );
    }

    if (gameState === GameState.START_MENU) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center text-white relative px-4 py-10">
          <div className="relative z-10 max-w-xl w-full">
            <div className="rounded-3xl border border-white/10 bg-black/40 shadow-[0_24px_80px_rgba(0,0,0,0.9)] px-6 py-8 md:px-10 md:py-10 backdrop-blur-md">
              <div className="mb-6 text-center">
                <p className="mb-3 inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] text-emerald-200/90">
                  AI GEN MONSTER ROGUELITE
                </p>
                <h1 className="text-3xl md:text-5xl text-emerald-400 mb-4 pixel-font drop-shadow-[0_0_25px_rgba(45,212,191,0.6)] leading-snug">
                  GENMON<br />大作战
                </h1>
                <p className="text-xs md:text-sm text-slate-300">
                  使用{" "}
                  <span className="font-semibold text-emerald-300">
                    AI 生成式怪兽
                  </span>{" "}
                  进行回合制像素风对战与探索。
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={startGame}
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 px-8 py-4 rounded-xl text-base md:text-lg pixel-font transition-transform hover:-translate-y-0.5 shadow-[0_16px_40px_rgba(16,185,129,0.6)] border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1"
                >
                  开始新游戏
                </button>
                {hasSaveFile && (
                  <button
                    onClick={handleLoadGame}
                    className="w-full bg-slate-800/80 hover:bg-slate-700 text-white px-8 py-3 rounded-xl text-sm md:text-base pixel-font transition-transform hover:-translate-y-0.5 shadow-[0_10px_30px_rgba(15,23,42,0.8)] border border-slate-600/80 flex items-center justify-center gap-2"
                  >
                    <Disc size={18} /> 继续游戏
                  </button>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 text-[10px] md:text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(45,212,191,0.9)]" />
                  实时 AI 怪物合成
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
                  三维粒子展示与进化动画
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (gameState === GameState.STARTER_SELECT) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center text-white relative px-4 py-10">
          <div className="relative z-10 max-w-4xl w-full">
            <div className="mb-8 text-center">
              <h2 className="text-2xl md:text-3xl pixel-font mb-3 text-emerald-300 drop-shadow-[0_0_18px_rgba(45,212,191,0.5)]">
                选择你的初始伙伴
              </h2>
              <p className="text-xs md:text-sm text-slate-300">
                不同属性拥有截然不同的战斗风格，选择你最想一起冒险的那一位。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={() => handleSelectStarter(ElementType.Grass)}
                className="group relative overflow-hidden rounded-2xl border border-emerald-500/60 bg-gradient-to-b from-emerald-900/60 via-emerald-950/80 to-black/80 p-5 flex flex-col items-center gap-4 shadow-[0_18px_45px_rgba(16,185,129,0.45)] transition-transform hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(16,185,129,0.65)]"
              >
                <div className="pointer-events-none absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top,_rgba(74,222,128,0.6),_transparent_60%)]" />
                <div className="relative bg-emerald-500/10 border border-emerald-400/40 rounded-full p-4">
                  <Leaf size={40} className="text-emerald-300 drop-shadow-[0_0_12px_rgba(74,222,128,0.9)]" />
                </div>
                <div className="relative text-center space-y-1">
                  <span className="pixel-font text-emerald-300 text-sm">草系</span>
                  <p className="text-xs text-emerald-100/80">平衡型伙伴，续航与生存能力优秀。</p>
                </div>
              </button>

              <button
                onClick={() => handleSelectStarter(ElementType.Fire)}
                className="group relative overflow-hidden rounded-2xl border border-red-500/60 bg-gradient-to-b from-red-900/70 via-slate-950/80 to-black/80 p-5 flex flex-col items-center gap-4 shadow-[0_18px_45px_rgba(248,113,113,0.45)] transition-transform hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(248,113,113,0.65)]"
              >
                <div className="pointer-events-none absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.6),_transparent_60%)]" />
                <div className="relative bg-red-500/10 border border-red-400/50 rounded-full p-4">
                  <Flame size={40} className="text-red-300 drop-shadow-[0_0_12px_rgba(248,113,113,0.9)]" />
                </div>
                <div className="relative text-center space-y-1">
                  <span className="pixel-font text-red-300 text-sm">火系</span>
                  <p className="text-xs text-red-100/80">高爆发输出，擅长快速结束战斗。</p>
                </div>
              </button>

              <button
                onClick={() => handleSelectStarter(ElementType.Water)}
                className="group relative overflow-hidden rounded-2xl border border-sky-500/60 bg-gradient-to-b from-sky-900/70 via-slate-950/80 to-black/80 p-5 flex flex-col items-center gap-4 shadow-[0_18px_45px_rgba(56,189,248,0.45)] transition-transform hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(56,189,248,0.65)]"
              >
                <div className="pointer-events-none absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.6),_transparent_60%)]" />
                <div className="relative bg-sky-500/10 border border-sky-400/50 rounded-full p-4">
                  <Droplets
                    size={40}
                    className="text-sky-300 drop-shadow-[0_0_12px_rgba(56,189,248,0.9)]"
                  />
                </div>
                <div className="relative text-center space-y-1">
                  <span className="pixel-font text-sky-300 text-sm">水系</span>
                  <p className="text-xs text-sky-100/80">防御与灵活兼具，适合稳健型打法。</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (gameState === GameState.BATTLE && wildMonster) {
        const leadInRoster = effectiveRoster.includes(activeMonsterIndex)
          ? activeMonsterIndex
          : effectiveRoster[0] ?? 0;
        const currentMon = playerTeam[leadInRoster];
        if (!currentMon || currentMon.stats.currentHp <= 0) {
            const aliveInRoster = effectiveRoster.find(i => playerTeam[i]?.stats.currentHp > 0);
            if (aliveInRoster !== undefined) setActiveMonsterIndex(aliveInRoster);
            else { handleBattleLose(); return null; }
        }
        const battleLeadIndex = effectiveRoster.includes(activeMonsterIndex) ? activeMonsterIndex : (effectiveRoster[0] ?? 0);
        const rosterMonsters = effectiveRoster.map(i => playerTeam[i]).filter(Boolean) as GenMon[];
        const rosterTeamIndices = effectiveRoster;
        const updateBattleMon = (mon: GenMon) => {
          setPlayerTeam(prev => { const t = [...prev]; t[battleLeadIndex] = mon; return t; });
        };
        return (
            <BattleScene 
                playerMon={playerTeam[battleLeadIndex]}
                enemyMon={wildMonster}
                rosterMonsters={rosterMonsters}
                rosterTeamIndices={rosterTeamIndices}
                currentLeadTeamIndex={battleLeadIndex}
                onSwitchMonster={(teamIndex) => setActiveMonsterIndex(teamIndex)}
                inventory={inventory}
                onWin={handleBattleWin}
                onLose={handleBattleLose}
                onRun={() => {
                    setWildMonster(null);
                    setGameState(GameState.EXPLORE);
                }}
                onUpdatePlayerMon={updateBattleMon}
                onConsumeItem={handleConsumeItem}
            />
        );
    }

    if (gameState === GameState.BATTLE_RESULT && battleResult) {
      const isWin = battleResult.type === 'win';
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white px-4 py-8">
          <div className={`rounded-2xl border-2 shadow-2xl max-w-md w-full overflow-hidden ${isWin ? 'border-cyan-500/60 bg-gradient-to-b from-cyan-950/80 to-slate-900' : 'border-rose-500/60 bg-gradient-to-b from-rose-950/80 to-slate-900'}`}>
            <div className="p-6 text-center">
              <div className={`text-4xl pixel-font font-bold mb-4 ${isWin ? 'text-cyan-300' : 'text-rose-300'}`}>
                {isWin ? '胜利！' : '失败'}
              </div>
              {isWin && (
                <div className="space-y-2 text-sm text-slate-200 mb-6">
                  <p>野生的 {battleResult.enemyName} 被击败了</p>
                  {battleResult.expGain != null && battleResult.expGain > 0 && (
                    <p className="text-cyan-200">获得经验 +{battleResult.expGain}</p>
                  )}
                  {battleResult.levelUps != null && battleResult.levelUps > 0 && (
                    <p className="text-amber-300">精灵升了 {battleResult.levelUps} 级！</p>
                  )}
                  {battleResult.caught && (
                    <p className="text-emerald-300 font-bold">{battleResult.enemyName} 加入了队伍！</p>
                  )}
                </div>
              )}
              {!isWin && (
                <p className="text-slate-300 text-sm mb-6">你被打败了，回到城镇后将会恢复全部体力。</p>
              )}
              <button
                onClick={handleBattleResultContinue}
                className={`w-full py-3 rounded-xl pixel-font font-bold text-lg transition-all ${isWin ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-900' : 'bg-slate-600 hover:bg-slate-500 text-white'}`}
              >
                继续
              </button>
            </div>
          </div>
        </div>
      );
    }

    const handleSetLead = (index: number) => setActiveMonsterIndex(index);
    const handleToggleRoster = (index: number) => {
      setBattleRosterIndices(prev => {
        const allIndices = playerTeam.map((_, i) => i);
        const next = prev.length > 0 ? [...prev] : allIndices;
        const idx = next.indexOf(index);
        if (idx >= 0) {
          if (next.length <= 1) return next;
          const out = next.filter(j => j !== index);
          return out;
        }
        return [...next, index].sort((a, b) => a - b);
      });
    };

    /** 拖拽调整队伍顺序：fromIndex -> toIndex，拖到第一位即为首发（activeMonsterIndex = 0） */
    const handleReorderTeam = (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= playerTeam.length || toIndex >= playerTeam.length) return;
      const nextTeam = [...playerTeam];
      const [item] = nextTeam.splice(fromIndex, 1);
      nextTeam.splice(toIndex, 0, item);
      setPlayerTeam(nextTeam);
      setActiveMonsterIndex(0);
    };

    if (gameState === GameState.TEAM_VIEW) {
        return (
            <TeamView 
                team={playerTeam} 
                leadIndex={activeMonsterIndex}
                rosterIndices={effectiveRoster}
                onBack={() => setGameState(GameState.EXPLORE)} 
                onHealAll={healAll}
                onEvolve={handleStartEvolution}
                onSetLead={handleSetLead}
                onToggleRoster={handleToggleRoster}
                onReorderTeam={handleReorderTeam}
                onOpenBackpack={() => setGameState(GameState.BACKPACK)}
            />
        );
    }

    if (gameState === GameState.BACKPACK) {
      return (
        <BattleBackpack
          team={playerTeam}
          rosterOrder={effectiveRoster}
          onSave={(orderedIndices) => {
            setBattleRosterIndices(orderedIndices);
            setActiveMonsterIndex(orderedIndices[0] ?? 0);
          }}
          onBack={() => setGameState(GameState.EXPLORE)}
        />
      );
    }

    if (gameState === GameState.LAB) {
        return (
            <Lab 
                onAddTeam={handleAddLabMonster}
                onBack={() => setGameState(GameState.EXPLORE)}
            />
        );
    }

    if (gameState === GameState.EVOLVING) {
        const currentMon = playerTeam[activeMonsterIndex];
        return (
            <EvolutionScene 
                baseMonster={currentMon}
                onComplete={handleEvolutionComplete}
            />
        );
    }

    // Default: EXPLORE
    return (
      <Exploration
        onEncounter={handleEncounter}
        onVisitTown={handleVisitTown}
        onNavigateToLab={() => setGameState(GameState.LAB)}
        onNavigateToTeam={() => setGameState(GameState.TEAM_VIEW)}
        onNavigateToBackpack={() => setGameState(GameState.BACKPACK)}
        teamCount={playerTeam.length}
      />
    );
  };

  // 如果正在检查认证状态，显示加载界面
  if (isCheckingAuth) {
    return (
      <div className="h-full w-full bg-gray-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 如果未认证，显示登录/注册界面
  if (!isAuthenticated) {
    return <AuthPanel onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="h-full w-full relative overflow-hidden bg-gray-900">
        {/* Main Game Content */}
        {renderContent()}

        {/* Global Settings Button Overlay */}
        {/* Hidden in Battle and Evolving to prevent distraction, visible elsewhere */}
        {!isLoading && gameState !== GameState.BATTLE && gameState !== GameState.BATTLE_RESULT && gameState !== GameState.BACKPACK && gameState !== GameState.EVOLVING && (
            <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
              {typeof localStorage !== 'undefined' && localStorage.getItem('GENMON_IS_ADMIN') === 'true' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/90 text-black pixel-font" title="管理员账号">管理员</span>
              )}
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-400 hover:text-emerald-400 bg-black/30 hover:bg-black/50 rounded-full backdrop-blur-md transition-all border border-white/5"
                title="设置 / API Key"
              >
                <Settings size={20} />
              </button>
            </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <SettingsPanel
            onClose={() => setShowSettings(false)}
            onLogout={() => {
              localStorage.removeItem('GENMON_AUTH_TOKEN');
              localStorage.removeItem('GENMON_USERNAME');
              localStorage.removeItem('GENMON_USER_ID');
              localStorage.removeItem('GENMON_IS_ADMIN');
              setShowSettings(false);
              setIsAuthenticated(false);
            }}
          />
        )}
    </div>
  );
};

export default App;