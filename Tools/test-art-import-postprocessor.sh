#!/usr/bin/env bash
# W4.P4a/C7 — falsifiable rejouable du postprocesseur d'import scopé (Assets/Editor/
# W4P4aArtImportPostprocessor.cs). Génère sa propre fixture PNG à la volée (jamais commitée :
# .png est LFS-tracké par .gitattributes, et un PNG neuf commité avant git-lfs installé partirait
# en plain git — même piège que §1.4a du design) et NE LAISSE RIEN derrière elle.
set -e
cd "$(dirname "$0")/.."

FIXTURE=Assets/Art/Icons/icon_probe_32.png
mkdir -p Assets/Art/Icons
python3 -c "
import zlib,struct
def chunk(t,d):
    c=t+d; return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c))
png=(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',32,32,8,6,0,0,0))
     +chunk(b'IDAT',zlib.compress(b''.join(b'\x00'+b'\x80\x80\x80\xff'*32 for _ in range(32))))
     +chunk(b'IEND',b''))
open('$FIXTURE','wb').write(png)"

cleanup() { rm -f "$FIXTURE" "$FIXTURE.meta"; }
trap cleanup EXIT

./Tools/run-unity-check.sh

python3 -c "
import re
t = open('$FIXTURE.meta').read()
assert re.search(r'^\s*textureType:\s*8\s*\$', t, re.M), 'le postprocesseur n a PAS ecrit textureType=8'
print('OK: textureType=8 ecrit par le postprocesseur (icon_probe_32 matche le motif canonique icon_*)')
"
echo "OK: C7 falsifiable vert"
