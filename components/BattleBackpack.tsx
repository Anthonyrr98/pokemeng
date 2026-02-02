import React, { useState, useEffect, useRef } from 'react';
import { GenMon } from '../types';
import MonsterCard from './MonsterCard';
import { TransparentImage } from './TransparentImage';
import { ArrowLeft, Plus, Trash2, GripVertical, Swords, Backpack } from 'lucide-react';

interface BattleBackpackProps {
  team: GenMon[];
  /** 当前背包内的出战顺序（队伍下标数组），空则视为全部在背包 */
  rosterOrder: number[];
  onSave: (orderedIndices: number[]) => void;
  onBack: () => void;
}

const BattleBackpack: React.FC<BattleBackpackProps> = ({ team, rosterOrder, onSave, onBack }) => {
  const [backpack, setBackpack] = useState<number[]>(() =>
    rosterOrder.length > 0 ? rosterOrder.filter(i => i >= 0 && i < team.length) : team.map((_, i) => i)
  );
  const dragSourceRef = useRef<'team' | 'backpack' | null>(null);

  useEffect(() => {
    const valid = rosterOrder.length > 0 ? rosterOrder.filter(i => i >= 0 && i < team.length) : team.map((_, i) => i);
    setBackpack(valid);
  }, [team.length, rosterOrder.join(',')]);

  const isInBackpack = (index: number) => backpack.includes(index);

  const addToBackpack = (index: number) => {
    if (isInBackpack(index)) return;
    setBackpack(prev => [...prev, index]);
  };

  const removeFromBackpack = (index: number) => {
    if (backpack.length <= 1) return;
    setBackpack(prev => prev.filter(i => i !== index));
  };

  const moveInBackpack = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    setBackpack(prev => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  };

  type DragPayload = { type: 'team'; teamIndex: number } | { type: 'backpack'; teamIndex: number; orderIdx: number };
  const parseDragData = (e: React.DragEvent): DragPayload | null => {
    try {
      const raw = e.dataTransfer.getData('application/json');
      return raw ? (JSON.parse(raw) as DragPayload) : null;
    } catch {
      return null;
    }
  };

  const [dragOver, setDragOver] = useState<number>(-1);
  const [teamZoneDragOver, setTeamZoneDragOver] = useState(false);
  const [backpackZoneDragOver, setBackpackZoneDragOver] = useState(false);

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove('opacity-60');
    dragSourceRef.current = null;
    setDragOver(-1);
    setTeamZoneDragOver(false);
    setBackpackZoneDragOver(false);
  };

  /** 从「全部队伍」拖出：加入背包 */
  const handleTeamCardDragStart = (e: React.DragEvent, teamIndex: number) => {
    dragSourceRef.current = 'team';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'team' as const, teamIndex }));
    (e.target as HTMLElement).classList.add('opacity-60');
  };

  /** 从「背包」拖出：可拖回队伍或背包内调序 */
  const handleBackpackItemDragStart = (e: React.DragEvent, orderIdx: number) => {
    dragSourceRef.current = 'backpack';
    e.dataTransfer.effectAllowed = 'move';
    const teamIndex = backpack[orderIdx];
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'backpack' as const, teamIndex, orderIdx }));
    (e.target as HTMLElement).classList.add('opacity-60');
  };

  /** 背包列表项 drop：来自背包则调序，来自队伍则加入 */
  const handleBackpackItemDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    setDragOver(-1);
    setBackpackZoneDragOver(false);
    const payload = parseDragData(e);
    if (!payload) return;
    if (payload.type === 'backpack') {
      const fromIdx = payload.orderIdx;
      if (fromIdx !== toIdx) moveInBackpack(fromIdx, toIdx);
      return;
    }
    if (payload.type === 'team') {
      if (!isInBackpack(payload.teamIndex)) addToBackpack(payload.teamIndex);
    }
  };

  /** 背包区域（空白处）drop：来自队伍则加入末尾 */
  const handleBackpackZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setBackpackZoneDragOver(false);
    const payload = parseDragData(e);
    if (!payload || payload.type !== 'team') return;
    if (!isInBackpack(payload.teamIndex)) addToBackpack(payload.teamIndex);
  };

  /** 全部队伍区域 drop：来自背包则移出背包 */
  const handleTeamZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setTeamZoneDragOver(false);
    const payload = parseDragData(e);
    if (!payload || payload.type !== 'backpack') return;
    if (backpack.length > 1) removeFromBackpack(payload.teamIndex);
  };

  const handleSave = () => {
    if (backpack.length === 0) return;
    onSave(backpack);
    onBack();
  };

  return (
    <div className="h-screen w-full bg-slate-950 text-white flex flex-col overflow-hidden">
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-700/80 bg-slate-900/80">
        <button onClick={onBack} className="text-white flex items-center gap-2 hover:text-cyan-400 transition-colors">
          <ArrowLeft size={18} /> <span className="text-sm">返回</span>
        </button>
        <h2 className="text-lg pixel-font flex items-center gap-2">
          <Backpack size={20} className="text-cyan-400" /> 精灵背包
        </h2>
        <button
          onClick={handleSave}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg pixel-font text-sm font-bold transition-colors"
        >
          完成
        </button>
      </header>

      <p className="flex-shrink-0 px-4 py-2 text-[10px] text-slate-400">
        将本场需要出战的精灵放入右侧背包，顺序即出战顺序，第一位为首发。
      </p>

      <div className="flex-1 min-h-0 flex flex-row gap-4 p-4 overflow-hidden">
        {/* 左侧：全部队伍（可拖入、可拖出到背包） */}
        <div
          className={`w-[45%] min-w-0 flex flex-col rounded-xl border-2 overflow-hidden transition-colors ${
            teamZoneDragOver ? 'border-rose-400/70 bg-rose-950/30' : 'border-slate-600/80 bg-slate-900/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragSourceRef.current === 'backpack') setTeamZoneDragOver(true); }}
          onDragLeave={() => setTeamZoneDragOver(false)}
          onDrop={handleTeamZoneDrop}
        >
          <div className="flex-shrink-0 px-3 py-2 border-b border-slate-700/80 text-cyan-300/90 pixel-font text-xs">
            全部队伍 · 拖到右侧加入背包，从背包拖回此处移出
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 grid grid-cols-2 gap-2">
            {team.map((mon, index) => (
              <div
                key={mon.id}
                draggable
                onDragStart={(e) => handleTeamCardDragStart(e, index)}
                onDragEnd={handleDragEnd}
                className="relative rounded-lg border border-slate-600/80 bg-slate-800/60 p-2 flex flex-col items-center cursor-grab active:cursor-grabbing"
              >
                <div className="w-full flex justify-center">
                  <MonsterCard monster={mon} isPlayer compact />
                </div>
                <div className="mt-1 text-[10px] text-slate-300 truncate w-full text-center pixel-font">{mon.name}</div>
                {isInBackpack(index) ? (
                  <span className="text-[9px] text-emerald-400 pixel-font mt-0.5">已在背包</span>
                ) : (
                  <button
                    onClick={() => addToBackpack(index)}
                    className="mt-1 flex items-center gap-0.5 px-2 py-0.5 rounded bg-cyan-600/80 hover:bg-cyan-500/80 text-white text-[10px] pixel-font"
                  >
                    <Plus size={10} /> 加入背包
                  </button>
                )}
              </div>
            ))}
            {team.length === 0 && (
              <div className="col-span-2 flex items-center justify-center text-slate-500 text-sm py-8">还没有精灵</div>
            )}
          </div>
        </div>

        {/* 右侧：背包（出战顺序）（可拖入、可拖出到队伍） */}
        <div
          className={`flex-1 min-w-0 flex flex-col rounded-xl border-2 overflow-hidden transition-colors ${
            backpackZoneDragOver ? 'border-cyan-400 bg-cyan-500/20' : 'border-cyan-500/50 bg-cyan-950/30'
          }`}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragSourceRef.current === 'team') setBackpackZoneDragOver(true); }}
          onDragLeave={() => setBackpackZoneDragOver(false)}
          onDrop={handleBackpackZoneDrop}
        >
          <div className="flex-shrink-0 px-3 py-2 border-b border-cyan-500/30 text-cyan-300 pixel-font text-xs flex items-center gap-1">
            <Swords size={12} /> 背包（出战顺序）· 拖到左侧移出背包
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
            {backpack.map((teamIndex, orderIdx) => {
              const mon = team[teamIndex];
              if (!mon) return null;
              return (
                <div
                  key={`${mon.id}-${orderIdx}`}
                  draggable
                  onDragStart={(e) => handleBackpackItemDragStart(e, orderIdx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(orderIdx); }}
                  onDragLeave={() => setDragOver(-1)}
                  onDrop={(e) => { e.stopPropagation(); handleBackpackItemDrop(e, orderIdx); }}
                  className={`flex items-center gap-2 rounded-lg border-2 p-2 transition-colors ${
                    dragOver === orderIdx ? 'border-cyan-400 bg-cyan-500/20' : 'border-slate-600/80 bg-slate-800/60'
                  } cursor-grab active:cursor-grabbing`}
                >
                  <GripVertical size={14} className="text-slate-500 flex-shrink-0" />
                  <span className="w-6 h-6 rounded-full bg-cyan-500/30 border border-cyan-400/50 flex items-center justify-center text-[10px] font-bold text-cyan-200 flex-shrink-0">
                    {orderIdx + 1}
                  </span>
                  {orderIdx === 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/80 text-black text-[9px] font-bold pixel-font flex-shrink-0">
                      首发
                    </span>
                  )}
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-600 bg-slate-800 flex-shrink-0">
                    {mon.imageUrl ? (
                      <TransparentImage src={mon.imageUrl} alt={mon.name} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">?</div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-200 pixel-font truncate flex-1 min-w-0">{mon.name}</span>
                  <button
                    onClick={() => removeFromBackpack(teamIndex)}
                    disabled={backpack.length <= 1}
                    className="p-1.5 rounded text-red-400 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                    title="移出背包"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            {backpack.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">从左侧加入精灵</div>
            )}
          </div>
          {backpack.length > 0 && (
            <div className="flex-shrink-0 px-3 py-1.5 border-t border-cyan-500/30 text-[10px] text-cyan-300/80">
              共 {backpack.length} 只 · 拖拽可调整顺序
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BattleBackpack;
