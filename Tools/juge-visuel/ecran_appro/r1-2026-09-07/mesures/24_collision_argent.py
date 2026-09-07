# -*- coding: utf-8 -*-
"""COLLISION ARGENT / MEDAILLON, sonde specifique a la COULEUR DE L'ENCRE OR de la valeur
(la sonde precedente pouvait compter l'anneau braise du medaillon : elle est refutee et remplacee).
CONTROLE POSITIF : la sonde 'or' doit trouver les chiffres '9 627 820,00' entre x=82 et x=430.
CONTROLE NEGATIF : la meme sonde 'or' sur l'anneau braise seul (x=449..470, y=20..40, hors du texte)
                   doit rendre 0 pixel -> preuve qu'elle ne compte pas l'anneau."""
from PIL import Image
CAP="../capture-1080x2400.png"
im=Image.open(CAP).convert("RGB"); W,H=im.size; px=im.load(); print("OUVERT",CAP,(W,H))
def est_or(p):
    r,g,b=p
    return r>150 and 110<g<210 and b<130 and (r-b)>70 and (r-g)>20 and (g-b)>25
cols={}
for y in range(40,120):
    for x in range(0,520):
        if est_or(px[x,y]): cols.setdefault(x,0); cols[x]+=1
xs=sorted(cols)
print("  encre OR de la valeur ARGENT : x=%d..%d  (%d colonnes)"%(min(xs),max(xs),len(xs)))
print("  CONTROLE NEGATIF (anneau braise seul, x449..470 y20..40) : %d px or"
      %sum(1 for y in range(20,41) for x in range(449,471) if est_or(px[x,y])))
# anneau : pixels braise
pts=[(x,y) for y in range(10,215) for x in range(400,700)
     if abs(px[x,y][0]-224)<45 and abs(px[x,y][1]-102)<45 and abs(px[x,y][2]-74)<45]
ax=[p[0] for p in pts]; ay=[p[1] for p in pts]
cx=(min(ax)+max(ax))/2.0; cy=(min(ay)+max(ay))/2.0; R=(max(ax)-min(ax)+1)/2.0
print("  medaillon : centre (%.1f,%.1f) rayon exterieur %.1f  bord gauche x=%d"%(cx,cy,R,min(ax)))
dedans=sum(1 for y in range(40,120) for x in range(400,520)
           if est_or(px[x,y]) and (x-cx)**2+(y-cy)**2 <= R*R)
print("  pixels d'encre OR tombant DANS le disque exterieur du medaillon : %d"%dedans)
print("  ecart bord droit de l'encre OR (x=%d) -> bord gauche de l'anneau (x=%d) : %d px"%(max(xs),min(ax),min(ax)-max(xs)))
# le glyphe le plus a droite : sa bbox
der=[x for x in xs if x>420]
print("  colonnes d'encre or au-dela de x=420 : %s"%(der if der else "aucune"))
