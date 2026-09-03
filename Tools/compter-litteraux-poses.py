#!/usr/bin/env python3
"""§F-2 — combien de littéraux POSÉS À L'ÉCRAN d'un fichier ne passent pas encore par `Libelle`.

⛔ POURQUOI CET OUTIL EXISTE ALORS QUE `lister-litteraux-non-convertis.py` EXISTE DÉJÀ.
Celui-là juge le FICHIER : il demande « ce fichier utilise-t-il `Libelle` quelque part ? » et
range `LieutenantScreenController` parmi les 23 qui « passent », alors qu'il y pose 49 `Libelle`
ET des dizaines de libellés anglais bruts. Un fichier à moitié converti est donc invisible à
son balayage. *Une garde qui interroge le fichier ne peut pas voir un littéral.*

⛔⛔ ET LE CONTRÔLE QU'IL REMPLACE ÉTAIT FAUX — mesuré avant de convertir quoi que ce soit.
Le contrôle prescrit était « `grep -c` des mots anglais sur ce fichier : 34 → 0 ». Passé sur le
fichier INTACT, il rend **405**, parce qu'il compte les IDENTIFIANTS et pas les libellés :
`Mode` 90 fois (`TextAlignmentOptions`, `RenderMode`…), `Refresh` 48 (`RefreshBands()`),
`Reassign` 56, `Archetype` 65. Viser 0 aurait exigé de renommer des types Unity.
★ Et `soon`, l'un des mots de la liste, rend **0** sur le fichier intact tout en étant VISIBLE à
  l'écran : un motif qui rend zéro AVANT l'édition est un motif faux, pas un motif satisfait.
⇒ Un contrôle dont la cible est inatteignable ne se durcit pas, il se REMPLACE — et la
  propriété à mesurer n'est pas « ce mot anglais est absent du fichier » mais « ce texte posé à
  l'écran passe par une clé ».

⚠️ CE QUE CET OUTIL NE PRÉTEND PAS. Il produit une population, pas une vérité. Deux passes
antérieures l'ont encadrée sans la donner (53 littéraux en ne connaissant que `NewText`, 89 en
ramassant les noms de `GameObject` et les valeurs d'enum). Les filtres ci-dessous excluent ce
qu'on sait n'être jamais affiché ; ce qui reste est PLAUSIBLEMENT du texte, et le compte n'a de
sens que comparé à LUI-MÊME, avant et après. C'est pour ça qu'il imprime les deux et jamais un
verdict.
"""
import re
import sys

# Les poseurs de texte, helpers COMPRIS — c'est ce que le balayage d'origine ne connaissait pas.
# `AddStatusRow`/`AddCycleButton`/`AddActionButton`/`NewSectionLabel` posent tous du texte visible
# sans passer par `NewText` : les ignorer, c'est déclarer converti un écran qui ne l'est pas.
POSEURS = re.compile(
    r'(?:NouveauTexte|NewText|\.text\s*=|AddActionButton|AddStatusRow|AddCycleButton'
    r'|AddSubLabel|NewSectionLabel|SetOutcome)')
LITTERAL = re.compile(r'"([^"\\]{2,90})"')

# ── Ce qui n'est JAMAIS affiché, et qu'il faut donc retirer de la population ──────────────
NOM_DOBJET = re.compile(r'^[A-Z][A-Za-z0-9]*$')   # "PickerCap", "Chevron", "TierBadge"
BALISE = re.compile(r'^</?[a-z]')                  # "<b>", "</i>"
IDENT = re.compile(r'^[a-z][a-z0-9_]*$')           # "reset_budget", "raise_ceiling"
ENUM = re.compile(r'^[A-Z][A-Z0-9_]+$')            # "COOK", "SECURITY", "DELEGATED"
GLYPHE = re.compile(r'^[\[\]\(\)<>#=*.… \-|/+]+$')  # "[*]", "[>>]", "[…]"


# ⛔⛔ LA PROPRIÉTÉ À MESURER N'EST PAS « PASSE PAR `Libelle` » — MESURÉ LE 2026-09-03.
# `LieutenantScreenController` porte 49 appels à `Libelle.De`, et son écran est en ANGLAIS.
# Les deux sont vrais en même temps parce que ces appels passent un littéral ANGLAIS :
#     case "COOK": return Libelle.De("famille", "archetype", "Cook");
# Or le contrat de `Libelle` est de rendre LE LITTÉRAL quand la clé manque. Tant que le bundle
# ne sert pas `famille.archetype.cook`, l'écran affiche « Cook » — À TRAVERS la conversion.
# ⇒ *Une conversion qui laisse un repli anglais est une conversion qui ne change rien*, et elle
#   coche pourtant toutes les cases d'un audit qui demande « utilises-tu `Libelle` ? ».
# ⇒ On compte donc DEUX populations distinctes, jamais leur somme :
#     (a) les littéraux POSÉS sans passer par une clé ;
#     (b) les littéraux passés À `Libelle` dont le repli est d'apparence ANGLAISE.
#   La seconde est invisible au balayage par fichier, et c'est elle qui explique la capture.
APPEL_LIBELLE = re.compile(r'Libelle\.De\(\s*"[^"]*"\s*,\s*"[^"]*"\s*,\s*"([^"\\]{2,90})"')
ACCENTS = set('àâäéèêëïîôöùûüÿçœÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇŒ')
MOTS_FR = re.compile(
    r"\b(le|la|les|de|du|des|un|une|et|ou|o[uù]|qui|que|pas|vous|votre|sans|avec|aucun"
    r"|aucune|pour|sur|dans|est|se|ce|cette|plus|d[eé]j[aà]|encore|par|au|aux|en|ne|il"
    r"|elle|son|sa|ses|nouveau|nouvelle|r[eè]gle|r[eè]gles)\b", re.I)


def semble_anglais(s: str) -> bool:
    """Sans accent ET sans mot-outil français ⇒ suspect. Heuristique ASSUMÉE : elle laisse
    passer un mot français sans accent ni article (« Sortir »), et accuse un nom propre. Elle
    n'est donc PAS un verdict — elle donne une population à ouvrir, et son intérêt est de
    tomber à zéro quand le travail est fait, pas d'être exacte à l'unité."""
    return not (set(s) & ACCENTS) and MOTS_FR.search(s) is None


def replis_anglais(source: str):
    """(b) — les littéraux passés à `Libelle.De` dont le repli est d'apparence anglaise."""
    out = []
    for i, ligne in enumerate(source.split('\n'), 1):
        nu = ligne.strip()
        if nu.startswith('//') or nu.startswith('///'):
            continue
        for m in APPEL_LIBELLE.finditer(ligne):
            s = m.group(1)
            if semble_anglais(s):
                out.append((i, s))
    return out


def poses(source: str):
    """Les littéraux posés à l'écran, avec leur ligne — et un drapeau `via_libelle`."""
    out = []
    for i, ligne in enumerate(source.split('\n'), 1):
        nu = ligne.strip()
        if nu.startswith('//') or nu.startswith('///'):
            continue
        if not POSEURS.search(ligne):
            continue
        via = 'Libelle.De(' in ligne or re.search(r'\bLib\(', ligne) is not None
        for m in LITTERAL.finditer(ligne):
            s = m.group(1)
            if not re.search(r'[A-Za-zÀ-ÿ]', s):
                continue
            if s.startswith('/') or '{' in s:
                continue
            if NOM_DOBJET.match(s) or BALISE.match(s) or IDENT.match(s) or ENUM.match(s) or GLYPHE.match(s):
                continue
            out.append((i, s, via))
    return out


# ⛔⛔ DÉCOUVRIR ET VÉRIFIER SONT DEUX MÉTIERS, ET LES CONFONDRE M'A COÛTÉ UN TOUR.
# L'heuristique ci-dessus est faite pour TROUVER : elle signale ce qui n'a ni accent ni
# mot-outil français. Employée comme CONTRÔLE de fin, elle ne peut pas tomber à zéro — après
# avoir traduit les 45 replis anglais du fichier de ⑧, elle en signalait encore 20, tous
# FRANÇAIS : « Cuisinier », « Logistique », « Comptable », « Distribution », « Actif »,
# « Production », « Acheminement », « Envois »… des mots français sans accent ni article.
# ⇒ C'est EXACTEMENT le défaut que je reprochais au contrôle prescrit (« 34 → 0 » impossible),
#   reproduit dans l'instrument qui le remplaçait, un tour plus tard. *Un contrôle dont on ne
#   peut pas atteindre la cible ne prouve rien quand il rougit, et rien quand il verdit.*
# ⇒ La vérification exacte n'a pas besoin d'heuristique : on connaît la LISTE des littéraux
#   anglais mesurés AVANT. Le contrôle devient une différence d'ensembles — « aucun de ces
#   45-là ne subsiste » — qui vaut 0 ou n'importe quoi d'autre, sans jamais accuser un mot
#   français au passage.
def verifier_disparus(source: str, attendus_disparus):
    """Contrôle EXACT : aucun des littéraux nommés ne doit subsister comme argument de
    `Libelle.De`. Rend la liste des survivants — vide = le travail est fait."""
    presents = {s for _, s in _tous_les_replis(source)}
    return sorted(x for x in attendus_disparus if x in presents)


def _tous_les_replis(source: str):
    """Tous les 3ᵉ arguments de `Libelle.De`, SANS jugement de langue."""
    out = []
    for i, ligne in enumerate(source.split('\n'), 1):
        nu = ligne.strip()
        if nu.startswith('//') or nu.startswith('///'):
            continue
        for m in APPEL_LIBELLE.finditer(ligne):
            out.append((i, m.group(1)))
    return out


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        print("usage : compter-litteraux-poses.py <fichier.cs> [--liste]")
        return 2
    chemin = sys.argv[1]
    detail = '--liste' in sys.argv
    # `--disparus <fichier>` : le contrôle EXACT, une chaîne par ligne. Sort non nul si l'une
    # d'elles survit — et ne peut PAS accuser un mot français, puisqu'il ne juge aucune langue.
    if '--disparus' in sys.argv:
        liste = sys.argv[sys.argv.index('--disparus') + 1]
        attendus = [l.rstrip('\n') for l in open(liste, encoding='utf-8') if l.strip()]
        survivants = verifier_disparus(open(chemin, encoding='utf-8').read(), attendus)
        print(f"{chemin} — contrôle exact sur {len(attendus)} littéraux nommés")
        print(f"  survivants : {len(survivants)}")
        for x in survivants:
            print(f"    · {x!r}")
        return 1 if survivants else 0
    src = open(chemin, encoding='utf-8').read()
    lst = poses(src)
    bruts = [x for x in lst if not x[2]]
    replis = replis_anglais(src)
    print(f"{chemin}")
    print(f"  (a) littéraux POSÉS sans clé            : {len(bruts)}")
    print(f"  (b) replis ANGLAIS passés à `Libelle`   : {len(replis)}")
    print(f"      ⇒ à convertir (a + b, populations disjointes) : {len(bruts) + len(replis)}")
    if detail:
        for i, s, _ in bruts:
            print(f"      (a) {i:5d}  {s!r}")
        for i, s in replis:
            print(f"      (b) {i:5d}  {s!r}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
