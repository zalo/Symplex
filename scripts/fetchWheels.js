// Downloads the SymPy (and mpmath) wheels into wheels/ so the packaged
// extension works offline. Run automatically by `vscode:prepublish`.
// If this is skipped, the extension still works: Pyodide downloads the
// wheels from its CDN into the user's global storage on first use.
const path = require('path');
const { loadPyodide } = require('pyodide');

(async () => {
	const wheelsDir = path.join(__dirname, '..', 'wheels');
	const pyodide = await loadPyodide({ packageCacheDir: wheelsDir });
	await pyodide.loadPackage(['sympy']);
	console.log('SymPy wheels cached in ' + wheelsDir);
	process.exit(0);
})().catch(error => {
	console.error('Failed to fetch wheels:', error);
	process.exit(1);
});
