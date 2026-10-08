# Les autres écarts de design — écrans MONTÉS (CLIENT-3, 07/10/2026) — agrégat, pas un juge

Source : les derniers rapports de juge visuel (`Tools/juge-visuel/*/r*/`) lus par trois agrégateurs en lecture seule, chaque écart confronté au code de `3d295d18`. Rapports bruts : `ecarts-agregat-G1-…md`, `-G2-…md`, `-G3-…md` ; G3 ligne par ligne : `ecarts-G3-ligne-par-ligne.md`.
⚠️ **« Ouvert » = le finding du dernier rapport est encore vrai dans le code. Aucune planche ni mesure n'a été refaite** (sauf ④ r4, daté d'aujourd'hui). Les rapports ont de 2 semaines (06-07/09) à 0 jour ; les captures d'avant le 04/09 photographient un back périmé. Seule une recapture groupée suivie d'un tour de juge dit ce qui se voit réellement.

## 1. Comptes (somme de contrôle : 267 = 267 = 267 ; +1 le 07/10 soir : le cadran de ⑭, voir note)

| groupe | ouverts | A | B | C | « codés, non rejugés » | fermés/assumés |
|---|---:|---:|---:|---:|---:|---|
| G1 ① ② ③ ④ ⑤ ⑥ ⑨ ⑩ ⑪ ⑭ | 72 | 22 | 7 | 43 | 51 | 12 |
| G2 ⑯ ⑮ ⑰ ㉒ ⑲ ㉓ ㉕ ⑱ ㉔ ㉟ ㊱ ㊲ | 72 | 41 | 3 | 28 | 45 | 9 assumés, 5 caducs, 5 chrome |
| G3 ㊳ ㊴ ㊵ ㉜ ㉚ ㉘ ㉛ ㉝ ㉞ ㉙ | 122 | 48 | 7 | 67 | — (23 fermés par SHA) | 6 assumés, 12 non tranchés |
| ⑭ (ajout 07/10 soir, mesuré) | +1 | +1 | 0 | 0 | — | le cadran « TENSION » de la maquette (cadres 14-19, six angles d'aiguille) n'existe pas côté client : `stress_bucket` est rendu en TEXTE (`CompressionScreenController.cs:194-204`) ; classe A, élément absent |
| **total** | **267** | **112** | **17** | **138** | **96+** | |

Par écran (ouverts) : ① 23 · ② 3 · ③ 9 · ④ 1 · ⑤ 14 · ⑥ 14 · ⑨ 3 · ⑩ 3 · ⑪ 0 · ⑭ 3 · ⑯ 3 · ⑮ 5 · ⑰ 7 · ㉓ 12 · ㉒ 0 · ⑲ 0 · ㉕ 0 · ⑱ 1 · ㉔ 7 · ㉟ 15 · ㊱ 11 · ㊲ 11 · ㊳ 16 · ㊴ 15 · ㊵ 16 · ㉜ 9 · ㉚ 21 · ㉘ 22 · ㉛ 15 · ㉝ 5 · ㉞ 0 · ㉙ 3 = **267**.

**Quatre écrans montés n'ont AUCUN tour de juge sur leur contenu** (㉒ Profil, ⑲ Réglages, ㉕ Tutoriel, ㉞ Carnet — le seul rapport du carnet jugeait une planche qui n'était pas le carnet) ; ⑩ et ⑪ n'en ont pas non plus. « 0 ouvert » veut dire « non jugé », jamais « conforme ».

## 2. Ce qu'un joueur PERÇOIT — les causes communes (une cause = plusieurs écrans)

Classées par ce qui saute aux yeux d'un coup d'œil, du plus fort au plus fin :

1. **Le fond est un aplat noir `surfaceBase` (#0d0f10) là où la maquette a un dégradé, des halos, un décor peint.** ㊳ ㊴ ㊵ ㉚ ㉘ ㉛ ㉟ ㊱ ㉓ ⑤ ⑱ ㊲ (toits absents) ㉔. Le décor de scène est ratifié en bloc depuis le 07/09 (`ARBITRAGES-user-2026-09-07.md` pt 1, lot d'assets « scène ») et **livré sur aucun de ces écrans**. C'est « l'écran noir terne », le premier défaut vu.
2. **Plus de MATIÈRE : cerne laiton, filets, plaques serties, liège, papier perforé, verre.** ㊳ ㊴ ㊵ ㉛ ㉜ ㉚ ㉘ ㉟ ㊱ ㉓ ⑮ (papier listing) ⑰ (liège). Des « fils de fer » sombres au lieu d'objets.
3. **Pied d'écran / geste principal absent ou de mauvaise forme** : ㊳ B4, ㊵ F3, ㉛ B1, ㉚ M4 et ㉘ M2 (pavé or plein au lieu du bouton sombre cerné d'or), ⑤ F5 (le geste principal est le moins lisible).
4. **De l'anglais ou du texte technique à l'écran** : ⑮ (« Empty/Light/Nominal »), ㉔ (« Lt <id> • Oldest: n cycles », « Choose A/B »), ⑭ (« Calm · None »), ⑨ (« TEACH: PAUSE ON HIGH HEAT », identifiants `exc_demo_*`), ㉓ (noms d'articles en anglais).
5. **Éléments entiers absents** : ⑭ (le cadran de tension), ㉔ (la dalle LCD, le châssis GSM), ㉓ (rayon, illustrations, voix de Wexler), ⑰ (les 6 fiches de précinct, seul 1 rendu), ⑤ (carte crème, cachet de cire), ② (la serre sans plante : rangées de texte), ㊴ (12 crans, 3 compteurs de tête), ㊵ (la cuve verticale), ㊳ (« à la une »), ㉟ (ligne district/lek/tarif), ① (flotteur « + $ »).
6. **Sans-sérif partout où la maquette porte un sérif** (㉚ ㉛), **turquoise `accentSuccess` à la place du vert sauge** (㉛ ㉘), **corail à la place du rouge brique** (㉚).
7. **Listes coupées au pixel sans défilement ni indice** : ㊳ B2, ㉝ B1, ㉓ m3.
8. **Texte quasi illisible (contrastes 1,5:1 à 2,8:1)** : ⑮ M6, ⑰ M3/M4, ⑤ F5, ① M7, ㉚ M10.
9. Le reste (138 écarts C) : px, interlettrage, nuances, hauteurs — réels, mesurés, mais ce n'est pas ce qui fait dire « le design n'est pas bon ».

## 3. Ce que cet agrégat ne dit PAS (limites à lire avant d'agir)

- Les classes A/B/C sont celles des agrégateurs ; cas limites signalés : ㉘ M3 et ㉝ M4 (tailles classées A, C si on réserve A aux couleurs/fonds/éléments manquants : A = 109, C = 140).
- **96+ écarts sont « codés, non rejugés »** : un commit déclare le correctif, aucun juge ne l'a revu ; plusieurs commits se déclarent « NON EXÉCUTÉ / NON COMPILÉ ». Ils ne sont pas dans les 266.
- Deux écarts de ㊲ du 24/09 (compteur ENFREINTES retiré, bouton « Donner une règle » désactivé) ne sont pas comptés ; avec eux ㊲ = 13 et le total 268.
- ⑮ et ⑰ ont été jugés au r1 contre le mauvais cadre (cadres #31/#32 échangés) : 11 lignes `[?]` à re-mesurer.
- Le chrome partagé (dock, losange, bandeau, manomètre) a changé depuis les rapports et n'a pas été rejugé sur planche récente.

## 4. Animation croisée dans ces rapports (une ligne chacun)

① bandeau éphémère, gyrophare, pouls, tremblement : codés, jamais vus par un juge à T/T+1 s · ⑤ « garder sans tween » non ratifié (`ARBITRAGES` pt 5) face à « animé le truc » · ㊲ 47 196 px bougent quand le nom du lieutenant arrive (pas de tween, la première image n'est pas complète) · ㊳ ㊵ ㉟ le balayage teal de la maquette classé « arbitrage de capture » par les juges, il est maintenant dégelé et animé · ㉔ lignes de balayage `.scan` du burner absentes (la dalle n'existe pas) · aucun rapport ne contient une paire T/T+1 s.
