/** JSON contract shared with python/symplex.py's evaluate(). */
export interface SympyResult {
	/** Plain text to insert verbatim (e.g. latex() output or messages). */
	returnString?: string;
	/** Common subexpressions factored out of the result. */
	Variables?: { name: string; expr: string }[];
	/** The final expression, printed in the target language. */
	Expression?: string;
}

export interface SympyEngine {
	/** Symbolically evaluates a SymPy expression string, printing results for `language`. */
	evaluate(language: string, expression: string, timeoutMs: number): Promise<SympyResult>;
	dispose(): void;
}
