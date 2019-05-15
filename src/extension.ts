import * as vscode from 'vscode';
import * as ts from 'typescript';

var replacementDict:any = {};
var s:ts.SourceFile|undefined;
var symplexPath:string;

function delint(node:ts.Node|undefined){
	let code = '';
	if (node && s) {
		//if(node.getChildCount(s) > 0){
		//	console.log("Stepping into a node of kind: "+
		//		ts.SyntaxKind[node.kind]);
		//	console.log("It should contain "+ node.getChildCount(s) + " nodes for: ");
		//	ts.forEachChild(node, cbNode => {
		//		console.log("-"+ts.SyntaxKind[cbNode.kind]+": "+cbNode.getText(s));
		//	});
		//} else {
		//	console.log("Stepping through a node of kind: "+
		//		ts.SyntaxKind[node.kind]);
		//}

		switch (node.kind) {
			//Variable Declaration Parsing
			//case ts.SyntaxKind.VariableStatement:
			//	code += delint(node.getChildAt(0, s), s);
			//	break;
			case ts.SyntaxKind.VariableDeclarationList:
				code += delint(node.getChildAt(1, s));
				break;
			case ts.SyntaxKind.VariableDeclaration:
				//Use replacement dictionary
				let varName = delint(node.getChildAt(0, s));
				let expression = delint(node.getChildAt(2, s));
				replacementDict[varName] = expression;

				//code += varName;
				//code += " = ";
				code += expression;
				break;

			case ts.SyntaxKind.PrefixUnaryExpression:
				code += delint(node.getChildAt(0, s));
				code += delint(node.getChildAt(1, s));
				break;

			// Two Argument Operation
			case ts.SyntaxKind.BinaryExpression:
				code += delint(node.getChildAt(0, s));
				code += delint(node.getChildAt(1, s));
				code += delint(node.getChildAt(2, s));
				break;

			// Operators
			case ts.SyntaxKind.PlusToken:
				code += " + ";
				break;
			case ts.SyntaxKind.MinusToken:
				code += " - ";
				break;
			case ts.SyntaxKind.AsteriskToken:
				code += "*";
				break;
			case ts.SyntaxKind.SlashToken:
				code += "/";
				break;

			// Higher Level Functions
			case ts.SyntaxKind.CallExpression:
				let name = delint(node.getChildAt(0, s));
				// SPECIAL CODE FOR POW
				if(name !== "pow"){
					code += name + '(';
					let counter = 0;
					ts.forEachChild(node, cbNode => {
						if(counter>0){
							code += delint(cbNode)+", ";
						}
						counter++;
					});
					code = code.substring(0, code.length - 2);
					code += ')';
				} else {
					//code += '(';
					let counter = 0;
					ts.forEachChild(node, cbNode => {
						if(counter>0){
							code += delint(cbNode)+"**";
						}
						counter++;
					});
					code = code.substring(0, code.length - 2);
					//code += ')';
				}
				break;
			case ts.SyntaxKind.PropertyAccessExpression:
				if(delint(node.getChildAt(0, s)) === 'Math'){
					code += delint(node.getChildAt(2, s));
				}
				break;
			case ts.SyntaxKind.ParenthesizedExpression:
				code += "(" + delint(node.getChildAt(1, s)) + ")";
				break;

			// Raw printing of the Literals/Names/Identifiers
			case ts.SyntaxKind.FirstLiteralToken:
				code += node.getText(s);
				break;
			case ts.SyntaxKind.NumericLiteral:
				code += node.getText(s);
				break;
			case ts.SyntaxKind.Identifier:
				let variableName = node.getText(s);

				// Substitute formula in for variable name when possible!
				if (variableName in replacementDict) {
					variableName = "(" + replacementDict[variableName] + ")";
				}
				code += variableName;
				break;

			// NOPs
			case ts.SyntaxKind.LetKeyword:
				break;
			case ts.SyntaxKind.VarKeyword:
				break;
		  case ts.SyntaxKind.EndOfFileToken:
				break;
			case ts.SyntaxKind.FirstAssignment:
				break;

			default:
				code += delint(node.getChildAt(0, s));
				break;
		}
	} else {
		console.log("NODE IS UNDEFINED!");
	}
	return code;
}

function getCurrentFileExtension() {
	if(vscode.window.activeTextEditor){
		let currentlyOpenTabfilePath = vscode.window.activeTextEditor.document.fileName;
		let tokens = currentlyOpenTabfilePath.split('.');
		return tokens[tokens.length-1];
	}
	return "";
}

function replaceAll(input:string, toReplace:string, replace:string) {
	let toReturn = input;
	let oldstring = '';
	while (oldstring !== toReturn){
		oldstring = toReturn+'';
		toReturn = toReturn.replace(toReplace, replace);
	}
	return toReturn;
}

export function convertToSympy(source:string) {
	let code = '';
	replacementDict = {};
	let extension = getCurrentFileExtension();
	if(extension === 'js' || extension === 'ts') {
		s = ts.createSourceFile('ast.ts', source, ts.ScriptTarget.Latest);

		// Walk the AST of the sourceFile and print code!!
		s.forEachChild(cbNode => {
			code += "\r\n" + delint(cbNode);
		});
	
		code = code.substring(0, code.length-1);
		code = code.substring(code.lastIndexOf("\n")+1, code.length);
	}else if(extension === 'py'){
		let nocr = source.replace("\r", "");
		let lines = nocr.split("\n");
		let counter = 0;
		lines.forEach(line => {
			let declarations = line.trim().split("=");
			if(declarations.length < 2){
				vscode.window.showErrorMessage("Parsing Error: Python Variable Declarations must be on a single line!");
			}

			declarations[0] = declarations[0].trim();
			declarations[1] = declarations[1].replace(";", "").trim();
			// Substitute
			let replacementKeys:string[] = [];
			for (var key in replacementDict) {
				if (replacementDict.hasOwnProperty(key)) {
					replacementKeys.push(key);
				}
			}
			for(let i = replacementKeys.length-1; i >= 0; i--){
				declarations[1] = replaceAll(declarations[1], replacementKeys[i], replacementDict[replacementKeys[i]]);
			}
			
			// Accumulate mappings for the substitution
			if(counter < lines.length-1){
				replacementDict[declarations[0]] = "("+declarations[1]+")";
			}else{
				// Return final, fully substituted code
				code = declarations[1];
			}
			counter++;
		});
	}else{
		vscode.window.showErrorMessage("Parsing Failed: Filetype Unknown. Supported Filetypes: .js, .ts, .py");
	}
	//console.log("Final Formula: "+code);
	return code;
}

function getCurrentSelection() {
	var editor = vscode.window.activeTextEditor;
	if (!editor) { return ''; }
	return editor.document.getText(editor.selection);
}

function querySympy(command:string, variable:string, code:string, outputName:string){
	let extension = getCurrentFileExtension();
	const spawn = require("child_process").spawn;
	const pythonProcess = spawn('python', [symplexPath, command, variable, extension, code]);

	pythonProcess.stdout.on('data', (data:string) => {
		let parsedEquations = JSON.parse(data.toString());

		var generatedCode = '';
		var variablePrefix = (extension === "py" ? "" : "let ");
		var variableSuffix = (extension === "py" ? "" : ";");
		for(let i = 0; i < parsedEquations.Variables.length;  i++){
			generatedCode += variablePrefix+parsedEquations.Variables[i].name+" = "+parsedEquations.Variables[i].expr + variableSuffix + "\r\n";
		}
		generatedCode += variablePrefix+outputName+" = "+parsedEquations.Expression + variableSuffix + "\r\n";

		if(vscode.window.activeTextEditor){
			vscode.window.activeTextEditor.edit(builder => {
				if(vscode.window.activeTextEditor){
					generatedCode = generatedCode.substring(0, data.length-2);
					builder.insert(vscode.window.activeTextEditor.selection.end, "\r\n\r\n"+generatedCode);
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

// Register the Right Click Menu Actions
export function activate(context: vscode.ExtensionContext) {
	symplexPath = context.asAbsolutePath("/python/symplex.py");

	let differentiate = vscode.commands.registerCommand('extension.Differentiate', () => {
		let code = convertToSympy(getCurrentSelection());
		let command = 'diff'; let variable = 't';
		querySympy(command, variable, code, "diffWRT"+variable);
	});
	context.subscriptions.push(differentiate);

	let integrate = vscode.commands.registerCommand('extension.Integrate', () => {
		let code = convertToSympy(getCurrentSelection());
		let command = 'integrate'; let variable = 't';
		querySympy(command, variable, code, "intWRT"+variable);
	});
	context.subscriptions.push(integrate);

	let findExtrema = vscode.commands.registerCommand('extension.FindExtrema', () => {
		let code = convertToSympy(getCurrentSelection());
		let command = 'extrema'; let variable = 't';
		querySympy(command, variable, code, "extremaWRT"+variable);
	});
	context.subscriptions.push(findExtrema);

	let simplify = vscode.commands.registerCommand('extension.Simplify', () => {
		let code = convertToSympy(getCurrentSelection());
		let command = 'simplify'; let variable = 't';
		querySympy(command, variable, code, "simplified");
	});
	context.subscriptions.push(simplify);
}

// this method is called when your extension is deactivated
export function deactivate() {}
