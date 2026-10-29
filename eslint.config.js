import { defineConfig } from "eslint/config";
import tsParser from "@typescript-eslint/parser";
import jsdoc from "eslint-plugin-jsdoc";

export default defineConfig([
	{
		ignores: ["src/generated/**"],
	},
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tsParser,
		},
	},
	{
		files: ["src/**/*.js"],
		plugins: {
			jsdoc,
		},
		rules: {
			// Require a JSDoc comment on functions, classes, and methods:
			"jsdoc/require-jsdoc": [
				"error",
				{
					require: {
						FunctionDeclaration: true,
						MethodDefinition: true,
						ClassDeclaration: true,
						ArrowFunctionExpression: false,
						FunctionExpression: false,
					},
				},
			],
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
