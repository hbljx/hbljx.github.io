const DAY = 86400000;
const calendarDay = date => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY;

// Calendar days include today. Weeks start on Monday in the visitor's local time.
export function getCountdownPeriods(now = new Date()) {
  const year = now.getFullYear(), month = now.getMonth(), day = now.getDate();
  const monday = day - (now.getDay() + 6) % 7;
  const periods = {
    week: [new Date(year, month, monday), new Date(year, month, monday + 7)],
    month: [new Date(year, month, 1), new Date(year, month + 1, 1)],
    year: [new Date(year, 0, 1), new Date(year + 1, 0, 1)],
  };
  return Object.fromEntries(Object.entries(periods).map(([key, [start, end]]) => [key, {
    days: calendarDay(end) - calendarDay(now),
    percent: Math.min(100, Math.max(0, (end - now) / (end - start) * 100)),
  }]));
}

export function mountAboutCountdown() {
  const section = document.querySelector('.about-countdown');
  if (!section) return;
  const cards = [...section.querySelectorAll('[data-countdown]')];
  let timer;
  function refresh() {
    clearTimeout(timer);
    if (document.hidden) return;
    const now = new Date(), periods = getCountdownPeriods(now);
    for (const card of cards) {
      const { days, percent } = periods[card.dataset.countdown];
      // Avoid showing 100% after the start or 0% before the period ends.
      const display = percent === 100 ? '100' : Math.min(99.9, Math.max(0.1, percent)).toFixed(1);
      card.querySelector('[data-days]').textContent = days;
      card.querySelector('[data-percent]').textContent = `${display}%`;
      const progress = card.querySelector('[role="progressbar"]');
      progress.setAttribute('aria-valuenow', display);
      progress.setAttribute('aria-valuetext', `剩余 ${days} 天，${display}%`);
      progress.style.setProperty('--remaining', `${percent}%`);
    }
    // Refresh on the minute, including midnight; resume immediately after a hidden tab.
    timer = setTimeout(refresh, 60000 - now.getTime() % 60000);
  }
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('pageshow', refresh);
  window.addEventListener('pagehide', () => clearTimeout(timer));
  refresh();
}
