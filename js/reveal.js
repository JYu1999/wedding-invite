// 滾動顯現動畫：區塊進入視窗時淡入（只觸發一次）

export function initReveal() {
  const elements = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -60px 0px' });

  elements.forEach((el) => observer.observe(el));
}
