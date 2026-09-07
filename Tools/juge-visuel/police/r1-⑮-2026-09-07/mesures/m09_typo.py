# -*- coding: utf-8 -*-
"""m09 — hauteurs de CAPITALE, mesurees sur des glyphes ISOLES (segmentation en colonnes),
converties en px CSS (capture x3,6 ; canon serie 2 x3,0) pour etre comparables.
Contrôle positif : dans 'LES INSPECTIONS' toutes les lettres sont des CAPITALES sans jambage
                   -> leurs hauteurs doivent etre egales a +/-2 px (dispersion faible).
Contrôle negatif : sur une rangee en casse mixte ('Programmee'), la dispersion DOIT etre forte
                   (capitale + minuscules + accents), sinon l'instrument ne segmente rien.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def ouvrir(rel):
    im = Image.open(os.path.join(D, rel)).convert('RGB')
    print("OUVERT %-30s taille=%s" % (rel, im.size)); return im

def glyphes(im, x0, y0, x1, y1, seuil):
    g = im.convert('L'); px = g.load()
    cols = [any(px[x, y] > seuil for y in range(y0, y1+1)) for x in range(x0, x1+1)]
    seg = []; cur = None
    for i, v in enumerate(cols):
        x = x0+i
        if v:
            if cur is None: cur = [x, x]
            else: cur[1] = x
        else:
            if cur is not None: seg.append(tuple(cur)); cur = None
    if cur is not None: seg.append(tuple(cur))
    out = []
    for a, b in seg:
        ys = [y for y in range(y0, y1+1) if any(px[x, y] > seuil for x in range(a, b+1))]
        if ys and (b-a+1) >= 3:
            out.append((a, b, min(ys), max(ys), max(ys)-min(ys)+1))
    return out

cap = ouvrir('capture-1080x2400.png')
can = ouvrir('etats/inspections-canon.png')
print()

def rapport(nom, im, box, seuil, ech, attendu=None):
    gl = glyphes(im, box[0], box[1], box[2], box[3], seuil)
    hs = sorted(h for *_, h in gl)
    if not hs:
        print("  %-34s AUCUN glyphe" % nom); return None
    hmax = hs[-1]
    # capitale = les glyphes les plus hauts (a 2 px pres du max)
    caps = [h for h in hs if h >= hmax-2]
    moy = sum(caps)/float(len(caps))
    print("  %-34s %2d glyphes  h min/med/max = %d/%d/%d px  CAPITALE=%.1f px = %.2f CSS  dispersion=%d"
          % (nom, len(gl), hs[0], hs[len(hs)//2], hmax, moy, moy/ech, hmax-hs[0]))
    return moy/ech

print("== CAPTURE (x3,6) ==")
t_cap  = rapport('titre LES INSPECTIONS',       cap, (396, 268, 828, 303), 45, 3.6)
st_cap = rapport('sous-titre district/Nominal', cap, (338, 344, 740, 368), 45, 3.6)
h_cap  = rapport('entete PAR GRAVITE',          cap, ( 38, 457, 239, 482), 40, 3.6)
l_cap  = rapport('libelle Programmee (mixte)',  cap, ( 38, 796, 230, 827), 45, 3.6)
l2_cap = rapport('libelle Critique (mixte)',    cap, ( 37, 515, 154, 545), 40, 3.6)
v_cap  = rapport('valeur Predominant',          cap, (491, 687, 648, 712), 45, 3.6)
print()
print("== CANON SERIE 2 (x3,0) ==")
t_can  = rapport('titre LES INSPECTIONS',       can, (150,  60, 640, 100), 46, 3.0)
st_can = rapport('sous-titre l1 (majuscules)',  can, (145, 120, 520, 156), 40, 3.0)
n_can  = rapport('nom Verge-A (mixte, serif)',  can, ( 70, 285, 210, 345), 46, 3.0)
lg_can = rapport('libelle GRAVITE (majuscules)',can, ( 70, 385, 205, 420), 40, 3.0)
ch_can = rapport('chip MOYENNE (majuscules)',   can, (275, 390, 430, 425), 40, 3.0)
print()
print("== COMPARAISON (CSS px) ==")
if t_cap and t_can:
    print("  titre : capture %.2f CSS  canon %.2f CSS  delta %+.2f CSS (%+.1f %%)"
          % (t_cap, t_can, t_cap-t_can, 100.0*(t_cap-t_can)/t_can))
if st_cap and st_can:
    print("  sous-titre : capture %.2f CSS  canon %.2f CSS  delta %+.2f CSS (%+.1f %%)"
          % (st_cap, st_can, st_cap-st_can, 100.0*(st_cap-st_can)/st_can))
if l2_cap and lg_can:
    print("  libelle de rangee : capture %.2f CSS  canon %.2f CSS  delta %+.2f CSS (%+.1f %%)"
          % (l2_cap, lg_can, l2_cap-lg_can, 100.0*(l2_cap-lg_can)/lg_can))
if v_cap and ch_can:
    print("  valeur / chip : capture %.2f CSS  canon %.2f CSS  delta %+.2f CSS (%+.1f %%)"
          % (v_cap, ch_can, v_cap-ch_can, 100.0*(v_cap-ch_can)/ch_can))
