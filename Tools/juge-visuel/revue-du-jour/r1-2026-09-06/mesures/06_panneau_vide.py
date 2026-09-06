#!/usr/bin/env python3
"""Panneau 'etat vide' du temoin v4-1 : detecte le remplissage BLEU NUIT
(canal bleu nettement > canal rouge) — la signature des plaques de la maquette.
Controle positif : le meme detecteur applique a la reference nominale doit
trouver les TROIS bulles de signalement (3 blocs) ; controle negatif : applique
a la capture (fond noir pur) il doit trouver 0 ligne."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def charge(p,e=1.0):
    im=Image.open(os.path.join(D,p)).convert('RGB'); print(f"  ouvert: {p} {im.size}")
    if e!=1.0: im=im.resize((round(im.width*e),round(im.height*e)),Image.LANCZOS); print(f"    -> {im.size}")
    return im
def bleu_nuit(im,y0,y1):
    """lignes ou >=15% des px sont 'bleu nuit' : b-r>=8 et 8<=b<=70"""
    px=im.load(); w,h=im.size; segs=[]; deb=None; det=[]
    for y in range(y0,min(y1,h)):
        n=0; xs=[]
        for x in range(w):
            r,g,b=px[x,y]
            if b-r>=8 and 8<=b<=70: n+=1; xs.append(x)
        det.append((y,n,xs[0] if xs else None,xs[-1] if xs else None))
        if n>=0.15*w and deb is None: deb=y
        elif n<0.15*w and deb is not None:
            if y-deb>=8: segs.append((deb,y-1,y-deb)); deb=None
            else: deb=None
    if deb is not None: segs.append((deb,min(y1,h)-1,min(y1,h)-deb))
    return segs,det

for nom,p,e,y0,y1 in [('TEMOIN v4-1 x1.2 (etat vide)','etats/v4-1.png',1.2,1200,1680),
                      ('REFERENCE nominale (3 bulles) [ctrl +]','reference-1080x2102.png',1.0,500,1660),
                      ('CAPTURE 2026-09-04 [ctrl -]','capture-1080x2400.png',1.0,143,1990),
                      ('CAPTURE seuil-force [ctrl -]','capture-seuil-force-1080x2400.png',1.0,143,1770)]:
    print(f"\n=== {nom} ===")
    im=charge(p,e); segs,det=bleu_nuit(im,y0,y1)
    print(f"  segments 'bleu nuit' (>=15% de la ligne, >=8 lignes) : {len(segs)}")
    tot=sum(d[1] for d in det); n=len(det)*im.width
    print(f"  part de px bleu-nuit sur la plage = {100*tot/n:.2f}%")
    for (a,b,ln) in segs:
        xs0=min(d[2] for d in det if a<=d[0]<=b and d[2] is not None)
        xs1=max(d[3] for d in det if a<=d[0]<=b and d[3] is not None)
        print(f"    y={a}..{b} (h={ln})  x={xs0}..{xs1} (l={xs1-xs0+1})")
