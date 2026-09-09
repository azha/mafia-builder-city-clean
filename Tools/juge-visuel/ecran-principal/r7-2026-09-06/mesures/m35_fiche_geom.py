# -- m35 : geometrie de la fiche : plaque (bords, rayon), filet superieur, titre, sous-titre, separateurs, boutons.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib2 import *
Y0={'ref':0.0,'c19':0.0,'c24':174.222}   # decalage vertical de la plaque (mesure m30)

def bandes_encre(key, box, pred, nom, seuil=2):
    m,pl=profil_lignes(key,box,pred)
    if not m: print("   %-4s %-22s AUCUN"%(key,nom)); return
    runs=[]
    for y,n in pl:
        if n>=seuil:
            if runs and abs(y-runs[-1][1])<=1.01/m['s']: runs[-1][1]=y
            else: runs.append([y,y])
    print("   %-4s %-22s bandes y :"%(key,nom), " · ".join("%.2f..%.2f (h=%.2f)"%(a,b+1/m['s'],b+1/m['s']-a) for a,b in runs if (b-a)>0.3))

orvif  = lambda p: abs(p[0]-242)<24 and abs(p[1]-201)<28 and abs(p[2]-107)<45 and p[0]-p[2]>90
creme2 = lambda p: abs(p[0]-185)<24 and abs(p[1]-173)<24 and abs(p[2]-146)<28 and p[0]>p[2]+20
creme  = lambda p: abs(p[0]-234)<20 and abs(p[1]-224)<20 and abs(p[2]-200)<26

print("=== bandes horizontales d'encre dans la fiche ===")
for key in ['ref','c19','c24']:
    dy=Y0[key]
    bandes_encre(key,(20,426+dy,376,600+dy),orvif,'or-vif (titre/valeur)')
    bandes_encre(key,(20,426+dy,376,600+dy),creme2,'creme-2 (sous-titre/libelles)')
    bandes_encre(key,(20,426+dy,376,600+dy),creme,'creme (valeurs/boutons)')
    print()
