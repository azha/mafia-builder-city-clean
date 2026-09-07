# Boite d'encre exacte de chaque badge (anneau + libelle) et POINT D'ANCRAGE bas-centre.
# L'anneau : bbox de la couleur (176,141,62) autour du centre detecte.
# Le libelle : lignes d'encre (clair+neutre) dans la bande cy+12..cy+26, colonnes du groupe principal.
from PIL import Image
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); W,H=im.size; px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
C=[(347.5,552.5),(539.5,552.5),(731.5,552.5),(155.5,744.5),(347.5,744.5),(539.5,744.5),
   (923.5,744.5),(155.5,936.5),(539.5,936.5),(155.5,1320.5),(731.5,1320.5)]
def ring(x,y):
    r,g,b=px[x,y]; return abs(r-176)<=30 and abs(g-141)<=30 and abs(b-62)<=30
def ink(x,y):
    r,g,b=px[x,y]; return min(r,g,b)>=150 and (max(r,g,b)-min(r,g,b))<=25
print('  #  anneau bbox            libelle: lignes d encre    boite d encre badge         ANCRAGE bas-centre')
for k,(cx,cy) in enumerate(C,1):
    X=int(round(cx)); Y=int(round(cy))
    rp=[(x,y) for y in range(Y-10,Y+11) for x in range(X-10,X+11) if ring(x,y)]
    rx0,rx1=min(p[0] for p in rp),max(p[0] for p in rp)
    ry0,ry1=min(p[1] for p in rp),max(p[1] for p in rp)
    rows=[]
    for y in range(Y+10,Y+30):
        n=sum(1 for x in range(X-35,X+36) if ink(x,y))
        if n>=3: rows.append((y,n))
    ly0,ly1=(rows[0][0],rows[-1][0]) if rows else (None,None)
    bx0,by0,bx1,by1 = rx0, ry0, rx1, (ly1 if ly1 else ry1)
    ax=(bx0+bx1)/2; ay=by1
    print(f'  G{k:<2d} ({rx0},{ry0},{rx1},{ry1})   {ly0}..{ly1} ({len(rows)} lignes)   ({bx0},{by0},{bx1},{by1})   ({ax:.1f},{ay})  = centre_anneau + (0,{ay-cy:+.1f})')
