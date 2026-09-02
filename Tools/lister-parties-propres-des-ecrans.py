#!/usr/bin/env python3
"""Quels écrans parentent leurs PARTIES sous `mountParent` — donc en FRÈRES de leur host ?

⛔⛔ POURQUOI — trois sessions ont payé le même angle mort le 2026-09-02, séparément :
   · f1 : « frère 6 sur 11 », corrigé trois fois le mauvais objet ;
   · moi : ma sonde a accusé `[LaunderingBackdrop, LaunderingSheet]` — les propres parties de
     l'écran qu'elle mesurait ;
   · 85 : « frère 0 sur 3 », qui s'est révélé être `LieutenantBackdrop` + `LieutenantSheet`.
   Chaque fois : une garde de RANG DE FRATRIE lit « ce qui vient après moi » et compte l'écran
   comme son propre fossoyeur. *« Ce qui est après moi dans la fratrie » n'est pas « ce qui
   m'enterre ».*

⇒ Ce n'est pas un cas isolé : **DIX** écrans le font. Toute garde de rang les rencontrera, et
  chaque test qui se réécrit sa propre liste d'exclusion la fera incomplète — un producteur,
  N citations, jamais N listes.

⚠️ ET LA MESURE A DEUX MOTIFS FAUX DERRIÈRE ELLE, ce qui justifie le contrôle positif :
   `SetParent\\((root|mountParent)` rend **0 partout** (les parties sont créées par un helper
   `NewUI(nom, root)`, pas par un `SetParent` explicite). Un balayage UNIFORME à zéro ne dit pas
   « il n'y en a pas », il dit « je ne mesure pas ça ».

Sortie : un écran par ligne, avec le nom de ses parties. Code 1 si le contrôle positif échoue.
"""
import glob, os, re, sys

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
# Le cas mesuré INDÉPENDAMMENT par une autre session : si le motif ne le trouve pas, il est faux.
TEMOIN = ('LieutenantScreenController', 'LieutenantBackdrop')


def balayer():
    trouve = {}
    for f in glob.glob(os.path.join(RACINE, 'Assets/Scripts/**/*Controller.cs'), recursive=True):
        t = open(f, encoding='utf-8', errors='replace').read()
        m = re.search(r'Transform\s+(\w+)\s*=\s*mountParent\s*!=\s*null\s*\?\s*mountParent', t)
        if not m:
            continue
        parties = re.findall(r'NewUI\(\s*"([^"]+)"\s*,\s*' + m.group(1) + r'\s*\)', t)
        if parties:
            trouve[os.path.basename(f)[:-3]] = parties
    return trouve


def main():
    ecrans = balayer()
    # ⚠️ ANTI-VACUITÉ : un balayage qui ne voit pas l'arbre rendrait « 0 écran » — vert pour
    #    n'avoir rien regardé, exactement le mode d'échec des deux motifs qui ont précédé celui-ci.
    if len(ecrans) < 3:
        print(f"⛔ {len(ecrans)} écran(s) seulement : le motif ne voit pas l'arbre, son résultat ne vaut rien.")
        return 2
    nom, partie = TEMOIN
    if partie not in ecrans.get(nom, []):
        print(f"✗ CONTRÔLE POSITIF ÉCHOUÉ : {nom} devrait porter {partie}. Le motif rate un cas "
              f"mesuré indépendamment — ne pas se fier à cette liste.")
        return 1
    print(f"  {len(ecrans)} écran(s) parentent leurs parties sous `mountParent` ⇒ FRÈRES de leur host :")
    for n in sorted(ecrans):
        print(f"    {n:<38} {', '.join(ecrans[n])}")
    print(f"\n  ✓ contrôle positif : {nom} porte bien {partie}.")
    print("  ⇒ Toute garde de rang de fratrie DOIT exclure ces noms avant de conclure qu'un écran "
          "est recouvert.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
