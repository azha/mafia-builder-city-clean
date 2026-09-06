#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rend `ecran-canon.png` de ① SANS l'échafaudage d'atelier — et prouve qu'il n'a touché que lui.

⛔ POURQUOI. La référence actuelle porte des objets qui n'appartiennent pas à l'écran : six
   pastilles `.co` (des commentaires d'atelier posés sur la maquette), un `.floater` animé, et
   deux bascules de démonstration (`#bascule` 🌙, `#chaudb` 🔥). Le juge doit les écarter à la
   main, avec des sondes qu'il corrige à chaque tour — deux ce soir. *Un juge qui doit corriger
   son instrument pour ignorer un objet finira par ignorer autre chose avec.*
⇒ On retire l'échafaudage AVANT le rendu, comme `ville-peinte/rendre-ville-peinte.py` le fait
  pour la carte, plutôt que de demander au juge de le soustraire après.

⛔ LIVRÉ À CÔTÉ, PAS À LA PLACE. `ecran-canon-propre.png` naît à côté de `ecran-canon.png` ; le
   juge choisit le tour où il bascule. Remplacer une référence sous un juge en cours de tour
   changerait le sujet de sa comparaison au milieu de sa mesure.

LE CONTRÔLE, et c'est lui qui donne sa valeur au fichier. Il se fait en DEUX rendus, pas un :
  1. la page INTACTE, par le même chemin → doit être byte-identique à `ecran-canon.png`.
     C'est le contrôle du PIPELINE : sans lui, une différence pourrait venir de mon rendeur
     (version de Chrome, polices, échelle) et je l'attribuerais au dépouillement.
  2. la page DÉPOUILLÉE → la différence avec (1) est ALORS, et seulement alors, la seule
     empreinte de l'échafaudage. On rapporte sa boîte et son compte de pixels.
⇒ Une première version prétendait mesurer les boîtes dans le navigateur : la fonction était
  écrite, JAMAIS APPELÉE, et ne mesurait rien — un dispositif décoratif de plus. Retirée. Le
  contrôle à deux rendus n'a besoin d'aucune boîte : il isole l'empreinte par différence.
⚠️ Si (1) n'est PAS byte-identique, on ne conclut RIEN sur le dépouillement — on dit que le
  pipeline a bougé depuis le rendu d'origine, et c'est déjà un fait utile.

⛔ SENTINELLE, reprise du patron de la carte : si un élément d'échafaudage est IMBRIQUÉ dans un
   autre, l'appariement des balises n'est plus sûr ⇒ refus, rien n'est rendu.

Usage : rendre-canon-propre.py [--verifier]
"""
import json
import os
import re
import subprocess
import sys
import tempfile

ATELIER = os.path.expanduser("~/project/atelier3d-mafia")
PAGE = os.path.join(ATELIER, "hud-brennar.html")
DEST = os.path.expanduser("~/project/mafia-unity-DA/Tools/juge-visuel/ecran-principal")
ANCIEN = os.path.join(DEST, "ecran-canon.png")
NEUF = os.path.join(DEST, "ecran-canon-propre.png")

LARGEUR_CSS, HAUTEUR_CSS, ECHELLE = 392, 696.88, 3.0     # ×3,000 — le juge s'y ancre :
#   rangées px 153..155 = y 51 CSS. Ne pas changer sans le lui dire : son repère y est ancré.
SELECTEURS = [".co", ".floater", "#bascule", "#chaudb"]   # l'échafaudage, nommé


def depouiller(html):
    """Retire l'échafaudage. Refuse si un élément en contient un autre."""
    comptes, s = {}, html
    for cls in ("co", "floater"):
        motif = re.compile(r'<div\b[^>]*class="[^"]*\b%s\b[^"]*"[^>]*>' % cls)
        n = 0
        while True:
            m = motif.search(s)
            if not m:
                break
            # apparier la balise fermante en comptant les <div> imbriqués
            i, prof, j = m.end(), 1, m.end()
            for mm in re.finditer(r"<(/?)div\b", s[i:]):
                prof += 1 if not mm.group(1) else -1
                if prof == 0:
                    j = i + mm.end()
                    break
            else:
                return None, {"⛔": "`%s` : balise fermante introuvable — appariement non sûr" % cls}
            corps = s[m.start():j]
            if len(re.findall(r'class="[^"]*\b(?:%s)\b' % "|".join(("co", "floater")), corps)) != 1:
                return None, {"⛔": "échafaudage `%s` IMBRIQUÉ dans un autre : appariement non "
                                   "sûr, rien retiré" % cls}
            s = s[:m.start()] + s[j:]
            n += 1
        comptes[cls] = n
    for ident in ("bascule", "chaudb"):
        motif = re.compile(r'<div\b[^>]*id="%s"[^>]*>.*?</div>' % ident, re.S)
        s, n = motif.subn("", s)
        comptes["#" + ident] = n
    return s, comptes


def main():
    html = open(PAGE, encoding="utf8", errors="replace").read()
    propre, comptes = depouiller(html)
    if propre is None:
        print("\n".join("%s %s" % kv for kv in comptes.items())); sys.exit(1)
    print("échafaudage retiré :")
    for k, v in comptes.items():
        print("   %-12s %d" % (k, v))
    attendus = {"co": 6, "floater": 1, "#bascule": 1, "#chaudb": 1}
    if comptes != attendus:
        print("⛔ compte inattendu — attendu %s. La page a changé depuis la mesure : "
              "rien rendu." % attendus)
        sys.exit(1)
    reste = len(re.findall(r'class="[^"]*\b(?:co|floater)\b', propre))
    if reste:
        print("⛔ %d élément(s) d'échafaudage survivent au dépouillement — rien rendu." % reste)
        sys.exit(1)
    print("contrôle : 0 survivant dans le HTML dépouillé ✅")

    if "--verifier" in sys.argv:
        print("\n--verifier : dépouillement prouvé, rien rendu.")
        return

    # la porte : un rendu charge la machine de l'user
    porte = os.path.expanduser("~/project/mafia-clean-city/scripts/creneau-unity.sh")
    if os.path.exists(porte):
        d = subprocess.run([porte, "status"], capture_output=True, text=True)
        tete = (d.stdout or "").strip().splitlines()[:1]
        if tete and tete[0].startswith("PRIS") and "mafia-blender" not in tete[0]:
            print("⛔ porte tenue par quelqu'un d'autre : %s — rien rendu." % tete[0][:70])
            sys.exit(1)

    tmp = os.path.join(ATELIER, "._canon-propre.html")   # MÊME dossier : mêmes chemins relatifs
    open(tmp, "w", encoding="utf8").write(propre)
    try:
        r = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                                         "rendre-maquette.py"),
                            tmp, NEUF, str(LARGEUR_CSS), str(HAUTEUR_CSS), str(ECHELLE)],
                           capture_output=True, text=True, timeout=300)
        print(r.stdout[-1200:] or r.stderr[-800:])
    finally:
        os.path.exists(tmp) and os.remove(tmp)

    if not os.path.exists(NEUF):
        print("⛔ rendu absent"); sys.exit(1)
    from PIL import Image, ImageChops
    a, b = Image.open(ANCIEN).convert("RGB"), Image.open(NEUF).convert("RGB")
    print("\nancien %s · propre %s" % (a.size, b.size))
    if a.size != b.size:
        print("⛔ tailles différentes : la comparaison n'a pas de sens."); sys.exit(1)

    # ── (1) le contrôle du PIPELINE : la page INTACTE, par le MÊME chemin ──
    temoin = os.path.join(DEST, "._canon-intact.png")
    subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                                 "rendre-maquette.py"),
                    PAGE, temoin, str(LARGEUR_CSS), str(HAUTEUR_CSS), str(ECHELLE)],
                   capture_output=True, text=True, timeout=300)
    fidele = None
    if os.path.exists(temoin):
        t = Image.open(temoin).convert("RGB")
        fidele = (t.size == a.size and ImageChops.difference(a, t).getbbox() is None)
        print("(1) pipeline : rendu INTACT %s l'ancien  %s"
              % ("== " if fidele else "≠ ", "✅" if fidele else "⚠️"))
        if not fidele and t.size == a.size:
            bb = ImageChops.difference(a, t).getbbox()
            print("    ⚠️ le pipeline a bougé depuis le rendu d'origine (boîte %s) — on ne "
                  "conclut RIEN sur le dépouillement à partir de la comparaison à l'ancien." % (bb,))
        base = t if t.size == a.size else a
    else:
        print("(1) ⚠️ rendu témoin absent — le pipeline n'est pas contrôlé, comparaison à l'ancien "
              "seulement, donc NON attribuable au dépouillement.")
        base = a

    # ── (2) l'empreinte de l'échafaudage, isolée par différence ──
    d = ImageChops.difference(base, b)
    bb = d.getbbox()
    n = sum(1 for p in d.getdata() if p != (0, 0, 0))
    print("(2) empreinte de l'échafaudage : boîte %s · %d pixels changés (%.2f %% de l'image)"
          % (bb, n, 100.0 * n / (b.size[0] * b.size[1])))
    if fidele:
        print("    ⇒ attribuable au dépouillement SEUL, le pipeline étant prouvé fidèle.")
    os.path.exists(temoin) and os.remove(temoin)


if __name__ == "__main__":
    main()
