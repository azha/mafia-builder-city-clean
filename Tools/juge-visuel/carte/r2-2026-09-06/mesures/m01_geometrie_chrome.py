# m01 — geometrie de base : tailles, delta entre les deux captures, frontieres du chrome.
# Controle positif : la largeur des trois images doit etre 1080 (connue, ecrite au dossier).
# Controle negatif : la hauteur reference (2102) doit differer des captures (2400).
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def P(n): return os.path.join(D, n)

ref = Image.open(P("reference-1080x2102.png")).convert("RGB")
cap = Image.open(P("capture-1080x2400.png")).convert("RGB")
cs  = Image.open(P("capture-carte-seule-1080x2400.png")).convert("RGB")
for n, im in (("reference", ref), ("capture-1080x2400", cap), ("capture-carte-seule", cs)):
    print(f"OUVERT {n}: {im.size}")
print("CTRL+ largeurs toutes a 1080 :", ref.size[0] == cap.size[0] == cs.size[0] == 1080)
print("CTRL- hauteur ref != captures :", ref.size[1] != cap.size[1])

# --- delta entre les deux captures declarees "sous chrome" / "hors chrome"
W, H = cap.size
a = cap.load(); b = cs.load()
diff_rows = {}
ndiff = 0
maxd = 0
bbox = [W, H, -1, -1]
for y in range(H):
    c = 0
    for x in range(W):
        pa = a[x, y]; pb = b[x, y]
        d = max(abs(pa[0]-pb[0]), abs(pa[1]-pb[1]), abs(pa[2]-pb[2]))
        if d > 2:
            c += 1; ndiff += 1
            if d > maxd: maxd = d
            if x < bbox[0]: bbox[0] = x
            if y < bbox[1]: bbox[1] = y
            if x > bbox[2]: bbox[2] = x
            if y > bbox[3]: bbox[3] = y
    if c: diff_rows[y] = c
print(f"\nDELTA capture-1080x2400 vs capture-carte-seule : {ndiff} px > 2/255 sur {W*H} ({100.0*ndiff/(W*H):.4f} %), max {maxd}/255")
print("  bbox des pixels differents :", bbox)
if diff_rows:
    ys = sorted(diff_rows)
    print(f"  lignes touchees : {len(ys)}, de y={ys[0]} a y={ys[-1]}")
