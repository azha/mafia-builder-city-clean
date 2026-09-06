"""m25 — le halo AUTOUR DU LIBELLE (et non du chiffre), et les dimensions du disque.
Fenetre : les 12 rangees au-dessus et les 8 rangees au-dessous de la bande du libelle
(REF y783..797 · JEU y809..823), memes 12/8 des deux cotes. Fond = p10 de la rangee.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum

CAS = [('REF','../reference-1080x2102.png', 783, 797, (58,353)),
       ('JEU2400','../capture-1080x2400.png', 809, 823, (57,349))]
for nom, fp, L0, L1, (X0, X1) in CAS:
    im = ouvrir(fp); px = im.load()
    def p10(y):
        v = sorted(lum(px[x, y]) for x in range(X0, X1+1)); return v[len(v)//10]
    haut = sum(max(0.0, lum(px[x, y])-p10(y)) for y in range(L0-12, L0) for x in range(X0, X1+1))
    bas = sum(max(0.0, lum(px[x, y])-p10(y)) for y in range(L1+1, L1+9) for x in range(X0, X1+1))
    print(f"  {nom} libelle y{L0}..{L1} : lumiere 12 rangees AU-DESSUS = {haut:8.0f}"
          f" · 8 rangees AU-DESSOUS = {bas:8.0f}")
    for y in list(range(L0-8, L0)) + list(range(L1+1, L1+7)):
        v = sum(max(0.0, lum(px[x, y])-p10(y)) for x in range(X0, X1+1))/(X1-X0+1)
        print(f"      y={y} exces moyen = {v:6.2f}")

print("\n== dimensions du DISQUE (compteur 3, ou l'encre ne fait que 188 px) ==")
im = ouvrir('../capture-1080x2400.png'); px = im.load()
X0, X1 = 730, 1022
def p10(y):
    v = sorted(lum(px[x, y]) for x in range(X0, X1+1)); return v[len(v)//10]
prof = {}
for y in range(736, 833):
    prof[y] = sum(max(0.0, lum(px[x, y])-p10(y)) for x in range(846, 907))/61
pic = max(v for y, v in prof.items() if not (770 <= y <= 773))
ys = [y for y, v in prof.items() if v >= pic/2 and not (770 <= y <= 773)]
print(f"   profil vertical (61 colonnes centrees sur le tiret) : pic hors encre = {pic:.1f}"
      f" a y={max(prof, key=lambda y: prof[y] if not (770<=y<=773) else -1)}")
print(f"   etendue a mi-hauteur : y{min(ys)}..{max(ys)} = {max(ys)-min(ys)+1} px"
      f" · le tiret est a y770..773")
# etendue horizontale a mi-hauteur, sur la rangee du pic
yp = max(prof, key=lambda y: prof[y] if not (770 <= y <= 773) else -1)
row = [(x, max(0.0, lum(px[x, yp])-p10(yp))) for x in range(X0, X1+1)]
m = max(v for _, v in row)
xs = [x for x, v in row if v >= m/2]
print(f"   etendue horizontale a mi-hauteur (y={yp}) : x{min(xs)}..{max(xs)} = {max(xs)-min(xs)+1} px"
      f" · le tiret fait x853..899 = 47 px")
