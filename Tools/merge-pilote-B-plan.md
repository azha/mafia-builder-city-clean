# Merge `pilote-B` → `main` — résolution PRÉPARÉE, mesurée avant le merge

> Mesuré le 2026-09-02 sur `main` = `1a358ea` et `pilote-B` = `138f8c6` (95 commits hors `main`).
> **À rejouer après le commit de B** : elle capture avant de commiter, donc son `case Tab.More` et
> sa réécriture d'`AppShellPlayModeTests` **n'étaient pas encore dans la branche** au moment de
> cette mesure — `git diff --numstat` rend **vide** sur `AppShell.cs` et `AppShellPlayModeTests.cs`.
> ⇒ *Une intelligence de merge décrit l'intention ; seule la branche dit ce qui y est.*

## Les deux conflits, lus dans le CORPS et non au diff

`git merge-tree --write-tree main pilote-B` ⇒ **2 conflits de contenu**, tous deux dans l'outillage
partagé, aucun dans le métier :

### 1. `Assets/Editor/MafiaCI.cs` — le filtre du juge

**Chaque côté retire une catégorie que l'autre porte.** Ce n'est donc pas un « prendre l'un des
deux » : les deux résolutions naïves perdent des tests **en silence**.

```
main     (6) : W4P4a · W3UDA · W3U1 · W3U2 · Charpente · DemoIdentity
pilote-B (6) : W4P4a · W3UDA · W3U1 · W3U2 · Charpente · ScreenB3
  B retire    : DemoIdentity     ⇒ 55 tests sortiraient du filtre
  main retire : ScreenB3         ⇒ l'écran ㊲ ne serait jamais joué
```

⇒ **RÉSOLUTION : union explicite des 7.** Et **garder le mécanisme de surcharge de B**
(`MAFIA_CI_CATEGORIES`) : il répond au défaut que ce dépôt a déjà payé — le log ne nomme que les
tests qui ÉCHOUENT, donc « 0 échec » ne distingue pas « tout est vert » de « le filtre n'a rien
matché ». Un run scopé sur une seule catégorie rend un `passed=N` qui est une **preuve
d'exécution**, pas une absence d'échec. Non posée, la variable laisse le comportement inchangé.

⚠️ **CONTRÔLE OBLIGATOIRE APRÈS MERGE, et il doit être COLLÉ au message** : recompter les tests
**exécutés** (`passed=` + `failed=`), pas les tests découverts. Le piège maison est un filtre par
**préfixe** qui a rendu `31/31 VERT` sur une catégorie qui n'existait pas. Attendu : le total
d'après ≥ le total d'avant, et **`ScreenB3` non nul** — il vaut `0` dans l'arbre courant
uniquement parce que le fichier de B n'est pas encore commité, ce qui est à re-vérifier et non à
conclure.

### 2. `Tools/run-unity-check.sh` — le harnais

`main +47/−2` · `pilote-B +18/−2`. **Les deux côtés ont corrigé le harnais indépendamment**, et
celui de B répare un défaut de ciblage : *le harnais visait l'arbre d'une AUTRE session*. Aucune
des deux versions n'est un sur-ensemble de l'autre.
⇒ **RÉSOLUTION : lire les deux correctifs dans le corps et composer**, jamais choisir un côté au
diff. Le critère : le script doit (a) viser l'arbre de la session qui l'exécute, (b) conserver la
préservation du log et l'impression de sa propre durée, (c) garder le chien de garde de sortie.

## Ce que ce plan NE couvre PAS

- Le travail non commité de B (`Tab.More`, `AppShellPlayModeTests`). **À re-mesurer après son
  commit** — ce document serait faux si on le rejouait tel quel.
- Les 47 commits de `pilote-B` absents de `origin/pilote-B` : le merge se fait depuis la branche
  **locale**, même dépôt d'objets. Rien à pousser pour merger.
- `AppShell.cs` : **aucun recouvrement mesuré** avec R4 aujourd'hui, à re-vérifier après le commit
  de B pour la même raison.
