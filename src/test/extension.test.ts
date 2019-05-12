//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as spx from '../extension';

// Defines a Mocha test suite to group tests of similar kind together
suite("Extension Tests", function () {
    // Defines a Mocha unit test
    test("Typescript to Sympy", function() {
        assert.equal(
            spx.convertToSympy("let xl = x0 + xd*t; let yl = y0 + yd*t; let zl = z0 + zd*t; let dist = (Math.pow((xl-px),2) + Math.pow((yl-py),2) + Math.pow((zl-pz),2));"), "((((x0 + xd * t) - px)**2) + (((y0 + yd * t) - py)**2) + (((z0 + zd * t) - pz)**2))");
    });
});