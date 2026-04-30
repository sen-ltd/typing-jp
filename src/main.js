/**
 * main.js — DOM, events, rendering, and game flow for Typing JP.
 */

import { tokenize, validateInput, calculateWPM, calculateAccuracy } from './typing.js';
import { WORD_SETS, shuffle, randomItem } from './words.js';
import { t, setLang, getLang } from './i18n.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const TIME_ATTACK_SECONDS = 60;
const ENDURANCE_MAX_MISTAKES = 3;
const STORAGE_KEY = 'typing-jp-highscores';

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  mode: 'practice',      // 'practice' | 'timeattack' | 'endurance'
  wordSet: 'words',      // 'basic' | 'words' | 'sentences'
  phase: 'ready',        // 'ready' | 'playing' | 'finished'
  queue: [],             // array of { kana, meaning? }
  queueIdx: 0,
  tokens: [],
  inputBuffer: '',
  completedTokens: 0,
  // Stats
  correctKeystrokes: 0,
  totalKeystrokes: 0,
  wordsCompleted: 0,
  charsCompleted: 0,
  mistakes: 0,
  startTime: null,
  elapsed: 0,
  timeLeft: TIME_ATTACK_SECONDS,
  timerHandle: null,
};

// ─── DOM refs (populated in init) ────────────────────────────────────────────
const el = {};

// ─── High scores ──────────────────────────────────────────────────────────────
function loadHighScores() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveHighScore(mode, wordSet, score) {
  const hs = loadHighScores();
  const key = `${mode}:${wordSet}`;
  const prev = hs[key] || 0;
  if (score > prev) {
    hs[key] = score;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hs));
    return true; // new high score
  }
  return false;
}

function getHighScore(mode, wordSet) {
  const hs = loadHighScores();
  return hs[`${mode}:${wordSet}`] || 0;
}

// ─── Queue building ───────────────────────────────────────────────────────────
function buildQueue(wordSet) {
  if (wordSet === 'basic') {
    return shuffle(WORD_SETS.basic).map(kana => ({ kana, meaning: null }));
  }
  return shuffle(WORD_SETS[wordSet]).map(item => ({ kana: item.kana, meaning: item.meaning }));
}

// ─── Rendering ────────────────────────────────────────────────────────────────
function renderUI() {
  // Tab labels
  el.tabPractice.textContent = t('modePractice');
  el.tabTimeAttack.textContent = t('modeTimeAttack');
  el.tabEndurance.textContent = t('modeEndurance');
  el.tabBasic.textContent = t('setBasic');
  el.tabWords.textContent = t('setWords');
  el.tabSentences.textContent = t('setSentences');
  el.btnStart.textContent = state.phase === 'playing' ? t('btnStop') : t('btnStart');
  el.labelWPM.textContent = t('labelWPM');
  el.labelAccuracy.textContent = t('labelAccuracy');
  el.labelHS.textContent = t('labelHighScore');

  // Time/mistakes label depending on mode
  if (state.mode === 'timeattack') {
    el.labelExtra.textContent = t('labelTime');
  } else if (state.mode === 'endurance') {
    el.labelExtra.textContent = t('labelMistakes');
  } else {
    el.labelExtra.textContent = '';
  }

  // High score
  el.hsValue.textContent = getHighScore(state.mode, state.wordSet);

  // Ready hint visible only in 'ready' phase (not while typing or after end)
  if (el.readyHint) {
    el.readyHint.textContent = t('statusReady');
    el.readyHint.style.display = state.phase === 'ready' ? '' : 'none';
  }
}

function renderKanaDisplay() {
  const item = state.queue[state.queueIdx];
  if (!item) {
    el.kanaDisplay.textContent = '—';
    el.meaningDisplay.textContent = '';
    el.hintDisplay.textContent = '';
    return;
  }

  const { kana, meaning } = item;
  const tokens = state.tokens;

  // Build character-by-character highlighted display
  let html = '';
  let tokenIdx = 0;
  let charPos = 0;

  // We'll highlight per-token: completed = green, current = yellow, pending = white
  while (charPos < kana.length && tokenIdx < tokens.length) {
    const tok = tokens[tokenIdx];
    const kanaChars = tok.kana;
    const len = kanaChars.length;

    let cls = 'char-pending';
    if (tokenIdx < state.completedTokens) {
      cls = 'char-done';
    } else if (tokenIdx === state.completedTokens) {
      cls = 'char-current';
    }

    html += `<span class="${cls}">${kanaChars}</span>`;
    charPos += len;
    tokenIdx++;
  }

  el.kanaDisplay.innerHTML = html;

  // Romaji hint: show the first valid romaji for the current token
  if (state.completedTokens < tokens.length) {
    const currentToken = tokens[state.completedTokens];
    el.hintDisplay.textContent = `${t('hintLabel')}: ${currentToken.romaji[0]}`;
  } else {
    el.hintDisplay.textContent = '';
  }

  // Meaning
  if (meaning) {
    el.meaningDisplay.textContent = `${t('meaningLabel')}: ${meaning}`;
  } else {
    el.meaningDisplay.textContent = '';
  }
}

function renderInput() {
  // Show typed characters with correct/wrong coloring
  const validation = validateInput(state.tokens, state.inputBuffer);
  const buf = state.inputBuffer;

  if (buf.length === 0) {
    el.inputDisplay.innerHTML = '<span class="cursor">|</span>';
    return;
  }

  let html = '';
  const progress = validation.currentProgress;
  const extra = buf.slice(progress.length);

  if (validation.isCorrect) {
    html = `<span class="input-correct">${escHtml(progress)}</span>`;
    if (extra) {
      html += `<span class="input-partial">${escHtml(extra)}</span>`;
    }
  } else {
    html = `<span class="input-correct">${escHtml(progress)}</span>`;
    html += `<span class="input-wrong">${escHtml(extra)}</span>`;
  }

  html += '<span class="cursor">|</span>';
  el.inputDisplay.innerHTML = html;
}

function renderStats() {
  const elapsed = state.startTime ? Date.now() - state.startTime : 0;
  const wpm = calculateWPM(state.charsCompleted, elapsed);
  const acc = calculateAccuracy(state.correctKeystrokes, state.totalKeystrokes);

  el.wpmValue.textContent = wpm;
  el.accValue.textContent = acc + '%';

  if (state.mode === 'timeattack') {
    el.extraValue.textContent = state.timeLeft + 's';
  } else if (state.mode === 'endurance') {
    el.extraValue.textContent = `${state.mistakes} / ${ENDURANCE_MAX_MISTAKES}`;
  } else {
    el.extraValue.textContent = state.wordsCompleted;
  }
}

function renderResults(isNewHS) {
  const elapsed = state.elapsed || (state.startTime ? Date.now() - state.startTime : 0);
  const wpm = calculateWPM(state.charsCompleted, elapsed);
  const acc = calculateAccuracy(state.correctKeystrokes, state.totalKeystrokes);

  let html = `<h2 class="results-title">${t('resultsTitle')}</h2>`;
  if (isNewHS) {
    html += `<p class="new-hs">${t('resultNewHighScore')}</p>`;
  }
  html += `<div class="results-grid">`;
  html += `<div class="result-item"><span class="result-label">${t('resultWords')}</span><span class="result-value">${state.wordsCompleted}</span></div>`;
  html += `<div class="result-item"><span class="result-label">${t('resultChars')}</span><span class="result-value">${state.charsCompleted}</span></div>`;
  html += `<div class="result-item"><span class="result-label">${t('resultWPM')}</span><span class="result-value">${wpm}</span></div>`;
  html += `<div class="result-item"><span class="result-label">${t('resultAccuracy')}</span><span class="result-value">${acc}%</span></div>`;
  html += `</div>`;
  html += `<button id="btn-restart" class="btn-primary">${t('btnRestart')}</button>`;

  el.overlay.innerHTML = html;
  el.overlay.classList.remove('hidden');
  el.overlay.querySelector('#btn-restart').addEventListener('click', restartGame);
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Game logic ───────────────────────────────────────────────────────────────
function startGame() {
  clearInterval(state.timerHandle);

  state.queue = buildQueue(state.wordSet);
  state.queueIdx = 0;
  state.inputBuffer = '';
  state.completedTokens = 0;
  state.correctKeystrokes = 0;
  state.totalKeystrokes = 0;
  state.wordsCompleted = 0;
  state.charsCompleted = 0;
  state.mistakes = 0;
  state.startTime = Date.now();
  state.elapsed = 0;
  state.timeLeft = TIME_ATTACK_SECONDS;
  state.phase = 'playing';

  loadCurrentWord();

  if (state.mode === 'timeattack') {
    state.timerHandle = setInterval(() => {
      state.timeLeft--;
      renderStats();
      if (state.timeLeft <= 0) {
        endGame();
      }
    }, 1000);
  }

  el.inputArea.focus();
  el.overlay.classList.add('hidden');
  renderUI();
  renderStats();
  renderKanaDisplay();
  renderInput();
}

function loadCurrentWord() {
  const item = state.queue[state.queueIdx];
  if (!item) {
    endGame();
    return;
  }
  state.tokens = tokenize(item.kana);
  state.completedTokens = 0;
  state.inputBuffer = '';
  renderKanaDisplay();
  renderInput();
}

function nextWord() {
  state.wordsCompleted++;
  state.charsCompleted += state.queue[state.queueIdx].kana.length;
  state.queueIdx++;

  // If we've exhausted the queue in practice/endurance, cycle back (reshuffled)
  if (state.queueIdx >= state.queue.length) {
    if (state.mode === 'practice' || state.mode === 'endurance') {
      state.queue = [...state.queue, ...buildQueue(state.wordSet)];
    } else {
      // Time attack can also cycle
      state.queue = [...state.queue, ...buildQueue(state.wordSet)];
    }
  }

  loadCurrentWord();
  renderStats();
}

function endGame() {
  clearInterval(state.timerHandle);
  state.elapsed = state.startTime ? Date.now() - state.startTime : 0;
  state.phase = 'finished';

  // Compute score: WPM * accuracy for time attack / endurance; word count for practice
  let score;
  if (state.mode === 'practice') {
    score = state.wordsCompleted;
  } else {
    const wpm = calculateWPM(state.charsCompleted, state.elapsed);
    const acc = calculateAccuracy(state.correctKeystrokes, state.totalKeystrokes);
    score = Math.round(wpm * (acc / 100));
  }

  const isNewHS = saveHighScore(state.mode, state.wordSet, score);
  renderUI();
  renderResults(isNewHS);
}

function restartGame() {
  el.overlay.classList.add('hidden');
  startGame();
}

function stopGame() {
  if (state.phase === 'playing') {
    endGame();
  }
}

// ─── Input handling ───────────────────────────────────────────────────────────
function handleInput(e) {
  if (state.phase !== 'playing') return;

  const key = e.key;

  // Ignore modifier keys, function keys, etc.
  if (key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) {
    if (key === 'Backspace') {
      state.inputBuffer = state.inputBuffer.slice(0, -1);
      renderInput();
    }
    return;
  }

  // Only accept printable ASCII (romaji input)
  if (!/^[\x20-\x7E]$/.test(key)) return;

  const candidate = state.inputBuffer + key;
  state.totalKeystrokes++;

  const validation = validateInput(state.tokens, candidate);

  if (validation.isCorrect) {
    state.correctKeystrokes++;
    state.inputBuffer = candidate;
    state.completedTokens = validation.completed;

    if (validation.isComplete) {
      nextWord();
    } else {
      renderKanaDisplay();
      renderInput();
    }
  } else {
    // Wrong key — show error briefly, increment mistakes
    state.mistakes++;
    state.inputBuffer = candidate;

    if (state.mode === 'endurance' && state.mistakes >= ENDURANCE_MAX_MISTAKES) {
      renderInput();
      setTimeout(endGame, 300);
      return;
    }

    renderInput();
    renderStats();

    // Clear wrong input after a short delay
    setTimeout(() => {
      // Only clear if the buffer hasn't changed in the meantime
      if (state.inputBuffer === candidate) {
        state.inputBuffer = '';
        renderInput();
      }
    }, 400);
  }

  renderStats();
}

// ─── Ready / space-to-start ───────────────────────────────────────────────────
function handleKeyDown(e) {
  if (state.phase === 'ready' && e.key === ' ') {
    e.preventDefault();
    startGame();
    return;
  }
  if (state.phase === 'playing') {
    // Prevent the keystroke from also landing in the focused #input-area
    // element, which would re-fire as an `input` event and double-count.
    // The `input` listener stays in place for paste / mobile IME paths
    // where keydown alone isn't sufficient.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
    }
    handleInput(e);
  }
}

// ─── Mode / word-set switching ────────────────────────────────────────────────
function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('.tab-mode').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${mode}`).classList.add('active');
  state.phase = 'ready';
  clearInterval(state.timerHandle);
  el.overlay.classList.add('hidden');
  el.kanaDisplay.textContent = '—';
  el.inputDisplay.textContent = '';
  el.hintDisplay.textContent = '';
  el.meaningDisplay.textContent = '';
  renderUI();
  renderStats();
}

function setWordSet(ws) {
  state.wordSet = ws;
  document.querySelectorAll('.tab-set').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${ws}`).classList.add('active');
  state.phase = 'ready';
  clearInterval(state.timerHandle);
  el.overlay.classList.add('hidden');
  renderUI();
}

// ─── Language toggle ──────────────────────────────────────────────────────────
function toggleLang() {
  const newLang = getLang() === 'ja' ? 'en' : 'ja';
  setLang(newLang);
  el.langBtn.textContent = newLang === 'ja' ? 'EN' : 'JA';
  renderUI();
  if (state.phase === 'playing') {
    renderKanaDisplay();
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  // Cache DOM
  el.tabPractice = document.getElementById('tab-practice');
  el.tabTimeAttack = document.getElementById('tab-timeattack');
  el.tabEndurance = document.getElementById('tab-endurance');
  el.tabBasic = document.getElementById('tab-basic');
  el.tabWords = document.getElementById('tab-words');
  el.tabSentences = document.getElementById('tab-sentences');
  el.btnStart = document.getElementById('btn-start');
  el.kanaDisplay = document.getElementById('kana-display');
  el.meaningDisplay = document.getElementById('meaning-display');
  el.hintDisplay = document.getElementById('hint-display');
  el.inputDisplay = document.getElementById('input-display');
  el.inputArea = document.getElementById('input-area');
  el.wpmValue = document.getElementById('wpm-value');
  el.accValue = document.getElementById('acc-value');
  el.extraValue = document.getElementById('extra-value');
  el.labelWPM = document.getElementById('label-wpm');
  el.labelAccuracy = document.getElementById('label-accuracy');
  el.labelExtra = document.getElementById('label-extra');
  el.labelHS = document.getElementById('label-hs');
  el.hsValue = document.getElementById('hs-value');
  el.overlay = document.getElementById('overlay');
  el.langBtn = document.getElementById('lang-btn');
  el.readyHint = document.getElementById('ready-hint');

  // Event: mode tabs
  el.tabPractice.addEventListener('click', () => setMode('practice'));
  el.tabTimeAttack.addEventListener('click', () => setMode('timeattack'));
  el.tabEndurance.addEventListener('click', () => setMode('endurance'));

  // Event: word-set tabs
  el.tabBasic.addEventListener('click', () => setWordSet('basic'));
  el.tabWords.addEventListener('click', () => setWordSet('words'));
  el.tabSentences.addEventListener('click', () => setWordSet('sentences'));

  // Event: start/stop
  el.btnStart.addEventListener('click', () => {
    if (state.phase === 'playing') stopGame();
    else startGame();
  });

  // Event: keyboard
  document.addEventListener('keydown', handleKeyDown);

  // Event: physical input box (mobile / paste)
  el.inputArea.addEventListener('input', (e) => {
    if (state.phase !== 'playing') return;
    const val = e.target.value;
    e.target.value = '';
    for (const ch of val) {
      handleInput({ key: ch, ctrlKey: false, metaKey: false, altKey: false });
    }
  });

  // Event: lang toggle
  el.langBtn.addEventListener('click', toggleLang);

  // Initial render
  renderUI();
  renderStats();
  el.kanaDisplay.textContent = '—';
  el.inputDisplay.innerHTML = '<span class="cursor">|</span>';
  el.overlay.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', init);
