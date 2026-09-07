# -*- coding: utf-8 -*-
"""INVENTAIRE EXHAUSTIF : toutes les bandes de contenu de la zone jugee, pour ne rien oublier.
Une bande = suite de lignes ou >=8 colonnes s'ecartent de plus de 14/255 du fond LOCAL (mediane de ligne
prise dans une fenetre laterale libre).
CONTROLE POSITIF : la sonde DOIT retrouver les 4 filets pointilles de la reference (deja mesures).
CONTROLE NEGATIF : elle DOIT rendre 0 bande entre y=1300 et 1700 de la reference (vide)."""
from PIL import Image
def m(v): v=sorted(v); return v[len(v)//2]
def inventaire(path,y0,y1,nom):
    im=Image.open(path).convert("RGB"); W,H=im.size; px=im.load()
    print("OUVERT %s taille=%dx%d — %s"%(path,W,H,nom))
    bandes=[];s=None
    for y in range(y0,y1+1):
        row=[px[x,y] for x in range(0,W,2)]
        fondl=(m([p[0] for p in row]),m([p[1] for p in row]),m([p[2] for p in row]))
        c=sum(1 for p in row if max(abs(p[i]-fondl[i]) for i in range(3))>14)
        if c>=8 and s is None: s=y
        elif c<8 and s is not None:
            bandes.append((s,y-1)); s=None
    if s is not None: bandes.append((s,y1))
    for a,b in bandes:
        xs=[]
        for y in range(a,b+1,max(1,(b-a)//12+1)):
            row=[(x,px[x,y]) for x in range(0,W,2)]
            fondl=(m([p[0] for _,p in row]),m([p[1] for _,p in row]),m([p[2] for _,p in row]))
            xs+=[x for x,p in row if max(abs(p[i]-fondl[i]) for i in range(3))>14]
        if xs: print("   y=%4d..%4d h=%3d   x=%4d..%4d"%(a,b,b-a+1,min(xs),max(xs)))
    print("   -> %d bandes\n"%len(bandes))
    return bandes
inventaire("../reference-1080x2102.png",439,2101,"REFERENCE, panneau .appr6 (y439..2101)")
inventaire("../capture-1080x2400.png",143,2179,"CAPTURE, zone de contenu (y143..2179)")
b=inventaire("../reference-1080x2102.png",1300,1700,"CONTROLE NEGATIF reference y1300..1700 (vide)")
