#!/usr/bin/env bash
# kid-guard build script. Verifies required artifacts, copies the extension
# tree to dist/, prints sizes against module-contracts section 8 budgets, and
# zips the result into kid-guard.zip.
#
# Usage:
#   ./build.sh           # build dist/ + kid-guard.zip
#   ./build.sh --check   # only verify required files exist; no copy/zip

set -euo pipefail

cd "$(dirname "$0")"

CHECK_ONLY=0
if [ "${1:-}" = "--check" ]; then
  CHECK_ONLY=1
fi

# Required relative paths. The data/ui/icons/locales sets are produced by
# parallel subagents; we tolerate them being missing in --check mode but
# warn loudly because the final build is incomplete without them.
REQUIRED_LOGIC=(
  "manifest.json"
  "background/service-worker.js"
  "background/blocker.js"
  "background/schedule-lock.js"
  "background/search-blocker.js"
  "background/stats.js"
  "shared/pin-guard.js"
  "shared/storage.js"
  "shared/constants.js"
  "shared/messaging.js"
)

REQUIRED_SIBLINGS=(
  "popup/popup.html"
  "options/options.html"
  "blocked/blocked.html"
  "onboarding/onboarding.html"
  "ruleset/games.json"
  "ruleset/adult.json"
  "ruleset/social_short_video.json"
  "ruleset/douyin_like.json"
  "ruleset/gambling.json"
  "ruleset/gacha_recharge.json"
  "ruleset/vpn_proxy.json"
  "ruleset/schedule_catchall.json"
  "icons/icon-16.png"
  "icons/icon-32.png"
  "icons/icon-48.png"
  "icons/icon-128.png"
  "_locales/zh_CN/messages.json"
)

missing_logic=()
missing_siblings=()
for f in "${REQUIRED_LOGIC[@]}"; do
  [ -f "$f" ] || missing_logic+=("$f")
done
for f in "${REQUIRED_SIBLINGS[@]}"; do
  [ -f "$f" ] || missing_siblings+=("$f")
done

if [ ${#missing_logic[@]} -gt 0 ]; then
  echo "ERROR: missing logic artifacts (this subagent's responsibility):" >&2
  printf '  - %s\n' "${missing_logic[@]}" >&2
  exit 1
fi

if [ ${#missing_siblings[@]} -gt 0 ]; then
  echo "WARN: missing sibling artifacts (other subagents):" >&2
  printf '  - %s\n' "${missing_siblings[@]}" >&2
  if [ "$CHECK_ONLY" -eq 0 ]; then
    echo "  Build will continue but the resulting extension will not load." >&2
  fi
fi

if [ "$CHECK_ONLY" -eq 1 ]; then
  echo "OK: logic artifacts present."
  exit 0
fi

# ---- Copy ----
rm -rf dist kid-guard.zip
mkdir -p dist
# Copy everything except dist/, build artifacts, and docs/dotfiles.
# We rely on rsync for cleaner exclusions if available.
if command -v rsync >/dev/null 2>&1; then
  rsync -a \
    --exclude 'dist/' \
    --exclude 'build.sh' \
    --exclude '*.md' \
    --exclude '.DS_Store' \
    --exclude 'docs/' \
    --exclude '.git*' \
    ./ dist/
else
  # Fallback: cp then prune.
  cp -R . dist/staging
  rm -rf dist/staging/dist dist/staging/build.sh dist/staging/docs
  find dist/staging -name '.DS_Store' -delete || true
  find dist/staging -name '*.md' -delete || true
  mv dist/staging/* dist/
  rmdir dist/staging
fi

# ---- Sizes vs budget ----
human() {
  # bytes -> human readable (KB)
  awk -v b="$1" 'BEGIN { printf "%.1f KB", b/1024 }'
}

dir_bytes() {
  local d="$1"
  if [ -d "$d" ]; then
    # macOS / BSD du: -k reports in KB blocks; multiply for bytes proxy
    find "$d" -type f -print0 | xargs -0 wc -c 2>/dev/null | awk '/total$/ {print $1; found=1} END { if (!found) print 0 }' | tail -n1
  else
    echo 0
  fi
}

check_budget() {
  local label="$1"; local actual="$2"; local budget_kb="$3"
  local budget_bytes=$((budget_kb * 1024))
  local mark="OK"
  if [ "$actual" -gt "$budget_bytes" ]; then mark="OVER"; fi
  printf "  %-32s %10s / %4d KB  [%s]\n" "$label" "$(human "$actual")" "$budget_kb" "$mark"
}

echo
echo "== Bundle sizes vs module-contracts.md section 8 =="
popup_bytes=$(dir_bytes dist/popup)
options_bytes=$(dir_bytes dist/options)
blocked_bytes=$(dir_bytes dist/blocked)
onboard_bytes=$(dir_bytes dist/onboarding)
sw_bytes=$(dir_bytes dist/background)
ruleset_bytes=$(dir_bytes dist/ruleset)
total_bytes=$(find dist -type f -print0 | xargs -0 wc -c 2>/dev/null | awk '/total$/ {print $1; found=1} END { if (!found) print 0 }' | tail -n1)

check_budget "popup/*"                "$popup_bytes"   100
check_budget "options/*"              "$options_bytes" 200
check_budget "blocked/*"              "$blocked_bytes"  50
check_budget "onboarding/*"           "$onboard_bytes"  80
check_budget "background/*"           "$sw_bytes"       50
check_budget "ruleset/*"              "$ruleset_bytes" 250
check_budget "TOTAL extension"        "$total_bytes"   800

# ---- Zip ----
( cd dist && zip -qr ../kid-guard.zip . )
zip_bytes=$(wc -c < kid-guard.zip | tr -d ' ')
echo
echo "kid-guard.zip: $(human "$zip_bytes")"
echo "Done."
