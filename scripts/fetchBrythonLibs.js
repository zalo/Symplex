// Extracts the pure-Python sympy and mpmath packages into vendor/brython/lib
// for the Brython engine. Reuses the wheels downloaded by fetchWheels.js
// (runs it first if the wheels are missing). Run by `vscode:prepublish`.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const AdmZip = require('adm-zip');

const wheelsDir = path.join(__dirname, '..', 'wheels');
const libDir = path.join(__dirname, '..', 'vendor', 'brython', 'lib');

function wheelFor(pkg) {
	if (!fs.existsSync(wheelsDir) ||
		!fs.readdirSync(wheelsDir).some(f => f.startsWith(pkg + '-'))) {
		console.log('Wheels missing; running fetchWheels.js first...');
		execFileSync(process.execPath, [path.join(__dirname, 'fetchWheels.js')],
			{ stdio: 'inherit' });
	}
	const name = fs.readdirSync(wheelsDir).find(f => f.startsWith(pkg + '-') && f.endsWith('.whl'));
	if (!name) { throw new Error('No wheel found for ' + pkg); }
	return path.join(wheelsDir, name);
}

fs.rmSync(libDir, { recursive: true, force: true });
fs.mkdirSync(libDir, { recursive: true });
for (const pkg of ['sympy', 'mpmath']) {
	const wheel = wheelFor(pkg);
	const zip = new AdmZip(wheel);
	// extract only the package directory, not the .dist-info metadata
	for (const entry of zip.getEntries()) {
		if (entry.entryName.startsWith(pkg + '/')) {
			zip.extractEntryTo(entry, libDir, /*maintainEntryPath*/ true, /*overwrite*/ true);
		}
	}
	console.log('Extracted', path.basename(wheel), '->', path.join('vendor', 'brython', 'lib', pkg));
}
