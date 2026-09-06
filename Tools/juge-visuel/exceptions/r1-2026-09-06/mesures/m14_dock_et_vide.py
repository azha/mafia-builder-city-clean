# m14 — haut du dock, rect libre de contenu, et part de ce rect laissée VIDE.
# Contrôle positif : le fond de contenu mesuré doit être (13,13,13) partout dans la zone déclarée vide
#   (variance nulle) ; contrôle négatif : la même sonde sur la RÉFÉRENCE (art peint) doit rendre une
#   variance ÉLEVÉE, sinon elle ne distingue pas "vide" de "peint".
from util import *
import statistics
print("== m14 dock, rect libre, vide ==")
cap=ouvrir(CAP); pc=cap.load()
# haut du dock : première ligne, en partant de 2400 vers le haut, où la colonne x=20 quitte (13,13,13)
col=[(y,pc[20,y]) for y in range(2100,2400)]
top=None
for y in range(2399,2100,-1):
    c=pc[20,y]
    if abs(c[0]-13)+abs(c[1]-13)+abs(c[2]-13)<=1: top=y
print(f"  dock : première ligne (en descendant) où x=20 quitte (13,13,13) = {top+1 if top else '?'}")
for y in range(2140,2185,5): print(f"     y={y} x=20 -> {pc[20,y]}   x=1060 -> {pc[1060,y]}")

DOCK_TOP=2155
BANDEAU_BAS=143
print(f"  rect libre déclaré : y {BANDEAU_BAS}..{DOCK_TOP} = {DOCK_TOP-BANDEAU_BAS} px de haut (sur 2400)")
print(f"  contenu réellement dessiné (bandes d'encre) : y 1292..2115 = 824 px")
print(f"  => VIDE en haut du rect libre : {1292-BANDEAU_BAS} px = {(1292-BANDEAU_BAS)/(DOCK_TOP-BANDEAU_BAS)*100:.1f} % du rect libre")
print(f"     (en excluant le débord du manomètre et le losange, qui finissent à y=231 : {1292-232} px = {(1292-232)/(DOCK_TOP-232)*100:.1f} %)")

# variance de la zone vide vs zone peinte de la référence (contrôle +/-)
def variance(im, fen, pas=7):
    px=im.load(); x0,y0,x1,y1=fen; vals=[]
    for y in range(y0,y1,pas):
        for x in range(x0,x1,pas):
            c=px[x,y]; vals.append((c[0]*299+c[1]*587+c[2]*114)/1000)
    return statistics.pstdev(vals), statistics.mean(vals), len(vals)
s,m,n=variance(cap,(0,300,1080,1250)); print(f"  CAP zone 'vide' y300..1250 : écart-type={s:.2f} moyenne={m:.2f} n={n}  (contrôle + : ≈0 ⇒ aplat)")
ref=ouvrir(REF)
s,m,n=variance(ref,(0,300,1080,1250)); print(f"  RÉF même bande y300..1250   : écart-type={s:.2f} moyenne={m:.2f} n={n}  (contrôle − : ≫0 ⇒ art peint)")
