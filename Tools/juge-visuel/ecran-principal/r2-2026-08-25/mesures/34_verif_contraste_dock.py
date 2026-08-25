# -*- coding: utf-8 -*-
"""VERIFICATION INDEPENDANTE du contraste des libelles du dock, methode DIFFERENTE :
encre = le jeton de couleur du canon (#b9ad92, retrouve exact dans les 3 images, script 9),
fond  = mediane d'un rectangle PLEIN de 6 CSS de haut pris ENTRE deux libelles
        (donc sans un seul glyphe), a la hauteur exacte des libelles.
Controle positif : le canon doit retomber sur ~8:1 ; controle negatif : la meme sonde
sur la capture 2400 doit retomber sur ~7,9:1 (fond sombre) — sinon la sonde mesure autre chose."""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
ENCRE=(185,173,146)   # #b9ad92, jeton mesure identique dans les 3 images
def v(path,label,ylab,gaps):
    im=open_img(path); c=css(im); px=im.load()
    y0,y1=int(ylab[0]*c),int(ylab[1]*c)
    for (a,b) in gaps:
        vals=[px[x,y] for y in range(y0,y1) for x in range(int(a*c),int(b*c))]
        f=(int(statistics.median([q[0] for q in vals])),int(statistics.median([q[1] for q in vals])),int(statistics.median([q[2] for q in vals])))
        print(f"  {label} entre-libelles x CSS[{a},{b}] : fond={hexc(f)} -> contraste avec {hexc(ENCRE)} = {contrast(ENCRE,f):.2f}:1")
print("seuil doctrine petits textes : 4,5:1")
v(CANON,'canon',(670.67,677.33),[(118,138),(188,206),(256,282)])
v(CAP16, 'cap16',(669.30,675.84),[(118,138),(188,206),(256,282)])
v(CAP24, 'cap24',(843.53,850.06),[(118,138),(188,206),(256,282)])
