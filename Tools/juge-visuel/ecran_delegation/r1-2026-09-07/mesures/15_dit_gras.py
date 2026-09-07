#!/usr/bin/env python3
"""Le <b> de .sv-dit ('rien ne se fait sans vous') : CSS = font-style:normal + weight 700
+ color #eef3f9 sur un texte courant #cdd6e0 italique. Mesure separee du segment et du reste.
Controle positif : en REFERENCE le segment doit rendre #eef3f9 (<=6) et le reste #cdd6e0 (<=6).
Controle negatif : si l'instrument ne discrimine pas, il rendra la MEME couleur des deux cotes
en REFERENCE -> il serait alors inutilisable. On l'exige donc different (>20)."""
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def hx(c): return "#%02x%02x%02x"%tuple(c)
def d(a,b): return max(abs(a[i]-b[i]) for i in range(3))
def H(s): return tuple(int(s[i:i+2],16) for i in (1,3,5))
def encre(im,x0,y0,x1,y1,frac=0.06):
    p=im.load(); ps=[p[x,y] for y in range(y0,y1) for x in range(x0,x1)]
    ps.sort(key=lum,reverse=True); k=max(1,int(len(ps)*frac)); sel=ps[:k]
    return tuple(sorted(c[i] for c in sel)[len(sel)//2] for i in range(3)), max(lum(c) for c in ps)
ref=Image.open(D+"reference-1080x2102.png").convert("RGB")
cap=Image.open(D+"capture-1080x2400.png").convert("RGB")
print("REF",ref.size,"CAP",cap.size)
Z=[("REF avant le gras (x 51..450)", ref,(51,1826,450,1858)),
   ("REF le GRAS      (x 460..870)", ref,(460,1826,870,1858)),
   ("REF apres        (x 880..1027)",ref,(880,1826,1027,1858)),
   ("CAP avant le gras (x 43..445)", cap,(43,1894,445,1926)),
   ("CAP le GRAS      (x 455..865)", cap,(455,1894,865,1926)),
   ("CAP apres        (x 875..1023)",cap,(875,1894,1023,1926)),
  ]
for nom,im,b in Z:
    c,mx=encre(im,*b)
    print(f"  {nom:32s} encre={hx(c)} {c!s:16s} lum_max={mx:6.1f}   ecart/#eef3f9={d(c,H('#eef3f9')):3d}  ecart/#cdd6e0={d(c,H('#cdd6e0')):3d}")
a,_=encre(ref,51,1826,450,1858); b,_=encre(ref,460,1826,870,1858)
print(f"\n  CONTROLE : REF courant vs REF gras -> ecart={d(a,b)} (exige >20 pour que l'instrument discrimine)")
a,_=encre(cap,43,1894,445,1926); b,_=encre(cap,455,1894,865,1926)
print(f"  CAPTURE  : CAP courant vs CAP gras -> ecart={d(a,b)}")
print("\n  densite d'encre du segment (part de pixels > fond+40), signe de la GRAISSE :")
def dens(im,x0,y0,x1,y1):
    p=im.load(); vs=[lum(p[x,y]) for y in range(y0,y1) for x in range(x0,x1)]
    vt=sorted(vs); f=vt[len(vt)//2]
    return 100*sum(1 for v in vs if v>f+40)/len(vs)
for nom,im,b in Z: print(f"    {nom:32s} {dens(im,*b):5.2f} %")
print("\n=== localisation de l'encre a x=1033 dans la CAPTURE ===")
p=cap.load()
ys=[y for y in range(400,2150) if any(lum(p[x,y])>=50 for x in range(1030,1040))]
print("   lignes concernees :", ys[:40], "..." if len(ys)>40 else "")
if ys:
    print("   couleur a (1033,%d) = %s"%(ys[0],hx(p[1033,ys[0]])))
