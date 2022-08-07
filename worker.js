'use strict';

let ints;

// Keep all the intermediate values in pre-allocated arrays so we don't have to
// do any allocation during the findSolutions loop. This makes it almost 100%
// faster at the cost of readability ¯\_(ツ)_/¯
const disjointLists = new Array(4);
const disjointListLengths = new Uint16Array(4);
const solution = new Uint32Array(5);

onmessage = ({data}) => {
  switch (data.type) {
    case 'INIT':
      ints = data.ints;
      for (let i = 0; i < disjointLists.length; i++) {
        disjointLists[i] = new Uint32Array(ints.length);
      }
      postMessage('INITIALIZED');
      break;
    case 'SOLVE':
      findSolutionsStartingAt(data.intIndex);
      break;
  }
};

function findSolutionsStartingAt(intIndex) {
  solution[0] = ints[intIndex];
  getDisjoint(ints, ints.length, 0, intIndex);
  findSolutions(1);
  postMessage({type: 'DONE'});
}

function findSolutions(solutionIndex) {
  const prevDisjointList = disjointLists[solutionIndex - 1];
  const prevDisjointListLength = disjointListLengths[solutionIndex - 1];
  if (solutionIndex === 4) {
    for (let i = 0; i < prevDisjointListLength; i++) {
      solution[solutionIndex] = prevDisjointList[i];
      postMessage({type: 'SOLUTION', solution: solution});
    }
    return;
  }

  for (let i = 0; i < prevDisjointListLength; i++) {
    solution[solutionIndex] = prevDisjointList[i];
    getDisjoint(prevDisjointList, prevDisjointListLength, solutionIndex, i);
    findSolutions(solutionIndex + 1);
  }
}

function getDisjoint(source, sourceLength, destinationIndex, startIndex) {
  let size = 0;
  const chosenInt = source[startIndex];
  const dest = disjointLists[destinationIndex];
  for (let i = startIndex + 1; i < sourceLength; i++) {
    if ((source[i] & chosenInt) === 0) {
      dest[size++] = source[i];
    }
  }
  disjointListLengths[destinationIndex] = size;
}
