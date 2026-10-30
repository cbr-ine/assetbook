import * as FileSystem from 'expo-file-system';

/**
 * 实物照片的落盘管理。
 * 相册选图拿到的 URI 落在系统缓存目录，系统清缓存 / 重装后就会变成加载不出的死链；
 * 这里把图拷进应用的文档目录（photos/），跟着 app 走，卸载才会删。
 */

const DIR = `${FileSystem.documentDirectory}photos/`;

/** 是否已是文档目录里的受管照片 */
export function isManagedPhoto(uri?: string | null): boolean {
  return !!uri && uri.startsWith(DIR);
}

/** 把相册 / 缓存里的图拷进文档目录，返回新 URI（受管，可随 removeManagedPhoto 清理）。 */
export async function persistPhoto(source: string): Promise<string> {
  await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
  const raw = source.split('?')[0].split('.').pop() ?? 'jpg';
  const ext = raw.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';
  const dest = `${DIR}p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await FileSystem.copyAsync({ from: source, to: dest });
  return dest;
}

/** 旧图是受管照片时删掉，防文档目录积孤儿文件；失败不声张（顶多留一个孤儿）。 */
export async function removeManagedPhoto(uri?: string | null): Promise<void> {
  if (!isManagedPhoto(uri) || uri == null) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    /* 留着也无妨 */
  }
}

/** 整目录清空：清空账本 / 整本导入（旧资产全被替换）时，照片文件一并回收。 */
export async function clearManagedPhotos(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(DIR);
    if (info.exists) await FileSystem.deleteAsync(DIR, { idempotent: true });
  } catch {
    /* 忽略 */
  }
}

/** 旧数据的惰性迁移：编辑时发现照片还躺在缓存目录，顺手搬进文档目录。搬不动维持原样。 */
export async function migratePhotoIfNeeded(uri?: string): Promise<string | undefined> {
  if (!uri) return undefined;
  const cache = FileSystem.cacheDirectory;
  if (cache && uri.startsWith(cache)) {
    try {
      return await persistPhoto(uri);
    } catch {
      return uri;
    }
  }
  return uri;
}
