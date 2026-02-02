import React, { useEffect, useState, useRef } from 'react';
import { GenMon } from '../types';
import { evolveMonster, generateMonsterImage } from '../services/geminiService';
import { syncMonsterToServer } from '../services/monsterSync';
import { canEvolve, getNextEvolutionLevel } from '../services/evolution';
import { TransparentImage } from './TransparentImage';
import { ArrowRight } from 'lucide-react';

interface EvolutionSceneProps {
  baseMonster: GenMon;
  onComplete: (newMonster: GenMon) => void;
}

const EvolutionScene: React.FC<EvolutionSceneProps> = ({ baseMonster, onComplete }) => {
  const [status, setStatus] = useState<'preparing' | 'ready' | 'animating' | 'finished' | 'error'>('preparing');
  const [evolvedMonster, setEvolvedMonster] = useState<GenMon | null>(null);
  
  // Animation states
  const [displayImage, setDisplayImage] = useState<string | undefined>(baseMonster.imageUrl);
  const [isSilhouette, setIsSilhouette] = useState(false);
  const [scale, setScale] = useState(1);
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [particles, setParticles] = useState<{id: number, x: number, y: number, color: string}[]>([]);
  
  const [message, setMessage] = useState(`等等！ ${baseMonster.name} 的样子有些奇怪...`);

  // Prepare evolution data
  useEffect(() => {
    if (!baseMonster.evolution || !canEvolve(baseMonster)) {
      setStatus('error');
      setMessage(`等级不足！需要 Lv.${getNextEvolutionLevel(baseMonster)} 才能进化（每10级可进化一次）。`);
      return;
    }
    const prepareEvolution = async () => {
      try {
        const newMon = await evolveMonster(baseMonster);
        const newImage = await generateMonsterImage(newMon.visualPrompt);
        if (newImage) newMon.imageUrl = newImage;

        // 每10级可进化一次：记录已进化次数
        const evolutionCount = (baseMonster.evolutionCount ?? 0) + 1;
        const evolved = { ...newMon, evolutionCount };

        // 同步进化后的精灵到服务器
        syncMonsterToServer(evolved);

        setEvolvedMonster(evolved);
        setStatus('ready');
      } catch (e) {
        console.error(e);
        setStatus('error');
      }
    };
    prepareEvolution();
  }, [baseMonster]);

  // Start Animation Sequence
  const startAnimation = () => {
    setStatus('animating');
    setMessage(`正在进化...`);
    setIsSilhouette(true); // Turn to black/white silhouette

    let progress = 0;
    const duration = 4000; // ms
    const intervalTime = 50;
    const steps = duration / intervalTime;
    
    const animInterval = setInterval(() => {
        progress++;
        const ratio = progress / steps;

        // 1. Pulsing Effect (Heartbeat)
        const pulse = 1 + Math.sin(progress * 0.5) * (0.1 + ratio * 0.2);
        setScale(pulse);

        // 2. Rapid Swapping (Morphing) near the end
        if (ratio > 0.6 && evolvedMonster?.imageUrl && baseMonster.imageUrl) {
            // Swap frequency increases with ratio
            if (progress % (Math.max(2, Math.floor(10 * (1 - ratio)))) === 0) {
                 setDisplayImage(prev => prev === baseMonster.imageUrl ? evolvedMonster.imageUrl : baseMonster.imageUrl);
            }
        }

        // 3. Particle Generation
        if (Math.random() > 0.5) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 50 + Math.random() * 100;
            setParticles(prev => [
                ...prev.slice(-20), // Keep limit
                {
                    id: Date.now() + Math.random(),
                    x: Math.cos(angle) * dist,
                    y: Math.sin(angle) * dist,
                    color: Math.random() > 0.5 ? '#10b981' : '#fbbf24' // Emerald or Amber
                }
            ]);
        }

        // 4. Climax Flash
        if (ratio > 0.9) {
            setFlashOpacity((ratio - 0.9) * 10); // 0 -> 1
        }

        // Finish
        if (progress >= steps) {
            clearInterval(animInterval);
            finishAnimation();
        }
    }, intervalTime);
  };

  const finishAnimation = () => {
      if (!evolvedMonster) return;

      // Swap to final state under the cover of the white flash
      setDisplayImage(evolvedMonster.imageUrl);
      setIsSilhouette(false);
      setScale(1);
      
      // Fade out flash
      setTimeout(() => {
          setFlashOpacity(0);
          setMessage(`恭喜！你的 ${baseMonster.name} 进化成了 ${evolvedMonster.name}！`);
          setStatus('finished');
          setParticles([]);
      }, 500);
  };

  // Trigger animation when data is ready
  useEffect(() => {
    if (status === 'ready') {
        const timer = setTimeout(startAnimation, 1500); // Wait a bit before starting
        return () => clearTimeout(timer);
    }
  }, [status]);

  if (status === 'error') {
      return (
          <div className="min-h-screen w-full flex flex-col items-center justify-center text-white bg-gray-900 p-8">
              <p className="text-red-400 pixel-font mb-4">进化失败了...</p>
              <button 
                onClick={() => onComplete(baseMonster)}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded pixel-font transition-colors"
              >
                  返回
              </button>
          </div>
      );
  }

  return (
    <div className="h-screen w-full bg-gray-900 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className={`absolute inset-0 transition-colors duration-1000 ${status === 'animating' ? 'bg-indigo-950/95' : 'bg-gray-900'}`}>
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:24px_24px]" aria-hidden />
      </div>

      {/* White Flash Overlay */}
      <div 
        className="absolute inset-0 bg-white pointer-events-none z-50 transition-opacity duration-300 ease-out"
        style={{ opacity: flashOpacity }}
        aria-hidden
      />

      {/* 单屏紧凑布局：上-精灵 中-文案/卡片 下-按钮，全部在视口内 */}
      <div className="relative z-10 flex flex-col items-center justify-between h-full w-full max-w-4xl py-4 px-4 box-border">
        
        {/* 精灵区域 - 固定比例占位 */}
        <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex-shrink-0 flex items-center justify-center">
            {status === 'animating' && (
                <>
                    <div className="absolute w-full h-full border-4 border-emerald-500/30 rounded-full animate-ping" />
                    <div className="absolute w-2/3 h-2/3 border-4 border-amber-500/30 rounded-full animate-ping" style={{ animationDelay: '100ms' }} />
                </>
            )}
            {status === 'animating' && particles.map(p => (
                <div 
                    key={p.id}
                    className="absolute w-2 h-2 rounded-full animate-pulse"
                    style={{
                        backgroundColor: p.color,
                        transform: `translate(${p.x}px, ${p.y}px)`,
                        transition: 'transform 0.5s ease-out, opacity 0.5s'
                    }}
                />
            ))}
            <div 
                className="relative transition-transform duration-75 will-change-transform"
                style={{ transform: `scale(${scale})` }}
            >
                <img 
                    src={displayImage} 
                    alt="Monster" 
                    className={`
                        w-32 h-32 sm:w-40 sm:h-40 object-contain
                        transition-all duration-75
                        ${isSilhouette ? 'brightness-0 invert opacity-80' : 'brightness-100'}
                    `}
                    style={{ imageRendering: 'pixelated', filter: isSilhouette ? 'brightness(0) invert(1)' : 'none' }}
                />
            </div>
        </div>

        {/* 中间：文案或进化结果 - 单屏内紧凑展示全部信息 */}
        <div className="flex-1 min-h-0 w-full px-2 flex flex-col items-center justify-center overflow-hidden">
            {status !== 'finished' ? (
                <div className="rounded-xl border border-white/10 bg-slate-800/90 px-4 py-3 max-w-xl w-full">
                    <p className="text-white pixel-font text-sm sm:text-base leading-snug text-center animate-pulse line-clamp-3">
                        {message}
                    </p>
                </div>
            ) : (
                <div className="animate-in zoom-in duration-300 flex flex-row flex-wrap items-center justify-center gap-3 w-full min-h-0 overflow-hidden">
                    {evolvedMonster && (
                        <div className="rounded-xl border border-white/10 bg-slate-800/95 p-3 flex flex-row flex-wrap items-center justify-center gap-3 max-w-2xl">
                            {/* 小图 + 名称 + HP */}
                            <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                <TransparentImage src={evolvedMonster.imageUrl ?? ''} alt={evolvedMonster.name} className="w-20 h-20 object-contain rounded-lg border border-white/10" />
                                <span className="text-white font-bold pixel-font text-sm">{evolvedMonster.name}</span>
                                <span className="text-xs text-gray-400">Lv {evolvedMonster.level}</span>
                                <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(evolvedMonster.stats.currentHp / evolvedMonster.stats.maxHp) * 100}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-400">{evolvedMonster.stats.currentHp}/{evolvedMonster.stats.maxHp}</span>
                            </div>
                            {/* 六维 + 进化 + 技能 一行/多行紧凑 */}
                            <div className="flex flex-col gap-1 text-[10px] sm:text-xs text-gray-300 flex-1 min-w-0">
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                    <span>攻{evolvedMonster.stats.attack}</span>
                                    <span>防{evolvedMonster.stats.defense}</span>
                                    <span>速{evolvedMonster.stats.speed}</span>
                                    <span>特攻{evolvedMonster.stats.spAttack ?? evolvedMonster.stats.attack}</span>
                                    <span>特防{evolvedMonster.stats.spDefense ?? evolvedMonster.stats.defense}</span>
                                </div>
                                {evolvedMonster.evolution && (
                                    <p className="text-amber-300/90 truncate" title={`进化: ${evolvedMonster.evolution.nextStage} (${evolvedMonster.evolution.condition})`}>
                                        进化: {evolvedMonster.evolution.nextStage} ({evolvedMonster.evolution.condition})
                                    </p>
                                )}
                                <p className="text-gray-400">技能: {evolvedMonster.moves.slice(0, 4).map(m => m.name).join('、')}</p>
                            </div>
                        </div>
                    )}
                    <button 
                        onClick={() => evolvedMonster && onComplete(evolvedMonster)}
                        className="flex-shrink-0 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white px-6 py-3 rounded-xl pixel-font text-base shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center gap-2 transition-all active:scale-95"
                    >
                        太棒了！ <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default EvolutionScene;