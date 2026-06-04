#!/bin/bash
export PATH="/Users/rowangouws/.fly/bin:$PATH"
set -e

echo "→ Logging in to fly.io (a browser window will open)..."
fly auth login

echo "→ Deploying to muck.fly.dev..."
fly deploy

echo "✓ Done! Your site is live at https://muck.fly.dev"
