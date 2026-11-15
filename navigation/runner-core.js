// Simulation uses seconds and world pixels; rendering and input stay in the adapter.
export class Runner {
  constructor(random = Math.random) {
    this.random = random;
    this.width = 960;
    this.ground = 206;
    this.playerX = 72;
    this.obstacles = Array.from({ length: 8 }, () => ({ active: false }));
    this.state = 'ready';
    this.speed = 6;
    this.distance = this.score = this.elapsed = this.y = this.vy = 0;
    this.jumpHeld = this.duck = false;
    this.deadAt = -Infinity;
    this.lastKind = '';
    this.streak = 0;
    this.lastVariant = this.variantStreak = 0;
  }

  resize(width, ground) {
    const previousX = this.playerX;
    const ratio = Math.min(1, width / 720) / Math.min(1, this.width / 720);
    this.width = width;
    this.ground = ground;
    this.playerX = Math.min(96, width * .14);
    // Preserve reaction time when a phone rotates or a window changes size.
    for (const o of this.obstacles) if (o.active) o.x = this.playerX + (o.x - previousX) * ratio;
    if (Number.isFinite(this.nextSpawn)) this.nextSpawn *= ratio;
  }

  start(now = 0) {
    if (this.state === 'over' && now - this.deadAt < 500) return false;
    this.state = 'running';
    this.speed = 6;
    this.distance = this.score = this.elapsed = this.y = this.vy = this.jumpAge = 0;
    this.jumpHeld = this.duck = false;
    this.nextSpawn = 0;
    this.lastKind = '';
    this.streak = 0;
    this.lastVariant = this.variantStreak = 0;
    for (const obstacle of this.obstacles) obstacle.active = false;
    return true;
  }

  jump() {
    if (this.state !== 'running' || this.y > 0) return false;
    this.duck = false;
    this.jumpHeld = true;
    this.jumpAge = 0;
    this.vy = -570;
    this.y = .01;
    return true;
  }

  get velocity() { return this.speed * 60 * Math.min(1, this.width / 720); }
  get night() { return Math.floor(this.score / 700) % 2 === 1; }

  spawn() {
    const o = this.obstacles.find(item => !item.active);
    if (!o) return;
    const birds = this.score >= 450;
    let kind = birds && this.random() < .32 ? 'bird' : 'cactus';
    if (birds && this.streak >= 3 && kind === this.lastKind) kind = kind === 'bird' ? 'cactus' : 'bird';
    const previousBird = this.lastKind === 'bird';
    this.streak = kind === this.lastKind ? this.streak + 1 : 1;
    this.lastKind = kind;
    o.kind = kind;
    o.active = true;
    o.x = this.width + 32;
    if (kind === 'bird') {
      o.level = Math.floor(this.random() * 3);
      o.bottom = [3, 26, 65][o.level];
      o.width = 48;
      o.height = 20;
      o.count = 1;
    } else {
      o.count = 1 + Math.floor(this.random() * (this.width < 600 ? 2 : 3));
      o.height = this.random() < .45 ? 48 : 34;
      let variant = o.count * 100 + o.height;
      if (variant === this.lastVariant && this.variantStreak >= 3) {
        o.height = o.height === 48 ? 34 : 48;
        variant = o.count * 100 + o.height;
      }
      this.variantStreak = variant === this.lastVariant ? this.variantStreak + 1 : 1;
      this.lastVariant = variant;
      o.width = o.count * 22;
      o.bottom = 0;
    }
    // Edge-to-edge spacing includes a full jump plus reaction time. Bird
    // transitions get extra room, including at maximum speed on narrow screens.
    this.nextSpawn = o.width + this.velocity * (1.15 + this.random() * .4 + (previousBird || kind === 'bird' ? .3 : 0));
  }

  overlaps(x, y, w, h, ox, oy, ow, oh) {
    return x < ox + ow && x + w > ox && y < oy + oh && y + h > oy;
  }

  collides(o) {
    const px = this.playerX, foot = this.ground - this.y;
    const ox = o.x + (o.kind === 'bird' ? 9 : 4);
    const oy = this.ground - o.bottom - o.height + (o.kind === 'bird' ? 5 : 3);
    const ow = o.width - (o.kind === 'bird' ? 18 : 8);
    const oh = o.height - (o.kind === 'bird' ? 8 : 3);
    if (this.duck && this.y === 0) return this.overlaps(px + 7, foot - 21, 43, 18, ox, oy, ow, oh);
    if (this.y > 0) return this.overlaps(px + 14, foot - 33, 20, 29, ox, oy, ow, oh) || this.overlaps(px + 25, foot - 45, 20, 19, ox, oy, ow, oh);
    return this.overlaps(px + 12, foot - 32, 22, 29, ox, oy, ow, oh) || this.overlaps(px + 25, foot - 45, 20, 19, ox, oy, ow, oh);
  }

  update(dt, now) {
    if (this.state !== 'running') return;
    this.elapsed += dt;
    this.speed = Math.min(13, this.speed + .06 * dt);
    const travel = this.velocity * dt;
    this.distance += travel;
    this.score = Math.floor(this.distance * .025);
    if (this.y > 0) {
      this.jumpAge += dt;
      // A tap always clears a small cactus; holding adds height and airtime.
      if (!this.jumpHeld && this.y >= 44 && this.vy < -210) this.vy = -210;
      if (this.duck) this.vy = Math.max(300, this.vy);
      this.vy += (this.duck ? 3400 : this.jumpHeld && this.jumpAge < .18 ? 1050 : 2000) * dt;
      this.y = Math.max(0, this.y - this.vy * dt);
      if (this.y === 0) this.vy = 0;
    }
    for (const o of this.obstacles) {
      if (!o.active) continue;
      o.x -= travel;
      if (o.x + o.width < 0) o.active = false;
      else if (this.collides(o)) {
        this.state = 'over';
        this.deadAt = now;
        this.jumpHeld = this.duck = false;
        return;
      }
    }
    if (this.elapsed >= 3) {
      this.nextSpawn -= travel;
      if (this.nextSpawn <= 0) this.spawn();
    }
  }
}
