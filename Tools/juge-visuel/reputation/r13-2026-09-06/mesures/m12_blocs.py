# m12 — LES BLOCS DU CADRE : enseigne, compteurs, panneau elastique, panneau bas, CTA.
# Detection : filet de panneau = couleur (42,54,72) REF / (42,53,73) JEU (identiques a 1/255, m02),
#   rangee retenue si > 25 % de la largeur du cadre la porte. Filets or : predicat d'or (m01).
# Convention de bord : premiere et derniere rangee du filet.
# Controle positif : la hauteur du cadre filet a filet doit valoir ~1627 px (REF) / ~1628 px (JEU) — r12 #1.
# Controle negatif : la meme sonde dans la bande morte au-dessus du cadre (2400) doit rendre 0 rangee.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def blocs(im, nom, filet, x0, x1, y0, y1):
    p=px(im)
    rows=[]
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if dist(p[x,y],filet)<=8)
        if n > 0.25*(x1-x0): rows.append((y,n))
    seg=[]
    for y,n in rows:
        if seg and y==seg[-1][-1]+1: seg[-1].append(y)
        else: seg.append([y])
    print(f"\n=== {nom} : filets de panneau (couleur {filet}) ===")
    for s in seg: print(f"   y {s[0]}..{s[-1]} ({len(s)} px)")
    return [(s[0],s[-1]) for s in seg]

ref=ouvrir('reference-1080x2102.png'); cap=ouvrir('capture-1080x2400.png')
R=blocs(ref,'REFERENCE',(42,54,72),25,1055,440,2090)
C=blocs(cap,'CAPTURE 2400',(42,53,73),22,1058,470,2120)
print("\n--- comparaison, cote a cote, en OFFSET par rapport au filet haut du cadre ---")
print("   REF cadre 452..2078 (1627 px) · JEU cadre 482..2109 (1628 px)")
print("   REF (offset)                      JEU (offset)")
for i in range(max(len(R),len(C))):
    a=f"{R[i][0]-452:>5}..{R[i][1]-452:<5}" if i<len(R) else "        —    "
    b=f"{C[i][0]-482:>5}..{C[i][1]-482:<5}" if i<len(C) else "        —    "
    d=f"  Δ haut {R[i][0]-452-(C[i][0]-482):+4} px" if (i<len(R) and i<len(C)) else ""
    print(f"   {a}                   {b}{d}")
p=px(cap)
n=sum(1 for y in range(150,470) if sum(1 for x in range(22,1058) if dist(p[x,y],(42,53,73))<=8) > 0.25*1036)
print(f"\n  [controle negatif] rangees de filet trouvees dans la bande morte (y150..469) : {n}")
