#!/bin/sh
# Build a GitHub-web-safe copy: files only, no .git folder.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/_upload"
ZIP="$ROOT/_upload.zip"
rm -rf "$DEST" "$ZIP"
mkdir -p "$DEST"
rsync -a \
  --exclude '.git' \
  --exclude 'data' \
  --exclude '__pycache__' \
  --exclude '.DS_Store' \
  --exclude 'scripts' \
  --exclude '.github' \
  --exclude '_upload' \
  --exclude '_upload.zip' \
  "$ROOT/" "$DEST/"
cp "$ROOT/UPLOAD.txt" "$DEST/UPLOAD.txt" 2>/dev/null || true
# Zip of the files themselves (not a wrapping folder) so GitHub gets loose files.
cd "$DEST"
zip -r -q "$ZIP" .
echo "Select every file inside this folder and drop them on GitHub (not the folder):"
echo "  $DEST"
echo "Or keep this zip as a backup (GitHub will not unzip it for you):"
echo "  $ZIP"
