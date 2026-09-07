# -*- coding: utf-8 -*-
"""Detection des REGIONS par classe de couleur (papier / rouge penurie / or CTA / bandeau bleu).
Controle positif : sur la REFERENCE le papier DOIT exister (la maquette montre un bon de commande).
Controle negatif : la classe 'vert' (inexistante sur les deux) DOIT rendre 0 lignes."""
from PIL import Image

def cls(p):
    r,g,b=p
    if r>195 and g>185 and b>160 and (r-b)<70 and (r-b)>5: return "papier"
    if r>120 and 30<g<95 and 20<b<85 and r-g>50: return "rouge"
    if r>150 and g>105 and b<130 and r-b>60 and g-b>40: return "or"
    if r<40 and g<40 and b<40: return "noir"
    return "."

def bandes(path):
    im=Image.open(path).convert("RGB"); W,H=im.size
    print("OUVERT %s  taille=%dx%d"%(path,W,H)); px=im.load()
    res={}
    for name in ("papier","rouge","or","noir"):
        res[name]=[0]*H
    for y in range(H):
        cnt={}
        for x in range(0,W,3):
            c=cls(px[x,y]); cnt[c]=cnt.get(c,0)+1
        n=len(range(0,W,3))
        for k in res: res[k][y]=cnt.get(k,0)/n
    return res,W,H

def runs(v,seuil,minlen=4):
    out=[];s=None
    for y,val in enumerate(v):
        if val>=seuil and s is None: s=y
        elif val<seuil and s is not None:
            if y-s>=minlen: out.append((s,y-1,y-s))
            s=None
    if s is not None and len(v)-s>=minlen: out.append((s,len(v)-1,len(v)-s))
    return out

for path in ("../reference-1080x2102.png","../capture-1080x2400.png"):
    res,W,H=bandes(path)
    for name,seuil in (("papier",0.40),("rouge",0.25),("or",0.25)):
        r=runs(res[name],seuil)
        print("  %-7s bandes(>=%.2f de la ligne) : %s"%(name,seuil,r if r else "AUCUNE"))
    # colonnes du papier : bornes gauche/droite
    im=Image.open(path).convert("RGB"); px=im.load()
    pr=runs(res["papier"],0.40)
    for (y0,y1,h) in pr:
        ym=(y0+y1)//2
        xs=[x for x in range(W) if cls(px[x,ym])=="papier"]
        if xs: print("     papier y=%d..%d (h=%d) : x=%d..%d larg=%d"%(y0,y1,h,min(xs),max(xs),max(xs)-min(xs)+1))
    print()
print("CONTROLE NEGATIF : aucune classe 'vert' n'est definie -> non applicable ; a la place,")
print("  la classe 'rouge' DOIT etre presente sur la reference (bloc penurie) et l'absence en jeu est le finding.")
