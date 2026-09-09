#!/usr/bin/env python3
"""m16 - CONTINUITE du contour du CTA secondaire. On suit le trait du bord HAUT et du bord BAS
et on mesure sur quelle fraction de la largeur il existe.
Controle positif : dans la REFERENCE le contour doit etre continu (couverture ~100%).
Controle negatif : si la capture rend ~100% aussi, il n'y a pas de defaut a signaler.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")

def couverture(im,x0,x1,ybande0,ybande1,fondlum,label,marge=8):
    """pour chaque colonne, y a-t-il un px du trait (lum > fond+marge) dans la bande ?"""
    px=im.load(); ok=[];lum=[]
    for x in range(x0,x1):
        best=max(L(px[x,y]) for y in range(ybande0,ybande1))
        lum.append(best); ok.append(best>fondlum+marge)
    n=sum(ok); tot=len(ok)
    # plages MANQUANTES
    trous=[];cur=None
    for i,v in enumerate(ok):
        if not v:
            if cur is None: cur=[i,i]
            else: cur[1]=i
        else:
            if cur: trous.append((cur[0]+x0,cur[1]+x0)); cur=None
    if cur: trous.append((cur[0]+x0,cur[1]+x0))
    print(f"[{label}] bande y={ybande0}..{ybande1}, x={x0}..{x1} : trait present sur {n}/{tot} colonnes "
          f"= {n/tot*100:.1f}%  (lum trait max={max(lum):.0f}, fond={fondlum})")
    gros=[t for t in trous if t[1]-t[0]>=10]
    if gros:
        print(f"    trous >=10 px : " + ", ".join(f"x={a}..{b} ({b-a+1}px)" for a,b in gros))
    return n/tot*100

print("\n-- bord HAUT du CTA secondaire --")
r1=couverture(ref,60,1020,1608,1616,10,'REF haut')
c1=couverture(cap,60,1020,1766,1776,13,'CAP haut')
print("\n-- bord BAS du CTA secondaire --")
r2=couverture(ref,60,1020,1758,1768,10,'REF bas')
c2=couverture(cap,60,1020,1885,1898,13,'CAP bas')
print(f"\n  CONTROLE POSITIF REF continu : haut={r1:.1f}% bas={r2:.1f}% -> {'OK' if min(r1,r2)>95 else 'ECHEC (fenetre mal posee)'}")
print(f"  CAP : haut={c1:.1f}% bas={c2:.1f}%   ecart de couverture = {c1-r1:+.1f} / {c2-r2:+.1f} points")
