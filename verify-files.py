#!/usr/bin/env python3
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'FILE-MANIFEST.json').read_text(encoding='utf-8'))
failures = []
for item in manifest['files']:
    path = root / Path(item['path'])
    if not path.is_file():
        failures.append(f"missing: {item['path']}")
        continue
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != item['sha256']:
        failures.append(f"hash mismatch: {item['path']}")
if failures:
    print('\n'.join(failures))
    raise SystemExit(1)
print(f"verified {len(manifest['files'])} files")
