import sys
import sympy
from sympy import jscode
import json

command = sys.argv[1]
variable = sys.argv[2]
extension = sys.argv[3]
expression = sympy.sympify(sys.argv[4])

result = None
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

assert result is not None, "SymPy Error: Variable "+str(variable)+" not found!"

pythonDict = {}
pythonDict["Variables"], pythonDict["Expression"] = sympy.cse(result)

for i, expr in enumerate(pythonDict["Variables"]):
  tdict = {}
  tdict["name"] = str(expr[0])
  if(extension == "python"):
    tdict["expr"] = str(expr[1])
  elif(extension == "javascript" or extension == "typescript"):
    tdict["expr"] = str(sympy.jscode(expr[1]))   
  pythonDict["Variables"][i] = tdict

if(extension == "python"):
  pythonDict["Expression"] = str(pythonDict["Expression"][0])
elif(extension == "javascript" or extension == "typescript"):
  pythonDict["Expression"] = sympy.jscode(pythonDict["Expression"][0])

print(json.dumps(pythonDict, indent=4))
sys.stdout.flush()