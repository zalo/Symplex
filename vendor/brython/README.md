# Vendored Brython build

`brython.js` and `brython_stdlib.js` are built from the `sympy-compat` branch
(https://github.com/zalo/brython/tree/sympy-compat, upstream PR
brython-dev/brython#2912). Stock Brython releases up to 3.14.3 miscompute
SymPy results (see the PR for the eleven fixes); do NOT replace these with a
CDN copy until the PR is merged and released.

To rebuild: check out the branch and run `python3.14 scripts/make_dist.py`,
then copy `www/src/brython.js`, `www/src/brython_stdlib.js` and
`www/src/unicode.txt` here.

`lib/` (git-ignored) holds the pure-Python sympy and mpmath packages,
extracted from the same wheels used by the Pyodide engine. Populate with:
`npm run fetch-brython-libs`.
