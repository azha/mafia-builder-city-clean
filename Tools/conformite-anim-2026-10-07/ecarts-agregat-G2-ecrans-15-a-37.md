# Écarts de design ouverts — rapport brut de l'agrégateur G2-ecrans-15-a-37 (07/10/2026, arbre 3d295d18)

# Inventaire G2 des écarts de design : ⑯, ⑮, ⑰, ㉒, ⑲, ㉓, ㉕, ⑱, ㉔, ㉟, ㊱, ㊲

Lecture seule, aucun fichier créé. Arbre `~/project/mafia-unity-anim`, branche `design/conformite-anim-2026-10-07`. Je compte **72 lignes ouvertes**. Aucun identifiant de compte n'apparaît.

Trois points à connaître avant de lire la table :

- **Aucun juge n'a repassé depuis les corrections.** Les dossiers `r2-2026-09-22` (⑮, ⑰, ㉓, ㉟, ㊱) et `r17` (㊲) sont préparés, sans captures ni rapport. Le dernier rapport de chaque écran est donc son r1, ou r16 pour ㊲.
- **Le code a beaucoup changé depuis ces rapports** (22/09 au 07/10). Je range en **fermé-code** les écarts qu'un commit postérieur corrige, avec son SHA. Aucun n'a été revu à l'image. Plusieurs commits se déclarent « NON EXÉCUTÉ », « NON COMPILÉ » ou « typecheck empilé ». Il y en a 45 au total, à rejuger avant d'être crus.
- **Le r1 de ⑮ et celui de ⑰ ont été jugés contre la mauvaise référence** : les cadres #31 et #32 étaient échangés, selon `police/constats-a-rejuger-⑮.md` et `⑰.md`. Les lignes marquées `[?]` ont une cible à re-mesurer.

Marques de la dernière colonne :
- `[R]` : l'écart est confirmé dans le code actuel.
- `[?]` : la cible a changé, ou l'écart dépend de données ou d'une recapture.
- `A5?` : écart de direction (série 2 contre cadre #32) que f2 pourrait ranger en assumé.

## 1. Écarts OUVERTS (72 lignes)

Les contrôleurs sont sous `Assets/Scripts/` : `CitySim/Inspection/InspectionScreenController.cs` (⑮), `CitySim/Precinct/PrecinctScreenController.cs` (⑰), `Economy/Shop/ShopScreenController.cs` (㉓). Dans les sources, « Inspection », « Precinct » et « Shop » désignent ces trois fichiers.

| écran | écart (maquette montre / jeu montre) | perçu par le joueur comme | cl. | source | marque |
|---|---|---|---|---|---|
| ⑯ F5 | Titre du registre en gras (fût/capitale 0,176). Jeu : régulier (0,114). Le code ne pose aucun gras (`DailyReviewScreenController.cs:1222`). Écart lié à l'arbitrage de police A1 (Noto contre DejaVu). | Le titre du registre est moins marqué | C | `revue-du-jour/r1-2026-09-06/rapport.md` §3 F5 ; commit 8c1fd0e3 | [?] |
| ⑯ F10 | Plaque du registre 12,6 % moins haute (139 px contre 158). Le rembourrage CSS 8/10 est repris (`:1172`), l'écart est en hauteur de ligne. | Registre un peu plus plat | C | rapport r1 §3 F10 ; commit 2ef86331 | [?] |
| ⑯ F12 | Chiffre du compte +11,6 % (« 34 » contre « 17 ») ; dépend de la chaîne affichée. | Chiffre un peu gros | C | rapport r1 §3 F12 | [?] |
| ⑮-1 | Colonnes CHARGE et RÉGIME en français (« VIDE/LEGERE », « NOMINAL/ARRIERE »). Jeu : énuméré servi mis en capitale initiale (Empty, Light, Nominal, Backlogged…). | Mots anglais dans l'écran | A | Inspection:325-328, :357-362 ; r1 ⑮ B1 (07/09) | [R] |
| ⑮-2 | Papier listing beige à bandes et perforations. Jeu : aplat sombre sans bandes. | Écran sombre uni, pas un registre | A | Inspection:366-373 ; r1 M3 ; cadre #32 | [R] A5? |
| ⑮-3 | En-tête « BPD · REGISTRE DE DISPATCH · 12H · JOUR 26 », à gauche, en monospace. Jeu : « LES INSPECTIONS » en serif or centré, puis « 18 districts ». | Mauvais titre et mauvaise ligne d'état | A | Inspection:384-388, :219 ; r1 m1, m2, m4 | [R] A5? |
| ⑮-4 | Tout en capitales monospace interlettrées. Jeu : casse mixte sans-serif. | Typographie qui ne ressemble pas à un listing | C | Inspection:324-330 ; r1 m5 | [R] A5? |
| ⑮-5 | Texte d'encre sur papier. Jeu : en-têtes, pied « TOUT OU RIEN » et lignes vides en blanc à 18 % sur noir (environ 2:1, sous le plancher 4,5:1). | Texte quasi illisible | A | Inspection:83, :293-296, :393 ; r1 M6 | [R] |
| ⑰-1 | Six fiches de précinct (nom, quartiers, état, patrouilles). Jeu : un seul commissariat, en deux blocs. | Écran quasi vide, l'inventaire manque | A | Precinct:198-207 ; r1 ⑰ B3, m3 | [R] |
| ⑰-2 | Quatre pastilles pleines par fiche et le mot « PATROUILLES ». Jeu : quatre crans en contour seul, sans remplissage. | Petites marques vides, incompréhensibles | A | Precinct:232-242 ; r1 B2 | [R] |
| ⑰-3 | Liège ponctué, fiches bristol claires punaisées. Jeu : aplat sombre, blocs en contour sans remplissage. | Gabarit en fil de fer, matière absente | A | Precinct:215, :290-291 ; r1 M2, m2 | [?] |
| ⑰-4 | Sous-titre « six commissariats · relevé de nos guetteurs » et pied « Quatre d'entre eux vous chassent… ». Jeu : aucun des deux. | Pas de phrase de synthèse | A | Precinct:305-309 ; r1 M5 | [?] |
| ⑰-5 | Titres de gestes lisibles. Jeu : « Recruter un greffier » et « Acheter un renseignement » en blanc à 18 %, la raison en crème plus lisible que le titre ; surtitres de palier en gris neutre. | Le geste s'efface derrière son excuse | A | Precinct:221, :265-268 ; r1 M3, M4 | [R] |
| ⑰-6 | « CE QU'ILS SAVENT » en ivoire, à gauche. Jeu : « LE COMMISSARIAT » en serif or centré. | Mauvais titre | A | Precinct:305-307 ; r1 m1, m5 | [?] |
| ⑰-7 | EN CHASSE rouge, SOUPÇON ocre, EN VEILLE bleu-vert. Jeu : EN CHASSE et SOUPÇON tous deux en braise, EN VEILLE en or. | Nuance de couleur différente | C | Precinct:224 ; r1 M6 | [?] |
| ㉓-1 | Intitulé de rayon « LES EXTRAS — PAYÉS EN JETONS », puis bourse, objets, Wexler. Jeu : liste unique sans intitulé. | On ignore ce qu'est la liste | A | Shop:195, :414-443 ; r1 ㉓ B1, M9 | [R] |
| ㉓-2 | Le « 0 » du solde reste crème. Jeu : « 0 Marks » et la phrase du don en braise (couleur d'alarme). | Alarme rouge sur un solde nul | A | Shop:180, :371-375 ; r1 B3 | [R] |
| ㉓-3 | Comptoir de laiton, vitre bleutée, tablette de bois. Jeu : `surfaceBase` plat. | Fond noir sans la matière de la boutique | A | Shop:342-344 ; r1 M1 | [R] |
| ㉓-4 | Illustration par article (230×148 px). Jeu : disque uni de 11 CSS. | Pas d'objets, des pastilles | A | Shop:223-228 ; r1 M2 | [R] |
| ㉓-5 | Étiquette de prix crème avec jeton. Jeu : « N Marks » en texte nu. | Pas de prix lisible comme objet | A | Shop:244-248 ; r1 M3 | [R] |
| ㉓-6 | Bande laiton, titre « LA VITRINE » à gauche face à la bourse. Jeu : titre centré seul, serif 13 CSS au lieu de 11. | Composition titre/argent perdue | A | Shop:357-370 ; r1 M4, m4 | [R] |
| ㉓-7 | Grille à deux colonnes. Jeu : une colonne. | Liste étirée | A | Shop:414-443 ; r1 M6 | [R] |
| ㉓-8 | Nom français en gras, sous-titre anglais gris. Jeu : clé `boutique.sku.<id>` si servie, sinon `display_name` anglais ; clés absentes des bundles gelés du 22/09. | Nom d'article en anglais | A | Shop:511-515 ; r1 M7 | [?] |
| ㉓-9 | Bandeau de voix Wexler fixé en bas, avec citation. Jeu : absent. | Élément manquant | A | r1 M8 ; aucun code | [R] |
| ㉓-10 | « 1 400 jetons ». Jeu : nombre sans séparateur de milliers. | Nombres collés | C | Shop:503-507 ; r1 m1 | [?] |
| ㉓-11 | Jeton gravé 12,5 CSS. Jeu : disque radial lisse, plus petit et plus gris. | Détail de gravure absent | C | Shop:223-228 ; r1 m2 | [R] |
| ㉓-12 | Défilement coupé net, ligne tronquée, sans fondu ni indicateur. | On ne devine pas qu'on peut défiler | B | Shop:395-412 ; r1 m3 | [R] |
| ⑱ F4 | Menu posé sur la scène « district de nuit » assombrie. Jeu : aucun fond peint derrière les 20 entrées. | Menu sur noir uni, sans lieu | A | `plus/r1-2026-09-06/rapport.md` §3 F4 ; `AppShell.cs:1337-1348` ; `ARBITRAGES-user-2026-09-07.md` §1 | [?] |
| ㉔ F1 | Dalle LCD verte de 974 px avec en-tête MESSAGES, réseau, batterie. Jeu : liste de cartes grises, aucune dalle. | L'écran n'a rien du téléphone | A | `autonomie/r1-2026-09-06/rapport.md` §3 F1 ; `Tools/atelier-2026-09-22/13-autonomie-inventaire.md` §4.3-4.4 | [R] |
| ㉔ F2 | Châssis « BRENNAR · GSM », LIRE/OK/OPTIONS, pavé 4×3, « tapez 1 ou 2 ». Jeu : rien. | Pas d'indice du geste « 1 ou 2 » | A | rapport r1 F2 | [R] |
| ㉔ F4 | Libellés français (« IL A REFUSÉ DE CUISINER », « Ce cycle »). Jeu : « Lt <id> • Oldest: n cycles », « Choose A/B », `refused_action` et « Issue : <outcome> » bruts. | Anglais et texte technique | A | `AutonomyInboxController.cs:285, :366, :310, :229` | [R] |
| ㉔ F5 | « LT. KANE ». Jeu : « Lt » plus identifiant du lieutenant. | Expéditeur illisible | A | `AutonomyInboxController.cs:285` ; inventaire §3.3 | [R] |
| ㉔ F9 | Dalle à 90 % de la largeur. Jeu : carte fixe 600×640, soit 47 %. | Contenu étroit dans un noir | A | `AutonomyInboxController.cs:418` | [R] |
| ㉔ F10 | Vide encadré et texturé. Jeu : 79 % du rect libre en fond nu. | Écran à moitié vide | A | `AutonomyInboxController.cs:408-410, :451-459` | [R] |
| ㉔ F11 | Palette verte monochrome (72 % de vert). Jeu : gris-bleu neutre, 0 % de vert. | Écran sans couleur propre | A | `AutonomyInboxController.cs:410` | [R] |
| ㉟ B2 | Liste encadrée avec pied à CTA. Jeu : grand vide sous la carte (74 % vide au r1) ; dépend des données. | Écran à moitié vide | A | `vente/r1-2026-09-07/rapport.md` §3 B2 ; `SellingScreenController.cs:669` | [?] |
| ㉟ M3 | Fond dégradé bleu nuit avec halos or et teal. Jeu : aplat `surfaceBase`. | Fond gris sans ambiance | A | rapport r1 M3 ; `SellingScreenController.cs:598` | [R] |
| ㉟ M4 | Carte pleine `#111823`, bord `#2a3648`. Jeu : contour `#ffffff24` sur le fond de page. | Cartes sans plaque | A | rapport r1 M4 ; `SellingScreenController.cs:381` | [R] |
| ㉟ M8 | Glyphe de substance coloré de 19 CSS. Jeu : disque or uni de 11 CSS. | Produit non identifiable | A | rapport r1 M8 ; `SellingScreenController.cs:393` | [R] |
| ㉟ M9 | Ligne « La Lisière · lek 12 · cher ». Jeu : absente, alors que le back sert district, lek et tarif (ae3dd3a3). | On ne sait ni où ni à quel tarif | A | rapport r1 M9 ; `SellingScreenController.cs:377-458` | [R] |
| ㉟ m1 | Enseigne « La vente ». Jeu : « LES POINTS DE VENTE » en dur. | Mauvais titre | A | rapport r1 m1 ; `SellingScreenController.cs:654` | [R] |
| ㉟ m7 | Titre de carte = nom du dealer. Jeu : « Brindle », la substance. | L'écran dit « ce qui se vend », pas « qui vend » | A | rapport r1 m7 ; `SellingScreenController.cs:397` | [R] |
| ㉟ M6 | Statut codé en couleur (vert « au travail », rouge « grillé »). Jeu : gris chaud, braise seulement pour « grillé ». | Statut sans codage d'état | B | rapport r1 M6 ; `SellingScreenController.cs:402-403` | [R] |
| ㉟ M10 | Panneau rouge « Nulle part où la porter ». Jeu : une ligne grise dans le bouton. | Blocage peu lisible | B | rapport r1 M10 ; `SellingScreenController.cs:451-457` | [R] |
| ㉟ M5 | Titre d'enseigne `#f2c96b`. Jeu : `#d9ab4e`, plus sombre. | Titre un peu terne | C | rapport r1 M5 ; `SellingScreenController.cs:66, :654` | [R] |
| ㉟ M7 | 4 barres pleines. Jeu : 5 carrés creux au trait. | Jauges d'une autre forme | C | rapport r1 M7 ; `SellingScreenController.cs:517-538` | [R] |
| ㉟ m2 | Capitale du titre à 12,5 CSS. Jeu : 9,7 CSS (conséquence de m1). | Titre petit | C | rapport r1 m2 | [?] |
| ㉟ m3 | Nom du dealer en sans-sérif gras 9 px. Jeu : sérif 11,5 (+28 %). | Police et taille du nom | C | rapport r1 m3 ; `SellingScreenController.cs:397-398` | [R] |
| ㉟ m4 | Apostrophe typographique. Jeu : apostrophe droite. | Détail typographique | C | rapport r1 m4 ; `SellingScreenController.cs:659` | [R] |
| ㉟ m6 | Rangée de 32 CSS. Jeu : carte à 3 rangées internes, 2,8 fois plus haute. | Peu de dealers visibles | C | rapport r1 m6 ; `SellingScreenController.cs:384-417` | [?] |
| ㊱ B3 | Aucune échelle de paliers dans les 6 cadres. Jeu : bloc « Palier n » toujours rendu. | Bloc en trop | A | `screen_c6/r1-2026-09-07/rapport.md` §3 B3 ; `HorizonScreenController.cs:187, :312-333` | [?] |
| ㊱ B4 | `.rien` centré dans la boîte. Jeu : message présent mais ancré en haut, puits noir dessous. | Grand vide sous le message | A | rapport r1 B4 ; `HorizonScreenController.cs:228-240, :719` | [?] |
| ㊱ M1 | Fond marine dégradé avec deux lueurs. Jeu : aplat `surfaceBase`. | Fond gris plat | A | rapport r1 M1 ; `HorizonScreenController.cs:604` | [R] |
| ㊱ M2 | Cerne or intérieur continu (trait d'identité n°1). Jeu : absent, « déclaré, pas corrigé » dans le code. | Cadre doré manquant | A | rapport r1 M2 ; `HorizonScreenController.cs:496-499` | [R] |
| ㊱ M6 | Titre du pavé en crème `#eae0c8`. Jeu : or. | Deux titres or se disputent le regard | C | rapport r1 M6 ; `HorizonScreenController.cs:738` | [R] |
| ㊱ m1 | Apostrophe `’`. Jeu : apostrophe droite servie par le back. | Détail typographique | C | `HorizonScreenController.cs:236, :238, :650` | [R] |
| ㊱ m2 | Enseigne 46 CSS. Jeu : 51 CSS (+10 %). | Enseigne un peu haute | C | `HorizonScreenController.cs:474` | [R] |
| ㊱ m3 | Tuiles de compteurs 31 CSS. Jeu : 42 CSS (+33 %). | Tuiles hautes | C | `HorizonScreenController.cs:475` | [R] |
| ㊱ m4 | Libellés en gris froid `#8a979c`. Jeu : beige chaud. | Nuance de gris | C | `HorizonScreenController.cs:521` | [R] |
| ㊱ m5 | Marge de 13 CSS au-dessus du titre. Jeu : 37,8 CSS, en partie le débord du manomètre. | Marge haute morte | C | `HorizonScreenController.cs:472, :623-624` | [?] |
| ㊱ m6 | « Palier 2 » avec espace. Jeu : « Palier3/4/5 » collés. | Lignes de palier mal écrites | C | `HorizonScreenController.cs:333` | [R] |
| ㊲ M2 | Panneau élastique 767 px. Jeu : 678 px (−11,6 %). Le portrait déborde de 10 px, les tuiles sont tassées, 135 px de vide sous le bouton. | Portrait qui mord le liseré, grand trou | A | `reputation/r16-2026-09-07/rapport.md` §3 ; `ReputationScreenController.cs:883-884` ; `addendum-routage-f2.md` | [?] |
| ㊲ M3 | Chevelure sombre de 20 px de chaque côté des tempes. Jeu : 0 px, le visage dépasse sa silhouette. | Bandeau de peau sur le front du lieutenant | A | r16 §3 M3 | [R] |
| ㊲ R2 | Silhouette de toits au-dessus du cadre. Jeu : dégradé vide de 250 px. | Écran sur fond nu, sans décor | A | r16 §ARBITRAGES R2 ; `ARBITRAGES-user-2026-09-07.md` §1 | [R] |
| ㊲ m1 | Col en V 61×61 px. Jeu : 78×75 (+54 % d'aire). | Col trop gros | C | r16 §3 m1 | [R] |
| ㊲ m2 | Reflet du miroir, pic 30,7. Jeu : 51,6 (+68 %), d'un bord à l'autre. | Trait turquoise plus vif | C | r16 m2 | [?] |
| ㊲ m3 | Boîte de compteur en dégradé vertical. Jeu : aplat (13,13,22). | Compteur plus plat | C | r16 m3 | [R] |
| ㊲ m4 | Lueur froide sous le rail. Jeu : lueur ambrée. | Teinte chaude au lieu de froide | C | r16 m4 | [R] |
| ㊲ m5 | Aparté en 3 lignes (colonne 175 px). Jeu : 2 lignes (201 px). | Texte plus large | C | r16 m5 | [R] |
| ㊲ m6 | Marges du cadre 21/21. Jeu : 18/18. | Rien de perceptible | C | r16 m6 | [R] |
| ㊲ m7 | Boîte du bouton « Donner une première règle » 96 px. Jeu : 90 px. | Bouton un peu plus bas | C | r16 m7 | [R] |
| ㊲ m8 | Filet or sous le sous-titre, 6 px plus haut en jeu. | Rien de perceptible | C | r16 m8 | [R] |

**Deux écarts ㊲ non comptés.** Ils datent du 24/09 et aucun juge ne les a vus :
- Compteur ENFREINTES retiré : 3 fenêtres en maquette, 2 en jeu (`ReputationScreenController.cs:1110`, `NbCompteurs = 2`). Classe A.
- Bouton « Donner une règle » désactivé et sans listener (commit 0ea1d6ab). Classe B.

Si vous les comptez, le total passe à 74 (A = 42, B = 4, C = 28).

**Chrome partagé, hors compte :**
- Ronds du dock sans icône : assumé (arbitrage user du 07/09 ; le commit 95109293 annule l'ajout des icônes).
- Phase « — » sous JOUR : état voulu, et la barre porte la phase de session (8146ea7a).
- Heure « 21:40 » : retirée du canon (`ARBITRAGES` §16).
- Flèche de retour du bandeau : retirée (6dfee947).
- Format monétaire : formateur unique (7ad23e71).
- Losange doré : élément du canon, pas un écart.
- Bandeau en aplat (⑯ F15) : ne tenait pas comme défaut du shell (4613fa2f).
- ⑮ m8 (`.tel.chaud` appliqué à moitié) : reste ouvert côté shell.
- ⑰ m4 : probablement résolu par le format sans centimes, non mesuré.
- ⑰ m7 : statut non établi.
- ㉓ m5 : non vérifiable.

## 2. État du dernier tour, par écran

Chaque décompte est fait id par id. Pour ⑮, ⑰ et ㉓, une ligne de la table regroupe plusieurs ids, d'où l'écart entre « lignes » et « ids ».

- **⑯ Revue du jour.** Dernier tour r1 du 06/09 : NON APPROUVÉ, 2 bloquants, 3 majeurs, 10 mineurs (15 ids).
  - **Ouverts :** 3 (F5, F10, F12).
  - **Fermés-code :** 10 (F1 f4f0d730 ; F2 c2f54edc ; F3, F4, F6, F7 8c1fd0e3 ; F8, F9, F11 2ef86331 ; F15 avec F1).
  - **Assumés :** 2 (F13 dock sans icône, arbitrage user du 07/09 ; F14 « — » et phase, `ARBITRAGES` §16).
  - **Fermés-juge :** 0. **Caducs :** 0. **Total :** 15.
  - Les gardes de code d'EcranRevue sont vertes (run 92/92, `Tools/juge-donnees/revue-du-jour/ecart-2026-09-23.md` §5.4), mais aucune capture n'a été prise après les corrections.
  - **L'état nominal (avec signalements) n'a jamais été capturé ni jugé** : bulle, médaillon, jeton, verdicts et tampon signé sont fermés en code uniquement.
  - **Texte modifié depuis :** 52f65ed6 et 6011a464 (26/09) ont changé le texte de l'état vide (« donnez-leur une première règle »), et 1b3fdbe1 fait lire `day_phase` à l'en-tête « CE MATIN ».
- **⑮ Les inspections.** Dernier tour r1 du 07/09, jugé contre la mauvaise référence : NON APPROUVÉ, 3 bloquants, 6 majeurs, 9 mineurs (18 ids).
  - **Ouverts :** 7 ids, soit 5 lignes (B1 ; M3 ; m1, m2, m4 ; m5 ; M6).
  - **Fermés-code :** 7 (B2 2d8aba6a et a7a4a066 ; B3 2d8aba6a et 36ba4d55, le chemin vers #33 reste à rejuger ; M1 ; M4 ; M5 d2354db8 ; m6 ; m7).
  - **Caducs :** 2 (M2, m3). **Chrome :** 2 (m8, m9). **Fermés-juge :** 0. **Assumés :** 0.
  - **Total :** 7 + 7 + 2 + 2 = 18.
- **⑰ Le commissariat.** Dernier tour r1 du 07/09, jugé contre la mauvaise référence : NON APPROUVÉ, 3 bloquants, 6 majeurs, 7 mineurs (16 ids).
  - **Ouverts :** 11 ids, soit 7 lignes (B3, m3 ; B2 ; M2, m2 ; M5 ; M3, M4 ; m1, m5 ; M6).
  - **Fermés-code :** 3 (B1 3c79a54e ; M1 b2a08b3d ; m6 d2354db8).
  - **Chrome :** 2 (m4, m7). **Fermés-juge, assumés, caducs :** 0.
  - **Total :** 11 + 3 + 2 = 16.
- **㉓ Vitrine.** Dernier tour r1 du 07/09 : NON APPROUVÉ, 3 bloquants, 9 majeurs, 5 mineurs (17 ids).
  - **Ouverts :** 14 ids, soit 12 lignes (B1, M9 ; B3 ; M1 ; M2 ; M3 ; M4, m4 ; M6 ; M7 ; M8 ; m1 ; m2 ; m3).
  - **Fermés-code :** 2 (B2 1d977fc7 « Bientôt », sans run ; M5 b2a08b3d).
  - **Non vérifiable :** 1 (m5). **Fermés-juge, assumés, caducs :** 0.
  - **Total :** 14 + 2 + 1 = 17.
  - B3 était suspendu au back du 04/09 pour sa valeur ; sa forme tient dans le code.
- **㉒ Profil, ⑲ Réglages, ㉕ Tutoriel : aucun tour.**
  - Il n'existe que des `mandat-*.md` pré-remplis.
  - Aucun écart n'est fabriqué ici.
  - ⑲ et ㉕ n'ont pas de maquette série 4/6 ; ㉒ a les cadres 95 à 97, jamais jugés.
- **⑱ Menu Plus.** Dernier tour r1 du 06/09 : NON APPROUVÉ, 6 bloquants, 8 majeurs, 1 mineur (15 ids).
  - **Ouvert :** 1 (F4).
  - **Fermés-code :** 7 (F1, F2, F3, F11 d240ab90 puis d89c5e13 ; F7 d89c5e13 ; F13 `HeatBucketResolver` et cc0018a1 ; F14 9fa198a).
  - **Assumés :** 5 (F5, F6, F9, F10, F12, « écran réduit » ratifié, `ARBITRAGES` §3). **Caducs :** 2 (F8, F15).
  - **Total :** 1 + 7 + 5 + 2 = 15.
  - Le code suit désormais le menu en 5 groupes de `ecrans-brennar-navigation.html`, marqué PROPOSÉ et jamais ratifié.
  - F6 (les 3 compteurs « ce qui vous attend ») est assumé alors que cette information n'est plus nulle part dans le menu.
- **㉔ Autonomie.** Dernier tour r1 du 06/09 : NON APPROUVÉ, 8 bloquants, 5 majeurs, 1 mineur (14 ids).
  - **Ouverts :** 7 (F1, F2, F4, F5, F9, F10, F11).
  - **Fermés-code :** 6 (F3 75ac1001 ; F6, F7, F8 b5bf3204 ; F12 8146ea7a ; F14).
  - **Assumé :** 1 (F13). **Fermés-juge, caducs :** 0.
  - **Total :** 7 + 6 + 1 = 14.
  - Le « écran réduit » est ratifié en bloc le 07/09, mais l'atelier le dit encore « décision ouverte » le 23/09 (`13-autonomie-inventaire.md` §4.4). Les 5 écarts de forme (F1, F2, F9, F10, F11) peuvent basculer en assumé si l'user tranche.
- **㉟ Vente.** Dernier tour r1 du 07/09 : NON APPROUVÉ, 3 bloquants, 11 majeurs, 7 mineurs (21 ids).
  - **Ouverts :** 15 (B2, M3, M4, M5, M6, M7, M8, M9, M10, m1, m2, m3, m4, m6, m7).
  - **Fermés-code :** 4 (B1 56445ad3 et 988c0762 ; B3 d612300d puis b9a5751f ; M1 d40ae4d7 ; M11 5e67e8ff et 9b5d6117).
  - **Assumé :** 1 (M2, « AFFECTER UN DEALER », dépendance back L3, `addendum-routage-f2.md`). **Caduc :** 1 (m5).
  - **Total :** 15 + 4 + 1 + 1 = 21.
  - Les constats suspendus par la recréation du back (B2, M9, M11, m7, B3) attendent une recapture qui n'a pas eu lieu.
- **㊱ Horizon.** Dernier tour r1 du 07/09 : NON APPROUVÉ, 4 bloquants, 6 majeurs, 6 mineurs (16 ids).
  - **Ouverts :** 11 (B3, B4, M1, M2, M6, m1 à m6).
  - **Fermés-code :** 5 (B1, B2 02f1abd3 puis 0bd5d3d8 ; M3, M4, M5 f622c376).
  - **Assumés, caducs :** 0.
  - **Total :** 11 + 5 = 16.
- **㊲ Réputation.** Dernier rapport : r16 du 07/09 (r17 du 22/09 est préparé, sans rapport) : NON APPROUVÉ, 0 bloquant, 3 majeurs, 8 mineurs (11 ids).
  - **Ouverts :** 10 findings (M2, M3, m1 à m8), plus l'écart R2, remis en correctif par f2 : 11 lignes.
  - **Fermé-code :** 1 (M1, 0d66e2e8, 07/09, l'ascenseur passe dans la gouttière).
  - **Assumés, caducs :** 0 parmi les 11 findings.
  - **Total des findings :** 10 + 1 = 11.
  - Les 10 assumés A1 à A10 de r16 sont comptés à part par le rapport.
  - r1 à r15 ont été fermés ou non par r16, mais la liste n'en existe nulle part.

**Récapitulatif des 142 ids.** Il couvre ⑯, ⑮, ⑰, ㉓, ⑱, ㉔, ㉟, ㊱ et ㊲ (r1 de chaque écran, r16 pour ㊲).
- 72 lignes ouvertes, regroupant 77 ids de rapport plus l'écart R2 (qui n'est pas un id de r16).
- 45 fermés-code, 9 assumés, 5 caducs, 5 chrome ou non vérifiables.
- 77 + 45 + 9 + 5 + 5 = 141, plus R2 = 142.

## 3. Écarts d'animation et de mouvement croisés

- **㊲ :** r12 et r13 ont mesuré qu'il n'y a aucun tween. 47 196 px bougent parce que le nom du lieutenant arrive après la première image et pousse le buste de +24 px. L'exigence d'une première image complète est ratifiée ; « garder sans tween » ne l'est pas (`ARBITRAGES` §5, l'user ayant dit « animé le truc » le 27/08).
- **㉟ :** la maquette porte un `scan` teal animé, figé sur la ligne « Mira ». f2 a tranché que ce n'est pas un écart.
- **㉔ :** le burner de la maquette a des lignes de balayage `.scan`, absentes du jeu tant que la dalle n'est pas construite.
- **㉓ :** la CSS de la maquette ne porte aucun `@keyframes`.
- **⑰ :** un fondu des libellés de pastilles n'a pas pu être exclu, faute de paire T/T+1.
- **⑯ :** aucune animation, et aucune paire T/T+1 n'a été fournie.
- **⑮ :** le retour de bâton est un état figé, pas un mouvement.

## 4. Somme de contrôle

- **Par écran :** ⑯ 3 + ⑮ 5 + ⑰ 7 + ㉓ 12 + ㉒ 0 + ⑲ 0 + ㉕ 0 + ⑱ 1 + ㉔ 7 + ㉟ 15 + ㊱ 11 + ㊲ 11 = **72**.
- **Par classe :**
  - A = 0 + 4 + 6 + 9 + 1 + 7 + 7 + 4 + 3 = **41**
  - B = ㉓ 1 + ㉟ 2 = **3**
  - C = 3 + 1 + 1 + 2 + 6 + 7 + 8 = **28**
  - 41 + 3 + 28 = **72**
- **Les trois totaux concordent : 72 = 72 = 72.**

## À savoir avant d'agir

- La classe A est écrasante, mais surtout parce que sept écrans n'ont jamais été re-photographiés. Le « jeu » de ces lignes est lu dans le code. Une capture groupée suivie d'un r2 reste le seul moyen de dire si les 45 fermés-code se voient.
- **㉔ est l'écran le plus loin de sa maquette :** 7 écarts ouverts sur 7 en classe A.
- **㉓ et ⑰** sont dans le même cas, avec 9 et 6 écarts de classe A.
- Les trois écrans sans tour (㉒, ⑲, ㉕) ne sont pas conformes pour autant : ils n'ont simplement aucun rapport. Ils nécessitent un tour avant qu'on puisse dire quoi que ce soit.
