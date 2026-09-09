# m23 - CHROME (bandeau + dock) juge contre le CANON DU HUD (ecran-canon.png, 1176 px = 392 CSS, x3).
# Echelle : canon x3 px/CSS, capture x1080/392 = x2,7551 px/CSS  => facteur canon->capture 0,91837.
# Toutes les grandeurs sont donnees en CSS-HUD pour etre comparables.
# CONTROLE POSITIF : la largeur des deux images ramenee en CSS doit valoir 392 des deux cotes.
from PIL import Image
import statistics
CAN=Image.open('/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png').convert('RGB')
CAP=Image.open('../capture-1080x2400.png').convert('RGB')
print('canon',CAN.size,' capture',CAP.size)
KC=CAN.size[0]/392.0; KP=CAP.size[0]/392.0
print('CONTROLE POSITIF : px par CSS  canon %.4f  capture %.4f  (392 CSS des deux cotes)'%(KC,KP))
A=CAN.load(); B=CAP.load()
def Lum(p): return 0.299*p[0]+0.587*p[1]+0.114*p[2]
def colonne(px,W,H,x,y0,y1,lab,K):
    print(f'  {lab} colonne x={x} :')
    prev=None
    for y in range(y0,y1):
        p=px[x,y]
        if prev is None or max(abs(p[i]-prev[i]) for i in range(3))>10:
            print(f'    y={y:4d} ({y/K:6.2f} CSS)  {p}')
            prev=p
print('\n--- bandeau : ou est le FILET ? (colonne x = 5 % de la largeur) ---')
colonne(A,*CAN.size,int(0.05*CAN.size[0]),0,200,'canon',KC)
colonne(B,*CAP.size,int(0.05*CAP.size[0]),0,240,'capture',KP)
def bande_filet(px,W,H,ylo,yhi,K,lab):
    # ligne dont la variance horizontale est minimale ET la luminance localement maximale
    best=None
    for y in range(ylo,yhi):
        vals=[px[x,y] for x in range(int(0.02*W),int(0.30*W))]
        m=statistics.mean(Lum(v) for v in vals)
        sd=statistics.pstdev(Lum(v) for v in vals)
        if sd<12:
            if best is None or m>best[0]: best=(m,y,statistics.median([v[0] for v in vals]),statistics.median([v[1] for v in vals]),statistics.median([v[2] for v in vals]))
    print(f'  {lab} filet : y={best[1]} = {best[1]/K:.2f} CSS  couleur=({best[2]:.0f},{best[3]:.0f},{best[4]:.0f})  L={best[0]:.1f}')
    return best
print('\n--- FILET du bandeau ---')
bande_filet(A,*CAN.size,120,180,KC,'canon')
bande_filet(B,*CAP.size,110,180,KP,'capture')
print('\n--- MEDAILLON : boitier circulaire, centre et rayon (par la couleur de l anneau) ---')
def medaillon(px,W,H,ylo,yhi,K,lab,ring):
    pts=[(x,y) for y in range(ylo,yhi) for x in range(int(0.30*W),int(0.70*W))
         if max(abs(px[x,y][i]-ring[i]) for i in range(3))<38]
    if not pts: print('  ',lab,'anneau non trouve'); return
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    cx=(min(xs)+max(xs))/2; cy=(min(ys)+max(ys))/2
    print(f'  {lab} anneau n={len(pts)} bbox x {min(xs)}..{max(xs)} y {min(ys)}..{max(ys)}'
          f'  centre ({cx:.1f},{cy:.1f}) = ({cx/K:.2f},{cy/K:.2f}) CSS  diam {(max(xs)-min(xs)+1)/K:.2f} CSS x {(max(ys)-min(ys)+1)/K:.2f} CSS')
medaillon(A,*CAN.size,0,260,KC,'canon (or #d9ab4e/#f2c96b)',(217,171,78))
medaillon(B,*CAP.size,0,260,KP,'capture (braise #e0664a)',(224,102,74))
print('\n--- DOCK : cercles d onglet ---')
def dock(px,W,H,y0,y1,K,lab):
    # anneau : pixels notablement plus clairs que leur voisinage, sur la moitie basse
    best=[]
    for y in range(y0,y1):
        n=sum(1 for x in range(W) if Lum(px[x,y])>Lum(px[x,max(0,y-14)])+8)
        best.append((n,y))
    # bornes des cercles par balayage de colonnes
    print(f'  {lab} : lignes les plus "annelees" ', sorted(best,reverse=True)[:3])
dock(A,*CAN.size,CAN.size[1]-260,CAN.size[1],KC,'canon')
dock(B,*CAP.size,2150,2400,KP,'capture')
