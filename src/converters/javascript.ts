import * as ts from 'typescript';
import { ConversionResult } from './types';

// Maps Math.* member names to their SymPy equivalents.
const MATH_FUNCTIONS: { [name: string]: string } = {
	'abs': 'Abs', 'sqrt': 'sqrt', 'cbrt': 'cbrt', 'exp': 'exp', 'log': 'log',
	'log2': 'log2', 'log10': 'log10', 'sign': 'sign',
	'floor': 'floor', 'ceil': 'ceiling', 'round': 'round',
	'min': 'Min', 'max': 'Max',
	'sin': 'sin', 'cos': 'cos', 'tan': 'tan',
	'asin': 'asin', 'acos': 'acos', 'atan': 'atan', 'atan2': 'atan2',
	'sinh': 'sinh', 'cosh': 'cosh', 'tanh': 'tanh',
	'asinh': 'asinh', 'acosh': 'acosh', 'atanh': 'atanh'
};

const MATH_CONSTANTS: { [name: string]: string } = {
	'PI': 'pi', 'E': 'E'
};

class UnsupportedSyntaxError extends Error {}

/** Wraps an expression in parentheses unless it is a bare identifier or number,
 *  or is already fully parenthesized. */
function parenthesize(expr: string): string {
	if (/^[A-Za-z_]\w*$|^\d+(\.\d+)?$/.test(expr)) { return expr; }
	if (expr.startsWith('(') && expr.endsWith(')')) {
		let depth = 0;
		let wrapsWhole = true;
		for (let i = 0; i < expr.length - 1; i++) {
			depth += expr[i] === '(' ? 1 : expr[i] === ')' ? -1 : 0;
			if (depth === 0) { wrapsWhole = false; break; }
		}
		if (wrapsWhole) { return expr; }
	}
	return '(' + expr + ')';
}

/**
 * Recursively converts a TypeScript expression AST node into a SymPy expression
 * string, inlining previously assigned variables from `definitions`.
 * Throws UnsupportedSyntaxError for anything outside the supported math subset.
 */
function convertExpression(node: ts.Expression, source: ts.SourceFile,
	definitions: { [name: string]: string }): string {
	if (ts.isNumericLiteral(node)) {
		return node.getText(source);
	}
	if (ts.isIdentifier(node)) {
		const name = node.text;
		// Substitute the variable's formula in for its name when we know it.
		return name in definitions ? '(' + definitions[name] + ')' : name;
	}
	if (ts.isParenthesizedExpression(node)) {
		return '(' + convertExpression(node.expression, source, definitions) + ')';
	}
	if (ts.isPrefixUnaryExpression(node)) {
		const operand = convertExpression(node.operand as ts.Expression, source, definitions);
		if (node.operator === ts.SyntaxKind.MinusToken) { return '-' + operand; }
		if (node.operator === ts.SyntaxKind.PlusToken) { return '+' + operand; }
		throw new UnsupportedSyntaxError('Unsupported unary operator in "' + node.getText(source) + '"');
	}
	if (ts.isBinaryExpression(node)) {
		const left = convertExpression(node.left, source, definitions);
		const right = convertExpression(node.right, source, definitions);
		switch (node.operatorToken.kind) {
			case ts.SyntaxKind.PlusToken: return left + ' + ' + right;
			case ts.SyntaxKind.MinusToken: return left + ' - ' + right;
			case ts.SyntaxKind.AsteriskToken: return left + '*' + right;
			case ts.SyntaxKind.SlashToken: return left + '/' + right;
			case ts.SyntaxKind.PercentToken: return 'Mod(' + left + ', ' + right + ')';
			case ts.SyntaxKind.AsteriskAsteriskToken:
				return parenthesize(left) + '**' + parenthesize(right);
			case ts.SyntaxKind.EqualsEqualsToken:
			case ts.SyntaxKind.EqualsEqualsEqualsToken:
				return 'Eq(' + left + ', ' + right + ')';
			default:
				throw new UnsupportedSyntaxError('Unsupported operator "' +
					node.operatorToken.getText(source) + '" in "' + node.getText(source) + '"');
		}
	}
	if (ts.isPropertyAccessExpression(node)) {
		// Only Math.* constants are valid as bare property accesses.
		if (ts.isIdentifier(node.expression) && node.expression.text === 'Math') {
			const member = node.name.text;
			if (member in MATH_CONSTANTS) { return MATH_CONSTANTS[member]; }
			throw new UnsupportedSyntaxError('Unknown Math member "Math.' + member + '"');
		}
		throw new UnsupportedSyntaxError('Unsupported property access "' + node.getText(source) + '"');
	}
	if (ts.isCallExpression(node)) {
		let name: string;
		if (ts.isIdentifier(node.expression)) {
			name = node.expression.text;
		} else if (ts.isPropertyAccessExpression(node.expression) &&
			ts.isIdentifier(node.expression.expression) &&
			node.expression.expression.text === 'Math') {
			const member = node.expression.name.text;
			if (!(member in MATH_FUNCTIONS) && member !== 'pow') {
				throw new UnsupportedSyntaxError('Unknown Math function "Math.' + member + '"');
			}
			name = member in MATH_FUNCTIONS ? MATH_FUNCTIONS[member] : member;
		} else {
			throw new UnsupportedSyntaxError('Unsupported call "' + node.getText(source) + '"');
		}
		const args = node.arguments.map(arg => convertExpression(arg, source, definitions));
		if (name === 'pow') {
			if (args.length !== 2) {
				throw new UnsupportedSyntaxError('pow() expects exactly 2 arguments in "' + node.getText(source) + '"');
			}
			return parenthesize(args[0]) + '**' + parenthesize(args[1]);
		}
		return name + '(' + args.join(', ') + ')';
	}
	throw new UnsupportedSyntaxError('Unsupported syntax "' + node.getText(source) +
		'" (' + ts.SyntaxKind[node.kind] + ')');
}

/**
 * Converts a block of JavaScript/TypeScript math code into a single
 * SymPy-compatible expression string. Each `let x = ...` (or `x = ...`)
 * defines a substitution; the final statement's expression — with all prior
 * definitions inlined — is the result.
 */
export function convertToSympy(source: string): ConversionResult {
	const sourceFile = ts.createSourceFile('selection.ts', source, ts.ScriptTarget.Latest,
		/*setParentNodes*/ true);
	const definitions: { [name: string]: string } = {};
	let lastExpression = '';

	try {
		for (const statement of sourceFile.statements) {
			if (ts.isVariableStatement(statement)) {
				for (const declaration of statement.declarationList.declarations) {
					if (!ts.isIdentifier(declaration.name)) {
						return { ok: false, error: 'Destructuring declarations are not supported: "' +
							declaration.getText(sourceFile) + '"' };
					}
					if (!declaration.initializer) {
						return { ok: false, error: 'Variable "' + declaration.name.text +
							'" is declared without a value.' };
					}
					const expression = convertExpression(declaration.initializer, sourceFile, definitions);
					definitions[declaration.name.text] = expression;
					lastExpression = expression;
				}
			} else if (ts.isExpressionStatement(statement)) {
				const expr = statement.expression;
				// Plain re-assignment: x = <expr>
				if (ts.isBinaryExpression(expr) &&
					expr.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
					ts.isIdentifier(expr.left)) {
					const expression = convertExpression(expr.right, sourceFile, definitions);
					definitions[expr.left.text] = expression;
					lastExpression = expression;
				} else {
					lastExpression = convertExpression(expr, sourceFile, definitions);
				}
			} else if (ts.isReturnStatement(statement)) {
				if (!statement.expression) {
					return { ok: false, error: 'Empty return statement has no expression to evaluate.' };
				}
				lastExpression = convertExpression(statement.expression, sourceFile, definitions);
			} else if (statement.kind !== ts.SyntaxKind.EmptyStatement) {
				return { ok: false, error: 'Unsupported statement "' + statement.getText(sourceFile) +
					'". Only variable assignments and math expressions are supported.' };
			}
		}
	} catch (error) {
		if (error instanceof UnsupportedSyntaxError) {
			return { ok: false, error: error.message };
		}
		throw error;
	}

	if (lastExpression === '') {
		return { ok: false, error: 'No expression found in the selection.' };
	}
	return { ok: true, expression: lastExpression };
}
