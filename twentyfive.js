'use strict';

// I saw this problem here and couldn't help but try it on my own:
// https://youtu.be/_-AfhLQfb6w

const workers = new Array(navigator.hardwareConcurrency);
for (let id = 0; id < workers.length; id++) {
  workers[id] = new Worker('worker.js', {name: id});
}

Promise
    .all([
      fetch('/kokowordle/solutions.json').then(r => r.json()),
      fetch('/kokowordle/guesses.json').then(r => r.json()),
    ])
    .then(([solutions, guesses]) => [...solutions, ...guesses])
    .then(solve);

async function solve(words) {
  const start = performance.now();

  // Initialize workers
  const {ints, intToWord} = mapWordsToCanonicalInts(words);
  for (const worker of workers) {
    worker.postMessage({type: 'INIT', ints});
  }
  await Promise.all(workers.map((worker, id) => {
    return new Promise(res => {
      worker.onmessage = ({data}) => {
        console.log(`worker #${id}`, data);
        res();
      };
    });
  }));

  // Feed tasks to workers
  let intIndex = 0;
  await Promise.all(workers.map(manageWorker));
  function manageWorker(worker) {
    return new Promise(async (workerDone) => {
      while (intIndex < ints.length) {
        await delegateTask(worker);
      }
      workerDone();
    })
  }
  function delegateTask(worker) {
    return new Promise(taskDone => {
      worker.postMessage({type: 'SOLVE', intIndex});
      intIndex++;
      worker.onmessage = ({data}) => {
        switch (data.type) {
          case 'SOLUTION':
            const solutionInts = data.solution;
            const solutionWords = solutionInts.map(int => intToWord.get(int));
            log('solution:', solutionWords.join(', '));
            break;
          case 'DONE':
            taskDone();
            break;
        }
      };
    });
  }

  log('duration:', Math.round(performance.now() - start), 'ms');
}

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

Array.prototype.distinct = function() {
  return Array.from(new Set(this));
};

function log(...args) {
  console.log(...args);
  const div = document.createElement('div');
  div.innerText = args.join(' ');
  document.body.append(div);
}
