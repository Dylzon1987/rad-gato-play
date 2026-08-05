// ===========================================================================
// main.js — entry point. Grabs DOM handles, boots the game, starts the loop.
// ===========================================================================

import { Game } from './game.js';

const dom = {
  hud:          document.getElementById('hud'),
  hudLevel:     document.getElementById('hud-level'),
  hudScore:     document.getElementById('hud-score'),
  hudCombo:     document.getElementById('hud-combo'),
  hudLives:     document.getElementById('hud-lives'),
  progressFill: document.getElementById('hud-progress-fill'),
  prompt:       document.getElementById('prompt'),
  promptWord:   document.getElementById('prompt-word'),
  overlay:      document.getElementById('overlay'),
  overlayTag:   document.getElementById('overlay-tag'),
  overlayBody:  document.getElementById('overlay-body'),
  overlayBtn:   document.getElementById('overlay-btn'),
  overlayHint:  document.getElementById('overlay-hint'),
  touchHint:    document.getElementById('touch-hint'),
  hero:         document.getElementById('hero'),
  trickPopup:   document.getElementById('trick-popup'),
  fireBanner:   document.getElementById('fire-banner'),
  sentenceBar:  document.getElementById('sentence-bar'),
  sentenceWords:document.getElementById('sentence-words'),
  sentenceEn:   document.getElementById('sentence-en'),
  nowPlaying:   document.getElementById('now-playing'),
  muteBtn:      document.getElementById('hud-mute'),
  narrateBtn:   document.getElementById('hud-narrate'),
  unlock:       document.getElementById('unlock'),
  unlockArt:    document.getElementById('unlock-art'),
  unlockName:   document.getElementById('unlock-name'),
  unlockBlurb:  document.getElementById('unlock-blurb'),
  unlockBtn:    document.getElementById('unlock-btn'),
  unlockEs:     document.getElementById('unlock-es'),
  unlockEn:     document.getElementById('unlock-en'),
  celebrate:    document.getElementById('celebrate'),
  pauseBtn:     document.getElementById('hud-pause'),
  exitBtn:      document.getElementById('hud-exit'),
  pauseExitBtn: document.getElementById('pause-exit-btn'),
  pauseScreen:  document.getElementById('pause-screen'),
  resumeBtn:    document.getElementById('resume-btn'),
  sentenceFlash:   document.getElementById('sentence-flash'),
  sentenceFlashEs: document.getElementById('sentence-flash-es'),
  sentenceFlashEn: document.getElementById('sentence-flash-en'),
};

const canvas = document.getElementById('game');
const game = new Game(canvas, dom);

dom.overlayBtn.addEventListener('click', () => game.onOverlayButton());
dom.unlockBtn.addEventListener('click', (e) => { e.stopPropagation(); game.dismissUnlock(); });

// Sport-select (and legacy level-select) cards are rebuilt with the title card
// each time, so listen on the container rather than on buttons that get
// replaced. Locked / mystery sports are plain <div>s with no data-sport, so
// they're ignored.
dom.overlayBody.addEventListener('click', (e) => {
  const langB = e.target.closest('.lang-btn[data-lang]');
  if (langB && !langB.disabled) { game.setLanguage(langB.dataset.lang); return; }
  const diff = e.target.closest('.diff-btn[data-diff]');
  if (diff) { game.setDifficulty(diff.dataset.diff); return; }
  const sport = e.target.closest('.sport-btn[data-sport]');
  if (sport) { game.jumpToSport(Number(sport.dataset.sport)); return; }
  const btn = e.target.closest('.lvl-btn');
  if (btn) game.jumpToLevel(Number(btn.dataset.level));
  const row = e.target.closest('.gloss-row');
  if (row) { game.sayGloss(row.dataset.es); return; }
  if (e.target.closest('.passport-btn')) game.showPassport();
});

// Sound on/off: HUD button + the M key. The button lives inside the HUD, which
// is pointer-events:none, so stop the click from also reaching the steering
// canvas.
dom.muteBtn.addEventListener('click', (e) => { e.stopPropagation(); game.toggleMute(); });
// Word-narration toggle: HUD button + the N key. Same pointer-events caveat as
// the mute button — it lives inside the pointer-events:none HUD.
dom.narrateBtn.addEventListener('click', (e) => { e.stopPropagation(); game.toggleNarrate(); });
// Pause: HUD button, the P key, or Escape.
dom.pauseBtn.addEventListener('click', (e) => { e.stopPropagation(); game.togglePause(); });
dom.resumeBtn.addEventListener('click', (e) => { e.stopPropagation(); game.resume(); });
// Exit to menu: HUD SALIDA pill + the pause card's SALIDA.
dom.exitBtn.addEventListener('click', (e) => { e.stopPropagation(); game.exitToMenu(); });
dom.pauseExitBtn.addEventListener('click', (e) => { e.stopPropagation(); game.exitToMenu(); });
window.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') game.toggleMute();
  if (e.key === 'n' || e.key === 'N') game.toggleNarrate();
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') game.togglePause();
});
// Apply the setting restored from a previous session to BOTH music and SFX, and
// sync the button label — music.js loads the flag, but audio.js starts unmuted.
game.setMuted(game.music.muted);
// Sync the narration button glyph/label to the restored setting.
game.setNarrate(game.audio.narrate);

game.start();

// Expose for quick debugging in the console.
window.__radgato = game;
