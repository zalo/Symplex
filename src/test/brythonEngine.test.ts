import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { test } from 'node:test';
import { BrythonEngine } from '../engines/brythonEngine';

const brythonDir = path.join(__dirname, '..', '..', 'vendor', 'brython');
const haveLibs = fs.existsSync(path.join(brythonDir, 'lib', 'sympy', '__init__.py'));

// End-to-end: run real SymPy through the embedded Brython engine.
// Requires `npm run fetch-brython-libs` (skipped otherwise).
test('brython engine evaluates SymPy expressions', { timeout: 300000, skip: !haveLibs }, async () => {
	const symplexPy = path.join(__dirname, '..', '..', 'python', 'symplex.py');
	const engine = new BrythonEngine(brythonDir, symplexPy);
	try {
		// generous timeout: the first call imports sympy inside Brython (~10s)
		const integral = await engine.evaluate('javascript', 'integrate(x*x, x)', 240000);
		assert.strictEqual(integral.Expression, '(1/3)*Math.pow(x, 3)');

		const latex = await engine.evaluate('python', 'latex(x**2)', 60000);
		assert.strictEqual(latex.returnString, 'x^{2}');

		// solve() root ordering differs between runtimes; either root is valid
		const solved = await engine.evaluate('python', 'solve(x**2 - 4, x)', 60000);
		assert.ok(['2', '-2'].includes(solved.Expression!),
			'unexpected root: ' + solved.Expression);

		const diffed = await engine.evaluate('python', 'diff(x**3, x)', 60000);
		assert.strictEqual(diffed.Expression, '3*x**2');

		await assert.rejects(engine.evaluate('python', 'x +* (3', 60000));
	} finally {
		engine.dispose();
	}
});
