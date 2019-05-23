import sys
import sympy
from sympy import jscode
import json
import faulthandler

# Sympy has direct support for ccode (C), cxxcode (C++), rcode (R), 
# fcode (fortran), mathematica_code, jscode (javascript), julia_code,
# octave_code, rust_code, theano_code, and pycode
# More languages may be added with custom printers, or find/replace on these
def expressionToCode(expression, language):
  '''Converts a SymPy Expression to a line of code in the target language'''
  if  (language == "python"):
    return sympy.pycode(expression)
  elif(language == "javascript" or language == "typescript"):
    return sympy.jscode(expression)
  elif(language == "c"):
    return sympy.ccode(expression)
  elif(language == "cpp"):
    return sympy.cxxcode(expression)
  elif(language == "r"):
    return sympy.rcode(expression)
  elif(language == "fortran"):
    return sympy.fcode(expression)
  elif(language == "mathematica"):
    return sympy.mathematica_code(expression)
  elif(language == "matlab" or language == "octave"):
    return sympy.octave_code(expression)
  elif(language == "rust"):
    return sympy.rust_code(expression)
  elif(language == "theano"):
    return sympy.theano_code(expression)

def convertSymPyToDict(code, language):
  '''Creates a JSONable list of lines of code from a SymPy Expression'''

  # Select the first real solution
  if(type(code) == list):
    for root in code:
        if len(root.atoms(sympy.I)) == 0:
          code = root
          break

  pythonDict = {}
  pythonDict["Variables"], pythonDict["Expression"] = sympy.cse(code)
  for i, expr in enumerate(pythonDict["Variables"]):
    pythonDict["Variables"][i] = {
      "name" : str(expr[0]),
      "expr" : str(expressionToCode(expr[1], language))
    }
  pythonDict["Expression"] = expressionToCode(pythonDict["Expression"][0], language)
  return pythonDict

# Begin Parsing
faulthandler.enable()

try:
  # Timeout after 10 seconds if it doesn't return
  faulthandler.dump_traceback_later(10)

  command  = sys.argv[1]
  language = sys.argv[2]
  expression = sympy.sympify(sys.argv[3])
  assert expression is not None, "SymPy Error: Cannot evaluate expression!"

  result = None
  if(command == 'eval'):
    print(json.dumps(convertSymPyToDict(expression, language), indent=4))
  elif(command == 'latex'):
    print(sympy.latex(expression))
  sys.stdout.flush()

finally:
  faulthandler.cancel_dump_traceback_later()
