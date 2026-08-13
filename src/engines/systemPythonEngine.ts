import { spawn } from 'child_process';
import { SympyEngine, SympyResult } from './types';

/**
 * Runs SymPy with a locally installed Python interpreter by invoking
 * python/symplex.py as a subprocess. Requires `pip install sympy`.
 */
export class SystemPythonEngine implements SympyEngine {
	constructor(private pythonPath: string, private symplexPyPath: string) { }

	evaluate(language: string, expression: string, timeoutMs: number): Promise<SympyResult> {
		return new Promise<SympyResult>((resolve, reject) => {
			const process = spawn(this.pythonPath,
				[this.symplexPyPath, 'eval', language, expression, String(timeoutMs / 1000)]);
			let stdout = '';
			let stderr = '';
			let settled = false;

			const timer = setTimeout(() => {
				settled = true;
				process.kill();
				reject(new Error('SymPy evaluation timed out after ' + (timeoutMs / 1000) + 's.'));
			}, timeoutMs + 1000);

			process.stdout.on('data', chunk => { stdout += chunk.toString(); });
			process.stderr.on('data', chunk => { stderr += chunk.toString(); });
			process.on('error', error => {
				if (settled) { return; }
				settled = true;
				clearTimeout(timer);
				reject(new Error('Could not start "' + this.pythonPath + '": ' + error.message +
					'. Set "symplex.pythonPath", or switch "symplex.engine" to "embedded".'));
			});
			process.on('close', code => {
				if (settled) { return; }
				settled = true;
				clearTimeout(timer);
				if (code !== 0) {
					reject(new Error(stderr.trim() || ('Python exited with code ' + code + '.')));
					return;
				}
				try {
					resolve(JSON.parse(stdout));
				} catch {
					reject(new Error('Could not parse SymPy output: ' + stdout.trim()));
				}
			});
		});
	}

	dispose(): void { }
}
