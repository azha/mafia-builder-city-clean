# -- m28 : la PLAQUE de la fiche est-elle OPAQUE ? mesure de la DISPERSION du fond dans des zones sans encre.
#    Controle positif : le canon (plaque opaque) doit rendre un ecart-type tres faible.
#    Controle negatif : la meme sonde sur l'ART du district (hors plaque) doit rendre un ecart-type eleve.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *

def stats(key, box, nom):
    s=sc(key); im=img(key); d=im.load()
    X0,Y0,X1,Y1=[int(round(v*s)) for v in box]
    vals=[]
    for yp in range(Y0,Y1):
        for xp in range(X0,X1): vals.append(d[xp,yp])
    n=len(vals)
    mean=[sum(v[c] for v in vals)/n for c in range(3)]
    sd=[math.sqrt(sum((v[c]-mean[c])**2 for v in vals)/n) for c in range(3)]
    Ls=[lum(v) for v in vals]; Ls.sort()
    print("  %-4s %-34s n=%6d  moyenne (%.1f,%.1f,%.1f)  ecart-type (%.2f,%.2f,%.2f)  L p5=%.1f p50=%.1f p95=%.1f  etendue L=%.1f"
      %(key,nom,n,mean[0],mean[1],mean[2],sd[0],sd[1],sd[2],Ls[int(0.05*n)],Ls[n//2],Ls[int(0.95*n)],Ls[-1]-Ls[0]))
    return sd

print("=== zones VIDES de la plaque de fiche (aucune encre attendue) ===")
# canon : plaque y 425..594 ; bande vide entre sous-titre et stats : y 470..487 ; marge gauche x 16..28
stats('ref',(20,468,180,486),'plaque, bande vide (canon)')
stats('ref',(18,560,60,590),'plaque, coin bas-gauche (canon)')
stats('c19',(20,468,180,486),'plaque, bande vide (jeu 1920)')
stats('c19',(18,560,60,590),'plaque, coin bas-gauche (jeu 1920)')
stats('c24',(20,642,180,660),'plaque, bande vide (jeu 2400)')
stats('c24',(18,734,60,764),'plaque, coin bas-gauche (jeu 2400)')
print()
print("=== CONTROLE NEGATIF : art du district HORS plaque (doit etre tres disperse) ===")
stats('ref',(20,380,180,398),'art au-dessus de la plaque (canon)')
stats('c19',(20,380,180,398),'art au-dessus de la plaque (jeu 1920)')
