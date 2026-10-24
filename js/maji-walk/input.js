// 帶麻吉去公園：操作
// 手機：在畫面任何地方按住拖曳，按下的地方就是搖桿中心，往哪拖就往哪走（拖越遠走越快）
// 電腦：方向鍵或 WASD；滑鼠按住拖曳也可以
// 回傳 { x, y }：x 往右為正、y 往前為正，長度最多 1

const RADIUS = 56;       // 拖這麼遠就是全速（px）
const DEAD = 0.12;

const KEYS = {
  ArrowUp: [0, 1], KeyW: [0, 1],
  ArrowDown: [0, -1], KeyS: [0, -1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

export function createInput(surface, joy) {
  const knob = joy.firstElementChild;
  const stick = { x: 0, y: 0 };
  const held = new Set();
  let pointer = null;     // { id, x0, y0 }
  let enabled = false;
  let used = false;       // 動過就不再顯示提示

  const showJoy = (x, y) => {
    joy.style.left = `${x}px`;
    joy.style.top = `${y}px`;
    joy.classList.add('show');
  };

  surface.addEventListener('pointerdown', (e) => {
    if (!enabled || pointer || e.target.closest('button')) return;
    const r = surface.getBoundingClientRect();
    pointer = { id: e.pointerId, x0: e.clientX, y0: e.clientY };
    try {
      surface.setPointerCapture(e.pointerId);
    } catch {
      // 拿不到也沒關係，只是手指滑出畫面時比較容易斷掉
    }
    showJoy(e.clientX - r.left, e.clientY - r.top);
    knob.style.transform = '';
  });
  surface.addEventListener('pointermove', (e) => {
    if (!pointer || e.pointerId !== pointer.id) return;
    let dx = (e.clientX - pointer.x0) / RADIUS;
    let dy = (e.clientY - pointer.y0) / RADIUS;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    knob.style.transform = `translate(${dx * RADIUS}px, ${dy * RADIUS}px)`;
    const mag = Math.min(1, len);
    if (mag < DEAD) {
      stick.x = stick.y = 0;
    } else {
      stick.x = dx;
      stick.y = -dy;
      used = true;
    }
  });
  const release = (e) => {
    if (!pointer || e.pointerId !== pointer.id) return;
    pointer = null;
    stick.x = stick.y = 0;
    joy.classList.remove('show');
  };
  surface.addEventListener('pointerup', release);
  surface.addEventListener('pointercancel', release);

  // iPhone：手指按住拖曳就是長按，Safari 會跳出「選取」選單、放大鏡或選起文字，擋住遊戲
  // 光靠 CSS 的 user-select: none 擋不完，直接取消觸控的預設動作；按鈕要留著點擊，不擋
  // 只取消 touch 事件，上面的 pointer 事件照樣會送來
  surface.addEventListener('touchstart', (e) => {
    if (!e.target.closest('button')) e.preventDefault();
  }, { passive: false });
  surface.addEventListener('selectstart', (e) => e.preventDefault());
  surface.addEventListener('contextmenu', (e) => e.preventDefault());

  const onKey = (e) => {
    if (!enabled || !KEYS[e.code]) return;
    e.preventDefault();
    if (e.type === 'keydown') {
      held.add(e.code);
      used = true;
    } else {
      held.delete(e.code);
    }
  };
  // 跟遊戲攔按鍵的地方同一層（window 捕獲階段），才收得到
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKey, true);

  return {
    read() {
      if (held.size) {
        let x = 0;
        let y = 0;
        held.forEach((code) => { x += KEYS[code][0]; y += KEYS[code][1]; });
        const len = Math.hypot(x, y) || 1;
        return { x: x / len, y: y / len };
      }
      return { x: stick.x, y: stick.y };
    },
    enable(on) {
      enabled = on;
      if (!on) {
        held.clear();
        pointer = null;
        stick.x = stick.y = 0;
        joy.classList.remove('show');
      }
    },
    get used() { return used; },
  };
}
