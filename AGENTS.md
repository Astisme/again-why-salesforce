we work in bun
do not format or rebuild, run bun run lint. if lint says unused var, remove it. do not double check build output. no lint if only jsdocs change
any string in src should be a string that is a key in src/_locales/en/messages.json. do not touch other files in src/_locales
only write en messages unless explicitly requested to translate
make sure to always write jsdocs for functions
after update jsdocs, update wrapper/runtime/module as well
Implementation contract lives in module; wrapper/runtime docs must not narrow return/param types.
follow DRY principles, also for strings
prefer to not have external dependencies especially for code in `src`
when creating a new branch, start from `stag` unless explicitly told otherwise
always write tests for new changes; make sure the coverage is 100/100/100 (do not change src code to achieve this)
Tests do not use: --allow-env, --no-check, --quiet, unknown or any types, await Promise.resolve(), unnecessary wrappers for Bun test calls
test command: bun run test-this {test-file}.
use replaceAll instead of replace if possible
use String.raw instead of double escape
allow changes with bun run dev-firefox
avoid re-exports when possible; otherwise use `export…from`
to revert whole file, use git commands
keep functions in the outer scope
Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator.
