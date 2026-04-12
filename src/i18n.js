/**
 * i18n.js — Japanese / English UI strings.
 */

export const TRANSLATIONS = {
  ja: {
    appTitle: '日本語タイピング',
    // Modes
    modePractice: '練習',
    modeTimeAttack: 'タイムアタック',
    modeEndurance: '耐久',
    // Word sets
    setBasic: '基本ひらがな',
    setWords: '単語',
    setSentences: '文章',
    // UI labels
    labelWPM: 'WPM',
    labelAccuracy: '正確率',
    labelScore: 'スコア',
    labelMistakes: 'ミス',
    labelTime: '残り時間',
    labelHighScore: 'ハイスコア',
    // Buttons
    btnStart: 'スタート',
    btnRestart: 'もう一度',
    btnStop: '停止',
    // Status
    statusReady: 'スペースキーでスタート',
    statusTyping: 'タイピング中...',
    statusFinished: '終了！',
    statusGameOver: 'ゲームオーバー',
    // Hint
    hintLabel: '読み方',
    meaningLabel: '意味',
    // Results
    resultsTitle: '結果',
    resultWords: '単語数',
    resultChars: '文字数',
    resultWPM: 'WPM',
    resultAccuracy: '正確率',
    resultNewHighScore: '新記録！',
    // Settings
    settingsLang: '言語',
  },
  en: {
    appTitle: 'Typing JP',
    // Modes
    modePractice: 'Practice',
    modeTimeAttack: 'Time Attack',
    modeEndurance: 'Endurance',
    // Word sets
    setBasic: 'Basic Hiragana',
    setWords: 'Words',
    setSentences: 'Sentences',
    // UI labels
    labelWPM: 'WPM',
    labelAccuracy: 'Accuracy',
    labelScore: 'Score',
    labelMistakes: 'Mistakes',
    labelTime: 'Time Left',
    labelHighScore: 'High Score',
    // Buttons
    btnStart: 'Start',
    btnRestart: 'Play Again',
    btnStop: 'Stop',
    // Status
    statusReady: 'Press Space to Start',
    statusTyping: 'Typing...',
    statusFinished: 'Finished!',
    statusGameOver: 'Game Over',
    // Hint
    hintLabel: 'Reading',
    meaningLabel: 'Meaning',
    // Results
    resultsTitle: 'Results',
    resultWords: 'Words',
    resultChars: 'Characters',
    resultWPM: 'WPM',
    resultAccuracy: 'Accuracy',
    resultNewHighScore: 'New High Score!',
    // Settings
    settingsLang: 'Language',
  },
};

let currentLang = 'ja';

export function setLang(lang) {
  if (TRANSLATIONS[lang]) currentLang = lang;
}

export function getLang() {
  return currentLang;
}

export function t(key) {
  return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) ||
    (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) ||
    key;
}
