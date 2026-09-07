# -*- coding: utf-8 -*-
"""Segmentation en MOTS (runs de colonnes encrees separes par un blanc >= 0,35 x hauteur de capitale).
Sert a isoler des chaines identiques dans les deux images pour comparer chasse et hauteur.
CONTROLE POSITIF : la ligne 'A QUOI CA SERT / pour le brindle' de la REFERENCE doit rendre >=6 mots.
CONTROLE NEGATIF : une bande vide doit rendre 0 mot."""
from PIL import Image
def mots(path,xa,xb,ya,yb,fond,seuil=45,gap=14):
    im=Image.open(path).convert("RGB"); px=im.load()
    col=[]
    for x in range(xa,xb+1):
        c=0
        for y in range(ya,yb+1):
            p=px[x,y]
            if max(abs(p[i]-fond[i]) for i in range(3))>seuil: c+=1
        col.append(c>0)
    out=[];s=None;blanc=0
    for i,v in enumerate(col):
        if v:
            if s is None: s=i
            blanc=0
        else:
            if s is not None:
                blanc+=1
                if blanc>=gap:
                    out.append((xa+s,xa+i-blanc)); s=None; blanc=0
    if s is not None: out.append((xa+s,xb))
    return out
REF="../reference-1080x2102.png"; CAP="../capture-1080x2400.png"
print("OUVERT",REF,Image.open(REF).size,"|",CAP,Image.open(CAP).size)
Z=[
 ("REF h4  (Pyralin + BON DE COMMANDE)",REF, 60,1020, 683,718,(239,231,214),20),
 ("CAP h4  (Pyralin + BON DE COMMANDE)",CAP, 60,1020, 650,705,(234,224,200),20),
 ("REF ligne1 (A QUOI CA SERT / pour le brindle)",REF,60,1020,766,800,(239,231,214),14),
 ("CAP ligne1 (A QUOI CA SERT / pour le brindle)",CAP,60,1020,733,772,(234,224,200),14),
 ("REF titre h3",REF,40,1040,477,520,(30,27,22),14),
 ("CAP titre ligne1",CAP,40,1040,288,345,(13,13,13),18),
 ("REF CTA",REF,60,1020,1970,2010,(36,28,17),16),
 ("CAP CTA",CAP,60,1020,1420,1465,(217,171,77),16),
]
for nom,path,xa,xb,ya,yb,fond,g in Z:
    m=mots(path,xa,xb,ya,yb,fond,gap=g)
    print("  %-46s %d mots : %s"%(nom,len(m),m))
print()
print("CONTROLE NEGATIF (ref y1300..1340 vide) :",len(mots(REF,60,1020,1300,1340,(21,19,17))),"mot(s)")
