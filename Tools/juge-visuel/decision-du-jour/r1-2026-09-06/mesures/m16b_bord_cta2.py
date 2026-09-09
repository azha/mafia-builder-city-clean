#!/usr/bin/env python3
"""m16b - CONTINUITE du contour du CTA secondaire.
1er jet : fenetres posees a l'oeil -> le CONTROLE POSITIF a rendu 0% des deux cotes = fenetres
fausses, instrument refute. Ici on LOCALISE d'abord les lignes du contour, puis on mesure.
Controle positif : la ligne retenue doit etre celle de couverture MAXIMALE dans la reference.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")

def localise(im,x0,x1,y0,y1,label,seuil_rel=8):
    """imprime, par ligne, le nombre de colonnes ou le px depasse le fond de la MEME colonne
       (fond = mediane de la colonne sur la bande) -> repere le trait horizontal."""
    px=im.load()
    print(f"[{label}] recherche du trait entre y={y0} et {y1} (x={x0}..{x1})")
    res=[]
    for y in range(y0,y1):
        n=0
        for x in range(x0,x1,2):
            # un trait est plus clair que ses voisins verticaux a +-6 px
            v=L(px[x,y]); h=(L(px[x,max(0,y-7)])+L(px[x,min(im.size[1]-1,y+7)]))/2
            if v>h+seuil_rel: n+=1
        res.append((y,n))
    res.sort(key=lambda t:-t[1])
    for y,n in res[:4]:
        print(f"    y={y}  {n}/{(x1-x0)//2} colonnes ({n/((x1-x0)//2)*100:.1f}%)")
    return res[0]

def couv(im,y,x0,x1,label,seuil_rel=8):
    px=im.load(); ok=[]
    for x in range(x0,x1):
        v=max(L(px[x,yy]) for yy in (y-1,y,y+1))
        h=(L(px[x,y-9])+L(px[x,y+9]))/2
        ok.append(v>h+seuil_rel)
    n=sum(ok); tot=len(ok)
    trous=[];cur=None
    for i,v in enumerate(ok):
        if not v:
            if cur is None: cur=[i,i]
            else: cur[1]=i
        else:
            if cur: trous.append((cur[0]+x0,cur[1]+x0)); cur=None
    if cur: trous.append((cur[0]+x0,cur[1]+x0))
    gros=[t for t in trous if t[1]-t[0]>=15]
    print(f"[{label}] y={y} : trait present sur {n}/{tot} colonnes = {n/tot*100:.1f}%")
    if gros: print(f"    INTERRUPTIONS >=15px : " + ", ".join(f"x={a}..{b} ({b-a+1}px)" for a,b in gros))
    return n/tot*100

print("\n=== REFERENCE — CTA secondaire ===")
yh=localise(ref,150,930,1600,1660,'REF haut')[0]
yb=localise(ref,150,930,1720,1790,'REF bas')[0]
rh=couv(ref,yh,120,960,'REF haut'); rb=couv(ref,yb,120,960,'REF bas')
print("\n=== CAPTURE — CTA secondaire ===")
ch_=localise(cap,150,930,1755,1815,'CAP haut')[0]
cb=localise(cap,150,930,1860,1920,'CAP bas')[0]
ch=couv(cap,ch_,120,960,'CAP haut'); cb2=couv(cap,cb,120,960,'CAP bas')
print(f"\n  CONTROLE POSITIF REF continu : haut={rh:.1f}% bas={rb:.1f}% -> {'OK' if min(rh,rb)>90 else 'ECHEC'}")
print(f"  CAP : haut={ch:.1f}% bas={cb2:.1f}%  -> ecart {ch-rh:+.1f} / {cb2-rb:+.1f} points")
