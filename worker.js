let ints;
const solution = new Array(5);

onmessage = ({data}) => {
  switch (data.type) {
    case 'INIT':
      ints = data.ints;
      postMessage('INITIALIZED');
      break;
    case 'SOLVE':
      findSolutionsStartingAt(data.intIndex);
      break;
  }
};

function findSolutionsStartingAt(intIndex) {
  solution[0] = ints[intIndex];
  const disjointInts = getDisjoint(ints.slice(intIndex + 1), ints[intIndex]);
  findSolutions(disjointInts, 1);
  postMessage({type: 'DONE'});
}

function findSolutions(intsSubset, solutionIndex) {
  if (solutionIndex === 4) {
    for (let i = 0; i < intsSubset.length; i++) {
      solution[solutionIndex] = intsSubset[i];
      postMessage({type: 'SOLUTION', solution});
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
