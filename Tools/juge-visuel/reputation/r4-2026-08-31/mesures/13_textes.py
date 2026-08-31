#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 3 — les TEXTES : hauteur d'encre (≈ hauteur de capitale pour les
lignes en capitales) ET largeur d'encre de la ligne, en px CSS
(réf /3,0 ; jeu /3,6). La largeur d'encre est ajoutée parce que la chaîne est
identique dans les deux images : elle mesure taille + chasse + interlettrage.

Instrument : dans une fenêtre, « encre » = pixel dont la luminance s'écarte de
plus de 25/255 du fond médian de la fenêtre ; on regroupe les rangées d'encre
en bandes (une bande = une ligne), et on prend la bande la plus haute.

CONTRÔLE POSITIF : « SALVATORE, VOTRE LIEUTENANT » et « lieutenant.name — non
projeté (L0.4) » — deux lignes dont on n'attend aucun écart (le dossier ne
signale aucun changement de gabarit dans la carte) : elles doivent sortir à
±5 %. Elles servent d'étalon aux autres lignes.
CONTRÔLE NÉGATIF : la même fenêtre posée sur un aplat sans texte doit rendre
0 bande — sinon le seuil d'encre attrape le bruit et toutes les hauteurs sont
fausses.
"""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r4-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def bandes(im, box, seuil=25, minpx=3):
    px = im.load()
    x0, y0, x1, y1 = box
    fonds = sorted(lum(px[x, y]) for y in range(y0, y1, 3) for x in range(x0, x1, 3))
    fond = fonds[len(fonds) // 2]
    marque = []
    for y in range(y0, y1):
        xs = [x for x in range(x0, x1) if abs(lum(px[x, y]) - fond) > seuil]
        marque.append(xs if len(xs) >= minpx else [])
    out, deb = [], None
    for i, xs in enumerate(marque):
        if xs and deb is None:
            deb = i
        elif not xs and deb is not None:
            out.append((deb, i - 1)); deb = None
    if deb is not None:
        out.append((deb, len(marque) - 1))
    res = []
    for a, b in out:
        if b - a < 2:
            continue
        allx = [x for i in range(a, b + 1) for x in marque[i]]
        res.append((y0 + a, y0 + b, min(allx), max(allx)))
    return res


ZONES = [
    ("titre « Le miroir »",              (150, 415, 760, 480),  (180, 60, 920, 145)),
    ("sous-titre, 1re ligne (capitales)",(120, 488, 790, 512),  (150, 152, 940, 182)),
    ("chiffre « 00 » compteur 1",        (100, 592, 250, 652),  (130, 268, 290, 335)),
    ("libellé « RÈGLES DONNÉES »",       (60, 652, 290, 674),   (70, 338, 340, 368)),
    ("« SALVATORE… » [CTRL+] 1re ligne", (90, 755, 400, 782),   (95, 452, 480, 480)),
    ("titre « Pas encore jugeable » l.1",(450, 738, 645, 778),  (525, 438, 770, 480)),
    ("libellé voyant « col ouvert »",    (515, 848, 830, 882),  (605, 550, 1000, 588)),
    ("sous-libellé « la comptabilité… »",(515, 882, 830, 902),  (605, 588, 1000, 612)),
    ("« Il vous écoute »",               (95, 1192, 400, 1226), (95, 962, 480, 1004)),
    ("mention (L0.4) [CTRL+]",           (95, 1232, 400, 1254), (95, 1010, 480, 1036)),
    ("sur-titre verdict (capitales)",    (70, 1392, 850, 1416), (78, 1425, 1040, 1460)),
    ("titre « Rien n'a encore déteint »",(70, 1424, 850, 1476), (78, 1466, 1040, 1522)),
    ("corps du verdict, 1re ligne",      (70, 1486, 850, 1520), (78, 1532, 1040, 1568)),
    ("CTA « DONNER UNE PREMIÈRE RÈGLE »",(120, 1642, 800, 1690),(150, 1716, 980, 1774)),
]


def main():
    ref = Image.open(REF).convert("RGB")
    cap = Image.open(CAP).convert("RGB")
    print(f"REF {REF} {ref.size}   CAP {CAP} {cap.size}")
    print(f"{'texte':36s} | {'h réf':>6} {'h jeu':>6} {'Δh':>7} | "
          f"{'l réf':>6} {'l jeu':>6} {'Δl':>7}   (CSS)")
    for lib, br, bc in ZONES:
        ar, ac = bandes(ref, br), bandes(cap, bc)
        if not ar or not ac:
            print(f"{lib:36s} |  bandes réf={len(ar)} jeu={len(ac)} — non mesurable")
            continue
        a = max(ar, key=lambda t: t[1] - t[0])
        b = max(ac, key=lambda t: t[1] - t[0])
        hr, hc = (a[1] - a[0] + 1) / 3.0, (b[1] - b[0] + 1) / 3.6
        lr, lc = (a[3] - a[2] + 1) / 3.0, (b[3] - b[2] + 1) / 3.6
        print(f"{lib:36s} | {hr:6.1f} {hc:6.1f} {100*(hc-hr)/hr:>+6.1f}% | "
              f"{lr:6.1f} {lc:6.1f} {100*(lc-lr)/lr:>+6.1f}%")
    print("\n[ctrl négatif] fenêtre dans un aplat sans texte :")
    print("   réf (200,1300)-(400,1330) :", bandes(ref, (200, 1300, 400, 1330)))
    print("   jeu (200,1150)-(400,1180) :", bandes(cap, (200, 1150, 400, 1180)))


main()
