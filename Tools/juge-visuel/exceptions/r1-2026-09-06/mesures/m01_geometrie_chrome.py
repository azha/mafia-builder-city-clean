# m01 — géométrie du chrome sur la CAPTURE et vérification de la déclaration "sans chrome".
# Contrôle positif : la largeur des deux captures est 1080 (connue) ; la référence 1080 aussi.
# Contrôle négatif : la hauteur diffère (2400 vs 2102) — l'instrument doit le voir.
from util import *

print("== m01 géométrie du chrome ==")
cap  = ouvrir(CAP)
capsc= ouvrir(CAPSC)
ref  = ouvrir(REF)
print(f"  contrôle positif  largeurs : cap={cap.size[0]} capsc={capsc.size[0]} ref={ref.size[0]} (attendu 1080/1080/1080)")
print(f"  contrôle négatif  hauteurs : cap={cap.size[1]} ref={ref.size[1]} (doivent DIFFÉRER)")

# 1. Différence cap vs capsc : où le chrome existe-t-il ?
pc, ps = cap.load(), capsc.load()
lignes_diff = []
for y in range(2400):
    n = 0
    for x in range(0, 1080, 4):
        a, b = pc[x,y], ps[x,y]
        if abs(a[0]-b[0])+abs(a[1]-b[1])+abs(a[2]-b[2]) > 12: n += 1
    lignes_diff.append(n)
# bandes contiguës de lignes qui diffèrent
bandes, cur = [], None
for y, n in enumerate(lignes_diff):
    if n > 0:
        if cur is None: cur = [y, y]
        else: cur[1] = y
    else:
        if cur is not None and cur[1]-cur[0] >= 2: bandes.append(tuple(cur))
        cur = None
if cur is not None: bandes.append(tuple(cur))
print(f"  bandes où capture SOUS-CHROME diffère de la capture DÉCLARÉE sans chrome : {bandes}")
tot = sum(1 for n in lignes_diff if n>0)
print(f"  lignes différentes : {tot}/2400")

# 2. Le bandeau du haut sur la capture sous chrome : bas du bandeau = dernière ligne
#    non-noire contiguë depuis y=0 (le fond de contenu est quasi noir).
prof = profil_lignes(cap)
print("  luminance moyenne par ligne, capture sous chrome, y=0..230 (pas 10) :")
print("   ", [f"{y}:{prof[y]:.1f}" for y in range(0, 231, 10)])
print("  luminance moyenne par ligne, capture sous chrome, y=2150..2399 (pas 10) :")
print("   ", [f"{y}:{prof[y]:.1f}" for y in range(2150, 2400, 10)])
