"""m14 — la carte portrait : rectangle OR exact, et son debordement du panneau elastique.
Or = r>130, r-b>50, b<120, g<r, g>b (meme filtre qu'en m01).
Controle positif : la largeur hors-tout doit rendre ~424 px (REF) / ~425 (JEU), deja
obtenue en m11 par le profil de luminance.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane

def est_or(p):
    r, g, b = p
    return r > 130 and (r-b) > 50 and b < 120 and g < r and g > b

for nom, fp, P0, P1, zone in [('REF','../reference-1080x2102.png', 848, 1613, (40, 860, 540, 1620)),
                              ('JEU2400','../capture-1080x2400.png', 874, 1550, (40, 880, 540, 1600)),
                              ('JEU1920','../capture-1080x1920.png', 556, 1229, (40, 560, 540, 1290))]:
    im = ouvrir(fp); px = im.load()
    x0, y0, x1, y1 = zone
    lignes = []
    for y in range(y0, y1):
        n = sum(1 for x in range(x0, x1) if est_or(px[x, y]))
        if n > 200: lignes.append((y, n))
    cols = []
    for x in range(x0, x1):
        n = sum(1 for y in range(y0, y1) if est_or(px[x, y]))
        if n > 300: cols.append((x, n))
    print(f"\n== {nom} : carte portrait ==")
    def grouper(v):
        g = []
        for a, n in v:
            if g and a - g[-1][-1][0] <= 3: g[-1].append((a, n))
            else: g.append([(a, n)])
        return [(x[0][0], x[-1][0]) for x in g]
    ly, lx = grouper(lignes), grouper(cols)
    print(f"   filets horizontaux (or, >200 px) : {ly}")
    print(f"   rails verticaux    (or, >300 px) : {lx}")
    if len(ly) >= 2 and len(lx) >= 2:
        h0, h1 = (ly[0][0]+ly[0][1])/2, (ly[-1][0]+ly[-1][1])/2
        v0, v1 = (lx[0][0]+lx[0][1])/2, (lx[-1][0]+lx[-1][1])/2
        print(f"   carte : x {v0:.1f}..{v1:.1f} (l={v1-v0:.1f})  y {h0:.1f}..{h1:.1f} (h={h1-h0:.1f})")
        print(f"   panneau elastique y{P0}..{P1} -> marge sous la carte = {P1-h1:.1f} px"
              f" ({'DEBORDE' if h1 > P1 else 'dans le panneau'})")
        print(f"   marge au-dessus de la carte = {h0-P0:.1f} px")
