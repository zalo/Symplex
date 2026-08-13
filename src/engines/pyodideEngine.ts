import * as path from 'path';
import { WorkerEngine } from './workerEngine';

/**
 * Runs SymPy inside the extension via Pyodide (CPython compiled to
 * WebAssembly) on a worker thread. Requires no Python installation.
 */
export class PyodideEngine extends WorkerEngine {
	constructor(private symplexPyPath: string, private packageCacheDir: string,
		idleShutdownMs?: number) {
		super(idleShutdownMs);
	}

	protected workerScript(): string {
		return path.join(__dirname, 'pyodideWorker.js');
	}

	protected workerData(): { [key: string]: unknown } {
		return {
			symplexPyPath: this.symplexPyPath,
			packageCacheDir: this.packageCacheDir
		};
	}
}
