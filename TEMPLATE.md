# Using this as a template

This repository is both a working integration and the source of truth for the
integration engine. Two ways to use it:

## Start a new provider repo

`task init -- --id <id> --name "<Name>" --base-url <url> --api-key-env <ENV>`
(the command prints the plan first; `--yes` applies it). It renames the provider
package, renders `README.md`, deletes `examples/`, and writes the lock file.

Or use GitHub's "Use this template", which gives you the same tree with a fresh
history — but no update path. Prefer the git remote (below) if you want future
engine improvements.

## Adopt it into an existing repo, keeping history

```sh
git remote add template git@github.com:luthfisolahudin/ai-provider-integrations-template.git
git fetch template --tags
git merge --allow-unrelated-histories --no-commit v0.1.0
```

Then keep your identity files, take the engine paths, move your provider code
into `packages/provider`, and commit. Full recipe: `docs/SYNC.md`.

## Keep it updated

```sh
task sync:template -- --apply --yes --version v0.4.0
```

One merge per template tag. Conflicts on repo-owned paths resolve automatically,
and the command refuses to commit unless `task check` passes.

## What stays yours

`packages/provider/**`, `docs/EVIDENCE.md`, `docs/REPO.md`, `docs/PROVIDERS.md`,
`README.md`, `LICENSE`, and the `name`/`description` fields. Everything else is
engine and arrives through the merge.

## Adding to the template

The template must stay vendor-free: no provider URLs, ids, or quirks outside
`examples/`. If a change only makes sense for one vendor, it belongs in that
vendor's repo as a pack hook, not here. See `CONTRIBUTING.md`.
