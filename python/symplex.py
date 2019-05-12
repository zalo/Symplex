import sys
import sympy

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
elif(command == 'simplify'):
  result = sympy.simplify(expression)
elif(command == 'cse'):
  result = sympy.cse(expression)

print(str(result) + "\n// AST: "+str(sympy.srepr(result)))
sys.stdout.flush()