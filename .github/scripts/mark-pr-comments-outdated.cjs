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
const COMMENT_STATE_QUERY = `
	query CommentStates($ids: [ID!]!) {
		nodes(ids: $ids) {
			... on IssueComment {
				id
				isMinimized
			}
		}
	}
`;
const MINIMIZE_COMMENT_MUTATION = `
	mutation MinimizeComment($subjectId: ID!, $classifier: ReportedContentClassifiers!) {
		minimizeComment(input: { subjectId: $subjectId, classifier: $classifier }) {
			minimizedComment {
				isMinimized
			}
		}
	}
`;

/**
 * Splits the given array into chunks small enough for the GitHub GraphQL nodes query.
 *
 * @param {Array<T>} items
 * @param {number} size
 * @returns {Array<Array<T>>}
 * @template T
 */
function chunk(items, size) {
	const chunks = [];

	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}

	return chunks;
}

/**
 * Returns the minimized state for the given GitHub issue comment node ids.
 *
 * @param {object} params
 * @param {import('@actions/github/lib/utils').GitHub} params.github
 * @param {string[]} params.nodeIds
 * @returns {Promise<Map<string, boolean>>}
 */
async function getCommentMinimizedState({
	github,
	nodeIds,
}) {
	const states = new Map();

	for (const ids of chunk(nodeIds, 100)) {
		const response = await github.graphql(COMMENT_STATE_QUERY, { ids });
		const nodes = Array.isArray(response?.nodes) ? response.nodes : [];

		for (const node of nodes) {
			if (!node?.id) {
				continue;
			}

			states.set(node.id, Boolean(node.isMinimized));
		}
	}

	return states;
}

/**
 * Minimizes the given GitHub comment with the `OUTDATED` classifier.
 *
 * @param {object} params
 * @param {import('@actions/github/lib/utils').GitHub} params.github
 * @param {string} params.subjectId
 * @returns {Promise<void>}
 */
async function minimizeCommentAsOutdated({
	github,
	subjectId,
}) {
	await github.graphql(MINIMIZE_COMMENT_MUTATION, {
		subjectId,
		classifier: 'OUTDATED',
	});
}

/**
 * Marks managed PR CI comments as outdated and minimizes them in the PR UI.
 *
 * @param {object} params
 * @param {import('@actions/github/lib/utils').GitHub} params.github
 * @param {import('@actions/github/lib/context').Context} params.context
 * @param {import('@actions/core')} params.core
 * @returns {Promise<void>}
 */
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
	const candidates = comments.filter((comment) => {
		const body = comment.body || '';
		const isGithubActionsComment = comment.user?.login === 'github-actions[bot]';
		const isManagedComment = body.includes(COMMENT_MARKER)
			|| LEGACY_TITLES.some((title) => body.startsWith(`## ${title}:`));

		return isGithubActionsComment && isManagedComment;
	});
	const minimizedState = await getCommentMinimizedState({
		github,
		nodeIds: candidates.map((comment) => comment.node_id).filter(Boolean),
	});

	let updatedCount = 0;
	let minimizedCount = 0;

	for (const comment of candidates) {
		const body = comment.body || '';
		const isAlreadyOutdated = body.includes(OUTDATED_MARKER);
		const isMinimized = minimizedState.get(comment.node_id) === true;

		if (!isMinimized && comment.node_id) {
			await minimizeCommentAsOutdated({
				github,
				subjectId: comment.node_id,
			});
			minimizedCount += 1;
		}

		if (!isAlreadyOutdated) {
			await github.rest.issues.updateComment({
				owner: context.repo.owner,
				repo: context.repo.repo,
				comment_id: comment.id,
				body: `${body.trimEnd()}\n\n${outdatedNotice}`,
			});

			updatedCount += 1;
		}
	}

	core.info(`Minimized ${minimizedCount} PR comment(s) and marked ${updatedCount} PR comment(s) as outdated.`);
};
