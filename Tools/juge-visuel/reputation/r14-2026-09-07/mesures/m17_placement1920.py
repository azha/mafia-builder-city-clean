"""m17 — PLACEMENT a 1920 SOUS CHROME : les deux bornes, et le chrome dans le cadre.
Le chrome depasse sous son filet ; a 2400 il retombe dans le sas vide, a 1920 il retombe
DANS le cadre. On mesure : (a) l'etendue verticale du depassement du chrome (mesuree a
2400, ou rien d'autre n'occupe la zone) ; (b) ou tombe cette etendue a 1920 ; (c) le
recouvrement avec le panneau d'enseigne et avec l'encre du TITRE.
Controle positif : le depassement mesure a 2400 doit valoir y143..203 (medaillon), valeur
independante deja obtenue au r13.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane

im24 = ouvrir('../capture-1080x2400.png'); p24 = im24.load()
im19 = ouvrir('../capture-1080x1920.png'); p19 = im19.load()

def encre(px, y, xa, xb, hors):
    ref = mediane([lum(px[x, y]) for x in hors])
    xs = [x for x in range(xa, xb) if lum(px[x, y]) > ref + 8]
    return xs

hors = list(range(60, 360)) + list(range(720, 1020))
print("\n== 2400 : etendue verticale du depassement du chrome (zone vide) ==")
runs = []
for y in range(143, 300):
    xs = encre(p24, y, 380, 700, hors)
    runs.append((y, (min(xs), max(xs), len(xs)) if xs else None))
cur = None; out = []
for y, r in runs:
    if r:
        if cur is None: cur = [y, y, r[0], r[1]]
        else: cur[1] = y; cur[2] = min(cur[2], r[0]); cur[3] = max(cur[3], r[1])
    else:
        if cur: out.append(tuple(cur)); cur = None
if cur: out.append(tuple(cur))
for a, b, xa, xb in out:
    print(f"   depassement y{a}..{b} (h={b-a+1})  x{xa}..{xb}")

print("\n== 1920 : ou cela retombe ==")
print("   filet du bandeau y141..142 · filet HAUT du cadre y162..164"
      " · panneau d'enseigne y191..194 (m04) · filet or de l'enseigne y366..373")
for a, b, xa, xb in out:
    print(f"   le depassement y{a}..{b} du chrome recouvre, a 1920 :"
          f" {'le CADRE (y>164)' if b > 164 else 'rien'}"
          f" · {'le PANNEAU D ENSEIGNE (y>194)' if b > 194 else ''}")
# encre du titre a 1920
print("\n   encre du TITRE 'Le miroir' a 1920 (or, x300..790) :")
ys = []
for y in range(195, 300):
    n = sum(1 for x in range(300, 790)
            if p19[x, y][0] > 150 and p19[x, y][0]-p19[x, y][2] > 60)
    if n > 3: ys.append((y, n))
if ys: print(f"      y{ys[0][0]}..{ys[-1][0]}  (h={ys[-1][0]-ys[0][0]+1})")
# le losange a 1920
print("\n   le LOSANGE a 1920 :")
for y in range(205, 245):
    xs = [x for x in range(480, 600)
          if p19[x, y][0] > 130 and p19[x, y][0]-p19[x, y][2] > 50]
    if xs: print(f"      y={y}  x{min(xs)}..{max(xs)} n={len(xs)}")

print("\n== BORNE BASSE a 1920 ==")
# premiere encre du DOCK : on cherche les ronds du dock (cercles) sous le CTA
for y in range(1650, 1920):
    ref = mediane([lum(p19[x, y]) for x in range(20, 1060)])
    xs = [x for x in range(20, 1060) if lum(p19[x, y]) > ref + 6]
    if len(xs) > 40:
        print(f"   premiere rangee 'dock' (>40 px d'encre) : y={y}  x{min(xs)}..{max(xs)}")
        break
print("   filet BAS du cadre y1626..1629 · CTA y1562..1647 (m01)")
