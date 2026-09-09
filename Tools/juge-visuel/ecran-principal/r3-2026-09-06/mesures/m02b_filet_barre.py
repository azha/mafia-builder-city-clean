# m02b — filet laiton : fenetre en x = CSS 236..268 (a droite du medaillon, a gauche de l'aile droite)
# Controle positif : canon doit rendre --laiton (176,141,62) et 1.00 CSS d'epaisseur.
from PIL import Image
def med(v):
    v=sorted(v); n=len(v); return v[n//2] if n%2 else (v[n//2-1]+v[n//2])/2
F=[('canon','../ecran-canon.png',3.0),('district','../capture-district-1080x2400.png',2.755),
   ('fiche19','../capture-fiche-1080x1920.png',2.755),('fiche24','../capture-fiche-1080x2400.png',2.755)]
CSS0,CSS1=236,268
for name,f,fac in F:
    im=Image.open(f).convert('RGB'); w,h=im.size; px=im.load()
    x0,x1=int(CSS0*fac),int(CSS1*fac)
    print(f'== {name} {w}x{h} fac={fac}  fenetre x={x0}..{x1}px (CSS {CSS0}..{CSS1})')
    rows=[]
    for y in range(0,int(80*fac)):
        R=[px[x,y][0] for x in range(x0,x1)];G=[px[x,y][1] for x in range(x0,x1)];B=[px[x,y][2] for x in range(x0,x1)]
        rows.append((y,med(R),med(G),med(B)))
    hot=[t for t in rows if (t[1]-t[3])>40]
    if hot:
        print(f'   filet r-b>40 : y={hot[0][0]}..{hot[-1][0]} ({hot[0][0]/fac:.2f}..{hot[-1][0]/fac:.2f} CSS) ep={len(hot)}px={len(hot)/fac:.2f} CSS')
        pk=max(hot,key=lambda t:t[1]-t[3])
        print(f'   pic y={pk[0]} rgb=({pk[1]:.0f},{pk[2]:.0f},{pk[3]:.0f})  r-b={pk[1]-pk[3]:.0f}')
    else:
        print('   AUCUNE rangee laiton dans cette fenetre')
    for ycss in (6,20,30,40,45,49):
        y=int(ycss*fac); t=rows[y]
        print(f'   fond barre CSS {ycss:>3} (y={y}) rgb=({t[1]:.0f},{t[2]:.0f},{t[3]:.0f})')
