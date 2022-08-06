'use strict';

// I saw this problem here and couldn't help but try it on my own:
// https://youtu.be/_-AfhLQfb6w

console.time('INIT');

const workers = new Array(navigator.hardwareConcurrency);
for (let id = 0; id < workers.length; id++) {
  workers[id] = new Worker('worker.js', {name: id});
}

Promise
    .all([
      fetch('/kokowordle/solutions.json').then(r => r.json()),
      fetch('/kokowordle/guesses.json').then(r => r.json()),
    ])
    .then(async ([solutions, guesses]) => {
      const words = [...solutions, ...guesses];
      const {ints, intToWord} = mapWordsToCanonicalInts(words);

      for (const worker of workers) {
        worker.postMessage(ints);
      }

      await Promise.all(workers.map((worker, id) => {
        return new Promise(res => {
          worker.onmessage = (e) => {
            console.log(`worker #${id}`, e.data);
            res();
          };
        });
      }));

      console.timeEnd('INIT');

      console.time('SOLVE');
      let n = 0;

      distributeRange({start: 0, end: ints.length, numWorkers: workers.length})
          .forEach((range, id) => {
            const worker = workers[id];
            worker.onmessage = (e) => {
              const solutionInts = e.data;
              const solutionWords = solutionInts.map(int => intToWord.get(int));
              log('solution:', solutionWords.join(','));
              n++;
              if (n === 10) {  // Because we know there are 10 solutions.
                console.timeEnd('SOLVE');
              }
            };
            for (let intIndex = range[0]; intIndex < range[1]; intIndex++) {
              worker.postMessage(intIndex);
            }
          });
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

Array.prototype.distinct = function() {
  return Array.from(new Set(this));
};

function log(...args) {
  console.log(...args);
  const div = document.createElement('div');
  div.innerText = args.join(' ');
  document.body.append(div);
}

function distributeRange({start, end, numWorkers}) {
  const numTasks = end - start;
  if (numTasks <= numWorkers) {
    // Assign one task per worker
    const ranges = new Array(numTasks);
    for (let i = 0; i < numTasks; i++) {
      ranges[i] = [start + i, start + i + 1];
    }
    return ranges;
  } else {
    // Try to distribute tasks evenly. Give the extras to the low workers.
    const ranges = new Array(numWorkers);
    const tasksPerWorker = Math.floor(numTasks / numWorkers);
    const remainder = numTasks % numWorkers;
    let taskIndex = 0;
    for (let i = 0; i < remainder; i++) {
      ranges[i] = [taskIndex, taskIndex + tasksPerWorker + 1];
      taskIndex += tasksPerWorker + 1;
    }
    for (let i = remainder; i < numWorkers; i++) {
      ranges[i] = [taskIndex, taskIndex + tasksPerWorker];
      taskIndex += tasksPerWorker;
    }
    return ranges;
  }
}
