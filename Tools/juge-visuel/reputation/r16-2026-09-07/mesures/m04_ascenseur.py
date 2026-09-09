# m04 : l'affordance de defilement a 1920 - geometrie, contraste, recouvrement, profil vertical.
# Controle positif : la MEME sonde a 2400 (ou l'affordance ne doit pas exister) = controle negatif d'existence.
# Controle negatif : la marge interne GAUCHE du cadre a 1920 (aucune affordance attendue).
import sys; sys.path.insert(0,'.')
from lib import *

im19 = ouvrir('capture-1080x1920.png'); p19 = im19.load()
im24 = ouvrir('capture-1080x2400.png'); p24 = im24.load()

print("\n--- A. geometrie de la barre (1920) ---")
y0,y1 = 254, 1625
xs = range(985, 1030)
print("  colonne | couverture or | couleur mediane a mi-hauteur")
for x in xs:
    n = sum(1 for y in range(y0,y1) if est_or(p19[x,y]))
    if n > 0.05*(y1-y0):
        print("   x=%4d   %5.1f%%   %s" % (x, 100.0*n/(y1-y0), mediane_fenetre(p19,x,(y0+y1)//2,1)))

print("\n--- B. existe-t-elle a 2400 ? (controle negatif d'existence) ---")
y0b,y1b = 486,2105
trouve=False
for x in range(960, 1050):
    n = sum(1 for y in range(y0b,y1b) if est_or(p24[x,y]))
    if n > 0.30*(y1b-y0b):
        print("   x=%d couverture %.1f%%" % (x, 100.0*n/(y1b-y0b))); trouve=True
if not trouve: print("   AUCUNE colonne d'or >30%% entre x=960 et 1050 a 2400  => affordance ABSENTE a 2400")

print("\n--- C. profil VERTICAL de la barre : y a-t-il un curseur (thumb) ? ---")
xc = 1002
vals = [lum(p19[xc,y]) for y in range(240, 1645)]
print("   x=%d, y=240..1644 : min=%.1f max=%.1f moy=%.1f" % (xc, min(vals), max(vals), sum(vals)/len(vals)))
seg=[]
for k in range(0, len(vals), 100):
    b = vals[k:k+100]
    seg.append("y%d:%.0f" % (240+k, sum(b)/len(b)))
print("   moyennes par tranche de 100 px :", " ".join(seg))
# bornes haut/bas de la barre (mi-alpha)
col = [lum(p19[xc,y]) for y in range(200,1700)]
lo = mediane(col[:30]); hi = max(col)
print("   fond au-dessus=%.1f  pic=%.1f" % (lo,hi))
haut = next(y for y in range(200,1700) if lum(p19[xc,y]) > 0.5*(lo+hi))
bas  = next(y for y in range(1699,200,-1) if lum(p19[xc,y]) > 0.5*(lo+hi))
print("   barre : y=%d..%d  hauteur=%d px  (cadre interieur y254..1625 = %d px) => %.1f%%" % (haut,bas,bas-haut+1, 1625-254+1, 100.0*(bas-haut+1)/(1625-254+1)))

print("\n--- D. contraste de la barre contre son voisinage immediat ---")
ym = (y0+y1)//2
c_barre = mediane_fenetre(p19, 1002, ym, 2)
c_gauche = mediane_fenetre(p19, 990, ym, 2)
c_droite = mediane_fenetre(p19, 1020, ym, 2)
print("   barre %s | fond gauche %s (contraste %.2f:1) | fond droit %s (contraste %.2f:1)"
      % (c_barre, c_gauche, contraste(c_barre,c_gauche), c_droite, contraste(c_barre,c_droite)))
c_rail = mediane_fenetre(p19, 1060, ym, 1)
print("   rail du cadre %s -> contraste barre/rail %.2f:1 (les deux sont dores)" % (c_rail, contraste(c_barre,c_rail)))

print("\n--- E. controle NEGATIF : marge interne GAUCHE a 1920 (x=22..46) ---")
for x in range(21,48):
    n = sum(1 for y in range(y0,y1) if est_or(p19[x,y]))
    if n > 0.30*(y1-y0):
        print("   x=%d couverture %.1f%% %s" % (x, 100.0*n/(y1-y0), mediane_fenetre(p19,x,ym,1)))
print("   (seul le rail x=18..20 doit sortir ; rien d'autre)")
