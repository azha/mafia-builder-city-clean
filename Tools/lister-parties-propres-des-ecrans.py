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


def hosts_sans_recttransform():
    """Quels contrôleurs N'AJOUTENT PAS de `RectTransform` à leur propre host ?

    ⛔ Seconde question que les gardes de capture doivent poser, et pour la même raison que la
       première : `ConstruireLocataire` crée `new GameObject($"Tenant_{T}")` — un GameObject NU.
       Un test qui fait `(RectTransform)<locataire>.transform` jette donc `InvalidCastException`…
       SAUF si le contrôleur s'en ajoute un lui-même, ce que la plupart font.
    ⚠️ ET C'EST LÀ QUE J'AI EU TORT AVANT DE MESURER : ayant vu le cas Lieutenant (mesuré par la
       session 85), j'ai compté les `(RectTransform)x.transform` des tests de capture, trouvé
       « cinq sites », et annoncé une classe. **Quatre des cinq ajoutent le composant** — leur cast
       est sûr. Et les 7 écrans de la planche l'ajoutent tous. Il ne restait qu'UN site, déjà
       corrigé. *Un hit VU est un fait déduit ; seul un hit CLASSÉ est un fait compté* — j'ai
       compté juste et lu faux, ce qui est plus crédible qu'une erreur de comptage.
    """
    sans = []
    for f in glob.glob(os.path.join(RACINE, 'Assets/Scripts/**/*Controller.cs'), recursive=True):
        t = open(f, encoding='utf-8', errors='replace').read()
        if 'IShellTenant' not in t:
            continue
        if not re.search(r'(gameObject|this)\.AddComponent<RectTransform>\(\)', t):
            sans.append(os.path.basename(f)[:-3])
    return sorted(sans)


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

    sans = hosts_sans_recttransform()
    print(f"\n  {len(sans)} locataire(s) SANS `RectTransform` sur leur propre host — un test qui fait")
    print("  `(RectTransform)<locataire>.transform` y jette InvalidCastException :")
    for n in sans:
        print(f"    {n}")
    # Contrôle positif de CETTE question : Lieutenant doit y être (InvalidCastException mesurée
    # par la session 85). S'il n'y est pas, le motif rate le seul cas confirmé.
    if 'LieutenantScreenController' not in sans:
        print("✗ CONTRÔLE POSITIF ÉCHOUÉ : Lieutenant devrait être dans cette liste.")
        return 1
    print("  ✓ contrôle positif : Lieutenant y est bien.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
