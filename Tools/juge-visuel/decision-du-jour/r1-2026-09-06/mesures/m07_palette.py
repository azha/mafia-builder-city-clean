#!/usr/bin/env python3
"""m07 - couche globale : palette dominante (histogramme quantifie), luminance moyenne, densite
d'encre. Mesure sur le RECT LIBRE (entre bas du bandeau et haut du dock), pas sur l'image entiere :
le chrome n'est pas a la meme echelle et n'est pas juge ici.
REF : rect libre = y 211..2101 (le cadre serie 4 n'a pas de dock ; le CTA va au bas de l'image)
CAP : rect libre = y 143..2178 (bas du filet or du bandeau .. haut du dock, mesures m04/m05)
Controle positif : la somme des % de la palette doit valoir 100.
"""
from PIL import Image
import os, collections
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def couche(fn, y0, y1, label):
    im = Image.open(os.path.join(D,fn)).convert('RGB'); W,H = im.size
    print(f"\n=== [{label}] {fn} {W}x{H} — rect libre y={y0}..{y1} ({y1-y0+1} lignes) ===")
    box = im.crop((0,y0,W,y1+1))
    px = box.load(); w,h = box.size
    # palette : quantification a pas de 24 par canal
    c = collections.Counter()
    tot=0; slum=0.0
    for y in range(0,h,2):
        for x in range(0,w,2):
            p=px[x,y]; c[(p[0]//24*24,p[1]//24*24,p[2]//24*24)] += 1; tot+=1; slum+=L(p)
    print(f"  luminance moyenne = {slum/tot:6.2f}")
    print(f"  palette dominante (bucket 24) :")
    s=0.0
    for col,n in c.most_common(6):
        pc=n/tot*100; s+=pc
        print(f"     {str(col):18s} {pc:6.2f}%")
    print(f"  (les 6 premiers couvrent {s:.2f}%)")
    tt=sum(c.values())
    print(f"  CONTROLE POSITIF somme de TOUS les buckets = {sum(v/tt*100 for v in c.values()):.2f}% (attendu 100.00)")
    # densite d'encre : part des px hors du bucket dominant
    dom = c.most_common(1)[0][0]
    ndom = c[dom]
    print(f"  bucket dominant {dom} = {ndom/tot*100:.2f}%  -> densite (hors dominant) = {100-ndom/tot*100:.2f}%")
    # part de px quasi-noirs (lum < 20)
    nb=0
    for y in range(0,h,2):
        for x in range(0,w,2):
            if L(px[x,y])<20: nb+=1
    print(f"  part de px quasi-noirs (lum<20) = {nb/tot*100:.2f}%")

couche('reference-1080x2102.png', 211, 2101, 'REF')
couche('capture-1080x2400.png',   143, 2178, 'CAP')
