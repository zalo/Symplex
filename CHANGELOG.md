# Change Log

## 0.1.0 - Embedded SymPy + Parser Overhaul

- SymPy 1.14 now runs **inside the extension** via Pyodide (CPython on WebAssembly) — no Python installation required. The old subprocess mode is still available via `"symplex.engine": "system"`.
- Evaluations run on a worker thread with a configurable timeout (`symplex.timeoutSeconds`), so a wedged evaluation can no longer hang the editor.
- Rewrote the JavaScript/TypeScript converter on the typed AST API: fixes `pow()` precedence, `%`/`**` operators, zero-argument calls, multi-declarator statements, type annotations, `Math.PI`/`Math.E`, and unsupported syntax now produces a readable error instead of silently-corrupted output.
- Rewrote the Python converter with whole-word substitution: fixes variable names being replaced inside other identifiers (e.g. `x` inside `exp`), an infinite loop on self-referential assignments (`x = x + 1`), and crashes on bare final expressions.
- Modernized tooling: TypeScript 5, ESLint (tslint is dead), strict manifest, tests (`npm test`).

## 0.0.8 - Aesthetic Changes


## 0.0.4 - Add Snippets

Group all Symplex functionality underneath the `symplex.Evaluate` command.  Add snippets which document a few of the SymPy features that Symplex exposes. 


## 0.0.3 - Major Refactor

Allow writing of arbitrary SymPy operations, encapsulate adding support for new languages, and add LaTeX output!


## 0.0.2 - Python Support

Since `SymPy` operates natively in Python syntax, it was straight-forward to add basic Python support.


## 0.0.1 - Proof of Concept

Have proven that the typescript AST tree can be transformed into a `SymPy` compatible format, and that Python scripts can be invoked to perform arbitrary work for the editor at low-latencies.  The infrastructure is ready for massive expansion in capability, once the right UI affordances are found and the Javascript/Typescript parsing code is improved.
