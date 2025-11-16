// deno-lint-ignore-file no-control-regex
const process = require('node:process');
const fs = require('fs');

/**
 * reads the given logFile and writes a comment with its content on github
 * if the contents match the matchPattern
 * the contents are stripped of everything that matches inside stripPatterns
 */
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
	
	// Fix: Handle stripPatterns more safely
	for (const pattern of stripPatterns) {
		try {
			// If it's already a RegExp, use it directly
			if (pattern instanceof RegExp) {
				clean = clean.replace(pattern, '');
			} 
			// If it's a string, create a RegExp with global flag
			else if (typeof pattern === 'string') {
				const regex = new RegExp(pattern, 'gm');
				clean = clean.replace(regex, '');
			}
			// Skip invalid patterns
			else {
				core.warning(`Invalid pattern in stripPatterns: ${pattern}`);
			}
		} catch (e) {
			core.warning(`Failed to apply pattern ${pattern}: ${e.message}`);
		}
	}
	
	// Ensure matchPattern is a valid RegExp
	let shouldMatch = false;
	try {
		if (matchPattern instanceof RegExp) {
			shouldMatch = matchPattern.test(clean);
		} else if (typeof matchPattern === 'string') {
			const regex = new RegExp(matchPattern);
			shouldMatch = regex.test(clean);
		} else {
			// Default to true if matchPattern is invalid
			shouldMatch = true;
		}
	} catch (e) {
		core.warning(`Invalid matchPattern: ${e.message}`);
		shouldMatch = true; // Default to reporting errors if pattern is invalid
	}
	
	if (!shouldMatch) {
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
