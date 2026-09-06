#!/usr/bin/env python3
"""Dérive le jeu d'icônes Android depuis une image générée, sous un RÉGIME DÉCLARÉ, et le prouve.

Deux dispositions possibles, et la garde ne vaut que pour celle qu'on DÉCLARE :
  --disposition sujet-en-fond   : fond = image opaque entière, avant-plan ENTIÈREMENT transparent ;
  --disposition sujet-en-avant  : avant-plan = le sujet détouré (alpha), fond = ciel/sol seuls.

Leçon du 2026-09-06 (revue de l'APK par l'orchestration) : la première version mesurait la boîte
du sujet dans la couche où l'image vivait et rendait « 0 % hors zone sûre », sans asserter QUELLE
couche portait le sujet — un avant-plan vide satisfait trivialement « rien ne dépasse ». Ici :
  1. plancher anti-vacuité AVANT toute mesure : la couche déclarée porteuse doit contenir de l'encre
     (sujet-en-avant : alpha>0 sur ≥ 3 % des pixels ; sujet-en-fond : fond opaque à 100 %) ;
  2. régime asserté dans les deux sens (sujet-en-fond exige un avant-plan à 0 pixel opaque) ;
  3. boîte englobante du sujet, MESURÉE sur la source, confrontée au cercle sûr (66 dp sur 108) ;
  4. contrôles exécutés à chaque run, avant d'écrire : (P1) la découpe brute doit rougir sur la boîte ;
     (P2) un avant-plan vide doit rougir sur le plancher ; (N1) un avant-plan à 1 pixel opaque hors
     cercle doit rendre une part ≠ 0.

usage : icone-android.py <source.png> <dossier> --disposition sujet-en-fond
        icone-android.py <source.png> <dossier> --disposition sujet-en-avant --avant-detoure <matte.png>
  5. (P3) un avant-plan bâti sur un seuil « pixels ≠ ciel » doit rougir sur le taux de remplissage de sa
     boîte (< 0,5) : c'est le défaut livré le 2026-09-06 en première proposition (conteneurs sombres
     confondus avec la nuit, 3,8 % d'opaque, « présent, aux bonnes couleurs, et le mauvais dessin »).
"""
import argparse
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

ZONE_SURE = 288 / 432          # 66 dp / 108 dp
TOLERANCE = 0.002              # part des pixels du sujet tolérée hors cercle (frange d'anti-crénelage)
PLANCHER_AVANT = 0.03          # part minimale de pixels opaques dans un avant-plan déclaré porteur
PLANCHER_REMPLISSAGE = 0.5     # part minimale d'opaque DANS la boîte du sujet (un sujet à trous rend ~0,2)


def masque_sujet(im: Image.Image, fenetre=(200, 0, 830, 880)) -> Image.Image:
    """Pixels qui s'écartent du ciel, hors marges de pluie et hors sol — le SUJET, mesuré une fois."""
    rgb = im.convert("RGB")
    ciel = rgb.crop((40, 40, 120, 120)).resize((1, 1), Image.BOX).getpixel((0, 0))
    diff = ImageChops.difference(rgb, Image.new("RGB", rgb.size, ciel)).convert("L")
    diff = diff.point(lambda v: 255 if v > 45 else 0)
    m = Image.new("L", im.size, 0)
    m.paste(diff.crop(fenetre), fenetre[:2])
    return m


def part_hors_cercle(masque: Image.Image) -> float:
    w, h = masque.size
    cx, cy, r2 = w / 2, h / 2, (ZONE_SURE * w / 2) ** 2
    px = masque.load()
    total = dehors = 0
    for y in range(h):
        for x in range(w):
            if px[x, y]:
                total += 1
                if (x - cx) ** 2 + (y - cy) ** 2 > r2:
                    dehors += 1
    return dehors / total if total else 0.0


def part_opaque(im: Image.Image) -> float:
    a = im.getchannel("A").point(lambda v: 255 if v > 0 else 0)
    return a.histogram()[255] / (im.size[0] * im.size[1])


def composer(src: Image.Image):
    """Recentre le sujet et DÉZOOME (réplication des bords) jusqu'à ce que sa boîte tienne dans le cercle."""
    masque = masque_sujet(src)
    x0, y0, x1, y1 = masque.getbbox()
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    diag = ((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5
    cote = max(int(diag / ZONE_SURE * 1.06) + 1, src.size[0])
    w, h = src.size
    marge = cote
    toile = Image.new("RGBA", (w + 2 * marge, h + 2 * marge))
    toile.paste(src, (marge, marge))
    toile.paste(src.crop((0, 0, 1, h)).resize((marge, h)), (0, marge))
    toile.paste(src.crop((w - 1, 0, w, h)).resize((marge, h)), (marge + w, marge))
    toile.paste(toile.crop((0, marge, w + 2 * marge, marge + 1)).resize((w + 2 * marge, marge)), (0, 0))
    toile.paste(toile.crop((0, marge + h - 1, w + 2 * marge, marge + h)).resize((w + 2 * marge, marge)), (0, marge + h))
    gx, gy = int(marge + cx - cote / 2), int(marge + cy - cote / 2)
    boite = (gx, gy, gx + cote, gy + cote)
    m2 = Image.new("L", toile.size, 0)
    m2.paste(masque, (marge, marge))
    return toile.crop(boite), m2.crop(boite), (x0, y0, x1, y1), cote, (marge, boite)


def transporter(couche: Image.Image, transfo) -> Image.Image:
    """Applique à une autre couche (le détourage) exactement le recentrage/dézoom de la source."""
    marge, boite = transfo
    toile = Image.new("RGBA", (couche.size[0] + 2 * marge, couche.size[1] + 2 * marge), (0, 0, 0, 0))
    toile.paste(couche, (marge, marge))
    return toile.crop(boite)


def taux_remplissage(alpha: Image.Image) -> float:
    """Part de pixels opaques DANS la boîte englobante du calque — un sujet à trous rend une valeur basse."""
    op = alpha.point(lambda v: 255 if v > 0 else 0)
    bb = op.getbbox()
    if not bb:
        return 0.0
    return op.histogram()[255] / ((bb[2] - bb[0]) * (bb[3] - bb[1]))


def scinder(image: Image.Image, detoure: Image.Image):
    """Avant-plan = le détourage (modèle de matting, `detourer.py`), transporté comme la source ;
    fond = ciel/sol reconstruits ligne à ligne depuis la colonne gauche (dégradé vertical plat)."""
    avant = detoure
    w, h = image.size
    colonne = image.crop((int(w * 0.04), 0, int(w * 0.04) + 1, h))
    fond = colonne.resize((w, h), Image.NEAREST)
    fond.putalpha(255)
    return avant, fond


def controles(src: Image.Image, compose: Image.Image, masque: Image.Image) -> None:
    """Exécutés AVANT d'écrire. Un contrôle qui ne rougit pas quand il doit rougir arrête tout."""
    brut = part_hors_cercle(masque_sujet(src).resize((432, 432), Image.NEAREST))
    if brut <= TOLERANCE:
        sys.exit(f"P1 RATÉ : la découpe brute passe déjà ({brut:.4f}) — la garde de boîte ne voit rien")
    vide = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
    if part_opaque(vide) >= PLANCHER_AVANT:
        sys.exit("P2 RATÉ : un avant-plan vide passe le plancher anti-vacuité")
    un_pixel = vide.copy()
    un_pixel.putpixel((4, 4), (255, 255, 255, 255))            # hors cercle, coin haut-gauche
    if part_hors_cercle(un_pixel.getchannel("A")) == 0.0:
        sys.exit("N1 RATÉ : un pixel opaque hors cercle rend 0 — la mesure ne lit pas l'alpha")
    print(f"contrôles : P1 brut {brut:.4f} > {TOLERANCE} ✓ · P2 avant vide {part_opaque(vide):.4f} < {PLANCHER_AVANT} ✓ · N1 1 px hors cercle → {part_hors_cercle(un_pixel.getchannel('A')):.2f} ✓")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("source")
    p.add_argument("sortie")
    p.add_argument("--disposition", choices=["sujet-en-fond", "sujet-en-avant"], required=True)
    p.add_argument("--avant-detoure", default=None, help="matte alpha de la source (sortie de detourer.py), requis en sujet-en-avant")
    a = p.parse_args()
    src = Image.open(a.source).convert("RGBA")
    out = Path(a.sortie)
    out.mkdir(parents=True, exist_ok=True)

    compose, masque, bb, cote, transfo = composer(src)
    controles(src, compose, masque)
    # P3 : un avant-plan bâti sur le masque « pixels ≠ ciel » (le défaut du 2026-09-06 : conteneurs sombres
    # confondus avec la nuit) doit ROUGIR sur le taux de remplissage — sinon la garde ne voit pas les trous
    troue = masque.filter(ImageFilter.MaxFilter(5))
    if taux_remplissage(troue) >= PLANCHER_REMPLISSAGE:
        sys.exit(f"P3 RATÉ : le masque à trous passe le plancher de remplissage ({taux_remplissage(troue):.2f})")
    print(f"P3 masque à trous → remplissage {taux_remplissage(troue):.2f} < {PLANCHER_REMPLISSAGE} ✓")

    if a.disposition == "sujet-en-fond":
        fond = compose.copy()
        fond.putalpha(255)
        avant = Image.new("RGBA", compose.size, (0, 0, 0, 0))
        porteuse = masque                                        # le sujet vit dans le fond
    else:
        if not a.avant_detoure:
            sys.exit("sujet-en-avant exige --avant-detoure (matte de detourer.py) — pas de seuil maison")
        det = Image.open(a.avant_detoure).convert("RGBA")
        if det.size != src.size:
            sys.exit(f"le détourage ({det.size}) n'a pas la taille de la source ({src.size})")
        avant, fond = scinder(compose, transporter(det, transfo))
        porteuse = avant.getchannel("A").point(lambda v: 255 if v > 0 else 0)
        rempli = taux_remplissage(avant.getchannel("A"))
        if rempli < PLANCHER_REMPLISSAGE:
            sys.exit(f"avant-plan à trous : remplissage de sa boîte {rempli:.2f} < {PLANCHER_REMPLISSAGE}")

    # 1-2. régime asserté, dans les deux sens
    op_avant = part_opaque(avant.resize((432, 432), Image.LANCZOS))
    if a.disposition == "sujet-en-avant" and op_avant < PLANCHER_AVANT:
        sys.exit(f"avant-plan déclaré porteur mais quasi vide ({op_avant:.4f} < {PLANCHER_AVANT})")
    if a.disposition == "sujet-en-fond" and op_avant != 0.0:
        sys.exit(f"régime sujet-en-fond mais l'avant-plan porte de l'encre ({op_avant:.4f})")
    if fond.getchannel("A").getextrema()[0] != 255:
        sys.exit("le fond n'est pas opaque à 100 % (un trou laisserait voir le launcher)")
    # 3. la couche porteuse tient dans le cercle sûr
    net = part_hors_cercle(porteuse.resize((432, 432), Image.NEAREST))
    if net > TOLERANCE:
        sys.exit(f"sujet hors zone sûre après composition ({net:.4f} > {TOLERANCE})")
    rempli = taux_remplissage(avant.getchannel("A")) if a.disposition == "sujet-en-avant" else float("nan")
    print(f"{a.disposition} : bbox sujet {bb} · toile {cote} px · avant-plan opaque {op_avant:.3f} · remplissage {rempli:.2f} · hors zone sûre {net:.4f}")

    fond.resize((432, 432), Image.LANCZOS).save(out / "icone_adaptive_fond_432.png")
    avant.resize((432, 432), Image.LANCZOS).save(out / "icone_adaptive_avant_432.png")
    plat = Image.alpha_composite(fond, avant)
    for nom in ("icone_legacy_192", "icone_round_192"):
        plat.resize((192, 192), Image.LANCZOS).save(out / f"{nom}.png")
    print("écrit :", ", ".join(q.name for q in sorted(out.glob("icone_*.png"))))


if __name__ == "__main__":
    main()
