import sys; sys.path.insert(0,'.')
from lib import *
print("=== m09 : occlusion reelle du libelle CTA par les ronds du dock (1080x1920) ===")
a = ouvrir('../capture-1080x1920.png')          # sous chrome
b = ouvrir('../capture-ecran-seul-1080x1920-T.png')  # sans chrome
pa,pb = px(a), px(b)
# encre du libelle mesuree sur la planche SANS chrome
encre = [(x,y) for y in range(1676,1705) for x in range(237,844)
         if est_or(pb[x,y],50) and lum(pb[x,y])>90]
print(f"  encre du libelle (planche sans chrome) : {len(encre)} px, y 1676..1704, x 237..843")
for seuil in (10,25,40,60):
    n = sum(1 for (x,y) in encre if max(abs(pa[x,y][i]-pb[x,y][i]) for i in range(3))>seuil)
    print(f"    px dont la couleur change de plus de {seuil}/255 sous chrome : {n} ({100*n/len(encre):.1f} %)")
# ronds du dock : bbox des px tres differents dans la bande 1650..1830
diff = [(x,y) for y in range(1650,1830) for x in range(0,1080)
        if max(abs(pa[x,y][i]-pb[x,y][i]) for i in range(3))>25]
if diff:
    xs=[d[0] for d in diff]; ys=[d[1] for d in diff]
    print(f"  emprise des ronds (diff>25) : x {min(xs)}..{max(xs)}, y {min(ys)}..{max(ys)} ; {len(diff)} px")
# 4 disques : segmenter par colonnes
cols = sorted(set(xs))
groupes=[]
for x in cols:
    if groupes and x-groupes[-1][-1]<=6: groupes[-1].append(x)
    else: groupes.append([x])
print(f"  {len(groupes)} groupes de colonnes -> {[(g[0],g[-1]) for g in groupes]}")
print()
print("  contraste du libelle la ou il croise un rond, vs la ou il ne le croise pas :")
# fond de la boite CTA sous chrome, hors rond (x 900..1000, y 1690..1700)
fond_hors = mediane_fenetre(pa, 880, 1712, 960, 1728)
fond_rond = mediane_fenetre(pa, 240, 1712, 300, 1728)
print(f"    fond du CTA hors rond (x880..960,y1712..1728) = {fond_hors}")
print(f"    fond du CTA sur rond  (x240..300,y1712..1728) = {fond_rond}")
encre_c = mediane_fenetre(pa, 300, 1682, 320, 1690)
print(f"    encre du libelle (mediane) = {encre_c}")
print(f"    contraste encre/fond hors rond = {contraste(encre_c,fond_hors):.2f}:1 ; sur rond = {contraste(encre_c,fond_rond):.2f}:1")
