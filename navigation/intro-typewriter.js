export function mountIntroTypewriter() {
  const intro = document.querySelector('.hero-copy .intro');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!intro || reduced.matches || intro.classList.contains('intro-typewriter')) return;

  const text = intro.textContent;
  const characters = Array.from(text);
  // Keep the complete sentence in the layout and accessibility tree throughout.
  const full = document.createElement('span');
  full.className = 'intro-typewriter-full';
  full.textContent = text;
  const typed = document.createElement('span');
  typed.className = 'intro-typewriter-text';
  typed.setAttribute('aria-hidden', 'true');
  intro.replaceChildren(full, typed);
  intro.classList.add('intro-typewriter', 'is-typing');
  let index = 0, timer;

  function finish() {
    clearTimeout(timer);
    typed.textContent = text;
    intro.classList.remove('is-typing');
    reduced.removeEventListener('change', finish);
  }
  function type() {
    typed.textContent += characters[index++];
    if (index === characters.length) {
      intro.classList.remove('is-typing');
      timer = setTimeout(restart, 1800);
      return;
    }
    timer = setTimeout(type, characters[index - 1] === '，' ? 380 : 150);
  }
  function restart() {
    index = 0;
    typed.textContent = '';
    intro.classList.add('is-typing');
    timer = setTimeout(type, 250);
  }
  reduced.addEventListener('change', finish);
  timer = setTimeout(type, 250);
}
