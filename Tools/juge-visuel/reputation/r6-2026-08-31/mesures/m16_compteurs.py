# m16 - les 3 compteurs : couleur du glyphe (mediane des pixels les plus clairs), bbox du glyphe,
# hauteur de capitale, ligne de base. Controle positif : T1 et T2 attendus identiques entre ref et cap.
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
# tuiles : (x0,x1) en px, bande y du chiffre
CASES=[("ref",D+"reference/m-120.png",18,376,3.0,[(45,299),(323,577),(601,855)],590,676),
       ("cap",S+"screen_b3_reputation_1080x1920.png",18,18,3.6,[(49,358),(385,694),(722,1031)],266,374)]
for k,f,ox,oy,sc,tiles,ya,yb in CASES:
    im=Image.open(f).convert("RGB"); px=im.load(); print(f"== {k} size={im.size}")
    for i,(x0,x1) in enumerate(tiles,1):
        pts=[(x,y) for y in range(ya,yb) for x in range(x0+4,x1-4)
             if sum(px[x,y])>230 ]
        if not pts: print(f"  T{i}: aucun glyphe clair"); continue
        ax=min(p[0] for p in pts);bx=max(p[0] for p in pts);ay=min(p[1] for p in pts);by=max(p[1] for p in pts)
        # couleur : mediane des 30% les plus lumineux
        cols=sorted((sum(px[x,y]),px[x,y]) for x,y in pts)
        top=[c for _,c in cols[int(0.7*len(cols)):]]
        R=sorted(c[0] for c in top)[len(top)//2];G=sorted(c[1] for c in top)[len(top)//2];B=sorted(c[2] for c in top)[len(top)//2]
        print(f"  T{i}: bbox px=({ax},{ay},{bx},{by}) hauteur_glyphe={(by-ay+1)/sc:.1f}CSS largeur={(bx-ax+1)/sc:.1f}CSS "
              f"| base y CSS={(by-oy)/sc:.1f} haut y CSS={(ay-oy)/sc:.1f} "
              f"| centre x %tuile={((ax+bx)/2-x0)/(x1-x0)*100:.1f} | RGB=({R},{G},{B})")
