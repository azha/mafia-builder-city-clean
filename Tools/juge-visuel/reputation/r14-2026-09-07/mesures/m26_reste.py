"""m26 — le reste des grandeurs du r13 : lueur de la bande interieure haute du cadre,
cadran de la montre, marges du cadre, boite du CTA, bloc enseigne.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane

REF = ouvrir('../reference-1080x2102.png'); J = ouvrir('../capture-1080x2400.png')

print("\n== bande interieure haute du cadre (entre le filet du cadre et le panneau d'enseigne) ==")
for nom, im, y0, y1 in [('REF', REF, 456, 478), ('JEU', J, 487, 508)]:
    px = im.load()
    prof = [(x, tuple(int(round(mediane([px[x, y][i] for y in range(y0, y1+1)]))) for i in range(3)))
            for x in range(30, 1050, 10)]
    bord = prof[0][1]; pic = max(prof, key=lambda t: lum(t[1]))
    print(f"   {nom} : bord x30 {bord} · pic x{pic[0]} {pic[1]}  (L {lum(bord):.1f} -> {lum(pic[1]):.1f})")

print("\n== cadran de la montre (creme sur le torse) ==")
for nom, im, y0, y1, x0, x1 in [('REF', REF, 1290, 1340, 150, 230), ('JEU', J, 1330, 1385, 140, 230)]:
    px = im.load()
    E = [(x, y) for y in range(y0, y1) for x in range(x0, x1)
         if lum(px[x, y]) > 45 and px[x, y][0] > 60]
    if E:
        xs = [p[0] for p in E]; ys = [p[1] for p in E]
        print(f"   {nom} : {max(xs)-min(xs)+1}x{max(ys)-min(ys)+1} px · aire={len(E)}"
              f" · bbox x{min(xs)}..{max(xs)} y{min(ys)}..{max(ys)}")

print("\n== cadre : hors-tout, marges, epaisseurs ==")
print("   REF : rails x21..23 et x1056..1058 -> hors-tout 21..1058 = 1038 px · marges 21 / 21"
      " · filets horizontaux 3 px (452..454)")
print("   JEU : rails x18..20 et x1059..1061 -> hors-tout 18..1061 = 1044 px · marges 18 / 18"
      " · filets horizontaux 4 px (482..485)")

print("\n== boite du CTA ==")
print("   REF : 1952..2046 = 95 px · JEU2400 : 1882..1970 = 89 px  (-6,3 %)")
print("   REF largeur : ", end='')
def largeur_boite(im, y, xa, xb):
    px = im.load()
    v = [lum(px[x, y]) for x in range(xa, xb)]
    fond = mediane(v); s = (fond + max(v))/2
    xs = [x for x in range(xa, xb) if lum(px[x, y]) >= s]
    return min(xs), max(xs)
a = largeur_boite(REF, 1953, 30, 1050); print(f"x{a[0]}..{a[1]} = {a[1]-a[0]+1}")
b = largeur_boite(J, 1883, 30, 1050); print(f"   JEU largeur : x{b[0]}..{b[1]} = {b[1]-b[0]+1}")

print("\n== bloc enseigne : filet or, en offset depuis le filet haut du cadre ==")
print("   REF : panneau 481..483 (off 29..31) · filet or 663..669 (off 211..217)")
print("   JEU : panneau 512..514 (off 30..32) · filet or 687..693 (off 205..211)")
