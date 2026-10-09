#!/usr/bin/env python3
"""P10 (b) — la CARTE DE TETE non-rapports (capture `_TeteNonRapports`, designee par dossier.md)
   contre le cadre 5.

On compte, de part et d'autre :
  - les GESTES : regions d'aplat d'or (R>180, R-B>80) de plus de 20 000 px -> bouton plein ;
                 et les rectangles a FILET ferme (bord clair sur fond de carte) -> bouton creux.
    Detection du filet : une rangee est « bord » si elle porte >= 120 px contigus plus clairs
    que le fond de la carte de > 18/255 ; deux rangees bord encadrant >= 25 rangees = un bouton creux.
  - les CONSEQUENCES : les lignes de texte situees SOUS la rangee des gestes, dans la carte.
  - la CASSE des libelles d'option : part de lettres dont la hauteur vaut la hauteur de capitale.

Echelle : 1 px CSS = 3,6 px image des deux cotes.
Controle positif : la methode doit retrouver 2 boutons dans le cadre 5 (1 plein + 1 creux),
                   ce qu'on lit aussi a l'oeil sur la planche.
Controle negatif : appliquee a une zone SANS bouton (le bandeau PORTEE/URGENCE), elle doit rendre 0.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metrique import *

aplat_or = lambda p: p[0] > 180 and p[0] - p[2] > 80

def regions_or(im, box, mini=20000):
    x0, y0, x1, y1 = box
    c = im.crop(box); W, H = c.size
    px = list(c.getdata())
    m = [aplat_or(p) for p in px]
    vu = [False] * len(px); out = []
    for i in range(len(px)):
        if m[i] and not vu[i]:
            pile = [i]; vu[i] = True; comp = []
            while pile:
                j = pile.pop(); comp.append(j)
                jy, jx = divmod(j, W)
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = jy + dy, jx + dx
                    if 0 <= ny < H and 0 <= nx < W:
                        k = ny * W + nx
                        if m[k] and not vu[k]:
                            vu[k] = True; pile.append(k)
            if len(comp) >= mini:
                ys = [j // W for j in comp]; xs = [j % W for j in comp]
                out.append((x0 + min(xs), y0 + min(ys), x0 + max(xs), y0 + max(ys), len(comp)))
    return out

def bords_clairs(im, box, fond, d=18, mini=120):
    """Rangees portant un long segment contigu plus CLAIR que le fond de la carte."""
    x0, y0, x1, y1 = box
    out = []
    for y in range(y0, y1):
        run = best = 0
        for x in range(x0, x1):
            p = im.getpixel((x, y))
            if sum(p) - sum(fond) > 3 * d:
                run += 1; best = max(best, run)
            else:
                run = 0
        if best >= mini:
            out.append((y, best))
    return out

print("=== P10 (b) : gestes de la carte de tete ===")
CAS = [("ref", "A01-cadre-5-tete-sur-ligne-haute", (70, 1010, 1020, 1330), (700, 960, 760, 1000)),
       ("cap", "A01_AccueilFile2Cartes_TeteNonRapports_1080x2400", (70, 1470, 1020, 1760), (700, 1420, 760, 1450))]
for kind, nom, box, ftest in CAS:
    im = ouvrir(kind, nom)
    (fond, _) = med(im, *ftest)
    rs = regions_or(im, box)
    print(f"   {nom}")
    print(f"      fond de carte={fond}")
    print(f"      BOUTONS PLEINS (aplat d'or >= 20000px) : {len(rs)}")
    for r in rs:
        print(f"         x={r[0]}..{r[2]} y={r[1]}..{r[3]}  {r[2]-r[0]+1}x{r[3]-r[1]+1}px = "
              f"{(r[2]-r[0]+1)/K:.1f}x{(r[3]-r[1]+1)/K:.1f} css  aire={r[4]}px")
    bc = bords_clairs(im, box, fond)
    grp, last = [], -9
    for y, n in bc:
        if y - last > 3:
            grp.append(y)
        last = y
    print(f"      rangees de FILET clair groupees : {grp}")

print()
print("=== P10 (b) : lignes de texte de la carte, de haut en bas ===")
for kind, nom, box in (("ref", "A01-cadre-5-tete-sur-ligne-haute", (90, 790, 1000, 1400)),
                       ("cap", "A01_AccueilFile2Cartes_TeteNonRapports_1080x2400", (90, 1190, 1000, 1790))):
    im = ouvrir(kind, nom)
    W, H, bits, f = masque(im, box)
    bs, _ = bandes(bits, W, H)
    print(f"   {nom}  fond={f}  {len(bs)} bandes :")
    for a, b in bs:
        ls = [l for l in lettres(bits, W, a, b) if l[1] - l[0] + 1 >= 3]
        if not ls:
            continue
        m = metrique(bits, W, a, b)
        print(f"      y={box[1]+a:4d}..{box[1]+b:4d} h={b-a+1:2d}px  {len(ls):3d} lettres  "
              f"x={box[0]+min(l[0] for l in ls)}..{box[0]+max(l[1] for l in ls)}"
              + (f"  capH={m['capH']}px xH={m['xH']}px" if m else ""))

print()
print("=== CONTROLE NEGATIF : bandeau PORTEE/URGENCE (aucun bouton attendu) ===")
im = ouvrir("ref", "A01-cadre-5-tete-sur-ligne-haute")
print("   cadre 5, y 930..990 :", len(regions_or(im, (70, 930, 1020, 990))), "bouton(s) plein(s)")
