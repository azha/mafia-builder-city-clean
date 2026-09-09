#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""③ F8 — où la référence pose le NOM par rapport à l'ancre, et pourquoi le jeu tombe 8 px plus bas.

⛔ L'HYPOTHÈSE DE DÉPART EST RÉFUTÉE, À ZÉRO. La demande supposait que l'ancre (« centroïde du
   quartier ? ») et la pose du lettrage désignaient DEUX points différents. Mesuré sur les 18 :
   `x_px = x_svg × 7` et `y_px = y_svg × 7`, écart maximal **0,000** — l'ancre EST la position du
   `<text>`, à l'échelle déclarée. Les deux désignent exactement le même point.
   ⇒ Le décalage ne vient donc PAS d'un désaccord de point. Il vient de ce que ce point SIGNIFIE.

★ LA CAUSE, ET ELLE EST DANS UNE ABSENCE. Le CSS pose `text-anchor: middle` — donc x est bien le
  CENTRE horizontal. Mais AUCUN des 54 `<text class="nomq">` ne porte `dominant-baseline`, et le
  défaut SVG est `alphabetic` : **y est la LIGNE DE BASE**, pas le centre vertical.
  Les noms sont en CAPITALES : l'encre monte de la ligne de base vers le haut, donc son centre est
  à `cap/2` AU-DESSUS du point d'ancrage.
  ⇒ Un client qui CENTRE l'étiquette sur l'ancre la pose `cap/2` trop BAS.

  CONTRÔLE avec les nombres du JUGE lui-même, pas les miens :
      hauteur de capitale en maquette (F3, mesurée)  16,0 px
      décalage prédit = cap / 2                      +8,0 px  (le jeu plus bas)
      décalage mesuré (F8)                           +8,4 px médiane, 7/7 du même signe
      écart prédiction ↔ mesure                       0,4 px
  ⇒ La médiane du juge EST expliquée. Et le signe unanime des 7 est ce qu'on attend d'une
    convention, pas d'un bruit de pose.
  ⚠️ Ce que ça n'explique PAS : la DISPERSION (+5,7 à +12,5). Une convention seule donnerait un
    décalage constant ; la plage vient probablement des hauteurs de capitale réelles par mot
    (F3 mesure 15–19 px en maquette) et de la comparaison d'un mot INCLINÉ à un mot horizontal,
    que le juge signale lui-même comme non vérifié. Je ne l'affirme pas : je le borne.

⛔ CE QUE JE N'ÉCRIS PAS, ET POURQUOI. La demande voulait `nom_x_frac`/`nom_y_frac` par district.
   Ils seraient RIGOUREUSEMENT ÉGAUX à `x_frac`/`y_frac` — les dupliquer créerait deux sources
   pour une seule valeur, donc deux qui divergeront un jour, et ce dépôt a déjà payé ça. J'écris
   à la place ce qui manquait vraiment : la CONVENTION D'ANCRAGE, et le correctif qui en découle.

⛔ SENTINELLE : refuse plutôt qu'écraser. Compte ≠ 18, une ancre sans quartier, ou un seul écart
   ancre↔texte au-delà de 0,01 px ⇒ rien n'est écrit.

Usage : ancrage-noms-districts.py [--ecrire]
"""
import importlib.util as il
import json
import os
import re
import sys

ANCRES = os.path.expanduser("~/project/mafia-unity-DA/Assets/Resources/CityMap/ancres_districts.json")
GEO = os.path.expanduser("~/project/atelier3d-mafia/geo_brennar.py")
PAGE = os.path.expanduser("~/project/atelier3d-mafia/ecrans-brennar-6.html")
CAP_REF = 16.0          # F3 : hauteur de capitale médiane MESURÉE par le juge sur la maquette
JUGE_MEDIANE = 8.4      # F8 : médiane des dy mesurés
TOL_POINT = 0.01        # tolérance sur l'égalité ancre ↔ texte


def main():
    j = json.load(open(ANCRES, encoding="utf8"))
    ancres = j["ancres"]
    sp = il.spec_from_file_location("geo", GEO)
    geo = il.module_from_spec(sp)
    sp.loader.exec_module(geo)
    Q = {q["nom"]: q for q in geo.QUARTIERS}
    ech = j["echelle"]

    rouges = []
    if len(ancres) != 18:
        rouges.append("⛔ %d ancres, 18 attendues" % len(ancres))
    pires = (0.0, None)
    for a in ancres:
        q = Q.get(a["nom"])
        if not q:
            rouges.append("⛔ ancre sans quartier : %s" % a["nom"]); continue
        d = max(abs(a["x_px"] - q["x"] * ech), abs(a["y_px"] - q["y"] * ech))
        if d > pires[0]:
            pires = (d, a["nom"])
    if pires[0] > TOL_POINT:
        rouges.append("⛔ ancre ≠ texte de %.3f px sur %s — la prémisse de ce script tombe, "
                      "rien écrit" % pires)

    # l'absence de `dominant-baseline` EST la cause : la vérifier, ne pas la supposer
    h = open(PAGE, encoding="utf8", errors="replace").read()
    textes = re.findall(r'<text class="nomq"([^>]*)>', h)
    avec_baseline = [t for t in textes if "dominant-baseline" in t or "alignment-baseline" in t]
    if avec_baseline:
        rouges.append("⛔ %d `.nomq` portent une baseline explicite : la cause supposée tombe"
                      % len(avec_baseline))
    css = re.search(r"\.nomq\{([^}]*)\}", h)
    if not css or "text-anchor:middle" not in css.group(1).replace(" ", ""):
        rouges.append("⛔ `text-anchor: middle` absent du CSS — l'ancrage horizontal n'est pas "
                      "celui qu'on croit")

    if rouges:
        print("\n".join(rouges)); sys.exit(1)

    print("ancre ↔ position du texte : écart max %.3f px sur 18  ✅ (même point)" % pires[0])
    print("`dominant-baseline` sur les %d `.nomq` : AUCUN ⇒ y = ligne de base  ✅" % len(textes))
    print("`text-anchor: middle` : présent ⇒ x = centre horizontal  ✅")
    print()
    predit = CAP_REF / 2
    print("décalage PRÉDIT (cap/2, le jeu plus bas) : +%.1f px" % predit)
    print("décalage MESURÉ par le juge (F8, médiane) : +%.1f px" % JUGE_MEDIANE)
    print("écart prédiction ↔ mesure                 :  %.1f px  %s"
          % (abs(predit - JUGE_MEDIANE), "✅ la médiane est EXPLIQUÉE"
             if abs(predit - JUGE_MEDIANE) <= 1.0 else "⛔ NON expliquée"))

    if "--ecrire" not in sys.argv:
        print("\n(contrôle seul — relancer avec --ecrire)")
        return

    j["nom_ancrage"] = {
        "_": "Ce que le point (x_px, y_px) désigne POUR LE LETTRAGE. Mesuré, pas supposé : l'ancre "
             "est rigoureusement la position du <text> de la référence (écart max 0,000 px sur 18).",
        "x": "CENTRE horizontal du nom (`text-anchor: middle` dans le CSS de la maquette).",
        "y": "LIGNE DE BASE alphabétique du nom — PAS son centre vertical. Aucun `dominant-baseline` "
             "n'est déclaré sur les 54 `.nomq`, et le défaut SVG est `alphabetic`.",
        "consequence": "Les noms sont en CAPITALES : l'encre monte de la ligne de base, donc son "
                       "centre est à cap/2 AU-DESSUS de l'ancre. Un client qui CENTRE l'étiquette "
                       "sur l'ancre la pose cap/2 trop BAS — c'est le finding F8.",
        "correctif": "poser la LIGNE DE BASE du texte sur l'ancre ; ou, si l'on centre, remonter de "
                     "cap/2. En TMP : aligner sur la baseline plutôt que sur le milieu.",
        "controle": "cap mesurée par le juge en maquette = 16,0 px (F3) ⇒ décalage prédit +8,0 px ; "
                    "mesuré +8,4 px de médiane, 7/7 du même signe (F8). Écart 0,4 px.",
        "non_explique": "la DISPERSION des dy (+5,7 à +12,5). Une convention donne un décalage "
                        "constant ; la plage vient probablement des hauteurs de capitale réelles "
                        "par mot (15–19 px en maquette, F3) et de la comparaison d'un mot incliné "
                        "à un mot horizontal — que le juge signale lui-même comme non vérifié.",
        "pas_de_champ_duplique": "`nom_x_frac`/`nom_y_frac` ne sont PAS ajoutés : ils seraient "
                                 "égaux à `x_frac`/`y_frac`. Deux sources pour une valeur finissent "
                                 "par diverger.",
    }
    json.dump(j, open(ANCRES, "w", encoding="utf8"), ensure_ascii=False, indent=1, sort_keys=False)
    print("\n✅ `nom_ancrage` écrit — la convention, pas des coordonnées dupliquées.")


if __name__ == "__main__":
    main()
