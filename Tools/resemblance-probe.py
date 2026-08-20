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
  ./resemblance-probe.py --selftest          # tous les contrôles, sans capture

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
GRAD_POINTS_FOND = 42196       # points de grille rendus par les gelés sur 1080x1920
SAMPLE_FRACTION = N_SAMPLES / float(GRAD_POINTS_FOND)   # 7,110 % — dérivée, pas choisie
MIN_SAMPLES_POP = 200          # plancher DÉCLARÉ (un choix, pas un séparateur mesuré) :
                               # en dessous, la moyenne est trop bruyante ⇒ code 2, jamais
                               # un chiffre présentable. « Aucune exécution » reste distinct.
CORR_WINDOW = 3                # rayon de recherche d'alignement ENTIER, en px
SEUIL_CORR_HAUTE = 0.90        # au-dessus : la géométrie se superpose à l'entier
SEUIL_CORR_BASSE = 0.70        # en dessous : rien ne se superpose ⇒ GÉOMÉTRIE

# Contrôles positifs — les pannes que la sonde DOIT voir rougir (valeurs ⊥ mesurées)
CTRL_SCALE = 0.95              # attendu : MAE arêtes ≈ 5,26
CTRL_HAZE_RGB = (0.14, 0.20, 0.30)
CTRL_HAZE_A = 0.05             # attendu : MAE plats ≈ 1,16
CTRL_CROP = 0.90               # attendu : F-cadre rouge
CTRL_GAMMA = 1.25              # attendu : corr ~0,997 (ALIGNÉ) + ratio bas ⇒ VALEURS
CTRL_PHASE = 0.5               # attendu : corr ~0,979 (ALIGNÉ) + ratio ~25:1 ⇒ arêtes
CTRL_DECAL_PX = 40             # hors fenêtre ±3 ⇒ attendu : corr ~0,22 ⇒ GÉOMÉTRIE
CTRL_SPRITE = ('Assets/Art/District/Sprites/residentiel3_nuit_base_ppm24.0.png')
                               # sprite RÉEL (196x257, RGBA) — les contrôles à l'échelle
                               # sprite tournent dessus, jamais sur une image fabriquée.


def ouvrir(chemin):
    """Ouvre en conservant l'alpha s'il existe — voir `regime`/`populations`."""
    im = Image.open(chemin)
    return im if im.mode in ('RGB', 'RGBA') else im.convert('RGB')


def luma(c):
    return LUMA[0] * c[0] + LUMA[1] * c[1] + LUMA[2] * c[2]


def s2l(v):
    a = v / 255.0
    return a / 12.92 if a <= 0.04045 else ((a + 0.055) / 1.055) ** 2.4


def l2s(x):
    x = max(0.0, min(1.0, x))
    return int(round((12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055) * 255))


def regime(src):
    """(stride, alpha_mask) — les deux DÉDUITS de l'image, jamais d'un drapeau qu'on oublie.

    Le stride dérivé reproduit GRAD_STRIDE sur l'artefact de référence ; c'est le contrôle
    positif de la formule, et il est vérifié par le self-test."""
    W, H = src.size
    stride = max(1, int(round(math.sqrt(W * H / (1080.0 * 1920.0 / (GRAD_STRIDE ** 2))))))
    masque = False
    if src.mode == 'RGBA':
        masque = src.split()[3].getextrema()[0] != 255
    return stride, masque


def populations(src):
    """Les deux populations de pixels de la SOURCE : plus fort gradient, plus plats.

    Déterministe (aucun tirage aléatoire) : le classement du gradient EST le
    tirage. Deux exécutions sur le même artefact rendent le même jeu de pixels,
    donc des MAE comparables d'un rendu à l'autre — condition pour que
    « ça s'améliore » soit une mesure et pas une impression.
    """
    W, H = src.size
    stride, masque = regime(src)
    rgbsrc = src.convert('RGB') if src.mode != 'RGB' else src
    px = rgbsrc.load()
    ap = src.split()[3].load() if masque else None
    grad = []
    for y in range(2, H - 2, stride):
        for x in range(2, W - 2, stride):
            if ap is not None:
                # voisinage 3x3 entièrement opaque : le gradient lit les voisins ±1, un
                # texel bordant la transparence porte le NOIR de dossier, pas de l'image.
                if any(ap[x + dx, y + dy] != 255 for dy in (-1, 0, 1) for dx in (-1, 0, 1)):
                    continue
            g = (abs(luma(px[x + 1, y]) - luma(px[x - 1, y]))
                 + abs(luma(px[x, y + 1]) - luma(px[x, y - 1])))
            grad.append((g, x, y))
    n = (N_SAMPLES if stride == GRAD_STRIDE and ap is None
         else int(round(SAMPLE_FRACTION * len(grad))))
    if n < MIN_SAMPLES_POP or len(grad) < 2 * n:
        return None, None
    grad.sort(key=lambda t: t[0], reverse=True)
    return [(x, y) for _, x, y in grad[:n]], [(x, y) for _, x, y in grad[-n:]]


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


def pearson(a, b):
    """Corrélation de Pearson. Rend 0,0 si une des deux séries est constante — un
    échantillon sans variance ne PEUT pas corréler, et rendre 1,0 y serait le faux
    positif exact que cette branche existe pour éviter."""
    n = len(a)
    if n < 2:
        return 0.0
    ma, mb = sum(a) / n, sum(b) / n
    va = sum((v - ma) ** 2 for v in a)
    vb = sum((v - mb) ** 2 for v in b)
    if va <= 1e-12 or vb <= 1e-12:
        return 0.0
    return sum((a[i] - ma) * (b[i] - mb) for i in range(n)) / math.sqrt(va * vb)


def correlation_alignee(src, cap, pts, rect):
    """Corrélation maximisée sur les décalages ENTIERS de ±CORR_WINDOW px.

    Sur la population ARÊTES, pas sur une grille uniforme : c'est la même raison qui a
    fait refuser SSIM (§ docstring) — on veut la question posée là où l'information
    vit. MESURÉ : sur la panne de phase, la version pondérée par le gradient rend
    0,9794 contre 0,9897 pour une grille uniforme — la pondérée est la plus SENSIBLE
    des deux, donc c'est elle qu'on garde.

    Rend (r_max, dx, dy). `dx/dy` sont informatifs : un optimum sur le BORD de la
    fenêtre signale que le vrai décalage est plus grand qu'elle."""
    sp, cp = src.load(), cap.load()
    SW, SH = src.size
    CW, CH = cap.size
    rx, ry, rw, rh = rect
    base, cible = [], []
    for x, y in pts:
        base.append(luma(sp[x, y]))
        cible.append((rx + int(x * rw / SW), ry + int(y * rh / SH)))
    best = (-2.0, 0, 0)
    for dy in range(-CORR_WINDOW, CORR_WINDOW + 1):
        for dx in range(-CORR_WINDOW, CORR_WINDOW + 1):
            a, b = [], []
            for i, (cx, cy) in enumerate(cible):
                px_, py_ = cx + dx, cy + dy
                if 0 <= px_ < CW and 0 <= py_ < CH:
                    a.append(base[i])
                    b.append(luma(cp[px_, py_]))
            if len(a) < len(pts) // 2:
                continue
            r = pearson(a, b)
            if r > best[0]:
                best = (r, dx, dy)
    return best


def classe_corr(r):
    if r >= SEUIL_CORR_HAUTE:
        return "ALIGNÉ"
    if r < SEUIL_CORR_BASSE:
        return "GÉOMÉTRIE"
    return "INDÉTERMINÉ"


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
        st, mq = regime(src)
        print("  n'a pas pu s'exécuter : trop peu de points exploitables "
              "(stride %d, masque alpha %s, plancher %d par population)"
              % (st, "OUI" if mq else "non", MIN_SAMPLES_POP))
        return 2, "INEXÉCUTABLE"

    m_hi, n_hi = mae(src, cap, hi, rect)
    m_lo, n_lo = mae(src, cap, lo, rect)
    if not n_hi or not n_lo:
        print("  n'a pas pu s'exécuter : 0 pixel comparé (rect hors de la capture ?)")
        return 2, "INEXÉCUTABLE"

    rx, ry, rw, rh = rect
    d_w, d_h = abs(rw - W), abs(rh - H)
    cadre_ok = (d_w <= TOL_ECHELLE_PX and d_h <= TOL_ECHELLE_PX
                and coins_presents(src, cap, rect) == 4)
    if not cadre_ok and declared_fraction is not None:
        cadre_ok = True  # fraction visible DÉCLARÉE : l'écart est assumé, pas subi

    t_ok = m_hi <= SEUIL_TRANSPORT
    n_ok = m_lo <= SEUIL_NOCALQUE
    ratio = (m_hi / m_lo) if m_lo > 1e-9 else float('inf')
    r_corr, r_dx, r_dy = correlation_alignee(src, cap, hi, rect)
    cls = classe_corr(r_corr)

    if t_ok and n_ok:
        diag = "transport intact"
    elif not cadre_ok:
        # Trouvé PAR le contrôle positif de recadrage, pas par relecture : un rect
        # qui ne colle pas à la source décale TOUT le mapping, ce qui gonfle les
        # deux MAE avec un rapport bas — que la règle du ratio lisait « teinte ».
        # Un diagnostic qui nomme la mauvaise panne est pire que pas de diagnostic.
        diag = ("CADRE (rect %dx%d != source %dx%d) — les MAE ci-dessus mesurent le "
                "décalage du mapping, PAS une panne de teinte" % (rw, rh, W, H))
    elif cls == "GÉOMÉTRIE":
        diag = ("GÉOMÉTRIE (corr %.4f < %.2f au meilleur alignement %+d%+d — rien ne se "
                "superpose ; les MAE ne mesurent PAS une teinte)" % (r_corr, SEUIL_CORR_BASSE, r_dx, r_dy))
    elif ratio >= RATIO_RESAMPLE:
        diag = ("RÉÉCHANTILLONNÉ (signature arêtes/plats %.0f:1 ; corr %.4f ⇒ aligné à "
                "l'entier, dommage confiné aux ARÊTES : échelle OU phase sous-pixel)"
                % (ratio, r_corr))
    elif not n_ok:
        diag = ("VALEURS / CALQUE PAR-DESSUS (signature arêtes/plats %.1f:1 ; corr %.4f "
                "⇒ la géométrie se superpose, ce sont les VALEURS qui bougent)" % (ratio, r_corr))
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
    _st, _mq = regime(src)
    print("    régime       stride %d (%s), masque alpha %s, N = %d par population"
          % (_st, "gelé" if _st == GRAD_STRIDE and not _mq else "dérivé",
             "OUI" if _mq else "non", len(hi)))
    print("    corrélation  r = %.4f au meilleur alignement (%+d,%+d)  seuils %.2f/%.2f  -> %s"
          % (r_corr, r_dx, r_dy, SEUIL_CORR_BASSE, SEUIL_CORR_HAUTE, cls))
    print("    diagnostic   %s" % diag)
    print("    RESULT transport=%.3f nocalque=%.3f ratio=%.1f cadre=%d corr=%.4f "
          "dxy=%+d%+d classe=%s compares=%d/%d"
          % (m_hi, m_lo, ratio, 1 if cadre_ok else 0, r_corr, r_dx, r_dy, cls, n_hi, n_lo))
    return 0 if (t_ok and n_ok and cadre_ok) else 1, cls


# ─────────────────────── CONTRÔLES POSITIFS ET NÉGATIF ───────────────────────
def fabriquer_panne(src, quoi):
    W, H = src.size
    if quoi == "resample":
        return src.resize((int(W * CTRL_SCALE), int(H * CTRL_SCALE)), Image.BILINEAR) \
                  .resize((W, H), Image.BILINEAR), (0, 0, W, H)
    if quoi == "haze":
        src = src.convert('RGB')
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
    if quoi == "gamma":
        # panne de VALEURS pure : transformation MONOTONE, donc la géométrie est intacte
        lut = [min(255, int(round(255 * ((v / 255.0) ** (1.0 / CTRL_GAMMA))))) for v in range(256)]
        return src.point(lut * len(src.getbands())), (0, 0, W, H)
    if quoi == "phase":
        # panne de GÉOMÉTRIE SOUS-PIXEL : décalage bilinéaire d'une fraction de pixel.
        # C'est la panne que le pivot « fond pré-rendu » a réellement rencontrée, et la
        # sonde n'en avait AUCUN contrôle avant ce round.
        return src.transform(src.size, Image.AFFINE, (1, 0, 0, 0, 1, CTRL_PHASE),
                             resample=Image.BILINEAR), (0, 0, W, H)
    if quoi == "translation":
        # panne de GÉOMÉTRIE GROSSIÈRE : décalage HORS de la fenêtre de recherche.
        return src.transform(src.size, Image.AFFINE, (1, 0, -CTRL_DECAL_PX, 0, 1, 0),
                             resample=Image.BILINEAR), (0, 0, W, H)
    raise ValueError(quoi)


def selftest(source):
    """Les 4 contrôles. Le NÉGATIF est aussi obligatoire que les positifs : une
    sonde qui ne sait que dire ROUGE est aussi inutile qu'une qui ne sait que dire
    VERT. Attendu : identité VERTE, les 3 pannes ROUGES."""
    src = ouvrir(source)
    print("CONTRÔLES — source %s (%dx%d)" % (os.path.basename(source), *src.size))
    print()
    attendus = [("identité (contrôle NÉGATIF — DOIT être vert)", src, (0, 0, *src.size), 0, "ALIGNÉ"),
                ("rééchantillonnage x%.2f (DOIT rougir F-transport)" % CTRL_SCALE, None, None, 1, "ALIGNÉ"),
                ("brume %.0f%% (DOIT rougir F-nocalque)" % (CTRL_HAZE_A * 100), None, None, 1, "ALIGNÉ"),
                ("recadrage x%.2f (DOIT rougir F-cadre)" % CTRL_CROP, None, None, 1, None),
                ("gamma %.2f (VALEURS — DOIT rester ALIGNÉ)" % CTRL_GAMMA, None, None, 1, "ALIGNÉ"),
                ("phase sous-pixel %.2f px (DOIT rester ALIGNÉ, ratio >= %.0f:1)"
                 % (CTRL_PHASE, RATIO_RESAMPLE), None, None, 1, "ALIGNÉ"),
                ("translation %d px (DOIT tomber en GÉOMÉTRIE)" % CTRL_DECAL_PX, None, None, 1, "GÉOMÉTRIE")]
    pannes = [None, "resample", "haze", "crop", "gamma", "phase", "translation"]
    echecs = 0
    for (label, cap, rect, attendu, cls_att), panne in zip(attendus, pannes):
        if panne is not None:
            cap, rect = fabriquer_panne(src, panne)
        code, cls = juger(src, cap, rect, label)
        ok = (code == attendu) and (cls_att is None or cls == cls_att)
        if not ok:
            echecs += 1
        print("    -> attendu code %d / classe %s, obtenu code %d / classe %s : %s"
              % (attendu, cls_att if cls_att else "(libre)", code, cls,
                 "OK" if ok else "CONTRÔLE CASSÉ"))
        print()
    n = len(pannes)

    # ── contrôle du RÉGIME DÉRIVÉ : la formule doit reproduire la constante gelée ──
    st_fond, _ = regime(src)
    ok_formule = (st_fond == GRAD_STRIDE)
    n += 1
    if not ok_formule:
        echecs += 1
    print("  formule de stride sur l'artefact de référence : %d (gelé %d) : %s"
          % (st_fond, GRAD_STRIDE, "OK" if ok_formule else "CONTRÔLE CASSÉ"))
    print()

    # ── contrôle « trop petit » : DOIT rendre le code 2, JAMAIS 1 (le bug du round 4) ──
    petit = src.crop((0, 0, 24, 24))
    code, cls = juger(petit, petit, (0, 0, 24, 24), "artefact 24x24 (DOIT rendre le code 2)")
    ok_petit = (code == 2 and cls == "INEXÉCUTABLE")
    n += 1
    if not ok_petit:
        echecs += 1
    print("    -> attendu code 2 / INEXÉCUTABLE, obtenu code %d / %s : %s"
          % (code, cls, "OK" if ok_petit else "CONTRÔLE CASSÉ"))
    print()

    # ── contrôles à l'échelle SPRITE, sur le sprite RÉEL (jamais une image fabriquée) ──
    if os.path.exists(CTRL_SPRITE):
        spr = Image.open(CTRL_SPRITE)
        print("  ÉCHELLE SPRITE — %s (%dx%d, %s)"
              % (os.path.basename(CTRL_SPRITE), spr.size[0], spr.size[1], spr.mode))
        srgb = spr.convert('RGB')
        attendus_s = [("identité", None, 0, "ALIGNÉ"),
                      ("gamma %.2f" % CTRL_GAMMA, "gamma", 1, "ALIGNÉ"),
                      ("phase sous-pixel %.2f px" % CTRL_PHASE, "phase", 1, "ALIGNÉ"),
                      ("translation %d px" % CTRL_DECAL_PX, "translation", 1, "GÉOMÉTRIE"),
                      ("brume %.0f%%" % (CTRL_HAZE_A * 100), "haze", 1, "ALIGNÉ")]
        for label, panne, att, cls_att in attendus_s:
            cap = srgb if panne is None else fabriquer_panne(srgb, panne)[0]
            code, cls = juger(spr, cap, (0, 0, *spr.size), "  sprite / " + label)
            ok = (code == att) and (cls == cls_att)
            n += 1
            if not ok:
                echecs += 1
            print("    -> attendu code %d / %s, obtenu code %d / %s : %s"
                  % (att, cls_att, code, cls, "OK" if ok else "CONTRÔLE CASSÉ"))
            print()
    else:
        n += 1
        echecs += 1
        print("  ÉCHELLE SPRITE : NON EXÉCUTÉE — %s introuvable. Ce n'est PAS un succès :"
              " le compte ci-dessous le porte comme un échec." % CTRL_SPRITE)
        print()

    print("CONTRÔLES : %d/%d conformes" % (n - echecs, n))
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

    # NE PAS convertir en RGB ici : `regime()` a besoin du canal alpha pour décider du
    # masque. Une conversion en amont rendrait le masque MORT-NÉ tout en laissant la
    # sortie parfaitement plausible (trouvé exactement comme ça, round 5).
    src = ouvrir(a.source)
    cap = ouvrir(a.capture)
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
    code, _ = juger(src, cap, rect, "capture", a.declare_fraction)
    return code


if __name__ == '__main__':
    sys.exit(main())
