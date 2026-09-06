# m22 : verifications finales -- chevauchement des plaques, marges au bord d'ecran,
# plaque 17 (hauteur 38 au lieu de 34 : artefact de composante ou vraie plaque ?)
from PIL import Image
cap=Image.open('capture-1080x2400.png').convert('RGB'); px=cap.load()
print(f"ouvert capture-1080x2400.png -> {cap.size}")
pl=[(835,462,1011,495),(462,479,638,512),(78,483,254,516),(853,682,1029,714),
(492,703,668,736),(91,709,267,742),(841,940,1017,973),(94,943,270,975),(484,945,660,978),
(76,1402,252,1435),(839,1406,1015,1440),(463,1421,639,1454),(829,1666,1005,1699),
(63,1680,240,1713),(441,1687,617,1720),(816,1943,993,1975),(75,1955,251,1992),(440,1960,616,1993)]
n=0
for i in range(len(pl)):
    for j in range(i+1,len(pl)):
        a,b=pl[i],pl[j]
        if a[0]<=b[2] and b[0]<=a[2] and a[1]<=b[3] and b[1]<=a[3]: n+=1; print("  CHEVAUCHEMENT",i+1,j+1)
print(f"  paires qui se chevauchent : {n}")
print(f"  marge gauche minimale : {min(p[0] for p in pl)} px ; marge droite minimale : {1080-max(p[2] for p in pl)} px")
print(f"  haut minimal : {min(p[1] for p in pl)} (contenu commence a 231) ; bas maximal : {max(p[3] for p in pl)} (contenu finit a 2151)")
print("\n  plaque 17 (LA CHANCELLERIE) : colonne x=160, y 1950..1996")
for y in range(1950,1997,2): print(f"    y={y} {px[160,y]}")
