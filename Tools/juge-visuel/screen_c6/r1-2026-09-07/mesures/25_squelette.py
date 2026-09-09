# -*- coding: utf-8 -*-
"""La capture 'etat non declare par le nom' : QUEL etat est-ce ? On inventorie l'encre presente.
CONTROLE POSITIF : le titre 'L'horizon' doit y etre trouve (une ligne d'encre or dans la boite du haut).
CONTROLE NEGATIF : la meme sonde dans la boite du bas (le pave) doit rendre ZERO ligne d'encre
   si le pave est reellement vide."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
S=3.6
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def lignes(im,x0,y0,x1,y1,marge=22):
    px=im.load()
    ech=sorted(lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1,5))
    f=ech[len(ech)//4]; s=f+marge
    out=[];cur=None
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if lum(px[x,y])>=s)
        if n>0:
            if cur is None: cur=[y,y,n]
            else: cur[1]=y; cur[2]=max(cur[2],n)
        else:
            if cur: out.append(tuple(cur)); cur=None
    if cur: out.append(tuple(cur))
    return out,f,s
def top(im,x0,y0,x1,y1,q=0.985):
    px=im.load(); ps=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]
    ps.sort(key=lum); t=ps[int(len(ps)*q):]
    return tuple(sorted(p[i] for p in t)[len(t)//2] for i in range(3))
def hexa(c): return "#%02x%02x%02x"%c

for f in ("capture-ecran-seul-1080x2400.png","capture-ecran-seul-1080x1920.png"):
    im=Image.open(os.path.join(R,f)).convert("RGB"); print("\n### %s %s" % (f,im.size))
    if "2400" in f: boites=[("enseigne",282,458),("compteurs",498,642),("liste",682,1815),("pave",1857,2100)]
    else:           boites=[("enseigne",282,458),("compteurs",498,642),("liste",682,1335),("pave",1377,1620)]
    for nom,y0,y1 in boites:
        L,fo,s=lignes(im,52,y0,1028,y1)
        print("  %-10s y=%4d..%4d : %d ligne(s) d'encre  (fond_lum=%.1f seuil=%.1f)" % (nom,y0,y1,len(L),fo,s))
        for a,b,n in L[:6]:
            print("        y=%4d..%4d h=%3d px=%5.2f CSS  largeur max=%4d px  encre=%s"
                  % (a,b,b-a+1,(b-a+1)/S,n,hexa(top(im,52,a,1028,b+1))))
    # les 3 tirets des compteurs
    px=im.load()
    L,fo,s=lignes(im,52,498,1028,642)
    if L:
        a,b,_=L[0]
        xs=[x for x in range(52,1028) if any(lum(px[x,y])>=s for y in range(a,b+1))]
        seg=[];c=None
        for x in xs:
            if c is None: c=[x,x]
            elif x-c[1]<=6: c[1]=x
            else: seg.append(tuple(c)); c=[x,x]
        if c: seg.append(tuple(c))
        print("  compteurs : %d segments d'encre :" % len(seg), [(u,v,v-u+1) for u,v in seg])
