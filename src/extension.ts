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
	//console.log("Final Formula: "+code);
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
			}else{
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

	// Register the Right Click Menu Actions -----------------------------------
	{
		let evaluate = vscode.commands.registerCommand('extension.Evaluate', () => {
			querySympy('eval', convertToSympy(utils.getCurrentSelection()), "result");
		});
		context.subscriptions.push(evaluate);

		let expression = vscode.commands.registerCommand('extension.GetExpression', () => {
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
}

export function deactivate() {}
