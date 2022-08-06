// I saw this problem here and couldn't help but try it on my own:
// https://youtu.be/_-AfhLQfb6w

Promise
    .all([
      fetch('/kokowordle/solutions.json').then(r => r.json()),
      fetch('/kokowordle/guesses.json').then(r => r.json()),
    ])
    .then(([s, g]) => {
      const words = [...s, ...g];

      const position = {
        E: 1 << 0,
        A: 1 << 1,
        R: 1 << 2,
        O: 1 << 3,
        T: 1 << 4,
        L: 1 << 5,
        I: 1 << 6,
        S: 1 << 7,
        N: 1 << 8,
        C: 1 << 9,
        U: 1 << 10,
        Y: 1 << 11,
        D: 1 << 12,
        H: 1 << 13,
        P: 1 << 14,
        G: 1 << 15,
        M: 1 << 16,
        B: 1 << 17,
        F: 1 << 18,
        K: 1 << 19,
        W: 1 << 20,
        V: 1 << 21,
        Z: 1 << 22,
        X: 1 << 23,
        Q: 1 << 24,
        J: 1 << 25,
      };

      function toInt(word) {
        return word.split('').map(c => position[c]).reduce((int, n) => int|n);
      }

      function toChars(int) {
        return Object.entries(position)
            .filter(([_, n]) => n & int)
            .map(([c]) => c);
      }

      function toWord(chars) {
        return words.find(word => chars.every(c => word.includes(c)));
      }

      function getDisjoint(ints, chosenInt) {
        return ints.filter(int => (int&chosenInt) === 0);
      }

      function solve(ints, n) {
        if (n === 1) {
          return ints.length > 0 ? [ints[0]] : null;
        }
        const len = ints.length;
        for (let i = 0; i < len; i++) {
          const soln = solve(getDisjoint(ints, ints[i]), n - 1);
          if (soln !== null) {
            soln.push(ints[i]);
            return soln;
          }
        }
        return null;
      }

      const start = performance.now();
      const unq5 = words.filter(w => new Set(w).size === 5);
      const ints5 = Array.from(new Set(unq5.map(toInt))).sort((a, b) => b - a);
      log('solution:', solve(ints5, 5).map(toChars).map(toWord).join(', '));
      log('duration:', Math.round(performance.now() - start), 'ms');
    });

function log(...args) {
  console.log(...args);
  const div = document.createElement('div');
  div.innerText = args.join(' ');
  document.body.append(div);
}
