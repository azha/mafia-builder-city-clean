# Écarts de design ouverts — rapport brut de l'agrégateur G3-ecrans-28-a-38 (07/10/2026, arbre 3d295d18)

# Écarts de design ouverts — périmètre G3 (arbre `mafia-unity-anim` @ `3d295d18`, 07/10/2026)

Le tableau complet des 122 écarts ouverts est dans `/tmp/claude-1000/-home-erutheone-project-mafia-unity-anim/aa3de41b-8440-4c79-b347-8cef82ef2024/scratchpad/ecarts-G3.md`. Chaque ligne y porte `écran | écart | perçu comme | classe | source`. Ci-dessous : les comptes, les écarts A et B, et les causes communes.

**Limite de la méthode.** Je n'ai refait aucune planche ni aucune mesure en pixels. « Ouvert » veut dire : le finding du rapport est encore vrai dans le contrôleur actuel (code:ligne cité dans le fichier). Aucun écran n'a de `dossier.md` racine rempli, ce sont des gabarits : aucun écart n'est assumé par un dossier racine. Les « assumés » viennent des tables ASSUMÉ ou ARBITRAGE des rapports, de `ARBITRAGES-user-2026-09-07.md`, des addenda f2 et des `dossier.md` de tour (r5 de ㉙).

Presque tous les rapports datent des 06-07/09 et le dernier tour d'un écran n'a que 2 semaines de recul au plus. Les dossiers `r2-2026-09-22` sont des dossiers préparés pour recapturer les constats suspendus, sans captures ni rapport. Seul ㉙ a eu des tours après r1 (r3, r4, r5).

## 1. Écarts ouverts de classe A et B (55 sur 122)

Les 67 écarts de classe C (px, interlettrage, nuances, hauteurs) sont dans le fichier.

**㊳ journal (A8 B1)**
- A : B3 (la une n'existe plus, 5 rangées identiques).
- A : B4 (pas de pied ni de CTA « Y PRÊTER ATTENTION », aucun geste).
- A : M1 (cerne laiton absent).
- A : M3 (filets laiton de la manchette absents).
- A : M4 (puits de liste absent).
- A : M6 (fond en aplat #0d0f10).
- A : M10 (puce, horodatage à droite et étiquette d'angle absents).
- A : M11 (décor de ville absent).
- B : B2 (liste coupée au pixel, sans défilement : `Journal:675`).
- Sources : rapport r1 07/09 §3, `JournalScreenController.cs`.

**㊴ dossier (A8 B0)**
- F1 : un filet plein à la place des 12 crans.
- F2 : les 3 compteurs de tête manquent.
- F3 : titre « Ce qui se voit » au lieu de « Le dossier ».
- F4 : rangées empilées au lieu de 3 pistes côte à côte.
- F7 : panneaux sans filet.
- F8 : aucun or de structure (cerne, filet, encadré du CTA).
- F10 : deux titres or qui se disputent le regard.
- F14 : écran terne et vide.
- Source : r1 06/09 §3.

**㊵ filière (A4 B1)**
- A : F2 (barre horizontale au lieu de la cuve verticale).
- A : F3 (aucun bouton INJECTER à l'état nominal).
- A : F5 (cerne doré absent).
- A : F8 (fond en aplat).
- B : F4 (compteurs 00/00/00 qui contredisent le texte d'erreur).
- Source : r1 06/09 §3.

**㉜ délégation (A0 B1)**
- m9 : une rangée de navigation « ce qui n'est pas encore à confier » absente des cadres 73-77. Elle est « ASSUMÉ » dans le commentaire du développeur, pas par décision f2 (arbitrage A4 non ratifié).

**㉚ appro (A9 B1)**
- A : M3 (vide de 33 % sous le CTA).
- A : M4 (aplat or plein au lieu d'un CTA sombre cerné d'or).
- A : M6 (tout en sans-sérif).
- A : M7 (type ×1,44).
- A : M8 (le bon n'a plus de bord perforé).
- A : M10 (libellés à 1,55:1).
- A : M11 (rouge criard #ff5a4d).
- A : M12 (fond noir au lieu du sépia).
- A : m9 (titron « LA CHAÎNE, EN REMONTANT » en trop).
- B : M5 (« ça part du compte tout de suite » absent).
- Source : r1 07/09 §3.

**㉘ distribution (A9 B1)**
- A : B1 (liège en aplat).
- A : B2 (2 bandes empilées au lieu de la carte punaisée).
- A : M1 (nappe noire unique).
- A : M2 (pavé or plein au lieu d'un bouton sombre).
- A : M3 (en-tête +44 %). Classe A ou C selon le critère, voir en bas.
- A : M4 (médaillon carré uni).
- A : M5 (section « VOS COURRIERS » absente de la maquette ; f2 la juge incomplète).
- A : M6 (turquoise #43e0c0 au lieu du vert sauge).
- A : m11 (« courriers » au lieu de « coursier »).
- B : m12 (légende d'un envoi alors que l'état est « livré »).
- Source : r1 07/09 §3.

**㉛ loi (A7 B1)**
- A : B1 (bande basse absente, 729 px de fond nu).
- A : M1 (titres de +39 % à +53 %).
- A : M3 (3 cartes au même aplat).
- A : M4 (sans-sérif partout).
- A : M5 (fond en aplat).
- A : M6 (cyan #43e0c0 pour « EN PLACE »).
- A : m1 (en-tête nu).
- B : m11 (« Vous n'avez encore engagé personne » suivi de « Commis d'office — EN PLACE »).
- Source : r1 07/09 §3.

**㉝ démolition (A2 B1)**
- A : M2 (« L'organisation frotte » et « Ça tient » dans le même bloc ; seul l'état `light` est réparé, `73b64d34`).
- A : M4 (CTA sur 2 lignes, +37 %). Classe A ou C.
- B : B1 (liste coupée sans indice de défilement ; le ScrollRect existe).
- Source : r1 07/09 §3.

**㉞ carnet** : 0 ouvert établi (voir §2).

**㉙ conflit (A1 B0)**
- #1 : portrait sombre sur la fiche ivoire, que r5 désigne comme « principal écart perceptible ».
- Source : r5 23/09 §3.

## 2. État par écran (comptes faits un par un)

Chaque ligne se lit : findings du dernier tour = ouverts + fermés + assumés + non tranchés.

| Écran | Dernier tour et verdict | Annoncé B/M/m | Compte |
|---|---|---|---|
| ㊳ journal | r1 07/09, NON APPROUVÉ | 4/12/4 = 20 | 20 = **16** + 4 + 0 + 0 |
| ㊴ dossier | r1 06/09, NON APPROUVÉ | 3/11/5 = 19 | 19 = **15** + 4 + 0 + 0 |
| ㊵ filière | r1 06/09, NON APPROUVÉ | 4/11/9 = 24 | 24 = **16** + 7 + 0 + 1 |
| ㉜ délégation | r1 07/09, NON APPROUVÉ | 0/1/9 = 10 | 10 = **9** + 0 + 0 + 1 |
| ㉚ appro | r1 07/09, NON APPROUVÉ | 1/13/12 = 26 | 26 = **21** + 2 + 1 + 2 |
| ㉘ distribution | r1 07/09, NON APPROUVÉ | 2/6/14 = 22 | 22 = **22** + 0 + 0 + 0 |
| ㉛ loi | r1 07/09, NON APPROUVÉ | 1/6/11 = 18 | 18 = **15** + 1 + 0 + 2 |
| ㉝ démolition | r1 07/09, NON APPROUVÉ | 1/4/5 = 10 | 10 = **5** + 1 + 1 + 3 |
| ㉞ carnet | r1 07/09, NON APPROUVÉ | 1/1/4 = 6 | 6 = **0** + 4 + 0 + 2 |
| ㉙ conflit | r5 23/09, **APPROUVÉ** | 0/0/6 (+1 assumé, +1 arbitrage) = 8 lignes | 8 = **3** + 0 + 4 + 1 |

Détail des fermés (23), avec la preuve :
- **㊳ journal (4)**
  - B1 : clés brutes en titre, `201a2563` et `065414bf`.
  - M5 : jeton d'or, `104cb379`.
  - M12 : nom du quartier et fraîcheur en mots, `201a2563` et `4f4c1403`.
  - m4 : panneau « ce que le serveur envoie ».
- **㊴ dossier (4)**
  - F5 : `7a29020a`.
  - F6 : `d665720d`.
  - F13 : `fcfa7446`.
  - F15 : le losange est du chrome du shell, hors écran.
- **㊵ filière (7)**
  - F6 et F7 : `d1030a15`.
  - F10, F11, F13 (`79467979`), F14 (`79467979`).
  - F24 : `d1030a15`.
- **㉚ appro (2)**
  - B1 : `b2226fe0`.
  - m12 : `6dfee947`.
- **㉛ loi (1)** : m4, `104cb379`.
- **㉝ démolition (1)** : M3, `7d2ebcde`.
- **㉞ carnet (4)** : écartés plutôt que corrigés.
  - B1 : la planche jugée montrait une fiche de lieutenant, elle a été retirée.
  - M1 : la flèche retour est retirée du bandeau.
  - m3 et m4 : manomètre, non opposables.

Assumés (6) :
- ㉚ appro : m11 (heure absente de l'aile droite, ratifié f2 le 07/09).
- ㉝ démolition : M1 (« la liste reste, la maquette est incomplète », addendum f2).
- ㉙ conflit (4) : #7 et #8 dans le dossier r5, #2 (dock) par les arbitrages du 07/09, #5 (orateur gras retiré) par `f6546b6b`.

Non tranchés (12, non comptés dans les ouverts) : ils dépendent des données, d'un chrome non remesuré, ou d'une contradiction rapport/code qu'une recapture tranchera.
- ㊵ filière : F23.
- ㉜ délégation : M1.
- ㉚ appro : M1, m10.
- ㉛ loi : m9, m10.
- ㉝ démolition : m1, m2, m4.
- ㉞ carnet : m1, m2.
- ㉙ conflit : #4.

**㉞ carnet n'a aucun tour utilisable sur son contenu.** Le seul rapport a jugé une capture qui n'était pas le carnet. Le r2 est un dossier sans capture. Sans mesure, je n'invente rien : le carnet est « non jugé », pas conforme. Deux indices lus dans le code, non comptés : un commentaire « MÉTIER ICI » du gabarit reste en `Carnet:851-853`, et le contrôleur ne contient qu'un seul motif Contour/Filet/Cerne.

## 3. Animation et mouvement croisés

Aucun écart d'animation inventorié sur les 10 écrans.
- La référence de ㊳ porte un trait de balayage teal figé (arbitrage A1 du rapport), et celle de ㊵ un balayage `.elast::after` figé. Ce sont des dispositifs de capture, pas des écarts d'écran.
- Aucun contrôleur ne contient d'animation ; les `ScrollRect` de ㉜ et ㉝ sont de l'interaction, pas du mouvement.

## 4. Somme de contrôle

- **Par écran :** 16 + 15 + 16 + 9 + 21 + 22 + 15 + 5 + 0 + 3 = **122 ouverts**.
- **Par classe :** A 48 (8+8+4+0+9+9+7+2+0+1), B 7 (1+0+1+1+1+1+1+1+0+0), C 67 (7+7+11+8+11+12+7+2+0+2). 48 + 7 + 67 = **122**.
- **Findings comptés :** 163 = 122 ouverts + 23 fermés + 6 assumés + 12 non tranchés.

**Classements discutables.** M3 de ㉘ et M4 de ㉝ sont classés A (en-tête enflé, bouton sur 2 lignes) alors que ce sont des grandeurs. En C, A passerait de 48 à 46 et C de 67 à 69.

## Causes communes entre écrans

À traiter en lots plutôt qu'écran par écran :
1. **Fond en aplat `surfaceBase` #0d0f10 au lieu du dégradé et du décor de la maquette.** Visible sur ㊳, ㊴, ㊵, ㉛, ㉚, ㉘. L'arbitrage 1 du 07/09 (lot d'assets « scène », option a) est ratifié en bloc par f2 et n'est livré sur aucun de ces écrans.
2. **Cerne, filets laiton et bordures `#2a3648` absents, plaques sans bord ni relief.** ㊳, ㊴, ㊵, ㉛, ㉜, ㉚.
3. **Pied ou CTA absent ou de forme différente.** ㊳ (B4), ㊵ (F3), ㉛ (B1), ㉚ et ㉘ (aplat or plein au lieu d'un bouton sombre cerné d'or).
4. **Sérif absent** (`primaryFont` seul). ㉚ (M6), ㉛ (M4).
5. **Corps de texte trop grands** (+11 % à +60 %), signature d'un plancher de taille. ㊳, ㊴, ㊵, ㉚, ㉘, ㉛.
6. **Turquoise `accentSuccess` #43e0c0 à la place du vert sauge #7fc99a.** ㉛ (M6), ㉘ (M6).
7. **Liste coupée sans défilement ou sans indice.** ㊳ (B2), ㉝ (B1).
