"""07 - Rythme vertical NORMALISE (dossier.md : aligner haut du contenu sur bas du bandeau,
bas du contenu sur haut du dock ; jamais le pixel absolu).
Trouve d'abord le bas du bandeau et le haut du dock de la CAPTURE, par la mesure.
Controle positif : le bas du bandeau doit tomber a 143 px (52 CSS-HUD x 2,755 -- valeur
DERIVEE du code et ecrite dans dossier.md ; si la mesure ne la rend pas, c'est le dossier
qui ment, pas l'instrument)."""
from PIL import Image
from statistics import median
im=Image.open('../capture-1080x2400.png').convert('RGB'); print("ouvre capture:", im.size); p=im.load()

# bandeau : filet orange horizontal pleine largeur
for y in range(100,200):
    n=sum(1 for x in range(0,1080,4) if p[x,y][0]>120 and p[x,y][0]-p[x,y][2]>40)
    if n>200: print(f"  filet bandeau y={y}  px_orange={n}/270  couleur={p[540,y]}")
# dock : premiere ligne, en partant du bas, ou le fond cesse d'etre (13,13,13)
fond=(13,13,13)
for y in range(2399,1200,-1):
    row=[p[x,y][:3] for x in range(0,1080,8)]
    m=(int(median([c[0] for c in row])),int(median([c[1] for c in row])),int(median([c[2] for c in row])))
    if max(abs(m[i]-fond[i]) for i in range(3))<=3:
        print(f"  haut du dock : premiere ligne de fond pur en remontant = y={y}  (dock = y {y+1}..2399, h={2399-y})")
        break
# encre la plus basse du contenu
enc=[y for y in range(1200,2200) for x in range(0,1080,4)
     if max(abs(p[x,y][i]-fond[i]) for i in range(3))>8]
print("  encre de contenu la plus basse : y=", max(enc))
