# m27 — SÉRIF ou LINÉALE ? Sur le MÊME glyphe ('L' de « La ville »), on compare la largeur d'encre
# de la DERNIÈRE ligne du glyphe (le pied) à la largeur du FÛT pris à mi-hauteur.
# Un 'L' à empattements a un pied nettement plus large que son fût ; une linéale a un pied = fût
# (le 'L' n'a pas d'empattement de pied côté droit, mais le fût porte des empattements haut et bas
#  qui élargissent la 1re et la dernière ligne).
# Contrôle positif : le mot « Escalades » de la RÉFÉRENCE est en linéale (Noto Sans, .filet.lien) —
#   la sonde doit y rendre un rapport ≈ 1. Contrôle négatif : « La ville » de la référence est en
#   Georgia→Noto Serif — la sonde doit y rendre un rapport nettement > 1.
from util import *
print("== m27 empattements ==")
def largeurs_glyphe(im,fen,fond,seuil):
    px=im.load(); x0,y0,x1,y1=fen
    ligs={}
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if abs(px[x,y][0]-fond[0])+abs(px[x,y][1]-fond[1])+abs(px[x,y][2]-fond[2])>seuil]
        if xs: ligs[y]=(min(xs),max(xs),len(xs))
    if not ligs: return None
    ys=sorted(ligs)
    return ys, ligs
def rapport(im,fen,fond,seuil,lbl):
    r=largeurs_glyphe(im,fen,fond,seuil)
    if r is None: print(f"   {lbl}: rien"); return
    ys,l=r
    haut,bas=ys[0],ys[-1]
    mi=ys[len(ys)//2]
    # largeur du fût = nb de px encrés à mi-hauteur ; pied = nb de px encrés à la dernière ligne
    fut=l[mi][2]; pied=l[bas][2]; tete=l[haut][2]
    print(f"   {lbl}: glyphe y{haut}..{bas} ({bas-haut+1} px) · encre à mi-hauteur={fut} px · "
          f"1re ligne={tete} px · dernière ligne={pied} px · pied/fût={pied/fut:.2f} · tête/fût={tete/fut:.2f}")
ref=ouvrir(REF); cap=ouvrir(CAP)
# 'L' de « La ville » : réf x428..452 environ ; cap x839..861
rapport(ref,(426,1038,455,1076),(17,15,11),40,"RÉF 'L' de « La ville » (Georgia→Noto Serif) [contrôle −]")
rapport(cap,(837,1526,862,1558),(13,13,13),25,"CAP 'L' de « La ville »                       ")
# 'E' de « Escalades » (linéale des deux côtés) [contrôle +]
rapport(ref,(68,1968,90,2002),(10,15,23),30,"RÉF 'E' de « Escalades » (Noto Sans)          [contrôle +]")
rapport(cap,(369,2028,392,2060),(22,22,28),30,"CAP 'E' de « Escalades » (DejaVu Sans)        ")
