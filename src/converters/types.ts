/** Result of converting a block of source code into a SymPy-compatible expression string. */
export type ConversionResult =
	| { ok: true; expression: string }
	| { ok: false; error: string };
