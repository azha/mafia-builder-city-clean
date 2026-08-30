# Le rouge de `DesignTokens.Current` — un défaut d'ENVIRONNEMENT, pas du lot ㊲

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

## La classe, déjà nommée au socle

> « 65 `static readonly Color = DesignTokens.Current.*` étaient VERTS en run complet (un test
> antérieur chauffait le cache) et ROUGES en run scopé à froid — l'initialiseur statique tombe en
> contexte constructeur où `Resources.Load` jette. **L'ordre des voisins peut fabriquer un vert,
> exactement comme la co-tenance fabrique un rouge.** »

Mes deux runs étaient **scopés à un seul fixture**, donc à froid. C'est la configuration exacte
que cette entrée décrit.

## Ce qui reste NON TRANCHÉ, et la mesure qui trancherait

Deux hypothèses restent ouvertes, et elles n'appellent pas le même geste :

1. **Artefact de run scopé** — l'asset est présent et importé, mais `Resources.Load` échoue dans ce
   contexte d'exécution. ⇒ un run PLUS LARGE (toute la catégorie, ou la suite complète) le
   rendrait vert, et il n'y a rien à corriger dans le code.
2. **L'asset n'est réellement pas importé** — le refresh de 23:20 a recompilé les scripts mais
   peut ne pas avoir réimporté `Assets/Resources/DesignTokens.asset`. ⇒ un réimport explicite le
   réglerait, et ce serait un fait sur l'ÉTAT de l'éditeur, pas sur le code.

**La mesure qui départage** : relancer `DesignTokensPlayModeTests` — le fixture témoin, pas le
mien — après un run large ou un réimport. S'il devient vert sans qu'aucune ligne n'ait changé,
c'est (1). S'il reste rouge, c'est (2).

⛔ **Ni l'un ni l'autre ne se mesure maintenant** : un plancher E2E occupe la machine depuis 23:20
(22 conteneurs, charge 10,7). Mes deux runs de 6 secondes sont eux-mêmes tombés pendant son
démarrage — horodatés (23:21:59→23:22:06 et 23:22:39→23:22:44) et signalés pour attribution.

## Ce que ce diagnostic NE dit pas

Il ne dit pas que mon écran est correct — il dit que **ce rouge-ci** ne le concerne pas. Les
assertions du lot n'ont pas encore été exercées : le test s'est arrêté sur le log avant de rendre
son verdict. Tant que le fixture témoin est rouge, **aucun run de ce lot n'est concluant**, ni
dans un sens ni dans l'autre.
