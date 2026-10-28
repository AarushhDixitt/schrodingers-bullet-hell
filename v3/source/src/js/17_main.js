// ---------- boot & main loop ----------
let lastFrame = 0, errorShown = false;
function loop(now) {
  const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 1 / 60;
  lastFrame = now;
  try { Game.frame(dt); }
  catch (e) {
    console.error(e);
    if (!errorShown) { errorShown = true; UI.toast('Something broke: ' + (e && e.message ? e.message : e)); }
  }
  adaptQuality(dt * 1000);
  requestAnimationFrame(loop);
}

async function boot() {
  Save.load(); Audio2.loadFiles();
  setupRenderer();
  initInput($('stage'));
  Game.init();
  UI.init();
  Calib.init(); applyLook();
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resizeRenderer, 60); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resizeRenderer, 60); });
  try {
    if (document.fonts && document.fonts.load) {
      await Promise.race([
        Promise.all(['400 16px Qtext', 'italic 400 16px Qtext', '700 16px Qtext', 'italic 700 16px Qtext', '400 16px Qmath', '500 16px Qmono', '700 16px Qmono'].map(f => document.fonts.load(f, 'Aψ⟩'))),
        new Promise(r => setTimeout(r, 1500)),
      ]);
    }
  } catch (e) { /* fonts optional */ }
  Game.newRun('attract');
  $('boot').hidden = true;
  requestAnimationFrame(loop);
}

// test & debug handle
window.QCAT = {
  Game, Player, Bullets, Anom, Director, Bot, FX, Grid, R, cam, Audio2, UI, Settings, ANOMS: LAWS, LAWS, BOSS_DEFS, EB, PB, Fields, ET, Input, Save, Mods, Theme, Screens, PERKS, UPGRADES, ACH, GROUPS, Holes, Events, ELITE_IDS, EVENT_IDS, Calib, Splits, SCHOOLS, Tutorial, Guide, Feed, TouchLayout,
  debug: {
    start(n = 1, mode = 'arcade', opts) { UI.start(n, mode, opts); },
    bot(on = true) { Bot.on = on; },
    god(on = true) { Game._god = on; if (on) Player.invuln = 1e9; else Player.invuln = 0; },
    speed(x = 1) { Game.debugSpeed = x; },
    fps(on = true) { Game.showFps = on; },
    anom(ids) { Anom.set(ids); },
    boss(k) { Game.removeBoss(); Game.spawnBoss(k, 0); Director.phase = 'boss'; },
    // simulate without rendering (for tests)
    ff(sec, renderLast = true) {
      Game.noRender = true;
      const t0 = performance.now();
      const n = Math.round(sec * 60);
      for (let i = 0; i < n; i++) { if (Game.state !== 'playing' && Game.state !== 'title') break; Game.frame(1 / 60); }
      Game.noRender = false;
      if (renderLast) Game.render();
      return { ms: Math.round(performance.now() - t0), t: +Game.t.toFixed(2), wave: Game.wave, phase: Director.phase, score: Game.score, lives: Game.lives, state: Game.state, en: Game.enemies.length, eb: EB.n, n: Player.n };
    },
  },
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
