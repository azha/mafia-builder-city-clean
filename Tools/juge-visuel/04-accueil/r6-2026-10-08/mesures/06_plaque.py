#!/usr/bin/env python3
"""06 — la PLAQUE (.verre) : rect + bandes d'encre + marges internes.

Rects lus au 04/05 (liseré de la plaque, maximum local de luminance) :
  REF  : bas de plaque y=1493..1495 ; haut cherche dans la fenetre donnee
  2400 : bas de plaque y=1665..1667
  1920 : bas de plaque y=1306..1308

CONTROLE POSITIF : largeur de plaque REF vs JEU (meme gouttiere) ; remplissage interieur.
CONTROLE NEGATIF : la hauteur de plaque REF4 (3 rangees) vs L24 (carte de tete) doit differer.
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple, mediane_fenetre


def rect_plaque(im, y0, y1, xsonde=None):
    """liseré de la plaque = maximum local de luminance, cherche depuis l'EXTERIEUR."""
    px = im.load()
    W = im.size[0]
    L = lambda x, y: luminance_simple(px[x, y])
    ymid = (y0 + y1) // 2
    xg = xd = None
    for x in range(8, 220):
        if L(x, ymid) - L(x-6, ymid) >= 5 and L(x, ymid) - L(x+6, ymid) >= 5:
            xg = x; break
    for x in range(W-9, W-220, -1):
        if L(x, ymid) - L(x+6, ymid) >= 5 and L(x, ymid) - L(x-6, ymid) >= 5:
            xd = x; break
    if xg is None or xd is None:
        return None
    xc = xg + 90
    yh = yb = None
    for y in range(y0, y1):
        if L(xc, y) - L(xc, y-7) >= 5 and L(xc, y) - L(xc, y+7) >= 5:
            yh = y; break
    for y in range(y1, y0, -1):
        if L(xc, y) - L(xc, y+7) >= 5 and L(xc, y) - L(xc, y-7) >= 5:
            yb = y; break
    if yh is None or yb is None:
        return None
    return dict(xg=xg, xd=xd, yh=yh, yb=yb, w=xd-xg+1, h=yb-yh+1)


def bandes(im, xg, xd, yh, yb, pad=12, marge=10, mini=3):
    px = im.load()
    ech = []
    for y in range(yh+5, yb-4, 2):
        for x in range(xg+pad, xd-pad, 4):
            ech.append(luminance_simple(px[x, y]))
    ech.sort()
    fondL = ech[len(ech)//2]
    seuil = fondL + marge
    out, cur = [], None
    for y in range(yh+4, yb-3):
        n = sum(1 for x in range(xg+pad, xd-pad) if luminance_simple(px[x, y]) > seuil)
        if n >= mini:
            cur = [y, y, n] if cur is None else [cur[0], y, max(cur[2], n)]
        else:
            if cur is not None:
                out.append(tuple(cur)); cur = None
    if cur:
        out.append(tuple(cur))
    return out, fondL, seuil


CAS = [
    ("ref4", "REF4 plaque LA SUITE  ", 600, 1500),
    ("ref5", "REF5 plaque carte TETE", 700, 1500),
    ("c24",  "C24  plaque LA SUITE  ", 1100, 1670),
    ("c19",  "C19  plaque LA SUITE  ", 740, 1312),
    ("l24",  "L24  plaque carte TETE", 1250, 1670),
    ("l19",  "L19  plaque carte TETE", 900, 1312),
]

R = {}
print("=== 06 — PLAQUE (.verre) ===")
for cle, nom, y0, y1 in CAS:
    im = ouvrir(cle)
    r = rect_plaque(im, y0, y1)
    if not r:
        print(f"   {nom} NON TROUVEE"); continue
    bs, fondL, seuil = bandes(im, r["xg"], r["xd"], r["yh"], r["yb"])
    contenu = [b for b in bs if b[0] > r["yh"] + 6 and b[1] < r["yb"] - 6]
    R[nom.split()[0]] = (r, contenu)
    print(f"   {nom} x[{r['xg']},{r['xd']}] w={r['w']}px({css(r['w']):.2f}CSS)"
          f"  y[{r['yh']},{r['yb']}] h={r['h']}px({css(r['h']):.2f}CSS)  fondL={fondL:.1f}"
          f"  remplissage={mediane_fenetre(im, (r['xg']+r['xd'])//2, r['yh']+12, 3)}")
    prev = None
    for (a, b, n) in contenu:
        g = f" ecart={a-prev:3d}px({css(a-prev):5.2f}CSS)" if prev is not None else ""
        print(f"        bande y[{a:4d},{b:4d}] h={b-a+1:3d}px ({css(b-a+1):5.2f}CSS) encre_max={n:4d}{g}")
        prev = b + 1
    if contenu:
        mh = contenu[0][0] - r["yh"]; mb = r["yb"] - contenu[-1][1]
        print(f"        MARGE HAUTE={mh}px({css(mh):.2f}CSS)  MARGE BASSE={mb}px({css(mb):.2f}CSS)"
              f"  bloc={contenu[-1][1]-contenu[0][0]+1}px ({100*(contenu[-1][1]-contenu[0][0]+1)/r['h']:.1f}% de la plaque)")
    print()

print("=== CONTROLES ===")
if "REF4" in R and "C24" in R:
    a, b = R["REF4"][0], R["C24"][0]
    print(f"POSITIF largeur plaque REF4={a['w']}px  C24={b['w']}px  delta={b['w']-a['w']}px "
          f"-> {'EGAL' if abs(b['w']-a['w'])<=2 else 'ECART'}")
if "REF4" in R and "L24" in R:
    a, b = R["REF4"][0], R["L24"][0]
    print(f"NEGATIF hauteur plaque REF4(3 rangees)={a['h']}px  L24(carte de tete)={b['h']}px "
          f"delta={b['h']-a['h']}px -> {'DIFFERE (discrimine)' if abs(b['h']-a['h'])>10 else 'IDENTIQUE (suspect)'}")
