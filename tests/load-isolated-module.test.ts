/**
 * Options used to load a source file as an isolated module.
 */
export type LoadIsolatedModuleOptions<
	TDependencies extends Record<string, unknown>,
> = {
	additionalExports?: string[];
	dependencies?: TDependencies;
	extraSource?: string;
	globals?: Record<string, unknown>;
	importsToReplace?: Set<string>;
	modulePath: URL;
	sourceMapLineMap?: number[];
	transformSource?: (source: string) => string;
};

/**
 * Result returned after loading an isolated source module.
 */
export type LoadIsolatedModuleResult<TModule> = {
	cleanup: () => void;
	generatedModuleUrl: string;
	module: TModule;
};

type PreviousGlobalState = {
	descriptor?: PropertyDescriptor;
	exists: boolean;
};

const BASE64_VLQ_ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

type StripExportsResult = {
	exportedNames: string[];
	source: string;
};

type EvaluatedModuleExecutor = () => Promise<void>;

type AsyncFunctionConstructor = new (
	source: string,
) => EvaluatedModuleExecutor;

const AsyncFunction = Object.getPrototypeOf(async function () {})
	.constructor as AsyncFunctionConstructor;

/**
 * Parses a static import clause and returns the local binding names that need values injected.
 *
 * @param {string} clause Import clause between `import` and `from`.
 * @return {string[]} Local binding names.
 */
function getLocalImportNames(clause: string) {
	const localNames: string[] = [];
	const trimmedClause = clause.trim();
	if (trimmedClause === "" || trimmedClause.startsWith(`"`)) {
		return localNames;
	}
	if (trimmedClause.includes("{")) {
		const braceIndex = trimmedClause.indexOf("{");
		const defaultPart = trimmedClause.slice(0, braceIndex).replace(/,$/, "")
			.trim();
		if (defaultPart !== "") {
			localNames.push(defaultPart);
		}
		const namedPart = trimmedClause.slice(
			trimmedClause.indexOf("{") + 1,
			trimmedClause.lastIndexOf("}"),
		);
		for (const entry of namedPart.split(",")) {
			const cleanedEntry = entry.trim();
			if (cleanedEntry === "") {
				continue;
			}
			const aliasMatch = cleanedEntry.match(/^(.+?)\s+as\s+(.+)$/);
			localNames.push(aliasMatch?.[2]?.trim() ?? cleanedEntry);
		}
		return localNames;
	}
	const namespaceMatch = trimmedClause.match(/^\*\s+as\s+(.+)$/);
	if (namespaceMatch != null) {
		localNames.push(namespaceMatch[1].trim());
		return localNames;
	}
	localNames.push(trimmedClause);
	return localNames;
}

/**
 * Normalizes an import specifier to a stable matching key for replacement rules.
 * Relative specifiers that resolve under `src/` become slash-prefixed specifiers.
 *
 * @param {string} specifier Raw import specifier from source code or test options.
 * @param {URL} modulePath Source file path used to resolve relative imports.
 * @return {string} Normalized import key.
 */
function normalizeImportSpecifier(specifier: string, modulePath: URL) {
	if (specifier.startsWith("/")) {
		return specifier;
	}
	if (!specifier.startsWith(".")) {
		return specifier;
	}
	const resolvedUrl = new URL(specifier, modulePath);
	const sourceRootMarker = "/src/";
	const sourceRootIndex = resolvedUrl.pathname.indexOf(sourceRootMarker);
	if (sourceRootIndex === -1) {
		return resolvedUrl.href;
	}
	const sourceRelativePath = resolvedUrl.pathname.slice(
		sourceRootIndex + sourceRootMarker.length,
	);
	return `/${sourceRelativePath}`;
}

/**
 * Expands replacement specifiers to include their normalized equivalents.
 *
 * @param {Set<string> | null} importsToReplace Explicit specifiers to replace.
 * @param {URL} modulePath Source file path used to resolve relative imports.
 * @return {Set<string> | null} Expanded replacement set.
 */
function normalizeImportsToReplace(
	importsToReplace: Set<string> | null,
	modulePath: URL,
) {
	if (importsToReplace == null) {
		return null;
	}
	const normalizedImportsToReplace = new Set<string>(importsToReplace);
	for (const specifier of importsToReplace) {
		normalizedImportsToReplace.add(
			normalizeImportSpecifier(specifier, modulePath),
		);
	}
	return normalizedImportsToReplace;
}

/**
 * Replaces matching import statements with whitespace while preserving the original layout.
 *
 * @param {string} source Module source code.
 * @param {Set<string> | null} importsToReplace Import specifiers to replace. When omitted, all imports are replaced.
 * @param {URL} modulePath Source file path used to resolve relative imports.
 * @return {{ importedNames: Set<string>; source: string; }} Transformed source and the imported local names that were replaced.
 */
function replaceImports(
	source: string,
	importsToReplace: Set<string> | null,
	modulePath: URL,
) {
	const importedNames = new Set<string>();
	const importExpression =
		/import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'](?:\s+with\s+\{[^;]*\})?;\n?|import\s+["']([^"']+)["'](?:\s+with\s+\{[^;]*\})?;\n?/g;
	const updatedSource = source.replace(
		importExpression,
		(
			match,
			clause: string | undefined,
			fromSpecifier: string | undefined,
			sideEffectSpecifier: string | undefined,
		) => {
			const specifier = fromSpecifier ?? sideEffectSpecifier;
			const normalizedSpecifier = specifier == null
				? null
				: normalizeImportSpecifier(specifier, modulePath);
			if (
				specifier == null ||
				(
					importsToReplace != null &&
					!importsToReplace.has(specifier) &&
					(
						normalizedSpecifier == null ||
						!importsToReplace.has(normalizedSpecifier)
					)
				)
			) {
				return match;
			}
			if (clause == null) {
				return "\n".repeat(match.split("\n").length - 1);
			}
			const localNames = getLocalImportNames(clause);
			for (const localName of localNames) {
				importedNames.add(localName);
			}
			return match.replace(/[^\n]/g, " ");
		},
	);
	return { importedNames, source: updatedSource };
}

/**
 * Removes ESM export syntax while keeping exported bindings available for the returned module object.
 *
 * @param {string} source Module source code after import replacement.
 * @return {StripExportsResult} Source without export keywords and the exported binding names.
 */
function stripExports(source: string): StripExportsResult {
	const exportedNames: string[] = [];
	let updatedSource = source;

	updatedSource = updatedSource.replace(
		/^\s*export\s+async\s+function\s+([A-Za-z_$][\w$]*)\s*\(/gm,
		(_match, name: string) => {
			exportedNames.push(name);
			return `async function ${name}(`;
		},
	);
	updatedSource = updatedSource.replace(
		/^\s*export\s+function\s+([A-Za-z_$][\w$]*)\s*\(/gm,
		(_match, name: string) => {
			exportedNames.push(name);
			return `function ${name}(`;
		},
	);
	updatedSource = updatedSource.replace(
		/^\s*export\s+class\s+([A-Za-z_$][\w$]*)\s*/gm,
		(_match, name: string) => {
			exportedNames.push(name);
			return `class ${name} `;
		},
	);
	updatedSource = updatedSource.replace(
		/^\s*export\s+(const|let|var)\s+([A-Za-z_$][\w$]*)/gm,
		(_match, declarationKind: string, name: string) => {
			exportedNames.push(name);
			return `${declarationKind} ${name}`;
		},
	);
	updatedSource = updatedSource.replace(
		/^\s*export\s*\{([^}]+)\};?/gm,
		(match, bindings: string) => {
			for (const binding of bindings.split(",")) {
				const cleanedBinding = binding.trim();
				if (cleanedBinding === "") {
					continue;
				}
				const aliasMatch = cleanedBinding.match(/^(.+?)\s+as\s+(.+)$/);
				exportedNames.push(aliasMatch?.[2]?.trim() ?? cleanedBinding);
			}
			return "\n".repeat(match.split("\n").length - 1);
		},
	);

	return {
		exportedNames,
		source: updatedSource,
	};
}

/**
 * Encodes a value using the Base64 VLQ format used by source maps.
 *
 * @param {number} value Signed integer value.
 * @return {string} Encoded VLQ segment.
 */
function encodeBase64Vlq(value: number) {
	let vlq = value < 0 ? ((-value) << 1) + 1 : value << 1;
	let encoded = "";
	do {
		let digit = vlq & 31;
		vlq >>>= 5;
		if (vlq > 0) {
			digit |= 32;
		}
		encoded += BASE64_VLQ_ALPHABET[digit];
	} while (vlq > 0);
	return encoded;
}

/**
 * Builds an inline source map URL for the evaluated source.
 *
 * @param {URL} modulePath Original source module path.
 * @param {string} originalSource Original file contents.
 * @param {number[]} lineMap 1-based original line per generated line.
 * @return {string} Data URL containing the source map.
 */
function createInlineSourceMapUrl(
	modulePath: URL,
	originalSource: string,
	lineMap: number[],
) {
	let previousSourceIndex = 0;
	let previousOriginalLine = 0;
	let previousOriginalColumn = 0;
	const mappings = lineMap.map((originalLine) => {
		const sourceIndex = 0;
		const originalColumn = 0;
		const segment = encodeBase64Vlq(0) +
			encodeBase64Vlq(sourceIndex - previousSourceIndex) +
			encodeBase64Vlq((originalLine - 1) - previousOriginalLine) +
			encodeBase64Vlq(originalColumn - previousOriginalColumn);
		previousSourceIndex = sourceIndex;
		previousOriginalLine = originalLine - 1;
		previousOriginalColumn = originalColumn;
		return segment;
	}).join(";");
	const sourceMap = {
		file: modulePath.pathname.split("/").at(-1) ?? modulePath.pathname,
		names: [],
		sources: [modulePath.href],
		sourcesContent: [originalSource],
		version: 3,
		mappings,
	};
	const sourceMapJson = JSON.stringify(sourceMap);
	const sourceMapBase64 = btoa(
		String.fromCharCode(...new TextEncoder().encode(sourceMapJson)),
	);
	return `data:application/json;base64,${sourceMapBase64}`;
}

/**
 * Installs temporary global overrides for a loaded isolated module.
 *
 * @param {Record<string, unknown>} globals Global values to install.
 * @return {() => void} Cleanup callback restoring previous global state.
 */
function installGlobals(globals: Record<string, unknown>) {
	const previousGlobals = new Map<string, PreviousGlobalState>();
	for (const [name, value] of Object.entries(globals)) {
		previousGlobals.set(name, {
			descriptor: Object.getOwnPropertyDescriptor(globalThis, name),
			exists: name in globalThis,
		});
		Object.defineProperty(globalThis, name, {
			configurable: true,
			enumerable: true,
			value,
			writable: true,
		});
	}
	return () => {
		for (const [name, previousState] of previousGlobals.entries()) {
			if (previousState.exists && previousState.descriptor != null) {
				Object.defineProperty(
					globalThis,
					name,
					previousState.descriptor,
				);
				continue;
			}
			delete (globalThis as Record<string, unknown>)[name];
		}
	};
}

/**
 * Builds a function body that preserves the original file's line numbers for coverage.
 *
 * @param {URL} modulePath Original source module path.
 * @param {string} source Source with imports removed and exports stripped.
 * @param {string[]} exportedNames Names to return from the evaluated module.
 * @return {string} Function body with source-map metadata for attribution.
 */
function createEvaluatedModuleSource(
	modulePath: URL,
	source: string,
	exportedNames: string[],
	additionalExports: string[],
	extraSource: string,
	exportKey: string,
	inlineSourceMapUrl: string | null,
) {
	const moduleKeys = [...exportedNames, ...additionalExports];
	const moduleRecord = moduleKeys.length === 0
		? "{}"
		: `{ ${moduleKeys.join(", ")} }`;
	const sourceUrlDirective = inlineSourceMapUrl == null
		? `//# sourceURL=${modulePath.href}`
		: "";
	const sourceMapDirective = inlineSourceMapUrl == null
		? ""
		: `//# sourceMappingURL=${inlineSourceMapUrl}`;
	return `${source}
${extraSource}
globalThis["${exportKey}"] = ${moduleRecord};
${sourceUrlDirective}
${sourceMapDirective}`;
}

/**
 * Evaluates the transformed module source inside an async function body so
 * top-level `await` remains valid after imports are stripped.
 *
 * @param {string} moduleSource Transformed module source to execute.
 * @return {Promise<void>} A promise that resolves after the module body runs.
 */
function evaluateModuleSource(moduleSource: string) {
	const executeModule = new AsyncFunction(moduleSource);
	return executeModule();
}

/**
 * Loads a source module after replacing imports with injected dependencies.
 *
 * @param {LoadIsolatedModuleOptions<TDependencies>} options Loader options.
 * @return {Promise<LoadIsolatedModuleResult<TModule>>} Imported module namespace with cleanup callback.
 */
export async function loadIsolatedModule<
	TModule,
	TDependencies extends Record<string, unknown> = Record<string, never>,
>({
	modulePath,
	additionalExports = [],
	dependencies,
	extraSource = "",
	importsToReplace,
	globals = {},
	sourceMapLineMap,
	transformSource,
}: LoadIsolatedModuleOptions<TDependencies>): Promise<
	LoadIsolatedModuleResult<TModule>
> {
	const rawSource = await Deno.readTextFile(modulePath);
	const source = transformSource == null
		? rawSource
		: transformSource(rawSource);
	const normalizedImportsToReplace = normalizeImportsToReplace(
		importsToReplace ?? null,
		modulePath,
	);
	const dependencyMap = dependencies ?? {} as TDependencies;
	const { importedNames, source: sourceWithoutImports } = replaceImports(
		source,
		normalizedImportsToReplace,
		modulePath,
	);
	const { exportedNames, source: sourceWithoutExports } = stripExports(
		sourceWithoutImports,
	);
	const exportKey = `__isolatedModuleExports_${crypto.randomUUID()}`;
	const inlineSourceMapUrl = sourceMapLineMap == null
		? null
		: createInlineSourceMapUrl(
			modulePath,
			rawSource,
			sourceMapLineMap,
		);
	const cleanupGlobals = installGlobals({
		...globals,
		...Object.fromEntries(
			Object.entries(dependencyMap).filter(([name]) =>
				importedNames.has(name) || !(name in globals)
			),
		),
	});
	try {
		const moduleSource = createEvaluatedModuleSource(
			modulePath,
			sourceWithoutExports,
			exportedNames,
			additionalExports,
			extraSource,
			exportKey,
			inlineSourceMapUrl,
		);
		await evaluateModuleSource(moduleSource);
		const module =
			(globalThis as Record<string, unknown>)[exportKey] as TModule;
		return {
			cleanup: () => {
				delete (globalThis as Record<string, unknown>)[exportKey];
				cleanupGlobals();
			},
			generatedModuleUrl: modulePath.href,
			module,
		};
	} catch (error) {
		delete (globalThis as Record<string, unknown>)[exportKey];
		cleanupGlobals();
		throw error;
	}
}
