import sys; sys.path.insert(0,'.')
from lib import *
print("=== m35a : epaisseur du rail vertical du cadre, sur une rangee SANS la carte ===")
for nom,f,y in [('REF','../reference-1080x2102.png',600),('C2400','../capture-1080x2400.png',630),('C1920','../capture-1080x1920.png',400)]:
    im=ouvrir(f); p=px(im); W,_=im.size
    g=[x for x in range(0,60) if est_or(p[x,y])]; d=[x for x in range(W-60,W) if est_or(p[x,y])]
    print(f"  {nom} (y={y}) : gauche x{g[0]}..{g[-1]} ep={len(g)} | droite x{d[0]}..{d[-1]} ep={len(d)} | hors-tout {d[-1]-g[0]+1}")
print()
print("=== m35b : le DOCK — premiere encre, ronds, libelles (zone libre) ===")
for nom,f,cb in [('C2400','../capture-1080x2400.png',2109),('C1920','../capture-1080x1920.png',1629)]:
    im=ouvrir(f); p=px(im); W,H=im.size
    lignes=[]
    for y in range(cb+1,H):
        vals=sorted(lum(p[x,y]) for x in range(W)); med=vals[len(vals)//2]
        n=sum(1 for x in range(W) if lum(p[x,y])-med>6)
        lignes.append((y,n))
    prem=[y for y,n in lignes if n>25]
    # libelles du dock (texte clair)
    lb=[y for y,n in lignes if n>60]
    print(f"  {nom} : cadre finit a {cb} ; premiere encre du dock y={prem[0] if prem else None} ; derniere y={prem[-1] if prem else None}")
    bb=bbox_masque(im, lambda c: lum(c)>100, 0, H-140, W, H)
    print(f"        libelles du dock : x{bb[0]}..{bb[2]} y{bb[1]}..{bb[3]}")
    print(f"        BANDEAU bas = 143 ; ZONE LIBRE = 143..{(prem[0]-1) if prem else H} = {((prem[0]-1) if prem else H)-143+1} px")
print()
print("=== m35c : contenu de l'ecran (cadre + CTA) et debordement ===")
print("  C2400 : cadre 482..2109, CTA 1989..2076 (DANS le cadre) -> contenu 482..2109 = 1628 px")
print("  C1920 : cadre 250..1629, CTA 1650..1737 (HORS du cadre) -> contenu 250..1737 = 1488 px")
