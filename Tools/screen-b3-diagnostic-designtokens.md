# Le rouge de `DesignTokens.Current` — PAS le lot ㊲, et la cause reste INCONNUE

> ⚠️ Ce document a été écrit en trois passes et **deux de ses affirmations ont été retirées**
> par des mesures ultérieures. Elles sont conservées barrées plutôt que supprimées : une
> explication qu'on efface revient toujours, une explication qu'on garde avec sa réfutation
> ne revient pas. Lire jusqu'au bout avant d'agir — **la seule chose établie est ce que ce
> rouge N'EST PAS.**

Mesuré le 2026-08-30 à 23:22, au premier run PlayMode du lot.

## Le symptôme

    B3P1_PolariteDesTells_VierteZero_EtControlePositifQuatre → ÉCHEC
    « Unhandled log message: '[Error] DesignTokens.Current: Resources.Load("DesignTokens")
      a renvoyé null — Assets/Resources/DesignTokens.asset est-il présent et importé ?' »

⚠️ **Aucune de mes assertions n'a échoué.** Le test tombe parce qu'un log d'ERREUR non attendu a
été émis pendant son exécution — ce qui est un mode d'échec distinct, et la distinction décide de
la suite : un test qui échoue sur son assertion accuse le code qu'il teste ; un test qui échoue
sur un log d'erreur accuse ce qui a émis ce log.

## Le contrôle positif — fait AVANT toute correction

La tentation était de « réparer » `ReputationResolvers`, qui lit `DesignTokens.Current`. Le socle
l'interdit : *ne jamais accuser le code avant une reproduction scopée*. J'ai donc lancé un fixture
**livré, vert par le passé, sans aucun rapport avec ce lot** :

    MafiaCleanCity.Theme.Tests.DesignTokensPlayModeTests  →  3 / 3 ÉCHECS

    · Current_LoadsViaResources_NotNull        « DesignTokens.Current a renvoyé null —
                                                 Resources.Load("DesignTokens") n'a rien trouvé »
    · Current_AccentGold_MatchesHarvestedValue  NullReferenceException
    · Current_SurfaceBase_DiffersFromTypeDefault  Expected: not null / But was: null

⇒ **Le défaut est antérieur à mon lot et reproductible sans lui.** Un correctif écrit sur cette
base aurait modifié du code sain pour un symptôme dont la cause est ailleurs — et il serait parti
avec l'autorité d'une mesure.

## ⛔ L'EXPLICATION QUE J'AVAIS DONNÉE ÉTAIT FAUSSE — rétractée le 2026-08-30 à 23:30

J'avais rattaché ce rouge à une entrée du socle :

> « 65 `static readonly Color = DesignTokens.Current.*` étaient VERTS en run complet et ROUGES en
> run scopé à froid — l'initialiseur statique tombe en contexte constructeur où `Resources.Load`
> jette. »

**Deux vérifications, faites après coup, la démolissent** — et c'est la session 98 qui a ouvert la
question, pas moi :

    Assets/Resources/DesignTokens.asset          PRÉSENT, 4573 o, .meta présent, chemin exact
    static readonly … = DesignTokens.Current     4 sites — TOUS dans Assets/Tests/PlayMode
                                                 (ChromeTabAccentAllowlist ×2, Hud, TopBarDoctrine)
    dans Assets/Scripts/Operational/Reputation/  **0**  (contrôle positif : 4 `static readonly`
                                                 tout court — le motif mord)

1. **L'énoncé du socle est PÉRIMÉ** : il annonce 65 sites, il y en a **4**. Le lot qui a payé ce
   défaut les a supprimés depuis. J'ai repris un nombre daté sans le recompter — *un nombre repris
   d'un rapport sans être recompté est un fait DÉDUIT*, y compris quand il vient du socle.
2. **La classe ne s'applique pas à mon code.** Mon écran n'a AUCUN initialiseur statique touchant
   `DesignTokens` : ses 4 `static readonly` sont les couleurs locales (`Encre`, `Panneau`,
   `Lisere`, `Vert`), qui ne lisent rien. Les 15 jetons canon passent par des **propriétés**
   (`=> DesignTokens.Current.x`), évaluées à l'appel. Mon rouge vient donc d'un appel à
   **l'exécution** (`BuildLayout` → `NouveauTexte` → `.primaryFont`), pas d'un initialiseur.

⇒ *Ouvrir un précédent pour une propriété ne le classe pas sur les autres.* J'ai reconnu le nom
« DesignTokens.Current » et l'ai rangé dans le tiroir d'une entrée existante, sans vérifier que la
forme correspondait. **L'explication était confortable et fausse.**

## Ce qui TIENT, et pourquoi ce n'est pas la même chose

Le FAIT reste entier, parce qu'il repose sur une mesure indépendante et non sur cette explication :
**un fixture livré, sans rapport avec ce lot, échoue 3/3 avec la même cause.** Le rouge n'est donc
pas dans mon code. C'est l'EXPLICATION de sa cause qui est retirée, pas le constat.

~~⇒ La piste qui reste : la base d'assets n'était pas prête, deux éditeurs important pendant un
démarrage de plancher.~~ **RÉFUTÉE à 23:47** — le fixture témoin échoue à l'identique sur machine
calme (7 conteneurs, 0 shard, charge 1,39, pile à 200). Voir la section de re-mesure plus bas.
⇒ Je laisse la phrase barrée parce qu'elle était *plausible* : c'est précisément le genre
d'explication qui épargne une mesure, et qu'on ne re-mesure jamais parce qu'elle arrange.

## Ce qui reste NON TRANCHÉ, et la mesure qui trancherait

Deux hypothèses restent ouvertes, et elles n'appellent pas le même geste :

1. **Base d'assets non prête au moment du run** — deux éditeurs importaient et un plancher
   démarrait. ⇒ le même fixture témoin devient VERT sur machine calme, sans qu'une ligne change.
2. **L'asset n'est pas réimporté dans CET éditeur** — le refresh de 23:20 a recompilé les scripts
   sans forcément réimporter `Assets/Resources/DesignTokens.asset`. ⇒ un réimport explicite le
   règle, et c'est un fait sur l'ÉTAT de l'éditeur, jamais sur le code.
3. **Ordre d'exécution** — un voisin « chauffe » quelque chose que le run scopé n'a pas.
   ⚠️ À nommer correctement si c'est le cas : *ordre d'exécution*, **pas** « DesignTokens cassé »,
   et **pas** « initialiseur statique » puisqu'il n'y en a aucun sur ce chemin.

**Réponse à la question qui départage** : **mes deux runs étaient SCOPÉS** — le premier à un seul
test (`test_names: ["…B3P1_…"]`), le second à un seul fixture (`DesignTokensPlayModeTests`).
Aucun run complet n'a été fait.

**La mesure qui tranche**, dans cet ordre, et sur machine calme (7 conteneurs) :
1. relancer le fixture **témoin** seul → vert ⇒ (1), la charge/l'import concurrent suffisait ;
2. s'il reste rouge, un **réimport** de `Assets/Resources/` puis re-run → vert ⇒ (2) ;
3. s'il reste rouge, un run **complet** → vert ⇒ (3), et c'est un vrai défaut d'ordre à consigner.

⇒ Le témoin est l'instrument, pas mon test : il est livré, il ne dépend pas de ce lot, et son
verdict est donc opposable.

⛔ **Ni l'un ni l'autre ne se mesure maintenant** : un plancher E2E occupe la machine depuis 23:20
(22 conteneurs, charge 10,7). Mes deux runs de 6 secondes sont eux-mêmes tombés pendant son
démarrage — horodatés (23:21:59→23:22:06 et 23:22:39→23:22:44) et signalés pour attribution.

## Ce que ce diagnostic NE dit pas

Il ne dit pas que mon écran est correct — il dit que **ce rouge-ci** ne le concerne pas. Les
assertions du lot n'ont pas encore été exercées : le test s'est arrêté sur le log avant de rendre
son verdict. Tant que le fixture témoin est rouge, **aucun run de ce lot n'est concluant**, ni
dans un sens ni dans l'autre.

---

## Ce que la re-mesure sur machine CALME a éliminé (23:47)

Le fixture témoin relancé dans les conditions idéales — 7 conteneurs, **0 shard e2e**, charge
**1,39**, pile remontée et `http://localhost/` à 200 — échoue **exactement pareil : 3/3, mêmes
messages**.

⇒ **Hypothèse (1) RÉFUTÉE** : ce n'était ni la charge ni l'import concurrent. Les conditions de
23:21 n'expliquent rien.

Quatre autres pistes fermées dans la foulée, chacune par une mesure :

| piste | mesure | verdict |
|---|---|---|
| l'asset manque | `manage_asset get_info` → `guid cf45399f81ed441f38e571ae3eb6fcf6` | Unity le VOIT |
| le lien script est cassé | `.meta` du script = `eda4e673ff741ff16852a60e329a6a03` · l'asset référence ce guid exact | **CONCORDANTS** |
| le type n'existe pas | `Library/ScriptAssemblies/Theme.dll` présente (7680 o), et les 4 autres assemblies aussi | compilé |
| le back manquait | `DesignTokensPlayModeTests` ne contient aucun `AuthClient\|SignUp\|localhost\|UnityWebRequest` (0) | **indépendant de la pile** |

## ⛔ ÉTAT HONNÊTE : JE N'AI PAS LA CAUSE

Ce n'est ni la charge, ni la pile, ni un asset absent, ni un lien de script rompu, ni une assembly
manquante. **L'hypothèse (2) « asset non importé » est morte avec les deux lignes du tableau
ci-dessus.** Reste (3), l'ordre d'exécution — et elle se teste par un **run COMPLET**, jamais fait
à ce jour.

⚠️ **Un détail à ne PAS sur-interpréter, et c'est délibéré de l'écrire ainsi** : `get_info` rend
`assetType: "Unknown"`. Ce peut être un vrai symptôme (Unity ne résout pas le type du
ScriptableObject) **ou** une simple limite de l'outil MCP, qui ne sait pas nommer un type custom.
**Je ne sais pas trancher**, et je refuse d'en faire une piste que quelqu'un poursuivrait à mes
frais : j'ai déjà rétracté une explication ce soir pour avoir rangé un symptôme dans un tiroir
existant sans vérifier qu'il y entrait. La mesure qui trancherait : appeler `get_info` sur un
**autre** ScriptableObject connu du projet (`BuildingSpriteSlots.asset`, `DistrictBackgroundSlots.asset`)
— s'il rend aussi `Unknown`, c'est l'outil ; sinon, c'est l'asset.

**Prochaine mesure due**, dès qu'un créneau machine est libre : le run COMPLET du fixture témoin.
Vert ⇒ ordre d'exécution, à nommer ainsi. Rouge ⇒ vrai défaut, à consigner en dette.

---

## `assetType: "Unknown"` — TRANCHÉ, et ce n'est PAS une limite de l'outil (23:49)

Je refusais d'en faire une piste faute de savoir départager « vrai symptôme » et « l'outil MCP ne
sait pas nommer un type custom ». La mesure que j'avais écrite comme départage a été faite :
`get_info` sur deux **autres** ScriptableObjects du même dossier `Resources/`.

    BuildingSpriteSlots.asset       assetType = MafiaCleanCity.CityMap.BuildingSpriteSlots   instanceID = 49228
    DistrictBackgroundSlots.asset   assetType = MafiaCleanCity.CityMap.DistrictBackgroundSlots instanceID = 49738
    DesignTokens.asset              assetType = Unknown                                       instanceID = 0

⇒ **L'outil SAIT nommer les types custom** — il le fait pour les deux autres. `Unknown` est donc un
**vrai symptôme**, et `instanceID = 0` le confirme par un second canal : l'objet n'est **pas chargé
en mémoire**, là où ses deux voisins le sont.

⇒ Ce que ça élimine : « c'est un artefact d'outillage ». Ce que ça n'établit **pas** : la cause.
Un asset présent, au bon chemin, avec un `.meta` valide et un `m_Script` pointant un GUID
concordant vers une assembly compilée — et pourtant non chargé. **Je n'ai pas d'explication qui
tienne, et je n'en propose pas.**

⚠️ Une différence observée, notée SANS en faire une piste : les deux assets qui se chargent sont
typés dans l'assembly `CityMap` ; celui qui échoue l'est dans `Theme`, dont la dll est la seule à
ne pas avoir été recompilée à 23:20 (elle date de 21:08:14 — normal, rien ne l'a modifiée). C'est
une **corrélation à deux points**, ce qui ne vaut rien : je l'écris pour qui reprendra, pas comme
une hypothèse. La départager demanderait un troisième ScriptableObject typé dans `Theme` — il n'y
en a pas.

## Pourquoi ce document garde ses erreurs barrées

Deux explications y ont été retirées : « initialiseur statique » (le mécanisme du socle, qui ne
s'applique pas — le fixture témoin n'a AUCUN initialiseur statique, ses trois lectures sont dans le
CORPS des tests) et « base d'assets non prête » (réfutée sur machine calme).

★ Et la leçon que la session f1 a formulée en retirant la même explication que moi, le même soir,
sur le même symbole : **le tort n'est pas d'avoir eu tort, c'est d'avoir offert une sortie
confortable au moment où il ne restait qu'un test à faire.** Une explication qui ÉPARGNE une mesure
est structurellement plus dangereuse qu'une erreur qui coûte du travail — parce que personne ne
re-mesure une explication qui arrange. Nous sommes deux à l'avoir commise ce soir, indépendamment,
sur la même entrée périmée du socle.

---

## ⛔ VERDICT (00:20) — CE N'EST NI LE SCOPE NI L'ORDRE. C'EST UN VRAI DÉFAUT, ET IL EST MASSIF

Run **COMPLET**, en **BATCHMODE** (`Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests`),
lancé à 00:06:43. Conditions écrites avant le résultat : 7 conteneurs et charge 1,85 au lancement,
montée à 13,7 quand le plancher r14 a démarré en parallèle.

    occurrences « Resources.Load("DesignTokens") a renvoyé null » : 171
    tests FAIL à cause de ça : 57
    tests FAIL au total      : 111        ⇒ 51 % DES ÉCHECS DE LA SUITE
    fixtures touchées        : 18, toutes LIVRÉES, aucune du lot ㊲

    DistrictMapNavigation 14 · DistrictBackground 5 · DailyReviewScreenController 5 ·
    DistrictInteriorLighting 4 · DistrictInteriorLieutenantMarkers 4 · DistrictInteriorDiorama 4 ·
    TopBarController 3 · DistrictInteriorAmbientLoops 3 · DesignTokensPlayModeTests 3 ·
    OrgVitalsPanel 2 · Hud 2 · HighestLeverageCard 2 · Navigation 1 · HomeChrome 1 ·
    ExceptionQueuePanel 1 · CharpenteMontageLocataires 1 · CanonPaletteBridge 1 ·
    AccueilPanneauxGeometriePhoto 1

⇒ **Hypothèse (3) « ordre d'exécution » RÉFUTÉE** : le run est complet, et il n'y a rien à
« chauffer » — 171 occurrences réparties sur toute la suite.

## La liste complète de ce qui est ÉLIMINÉ, et ce qui reste

| cause envisagée | comment elle est tombée |
|---|---|
| charge / import concurrent | témoin rouge à l'identique sur machine calme (7 conteneurs, charge 1,39) |
| pile back absente | le fixture témoin ne touche pas le back (0 occurrence réseau) |
| asset manquant | `get_info` le voit, 4573 o, `.meta` présent |
| lien `.meta` ↔ script rompu | GUID `eda4e673…` identique des deux côtés |
| assembly non compilée | `Theme.dll` présente (7680 o) |
| artefact d'outillage (`Unknown`) | l'outil nomme les 2 autres ScriptableObjects du même dossier |
| scope du run | run **complet** : même résultat |
| ordre d'exécution | run **complet** : même résultat |
| initialiseur statique (socle) | **retiré** — le fixture n'en a aucun, il lit dans le corps (:17/:28/:39) |

⇒ **LA CAUSE RESTE INCONNUE.** Neuf pistes éliminées, aucune n'explique. Ce qui est établi :
le défaut est **réel**, **massif**, **antérieur au lot ㊲**, et **indépendant du mode d'exécution**
(il se produit via l'éditeur ET en batchmode).

## Ce que ça coûte à TOUT LE MONDE, et pourquoi c'est le point le plus urgent

**Tout run PlayMode de ce dépôt porte actuellement ~57 rouges qui n'appartiennent à personne.**
Quiconque lance une suite et lit ses rouges accusera son propre code — et deux des fixtures
touchées (`CanonPaletteBridge`, `AccueilPanneauxGeometriePhoto`) sont dans le périmètre d'une
autre session. Remonté immédiatement à l'orchestratrice pour cette raison.

## ⚠️ Ce que ce run NE dit PAS sur le lot ㊲

**0 échec dans mes tests — et ça n'innocente rien.** `ScreenB3` n'était pas dans
`MafiaCI.Categories` au moment du lancement, donc mes 6 tests et ma capture **n'ont pas tourné**.
Le zéro est un zéro d'ABSENCE, pas de succès. Corrigé depuis (la catégorie est ajoutée), mais
après le lancement : **mon écran n'est ni innocenté ni accusé par ces chiffres.**

## Sur la fin de ce run

Le wrapper porte un `timeout 900` calibré sur machine calme ; sous charge 13,7 il peut tuer le
processus avant la ligne `TOTAL:`. ⇒ **Écrit AVANT que ça n'arrive : tout arrêt de ce run sans
`TOTAL:` est un TIMEOUT DU WRAPPER, pas un crash de l'éditeur.** La distinction compte doublement
cette nuit, puisqu'un vrai crash a eu lieu à 23:58 (blob Mono de 10 Mo, conservé) et que les deux
se ressemblent trait pour trait.
⇒ Et laisser courir est le bon choix ici parce que **le résultat attendu est déjà obtenu** : 171
occurrences et 57 tests tranchent, la fin n'ajouterait qu'un compte.

---

## ⛔ TROISIÈME RÉTRACTATION (01:05) — « dll périmée » n'était PAS le mécanisme

Le défaut a bel et bien disparu — ça, c'est mesuré et ça tient :

    run 5 : « a renvoyé null » 181 · FAIL 121
    run 6 : « a renvoyé null » 171 · FAIL 119
    run 7 : « a renvoyé null »   0 · FAIL   9      ⇐ 110 tests réparés

Mais **l'explication que j'en ai donnée est fausse.** J'avais écrit que `Theme.dll` était périmée
parce qu'elle datait de 21:08 quand les autres assemblies dataient de 23:20. **C'est une mauvaise
comparaison** : l'âge d'une dll par rapport à une AUTRE dll ne dit rien. Par ce critère, toute
assembly stable est éternellement suspecte.

**Le seul oracle valable est la dll contre SES PROPRES sources.** Mesuré (par git, le fichier ayant
changé depuis) :

    dernière modification de `Assets/Scripts/Theme/` avant cette nuit : commit c7595e4, 08-25 14:13
    `Theme.dll` au moment des runs 4/5/6                              : 08-30 21:08:14
    ⇒ POSTÉRIEURE de CINQ JOURS ⇒ **À JOUR**

⇒ **La recompilation a été le REMÈDE sans être le DIAGNOSTIC.** On sait que le défaut est parti ;
on ne sait toujours pas de quoi il souffrait. La classe n'est **pas** fermée, et il peut revenir
sous une autre forme (état de domaine incohérent, cache de types, résolution d'assembly).

★ Troisième rétractation sur ce même défaut, et le motif est constant : **les trois explications
étaient CONFORTABLES et épargnaient une mesure.**

| explication | d'où elle venait | ce qui l'a tuée |
|---|---|---|
| initialiseur statique | reprise du socle sans vérifier qu'elle s'appliquait | le fixture n'en a aucun ; le socle annonçait 65 sites, il y en a 0 d'impatients |
| base d'assets non prête | plausible, expliquait la charge | témoin rouge à l'identique sur machine calme |
| dll périmée | comparaison entre dll | dll postérieure à SES sources de 5 jours |

⇒ La règle qui aurait évité les trois : *une explication qui épargne une mesure est plus dangereuse
qu'une erreur qui en coûte une* — personne ne re-mesure ce qui arrange. Ce qui m'a rattrapé chaque
fois n'est pas ma vigilance : c'est une question posée par quelqu'un d'autre.

## ⚠️ ET L'OUTIL QUI VA ARRIVER NE FERME PAS LA CLASSE

Une autre session a commité `Tools/assemblies-perimees.py` — il compare chaque dll à ses propres
sources, avec contrôle positif ET négatif. C'est le bon oracle et il attrapera le cas « périmée ».

⛔ **Mais il n'aurait PAS attrapé ce défaut-ci**, puisque la dll était à jour. Sa présence ne doit
donc pas faire croire la classe fermée : si le null réapparaît alors que l'oracle est vert,
l'hypothèse « état compilé » tombe entièrement et il faut chercher du côté du chargement de
domaine. **Un dispositif qui couvre une cause voisine de la vraie est le plus trompeur de tous.**
