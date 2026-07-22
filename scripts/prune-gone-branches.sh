#!/usr/bin/env bash
#
# prune-gone-branches.sh
#
# Delete local branches whose upstream remote branch has been deleted
# (shown as ": gone" by `git branch -vv`). This is the normal cleanup after
# a PR is squash-merged and its branch auto-deleted on GitHub.
#
# Because this repo squash-merges, a merged feature branch's commits never
# become ancestors of `main`, so `git branch -d` reports them as "not fully
# merged". The reliable signal that the work landed is the DELETED upstream,
# so this script force-deletes (`git branch -D`) branches whose upstream is
# gone. Deleted tips stay in the reflog (~90 days) if you need to recover one.
#
# Protected (never deleted): the current branch, main/master, any branch
# checked out in a linked worktree, and any branch that still has a live
# upstream or no upstream at all.
#
# Usage:
#   ./scripts/prune-gone-branches.sh              # prompt, then delete
#   ./scripts/prune-gone-branches.sh --dry-run    # list only, delete nothing
#   ./scripts/prune-gone-branches.sh --yes        # delete without prompting
#   ./scripts/prune-gone-branches.sh --no-fetch   # skip `git fetch --prune`
#
# Requirements: bash, git.

set -euo pipefail

err()  { printf '\033[31m✖ %s\033[0m\n' "$*" >&2; }
warn() { printf '\033[33m! %s\033[0m\n' "$*" >&2; }
info() { printf '\033[36m→ %s\033[0m\n' "$*"; }
ok()   { printf '\033[32m✓ %s\033[0m\n' "$*"; }

usage() {
  cat <<'USAGE'
Delete local branches whose upstream remote branch was deleted.

Usage:
  ./scripts/prune-gone-branches.sh              prompt, then delete
  ./scripts/prune-gone-branches.sh --dry-run    list only, delete nothing
  ./scripts/prune-gone-branches.sh --yes        delete without prompting
  ./scripts/prune-gone-branches.sh --no-fetch   skip `git fetch --prune`

Options can be combined, e.g. `--yes --no-fetch`.
USAGE
}

DRY_RUN=false
ASSUME_YES=false
DO_FETCH=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    -n|--dry-run) DRY_RUN=true ;;
    -y|--yes)     ASSUME_YES=true ;;
    --no-fetch)   DO_FETCH=false ;;
    -h|--help)    usage; exit 0 ;;
    *) err "Unknown option: $1"; usage >&2; exit 2 ;;
  esac
  shift
done

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  err "Not inside a git repository."
  exit 1
fi

if [[ "$DO_FETCH" == true ]]; then
  info "Pruning stale remote-tracking refs (git fetch --prune)…"
  git fetch --prune >/dev/null 2>&1 || warn "fetch --prune failed (offline?) — using local state."
fi

CURRENT_BRANCH="$(git symbolic-ref --quiet --short HEAD || echo '')"
# Branches checked out in ANY linked worktree — git refuses to delete these,
# so protect them and give a clean message instead of a raw git error.
WORKTREE_BRANCHES="$(git worktree list --porcelain | awk '/^branch /{sub("refs/heads/","",$2); print $2}')"

is_protected() {
  local b="$1"
  [[ "$b" == "main" || "$b" == "master" ]] && return 0
  [[ -n "$CURRENT_BRANCH" && "$b" == "$CURRENT_BRANCH" ]] && return 0
  printf '%s\n' "$WORKTREE_BRANCHES" | grep -Fxq -- "$b" && return 0
  return 1
}

# `%(upstream:track)` is exactly "[gone]" only when the upstream was deleted.
# In-sync / ahead / behind / no-upstream branches never match, so they stay.
GONE=()
while IFS= read -r branch; do
  [[ -z "$branch" ]] && continue
  is_protected "$branch" && continue
  GONE+=("$branch")
done < <(
  git for-each-ref --format='%(refname:short) %(upstream:track)' refs/heads \
    | awk '$NF=="[gone]"{print $1}'
)

if [[ ${#GONE[@]} -eq 0 ]]; then
  ok "No branches with a deleted upstream. Nothing to prune."
  exit 0
fi

info "Branches whose upstream was deleted (${#GONE[@]}):"
for b in "${GONE[@]}"; do
  printf '    %-42s %s  %s\n' "$b" "$(git rev-parse --short "$b")" "$(git log -1 --format='%s' "$b")"
done

if [[ "$DRY_RUN" == true ]]; then
  warn "Dry run — nothing deleted. Re-run without --dry-run to delete."
  exit 0
fi

if [[ "$ASSUME_YES" != true ]]; then
  printf '\n'
  read -r -p "Force-delete these ${#GONE[@]} branch(es)? [y/N]: " reply
  case "${reply:-}" in
    y|Y|yes|YES) ;;
    *) warn "Aborted. No branches deleted."; exit 0 ;;
  esac
fi

printf '\n'
deleted=0
failed=0
for b in "${GONE[@]}"; do
  if git branch -D "$b" >/dev/null 2>&1; then
    ok "Deleted $b"
    deleted=$((deleted + 1))
  else
    err "Failed to delete $b"
    failed=$((failed + 1))
  fi
done

printf '\n'
ok "Deleted $deleted of ${#GONE[@]} branch(es)."
[[ "$failed" -gt 0 ]] && warn "$failed failed."
info "Recover a mistaken delete within ~90 days: git reflog  →  git branch <name> <sha>"
exit 0
