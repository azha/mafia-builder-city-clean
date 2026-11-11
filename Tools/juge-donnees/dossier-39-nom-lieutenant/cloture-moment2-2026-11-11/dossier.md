# Dossier du juge données — ㊴ Le dossier (pistes) : le nom du lieutenant et « On vous regarde » — CLÔTURE (moment 2) — 2026-11-11

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-donnees/dossier-gabarit.md`. À lire EN PREMIER. Tout chemin est ABSOLU.
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/dossier-39-nom-lieutenant/cloture-moment2-2026-11-11/` — tu écris `rapport.md` et `mesures/` dans CE répertoire (`mesures/` existe, vide).

## Mode : CLÔTURE — trois côtés : B (back), M (maquette), F (front)
Question : **de tout ce que le back renvoie pour cet écran, qu'est-ce que la maquette montre, qu'est-ce que le front AFFICHE, et qu'est-ce qui est passé à côté ?** Rends un **verdict APPROUVÉ | NON** (zéro défaut de couverture, écarts assumés sourcés) avec la table recomptée par script (|B| + |M non appariés| + |F sans source| = lignes ; contrôle négatif rouge).

## L'écran
- **Nom** : ㊴ « Le dossier » — l'écran des pistes (audit, effluent, **train de vie**) du joueur, et des acteurs.
- **Ce qu'on vient y faire** : lire l'état de chaque piste de renseignement qui pèse sur le joueur ; la piste « train de vie » porte le **nom du lieutenant** concerné et un mot de gravité (« Je vous ai remarqué » / **« On vous regarde »** / etc.).
- **Chemin joueur** : onglet du dossier → vue Pistes (ou vue Vide si le roster d'acteurs servi est vide).
- **Périmètre précis de ce tour** : le NOM du lieutenant sur la piste train de vie (`lifestyle_lieutenant_name`), les mots servis des trois pistes (`*_label_key`), la bande `lifestyle_alarm_bucket`, et l'état « watched » (« On vous regarde » / EN « You're being watched »). Le reste de l'écran est jugé pour la couverture, sans rouvrir les tours antérieurs.

## Maquette (M) — fichier ÉPINGLÉ par git
- Dépôt : `/home/erutheone/project/atelier3d-mafia-c2` · **commit `b2ceebeb6ca672f1a367d5e135ddfcc17fbc92d1`** (c'est la maquette de ㊴ après correction de mi-tour ; ancêtre du master atelier). Fichier `ecrans-brennar-6.html` (2,6 Mo, ~159 cadres : redirige vers un fichier de TON dossier `mesures/`).
- Lecture : `git -C /home/erutheone/project/atelier3d-mafia-c2 show b2ceebeb:ecrans-brennar-6.html`.
- **Cadres, repérés par LIBELLÉ de l'étiquette** (index 0-based indicatifs, à vérifier) : « Le dossier — trois pistes qui ne se mélangent pas » (131) ; **« ㊴ · les pistes — … deux pistes éteintes, « pas encore sur la table » (PROPOSÉ) »** (150) ; « ㊴ · les acteurs — le renseignement par ligne, éteint … » (151) ; **« ㊴ · les pistes — « le train de vie de Lt. Marrek » : le back sert le NOM (lifestyle_lieutenant_name), piste vivante, … »** (152) ; **« ㊴ · les pistes — le nom n'est PAS servi (null …) … »** (153). Inventorie ces cadres (et 131 comme source) ; les autres cadres de la page sont d'autres écrans.

## Back (B) — à MESURER sur la pile, compte jetable frais
- **Pile** : `X-Server-Build: 8d0184a4` (lis-le AVANT et APRÈS tes mesures, dans `mesures/` ; **aucun redémarrage, aucune reconstruction, aucune migration**). Back lu dans `/home/erutheone/project/mafia-clean-city` (branche `main`/cumul back ; dis le SHA que tu lis et si le module forensic diffère de `8d0184a4`).
- **Route** : `GET /v1/me/forensic` (+ la route des acteurs que l'écran appelle ; vérifie au contrôleur d'écran du client, cf. F). Clés attendues, à VÉRIFIER (pas à recopier) : `audit_risk_bucket`, `effluent_visibility_bucket`, `lifestyle_alarm_bucket`, `lifestyle_lieutenant_name`, `audit_risk_label_key`, `effluent_visibility_label_key`, `lifestyle_alarm_label_key`. Valeurs possibles de chaque bande lues à la source qui les contraint.
- **Comptes** : jetables `jd4-…` frais (`POST /v1/auth/signup`, Idempotency-Key requis, jeton à `payload.data.access_token` ; puis `POST /v1/session/open`). **Masque jetons et mots de passe dans `mesures/`** (`Bearer ***`). Ne touche à AUCUN compte existant.
- **États** : le compte neuf donne l'état naturel (« quiet », nom `null`). Les états « noticed » et « watched » n'existent pas sur compte neuf : ils sont posés par un `UPDATE` SQL sur la ligne `lifestyle_audit_state` du compte (l'atteinte réelle passe par le tick standing-gap-heat, non exercé). Tu peux **reproduire cette pose, sur TON compte jetable seulement** (un `UPDATE … WHERE` borné à ton `player_id`, dans le conteneur Postgres de la pile, aucun changement de schéma), ou, à défaut, **citer comme mesure d'un tiers** les corps déjà relevés : `/home/erutheone/project/mafia-unity-F/Logs/td-pile-8d0184a4/11-forensic-quiet.json`, `…-noticed.json`, `…-watched.json`, `10-forensic-watched-sql.json` (marqués alors « mesure d'un tiers, non reproduite »).
- **B⁻** : colonnes de `lifestyle_audit_state` (et tables voisines du domaine forensic) que la projection de la route ne porte pas.

## Front (F) — à lire au commit ÉPINGLÉ
- Dépôt `/home/erutheone/project/mafia-unity-F`, commit **`c35c325068f636c986590965d371bfa38e57ec8f`** (branche `lot/td-951`, 1 commit après un commit antérieur ; PAS encore dans le cumul) ; lecture : `git -C /home/erutheone/project/mafia-unity-F show c35c3250:<chemin>`.
- Contrôleur : `Assets/Scripts/Operational/Forensic/ForensicScreenController.cs` (titre affiché, calculs du dossier, résolveurs de mots, bande) ; DTO : `Assets/Scripts/Operational/Forensic/ForensicDtos.cs` ; client réseau : `Assets/Scripts/Operational/Forensic/ForensicClient.cs` ; tests : `Assets/Tests/PlayMode/ForensicScreenPlayModeTests.cs`. Méthode du mandat (temps 4) : pour chaque champ de DTO, usages comptés (`grep -c`), chaque site lu et classé RENDU / LOGIQUE / IGNORÉ ; tout ce qui est affiché sans venir d'un champ (littéraux, nombres en dur) listé avec `fichier:ligne`.
- **Captures de ce que le front affiche** : `captures/` (12 PNG + `journal.tsv`), servies par la VRAIE pile (compte jetable par état, vrai shell, l'écran se charge lui-même, bundle i18n SERVI ; FR, EN, 1080×2400 et 1080×1920). Noms `E13_Dossier_<quiet|noticed|watched>_<fr|en>_<1080x2400|1080x1920>.png`. `journal.tsv` = sortie de l'instrument (l'image prime sur lui). **Elles servent à confronter F à l'image** (texte réellement affiché) ; tu ne juges pas la mise en pixels (autre juge).
- États : `quiet` = état naturel (vue Vide, nom null) ; `noticed` = posé par SQL, nom « Lt. Hara », mot `forensic.cran.remarque` ; `watched` = posé par SQL, nom « Lt. Rin », mot `forensic.gravite.on_vous_regarde`.

## Écarts ASSUMÉS déjà connus (re-vérifie, ne recopie pas)
| information | raison déclarée |
|---|---|
| dénominateur du compteur de pistes : le front écrit « /2 », la maquette « /3 » | dette TD-883 déclarée ouverte |
| chrome du shell (ARGENT, CHALEUR, JOUR) en français sur les planches EN | le shell code le français : hors ㊴ |
| la piste train de vie n'est plus tenue pour constante côté client (changement du lot) | à vérifier : c'est précisément ce que F doit montrer |
| le jeu n'est livré qu'en FRANÇAIS ; les planches EN ne servent qu'à confronter les clés servies EN | décision f2 ; le chrome FR sur les planches EN est un artefact du banc |
| le mot sous la piste (« Ça se remarque », `forensic.gravite.ca_se_remarque`) n'est affiché que sous la piste des cuves à `visible` : aucune planche ne le montre (les 3 comptes ont un effluent `clear`) | à vérifier dans F (résolveur `CleDeLaPiste`) et au back |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- les notes d'implémentation du chantier ;
- **tout rapport ou mesure de juge précédent (visuel ou données) : INTERDITS** — `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/**` SAUF ce répertoire, `Tools/juge-visuel/**`, et tout `/home/erutheone/project/mafia-unity-F/Tools/juge-*/**` ;
- les « choix » non sourcés : s'ils ne sont pas dans le dossier, ils n'existent pas.

## Format du rapport
Celui du mandat (`rapport.md`) : verdict APPROUVÉ | NON en tête, trois comptes + somme recomptés par `mesures/controle-arithmetique.py` (positif rc=0, négatif rc≠0), table de couverture B/M/F, « passé à côté ? » séparé des défauts, section « non vérifié » obligatoire. **X-Server-Build avant/après** dans le rapport.
