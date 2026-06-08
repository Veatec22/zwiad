PRE_COMMIT ?= uvx pre-commit

.PHONY: install dev build preview typecheck lint lint-fix format format-check py-lint py-lint-fix py-format py-format-check test test-all check precommit-install precommit-run

install:
	bun install

dev:
	bun run dev

build:
	bun run build

preview:
	bun run preview

typecheck:
	bun run typecheck

lint:
	bun run lint

lint-fix:
	bun run lint:fix

format:
	bun run format

format-check:
	bun run format:check

py-lint:
	bun run py:lint

py-lint-fix:
	bun run py:lint:fix

py-format:
	bun run py:format

py-format-check:
	bun run py:format:check

test:
	bun run test

test-all:
	bun run test:all

check:
	bun run check

precommit-install:
	$(PRE_COMMIT) install

precommit-run:
	$(PRE_COMMIT) run --all-files
