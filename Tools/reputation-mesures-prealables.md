# ㊲ La réputation (`screen_b3`) — les mesures préalables, avant toute ligne de code

Session pilote-B, 2026-08-30. Ce document ne porte **que des faits mesurés**, avec la commande
et la sortie. Tout ce qui n'est pas mesuré ici est marqué comme tel. But : que le tour suivant
ne re-dérive pas ces grandeurs — et surtout qu'il ne les DÉDUISE pas.

## 1. Le dispositif à deux éditeurs n'est pas celui que le brief décrit

`BRIEF-PILOTE-B.md` suppose **un** serveur MCP partagé (port 8080) listant **deux** instances,
avec choix par `unity_instance=`. Mesuré : **un serveur par worktree**, chacun `project-scoped`.

| port | pidfile | processus | instances exposées |
|---|---|---|---|
| 8080 | `mafia-builder-city-clean/Library/MCPForUnity/RunState/mcp_http_8080.pid` (pid 2677014) | **MORT** — pas de `/proc/2677014`, rien en écoute | — |
| 8081 | `mafia-unity-B/Library/MCPForUnity/RunState/mcp_http_8081.pid` (pid 2827136) | vivant, démarré 21:18 | **1** — `mafia-unity-B@ba9d2fe110dc2146` |

    $ curl … -d '{"method":"resources/read","params":{"uri":"mcpforunity://instances"}}'
    {"success": true, "transport": "http", "instance_count": 1,
     "instances": [{"id": "mafia-unity-B@ba9d2fe110dc2146", "name": "mafia-unity-B",
     "hash": "ba9d2fe110dc2146", "unity_version": "6000.4.6f1",
     "connected_at": "2026-08-30T19:33:18.009595+00:00"}]}

    $ tr '\0' ' ' < /proc/2827136/cmdline
    …/mcp-for-unity --transport http --http-url http://127.0.0.1:8081 --project-scoped-tools
      --pidfile /home/erutheone/project/mafia-unity-B/Library/MCPForUnity/RunState/mcp_http_8081.pid
      --unity-instance-token 25d266e5751d456c8d03b2e826cf83b5

L'éditeur de la session 98 (`mafia-builder-city-clean`, pid 2643750) écoute sur **38000**, son
propre canal ; il n'est **pas** joignable depuis 8081.

⇒ **Le `.mcp.json` de ce worktree pointait sur 8080 — le serveur de l'AUTRE session**, l'exact
inverse de la consigne « ne touche jamais à l'autre instance ». Repointé sur 8081 (fichier
gitignored, non tracké). ⇒ `unity_instance=` devient **sans objet** : une seule instance sur ce
serveur. **L'isolation est structurelle, pas déclarative** — plus forte que ce que le brief
suppose, et c'est ce qui la rend fiable : il n'y a rien à ne pas se tromper de choisir.

⛔ **Ce qui reste NON MESURÉ, et c'est le cœur du brief** : les deux sondes (une recompilation
puis un réimport provoqués ici doivent rester invisibles dans l'éditeur A). Elles exigent les
outils Unity, indisponibles tant que le MCP n'est pas rechargé (geste user). **Rien n'a donc été
écrit dans `Assets/`** — écrire un `.cs` déclencherait précisément la recompilation que la sonde 1
doit OBSERVER, et l'observer après coup ne prouve rien.

## 2. L'échelle de la maquette — mesurée sur les PNG, pas recopiée du générateur

Instrument : `Tools/mesure-geometrie-reputation.py` (commité avec ce relevé). Sortie :

    m-119 (canon)  — 900×1752 px, échelle 3.000× — chrome 361 px = 120.3 CSS — corps 463.7 CSS
    m-120 (regles) — idem · m-121 (derive) — idem · m-122 (gages) — idem
    m-123 (vide)   — idem · m-124 (lots)   — idem
    cadres dont le corps tombe à ±6 px CSS de H=462 : 6/6

- **Largeur du téléphone : 300 px CSS** — lue à la source, `ecrans-brennar-6.html:24`
  (`.tel{width:min(300px,88vw);aspect-ratio:9/17.5}`), pas choisie.
- Hauteur : 583,33 px CSS ; chrome du shell **120,3** ; corps de l'écran **463,7**
  (le générateur déclare `H=462` — écart 1,7 px, dans le bruit de détection de bord).
- Rendu à **3,000×** exactement.

⚠️ **Le contrôle qui rend ce 6/6 probant** : les comptes de frontières par colonne ne sont **pas
uniformes** (99/74/53 · 106/114/48 · 90/69/43 · 97/77/42 · 73/87/36 · 111/103/38). Un balayage
uniforme aurait signalé que l'instrument mesure autre chose que ce qu'on croit.

⚠️ **Et le piège d'échelle qui guette la construction** : `EchelleMaquette.LargeurEcransBrennar`
vaut **aussi** 300f — mais c'est la largeur d'`ecrans-brennar.html`, un **autre fichier**. La
valeur coïncide aujourd'hui ; la source, non. Réemployer cette constante pour la v6, ce serait
exactement « hériter en silence de la largeur de téléphone d'une autre maquette », le défaut que
`EchelleMaquette.cs` existe pour rendre impossible. La v6 doit **déclarer la sienne**, avec le
test qui rougit si les deux cessent de coïncider (patron : `EchelleF1`).

## 3. Quatre jetons de la maquette n'existent pas côté Unity

`chassis6.py` déclare deux sources : `DesignTokens.asset` **et** le `:root` de
`ecrans-brennar-6.html`. Mesuré sur les 19 jetons employés par l'écran — 15 ont un champ exact,
**4 sont absents** :

| hex | nom atelier | champ `DesignTokens` |
|---|---|---|
| `#0b1016` | `--encre` (fond de l'écran) | **ABSENT** |
| `#111823` | `--panneau` (fond de carte) | **ABSENT** |
| `#2a3648` | `--lisere` (bordure) | **ABSENT** |
| `#7db36a` | `--vert` (règle tenue, cohérence alignée) | **ABSENT** |
| `#16191b` | `carte2` | `surfaceCard` |
| `#232a2d` | `rang` | `surfaceRow` |
| `#0d0f10` | `fond2` | `surfaceBase` |
| `#0a0e16` | `creux` | `hudGaugeFaceOuter` |
| `#eae0c8` | `creme` | `hudCreme` |
| `#b9ad92` | `creme2` | `hudCremeSecondary` |
| `#8a979c` | `muet` | `onSurfaceSecondary` |
| `#6b737d` | `eteint` | `onSurfaceDisabled` |
| `#d9ab4e` | `or` | `hudMoneyUnderlineGold` |
| `#f2c96b` | `or_vif` | `hudMoneyGold` |
| `#b08d3e` | `or_filet` | `hudHairlineGold` |
| `#ffd23f` | `or_franc` | `accentGold` · `chromeTabActive` |
| `#7fd4d9` | `cyan` | `hudGaugeArcCold` |
| `#e0664a` | `braise` | `hudGaugeArcHot` |
| `#ff9e3d` | `ambre` | `accentWarning` |

**Contrôle positif obligatoire** — le balayage initial rendait `0` partout, ce qui est le signe
d'un motif faux avant d'être un résultat :

    $ grep -ric 'f2c96b' Assets/Scripts/Theme/DesignTokens.cs   → 1   (contrôle positif)
    $ grep -ric 'eae0c8' …                                       → 1   (contrôle positif)
    $ grep -ric '0b1016' …                                       → 0
    $ grep -ric '111823' …                                       → 0
    $ grep -ric '2a3648' …                                       → 0
    $ grep -ric '7db36a' …                                       → 0

Correspondance hex ↔ champ établie sur `Assets/Resources/DesignTokens.asset` (l'artefact
sérialisé, seule source des valeurs — `DesignTokens.cs:18`), pas sur les commentaires du `.cs`.
Contrôle : les 74 champs `Color` déclarés sont **tous** présents dans l'asset (0 manquant).

### 3-bis. La mesure qui décide est sur l'ASSET, pas sur le `.cs` — refaite

Le balayage `grep -ric` ci-dessus porte sur `DesignTokens.cs` (le **code**). Le pont de palette,
lui, compare **l'asset sérialisé** au canon — et les deux peuvent diverger. La mesure a donc été
refaite sur `Assets/Resources/DesignTokens.asset`, par distance max-canal avec tolérance 1,5/255,
**trois contrôles positifs inclus** :

    champs Color lus dans l'ASSET : 74
      #0b1016 --encre                      ABSENT — plus proche: hudGaugeFaceOuter        à  2.0/255
      #111823 --panneau                    ABSENT — plus proche: lieutenantMedallionOuter à  2.1/255
      #2a3648 --lisere                     ABSENT — plus proche: hudGaugeFaceInner        à  6.0/255
      #7db36a --vert                       ABSENT — plus proche: controlUncontested       à 41.9/255
      #f2c96b CONTROLE POSITIF or_vif      PRESENT (hudMoneyGold)
      #eae0c8 CONTROLE POSITIF creme       PRESENT (hudCreme)
      #0d0f10 CONTROLE POSITIF surfaceBase PRESENT (surfaceBase)

⚠️⚠️ **Et c'est le voisinage qui est le vrai piège, pas l'absence.** Trois des quatre ont un
voisin à **≤ 6/255** — assez proche pour qu'on les substitue de bonne foi (« c'est la même »),
assez loin pour qu'un juge visuel le mesure. Et le voisin le plus proche de `--encre` est
`hudGaugeFaceOuter` : le fond d'un **cadran de manomètre**, employé comme fond d'écran — un jeton
pris pour ce qu'il n'est pas. Seul `--vert` est franchement isolé (41,9/255) : aucune substitution
n'y est même tentante.

### 3-ter. Pourquoi ces 4 champs ne peuvent PAS être simplement ajoutés

`CanonPaletteBridgePlayModeTests` exige une **bijection dans les deux sens** plus une arité
épinglée — mesuré aujourd'hui : `74 tokens canon = 74 champs runtime`, **0 orphelin des deux
côtés** (`canon_palette_extract.json`, `backCommitSha: 5fc5b70b`).

- `:146-152` — tout champ `Color` runtime absent de l'extrait est une erreur « **orphelin
  RUNTIME** » ; `:50` — `ExpectedTokenCount = 74` en dur ; le test asserte `IsEmpty(errors)`.
- ⇒ ajouter 4 champs au runtime **seul** produit **4 erreurs** et fait rougir le test. Mesuré
  indépendamment par la session 98, qui ajoute que ce test porte `[Category("W3UDA")]`, catégorie
  **présente dans `MafiaCI.Categories`** — donc il **tourne sous le juge**.

⇒ Le geste complet n'est pas « ajouter 4 champs » : c'est ajouter 4 entrées **au canon back**
(`projects/mafia_city_game/gdd/14_tunable_constants.md §Asset pipeline — palette & DA`, ligne
5829 du dépôt principal), régénérer l'extrait, ajouter les 4 champs au runtime, **et** porter
`ExpectedTokenCount` de 74 à 78. Quatre endroits, dont le canon d'un autre dépôt.

⇒ **Arbitrage tranché (session 98, 2026-08-30) : option 3 — construire l'écran avec des couleurs
LOCALES et consigner l'écart en dette.** Raison de fond, et elle est au socle : le `:root` de
`ecrans-brennar-6.html` et `DesignTokens.asset` sont **deux sources pour la même chose** — la
configuration exacte qui a déjà produit ici « 32 références, 0 définition ». Décider si ces 4
couleurs deviennent du canon est un **arbitrage DA, donc user** ; la session 98 le lui remonte.
⛔ Et la consigne qui va avec : **ne pas substituer** un jeton voisin (voir 3-bis) — une couleur
locale assumée vaut mieux qu'un jeton canon employé pour ce qu'il n'est pas.

## 4. Le contrat back, lu à la source

`GET /v1/me/reputation` → `ReputationSurfaceProjection` (`reputation-hub.service.ts:247`) :
**3 clés** — `player_id`, `boss_mirror`, `hidden_curriculum`, plus `restraint?` **omise** (jamais
neutralisée) sans `counterparty_id` (`:454`).

- `boss_mirror` (`:63-70`) : `portrait_posture` ∈ attentive|cautious|withdrawn|hostile ·
  `declared_rules[] = { rule_id }` · `consistency_cue` ∈ aligned|drifting|indeterminate
- `restraint` (`:79-84`) : `offer_posture` ∈ standard|wary · `marginalia: string[]`
- `hidden_curriculum` (`:113-121`) : `uniform_tells` = collar buttoned|open · sleeves rolled|down ·
  watch visible|hidden · gloves clean|dirty

⚠️ **`lieutenant_id` est un paramètre appelant OBLIGATOIRE** (`reputation.controller.ts:126` —
404 sans lui, 404 s'il n'est pas possédé, propriété validée **là** et non déléguée). Un écran
« hub » doit donc déjà savoir de qui il parle : **par où un compte frais obtient-il un lieutenant
sur un chemin joueur ? NON MESURÉ** — c'est une question posée au juge-données ⊥ en cours.

⚠️ **Repli silencieux mesuré** (`reputation-hub.service.ts:466`) : quand `projectUniformTells`
rend `null`, la projection substitue `{collar:'open', sleeves:'down', watch:'hidden',
gloves:'dirty'}`. Les quatre poses arrivent donc **toujours remplies**, et rien dans le corps ne
distingue « mesuré » de « valeur par défaut ». L'écran ne peut pas le savoir — à consigner comme
écart assumé, ou à faire remonter comme lot back.

## 5. Ce qui reste NON MESURÉ

- les **deux sondes** du brief (recompilation, réimport) — bloquées sur le MCP ;
- le corps de réponse **réel** de `GET /v1/me/reputation` sur compte frais (le juge-données ⊥ en
  mode maquette le mesure — `Tools/juge-donnees/reputation/maquette-2026-08-30/`) ;
- le chemin joueur qui donne un lieutenant à un compte frais ;
- si `DesignTokens.asset` peut recevoir 4 champs sans faire rougir `CanonPaletteBridgePlayModeTests`
  (le pont de palette compare aux valeurs du canon back — **non lu**, 246 lignes).
