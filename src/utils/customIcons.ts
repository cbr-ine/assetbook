import * as FileSystem from 'expo-file-system';

/**
 * 自定义上传图标的落盘管理（与实物照片 photos.ts 同一套思路）。
 * 相册选图拿到的是缓存 URI，拷进文档目录 icons/ 才留得住；
 * iconKey 形如 custom:<文件URI>，自描述、不需注册表（见 data/icons.ts）。
 */

const DIR = `${FileSystem.documentDirectory}icons/`;

/** 把相册 / 缓存里的图拷进文档目录，返回可长期引用的 URI */
export async function persistCustomIcon(source: string): Promise<string> {
  await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
  const raw = source.split('?')[0].split('.').pop() ?? 'png';
  const ext = raw.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'png';
  const dest = `${DIR}i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await FileSystem.copyAsync({ from: source, to: dest });
  return dest;
}

/** 已上传的自定义图标 URI 列表（按文件名即时间序，新的在前） */
export async function listCustomIcons(): Promise<string[]> {
  try {
    const info = await FileSystem.getInfoAsync(DIR);
    if (!info.exists) return [];
    const names = await FileSystem.readDirectoryAsync(DIR);
    return names.sort().reverse().map((n) => DIR + n);
  } catch {
    return [];
  }
}

/** 删除一个自定义图标文件（正被资产引用时不拦 —— 引用会退回自动匹配） */
export async function removeCustomIcon(uri: string): Promise<void> {
  if (!uri.startsWith(DIR)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    /* 忽略 */
  }
}
