from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]
path=root/'docs/asset-manifest.json'
manifest=json.loads(path.read_text(encoding='utf-8'))
manifest['files']={p.relative_to(root/'site').as_posix():{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in (root/'site').rglob('*') if p.is_file()}
path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('Asset manifest updated')
