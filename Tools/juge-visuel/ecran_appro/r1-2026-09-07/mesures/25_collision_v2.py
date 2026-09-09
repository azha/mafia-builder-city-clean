# -*- coding: utf-8 -*-
"""COLLISION v2 — la sonde v1 comptait le FILET braise du bandeau (y=141..142) comme un bord de
medaillon : elle est refutee. Ici l'anneau est localise par traversee horizontale a la hauteur du
centre, et le glyphe '€' est isole colonne par colonne.
CONTROLE POSITIF : la traversee a y=110 doit rendre 2 (et 2 seulement) intervalles braise, symetriques
                   autour de x=540 (milieu de 1080).
CONTROLE NEGATIF : la meme traversee a y=300 (hors medaillon) doit rendre 0 intervalle."""
from PIL import Image
CAP="../capture-1080x2400.png"
im=Image.open(CAP).convert("RGB"); W,H=im.size; px=im.load(); print("OUVERT",CAP,(W,H))
def braise(p): return abs(p[0]-224)<50 and abs(p[1]-102)<45 and abs(p[2]-74)<45
def traverse(y):
    on=[x for x in range(W) if braise(px[x,y])]
    g=[];s=None;p=None
    for x in on:
        if s is None: s=x
        elif x-p>3: g.append((s,p)); s=x
        p=x
    if s is not None: g.append((s,p))
    return g
for y in (110,300):
    print("  traversee y=%d : %s"%(y,traverse(y)))
g=traverse(110)
gauche=g[0][0]
print("  bord gauche de l'anneau a la hauteur du centre : x=%d"%gauche)
def est_or(p):
    r,gg,b=p
    return r>150 and 110<gg<210 and b<130 and (r-b)>70 and (r-gg)>20 and (gg-b)>25
oc=[x for x in range(300,520) if any(est_or(px[x,y]) for y in range(45,115))]
print("  encre OR (valeur ARGENT) : derniere colonne x=%d"%max(oc))
print("  ECART encre OR -> anneau : %d px  => %s"%(gauche-max(oc),
   "CHEVAUCHEMENT" if gauche-max(oc)<0 else "PAS de chevauchement, contact a %d px"%(gauche-max(oc))))
# le glyphe le plus a droite (le '€') : bbox et symetrie
cols=[x for x in range(400,470) if any(est_or(px[x,y]) for y in range(45,115))]
print("  colonnes or du dernier glyphe : x=%d..%d (largeur %d)"%(min(cols),max(cols),max(cols)-min(cols)+1))
# hauteur de l'encre or par colonne : un glyphe coupe montre une chute brutale au bord droit
prof=[(x,sum(1 for y in range(45,115) if est_or(px[x,y]))) for x in range(min(cols),max(cols)+3)]
print("  profil vertical d'encre du dernier glyphe (x, nb de lignes encrees) :")
print("   ",prof)
# assombrissement du fond juste a droite du '€' (voile/ombre du medaillon ?)
def m(v): v=sorted(v); return v[len(v)//2]
for x0,x1 in ((350,400),(410,445),(452,470)):
    R=[px[x,y] for y in (50,60,70) for x in range(x0,x1)]
    print("  fond entre x=%d..%d : #%02x%02x%02x"%(x0,x1,m([p[0] for p in R]),m([p[1] for p in R]),m([p[2] for p in R])))
