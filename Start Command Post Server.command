#!/bin/bash
# RangerTrak Command Post Server - double-click launcher (macOS).
#
# Raised live 2026-08-31: "anything to simplify creation or admin?" - before this, starting
# the server meant knowing what a terminal is, what npm is, and typing a command correctly.
# This exists so a non-technical coordinator can just double-click a file instead (macOS opens
# a .command file in Terminal automatically, as long as it's marked executable - see this
# file's own git history for the chmod). Does NOT replace `npm run command-post` for anyone
# comfortable with a terminal - both run the exact same tools/command-post-server.js.
#
# cd to this file's own folder rather than assuming the double-click starts anywhere in
# particular - macOS does not guarantee a working directory for a double-clicked script.
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "RangerTrak Command Post Server needs Node.js, which isn't installed on this"
  echo "computer (or isn't on its PATH)."
  echo ""
  echo "Install it from https://nodejs.org, then double-click this file again."
  echo ""
  read -p "Press Enter to close this window..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo ""
  echo "First-time setup needed before this will run: open Terminal in this folder and"
  echo "run \"npm install\" once (needs internet access), then double-click this file"
  echo "again. This only has to be done one time, ideally before you leave for the field."
  echo ""
  read -p "Press Enter to close this window..."
  exit 1
fi

node tools/command-post-server.js

echo ""
echo "Server stopped. Close this window, or double-click this file again to restart it."
read -p "Press Enter to close this window..."
