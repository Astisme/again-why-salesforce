const process = require('node:process');

const COMMENT_MARKER = '<!-- pr-tests-comment -->';
const OUTDATED_MARKER = '<!-- pr-tests-outdated -->';
const LEGACY_TITLES = [
	'Linter Failed',
	'JSDocs Missing',
	'Tests Failed',
	'These Locale Translation are missing (not blocking)',
	'Locale Sorter Failed',
];

module.exports = async function markPrCommentsOutdated({
	github,
	context,
	core,
} = {}) {
	if (!context?.issue?.number) {
		core.info('No pull request context detected; skipping outdated comment handling.');
		return;
	}

	const comments = await github.paginate(github.rest.issues.listComments, {
		owner: context.repo.owner,
		repo: context.repo.repo,
		issue_number: context.issue.number,
		per_page: 100,
	});

	const runUrl = `${process.env.GITHUB_SERVER_URL}/${context.repo.owner}/${context.repo.repo}/actions/runs/${process.env.GITHUB_RUN_ID}`;
	const runNumber = process.env.GITHUB_RUN_NUMBER;
	const outdatedNotice = [
		OUTDATED_MARKER,
		`> Outdated: superseded by CI run [#${runNumber}](${runUrl}).`,
	].join('\n');

	let updatedCount = 0;

	for (const comment of comments) {
		const body = comment.body || '';
		const isGithubActionsComment = comment.user?.login === 'github-actions[bot]';
		const isManagedComment = body.includes(COMMENT_MARKER)
			|| LEGACY_TITLES.some((title) => body.startsWith(`## ${title}:`));
		const isAlreadyOutdated = body.includes(OUTDATED_MARKER);

		if (!isGithubActionsComment || !isManagedComment || isAlreadyOutdated) {
			continue;
		}

		await github.rest.issues.updateComment({
			owner: context.repo.owner,
			repo: context.repo.repo,
			comment_id: comment.id,
			body: `${body.trimEnd()}\n\n${outdatedNotice}`,
		});

		updatedCount += 1;
	}

	core.info(`Marked ${updatedCount} PR comment(s) as outdated.`);
};
