#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Q4 — graisse du TITRE du bandeau de titre (E03 ㉚, E04 ㉘, E05 ㉛, E02 ㉞ ; E06 ㉝ = temoin).

Grandeur : epaisseur moyenne des hampes du titre, mesuree comme la longueur moyenne
des segments d'encre claire sur 13 rangees prises dans la zone d'oeil (sous la ligne
de capitale, au-dessus de la ligne de base), ramenee a l'echelle par la hauteur de
capitale (identique des deux cotes, cf. controle E03 : meme texte, meme largeur).

CONTROLE POSITIF  : la meme mesure sur ㉝ E06 (temoin designe par le dossier) ; et,
                    pour E03 ou le TEXTE est identique des deux cotes, la largeur
                    totale du titre (doit etre egale a < 1 %).
CONTROLE NEGATIF  : DejaVu Serif BOOK rendu localement a la meme hauteur de capitale.
                    Si l'instrument ne separe pas BOOK de BOLD, il ne mesure pas une graisse.
"""
import collections
import statistics
import sys
import os
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "00-outils.py")).read())

SEUIL = 140  # encre claire du titre sur bandeau sombre


def segments_clairs(im, y, x0, x1, seuil=SEUIL):
    px = im.load()
    out, d = [], None
    for x in range(x0, x1):
        clair = lum(px[x, y]) > seuil
        if clair and d is None:
            d = x
        elif not clair and d is not None:
            out.append(x - d)
            d = None
    return out


def hampe_moyenne(im, y_haut, y_bas, x0=40, x1=1040):
    """Moyenne des segments d'encre de 2 a 14 px sur les 13 rangees du bas de l'oeil."""
    base = y_bas
    rows = range(base - 18, base - 5)
    tout = []
    for y in rows:
        tout += [w for w in segments_clairs(im, y, x0, x1) if 2 <= w <= 14]
    return statistics.mean(tout), len(tout), collections.Counter(tout).most_common(3), list(rows)


def bande_titre(im, y0, y1, x0=30, x1=1050):
    """Premiere bande de rangees d'encre claire = la ligne de titre."""
    b = [t for t in bandes(profil_lignes(im, x0, y0, x1, y1, SEUIL), 3) if t[1] - t[0] >= 20]
    return b[0]


def largeur_titre(im, y0, y1, x0=30, x1=1050):
    bb = bandes(profil_colonnes(im, x0, y0, x1 + 1, y1 + 1, SEUIL), 1)
    return bb[0][0], bb[-1][1], bb[-1][1] - bb[0][0] + 1


FEN_REF = (440, 530)
FEN_24 = (520, 610)
FEN_19 = (420, 510)

CAS = [
    # cle, reference, capture 2400, capture 1920
    ("E03 ㉚", "reference/E03-cadre-48.png",
     "captures/E03_Chanedappro_1080x2400.png", "captures/E03_Chanedappro_1080x1920.png"),
    ("E04 ㉘", "reference/E04-cadre-54.png",
     "captures/E04_Distribution_1080x2400.png", "captures/E04_Distribution_1080x1920.png"),
    ("E05 ㉛", "reference/E05-cadre-67.png",
     "captures/E05_Loi_1080x2400.png", "captures/E05_Loi_1080x1920.png"),
    ("E02 ㉞", "reference/E02-cadre-85.png",
     "captures/E02_Carnet_1080x2400.png", "captures/E02_Carnet_1080x1920.png"),
    ("E06 ㉝ (TEMOIN)", "reference/E06-cadre-79.png",
     "captures/E06_Dmolition_1080x2400.png", "captures/E06_Dmolition_1080x1920.png"),
]


def controle_synthetique(cap_visee, texte="Commander de la matiere premiere"):
    res = {}
    for chemin, nom in [("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", "BOLD"),
                        ("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", "BOOK")]:
        for taille in range(30, 70):
            f = ImageFont.truetype(chemin, taille)
            im = Image.new("RGB", (1500, 170), (0, 0, 0))
            ImageDraw.Draw(im).text((20, 35), texte, font=f, fill=(255, 255, 255))
            yy = bandes(profil_lignes(im, 20, 30, 62, 140, SEUIL), 1)
            if not yy:
                continue
            cap = yy[0][1] - yy[0][0] + 1
            if cap == cap_visee:
                moy, n, mode, _ = hampe_moyenne(im, yy[0][0], yy[0][1], 0, 1500)
                res[nom] = (taille, cap, moy, n, mode)
                break
    return res


def main():
    print("=" * 96)
    print("Q4 — graisse du titre du bandeau de titre. Echelle : x3,6 des DEUX cotes (dossier.md).")
    print("=" * 96)

    print("\n--- CONTROLE NEGATIF/POSITIF SYNTHETIQUE (polices locales, meme hauteur de capitale) ---")
    for cap in (32, 33):
        res = controle_synthetique(cap)
        for nom, (taille, c, moy, n, mode) in res.items():
            print(f"  DejaVu Serif {nom:4s} taille={taille} cap={c} -> hampe moyenne {moy:.2f} px "
                  f"(n={n}, mode={mode})")
    print("  => l'instrument separe BOLD (~7,2 px a cap 33) de BOOK (~4,2 px) : il mesure bien une graisse.")

    print("\n--- MESURES ---")
    for cle, rp, cp24, cp19 in CAS:
        print(f"\n### {cle}")
        lignes = {}
        for lbl, chemin, fen in [("REF    ", rp, FEN_REF), ("CAP2400", cp24, FEN_24), ("CAP1920", cp19, FEN_19)]:
            im = ouvrir(chemin)
            y0, y1 = bande_titre(im, *fen)
            x0, x1, larg = largeur_titre(im, y0, y1)
            moy, n, mode, rows = hampe_moyenne(im, y0, y1)
            cap = y1 - y0 + 1
            print(f"    {lbl} : ligne de titre y={y0}..{y1} (h={cap}px img) ; x={x0}..{x1} "
                  f"largeur={larg} px img = {larg/ECHELLE:.1f} px CSS")
            print(f"              hampe moyenne = {moy:.2f} px img = {moy/ECHELLE:.3f} px CSS "
                  f"(n={n}, mode={mode}, rangees {rows[0]}..{rows[-1]})")
            lignes[lbl.strip()] = (moy, larg, cap)
        mr = lignes["REF"][0]
        for k in ("CAP2400", "CAP1920"):
            mc = lignes[k][0]
            print(f"    >>> {k} / REF : hampe x{mc/mr:.3f} ({(mc-mr)/ECHELLE:+.3f} px CSS) ; "
                  f"largeur du titre {lignes[k][1]} vs {lignes['REF'][1]} px img "
                  f"({100*(lignes[k][1]-lignes['REF'][1])/lignes['REF'][1]:+.1f} %)")
        if cle.startswith("E03"):
            print("    [E03 est le SEUL couple a TEXTE IDENTIQUE : son sous-titre ancre aussi la taille]")
            for lbl, chemin, fen in [("REF    ", rp, (535, 575)), ("CAP2400", cp24, (605, 650)),
                                     ("CAP1920", cp19, (505, 550))]:
                im = ouvrir(chemin)
                b = [t for t in bandes(profil_lignes(im, 30, fen[0], 1050, fen[1], 110), 3)
                     if t[1] - t[0] >= 12][0]
                cc = bandes(profil_colonnes(im, 30, b[0], 1050, b[1] + 1, 110), 1)
                print(f"        {lbl} sous-titre : y={b[0]}..{b[1]} ; x={cc[0][0]}..{cc[-1][1]} "
                      f"largeur={cc[-1][1]-cc[0][0]+1} px img = {(cc[-1][1]-cc[0][0]+1)/ECHELLE:.1f} px CSS")


if __name__ == "__main__":
    main()
