#!/usr/bin/env python3
# 07 — collision OR (valeur ARGENT) / BRAISE (anneau du medaillon), par la COULEUR.
#   or   ~ (216,170,77) : G eleve   |  braise ~ (224,102,73) : G bas
#   CONTROLE POSITIF : les deux familles doivent EXISTER (comptes non nuls) et etre DISJOINTES en x
#                      partout ailleurs qu'a la jonction.
#   CONTROLE NEGATIF : la famille braise ne doit rien rendre dans le libelle "ARGENT" (x<300).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); W,H=im.size
print(f"OUVERT capture-1080x2400.png -> {W}x{H}")
px=im.load()
est_or  = lambda p: p[0]>150 and 130<=p[1]<=210 and p[2]<130 and (p[0]-p[2])>70
est_brz = lambda p: p[0]>170 and p[1]<135 and p[2]<125 and (p[0]-p[2])>90

YA,YB=55,115
xs_or =[x for x in range(W) if any(est_or (px[x,y]) for y in range(YA,YB))]
xs_brz=[x for x in range(W) if any(est_brz(px[x,y]) for y in range(YA,YB))]
print(f"  colonnes OR    (y{YA}-{YB}) : n={len(xs_or)}  x={xs_or[0]}..{xs_or[-1]}")
print(f"  colonnes BRAISE(y{YA}-{YB}) : n={len(xs_brz)} x={xs_brz[0]}..{xs_brz[-1]}")
print(f"  CONTROLE NEGATIF - braise dans le libelle ARGENT (x<300) : {len([x for x in xs_brz if x<300])} colonnes")
# la valeur : dernier or avant le premier braise du medaillon
brz_med=[x for x in xs_brz if x>300]
or_val =[x for x in xs_or  if x<min(brz_med)+60]
print(f"  premier pixel BRAISE du medaillon : x={min(brz_med)}")
print(f"  dernier pixel OR de la valeur     : x={max(or_val)}")
d=max(or_val)-min(brz_med)
print(f"  >>> ECART = {d:+d} px  ({'COLLISION / recouvrement' if d>=0 else 'gouttiere de %d px' % (-d)})")
# jonction ligne a ligne
print("  detail par ligne (dernier or / premier braise) :")
for y in range(YA,YB,6):
    o=[x for x in range(300,700) if est_or(px[x,y])]
    b=[x for x in range(300,700) if est_brz(px[x,y])]
    print(f"    y={y:3d} : or_max={max(o) if o else '-':>5} braise_min={min(b) if b else '-':>5}")
