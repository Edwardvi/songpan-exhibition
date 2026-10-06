"""Verify all release assets before deploying the site. Standard library only."""
from pathlib import Path
import hashlib,json,re,struct

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'site';manifest=json.loads((ROOT/'docs/asset-manifest.json').read_text(encoding='utf-8'))
issues=[]
for name,record in manifest['files'].items():
    path=SITE/name
    if not path.is_file():issues.append('Missing '+name);continue
    if path.stat().st_size!=record['bytes'] or hashlib.sha256(path.read_bytes()).hexdigest()!=record['sha256']:issues.append('Changed '+name+'; update docs/asset-manifest.json after intentional asset updates.')
    if path.stat().st_size>25*1024*1024:issues.append('Exceeds browser upload limit '+name)
    if path.suffix in ['.js','.css','.html','.json','.md','.txt'] and 'vendor' not in path.parts:
        text=path.read_text(encoding='utf-8')
        if re.search(r'(?:127\.0\.0\.1|localhost):\d+|[A-Z]:[\\/]|file://',text):issues.append('Local machine reference '+name)
    if path.suffix=='.glb':
        with path.open('rb') as stream:
            magic,version,length=struct.unpack('<4sII',stream.read(12));chunk_size,chunk_type=struct.unpack('<II',stream.read(8));scene=json.loads(stream.read(chunk_size))
        if magic!=b'glTF' or version!=2 or length!=path.stat().st_size:issues.append('Invalid GLB '+name)
        for item in scene.get('images',[])+scene.get('buffers',[]):
            uri=item.get('uri','')
            if uri and not uri.startswith('data:') and not (path.parent/uri).is_file():issues.append('Missing GLB dependency '+uri)
budget=json.loads((SITE/'model/data/budget-estimate-r1.json').read_text(encoding='utf-8'))
if len(budget['rows'])!=47 or sum(float(r['amount']) for r in budget['rows'])!=600000 or float(budget['totals']['project_control_total'])!=650000:issues.append('Budget rows or total inconsistent')
scene=json.loads((SITE/'model/assets/r31-scene-data.json').read_text(encoding='utf-8'))
if len(scene['views'])!=18:issues.append('Expected18 chapter views')
for asset in scene['assets'].values():
    if not (SITE/'model/assets'/asset).is_file():issues.append('Missing section '+asset)
if issues:raise SystemExit('\n'.join(issues))
print(f"Verified {len(manifest['files'])} site files; R31,18 views,47 budget items; all files <=25MiB.")
