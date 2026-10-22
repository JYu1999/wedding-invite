// 開場拆信封：open（掀蓋）→ pulling（信紙從袋中抽出，仍被袋身遮擋）→ pulled（信紙移到最前方放大）

const PULL_START_MS = 700;   // 封蓋翻開後開始抽信
const PULLED_MS = 2150;      // 信紙完全離開信封
const AUTO_ENTER_MS = 5300;  // 保留閱讀時間後自動進入首頁

export function initIntro({ onOpen } = {}) {
  const overlay = document.getElementById('intro-overlay');
  const envelope = document.getElementById('envelopeBox');
  if (!overlay || !envelope) return;

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    overlay.classList.add('fade-out');
  };

  overlay.addEventListener('click', () => {
    // 信紙完全抽出後，再點一下可直接進入首頁
    if (envelope.classList.contains('pulled')) {
      finish();
      return;
    }
    if (overlay.classList.contains('opening')) return;

    overlay.classList.add('opening');
    envelope.classList.add('open');
    onOpen?.();

    setTimeout(() => envelope.classList.add('pulling'), PULL_START_MS);
    setTimeout(() => envelope.classList.add('pulled'), PULLED_MS);
    setTimeout(finish, AUTO_ENTER_MS);
  });
}
