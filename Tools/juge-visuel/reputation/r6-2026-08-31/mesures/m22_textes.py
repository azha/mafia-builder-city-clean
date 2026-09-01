# m22 - textes principaux : bbox d'encre, hauteur de capitale, couleur mediane des pixels pleins.
# Controle positif : le titre "Le miroir" (or) ; controle negatif : une zone sans texte (doit rendre 0).
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
# (nom, boite de recherche px, seuil de luminance)
REF=(D+"reference/m-120.png",18,376,3.0,{
 "titre Le miroir":       (60,415,840,485,90),
 "sur-titre":             (60,490,840,540,60),
 "verdict 'Pas encore jugeable'": (452,745,650,810,90),
 "legende 'ce qu'il a absorbe'":  (655,745,845,830,50),
 "regle1 titre":          (515,845,830,880,80),
 "regle1 sous-titre":     (515,880,830,905,45),
 "sur-titre verdict":     (60,1385,830,1415,45),
 "titre verdict":         (60,1420,830,1480,90),
 "libelle CTA":           (60,1640,840,1695,90),
 "Il vous ecoute":        (80,1190,410,1230,60),
 "[ctrl neg] zone vide carte": (90,760,400,790,60),
})
CAP=(S+"screen_b3_reputation_1080x1920.png",18,18,3.6,{
 "titre Le miroir":       (60,60,1020,140,90),
 "sur-titre":             (60,145,1020,215,60),
 "verdict 'Pas encore jugeable'": (525,435,790,520,90),
 "legende 'ce qu'il a absorbe'":  (795,455,1015,525,50),
 "regle1 titre":          (605,548,1000,585,80),
 "regle1 sous-titre":     (605,585,1000,612,45),
 "sur-titre verdict":     (60,1215,1010,1250,45),
 "titre verdict":         (60,1255,1010,1315,90),
 "libelle CTA":           (60,1540,1020,1600,90),
 "Il vous ecoute":        (85,960,480,1005,60),
 "[ctrl neg] zone vide carte": (100,470,470,505,60),
})
for k,(f,ox,oy,sc,Z) in (("REF",REF),("CAP",CAP)):
    im=Image.open(f).convert("RGB"); px=im.load(); print(f"== {k} {f.split('/')[-1]} size={im.size}")
    for n,(x0,y0,x1,y1,thr) in Z.items():
        pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if max(px[x,y])>thr]
        if len(pts)<20: print(f"  {n:32s} : {len(pts)} px d'encre (rien)"); continue
        ax=min(p[0] for p in pts);bx=max(p[0] for p in pts);ay=min(p[1] for p in pts);by=max(p[1] for p in pts)
        cols=sorted((sum(px[x,y]),px[x,y]) for x,y in pts)
        top=[c for _,c in cols[int(0.8*len(cols)):]]
        C=tuple(sorted(c[i] for c in top)[len(top)//2] for i in range(3))
        print(f"  {n:32s} : h_encre={(by-ay+1)/sc:5.1f}CSS larg={(bx-ax+1)/sc:6.1f}CSS "
              f"x0={(ax-ox)/sc:6.1f} x1={(bx-ox)/sc:6.1f} y0={(ay-oy)/sc:6.1f} y1={(by-oy)/sc:6.1f} RGB={C}")
