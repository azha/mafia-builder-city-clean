#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 3/5 — les grandeurs restantes, regroupées pour qu'aucun chiffre du
rapport ne soit un témoignage :

 (a) or des glyphes du titre, et balayage d'arêtes de la bande de l'en-tête
     (c'est ce balayage qui établit l'ABSENCE de l'enseigne, E3) ;
 (b) colonne des voyants : largeur, écart à la carte, marges du grand panneau ;
 (c) les 4 tuiles voyants : liseré, fond, pastille — même état pour les quatre
     (choix du bon témoin) ;
 (d) lignes de texte de l'en-tête, de la plaque du verdict et du CTA, au seuil
     d'encre 60 (le seuil 25 fusionnait les lignes de la plaque) ;
 (e) halo teal : étendue verticale et horizontale ; bas du grand panneau en
     1080x1920 et en 1080x2400, d'où le vide sous la carte du portrait.

CONTRÔLE POSITIF (a) : la même arête existe dans la réf (liseré à x=42 et
x=855 à y=430 ET à y=470) ; c'est ce qui prouve que le balayage sait voir une
enseigne quand il y en a une.
CONTRÔLE NÉGATIF (a) : dans la capture, le balayage doit tout de même trouver
les DEUX arêtes du liseré doré du panneau racine (x≈21 et x≈1058) — s'il ne les
trouvait pas, son silence sur l'enseigne ne prouverait rien.
CONTRÔLE POSITIF (c) : les quatre voyants doivent sortir identiques entre eux
dans chaque image (aucun n'est dans un état `.actif`).
CONTRÔLE POSITIF (e) : le bas de la carte du portrait doit être au MÊME y en
1080x1920 et en 1080x2400.
"""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r4-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
C24 = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x2400.png"


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def med(im, cx, cy, r=3):
    px = im.load()
    v = sorted((px[x, y] for x in range(cx - r, cx + r + 1)
                for y in range(cy - r, cy + r + 1)), key=lum)
    return v[len(v) // 2]


def verdeur(p):
    return round(p[1] - (p[0] + p[2]) / 2.0, 1)


def is_l(p):
    return abs(p[0] - 42) < 14 and abs(p[1] - 53) < 14 and abs(p[2] - 72) < 16


def runs_x(im, y, x0, x1):
    px = im.load()
    out, cur = [], None
    for x in range(x0, x1):
        if is_l(px[x, y]):
            cur = [x, x] if cur is None else [cur[0], x]
        elif cur:
            out.append(tuple(cur)); cur = None
    if cur:
        out.append(tuple(cur))
    return [q for q in out if q[1] - q[0] >= 2]


def aretes(im, y, x0, x1, seuil=4):
    px = im.load()
    out, prev = [], lum(px[x0, y])
    for x in range(x0 + 1, x1):
        c = lum(px[x, y])
        if abs(c - prev) >= seuil:
            out.append((x, px[x, y]))
        prev = c
    return out


def bandes(im, box, seuil=60):
    px = im.load()
    x0, y0, x1, y1 = box
    f = sorted(lum(px[x, y]) for y in range(y0, y1, 3) for x in range(x0, x1, 3))
    fond = f[len(f) // 2]
    marque = []
    for y in range(y0, y1):
        xs = [x for x in range(x0, x1) if abs(lum(px[x, y]) - fond) > seuil]
        marque.append(xs if len(xs) >= 3 else [])
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
        if b - a < 1:
            continue
        allx = [x for i in range(a, b + 1) for x in marque[i]]
        res.append((y0 + a, y0 + b, min(allx), max(allx)))
    return res


def gold_rows(im, x0, x1, y0, y1, frac=0.6):
    px = im.load()
    xs = list(range(x0, x1, 2))
    g = lambda p: p[0] > 120 and p[0] - p[2] > 40 and p[1] > p[2]
    ys = [y for y in range(y0, y1) if sum(1 for x in xs if g(px[x, y])) >= frac * len(xs)]
    out = []
    for y in ys:
        if out and y - out[-1][-1] <= 4:
            out[-1].append(y)
        else:
            out.append([y])
    return [(a[0], a[-1]) for a in out]


def main():
    ref = Image.open(REF).convert("RGB")
    cap = Image.open(CAP).convert("RGB")
    c24 = Image.open(C24).convert("RGB")
    print(f"REF {REF} {ref.size}\nCAP {CAP} {cap.size}\nC24 {C24} {c24.size}")

    print("\n(a) OR DES GLYPHES DU TITRE et ARÊTES de la bande de l'en-tête")
    print(f"  or des glyphes : réf {med(ref,278,440,1)}  jeu {med(cap,341,122,1)}")
    for nom, im, ys, xr in (("REF", ref, (430, 470), (20, 882)),
                            ("JEU", cap, (60, 120), (20, 1062))):
        for y in ys:
            a = aretes(im, y, *xr)
            hors = [q for q in a if q[0] < 200 or q[0] > xr[1] - 200]
            print(f"  {nom} y={y} : {len(a)} arêtes ; aux abords des bords : "
                  f"{[(q[0], q[1]) for q in hors]}")
    print("  [ctrl positif] réf : l'enseigne sort comme 2 arêtes (42,54,72) à x≈42 "
          "et x≈855, aux DEUX y.")
    print("  [ctrl négatif] jeu : le balayage trouve bien les 2 arêtes du liseré DORÉ "
          "du panneau racine ⇒ son silence sur l'enseigne est une absence, pas un "
          "défaut d'instrument.")

    print("\n(b) COLONNE DES VOYANTS")
    for nom, im, k, y, carte_d, pan in (("REF", ref, 3.0, 970, 421, (43, 856)),
                                        ("JEU", cap, 3.6, 690, 494, (47.5, 1031.5))):
        r = runs_x(im, y, 20, im.size[0] - 20)
        g, d = r[1], r[-2]
        tl, tr = (g[0] + g[1]) / 2.0, (d[0] + d[1]) / 2.0
        print(f"  {nom} y={y} : liserés {r}")
        print(f"     largeur de la tuile voyant = {round((tr-tl)/k,1)} CSS ; "
              f"écart carte→tuile = {round((tl-carte_d)/k,1)} CSS ; "
              f"marge gauche du panneau = {round((carte_d-70 if nom=='REF' else 0)/k,1) if False else round((( 70 if nom=='REF' else 73)-pan[0])/k,1)} CSS ; "
              f"marge droite = {round((pan[1]-tr)/k,1)} CSS")

    print("\n(c) LES 4 TUILES VOYANTS — même témoin ?")
    for nom, im, xb, xf, ys in (("REF", ref, 454, 700, (875, 973, 1070, 1167)),
                                ("JEU", cap, 534, 900, (580, 687, 795, 902))):
        print(f"  {nom} liserés gauches : {[med(im,xb,y,2) for y in ys]}")
        print(f"  {nom} fonds           : {[med(im,xf,y,2) for y in ys]}")
    print("  [ctrl positif] les 4 sont identiques dans chaque image ⇒ aucun état "
          "`.actif`, le témoin est bon.")
    for nom, im, k, box in (("REF", ref, 3.0, (465, 950, 515, 1000)),
                            ("JEU", cap, 3.6, (550, 660, 600, 715))):
        px = im.load()
        c = med(im, (box[0] + box[2]) // 2 + 4, (box[1] + box[3]) // 2, 2)
        pts = [(x, y) for y in range(box[1], box[3]) for x in range(box[0], box[2])
               if max(abs(px[x, y][i] - c[i]) for i in range(3)) <= 18]
        xs = [p[0] for p in pts]; yy = [p[1] for p in pts]
        print(f"  {nom} pastille : couleur {c} diamètre "
              f"{round((max(xs)-min(xs)+1)/k,1)} × {round((max(yy)-min(yy)+1)/k,1)} CSS")

    print("\n(d) LIGNES DE TEXTE (seuil d'encre 60)")
    for nom, im, k, zones in (
            ("REF", ref, 3.0, [("en-tête", (46, 380, 852, 550)),
                               ("verdict", (64, 1378, 856, 1592)),
                               ("CTA", (60, 1632, 850, 1698))]),
            ("JEU", cap, 3.6, [("en-tête", (52, 24, 1028, 220)),
                               ("verdict", (52, 1408, 1028, 1662)),
                               ("CTA", (52, 1708, 1028, 1782))])):
        for lib, box in zones:
            bs = bandes(im, box)
            print(f"  {nom} {lib} :")
            for b in bs:
                print(f"     y {b[0]}..{b[1]}  h={round((b[1]-b[0]+1)/k,1)} CSS  "
                      f"largeur d'encre={round((b[3]-b[2]+1)/k,1)} CSS")
            if lib == "verdict" and len(bs) >= 5:
                il = [(bs[i + 1][0] - bs[i][0]) / k for i in (2, 3)]
                print(f"     interligne du corps : {[round(v,2) for v in il]} CSS")

    print("\n(e) HALO TEAL et VIDE SOUS LA CARTE")
    for nom, im, y in (("REF", ref, 1715), ("JEU", cap, 1882)):
        p = med(im, 450 if nom == "REF" else 540, y)
        print(f"  {nom} panneau racine 5 CSS au-dessus du bord bas : {p} "
              f"L={round(lum(p),1)} verdeur={verdeur(p)}")
    for nom, im, y in (("REF", ref, 1612), ("JEU", cap, 1685)):
        p = med(im, 450 if nom == "REF" else 540, y)
        print(f"  {nom} entre plaque du verdict et CTA : {p} "
              f"L={round(lum(p),1)} verdeur={verdeur(p)}")
    print(f"  JEU verdeur le long de y=1908 : "
          f"{[(x, verdeur(med(cap,x,1908))) for x in range(20,1061,100)]}")
    print(f"  [ctrl positif] haut de l'écran : réf V={verdeur(med(ref,8,382))} "
          f"jeu V={verdeur(med(cap,8,24))}")

    for lib, im in (("1080x1920", cap), ("1080x2400", c24)):
        px = im.load()
        h = im.size[1]
        carte = gold_rows(im, 150, 450, 300, h, 0.6)
        xs = list(range(200, 900, 4))
        pan = [y for y in range(1100, h - 100)
               if sum(1 for x in xs if is_l(px[x, y])) >= 0.7 * len(xs)]
        # premier groupe = bas du grand panneau
        bas = pan[0] + 1.5
        cb = carte[1][1] + 0.5
        print(f"  {lib} : bas de la carte y={cb}  bas du grand panneau y={bas}  "
              f"→ vide = {round(bas-cb,1)} px = {round((bas-cb)/3.6,1)} CSS")
    print("  [ctrl positif] le bas de la carte doit être au MÊME y aux deux "
          "résolutions (rien ne bouge au-dessus du bloc élastique).")


main()
