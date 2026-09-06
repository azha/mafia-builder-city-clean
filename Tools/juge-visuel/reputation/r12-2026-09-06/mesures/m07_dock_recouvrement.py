import sys; sys.path.insert(0,'.')
from lib import *

print("=== m07 : le dock et son recouvrement du CTA a 1920 ===")
print("Methode : le dock est absent des planches 'ecran seul'. On SOUSTRAIT la planche")
print("sous chrome et la planche ecran seul de MEME resolution : tout pixel qui differe")
print("hors du bandeau est du chrome (dock) ou une difference d'etat.")
a = ouvrir('../capture-1080x1920.png')
b = ouvrir('../capture-ecran-seul-1080x1920-T.png')
pa, pb = px(a), px(b)
W,H = a.size
par_ligne=[]
for y in range(H):
    n = sum(1 for x in range(W) if max(abs(pa[x,y][i]-pb[x,y][i]) for i in range(3)) > 10)
    par_ligne.append(n)
# zones
print("  lignes ou >20 px different (regroupees) :")
g=[]
for y,n in enumerate(par_ligne):
    if n>20:
        if g and y-g[-1][-1]<=2: g[-1].append(y)
        else: g.append([y])
for grp in g:
    print(f"    y {grp[0]}..{grp[-1]}  ({len(grp)} lignes)  max px differents = {max(par_ligne[grp[0]:grp[-1]+1])}")

print()
print("  CTA a 1920 : boite 1650..1737 (filets or, m03 sur la planche ECRAN SEUL).")
print("  Premiere ligne du DOCK (difference sous chrome vs ecran seul, apres le cadre) :")
prem = min(y for y in range(1630,H) if par_ligne[y] > 20)
print(f"    y = {prem}")
print(f"    -> le dock entre dans la boite du CTA sur {1737-prem+1} px des 88 px de sa hauteur = {100*(1737-prem+1)/88:.0f} %")

# encre du libelle du CTA (or clair) et combien de ses px sont couverts par le dock
def libelle_cta(im, y0, y1):
    p = px(im)
    return set((x,y) for y in range(y0,y1) for x in range(0,W) if est_or(p[x,y],50) and lum(p[x,y])>90)
lb_seul = libelle_cta(b, 1655, 1735)
lb_chr  = libelle_cta(a, 1655, 1735)
print(f"  encre claire du libelle CTA : ecran seul = {len(lb_seul)} px ; sous chrome = {len(lb_chr)} px")
inter = len(lb_seul & lb_chr)
print(f"  px du libelle survivants a l'identique : {inter} / {len(lb_seul)}  ({100*inter/len(lb_seul):.1f} %)")
# combien de px du libelle sont MODIFIES par le dock
mod = sum(1 for (x,y) in lb_seul if max(abs(pa[x,y][i]-pb[x,y][i]) for i in range(3))>10)
print(f"  px du libelle CTA dont la couleur est MODIFIEE par le chrome : {mod} / {len(lb_seul)} = {100*mod/len(lb_seul):.1f} %")

print()
print("  CONTROLE POSITIF : meme soustraction sur le BANDEAU (doit etre massif) et")
print("  sur le coeur du panneau bas (doit etre nul).")
n_band = sum(par_ligne[0:143])
n_pan  = sum(par_ligne[1400:1550])
print(f"    somme des px differents, y 0..142   = {n_band}")
print(f"    somme des px differents, y 1400..1549 = {n_pan}")
