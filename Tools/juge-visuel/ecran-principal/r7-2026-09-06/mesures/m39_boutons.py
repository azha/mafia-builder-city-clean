# -- m39 : BOUTONS de la fiche : boites, rayon d'arrondi (mesure du retrait du bord au coin), couleurs.
#    Convention de bord : bord = mi-alpha entre le fond de la plaque et le remplissage du bouton.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
DY={'ref':0.0,'c19':0.0,'c24':174.222}
def bouton_or(key):
    s=sc(key); im=img(key); d=im.load(); dy=DY[key]
    pred=lambda p: p[0]>150 and p[1]>110 and p[2]<150 and p[0]-p[2]>70
    xs=[];ys=[]
    for yp in range(int((534+dy)*s),int((586+dy)*s)):
        for xp in range(int(20*s),int(150*s)):
            if pred(d[xp,yp]): xs.append(xp/s); ys.append(yp/s)
    return min(xs),max(xs)+1/s,min(ys)-dy,max(ys)+1/s-dy
def bouton_contour(key,x0,x1):
    """bord clair des boutons secondaires : cherche le trace"""
    s=sc(key); im=img(key); d=im.load(); dy=DY[key]
    ys=[];xs=[]
    for yp in range(int((534+dy)*s),int((588+dy)*s)):
        for xp in range(int(x0*s),int(x1*s)):
            p=d[xp,yp]
            if 55<lum(p)<130 and abs(p[0]-p[2])<30 and p[2]>p[0]-10: xs.append(xp/s); ys.append(yp/s)
    if not xs: return None
    return min(xs),max(xs)+1/s,min(ys)-dy,max(ys)+1/s-dy
print("=== bouton OR (COLLECTER) ===")
for k in ['ref','c19','c24']:
    a,b,c,e=bouton_or(k); print("   %-4s x %.2f..%.2f (l=%.2f)  y %.2f..%.2f (h=%.2f)"%(k,a,b,b-a,c,e,e-c))
print("=== boutons SECONDAIRES (contour) ===")
for k in ['ref','c19','c24']:
    r=bouton_contour(k,150,275); print("   %-4s BLANCHIR : "%k + (("x %.2f..%.2f (l=%.2f)  y %.2f..%.2f (h=%.2f)"%(r[0],r[1],r[1]-r[0],r[2],r[3],r[3]-r[2])) if r else "AUCUN"))
    r=bouton_contour(k,280,376); print("   %-4s AMELIORER: "%k + (("x %.2f..%.2f (l=%.2f)  y %.2f..%.2f (h=%.2f)"%(r[0],r[1],r[1]-r[0],r[2],r[3],r[3]-r[2])) if r else "AUCUN"))
print()
print("=== RAYON d'arrondi du bouton OR : largeur de la ligne du haut vs largeur a mi-hauteur ===")
for k in ['ref','c19','c24']:
    s=sc(k); im=img(k); d=im.load(); dy=DY[k]
    pred=lambda p: p[0]>150 and p[1]>110 and p[2]<150 and p[0]-p[2]>70
    a,b,c,e=bouton_or(k)
    print("   %s :"%k)
    for off in [0.0,0.5,1.0,2.0,3.0,4.0,6.0,8.0,10.0,12.0]:
        yp=int(round((c+dy+off)*s)); xs=[xp/s for xp in range(int(20*s),int(160*s)) if pred(d[xp,yp])]
        if xs: print("      y=haut+%4.1f : x %.2f..%.2f  (l=%.2f ; retrait gauche %.2f)"%(off,min(xs),max(xs)+1/s,max(xs)+1/s-min(xs),min(xs)-a))
