import * as vscode from 'vscode';
import * as utils from './utils';
import * as js from './javascriptSupport';
import * as py from './pythonSupport';

// Transforms the target source code into a Sympy-compatible string expression
function convertToSympy(source:string) {
	let language = utils.getCurrentLanguage();
	if (language === 'javascript' || language === 'typescript') {
		return js.convertToSympy(source);
	} else if(language === 'python') {
		return py.convertToSympy(source);
	} else {
		vscode.window.showErrorMessage("Parsing Failed: Filetype Unknown. "+
																		"Supported Filetypes: .js, .ts, .py");
	}
	return '';
}

// Initializing variables in a few languages
var variablePrefixes:
{ [language: string]: string; } = { 
	"python"     : '',
	"javscript"  : 'let ',
	"typescript" : 'let ',
	"c"          : 'float ',
	"csharp"     : 'float ',
	"cpp"        : 'float '
};

function querySympy(command:string, code:string, outputName:string){
	var curCommand = command;
	let language = utils.getCurrentLanguage();
	const spawn = require("child_process").spawn;
	const pythonProcess = spawn('python', [symplexPath, command, language, code]);

	pythonProcess.stdout.on('data', (data:string) => {
		var generatedText = '';
		if(curCommand === 'eval') {
			let parsedEquations = JSON.parse(data.toString());
			if (parsedEquations.returnString) {
				generatedText = parsedEquations.returnString;
			} else {
				let variablePrefix  = variablePrefixes[language];
				let variableSuffix  = (language === "python" ? "" : ";");
				for(let i = 0; i < parsedEquations.Variables.length;  i++){
					generatedText += variablePrefix+parsedEquations.Variables[i].name + " = " + 
														parsedEquations.Variables[i].expr + variableSuffix + "\r\n";
				}
				generatedText += variablePrefix+outputName + " = " + 
													parsedEquations.Expression + variableSuffix + "\r\n";
			}
		}

		if(vscode.window.activeTextEditor){
			vscode.window.activeTextEditor.edit(builder => {
				if(vscode.window.activeTextEditor){
					generatedText = generatedText.substring(0, data.length-2);
					builder.insert(vscode.window.activeTextEditor.selection.end, 
												  "\r\n\r\n"+generatedText);
				}
			});
		}
	});

	pythonProcess.stderr.on('data', (data:string) => {
		data = data.toString();
		vscode.window.showErrorMessage("SymPy Error: \r\n"+data);
		console.error(data);
	});
}

var symplexPath:string;
export function activate(context: vscode.ExtensionContext) {
	symplexPath = context.asAbsolutePath("/python/symplex.py");

	// Register the Right Click Menu Actions ------------------------------------
	{
		let evaluate = vscode.commands.registerCommand('symplex.Evaluate', () => {
			querySympy('eval', convertToSympy(utils.getCurrentSelection()), "result");
		});
		context.subscriptions.push(evaluate);

		let expression = vscode.commands.registerCommand('symplex.GetExpression', () => {
			var parsedExpression = convertToSympy(utils.getCurrentSelection());
			if(vscode.window.activeTextEditor){
				vscode.window.activeTextEditor.edit(builder => {
					if(vscode.window.activeTextEditor){
						builder.insert(vscode.window.activeTextEditor.selection.end, 
														"\r\n\r\n"+parsedExpression);
					}
				});
			}
		});
		context.subscriptions.push(expression);
	}

	// Register Handy SymPy operations ------------------------------------------
	{
		let symplexCompletions = { provideCompletionItems(document: vscode.TextDocument, 
			position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
				//Unused good stuff
				//commandCompletion.command = { command: 'jumpToNextSnippetPlaceholder', title: 'Accept suggestion and move on...' };
				//commandCompletion.commitCharacters = ['.'];

				const integrateCompletion         = new vscode.CompletionItem('integrate');
				const diffCompletion              = new vscode.CompletionItem('diff');
				const limitCompletion             = new vscode.CompletionItem('limit');
				const seriesCompletion            = new vscode.CompletionItem('series');
				const solveCompletion             = new vscode.CompletionItem('solve');
				const extremumCompletion          = new vscode.CompletionItem('extremum');
				const latexCompletion             = new vscode.CompletionItem('latex');

				integrateCompletion.insertText    = new vscode.SnippetString('integrate(${1:expression}, ${2:var})');
				diffCompletion.insertText         = new vscode.SnippetString('diff(${1:expression}, ${2:var})');
				limitCompletion.insertText        = new vscode.SnippetString('limit(${1:expression}, ${2:var}, ${3:value})');
				seriesCompletion.insertText       = new vscode.SnippetString('series(${1:expression}, ${2:var}, ${3:centerValue})');
				solveCompletion.insertText        = new vscode.SnippetString('solve(${1:expression}, ${2:var})');
				extremumCompletion.insertText     = new vscode.SnippetString('solve(diff(${1:expression}, ${2:var}), ${2})');
				latexCompletion.insertText        = new vscode.SnippetString('latex(${1:expression})');

				integrateCompletion.documentation = new vscode.MarkdownString('Symplex: Symbolic Integral with respect to `var`');
				diffCompletion.documentation      = new vscode.MarkdownString('Symplex: Symbolic Derivative with respect to `var`');
				limitCompletion.documentation     = new vscode.MarkdownString('Symplex: Symbolic Limit as `var` approaches `value`');
				seriesCompletion.documentation    = new vscode.MarkdownString('Symplex: Symbolic Series Expansion of the region `var` = `value` to the 6th order');
				solveCompletion.documentation     = new vscode.MarkdownString('Symplex: Symbolic Solving for `var`');
				extremumCompletion.documentation  = new vscode.MarkdownString('Symplex: Symbolic Extrema with respect to `var`. \nNote: Only returns the first real extremum.');
				latexCompletion.documentation     = new vscode.MarkdownString('Symplex: Generate LaTeX from Expressions');

				integrateCompletion.kind          = vscode.CompletionItemKind.Method;
				diffCompletion.kind               = vscode.CompletionItemKind.Method;
				limitCompletion.kind              = vscode.CompletionItemKind.Method;
				seriesCompletion.kind             = vscode.CompletionItemKind.Method;
				solveCompletion.kind              = vscode.CompletionItemKind.Method;
				extremumCompletion.kind           = vscode.CompletionItemKind.Method;
				latexCompletion.kind              = vscode.CompletionItemKind.Method;

				return [
					integrateCompletion,
					diffCompletion,
					limitCompletion,
					seriesCompletion,
					solveCompletion,
					extremumCompletion,
					latexCompletion
				];
			}
		};

		let symplexJavascriptCompletions = vscode.languages.registerCompletionItemProvider({language:'javascript', scheme:'file'}, symplexCompletions);
		let symplexTypescriptCompletions = vscode.languages.registerCompletionItemProvider({language:'typescript', scheme:'file'}, symplexCompletions);
		let symplexPythonCompletions     = vscode.languages.registerCompletionItemProvider({language:'python',     scheme:'file'}, symplexCompletions);

		context.subscriptions.push(symplexJavascriptCompletions, symplexTypescriptCompletions, symplexPythonCompletions);
	}
}

export function deactivate() {}
