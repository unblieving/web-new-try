#!/usr/bin/env sh
set -eu

if [ ! -f .env ]; then
  cp .env.example .env
fi

npm install
npm run check:env

echo "Setup complete. Run: npm run dev"

