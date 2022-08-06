let ints;
const solution = new Array(5);

// INIT message
onmessage = (e) => {
  ints = e.data;
  postMessage('INITIALIZED');
  // SOLVE messages
  onmessage = (e) => {
    const intIndex = e.data;
    findSolutionsStartingAt(intIndex);
  };
};

function findSolutionsStartingAt(intIndex) {
  solution[0] = ints[intIndex];
  const disjointInts = getDisjoint(ints.slice(intIndex), ints[intIndex]);
  findSolutions(disjointInts, 1);
}

function findSolutions(intsSubset, solutionIndex) {
  if (solutionIndex === 4) {
    for (let i = 0; i < intsSubset.length; i++) {
      solution[solutionIndex] = intsSubset[i];
      postMessage(solution);
    }
  } else {
    for (let i = 0; i < intsSubset.length; i++) {
      solution[solutionIndex] = intsSubset[i];
      const disjointInts = getDisjoint(intsSubset.slice(i + 1), intsSubset[i]);
      findSolutions(disjointInts, solutionIndex + 1);
    }
  }
}

function getDisjoint(intsSubset, chosenInt) {
  return intsSubset.filter(int => (int&chosenInt) === 0);
}
