# Can you find: five five-letter words with twenty-five unique letters?

Inspired by [this Matt Parker video](https://youtu.be/_-AfhLQfb6w). This
solution uses 100% vanilla JavaScript (i.e., no libraries) and runs entirely in
the browser. I use three main "tricks" to make it faster:

-   represent each word as a 32-bit `int` and use bitwise AND to determine if
    two words have letters in common
-   only consider words that don't have letters in common with the words already
    chosen
-   use web workers for parallelism

This repo is essentially an over-engineered version of
[this gist](https://gist.github.com/babelthuap/abf7aa8090fdaa07a3a35b2e52c3a6f5),
which was my initial quick-and-dirty solution.
