#!/usr/bin/env sh
# Static checks run by CI (and runnable locally from the repo root):
#   sh scripts/ci-checks.sh
set -eu

echo "== JS syntax (site scripts)"
for f in app.js shared.js oem-presets.js wget.js $(ls calculators.js 2>/dev/null || true); do
  node --check "$f"
done

echo "== JS syntax (DualShock ES modules)"
find Dualshock-tool/js -name '*.js' | while read -r f; do
  node --input-type=module --check < "$f"
done

echo "== JSON validity"
for f in Dualshock-tool/lang/*.json site.webmanifest Dualshock-tool/site.webmanifest; do
  node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" "$f"
done

echo "== DualShock translations"
(cd Dualshock-tool && python3 -X utf8 scripts/check_translations.py > /tmp/translations.txt 2>&1 || true)
if grep -q "MISSING TRANSLATIONS" /tmp/translations.txt; then
  sed -n '/MISSING TRANSLATIONS/,/^$/p' /tmp/translations.txt
  echo "Missing translation keys (add them to every lang/*.json; \"\" = English fallback)"
  exit 1
fi

echo "All static checks passed."
