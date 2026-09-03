#!/usr/bin/env python3
"""Chaque usage de `MafiaCleanCity.X` — `using` OU nom pleinement qualifié — est-il couvert par une référence de l'asmdef du fichier ?

⛔⛔ POURQUOI CET INSTRUMENT EXISTE — un ANGLE MORT du vérificateur de compilation à froid,
   découvert le 2026-09-02 en le payant. `Tools/verifier-compilation-sans-unity.sh` compile TOUT
   `Assets/Scripts` en UNE SEULE assembly : les frontières d'asmdef n'y existent pas, donc une
   référence d'assembly manquante lui est STRUCTURELLEMENT invisible. Il a rendu VERT sur les
   trois périmètres, avec leurs contrôles positifs, pendant que le vrai compilateur d'Unity
   sortait `CS0234: MafiaCleanCity.Onboarding n'existe pas` — et le build APK est mort dessus,
   après avoir pris la porte Unity.
   ⇒ *Un contrôle positif prouve que l'instrument voit le FICHIER, jamais qu'il sait voir la
     CLASSE de défaut en cause.* Le vert était honnête et ne couvrait pas la question.

⛔ ET LA CAUSE DU DÉFAUT LUI-MÊME EST UNE MESURE TROP LÂCHE. Pour attribuer chaque écran à son
   assembly, j'avais cherché l'asmdef en remontant d'UN SEUL cran (`<dir>/*.asmdef`,
   `<dir>/../*.asmdef`). `Assets/Scripts/Onboarding/` a la sienne ; mon motif l'a manquée et a
   rendu « Account » — donc j'ai ajouté `Account` à `Shell.asmdef` et pas `Onboarding`.
   Ici, la propriété est cherchée en REMONTANT JUSQU'À LA RACINE, ce qui est la définition
   d'Unity et non une approximation.

Sortie : 0 si tout using est couvert, 1 sinon (avec la liste). `--controle-positif` retire une
référence au hasard-déterministe et exige que le balayage ROUGISSE — sans quoi ce zéro ne vaut
rien, exactement comme le vert qu'il vient remplacer.
"""
import json, os, re, glob, sys, collections

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def charger():
    asmdefs = {}
    for a in glob.glob(os.path.join(RACINE, 'Assets/**/*.asmdef'), recursive=True):
        asmdefs[os.path.dirname(a)] = json.load(open(a, encoding='utf-8'))
    return asmdefs


def proprietaire(f, asmdefs):
    """L'asmdef qui possède ce fichier : la plus proche EN REMONTANT jusqu'à la racine."""
    d = os.path.dirname(f)
    while d and os.path.basename(d) != 'Assets' and len(d) > len(RACINE):
        if d in asmdefs:
            return d
        d = os.path.dirname(d)
    return None


def balayer(asmdefs):
    ns2asm = collections.defaultdict(set)
    fichiers = glob.glob(os.path.join(RACINE, 'Assets/**/*.cs'), recursive=True)
    for f in fichiers:
        d = proprietaire(f, asmdefs)
        if not d:
            continue
        m = re.search(r'^namespace\s+([\w.]+)', open(f, encoding='utf-8', errors='replace').read(), re.M)
        if m:
            ns2asm[m.group(1)].add(asmdefs[d]['name'])

    manques = []
    for f in fichiers:
        d = proprietaire(f, asmdefs)
        if not d:
            continue
        a = asmdefs[d]
        refs = set(a.get('references', []))
        src = open(f, encoding='utf-8', errors='replace').read()
        # ⚠️ LES COMMENTAIRES D'ABORD — sinon l'outil accuse de la DOCUMENTATION. Mesuré au premier
        # essai du motif qualifié : il a signalé `CityMap` pour `MafiaCleanCity.AssetLint`, dont
        # l'unique occurrence du fichier est un `<see cref="MafiaCleanCity.AssetLint.…"/>` dans un
        # commentaire XML. Un renvoi de doc ne crée aucune dépendance d'assembly.
        # ★ *Un outil qui accuse à tort est pire que celui qui rate* : j'ai failli livrer un
        #   vérificateur qui rougit sur une phrase.
        src = re.sub(r'/\*.*?\*/', ' ', src, flags=re.S)      # blocs /* */ (donc aussi /** */)
        src = re.sub(r'//[^\n]*', ' ', src)                    # lignes // et ///
        # ⛔⛔ DEUX FORMES, PAS UNE — et la seconde a laissé passer un build CASSÉ dans `main`
        # le 2026-09-03. Cet outil ne cherchait que `using MafiaCleanCity.X;`. Or un lot i18n a
        # écrit `MafiaCleanCity.I18n.Libelle.De(...)` PLEINEMENT QUALIFIÉ, sans `using` : trois
        # asmdef (`Account`, `Economy`, `CoreLoops`) utilisaient le namespace sans le référencer,
        # Unity a rendu `CS0234`, et cet outil disait ✅.
        # ★ Le vérificateur à froid ne pouvait pas le voir non plus (il compile tout en UNE
        #   assembly) : les deux instruments étaient verts sur un arbre qui ne compile pas.
        #   *Un namespace s'utilise de deux façons ; en surveiller une seule, c'est n'en
        #   surveiller aucune.*
        # ⚠️ Le motif qualifié exige un point APRÈS le namespace (`MafiaCleanCity.I18n.`) pour ne
        #   pas confondre `MafiaCleanCity.I18nCatalog` avec `MafiaCleanCity.I18n` — la frontière de
        #   mot en milieu d'identifiant, le piège que ce dépôt a déjà payé sur `BuildingTypeIcon`.
        formes = {}
        for u in re.findall(r'^using\s+(MafiaCleanCity[\w.]*);', src, re.M): formes[u] = 'using'
        utilises = set(formes)
        for ns_q in re.findall(r'\b(MafiaCleanCity(?:\.[A-Z]\w*)+)\s*\.', src):
            utilises.add(ns_q); formes.setdefault(ns_q, 'nom qualifié')
            while '.' in ns_q[len('MafiaCleanCity.'):]:
                ns_q = ns_q.rsplit('.', 1)[0]
                utilises.add(ns_q); formes.setdefault(ns_q, 'nom qualifié')
        for ns in sorted(utilises):
            fournisseurs = ns2asm.get(ns, set())
            # namespace inconnu (aucun fichier ne le déclare) : hors sujet ici, le compilateur
            # le dira. Fichier dans SA propre assembly : rien à référencer.
            if not fournisseurs or a['name'] in fournisseurs:
                continue
            if not (refs & fournisseurs):
                manques.append((os.path.relpath(f, RACINE), f"{formes.get(ns,'using')} {ns}",
                                a['name'], sorted(fournisseurs)))
    return manques, len(fichiers), len(ns2asm)


def main():
    cp = '--controle-positif' in sys.argv
    asmdefs = charger()

    if cp:
        # ⚠️ CIBLE CHOISIE, PAS ALÉATOIRE, et sur une propriété RÉELLE : on retire de `Shell` la
        #    référence qui manquait vraiment. Un contrôle positif qui invente une faute
        #    impossible prouve moins qu'un qui rejoue celle qu'on vient de payer.
        cible = next((d for d, a in asmdefs.items() if a['name'] == 'Shell'), None)
        if cible is None:
            print("✗ CONTRÔLE POSITIF IMPOSSIBLE : assembly `Shell` introuvable"); return 2
        avant = list(asmdefs[cible]['references'])
        if 'Onboarding' not in avant:
            print("✗ CONTRÔLE POSITIF IMPOSSIBLE : `Shell` ne référence pas `Onboarding`"); return 2
        asmdefs[cible]['references'] = [r for r in avant if r != 'Onboarding']
        manques, _, _ = balayer(asmdefs)
        if manques:
            print(f"✓ CONTRÔLE POSITIF : la référence retirée rougit ({len(manques)} using non couvert) "
                  f"— le balayage VOIT cette classe de défaut.")
            for f, ns, a, four in manques:
                print(f"    {f} · using {ns} · assembly {a} ne référence aucun de {four}")
            return 0
        print("✗ CONTRÔLE POSITIF ÉCHOUÉ : référence retirée et le balayage reste VERT — il ne "
              "peut pas détecter une référence d'assembly manquante, son zéro ne prouve rien.")
        return 1

    manques, nb_fichiers, nb_ns = balayer(asmdefs)
    print(f"  {len(asmdefs)} asmdef · {nb_fichiers} fichiers .cs · {nb_ns} namespaces fournis")
    # ⚠️ ANTI-VACUITÉ : un balayage qui ne trouve ni asmdef ni fichier rendrait « 0 manque » —
    #    vert pour n'avoir rien regardé, le mode d'échec que cet instrument existe pour remplacer.
    if len(asmdefs) < 5 or nb_fichiers < 50:
        print("  ⛔ le balayage ne voit pas l'arbre (trop peu d'asmdef ou de fichiers) : son zéro "
              "ne vaudrait rien."); return 2
    if not manques:
        print("  ⇒ ✅ tout usage de `MafiaCleanCity.*` (using ET nom qualifié) est couvert par l'asmdef de son fichier.")
        return 0
    print(f"  ⇒ ⛔ {len(manques)} usage(s) NON COUVERT(s) — Unity sortira CS0234 dessus :")
    for f, ns, a, four in manques:
        print(f"    {f}\n      {ns} · l'assembly {a} ne référence aucun de {four}")
    return 1


if __name__ == '__main__':
    sys.exit(main())
