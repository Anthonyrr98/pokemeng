import React, { useState, useEffect } from 'react';
import { X, Save, Key, AlertTriangle, Trash2, Globe, Bot, Image as ImageIcon, ChevronDown, Activity, CheckCircle, XCircle, LogOut } from 'lucide-react';

interface SettingsPanelProps {
  onClose: () => void;
  /** 退出账号：清除登录状态并关闭面板 */
  onLogout?: () => void;
}

const CUSTOM_KEY_STORAGE_KEY = 'GENMON_CUSTOM_API_KEY';
const CUSTOM_BASE_URL_STORAGE_KEY = 'GENMON_CUSTOM_BASE_URL';
const CUSTOM_TEXT_MODEL_KEY = 'GENMON_CUSTOM_TEXT_MODEL';
const CUSTOM_IMAGE_MODEL_KEY = 'GENMON_CUSTOM_IMAGE_MODEL';

// SiliconFlow / OpenAI Compatible Presets
const PREDEFINED_TEXT_MODELS = [
  { label: '默认 (DeepSeek V3)', value: '' },
  { label: 'DeepSeek V3', value: 'deepseek-ai/DeepSeek-V3' },
  { label: 'DeepSeek R1', value: 'deepseek-ai/DeepSeek-R1' },
  { label: 'Qwen 2.5 72B', value: 'Qwen/Qwen2.5-72B-Instruct' },
  { label: 'Qwen 2.5 Coder 32B', value: 'Qwen/Qwen2.5-Coder-32B-Instruct' },
];

const PREDEFINED_IMAGE_MODELS = [
  { label: '默认 (Flux.1 Schnell)', value: '' },
  { label: 'Flux.1 Schnell', value: 'black-forest-labs/FLUX.1-schnell' },
  { label: 'Flux.1 Dev', value: 'black-forest-labs/FLUX.1-dev' },
  { label: 'Stable Diffusion 3.5 Large', value: 'stabilityai/stable-diffusion-3-5-large' },
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, onLogout }) => {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  
  // Model states
  const [textModel, setTextModel] = useState('');
  const [imageModel, setImageModel] = useState('');
  const [isTextCustom, setIsTextCustom] = useState(false);
  const [isImageCustom, setIsImageCustom] = useState(false);
  
  // Saved states for feedback
  const [savedKey, setSavedKey] = useState('');
  const [savedBaseUrl, setSavedBaseUrl] = useState('');
  const [savedTextModel, setSavedTextModel] = useState('');
  const [savedImageModel, setSavedImageModel] = useState('');

  const [showSuccess, setShowSuccess] = useState(false);

  // Testing State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);

  useEffect(() => {
    const storedKey = localStorage.getItem(CUSTOM_KEY_STORAGE_KEY);
    const storedBaseUrl = localStorage.getItem(CUSTOM_BASE_URL_STORAGE_KEY);
    const storedTextModel = localStorage.getItem(CUSTOM_TEXT_MODEL_KEY) || '';
    const storedImageModel = localStorage.getItem(CUSTOM_IMAGE_MODEL_KEY) || '';
    
    if (storedKey) {
      setSavedKey(storedKey);
      setApiKey(storedKey);
    }
    if (storedBaseUrl) {
      setSavedBaseUrl(storedBaseUrl);
      setBaseUrl(storedBaseUrl);
    }
    
    // Initialize Text Model State
    setSavedTextModel(storedTextModel);
    setTextModel(storedTextModel);
    const isPredefinedText = PREDEFINED_TEXT_MODELS.some(m => m.value === storedTextModel);
    setIsTextCustom(!isPredefinedText && storedTextModel !== '');

    // Initialize Image Model State
    setSavedImageModel(storedImageModel);
    setImageModel(storedImageModel);
    const isPredefinedImage = PREDEFINED_IMAGE_MODELS.some(m => m.value === storedImageModel);
    setIsImageCustom(!isPredefinedImage && storedImageModel !== '');

  }, []);

  const handleTestConnection = async () => {
    if (!apiKey) {
        setTestResult({ success: false, message: "请输入 API Key" });
        return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
        let url = (baseUrl || "https://api.siliconflow.cn/v1").replace(/\/+$/, "");
        
        // Auto-fix for testing logic too
        if (url === "https://api.siliconflow.cn") {
             url += "/v1";
        }

        const modelToUse = textModel || "deepseek-ai/DeepSeek-V3";

        const response = await fetch(`${url}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelToUse,
                messages: [{ role: "user", content: "Ping" }],
                max_tokens: 5
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`HTTP ${response.status}: ${err}`);
        }
        
        await response.json();
        setTestResult({ success: true, message: "连接成功！配置有效。" });

    } catch (e: any) {
        console.error("Test failed", e);
        let msg = "连接失败";
        if (e.message) msg += `: ${e.message}`;
        setTestResult({ success: false, message: msg });
    } finally {
        setIsTesting(false);
    }
  };

  const handleSave = () => {
    // Save Key
    if (!apiKey.trim()) {
      localStorage.removeItem(CUSTOM_KEY_STORAGE_KEY);
      setSavedKey('');
    } else {
      localStorage.setItem(CUSTOM_KEY_STORAGE_KEY, apiKey.trim());
      setSavedKey(apiKey.trim());
    }

    // Save Base URL
    if (!baseUrl.trim()) {
      localStorage.removeItem(CUSTOM_BASE_URL_STORAGE_KEY);
      setSavedBaseUrl('');
    } else {
      let cleanUrl = baseUrl.trim().replace(/\/$/, "");
      
      // Auto-fix for user input error
      if (cleanUrl === "https://api.siliconflow.cn") {
          cleanUrl += "/v1";
          setBaseUrl(cleanUrl); // Update UI
      }

      localStorage.setItem(CUSTOM_BASE_URL_STORAGE_KEY, cleanUrl);
      setSavedBaseUrl(cleanUrl);
    }

    // Save Text Model
    if (!textModel.trim()) {
      localStorage.removeItem(CUSTOM_TEXT_MODEL_KEY);
      setSavedTextModel('');
    } else {
      localStorage.setItem(CUSTOM_TEXT_MODEL_KEY, textModel.trim());
      setSavedTextModel(textModel.trim());
    }

    // Save Image Model
    if (!imageModel.trim()) {
      localStorage.removeItem(CUSTOM_IMAGE_MODEL_KEY);
      setSavedImageModel('');
    } else {
      localStorage.setItem(CUSTOM_IMAGE_MODEL_KEY, imageModel.trim());
      setSavedImageModel(imageModel.trim());
    }

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
    setTestResult(null); 
  };

  const handleClear = () => {
    localStorage.removeItem(CUSTOM_KEY_STORAGE_KEY);
    localStorage.removeItem(CUSTOM_BASE_URL_STORAGE_KEY);
    localStorage.removeItem(CUSTOM_TEXT_MODEL_KEY);
    localStorage.removeItem(CUSTOM_IMAGE_MODEL_KEY);
    
    setApiKey('');
    setBaseUrl('');
    setTextModel('');
    setImageModel('');
    setIsTextCustom(false);
    setIsImageCustom(false);
    
    setSavedKey('');
    setSavedBaseUrl('');
    setSavedTextModel('');
    setSavedImageModel('');
    setTestResult(null);
  };

  const getActiveLabel = (val: string, list: {label: string, value: string}[]) => {
      if (!val) return list[0].label; // Default
      const found = list.find(m => m.value === val);
      return found ? found.label : val;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="relative max-w-xl w-full">
        {/* Glow border */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-emerald-400/40 via-cyan-500/25 to-purple-500/40 opacity-80 blur-xl"
        />

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-slate-900/95 shadow-[0_24px_80px_rgba(0,0,0,0.9)] max-h-[90vh]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-white/5 p-1.5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="px-6 pt-5 pb-6 md:px-8 md:pt-6 md:pb-7">
            <header className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-emerald-400/40 via-cyan-500/30 to-purple-500/40 p-[1px]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-slate-950/90">
                    <Key className="text-emerald-400" size={22} />
                  </div>
                </div>
                <div>
                  <h2 className="pixel-font text-lg md:text-xl text-white tracking-wide">
                    硅基流动 API 设置
                  </h2>
                  <p className="mt-1 text-[11px] md:text-xs text-slate-400">
                    SiliconFlow 是集合顶尖大模型的一站式云服务平台，本面板用于配置其 API 访问参数（仅保存在本地浏览器中）。
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.9)]" />
                <span className="text-[11px] text-emerald-200/90">高级配置</span>
              </div>
            </header>

            <div className="space-y-6">
              <div className="flex gap-3 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-purple-500/15 px-4 py-3 text-xs md:text-sm text-emerald-100">
                <AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={18} />
                <p className="leading-relaxed">
                  请使用{' '}
                  <a
                    href="https://cloud.siliconflow.cn/"
                    target="_blank"
                    className="font-semibold underline decoration-emerald-300/80 decoration-dotted underline-offset-2 hover:text-emerald-200"
                  >
                    硅基流动
                  </a>{' '}
                  的 API Key。硅基流动作为集合顶尖大模型的一站式云服务平台，提供 DeepSeek、Qwen 等多种模型的按量计费访问。
                  建议为本游戏单独创建 Key，方便额度管理与安全控制；部分模型在研发阶段可免费使用，具体说明见官方文档。
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Connection Settings */}
                <section className="rounded-xl border border-white/10 bg-slate-900/70 p-4 md:p-5 shadow-inner">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/90">
                    <span className="inline-block h-4 w-0.5 rounded-full bg-emerald-400/80" />
                    连接设置
                  </h3>

                  {/* API Key Input */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 pixel-font">
                      <Key size={14} /> API KEY
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2.5 text-[13px] text-white shadow-inner outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60 font-mono"
                    />
                    {savedKey && (
                      <p className="text-[11px] text-emerald-400/90">✓ 已配置 Key</p>
                    )}
                  </div>

                  {/* Base URL Input */}
                  <div className="mt-4 space-y-1.5">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 pixel-font">
                      <Globe size={14} /> Base URL
                    </label>
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://api.siliconflow.cn/v1"
                      className="w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2.5 text-[13px] text-white shadow-inner outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60 font-mono"
                    />
                    {savedBaseUrl && (
                      <p className="text-[11px] text-emerald-400/90 break-all">
                        ✓ 使用中: {savedBaseUrl}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-500">
                      注意：必须包含 <span className="font-mono text-slate-300">/v1</span> 后缀。
                    </p>
                  </div>
                </section>

                {/* Model Settings */}
                <section className="rounded-xl border border-white/10 bg-slate-900/70 p-4 md:p-5 shadow-inner">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-purple-300/90">
                    <span className="inline-block h-4 w-0.5 rounded-full bg-purple-400/80" />
                    模型配置
                  </h3>
                  {/* Text Model */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 pixel-font">
                      <Bot size={14} /> 逻辑/文本模型
                    </label>
                    <div className="space-y-2">
                      <div className="relative">
                        <select
                          value={isTextCustom ? 'custom' : textModel}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'custom') {
                              setIsTextCustom(true);
                            } else {
                              setIsTextCustom(false);
                              setTextModel(val);
                            }
                          }}
                          className="w-full appearance-none rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2.5 pr-10 text-[13px] text-white shadow-inner outline-none transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500/60 font-mono"
                        >
                          {PREDEFINED_TEXT_MODELS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                          <option value="custom">自定义 (Custom...)</option>
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <ChevronDown size={16} />
                        </div>
                      </div>

                      {isTextCustom && (
                        <input
                          type="text"
                          value={textModel}
                          onChange={(e) => setTextModel(e.target.value)}
                          placeholder="输入模型名称 (如 deepseek-ai/DeepSeek-V3)"
                          className="w-full animate-[fadeIn_0.2s] rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2.5 text-[13px] text-white shadow-inner outline-none transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500/60 font-mono"
                        />
                      )}
                    </div>
                    {savedTextModel || savedTextModel === '' ? (
                      <p className="text-[11px] text-emerald-400/90">
                        ✓ 当前: {getActiveLabel(savedTextModel, PREDEFINED_TEXT_MODELS)}
                      </p>
                    ) : null}
                  </div>

                  {/* Image Model */}
                  <div className="mt-4 space-y-1.5">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 pixel-font">
                      <ImageIcon size={14} /> 绘图模型
                    </label>
                    <div className="space-y-2">
                      <div className="relative">
                        <select
                          value={isImageCustom ? 'custom' : imageModel}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'custom') {
                              setIsImageCustom(true);
                            } else {
                              setIsImageCustom(false);
                              setImageModel(val);
                            }
                          }}
                          className="w-full appearance-none rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2.5 pr-10 text-[13px] text-white shadow-inner outline-none transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500/60 font-mono"
                        >
                          {PREDEFINED_IMAGE_MODELS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                          <option value="custom">自定义 (Custom...)</option>
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <ChevronDown size={16} />
                        </div>
                      </div>

                      {isImageCustom && (
                        <input
                          type="text"
                          value={imageModel}
                          onChange={(e) => setImageModel(e.target.value)}
                          placeholder="输入模型名称 (如 black-forest-labs/FLUX.1-schnell)"
                          className="w-full animate-[fadeIn_0.2s] rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2.5 text-[13px] text-white shadow-inner outline-none transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500/60 font-mono"
                        />
                      )}
                    </div>
                    {savedImageModel || savedImageModel === '' ? (
                      <p className="text-[11px] text-emerald-400/90">
                        ✓ 当前: {getActiveLabel(savedImageModel, PREDEFINED_IMAGE_MODELS)}
                      </p>
                    ) : null}
                  </div>
                </section>
              </div>

              {/* Test Result Display */}
              {testResult && (
                <div
                  className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs md:text-sm ${
                    testResult.success
                      ? 'border-emerald-600/70 bg-emerald-500/10 text-emerald-200'
                      : 'border-red-600/70 bg-red-500/10 text-red-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle size={18} className="mt-0.5 shrink-0" />
                  ) : (
                    <XCircle size={18} className="mt-0.5 shrink-0" />
                  )}
                  <span className="leading-relaxed">{testResult.message}</span>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg border border-slate-600/80 bg-slate-900/80 px-4 py-2.5 text-xs md:text-sm text-slate-100 shadow-sm transition-colors hover:border-emerald-500 hover:bg-slate-900/90 disabled:cursor-not-allowed disabled:opacity-60"
                    title="测试连接"
                  >
                    {isTesting ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                    ) : (
                      <Activity size={16} />
                    )}
                    <span className="pixel-font tracking-wide">测试连接</span>
                  </button>

                  {(savedKey || savedBaseUrl || savedTextModel || savedImageModel) && (
                    <button
                      onClick={handleClear}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-700/80 bg-red-900/50 px-3.5 py-2.5 text-xs md:text-sm text-red-200 shadow-sm transition-colors hover:bg-red-900/80"
                      title="重置所有设置"
                    >
                      <Trash2 size={16} />
                      <span className="hidden sm:inline pixel-font tracking-wide">重置</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={handleSave}
                  className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_12px_40px_rgba(16,185,129,0.55)] transition-transform hover:translate-y-[1px] hover:shadow-[0_10px_32px_rgba(16,185,129,0.45)] sm:mt-0 sm:w-auto pixel-font tracking-wide"
                >
                  <Save size={18} />
                  {showSuccess ? '已保存!' : '保存配置'}
                </button>
              </div>

              {onLogout && (
                <div className="mt-6 pt-4 border-t border-white/10">
                  <button
                    onClick={() => { onLogout(); onClose(); }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/50 bg-rose-900/30 px-4 py-2.5 text-sm font-medium text-rose-200 hover:bg-rose-900/50 transition-colors pixel-font"
                  >
                    <LogOut size={18} />
                    退出账号
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;