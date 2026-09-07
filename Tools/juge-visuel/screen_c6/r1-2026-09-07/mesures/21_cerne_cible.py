# -*- coding: utf-8 -*-
"""Le .cerne existe-t-il dans la capture ? Sonde CIBLEE dans les GOUTTIERES entre boites
(la ou seul un cadre continu peut passer). Bandes de gouttiere mesurees au script 16 :
   capture : y=465..492 (enseigne->compteurs), 650..674 (compteurs->liste), 1823..1850 (liste->pave)
   reference: y=650..666, 796..822, 1872..1898
CONTROLE POSITIF : dans la REFERENCE, les colonnes du cerne (x=21..23 et 1056..1058) doivent etre OR
   dans CHACUNE des trois gouttieres.
CONTROLE NEGATIF : dans la REFERENCE, une colonne centrale (x=540) ne doit l'etre dans aucune."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
def isor(p):
    r,g,b=p; return r>g>b and r>=90 and (r-b)>=35 and (g-b)>=12
def sonde(im, gouttieres, cols, tag):
    px=im.load()
    print("  %s" % tag)
    for (y0,y1) in gouttieres:
        res=[]
        for x in cols:
            n=sum(1 for y in range(y0,y1) if isor(px[x,y]))
            res.append("x=%d:%d/%d"%(x,n,y1-y0))
        print("     gouttiere y=%4d..%4d  %s" % (y0,y1," ".join(res)))
    # + total de pixels OR dans toute la gouttiere
    for (y0,y1) in gouttieres:
        n=sum(1 for y in range(y0,y1) for x in range(0,im.size[0],1) if isor(px[x,y]))
        print("     gouttiere y=%4d..%4d  TOTAL px OR sur toute la largeur = %d" % (y0,y1,n))

ref=Image.open(os.path.join(R,"reference-1080x2102.png")).convert("RGB")
cap=Image.open(os.path.join(R,"capture-ecran-seul-etat-vide-1080x2400.png")).convert("RGB")
print("ref",ref.size," cap",cap.size)
sonde(ref, [(650,666),(796,822),(1872,1898)], [21,22,23,540,1056,1057,1058], "REFERENCE (cerne attendu x=21..23 / 1056..1058)")
print()
sonde(cap, [(465,492),(650,674),(1823,1850)], [21,22,23,47,48,49,540,1030,1031,1032,1056,1057,1058], "CAPTURE etat-vide")
