#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rastérise les bustes-silhouettes de « LA FAMILLE » en PNG 256×256 — depuis UN SEUL producteur.

POURQUOI CE SCRIPT EXISTE (mesuré 2026-08-22) : les PNG livrés par le rendu Chrome sans tête
(`Tools/family-bustes-render.sh`) étaient TRONQUÉS — la bbox alpha d'un buste tombait à
(64,44,192,169) là où sa géométrie impose (48,43,208,240). Les ÉPAULES, l'élément le plus large,
manquaient. Une fenêtre trop juste fait CROPPER Chrome en silence, sans erreur.

Ici, aucun navigateur : les formes SVG sont lues, aplaties et remplies avec PIL, et le script
VÉRIFIE sa propre sortie. Un rendu tronqué rougit au lieu de produire un PNG plausible.

★ v2 (2026-09-02, chantier « silhouettes contemporaines ») — deux changements de FORME :
  1. UN PRODUCTEUR. La v1 recopiait la géométrie en listes de points Python : la même silhouette
     vivait en QUATRE exemplaires (atelier, source des bustes, source de la référence, Python) et
     rien ne les tenait ensemble. Désormais la géométrie est LUE dans le bloc `<defs>` de
     `Tools/family-bustes-source.html` (groupes `<g id="buste-…">`) ; la source de la maquette de
     référence porte le même bloc et ce script EXIGE qu'il soit identique (sinon exit 1).
  2. BBOX DÉRIVÉE. La v1 transcrivait les bornes attendues à la main (`ATTENDU = {…}`) : changer
     un chemin sans mettre à jour la table faisait rougir, mais changer les deux « de façon
     cohérente et fausse » passait. Désormais les bornes sont CALCULÉES sur les points aplatis
     de la géométrie source — ce que le rendu doit couvrir, pas ce qu'on croit qu'il couvre.
     ⚠️ Ce que ça prouve : « le PNG couvre toute la géométrie » (aucun crop). Ce que ça ne prouve
     PAS : « la géométrie est la bonne » — ça, seule une planche regardée par un humain le dit.

Contrôles rendus à chaque exécution (tous doivent être verts, sinon exit 1) :
  - bbox alpha du PNG == bbox de la géométrie (tolérance 3 px : anticrénelage + arrondi) ;
  - la bbox ne TOUCHE aucun bord du canevas (détecteur de crop indépendant de toute attente) ;
  - alpha_min == 0 et alpha_max == 255 (planchers anti-vacuité — nécessaires, jamais suffisants) ;
  - le bloc `<defs>` des deux sources HTML est identique octet pour octet.
`--controle-positif` : rend chaque buste dans un canevas volontairement trop petit et EXIGE que
le contrôle de bbox rougisse. Sans lui, un vert de ce script ne prouve pas que le contrôle mord.

Fill `#cfc4a6` baked, même patron que les 83 icônes W3.U-DA (`.buste-t{fill:#cfc4a6}`).
Sortie : `Assets/Resources/Lieutenant/ui_element_buste_<role>.png` — le nom de fichier est le
RÔLE (don / lieutenant / homme), jamais le vêtement : un asset nommé par sa tenue ment le jour où
la tenue change (mesuré : l'ancien asset nommé par son chapeau a porté ce chapeau hors-canon 12 jours).

Usage :
    python3 Tools/rasterise-bustes.py [dossier_sortie]        # défaut : Assets/Resources/Lieutenant
    python3 Tools/rasterise-bustes.py --controle-positif      # ne rend rien dans Assets/
"""
from PIL import Image
import math, os, re, sys

VB, TAILLE, SS = 32.0, 256, 4          # viewBox, sortie, sur-échantillonnage
FILL = (207, 196, 166, 255)            # #cfc4a6
TOLERANCE_PX = 3
ICI = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(ICI, "family-bustes-source.html")
SOURCE_REFERENCE = os.path.join(ICI, "family-organigramme-reference-source.html")


# ---------------------------------------------------------------- géométrie SVG → polygones
def bez3(p0, p1, p2, p3, n=48):
    for i in range(n + 1):
        t = i / n; u = 1 - t
        yield (u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
               u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1])


def bez2(p0, p1, p2, n=32):
    for i in range(n + 1):
        t = i / n; u = 1 - t
        yield (u*u*p0[0] + 2*u*t*p1[0] + t*t*p2[0],
               u*u*p0[1] + 2*u*t*p1[1] + t*t*p2[1])


def ellipse(cx, cy, rx, ry, n=96):
    return [(cx + rx*math.cos(2*math.pi*i/n), cy + ry*math.sin(2*math.pi*i/n)) for i in range(n)]


def rect_arrondi(x, y, w, h, rx, n=16):
    if rx <= 0:
        return [(x, y), (x+w, y), (x+w, y+h), (x, y+h)]
    pts = []
    for cx, cy, a0 in ((x+w-rx, y+rx, -90), (x+w-rx, y+h-rx, 0), (x+rx, y+h-rx, 90), (x+rx, y+rx, 180)):
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + rx*math.cos(a), cy + rx*math.sin(a)))
    return pts


_TOK = re.compile(r'[MmLlHhVvCcQqZz]|-?\d*\.?\d+(?:e-?\d+)?')


def chemin_vers_polygones(d):
    """Aplatit un attribut `d` (M L H V C Q Z, absolus ET relatifs) en une liste de polygones.
    Refuse toute commande hors de ce jeu (A, S, T) : une commande ignorée en silence produirait
    un polygone plausible et faux — exactement la classe de défaut que ce script existe pour
    rendre impossible."""
    toks = _TOK.findall(d)
    polys, cur, pos, start, cmd, i = [], [], (0.0, 0.0), (0.0, 0.0), None, 0

    def nxt():
        nonlocal i
        v = float(toks[i]); i += 1
        return v

    while i < len(toks):
        t = toks[i]
        if t.isalpha():
            cmd = t; i += 1
            if cmd in "Zz":
                if cur:
                    polys.append(cur)
                cur, pos = [], start
                continue
        if cmd is None:
            raise ValueError("chemin sans commande initiale : %r" % d)
        rel = cmd.islower()
        c = cmd.upper()
        if c == "M":
            x, y = nxt(), nxt()
            if rel: x, y = pos[0]+x, pos[1]+y
            if cur:
                polys.append(cur)
            cur, pos, start = [(x, y)], (x, y), (x, y)
            cmd = "l" if rel else "L"            # sous-séquence de M = L implicites
        elif c == "L":
            x, y = nxt(), nxt()
            if rel: x, y = pos[0]+x, pos[1]+y
            cur.append((x, y)); pos = (x, y)
        elif c == "H":
            x = nxt(); x = pos[0]+x if rel else x
            cur.append((x, pos[1])); pos = (x, pos[1])
        elif c == "V":
            y = nxt(); y = pos[1]+y if rel else y
            cur.append((pos[0], y)); pos = (pos[0], y)
        elif c == "C":
            p1 = (nxt(), nxt()); p2 = (nxt(), nxt()); p3 = (nxt(), nxt())
            if rel:
                p1 = (pos[0]+p1[0], pos[1]+p1[1]); p2 = (pos[0]+p2[0], pos[1]+p2[1]); p3 = (pos[0]+p3[0], pos[1]+p3[1])
            cur.extend(list(bez3(pos, p1, p2, p3))[1:]); pos = p3
        elif c == "Q":
            p1 = (nxt(), nxt()); p2 = (nxt(), nxt())
            if rel:
                p1 = (pos[0]+p1[0], pos[1]+p1[1]); p2 = (pos[0]+p2[0], pos[1]+p2[1])
            cur.extend(list(bez2(pos, p1, p2))[1:]); pos = p2
        else:
            raise ValueError("commande SVG non supportée %r dans %r" % (cmd, d))
    if cur:
        polys.append(cur)
    return polys


_ATTR = re.compile(r'([a-zA-Z-]+)="([^"]*)"')


def formes_du_groupe(html_groupe):
    """Toutes les formes d'un `<g>` : path / circle / ellipse / rect → polygones (unités viewBox).
    Un `<path fill-rule="evenodd">` à plusieurs sous-chemins rend son PREMIER sous-chemin plein et
    les suivants en CREUX (transparents) — c'est ainsi qu'une capuche montre l'ouverture du visage.
    Représentation : (points, plein: bool). L'ordre des formes est l'ordre de dessin."""
    polys = []
    for m in re.finditer(r'<(path|circle|ellipse|rect)\b([^>]*)/?>', html_groupe):
        tag, attrs = m.group(1), dict(_ATTR.findall(m.group(2)))
        if tag == "path":
            sous = chemin_vers_polygones(attrs["d"])
            if attrs.get("fill-rule") == "evenodd":
                polys.append((sous[0], True)); polys.extend((sp, False) for sp in sous[1:])
            else:
                polys.extend((sp, True) for sp in sous)
            continue
        elif tag == "circle":
            r = float(attrs["r"]); polys.append((ellipse(float(attrs["cx"]), float(attrs["cy"]), r, r), True))
        elif tag == "ellipse":
            polys.append((ellipse(float(attrs["cx"]), float(attrs["cy"]), float(attrs["rx"]), float(attrs["ry"])), True))
        elif tag == "rect":
            polys.append((rect_arrondi(float(attrs["x"]), float(attrs["y"]), float(attrs["width"]),
                                       float(attrs["height"]), float(attrs.get("rx", "0"))), True))
    if not polys:
        raise ValueError("groupe sans aucune forme reconnue")
    return polys


def bloc_defs(html):
    m = re.search(r'<defs>(.*?)</defs>', html, re.S)
    if not m:
        raise ValueError("aucun bloc <defs> dans la source")
    return m.group(1)


def groupes_bustes(html):
    """{role: html_du_groupe} pour chaque `<g id="buste-<role>">` du bloc <defs>."""
    out = {}
    for m in re.finditer(r'<g id="buste-([a-z]+)">(.*?)</g>', bloc_defs(html), re.S):
        out[m.group(1)] = m.group(2)
    if not out:
        raise ValueError("aucun <g id=\"buste-…\"> dans le bloc <defs>")
    return out


def bbox_geometrie(polys):
    """Bornes de l'ENCRE : les creux n'étendent jamais la bbox (ils sont intérieurs par construction)."""
    xs = [x for p, plein in polys if plein for x, _ in p]; ys = [y for p, plein in polys if plein for _, y in p]
    return (min(xs), min(ys), max(xs), max(ys))


# ---------------------------------------------------------------- rendu + contrôles
def rendre(polys, taille=TAILLE, vb=VB, ss=SS, fill=FILL):
    from PIL import ImageDraw
    im = Image.new("RGBA", (taille*ss, taille*ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    k = taille * ss / vb
    for pts, plein in polys:
        d.polygon([(x*k, y*k) for x, y in pts], fill=fill if plein else (0, 0, 0, 0))
    return im.resize((taille, taille), Image.LANCZOS)


def controler(im, polys, taille=TAILLE, vb=VB):
    """Rend (ok: bool, lignes: [str]). Toutes les propriétés, pas seulement la première fausse."""
    a = im.convert("RGBA").split()[3]
    bb = a.getbbox()
    att = tuple(round(v * taille / vb) for v in bbox_geometrie(polys))
    lignes, ok = [], True
    if bb is None:
        return False, ["alpha entièrement nul : aucun pixel rendu"]
    ecart = max(abs(x - y) for x, y in zip(bb, att))
    etat = "OK" if ecart <= TOLERANCE_PX else "ÉCART"
    ok &= ecart <= TOLERANCE_PX
    lignes.append("bbox=%s geometrie=%s ecart_max=%d px %s" % (bb, att, ecart, etat))
    touche = [n for n, v, lim in (("gauche", bb[0], 0), ("haut", bb[1], 0), ("droite", bb[2], taille), ("bas", bb[3], taille)) if v == lim]
    if touche:
        ok = False
        lignes.append("la bbox TOUCHE le bord du canevas (%s) : crop probable" % ", ".join(touche))
    lo, hi = a.getextrema()
    if not (lo == 0 and hi == 255):
        ok = False
        lignes.append("alpha min/max = %d/%d (attendu 0/255)" % (lo, hi))
    return ok, lignes


def main(argv):
    controle_positif = "--controle-positif" in argv
    args = [a for a in argv if not a.startswith("--")]
    html = open(SOURCE, encoding="utf-8").read()
    groupes = groupes_bustes(html)

    # Un producteur : la source de la maquette de référence doit porter le MÊME bloc.
    ref = open(SOURCE_REFERENCE, encoding="utf-8").read()
    if groupes_bustes(ref) != groupes:
        print("ÉCART : le bloc <defs> des bustes diffère entre family-bustes-source.html et "
              "family-organigramme-reference-source.html — un seul producteur, deux exemplaires.")
        return 1

    echec = 0
    if controle_positif:
        # Canevas trop petit : la géométrie déborde ⇒ crop réel ⇒ le contrôle DOIT rougir.
        for role, g in groupes.items():
            polys = formes_du_groupe(g)
            im = rendre(polys, taille=TAILLE, vb=VB * 0.7)     # viewBox rétréci = zoom ⇒ débordement
            ok, lignes = controler(im, polys, taille=TAILLE, vb=VB)
            verdict = "rougit comme attendu" if not ok else "⛔ RESTE VERT SUR UN CROP : le contrôle ne mord pas"
            print("%-12s contrôle positif : %s | %s" % (role, verdict, " ; ".join(lignes)))
            echec |= int(ok)
        return echec

    sortie = args[1] if len(args) > 1 else "Assets/Resources/Lieutenant"
    for role, g in groupes.items():
        polys = formes_du_groupe(g)
        im = rendre(polys)
        chemin = os.path.join(sortie, "ui_element_buste_%s.png" % role)
        im.save(chemin)
        ok, lignes = controler(Image.open(chemin), polys)
        echec |= int(not ok)
        print("%-12s %s" % (role, " ; ".join(lignes)))
    return echec


if __name__ == "__main__":
    sys.exit(main(sys.argv))
