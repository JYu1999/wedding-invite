// 婚禮倒數計時

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const pad = (n) => String(n).padStart(2, '0');

export function initCountdown(targetDate) {
  const fields = {
    days: document.getElementById('days'),
    hours: document.getElementById('hours'),
    minutes: document.getElementById('minutes'),
    seconds: document.getElementById('seconds'),
  };

  const update = () => {
    const diff = targetDate.getTime() - Date.now();
    if (diff <= 0) return;

    const values = {
      days: Math.floor(diff / MS_PER_DAY),
      hours: Math.floor((diff % MS_PER_DAY) / MS_PER_HOUR),
      minutes: Math.floor((diff % MS_PER_HOUR) / MS_PER_MINUTE),
      seconds: Math.floor((diff % MS_PER_MINUTE) / MS_PER_SECOND),
    };
    for (const [key, el] of Object.entries(fields)) {
      if (el) el.textContent = pad(values[key]);
    }
  };

  update();
  setInterval(update, MS_PER_SECOND);
}
