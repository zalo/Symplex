import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { test } from 'node:test';
import { PyodideEngine } from '../engines/pyodideEngine';

// End-to-end: run real SymPy through the embedded Pyodide engine.
test('pyodide engine evaluates SymPy expressions', { timeout: 120000 }, async () => {
	const symplexPy = path.join(__dirname, '..', '..', 'python', 'symplex.py');
	const wheels = path.join(__dirname, '..', '..', 'wheels');
	const cacheDir = fs.existsSync(wheels) ? wheels
		: fs.mkdtempSync(path.join(os.tmpdir(), 'symplex-wheels-'));
	const engine = new PyodideEngine(symplexPy, cacheDir);
	try {
		const integral = await engine.evaluate('javascript', 'integrate(x*x, x)', 90000);
		assert.strictEqual(integral.Expression, '(1/3)*Math.pow(x, 3)');

		const latex = await engine.evaluate('python', 'latex(x**2)', 30000);
		assert.strictEqual(latex.returnString, 'x^{2}');

		const solved = await engine.evaluate('python', 'solve(x**2 - 4, x)', 30000);
		assert.strictEqual(solved.Expression, '-2');

		// CSE splits repeated subexpressions into variables.
		const cse = await engine.evaluate('python',
			'diff(sin(x*x)*cos(x*x), x)', 30000);
		assert.ok((cse.Variables ?? []).length > 0, 'expected cse variables');

		await assert.rejects(engine.evaluate('python', 'x +* (3', 30000));
	} finally {
		engine.dispose();
	}
});
