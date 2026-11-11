# Dossier du juge données — TD-823 « les VOIX » (㉛ Loi, ㉝ Démolition, ㉓ Boutique) — maquette — 2026-11-11

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-donnees/dossier-gabarit.md`. À lire EN PREMIER. Tout chemin est ABSOLU.
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/voix-td823/maquette-2026-11-11/` — tu écris `rapport.md` et `mesures/` dans CE répertoire (`mesures/` existe, vide).

## Mode : maquette (deux côtés : B = back, M = maquette ; le front n'est pas l'objet)

## Le sujet
Trois écrans portent une **voix** : une réplique dite par un personnage (le lieutenant sur ㉛ Loi, l'orateur du site sur ㉝ Démolition, Wexler sur ㉓ Boutique). **Question** : **la maquette dessine-t-elle une voix dont la SOURCE (qui parle, quelle réplique, quand) n'existe pas au back, ou le back sert-il / prévoit-il une donnée que la maquette ignore ?** Rends **RATIFIABLE | NON**, avec la table de couverture recomptée par script (|B| + |M non appariés| = lignes ; trois comptes et somme ; contrôle négatif rouge).

## Maquette (M) — fichier ÉPINGLÉ par git, jamais l'arbre de travail
- Dépôt : `/home/erutheone/project/atelier3d-mafia` · master · **commit `74a6d52d25b334d88f97926148bc60ad01b4b6ad`**.
- Lecture : `git -C /home/erutheone/project/atelier3d-mafia show 74a6d52d:ecrans-brennar-6.html` (**2,7 Mo, 170 cadres** : redirige vers un fichier de TON dossier `mesures/`, jamais en entier à l'écran).
- **Repères — par LIBELLÉ d'étiquette (`<div class="etiquette">`) ; les numéros de ligne et d'index sont indicatifs et peuvent être décalés** :
  - **㉛ Loi** — la bande de voix du lieutenant (vers les lignes 4890-4896 du fichier) : cadres dont l'étiquette est « Lui trouver un avocat », « Il commence à parler », « Il y a un arrangement », « Votre avocat est nerveux » (à vérifier ; indices 0-based ≈ 68-72) ;
  - **㉝ Démolition** — la voix du site / l'orateur : cadres dont le corps porte une voix de site ou d'orateur (« réplique sans orateur (arbitrage (5) du 23/09) » est un libellé voisin ; repère les cadres de démolition par leur corps : à toi de les trouver et de les NOMMER dans ton rapport) ;
  - **㉓ Boutique** — la bande `.voix` de Wexler (vers les lignes 5467-5473) : cadres « La vitrine — les extras », « La caisse — les Marks », « Zéro Mark — l'état terminal » (≈ 98-100).
  N'inventorie QUE les voix (bande de réplique, nom de l'orateur, déclencheur, texte) de ces cadres ; le reste des cadres n'est pas ton sujet.

## Back (B) — lecture du design ET du code existant (le code du lot est en cours)
- **Design APPROUVÉ** : `/home/erutheone/project/mafia-dette-b2/docs/superpowers/specs/2026-11-11-td823-voix-lieutenants-design.md` @`949e5613` (branche `dette/b2-fin-tranche-2026-11-11`, worktree `/home/erutheone/project/mafia-dette-b2` ; lis `git show 949e5613:<chemin>`). Il décrit : `speaker {id,name}|null` sur `GET /v1/me/legal` et `GET /v1/friction/state` ; Wexler = PNJ FIXE (id constant) ; les mots ratifiés (**`loi.dit` ×3**, **boutique ×5**). **Le design dit ce qui SERA servi ; le code existant dit ce qui l'est aujourd'hui : distingue-les, ligne par ligne.**
- **Règle de la boutique (㉓), tranchée par l'orchestrateur — à VÉRIFIER sur la maquette ET sur les sources** : UNE seule réplique à la fois, par priorité : « **tout claqué** » (solde = 0 **et** ≥ 1 acquis) > « **à vendre** » (solde > 0) > « **Marks dehors** ». Pour chaque condition : la donnée qui la détermine existe-t-elle au back (solde de Marks, nombre d'acquis) et sur quelle route ? Les trois états sont-ils distinguables par les clés servies ? Les trois répliques de la maquette correspondent-elles aux mots ratifiés (clés exactes dans le `string_table` du lot / du design) ?
- **Code existant** : dépôt `/home/erutheone/project/mafia-clean-city`, branche `main` (lis `git show main:<chemin>`) ; la pile de dev (`X-Server-Build` actuellement observé : 8d0184a4, relève-le avant et après) peut **mesurer ce qui est DÉJÀ servi** (corps de `GET /v1/me/legal`, `GET /v1/friction/state`, la route de la boutique/solde) avec des comptes JETABLES `jd6-…` frais (`POST /v1/auth/signup`, Idempotency-Key requis, jeton à `payload.data.access_token` ; puis `POST /v1/session/open`). **Ce qui n'est pas encore servi (speaker, mots neufs) : DÉDUIT du design, marqué comme tel.**
- **INTERDITS** : redémarrer, reconstruire, migrer ou modifier la pile ; toucher aux comptes existants ; **tout POST d'action sur un objet qui n'est pas propre à ton compte jetable** ; ne pose rien de partagé. **Masque tout jeton et mot de passe dans `mesures/`** (`Bearer ***`).
- **B⁻** : colonnes des tables du domaine (lieutenant, loi/avocat, démolition, boutique/PNJ) que le design ne projette pas et que la maquette dessine.

## Écarts ASSUMÉS déjà connus
Aucun consigné. Tout écart que tu trouves se classe par la grille du mandat (dessiné + servi ; dessiné sans source ; servi non dessiné = « passé à côté ? » ; dessiné + prévu par le design mais pas encore servi = à distinguer explicitement).

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- les notes d'implémentation du chantier (le design approuvé, lui, est fourni) ;
- **tout rapport ou mesure de juge précédent : INTERDITS** — `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/**` SAUF ce répertoire, `Tools/juge-visuel/**` ;
- les « choix » non sourcés : s'ils ne sont pas dans le dossier, ils n'existent pas.

## Format du rapport
Celui du mandat (`rapport.md`) : verdict **RATIFIABLE | NON** en tête, trois comptes + somme recomptés par `mesures/controle-arithmetique.py` (positif rc=0, négatif rc≠0), chaque clé de B : commande + sortie (corps déjà servi) ou DÉDUIT du design avec la raison, une SECTION par écran (㉛, ㉝, ㉓), « passé à côté ? » séparé des défauts, section « non vérifié » obligatoire, X-Server-Build avant/après.
