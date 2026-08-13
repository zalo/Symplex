import { ConversionResult } from './types';

const ASSIGNMENT = /^([A-Za-z_]\w*)\s*=\s*(.+)$/;
const AUGMENTED_ASSIGNMENT = /^[A-Za-z_]\w*\s*(\+|-|\*|\/|\/\/|%|\*\*|@|&|\||\^|>>|<<)=/;

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Replaces whole-word occurrences of each defined variable with its (parenthesized) formula. */
function substitute(expression: string, definitions: { [name: string]: string }): string {
	let result = expression;
	for (const name of Object.keys(definitions)) {
		result = result.replace(new RegExp('\\b' + escapeRegExp(name) + '\\b', 'g'),
			'(' + definitions[name] + ')');
	}
	return result;
}

/**
 * Converts a block of straight-line Python math code into a single
 * SymPy-compatible expression string. Each `x = ...` line defines a
 * substitution; the final line — with all prior definitions inlined —
 * is the result. The final line may be a bare expression or an assignment.
 */
export function convertToSympy(source: string): ConversionResult {
	const definitions: { [name: string]: string } = {};
	let lastExpression = '';

	for (const rawLine of source.split(/\r?\n/)) {
		// Strip comments and surrounding whitespace. (Expressions containing '#'
		// inside string literals are not supported — this is math code.)
		const line = rawLine.split('#')[0].trim();
		if (line === '') { continue; }

		if (AUGMENTED_ASSIGNMENT.test(line)) {
			return { ok: false, error: 'Augmented assignments (+=, *=, ...) are not supported: "' + line + '"' };
		}

		// Distinguish `x = expr` from comparisons like `x == expr`.
		const match = line.includes('==') ? null : line.match(ASSIGNMENT);
		if (match) {
			const [, name, rightHandSide] = match;
			// Substitute previously defined variables now, so each stored formula
			// is fully expanded (a self-reference like `x = x + 1` stays symbolic
			// rather than looping forever).
			const expanded = substitute(rightHandSide.replace(/;\s*$/, '').trim(), definitions);
			definitions[name] = expanded;
			lastExpression = expanded;
		} else {
			// A bare expression: evaluate it with all definitions inlined.
			lastExpression = substitute(line.replace(/;\s*$/, '').trim(), definitions);
		}
	}

	if (lastExpression === '') {
		return { ok: false, error: 'No expression found in the selection.' };
	}
	return { ok: true, expression: lastExpression };
}
