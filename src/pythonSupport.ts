import * as vscode from 'vscode';
import * as utils from './utils';

export function convertToSympy(source:string) {
	let code = '';
	let replacementDict:any = {};
	let nocr = source.replace("\r", "");
	let lines = nocr.split("\n");
	let counter = 0;
	lines.forEach(line => {
		// Grab only what's before the comment and after the equal sign
		let declarations = line.trim().split("#")[0].trim().split("=");
		if(declarations.length < 2){
			// Check if remaining line is just whitespace, skip it if so
			if (!(/\S/.test(declarations[0]))) {
				counter++;
				return;
			}else{
				vscode.window.showErrorMessage("Parsing Error: Python Variable "+
																				"Declarations must be on a single line!");
			}
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
      declarations[1] = utils.replaceAll(declarations[1], replacementKeys[i], 
                                          replacementDict[replacementKeys[i]]);
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
  return code;
}
