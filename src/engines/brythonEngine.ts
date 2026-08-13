import * as path from 'path';
import { WorkerEngine } from './workerEngine';

/**
 * Runs SymPy inside the extension via Brython (Python transpiled to
 * JavaScript) on a worker thread. Lighter than Pyodide (no WebAssembly
 * runtime), but slower per evaluation. Uses the patched Brython build in
 * vendor/brython (see vendor/brython/README.md and
 * https://github.com/brython-dev/brython/pull/2912).
 */
export class BrythonEngine extends WorkerEngine {
	constructor(private brythonDir: string, private symplexPyPath: string,
		idleShutdownMs?: number) {
		super(idleShutdownMs);
	}

	protected workerScript(): string {
		return path.join(__dirname, 'brythonWorker.js');
	}

	protected workerData(): { [key: string]: unknown } {
		return {
			brythonDir: this.brythonDir,
			symplexPyPath: this.symplexPyPath
		};
	}
}
