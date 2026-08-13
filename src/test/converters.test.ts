import * as assert from 'assert';
import { test } from 'node:test';
import * as js from '../converters/javascript';
import * as py from '../converters/python';
import { ConversionResult } from '../converters/types';

function expectOk(result: ConversionResult, expected: string): void {
	assert.ok(result.ok, 'expected success, got error: ' + (result.ok ? '' : result.error));
	assert.strictEqual(result.expression, expected);
}

function expectError(result: ConversionResult): void {
	assert.ok(!result.ok, 'expected an error, got: ' + (result.ok ? result.expression : ''));
}

// --- JavaScript / TypeScript ------------------------------------------------

test('js: basic expression', () => {
	expectOk(js.convertToSympy('let y = x*x + 2;'), 'x*x + 2');
});

test('js: variable substitution', () => {
	expectOk(js.convertToSympy('let a = 2*x;\nlet b = a + 1;'), '(2*x) + 1');
});

test('js: pow gets parenthesized', () => {
	expectOk(js.convertToSympy('let a = pow(x+1, 2);'), '(x + 1)**2');
});

test('js: Math.pow and precedence', () => {
	expectOk(js.convertToSympy('let a = Math.pow(x+1, 2) * 3;'), '(x + 1)**2*3');
});

test('js: exponentiation operator', () => {
	expectOk(js.convertToSympy('let r = a ** (b + 1);'), 'a**(b + 1)');
});

test('js: modulo becomes Mod()', () => {
	expectOk(js.convertToSympy('let r = a % b;'), 'Mod(a, b)');
});

test('js: multiple declarators in one statement', () => {
	expectOk(js.convertToSympy('let x = 5, y = x * 2;'), '(5)*2');
});

test('js: zero-argument call', () => {
	expectOk(js.convertToSympy('let f = foo();'), 'foo()');
});

test('js: Math functions and constants', () => {
	expectOk(js.convertToSympy('let q = Math.sin(t) / Math.cos(t) + Math.PI;'),
		'sin(t)/cos(t) + pi');
});

test('js: Math.ceil and Math.abs map to SymPy names', () => {
	expectOk(js.convertToSympy('Math.ceil(x) + Math.abs(y)'), 'ceiling(x) + Abs(y)');
});

test('js: type annotations are fine', () => {
	expectOk(js.convertToSympy('let x: number = 3;\nlet y = x + 1;'), '(3) + 1');
});

test('js: unary minus', () => {
	expectOk(js.convertToSympy('let z = -x + 4;'), '-x + 4');
});

test('js: bare final expression', () => {
	expectOk(js.convertToSympy('let a = 2*x;\nintegrate(a, x)'), 'integrate((2*x), x)');
});

test('js: re-assignment of an existing variable', () => {
	expectOk(js.convertToSympy('let a = x;\na = a + 1;\na * 2'), '((x) + 1)*2');
});

test('js: equality becomes Eq()', () => {
	expectOk(js.convertToSympy('solve(x*x == 4, x)'), 'solve(Eq(x*x, 4), x)');
});

test('js: unsupported property access errors instead of vanishing', () => {
	expectError(js.convertToSympy('let v = obj.prop + 1;'));
});

test('js: unsupported statements error', () => {
	expectError(js.convertToSympy('for (let i = 0; i < 3; i++) { x += i; }'));
});

test('js: empty selection errors', () => {
	expectError(js.convertToSympy('   '));
});

// --- Python -------------------------------------------------------------------

test('py: basic chain with assignment result', () => {
	expectOk(py.convertToSympy('a = 2\nb = a * 3\nresult = b + 1'), '((2) * 3) + 1');
});

test('py: bare final expression', () => {
	expectOk(py.convertToSympy('a = 2\nb = a * 3\nb + 1'), '((2) * 3) + 1');
});

test('py: no substitution inside function names', () => {
	expectOk(py.convertToSympy('x = 3\nresult = exp(x)'), 'exp((3))');
});

test('py: no prefix collisions between variable names', () => {
	expectOk(py.convertToSympy('a = 2\nab = 5\nab + a'), '(5) + (2)');
});

test('py: self-reference does not hang', () => {
	expectOk(py.convertToSympy('x = x + 1\nresult = x * 2'), '(x + 1) * 2');
});

test('py: trailing newline and blank lines', () => {
	expectOk(py.convertToSympy('a = 1\nb = a + 1\n\n'), '(1) + 1');
});

test('py: comments are stripped', () => {
	expectOk(py.convertToSympy('t = 2  # a comment\nt * 3'), '(2) * 3');
});

test('py: comparison lines are not treated as assignments', () => {
	expectOk(py.convertToSympy('x = 2\nsolve(y == x, y)'), 'solve(y == (2), y)');
});

test('py: augmented assignment errors', () => {
	expectError(py.convertToSympy('x = 1\nx += 2\nx'));
});

test('py: empty selection errors', () => {
	expectError(py.convertToSympy('\n   \n'));
});
