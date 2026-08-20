#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
resemblance-probe.py — le juge de RESSEMBLANCE du fond pré-rendu (pivot Blender).
Revue ⊥, 2026-08-20. Posé AVANT le premier rendu du pivot, comme la sonde de
composition l'avait été avant le chunk 1.

POURQUOI PAS SSIM. Le fond EST l'artefact. Toute mesure de similarité globale vaut
≈ 1 par construction : elle mesurerait que le PNG ressemble à lui-même. Les modes
d'échec du pivot ne sont pas des écarts de CONTENU, ce sont des échecs de TRANSPORT
— et ils sont locaux.

LE DISCRIMINANT, MESURÉ (⊥ 2026-08-20, sur DISTRICT_ZO_NUIT_FINAL.png) :

    panne                     MAE arêtes   MAE plats   rapport
    rééchantillonnage ×0,95      5,26        0,06        ~90:1
    ×0,90                        5,80        0,10         58:1
    ×0,75                        7,52        0,21         36:1
    ×0,50                       11,53        0,39         30:1
    brume 5 % par-dessus         1,70        1,16        ~1,5:1

Deux conséquences, et elles commandent la forme de cette sonde :
  (1) un échantillonnage NON pondéré par le gradient sous-déclare le
      rééchantillonnage d'un facteur ~90 (5,26 contre 0,06). Une sonde qui tire au
      hasard tombe à ~90 % sur du plat et rend « parfait » sur une image écrasée de
      5 %. C'est le monde dégénéré de F-transport, et il est chiffré.
  (2) les deux pannes se distinguent par le RAPPORT arêtes/plats : ~90:1 ⇒
      rééchantillonnage ; ~1,5:1 ⇒ un calque teinté par-dessus. Une seule sonde,
      deux diagnostics — c'est ce que rapporte la ligne `diagnostic`.

LES SEUILS SONT DES SÉPARATEURS ENTRE DEUX RÉGIMES MESURÉS, PAS DES VALEURS DE
RÉFÉRENCE. Même discipline que le 1,15 de R2F2 et le 0,35 d'amb-F5 : à recalculer
si l'artefact change de résolution, et à ne jamais lire comme une tolérance
négociée.
  F-transport  MAE_arêtes ≤ 1,00  — la plus petite erreur d'échelle testée (5 %)
                                    coûte déjà 5,26 ; le seuil est au cinquième du
                                    premier défaut détectable.
  F-nocalque   MAE_plats  ≤ 0,50  — la brume à 5 % seule coûte 1,16 ; c'est ce
                                    seuil qui rend l'assertion capable de VOIR un
                                    calque plein cadre.
  F-cadre      échelle == 1,000 (±1 px) et 4 coins présents, OU fraction visible
               DÉCLARÉE en chiffres. L'aspect source (0,5625) contre l'écran
               (1,906) diffère d'un facteur 3,39 : aucun réglage ne l'absorbe,
               c'est une décision de cadrage.

USAGE
  ./resemblance-probe.py --source ART.png --capture CAP.png --rect X,Y,W,H
  ./resemblance-probe.py --selftest          # les 4 contrôles, sans capture

`--rect` = où l'artefact est dessiné DANS la capture, en pixels de capture. Il
s'imprime au moment de la capture (protocole r9, élément 5 : un chiffre
irretrouvable depuis l'artefact s'imprime à la prise). Omis, la sonde exige que
capture et source aient exactement la même taille, sinon elle sort en code 2.

CODES DE SORTIE — « aucun échec » et « aucune exécution » sont DISTINCTS :
  0 = les 3 falsifiables vertes
  1 = au moins une ROUGE (le résultat est un jugement)
  2 = n'a pas pu s'exécuter (fichier absent, rect manquant, 0 pixel comparé)
"""

import argparse
import math
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.stderr.write("resemblance-probe: PIL absent — impossible d'exécuter.\n")
    sys.exit(2)

# ─────────────────────────── PARAMÈTRES GELÉS ───────────────────────────
# Gelés dans le fichier, comme §8-bis. Toute valeur collée dans des notes de chunk
# DOIT voyager avec ce bloc, sinon deux mesures incomparables décideront d'un gate
# (c'est arrivé une fois sur ce chantier : deux sondes de platitude, 26 points
# d'écart, parce que « normalisée à 360 px » ne couvrait qu'une des deux).
LUMA = (0.299, 0.587, 0.114)   # Rec.601 — le même que la sonde de composition
GRAD_STRIDE = 7                # pas d'échantillonnage de la carte de gradient
N_SAMPLES = 3000               # pixels retenus par population (arêtes / plats)
SEUIL_TRANSPORT = 1.00         # MAE max sur les arêtes
SEUIL_NOCALQUE = 0.50          # MAE max sur les plats
RATIO_RESAMPLE = 8.0           # arêtes/plats au-delà ⇒ signature « rééchantillonné »
TOL_ECHELLE_PX = 1             # F-cadre : écart toléré en px sur chaque dimension

# Contrôles positifs — les pannes que la sonde DOIT voir rougir (valeurs ⊥ mesurées)
CTRL_SCALE = 0.95              # attendu : MAE arêtes ≈ 5,26
CTRL_HAZE_RGB = (0.14, 0.20, 0.30)
CTRL_HAZE_A = 0.05             # attendu : MAE plats ≈ 1,16
CTRL_CROP = 0.90               # attendu : F-cadre rouge


def luma(c):
    return LUMA[0] * c[0] + LUMA[1] * c[1] + LUMA[2] * c[2]


def s2l(v):
    a = v / 255.0
    return a / 12.92 if a <= 0.04045 else ((a + 0.055) / 1.055) ** 2.4


def l2s(x):
    x = max(0.0, min(1.0, x))
    return int(round((12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055) * 255))


def populations(src):
    """Les deux populations de pixels de la SOURCE : plus fort gradient, plus plats.

    Déterministe (aucun tirage aléatoire) : le classement du gradient EST le
    tirage. Deux exécutions sur le même artefact rendent le même jeu de pixels,
    donc des MAE comparables d'un rendu à l'autre — condition pour que
    « ça s'améliore » soit une mesure et pas une impression.
    """
    W, H = src.size
    px = src.load()
    grad = []
    for y in range(2, H - 2, GRAD_STRIDE):
        for x in range(2, W - 2, GRAD_STRIDE):
            g = (abs(luma(px[x + 1, y]) - luma(px[x - 1, y]))
                 + abs(luma(px[x, y + 1]) - luma(px[x, y - 1])))
            grad.append((g, x, y))
    if len(grad) < 2 * N_SAMPLES:
        return None, None
    grad.sort(key=lambda t: t[0], reverse=True)
    hi = [(x, y) for _, x, y in grad[:N_SAMPLES]]
    lo = [(x, y) for _, x, y in grad[-N_SAMPLES:]]
    return hi, lo


def mae(src, cap, pts, rect):
    """MAE par canal entre la source et la capture, sur un jeu de pixels SOURCE.

    Le mapping source→capture est le plus proche voisin dans `rect`. Si `rect`
    n'est pas à l'échelle 1:1, ce mapping EST un rééchantillonnage — c'est
    précisément ce que F-transport doit détecter, donc on ne le corrige pas.
    """
    sp, cp = src.load(), cap.load()
    SW, SH = src.size
    rx, ry, rw, rh = rect
    total, n = 0.0, 0
    for x, y in pts:
        cx = rx + int(x * rw / SW)
        cy = ry + int(y * rh / SH)
        if not (0 <= cx < cap.size[0] and 0 <= cy < cap.size[1]):
            continue
        a, b = sp[x, y], cp[cx, cy]
        total += (abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])) / 3.0
        n += 1
    return (total / n if n else None), n


def coins_presents(src, cap, rect):
    """F-cadre : les 4 coins de l'artefact tombent-ils dans la capture ?"""
    SW, SH = src.size
    rx, ry, rw, rh = rect
    CW, CH = cap.size
    coins = [(rx, ry), (rx + rw - 1, ry), (rx, ry + rh - 1), (rx + rw - 1, ry + rh - 1)]
    return sum(1 for cx, cy in coins if 0 <= cx < CW and 0 <= cy < CH)


def juger(src, cap, rect, label, declared_fraction=None):
    W, H = src.size
    hi, lo = populations(src)
    if hi is None:
        print("  n'a pas pu s'exécuter : artefact trop petit pour 2 x %d échantillons" % N_SAMPLES)
        return 2

    m_hi, n_hi = mae(src, cap, hi, rect)
    m_lo, n_lo = mae(src, cap, lo, rect)
    if not n_hi or not n_lo:
        print("  n'a pas pu s'exécuter : 0 pixel comparé (rect hors de la capture ?)")
        return 2

    rx, ry, rw, rh = rect
    d_w, d_h = abs(rw - W), abs(rh - H)
    cadre_ok = (d_w <= TOL_ECHELLE_PX and d_h <= TOL_ECHELLE_PX
                and coins_presents(src, cap, rect) == 4)
    if not cadre_ok and declared_fraction is not None:
        cadre_ok = True  # fraction visible DÉCLARÉE : l'écart est assumé, pas subi

    t_ok = m_hi <= SEUIL_TRANSPORT
    n_ok = m_lo <= SEUIL_NOCALQUE
    ratio = (m_hi / m_lo) if m_lo > 1e-9 else float('inf')

    if t_ok and n_ok:
        diag = "transport intact"
    elif not cadre_ok:
        # Trouvé PAR le contrôle positif de recadrage, pas par relecture : un rect
        # qui ne colle pas à la source décale TOUT le mapping, ce qui gonfle les
        # deux MAE avec un rapport bas — que la règle du ratio lisait « teinte ».
        # Un diagnostic qui nomme la mauvaise panne est pire que pas de diagnostic.
        diag = ("CADRE (rect %dx%d != source %dx%d) — les MAE ci-dessus mesurent le "
                "décalage du mapping, PAS une panne de teinte" % (rw, rh, W, H))
    elif ratio >= RATIO_RESAMPLE:
        diag = "RÉÉCHANTILLONNÉ (signature arêtes/plats %.0f:1)" % ratio
    elif not n_ok:
        diag = "CALQUE PAR-DESSUS (signature arêtes/plats %.1f:1)" % ratio
    else:
        diag = "écart non caractérisé"

    print("  %s" % label)
    print("    F-transport  MAE arêtes = %6.2f   (seuil ≤ %.2f)  %s"
          % (m_hi, SEUIL_TRANSPORT, "VERT" if t_ok else "ROUGE"))
    print("    F-nocalque   MAE plats  = %6.2f   (seuil ≤ %.2f)  %s"
          % (m_lo, SEUIL_NOCALQUE, "VERT" if n_ok else "ROUGE"))
    print("    F-cadre      rect %dx%d vs source %dx%d, coins %d/4%s  %s"
          % (rw, rh, W, H, coins_presents(src, cap, rect),
             "" if declared_fraction is None else " (fraction déclarée %.3f)" % declared_fraction,
             "VERT" if cadre_ok else "ROUGE"))
    print("    diagnostic   %s" % diag)
    print("    RESULT transport=%.3f nocalque=%.3f ratio=%.1f cadre=%d compares=%d/%d"
          % (m_hi, m_lo, ratio, 1 if cadre_ok else 0, n_hi, n_lo))
    return 0 if (t_ok and n_ok and cadre_ok) else 1


# ─────────────────────── CONTRÔLES POSITIFS ET NÉGATIF ───────────────────────
def fabriquer_panne(src, quoi):
    W, H = src.size
    if quoi == "resample":
        return src.resize((int(W * CTRL_SCALE), int(H * CTRL_SCALE)), Image.BILINEAR) \
                  .resize((W, H), Image.BILINEAR), (0, 0, W, H)
    if quoi == "haze":
        out = src.copy()
        sp, op = src.load(), out.load()
        hz = [s2l(CTRL_HAZE_RGB[i] * 255) for i in range(3)]
        for y in range(H):
            for x in range(W):
                c = sp[x, y]
                op[x, y] = tuple(l2s(s2l(c[i]) * (1 - CTRL_HAZE_A) + CTRL_HAZE_A * hz[i])
                                 for i in range(3))
        return out, (0, 0, W, H)
    if quoi == "crop":
        cw, ch = int(W * CTRL_CROP), int(H * CTRL_CROP)
        return src.crop((0, 0, cw, ch)), (0, 0, cw, ch)
    raise ValueError(quoi)


def selftest(source):
    """Les 4 contrôles. Le NÉGATIF est aussi obligatoire que les positifs : une
    sonde qui ne sait que dire ROUGE est aussi inutile qu'une qui ne sait que dire
    VERT. Attendu : identité VERTE, les 3 pannes ROUGES."""
    src = Image.open(source).convert('RGB')
    print("CONTRÔLES — source %s (%dx%d)" % (os.path.basename(source), *src.size))
    print()
    attendus = [("identité (contrôle NÉGATIF — DOIT être vert)", src, (0, 0, *src.size), 0),
                ("rééchantillonnage x%.2f (DOIT rougir F-transport)" % CTRL_SCALE, None, None, 1),
                ("brume %.0f%% (DOIT rougir F-nocalque)" % (CTRL_HAZE_A * 100), None, None, 1),
                ("recadrage x%.2f (DOIT rougir F-cadre)" % CTRL_CROP, None, None, 1)]
    pannes = [None, "resample", "haze", "crop"]
    echecs = 0
    for (label, cap, rect, attendu), panne in zip(attendus, pannes):
        if panne is not None:
            cap, rect = fabriquer_panne(src, panne)
        code = juger(src, cap, rect, label)
        verdict = "OK" if code == attendu else "CONTRÔLE CASSÉ"
        if code != attendu:
            echecs += 1
        print("    -> attendu %d, obtenu %d : %s" % (attendu, code, verdict))
        print()
    print("CONTRÔLES : %d/4 conformes" % (4 - echecs))
    return 0 if echecs == 0 else 2


def main():
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument('--source', default='/home/erutheone/project/mafia-clean-city/'
                                        'projects/mafia_city_game/art_reference/'
                                        'DISTRICT_ZO_NUIT_FINAL.png')
    ap.add_argument('--capture')
    ap.add_argument('--rect', help='X,Y,W,H de l’artefact DANS la capture')
    ap.add_argument('--declare-fraction', type=float, default=None,
                    help='fraction visible assumée — rend F-cadre vert en la DÉCLARANT')
    ap.add_argument('--selftest', action='store_true')
    a = ap.parse_args()

    if not os.path.exists(a.source):
        sys.stderr.write("source introuvable : %s\n" % a.source)
        return 2
    if a.selftest:
        return selftest(a.source)
    if not a.capture:
        sys.stderr.write("ni --capture ni --selftest : rien à juger.\n")
        return 2
    if not os.path.exists(a.capture):
        sys.stderr.write("capture introuvable : %s\n" % a.capture)
        return 2

    src = Image.open(a.source).convert('RGB')
    cap = Image.open(a.capture).convert('RGB')
    if a.rect:
        rect = tuple(int(v) for v in a.rect.split(','))
        if len(rect) != 4:
            sys.stderr.write("--rect attend X,Y,W,H\n")
            return 2
    elif cap.size == src.size:
        rect = (0, 0, *src.size)
    else:
        sys.stderr.write("capture %dx%d != source %dx%d et --rect absent : "
                         "impossible de situer l’artefact. Le rect s’imprime À LA "
                         "CAPTURE (protocole r9, élément 5).\n" % (*cap.size, *src.size))
        return 2

    print("SONDE DE RESSEMBLANCE — source %s / capture %s"
          % (os.path.basename(a.source), os.path.basename(a.capture)))
    return juger(src, cap, rect, "capture", a.declare_fraction)


if __name__ == '__main__':
    sys.exit(main())
