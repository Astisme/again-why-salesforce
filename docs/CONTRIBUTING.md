# Contributing to Again, Why Salesforce

Thank you for considering contributing! To keep contributions smooth and consistent, please follow these guidelines:

## 1. Issue Workflow

1. Browse existing [issues](https://github.com/Astisme/again-why-salesforce/issues) and comment to claim an unassigned one.
2. Fork the repository and create a branch using the issue number:

   ```bash
   git branch 123-my-new-feature-branch
   git switch 123-my-new-feature-branch
   ```
3. Code until your change is ready; ensure all tests pass.
4. Submit a pull request against `main`, referencing the issue in the title (e.g. "Fix #123: the shiny new feature").

## 2. Code Style & Linting

- **Formatting**: You may run `deno task fmt` before committing to style everything nicely beforehand.
- **Linting**: this is the process of checking for errors in the files you wrote. You may run `deno task lint` before committing to check and fix any errors

Both of these steps are done automatically when you push a commit to a branch which is part of a Pull Request (PR).

## 3. Testing

- Add or update unit tests under `tests/`
- Run all tests with:

  ```bash
  deno task test
  ```

## 4. Commit Message Guidelines

We do not follow standards for commit messages as we are much more focused on PRs.

## 5. Pull Request Checklist

- [ ] Tests pass
- [ ] Linter and formatter run
- [ ] Locales have been sorted
- [ ] Documentation updated (README, wiki) if needed
- [ ] PR description clearly explains changes and motivation

---

We appreciate your help making this extension better! 🚀
