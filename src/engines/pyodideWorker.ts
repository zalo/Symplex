// Worker thread that hosts the Pyodide (WebAssembly Python) runtime.
// Running SymPy here keeps long evaluations off the extension-host thread,
// and lets the main thread cancel a wedged evaluation by terminating us.
import * as fs from 'fs';
import { parentPort, workerData } from 'worker_threads';
import { loadPyodide, PyodideInterface } from 'pyodide';

interface WorkerRequest { id: number; language: string; expression: string; }

const { symplexPyPath, packageCacheDir } = workerData as {
	symplexPyPath: string; packageCacheDir: string;
};

const pyodideReady: Promise<PyodideInterface> = (async () => {
	const pyodide = await loadPyodide({ packageCacheDir });
	// Ships with the extension when wheels/ is populated; downloads from the
	// Pyodide CDN into packageCacheDir otherwise.
	await pyodide.loadPackage(['sympy'], { messageCallback: () => { } });
	// Import symplex.py as a module (not via runPython, which would execute
	// its `if __name__ == "__main__"` CLI block inside the WASM runtime).
	pyodide.FS.writeFile('/home/pyodide/symplex.py', fs.readFileSync(symplexPyPath, 'utf8'));
	pyodide.runPython(
		'import json\n' +
		'import symplex\n' +
		'def _symplex_evaluate_json(language, expression):\n' +
		'    return json.dumps(symplex.evaluate(language, expression))\n');
	return pyodide;
})();

if (!parentPort) { throw new Error('pyodideWorker must be run as a worker thread.'); }

parentPort.on('message', async (request: WorkerRequest) => {
	try {
		const pyodide = await pyodideReady;
		const evaluateJson = pyodide.globals.get('_symplex_evaluate_json');
		try {
			const resultJson: string = evaluateJson(request.language, request.expression);
			parentPort!.postMessage({ id: request.id, result: JSON.parse(resultJson) });
		} finally {
			evaluateJson.destroy();
		}
	} catch (error) {
		parentPort!.postMessage({
			id: request.id,
			error: error instanceof Error ? error.message : String(error)
		});
	}
});
