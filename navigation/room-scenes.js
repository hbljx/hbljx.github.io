const positions = {
  about: '50% 55%',
  works: '49% 52%',
  writing: '50% 50%',
  coffee: '54% 54%',
  lab: '50% 56%',
  court: '52% 51%',
  pool: '51% 54%',
};

export function createRoomFrame(image, id) {
  const source = new URL('../assets/scenes/' + id + '.webp', import.meta.url).href;
  image.style.objectPosition = positions[id];
  return progress => {
    if (!image.hasAttribute('src')) image.src = source;
    const focus = Math.min(1, progress / .78);
    image.style.setProperty('--camera-scale', 1.21 - focus * .16);
    image.style.setProperty('--camera-y', (focus - .5) * 4 + '%');
  };
}
