# m31 — (a) part CHAUDE de la zone de contenu (direction « napolitain, sombre, chaud ») ;
#        (b) gouttière : le contenu reste-t-il entre le bandeau et le dock ?
# Contrôle positif : le bandeau doré du comptoir de la référence est chaud ⇒ part chaude ≫ 0.
# Contrôle négatif : une bande de fond (13,13,13) est neutre ⇒ part chaude = 0.
from util import *
print("== m31 chaleur + gouttière ==")
def part_chaude(im,fen,pas=3,marge=10):
    px=im.load(); x0,y0,x1,y1=fen; n=0;t=0
    for y in range(y0,y1,pas):
        for x in range(x0,x1,pas):
            c=px[x,y]; t+=1
            if c[0]-c[2]>=marge and max(c)>=30: n+=1
    return n,t
ref=ouvrir(REF); cap=ouvrir(CAP)
n,t=part_chaude(ref,(0,216,1080,2100)); print(f"  RÉF contenu y216..2100 : {n}/{t} px chauds = {n/t*100:.1f} %")
n,t=part_chaude(ref,(0,860,1080,1000));print(f"  RÉF contrôle + (bandeau du comptoir y860..1000) : {n/t*100:.1f} %")
n,t=part_chaude(cap,(0,232,1080,2155));print(f"  CAP contenu y232..2155 : {n}/{t} px chauds = {n/t*100:.1f} %")
n,t=part_chaude(cap,(0,1280,1080,2130));print(f"  CAP contenu DESSINÉ y1280..2130 : {n/t*100:.1f} %")
n,t=part_chaude(cap,(0,400,1080,1200));print(f"  CAP contrôle − (vide y400..1200) : {n/t*100:.1f} %")

print("\n  -- gouttière --")
pc=cap.load()
def encre(y0,y1):
    n=0
    for y in range(y0,y1):
        for x in range(0,1080,2):
            c=pc[x,y]
            if abs(c[0]-13)+abs(c[1]-13)+abs(c[2]-13)>25: n+=1
    return n
print(f"   px de contenu SOUS le bandeau (y143..232, hors manomètre/losange) : à titre indicatif {encre(232,260)} px entre y232 et 260 (attendu 0)")
print(f"   px de contenu entre y2116 et 2155 (avant le dock) : {encre(2116,2156)} (attendu 0)")
print(f"   bornes du contenu dessiné : y1292..2115 ; bandeau bas=143 (débord manomètre 203, losange 231) ; dock haut≈2156")
