# Symplex

A Symbolic CAS that operates directly on Javascript and Python code.

## Features

> Allows users to highlight blocks of math code and right-click to symbolically integrate, derive, simplify, and solve for the extrema.

<img src="https://i.imgur.com/pgczpEk.gif">

## Requirements

Symplex requires that Python and `SymPy` are installed.  `SymPy` can be installed with `pip install SymPy`.

## Known Issues

- Javascript parsing is extremely fragile, this is due for a major refactor to better accomodate for the inconsistences in the nodegraph sourceFile output.
- There is no way to change which variable it is solving with respect to right now (always `t`).
- It only exposes the barest fraction of `SymPy`'s true functionality!

### Future Work
Add support for 
- Free Variable Configuration
- Gradients
- Vectors/Matrices
- Algebraic "Functions"
- LaTeX output

## Release Notes

### 0.0.2 - Python Support

Since `SymPy` operates natively in Python syntax, it was straight-forward to add basic Python support.


### 0.0.1 - Proof of Concept

Have proven that the typescript AST tree can be transformed into a `SymPy` compatible format, and that Python scripts can be invoked to perform arbitrary work for the editor at low-latencies.  The infrastructure is ready for massive expansion in capability, once the right UI affordances are found and the Javascript/Typescript parsing code is improved.
