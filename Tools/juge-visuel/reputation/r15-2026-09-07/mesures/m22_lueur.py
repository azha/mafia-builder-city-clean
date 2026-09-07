"""m22 — cartographie de la LUEUR CHAUDE (m7 du r14) : mediane par colonne du fond,
dans des bandes SANS encre, et mediane par rangee au centre.
Chaleur = R - B (positif = chaud, negatif = froid/bleute).
Controle positif : le fond du panneau bas (bleu nuit) doit rendre R-B tres negatif partout.
Controle negatif : le filet or doit rendre R-B tres positif -> la grandeur discrimine.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
CAS={'reference-1080x2102.png':[('bande haute du cadre',456,478),('sous le CTA',2050,2070),
                                ('dans le panneau bas (marge)',1900,1912)],
     'capture-1080x2400.png'  :[('bande haute du cadre',488,508),('sous le CTA',1990,2100),
                                ('dans le panneau bas (marge)',1820,1840)],
     'capture-1080x1920.png'  :[('bande haute du cadre',256,272),('sous le cadre',1640,1700),
                                ('dans le panneau bas (marge)',1590,1608)]}
for nom,zs in CAS.items():
    print("="*74); im=ouvrir(nom); p=im.load()
    for lab,y0,y1 in zs:
        ech=[]
        for x in range(40,1041,100):
            c=mediane_couleur(im,x-6,y0,x+6,y1)
            ech.append((x,c,c[0]-c[2]))
        print(f"  [{lab}] y{y0}..{y1}")
        print("    x     : "+" ".join(f"{x:>5d}" for x,_,_ in ech))
        print("    R-B   : "+" ".join(f"{d:>5d}" for _,_,d in ech))
        print("    coul  : "+" ".join(f"{c[0]:3d},{c[1]:3d},{c[2]:3d}" for _,c,_ in ech))
    # profil vertical au centre, hors encre : colonne x=1035 (marge interne du cadre)
    print("  profil vertical de chaleur, colonne x=1035 (marge interne droite du cadre) :")
    H=im.size[1]
    ys=[y for y in range(int(H*0.22), int(H*0.92), int(H*0.05))]
    print("    y    : "+" ".join(f"{y:>5d}" for y in ys))
    print("    R-B  : "+" ".join(f"{(lambda c:c[0]-c[2])(mediane_couleur(im,1031,y-4,1039,y+4)):>5d}" for y in ys))
