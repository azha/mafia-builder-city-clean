# -- m21 : libelles du manometre. Encre = creme (--creme 234,224,200 / --creme-2 185,173,146) ; braise pour .heatpct chaud.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib2 import *
C = {'ref':(195.840,38.837),'c19':(195.817,39.820),'c24':(195.819,39.817)}
RIN={'ref':30.62,'c19':31.36,'c24':31.20}   # bord INTERIEUR nominal du cerclage (m09)

creme  = lambda p: p[0]>170 and p[1]>160 and p[2]>135 and abs(p[0]-p[1])<30 and p[0]-p[2]<70
creme2 = lambda p: 150<p[0]<215 and 140<p[1]<200 and 110<p[2]<175 and p[0]>p[2]

def bloc(key,box,pred,nom):
    m,prof=profil_lignes(key,box,pred)
    if not m: print("  %-4s %-10s : AUCUN pixel"%(key,nom)); return None
    cx,cy=C[key]
    # coin le plus eloigne du centre
    s=m['s']; im=img(key); d=im.load(); best=0; bp=None
    X0,Y0,X1,Y1=[int(round(v*s)) for v in box]
    for yp in range(Y0,Y1):
        for xp in range(X0,X1):
            if pred(d[xp,yp]):
                r=math.hypot(xp/s-cx, yp/s-cy)
                if r>best: best=r; bp=(xp/s,yp/s)
    print("  %-4s %-10s : bbox x %.2f..%.2f (l=%.2f)  y %.2f..%.2f (h=%.2f)  n=%d"
          %(key,nom,m['x0'],m['x1'],m['w'],m['y0'],m['y1'],m['h'],m['n']))
    print("        centre (%.2f , %.2f) ; ecart au centre du boitier dy=%+.2f ; pixel le plus loin r=%.2f CSS (%.3f R) en %s ; bord int. cerclage %.2f ⇒ DEGAGEMENT %+.2f CSS"
          %((m['x0']+m['x1'])/2,(m['y0']+m['y1'])/2,(m['y0']+m['y1'])/2-cy,best,best/RIN[key],str((round(bp[0],1),round(bp[1],1))),RIN[key],RIN[key]-best))
    return m

print("=== libelle PRINCIPAL du manometre (canon « 37% » / jeu « Brûlant ») ===")
bloc('ref',(176,28,216,48),creme,'37%')
bloc('c19',(172,40,220,56),creme,'Brulant')
bloc('c24',(172,40,220,56),creme,'Brulant')
print()
print("=== sous-libelle (canon « HEAT » / jeu « CHALEUR ») — encre creme-2 ===")
bloc('ref',(176,48,216,62),creme2,'HEAT')
bloc('c19',(168,54,224,70),creme2,'CHALEUR')
bloc('c24',(168,54,224,70),creme2,'CHALEUR')
