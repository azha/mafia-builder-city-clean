# La course entre un rendu de test et l'auto-chargement au montage — balayage de classe, 2026-09-04

## Le défaut

Le dépôt prescrit que **l'écran se charge lui-même au montage** : le shell monte le locataire et
lui passe un jeton, il n'appelle jamais la méthode de chargement. Sans un `StartCoroutine(Charger())`
dans `Start()`, l'écran se construit et reste vide pour toujours.

Ce patron, juste et nécessaire, **crée une course** avec les tests qui rendent explicitement :

```
AddComponent<T>()                     → Awake, pas de Start encore
test : RendrePourTest(corpsFabrique)  → MÊME frame, renderedTexts se remplit
yield return null                     → une frame passe
Start() → StartCoroutine(Charger())   → la charge réseau part
Charger() échoue                      → RendreEtatIndisponible() → renderedTexts.Clear()
assertions                            → le contenu attendu a disparu
```

★ **Le test n'est vert que si la charge réseau est plus LENTE qu'une frame.** Mesuré sur ㉚ : le
back de dev répondait en ~400 ms, donc les assertions passaient d'abord, et le test était vert par
la lenteur d'un tiers. Il a rougi dans un run à huit catégories d'une autre branche, où il a été
pris pour la régression de quelqu'un d'autre. *Un vert obtenu parce qu'un tiers est lent tombe le
jour où le tiers est absent — et il tombe chez le voisin.*

## Le correctif

Un rendu **EXPLICITE** annule l'auto-chargement : chaque `Rendre…PourTest` pose le drapeau que
`Start()` consulte avant de lancer sa coroutine. Aucun changement pour le chemin joueur, qui ne
passe jamais par ces méthodes.

## Le balayage — critère double

Un écran n'est en risque que s'il réunit les **deux** conditions : un auto-chargement dans `Start()`
**et** une suite qui l'instancie et appelle un rendu de test. L'une sans l'autre n'a pas de course.

⚠️ Premier balayage écarté : il appariait les suites aux contrôleurs **par nom de méthode**
(`RendrePourTest` est commun à tous) et rendait donc les 8 mêmes suites pour chaque écran — un
résultat **uniforme**, signe qu'un instrument mesure autre chose. Réapparié par le type que chaque
suite instancie (`AddComponent<T>` / `MonterLocataireEnSurimpression<T>`), il discrimine.

| écran | auto-chargement | suite qui rend explicitement | statut |
|---|---|---|---|
| `ChaineDApproScreenController` (㉚) | OUI | `ChaineDApproScreenPlayModeTests` | ✅ corrigé (`2efdf2e`) — 2 rendus |
| `DistributionScreenController` (㉘) | OUI | `DistributionScreenPlayModeTests` | ✅ corrigé |
| `LoiScreenController` (㉛) | OUI | `LoiScreenPlayModeTests` | ✅ corrigé |
| `ConflitScreenController` (㉙) | OUI | `ConflitScreenPlayModeTests` | ✅ corrigé |
| `DelegationScreenController` | OUI | `DelegationScreenPlayModeTests` | ⛔ **à router — pas à moi** |
| `ReputationScreenController` | OUI | `ReputationScreenPlayModeTests` | ⛔ **à router — pas à moi** |
| `DashboardController` | non | `ExceptionQueuePlayModeTests` | hors classe |
| `ExceptionQueueController` | non | `ExceptionQueuePlayModeTests` | hors classe |
| `HorizonScreenController` | non | `HorizonScreenPlayModeTests` | hors classe |

**Comptes** : 30 contrôleurs `IShellTenant` inspectés · 9 réunissent un rendu de test et une suite
qui l'instancie · **6 en risque** (auto-chargement présent) · 3 hors classe (pas d'auto-chargement)
· **4 corrigés** (les miens) · **2 à router**.

## Ce qui n'est pas prouvé

Le rouge n'a **pas été reproduit de mes yeux** : il demande la porte Unity, tenue ailleurs. Le
mécanisme est établi par lecture du corps et par l'existence de la fenêtre de course ; la
reproduction viendra avec la prochaine capture de contrôle.

⚠️ Et une hypothèse **réfutée avant d'écrire une ligne**, qu'on note pour qu'elle ne revienne pas :
j'ai d'abord soupçonné le catalogue i18n amorcé par un test voisin, qui aurait fait rendre une
TRADUCTION là où le test asserte un littéral. Le bundle porte bien **10 clés `appro.*`** ajoutées
entre-temps — mais `appro.bouton.en_commander` vaut **exactement « EN COMMANDER »**, donc elle ne
peut rien casser. *Une explication plausible et une explication vraie se ressemblent jusqu'à la
mesure.*

⚠️ Quatre compteurs maison ont menti dans cette seule journée (motif d'une ligne ratant les formes
multi-lignes · commentaires comptés comme du code · comptage par sous-chaîne ramassant des voisins ·
fenêtre de lecture trop courte déclarant un correctif incomplet). **À chaque fois, c'est la lecture
du code qui a tranché, jamais un second compteur.**

## Le critère, corrigé DEUX FOIS par les pairs — et ce que ça a changé au compte

Mon premier contrôle était **« un `yield return` = une relecture du drapeau »**, avec égalité stricte.
Deux sessions l'ont réfuté le même jour, chacune sur un point différent, et les deux avaient raison.

**F** : l'égalité stricte **CONDAMNE le correctif par ARRÊT**. Une poignée retenue plus
`StopCoroutine` coupe la coroutine à *tout* point de reprise d'un coup, sans une seule relecture —
un écran ainsi corrigé rend `yields > relectures` et serait accusé à tort. ⇒ La propriété à asserter
est **« toute reprise est couverte »** ; l'arrêt et la relecture en sont deux implémentations, et le
compte seul n'en distingue aucune. *Un contrôle qui mesure une IMPLÉMENTATION au lieu de la
PROPRIÉTÉ accuse le correctif qui a choisi l'autre.*

**B** : le compte des `yield` de `Charger()` **ne voit pas la bonne population**. Sur ⑨, une SECONDE
coroutine **détachée** (`StartCoroutine(client.GetLieutenant(…))` lancée depuis `Rendre()`) survit à
l'arrêt de la première et écrit le vrai nom plusieurs frames après le corps imposé. ⇒ Le dénominateur
juste est **le nombre de `StartCoroutine` du FICHIER**, chacun retenu et arrêté nommément ou couvert
par relecture.

### Mes 4 écrans sur le critère de B — mesuré, pas déduit

| écran | `StartCoroutine` | de chargement (poignée + arrêt) | d'ACTION | lancé depuis un rendu ? |
|---|---|---|---|---|
| ㉚ appro        | 2 | 1 ✔ | `PasserCommandeCoroutine` | **non** — `PasserCommande()`, clic |
| ㉘ distribution | 3 | 1 ✔ | `EnvoyerCeSoirCoroutine`, `AcheterVehiculeCoroutine` | **non** — clic |
| ㉛ loi          | 3 | 1 ✔ | `RecruterAvocatCoroutine`, `BasculerRetainerCoroutine` | **non** — clic |
| ㉙ conflit      | 2 | 1 ✔ | `EnvoyerCeSoirEtRecharger` | **non** — et pas même câblée à un bouton |

**0 coroutine détachée lancée depuis un chemin de rendu** : le cas (b) de B n'existe pas ici. Les six
coroutines d'action ne partent que d'une méthode publique qu'un CLIC (ou un test explicite) appelle.

⛔ **Et je ne les garde PAS**, délibérément. Elles rendent après leurs `yield`, et c'est leur travail :
un test qui clique VEUT voir le rechargement. Y poser le drapeau supprimerait le comportement en
croyant supprimer un défaut — *après avoir durci un critère, recompter ce qui passe encore*. Le jour
où un test cliquera **et** imposera un corps, elles entreront dans la population ; ce jour-là c'est
l'arrêt nommé qu'il faudra, pas la relecture.
