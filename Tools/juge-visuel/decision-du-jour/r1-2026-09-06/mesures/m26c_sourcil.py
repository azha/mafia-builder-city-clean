#!/usr/bin/env python3
"""m26c - INTERLETTRAGE du sourcil, version finale. Les deux jets precedents debordaient sur le
FILET ROUGE INTERIEUR de la carte de reference (x=696..698) et sur sa frange. Ici : on segmente la
bande en groupes de colonnes encrees, on coupe au premier BLANC >= 15 px (l'interlettrage du
sourcil est de l'ordre de 6-8 px, jamais 15), et on garde le groupe qui contient le 'C' initial.
Controle positif : la largeur trouvee doit correspondre au crop lu a l'oeil (REF ~150..658).
Controle negatif : le filet rouge doit tomber HORS du groupe retenu.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")
def bloc(im,x0,x1,y0,y1,pred,label,blanc=15):
    px=im.load()
    encre=[x for x in range(x0,x1) if any(pred(px[x,y]) for y in range(y0,y1))]
    grp=[]; cur=[encre[0]]
    for x in encre[1:]:
        if x-cur[-1] <= blanc: cur.append(x)
        else: grp.append((cur[0],cur[-1])); cur=[x]
    grp.append((cur[0],cur[-1]))
    print(f"[{label}] groupes separes par un blanc > {blanc} px : {grp}")
    g=grp[0]
    print(f"   -> groupe du texte : x={g[0]}..{g[1]}  largeur={g[1]-g[0]+1} px"
          f"   | groupes ecartes : {grp[1:] if len(grp)>1 else 'aucun'}")
    return g
gr=bloc(ref,120,740,915,941,lambda p:L(p)<150,'REF sourcil')
gc=bloc(cap,60,740,1385,1416,lambda p:L(p)>70,'CAP sourcil')
lr,lc=gr[1]-gr[0]+1, gc[1]-gc[0]+1; hr,hc=16,21
print(f"\n   CONTROLE POSITIF REF ~= 150..658 (lu sur crop_ref_sourcil.png) : {gr[0]}..{gr[1]} -> "
      f"{'OK' if abs(gr[0]-150)<=3 and abs(gr[1]-658)<=6 else 'ECART'}")
print(f"   CONTROLE NEGATIF le filet rouge (x=696..698) est hors du groupe : "
      f"{'OK' if gr[1]<690 else 'ECHEC'}")
print(f"\n   REF : l={lr} px  hcap={hr} px  -> l/hcap = {lr/hr:.2f}")
print(f"   CAP : l={lc} px  hcap={hc} px  -> l/hcap = {lc/hc:.2f}")
print(f"   ecart de largeur                         = {lc-lr:+d} px ({(lc/lr-1)*100:+.1f}%)")
print(f"   ecart de hauteur de capitale             = {hc-hr:+d} px ({(hc/hr-1)*100:+.1f}%)")
print(f"   ecart de CHASSE a hauteur egale (l/hcap) = {((lc/hc)/(lr/hr)-1)*100:+.1f}%")
