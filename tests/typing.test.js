/**
 * typing.test.js — Tests for typing.js core logic.
 * Run with: node --test tests/typing.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROMAJI_MAP,
  tokenize,
  validateInput,
  calculateWPM,
  calculateAccuracy,
} from '../src/typing.js';

// ─── ROMAJI_MAP completeness ──────────────────────────────────────────────────

describe('ROMAJI_MAP', () => {
  it('covers all basic hiragana vowels', () => {
    assert.ok(ROMAJI_MAP['あ'], 'あ missing');
    assert.ok(ROMAJI_MAP['い'], 'い missing');
    assert.ok(ROMAJI_MAP['う'], 'う missing');
    assert.ok(ROMAJI_MAP['え'], 'え missing');
    assert.ok(ROMAJI_MAP['お'], 'お missing');
  });

  it('covers all basic hiragana rows', () => {
    const chars = [
      'か','き','く','け','こ',
      'さ','し','す','せ','そ',
      'た','ち','つ','て','と',
      'な','に','ぬ','ね','の',
      'は','ひ','ふ','へ','ほ',
      'ま','み','む','め','も',
      'や','ゆ','よ',
      'ら','り','る','れ','ろ',
      'わ','を','ん',
    ];
    for (const ch of chars) {
      assert.ok(ROMAJI_MAP[ch], `${ch} missing from ROMAJI_MAP`);
    }
  });

  it('covers dakuten characters', () => {
    const voiced = ['が','ぎ','ぐ','げ','ご','ざ','じ','ず','ぜ','ぞ',
                    'だ','ぢ','づ','で','ど','ば','び','ぶ','べ','ぼ',
                    'ぱ','ぴ','ぷ','ぺ','ぽ'];
    for (const ch of voiced) {
      assert.ok(ROMAJI_MAP[ch], `${ch} missing from ROMAJI_MAP`);
    }
  });

  it('covers yōon combos', () => {
    const yoon = ['きゃ','きゅ','きょ','しゃ','しゅ','しょ','ちゃ','ちゅ','ちょ'];
    for (const combo of yoon) {
      assert.ok(ROMAJI_MAP[combo], `${combo} missing from ROMAJI_MAP`);
    }
  });

  it('し has both si and shi variants', () => {
    const variants = ROMAJI_MAP['し'];
    assert.ok(variants.includes('si'), 'si missing for し');
    assert.ok(variants.includes('shi'), 'shi missing for し');
  });

  it('つ has both tu and tsu variants', () => {
    const variants = ROMAJI_MAP['つ'];
    assert.ok(variants.includes('tu'), 'tu missing for つ');
    assert.ok(variants.includes('tsu'), 'tsu missing for つ');
  });

  it('ち has both ti and chi variants', () => {
    const variants = ROMAJI_MAP['ち'];
    assert.ok(variants.includes('ti'), 'ti missing for ち');
    assert.ok(variants.includes('chi'), 'chi missing for ち');
  });

  it('ふ has both hu and fu variants', () => {
    const variants = ROMAJI_MAP['ふ'];
    assert.ok(variants.includes('hu'), 'hu missing for ふ');
    assert.ok(variants.includes('fu'), 'fu missing for ふ');
  });
});

// ─── tokenize ─────────────────────────────────────────────────────────────────

describe('tokenize', () => {
  it('tokenizes single vowels', () => {
    const tokens = tokenize('あいう');
    assert.equal(tokens.length, 3);
    assert.equal(tokens[0].kana, 'あ');
    assert.deepEqual(tokens[0].romaji, ['a']);
  });

  it('tokenizes basic hiragana word', () => {
    const tokens = tokenize('さくら');
    assert.equal(tokens.length, 3);
    assert.equal(tokens[0].kana, 'さ');
    assert.equal(tokens[1].kana, 'く');
    assert.equal(tokens[2].kana, 'ら');
  });

  it('tokenizes yōon combo きゃ as single token', () => {
    const tokens = tokenize('きゃく');
    assert.equal(tokens.length, 2, 'きゃ + く = 2 tokens');
    assert.equal(tokens[0].kana, 'きゃ');
    assert.deepEqual(tokens[0].romaji, ['kya']);
    assert.equal(tokens[1].kana, 'く');
  });

  it('tokenizes しゃ with sya/sha variants', () => {
    const tokens = tokenize('しゃ');
    assert.equal(tokens.length, 1);
    assert.ok(tokens[0].romaji.includes('sha'), 'sha missing');
    assert.ok(tokens[0].romaji.includes('sya'), 'sya missing');
  });

  it('tokenizes ちゃ with tya/cha variants', () => {
    const tokens = tokenize('ちゃ');
    assert.equal(tokens.length, 1);
    assert.ok(tokens[0].romaji.includes('cha'), 'cha missing');
    assert.ok(tokens[0].romaji.includes('tya'), 'tya missing');
  });

  it('handles っ by doubling next consonant — っか', () => {
    // Two tokens: っ (just the doubling consonant) + か (its own romaji).
    // Combined typing "kka" = 'k' (っ) + 'ka' (か).
    const tokens = tokenize('っか');
    assert.equal(tokens.length, 2);
    assert.equal(tokens[0].kana, 'っ');
    assert.deepEqual(tokens[0].romaji, ['k']);
    assert.equal(tokens[1].kana, 'か');
    assert.ok(tokens[1].romaji.includes('ka'));
  });

  it('handles っ before し — k single consonant for both si/shi variants', () => {
    const tokens = tokenize('っし');
    assert.equal(tokens[0].kana, 'っ');
    // 'si' → 's', 'shi' → 's' (deduped)
    assert.deepEqual(tokens[0].romaji, ['s']);
    assert.equal(tokens[1].kana, 'し');
    assert.ok(tokens[1].romaji.includes('si') && tokens[1].romaji.includes('shi'));
  });

  it('handles っ before ち — t (Hepburn special: chi → tchi)', () => {
    const tokens = tokenize('っち');
    assert.equal(tokens[0].kana, 'っ');
    // Both 'ti' (→t) and 'chi' (→t via the ch-special-case) yield 't'.
    assert.deepEqual(tokens[0].romaji, ['t']);
  });

  it('handles っ before yōon (しゃ) — single consonant covers all variants', () => {
    const tokens = tokenize('っしゃ');
    assert.equal(tokens[0].kana, 'っ');
    assert.deepEqual(tokens[0].romaji, ['s']);
    assert.equal(tokens[1].kana, 'しゃ');
    assert.ok(tokens[1].romaji.includes('sya'));
    assert.ok(tokens[1].romaji.includes('sha'));
  });

  it('がっこう accepts gakkou (regression: previously required gakkokou)', () => {
    const tokens = tokenize('がっこう');
    const r = validateInput(tokens, 'gakkou');
    assert.equal(r.isComplete, true, `expected gakkou to complete がっこう, got ${JSON.stringify(r)}`);
    assert.equal(r.isCorrect, true);
  });

  it('がっこう also accepts gakkou step-by-step keystrokes', () => {
    const tokens = tokenize('がっこう');
    // Walk each prefix to ensure no intermediate state is rejected.
    for (const prefix of ['g', 'ga', 'gak', 'gakk', 'gakko', 'gakkou']) {
      const r = validateInput(tokens, prefix);
      assert.equal(r.isCorrect, true, `prefix "${prefix}" should be correct, got ${JSON.stringify(r)}`);
    }
  });

  it('っち still accepts tchi end-to-end via validateInput (e.g. ぼっち)', () => {
    const tokens = tokenize('ぼっち');
    const r = validateInput(tokens, 'botchi');
    assert.equal(r.isComplete, true, 'botchi should complete ぼっち');
  });

  it('っつ accepts ttsu and ttu', () => {
    const tokensA = tokenize('やっつ');
    assert.equal(validateInput(tokensA, 'yattsu').isComplete, true, 'yattsu should complete やっつ');
    const tokensB = tokenize('やっつ');
    assert.equal(validateInput(tokensB, 'yattu').isComplete, true, 'yattu should complete やっつ');
  });

  it('っしゃ accepts sshya and ssha', () => {
    const tokens = tokenize('はっしゃ');
    assert.equal(validateInput(tokens, 'hassha').isComplete, true);
    assert.equal(validateInput(tokenize('はっしゃ'), 'hassya').isComplete, true);
  });

  it('handles ん before vowel requiring nn', () => {
    const tokens = tokenize('かんい');
    // ん before い (vowel) → nn only
    const nToken = tokens[1];
    assert.equal(nToken.kana, 'ん');
    assert.deepEqual(nToken.romaji, ['nn']);
  });

  it('handles ん at word end allowing n or nn', () => {
    const tokens = tokenize('ほん');
    const nToken = tokens[1];
    assert.ok(nToken.romaji.includes('n'), 'n should be allowed at word end');
    assert.ok(nToken.romaji.includes('nn'), 'nn should be allowed at word end');
  });

  it('handles ん before consonant allowing n or nn', () => {
    const tokens = tokenize('てんき');
    const nToken = tokens[1];
    assert.ok(nToken.romaji.includes('n'), 'n before consonant should be allowed');
  });

  it('allows m for ん before ま行 (Hepburn labial assimilation)', () => {
    // しんま (test stub): ん followed by ま → 'm' is a third option
    const tokens = tokenize('しんま');
    const nToken = tokens[1];
    assert.equal(nToken.kana, 'ん');
    assert.ok(nToken.romaji.includes('n'),  'n still allowed');
    assert.ok(nToken.romaji.includes('nn'), 'nn still allowed');
    assert.ok(nToken.romaji.includes('m'),  'm should be allowed before ま');
  });

  it('allows m for ん before ば行', () => {
    const tokens = tokenize('しんぶん'); // 新聞 — ん before ぶ
    const firstN = tokens[1];
    assert.equal(firstN.kana, 'ん');
    assert.ok(firstN.romaji.includes('m'), 'm should be allowed before ぶ (ば行)');
    // The trailing ん has no following kana → m is NOT added
    const lastN = tokens[3];
    assert.equal(lastN.kana, 'ん');
    assert.ok(!lastN.romaji.includes('m'), 'm should NOT be added at word end');
  });

  it('allows m for ん before ぱ行', () => {
    const tokens = tokenize('てんぷら'); // 天ぷら — ん before ぷ
    const nToken = tokens[1];
    assert.ok(nToken.romaji.includes('m'), 'm should be allowed before ぷ (ぱ行)');
  });

  it('does NOT allow m for ん before non-labial consonants', () => {
    const tokens = tokenize('ほんき'); // ん before き (k is not labial)
    const nToken = tokens[1];
    assert.ok(!nToken.romaji.includes('m'), 'm should not be added before non-labial');
  });

  it('returns empty array for empty string', () => {
    assert.deepEqual(tokenize(''), []);
  });
});

// ─── validateInput ────────────────────────────────────────────────────────────

describe('validateInput', () => {
  it('returns correct for empty input on non-empty tokens', () => {
    const tokens = tokenize('さ');
    const result = validateInput(tokens, '');
    assert.equal(result.isCorrect, true);
    assert.equal(result.isComplete, false);
    assert.equal(result.completed, 0);
  });

  it('accepts correct full input', () => {
    const tokens = tokenize('さ');
    const result = validateInput(tokens, 'sa');
    assert.equal(result.isCorrect, true);
    assert.equal(result.isComplete, true);
    assert.equal(result.completed, 1);
  });

  it('accepts partial correct input', () => {
    const tokens = tokenize('すし');
    const result = validateInput(tokens, 'su');
    assert.equal(result.isCorrect, true);
    assert.equal(result.isComplete, false);
    assert.equal(result.completed, 1);
  });

  it('rejects wrong input', () => {
    const tokens = tokenize('さ');
    const result = validateInput(tokens, 'x');
    assert.equal(result.isCorrect, false);
    assert.equal(result.isComplete, false);
  });

  it('accepts shi as input for し', () => {
    const tokens = tokenize('し');
    const result = validateInput(tokens, 'shi');
    assert.equal(result.isCorrect, true);
    assert.equal(result.isComplete, true);
  });

  it('accepts si as input for し', () => {
    const tokens = tokenize('し');
    const result = validateInput(tokens, 'si');
    assert.equal(result.isCorrect, true);
    assert.equal(result.isComplete, true);
  });

  it('validates multi-token word — すし', () => {
    const tokens = tokenize('すし');
    let result = validateInput(tokens, 'su');
    assert.equal(result.isCorrect, true);
    assert.equal(result.completed, 1);

    result = validateInput(tokens, 'sushi');
    assert.equal(result.isCorrect, true);
    assert.equal(result.isComplete, true);
  });

  it('validates multi-token word with alternate — すし via susi', () => {
    const tokens = tokenize('すし');
    const result = validateInput(tokens, 'susi');
    assert.equal(result.isCorrect, true);
    assert.equal(result.isComplete, true);
  });

  it('returns isComplete true on empty tokens with empty input', () => {
    const result = validateInput([], '');
    assert.equal(result.isComplete, true);
  });

  it('rejects leftover input after all tokens consumed', () => {
    const tokens = tokenize('あ');
    const result = validateInput(tokens, 'aa');
    assert.equal(result.isCorrect, false);
    assert.equal(result.isComplete, false);
  });
});

// ─── calculateWPM ─────────────────────────────────────────────────────────────

describe('calculateWPM', () => {
  it('returns 0 for 0 elapsed time', () => {
    assert.equal(calculateWPM(100, 0), 0);
  });

  it('calculates WPM correctly — 50 chars in 30s = 20 WPM', () => {
    // 50 chars / 5 = 10 words; 30s = 0.5 min; 10/0.5 = 20 WPM
    assert.equal(calculateWPM(50, 30000), 20);
  });

  it('calculates WPM correctly — 300 chars in 60s = 60 WPM', () => {
    // 300/5=60 words in 1 min = 60 WPM
    assert.equal(calculateWPM(300, 60000), 60);
  });

  it('returns 0 for 0 chars', () => {
    assert.equal(calculateWPM(0, 60000), 0);
  });
});

// ─── calculateAccuracy ────────────────────────────────────────────────────────

describe('calculateAccuracy', () => {
  it('returns 100 for 0 total keystrokes', () => {
    assert.equal(calculateAccuracy(0, 0), 100);
  });

  it('returns 100 when all keystrokes correct', () => {
    assert.equal(calculateAccuracy(50, 50), 100);
  });

  it('returns 50 when half keystrokes correct', () => {
    assert.equal(calculateAccuracy(5, 10), 50);
  });

  it('returns 0 when no correct keystrokes', () => {
    assert.equal(calculateAccuracy(0, 10), 0);
  });

  it('rounds to nearest integer', () => {
    // 2/3 = 66.666... → 67
    assert.equal(calculateAccuracy(2, 3), 67);
  });
});
