# m02 — le filet laiton sous la barre : extension verticale, couleur, gradient horizontal.
# Fenêtre en x choisie HORS médaillon (25%..35% de la largeur).
# Contrôle positif : sur le canon, la couleur doit valoir --laiton #b08d3e = (176,141,62).
from PIL import Image
def med(v):
    v=sorted(v); n=len(v); return v[n//2] if n%2 else (v[n//2-1]+v[n//2])/2
F=[('canon','../ecran-canon.png',3.0),('district','../capture-district-1080x2400.png',2.755),
   ('fiche19','../capture-fiche-1080x1920.png',2.755),('fiche24','../capture-fiche-1080x2400.png',2.755)]
for name,f,fac in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load(); print(f'== {name} {w}x{h} fac={fac}')
    x0,x1=int(w*0.25),int(w*0.35)
    rows=[]
    for y in range(int(30*fac),int(70*fac)):
        R=[px[x,y][0] for x in range(x0,x1)];G=[px[x,y][1] for x in range(x0,x1)];B=[px[x,y][2] for x in range(x0,x1)]
        rows.append((y,med(R),med(G),med(B)))
    base=min(rows,key=lambda t:t[1]-t[3])
    hot=[t for t in rows if (t[1]-t[3])>40]
    print(f'   filet: rangées r-b>40 : y={hot[0][0]}..{hot[-1][0]}  ({hot[0][0]/fac:.2f}..{hot[-1][0]/fac:.2f} CSS)  epaisseur={len(hot)}px = {len(hot)/fac:.2f} CSS')
    ymid=hot[len(hot)//2][0]
    print(f'   couleur au coeur y={ymid} : rgb=({rows[[t[0] for t in rows].index(ymid)][1]:.0f},{rows[[t[0] for t in rows].index(ymid)][2]:.0f},{rows[[t[0] for t in rows].index(ymid)][3]:.0f})')
    # profil horizontal du filet : où commence/finit la partie pleine
    prof=[(x,px[x,ymid][0]-px[x,ymid][2]) for x in range(w)]
    mx=max(p[1] for p in prof)
    onc=[x for x,d in prof if d>0.5*mx]
    print(f'   gradient: max(r-b)={mx}; >50% de {onc[0]}..{onc[-1]} px = {onc[0]/fac:.1f}..{onc[-1]/fac:.1f} CSS (largeur ecran {w/fac:.1f} CSS)')
    # fond de la barre juste au-dessus du filet
    yb=hot[0][0]-int(6*fac)
    R=[px[x,yb][0] for x in range(x0,x1)];G=[px[x,yb][1] for x in range(x0,x1)];B=[px[x,yb][2] for x in range(x0,x1)]
    print(f'   fond barre y={yb} ({yb/fac:.1f} CSS): rgb=({med(R):.0f},{med(G):.0f},{med(B):.0f})')
    # fond de la barre tout en haut
    yt=int(6*fac)
    R=[px[x,yt][0] for x in range(x0,x1)];G=[px[x,yt][1] for x in range(x0,x1)];B=[px[x,yt][2] for x in range(x0,x1)]
    print(f'   fond barre y={yt} ({yt/fac:.1f} CSS): rgb=({med(R):.0f},{med(G):.0f},{med(B):.0f})')
