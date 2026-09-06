# m24 - MEDAILLON et ailes du bandeau, en CSS-HUD (canon x3 ; capture x2,7551).
# Le medaillon est repere par son ANNEAU : pixels de forte saturation (or #d9ab4e cote canon,
# braise #e0664a cote jeu) dans la moitie centrale de la largeur ET dans les 100 premiers CSS.
# On isole l'anneau par le contour circulaire le plus externe (balayage colonne par colonne).
from PIL import Image
import statistics, math
CAN=Image.open('/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png').convert('RGB')
CAP=Image.open('../capture-1080x2400.png').convert('RGB')
print('canon',CAN.size,'capture',CAP.size)
KC=CAN.size[0]/392.0; KP=CAP.size[0]/392.0
def anneau(im,K,ref,tol,ylim,lab,xmin=0.36,xmax=0.64):
    px=im.load(); W,H=im.size
    pts=[(x,y) for y in range(0,int(ylim*K)) for x in range(int(xmin*W),int(xmax*W))
         if max(abs(px[x,y][i]-ref[i]) for i in range(3))<tol]
    if not pts: print(lab,'rien'); return None
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    cx=(min(xs)+max(xs))/2; cy=(min(ys)+max(ys))/2
    dx=(max(xs)-min(xs)+1); dy=(max(ys)-min(ys)+1)
    print(f'  {lab}: n={len(pts)} bbox x {min(xs)}..{max(xs)} y {min(ys)}..{max(ys)}')
    print(f'      centre ({cx/K:.2f}, {cy/K:.2f}) CSS   diametre {dx/K:.2f} x {dy/K:.2f} CSS')
    # epaisseur de l'anneau sur l'horizontale du centre
    yy=int(cy); row=[x for x in range(int(xmin*W),int(xmax*W)) if max(abs(px[x,yy][i]-ref[i]) for i in range(3))<tol]
    if row:
        seg=[];s=row[0];p=row[0]
        for x in row[1:]:
            if x==p+1: p=x
            else: seg.append(p-s+1); s=x; p=x
        seg.append(p-s+1)
        print(f'      epaisseur sur l horizontale du centre : {[round(v/K,2) for v in seg]} CSS')
    return cx,cy,dx,dy
print('\n--- MEDAILLON ---')
anneau(CAN,KC,(217,171,78),40,100,'canon anneau or #d9ab4e')
anneau(CAP,KP,(224,102,74),46,100,'capture anneau braise #e0664a')
print('\n--- "ARGENT" : etendue d encre et hauteur de capitale ---')
def libelle(im,K,box,lab,ref=(185,173,146),tol=60):
    px=im.load(); x0,y0,x1,y1=box
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1)
         if max(abs(px[x,y][i]-ref[i]) for i in range(3))<tol and 0.299*px[x,y][0]+0.587*px[x,y][1]+0.114*px[x,y][2]>90]
    if not pts: print('  ',lab,'rien'); return
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    print(f'  {lab}: n={len(pts)} largeur {(max(xs)-min(xs)+1)/K:.2f} CSS  capitale {(max(ys)-min(ys)+1)/K:.2f} CSS  x {min(xs)/K:.2f}..{max(xs)/K:.2f} CSS  y {min(ys)/K:.2f}..{max(ys)/K:.2f} CSS')
libelle(CAN,KC,(40,25,400,55),'canon  ARGENT')
libelle(CAP,KP,(30,20,400,50),'capture ARGENT')
print('\n--- barre or sous la valeur ---')
def barre(im,K,box,lab):
    px=im.load(); x0,y0,x1,y1=box
    gold=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if abs(px[x,y][0]-217)<28 and abs(px[x,y][1]-171)<28 and abs(px[x,y][2]-78)<38]
    autre=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if 70<px[x,y][2]<150 and px[x,y][2]>px[x,y][0]+15]
    if gold:
        xs=[p[0] for p in gold]; ys=[p[1] for p in gold]
        print(f'  {lab} partie OR   : x {min(xs)/K:.2f}..{max(xs)/K:.2f} CSS (long {(max(xs)-min(xs)+1)/K:.2f})  y {min(ys)/K:.2f}..{max(ys)/K:.2f}  epaisseur {(max(ys)-min(ys)+1)/K:.2f} CSS')
    if autre:
        xs=[p[0] for p in autre]
        print(f'  {lab} partie GRISE: x {min(xs)/K:.2f}..{max(xs)/K:.2f} CSS (long {(max(xs)-min(xs)+1)/K:.2f}) n={len(autre)}')
    else:
        print(f'  {lab} partie GRISE: ABSENTE (0 px)')
barre(CAN,KC,(20,115,600,135),'canon  ')
barre(CAP,KP,(20,110,600,132),'capture')
