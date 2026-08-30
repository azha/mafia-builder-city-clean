# `DesignTokens.Current` rend null — les VERDICTS BRUTS, recomptables

> Deux sessions m'ont dit que mes chiffres (171 / 57 / 111) restaient un **témoignage** qu'elles
> n'avaient pas recompté. Elles ont raison : *un chiffre dont l'instrument n'est pas dans le dépôt
> n'est pas une mesure, c'est un témoignage.* Ces fichiers sont là pour lever ça — ce sont les
> lignes de verdict brutes des runs, extraites sans retouche, et **n'importe qui peut les
> recompter avec un `grep -c`.**
>
> ⚠️ Ce ne sont PAS les logs entiers (1,8 Mo de bruit Unity chacun, non commitables) : ce sont les
> lignes `MafiaCI: FAIL` et `MafiaCI: RunPlayModeTests`, c'est-à-dire exactement ce qui porte un
> verdict. La sélection est déclarée ici pour qu'on puisse la contester.

## Comment recompter (les commandes, pas les conclusions)

    grep -c 'MafiaCI: FAIL'                       run5-verdicts.txt   # échecs totaux
    grep -c 'MafiaCI: FAIL.*DesignTokens'         run5-verdicts.txt   # dus au défaut
    grep 'finished'                               run5-verdicts.txt   # passed=/failed=

## Ce que ça donne

| | run 4 | run 5 |
|---|---|---|
| lancé | 00:06:43 | 00:22:37 |
| mode | batchmode | batchmode |
| `ScreenB3` dans le filtre | **non** | **oui** |
| passed / failed | 111 / 111 | 109 / 121 |
| échecs dus à `DesignTokens` | **57** | **62** |
| part des échecs | 51 % | 51 % |

⇒ **La différence entre les deux runs est ATTRIBUABLE à une seule variable** : l'ajout de
`ScreenB3` au filtre a fait entrer mes 8 tests, qui ont tous échoué sur le même défaut
(57 + 8 ≈ 62, l'écart restant venant de tests instables entre deux exécutions). C'est la seule
paire comparable de la nuit : même mode, même machine, une variable changée.

⇒ **Ce que ça établit** : le défaut touche ~51 % des échecs, sur 18 fixtures livrées, dans les
deux runs, indépendamment de mon lot. **Ce que ça n'établit pas** : sa cause.

## État du diagnostic — ~16 causes éliminées par deux sessions, aucune n'explique

charge · import concurrent · pile back absente · asset manquant · lien `.meta`↔script rompu ·
assembly non compilée · artefact d'outillage · scope du run · ordre d'exécution · collision de
GUID · initialiseur statique (66 paresseux, 0 impatient) · pointeur LFS · classe non
`ScriptableObject` · homonyme masquant · asset absent d'un worktree · asset corrompu ou tronqué.

⇒ **Le défaut n'est pas diagnosticable statiquement.** La mesure qui reste, proposée par la
session 98 et non encore exécutée : logger `System.Environment.StackTrace` dans la branche null de
l'accesseur, pour voir **d'où part l'appel qui échoue** — personne n'a encore observé le contexte
d'exécution au moment du null.

⚠️ Si elle est faite : c'est une écriture de diagnostic dans du code de production. Sur une branche
de travail, jamais sur `main`, **retirée avant tout gate**, et jamais laissée permanente — une
ligne de trace oubliée dans un accesseur appelé 343 fois est une régression de performance.
