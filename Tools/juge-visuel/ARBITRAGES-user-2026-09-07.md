# Arbitrages à trancher par l'user — consolidés par la session juge (2026-09-07, 00:50)

> Une ligne par point : **la mesure** qui l'a fait naître (rapport, chiffre) · **les options** · **l'option recommandée**. Rien
> n'est tranché ici ; l'user tranche en un passage. Les points déjà tranchés sont marqués ✅ et n'y sont que pour leur conséquence.
> Cap de l'user (00:40) : « jouable ASAP » — la recommandation suit ce cap quand deux options se valent.

## A. Doctrine et périmètre

1. **Décor de scène série 6 absent — 5 écrans sur 5 jugés** (⑯ ⑱ ㉔ ⑤ ⑨ ; ⑨ r1 : 57,1 % du rect libre en noir parfait, σ 0,00 sur 21 080 sondes contre 37,17 en référence). Options : (a) lot d'assets « scène » par écran (blender) — la doctrine v3.3 tient ; (b) retirer la doctrine et re-ratifier les maquettes sur fond uni. **Reco : (a)** — c'est le premier écran d'un joueur neuf et l'identité de chaque écran ; si (b), le dire et re-rendre les références sans scène.
2. **④ ⑪ (+ `le_pipeline`, `la_filiere`) n'ont aucune maquette série 6** ⇒ injugeables (INDEX : confiance « aucune »). Options : maquette série 6 à faire · hors canon (ratifier l'écran tel quel). **Reco : maquette** — un écran sans maquette ne sera jamais « fini » par les deux juges.
3. **« L'écran est un autre objet que la maquette » — ⑱ (liste nue vs Bureau) · ㉔ (pas de téléphone à clapet) · ⑤ (carte inversée, table absente) · ㊴ (12 crans → 3 filets)**. Options : construire l'objet de la maquette · ratifier l'écran réduit. **Reco pour « jouable ASAP » : ratifier l'écran réduit** là où la juge-données montre qu'il porte toute l'information, et mettre l'objet en backlog ; sinon construire.
4. **Résolutions cibles : 1080×1920 (16:9) est-elle une cible ?** (㊲ r11 : cadre à hauteur fixe déborde de 141 px sous le bandeau · ③ r3 : carte plein cadre, 3 noms sous le dock · ① r8 : nom du district 4,32:1 à 2400). **Reco : oui, DEUX cibles (1920 et 2400)** — le cadre élastique (㊲ `f14ca81`) prouve que c'est faisable ; les juges les exigent déjà toutes deux.
5. **Animation — ruling 27/08 « sans animation » vs série 6 qui anime.** Désormais MESURÉ (㊲ r12/r13, paire T/T+1 s) : **aucun tween** ; 47 196 / 47 988 px bougent parce que le nom du lieutenant arrive après la 1ʳᵉ frame et pousse le buste de +24 px. **Reco : garder « sans tween », et exiger une première frame COMPLÈTE** (donnée avant affichage, ou hauteur réservée) — c'est un correctif, plus un arbitrage.

## B. Contenu et données

6. **Barre de ratio du bandeau** (JD ① : trait fixe de 74 CSS tout or = affirme 100 % ; canon 68 % + piste ; source disponible `cleanliness_band` PAR NŒUD, `laundering.controller.ts:170` ; R2.2 interdit le scalaire continu). Options : (a) bande portefeuille à 4 crans (DIRTY…CLEAN agrégée) · (b) retirer la barre · (c) trait décoratif sans sens. **Reco : (a), sinon (b) — jamais (c)** (une jauge pleine qui ne mesure rien ment).
7. **Le district est COLD pendant que le médaillon dit BURNING** (JD ① : `district_bucket` reçu et JETÉ, 0 lecture ; la maquette dessine « 12 % Heat local »). **Reco : afficher le bucket du DISTRICT dans la fiche (3ᵉ case) ; le médaillon reste la VILLE.**
8. **Les 3 cases de la fiche ① ont changé de sens** (maquette : À COLLECTER / REVENUS / HEAT LOCAL ; jeu : REVENU / CHAÎNE / ÉTAT). **Reco : re-ratifier les trois cases en BANDES (R2.2) avec HEAT LOCAL = `district_bucket`** (ferme le point 7 du même geste).
9. **Libellés de gravité non ratifiés + « domaine de confiance » en anglais** (⑨ r1 B4 : `Severe · Critical · Moderate · Urgent`, `TEACH: PAUSE ON HIGH HEAT` dans un écran français). **Reco : table de 4 libellés FR ratifiés (Grave · Critique · Modéré · Urgent) + i18n du contenu « teach »** — sans elle le correcteur inventera.
10. **Format monétaire** : « 9 627 820,00 € » (centimes) vs canon « $ 24 850 » (① r8 : chiffres 9,44 au lieu de 11,0 CSS, montant 2,2 CSS plus bas — le format seul produit l'écart). **Reco : « 9 627 820 € », sans centimes**, espace fine insécable.
11. **« 37 % » (canon HUD) vs un MOT (« Brûlant ») dans le médaillon** — le jeu suit R2.2 (bande). **Reco : le mot ; canon HUD à mettre à jour (blender).**
12. **Titre de fiche pleine largeur** (① r8 : 331,38 CSS dans une boîte de 332, capitale −15,7 %). **Reco : titre sur 2 lignes maximum à la capitale du canon, jamais rétréci.**
13. **« 46 phrases + 20 propositions »** — hors de mon matériel (aucun de mes rapports ne les porte) : **f2 à compléter** avant la remontée.

## C. Chrome partagé

14. ✅ **Flèche retour — tranchée (pas de domicile en série 6).** Conséquence mesurée à retirer : le bloc ARGENT poussé de +47,2 CSS arrive à **0,07 CSS** du cerclage du médaillon à 2400 (canon : 86,80). **Reco : retirer la flèche du bandeau, ARGENT revient à x 16,33.**
15. ✅ **Ronds du dock sans icône** (« j'aime pas les icônes »). **Reco : mettre le canon HUD à jour (ronds vides)** pour que chaque juge cesse de le noter.
16. **Aile droite : heure ou phase ?** Canon : JOUR + heure « 21:40 » ; jeu : JOUR + « Aube » en district, tiret ailleurs ; `game_minute` absent des 12 clés de `session/open` (forme F, JD ①). Options : le back projette `game_minute` (lot) · le canon retire l'heure. **Reco : garder la PHASE (mot, R2.2) et retirer l'heure du canon** — moins de code, même sens pour le joueur.

## D. Références et outillage

17. **La référence ① n'est pas reproductible** : `ecran-canon.png` porte l'échafaudage d'atelier (6 pastilles `.co`, bascules 🌙/🔥, `.floater`, bulles ①…⑥ — deux juges ont dû corriger leurs sondes). Blender livre un canon PROPRE à côté. **Reco : ratifier le canon propre comme nouvelle référence ① ; je bascule au tour suivant et je le dis dans le dossier.**
18. **Polices** : les références ont été rendues en Noto (Georgia → Noto Serif, Segoe UI/Roboto → Noto Sans) ; le client embarque DejaVu (couverture de glyphes, épinglée par un test). Options : embarquer Noto · **re-rendre les références avec DejaVu**. **Reco : re-rendre avec DejaVu** — tous les écarts typographiques deviennent opposables, et ⑥ +10 % de chasse, ③ M1 et ⑨ M6 cessent d'être des « arbitrages ».
19. **Anglais et placeholders dans les références** (`HEAT`, `$ 24 850`, « Jour 26 · Soirée », noms de série 4) — ruling « fr réel » : le client a raison, **maquettes en retard : blender re-rend, pas un arbitrage** — listé pour mémoire.
20. **⑯ : CTA « CONFIRMER LA ROUTINE » en état vide** — la maquette le dessine, le code refuse de confirmer 156 routines jamais vues (`DailyReviewScreenController.cs:233-256`). **Reco : suivre le code ; maquette à mettre à jour (bouton absent ou inactif en état vide).**
21. **③ : bouton « Chaleur » en bas à gauche, absent de la maquette** (r1 F6 → pastilles retirées, le bouton reste ; r3 : blanc pur, seul de l'écran). **Reco : retirer** — rien sur la carte n'encode la chaleur tant que le lot d'états (écussons, lavis) n'est pas livré.

---
*Sources : `BILAN-tour-2026-09-06.md` §4 et §8.bis ; rapports ① r8, ③ r3, ⑨ r1, ㊲ r12/r13, JD ① partielle.*
