#!/usr/bin/env python3
"""m8 (Q2) — le « Pied » de la carte : la maquette en dessine-t-elle un, et le retrait cote jeu
laisse-t-il un TROU en bas de la carte ?

Deux mesures :
 A. la maquette. Fait d'inventaire (et non d'image) : dans la copie EPINGLEE de la source donnee
    par dossier.md, la classe `.carte-pied` est DECLAREE en CSS mais n'est POSEE nulle part dans
    le balisage de la page. Le compte est imprime ici par le script lui-meme.
 B. l'image. On mesure la garde BASSE de la carte (dernier element -> lisere bas) et on la compare
    a sa garde HAUTE (lisere haut -> premier element). Un pied retire proprement laisse les deux
    gardes du meme ordre ; un pied retire en laissant son espace laisse une garde basse gonflee.

CONTROLE POSITIF : on mesure aussi la carte de la MAQUETTE (cadre 2), dont on sait qu'elle n'a pas
de pied -> ses deux gardes doivent etre du meme ordre.
CONTROLE NEGATIF : on mesure la garde basse de la RANGEE DE FILE du jeu (c6), dont on sait
qu'elle est serree (m4 : derniere ligne a y=1641, lisere bas a 1657) -> doit donner une petite
valeur, differente de celle de la carte. Un instrument qui rend la meme garde partout ne mesure rien.
"""
import os, re
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = ("/tmp/claude-1000/-home-erutheone-project-mafia-builder-city-clean/"
       "df180ef7-bd03-45c8-bca4-a4c3c6f0b99f/scratchpad/pin/ecrans-brennar-accueil.html")


def L(p): return sum(p[:3]) / 3


def lisere_h(im, x0, x1, y0, y1, frac=0.7):
    px = im.convert("RGB").load()
    w = x1 - x0
    out = []
    for y in range(y0, y1):
        n = sum(1 for x in range(x0, x1) if L(px[x, y]) >= L(px[x, y - 3]) + 5 and L(px[x, y]) >= L(px[x, y + 3]) + 5)
        if n > frac * w: out.append(y)
    return out


def bandes_encre(im, x0, x1, y0, y1, seuil):
    px = im.convert("RGB").load()
    b, cur = [], None
    for y in range(y0, y1):
        n = sum(1 for x in range(x0, x1) if L(px[x, y]) > seuil)
        if n >= 3: cur = [y, y + 1] if cur is None else [cur[0], y + 1]
        else:
            if cur: b.append(tuple(cur)); cur = None
    if cur: b.append(tuple(cur))
    return b


print("=== m8 A — la MAQUETTE dessine-t-elle un pied de carte ? (source epinglee de dossier.md) ===")
html = open(SRC, encoding="utf-8", errors="replace").read()
print(f"   source : {SRC}  ({len(html)} octets)")
for cls in ("carte-pied", "class=\"verre\"", "csq4-rang", "class=\"suivant\"", "class=\"rep\""):
    print(f"   occurrences de {cls!r:22s} : {html.count(cls)}")
print("   -> `carte-pied` : 1 occurrence = la REGLE CSS seule (ligne 408) ; 0 pose dans le balisage.")
print("   -> la carte de l'Accueil se termine sur `csq4-rang` : la maquette ne dessine AUCUN pied.")

print("\n=== m8 B — garde haute / garde basse de la carte ===")
CAS = [
    ("reference/cadre-2.png", "REF cadre 2 — carte (sans pied, par construction)", 200, 880, 900, 1660, 45),
    ("captures/c6-carte-de-tete-au-dessus-de-la-file-1080x1920.png", "JEU c6 1920 — carte", 380, 700, 1340, 1520, 40),
    ("captures/c2-une-carte-de-tete-1080x1920.png", "JEU c2 1920 — carte", 380, 700, 1440, 1620, 40),
]
for rel, lib, x0, x1, y0, y1, seuil in CAS:
    im = Image.open(os.path.join(D, rel))
    lis = lisere_h(im, x0, x1, y0, y1)
    print(f"\n{lib}\n   [{rel}]  image {im.width}x{im.height}  fenetre x{x0}..{x1} y{y0}..{y1}")
    print(f"   liseres horizontaux pleins : {lis}")
    if len(lis) < 2:
        print("   -> bornes de carte introuvables"); continue
    haut, bas = lis[0], lis[-1]
    enc = bandes_encre(im, x0 + 8, x1 - 8, haut + 4, bas - 3, seuil)
    if not enc:
        print("   -> aucune encre dans la carte"); continue
    gh = enc[0][0] - haut
    gb = bas - (enc[-1][1] - 1)
    print(f"   carte y {haut}..{bas} (h={bas-haut}px img = {(bas-haut)/3.6:.1f} px CSS)")
    print(f"   premiere encre y={enc[0][0]} ; derniere encre y={enc[-1][1]-1}  ({len(enc)} bandes)")
    print(f"   garde HAUTE = {gh}px img = {gh/3.6:.1f} px CSS")
    print(f"   garde BASSE = {gb}px img = {gb/3.6:.1f} px CSS")
    print(f"   rapport basse/haute = {gb/gh:.2f}  -> "
          f"{'equilibre (pas de trou)' if 0.5 <= gb/gh <= 2.0 else 'DESEQUILIBRE (trou possible)'}")

print("\n--- CONTROLE NEGATIF : on FABRIQUE un trou et l'instrument doit le voir ---")
im = Image.open(os.path.join(D, "captures/c2-une-carte-de-tete-1080x1920.png")).convert("RGB").copy()
px = im.load()
# on efface le bouton PRENDRE ACTE (y 1559..1605) : la carte garde sa boite, l'encre s'arrete plus haut
fond = px[400, 1500]
for y in range(1545, 1600):
    for x in range(388, 698):
        px[x, y] = fond
lis = lisere_h(im, 380, 700, 1440, 1620)
enc = bandes_encre(im, 388, 692, lis[0] + 4, lis[-1] - 3, 40)
gh = enc[0][0] - lis[0]; gb = lis[-1] - (enc[-1][1] - 1)
print(f"   image truquee {im.width}x{im.height} ; garde haute={gh}px, garde basse={gb}px, "
      f"rapport={gb/gh:.2f}")
print(f"   -> attendu DESEQUILIBRE (> 2,0) : {'OK' if gb/gh > 2.0 else 'ECHEC (instrument aveugle au trou)'}")
