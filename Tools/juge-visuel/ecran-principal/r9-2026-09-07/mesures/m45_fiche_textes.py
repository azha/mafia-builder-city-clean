# m45 — textes de la fiche : titre, sous-titre, 3 valeurs, 3 libelles, 3 boutons : boite, encre, contraste
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
from texte import metrique
print('=== m45 textes de la fiche ===')
CFG=[(CANON,'canon',SC_CANON,13.00,424.52,366.00),(F2400,'jeu 2400',SC_CAPT,11.98,599.61,368.04)]
ZONES=[('titre',18,36),('sous-titre',41,56),('valeurs',66,88),('libelles de stats',89,102),('boutons',126,146)]
for path,nom,sc,fx,fy,fw in CFG:
    im=ouvrir(path,nom); px=im.load()
    print('   --- %s ---'%nom)
    for lab,ry0,ry1 in ZONES:
        metrique(px,sc, fx+2, fx+fw-2, fy+ry0, fy+ry1, lab)
    # colonnes des 3 valeurs (tiers de la plaque)
    for k,(a,b) in enumerate([(4,118),(122,240),(244,362)]):
        metrique(px,sc, fx+a, fx+b, fy+66, fy+88, '  valeur colonne %d'%(k+1))
    for k,(a,b) in enumerate([(4,118),(122,240),(244,362)]):
        metrique(px,sc, fx+a, fx+b, fy+126, fy+146, '  bouton %d'%(k+1))
