# m16 — présence de l'OR / du laiton dans la zone de contenu.
# Test "or" : teinte 33..58°, saturation ≥ 0,30, valeur ≥ 0,30 (HSV).
# Contrôle positif : le BANDEAU de la capture (y0..143) contient l'or de "ARGENT 9 627 820,00 €"
#   ⇒ la sonde DOIT y trouver des px. Contrôle négatif : une bande de fond noir pur ⇒ 0 px.
from util import *
import colorsys
print("== m16 or / laiton ==")
def compte_or(im, fen, pas=2):
    px=im.load(); x0,y0,x1,y1=fen; n=0; tot=0; ech=[]
    for y in range(y0,y1,pas):
        for x in range(x0,x1,pas):
            c=px[x,y]; tot+=1
            h,s,v=colorsys.rgb_to_hsv(c[0]/255,c[1]/255,c[2]/255)
            if 33/360<=h<=58/360 and s>=0.30 and v>=0.30:
                n+=1
                if len(ech)<4: ech.append(c)
    return n,tot,ech
cap=ouvrir(CAP); ref=ouvrir(REF)
n,t,e=compte_or(cap,(0,0,1080,143));   print(f"  CAP contrôle POSITIF  bandeau y0..143   : {n}/{t} px 'or' ({n/t*100:.2f} %) ex={e}")
n,t,e=compte_or(cap,(0,400,1080,1200));print(f"  CAP contrôle NÉGATIF  vide y400..1200   : {n}/{t} px 'or' ({n/t*100:.2f} %)")
n,t,e=compte_or(cap,(0,232,1080,2155));print(f"  CAP contenu y232..2155                  : {n}/{t} px 'or' ({n/t*100:.2f} %) ex={e}")
n,t,e=compte_or(cap,(0,1280,1080,2130));print(f"  CAP contenu DESSINÉ y1280..2130         : {n}/{t} px 'or' ({n/t*100:.2f} %) ex={e}")
n,t,e=compte_or(ref,(0,216,1080,2100));print(f"  RÉF contenu y216..2100                  : {n}/{t} px 'or' ({n/t*100:.2f} %) ex={e}")
