"""Symplex SymPy backend.

Importable (used by the extension's embedded Pyodide engine, which calls
`evaluate()` directly) and runnable as a CLI (used by the system-Python
engine):  python symplex.py eval <language> <expression>
"""
import json
import sys

import sympy

# SymPy has direct support for ccode (C), cxxcode (C++), rcode (R),
# fcode (Fortran), mathematica_code, jscode (JavaScript), julia_code,
# octave_code, rust_code, and pycode.
# More languages may be added with custom printers, or find/replace on these.
CODE_PRINTERS = {
    "python":      sympy.pycode,
    "javascript":  sympy.jscode,
    "typescript":  sympy.jscode,
    "c":           sympy.ccode,
    "cpp":         sympy.cxxcode,
    "r":           sympy.rcode,
    "fortran":     sympy.fcode,
    "mathematica": sympy.mathematica_code,
    "matlab":      sympy.octave_code,
    "octave":      sympy.octave_code,
    "julia":       sympy.julia_code,
    "rust":        sympy.rust_code,
}


def expression_to_code(expression, language):
    """Converts a SymPy expression to a line of code in the target language."""
    printer = CODE_PRINTERS.get(language, str)
    return printer(expression)


def evaluate(language, expression_string):
    """Symbolically evaluates an expression string and returns a JSONable dict.

    The result is either {"returnString": ...} for plain-text results (e.g.
    latex()), or {"Variables": [{"name", "expr"}, ...], "Expression": ...}
    where common subexpressions have been factored out into Variables.
    """
    expression = sympy.sympify(expression_string)
    if expression is None:
        raise ValueError("SymPy could not interpret the expression: %r" % expression_string)

    # Some operations (e.g. solve) return a list of solutions;
    # select the first solution without imaginary parts.
    if isinstance(expression, (list, tuple)):
        real_roots = [root for root in expression if not root.atoms(sympy.I)]
        if not real_roots:
            return {"returnString": "No real solutions found. All solutions: %s"
                                    % str(expression)}
        expression = real_roots[0]
    elif isinstance(expression, str):
        # Operations like latex() return a raw string to insert verbatim.
        return {"returnString": expression}

    variables, reduced = sympy.cse(expression)
    return {
        "Variables": [
            {"name": str(symbol), "expr": str(expression_to_code(subexpr, language))}
            for symbol, subexpr in variables
        ],
        "Expression": str(expression_to_code(reduced[0], language)),
    }


def main(argv):
    command, language, expression_string = argv[1], argv[2], argv[3]
    if command != "eval":
        raise ValueError("Unknown command: %r" % command)
    print(json.dumps(evaluate(language, expression_string), indent=4))
    sys.stdout.flush()


if __name__ == "__main__":
    import faulthandler
    faulthandler.enable()
    # Hard timeout: dump a traceback and exit if evaluation wedges.
    # (dump_traceback_later without exit=True only prints — it doesn't stop anything.)
    timeout = float(sys.argv[4]) if len(sys.argv) > 4 else 15.0
    faulthandler.dump_traceback_later(timeout, exit=True)
    try:
        main(sys.argv)
    finally:
        faulthandler.cancel_dump_traceback_later()
