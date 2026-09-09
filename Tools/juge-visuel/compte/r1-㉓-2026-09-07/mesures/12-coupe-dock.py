# -*- coding: utf-8 -*-
"""12 - Ou le contenu est-il COUPE, et ou commence le dock ?
CONTROLE POSITIF : les 4 ronds du dock doivent etre trouves (4 disques ~127 px de diametre).
CONTROLE NEGATIF : au-dessus de y=2150 la sonde de disque ne doit rien trouver."""
from PIL import Image
import os
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s"%(os.path.basename(p),im.size)); return im
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
C=ouvrir('../capture-1080x2400.png'); px=C.load()
print()
print("--- derniere ligne de texte de la carte 4 : ou s'arrete l'encre ? ---")
for y in range(2100,2145):
    n=sum(1 for x in range(120,960) if lum(px[x,y])>40)
    print("   y=%4d  pixels d'encre (L>40) = %3d   couleur x=200 : %s" % (y,n,px[200,y]))
