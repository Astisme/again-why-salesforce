import { defineConfig } from "eslint/config";
import jsdoc from "eslint-plugin-jsdoc";

export default defineConfig([
	{
		files: ["**/*.js"], // adjust pattern if you have .jsx/.ts/.tsx
		plugins: {
			jsdoc,
		},
		/*
    extends: [
      // you can extend recommended configs if you like:
      "plugin:jsdoc/recommended"
    ],
    */
		rules: {
			// Require a JSDoc comment on functions, classes, and methods:
			"jsdoc/require-jsdoc": ["error", {
				require: {
					FunctionDeclaration: true,
					MethodDefinition: true,
					ClassDeclaration: true,
					ArrowFunctionExpression: false, // adjust if you also want arrow funcs
					FunctionExpression: false, // adjust if you want expressions
				},
			}],
			// Require a description tag in JSDoc:
			"jsdoc/require-description": "error",
			// Require @param tags for every parameter:
			"jsdoc/require-param": "error",
			// Require @returns tag for functions with return value:
			"jsdoc/require-returns": "error",
			// You can add other rules to tighten further:
			"jsdoc/require-param-description": "error",
			"jsdoc/require-returns-description": "error",
			"jsdoc/require-throws": "error",
			"jsdoc/require-throws-description": "error",
		},
		settings: {
			jsdoc: {
				mode: "permissive",
				// You can tweak settings here, e.g., exempt by contexts, disable for certain files
			},
		},
	},
]);
