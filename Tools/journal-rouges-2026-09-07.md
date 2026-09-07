# Les 46 rouges du run complet du 2026-09-07 — lus par leur MESSAGE, pas par leur nom

**Source** : `complet.log`, run PlayMode complet lancé le **2026-09-07T00:36:56Z**, terminé 02:41.
`421 RUN · 372 PASSED · 46 FAIL · 3 SKIPPED` — la somme fait 421, donc rien n'a été escamoté.

⚠️ **Ce que ce document est** : une photo datée, prise AVANT les trois commits de cette nuit
(`bbc29ce`, `c096d4e`, `f622c37`). Le seul compte qu'ils déplacent est celui de la classe C-3
(17 → 15, toujours rouge). Ce n'est pas l'état d'aujourd'hui, c'est l'état de ce run-là.

⛔ **Pourquoi ce document existe** : deux gardes de population ont été trouvées rouges cette nuit
par accident, chacune portant un fait mesuré que personne n'avait lu. *Un rouge classé par
CATÉGORIE plutôt que lu par son CONTENU est un rouge qui n'existe pas.* Ce balayage classe les 46
par ce que leur message DIT. **Il n'en corrige aucun.**

## Le compte, par signature de message

| n | classe | ce que le message dit |
|---|---|---|
| **17** | **A** | « aucun AppShell dans la scène de démarrage du build (`Assets/Scenes/Boot.unity`) » |
| **1** | **A′** | ⛔ « la sonde ne trouve pas le shell **là où il est** » — le CONTRÔLE POSITIF de A |
| **16** | **B** | le COMPTE : `No such lieutenant for this player` · `building … is not a player-owned operational building` · `seeded autonomy report missing` |
| **5** | **C** | garde de POPULATION : un compte DÉCLARÉ ≠ un compte MESURÉ |
| **2** | **D** | planche VIDE : « 0.000 % d'encre … cette planche ne montre aucun dessin » |
| **5** | **E** | isolés, un fait chacun |

## ⛔⛔ A′ — LE ROUGE QUI CHANGE LA LECTURE DES 17 AUTRES

`CharpenteBootScenePlayModeTests.F0_1b_ControlePositif_LaSondeSaitDireNonSurUneSceneSansShell`
rend **« la sonde ne trouve pas le shell là où il est »**. C'est le contrôle positif de la sonde
qui produit les 17 rouges de la classe A.

⇒ **Tant qu'il est rouge, les 17 ne sont PAS attribuables.** Ils disent peut-être « la scène de
démarrage ne porte pas le shell » — le fait que `F0_1a` énonce si bien (*« les 24 montages
d'Assets/Tests prouvent que le shell marche, jamais qu'un joueur le rencontre »*) — ou ils disent
« la sonde est aveugle ». **Le seul test qui départage est celui qui est tombé avec eux.**
⇒ *Un instrument qui rend un verdict UNIFORME sur 17 cas, et dont le contrôle positif tombe en
même temps, mesure peut-être autre chose.* **Première chose à lever ; elle décide de 18 rouges.**

## ⛔⛔ C — CINQ GARDES DE POPULATION, PAS DEUX. Et deux d'entre elles portent une CONSÉQUENCE VIVE.

| test | déclaré | mesuré |
|---|---|---|
| `DemoIdentityResolverGuard.ExplicitIdentityOverrides_MatchTheReviewedAllowlist` | 10 appels `.SetIdentity(` | **6** |
| `HudPlayModeTests.F2_SeverityTokenAccesses_EqualMeasuredAllowlist` | 34 accès | **40** |
| `ChromeTabAccentAllowlist.C5F2_AccentGoldBindings_EqualDeclaredAllowlist` | 11 liaisons | **17** |
| `CanonPaletteBridge.Comparator_Green_OnHealthyTree_BothDirections` | bijection canon↔runtime | **`accentCalm` : orphelin RUNTIME** |
| `CanonPaletteBridge.Comparator_Red_OnAlteredByte` | — | le même, **en précondition** : le contrôle ne peut plus s'armer |

⇒ ★★ **LA CONSÉQUENCE QU'IL FAUT LIRE, ET ELLE EST VIVE.** `ReputationResolvers.cs` justifie sa
palette LOCALE — les quatre couleurs du châssis série 6 absentes de `DesignTokens.asset` — en
écrivant que le pont de palette *« exige une BIJECTION dans les deux sens (aujourd'hui 74 tokens
canon = 74 champs runtime, 0 orphelin) et épingle l'arité en dur »*. **Ce n'est plus vrai : la
bijection est DÉJÀ rompue, dans le sens runtime, sur `accentCalm`.** ⇒ *Un raisonnement juste
appuyé sur un état qui a changé depuis* — et il commande aujourd'hui la palette de deux écrans.
⚠️ **Ça ne rend pas l'ajout des quatre couleurs LÉGITIME pour autant** : ça rend son argument
CADUC. La décision reste l'arbitrage DA remonté à l'user le 2026-08-30. **Ce qui change, c'est
qu'on ne peut plus dire « c'est impossible » — il faut dire « ce n'est pas tranché ».**

⇒ Et `Comparator_Red_OnAlteredByte` est **le contrôle positif** du comparateur : il échoue AVANT
d'altérer quoi que ce soit. ⇒ **Le pont de palette n'a plus d'instrument qui prouve qu'il sait
rougir.** Même forme que A′, sur un autre dispositif, dans le même run.

## B — 16 rouges, une seule variable, et elle n'est pas dans le code

`No such lieutenant for this player: <uuid>` · `building <uuid> is not a player-owned operational
building for this player` · `seeded autonomy report missing from the inbox`.
⇒ **Le COMPTE est une variable du run, au même titre que le code.** Ces 16 disent que le monde
sous lequel ils tournent n'a pas les objets qu'ils exigent. **À re-mesurer sous le compte prévu
avant d'accuser une seule ligne.**
★ Et `HudF7` (classe E) le prouve par l'autre bout : *« attendu `operational_demo`, obtenu
`demo_capture` »* — un rouge causé par une VARIABLE D'ENVIRONNEMENT posée pour capturer.

## D — 2 planches vides

`ecran_delegation_1080x1920.png` et `ecran_demolition_1080x1920.png` : **0,000 % d'encre**, canal
max 71 et 64, sous un plancher de 0,10 % dérivé des 52 planches du dépôt (la plus pauvre des non
vides rend 0,518 %, divisé par 5). ⇒ Le plancher fait exactement son travail : **il attrape des
planches que rien d'autre n'aurait distinguées d'une réussite.**

## E — 5 isolés, un fait chacun

| test | ce que le message dit |
|---|---|
| `C8F5_AllFourDayPhases_RenderRealHeroArt` | NIGHT : un nom EN TROP dans la racine — 82 caractères attendus contre 69 |
| `B3E1_EchecDeLecture_DonneUnEtatNomme_PasUneException` | « un 404 doit produire l'état indisponible NOMMÉ » — obtenu : faux |
| `C5F1_SeverityValueAndLabel_TwoDistinctSeveritiesInSameList` | `Expected: True / But was: False`, **sans message** ⇒ *un rouge qui ne dit pas ce qu'il cherchait* |
| `HudF7_SameCallsign_AcrossThreeEmpireOrgAlternations` | l'identité par défaut du shell : `operational_demo` attendu, `demo_capture` obtenu |
| `TD615_UnTexteGras_TireSesGlyphesDeLaFonteGrasse` | 11 glyphes sur 11 d'un gras ne viennent pas de `DejaVuSans-Bold SDF` : gras SIMULÉ, ou atlas vide |

## Ce que ce balayage établit, et ce qu'il n'établit pas

**Établi** : 46 rouges se ramènent à **6 signatures**, dont **deux contrôles positifs tombés**
(A′ et `Comparator_Red`) qui rendent 19 rouges non attribuables tant qu'ils ne sont pas levés.
**Non établi** : aucune cause. *Un message cité n'est pas un diagnostic — c'est ce que le test
avait à dire, et que personne n'avait lu.*
