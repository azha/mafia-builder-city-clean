# Juge visuel ⊥ — ⑮ Les inspections (`InspectionScreenController`, dossier `police`) — tour « r-groupe » — 2026-10-07

Juge à contexte vierge : n'a construit ni jugé cet écran, n'a lu ni `Assets/Scripts`, ni les notes
d'implémentation, ni les rapports `r1-⑮-2026-09-07` / `r2-⑮-2026-09-22`, ni `constats-a-rejuger-⑮.md`.
**Ce rapport ne porte que sur ⑮** (le dossier `police` héberge aussi ⑰, non jugé ici).

**Barème appliqué** (ruling user du 2026-10-07, qui prime) : « les petits pixels de nuance, on ne
les traite pas, on fait le gros, mais il faut que ce soit fidèle ».
**A** = perçu nettement · **B** = forme visible mais secondaire · **C** = pixel ou nuance.

---

## ⛔ Vérification du CADRE de référence — faite par moi, pas lue dans une table

La consigne signale que ⑮ et ⑰ ont déjà été jugés **contre le cadre de l'autre** (31 ↔ 32). J'ai
donc re-vérifié par deux chemins indépendants :

1. **Par la mesure** (`mesures/m_identite_references.py`, sortie dans `sortie-identite.txt`) :
   `police/reference-⑮-1080x2102.png` est le **cadre 32** — diff moyenne **0,165**, contre 72,903
   (cadre 31), 85,764 (33), 83,475 (34), 99,792 (35). Et `reference-⑰` est bien le cadre 31 (0,166).
2. **Par le contenu**, qui est le contrôle qui décide : le cadre **32** porte « BPD · REGISTRE DE
   DISPATCH », les colonnes `DISTRICT / N / CHARGE / REGIME / ORIGINES` et **18 districts** ; le
   cadre **31** porte « CE QU'ILS SAVENT », **6 PRÉCINCTS** et leurs patrouilles. ⑮ est la file
   d'inspections (dispatch) ⇒ cadre 32 ; ⑰ est le commissariat (précinct) ⇒ cadre 31.
   **La capture le confirme d'elle-même** : elle écrit « 18 districts », pas « six commissariats ».

⇒ **Le cadre 32 est le bon témoin de ⑮, et le PNG commité est à jour.** La comparaison ci-dessous
est faite contre lui (et contre le cadre 33 pour le geste « déposer un signalement »).

---

## Verdict : **NON APPROUVÉ**

Le **registre de dispatch — qui est l'écran** — n'existe pas en jeu. La référence est un listing sur
papier à bandes couvrant **92,27 %** de la surface sous le chrome ; la capture en a **0,04 %**, et
n'affiche **aucune** des 18 lignes de district qu'elle annonce pourtant par écrit. À la place :
une **illustration photographique** de 431 × 378 px qu'aucun des cinq cadres police n'emploie, et un
geste rendu en **aplat plein à angles droits** là où tout le reste du lot est un filet doré.

### Images comparées

| rôle | fichier | taille |
|---|---|---|
| référence (nominale ET d'état) | `ecrans-brennar-6.html` **cadre 32** « La police — le registre de dispatch » = `police/reference-⑮-1080x2102.png` (re-rendu, atelier `d84c6eb`, ×3,6) | 1080×2102 |
| référence du geste | **cadre 33** « La police — déposer un signalement » | 1080×2102 |
| témoin d'exclusion | **cadre 31** (c'est ⑰, pas ⑮) | 1080×2102 |
| capture | `E09_Inspections_1080x2400.png`, `_1080x1920` (pas de planche `_bas` : rien ne déborde) | 1080×2400 / 1080×1920 |

**Échelle** : 300 px CSS → 1080 px (×3,6) ; capture 1080 px. **Facteur 1,000 en X.**

**Témoin d'état** : le compte est NEUF et, comme le dit le `LISEZMOI.md`, **aucun cadre d'état vide
n'existe pour ⑮**. Mais le registre du cadre 32 **est déjà un état presque vide** : **10** de ses 18
districts y sont à `0 VIDE NOMINAL —` et 8 seulement portent une charge (comptés sur la source du
cadre : 10 × « 0 VIDE », 8 × « LEGERE »). Un compte neuf se rendrait donc comme **18 lignes à zéro**,
pas comme une absence de table. C'est pourquoi A1 est comparable et classé.

**Mots « — » (TD-846)** : la consigne dit que les colonnes Charge/Régime doivent afficher « — » et
que ce n'est pas un défaut. **Je ne peux pas le vérifier** : ces colonnes n'existent pas à l'écran.
Rien n'est donc classé sur ce point — c'est A1 qui l'absorbe.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Sortie collée : `sortie.txt`.

| # | grandeur | référence | jeu | verdict |
|---|---|---|---|---|
| 1 | largeur d'écran | 1080 | 1080 | facteur **1,000** |
| 2 | nombre de districts annoncé | « 18 DISTRICTS » (pied du cadre 32) | « 18 districts » (sous le titre) | **identique** |
| 3 | « DÉPOSER UN SIGNALEMENT » | présent (cadre 33) | présent | **identique** |
| 4 | ligne « SUR » | « un bâtiment de La Lisière » | « Atelier Vesk — La Lisière » | même rôle, plus précis en jeu |
| 5 | ligne « EFFET » | « une entrée de plus dans leur file » | idem | **identique au mot près** |
| 6 | avertissement | « ⚠ au bout de plusieurs, la police se retourne » | idem | **identique au mot près** |
| 7 | nom du geste | « DÉPOSER » | « DÉPOSER » | **identique** |
| 8 | or du titre d'écran | famille `(217, 171, 78)` du corpus | `(217, 171, 77)` | **1/255** |
| 9 | contraste titre / fond | — | 9,15:1 | ≥ plancher |
| 10 | tous les contrastes de texte | — | 5,23 → 9,15:1 | **aucun défaut de lisibilité** |
| 11 | langue | français | français, aucun enum brut | conforme |

**Contrôle du détecteur de papier** : il rend **92,27 %** (cadre 32), **52,24 %** (cadre 31) et
**31,20 %** (cadre 33) — **trois valeurs distinctes** sur trois images. Il mesure donc bien une
surface de papier et non une constante. Sur la capture : **0,04 %**.

---

## 0. L'écran, tel que la maquette le dit

**But** : voir où la police ouvre ses files, district par district, et décider d'y jeter un os.
**Ordre de lecture** : ① le **listing** lui-même — on tombe dessus avant tout, parce qu'il est clair
sur un écran sombre et qu'il occupe tout ; ② son en-tête `BPD · REGISTRE DE DISPATCH · 12H · JOUR 26` ;
③ la ligne de colonnes `DISTRICT / N / CHARGE / REGIME / ORIGINES` ; ④ les 18 lignes, zébrées une sur
deux en vert pâle, les districts chargés sautant aux yeux par leur `N` ; ⑤ le pied « 18 DISTRICTS ·
TOUT OU RIEN ». Le geste (cadre 33) est une **fiche de papier punaisée sur du liège**.
**Traits d'identité** : (a) **le papier** — c'est le seul écran du corpus qui inverse la valeur, clair
sur sombre ; (b) les **perforations** latérales du listing continu ; (c) le **monospace capitales**,
qui dit « sorti d'une imprimante de 1950 » ; (d) le **zébrage vert pâle** ; (e) la fiche punaisée du
geste.

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non, et c'est l'écart le plus large des cinq écrans jugés ce tour. La maquette donne à lire un
**document** ; le jeu donne à lire un **écran sombre de plus**, strictement dans le gabarit des neuf
autres : titre doré centré, sous-titre gris, quelques lignes, un bouton, du vide. Les cinq traits
d'identité de ⑮ — le papier, les perforations, le monospace, le zébrage, la fiche punaisée — sont
absents sans exception ; la médiane au centre du contenu passe de `(233, 230, 216)` à `(13, 13, 13)`.

Et le registre lui-même n'est pas seulement *restylé*, il est **absent** : l'écran annonce
« 18 districts » et n'en montre aucun. L'information qui justifie l'écran (où la police ouvre ses
files) n'est nulle part — alors même que la maquette la rend déjà dans un état presque vide (10 des
18 lignes y sont à zéro).

Deux objets occupent la place laissée libre, et aucun n'a d'homologue : une **illustration
photographique** (431 × 378 px, palette ocre/bleu-vert) dans un corpus entièrement en aplats
imprimés ; et une **barre pleine olive** de 1010 × 79 px, à angles droits et sans filet, pour un
geste que le reste du lot dessine en cadre doré (témoin mesuré sur ㉝ : 7 px allumés sur 151 lignes
de la colonne centrale — un filet, pas un aplat).

Il reste 34,5 % de hauteur vide à 2400 (18,1 % à 1920). Le décor peint absent est l'écart ASSUMÉ ;
il n'explique ni le registre manquant, ni l'illustration, ni la barre.

---

## 3. Écarts

| # | partie | classe | réf | jeu | delta / mesure | script |
|---|---|---|---|---|---|---|
| **A1** | le registre de dispatch (le listing) | **A** (élément absent + matière) | listing papier : **92,27 %** de px crème sous le chrome ; médiane au centre `(233, 230, 216)` ; en-tête BPD, 5 colonnes, **18 lignes de district**, zébrage, perforations, pied de page | **0,04 %** de px crème ; médiane `(13, 13, 13)` ; **0 ligne de district**, aucune colonne, aucun en-tête de table | rapport **2 300:1** sur la surface de papier ; 18 → 0 lignes | `m_inspections.py` |
| **A2** | illustration photographique | **A** (élément en trop + matière) | aucune illustration dans les cadres 31 à 35 (inventaire visuel des 5) | image raster x 324..755, y 920..1298 = **431 × 378 px**, 39,9 % de la largeur ; palette photographique (ocre `(187,134,69)`, `(234,187,100)`, bleu-vert `(40,48,50)`) | objet neuf, dans un registre de matière que le corpus n'emploie pas | `m_inspections.py` |
| **A3** | le geste « DÉPOSER » | **A** (matière / geste) | fiche de **papier crème** `(227, 214, 184)` punaisée sur **liège** `(106, 79, 40)`, bouton en **double filet rouge** | **aplat olive plein** `(74, 57, 26)`, x 35..1044, y 600..678, **pleine largeur dès la 1ʳᵉ ligne ⇒ rayon d'arrondi 0**, aucun filet | seul geste du lot en aplat ; témoin ㉝ : 7 px allumés sur 151 lignes de colonne ⇒ filet | `m_inspections.py` |
| **B1** | occupation de l'écran | **B** | plus longue bande sans encre : **17 px (0,8 %)** | **827 px (34,5 %)** à 2400 · **347 px (18,1 %)** à 1920 | conséquence d'A1 | `m_inspections.py` |
| C1 | position du geste | C | le formulaire de dépôt est un **état séparé** (cadre 33), posé par-dessus | le formulaire est **inline**, au-dessus de l'état vide | réorganisation ; l'ordre de lecture reste cohérent | lu sur les images |
| C2 | le prix du signalement | C | « PRIX · 50 — annoncé par le serveur, rien n'est débité aujourd'hui » | absent | à confronter au back (`juge-donnees`), pas jugeable depuis l'image | — |
| — | décor de scène | **ASSUMÉ** (lot en cours, non classé) | art peint sous le chrome | aplat | rendu proprement, chrome lisible | — |

---

## 5. Autres résolutions

- **1080×2400** : rien de coupé, rien hors cadre ; vide 34,5 %.
- **1080×1920** : inventaire identique, mêmes bbox en X, mêmes comptes (papier 0,05 %) ; vide 18,1 %.
  **Aucun écart propre à une résolution** : A1, A2 et A3 valent aux deux.
- Pas de planche `_bas` — correct, rien ne déborde (c'est bien le problème : il n'y a rien à faire
  défiler).

## 6. Ce que je n'ai pas pu vérifier

1. **Le registre existe-t-il dans un autre état ?** Je mesure son absence sur un compte neuf. Si le
   client ne dessine la table qu'à partir d'une inspection en cours, A1 deviendrait « état vide non
   dessiné » plutôt que « registre jamais dessiné ». *Mesure qui trancherait* : une capture sur un
   compte avec au moins une inspection ouverte.
2. **Les colonnes CHARGE / RÉGIME et leur « — » (TD-846)** : non vérifiables, elles ne sont pas à
   l'écran.
3. **D'où vient l'illustration photographique** (banque d'art du projet ? repli ?) — hors de l'image.
   *Mesure qui trancherait* : l'inventaire des PNG montés du client.
4. **Les états cadre 34 (retour de bâton) et 35 (lots back)** — non capturés.
5. **La famille de police** : pas de `fc-match` dans le dossier (`mandat-⑮.md` non renseigné sur ce
   point). Le listing de la référence est en **monospace** ; la capture n'a aucun texte monospace, mais
   comme la table entière manque, la question ne se pose pas encore.
6. **Le `dossier.md` de `police` n'existe pas** (seuls `mandat-⑮.md` / `mandat-⑰.md`) : pas d'échelle
   fournie, pas de table d'écarts assumés. L'échelle a été reconstruite par la mesure.

## Annexes

- `mesures/outils.py` — boîte à outils.
- `mesures/m_identite_references.py` + `sortie-identite.txt` — **la vérification du cadre 31 ↔ 32**,
  re-mesurée et doublée par un contrôle de contenu.
- `mesures/m_inspections.py` + `sortie.txt` — contrôle positif, A1 à A3, B1, contrastes.
  ⚠️ Deux instruments ont été corrigés en cours de route, et c'est leur contrôle qui l'a dit :
  (a) le détecteur de bordure de la barre « DÉPOSER » lisait d'abord une ligne de texte voisine
  (bbox absurde de 172 px de haut) ; (b) le test d'arrondi « coin = fond ⇒ arrondi » rendait un faux
  « arrondi » sur une barre à angles droits — remplacé par la **largeur des 5 premières lignes**
  (1010, 1010, 1010, 1010, 1010), qui ne peut pas mentir.
