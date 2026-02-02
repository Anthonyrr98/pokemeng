import { Biome, ElementType, GenMon } from "../types";
import { v4 as uuidv4 } from 'uuid';

const CUSTOM_KEY_STORAGE_KEY = 'GENMON_CUSTOM_API_KEY';
const CUSTOM_BASE_URL_STORAGE_KEY = 'GENMON_CUSTOM_BASE_URL';
const CUSTOM_TEXT_MODEL_KEY = 'GENMON_CUSTOM_TEXT_MODEL';
const CUSTOM_IMAGE_MODEL_KEY = 'GENMON_CUSTOM_IMAGE_MODEL';

// SiliconFlow Configuration Defaults
const DEFAULT_BASE_URL = "https://api.siliconflow.cn/v1";
const DEFAULT_TEXT_MODEL = "deepseek-ai/DeepSeek-V3";
const DEFAULT_IMAGE_MODEL = "black-forest-labs/FLUX.1-schnell";

// Fallback image (Pixel Art "Missing No" style or simple placeholder)
const FALLBACK_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAFNJREFUeF7t00ERAAAIhKD3T+3g4IiEA2vbYSe7FwECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIPABGwUpAAH/a+1OAAAAAElFTkSuQmCC";

const getConfig = () => {
    const apiKey = localStorage.getItem(CUSTOM_KEY_STORAGE_KEY) || process.env.API_KEY || "";
    let baseUrl = localStorage.getItem(CUSTOM_BASE_URL_STORAGE_KEY) || DEFAULT_BASE_URL;
    
    // Clean up
    baseUrl = baseUrl.trim().replace(/\/+$/, ""); 

    // Auto-fix for common SiliconFlow misconfiguration
    // If user enters "https://api.siliconflow.cn" without "/v1", append it automatically
    if (baseUrl === "https://api.siliconflow.cn") {
        baseUrl += "/v1";
    }
    
    return { apiKey, baseUrl };
};

const getModelName = (type: 'text' | 'image'): string => {
    const key = type === 'text' ? CUSTOM_TEXT_MODEL_KEY : CUSTOM_IMAGE_MODEL_KEY;
    const defaultModel = type === 'text' ? DEFAULT_TEXT_MODEL : DEFAULT_IMAGE_MODEL;
    return localStorage.getItem(key) || defaultModel;
};

// JSON Schema for Monster Generation (passed in system prompt)
const MONSTER_SCHEMA_DESC = `
{
  "name": "string (Simplified Chinese)",
  "element": "string (one of: ${Object.values(ElementType).join(', ')})",
  "description": "string (Simplified Chinese)",
  "visualPrompt": "string (English, detailed pixel art description)",
  "stats": {
    "maxHp": "integer (40-150)",
    "attack": "integer (30-120)",
    "defense": "integer (30-120)",
    "spAttack": "integer (30-120)",
    "spDefense": "integer (30-120)",
    "speed": "integer (30-120)"
  },
  "moves": [
    { 
      "name": "string (Simplified Chinese)", 
      "type": "string (Element)", 
      "power": "integer (20-100)", 
      "accuracy": "integer (70-100)" 
    }
  ],
  "evolution": {
    "nextStage": "string (optional)",
    "condition": "string (optional)"
  }
}
`;

// Helper for API calls
const callApi = async (endpoint: string, body: any, retryCount = 0): Promise<any> => {
    const { apiKey, baseUrl } = getConfig();
    
    if (!apiKey) {
        throw new Error("API Key not configured. Please set it in Settings.");
    }

    try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            // Rate limit handling
            if (response.status === 429 && retryCount < 3) {
                 console.warn(`Rate limit hit, retrying... (${retryCount + 1})`);
                 await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
                 return callApi(endpoint, body, retryCount + 1);
            }
            throw new Error(`API Error (${response.status}): ${errText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("API Call Failed:", error);
        throw error;
    }
};

export const generateMonster = async (
  biome: Biome | 'STARTER' | 'CUSTOM', 
  preferredElement?: ElementType, 
  isBoss: boolean = false,
  customPromptText?: string,
  isRegionalBoss: boolean = false
): Promise<GenMon> => {
  const model = getModelName('text');
  
  let userPrompt = "";
  if (biome === 'STARTER') {
    userPrompt = `Create a cute, basic stage 1 starter monster of type ${preferredElement}.`;
  } else if (biome === 'CUSTOM') {
    userPrompt = `Create a unique monster based on: "${customPromptText}". ${preferredElement ? `Type: ${preferredElement}.` : ''}`;
  } else if (isBoss) {
    userPrompt = `Create a powerful, fully evolved Boss monster for a Gym Battle. High stats.`;
  } else if (isRegionalBoss) {
    userPrompt = `Create a powerful Boss monster that rules the ${biome} region. High stats, imposing.`;
  } else {
    userPrompt = `Create a wild monster found in ${biome}.`;
  }

  const systemPrompt = `You are a game designer. Create a balanced monster.
IMPORTANT: Return ONLY valid JSON matching this schema: ${MONSTER_SCHEMA_DESC}
1. 'name', 'description', 'moves' MUST be Simplified Chinese.
2. 'visualPrompt' MUST be English.
3. 'element' MUST be valid enum value.`;

  try {
    const data = await callApi('/chat/completions', {
        model: model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }, // Attempt to enforce JSON
        temperature: 0.8
    });

    const content = data.choices[0].message.content;
    const jsonStr = content.replace(/```json\n?|\n?```/g, ''); // Clean markdown
    const monData = JSON.parse(jsonStr);

    const bossLevel = isBoss || isRegionalBoss ? 25 : 5;
    return {
      id: uuidv4(),
      name: monData.name,
      element: monData.element as ElementType,
      description: monData.description,
      visualPrompt: monData.visualPrompt,
      level: bossLevel,
      exp: 0,
      stats: {
        ...monData.stats,
        currentHp: monData.stats.maxHp
      },
      moves: monData.moves,
      evolution: monData.evolution
    };

  } catch (error) {
    console.error("Failed to generate monster:", error);
    // Fallback
    return {
      id: uuidv4(),
      name: "连接兽",
      element: ElementType.Electric,
      description: "当API连接断开时出现的神秘生物。",
      visualPrompt: "A glitchy robot with electric sparks, pixel art",
      level: 5,
      exp: 0,
      stats: { maxHp: 60, currentHp: 60, attack: 50, defense: 50, spAttack: 50, spDefense: 50, speed: 60 },
      moves: [{ name: "重连", type: ElementType.Electric, power: 40, accuracy: 100 }]
    };
  }
};

export const evolveMonster = async (baseMonster: GenMon): Promise<GenMon> => {
  const model = getModelName('text');
  
  const userPrompt = `
    The monster "${baseMonster.name}" is evolving! 
    Current Desc: ${baseMonster.description}.
    Element: ${baseMonster.element}.
    Target: ${baseMonster.evolution?.nextStage || 'Unknown'}.
    Create the evolved form (larger, stronger).
  `;

  const systemPrompt = `You are a game designer. Evolve the monster.
Return ONLY valid JSON matching this schema: ${MONSTER_SCHEMA_DESC}
Stats should be higher than: HP ${baseMonster.stats.maxHp}, Atk ${baseMonster.stats.attack}.`;

  try {
    const data = await callApi('/chat/completions', {
        model: model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8
    });

    const content = data.choices[0].message.content;
    const jsonStr = content.replace(/```json\n?|\n?```/g, '');
    const monData = JSON.parse(jsonStr);
    
    return {
      id: uuidv4(),
      name: monData.name,
      element: monData.element as ElementType,
      description: monData.description,
      visualPrompt: monData.visualPrompt,
      level: baseMonster.level + 1,
      exp: 0,
      stats: { ...monData.stats, currentHp: monData.stats.maxHp },
      moves: monData.moves,
      evolution: monData.evolution
    };
  } catch (error) {
    console.error("Evolution failed:", error);
    throw error;
  }
};

export const generateMonsterImage = async (visualPrompt: string): Promise<string> => {
  const model = getModelName('image');
  
  // SiliconFlow / OpenAI Image API
  try {
      const response = await callApi('/images/generations', {
          model: model,
          prompt: `pixel art sprite of a game monster, transparent background, no background, 8-bit style, retro aesthetic, flat colors, high contrast: ${visualPrompt}`,
          image_size: "1024x1024", // Standard for Flux/SDXL
          batch_size: 1,
          num_inference_steps: 20 // Optional optimization for Flux-schnell
      });

      // Handle standard OpenAI image response
      if (response.data && response.data.length > 0) {
          const imgObj = response.data[0];
          // Prefer b64_json if available (avoids CORS), else url
          // Note: SiliconFlow often returns 'url'. 
          // If using 'url', ensure the backend supports CORS or use a proxy. 
          // SiliconFlow URLs are usually accessible.
          if (imgObj.url) return imgObj.url;
          if (imgObj.b64_json) return `data:image/png;base64,${imgObj.b64_json}`;
      }
      console.warn("API response format unexpected:", response);
      return FALLBACK_IMAGE;

  } catch (e) {
      console.warn("Image generation failed:", e);
      // Return fallback so the UI doesn't hang forever
      return FALLBACK_IMAGE; 
  }
};