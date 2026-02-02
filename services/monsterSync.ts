import { GenMon } from '../types';

const BACKEND_BASE_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:4000';
const USERNAME_KEY = 'GENMON_USERNAME';

/**
 * 获取当前登录用户名
 */
const getCurrentUsername = (): string | null => {
  return localStorage.getItem(USERNAME_KEY);
};

/**
 * 同步精灵到当前用户的精灵仓库
 * @param monster 要同步的精灵数据
 * @returns Promise<boolean> 是否同步成功
 */
export const syncMonsterToServer = async (monster: GenMon): Promise<boolean> => {
  const username = getCurrentUsername();
  if (!username) {
    console.warn('未登录，精灵不同步到服务器');
    return false;
  }

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/monsters/${encodeURIComponent(username)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(monster),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('精灵已同步到服务器:', monster.name, data);
      return true;
    } else {
      const error = await response.json();
      console.error('同步精灵失败:', error);
      return false;
    }
  } catch (error) {
    console.error('同步精灵到服务器时出错:', error);
    // 静默失败，不影响游戏流程
    return false;
  }
};

/**
 * 获取当前用户的精灵仓库列表
 * @returns 精灵列表，或 null（未登录/请求失败）
 */
export const getUserMonsters = async (): Promise<{ id: number; name: string; element: string; description: string | null; imageUrl: string | null; data: unknown; createdAt: string }[] | null> => {
  const username = getCurrentUsername();
  if (!username) {
    return null;
  }
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/monsters/${encodeURIComponent(username)}`);
    if (!response.ok) return null;
    const json = await response.json();
    return json.monsters ?? null;
  } catch (error) {
    console.error('获取精灵仓库失败:', error);
    return null;
  }
};
