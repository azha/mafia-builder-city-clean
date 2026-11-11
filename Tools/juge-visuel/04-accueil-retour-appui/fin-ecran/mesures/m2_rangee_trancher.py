#!/usr/bin/env python3
"""m2 (Q1) — la rangee de la file et le mot TRANCHER.

Instrument : masque "or" = pixels dont R>150, R-B>60, R>=G>B (l'or du jeu et de la maquette).
On borne la recherche a la moitie DROITE de l'image et au tiers bas, ou se trouve TRANCHER.
Toute grandeur est rendue en px CSS (/3,6) ET en % de la largeur d'ecran, seules unites comparables
(dossier.md : 1 px CSS = 3,6 px d'image DES DEUX COTES ; en Y il n'y a pas de rapport).

CONTROLE POSITIF : la largeur d'image vaut 1080 partout (imprimee) et le masque or doit trouver
TRANCHER dans la reference cadre-4, ou l'oeil le voit -> bbox non vide.
CONTROLE NEGATIF : le meme masque applique a la reference cadre-1 (« Rien a signaler », AUCUN
TRANCHER dans la bande basse droite) doit rendre une bbox VIDE. Un instrument qui trouve TRANCHER
partout ne mesure rien.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def est_or(p):
    r, g, b = p[:3]
    return r > 150 and (r - b) > 60 and r >= g > b


def bbox_or(im, x0, y0, x1, y1):
    px = im.convert("RGB").load()
    xs, ys = [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if est_or(px[x, y]):
                xs.append(x); ys.append(y)
    if not xs:
        return None
    return (min(xs), min(ys), max(xs) + 1, max(ys) + 1)


def composantes_lignes(im, x0, y0, x1, y1, mini=3):
    """lignes (bandes y) contenant >= mini pixels or"""
    px = im.convert("RGB").load()
    cnt = []
    for y in range(y0, y1):
        n = sum(1 for x in range(x0, x1) if est_or(px[x, y]))
        cnt.append((y, n))
    bandes, cur = [], None
    for y, n in cnt:
        if n >= mini:
            cur = [y, y + 1] if cur is None else [cur[0], y + 1]
        else:
            if cur:
                bandes.append(tuple(cur)); cur = None
    if cur:
        bandes.append(tuple(cur))
    return bandes


CAS = [
    # (chemin, libelle, zone de recherche x0,y0,x1,y1)
    ("reference/cadre-2.png", "REF cadre 2 (rangee courte)", (700, 1600, 1080, 1850)),
    ("reference/cadre-3.png", "REF cadre 3 (rangee courte)", (700, 1600, 1080, 1850)),
    ("reference/cadre-4.png", "REF cadre 4 (rangee courte)", (700, 1600, 1080, 1850)),
    ("reference/cadre-5.png", "REF cadre 5 (rangee haute)", (700, 1550, 1080, 1800)),
    ("reference/cadre-6.png", "REF cadre 6 (rangee haute)", (700, 1550, 1080, 1800)),
    ("captures/c4-la-file-sous-pression-1080x1920.png", "JEU c4 1920", (700, 1450, 1080, 1750)),
    ("captures/c4-la-file-sous-pression-1080x2400.png", "JEU c4 2400", (700, 1850, 1080, 2250)),
    ("captures/c6-carte-de-tete-au-dessus-de-la-file-1080x1920.png", "JEU c6 1920", (700, 1450, 1080, 1750)),
    ("captures/c6-carte-de-tete-au-dessus-de-la-file-1080x2400.png", "JEU c6 2400", (700, 1850, 1080, 2250)),
]

print("=== m2 : le mot TRANCHER (masque or) ===")
for rel, lib, z in CAS:
    im = Image.open(os.path.join(D, rel))
    print(f"\n{lib}  [{rel}]  image {im.width}x{im.height}  zone={z}")
    bb = bbox_or(im, *z)
    if bb is None:
        print("   AUCUN pixel or -> pas de TRANCHER dans la zone")
        continue
    x0, y0, x1, y1 = bb
    w, h = x1 - x0, y1 - y0
    print(f"   bbox or      = ({x0},{y0})-({x1},{y1})   largeur={w}px h={h}px")
    print(f"   en px CSS    = largeur {w/3.6:.1f}  hauteur(capitale) {h/3.6:.1f}")
    print(f"   x en % ecran = gauche {100*x0/im.width:.1f}%  droite {100*x1/im.width:.1f}%  "
          f"marge droite {100*(im.width-x1)/im.width:.1f}% ({(im.width-x1)/3.6:.1f} px CSS)")
    print(f"   bandes or (y)= {composantes_lignes(im, *z)}")

def taux_or(im, x0, y0, x1, y1):
    px = im.convert("RGB").load()
    n = sum(1 for y in range(y0, y1) for x in range(x0, x1) if est_or(px[x, y]))
    return n, (x1 - x0) * (y1 - y0), 100.0 * n / ((x1 - x0) * (y1 - y0))


print("\n--- CONTROLE NEGATIF : taux d'or dans la MOITIE GAUCHE de la rangee (x 100..700) ---")
print("    Elle porte « Lt. Quist attend vos ordres » et sa gravite : du creme et du gris.")
print("    Le masque y attrape quelques franges d'anti-crenelage chaudes — c'est attendu —")
print("    mais le TAUX doit rester sous 2 %, contre ~39 % dans TRANCHER. Un masque qui ne")
print("    separerait pas ces deux taux ne mesurerait pas l'or.")
for rel, zg, zt in [
    ("reference/cadre-4.png", (100, 1700, 700, 1800), (772, 1736, 991, 1760)),
    ("captures/c4-la-file-sous-pression-1080x1920.png", (100, 1535, 700, 1650), (796, 1580, 1002, 1604)),
]:
    im = Image.open(os.path.join(D, rel))
    ng, ag, tg = taux_or(im, *zg)
    nt, at, tt = taux_or(im, *zt)
    print(f"   [{rel}]  image {im.width}x{im.height}")
    print(f"      moitie gauche : {ng:5d}/{ag} = {tg:5.2f} %   | TRANCHER : {nt:5d}/{at} = {tt:5.2f} %")
    print(f"      -> {'OK (discriminant)' if tg < 2.0 and tt > 20.0 else 'ECHEC (instrument non discriminant)'}")
