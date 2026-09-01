#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Planche maquette | capture | diff, côte à côte, en un seul PNG — pour relire un écart d'un
coup d'œil sans ouvrir trois fichiers dans trois onglets.

⛔ CE QUE CET OUTIL NE FAIT PAS : il ne juge rien. Il produit une IMAGE et deux nombres (l'écart
moyen, la boîte englobante de la zone la plus différente) — c'est un instrument, pas un verdict.
Le juge visuel (skill `juge-visuel`) reste la seule instance qui classe un écart en gravité.

⚠️ La capture est redimensionnée à la LARGEUR de la maquette (ratio conservé) : les deux images
sortent d'appareils différents (un navigateur qui rend du CSS, un Play Mode Unity qui rend un
Canvas) et n'ont aucune raison de partager une résolution. Si les HAUTEURS diffèrent après ce
redimensionnement, le diff ne porte que sur le recouvrement commun (aligné en haut) — la zone
hors recouvrement est peinte en noir dans le panneau diff et signalée dans la sortie, jamais
mesurée en silence (même piège que « comparer un rapport internes après normalisation d'échelle »
: un diff qui déborderait tranquillement sur du vide rendrait un écart FAUX, pas absent).

Usage : planche-comparaison.py <maquette.png> <capture.png> <sortie.png>
"""
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFont

BANNIERE_H = 36
MARGE = 6
AMPLIFICATION = 3


def charger_rgb(chemin):
    return Image.open(chemin).convert("RGB")


def police(taille):
    # Aucune dépendance de chemin de police : le défaut PIL est toujours disponible, sur
    # n'importe quelle machine — un outil de mesure ne doit pas échouer faute d'une police système.
    try:
        return ImageFont.truetype("DejaVuSans-Bold.ttf", taille)
    except Exception:
        return ImageFont.load_default()


def redimensionner_a_largeur(img, largeur_cible):
    if img.width == largeur_cible:
        return img
    ratio = largeur_cible / img.width
    hauteur = max(1, round(img.height * ratio))
    return img.resize((largeur_cible, hauteur), Image.LANCZOS)


def diff_gris(a, b):
    """|a-b| moyenné sur les 3 canaux, en une image L (niveaux de gris) — a et b DOIVENT avoir
    la même taille."""
    d = ImageChops.difference(a, b)
    return d.convert("L")


def zone_la_plus_differente(diff_l, cellules=24):
    """Découpe `diff_l` en une grille ~`cellules` de large, trouve la cellule de moyenne
    maximale, puis étend aux cellules voisines dont la moyenne dépasse 50% du pic — une boîte
    englobante CONNEXE plutôt qu'un pixel isolé (un pic à un seul pixel ne dit rien d'une
    "zone"). Pas de numpy : Pillow seul, comme demandé — la grille est un simple `resize` en
    filtre BOX, qui EST une moyenne de bloc.</summary>"""
    w, h = diff_l.size
    gw = max(1, min(cellules, w))
    gh = max(1, round(gw * h / w))
    grille = diff_l.resize((gw, gh), Image.BOX)
    px = grille.load()

    pic = 0
    pic_xy = (0, 0)
    for y in range(gh):
        for x in range(gw):
            if px[x, y] > pic:
                pic = px[x, y]
                pic_xy = (x, y)

    if pic == 0:
        return None  # aucune différence mesurable — pas de zone à désigner

    seuil = pic * 0.5
    connexes = {pic_xy}
    file = [pic_xy]
    while file:
        cx, cy = file.pop()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < gw and 0 <= ny < gh and (nx, ny) not in connexes and px[nx, ny] >= seuil:
                connexes.add((nx, ny))
                file.append((nx, ny))

    xs = [c[0] for c in connexes]
    ys = [c[1] for c in connexes]
    cw, ch = w / gw, h / gh
    return (
        round(min(xs) * cw), round(min(ys) * ch),
        round((max(xs) + 1) * cw), round((max(ys) + 1) * ch),
    )


def composer(maquette_path, capture_path, sortie_path):
    maquette = charger_rgb(maquette_path)
    capture = redimensionner_a_largeur(charger_rgb(capture_path), maquette.width)

    largeur = maquette.width
    h_commun = min(maquette.height, capture.height)
    h_max = max(maquette.height, capture.height)
    deborde = maquette.height != capture.height

    # Le diff ne porte QUE sur le recouvrement — jamais étendu en silence sur du vide.
    diff_commun = diff_gris(maquette.crop((0, 0, largeur, h_commun)),
                             capture.crop((0, 0, largeur, h_commun)))
    diff_pleine = Image.new("L", (largeur, h_max), 0)  # hors recouvrement : NOIR, pas mesuré
    diff_pleine.paste(diff_commun, (0, 0))

    ecart_moyen = sum(diff_commun.getdata()) / (largeur * h_commun)
    bbox = zone_la_plus_differente(diff_commun)

    # Panneau diff AMPLIFIÉ ×3 pour l'image — l'écart moyen imprimé plus bas reste, lui, la
    # valeur BRUTE (amplifier une mesure avant de l'imprimer serait mentir sur le nombre).
    diff_amp = diff_pleine.point(lambda v: min(255, v * AMPLIFICATION))
    diff_rgb = Image.merge("RGB", (diff_amp, diff_amp, diff_amp))

    if bbox is not None:
        draw_bbox = ImageDraw.Draw(diff_rgb)
        draw_bbox.rectangle(bbox, outline=(255, 40, 40), width=3)

    def pad_haut_gauche(img, h):
        if img.height == h:
            return img
        fond = Image.new("RGB", (img.width, h), (40, 40, 44))
        fond.paste(img, (0, 0))
        return fond

    maquette_p = pad_haut_gauche(maquette, h_max)
    capture_p = pad_haut_gauche(capture, h_max)

    planche_w = largeur * 3 + MARGE * 4
    planche_h = BANNIERE_H + h_max + MARGE * 2
    planche = Image.new("RGB", (planche_w, planche_h), (18, 18, 20))

    y0 = BANNIERE_H + MARGE
    for i, (img, titre) in enumerate([
        (maquette_p, f"MAQUETTE ({maquette.width}x{maquette.height})"),
        (capture_p, f"CAPTURE → largeur maquette ({capture.width}x{capture.height})"),
        (diff_rgb, f"DIFF x{AMPLIFICATION}" + (" — zone hors recouvrement en noir" if deborde else "")),
    ]):
        x0 = MARGE + i * (largeur + MARGE)
        planche.paste(img, (x0, y0))
        draw = ImageDraw.Draw(planche)
        draw.text((x0, 8), titre, fill=(230, 230, 235), font=police(14))

    planche.save(sortie_path)
    return ecart_moyen, bbox, deborde, h_commun, h_max


def main():
    if len(sys.argv) != 4:
        print(f"Usage: {sys.argv[0]} <maquette.png> <capture.png> <sortie.png>", file=sys.stderr)
        return 1
    maquette_path, capture_path, sortie_path = sys.argv[1:4]

    ecart_moyen, bbox, deborde, h_commun, h_max = composer(maquette_path, capture_path, sortie_path)

    print(f"planche écrite : {sortie_path}")
    print(f"écart moyen (0-255, sur le recouvrement {h_commun}px de haut) : {ecart_moyen:.3f}")
    if bbox is not None:
        x0, y0, x1, y1 = bbox
        print(f"zone la plus différente (bbox px, dans le repère de la maquette redimensionnée) : "
              f"({x0},{y0})-({x1},{y1}) — {x1 - x0}x{y1 - y0}")
    else:
        print("zone la plus différente : aucune (0 pixel différent sur le recouvrement)")
    if deborde:
        print(f"⚠️ hauteurs différentes après redimensionnement (recouvrement {h_commun}px sur "
              f"{h_max}px de planche) — la zone hors recouvrement est peinte en noir dans le "
              f"panneau diff et N'EST PAS comptée dans l'écart moyen ci-dessus.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
