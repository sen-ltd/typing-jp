/**
 * typing.js — Core romaji mapping, tokenization, and validation logic.
 * Pure functions only, no DOM dependencies.
 */

export const ROMAJI_MAP = {
  // Vowels
  'あ': ['a'], 'い': ['i'], 'う': ['u'], 'え': ['e'], 'お': ['o'],
  // K
  'か': ['ka'], 'き': ['ki'], 'く': ['ku'], 'け': ['ke'], 'こ': ['ko'],
  // S
  'さ': ['sa'], 'し': ['si', 'shi'], 'す': ['su'], 'せ': ['se'], 'そ': ['so'],
  // T
  'た': ['ta'], 'ち': ['ti', 'chi'], 'つ': ['tu', 'tsu'], 'て': ['te'], 'と': ['to'],
  // N
  'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
  // H
  'は': ['ha'], 'ひ': ['hi'], 'ふ': ['hu', 'fu'], 'へ': ['he'], 'ほ': ['ho'],
  // M
  'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
  // Y
  'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
  // R
  'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
  // W
  'わ': ['wa'], 'を': ['wo'],
  // N
  'ん': ['n', 'nn'],
  // Dakuten (voiced)
  'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
  'ざ': ['za'], 'じ': ['zi', 'ji'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
  'だ': ['da'], 'ぢ': ['di'], 'づ': ['du', 'dzu'], 'で': ['de'], 'ど': ['do'],
  'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
  // Handakuten (semi-voiced)
  'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
  // Yōon — K
  'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'],
  // Yōon — S
  'しゃ': ['sya', 'sha'], 'しゅ': ['syu', 'shu'], 'しょ': ['syo', 'sho'],
  // Yōon — T
  'ちゃ': ['tya', 'cha'], 'ちゅ': ['tyu', 'chu'], 'ちょ': ['tyo', 'cho'],
  // Yōon — N
  'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'],
  // Yōon — H
  'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
  // Yōon — M
  'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'],
  // Yōon — R
  'りゃ': ['rya'], 'りゅ': ['ryu'], 'りょ': ['ryo'],
  // Yōon — G
  'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'],
  // Yōon — J
  'じゃ': ['zya', 'ja', 'jya'], 'じゅ': ['zyu', 'ju', 'jyu'], 'じょ': ['zyo', 'jo', 'jyo'],
  // Yōon — B
  'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'],
  // Yōon — P
  'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo'],
  // Small tsu — typed literally; doubling handled in tokenize()
  'っ': ['xtu', 'xtsu'],
};

// Hiragana characters that are small kana (yōon combiners)
const SMALL_KANA = new Set(['ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ']);

/**
 * Returns the leading consonant(s) of a romaji string.
 * Used to compute the doubled-consonant for っ.
 * e.g., 'ka' → 'k', 'shi' → 's', 'tsu' → 't', 'chi' → 'c'
 * Special: 'n' stays 'n' → doubled would be 'nn'
 */
function leadingConsonant(romaji) {
  // 'tch' for っち: chi → tchi (special case per standard IME)
  if (romaji.startsWith('ch')) return 't';
  // For 'sh', 'ts': double the first char
  const first = romaji[0];
  if (first && !'aeiou'.includes(first)) return first;
  return null;
}

/**
 * tokenize(hiraganaStr) → Array<{ kana: string, romaji: string[] }>
 *
 * Handles:
 * - Yōon: 2-char combos (e.g., きゃ) checked before single chars
 * - っ: doubles the leading consonant of the NEXT token
 * - ん before vowels/y: forces 'nn' variant only
 */
export function tokenize(hiraganaStr) {
  const tokens = [];
  let i = 0;

  while (i < hiraganaStr.length) {
    const ch = hiraganaStr[i];
    const next = hiraganaStr[i + 1];

    // Try 2-char combo first (yōon)
    if (next && ROMAJI_MAP[ch + next]) {
      tokens.push({ kana: ch + next, romaji: [...ROMAJI_MAP[ch + next]] });
      i += 2;
      continue;
    }

    // Small kana without a leading base char: treat as standalone (unusual but safe)
    if (SMALL_KANA.has(ch) && !ROMAJI_MAP[ch]) {
      // Skip or pass through
      i++;
      continue;
    }

    // っ handling: doubles the consonant of the NEXT token
    if (ch === 'っ') {
      // Peek ahead to find the next base kana
      let peekIdx = i + 1;
      let peekKana = hiraganaStr[peekIdx];
      let peekNext = hiraganaStr[peekIdx + 1];
      let nextRomaji;

      if (peekKana && peekNext && ROMAJI_MAP[peekKana + peekNext]) {
        nextRomaji = ROMAJI_MAP[peekKana + peekNext];
      } else if (peekKana && ROMAJI_MAP[peekKana]) {
        nextRomaji = ROMAJI_MAP[peekKana];
      }

      if (nextRomaji) {
        const doubled = nextRomaji.map(r => {
          const lc = leadingConsonant(r);
          // 'n' case: nni, etc.
          return lc ? lc + r : r;
        });
        tokens.push({ kana: ch, romaji: doubled });
      } else {
        // Fallback to literal
        tokens.push({ kana: ch, romaji: [...ROMAJI_MAP['っ']] });
      }
      i++;
      continue;
    }

    // ん before vowel or 'y': only 'nn' is valid (prevents ambiguity)
    if (ch === 'ん') {
      const after = hiraganaStr[i + 1];
      if (after && ('あいうえおやゆよ'.includes(after) || SMALL_KANA.has(after))) {
        tokens.push({ kana: ch, romaji: ['nn'] });
      } else {
        tokens.push({ kana: ch, romaji: ['n', 'nn'] });
      }
      i++;
      continue;
    }

    // Standard single char
    if (ROMAJI_MAP[ch]) {
      tokens.push({ kana: ch, romaji: [...ROMAJI_MAP[ch]] });
    } else {
      // Non-hiragana chars (spaces, ASCII, punctuation) pass through as-is
      tokens.push({ kana: ch, romaji: [ch] });
    }
    i++;
  }

  return tokens;
}

/**
 * validateInput(tokens, inputStr) → ValidationResult
 *
 * Matches the inputStr against the token sequence, accepting any valid romaji variant.
 *
 * Returns:
 *   completed    — number of fully completed tokens
 *   currentProgress — the portion of inputStr consumed by completed tokens
 *   remaining    — romaji options still available for the current token
 *   isCorrect    — true if inputStr matches correctly so far (no wrong chars)
 *   isComplete   — true if all tokens are satisfied
 */
export function validateInput(tokens, inputStr) {
  if (!inputStr) {
    return {
      completed: 0,
      currentProgress: '',
      remaining: tokens.length > 0 ? tokens[0].romaji : [],
      isCorrect: true,
      isComplete: tokens.length === 0,
    };
  }

  let pos = 0; // position in inputStr
  let completed = 0;

  for (let t = 0; t < tokens.length; t++) {
    const token = tokens[t];
    const remaining = inputStr.slice(pos);

    // Check if any variant is fully matched at pos
    let fullMatch = null;
    for (const variant of token.romaji) {
      if (remaining.startsWith(variant)) {
        fullMatch = variant;
        break;
      }
    }

    if (fullMatch !== null) {
      pos += fullMatch.length;
      completed++;
      continue;
    }

    // Check if any variant is partially matched (input is a prefix of a variant)
    const partialMatch = token.romaji.some(v => v.startsWith(remaining));
    if (partialMatch) {
      // Still typing this token, correct so far
      return {
        completed,
        currentProgress: inputStr.slice(0, pos),
        remaining: token.romaji.filter(v => v.startsWith(remaining)),
        isCorrect: true,
        isComplete: false,
      };
    }

    // Neither full nor partial match — wrong input
    return {
      completed,
      currentProgress: inputStr.slice(0, pos),
      remaining: token.romaji,
      isCorrect: false,
      isComplete: false,
    };
  }

  // All tokens matched; check if there's leftover input
  const leftover = inputStr.slice(pos);
  if (leftover.length > 0) {
    return {
      completed,
      currentProgress: inputStr.slice(0, pos),
      remaining: [],
      isCorrect: false,
      isComplete: false,
    };
  }

  return {
    completed,
    currentProgress: inputStr,
    remaining: [],
    isCorrect: true,
    isComplete: true,
  };
}

/**
 * calculateWPM(charCount, elapsedMs)
 * Standard definition: 1 word = 5 characters.
 */
export function calculateWPM(charCount, elapsedMs) {
  if (elapsedMs <= 0) return 0;
  const minutes = elapsedMs / 60000;
  const words = charCount / 5;
  return Math.round(words / minutes);
}

/**
 * calculateAccuracy(correct, total) → 0–100 integer
 */
export function calculateAccuracy(correct, total) {
  if (total <= 0) return 100;
  return Math.round((correct / total) * 100);
}
