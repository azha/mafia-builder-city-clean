# -*- coding: utf-8 -*-
"""m25 - dock (suite) : profil du voile sur une colonne PROPRE (le canon porte une pastille
d'annotation `.co` a x~22 : elle fausserait le profil), ronds, indicateur d'onglet actif.
Colonnes propres : x=59 et x=345 (entre deux ronds / a droite de PLUS, dans les deux images)."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
HAUT={'canon':696.88,'j1920':696.88,'j2400':871.06,'t2400':871.06}
print("=== m25 ===")
print("\n-- PROFIL DU VOILE (colonnes propres). Canon : .dock 605.70..695.87, rampe sur 40 %% = 36.07 CSS puis PLATEAU")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle); px=im.load(); H=im.size[1]
    h=HAUT[cle]
    for xc in [59.0,345.0]:
        xi=int(xc*f)
        pr=[(j/f,L(px[xi,j])) for j in range(int((h-115)*f), min(H,int(h*f)))]
        print("   %-6s x=%5.1f : %s"%(cle,xc," ".join("%.0f:%.0f"%(y,v) for y,v in pr[::int(3*f)])))
        # plateau : ecart-type des 25 derniers CSS
        fin=[v for y,v in pr if y>h-25]
        deb=[v for y,v in pr if h-115<y<h-100]
        print("            haut(%.0f..%.0f) L med %.1f | bas(%.0f..%.0f) L med %.1f | MARCHE %.1f L | plateau: etendue des 25 derniers CSS = %.1f L"
              %(h-115,h-100,mediane(deb),h-25,h,mediane(fin),mediane(deb)-mediane(fin),max(fin)-min(fin)))
print("\n-- RONDS du dock (canon : .rond 46 CSS, centres 93.67 161.67 229.67 297.67)")
for cle in ['canon','j1920','j2400','t2400']:
    im,f=ouvrir(cle); px=im.load()
    h=HAUT[cle]
    # ligne mediane des ronds : canon .rond a y 615.70..661.70 -> centre 638.70 ; offset depuis le bas
    yc = h - (695.87-638.70)
    yi=int(yc*f)
    # bords : le liseré #ffffff22 et le fond radial sombre du rond contre le voile
    seq=[]
    for cx in [93.67,161.67,229.67,297.67]:
        prof=[(xx/f, L(px[xx,yi])) for xx in range(int((cx-32)*f),int((cx+32)*f))]
        d=[(prof[k][0],prof[k+1][1]-prof[k][1]) for k in range(len(prof)-1)]
        g=max(d[:len(d)//2],key=lambda t:abs(t[1])); dr=max(d[len(d)//2:],key=lambda t:abs(t[1]))
        seq.append("[%.2f..%.2f] O=%.2f c=%.2f"%(g[0],dr[0],dr[0]-g[0],(g[0]+dr[0])/2))
    print("   %-6s (y=%.2f) : %s"%(cle,yc," ".join(seq)))
print("\n-- INDICATEUR d'onglet actif (.dockb .pointe : 14 x 2 CSS, --laiton, bottom:-4px du rond)")
for cle in ['canon','j1920','j2400','t2400']:
    im,f=ouvrir(cle); px=im.load()
    h=HAUT[cle]
    y0=h-(695.87-661.70)-2.0; y1=y0+9.0
    trouve=[]
    for yy in range(int(y0*f),int(y1*f)):
        xs=[xx/f for xx in range(int(50*f),int(340*f)) if dist_max(px[xx,yy],JETONS['laiton'])<=45]
        if len(xs)>=int(6*f): trouve.append((yy/f,min(xs),max(xs)))
    if trouve:
        a=min(t[1] for t in trouve); b=max(t[2] for t in trouve)
        print("   %-6s : y %.2f..%.2f (h %.2f) x %.2f..%.2f (l %.2f) centre %.2f ; couleur %s"
              %(cle,trouve[0][0],trouve[-1][0],trouve[-1][0]-trouve[0][0]+1/f,a,b,b-a,(a+b)/2,
                med_fenetre(im,int(((a+b)/2)*f),int(((trouve[0][0]+trouve[-1][0])/2)*f),1)))
    else:
        print("   %-6s : AUCUN indicateur laiton dans la bande"%cle)
