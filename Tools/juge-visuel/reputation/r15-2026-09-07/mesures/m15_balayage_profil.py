"""m15 — profil transversal du balayage a des x reperes (exces differentiel vertical, d=16)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
CAS={'reference-1080x2102.png':1086,'capture-1080x2400.png':1098,'capture-1080x1920.png':865}
for nom,ys in CAS.items():
    im=ouvrir(nom); p=im.load()
    ech=[80,150,250,350,450,505,560,650,750,850,950,1000,1020]
    print("  "+nom)
    print("   x     : "+" ".join(f"{x:5d}" for x in ech))
    print("   exces : "+" ".join(f"{lum(p[x,ys])-0.5*(lum(p[x,ys-16])+lum(p[x,ys+16])):5.1f}" for x in ech))
