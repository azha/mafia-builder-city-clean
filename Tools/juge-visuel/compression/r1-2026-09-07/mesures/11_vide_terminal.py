#!/usr/bin/env python3
# 11 — VIDE TERMINAL, mesure robuste au decor : l'encre est un ecart a la MEDIANE DE LA LIGNE
#   (un degrade ou une photo de fond ne compte donc pas comme encre ; un texte, un cadre, si).
#   CONTROLE POSITIF : la reference nominale v4-25 doit rendre un vide terminal NON NUL
#      (l'art du quai occupe son bas) mais MODESTE ; le canon serie 2, plus vide encore.
#   CONTROLE NEGATIF : si la sonde rendait ~0 % partout, elle mesurerait le fond, pas l'encre.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def vide(f, y0, y1, fac, nom, seuil=14, minpx=3):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size
    px=im.load()
    print(f"  OUVERT {f} -> {W}x{H}   [{nom}]")
    enc=[]
    for y in range(y0,y1+1):
        v=[lum(px[x,y]) for x in range(0,W,4)]
        s=sorted(v); m=s[len(s)//2]
        n=sum(1 for k in v if abs(k-m)>seuil)
        if n>minpx: enc.append(y)
    hl=y1-y0+1
    d=y1-max(enc) if enc else hl
    print(f"    rect y {y0}..{y1} = {hl} px = {hl/fac:.0f} CSS | lignes d'encre = {len(enc)} ({100*len(enc)/hl:.1f} %)")
    print(f"    derniere encre y={max(enc) if enc else '-'} -> VIDE TERMINAL {d} px = {d/fac:.0f} CSS = {100*d/hl:.1f} % du rect")
    return 100*d/hl

r={}
r['capture']  = vide('capture-1080x2400.png',       141,2178, 3.6, 'capture, entre bandeau et ronds du dock')
r['canon2vide']= vide('etats/ecran-canon-vide.png',  30,1740, 3.0, 'canon serie 2 « aucune semaine » (CONTROLE + : homologue d etat)')
r['v4-29']    = vide('etats/v4-29.png',             186,1740, 3.0, 'v4-29 « au calme » (CONTROLE + : homologue serie 4)')
r['v4-25ref'] = vide('reference-1080x2102.png',     223,2090, 3.6, 'reference nominale v4-25')
r['canon2encours']= vide('etats/ecran-canon.png',    30,1740, 3.0, 'canon serie 2 « semaine en cours » (CONTROLE - : ecran plein)')
print()
print("  >>> vide terminal, en % du rect libre :")
for k,v in sorted(r.items(), key=lambda kv:-kv[1]): print(f"        {k:16s} {v:5.1f} %")
