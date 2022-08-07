'use strict';

// I saw this problem here and couldn't help but try it on my own:
// https://youtu.be/_-AfhLQfb6w

const fileUploadContainer = document.getElementById('file-upload-container');
const fileUploadInput = document.getElementById('file-upload');
const findSolutions = document.getElementById('find-solutions');
const output = document.getElementById('output');
const wordList = document.getElementById('word-list');

const workers = new Array(navigator.hardwareConcurrency);
for (let id = 0; id < workers.length; id++) {
  workers[id] = new Worker('worker.js', {name: id});
}

let inProgress = false;

wordList.addEventListener('change', function() {
  inProgress = false;
  const upload = this.value === 'upload';
  fileUploadContainer.style.display = upload ? '' : 'none';
  if (upload) {
    fileUploadInput.click();
  }
});

findSolutions.addEventListener('click', () => {
  if (inProgress) {
    return;
  }
  inProgress = true;
  switch (wordList.value) {
    case 'wordle':
      Promise
          .all([
            fetch('/kokowordle/solutions.json').then(r => r.json()),
            fetch('/kokowordle/guesses.json').then(r => r.json()),
          ])
          .then(([solutions, guesses]) => [...solutions, ...guesses])
          .then(solve);
      break;
    case 'dwyl':
      fetch(
          'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt')
          .then(r => r.text())
          .then(t => t.split(/\s+/).filter(w => w.length === 5))
          .then(solve);
      break;
    case 'upload':
      let uploadPromise;
      if (fileUploadInput.files.length > 0) {
        uploadPromise = Promise.resolve(fileUploadInput.files[0]);
      } else {
        uploadPromise = new Promise((res, rej) => {
          fileUploadInput.click();
          fileUploadInput.addEventListener('change', () => {
            if (inProgress && fileUploadInput.files.length > 0) {
              res(fileUploadInput.files[0])
            } else {
              rej();
            }
          }, {once: true});
        });
      }
      uploadPromise.then(file => file.text())
          .then(
              text => text.split(/[^A-Z]+/i)
                          .filter(w => w.length === 5)
                          .map(w => w.toUpperCase())
                          .distinct())
          .then(solve)
          .catch(() => inProgress = false);
      break;
  };
});

async function solve(words) {
  output.innerHTML = '';
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
  let count = 0;
  await Promise.all(workers.map(manageWorker));
  function manageWorker(worker) {
    return new Promise(async (workerDone) => {
      while (intIndex < ints.length) {
        await delegateTask(worker);
      }
      workerDone();
    });
  }
  function delegateTask(worker) {
    return new Promise(taskDone => {
      worker.postMessage({type: 'SOLVE', intIndex});
      intIndex++;
      worker.onmessage = ({data}) => {
        switch (data.type) {
          case 'SOLUTION':
            const solutionInts = data.solution;
            const solutionWords =
                Array.from(solutionInts, int => intToWord.get(int));
            log('solution:', solutionWords.join(', '));
            count++;
            break;
          case 'DONE':
            taskDone();
            break;
        }
      };
    });
  }

  log('count:', count);
  log('duration:', Math.round(performance.now() - start), 'ms');

  inProgress = false;
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
                        .sort((a, b) => b[1] - a[1])
                        .reduce((charToInt, [char], i) => {
                          charToInt[char] = 1 << i;
                          return charToInt;
                        }, {});
  const mapCharsToInt = chars =>
      chars.split('').map(char => charToInt[char]).reduce((int, n) => int|n);

  const ints = Uint32Array.from(canonicalChars, mapCharsToInt).sort();
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
  output.append(div);
}
