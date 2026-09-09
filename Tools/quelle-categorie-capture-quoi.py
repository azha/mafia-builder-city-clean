#!/usr/bin/env python3
"""QUELLE CATÉGORIE CAPTURE QUEL ÉCRAN — mesuré, jamais recopié.

⛔ POURQUOI UN SCRIPT ET PAS UNE TABLE. La porte Unity est la ressource rare de ce dépôt : trois
sessions se la partagent et un créneau se prend pour LANCER, pas pour chercher quoi lancer. Une
table écrite à la main répond à la question du jour et vieillit en silence ; ce balayage répond
à celle du jour où on le lance.
★ Le besoin est mesuré : deux échanges entiers cette nuit ont porté sur « quelle commande capture
  ㉟ », et la réponse — « rien de spécifique, `PhotoPlanche` suffit » — était juste et incomplète
  (il y manquait SUR QUEL ARBRE).

⚠️ TROIS PIÈGES QUE CE SCRIPT EXISTE POUR NE PAS REFAIRE :
  1. `MAFIA_CI_CATEGORIES` matche par PRÉFIXE. `Photo` prend les huit catégories `Photo*` d'un
     coup — c'est un avantage, à condition de savoir lesquelles. Le script les liste.
  2. ⛔⛔ JAMAIS `Screenshot` : onze tests de cette catégorie appellent `File.Delete` avant de
     capturer. Le script REFUSE de la proposer et le dit.
  3. Un `passed=N` ne prouve pas qu'un fichier a bougé — un mécanisme voisin
     (`ScreenCapture.CaptureScreenshot`) n'écrit pas en batchmode et ne le dit pas. ⇒ Le md5 de
     chaque planche AVANT et APRÈS reste obligatoire ; ce script ne le remplace pas.

    python3 Tools/quelle-categorie-capture-quoi.py [motif ...]
"""
import pathlib, re, sys, collections

RACINE = pathlib.Path(__file__).resolve().parent.parent / 'Assets' / 'Tests'
INTERDITE = 'Screenshot'


def catalogue():
    """(catégorie) → [(fichier, méthode de capture)] — lu sur les sources, pas sur une liste."""
    out = collections.defaultdict(list)
    for p in sorted(RACINE.rglob('*.cs')):
        t = p.read_text(encoding='utf-8', errors='replace')
        cats = sorted(set(re.findall(r'\[Category\("([^"]+)"\)\]', t)))
        if not cats:
            continue
        meths = re.findall(r'public IEnumerator (\w*[Cc]aptur\w*|\w*Planche\w*)\s*\(', t)
        for c in cats:
            for m in meths:
                out[c].append((p.name, m))
    return out


def main():
    cat = catalogue()
    motifs = [a.lower() for a in sys.argv[1:]]
    print(f'{len(cat)} catégories portant au moins une méthode de capture\n')
    for c in sorted(cat):
        if not cat[c]:
            continue
        if motifs and not any(m in c.lower() or any(m in f.lower() or m in x.lower()
                                                    for f, x in cat[c]) for m in motifs):
            continue
        marque = '⛔ INTERDITE — File.Delete avant capture' if c == INTERDITE else ''
        print(f'  {c:22} {marque}')
        for f, m in cat[c]:
            print(f'      {f:46} {m}')
    prefixes = sorted({c for c in cat if cat[c] and c != INTERDITE})
    photo = [c for c in prefixes if c.startswith('Photo')]
    print(f'\n⇒ le préfixe « Photo » couvre {len(photo)} catégories en UN run : {", ".join(photo)}')
    print(f'   et il n\'attrape PAS « {INTERDITE} » : '
          f'{not any(c.startswith("Photo") and INTERDITE in c for c in cat)}')


if __name__ == '__main__':
    sys.exit(main())
