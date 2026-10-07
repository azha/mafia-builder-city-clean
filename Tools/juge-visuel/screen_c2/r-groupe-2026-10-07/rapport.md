# Juge visuel ⊥ — ㊵ La filière (`FiliereScreenController`, dossier `screen_c2`) — tour « r-groupe » — 2026-10-07

Juge à contexte vierge : n'a construit ni jugé cet écran, n'a lu ni `Assets/Scripts`, ni les notes
d'implémentation, ni le rapport `r1-2026-09-06`.

**Barème appliqué** (ruling user du 2026-10-07, qui prime) : « les petits pixels de nuance, on ne
les traite pas, on fait le gros, mais il faut que ce soit fidèle ».
**A** = perçu nettement · **B** = forme visible mais secondaire · **C** = pixel ou nuance.

---

## Verdict : **NON APPROUVÉ**

C'est l'écran le plus proche de sa maquette des cinq jugés ce tour — le titre, le filet d'or, les
trois tuiles cyan, le geste doré, les plaques d'explication sont au bon endroit et à la bonne
couleur (1/255). Trois choses l'en écartent quand même : le **cadre d'or qui enferme tout le
panneau** (1 627 lignes sur 1 640 dans les trois cadres de référence) n'existe pas en jeu (0 ligne) ;
la **boîte de la chaîne** — 36,6 % de la hauteur dans la maquette, le cœur de l'écran — a disparu
avec son contenu ; et le **geste a quitté le bas de l'écran** (5ᵉ et dernier bloc dans la maquette,
3ᵉ sur 5 en jeu, avec deux plaques d'explication après lui).

### Images comparées

| rôle | fichier | taille |
|---|---|---|
| référence nominale (INDEX) | `screen_c2/reference-1080x2102.png` = **cadre 137** « La filière — où en est chaque étape » (identité **mesurée** : 0,904 contre 6,3 → 15,7) | 1080×2102 |
| référence d'ÉTAT | **cadre 140** « Vous n'avez pas encore de filière » — homologue exact du compte neuf | 1080×2102 |
| second témoin d'état | **cadre 141** « Aucune filière montée » | 1080×2102 |
| capture | `E10_Filire_1080x2400.png`, `_1080x1920`, `_bas_1080x2400`, `_bas_1080x1920` | 1080×2400 / 1080×1920 |

**Échelle** : 300 px CSS → 1080 px (×3,6) ; capture 1080 px. **Facteur 1,000 en X.**

**Témoin d'état** : compte neuf, aucun nœud. Le cadre 140 est l'homologue exact, et il montre que la
maquette **a prévu cet état** : elle garde la boîte de chaîne et y centre une phrase en italique.
C'est pourquoi A2 est comparable et classé.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Sortie collée : `sortie.txt`.

| # | grandeur | référence | jeu | verdict |
|---|---|---|---|---|
| 1 | largeur d'écran | 1080 | 1080 | facteur **1,000** |
| 2 | or du titre « La filière » | `(242, 201, 107)` | `(242, 201, 106)` | **1/255** |
| 3 | plaque de titre + sous-titre espacé + **filet d'or** dessous | présents | présents | même composition |
| 4 | trois tuiles de compteur côte à côte | présentes | présentes | même rang |
| 5 | cyan des valeurs « 00 » | `(127, 212, 217)` | `(127, 212, 217)` | **identique** |
| 6 | ordre des tuiles | ÉTAPES · propres · ÉCARTS | ÉTAPES · propre au bout · ÉCARTS | même ordre |
| 7 | or du libellé du geste | `(242, 201, 107)` | `(242, 201, 106)` | **1/255** |
| 8 | le geste est un **cadre à filet doré** à libellé capitales espacées | oui | oui | même matière |
| 9 | plaque d'explication (sur-titre gris espacé + titre sérif + corps) | présente | présente (×2) | même forme |
| 10 | contraste titre / fond | 11,92:1 | 11,44:1 | même ordre |
| 11 | tous les contrastes de texte | — | 5,99 → 13,72:1 | **aucun défaut de lisibilité** |
| 12 | langue | la ref 137 porte de l'ANGLAIS (« node · dirty », « node · partial ») | aucune chaîne anglaise | **le client fait mieux** |
| 13 | ascenseur quand ça déborde | — | présent à 1920 (595 px), absent à 2400 | conforme à `LISEZMOI` cause 7 |

**Contrôle du détecteur de filet** : il rend **1 627 / 1 640** lignes sur les trois cadres de
référence (137, 140, 141 — trois images différentes, même valeur, donc il mesure bien un montant
continu) et **0** sur les deux captures ; il rend 0 sur une colonne de fond nu.

---

## 0. L'écran, tel que la maquette le dit

**But** : voir où en est chaque maillon du blanchiment, et injecter.
**Ordre de lecture** : ① la **plaque de titre** « La filière » en lettres dorées très espacées, son
sous-titre et son filet d'or ; ② les **trois tuiles** de compteurs cyan ; ③ la **boîte de la
chaîne** — le gros objet du milieu, où les maillons se succèdent reliés par un trait, chacun avec sa
barre de couleur et son état (SALE → À MOITIÉ → PRESQUE PROPRE → PROPRE) ; ④ la plaque
d'explication ; ⑤ **le geste, en bas, dernier**, avec son indice sous lui.
Le tout est **enfermé dans un cadre d'or** qui fait du panneau un objet posé sur la scène.
**Traits d'identité** : (a) le cerne d'or du panneau ; (b) la **chaîne verticale de maillons** —
c'est le seul écran qui dessine une progression ; (c) les tuiles cyan, seule tache froide du
corpus ; (d) le geste en pied d'écran, après l'explication.

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Presque. La matière est la bonne : même or, même cyan, même filet sous le titre, même geste bordé,
mêmes plaques. Un joueur reconnaît l'écran immédiatement, et les contrastes sont confortables
partout. Le client fait même mieux que la maquette sur la langue : les « node · dirty » anglais du
cadre 137 ont disparu.

Trois écarts se voient quand même sans côte à côte. **(1)** Le **cerne d'or** du panneau n'existe
pas : la maquette pose un filet continu sur les quatre côtés (1 627 lignes sur 1 640 mesurées, dans
les trois cadres), le jeu n'en a aucune — les blocs flottent au lieu d'être tenus dans un cadre.
**(2)** La **boîte de la chaîne**, qui occupe 36,6 % de la hauteur de la maquette même à l'état vide
(où elle accueille une phrase italique centrée), n'est pas dessinée : son message devient une plaque
ordinaire de 72 px (3,0 %), texte à gauche. Rien, à l'écran, ne montre **où** la filière va se
construire. **(3)** Le **geste a changé de rang** : « INJECTER » est le dernier bloc de la maquette
(92,7 % et 92,9 % de la hauteur) ; « BLANCHIR » est le 3ᵉ bloc sur 5 en jeu, suivi de deux plaques
d'explication — et le bas de l'écran n'est plus une action mais une note.

Il reste 22,0 % de vide à 2400 (3,1 % à 1920). Le décor peint est absent : écart ASSUMÉ du lot
décor, noté, non classé.

---

## 3. Écarts

| # | partie | classe | réf | jeu | delta / mesure | script |
|---|---|---|---|---|---|---|
| **A1** | cerne d'or du panneau | **A** (élément absent) | filet d'or continu, montant gauche à x 21..23 (gris 142 contre 15-25 pour le fond) ; **1 627 lignes sur 1 640** le portent — identique sur les cadres 137, 140 **et** 141 | **0 ligne** aux deux résolutions | −100 % ; le panneau cesse d'être un objet encadré | `m_filiere.py` |
| **A2** | boîte de la chaîne | **A** (élément absent) | boîte bordée y 785..1555, **h 770 px = 36,6 %** de l'écran ; vide, elle porte une phrase **italique centrée** ; pleine, elle porte les 4 maillons reliés | aucune boîte ; le message est une plaque ordinaire y 648..720, **h 72 px = 3,0 %**, texte à gauche non italique | **−698 px, ×10,7** de réduction ; le cœur de l'écran n'a plus de contenant | `m_filiere.py` |
| **A3** | rang du geste | **A** (ordre de lecture) | « INJECTER » = **5ᵉ et dernier** bloc, filet à y 1952..1954 (cadre 140) et boîte y 1902..1995 (cadre 137) → **92,7 % / 92,9 %** de la hauteur | « BLANCHIR » = **3ᵉ bloc sur 5**, boîte y 885..979 → **38,8 %** (2400) / **48,5 %** (1920), **suivi de deux plaques** | le geste quitte le pied d'écran ; la dernière chose lue devient une note | `m_filiere.py` |
| **B1** | libellé de la tuile du milieu | **B** | « PROPRES » (cadres 137, 140, 141) | « PROPRE AU BOUT » | libellé plus long, change le rythme des trois tuiles | `m_filiere.py` |
| **B2** | occupation de l'écran | **B** | plus longue bande sans encre : **17 px (0,8 %)** | **528 px (22,0 %)** à 2400 · **60 px (3,1 %)** à 1920 | conséquence d'A2 et du décor assumé ; **propre au 2400** | `m_filiere.py` |
| C1 | nom du geste | C | « INJECTER » | « BLANCHIR » | changement voulu — `LISEZMOI` cause 3 l'exige (« ㊵ BLANCHIR en `.cta6` ») : **conforme**, noté pour mémoire | — |
| C2 | indice sous le geste | C | « depuis votre comptoir, vers une planque à vous », **centré** | « l'argent passe de la planque à la filière », **à gauche** | même rôle | lu sur les images |
| C3 | ascenseur | C | absent (la maquette est une image fixe) | 5 px de large, x 1024..1028, beige `(129, 122, 102)`, 595 px à 1920 ; absent à 2400 | **attendu** (`LISEZMOI` cause 7) ; tracé 16 px à l'intérieur du bord des plaques, ne masque aucun texte | `m_filiere.py` |
| C4 | nombre de plaques d'explication | C | une (« ET C'EST VOULU » / « PAR OÙ ÇA COMMENCE ») | deux (« MAILLON MANQUANT », « CE QUE LA FILIÈRE NE DIT PAS ») | enrichissement cohérent | lu sur les images |
| — | décor de scène | **ASSUMÉ** (lot en cours, non classé) | art peint derrière le haut d'écran | aplat | rendu proprement, chrome lisible | — |

---

## 5. Autres résolutions

- **1080×2400** (haute et `_bas` **identiques au bit près** : diff moyenne 0,000 — le contenu tient,
  et l'ascenseur est absent, cohérent) : rien de coupé, rien hors cadre. Vide 22,0 %.
- **1080×1920** (haute et `_bas` **différentes** : diff moyenne 3,781, 3,42 % de px > 8) : le contenu
  déborde, l'ascenseur apparaît, la planche `_bas` montre bien la fin de la colonne. Rien de coupé.
  Vide 3,1 %. *(`mesures/m_planches_bas.py`, sortie `sortie-planches-bas.txt` — le même instrument
  rend 0,000 sur ㉝ et 9,26 % sur ㉓ : il discrimine.)*
- **A1, A2 et A3 valent aux deux résolutions.** B2 est propre au 2400.

## 6. Ce que je n'ai pas pu vérifier

1. **L'état nominal** (une filière montée, 4 maillons, leurs barres de couleur et leurs états) — le
   compte est neuf. C'est le cas où A2 pèse le plus : je ne sais pas si le client dessine la boîte
   quand il y a des maillons. *Mesure qui trancherait* : une capture avec ≥ 1 nœud injecté.
2. **Le geste reste-t-il au 3ᵉ rang quand la chaîne est pleine ?** Même mesure.
3. **La famille de police** : pas de `fc-match` dans le dossier (`dossier.md` = gabarit non rempli).
   Les encres étant identiques au bit près, rien ne suggère une substitution.
4. **Le `dossier.md` de `screen_c2` est un gabarit non rempli** (chevrons, pas d'échelle, pas de
   `fc-match`, table des écarts assumés vide, et il désigne des captures
   `screen_c2_1080x1920.png` qui ne sont pas celles de ce tour). L'échelle a été reconstruite par la
   mesure ; la table des ASSUMÉS vient de la consigne de l'orchestrateur, pas d'un `juge-donnees`.
5. **Le geste et son retour** (appui, résultat de l'injection) — une planche fige un instant.

## Annexes

- `mesures/outils.py` — boîte à outils.
- `mesures/m_identite_references.py` + `sortie-identite.txt` — quel cadre est chaque PNG de
  référence commité, **re-mesuré**.
- `mesures/m_filiere.py` + `sortie.txt` — contrôle positif, A1 à A3, B1, B2, ascenseur, contrastes.
  ⚠️ Deux fenêtres d'échantillonnage de couleur ont d'abord rendu le **fond** au lieu de l'encre
  (contraste absurde de 1,43:1 sur un titre doré parfaitement lisible) : elles étaient posées
  60 px trop haut. Corrigées et re-mesurées ; c'est le contrôle positif « or = `(242, 201, 10x)` des
  deux côtés » qui a signalé l'anomalie.
