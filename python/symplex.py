import sys
import sympy
from sympy import jscode
import json

command = sys.argv[1]
variable = sys.argv[2]
expression = sympy.sympify(sys.argv[3])

if(command == 'diff'):
  for s in expression.free_symbols:
    if(str(s) == variable):
      result = sympy.diff(expression, s)
elif(command == 'integrate'):
  for s in expression.free_symbols:
    if(str(s) == variable):
      result = sympy.integrate(expression, s)
elif(command == 'extrema'):
  for s in expression.free_symbols:
    if(str(s) == variable):
      result = sympy.diff(expression, s)
      result = sympy.solve(result, s)
      result = result[0]
elif(command == 'simplify'):
  result = sympy.simplify(expression)

pythonDict = {}
pythonDict["Variables"], pythonDict["Expression"] = sympy.cse(result)

for i, expr in enumerate(pythonDict["Variables"]):
  tdict = {}
  tdict["name"] = str(expr[0])
  tdict["expr"] = str(sympy.jscode(expr[1]))
  pythonDict["Variables"][i] = tdict

pythonDict["Expression"] = sympy.jscode(pythonDict["Expression"][0])

print(json.dumps(pythonDict, indent=4))
sys.stdout.flush()