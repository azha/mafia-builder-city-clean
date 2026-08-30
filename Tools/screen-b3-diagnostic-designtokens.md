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

⇒ La piste qui reste, et elle est cohérente avec un asset PRÉSENT qui se charge en `null` : la
**base d'assets n'était pas prête** à cet instant. Mes deux runs sont tombés pendant le démarrage
d'un plancher E2E **et** pendant que deux éditeurs importaient. Un `Resources.Load` null n'est pas
un symptôme de charge CPU — c'en est un d'`AssetDatabase` non prête, ce que produit exactement un
import concurrent.

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
