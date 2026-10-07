#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""r2 ④ — l'instrument qui décide si une capture JUGEABLE existe.

Le mandat du r2 désigne des planches dans un scratchpad de session qui n'existe plus. Ce script
ne plaide pas l'absence : il mesure, sur les captures qui EXISTENT, si elles portent la signature
AVANT ou APRÈS le lot ④ groupe A (d91447bb, 26/09 10:56) et le diorama de nuit (c8468bca, 11:01).

Trois sondes, chacune sur une propriété que le lot a explicitement changée (dossier.md) :
  S1  la BANDE : « F1 corrigé — plus de bande : le fond peint monte derrière le bandeau ».
      AVANT = une bande plate très sombre sous le filet. APRÈS = de l'art dès le filet.
      Grandeur : écart-type horizontal médian des lignes de la bande (un aplat -> ~0 ; de l'art -> >> 0).
  S2  « LÉGÈRE » : « F17 corrigé — gris chaud éteint ; la couleur est réservée à l'alarme ».
      AVANT = encre cyan (B >> R). APRÈS = gris chaud (R >= B).
      Grandeur : l'encre la plus claire de la fenêtre du mot, et le signe de R-B.
  S3  la PILULE du 1er CTA : « F9 corrigé — pilule en dégradé ficheCtaOrHaut -> ficheCtaOrBas ».
      AVANT = aplat. APRÈS = dégradé vertical. Grandeur : delta de luminance haut/bas de la pilule.

Contrôle POSITIF : la largeur des trois images est 1080 — une grandeur que je SAIS égale.
Contrôle NÉGATIF : S2 comparée sur la RÉFÉRENCE courante, dont je SAIS qu'elle est en gris chaud —
la sonde doit y rendre le signe inverse de celui des captures. Une sonde qui rendrait le même signe
partout ne discrimine pas et ne prouve rien.
"""
import os
from PIL import Image

RACINE = os.path.dirname(os.path.abspath(__file__))
R1 = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r1-2026-09-26'
CLICHE = '/home/erutheone/project/mafia-unity-F/Logs/cliche-parcours'
REF4 = os.path.join(RACINE, '..', 'reference', 'cadre-4-la-suite.png')

IMAGES = [
    ('capture r1 1080x1920', os.path.join(R1, 'captures', 'p1_lancement_1080x1920.png')),
    ('capture r1 1080x2400', os.path.join(R1, 'captures', 'p1_lancement_1080x2400.png')),
    ('capture 072418 1920', os.path.join(CLICHE, '20260926-072418', 'p1_lancement_1080x1920.png')),
    ('reference cadre4 r2', os.path.abspath(REF4)),
]


def ouvrir(chemin):
    im = Image.open(chemin).convert('RGB')
    print('   ouvre %-24s %dx%d  %s' % (os.path.basename(chemin), im.size[0], im.size[1], chemin))
    return im


def mediane(v):
    v = sorted(v)
    return v[len(v) // 2] if v else 0.0


def ecart_type(vals):
    n = len(vals)
    if n < 2:
        return 0.0
    m = sum(vals) / n
    return (sum((x - m) ** 2 for x in vals) / (n - 1)) ** 0.5


def s1_bande(im, y0, y1):
    """Écart-type horizontal médian des lignes [y0,y1) sur toute la largeur, en luminance."""
    px = im.load()
    w = im.size[0]
    ecarts, moys = [], []
    for y in range(y0, min(y1, im.size[1])):
        lum = []
        for x in range(0, w, 4):
            r, g, b = px[x, y]
            lum.append(0.2126 * r + 0.7152 * g + 0.0722 * b)
        ecarts.append(ecart_type(lum))
        moys.append(sum(lum) / len(lum))
    return mediane(ecarts), mediane(moys)


def s2_encre(im, x0, y0, x1, y1):
    """Encre = les 5 % de pixels les plus clairs de la fenêtre ; rend leur RGB moyen."""
    px = im.load()
    pts = []
    for y in range(y0, min(y1, im.size[1])):
        for x in range(x0, min(x1, im.size[0])):
            r, g, b = px[x, y]
            pts.append((0.2126 * r + 0.7152 * g + 0.0722 * b, r, g, b))
    if not pts:
        return None
    pts.sort(reverse=True)
    n = max(1, len(pts) // 20)
    sel = pts[:n]
    return (sum(p[1] for p in sel) / n, sum(p[2] for p in sel) / n, sum(p[3] for p in sel) / n)


def s3_pilule(im, x0, y0, x1, y1):
    """Luminance médiane du tiers HAUT et du tiers BAS de la pilule."""
    px = im.load()
    h = y1 - y0
    def band(a, b):
        lum = []
        for y in range(a, b):
            for x in range(x0, x1, 2):
                r, g, b2 = px[x, y]
                lum.append(0.2126 * r + 0.7152 * g + 0.0722 * b2)
        return mediane(lum)
    return band(y0, y0 + h // 3), band(y1 - h // 3, y1)


def main():
    print('=== images lues ===')
    ims = {}
    for nom, ch in IMAGES:
        if not os.path.exists(ch):
            print('   ABSENT %s' % ch); continue
        ims[nom] = ouvrir(ch)

    print('\n=== CONTROLE POSITIF : largeur attendue 1080 pour toutes ===')
    for nom, im in ims.items():
        print('   %-24s largeur=%d  %s' % (nom, im.size[0], 'OK' if im.size[0] == 1080 else 'KO'))

    print('\n=== S1 la BANDE sous le filet (y 155..225) ===')
    print('   un APLAT -> ecart-type ~0 ; de l ART -> ecart-type eleve')
    for nom in ['capture r1 1080x1920', 'capture r1 1080x2400', 'capture 072418 1920',
                'reference cadre4 r2']:
        if nom not in ims:
            continue
        e, m = s1_bande(ims[nom], 155, 225)
        print('   %-24s ecart-type median=%7.2f   luminance mediane=%6.2f' % (nom, e, m))

    print('\n=== S2 encre de « LEGERE » ===')
    print('   AVANT (cyan) -> B > R ; APRES (gris chaud) -> R > B')
    fen = {
        'capture r1 1080x1920': (60, 1562, 150, 1590),
        'capture r1 1080x2400': (60, 2042, 150, 2070),
        'capture 072418 1920': (60, 1562, 150, 1590),
        'reference cadre4 r2': (88, 1755, 220, 1785),
    }
    for nom, f in fen.items():
        if nom not in ims:
            continue
        c = s2_encre(ims[nom], *f)
        if c is None:
            print('   %-24s fenetre vide' % nom); continue
        print('   %-24s encre RGB=(%5.1f,%5.1f,%5.1f)  R-B=%+6.1f  -> %s'
              % (nom, c[0], c[1], c[2], c[0] - c[2],
                 'gris chaud (APRES)' if c[0] - c[2] > 6 else
                 'cyan (AVANT)' if c[0] - c[2] < -6 else 'indecis'))

    print('\n=== S3 pilule du 1er CTA (degrade vertical) ===')
    pil = {
        'capture r1 1080x1920': (730, 975, 985, 1045),
        'capture 072418 1920': (730, 1005, 985, 1073),
        'reference cadre4 r2': (640, 915, 925, 975),
    }
    for nom, f in pil.items():
        if nom not in ims:
            continue
        haut, bas = s3_pilule(ims[nom], *f)
        print('   %-24s haut=%6.2f  bas=%6.2f  delta=%+6.2f  -> %s'
              % (nom, haut, bas, haut - bas,
                 'degrade' if abs(haut - bas) > 8 else 'aplat'))


if __name__ == '__main__':
    main()
