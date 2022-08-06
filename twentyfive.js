'use strict';

// I saw this problem here and couldn't help but try it on my own:
// https://youtu.be/_-AfhLQfb6w

Promise
    .all([
      fetch('/kokowordle/solutions.json').then(r => r.json()),
      fetch('/kokowordle/guesses.json').then(r => r.json()),
    ])
    .then(([solutions, guesses]) => {
      const start = performance.now();

      const words = [...solutions, ...guesses];
      const {ints, intToWord} = mapWordsToCanonicalInts(words);
      findSolutions({ints, intToWord});

      log('done!');
      log('duration:', performance.now() - start, 'ms');
    });

function mapWordsToCanonicalInts(words) {
  const canonicalChars =
      words.map(word => [...new Set(word.split(''))].sort().join(''))
          .filter(chars => chars.length === 5)
          .distinct();

  const freqs = canonicalChars.reduce((freqs, word) => {
    for (const char of word) {
      freqs[char] = (freqs[char] || 0) + 1;
    }
    return freqs;
  }, {});

  const charToInt = Object.entries(freqs)
                        .sort((a, b) => a[1] - b[1])
                        .reduce((charToInt, [char], i) => {
                          charToInt[char] = 1 << i;
                          return charToInt;
                        }, {});
  const mapCharsToInt = chars =>
      chars.split('').map(char => charToInt[char]).reduce((int, n) => int|n);

  const ints = canonicalChars.map(mapCharsToInt).sort((a, b) => b - a);
  const intToWord = new Map();
  for (const word of words) {
    const int = mapCharsToInt(word);
    if (!intToWord.has(int)) {
      intToWord.set(int, word);
    }
  }

  return {ints, intToWord};
}

function findSolutions({ints, intToWord}) {
  solve(ints, 0, new Array(5));

  function solve(ints, index, solution) {
    if (index === 4) {
      for (let i = 0; i < ints.length; i++) {
        solution[index] = ints[i];
        const words = solution.map(int => intToWord.get(int));
        log('solution:', words.join(', '));
      }
    } else {
      for (let i = 0; i < ints.length; i++) {
        solution[index] = ints[i];
        const disjointInts = getDisjoint(ints.slice(i), ints[i]);
        solve(disjointInts, index + 1, solution);
      }
    }
  }

  function getDisjoint(ints, chosenInt) {
    return ints.filter(int => (int&chosenInt) === 0);
  }
}

Array.prototype.distinct = function() {
  return Array.from(new Set(this));
};

function log(...args) {
  console.log(...args);
  const div = document.createElement('div');
  div.innerText = args.join(' ');
  document.body.append(div);
}
