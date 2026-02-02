import React, { useState } from 'react';
import { ElementType, GenMon } from '../types';
import { getExpToNextLevel } from '../services/exp';
import { canEvolve, getNextEvolutionLevel } from '../services/evolution';
import MonsterCard from './MonsterCard';
import { TransparentImage } from './TransparentImage';
import { ArrowLeft, Sparkles, X, Swords, Shield, Wind, Zap, Activity, Hexagon, UserCheck, UserX, GripVertical, Backpack } from 'lucide-react';

interface TeamViewProps {
  team: GenMon[];
  leadIndex: number;
  rosterIndices: number[];
  onBack: () => void;
  onHealAll: () => void;
  onEvolve: (index: number) => void;
  onSetLead: (index: number) => void;
  onToggleRoster: (index: number) => void;
  onReorderTeam: (fromIndex: number, toIndex: number) => void;
  onOpenBackpack?: () => void;
}

const ElementColors: Record<ElementType, string> = {
  [ElementType.Fire]: 'text-red-400',
  [ElementType.Water]: 'text-blue-400',
  [ElementType.Grass]: 'text-green-400',
  [ElementType.Electric]: 'text-yellow-400',
  [ElementType.Rock]: 'text-stone-400',
  [ElementType.Psychic]: 'text-purple-400',
  [ElementType.Normal]: 'text-gray-400',
  [ElementType.Dark]: 'text-slate-400',
  [ElementType.Fighting]: 'text-orange-400',
  [ElementType.Bug]: 'text-lime-400',
};

const StatBar = ({ label, value, max = 150, colorClass, icon: Icon }: { label: string, value: number, max?: number, colorClass: string, icon: any }) => (
    <div className="flex items-center gap-1.5">
        <div className={`w-12 text-[10px] font-bold flex items-center gap-0.5 ${colorClass}`}>
            <Icon size={10} /> {label}
        </div>
        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
            <div 
                className={`h-full ${colorClass.replace('text-', 'bg-')} opacity-80`} 
                style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
            />
        </div>
        <div className="w-6 text-right text-[10px] font-mono text-gray-300">{value}</div>
    </div>
);

const TeamView: React.FC<TeamViewProps> = ({ team, leadIndex, rosterIndices, onBack, onHealAll, onEvolve, onSetLead, onToggleRoster, onReorderTeam, onOpenBackpack }) => {
  const [selectedMonster, setSelectedMonster] = useState<GenMon | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const isInRoster = (i: number) => rosterIndices.length === 0 || rosterIndices.includes(i);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.setData('application/json', JSON.stringify({ index }));
    (e.target as HTMLElement).classList.add('opacity-60');
  };
  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove('opacity-60');
    setDragOverIndex(null);
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDragOverIndex(null);
  };
  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const raw = e.dataTransfer.getData('text/plain');
    const fromIndex = parseInt(raw, 10);
    if (Number.isNaN(fromIndex) || fromIndex === toIndex) return;
    onReorderTeam(fromIndex, toIndex);
  };

  return (
    <div className="h-screen w-full bg-gray-900 overflow-hidden flex flex-col relative">
        <div className="flex-shrink-0 flex justify-between items-center px-4 py-3 border-b border-gray-700">
            <button onClick={onBack} className="text-white flex items-center gap-2 hover:text-emerald-400 transition-colors">
                <ArrowLeft size={18} /> <span className="text-sm">返回</span>
            </button>
            <h2 className="text-xl text-white pixel-font">我的队伍</h2>
            <div className="flex items-center gap-2">
                {onOpenBackpack && (
                    <button
                        onClick={onOpenBackpack}
                        className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded pixel-font text-xs shadow-lg active:translate-y-0.5 transition-colors"
                    >
                        <Backpack size={14} /> 精灵背包
                    </button>
                )}
                <button 
                    onClick={onHealAll}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded pixel-font text-xs shadow-lg active:translate-y-0.5 transition-colors"
                >
                    全部治疗
                </button>
            </div>
        </div>

        {/* 队伍网格 - 可拖拽调整顺序 */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
            <p className="text-[10px] text-gray-500 pixel-font mb-2 flex items-center gap-1">
                <GripVertical size={12} /> 拖拽卡片可调整首发顺序
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-start content-start">
                {team.map((mon, index) => (
                    <div 
                        key={mon.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`relative group cursor-grab active:cursor-grabbing transform transition-transform hover:scale-105 flex-shrink-0 rounded-lg border-2 ${dragOverIndex === index ? 'border-amber-400 bg-amber-500/20' : 'border-transparent'}`}
                        onClick={() => { setSelectedMonster(mon); setSelectedIndex(index); }}
                    >
                        <div className="absolute top-1 right-1 z-10 text-gray-500 hover:text-gray-300 pointer-events-none" aria-hidden>
                            <GripVertical size={14} />
                        </div>
                        <MonsterCard monster={mon} isPlayer={true} compact={true} />
                        {index === leadIndex && (
                            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-black text-[9px] font-bold pixel-font z-10 flex items-center gap-0.5">
                                <Swords size={10} /> 首发
                            </div>
                        )}
                        {!isInRoster(index) && (
                            <div className="absolute top-1 left-1 right-1 h-6 bg-black/60 rounded flex items-center justify-center text-[9px] text-gray-400 z-10 pixel-font">
                                不参战
                            </div>
                        )}
                        {/* Hover Overlay Hint */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-white/5 transition-colors rounded-lg pointer-events-none" />

                        {mon.evolution && (
                            canEvolve(mon) ? (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEvolve(index);
                                    }}
                                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-yellow-500 hover:bg-yellow-400 text-black px-2 py-0.5 rounded-full pixel-font text-[10px] shadow-lg flex items-center gap-1 border border-white transform transition-transform hover:scale-110 z-20"
                                >
                                    <Sparkles size={10} /> 进化
                                </button>
                            ) : (
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-gray-600 text-gray-300 px-2 py-0.5 rounded-full pixel-font text-[10px] border border-gray-500 z-20">
                                    Lv.{getNextEvolutionLevel(mon)} 可进化
                                </div>
                            )
                        )}
                    </div>
                ))}
                {team.length === 0 && (
                    <div className="col-span-full flex items-center justify-center h-full text-gray-500 pixel-font text-sm">
                        还没有精灵。去探索吧！
                    </div>
                )}
            </div>
        </div>

        {/* Detailed Modal Overlay - 单屏内显示，不滚动 */}
        {selectedMonster && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
                <div 
                    className="bg-gray-800 border-4 border-white rounded-lg max-w-5xl w-full h-[90vh] overflow-hidden shadow-2xl relative animate-[zoomIn_0.3s_ease-out] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <button 
                        onClick={() => setSelectedMonster(null)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white z-10 bg-gray-900/50 rounded-full p-1"
                    >
                        <X size={24} />
                    </button>

                    <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
                        {/* Left: Image & Basic Info - 紧凑 */}
                        <div className="w-full md:w-1/3 bg-gray-900 p-4 flex flex-col items-center border-b md:border-b-0 md:border-r border-gray-700 flex-shrink-0">
                             <div className="w-32 h-32 mb-2 relative flex-shrink-0">
                                {selectedMonster.imageUrl ? (
                                    <TransparentImage 
                                        src={selectedMonster.imageUrl} 
                                        alt={selectedMonster.name}
                                        className="w-full h-full object-contain pixelated"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-800 flex items-center justify-center rounded-lg text-xs text-gray-500">No Image</div>
                                )}
                             </div>
                             
                             <h2 className="text-lg text-white pixel-font mb-1 text-center">{selectedMonster.name}</h2>
                             <span className={`px-2 py-0.5 rounded text-xs font-bold border border-current ${ElementColors[selectedMonster.element]} mb-2`}>
                                {selectedMonster.element} 系
                             </span>

                             <div className="w-full bg-gray-800 p-2 rounded text-[10px] text-gray-300 leading-tight font-mono border border-gray-700 flex-1 min-h-0 overflow-hidden">
                                 <p className="line-clamp-4">{selectedMonster.description}</p>
                             </div>
                        </div>

                        {/* Right: Stats & Moves - 可滚动区域 */}
                        <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-gray-800 text-white">
                            {/* 首发 & 参战 */}
                            {selectedIndex !== null && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {selectedIndex !== leadIndex && (
                                        <button
                                            onClick={() => { onSetLead(selectedIndex); setSelectedMonster(null); }}
                                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold pixel-font flex items-center gap-1.5"
                                        >
                                            <Swords size={14} /> 设为首发
                                        </button>
                                    )}
                                    <button
                                        onClick={() => selectedIndex !== null && onToggleRoster(selectedIndex)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold pixel-font flex items-center gap-1.5 ${isInRoster(selectedIndex) ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-gray-600 hover:bg-gray-500 text-gray-300'}`}
                                    >
                                        {isInRoster(selectedIndex) ? <UserCheck size={14} /> : <UserX size={14} />}
                                        {isInRoster(selectedIndex) ? '参战中' : '不参战'}
                                    </button>
                                </div>
                            )}
                            {/* 经验条 */}
                            {(() => {
                              const expNeed = getExpToNextLevel(selectedMonster.level);
                              const expPct = expNeed <= 0 ? 100 : Math.min(100, (selectedMonster.exp / expNeed) * 100);
                              return (
                                <div className="mb-4">
                                  <h3 className="text-amber-400 pixel-font text-xs mb-1 flex items-center gap-1">经验值</h3>
                                  <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden border border-gray-600">
                                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${expPct}%` }} />
                                  </div>
                                  <div className="text-right text-[10px] text-amber-200/80 font-mono mt-0.5">{selectedMonster.exp} / {expNeed}（下一级）</div>
                                </div>
                              );
                            })()}
                            {/* Base Stats Section - 紧凑 */}
                            <div className="mb-4">
                                <h3 className="text-emerald-400 pixel-font text-xs mb-2 flex items-center gap-1 border-b border-gray-700 pb-1">
                                    <Activity size={12} /> 基础属性
                                </h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    <StatBar label="生命" value={selectedMonster.stats.maxHp} max={200} colorClass="text-green-400" icon={Activity} />
                                    <StatBar label="速度" value={selectedMonster.stats.speed} colorClass="text-yellow-400" icon={Wind} />
                                    <StatBar label="物攻" value={selectedMonster.stats.attack} colorClass="text-red-400" icon={Swords} />
                                    <StatBar label="物防" value={selectedMonster.stats.defense} colorClass="text-blue-400" icon={Shield} />
                                    <StatBar label="特攻" value={selectedMonster.stats.spAttack || selectedMonster.stats.attack} colorClass="text-purple-400" icon={Zap} />
                                    <StatBar label="特防" value={selectedMonster.stats.spDefense || selectedMonster.stats.defense} colorClass="text-indigo-400" icon={Hexagon} />
                                </div>
                            </div>

                            {/* Moves Section - 紧凑 */}
                            <div className="mb-4">
                                <h3 className="text-blue-400 pixel-font text-xs mb-2 flex items-center gap-1 border-b border-gray-700 pb-1">
                                    <Zap size={12} /> 技能列表
                                </h3>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {selectedMonster.moves.map((move, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-gray-700/50 p-2 rounded border border-gray-700 hover:bg-gray-700 transition-colors">
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-xs text-white truncate">{move.name}</span>
                                                <span className={`text-[10px] ${ElementColors[move.type]} opacity-80`}>{move.type}</span>
                                            </div>
                                            <div className="flex gap-3 text-[10px] font-mono text-gray-300 flex-shrink-0">
                                                <div className="flex flex-col items-center w-10">
                                                    <span className="text-gray-500 text-[9px]">威力</span>
                                                    <span>{move.power}</span>
                                                </div>
                                                <div className="flex flex-col items-center w-10">
                                                    <span className="text-gray-500 text-[9px]">命中</span>
                                                    <span>{move.accuracy}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Evolution Info - 紧凑 */}
                            {selectedMonster.evolution && (
                                <div>
                                    <h3 className="text-purple-400 pixel-font text-xs mb-2 flex items-center gap-1 border-b border-gray-700 pb-1">
                                        <Sparkles size={12} /> 进化潜力
                                    </h3>
                                    <div className="bg-purple-900/20 border border-purple-500/30 p-2 rounded-lg flex items-center gap-2">
                                        <div className="bg-purple-500/20 p-1.5 rounded-full flex-shrink-0">
                                            <Sparkles className="text-purple-400" size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-bold text-purple-200 truncate">下一阶段: {selectedMonster.evolution.nextStage}</div>
                                            <div className="text-[10px] text-purple-300/70 truncate">
                                                {canEvolve(selectedMonster) ? '已满足进化条件（每10级可进化一次）' : `Lv.${getNextEvolutionLevel(selectedMonster)} 可进化（每10级一次）`}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* CSS Animations for Modal */}
        <style>{`
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes zoomIn {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
        `}</style>
    </div>
  );
};

export default TeamView;