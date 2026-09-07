"""m11 — panneau elastique + carte portrait (M2 / M3 du r14, a retrancher).
Bord : mi-alpha. Carte = filet OR ; panneau = bord clair bleute.
Controle positif : la carte doit avoir 4 bords OR (2 rails + 2 filets) dans les 3 images.
Controle negatif : le detecteur OR ne doit RIEN trouver au milieu du panneau (fond nu).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
def est_or(c):
    r,g,b=c
    return r>110 and (r-b)>45 and g>70 and g<r

CAS={
 'reference-1080x2102.png': dict(pan=(848,1617), zone=(860,1600)),
 'capture-1080x2400.png'  : dict(pan=(874,1564), zone=(886,1560)),
 'capture-1080x1920.png'  : dict(pan=(642,1331), zone=(654,1327)),
}
for nom,c in CAS.items():
    print("="*74); im=ouvrir(nom); p=im.load()
    z0,z1=c['zone']
    # rails verticaux OR de la carte (hors rails du cadre x<40 et x>1040)
    cols=[(x,sum(1 for y in range(z0,z1+1) if est_or(p[x,y]))) for x in range(40,1040)]
    b=bandes(cols,int(0.55*(z1-z0)))
    print(f"  rails OR de la carte : {[(c0,c1,int(v)) for c0,c1,v in b]}")
    if len(b)>=2:
        xg=(b[0][0]+b[0][1])/2.0; xd=(b[-1][0]+b[-1][1])/2.0
        print(f"    largeur carte (centre a centre) = {xd-xg:.1f} px ; bords ext {b[0][0]}..{b[-1][1]} = {b[-1][1]-b[0][0]+1} px")
        gx0,gx1=b[0][0],b[-1][1]
    else:
        gx0,gx1=None,None
    # filets OR horizontaux de la carte, dans la colonne de la carte
    if gx0 is not None:
        rows=[(y,sum(1 for x in range(gx0,gx1+1) if est_or(p[x,y]))) for y in range(z0-30,z1+40)]
        br=bandes(rows,int(0.7*(gx1-gx0)))
        print(f"    filets OR horizontaux de la carte : {[(c0,c1) for c0,c1,_ in br]}")
    # panneau elastique : bord clair pleine largeur
    rows2=[]
    for y in range(c['pan'][0]-20, c['pan'][1]+20):
        n=sum(1 for x in range(60,1020) if lum(p[x,y])-lum(p[x,y-4])>=8 or lum(p[x,y-4])-lum(p[x,y])>=8)
        rows2.append((y,n))
    bp=bandes(rows2,700)
    print(f"  bords HORIZONTAUX pleine largeur (panneau) : {[(c0,c1) for c0,c1,_ in bp]}")
    # ctrl negatif
    n=sum(1 for y in range(z0+120,z0+160) for x in range(700,900) if est_or(p[x,y]))
    print(f"  [ctrl negatif] OR au milieu de la colonne droite du panneau = {n} (attendu 0)")
