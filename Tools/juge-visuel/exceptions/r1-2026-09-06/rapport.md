# Juge visuel ⊥ — ⑨ La file d'exceptions (Exception Queue, canon `screen_5`) — r1 — 2026-09-06

> Tour **r1 = LIGNE DE BASE**. Aucun correctif déclaré, aucune grandeur antérieure : tout finding est
> `NOUVEAU` par construction. Je n'ai ouvert ni `Assets/Scripts`, ni les notes d'implémentation, ni
> aucun rapport de juge. Sources lues : les 9 images du dossier, `dossier.md`,
> `aide-serie6-cadre9.txt`, et — comme aide de lecture explicitement autorisée — la source
> `ecrans-brennar-4.html` / `ecrans-brennar-6.html` de l'atelier. **L'image prime partout.**

## Verdict : NON APPROUVÉ

L'écran affiche la bonne pile de blocs, aux bonnes largeurs et au bon rythme — mais **vidé de tout ce
qui le rendait lisible** : la scène du comptoir a disparu (57 % du rect libre est un aplat noir pur,
écart-type **0,00** sur 21 080 sondes), les trois médaillons sont des pavés d'**une seule teinte** là
où la maquette en porte 1 220 à 2 518, le corps de l'exception sélectionnée est l'identifiant brut
`exc_demo_teach_heat`, et cinq libellés sont en anglais.

---

## Convention de bord (déclarée, comme demandé)

- **Épaisseur d'un trait** = nombre de pixels **consécutifs** dont la couleur est à ≤ 18/255 par canal
  de la couleur du liseré, relevés sur un profil **perpendiculaire au bord, pris au MILIEU du côté**,
  jamais dans un coin arrondi.
- **bbox** = boîte d'**encre** (premier/dernier pixel s'écartant du fond de plus de 25 en L1 cumulé),
  jamais une boîte de mise en page supposée.
- **Coin carré / arrondi** = classe du pixel exact du coin de la bbox : plus proche du remplissage
  (⇒ carré) ou du fond (⇒ arrondi).
- **Échelle** (imposée par le dossier, vérifiée) : 1 px CSS = **3,6 px** des DEUX côtés pour le
  contenu. Le chrome est à ×2,755 et se juge à part.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Sans cette section le rapport ne serait pas recevable. **21 grandeurs mesurées égales ou dans la
tolérance** — c'est ce qui prouve que les écarts listés plus bas ne sont pas des artefacts d'échelle.

| # | grandeur | référence | capture | écart | script |
|---|---|---|---|---|---|
| C1 | largeur des images | 1080 | 1080 / 1080 | 0 | `m01` |
| C2 | **identité de la référence** = cadre #14 (v4-14 à ×3) | écart L1 moyen **19,82**/765 | contre 85,45 (#16) · 102,60 (#17) · 43,84 (#18) | discrimination ×4,3 | `m17` |
| C3 | échelle du contenu : `.parle .medl` = 60 CSS | **216×216 px** (attendu 216) | — | 0,0 % | `m25` |
| C4 | échelle du contenu : `.rail` = 34 CSS | **122 px** (attendu 122,4) | — | −0,3 % | `m11` |
| C5 | échelle du contenu : `.attendant.premier .medl` = 58 CSS | 203 px d'intérieur (attendu 201,6) | — | +0,7 % | `m08` |
| C6 | témoin « **Escalades archivées** » (même chaîne) | 345×30 px | 340×28 px | **0,986 / 0,933** | `m28` |
| C7 | témoin « **à relire à tête reposée** » | 298×28 px | 296×27 px | **0,993 / 0,964** | `m28` |
| C8 | témoin « **La ville** » | 114×26 px | 116×27 px | **1,018 / 1,038** | `m28` |
| C9 | largeur du bloc d'action (tampon / CTA) | 1002 px | 1008 px | **+0,6 %** | `m06`,`m07` |
| C10 | largeur du bloc « Escalades archivées » | 1003 px | 1008 px | **+0,5 %** | `m20`,`m18` |
| C11 | gouttière latérale du contenu | 39 / 39 px | 36 / 36 px | 3 px = 0,3 % de la largeur | `m34` |
| C12 | écart vertical action → pied | 29 px | 30 px | +3 % | `m24` |
| C13 | écart vertical étiquettes → bulle | 30 px | 28 px | −7 % | `m24` |
| C14 | écart vertical noms → étiquettes | 10 px | 11 px | +10 % | `m24` |
| C15 | rapport d'emphase colonne sélectionnée / voisine | 266,4/216 = **1,233** | 346/295 = **1,173** | −4,9 % | `m10` |
| C16 | centrage : titre sur l'écran | — | centre **539,5** (écran 539,5) | 0,0 px | `m23` |
| C17 | centrage : nom et étiquettes sur leur colonne | — | décalage **≤ 0,5 px** sur les 3 colonnes | 0 | `m23` |
| C18 | **gouttière respectée** (doctrine) | — | 0 px de contenu sous le bandeau ; 0 px entre le contenu et le dock ; rien de coupé, rien hors cadre | conforme | `m31` |
| C19 | bandeau : hauteur dérivée du code = 143 px | — | panneau (13,20,26) jusqu'à **y=142**, filet rouge y138..142, fond à y=143 | conforme | `m34` |
| C20 | **la planche « sans chrome » l'est vraiment** | — | 0 px d'encre au-dessus de y=1540, aucun dock (piège de ③ **non** reproduit) | conforme | `m03` |
| C21 | hauteur de capitale du bloc d'action | 31 px (« R » de RÉPARER) | 31 px (« T » de TEACH) | **0 px** | `m13` |

Et deux contrôles de doctrine qui passent : **le manomètre n'est pas inversé** (aiguille vers l'arc
rouge en haut à droite + libellé « Brûlant » — le piège connu du 2026-08-21 n'est pas là), et
**ARGENT / JOUR sont alimentés** (« 9 627 820,00 € », « JOUR 50 »), donc la capture n'est pas dans le
cas « chrome non alimenté » du dossier.

---

## 0. L'écran, tel que la maquette le dit

**But.** Le patron arrive au comptoir de son bar ; des gens l'attendent. En un coup d'œil il doit
savoir **combien** attendent, **qui** ils sont, **à quel point ça presse** — puis entendre le premier
et trancher d'un geste.

**Ordre de lecture** (mesuré sur les masses et les contrastes de la référence) :
1. **La plaque crème d'action** en bas — 1002×208 px, seule grande surface claire de l'écran
   (9,1 % de l'aire de contenu, contraste 4,37:1) : la main va là.
2. **La file des trois bustes** au milieu — trois médaillons sur un bandeau de comptoir doré, dont un
   plus gros surmonté d'un chevron : *qui* attend.
3. **La bulle de parole** — nom en or, deux pastilles d'urgence, la phrase entre guillemets : *ce
   qu'il dit*.
4. La ligne du haut (« Trois attendent vos ordres — la file est calme ») et le pied discret
   (« Escalades archivées … 1 › »).

**Zones.** (a) bandeau du HUD ; (b) **la scène** — façade de nuit, dos de cartes, plateau de zinc
doré : c'est le décor du comptoir, il occupe les deux tiers hauts ; (c) la file ; (d) la parole ;
(e) le tampon d'action ; (f) le pied vers les archives.

**Traits d'identité** — les cinq choses qui font qu'on reconnaît *cet* écran :
1. **le comptoir peint** et sa barre de zinc dorée qui traverse l'écran derrière les bustes ;
2. **les médaillons-bustes** : silhouettes crème sur un fond bleu nuit à rayons, cerclés de laiton ;
3. **le tampon crème à double filet bordeaux**, qui a l'air d'un cachet posé sur du papier ;
4. **l'or/laiton comme unique accent** (3,0 % des pixels du contenu) sur une palette bleu nuit + brun
   chaud ;
5. **la typographie à empattements** pour tout ce qui est *dit* (noms, parole), la linéale pour tout
   ce qui est *technique* (étiquettes, pied).

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non. **Le squelette est juste, la chair a disparu.**

Un joueur qui ouvre cet écran rencontre d'abord **un grand vide noir** : du bas du bandeau au premier
pixel dessiné il y a **1 149 px, soit 57,1 % du rect libre**, et cette zone est un aplat parfait
(écart-type 0,00 sur 21 080 sondes) là où la maquette peint la façade et le zinc. Le comptoir — le
lieu, donc le sens de l'écran — n'existe pas. Tout le contenu est tassé dans le tiers bas.

Deuxième chose vue : **une grande barre rouge saturée**. Le saumon `#ff5a4d` couvre **10,7 % de la
zone de contenu** — et **24,2 % de la seule partie réellement dessinée** (les deux dénominateurs sont
donnés parce qu'ils ne sont pas comparables entre eux ; la plaque crème de la maquette, elle, fait
9,1 % d'une zone de contenu qui est peinte partout). Surtout, ce saumon sert à la fois de **bouton
d'action**, d'**avatar de l'exception choisie** et de **première tuile de la file** : la même couleur,
la seule de l'écran, porte trois rôles différents — un lecteur ne peut plus distinguer « ce sur quoi
j'appuie » de « ce qui est sélectionné » de « ce qui est grave ». **L'or a totalement disparu** : 0 pixel
sur 918 000, balayage exhaustif à trois critères d'élargissement, contre 3,0 % dans la maquette et
2,2 % dans le bandeau de la même image (contrôle positif). L'écran ne fait plus partie de la même
famille visuelle que son propre HUD.

Troisième chose : **on ne sait plus qui attend.** Les trois médaillons sont des rectangles d'**une
seule teinte** (1 contre 1 220–2 518 dans la maquette), en 2,39:1 au lieu de 1:1, sans silhouette,
sans « B » de la ville, sans cercle de laiton. Deux des trois rangées portent le même mot générique
« Votre lieutenant ». La file, qui est la raison d'être de l'écran, ne distingue plus personne.

Et le texte central de l'écran — ce que le lieutenant *dit* — est remplacé par
**`exc_demo_teach_heat`**, un identifiant technique, sous une ligne où l'on lit `Severe`, `Critical`,
`Moderate`, `Urgent`, et un bouton qui annonce `TEACH: PAUSE ON HIGH HEAT`.

**Les trois écarts de tête, par impact perçu** : ① le vide noir + la scène absente (B1) ; ② les bustes
devenus des aplats, l'identité des gens perdue (B2) ; ③ le corps de l'exception rendu en identifiant
brut et les libellés anglais (B3, B4).

**Ce qui va bien, et il faut le dire** : la pile de blocs est la bonne, dans le bon ordre, aux bonnes
largeurs (±0,6 %), avec les bonnes gouttières et un rythme vertical fidèle (C12–C14) ; les tailles de
texte sont justes au pixel sur trois chaînes témoins identiques ; rien n'est coupé, rien ne déborde,
rien n'entre sous le bandeau ni sous le dock ; et la planche « sans chrome » tient sa déclaration.

---

## 3. Écarts — table unique

`critère` : `NOUVEAU` partout, r1 étant la ligne de base.
`données` : `oui` = l'observation dépend de ce que le back a servi ce jour-là (donc datée, et
d'autant plus fragile que **l'identité du compte photographié n'est pas établie** — voir §6) ;
`non` = géométrie, palette, typographie, rythme — vrai quelles que soient les données.

| id | gravité | critère | données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| **B1** | BLOQUANT | NOUVEAU | non | **La scène du comptoir est absente ; le haut du rect libre est un aplat noir.** La maquette y peint la façade de nuit, les dos de cartes et le plateau de zinc doré — le décor qui *situe* l'écran. | Vide : y143→1292 = **1 149 px = 57,1 %** du rect libre (2 012 px) ; 1 060 px = 55,1 % si l'on part du bas du losange (y231). Aplat : écart-type **0,00**, moyenne 13,00, n=21 080 (`m14`). Contrôle négatif sur la même bande de la référence : écart-type **37,17**. Bandeau doré du comptoir mesuré en réf à (157,120,51) vers y≈930 ; capture (13,13,13) sur toute la bande (`m30`). | si le noir est un asset de fond manquant ou un conteneur volontairement vide — l'image ne le dit pas |
| **B2** | BLOQUANT | NOUVEAU | non | **Les trois médaillons-bustes sont des pavés plats** : aucune silhouette, aucun « B » de la ville, aucun cercle de laiton, aucun dégradé, aucun rayon. On ne peut plus lire *qui* attend. | Teintes distinctes à l'intérieur : **1 / 1 / 1** (capture) contre **1 220 / 2 518 / 2 297** (référence) (`m09`). Format : **346×145** (2,39:1) et **295×136** (2,17:1) contre **208,8×208,8** et **158,4×158,4** (1:1) — soit +139 % et +117 % de rapport largeur/hauteur (`m09`,`m10`,`m08`). | — |
| **B3** | BLOQUANT | NOUVEAU | oui | **Le corps de l'exception sélectionnée est un identifiant brut** — `exc_demo_teach_heat` — là où la maquette porte la phrase du lieutenant (« Patron — ils ont retourné le bâtiment cette nuit… »). Doctrine du dossier : « aucun enum brut … ne doit atteindre l'écran ». | Chaîne lisible sur l'image, boîte d'encre x300..710 y1710..1755, encre (238,241,242) sur (22,22,28), contraste 15,87:1 (`m22`, crop `crop_bas.png`). La forme `xxx_yyy_zzz` en minuscules soulignées est celle d'une clé, pas d'une phrase. | quelle valeur le back a servi (identité du run non établie) — mais la **classe** « jeton technique » se lit sur l'image quel que soit le compte |
| **B4** | BLOQUANT | NOUVEAU | oui | **Cinq libellés anglais atteignent l'écran** : `Severe · Critical`, `Moderate · Critical`, `Severe · Urgent` (les 3 rangées), `Votre lieutenant · Severe · Critical` (la bulle), `TEACH: PAUSE ON HIGH HEAT` (le bouton d'action). Doctrine : « Langue affichée : français … aucun repli anglais ne doit atteindre l'écran ». | Lisibles sur `crop_file.png` et `crop_bas.png`. La maquette dit, aux mêmes emplacements : `GRAVE · CRITIQUE`, `MODÉRÉE · URGENTE`, `RÉPARER LE BÂTIMENT`. Le reste de l'écran EST en français (« attendent vos ordres », « il attend une consigne », « Escalades archivées », « à relire à tête reposée ») ⇒ ce n'est pas un écran non traduit, c'est un **repli partiel**. | idem B3 |
| **M1** | MAJEUR | NOUVEAU | non | **L'or / le laiton — accent unique de la maquette et de tout le HUD — est absent du contenu.** | Balayage **exhaustif** (918 000 px, pas=1) à trois critères : strict `h33-58 s≥0,30 v≥0,30`, élargi `h25-70 s≥0,18`, très large `h20-75 s≥0,10` ⇒ **0 / 0 / 0**. Contrôle positif sur le bandeau de la MÊME image : 2,222 % / 3,018 % / 3,657 %. Référence : **2,996 % / 16,08 % / 24,36 %** (`m33`). | — |
| **M2** | MAJEUR | NOUVEAU | non | **Le bloc d'action a changé de famille** : pavé saumon plein à texte blanc, au lieu d'une plaque crème à encre bordeaux, double filet et coins arrondis. Et **son texte passe sous le plancher de contraste**. | Remplissage **(255,90,77)** contre **(217,204,169)** ; texte **(238,241,242)** contre **(147,64,44)**. Contraste : **2,71:1** (grand texte, plancher 3:1) et **2,37:1** pour la sous-ligne (petit texte, plancher 4,5:1) ; la maquette est à **4,37:1** (`m22`). Bord : **0 px** contre 8 px (2 CSS `#93402c`) + un filet interne à 3 CSS (`m06`,`m07`). Hauteur 147 px contre 208. | — |
| **M3** | MAJEUR | NOUVEAU | non | **L'urgence n'est plus codée par la couleur.** Les trois rails sous les médaillons sont d'un gris bleuté identique ; la maquette code braise (grave) / or (modérée). | Capture : **(138,151,156)** sur les 3 rails (`m10`). Référence : rail 2 **(179,83,60)** braise, rail 3 **(173,137,63)** or ; rail 1 braise assombri par l'ombre portée du médaillon sélectionné, **(119,59,39)** (`m11`). | — |
| **M4** | MAJEUR | NOUVEAU | non | **La bulle de parole a perdu tout ce qui en faisait une parole** : le nom en or, la ligne de rôle, les deux pastilles d'urgence, la queue, le liseré, les coins arrondis — et elle **touche** l'avatar. | Nom en or : **1 601 px** à (338,1243)-(498,1271) en réf, **0 px** d'or dans toute la bulle en capture (`m29`). Pastilles : **2 composantes** de 124×50 et 163×50 px en réf, **0** en capture (`m30`). Écart avatar↔bulle : **40 px** (réf, 254→294) contre **0 px** (capture, 199→200) (`m18`,`m25`). Queue `.bulle::before` (12×12 CSS) présente en réf, absente en capture. | — |
| **M5** | MAJEUR | NOUVEAU | non | **Aucun coin arrondi et aucun liseré nulle part dans le contenu** — balayage de la CLASSE, pas d'une instance. La maquette pose des rayons de 10 à 18 CSS et des liserés de 1 à 2 CSS sur chaque bloc. | **7 blocs sur 7** de la capture : coin = couleur de remplissage aux 4 coins, et **0 px** « ni fond ni remplissage » au bord. Contrôle positif : 4 blocs de la référence sur 5 sortent « coin = fond » ; le 5ᵉ (le pied) est indécidable par cette sonde (fill≈fond) mais son rayon est mesuré à ≈ 33 px par le tracé de son liseré (`m32`,`m20`). | — |
| **M6** | MAJEUR | NOUVEAU | non | **Le texte « parlé » passe des empattements à la linéale**, et du gras au normal : **ligne de titre, noms de la file et corps de l'exception** (la maquette les met tous trois en Georgia). La maquette réserve les empattements à ce qui est *dit* et la linéale à ce qui est technique ; la capture met tout en linéale. | Test d'empattement sur le **même glyphe** ('L' de « La ville ») : rapport tête/fût **3,43** (réf) contre **1,00** (capture). Contrôles : 'E' de « Escalades » (linéale des deux côtés) ⇒ 1,00 et 0,94 (`m27`). Graisse : fût **7 px** (réf) contre **4 px** (capture) à hauteur de capitale comparable. | quelle fonte exacte le client emploie (je mesure la **classe**, pas le fichier) — `fc-match` sur l'asset trancherait. ⚠️ Ce n'est PAS l'arbitrage Noto↔DejaVu du dossier : celui-ci couvre serif↔serif, pas serif→linéale, et le client embarque `hudSerifFont` |
| **M7** | MAJEUR | NOUVEAU | oui | **Le pied « Escalades archivées » a perdu son compte et son chevron**, et sa composition gauche/droite est devenue deux lignes centrées. Le pied ne dit plus *combien* il y a à relire ni qu'il mène quelque part. | Encre dans le tiers droit du bloc (x750..1043) : **aucune** (`m23`). Référence : « 1 » en or + « › » en or, alignés à droite (`m20`, source `.filet.lien .n-or` / `.fleche`). Composition : réf = titre à gauche / sous-titre à droite / compte à l'extrême droite ; capture = 2 lignes centrées (centres 540,5 et 539,5). | si le compte réel est 0 (auquel cas la maquette #16 prévoit « rien à relire ›», qui n'est pas non plus affiché) |
| **M8** | MAJEUR | NOUVEAU | oui | **Le compte annoncé contredit ce qui est montré, sans rien qui explique la troncature.** Le titre dit « Cinq » (planche sous chrome) ou « Six » (planche sans chrome) ; **trois** rangées sont dessinées. La maquette est cohérente (« Trois » / 3 rangées). | Titre lu sur les deux planches ; 3 pavés mesurés (`m10`) ; aucun indicateur « +N », aucune amorce de 4ᵉ tuile, aucun bord coupé dans le rect libre (`m31`). | s'il existe un défilement : une image fixe ne peut pas le dire. Trancherait : une capture après un geste de défilement, ou l'écran en état « 6 en attente » |
| **M9** | MAJEUR | NOUVEAU | non | **Le chevron de sélection ▼ est absent** ; la sélection n'est plus portée que par le remplissage saumon — qui est aussi la couleur de l'avatar et du bouton. | Réf : caret or **18×19 px** à (199,765)-(216,783) ; contrôle négatif au-dessus du 2ᵉ médaillon : 0 px or. Capture : **0 px or** sur toute la bande y1280..1360 (`m24`). | — |
| **M10** | MAJEUR | NOUVEAU | oui | **Deux rangées sur trois portent le même mot générique « Votre lieutenant »** au lieu d'un nom. La rangée existe pour dire *qui* ; deux d'entre elles deviennent indiscernables. | Boîtes d'encre : rangée 1 x50..366, rangée 2 x428..701, même chaîne ; rangée 3 « La ville » (`m23`). La maquette porte « Lt. Kane », « La ville », « Lt. Marr » ; la série 6 (fiction) porte « Lt. Hara », « la ville », « Lt. Sallo ». | **si le back a servi un nom.** L'assumé du dossier couvre « des noms différents de la maquette », pas « un mot de rôle à la place d'un nom » ; sa clause de sortie vise un nom *vide* — je ne peux pas savoir, depuis l'image, si le champ était vide ou absent. **À confronter aux corps par l'orchestrateur** |
| **m1** | MINEUR | NOUVEAU | non | Le bloc d'action est **29 % plus bas** que la plaque de la maquette, à largeur identique. | 147 px contre 208 px ; largeur 1008 contre 1002 (`m06`,`m07`). | — |
| **m2** | MINEUR | NOUVEAU | non | Le pied est **19 % plus bas** que celui de la maquette, à largeur identique. | 109 px contre 135 px ; largeur 1008 contre 1003 (`m18`,`m21`). | — |
| **m3** | MINEUR | NOUVEAU | non | La file **s'étire sur toute la largeur** au lieu d'être tassée à gauche : la maquette laisse un vide à droite qui fait respirer la rangée. | Capture : x36..1043 = **1 008 px = 93 %** de la largeur. Référence : x≈75..845 = **770 px = 71 %**, avec 235 px libres à droite (`m10`,`m08` + CSS `.file` flex-start). | — |
| **m4** | MINEUR | NOUVEAU | non | Les médaillons sont **alignés par le haut** ; la maquette les aligne par le bas (`align-items:flex-end`), ce qui pose les trois bustes sur la même ligne de comptoir. | Capture : 3 tops à y=1359, bas à 1503 / 1494 / 1494. Référence : bas ≈ 1010 / 1008 / 981, tops à 800 / 850 / 823 (`m10`,`m08`,`m11`). | — |
| **m5** | MINEUR | NOUVEAU | non | Les rails d'urgence **suivent la largeur du pavé** (346 / 295 / 295 px) et ont des hauteurs inégales (7 / 10 / 10 px) ; la maquette les tient constants. | Réf : **122×11 px** pour les trois (`m11`). Capture : 346×7, 295×10, 295×10 (`m10`). | — |
| **m6** | MINEUR | NOUVEAU | non | Le nom de la rangée sélectionnée est **15 % plus haut** que celui des autres ; la maquette n'utilise pas la taille du texte pour marquer la sélection (elle utilise la taille du médaillon, l'opacité et le chevron). | Boîtes d'encre : 31 px (rangée 1) contre 27 px (rangées 2 et 3) (`m23`). | — |
| **m7** | MINEUR | NOUVEAU | non | Le « **B** » qui marque *la ville* (par opposition à un lieutenant) n'est pas rendu — conséquence de B2, mais c'est une **information** distincte qui disparaît. | Réf : glyphe or-vif au centre du 2ᵉ médaillon (`.ville-b`, Georgia 20 px). Capture : pavé d'une seule teinte (`m09`,`m10`). | — |
| **m8** | MINEUR | NOUVEAU | non | La ligne de titre est **11 % plus haute** que celle de la maquette. | Hauteur de capitale **30 px** contre **27 px** (`m13`). Hors du plancher de bruit (≤ 1 px ou ≤ 5 %), mais sans effet sur la lecture. | — |

**Compte : 4 BLOQUANT · 10 MAJEUR · 8 MINEUR = 22 findings.** (Le compte est ici, pas dans la synthèse.)

---

### Écarts ASSUMÉS — vérifiés « rendus proprement »

| ce qu'on voit | statut | vérification faite | sorti de l'assumé ? |
|---|---|---|---|
| la PHASE de l'aile droite est un tiret « — » | ASSUMÉ (état voulu hors district) | tiret cadratin propre, pas de « Unknown », pas de vide ; **ARGENT (« 9 627 820,00 € ») et JOUR (« JOUR 50 ») sont alimentés** ⇒ ce n'est pas la course de capture décrite par le dossier | **non** |
| le nombre d'exceptions diffère de la maquette | ASSUMÉ (données) | aucune rangée tronquée, aucun chevauchement, aucun débord : les 3 pavés tiennent dans la gouttière (`m23`,`m31`) | **non** — mais la contradiction titre↔rangées est un défaut à part (M8) |
| les noms ne sont pas ceux de la maquette | ASSUMÉ (données) | pas de slug, pas de clé i18n brute, pas de mot anglais **dans les noms** | **cas limite** : « Votre lieutenant » n'est pas un nom → remonté en M10 |
| les chiffres de la maquette rendus autrement | ASSUMÉ (R2.2 + données) | aucun scalaire inventé ; le montant est au format **français** (« 9 627 820,00 € »), pas « $10,000.00 » | **non** |

### ARBITRAGES — non opposables au client

| id | sujet | pourquoi c'est un arbitrage |
|---|---|---|
| A1 | **ronds du dock sans icône** (4 ronds vides, EMPIRE / FAMILLE / FILIÈRE / PLUS) | arbitrage user connu (« j'aime pas les icônes ») — jamais un écart d'écran. Rendu proprement : aucun rond coupé, aucun libellé de repli |
| A2 | la référence série 4 écrit « **$ 24 850** », « **HEAT** », « Jour 26 / Soirée » | ruling user 2026-09-02 « fr réel » : **le client a raison, la maquette est en retard**. Noté une seule fois ; n'entre dans aucun finding |
| A3 | les silhouettes de la maquette portent **fedora** et **casquette** | ruling DA 2026-09-02 : la maquette est en retard sur le ruling. Sans objet ici — le client ne rend **aucune** silhouette (B2), il n'y a donc pas de couvre-chef à arbitrer |
| A4 | familles de fontes **Noto Serif / Noto Sans** (référence, `fc-match`) contre **DejaVu** (client) | non opposable **à l'intérieur d'une même classe**. C8 montre que les corps coïncident (1,018 / 1,038). Ne couvre pas M6, qui est un changement de **classe** (empattements → linéale) |
| A5 | **direction de style** (« sombre, napolitain, mafieux, fin 80s – début 90s ») | la maquette tient cette direction (bleu nuit, brun chaud, laiton, crème) ; la capture est neutre-noire + un saumon saturé moderne. **Je ne classe pas cela en arbitrage** : les findings M1, M2, B1 sont des écarts de jeton, de matière et d'asset, pas une lecture alternative assumée. Je le signale ici pour que l'user puisse trancher s'il le souhaite |

---

### Ce que la planche montre en rangées — indice d'identité (à confronter aux corps, PAS un écart)

Relevé à la lettre, sans conclure. **L'identité du run n'est pas établie** (§6) : cette liste est un
indice pour l'orchestrateur, rien de plus.

**Planche PRINCIPALE (`capture-1080x2400.png`, sous chrome)**

| position | ce qui est écrit |
|---|---|
| titre | « **Cinq** attendent vos ordres — la file est calme » |
| rangée 1 (pavé **saumon** = sélectionnée) | « **Votre lieutenant** » · « **Severe · Critical** » |
| rangée 2 (pavé gris) | « **Votre lieutenant** » · « **Moderate · Critical** » |
| rangée 3 (pavé gris) | « **La ville** » · « **Severe · Urgent** » |
| bulle — ligne méta | « Votre lieutenant · Severe · Critical » |
| bulle — corps | « **exc_demo_teach_heat** » |
| bouton d'action | « **TEACH: PAUSE ON HIGH HEAT** » / « il attend une consigne » |
| pied | « Escalades archivées » / « à relire à tête reposée » — **aucun compte, aucun chevron** |
| chrome | ARGENT « 9 627 820,00 € » · manomètre « Brûlant / CHALEUR » · « JOUR 50 » · phase « — » |

**Planche `capture-sans-chrome-declaree-…`** : identique, **sauf le titre** — « **Six** attendent vos
ordres — la file est calme ».

⚠️ **Les deux planches ne photographient donc pas le même état**, alors que le dossier leur donne la
même minute (14:56) et le même commit (`03efb90`). Trois rangées sont dessinées dans les deux cas.
Aucun nom de lieutenant (ni « Lt. Sallo », ni « Rook », ni « Halde ») n'apparaît sur aucune des deux.

**Pour mémoire, la maquette ratifiée montre** : « Trois attendent vos ordres — la file est calme » ;
« Lt. Kane » (CUISINIER · GRAVE · CRITIQUE), « La ville » (GRAVE · URGENTE), « Lt. Marr »
(LOGISTIQUE · MODÉRÉE · URGENTE) ; bulle « Lt. Kane · CUISINIER · AU BÂTIMENT TOUCHÉ » + pastilles
GRAVE / CRITIQUE + « Patron — ils ont retourné le bâtiment cette nuit. J'ai pas de consigne pour
ça. » ; tampon « RÉPARER LE BÂTIMENT / suggéré · appui long — sa main : 5 autres issues › » ; pied
« Escalades archivées / à relire à tête reposée / **1 ›** ».

---

## 5. Autres résolutions

**Le dossier ne fournit qu'UNE résolution** (1080×2400). La seconde planche est la même résolution
dans un autre régime (sans chrome), pas une autre résolution. Le temps 5 du mandat n'est donc **pas
instruisable** ce tour — c'est un manque du dossier, pas un constat sur l'écran, et je ne le devine
pas.

Ce que la seconde planche permet quand même de dire, et c'est utile :

- **la déclaration « sans chrome » est VRAIE** : 0 px d'encre au-dessus de y=1540, aucun dock (le
  piège rencontré sur ③, où la planche homonyme portait bandeau et dock, **n'est pas reproduit ici**) ;
- **la pile de contenu se comporte correctement quand le rect libre change** : sans chrome, elle
  reste ancrée en bas et descend de 249 px (les mêmes blocs, aux mêmes tailles : CTA 1008 px de
  large dans les deux, pavés 346/295/295 dans les deux). Rien ne se coupe, rien ne déborde ;
- **le vide du haut grandit d'autant** : 1 540 px vides sur 2 400 = **64 %** de l'écran, contre 57 %
  du rect libre sous chrome. Le défaut B1 empire quand la place augmente, ce qui est le signe que le
  contenu est ancré en bas dans un conteneur vide, et non qu'un fond a été mal dimensionné.

---

## 6. Ce que je n'ai pas pu vérifier

Chaque point avec, quand elle existe, la mesure **hors image** qui trancherait.

1. **L'identité du compte photographié.** Le dossier dit lui-même que la ligne
   `[DemoIdentityResolver] régime=env identité=demo_capture@example.test` **n'est pas jointe**. ⇒
   toutes les VALEURS (noms, compte annoncé, montant, jour, libellés servis) sont non vérifiées, et
   les findings marqués `données : oui` (B3, B4, M7, M8, M10) sont des observations **datées**. La
   FORME, elle, est jugée. **Trancherait** : la ligne de journal du run `03efb90`, ou une recapture
   avec la paire `MAFIA_DEMO_IDENTIFIER` / `MAFIA_DEMO_PASSWORD`.
2. **Les deux planches divergent** (« Cinq » / « Six ») pour la même minute et le même commit. Je ne
   peux pas dire laquelle, si l'une des deux, correspond aux 6 exceptions des corps. **Trancherait** :
   les deux journaux de run, ou une paire de planches prise dans le même appel.
3. **Une seule résolution.** Pas de 1920, pas d'autre ratio. Le temps 5 reste ouvert. **Trancherait** :
   une capture à une seconde résolution cible.
4. **Aucune paire T / T+1 s** ⇒ le ruling « aucune animation sur un nouvel écran » n'est **pas
   vérifiable**. Les deux planches fournies diffèrent par **plus d'une variable** (chrome + compte) et
   ne peuvent donc pas servir de couple — deux variables qui bougent ensemble ne départagent rien.
   **Trancherait** : deux captures du même état à T et T+1 s.
5. **Le chrome n'est pas jugeable — défaut du dossier.** Le dossier prescrit de le juger contre
   « le canon du HUD (`Tools/juge-visuel/ecran-principal/ecran-canon.png`, 1176 px = 392 CSS, ×3) ».
   Le fichier fourni sous ce nom fait **900×1752** et **n'est pas un chrome de HUD** : c'est un canon
   ANTÉRIEUR du même écran ⑨ (« LES EXCEPTIONS », onglets de tri, trois cartes, pied « Escalades
   archivées … 1 › »), **sans bandeau ni dock**. Je n'ai donc aucun canon pour opposer la hauteur du
   bandeau (143 px mesurés), le filet rouge pleine largeur à y138..142, le losange doré à y215..231,
   la hauteur du dock (244 px) ou l'absence d'onglet actif. **Trancherait** : le vrai
   `ecran-canon.png` du HUD à 1176 px.
   *(Ce canon antérieur est en revanche instructif : il porte des onglets de tri PAR PRIORITÉ /
   GRAVITÉ / LIEUTENANT que ni la maquette ratifiée ni la capture ne montrent. Hors mandat — la
   référence ratifiée est le cadre #14 —, je le signale seulement.)*
6. **Aucun état secondaire photographié** : ni « personne ne fait la queue » (#16), ni « après le
   tampon » (#17), ni « avec les lots back » (#18), ni le détail ⑩. Non jugés, comme le dossier le
   demande.
7. **Le défilement de la file** : une image fixe ne peut pas dire si les rangées 4 à 6 existent
   sous le pli ou n'existent pas du tout (cf. M8). **Trancherait** : une capture après un geste de
   défilement.
8. **La fonte réellement employée par le client.** Je mesure la **classe** (empattements vs linéale)
   par un rapport tête/fût sur le même glyphe, pas le fichier de fonte. **Trancherait** : `fc-match`
   sur la pile demandée, ou l'asset embarqué.
9. **La nature du vide de B1** : asset de fond absent, ou conteneur volontairement vide. L'image dit
   seulement que c'est un aplat parfait.
10. **L'onglet actif du dock** : les 4 ronds sont visuellement identiques. Sans canon de chrome, je
    ne peux pas dire si « PLUS » (par où le dossier dit qu'on entre) devrait être marqué.
11. **Le contraste de la ligne de titre de la RÉFÉRENCE** (crème sur art peint) : ma sonde a rendu
    1,00:1 parce que la couleur modale de la boîte était l'encre elle-même. Non mesuré — et c'est de
    toute façon une propriété de la maquette, pas du client.
12. **Les valeurs mesurées par les gardes du test** (`CaptureSousShell`, compte de teintes distinctes,
    voisins éteints) : le dossier dit le journal non préservé. Je constate seulement, en propre, que
    la capture n'est pas un aplat (4 988 teintes sur l'écran entier, 1 471 sur le contenu dessiné).

---

## Annexes

### Annexe 1 — Inventaire de la RÉFÉRENCE (cadre série 4 #14, 1080×2102, ×3,6)

Couche globale, zone de contenu y216..2100 (`m15`) : densité d'encre **53,4 %** · luminance moyenne
**47,0/255** · **37 769** teintes distinctes · palette dominante 20,5 % `#121a28` (bleu nuit) ·
13,8 % `#121110` · 13,8 % `#0b0f16` · **12,7 % `#cbbd9d` (crème)** · 12,6 % `#080c12` ·
10,4 % `#201d1e` · **9,0 % `#493b33` (brun chaud du zinc)** · 7,2 % `#07090f`. Part « or/laiton »
**3,0 %** (`m33`). Part chaude (R−B ≥ 10) **26,3 %** (`m31`).

| id | catégorie | bbox (px) | forme | remplissage | bord | texte |
|---|---|---|---|---|---|---|
| `R.barre` | chrome (évocation) | y 0..216 | — | — | — | ARGENT / $ 24 850 · tiède/HEAT · Jour 26 / Soirée |
| `R.scene` | décor | y 216..~940 | façade de nuit + dos de cartes + plateau de zinc | dégradés bruns/dorés, pic (157,120,51) vers y≈930 | — | — |
| `R.titre` | texte courant | encre x165..~915, y666..700 | — | crème (234,224,200) | — | « Trois attendent vos ordres — la file est calme », hauteur de capitale 27 px |
| `R.file.medl1` | médaillon | intérieur (107,804)-(309,1006) | carré arrondi r=64,8 px, **1:1** | dégradé radial bleu nuit + rayons coniques, silhouette crème | liseré or-vif ~3,6 px | — |
| `R.file.medl2/3` | médaillon | 153 px d'intérieur | carré arrondi r=50,4 px, **1:1** | idem ; #2 porte le « B » de la ville | liseré laiton | — |
| `R.file.caret` | indicateur | (199,765)-(216,783) | ▼ | or-vif | — | — |
| `R.file.rail1/2/3` | jauge | 122×11 px | trait plein r=2 CSS | (119,59,39) · **(179,83,60)** braise · **(173,137,63)** or | — | — |
| `R.file.nom` | texte | ex. « La ville » x428..541, y1048..1073 | — | crème | — | Georgia→Noto Serif **gras**, capitale 24–26 px, fût 7 px |
| `R.file.tags` | texte | y1090..1160 | — | crème-2 | — | capitales espacées, 2–3 lignes |
| `R.parle.medl` | médaillon | (39,1431)-(254,1646) | **216×216**, r=64,8 px | dégradé + rayons + silhouette | liseré or-vif | — |
| `R.bulle` | panneau | (294,1190)-(1041,1646), **748×457** | r 14/14/14/4 CSS + **queue** 12×12 CSS à gauche-bas | dégradé (24,34,51) → plus sombre | **1 CSS** `#ffffff2a`, mesuré 3 px, (53,58,69) | nom or-vif (338,1243)-(498,1271) · ligne de rôle en capitales · **2 pastilles** 124×50 et 163×50 · citation 3 lignes |
| `R.tampon` | bouton | (39,1683)-(1040,1890), **1002×208** | r 11 CSS, coins arrondis | **(217,204,169)** crème | **2 CSS** `#93402c` (8 px) + filet interne 1 CSS à 3 CSS de retrait | « RÉPARER LE BÂTIMENT » (147,64,44), capitale 31 px, contraste **4,37:1** ; sous-ligne 15 px |
| `R.filet` | pied | (39,1919)-(1041,2053), **1003×135** | r ≈ 33 px | (10,15,23) | **1 CSS** (48,53,60) | « Escalades archivées » à gauche · « à relire à tête reposée » à droite · « **1** » or · « **›** » or |

### Annexe 2 — Inventaire de la CAPTURE (1080×2400, sous chrome, ×3,6 pour le contenu)

Couche globale, zone de contenu y232..2155 (`m15`) : densité d'encre **28,0 %** · luminance moyenne
**36,2/255** · **1 471** teintes distinctes sur le contenu dessiné · palette **71,8 % `#0d0d0d`** ·
11,4 % `#16161c` · **10,7 % `#ff5a4d`** · 5,8 % `#98a1a5` · le reste < 0,3 %. Part « or/laiton »
**0,000 %** (exhaustif). Aire saumon dans le contenu dessiné : **24,2 %**.

| id | catégorie | bbox (px) | forme | remplissage | bord | texte |
|---|---|---|---|---|---|---|
| `C.bandeau` | chrome | y 0..142 (débord manomètre 203, losange 215..231) | — | (13,20,26), filet rouge y138..142 | — | ARGENT / 9 627 820,00 € · Brûlant / CHALEUR · JOUR 50 · — |
| `C.vide` | — | y 232..1291, **1 060 px** | aplat | **(13,13,13)**, écart-type **0,00** | — | — |
| `C.titre` | texte | encre x75..1004, y1292..1331 | — | (138,151,156) | — | « Cinq attendent vos ordres — la file est calme », capitale 30 px, 6,47:1 |
| `C.pave1` | pavé | (36,1359)-(381,1503), **346×145** | rectangle, **4 coins carrés**, **2,39:1** | **(255,90,77)** plat, **1 teinte** | **aucun** | — |
| `C.pave2/3` | pavé | (418,1359)-(712,1494) et (749,…)-(1043,1494), **295×136** | rectangle, coins carrés, 2,17:1 | **(138,151,156)** plat, 1 teinte | aucun | — |
| `C.rail1/2/3` | jauge | 346×7 · 295×10 · 295×10 | rectangle | **(138,151,156)** pour les trois | aucun | — |
| `C.nom1/2/3` | texte | x50..366 · x428..701 · x839..954 | centré sur la colonne (±0,5 px) | (238,241,242) | — | linéale, capitale 26–31 px, 17,12:1 |
| `C.tags` | texte | y1573..1600 | centré | (138,151,156) | — | « Severe · Critical » etc., 6,47:1 |
| `C.carre-parle` | avatar | (36,1628)-(199,1802), **164×175** | rectangle, coins carrés | (255,90,77) plat | aucun | — |
| `C.panneau-bulle` | panneau | (200,1628)-(1043,1802), **844×175** | rectangle, coins carrés, **aucune queue**, **collé** à l'avatar (0 px) | (22,22,28) | aucun | méta (138,151,156) 5,99:1 · corps `exc_demo_teach_heat` (238,241,242) 15,87:1 |
| `C.cta` | bouton | (36,1831)-(1043,1977), **1008×147** | rectangle, coins carrés | **(255,90,77)** | **aucun** | « TEACH: PAUSE ON HIGH HEAT » (238,241,242) capitale 31 px **2,71:1** · sous-ligne **2,37:1** |
| `C.filet` | pied | (36,2007)-(1043,2115), **1008×109** | rectangle, coins carrés | (22,22,28) | aucun | 2 lignes centrées, 15,87:1 et 5,99:1 · **aucun compte, aucun chevron** |
| `C.dock` | chrome | y ≈2156..2400, **244 px** | dégradé | (13,13,13) → (13,18,29) | — | 4 ronds vides · EMPIRE / FAMILLE / FILIÈRE / PLUS |

### Annexe 3 — Correspondance des repères

- **Contenu** : référence et capture sont à la **même échelle**, 1 px CSS = 3,6 px, rapport
  capture ÷ référence = **1,00** (imposé par le dossier ; vérifié en C3–C5 sur trois grandeurs CSS
  connues, écarts −0,3 % / +0,0 % / +0,7 %).
- **Offset vertical** : les deux piles sont **ancrées en bas** de leur zone de contenu. Repère
  d'alignement retenu : le **bas du bloc de pied** — référence y=2053, capture y=2115. Toute mesure
  du §3 qui compare des positions verticales est faite **en écarts entre blocs**, jamais en y absolu.
- **Offset horizontal** : gouttière gauche référence x=39 (dont 3,6 px de cadre `.tel`), capture
  x=36 ⇒ offset **−3 px**, sous la tolérance de position.
- **Chrome** : ×2,755 (hors échelle du contenu) ⇒ jugé à part, et en fait **non jugé** faute de canon
  (§6-5).

### Annexe 4 — Scripts

Tous dans `mesures/`, chacun imprime la taille des images qu'il ouvre, chacun porte au moins un
contrôle. `util.py` porte les helpers communs.

| script | ce qu'il mesure | contrôle |
|---|---|---|
| `m01_geometrie_chrome.py` | largeurs/hauteurs, bandes de différence entre les deux planches | + largeurs 1080 ; − hauteurs 2400≠2102 |
| `m02_bandeau_dock.py` | ligne rouge du bandeau, profils haut/bas | — |
| `m03_verif_sans_chrome.py` | **la planche « sans chrome » l'est-elle ?** | + encre en haut sous chrome (15 369 px) ; − 0 px sans chrome |
| `m04_bandes_encre.py` | bandes d'encre des 3 images (structure de la pile) | fond dominant imprimé |
| `m05_cta.py` / `m06_tampon_ref.py` / `m07_cta_cap.py` | plaque d'action : bbox, remplissage, bord, coins | + jeton CSS `#d9cca9` retrouvé à 0/255 ; − capture éloignée |
| `m08_medaillons.py` | médaillons de la référence (composantes connexes) | + 58 CSS → 203 px d'intérieur |
| `m09_medl_cap.py` / `m10_medl_cap2.py` | pavés de la capture : bbox, coins, **teintes distinctes** | − référence 1 220–2 518 teintes contre 1 |
| `m11_rails_ref.py` | rails d'urgence : largeur, couleurs | + 34 CSS → 122 px ; − les 3 rails de la réf diffèrent |
| `m12/m13` (capitales) | hauteurs de capitale, v1 puis v2 par proximité de couleur | fenêtres et seuils imprimés |
| `m14_dock_et_vide.py` | **le vide** : bornes, part du rect libre, planéité | + écart-type 0,00 (capture) ; − 37,17 (référence) |
| `m15_palette_globale.py` | palette, luminance, densité | Σ des pourcentages = 100,0 % |
| `m16_or.py` / `m33_or_zero_exhaustif.py` | **or/laiton**, sondage puis **balayage exhaustif à 3 critères** | + bandeau de la même image 2,2–3,7 % ; − vide 0 % |
| `m17_ref_est_bien_14.py` | **identité de la référence** | discrimination ×4,3 contre les 3 autres cadres |
| `m18/m19/m20/m21` | bulle, pied : bbox, liserés, rayons, bas du filet | liserés localisés au pixel |
| `m22_contrastes_v2.py` | contrastes (encre = mode le plus éloigné du fond) | + tampon réf = valeurs CSS exactes 4,37:1 ; − bande vide 1,00:1 |
| `m23_alignements.py` | boîtes d'encre, centrages, débords | − bande vide ⇒ « aucune encre » |
| `m24_caret_rythme.py` | chevron ▼, rythme vertical | + caret trouvé ; − 0 px au-dessus du 2ᵉ médaillon |
| `m25_bulle_bbox.py` | bbox exacte de la bulle (le dégradé faussait la v1) | + médaillon `.parle` = 216×216 exact |
| `m26/m28` (témoins) | **trois chaînes identiques** des deux côtés | v2 : fenêtre purgée du halo du rail (la v1 rendait +10 px faux) |
| `m27_serif.py` | **empattements** : rapport tête/fût sur le même glyphe | + 'E' linéale des deux côtés ⇒ 1,00 / 0,94 ; − 'L' serif ⇒ 3,43 |
| `m29/m30` | nom en or, pastilles, bandeau doré du comptoir | + nom or trouvé en réf ; − 0 px or dans la bulle en capture |
| `m31_chaleur_et_gouttiere.py` | part chaude, **gouttière** | + bandeau du comptoir 49,3 % ; − vide 0,0 % |
| `m32_balayage_coins_bords.py` | **balayage de CLASSE** : 7 blocs de la capture, 5 de la référence | + 4/5 blocs de la réf sortent « arrondi » |
| `m34_recap.py` | récapitulatif chiffré | — |
| `crop_file.png`, `crop_bas.png`, `crop_chrome.png` | juxtapositions à l'échelle 1:1 (référence au-dessus, capture au-dessous, séparateur magenta) | — |

**Deux pièges d'instrument rencontrés et corrigés, consignés parce qu'ils auraient produit des
findings faux :**
1. `m24` a d'abord annoncé un écart bulle→action de **109 px** contre 29. Faux : la bulle est un
   **dégradé**, et la repérer par la couleur de son haut amputait sa boîte de 75 px. Bbox refaite par
   le liseré (`m25`) ⇒ bas réel à y=1646, écart **37 px**, donc **fidèle**. Aucun finding n'en découle.
2. `m26` a d'abord donné « La ville » à 114×**34** px en référence : la fenêtre ramassait la **lueur
   du rail braise** au-dessus du texte. Fenêtre purgée (`m28`) ⇒ 114×**26**, et le témoin devient
   ÉGAL au lieu de faux-écart. C'est ce qui a évité d'écrire un M sur la taille des noms.
