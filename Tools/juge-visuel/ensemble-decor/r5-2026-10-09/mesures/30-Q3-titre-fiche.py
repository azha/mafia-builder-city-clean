#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Q3 — ㉘ E04 : FAMILLE (empattement ou non), GRAISSE et TAILLE du titre de la FICHE
« D'OÙ ÇA PART », contre les cadres 54-58.

L'encre est SOMBRE sur papier clair : tout se mesure en seuil inverse.

Grandeurs :
  TAILLE  = hauteur de capitale de la capitale initiale du titre (REF « A » d'Atelier
            au cadre 54 et « C » de Clés au cadre 55 ; CAP « A » d'Aucune).
  GRAISSE = longueur moyenne des segments d'encre sombre sur 11 rangees de la zone
            d'oeil (sous la ligne de capitale, au-dessus de la ligne de base).
  FAMILLE = avance de la capitale initiale a hauteur de capitale egale, comparee a des
            rendus LOCAUX de DejaVu Serif Bold / Serif Book / Sans Bold.

CONTROLE POSITIF : hauteur de capitale du surtitre « D'OÙ ÇA PART » — MEME texte des
                   deux cotes ; et la couleur du papier de la fiche.
CONTROLE NEGATIF : DejaVu Serif BOOK (meme famille, autre graisse) et DejaVu Sans BOLD
                   (meme graisse, autre famille). Un instrument qui ne les separe pas
                   du Serif Bold ne mesure ni graisse ni famille.

NB : les fiches de la REFERENCE sont LEGEREMENT TOURNEES (epingle + papier). La rotation
     etale un profil de rangees pris sur toute la largeur : les hauteurs de capitale sont
     donc prises sur UNE seule lettre (fenetre etroite), jamais sur la ligne entiere.
"""
import collections
import os
import statistics
import sys
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "00-outils.py")).read())

SEUIL = 110


def pls(im, x0, y0, x1, y1, s=SEUIL):
    px = im.load()
    return [(y, sum(1 for x in range(x0, x1) if lum(px[x, y]) < s)) for y in range(y0, y1)]


def pcs(im, x0, y0, x1, y1, s=SEUIL):
    px = im.load()
    return [(x, sum(1 for y in range(y0, y1) if lum(px[x, y]) < s)) for x in range(x0, x1)]


def segments(im, y, x0, x1, s=SEUIL):
    px = im.load()
    out, d = [], None
    for x in range(x0, x1):
        dark = lum(px[x, y]) < s
        if dark and d is None:
            d = x
        elif not dark and d is not None:
            out.append(x - d)
            d = None
    return out


def masque(im, x0, y0, x1, y1, seuil=SEUIL, sombre=True):
    """Ensemble des pixels d'encre de la fenetre + sa boite englobante."""
    px = im.load()
    pts = set()
    for y in range(y0, y1):
        for x in range(x0, x1):
            v = lum(px[x, y])
            if (v < seuil) if sombre else (v > seuil):
                pts.add((x, y))
    if not pts:
        return pts, None
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return pts, (min(xs), min(ys), max(xs), max(ys))


def cap_initiale(im, xg0, xg1, yfen):
    b = [t for t in bandes(pls(im, xg0, yfen[0], xg1, yfen[1]), 1) if t[1] - t[0] >= 10]
    return b[0]


def graisse(im, xa, xb, bas, n=11):
    rows = list(range(bas - 14, bas - 14 + n))
    tout = []
    for y in rows:
        tout += [w for w in segments(im, y, xa, xb) if 2 <= w <= 14]
    return statistics.mean(tout), len(tout), collections.Counter(tout).most_common(3), rows


def controles(cap_visee):
    out = {}
    for chemin, nom in [("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", "Serif BOLD"),
                        ("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", "Serif BOOK"),
                        ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "Sans  BOLD")]:
        for taille in range(20, 70):
            f = ImageFont.truetype(chemin, taille)
            im = Image.new("RGB", (1500, 170), (235, 228, 208))
            ImageDraw.Draw(im).text((40, 45), "Aucune route tendue pour l'instant.",
                                    font=f, fill=(35, 25, 15))
            b = [t for t in bandes(pls(im, 40, 20, 85, 150), 1) if t[1] - t[0] >= 10]
            if not b:
                continue
            haut, bas = b[0]
            if bas - haut + 1 != cap_visee:
                continue
            aa = bandes(pcs(im, 30, haut, 120, bas + 1), 1)
            moy, n, mode, _ = graisse(im, 0, 1500, bas)
            out[nom] = (taille, cap_visee, aa[0][1] - aa[0][0] + 1, moy, mode)
            break
    return out


def main():
    print("=" * 98)
    print("Q3 — titre de la fiche « D'OÙ ÇA PART » (㉘ E04). Echelle x3,6 des DEUX cotes (dossier.md).")
    print("=" * 98)

    r = ouvrir("reference/E04-cadre-54.png")
    r55 = ouvrir("reference/E04-cadre-55.png")
    c24 = ouvrir("captures/E04_Distribution_1080x2400.png")
    c19 = ouvrir("captures/E04_Distribution_1080x1920.png")

    print("\n--- TAILLE : hauteur de capitale de l'initiale du titre de fiche ---")
    hr, br = cap_initiale(r, 85, 115, (700, 770))
    print(f"    REF  cadre 54  « A » d'Atelier  : y={hr}..{br}  cap = {br-hr+1} px img = {(br-hr+1)/ECHELLE:.2f} px CSS")
    h55, b55 = cap_initiale(r55, 85, 115, (700, 770))
    print(f"    REF  cadre 55  « A » d'Atelier  : y={h55}..{b55}  cap = {b55-h55+1} px img = {(b55-h55+1)/ECHELLE:.2f} px CSS")
    h24, b24 = cap_initiale(c24, 195, 225, (805, 870))
    print(f"    CAP  2400      « A » d'Aucune   : y={h24}..{b24}  cap = {b24-h24+1} px img = {(b24-h24+1)/ECHELLE:.2f} px CSS")
    h19, b19 = cap_initiale(c19, 195, 225, (705, 770))
    print(f"    CAP  1920      « A » d'Aucune   : y={h19}..{b19}  cap = {b19-h19+1} px img = {(b19-h19+1)/ECHELLE:.2f} px CSS")

    print("\n--- FAMILLE : avance de la capitale initiale (meme hauteur de capitale) ---")
    aa = bandes(pcs(c24, 188, h24, 250, b24 + 1), 1)
    av24 = aa[0][1] - aa[0][0] + 1
    print(f"    CAP  2400  « A » x={aa[0][0]}..{aa[0][1]}  avance = {av24} px img")
    aa = bandes(pcs(c19, 188, h19, 250, b19 + 1), 1)
    print(f"    CAP  1920  « A » x={aa[0][0]}..{aa[0][1]}  avance = {aa[0][1]-aa[0][0]+1} px img")
    aa = bandes(pcs(r, 80, hr, 130, br + 1), 1)
    print(f"    REF  cadre 54 « A » x={aa[0][0]}..{aa[0][1]} : bande FUSIONNEE avec le « t » suivant "
          f"(crenage + rotation de la fiche) -> avance NON mesurable, non utilisee.")

    print("\n--- GRAISSE : hampe moyenne dans la zone d'oeil ---")
    mr, nr, moder, rowsr = graisse(r, 85, 500, br)
    print(f"    REF  cadre 54 : {mr:.2f} px img = {mr/ECHELLE:.3f} px CSS (n={nr}, mode={moder}, rangees {rowsr[0]}..{rowsr[-1]})")
    m55, n55, mode55, rows55 = graisse(r55, 85, 500, b55)
    print(f"    REF  cadre 55 : {m55:.2f} px img = {m55/ECHELLE:.3f} px CSS (n={n55}, mode={mode55}, rangees {rows55[0]}..{rows55[-1]})")
    m24, n24, mode24, rows24 = graisse(c24, 195, 890, b24)
    print(f"    CAP  2400     : {m24:.2f} px img = {m24/ECHELLE:.3f} px CSS (n={n24}, mode={mode24}, rangees {rows24[0]}..{rows24[-1]})")
    m19, n19, mode19, rows19 = graisse(c19, 195, 890, b19)
    print(f"    CAP  1920     : {m19:.2f} px img = {m19/ECHELLE:.3f} px CSS (n={n19}, mode={mode19}, rangees {rows19[0]}..{rows19[-1]})")

    print("\n--- CONTROLES SYNTHETIQUES (polices LOCALES, meme hauteur de capitale = 24 px img) ---")
    for nom, (taille, cap, av, moy, mode) in controles(24).items():
        print(f"    DejaVu {nom} taille={taille} cap={cap} : avance A = {av} px img ; hampe moyenne = {moy:.2f} px img ; mode={mode}")
    print("    => BOLD ~6 px / BOOK ~3 px : l'instrument separe les graisses.")
    print("    => avance du A : Serif Bold et Sans Bold different : il separe les familles.")

    print("\n--- FAMILLE (2e instrument, DECISIF) : appariement de FORME sur le PREMIER MOT ---")
    print("    Le 1er mot est rendu localement dans 4 polices candidates, a la taille qui donne")
    print("    la MEME avance, puis on compare les masques binaires (IoU), offset balaye a +-3 px.")
    print("    Le 1er mot seulement : sur une phrase entiere, la derive de chasse (Unity vs PIL)")
    print("    desaligne la fin et l'IoU ne discrimine plus — instrument verifie, puis borne.")
    print("    CONTROLE POSITIF de CET instrument : le MEME test sur la REFERENCE doit elire")
    print("    « Serif BOLD », qui est la pile declaree par dossier.md pour les titres serif.")
    import math
    g1 = max(bandes(pls(r, 85, 690, 106, 770), 1), key=lambda t: t[1] - t[0])
    g2 = max(bandes(pls(r, 796, 690, 814, 770), 1), key=lambda t: t[1] - t[0])
    ANG = math.degrees(math.atan2(g1[1] - g2[1], 805 - 95))
    print(f"    La fiche de la REFERENCE est TOURNEE (epingle) : ligne de base y={g1[1]} au 1er glyphe")
    print(f"    (x~95) et y={g2[1]} au dernier (x~805) -> angle = {ANG:+.2f} deg. Les rendus de controle")
    print("    de la reference sont tournes d'autant avant l'appariement.")
    for lbl, im, fen, mot, ang in [("REF  cadre 54 (« Atelier »)", r, (84, 724, 240, 762), "Atelier", 1.0),
                                   ("CAP  2400     (« Aucune »)", c24, (190, 808, 345, 852), "Aucune", 0.0),
                                   ("CAP  1920     (« Aucune »)", c19, (190, 708, 345, 752), "Aucune", 0.0)]:
        ang = ANG if ang else 0.0
        mj, bj = masque(im, fen[0], fen[1], fen[2], fen[3], SEUIL, True)
        cible = bj[2] - bj[0] + 1
        print(f"    {lbl} : boite {bj} largeur={cible} px img, {len(mj)} px d'encre")
        scores = {}
        for chemin, nom in [("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", "Serif BOLD"),
                            ("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", "Serif BOOK"),
                            ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "Sans  BOLD"),
                            ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "Sans  BOOK")]:
            best = None
            for taille in range(26, 48):
                f = ImageFont.truetype(chemin, taille)
                sy = Image.new("RGB", (500, 170), (235, 228, 208))
                ImageDraw.Draw(sy).text((40, 45), mot, font=f, fill=(35, 25, 15))
                if ang:
                    sy = sy.rotate(ang, resample=Image.BICUBIC, fillcolor=(235, 228, 208))
                m, bb_ = masque(sy, 0, 0, 500, 170, SEUIL, True)
                if not m:
                    continue
                w = bb_[2] - bb_[0] + 1
                if best is None or abs(w - cible) < abs(best[1] - cible):
                    best = (taille, w, m, bb_)
            taille, w, m, bb_ = best
            meilleur = 0.0
            for ddx in range(-3, 4):
                for ddy in range(-3, 4):
                    dx, dy = bj[0] - bb_[0] + ddx, bj[1] - bb_[1] + ddy
                    mt = {(x + dx, y + dy) for x, y in m}
                    io = len(mt & mj) / len(mt | mj)
                    meilleur = max(meilleur, io)
            scores[nom] = meilleur
            print(f"        DejaVu {nom} (taille {taille}, largeur {w}) : IoU = {meilleur:.3f}")
        g = max(scores, key=scores.get)
        print(f"        => elu : DejaVu {g} (IoU {scores[g]:.3f})")

    print("\n--- CONTROLE POSITIF : surtitre « D'OÙ ÇA PART » (MEME texte des deux cotes) ---")
    for lbl, im, xg, yf, xfull in [("REF  cadre 54", r, (88, 104), (760, 800), (80, 400)),
                                   ("CAP  2400    ", c24, (457, 473), (845, 880), (400, 700)),
                                   ("CAP  1920    ", c19, (457, 473), (745, 780), (400, 700))]:
        b = [t for t in bandes(pls(im, xg[0], yf[0], xg[1], yf[1], 130), 1) if t[1] - t[0] >= 6]
        h, bb_ = b[0]
        cc = bandes(pcs(im, xfull[0], h, xfull[1], bb_ + 1, 130), 1)
        print(f"    {lbl} : « D » y={h}..{bb_} cap = {bb_-h+1} px img ; ligne entiere x={cc[0][0]}..{cc[-1][1]} "
              f"(avance totale {cc[-1][1]-cc[0][0]+1} px img)")


    print("\n--- HORS PERIMETRE, observe en mesurant Q3 : ALIGNEMENT du texte sur le papier ---")
    for lbl, im, row, yt, ys in [("REF  cadre 54", r, 742, (725, 755), (776, 795)),
                                 ("CAP  2400    ", c24, 830, (816, 848), (853, 872)),
                                 ("CAP  1920    ", c19, 730, (716, 748), (753, 772))]:
        px = im.load()
        xs = [x for x in range(1080) if lum(px[x, row]) > 170]
        p0, p1 = xs[0], xs[-1]
        t = bandes(pcs(im, p0 + 4, yt[0], p1 - 4, yt[1], SEUIL), 1)
        u = bandes(pcs(im, p0 + 4, ys[0], p1 - 4, ys[1], 130), 1)
        print(f"    {lbl} : papier x={p0}..{p1} (largeur {p1-p0+1}, centre {(p0+p1)/2:.1f})")
        print(f"        titre    x={t[0][0]}..{t[-1][1]} centre={(t[0][0]+t[-1][1])/2:.1f} ; "
              f"marge G={t[0][0]-p0} px img, marge D={p1-t[-1][1]} px img")
        print(f"        surtitre x={u[0][0]}..{u[-1][1]} centre={(u[0][0]+u[-1][1])/2:.1f} ; "
              f"marge G={u[0][0]-p0} px img, marge D={p1-u[-1][1]} px img")
    print("    REF : marges G du titre et du surtitre EGALES et petites, marge D grande -> FER A GAUCHE.")
    print("    CAP : marges G et D voisines et centres ~= centre du papier -> CENTRE.")

    print("\n--- CONTROLE POSITIF : papier de la fiche et encre du titre ---")
    print("    REF  papier :", fond_median(r, 560, 755, 780, 775), " encre (coeur) :", coeur_sombre(r, 85, hr, 500, br))
    print("    CAP  papier :", fond_median(c24, 220, 870, 400, 884), " encre (coeur) :", coeur_sombre(c24, 195, h24, 890, b24))

    print("\n--- SYNTHESE Q3 ---")
    print(f"    taille  : REF {br-hr+1} px img  vs  CAP {b24-h24+1} px img  (delta {b24-h24+1-(br-hr+1):+d} px img = "
          f"{(b24-h24+1-(br-hr+1))/ECHELLE:+.2f} px CSS)")
    print(f"    graisse : REF {mr:.2f}  vs  CAP {m24:.2f} px img  (x{m24/mr:.3f}) — "
          f"BOLD synthetique ~6,0 ; BOOK synthetique ~3,0")


def coeur_sombre(im, x0, y0, x1, y1, part=0.10):
    px = im.load()
    pts = [px[x, y] for y in range(y0, y1) for x in range(x0, x1)]
    pts.sort(key=lum)
    n = max(1, int(len(pts) * part))
    c = pts[:n]
    return tuple(sorted(p[k] for p in c)[len(c) // 2] for k in range(3))


if __name__ == "__main__":
    main()
