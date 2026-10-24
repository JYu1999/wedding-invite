// 存在訪客自己瀏覽器裡的小資料：扭蛋圖鑑收集了哪些照片、成就進度、看過哪些操作提示、浮動泡泡的位置
// 無痕模式或封鎖網站資料時 localStorage 可能讀不到、寫不進去，失敗就當作沒存過，網站照常運作

const PREFIX = 'jyu-chi:';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // 存不進去也沒關係，只是下次會再看到一次提示
  }
}

// 操作提示：使用者真的做過一次那個動作之後就不再主動跳出來
export const seen = (key) => load(`seen:${key}`, false) === true;
export const markSeen = (key) => save(`seen:${key}`, true);
