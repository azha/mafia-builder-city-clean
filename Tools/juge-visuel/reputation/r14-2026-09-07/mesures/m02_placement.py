"""m02 — placement sous chrome : bandeau, cadre, CTA, dock. Bornes hautes ET basses.
Controle positif : a 2400 le CTA doit etre DEDANS (r13 : garde 30 px) -> si mon instrument
le dit dehors, c'est mon instrument qui ment.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane

def extent_rail(im, x0, x1, ymin, ymax, nom):
    px = im.load()
    ys = []
    for y in range(ymin, ymax):
        n = 0
        for x in range(x0, x1 + 1):
            r, g, b = px[x, y]
            if r > 130 and (r - b) > 50 and b < 120 and g < r and g > b:
                n += 1
        if n >= (x1 - x0 + 1) * 0.6:
            ys.append(y)
    if ys:
        print(f"   {nom}: rail x{x0}..{x1} present y={min(ys)}..{max(ys)}  ({len(ys)} lignes)")
    return (min(ys), max(ys)) if ys else None

def encre_par_ligne(im, y0, y1, x0, x1, fond_seuil, nom):
    """premiere/derniere ligne portant de l'encre (lum > fond_seuil) dans la fenetre."""
    px = im.load()
    prem = None; der = None
    for y in range(y0, y1 + 1):
        n = sum(1 for x in range(x0, x1 + 1) if lum(px[x, y]) > fond_seuil)
        if n >= 3:
            if prem is None: prem = y
            der = y
    print(f"   {nom}: encre (>{fond_seuil}) de y={prem} a y={der}")
    return prem, der

for f, nom, cadre_haut, cadre_bas, cta in [
        ('../capture-1080x2400.png', 'JEU2400', (482,485), (2106,2109), (1882,1970)),
        ('../capture-1080x1920.png', 'JEU1920', (162,164), (1626,1629), (1562,1647))]:
    im = ouvrir(f); W, H = im.size
    print(f"\n===== {nom} =====")
    extent_rail(im, 18, 20, 0, H, 'rail gauche')
    extent_rail(im, 1059, 1061, 0, H, 'rail droit')
    # bandeau : bas du filet
    print(f"   filet du bandeau : y=141..142 (m01) -> bas du chrome haut = 142")
    # gouttiere haute
    print(f"   GOUTTIERE HAUTE  filet bandeau(142) -> filet cadre({cadre_haut[0]}) = {cadre_haut[0]-142} px")
    # dock : premiere encre sous le cadre
    encre_par_ligne(im, cadre_bas[1] + 1, H - 1, 30, 1050, 45, 'sous le cadre (dock)')
    print(f"   CTA bas = {cta[1]} ; filet bas du cadre = {cadre_bas[0]}..{cadre_bas[1]}"
          f" -> CTA {'DEDANS' if cta[1] < cadre_bas[0] else 'DEHORS de %d px' % (cta[1]-cadre_bas[1])}")
