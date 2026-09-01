# ㊲ `screen_b3` — la séquence à exécuter DÈS le retour de focus, dans cet ordre

> Écrite AVANT l'événement, pendant l'attente. L'ordre n'est pas indifférent : le premier pas
> consomme l'événement de la sonde, et on ne l'a qu'une fois.

## 0. L'état au moment où cette liste a été écrite

- machine : 7 conteneurs (base de dev), plancher de f1 terminé et vert (573/0)
- sonde 1 **armée** : empreinte prise à 22:56:39, journal horodaté ouvert en fond
  (`Tools/.sonde-isolation-journal.tsv`, relevé toutes les 5 s des deux arbres + charge)
- compilation vérifiée hors Unity : 145 sources, 0 erreur, contrôle positif rouge comme attendu
- verrou `Temp/UnityLockfile` présent depuis 21:15:12 ⇒ **aucun batchmode possible**, le focus est
  le seul chemin

## 1. Le verdict de la sonde — AVANT tout le reste

    Tools/sonde-isolation-editeurs.sh --apres

Il refusera de conclure si l'éditeur B n'a pas recompilé (« CONTRÔLE POSITIF ÉCHOUÉ »), et c'est
voulu : sans événement, « A inchangé » ne prouve rien. Trois issues possibles :

| sortie | signification | suite |
|---|---|---|
| `✓ ISOLATION CONFIRMÉE` | B a recompilé, A n'a pas bougé d'un octet | continuer, et le consigner |
| `⚠️ A A BOUGÉ` | **pas** un verdict de non-isolation | croiser avec le journal : la session 98 pilote A et peut l'avoir compilé elle-même. Écarter cette cause AVANT de conclure |
| `CONTRÔLE POSITIF ÉCHOUÉ` | l'événement n'a pas eu lieu | redonner le focus, ne rien conclure |

## 2. Les erreurs de compilation RÉELLES

`~/.config/unity3d/Editor.log` est le log de CET éditeur (vérifié : « Successfully changed project
path to: /home/erutheone/project/mafia-unity-B »). Y chercher les `error CS`.

⚠️ **Ne pas s'attendre à zéro.** La vérification hors Unity couvre la syntaxe, les types et les
frontières d'assembly — pas ce que l'éditeur ajoute (attributs de sérialisation, contraintes de
define, ordre de compilation réel des assemblies). Un rouge ici n'invalide pas la passe statique :
il mesure autre chose.

## 3. ⚠️ LES `.meta` — le pas qu'on oublie

Mesuré : mes 6 fichiers n'ont **aucun** `.meta`, et ce projet les SUIT dans git (30 rien que dans
`Assets/Scripts/Operational/`). Unity les génère au premier refresh.

    git status --porcelain 'Assets/Scripts/Operational/Reputation/*.meta' 'Assets/Tests/PlayMode/*.meta'

⇒ Les commiter **avec** le code. Un `.cs` commité sans son `.meta` donne à tout autre poste un GUID
différent au prochain import : les références sérialisées se cassent, et le défaut apparaît chez
quelqu'un d'autre, plus tard, sans rapport visible avec ce lot.

## 4. Les tests, du plus scopé au plus large

    # d'abord le seul test qui ne dépend de rien de visuel :
    B3P1_PolariteDesTells_VierteZero_EtControlePositifQuatre
    # puis les structurels, puis les trous déclarés, puis l'échec, puis la capture

⛔ **Vérifier que le test visé est DANS LE COMPTE du run.** Un filtre inexact exécute un autre jeu
et le déclare vert — mesuré ici : `category_names: ["HUD"]` a rendu 31/31 VERT avec le défaut
réarmé exprès, parce que le filtre matche par PRÉFIXE et qu'aucune catégorie « HUD » n'existe. Ma
catégorie est `ScreenB3`, la capture porte en plus `Capture`.

⛔ **Ne pas entrer en Play Mode avec le shell** tant que la surcharge d'identité de 98 n'est pas
livrée ET vérifiée (sa revue ⊥ a rendu NOT_APPROVED, 2 bloquants, dont un qui écrase l'appel
explicite `SetIdentity()` sur 11 sites d'appel). Ma suite monte le locataire SEUL — c'est déjà le
cas, ne pas « améliorer » ça.

## 5. Les captures, puis les deux juges

Le test `B3C1` produit trois PNG : 1080×1920, 1080×2400, et **1080×1920 à T+1 s** (la paire qui
prouve l'absence d'animation — ruling 2026-08-27).

Puis remplir les quatre **À REMPLIR** de `Tools/juge-visuel/reputation/r1-2026-08-30/dossier.md` :
les rects imprimés (`[CAPTURE b3]` dans le log), les `fc-match`, l'état capturé, le SHA du client.
⇒ **Alors seulement** lancer le juge visuel ⊥ — agent NEUF, jamais moi, jamais un fork.

⚠️ Le juge reçoit la **v2** de la maquette, qui vit dans l'arbre principal
(`mafia-builder-city-clean/Tools/juge-visuel/v6/`). Les PNG de CE worktree sont la v1, périmée. Et
les cadres ont été RENUMÉROTÉS entre les deux : les identifier par leur ÉTIQUETTE, jamais par leur
numéro.

## 6. Ce qui reste dû après ça

- le `juge-donnees` en mode **clôture** (B vs M vs F) — il n'a tourné qu'en mode maquette ;
- la **spec parcours** back de S13 (couche 2 de la stratégie de test) : un écran n'est « faisable »
  que si elle est verte. Elle n'existe pas — ce n'est pas mon périmètre, mais l'écran n'est pas
  clos sans elle ;
- les 4 jetons de couleur, si l'user tranche l'arbitrage DA en faveur du canon.
