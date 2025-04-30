// deno-lint-ignore-file no-control-regex
import process from "node:process";
module.exports = async function commentOnPr({
	github,
	context,
	core,
	// — all of these get default values but can be overridden —
	logFile			= 'error.log',
	title			= 'Error',
	matchPattern    = /./, // must match if there are errors
	stripPatterns   = [], // array of regexes to strip noisy lines
} = {}) {
	const fs = require('fs');
	let raw;
	try {
		raw = fs.readFileSync(logFile, 'utf8');
	} catch (e) {
		core.error(`⛔ Could not read ${logFile}: ${e.message}`);
		process.exit(1);
	}

	if (!raw.trim()) {
		core.info(`${logFile} is empty; nothing to do.`);
		try {
            fs.unlinkSync(logFile);
        } catch {
            core.error("Failed unlinkSync");
        }
		return;
	}

	// remove ANSI escapes & any other noisy lines
	let clean = raw.replace(/\x1b\[[0-9;]*m/g, '');
	for (const rx of stripPatterns) {
		clean = clean.replace(rx, '');
	}

	if (!matchPattern.test(clean)) {
		core.info(`✅ No ${title.toLowerCase()} to report.`);
		try {
            fs.unlinkSync(logFile);
        } catch {
            core.error("Failed unlinkSync");
        }
		return;
	}

	// post the comment
	await github.rest.issues.createComment({
		owner:			context.repo.owner,
		repo:			context.repo.repo,
		issue_number:   context.issue.number,
		body:		    `## ${title}:

\`\`\`
${clean}
\`\`\``,
	});

	// fail the job
	process.exit(1);
};
