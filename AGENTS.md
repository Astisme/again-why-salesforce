we work in deno instead of npm
do not format, run deno lint
any string in src should be a string that is a key in src/_locales/en/messages.json
only write en messages unless explicitly requested to translate
make sure to always write jsdocs for functions
follow DRY principles, also for strings
prefer to not have external dependencies especially for code in `src`
when creating a new branch, start from `stag` unless explicitly told otherwise
always write tests for new changes; make sure the coverage is 100/100/100 (do not change src code to achieve this)
tests should not need --allow-env or --no-check; run tests without --quiet; do now use unknown or any types
