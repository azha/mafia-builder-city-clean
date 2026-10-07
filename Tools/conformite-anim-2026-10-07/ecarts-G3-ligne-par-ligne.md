# Écarts de design ouverts — CLIENT-3 G3 — arbre mafia-unity-anim @ 3d295d18 (07/10/2026)

Méthode : dernier rapport de juge de chaque écran relu, chaque finding confronté au contrôleur actuel (HEAD). Aucune planche refaite, aucune mesure en pixels refaite : « OUVERT » = le finding du rapport est encore vrai DANS LE CODE (preuve code:ligne) ; les chiffres en px/CSS sont ceux du rapport d'origine.
Sources : rapports `Tools/juge-visuel/<dossier>/r*/rapport.md` ; aucun écran n'a de `dossier.md` racine rempli (ce sont des gabarits) sauf mention.
Code : Assets/Scripts/Operational/<X>/<X>ScreenController.cs ; `Tools/juge-visuel/SUSPENSION-back-04-09-2026-09-07.md` ; `ARBITRAGES-user-2026-09-07.md`.
Classes : A = visible au premier coup d'oeil ; B = visible en jouant ; C = détail fin.

## ㊳ screen_c1 (Journal) — r1 07/09 NON APPROUVÉ 4B/12M/4m (=20). 16 ouverts (A8 B1 C7), 4 fermés, 0 assumé
Fermés : B1 (clés brutes en titre -> texte servi, 201a2563 24/09 + 065414bf 26/09, Journal:405) ; M5 (jeton d'or -> hudMoneyGold, 104cb379 09/09, Journal:579) ; M12 (district-N·fresh -> nom du quartier + « ce matin/hier », 201a2563, 4f4c1403 26/09, Journal:474,513) ; m4 (panneau « ce que le serveur envoie » : ne s'écrit plus que si une ligne montre sa clé, 201a2563, Journal:288-303).
Ouverts :
| id | écart | perçu comme | cl. | source |
| B3 | « à la une » : 1 bloc héros + 3 brèves / 5 rangées identiques (rapport 1:1, maquette 3,1:1) | on ne distingue plus la une de la rue | A | r1 §3 ; Journal:376-396 (une seule Ligne()) |
| B4 | pied : CTA « Y PRÊTER ATTENTION » + phrase-thèse / absent, l'écran n'offre aucun geste | écran sans action | A | r1 §3 ; aucun CTA dans le contrôleur (maillon L3 déclaré cadre 130) |
| M1 | cerne laiton qui encadre la page / absent | page sans cadre d'imprimerie | A | r1 §3 ; Journal:785 (aplat surfaceBase) |
| M3 | 2 filets laiton de la manchette / absents | manchette nue | A | r1 §3 ; Journal:594-613 |
| M4 | puits de liste encadré plus sombre / cartes posées sur la page | pas de réserve lisible | A | r1 §3 ; Journal:668-692 |
| M6 | fond : dégradé navy + 2 halos / aplat neutre #0d0f10 | écran noir terne | A | r1 §3 ; Journal:785, DesignTokens.cs:51 |
| M10 | puce, horodatage à droite (« CE MATIN »), étiquette d'angle (« FAIT DIVERS ») / absents (fraîcheur passée dans la ligne de source) | rangées sèches | A | r1 §3 ; Journal:438-443 |
| M11 | décor de ville entre bandeau et panneau / aplat unique | pas de ville derrière | A | r1 §3 ; Journal:785 ; arbitrage 1 du 07/09 (lot « scène » ratifié, non livré ici) |
| B2 | liste coupée au pixel par le bas (à 1920 : 3 cartes, la 3e tranchée) ; aucun défilement | cartes du bas inaccessibles | B | r1 §3 ; Journal:675 (RectMask2D, pas de ScrollRect ; commentaire « manque ASSUMÉ » du dev, pas décision f2) |
| M2 | bordure #2a3648 sur chaque boîtier / aucune (Contour seulement sur `permanent`) | plaques sans trait | C | r1 §3 ; Journal:422,730 |
| M7 | ligne de source en gris effacé #6b737d / crème secondaire #b9ad92 qui concurrence le titre | hiérarchie aplatie | C | r1 §3 ; Journal:442, DesignTokens.cs:265 |
| M8 | 3 tuiles de compteur égales (86,67) / inégales (80,8/97,5/84,4) | compteurs de largeurs différentes | C | r1 §3 ; Journal:620-646 (pas de LayoutElement) |
| M9 | tuile de compteur 31,7 CSS / 44 CSS (+39 %) | compteurs trop hauts | C | r1 §3 ; Journal:570 CssHCompteur=44 |
| m1 | capitales +11 à +21 % sur 4 corps | textes un peu gros | C | r1 §3 ; tailles inchangées (non remesuré) |
| m2 | plaque d'enseigne 46,1 / 51 CSS | titre un peu plus haut | C | r1 §3 ; Journal:569 |
| m3 | gouttière entre items 3,33 / 5 CSS | items plus espacés | C | r1 §3 ; Journal:686 |
Hors compte (tables du rapport) : S1-S3 assumés, A1-A5 arbitrages. r2 22/09 = dossier préparé, pas de rapport.

## ㊴ screen_b7 (Le dossier) — r1 06/09 NON APPROUVÉ 3B/11M/5m (=19). 15 ouverts (A8 B0 C7), 4 fermés, 0 assumé
Fermés : F5 (or du titre, 7a29020a) ; F6 (vert « Calme » rétabli, d665720d) ; F13 (aveu technique réécrit, fcfa7446) ; F15 (losange or = chrome HUD du shell, hors écran).
| id | écart | perçu comme | cl. | source |
| F1 | 12 crans gradués (3x4) / un filet plein de 2 CSS par carte | on lit une couleur, plus un niveau | A | r1 §3 ; Forensic:304-306 |
| F2 | 3 compteurs de tête teal (dont « franchies ») / absents | chiffres de tête manquants | A | r1 §3 ; Forensic:235-238 |
| F3 | « Le dossier / TROIS PISTES, ET ELLES NE SE MÊLENT PAS » / « Ce qui se voit / TROIS SIGNAUX, TROIS BANDES » | l'écran ne porte pas le nom du menu | A | r1 §3 ; Forensic:269,272 ; AppShell:1195 |
| F4 | 3 pistes côte à côte / 3 rangées empilées | liste, plus de comparaison | A | r1 §3 ; Forensic:283 |
| F7 | panneaux sertis #2a3648 / aucun bord | plaques flottantes | A | r1 §3 ; Forensic:259,291,321 |
| F8 | cerne or, filet or 7 px, encadré or du CTA / aucun or de structure | page nue | A | r1 §3 |
| F10 | titre du panneau bas crème / or | deux titres or concurrents | A | r1 §3 ; Forensic:347-348 |
| F14 | aire colorée 5,5 % -> 2,0 %, luminance -29 % (cause commune F1+F2+F7+F8) | écran terne et vide | A | r1 §3 ; Forensic:211 |
| F9 | interlettrage .2em / .34em absent | texte courant au lieu d'une plaque gravée | C | r1 §3 |
| F11 | corps +15 à +60 % (titre 45->50 px, intitulés 14,5->23) | hiérarchie aplatie | C | r1 §3 ; Forensic:269-299 |
| F12 | 4 niveaux de surface / 1 seul | pas de profondeur | C | r1 §3 (à remesurer) ; Theme:51-52 |
| F16 | bloc de titre 12,7 % / 8,9 % | haut raccourci | C | r1 §3 ; Forensic:246 |
| F17 | crans au-dessus du verdict 23 % de large / filet 86 % | corollaire de F1 | C | r1 §3 ; Forensic:299-306 |
| F18 | vide dans un puits serti / trou à ciel ouvert avant le panneau | grand vide sur fond nu | C | r1 §3 (à remesurer) ; Forensic:311-316 |
| F19 | interligne 33 / 38 px | corollaire de F11 | C | r1 §3 |

## ㊵ screen_c2 (La filière) — r1 06/09 NON APPROUVÉ 4B/11M/9m (=24). 16 ouverts (A4 B1 C11), 7 fermés, 0 assumé, 1 non tranché (F23)
Fermés : F6 filet or (d1030a15) ; F7 liseré (d1030a15) ; F10 jeton or (hudMoneyGold) ; F11 titre panneau crème ; F13 compteurs égaux (79467979, Filiere:870-873) ; F14 gris libellés (79467979) ; F24 dénominateur /N (d1030a15, Filiere:469). Le contrôleur a été remanié 23/09 et 26/09.
| id | écart | perçu comme | cl. | source |
| F2 | cuve verticale à gauche + libellé teinté / barre horizontale pleine largeur (résidu : les 4 étapes existent) | la chaîne n'a pas la forme héros | A | r1 §3 ; Filiere:497-572 |
| F3 | bouton INJECTER + note dans le pied de chaque état / aucun bouton quand la filière existe (BLANCHIR seulement si « aucun noeud ») | aucune action sur l'écran nominal | A | r1 §3 ; Filiere:428-493,669-741 |
| F5 | cerne doré / absent | pas de cadre | A | r1 §3 ; Filiere:928 (cité en commentaire seulement) |
| F8 | fond dégradé encre + halo chaud / aplat #0d0f10 | fond noir neutre | A | r1 §3 ; Filiere:817 |
| F4 | état d'erreur : compteurs 00/00/00 contre « on ne sait pas » | l'écran se contredit | B | r1 §3 ; Filiere:598-608 |
| F1 | caisson `.elast` (#0d0f10 + liseré) autour de la chaîne / liste à nu | pas de réserve encadrée | C | r1 §3 ; Filiere:890-906 |
| F9 | 3 fonds bleutés distincts / surfaceCard unique | gris plus neutre | C | r1 §3 ; Filiere:830,868,910 |
| F12 | runs en 700 / aucun gras | titres plus maigres | C | r1 §3 |
| F15 | corps du panneau 6,6 / 9 | texte plus gros | C | r1 §3 ; Filiere:923 |
| F16 | chapeau 5,6 / 7,5, sans interlettrage | rubrique moins lisible | C | r1 §3 ; Filiere:919 |
| F17 | compteur 32 / 44 CSS ; panneau 67 / 92 | boîtes à vide | C | r1 §3 ; Filiere:860,913 |
| F18 | titre 17 / 19, interlettrage 0,2em / 14 | titre plus haut et serré | C | r1 §3 ; Filiere:836-839 |
| F19 | sous-titre 6,4 / 7,5 | idem | C | r1 §3 ; Filiere:840-843 |
| F20 | libellé de compteur 5,4 / 6,5 | idem | C | r1 §3 ; Filiere:881 |
| F21 | apostrophes typographiques / droites dans les états d'erreur et « aucun noeud » | apostrophes droites | C | r1 §3 ; bundle fr 83b4f291:2419-2420 (bundle servi non vérifié) |
| F22 | `»` peut passer seul en tête de ligne (pas d'espace insécable) | ligne commençant par `» :` | C | r1 §3 ; bundle fr:2419, Filiere:606 |

## ㉜ ecran_delegation — r1 07/09 NON APPROUVÉ 0B/1M/9m (=10). 9 ouverts (A0 B1 C8), 0 fermé, 0 assumé, 1 non tranché (M1)
Les lots ㉜ 1-4 (22-26/09) n'ont touché ni géométrie ni matière. Planche en dépôt du 07/09 (bfe4e991) antérieure à ces lots.
| id | écart | perçu comme | cl. | source |
| m9 | rangée « CE QUI N'EST PAS ENCORE À CONFIER ▸ » absente des cadres 73-77 (seulement titre du cadre 78) / présente sous la liste | ligne de navigation en plus | B | r1 §3 + ARBITRAGE A4 non ratifié ; Delegation:463 (« AJOUT ASSUMÉ » par le dev, pas par f2) |
| m1 | filet 2 CSS #2c3640 liste/pied / changement de fond seul (le code pose un filet, la planche du 07/09 ne le montre pas) | pied peu détaché | C | r1 §3 ; Delegation:1015 (à confirmer par recapture) |
| m2 | jeton de décision 172 px, titre sur 3 lignes / 127 px, 2 lignes | jeton aplati | C | r1 §3 ; Delegation:1094-1095 |
| m3 | marge jeton -> plaque 37 / 55 px | vide inégal | C | r1 §3 ; Delegation:1100 |
| m4 | plaques en dégradé + liseré clair / aplat | plaques sans relief | C | r1 §3 ; Delegation:1473-1489,1689 |
| m5 | « rien ne se fait sans vous » en #eef3f9 / même teinte que le texte | emphase moins marquée | C | r1 §3 ; Delegation:1360-1364 |
| m6 | interligne du pied 43 / 36 px | phrase tassée | C | r1 §3 |
| m7 | verdict/sous-verdict 17 / 23 px | espacement lâche | C | r1 §3 ; Delegation:1157 |
| m8 | tête du panneau 173 / 255 px (+47 %, cause : médaillon et losange du chrome) | grand vide au-dessus du titre | C | r1 §3 |
Non tranché M1 : jeton de décision actif au-dessus d'un geste mort (Delegation:494), dépend du compte.

## ㉚ ecran_appro — r1 07/09 NON APPROUVÉ 1B/13M/12m (=26). 21 ouverts (A9 B1 C11), 2 fermés, 1 assumé, 2 non tranchés (M1, m10)
Fermés : B1 (« Des maillons existent… » -> états vides, b2226fe0 26/09, Appro:624-634) ; m12 (flèche retour retirée, 6dfee947 26/09, TopBar:320). Assumé : m11 (heure absente de l'aile droite, ARBITRAGES-user 07/09 §C.16, ratifié f2 07/09 01:05).
| id | écart | perçu comme | cl. | source |
| M3 | bloc décision ancré en bas / vide 33 % sous le CTA | écran finit au milieu | A | r1 §3 ; Appro:774-780 |
| M4 | CTA sombre cerné d'or, libellé or / aplat or plein, encre sombre | gros bouton jaune | A | r1 §3 ; Appro:582-597 |
| M6 | titre, « Pyralin », citation en sérif / tout sans-sérif | voix typographique plate | A | r1 §3 ; Appro:849 |
| M7 | type x1,44 médian, titre sur 2 lignes | titres trop gros | A | r1 §3 ; Appro:433-438,742-747 |
| M8 | bord perforé du bon / coupe à plat | bon non déchiré | A | r1 §3 ; Appro:753-761 |
| M10 | libellés du bon 3,3:1 / 1,55:1 | libellés presque illisibles | A | r1 §3 ; Appro:499,795 |
| M11 | rouge terre cuite #a8402f / corail #ff5a4d (2,34:1) | rouge criard | A | r1 §3 ; Appro:802, DesignTokens:71 |
| M12 | fond sépia dégradé, 4 encres / aplat #0d0f10, un gris | écran noir sans chaleur | A | r1 §3 ; Appro:718,742-749 |
| m9 | titron « LA CHAÎNE, EN REMONTANT » absent du cadre #48 / posé sans condition | section en trop | A | r1 §3 ; Appro:618-622 |
| M5 | sous-libellé « ça part du compte tout de suite » / absent | débit immédiat non annoncé | B | r1 §3 ; Appro:595-598 |
| M2 | plaque `.bas` #141a21 + filet 2 px / aucune | bas non délimité | C | r1 §3 ; Appro:774-780 |
| M9 | 4 filets pointillés entre lignes du bon / aucun | lignes non séparées | C | r1 §3 ; Appro:490-507 |
| M13 | encres du papier plus claires (cause de M10, M11) | cf. M10/M11 | C | r1 §3 ; Appro:794-803 |
| m1 | papier #efe7d6 / #eae0c8 | papier plus jaune | C | r1 §3 ; Appro:794 |
| m2 | coins arrondis / vifs | coins vifs | C | r1 §3 ; Appro:582-584,754 |
| m3 | ombre sous le bon / aucune | bon à plat | C | r1 §3 ; Appro:753-761 |
| m4 | bande d'en-tête + filet #3a352c / absents | titre sans socle | C | r1 §3 ; Appro:426-441 |
| m5 | « BON DE COMMANDE » sur la ligne de base / flotte 23 px plus haut | en-tête mal aligné | C | r1 §3 |
| m6 | nom du lieutenant droit gras / même style que la réplique | nom noyé | C | r1 §3 ; Appro:573-579 |
| m7 | marges internes 11,4 / 13,3 CSS | bon plus aéré | C | r1 §3 ; Appro:756-757 |
| m8 | libellé/valeur de la ligne 4 séparés 195 / 32 px | ligne 4 serrée | C | r1 §3 ; Appro:490-507 |
Non tranchés : M1 (bloc pénurie : existe depuis 1f8b28f8 03/09, conditionné par scarcity_active ; son absence en capture dépend du compte) ; m10 (ARGENT à 3 px du médaillon : causes changées, flèche retirée + montant sans centimes c963f557 23/09, jamais remesuré).

## ㉘ ecran_distribution — r1 07/09 NON APPROUVÉ 2B/6M/14m (=22). 22 ouverts (A9 B1 C12), 0 fermé, 0 assumé
Aucun commit visuel depuis le rapport (22 commits 22/09-07/10 = textes, données, refactors). L'addendum f2 ne ferme rien.
| id | écart | perçu comme | cl. | source |
| B1 | planche de liège : grain, dégradé, cadre bois, ombres / aplat brun #7a5230 | rectangle brun plat | A | r1 §3 ; Distribution:462,1091 |
| B2 | étiquettes en diagonale, ficelle à 36° / 2 bandes empilées, ficelle quasi plate, planche moitié moins haute | pas de carte punaisée | A | r1 §3 ; Distribution:463-469 |
| M1 | 4 bandes de fond nommées / nappe noire unique | pas de rythme vertical | A | r1 §3 ; Distribution:1026 |
| M2 | bouton sombre à liseré, texte or, légende dedans / pavé or plein, texte sombre, légende dessous | bouton criard | A | r1 §3 ; Distribution:782,791,797 |
| M3 | titre/sous-titre à l'échelle / +44 %, sous-titre sur 2 lignes | en-tête enflé | A (ou C) | r1 §3 ; Distribution:1047-1053 |
| M4 | médaillon rond avec silhouette / carré uni | carré vide | A | r1 §3 ; Distribution:727-729 |
| M5 | section « VOS COURRIERS » + « ACHETER UN VÉLO » absente des 5 cadres / construite | bloc étranger | A | r1 §3 + addendum f2 (maquette incomplète, emplacement attend la maquette) ; Distribution:607-688 |
| M6 | « tient » vert sauge #7fc99a / turquoise #43e0c0 | seul accent froid | A | r1 §3 ; Distribution:551,1101 |
| m11 | « coursier » / « VOS COURRIERS » | faux-ami (le pli, pas le porteur) | A | r1 §3 ; Distribution:612 |
| m12 | légende « même départ, autre arrivée » à l'état livré / « à pied · ça vide le stock du labo » | légende d'une action non proposée | B | r1 §3 ; Distribution:805-807 |
| m1 | 6 séparateurs pointillés / aucun | lignes sèches | C | Distribution:582-599 |
| m2 | valeurs +16 % | valeurs grosses | C | Distribution:596 |
| m3 | petites capitales .9px interlettrées / 3f | capitales moins aérées | C | Distribution:593 |
| m4 | sur-étiquette -16 % | trop petite | C | Distribution:575 |
| m5 | papier #efe6d4 / #eae0c8 | crème plus terne | C | Distribution:1087 |
| m6 | liège #896a42->#85653e / #7a5230 | brun trop sombre | C | Distribution:1091 |
| m7 | planche à plein bord / retrait 16 css | carte posée | C | Distribution:1041 |
| m8 | texte d'étiquette à gauche / à droite | décalé | C | Distribution:498 |
| m9 | punaise 39x35 / 32 px | punaise plus petite | C | Distribution:523 |
| m10 | légende et nom du lieutenant +7 % | un peu gros | C | Distribution:741,806 |
| m13 | réplique dans la colonne du nom / au bord gauche sous le médaillon | bloc scindé | C | Distribution:753 |
| m14 | guillemets « » autour de la réplique / absents (état livré) | réplique sans guillemets | C | Distribution:714,754 |

## ㉛ ecran_loi — r1 07/09 NON APPROUVÉ 1B/6M/11m (=18). 15 ouverts (A7 B1 C7), 1 fermé, 0 assumé, 2 non tranchés (m9, m10)
Fermé : m4 (« À VOS RISQUES » -> hudMoneyUnderlineGold #d9ab4e, 104cb379 09/09, Loi:344). Depuis le r1 le contrôleur n'a changé que par textes, clés, canvas, URL.
| id | écart | perçu comme | cl. | source |
| B1 | bande basse (filet, voix du lieutenant, bouton or) dans les 6 cadres / absente ; 729 px de fond nu | écran sans issue | A | r1 §3 ; Loi:574-626 |
| M1 | rampe typographique : titre +39 %, sous-titre +53 %, libellé +27 % | page en gros caractères | A | r1 §3 ; Loi:589,593,238,384,394 |
| M3 | plaques `.pris` verte et `.risque` ambre bordées / 3 cartes au même aplat | état lisible seulement sur l'étiquette | A | r1 §3 ; Loi:369 (état « pris » dépend du compte) |
| M4 | sérif sur le titre et les noms d'avocats / sans-sérif partout | perd son air de dossier | A | r1 §3 ; Loi:670 |
| M5 | fond dégradé bleu nuit / aplat surfaceBase | écran terne | A | r1 §3 ; Loi:562 |
| M6 | `EN PLACE` vert sauge #7fc99a / cyan #42e0c0 | point le plus vif, hors palette | A | r1 §3 ; Loi:634,338 ; DesignTokens:69 |
| m1 | plaque d'en-tête + filet / titre et accroche nus | pas de césure en haut | A | r1 §3 ; Loi:588-595 |
| m11 | « Vous n'avez encore engagé personne » suivi de « Commis d'office — EN PLACE » | lecture contradictoire | B | r1 §3 ; Loi:337,358 |
| M2 | gris secondaire #8d99a6 / #b8c2cc (x1,70) | hiérarchie aplatie | C | Loi:247,279,340,350,394 ; DesignTokens:61 |
| m2 | rayon 3 CSS / coins vifs | cartes anguleuses | C | Loi:369 |
| m3 | étiquettes encadrées / texte nu | pas de pastille | C | Loi:388-391 |
| m5 | petites capitales très espacées / characterSpacing 4 | libellés serrés | C | Loi:240,334,419 |
| m6 | libellé #7e8b98 et accroche #8d99a6 distincts / même jeton | pas plus discret | C | Loi:238,593 |
| m7 | aparté avec filet gauche et retrait / texte courant | note sans encadré | C | Loi:346-352,430-434 |
| m8 | écart entre plaques 5 / 6 CSS | espacement lâche | C | Loi:607 |
Non tranchés : m9 (losange doré sous le médaillon = chrome partagé, TopBar:1272-1277 le revendique comme canon HUD) ; m10 (ARGENT à 5 px du médaillon, flèche retirée 6dfee947 26/09, non remesuré).

## ㉝ ecran_demolition — r1 07/09 NON APPROUVÉ 1B/4M/5m (=10). 5 ouverts (A2 B1 C2), 1 fermé, 1 assumé, 3 non tranchés (m1, m2, m4)
Fermé : M3 (rangées identiques -> lieu + îlot, 7d2ebcde 22/09, Demolition:1062-1083). Assumé : M1 (liste « VOS N SITES » sans homologue : « la liste reste, la maquette est incomplète », addendum-routage-f2.md 07/09).
| id | écart | perçu comme | cl. | source |
| M2 | titre « L'organisation frotte » + verdict « Ça tient » (13 endroits se gênent) dans le même bloc | alarme et démenti | A | r1 §3 + addendum f2 M2(b) ; Demolition:452,1597 (seul le cas `light` réparé, 73b64d34 26/09) |
| M4 | CTA sur 1 ligne « site par site » / « VOIR CE QUI COÛTE LE PLUS » sur 2 lignes (+37 %) | gros bouton à 2 lignes | A (ou C) | r1 §3 ; Demolition:524-527,1316-1324 |
| B1 | liste « VOS N SITES » tranchée par le bas, aucun indice de défilement (ScrollRect présent depuis 56b9cee5, pas d'affordance) | carte coupée au ras du dock | B | r1 §3 ; Demolition:1185-1190 |
| m3 | tête 170 / 163 px | invisible à l'oeil | C | r1 §3 ; Demolition:116-120 |
| m5 | étiquette de fin de rangée en capitales encadrée / texte nu bas de casse | rangées plus plates | C | r1 §3 ; Demolition:602-606 |
Non tranchés : m1 (filet haut 2 px du bas : le code le pose Demolition:1219,1435, le rapport a mesuré 0 -> contradiction, recapture) ; m2 (bande ambre « Tout produit moins… » rendue si penalty_active, dépend du compte) ; m4 (gros nombre #9aa6b3 = jeton Neutre de la bande balanced, pas d'état calme dans la maquette).

## ㉞ carnet — r1 07/09 NON APPROUVÉ 1B/1M/4m (=6) mais ÉCRAN JAMAIS JUGÉ SUR SON CONTENU. 0 ouvert établi
La planche jugée (planche_signer_l_ordre_1080x2400.png) photographiait une fiche de LIEUTENANT, pas le carnet (mandat.md ; retirée le 07/09). r2 22/09 = dossier préparé sans capture. Les 6 findings portent sur le chrome partagé ou sur l'erreur de capture : B1 (capture fausse, planche retirée), M1 (aile ARGENT : flèche retour retirée 26/09, TopBar:320-322), m3 et m4 (manomètre, non opposables) = 4 écartés ; m1 et m2 (valeur d'argent, dépend des données) = 2 non tranchés. Aucun écart de contenu avéré parce que jamais mesuré. Indices code, NON comptés : Carnet:851-853 garde un commentaire « MÉTIER ICI » du gabarit ; un seul motif Contour/Filet/Cerne dans tout le contrôleur (pas de cerne ni de filet).

## ㉙ ecran_conflit — r5 23/09 APPROUVÉ 0B/0M/6m (+1 ASSUMÉ +1 ARBITRAGE). 3 ouverts (A1 B0 C2), 4 assumés, 1 non tranché
r1 07/09 22 findings (2B/12M/8m) ; r3 NON APPROUVÉ (5M/7m) ; r4 NON APPROUVÉ (3M/4m) ; r5 APPROUVÉ (6m). Tours aveugles : « fermé » par absence, pas par preuve ; les suspendus de r1 (B1, B2, M9, m6, m7, m8) n'ont pas été tranchés explicitement.
| id | écart | perçu comme | cl. | source |
| #1 | portrait de la fiche ivoire : silhouette pâle (contraste 15,6) / buste sombre (102,1) | médaillon sombre très présent (« principal écart perceptible ») | A | r5 §3 #1 ; Conflit:613-651 |
| #3 | encre du CTA à y=1976 / 1942 (-34 px) | zone de confirmation plus compacte | C | r5 §3 #3 ; Conflit:1093-1135 |
| #6 | « on ne les a pas croisés » / « on n'a jamais croisé leur route » + retour de ligne | historique plus dense (la maquette est peut-être en retard : table 40) | C | r5 §3 #6 ; Conflit:781 |
Assumés (4) : #7 chrome sans session (dossier r5) ; #8 précision cible/butin (arbitrage de données, dossier r5) ; #2 dock « EN TROP » (arbitrages 07/09 §14-15, assumé dès r3 #14) ; #5 locuteur gras retiré (arbitrage 5 du 23/09, f6546b6b 24/09). Non tranché : #4 largeur du titre -18 px (le titre a changé de texte depuis).
Changements postérieurs au r5, non rejugés : titre « Le prochain coup » / pastille « En cours » / bouton « L'envoyer » (2a70de1d 26/09, table 80 f2) ; ligne « Ce qu'on prend » supprimée et réplique sans orateur (f6546b6b 24/09, commande de l'orchestrateur) ; initiales des écussons lues du bundle (0cc52e52).

## Somme de contrôle
Ouverts par écran : c1 16 + b7 15 + c2 16 + délégation 9 + appro 21 + distribution 22 + loi 15 + démolition 5 + carnet 0 + conflit 3 = 122.
Par classe : A 8+8+4+0+9+9+7+2+0+1 = 48 ; B 1+0+1+1+1+1+1+1+0+0 = 7 ; C 7+7+11+8+11+12+7+2+0+2 = 67 ; 48+7+67 = 122.
Findings comptés : 163 = 122 ouverts + 23 fermés + 6 assumés + 12 non tranchés.
