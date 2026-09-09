# -- m29 : opacite de la plaque. Population = pixels SOMBRES (L<45) dont les 8 voisins a +-3 px sont aussi sombres
#    (⇒ ni encre, ni frange). On mesure la DISPERSION de ce fond dans la plaque.
#    Controle positif : le canon (plaque opaque) ⇒ ecart-type ~0.  Controle negatif : l'art sous la plaque.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
def fond(key, box, nom, seuil=48):
    s=sc(key); im=img(key); d=im.load()
    X0,Y0,X1,Y1=[int(round(v*s)) for v in box]
    k=max(1,int(round(3*s/3)))
    vals=[]
    for yp in range(Y0+k,Y1-k):
        for xp in range(X0+k,X1-k):
            if lum(d[xp,yp])>=seuil: continue
            if any(lum(d[xp+dx,yp+dy])>=seuil for dx in(-k,0,k) for dy in(-k,0,k)): continue
            vals.append(d[xp,yp])
    n=len(vals)
    if n<50: print("  %-4s %-32s n=%d TROP PEU"%(key,nom,n)); return
    mean=[sum(v[c] for v in vals)/n for c in range(3)]
    sd=[math.sqrt(sum((v[c]-mean[c])**2 for v in vals)/n) for c in range(3)]
    Ls=sorted(lum(v) for v in vals)
    print("  %-4s %-32s n=%6d  moy (%.1f,%.1f,%.1f)  ECART-TYPE (%.2f,%.2f,%.2f)  L p1=%.1f p50=%.1f p99=%.1f (etendue %.1f)"
      %(key,nom,n,mean[0],mean[1],mean[2],sd[0],sd[1],sd[2],Ls[int(0.01*n)],Ls[n//2],Ls[int(0.99*n)],Ls[int(0.99*n)]-Ls[int(0.01*n)]))

print("=== INTERIEUR de la plaque de fiche ===")
fond('ref',(15,430,378,592),'plaque (canon)')
fond('c19',(15,430,378,592),'plaque (jeu 1920)')
fond('c24',(15,604,378,766),'plaque (jeu 2400)')
print()
print("=== CONTROLE NEGATIF : art du district juste AU-DESSUS de la plaque ===")
fond('ref',(15,300,378,410),'art (canon)')
fond('c19',(15,300,378,410),'art (jeu 1920)')
fond('c24',(15,470,378,580),'art (jeu 2400)')
