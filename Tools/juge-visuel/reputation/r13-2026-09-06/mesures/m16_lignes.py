# m16 — INVENTAIRE AUTOMATIQUE DES LIGNES DE TEXTE, panneau par panneau.
# ENCRE := px dont la distance de Chebyshev au fond du PANNEAU (mediane d'une bande vide du panneau,
#   imprimee) depasse 30. Les lignes sont les blocs de rangees porteuses separes par >= 4 rangees vides.
# Pour chaque ligne : hauteur d'encre, x d'encre, nb de px, couleur DOMINANTE de l'encre, contraste
#   WCAG de cette couleur sur le fond du panneau.
# Controle positif : le nombre de lignes doit etre le meme des deux cotes pour un panneau donne
#   (sinon c'est un repli de texte, qui est un ecart).
# Controle negatif : une bande de fond pur doit rendre 0 ligne.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from collections import Counter

def lignes(im, nom, box, fond, seuil=30, trou=4):
    p=px(im); x0,y0,x1,y1=box
    rows={}
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if dist(p[x,y],fond)>seuil]
        if xs: rows[y]=xs
    ys=sorted(rows); seg=[]
    for y in ys:
        if seg and y-seg[-1][-1]<=trou: seg[-1].append(y)
        else: seg.append([y])
    print(f"\n  {nom}  (boite {box}, fond {fond}) : {len(seg)} ligne(s)")
    out=[]
    for s in seg:
        xs=[x for y in s for x in rows[y]]
        cols=Counter(p[x,y] for y in s for x in rows[y])
        dom=cols.most_common(1)[0][0]
        print(f"    y {s[0]:>4}..{s[-1]:<4} h={s[-1]-s[0]+1:>3}  x {min(xs):>4}..{max(xs):<4}"
              f" l={max(xs)-min(xs)+1:>4}  n={len(xs):>5}  {str(dom):18s} contraste {contraste(dom,fond):5.2f}:1")
        out.append((s[0]-y0, s[-1]-s[0]+1, max(xs)-min(xs)+1, len(xs), dom, contraste(dom,fond)))
    return out

ref=ouvrir('reference-1080x2102.png'); cap=ouvrir('capture-1080x2400.png')
pr,pc=px(ref),px(cap)
P=[('ENSEIGNE',      ( 60, 490, 1020, 660),(13,22,34),   ( 60, 520, 1020, 684),(13,22,34)),
   ('COMPTEUR 1',    ( 56, 707,  356, 811),None,         ( 52, 732,  354, 836),None),
   ('CARTE (libelle)',( 90, 885,  495, 990),None,        ( 86, 910,  495,1015),None),
   ('COLONNE DROITE (en-tete)',(515,880,1000,1000),None, (515, 900, 1000, 970),None),
   ('TUILE 1',       (520,1005,  990,1100),None,         (520, 972,  990,1060),None),
   ('CARTE (pied)',  ( 90,1400,  495,1530),None,         ( 86,1420,  495,1556),None),
   ('PANNEAU BAS',   ( 60,1652, 1020,1915),None,         ( 56,1695, 1020,1952),None),
   ('CTA',           ( 60,1957, 1020,2042),None,         ( 56,1994, 1020,2072),None)]
for nom,br,fr,bc,fc in P:
    if fr is None:
        fr=mediane_fenetre(pr,br[0]+6,br[1]+6,4); fc=mediane_fenetre(pc,bc[0]+6,bc[1]+6,4)
    print(f"\n=== {nom} ===")
    a=lignes(ref,'REFERENCE',br,fr); b=lignes(cap,'CAPTURE 2400',bc,fc)
    if len(a)!=len(b): print(f"    >>> NOMBRE DE LIGNES DIFFERENT : REF {len(a)} / JEU {len(b)} <<<")
print("\n  [controle negatif] bande de fond pur (REF x900..1000 y1620..1640) :")
lignes(ref,'vide',(900,1620,1000,1640),mediane_fenetre(pr,950,1630,4))
