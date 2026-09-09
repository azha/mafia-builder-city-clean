"""m10 — LA LIGNE CYAN horizontale a travers le portrait, mesuree INDEPENDAMMENT.

Question posee : est-ce l'ECRAN (un element dessine) ou la CHAINE DE CAPTURE (une ligne
de balayage parasite) ? Les quatre discriminants que je peux executer sur des images :
  D1  La reference la porte-t-elle ? (si oui, l'element EXISTE au canon : reste son etendue)
  D2  Sa position est-elle la meme RELATIVEMENT au panneau dans les DEUX captures
      (1920 et 2400) ? Un parasite de capture est ancre a une RANGEE de l'appareil, pas a
      un panneau : a 1920 et 2400 le panneau ne tombe pas aux memes rangees absolues.
  D3  Traverse-t-elle des zones ou aucun element ne peut la dessiner (le chrome, le dock,
      la marge d'ecran HORS du cadre) ? Un parasite ignore les bornes des elements.
  D4  Son epaisseur et son profil : un parasite de capture est net (1 px, bords francs) ;
      un element dessine a un profil doux.
Exces horizontal : exces(x) = lum(x, yc) - mediane(lum(x, y) pour y dans yc-25..yc-12 et
  yc+12..yc+25)  -> le fond LOCAL de la meme colonne, hors ligne. Etendue mesuree a 25 %
  et a 10 % du pic, comme au r13.
CONTROLE POSITIF : la reference doit rendre une ligne (elle est visible a l'oeil) ;
CONTROLE NEGATIF : une rangee prise 60 px plus bas doit rendre une etendue nulle.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane

CAS = [
 ('REF',     '../reference-1080x2102.png', 848, 1613, 27, 1053),
 ('JEU2400', '../capture-1080x2400.png',   876, 1549, 24, 1056),
 ('JEU1920', '../capture-1080x1920.png',   556, 1229, 24, 1056),
]

def exces_ligne(px, y, X0, X1, dy=(12, 25)):
    out = []
    for x in range(X0, X1+1):
        vs = [lum(px[x, yy]) for yy in list(range(y-dy[1], y-dy[0]+1)) + list(range(y+dy[0], y+dy[1]+1))]
        out.append(lum(px[x, y]) - mediane(vs))
    return out

def etendue(prof, X0, frac):
    m = max(prof); s = m*frac
    idx = [i for i, v in enumerate(prof) if v >= s]
    if not idx: return None
    return X0+idx[0], X0+idx[-1], len(idx), m

for nom, f, P0, P1, X0, X1 in CAS:
    im = ouvrir(f); px = im.load()
    # rangee de pic : mediane de luminance par rangee dans le panneau
    best = None
    for y in range(P0+30, P1-30):
        v = mediane([lum(px[x, y]) for x in range(X0, X1+1)])
        if best is None or v > best[1]: best = (y, v)
    yc = best[0]
    print(f"\n== {nom} : panneau y{P0}..{P1} — rangee la plus claire y={yc} (mediane {best[1]:.1f}) ==")
    print(f"   position relative dans le panneau : {(yc-P0)/(P1-P0)*100:.1f} %")
    # epaisseur : rangees contigues dont la mediane depasse la mi-hauteur
    base = mediane([mediane([lum(px[x, y]) for x in range(X0, X1+1)]) for y in range(yc+30, yc+60)])
    mh = (base + best[1])/2
    a = yc
    while mediane([lum(px[x, a-1]) for x in range(X0, X1+1)]) >= mh: a -= 1
    b = yc
    while mediane([lum(px[x, b+1]) for x in range(X0, X1+1)]) >= mh: b += 1
    print(f"   epaisseur a mi-hauteur : y{a}..{b} = {b-a+1} px (fond {base:.1f}, pic {best[1]:.1f})")
    prof = exces_ligne(px, yc, X0, X1)
    for fr in (0.25, 0.10):
        e = etendue(prof, X0, fr)
        if e: print(f"   etendue a {int(fr*100)}% du pic : x{e[0]}..{e[1]} = {e[1]-e[0]+1} px"
                    f" ({e[2]} colonnes au-dessus du seuil) · pic = {e[3]:.1f} pts")
    # D3 : la ligne existe-t-elle HORS du cadre (marges d'ecran) et dans le chrome ?
    prof_full = exces_ligne(px, yc, 0, im.size[0]-1)
    hors = [x for x in list(range(0, 16)) + list(range(1064, im.size[0])) if prof_full[x] > 2]
    print(f"   D3 hors cadre (x<16 ou x>1063) : {len(hors)} colonnes d'exces>2 pts -> "
          f"{'TRAVERSE' if hors else 'ne traverse pas'}")
    print(f"   couleur au coeur de la ligne (x=centre du panneau) : {px[(X0+X1)//2, yc]}")
    # CONTROLE NEGATIF
    prof_n = exces_ligne(px, yc+80, X0, X1)
    en = etendue(prof_n, X0, 0.25)
    print(f"   [controle negatif] rangee y={yc+80} : pic = {max(prof_n):.1f} pts"
          f" · etendue 25% = {en[1]-en[0]+1 if en else 0} px")
