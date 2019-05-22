import * as ts from 'typescript';

export function delint(node:ts.Node|undefined, s:ts.SourceFile|undefined, r:any){
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
				code += delint(node.getChildAt(1, s), s, r);
				break;
			case ts.SyntaxKind.VariableDeclaration:
				//Use replacement dictionary
				let varName = delint(node.getChildAt(0, s), s, r);
				let expression = delint(node.getChildAt(2, s), s, r);
				r[varName] = expression;

				//code += varName;
				//code += " = ";
				code += expression;
				break;

			case ts.SyntaxKind.PrefixUnaryExpression:
				code += delint(node.getChildAt(0, s), s, r);
				code += delint(node.getChildAt(1, s), s, r);
				break;

			// Two Argument Operation
			case ts.SyntaxKind.BinaryExpression:
				code += delint(node.getChildAt(0, s), s, r);
				code += delint(node.getChildAt(1, s), s, r);
				code += delint(node.getChildAt(2, s), s, r);
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
				let name = delint(node.getChildAt(0, s), s, r);
				// SPECIAL CODE FOR POW
				if(name !== "pow"){
					code += name + '(';
					let counter = 0;
					ts.forEachChild(node, cbNode => {
						if(counter>0){
							code += delint(cbNode, s, r)+", ";
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
							code += delint(cbNode, s, r)+"**";
						}
						counter++;
					});
					code = code.substring(0, code.length - 2);
					//code += ')';
				}
				break;
			case ts.SyntaxKind.PropertyAccessExpression:
				if(delint(node.getChildAt(0, s), s, r) === 'Math'){
					code += delint(node.getChildAt(2, s), s, r);
				}
				break;
			case ts.SyntaxKind.ParenthesizedExpression:
				code += "(" + delint(node.getChildAt(1, s), s, r) + ")";
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
				if (variableName in r) {
					variableName = "(" + r[variableName] + ")";
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
				code += delint(node.getChildAt(0, s), s, r);
				break;
		}
	} else {
		console.log("NODE IS UNDEFINED!");
	}
	return code;
}

export function convertToSympy(source:string) {
	let code = '';
	let replacementDict:any = {};
  let s = ts.createSourceFile('ast.ts', source, ts.ScriptTarget.Latest);
  
	// Walk the AST of the sourceFile and print code!!
	s.forEachChild(cbNode => {
		code += "\r\n" + delint(cbNode, s, replacementDict);
	});

	code = code.substring(0, code.length-1);
	code = code.substring(code.lastIndexOf("\n")+1, code.length);
  return code;
}
