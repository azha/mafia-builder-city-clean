#!/usr/bin/env python3
# 15 — le medaillon du chrome dit « Brulant » : l'aiguille est-elle du BON COTE ?
#   (precedent maison : une aiguille inversee a passe une garde « 4 angles strictement croissants »)
#   On mesure : le cote de l'arc CYAN, le cote de l'arc BRAISE, et le cote du bout de l'aiguille creme.
#   CONTROLE POSITIF : les deux arcs doivent tomber de cotes OPPOSES (sinon la sonde ne discrimine pas).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); W,H=im.size
print(f"OUVERT capture-1080x2400.png -> {W}x{H}")
px=im.load()
CX=540  # centre du medaillon (mesure 06 : cercle ajuste centre x=539,5)
Z=[(x,y) for y in range(55,135) for x in range(455,625)]
def cote(sel,nom):
    pts=[(x,y) for (x,y) in Z if sel(px[x,y])]
    if not pts: print(f"    {nom:34s} : AUCUN pixel"); return
    g=len([1 for x,_ in pts if x<CX]); d=len(pts)-g
    xm=sum(x for x,_ in pts)/len(pts)
    print(f"    {nom:34s} n={len(pts):4d}  gauche={g:4d} droite={d:4d}  x moyen={xm:6.1f} (centre {CX}) -> {'GAUCHE' if xm<CX else 'DROITE'}")
cote(lambda p: p[2]>90 and p[2]-p[0]>25 and p[1]>80, 'arc CYAN (froid)')
cote(lambda p: p[0]>95 and p[0]-p[2]>35 and p[1]<95, 'arc BRAISE (chaud)')
cote(lambda p: p[0]>200 and p[1]>195 and p[2]>170, 'bout de l aiguille (creme clair)')
print("  libelle lu sur l'image : « Brulant » / « CHALEUR »  => l'aiguille DOIT etre du cote de l'arc braise")
