import React, { useState } from 'react';
import { Biome } from '../types';
import { Compass, Map as MapIcon, Trees, Mountain, Droplets, Building, Cloud, Skull, Castle, Ghost, TestTube, Backpack } from 'lucide-react';

interface ExplorationProps {
  onEncounter: (biome: Biome, isGym?: boolean) => void;
  onVisitTown: () => void;
  onNavigateToLab?: () => void;
  onNavigateToTeam?: () => void;
  onNavigateToBackpack?: () => void;
  teamCount?: number;
}

const LocationCard: React.FC<{ name: string; icon: React.ReactNode; color: string; onClick: () => void; type: 'biome' | 'town' | 'gym' }> = ({ name, icon, color, onClick, type }) => (
  <button
    onClick={onClick}
    className={`group relative overflow-hidden rounded-xl border border-white/10 ${color} bg-gradient-to-b from-black/40 via-black/20 to-black/40 p-3 flex flex-col items-center justify-center gap-2 text-white min-h-[90px] shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all hover:scale-105 hover:shadow-[0_6px_16px_rgba(0,0,0,0.4)] active:scale-95`}
  >
    {/* Decorative background icon - 更小 */}
    <div className="absolute top-1 right-1 opacity-10 group-hover:opacity-20 transition-opacity">
      {type === 'gym' ? <Castle size={32} /> : type === 'town' ? <Building size={32} /> : <Trees size={32} />}
    </div>
    
    {/* Main icon - 更小 */}
    <div className="relative bg-white/10 backdrop-blur-sm border border-white/20 p-2 rounded-lg group-hover:bg-white/15 transition-colors">
      {icon}
    </div>
    
    {/* Name - 更小字体 */}
    <span className="pixel-font text-[10px] text-center relative z-10 font-semibold drop-shadow-lg leading-tight">
      {name}
    </span>
    
    {/* Hover glow effect */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />
  </button>
);

const Exploration: React.FC<ExplorationProps> = ({ 
  onEncounter, 
  onVisitTown, 
  onNavigateToLab, 
  onNavigateToTeam, 
  onNavigateToBackpack, 
  teamCount = 0 
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [targetName, setTargetName] = useState("");

  const handleAction = (biome: Biome | 'TOWN', isGym: boolean = false) => {
    if (biome === 'TOWN') {
        onVisitTown();
        return;
    }

    setTargetName(isGym ? "道馆馆主" : biome);
    setIsSearching(true);
    setTimeout(() => {
        onEncounter(biome, isGym);
    }, 800);
  };

  if (isSearching) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-white p-8">
        <div className="relative">
          <Compass size={64} className="animate-spin text-emerald-400 mb-8 drop-shadow-[0_0_20px_rgba(16,185,129,0.6)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        </div>
        <h2 className="text-xl md:text-2xl pixel-font text-center animate-pulse text-emerald-300">
          正在前往 {targetName}...
        </h2>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Main Content Area - 单屏紧凑布局 */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 max-w-6xl mx-auto w-full p-3 overflow-hidden flex flex-col">
          {/* 紧凑 Header */}
          <header className="flex-shrink-0 mb-3 text-center">
            <div className="inline-block rounded-xl border border-emerald-500/30 bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-slate-900/90 px-4 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.4)] backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2 mb-1">
                <MapIcon className="text-emerald-400" size={20} />
                <h2 className="text-lg text-emerald-300 pixel-font drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                  区域地图
                </h2>
              </div>
              <p className="text-[10px] text-slate-400">选择你的探索目的地</p>
            </div>
          </header>

          {/* 内容区域 - 可滚动但尽量紧凑 */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* Towns & Facilities - 紧凑 */}
            <section className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                <h3 className="text-white pixel-font text-xs flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10">
                  <Building size={14} className="text-emerald-300" /> 安全区
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <LocationCard
                  name="像素镇 (治疗)"
                  icon={<Building size={20} />}
                  color="bg-indigo-600/90"
                  onClick={() => handleAction('TOWN')}
                  type="town"
                />
                <LocationCard
                  name="挑战者道馆"
                  icon={<Castle size={20} />}
                  color="bg-purple-800/90"
                  onClick={() => handleAction(Biome.GYM, true)}
                  type="gym"
                />
              </div>
            </section>

            {/* Wild Areas - 紧凑 */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
                <h3 className="text-white pixel-font text-xs flex items-center gap-1 px-2 py-0.5 rounded-full border border-sky-500/30 bg-sky-500/10">
                  <Trees size={14} className="text-sky-300" /> 野外区域
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <LocationCard
                  name="低语森林"
                  icon={<Trees size={18} />}
                  color="bg-emerald-700/90"
                  onClick={() => handleAction(Biome.FOREST)}
                  type="biome"
                />
                <LocationCard
                  name="余烬火山"
                  icon={<Mountain size={18} />}
                  color="bg-red-700/90"
                  onClick={() => handleAction(Biome.VOLCANO)}
                  type="biome"
                />
                <LocationCard
                  name="深渊海洋"
                  icon={<Droplets size={18} />}
                  color="bg-blue-700/90"
                  onClick={() => handleAction(Biome.OCEAN)}
                  type="biome"
                />
                <LocationCard
                  name="水晶洞穴"
                  icon={<MapIcon size={18} />}
                  color="bg-stone-600/90"
                  onClick={() => handleAction(Biome.CAVE)}
                  type="biome"
                />
                <LocationCard
                  name="霓虹城"
                  icon={<Cloud size={18} />}
                  color="bg-sky-600/90"
                  onClick={() => handleAction(Biome.CITY)}
                  type="biome"
                />
                <LocationCard
                  name="远古遗迹"
                  icon={<Ghost size={18} />}
                  color="bg-amber-900/90"
                  onClick={() => handleAction(Biome.RUINS)}
                  type="biome"
                />
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="h-18 md:h-20 bg-gradient-to-t from-slate-950 via-slate-900/95 to-slate-900/80 border-t border-white/10 flex justify-around items-center px-4 backdrop-blur-md shadow-[0_-8px_24px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => {}}
          className="flex flex-col items-center gap-1 text-emerald-400 cursor-default relative"
          disabled
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
          <span className="pixel-font text-xs md:text-sm font-semibold">探索</span>
        </button>
        {onNavigateToLab && (
          <button
            onClick={onNavigateToLab}
            className="flex flex-col items-center gap-1 text-purple-400 hover:text-purple-300 transition-all hover:scale-110 active:scale-95"
          >
            <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors">
              <TestTube size={18} />
            </div>
            <span className="pixel-font text-[10px] md:text-xs">实验室</span>
          </button>
        )}
        {onNavigateToBackpack && (
          <button
            onClick={onNavigateToBackpack}
            className="flex flex-col items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-all hover:scale-110 active:scale-95"
          >
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors">
              <Backpack size={18} />
            </div>
            <span className="pixel-font text-[10px] md:text-xs">背包</span>
          </button>
        )}
        {onNavigateToTeam && (
          <button
            onClick={onNavigateToTeam}
            className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition-all hover:scale-110 active:scale-95"
          >
            <div className="px-3 py-1.5 rounded-lg bg-slate-700/30 border border-slate-600/30 hover:bg-slate-700/50 transition-colors">
              <span className="pixel-font text-xs md:text-sm font-semibold">{teamCount}</span>
            </div>
            <span className="pixel-font text-[10px] md:text-xs">队伍</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Exploration;
