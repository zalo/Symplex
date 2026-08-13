import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as js from './converters/javascript';
import * as py from './converters/python';
import { ConversionResult } from './converters/types';
import { PyodideEngine } from './engines/pyodideEngine';
import { SystemPythonEngine } from './engines/systemPythonEngine';
import { SympyEngine, SympyResult } from './engines/types';

// How generated assignments are written in each supported language.
const CODE_STYLES: { [language: string]: { prefix: string; suffix: string } } = {
	'python': { prefix: '', suffix: '' },
	'javascript': { prefix: 'let ', suffix: ';' },
	'typescript': { prefix: 'let ', suffix: ';' }
};

// Transforms the selected source code into a SymPy-compatible string expression.
function convertToSympy(language: string, source: string): ConversionResult {
	if (language === 'javascript' || language === 'typescript') {
		return js.convertToSympy(source);
	} else if (language === 'python') {
		return py.convertToSympy(source);
	}
	return { ok: false, error: 'Unsupported filetype "' + language + '". Supported: .js, .ts, .py' };
}

// Renders the engine's result back into lines of code in the target language.
function formatResult(result: SympyResult, language: string, outputName: string, eol: string): string {
	if (result.returnString !== undefined) {
		return result.returnString;
	}
	const style = CODE_STYLES[language] ?? CODE_STYLES['javascript'];
	const lines = (result.Variables ?? []).map(variable =>
		style.prefix + variable.name + ' = ' + variable.expr + style.suffix);
	lines.push(style.prefix + outputName + ' = ' + result.Expression + style.suffix);
	return lines.join(eol);
}

function insertBelowSelection(editor: vscode.TextEditor, text: string): Thenable<boolean> {
	const eol = editor.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
	const insertionPoint = editor.document.lineAt(editor.selection.end.line).range.end;
	return editor.edit(builder => builder.insert(insertionPoint, eol + eol + text));
}

let engine: SympyEngine | undefined;
let engineKind: string | undefined;

function getEngine(context: vscode.ExtensionContext): SympyEngine {
	const config = vscode.workspace.getConfiguration('symplex');
	const kind = config.get<string>('engine', 'embedded');
	if (engine && engineKind === kind) {
		return engine;
	}
	engine?.dispose();
	engineKind = kind;

	const symplexPyPath = context.asAbsolutePath(path.join('python', 'symplex.py'));
	if (kind === 'system') {
		const configuredPython = config.get<string>('pythonPath', '');
		const pythonPath = configuredPython ||
			(process.platform === 'win32' ? 'python' : 'python3');
		engine = new SystemPythonEngine(pythonPath, symplexPyPath);
	} else {
		// Prefer SymPy wheels shipped with the extension; fall back to a
		// writable cache that Pyodide fills from its CDN on first use.
		const bundledWheels = context.asAbsolutePath('wheels');
		const hasBundledWheels = fs.existsSync(bundledWheels) &&
			fs.readdirSync(bundledWheels).some(name => name.endsWith('.whl'));
		const packageCacheDir = hasBundledWheels ? bundledWheels
			: path.join(context.globalStorageUri.fsPath, 'pyodide-packages');
		fs.mkdirSync(packageCacheDir, { recursive: true });
		engine = new PyodideEngine(symplexPyPath, packageCacheDir);
	}
	return engine;
}

async function evaluateSelection(context: vscode.ExtensionContext): Promise<void> {
	const editor = vscode.window.activeTextEditor;
	if (!editor) { return; }
	const language = editor.document.languageId;
	const conversion = convertToSympy(language, editor.document.getText(editor.selection));
	if (!conversion.ok) {
		vscode.window.showErrorMessage('Symplex parsing failed: ' + conversion.error);
		return;
	}

	const timeoutMs = vscode.workspace.getConfiguration('symplex')
		.get<number>('timeoutSeconds', 15) * 1000;
	try {
		const result = await vscode.window.withProgress(
			{ location: vscode.ProgressLocation.Notification, title: 'Symplex: evaluating…' },
			() => getEngine(context).evaluate(language, conversion.expression, timeoutMs));
		const eol = editor.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
		await insertBelowSelection(editor, formatResult(result, language, 'result', eol));
	} catch (error) {
		vscode.window.showErrorMessage('SymPy error: ' +
			(error instanceof Error ? error.message : String(error)));
	}
}

function getExpression(): void {
	const editor = vscode.window.activeTextEditor;
	if (!editor) { return; }
	const conversion = convertToSympy(editor.document.languageId,
		editor.document.getText(editor.selection));
	if (!conversion.ok) {
		vscode.window.showErrorMessage('Symplex parsing failed: ' + conversion.error);
		return;
	}
	insertBelowSelection(editor, conversion.expression);
}

// Completion items documenting the handy SymPy operations Symplex understands.
function makeCompletions(): vscode.CompletionItem[] {
	const operations: [string, string, string][] = [
		['integrate', 'integrate(${1:expression}, ${2:var})',
			'Symplex: Symbolic Integral with respect to `var`'],
		['diff', 'diff(${1:expression}, ${2:var})',
			'Symplex: Symbolic Derivative with respect to `var`'],
		['limit', 'limit(${1:expression}, ${2:var}, ${3:value})',
			'Symplex: Symbolic Limit as `var` approaches `value`'],
		['series', 'series(${1:expression}, ${2:var}, ${3:centerValue})',
			'Symplex: Symbolic Series Expansion around `var` = `centerValue` to the 6th order'],
		['solve', 'solve(${1:expression}, ${2:var})',
			'Symplex: Symbolic Solving for `var`'],
		['extremum', 'solve(diff(${1:expression}, ${2:var}), ${2})',
			'Symplex: Symbolic Extrema with respect to `var`. \nNote: Only returns the first real extremum.'],
		['latex', 'latex(${1:expression})',
			'Symplex: Generate LaTeX from Expressions']
	];
	return operations.map(([label, snippet, documentation]) => {
		const completion = new vscode.CompletionItem(label, vscode.CompletionItemKind.Method);
		completion.insertText = new vscode.SnippetString(snippet);
		completion.documentation = new vscode.MarkdownString(documentation);
		return completion;
	});
}

export function activate(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('symplex.Evaluate', () => evaluateSelection(context)),
		vscode.commands.registerCommand('symplex.GetExpression', getExpression));

	const completionProvider = { provideCompletionItems: makeCompletions };
	for (const language of ['javascript', 'typescript', 'python']) {
		context.subscriptions.push(
			vscode.languages.registerCompletionItemProvider({ language }, completionProvider));
	}

	// Recreate the engine when its configuration changes.
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('symplex')) {
			engine?.dispose();
			engine = undefined;
			engineKind = undefined;
		}
	}));
}

export function deactivate(): void {
	engine?.dispose();
	engine = undefined;
}
