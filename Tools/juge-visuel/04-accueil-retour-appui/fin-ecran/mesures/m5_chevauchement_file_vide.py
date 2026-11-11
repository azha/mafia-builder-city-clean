#!/usr/bin/env python3
"""m5 (Q3) — les deux lignes de l'etat « file vide » : chevauchement et sortie de plaque.

Dans c1, c2, c3 et c5 (les 4 etats a file vide) deux libelles blancs sont rendus SOUS la plaque :
« Aucune exception en attente » et « Personne ne fait la queue ». On mesure :
  * la bbox de chaque ligne (masque blanc : L >= 150 et quasi-neutre |R-B| <= 25) ;
  * leur recouvrement vertical en px ;
  * la bbox de la PLAQUE (lisere L>=40) pour dire si le texte en sort ;
  * la hauteur de capitale, pour la comparer a celle du texte homologue de la maquette.

CONTROLE POSITIF : sur reference/cadre-1.png, les deux libelles homologues (« Aucune decision en
attente · Aucune exception en attente » et « Personne ne fait la queue — la routine tient ») sont
dans la meme plaque et NE SE RECOUVRENT PAS -> recouvrement attendu <= 0.
CONTROLE NEGATIF (de l'instrument) : le meme masque blanc applique au CIEL (y 300..600) de la
meme image doit rendre 0 bande — le ciel n'est pas blanc.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def blanc(p):
    r, g, b = p[:3]
    return (r + g + b) / 3 >= 150 and abs(r - b) <= 25 and abs(r - g) <= 25


def bandes_blanches(im, x0, y0, x1, y1, mini=4):
    px = im.convert("RGB").load()
    bandes, cur = [], None
    for y in range(y0, y1):
        xs = [x for x in range(x0, x1) if blanc(px[x, y])]
        if len(xs) >= mini:
            if cur is None:
                cur = [y, y + 1, min(xs), max(xs)]
            else:
                cur = [cur[0], y + 1, min(cur[2], min(xs)), max(cur[3], max(xs))]
        else:
            if cur: bandes.append(tuple(cur)); cur = None
    if cur: bandes.append(tuple(cur))
    return bandes


def liseres_col(im, x, y0, y1, seuil=40):
    px = im.convert("RGB").load()
    ys = [y for y in range(y0, y1) if sum(px[x, y][:3]) / 3 >= seuil]
    grp, cur = [], None
    for y in ys:
        if cur and y == cur[1]: cur = (cur[0], y + 1)
        else:
            if cur: grp.append(cur)
            cur = (y, y + 1)
    if cur: grp.append(cur)
    return grp


CAS = [
    ("captures/c1-rien-a-trancher-1080x1920.png", "JEU c1 1920", (300, 1590, 800, 1700)),
    ("captures/c2-une-carte-de-tete-1080x1920.png", "JEU c2 1920", (300, 1590, 800, 1700)),
    ("captures/c3-des-rapports-a-lire-1080x1920.png", "JEU c3 1920", (300, 1590, 800, 1700)),
    ("captures/c5-joueur-neuf-la-suite-1080x1920.png", "JEU c5 1920", (300, 1590, 800, 1700)),
    ("captures/c1-rien-a-trancher-1080x2400.png", "JEU c1 2400", (300, 2060, 800, 2190)),
    ("captures/c2-une-carte-de-tete-1080x2400.png", "JEU c2 2400", (300, 2060, 800, 2190)),
    ("captures/c3-des-rapports-a-lire-1080x2400.png", "JEU c3 2400", (300, 2060, 800, 2190)),
    ("captures/c5-joueur-neuf-la-suite-1080x2400.png", "JEU c5 2400", (300, 2060, 800, 2190)),
]

print("=== m5 : les deux libelles de l'etat « file vide » ===")
for rel, lib, (x0, y0, x1, y1) in CAS:
    im = Image.open(os.path.join(D, rel))
    b = bandes_blanches(im, x0, y0, x1, y1)
    print(f"\n{lib}  [{rel}]  image {im.width}x{im.height}  fenetre x{x0}..{x1} y{y0}..{y1}")
    print(f"   {len(b)} bande(s) de texte blanc :")
    for i, (a, z, gx, dx) in enumerate(b, 1):
        print(f"      B{i}: y {a}..{z-1} (h={z-a}px img = {(z-a)/3.6:.1f} px CSS) "
              f"x {gx}..{dx} (l={dx-gx+1}px = {100*(dx-gx+1)/im.width:.1f}% ecran)")
    if len(b) == 1:
        print("   => UNE SEULE bande : les deux lignes se touchent au point de ne plus se separer "
              "par une ligne de fond -> RECOUVREMENT TOTAL de la bande")
    print("   (le masque ne separe pas les deux lignes quand leurs glyphes se croisent : "
          "voir le decoupage par ligne ci-dessous)")
    # decoupage fin : nombre de pixels blancs par ligne y, pour voir les deux corps de texte
    px = im.convert("RGB").load()
    serie = [(y, sum(1 for x in range(x0, x1) if blanc(px[x, y]))) for y in range(y0, y1)]
    nz = [(y, n) for y, n in serie if n > 0]
    if nz:
        print(f"   encre blanche de y={nz[0][0]} a y={nz[-1][0]} "
              f"(hauteur totale {nz[-1][0]-nz[0][0]+1}px img = {(nz[-1][0]-nz[0][0]+1)/3.6:.1f} px CSS)")
        pics = sorted(nz, key=lambda t: -t[1])[:3]
        print(f"   3 lignes les plus encrees : {pics}")

print("\n--- CONTROLE POSITIF : reference/cadre-1.png, les deux libelles homologues ---")
im = Image.open(os.path.join(D, "reference/cadre-1.png"))
b = bandes_blanches(im, 100, 1680, 980, 1800, mini=4)
print(f"   image {im.width}x{im.height}")
for i, (a, z, gx, dx) in enumerate(b, 1):
    print(f"      B{i}: y {a}..{z-1} (h={z-a}px = {(z-a)/3.6:.1f} px CSS) x {gx}..{dx}")
if len(b) >= 2:
    rec = b[0][1] - b[1][0]
    print(f"   recouvrement vertical entre B1 et B2 = {rec} px img  -> attendu <= 0 : "
          f"{'OK (pas de chevauchement dans la maquette)' if rec <= 0 else 'ECHEC'}")
else:
    print(f"   {len(b)} bande(s) seulement -> controle non concluant")

print("\n--- CONTROLE NEGATIF : masque blanc applique au CIEL (cadre-1, y 300..600) ---")
b = bandes_blanches(im, 100, 300, 980, 600)
print(f"   bandes = {b}  -> attendu [] : {'OK' if b == [] else 'ECHEC (instrument non discriminant)'}")

print("\n--- PLAQUE de c1 : le texte blanc sort-il de la plaque ? ---")
im = Image.open(os.path.join(D, "captures/c1-rien-a-trancher-1080x1920.png"))
g = liseres_col(im, 460, 1540, 1700)
print(f"   image {im.width}x{im.height}  liseres sur x=460 : {g}")
