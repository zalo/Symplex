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

			// Two Argument Operation
			case ts.SyntaxKind.BinaryExpression:
				code += delint(node.getChildAt(0, s)) + " ";
				code += delint(node.getChildAt(1, s)) + " ";
				code += delint(node.getChildAt(2, s));
				break;

			// Operators
			case ts.SyntaxKind.PlusToken:
				code += "+";
				break;
			case ts.SyntaxKind.MinusToken:
				code += "-";
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
					code += '(';
					let counter = 0;
					ts.forEachChild(node, cbNode => {
						if(counter>0){
							code += delint(cbNode)+"**";
						}
						counter++;
					});
					code = code.substring(0, code.length - 2);
					code += ')';
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

export function convertToSympy(tsSource:string){
	s = ts.createSourceFile('ast.ts', tsSource, ts.ScriptTarget.Latest);
	// Walk the AST of the sourceFile and print code!!
	replacementDict = {};
	let code = '';
	s.forEachChild(cbNode => {
		code += "\r\n" + delint(cbNode);
	});

	code = code.substring(0, code.length-1);
	code = code.substring(code.lastIndexOf("\n")+1, code.length);

	return code;
}

function getCurrentSelection() {
	var editor = vscode.window.activeTextEditor;
	if (!editor) { return ''; }
	return editor.document.getText(editor.selection);
}

function querySympy(command:string, variable:string, code:string, prefix:string){
	const spawn = require("child_process").spawn;
	const pythonProcess = spawn('python',[symplexPath, command, variable, code]);
	pythonProcess.stdout.on('data', (data:string) => {
		if(vscode.window.activeTextEditor){
			vscode.window.activeTextEditor.edit(builder => {
				if(vscode.window.activeTextEditor){
					builder.insert(vscode.window.activeTextEditor.selection.start, prefix+data);
				}
			});
		}
	});
}

// Register the Right Click Menu Actions
export function activate(context: vscode.ExtensionContext) {
	symplexPath = context.asAbsolutePath("/python/symplex.py");

	let differentiate = vscode.commands.registerCommand('extension.Differentiate', () => {
		let code = convertToSympy(getCurrentSelection());
		let command = 'diff'; let variable = 't';
		querySympy(command, variable, code, "// Derivative wrt t: ");
	});
	context.subscriptions.push(differentiate);

	let integrate = vscode.commands.registerCommand('extension.Integrate', () => {
		let code = convertToSympy(getCurrentSelection());
		let command = 'integrate'; let variable = 't';
		querySympy(command, variable, code, "// Integral wrt t: ");
	});
	context.subscriptions.push(integrate);

	let findExtrema = vscode.commands.registerCommand('extension.FindExtrema', () => {
		let code = convertToSympy(getCurrentSelection());
		let command = 'extrema'; let variable = 't';
		querySympy(command, variable, code, "// Extrema wrt t: ");
	});
	context.subscriptions.push(findExtrema);

	let simplify = vscode.commands.registerCommand('extension.Simplify', () => {
		let code = convertToSympy(getCurrentSelection());
		let command = 'simplify'; let variable = 't';
		querySympy(command, variable, code, "// Simplified: ");
	});
	context.subscriptions.push(simplify);
}

// this method is called when your extension is deactivated
export function deactivate() {}
