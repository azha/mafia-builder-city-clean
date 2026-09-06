#!/usr/bin/env python3
"""TD-554 — les gardes de capture qui ne peuvent PAS distinguer un écran d'un fond.

⛔⛔ LE DÉFAUT, ET LA RAISON POUR LAQUELLE IL A SURVÉCU DES SEMAINES EN ÉTANT VERT.
`horsFond` est la PROPORTION de pixels qui s'écartent de la couleur dominante d'une capture.
TROIS seuils circulaient dans ce dépôt, et les trois se franchissent à vide :

    Assert.Greater(horsFond, 0,                 …)   ← gabarit des écrans neufs (6 copies)
    Assert.Greater(horsFond, 2f,                …)   ← producteur partagé `CaptureSupport`
    Assert.Greater(horsFond, pixels.Length/100, …)   ← ㉜ Réputation, 1 %, la plus serrée

★★ **LA CLASSE N'EST PAS « CES TROIS SEUILS », C'EST LA GRANDEUR.** Que la variante la plus
   stricte (1 %) tombe elle aussi le prouve : l'anticrénelage d'un seul titre sur 1920×1080
   dépasse 20 000 px, donc franchit 1 % sans qu'aucune mise en page n'ait été rendue. Un
   quatrième seuil écrit demain (`> Length/50`), ou le même calcul sous un autre nom de
   variable, serait de la même classe **sans ressembler à aucun des trois motifs**.
   ⇒ La classe se nomme par sa PROPRIÉTÉ : *toute garde de capture assise sur une PROPORTION de
     pixels hors fond.* Une prescription qui vise une SYNTAXE laisse échapper sa propre classe —
     cet outil vise donc la GRANDEUR, en suivant l'affectation, pas l'identifiant.

⇒ Ce qui discrimine vraiment un écran d'un fond : la TAILLE (une dimension sous 200 px trahit un
  RectTransform resté à 100×100, ce qui ne lève aucune erreur console) et la NATURE du dominant
  (canal max 13 pour un fond, 176 pour un accent). Le NOMBRE DE TEINTES, lui, n'est qu'un
  AVERTISSEMENT : il ne distingue pas « l'écran est cassé » de « l'écran montre correctement
  qu'il n'y a rien » sur un compte frais.

★ ET LA CAUSE N'ÉTAIT PAS SIX NÉGLIGENCES, C'ÉTAIT UN GABARIT. Les copies privées venaient
  toutes de `Tools/nouvel-ecran.py`, qui posait le seuil `> 0` accompagné de « plancher
  volontairement bas : le durcir une fois BuildLayout() rempli ». Aucun écran n'est jamais
  revenu le durcir. *Une dette écrite dans un GABARIT n'est pas une dette, c'est une politique :
  elle se reproduit à chaque usage, et son commentaire d'excuse se reproduit avec elle.*
  ⇒ Le gabarit est corrigé À LA SOURCE. Sans ça, cet outil retomberait à 1 au prochain écran.

Usage :
    python3 Tools/lister-gardes-de-capture-vides.py

Sort 1 s'il reste une ASSERTION de la classe. Doit rendre 0.
Le RÉSIDU (§2) n'est pas un échec : c'est le dénominateur publié, voir plus bas.
"""
import pathlib
import re
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
# Le gabarit compte : une occurrence là-dedans en fabrique une par écran généré.
CIBLES = [RACINE / "Assets" / "Tests", RACINE / "Tools" / "nouvel-ecran.py"]

# ⚠️ IGNORER LES LIGNES DE COMMENTAIRE. Première version : elle signalait le COMMENTAIRE qui
# explique le défaut corrigé (« Elle était : `Assert.Greater(horsFond, 2f)` »), donc le fichier
# réparé restait rouge à cause de sa propre documentation.
# ★ *Un instrument qui compte la mention d'un défaut comme le défaut lui-même pousse à ne plus
#   l'expliquer* — il achèterait son zéro contre la mémoire de la raison. C'est le contraire de
#   ce qu'on veut : ici, la trace écrite vaut autant que la correction.
COMMENTAIRE = re.compile(r'^\s*(//|///|\*|/\*)')

# §1 — LA GRANDEUR, SUIVIE PAR AFFECTATION (et non l'identifiant `horsFond`, qui se renomme).
# Une variable est « une proportion hors fond » si elle est affectée depuis un écart au dominant.
AFFECTATION = re.compile(
    r'\b(?:int|float|double|var)\s+(\w+)\s*=\s*[^;]*?'
    r'(?:\.Length\s*-\s*\w*[Dd]ominant\w*'          # pixels.Length - dominant
    r'|\b100f?\s*-\s*\w*(?:[Pp]art|[Dd]ominant)\w*' # 100f - part
    r'|\w*[Dd]ominant\w*\s*/\s*\w*\.?Length'        # dominant / pixels.Length
    r'|\w*[Hh]ors[Ff]ond\w*)')                      # …= horsFond (alias)


def assertions_sur(nom):
    """Toute forme d'assertion NUnit dont la grandeur testée est `nom`."""
    return re.compile(r'Assert\.\w+\(\s*' + re.escape(nom) + r'\s*[,)<>=!]')


# ⚠️ CONTRÔLE POSITIF — FIXTURE INERTE, JAMAIS UNE LIGNE DE PRODUCTION.
# Mesuré ici le 2026-08-31 : un contrôle positif qui nomme des lignes vivantes s'AVEUGLE au
# moment précis où le lot réussit (le lot les corrige ⇒ 0/6 ⇒ l'oracle accuse son propre motif).
# Cette fixture n'appartient à personne et ne sera jamais « corrigée ».
FIXTURE = """
    int ecartAuFond = pixels.Length - dominant;
    Assert.Greater(ecartAuFond, pixels.Length / 50, "quatrieme seuil, nom different");
"""


def scanner(lignes):
    """Rend les (numero, ligne) qui assertent une proportion hors fond."""
    noms = set()
    for l in lignes:
        if COMMENTAIRE.match(l):
            continue
        m = AFFECTATION.search(l)
        if m:
            noms.add(m.group(1))
    if not noms:
        return []
    motifs = [assertions_sur(n) for n in noms]
    return [(i, l) for i, l in enumerate(lignes, 1)
            if not COMMENTAIRE.match(l) and any(rx.search(l) for rx in motifs)]


def main() -> int:
    # Le contrôle positif tourne AVANT tout balayage : un motif cassé rendrait « 0 » partout,
    # et ce zéro-là ressemble trait pour trait à une fermeture.
    if not scanner(FIXTURE.split("\n")):
        print("⛔ CONTRÔLE POSITIF EN ÉCHEC : le motif ne voit plus sa propre fixture. "
              "Son « 0 » ne vaudrait rien — l'instrument est cassé, pas l'arbre.")
        return 3

    trouves, residu, fichiers = [], [], 0
    for cible in CIBLES:
        chemins = sorted(cible.rglob("*.cs")) if cible.is_dir() else [cible]
        for p in chemins:
            if not p.exists():
                continue
            fichiers += 1
            lignes = p.read_text(encoding="utf-8", errors="replace").split("\n")
            for i, l in scanner(lignes):
                trouves.append((p.relative_to(RACINE), i, l.strip()))
            # §2 — LE RÉSIDU : la suite recalcule la dominante chez elle au lieu d'appeler le
            # producteur partagé. Ce n'est plus une garde fausse — c'est la SURFACE par laquelle
            # elle revient : la grandeur reste en portée, à un `Assert` près.
            actives = [x for x in lignes if not COMMENTAIRE.match(x)]
            calcule = any(AFFECTATION.search(x) for x in actives)
            appelle = any(re.search(r'\b(GarderLaCapture|CaptureSousShell)\b', x) for x in actives)
            if calcule and not appelle:
                residu.append(p.relative_to(RACINE))

    if fichiers == 0:
        # ⚠️ ANTI-VACUITÉ : « rien trouvé » et « rien balayé » auraient la même sortie sinon.
        print("aucun fichier balayé — l'outil ne voit pas l'arbre, son 0 ne vaut rien.")
        return 2

    if trouves:
        print(f"⛔ {len(trouves)} garde(s) de capture assises sur une PROPORTION hors fond "
              f"(sur {fichiers} fichier(s) balayé(s)) :")
        for f, n, l in trouves:
            print(f"    {f}:{n}  {l[:100]}")
        print("\n⇒ Remplacer par la TAILLE (>= 200 px) et la NATURE du dominant "
              "(canal max < 90), patron de `CaptureSupport.GarderLaCapture`.")
        return 1

    print(f"✓ 0 assertion assise sur une proportion hors fond — {fichiers} fichier(s) balayé(s), "
          "gabarit `nouvel-ecran.py` inclus. Contrôle positif : PASSÉ.")
    # ⇒ Publier le dénominateur plutôt que le masquer : un « 6 » déclaré est une mesure due.
    print(f"\n§2 RÉSIDU — {len(residu)} suite(s) recalculent la dominante chez elles au lieu "
          "d'appeler le producteur partagé. La garde fausse est partie ; la grandeur reste en "
          "portée, donc la surface de réintroduction aussi :")
    for f in residu:
        print(f"    {f}")
    print("⇒ Fermeture définitive = ces suites appellent `CaptureSupport.GarderLaCapture`. "
          "Tant qu'elles calculent, cet outil est la seule chose qui les retient.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
