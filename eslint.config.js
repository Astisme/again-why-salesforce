import { defineConfig } from "eslint/config";
import jsdoc from "eslint-plugin-jsdoc";

export default defineConfig([
	{
		files: ["src/**/*.js"],
		plugins: {
			jsdoc,
		},
		rules: {
			// Require a JSDoc comment on functions, classes, and methods:
			"jsdoc/require-jsdoc": ["error", {
				require: {
					FunctionDeclaration: true,
					MethodDefinition: true,
					ClassDeclaration: true,
					ArrowFunctionExpression: false,
					FunctionExpression: false,
				},
			}],
			"jsdoc/require-description": "error",
			"jsdoc/require-param": "error",
			"jsdoc/require-returns": "error",
			"jsdoc/require-param-description": "error",
			"jsdoc/require-returns-description": "error",
			"jsdoc/require-throws": "error",
			"jsdoc/require-throws-description": "error",
		},
		settings: {
			jsdoc: {
				mode: "permissive",
			},
		},
	},
]);
