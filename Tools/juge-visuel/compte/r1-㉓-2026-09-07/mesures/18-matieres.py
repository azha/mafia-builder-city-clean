# -*- coding: utf-8 -*-
"""18 - Les MATIERES du plateau : comptoir de laiton, vitre en degrade, reflets, tablette,
bandeau de voix. Mesure : mediane de fenetres a >=3 px de tout bord, sur les deux images.
CONTROLE POSITIF : les valeurs de la REFERENCE doivent retrouver les hex ECRITS dans la CSS
(.compt #2a231f->#1b1613 ; .vitre #151b23->#0c1015 ; .voix #12100e ; .planche bord #3a2e24).
CONTROLE NEGATIF : deux fenetres prises dans des matieres differentes doivent differer > 6/255."""
from PIL import Image
import statistics, os
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s"%(os.path.basename(p),im.size)); return im
def med(im,box):
    z=im.crop(box); px=list(z.getdata())
    return tuple(int(statistics.median([p[k] for p in px])) for k in range(3))
def ecart(a,b): return max(abs(a[i]-b[i]) for i in range(3))
R=ouvrir('../reference-㉓-1080x2102.png'); C=ouvrir('../capture-1080x2400.png')
print()
print("=== REFERENCE : les matieres ecrites dans la CSS ===")
c=med(R,(150,445,400,470)); print("   comptoir haut   %-16s  CSS #2a231f=(42,35,31)  ecart=%d"%(str(c),ecart(c,(42,35,31))))
c=med(R,(150,555,400,575)); print("   comptoir bas    %-16s  CSS #1b1613=(27,22,19)  ecart=%d"%(str(c),ecart(c,(27,22,19))))
c=med(R,(60,600,200,630));  print("   vitre haut      %-16s  CSS #151b23=(21,27,35)  ecart=%d"%(str(c),ecart(c,(21,27,35))))
c=med(R,(900,1740,1030,1790)); print("   vitre bas       %-16s  CSS #0c1015=(12,16,21)  ecart=%d"%(str(c),ecart(c,(12,16,21))))
c=med(R,(60,1900,200,1950)); print("   bandeau de voix %-16s  CSS #12100e=(18,16,14)  ecart=%d"%(str(c),ecart(c,(18,16,14))))
c=med(R,(300,1617,700,1623)); print("   tablette        %-16s  CSS #3a2e24=(58,46,36)  ecart=%d"%(str(c),ecart(c,(58,46,36))))
c=med(R,(300,581,700,586)); print("   filet du comptoir %-14s CSS #6b4f14=(107,79,20)  ecart=%d"%(str(c),ecart(c,(107,79,20))))
print()
print("=== CAPTURE : les memes emplacements relatifs ===")
print("   sous le titre (y 320..345)      :",med(C,(150,320,400,345)))
print("   plateau, haut (y 600..630)      :",med(C,(60,600,200,630)))
print("   plateau, bas  (y 1900..1950)    :",med(C,(60,1900,200,1950)))
print("   plateau, droite (y 1740..1790)  :",med(C,(900,1740,1030,1790)))
print("   dans une carte (y 960..1000)    :",med(C,(150,960,400,1000)))
print()
print("=== REFLETS de la vitre (reference) : profil transversal a y=1700 ===")
pr=R.load()
row=[med(R,(x,1695,x+12,1705)) for x in range(30,1050,60)]
print("   ",[ (30+i*60, c) for i,c in enumerate(row) ])
print("=== meme profil sur la CAPTURE a y=1900 (hors cartes) ===")
row=[med(C,(x,1895,x+12,1905)) for x in range(30,1050,60)]
print("   ",[ (30+i*60, c) for i,c in enumerate(row) ])
