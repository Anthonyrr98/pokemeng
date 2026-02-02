import React, { useState } from 'react';
import { ElementType, GenMon } from '../types';
import { generateMonster, generateMonsterImage } from '../services/geminiService';
import { syncMonsterToServer } from '../services/monsterSync';
import MonsterCard from './MonsterCard';
import { TestTube, Sparkles, Save, Trash2, ArrowLeft } from 'lucide-react';

interface LabProps {
  onAddTeam: (mon: GenMon) => void;
  onBack: () => void;
}

const Lab: React.FC<LabProps> = ({ onAddTeam, onBack }) => {
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedElement, setSelectedElement] = useState<ElementType | "">("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMon, setGeneratedMon] = useState<GenMon | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedMon(null);
    try {
      // Use 'CUSTOM' biome type for lab generation
      const mon = await generateMonster(
        'CUSTOM', 
        selectedElement === "" ? undefined : selectedElement, 
        false, 
        customPrompt || "A surprising random monster"
      );
      
      // Step 1: 立即显示怪物的基础信息 (Show monster stats immediately)
      setGeneratedMon(mon);

      // Step 2: 如果没有图片，自动调用生成函数 (Automatically generate image if missing)
      if (!mon.imageUrl) {
        const image = await generateMonsterImage(mon.visualPrompt);
        if (image) {
           setGeneratedMon(prev => {
               // 确保我们更新的是同一个怪物 (Ensure we update the correct monster)
               if (prev && prev.id === mon.id) {
                   const updatedMon = { ...prev, imageUrl: image };
                   // 同步精灵到服务器（带图片的完整数据）
                   syncMonsterToServer(updatedMon);
                   return updatedMon;
               }
               return prev;
           });
        } else {
          // 即使没有图片也同步到服务器
          syncMonsterToServer(mon);
        }
      } else {
        // 如果已经有图片，直接同步
        syncMonsterToServer(mon);
      }

    } catch (e) {
      console.error(e);
      alert("合成失败，请检查参数或重试。");
    } finally {
      setIsGenerating(false);
    }
  };

  const elementColors: Record<ElementType | '', string> = {
    '': 'bg-slate-600 border-slate-500 text-slate-200',
    [ElementType.Fire]: 'bg-red-900/50 border-red-600 text-red-200',
    [ElementType.Water]: 'bg-blue-900/50 border-blue-600 text-blue-200',
    [ElementType.Grass]: 'bg-green-900/50 border-green-600 text-green-200',
    [ElementType.Electric]: 'bg-yellow-900/50 border-yellow-600 text-yellow-200',
    [ElementType.Rock]: 'bg-stone-700/50 border-stone-500 text-stone-200',
    [ElementType.Psychic]: 'bg-purple-900/50 border-purple-600 text-purple-200',
    [ElementType.Normal]: 'bg-gray-600/50 border-gray-500 text-gray-200',
    [ElementType.Dark]: 'bg-slate-800 border-slate-600 text-slate-200',
    [ElementType.Fighting]: 'bg-orange-900/50 border-orange-600 text-orange-200',
    [ElementType.Bug]: 'bg-lime-900/50 border-lime-600 text-lime-200',
  };

  return (
    <div className="h-screen w-full bg-gray-900 overflow-hidden flex flex-col">
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-purple-500/30 bg-slate-900/80">
        <button onClick={onBack} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2 text-purple-300">
          <div className="p-1.5 rounded-lg bg-purple-500/20">
            <TestTube size={22} />
          </div>
          <h2 className="text-lg font-bold pixel-font tracking-wide">基因实验室</h2>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4 p-4 overflow-auto max-w-5xl mx-auto w-full">
        {/* 左侧：实验参数 */}
        <div className="flex-shrink-0 md:w-[360px] flex flex-col gap-4 p-4 rounded-xl bg-slate-800/90 border border-purple-500/30 shadow-xl shadow-purple-900/20">
          <h3 className="text-sm font-semibold text-purple-200 pixel-font flex items-center gap-2 border-b border-purple-500/20 pb-2">
            <TestTube size={14} /> 实验参数
          </h3>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5">基因序列（描述）</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="描述你想要的精灵，例如：穿着宇航服的机械猫、会喷火的迷你龙..."
              className="w-full bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none resize-none h-24 transition-colors"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-2">主要属性（可选）</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedElement("")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border pixel-font transition-colors ${selectedElement === "" ? "ring-2 ring-purple-400 " : ""}${elementColors[""]}`}
              >
                随机
              </button>
              {Object.values(ElementType).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedElement(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border pixel-font transition-colors ${selectedElement === type ? "ring-2 ring-purple-400 " : ""}${elementColors[type]}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`mt-auto w-full py-3 rounded-xl font-bold pixel-font text-sm flex items-center justify-center gap-2 transition-all shadow-lg
              ${isGenerating ? "bg-slate-600 cursor-not-allowed text-slate-400" : "bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white active:scale-[0.98]"}
            `}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                合成中...
              </>
            ) : (
              <>
                <Sparkles size={18} /> 开始合成
              </>
            )}
          </button>
        </div>

        {/* 右侧：实验结果 */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-purple-500/30 bg-slate-900/40 p-6">
          {generatedMon ? (
            <div className="w-full max-w-sm flex flex-col items-center gap-4 animate-in fade-in duration-300">
              <MonsterCard monster={generatedMon} compact={true} />
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setGeneratedMon(null)}
                  className="flex-1 py-2.5 rounded-lg text-xs font-medium pixel-font flex items-center justify-center gap-1.5 bg-red-900/40 text-red-300 border border-red-700/50 hover:bg-red-900/60 transition-colors"
                >
                  <Trash2 size={14} /> 销毁
                </button>
                <button
                  onClick={() => onAddTeam(generatedMon)}
                  className="flex-1 py-2.5 rounded-lg text-xs font-medium pixel-font flex items-center justify-center gap-1.5 bg-emerald-600 text-white border border-emerald-500/50 hover:bg-emerald-500 shadow-lg transition-colors"
                >
                  <Save size={14} /> 收录
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-4">
                <TestTube size={36} className="text-purple-400/60" />
              </div>
              <p className="text-gray-500 text-sm mb-1">等待实验结果</p>
              <p className="text-gray-600 text-xs max-w-[240px]">填写基因描述并选择属性后，点击「开始合成」生成新精灵</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lab;
