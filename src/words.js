/**
 * words.js — Word and sentence data sets for typing practice.
 */

export const WORD_SETS = {
  basic: [
    'あ', 'い', 'う', 'え', 'お',
    'か', 'き', 'く', 'け', 'こ',
    'さ', 'し', 'す', 'せ', 'そ',
    'た', 'ち', 'つ', 'て', 'と',
    'な', 'に', 'ぬ', 'ね', 'の',
    'は', 'ひ', 'ふ', 'へ', 'ほ',
    'ま', 'み', 'む', 'め', 'も',
    'や', 'ゆ', 'よ',
    'ら', 'り', 'る', 'れ', 'ろ',
    'わ', 'を', 'ん',
  ],

  words: [
    { kana: 'すし', meaning: 'sushi' },
    { kana: 'さくら', meaning: 'cherry blossom' },
    { kana: 'とうきょう', meaning: 'Tokyo' },
    { kana: 'やま', meaning: 'mountain' },
    { kana: 'かわ', meaning: 'river' },
    { kana: 'そら', meaning: 'sky' },
    { kana: 'うみ', meaning: 'sea' },
    { kana: 'はな', meaning: 'flower' },
    { kana: 'ねこ', meaning: 'cat' },
    { kana: 'いぬ', meaning: 'dog' },
    { kana: 'さかな', meaning: 'fish' },
    { kana: 'みず', meaning: 'water' },
    { kana: 'ひ', meaning: 'fire / sun' },
    { kana: 'つき', meaning: 'moon' },
    { kana: 'ほし', meaning: 'star' },
    { kana: 'くるま', meaning: 'car' },
    { kana: 'でんしゃ', meaning: 'train' },
    { kana: 'がっこう', meaning: 'school' },
    { kana: 'しごと', meaning: 'work' },
    { kana: 'たべもの', meaning: 'food' },
    { kana: 'おちゃ', meaning: 'green tea' },
    { kana: 'まち', meaning: 'town' },
    { kana: 'とり', meaning: 'bird' },
    { kana: 'きもの', meaning: 'kimono' },
    { kana: 'にほん', meaning: 'Japan' },
    { kana: 'ふじさん', meaning: 'Mt. Fuji' },
    { kana: 'おんがく', meaning: 'music' },
    { kana: 'えいご', meaning: 'English' },
    { kana: 'しんかんせん', meaning: 'bullet train' },
    { kana: 'とけい', meaning: 'clock / watch' },
  ],

  sentences: [
    { kana: 'きょうはいいてんきです', meaning: 'Today is nice weather.' },
    { kana: 'おはようございます', meaning: 'Good morning.' },
    { kana: 'ありがとうございます', meaning: 'Thank you very much.' },
    { kana: 'にほんごをべんきょうする', meaning: 'I study Japanese.' },
    { kana: 'さくらがきれいです', meaning: 'Cherry blossoms are beautiful.' },
    { kana: 'おなかがすきました', meaning: 'I am hungry.' },
    { kana: 'みずをください', meaning: 'Please give me water.' },
    { kana: 'どこにいきますか', meaning: 'Where are you going?' },
    { kana: 'わたしはがくせいです', meaning: 'I am a student.' },
    { kana: 'にほんはきれいなくにです', meaning: 'Japan is a beautiful country.' },
  ],
};

/**
 * Returns a shuffled copy of an array (Fisher-Yates).
 */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Returns a random item from an array.
 */
export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
