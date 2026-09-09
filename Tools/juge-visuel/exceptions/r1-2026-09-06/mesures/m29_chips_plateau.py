# m29 — (a) pastilles GRAVE/CRITIQUE de la bulle (réf) et leur absence en capture ;
#        (b) bandeau doré du comptoir (.plateau) et son absence en capture ;
#        (c) nom en or dans la bulle (réf) vs ligne méta grise (capture).
# Contrôle positif : la sonde 'or' trouve le nom « Lt. Kane » de la bulle en réf.
# Contrôle négatif : la même sonde sur la même bande en capture doit rendre 0.
from util import *
import colorsys
print("== m29 pastilles / plateau / nom en or ==")
ref=ouvrir(REF); cap=ouvrir(CAP); pr=ref.load(); pc=cap.load()
def orpx(im,fen,smin=0.35,vmin=0.5):
    px=im.load(); x0,y0,x1,y1=fen; pts=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]; h,s,v=colorsys.rgb_to_hsv(c[0]/255,c[1]/255,c[2]/255)
            if 33/360<=h<=58/360 and s>=smin and v>=vmin: pts.append((x,y))
    return pts
p=orpx(ref,(320,1230,1050,1290))
print(f"  RÉF nom en or dans la bulle : {len(p)} px, bbox=({min(q[0] for q in p)},{min(q[1] for q in p)})-({max(q[0] for q in p)},{max(q[1] for q in p)})")
p=orpx(cap,(200,1628,1043,1802))
print(f"  CAP même bloc (bulle entière y1628..1802) : {len(p)} px or  (contrôle −)")
# pastilles : contours clairs sur le fond de la bulle, y ~1310..1370
def bbox_c(im,fen,cible,tol):
    px=im.load(); x0,y0,x1,y1=fen; pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1)
        if abs(px[x,y][0]-cible[0])<=tol and abs(px[x,y][1]-cible[1])<=tol and abs(px[x,y][2]-cible[2])<=tol]
    return pts
# le contour des chips : .chip border 1px, couleur du texte creme-2 -> mesurer par luminance sur la bande
def blocs_clairs(im,fen,seuil):
    px=im.load(); x0,y0,x1,y1=fen; out=[]
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if (px[x,y][0]*299+px[x,y][1]*587+px[x,y][2]*114)/1000>seuil]
        if xs: out.append((y,len(xs),min(xs),max(xs)))
    return out
b=blocs_clairs(ref,(320,1300,1050,1400),70)
print(f"  RÉF bande des pastilles y1300..1400 : {len(b)} lignes encrées ; y {b[0][0]}..{b[-1][0]} ; x {min(t[2] for t in b)}..{max(t[3] for t in b)}")
# hauteur/rayon d'une pastille : profil vertical au bord gauche de la 1re pastille
xg=min(t[2] for t in b)
print(f"   profil VERTICAL x={xg+2} : {[(y,pr[xg+2,y]) for y in range(b[0][0]-4,b[0][0]+10)]}")
# plateau doré du comptoir
print("  RÉF bandeau doré du comptoir (.plateau) : lignes où la médiane à x=540 est chaude et claire")
for y in range(860,960,6):
    c=mediane_fenetre(ref,540,y,3); print(f"     y={y} -> {c}")
print("  CAP même bande (y860..960) :", [(y,mediane_fenetre(cap,540,y,3)) for y in range(860,960,20)])
