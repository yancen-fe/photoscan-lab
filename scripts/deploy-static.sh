#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SSH_HOST:-}" ]]; then
  echo "Missing SSH_HOST, for example: SSH_HOST=1.2.3.4 ./scripts/deploy-static.sh" >&2
  exit 1
fi

SSH_USER="${SSH_USER:-root}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/photoscan-lab}"
SSH_PORT="${SSH_PORT:-22}"
SSH_TARGET="${SSH_USER}@${SSH_HOST}"
SSH_ARGS=(-p "$SSH_PORT")

if [[ -n "${SSH_KEY:-}" ]]; then
  SSH_ARGS+=(-i "$SSH_KEY")
fi

npm run build

ssh "${SSH_ARGS[@]}" "$SSH_TARGET" "mkdir -p '$DEPLOY_PATH'"
rsync -az --delete -e "ssh ${SSH_ARGS[*]}" dist/ "$SSH_TARGET:$DEPLOY_PATH/"

echo "Deployed PhotoScan Lab to $SSH_TARGET:$DEPLOY_PATH"
