#!/usr/bin/env python3
"""Trois verifications avant de figer le rapport :
(a) bornes horizontales de .une / .brv dans la reference ;
(b) bas de la .barre de la reference (haut de la bande de decor) ;
(c) couleur du SUR-TITRE du panneau explicatif (grise ou or ?).
Chaque mesure porte son controle."""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
FROID=(42,54,72)
def froid(p): return all(abs(p[i]-FROID[i])<=22 for i in range(3))

im=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
W,H=im.size; px=im.load(); print(f"OUVERT reference-1080x2102.png taille={W}x{H}")
print("\n(a) bornes horizontales des cartes (rangee de bordure haute)")
for y,nom in ((855,'.une bord haut'),(1203,'.brv1 bord haut'),(826,'.elast bord haut')):
    xs=[x for x in range(W) if froid(px[x,y])]
    print(f"    {nom:16s} y={y} : x={min(xs)}..{max(xs)}  largeur={max(xs)-min(xs)+1}px "
          f"= {(max(xs)-min(xs)+1)/3.6:.2f} CSS   n={len(xs)}")
print("    CONTROLE : .elast doit faire ~274 CSS et .une/.brv ~258 CSS (274 - 2x1 bord - 2x7 retrait)")

print("\n(b) bas de la .barre : premiere rangee sous laquelle la STRUCTURE (decor) apparait")
import statistics as st
for y in range(120,260,4):
    vals=[lum(px[x,y]) for x in range(60,420,2)]
    cols=len(set(px[x,y] for x in range(60,420,2)))
    print(f"    y={y:4d}  L_moy={st.mean(vals):6.2f}  sd={st.pstdev(vals):5.2f}  teintes={cols}")

imc=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
Wc,Hc=imc.size; pc=imc.load(); print(f"\nOUVERT capture-1080x2400.png taille={Wc}x{Hc}")
print("(c) couleur du SUR-TITRE (bande 1821-1844) et du TITRE (bande 1865-1902) du panneau")
for y0,y1,nom in ((1821,1845,'sur-titre CE QUE LE SERVEUR ENVOIE VRAIMENT'),
                  (1865,1903,'titre  Aucune de ces breves n a de texte')):
    ps=[pc[x,y] for y in range(y0,y1) for x in range(80,900)]; ps.sort(key=lum); n=len(ps)
    c=tuple(int(statistics.median([p[i] for p in ps[int(n*0.99):]])) for i in range(3))
    print(f"    {nom:46s} encre={c}")
print("    CONTROLE : les deux doivent DIFFERER si le sur-titre est gris et le titre or")
