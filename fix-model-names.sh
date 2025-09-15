#!/bin/bash
# Fix model name typo in all preset files

cd presets

# Fix all occurrences of "sdn" to "sd\\"
for file in *.yaml; do
  echo "Fixing $file..."
  # Use perl for more reliable replacement
  perl -pi -e 's/sdnimagineXL40_v4Opt/sd\\animagineXL40_v4Opt/g' "$file"
done

echo "Done!"