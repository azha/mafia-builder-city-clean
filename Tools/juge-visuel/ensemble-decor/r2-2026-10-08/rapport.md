# Juge visuel ⊥ d'ENSEMBLE — décor E01-E11 + A01 — r2 — 2026-10-08

## Verdict : NON APPROUVÉ
**1 BLOQUANT, 8 MAJEUR, 11 MINEUR — 20 findings, comptés dans la table du §3 et nulle part
ailleurs** (la première rédaction de cette ligne annonçait 7 et 10 : le compte se prend dans la
table). Le chrome et la grammaire de page tiennent sur les douze ;
ce qui tombe, c'est la **matière** (les aplats bruns), la **voix en pied** (absente sur 5 écrans)
et, sur ⑮, **la moitié basse de l'écran, vide**.

## Contrôle positif — ce que l'instrument trouve ÉGAL
Sans cette liste, un instrument qui rendrait tout faux passerait pour sévère.

| # | grandeur | réf | jeu | script |
|---|---|---|---|---|
| 1 | hauteur de capitale d'« ARGENT » (12 écrans) | 17-20 px | 18 px | `01` |
| 2 | teinte de l'arc teal de la jauge ⑭ | 184,0° | 185,3° | `11` |
| 3 | chiffre cyan des compteurs ㊳ | RGB(127,212,217) | RGB(127,212,217) | `11` |
| 4 | encre du geste ㉝ E06 | (216,170,77) | (216,170,77) → **1/255** | `06` |
| 5 | encre du geste ㊵ E10 | (176,141,62) | (176,141,61) → **1/255** | `06` |
| 6 | encre du geste ㊳ E01 **contre le cadre 127** (état désactivé) | (122,131,141) | (122,131,141) → **0/255** | `06b` |
| 7 | encre du geste ㉞ E02 **contre le cadre 88** (état verrouillé) | (152,121,121) | (150,121,121) → 2/255 | `06b` |
| 8 | encre du geste ㉛ E05 | (217,171,78) | (206,162,77) → 11/255 | `06` |
| 9 | encre du geste ㉚ E03 | (217,171,78) | (202,159,77) → 15/255 | `06` |
| 10 |  ton du champ kraft ㉘ | (130,98,60) | (133,101,62) → ≤3/255 | `05b` |
| 11 | losange d'or sous le manomètre | 13/13 cadres | 12/12 planches | `08` |
| 12 | dock : 4 pastilles + barre d'or sur l'onglet juste | — | 12/12 | vue |
| 13 | ⑭ jauge : lunette d'or, arcs teal/or/rouge, aiguille, plaque TENSION, grille de rivets | présents | présents | vue |
| 14 | ⑤ carte, sceau rouge à losange d'or, jeton d'or « 1 » + LIBRE, échelles PORTÉE/URGENCE à 3 points | présents | présents | vue |
| 15 | empreintes : 35/35 planches conformes à `dossier.md` ; 54/54 références en 1080×2102 | — | — | `00` |

**Deux findings sont morts sur ce banc** : j'allais classer MAJEUR les gestes gris de ㊳ et mauve
de ㉞. Mesurés contre le **bon témoin** (cadres 127 et 88, états désactivé/verrouillé que la
maquette porte elle-même), ils tombent à 0/255 et 2/255. Témoin d'abord.

## 0. L'écran, tel que les maquettes le disent
Douze écrans, une seule maison. **Chrome** : bandeau haut (ARGENT à gauche, manomètre « CHALEUR »
au centre, JOUR + moment à droite), losange d'or dessous, dock à 4 pastilles en pied. **Grammaire
de page**, partagée par ㉞㉚㉘㉛㉝ : zone de titre (titre sérif crème à gauche, sous-titre gris,
filet), corps sur une **matière** (papier crème, kraft, liège, ardoise, feutre), **pied** = voix
d'un lieutenant en italique + barre de geste (or sur fond sombre, glose grise à droite *dans* la
barre). ㊳ et ㊵ ont leur propre grammaire : cadre d'or, titre d'or centré, trois compteurs cyan.
**Traits d'identité** : l'or, l'encre crème, le teal calme (183-185°), les capitales interlettrées,
et une matière différente par domaine. **Ordre de lecture** : titre → matière → geste en pied.

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?
Oui, à onze contre un. Le chrome est le même partout, la grammaire de page est respectée, l'or des
gestes est juste au pixel sur quatre écrans sur sept, et les deux écrans à cadre d'or (㊳, ㊵) sont
très fidèles. **Ce qui s'écarte ne s'écarte pas écran par écran : ce sont trois traits transverses.**

Le premier est la **matière**. Les bruns sont devenus des aplats : le kraft de ㉘ a perdu son cadre
(la maquette empile cadre → gorge → bande → dégradé sur 40 px, pas de 77/255 ; le jeu est plat à
1/255), le liège de ⑮ a perdu son grain et sa vignette (±17/255 → ±6/255). Les deux écrans de liège
ne se ressemblent même plus entre eux : ㉘ garde la grille de trous, ⑮ n'en a aucune. Le décor
cesse d'être une matière et devient un fond.

Le deuxième est la **voix**. Les maquettes mettent un lieutenant en pied sur six écrans ; le jeu
n'en garde qu'un (㉚), et encore sans son relief. Quatre écrans perdent leur phrase sans qu'aucun
assumé ne le couvre, et ⑮ perd sa ligne de pied. C'est la chose qui fait parler le jeu, et elle est
partie en silence.

Le troisième se voit au premier coup d'œil sur les douze : le **cadran du manomètre** est deux fois
trop petit dans sa lunette (arc à 52,3 % du rayon contre 92,7 %), et la lunette elle-même a maigri
de 41 %. On lit un anneau d'or avec un petit cadran dedans, pas un manomètre.

Reste ⑮, seul à ne plus se lire du tout : **49,2 % de la hauteur** est un champ de liège nu, dock
posé dessus, sans fiche, sans punaise, sans ligne de pied. L'état vide est assumé ; ce vide-là ne
se lit pas comme voulu, il se lit comme oublié.

## 3. Écarts — un finding par ligne

| id | écran | gravité | critère | écart | mesure | non vérifié |
|---|---|---|---|---|---|---|
| `F1` | `E09` | `BLOQUANT` | `INSTRUMENT NEUF` | La moitié basse de ⑮ est un champ de liège nu : ni fiche, ni punaise, ni ligne de pied ; le dock flotte dessus. L'état vide est assumé (n° 8) — ce **rendu** du vide ne l'est pas (avertissement n° 2 du dossier). | trou d'encre contigu **1180 px = 49,2 % de H** (y=1001..2181), idem à 1920. Plus grand trou **voulu** des cadres 31/33/34 : **24,5 %** (c33). Témoins négatifs c31=3,5 %, ⑭=3,0 %, ⑤=1,7 %. `04` | — |
| `F2` | `ENSEMBLE` | `MAJEUR` | `DOCTRINE` | **La voix en pied disparaît.** Les maquettes la portent sur 6 écrans ; le jeu ne la rend que sur ㉚. Perdue sans assumé sur **㉞, ㉘, ㉛, ㉝** ; ⑮ perd en plus sa ligne de pied « Quatre d'entre eux vous chassent — aucun ne dort » (c31). ㉓ est assumé (n° 13) et **proprement rendu** (aucun cercle vide). | 1 présente / 6 attendues ; 5 écrans touchés. `crops/pied_ref_vs_jeu.png` | si l'absence vient d'une donnée non servie : ㉚ et ㊳ nomment pourtant des lieutenants (Lt. Marr, Lt. Kane) |
| `F3` | `ENSEMBLE` | `MAJEUR` | `INSTRUMENT NEUF` | **La matière brune est un aplat.** ㉘ : le cadre du kraft a disparu. ⑮ : le liège a perdu grain et vignette. Et les deux désaccordent — ㉘ garde la grille de trous, ⑮ n'en a pas. | ㉘ bord du panneau, réf 4 bandes, pas max **77/255** sur 40 px → jeu **1/255**, plat (133,101,62). ⑮ texture réf p95=**17**/max 24, ramp 95→76 sur 28 px → jeu p95=**6**/max 7, 113→114. `05b` | — |
| `F4` | `ENSEMBLE` | `MAJEUR` | `INSTRUMENT NEUF` | **Le cadran du manomètre est deux fois trop petit dans sa lunette**, et la lunette a maigri. Sur les 12. | rayon de l'arc **92,7 % → 52,3 %** du rayon (≈32 % de l'aire) ; épaisseur de l'anneau **4,6 % → 2,7 %** du diamètre ; diamètre 194→184 px (0,948). Identique sur ㉚/㉛/㊵. `07` | ⑤ : mesure d'arc **invalide** (le décor « LE VERGE D'OR » entre dans la fenêtre) |
| `F5` | `E04` | `MAJEUR` | `INSTRUMENT NEUF` | À 2400, ㉘ n'a **aucune bande de pied** et 43,8 % de liège nu sous le panneau. À **1920 la bande et « ACHETER UN RELAIS » sont là** ⇒ l'assumé n° 1 couvre le geste, pas la bande. | trou **1050 px = 43,8 % de H** (y=1131..2181) contre **4,1 %** au cadre 54. `04` | pourquoi la bande existe à 1920 et pas à 2400 |
| `F6` | `E04` | `MAJEUR` | `DOCTRINE` | La fiche crème « D'OÙ ÇA PART » **répète le titre de l'écran** (« Pas encore de relais. » deux fois). La maquette y met la source (« Atelier Vesk — Hautes-Marches, îlot 412 »). Se lit comme un libellé de repli. | 1 chaîne, 2 emplacements, cadre 54 | — |
| `F7` | `E11` | `MAJEUR` | `INSTRUMENT NEUF` | **Le geste principal change de famille** : barre d'or à encre brune → barre crème à encre brique. Et le **jeu se contredit** : la même carte, tranchée depuis ④, garde une barre **d'or remplie à encre sombre**. | remplissage (173,138,60) → (216,202,167) ; encre (72,56,19) → (147,64,42) ; **écart 67/255**. ④ tête : barre d'or, encre sombre. `06`,`10` | un seul cadre pour ⑤ (c04) : pas d'état témoin |
| `F8` | `E11` | `MAJEUR` | `INSTRUMENT NEUF` | **Le liseré d'or en haut du tapis de feutre est absent**, aux deux résolutions. Le feutre démarre à cru contre le décor. | maquette : **8 px de (176,141,62)** juste au-dessus du bord, sur **28/28** colonnes de bord. Jeu 2400 : **1/28**, au-dessus = le décor (77,76,71). Jeu 1920 : **0/28**, au-dessus = le ciel (58,79,101). `10b` | — |
| `F9` | `E01` | `MAJEUR` | `DOCTRINE` | **Le premier écran du journal est trois fois la même phrase** : « <Journal> publie la dépêche : un pâté de maisons bruyant », même quartier (Marne-Basse), même étiquette (ANGLE HUMAIN), trois titres différents. Le cadre 125 donne un titre concret + trois brèves distinctes. L'écran sert à « prendre la température de la ville ». | 3/3 titres de la 1ʳᵉ planche sur le même gabarit et le même sujet ; 1/3 sur la planche `_bas` | si d'autres sujets existent plus bas dans les 18 |
| `F10` | `ENSEMBLE` | `MINEUR` | `INSTRUMENT NEUF` | Le **filet d'or** du bandeau, propre à la maquette d'**accueil**, est dessiné sur les 12. Les 11 cadres de série 6 n'en portent pas. Cas miroir d'un « élément absent » ; défendable comme unification du chrome. | maquettes **2/13** (A01 c4, c5) ; jeu **12/12**, y=141-142. `08` | l'intention : un chrome unique ou un report |
| `F11` | `ENSEMBLE` | `MINEUR` | `INSTRUMENT NEUF` | **classe C** — interlettrage des capitales du bandeau réduit. | « ARGENT » (mêmes 6 glyphes) largeur/hauteur de capitale **6,71 → 5,94**, soit **−11,4 %** ; hauteur de capitale égale à 1 px. « JOUR » écarté : « JOUR 12 » vs « JOUR 1 », pas la même clé. `01` | — |
| `F12` | `ENSEMBLE` | `MINEUR` | `DOCTRINE` | **Deux apostrophes coexistent**, parfois sur le même écran : ㉝ rend « l'instant. » (typographique) et « c'est » (droite) ; ⑮ rend « n'a ». | zooms `crops/apo_e06_linstant.png`, `apo_e06_cest.png`, `apo_e09.png` | le compte exact sur les 35 planches (pas d'OCR) |
| `F13` | `ENSEMBLE` | `MINEUR` | `INSTRUMENT NEUF` | Un **vert** entre dans la palette là où la série n'a qu'un **teal**. | teal de la série **183,3-185,3°** (arc de jauge, compteurs) ; vert de ㉛ « EN PLACE » + cadre, et du « 0 » de ㉝ : **141,9°** — **41,4° d'écart**. `11` | aucun homologue : ni ㉛ ni ㉝ n'ont ce composant au cadre |
| `F14` | `E09` | `MINEUR` | `INSTRUMENT NEUF` | Le bandeau crème « BPD · REGISTRE DE DISPATCH » va **bord à bord** et ses **œillets de classeur sont coupés en deux** par les bords de l'écran. | œillets visibles x≈10-30 et 1050-1070, tronqués, aux deux résolutions | — |
| `F15` | `E09` | `MINEUR` | `DOCTRINE` | « 18 DISTRICTS · TOUT OU RIEN… » passe **sous** les petits textes crème des maquettes de ⑮. | **3,17:1**, contre 3,90 / 3,97 / 4,15 / 4,77:1 pour les petits textes crème des cadres 31 et 33. `09` | ⚠ mon instrument lit **bas** : il met un texte de maquette à 2,26:1 alors que l'atelier annonce 4,5:1 au vert ⇒ chiffres **relatifs**, pas opposables au seuil |
| `F16` | `E03` | `MINEUR` | `INSTRUMENT NEUF` | La voix perd son relief : la maquette met « **Lt. Kane :** » en gras crème puis la citation en italique bleu-gris ; le jeu rend toute la ligne en un gris italique uniforme. | `crops/pied_ref_vs_jeu.png` ligne 3 | la famille de fonte exacte depuis une image |
| `F17` | `E10` | `MINEUR` | `INSTRUMENT NEUF` | Le geste est **fer à gauche** et sa glose est **sortie de la barre**. Troisième traitement du même composant : ㉚/㉛/㉝ la mettent *dans* la barre à droite, ㊵ dessous, le cadre 140 n'en a pas et centre « INJECTER ». | 3 dispositions pour 1 composant | — |
| `F18` | `E02` | `MINEUR` | `INSTRUMENT NEUF` | Le bouton « Poser un ordre » est un rectangle gris pâle, angles vifs, sans bord, en casse de phrase, **libellé sur 2 lignes**, posé sur la 1ʳᵉ ligne du carnet crème. Aucun cadre ne le porte. | planches ㉞ 2400 et 1920 | aucun cadre témoin |
| `F19` | `E07` | `MINEUR` | `INSTRUMENT NEUF` | « Marks » est répété sur **chaque** pastille de prix (6) et sur le badge ; la maquette n'y met que le nombre (« ⊤ 50 »). | 7 occurrences contre 0 au cadre 98 | — |
| `F20` | `E11` | `MINEUR` | `INSTRUMENT NEUF` | Le sur-titre « CE QUI PÈSE LE PLUS… » **quitte le tapis pour entrer dans la carte** (d'or centré sur le feutre → rouge sombre, fer à gauche, sous « TACTIQUE ») ; la carte est en outre **inclinée** là où le cadre la pose droite. | cadre 04 vs planche ⑤ | — |

**Assumés vérifiés « rendus proprement »** : n° 1 ㉘ état sans relais (geste absent à 2400, présent
à 1920 — conforme) · n° 6/8 états vides ⑭ et ⑮ (⑭ propre ; ⑮ **non**, voir `F1`) · n° 7 les deux
libellés de repli de la jauge ⑭ sont en français, bien placés, lisibles · n° 10 ㊵ le panneau-trou
est bien le parti pris du cadre 140, et il porte sa phrase centrée · n° 11/12 ⑤ carte fabriquée, et
le geste « laisser sur le tapis » retiré **sans laisser de trou** (une ligne grise le remplace) ·
n° 13 ㉓ Wexler absent **proprement** : aucun cercle de portrait vide · n° 15 valeurs du HUD.

**Un point à l'avantage du jeu** : le cadre 125 affiche des clés techniques (`news.beat.body_found`),
le jeu ne les affiche pas. Le cadre 98 affiche des sous-titres anglais (« Callsign Color Pack »,
« Extra Save Slot ») ; le jeu les a retirés. Les deux vont dans le sens de la doctrine.

## 5. Autres résolutions
**1920 jugé sur les 19 planches** (`crops/sheet_1920.png`), **2400 sur les 16**. Rien de coupé, rien
hors cadre, rien qui déborde de son parent à 1920 ; le reflux garde l'ordre de lecture partout.
Écarts **propres à une résolution** : `F5` (㉘ : bande de pied + geste présents à 1920, absents à
2400). ⑭ `_bas` à 1920 : la jauge est tronquée par le haut de la fenêtre de défilement — c'est le
défilement, l'ascenseur est visible ; je n'ai pas pu établir si le fondu annoncé par le `LISEZMOI`
est là. `F1` tient aux deux résolutions.

## 6. Non vérifié
1. **Animation** — captures T / T+1 s non prises (dossier). Rien à en dire.
2. **Contraste absolu** — mon instrument lit ~0,5 à 1,0 point sous celui de l'atelier (il trouve un
   texte de maquette à 2,26:1 et les petits textes crème des cadres à 3,90-4,77:1 là où la garde
   annonce 4,5:1 au vert, parce que la médiane de l'encre inclut le crénelage). ⇒ `F15` est **relatif**.
   *Mesure qui trancherait* : passer la garde de contraste de l'atelier sur les planches du jeu.
3. **« budget coupé »** (assumé n° 9) — **introuvable sur les deux planches ⑮**, à 2400 comme à 1920.
   La question de lisibilité qui m'était posée reste donc ouverte. *Mesure* : une capture de l'état
   où la colonne de 52 px est peuplée.
4. **㉘ sous-titre à 2 phrases → 1** (assumé n° 2) — seul l'après-chargement est capturé.
5. **A01 contre le cadre 4** — le `journal.tsv` dit que la ligne haute du cadre 4 a été refaite au
   master `7d88a65` (424 → 506, raison + « Plusieurs attendent encore »), mais le PNG fourni est le
   rendu d'un tour antérieur et montre encore la forme à 2 lignes. La planche suit l'intention écrite,
   pas l'image. ⇒ **ARBITRAGE**, pas un écart. *Mesure* : re-rendre le cadre 4 au master courant.
6. **Familles de fonte** — indécidables depuis une image (`F16`). *Mesure* : `fc-match` côté client.
7. **Soulignés pointillés** des cadres A01 4 et 5 (sous « LA SUITE », les titres de rangée, les
   libellés de bouton) : absents en jeu. Je ne sais pas si c'est un trait de maquette ou un repère
   de l'atelier ⇒ non classé.
8. **㊳ `F9`** — je n'ai vu que 6 des 18 brèves ; les 12 autres peuvent être variées.
9. **⑤ rayon d'arc du manomètre** — fenêtre polluée par le décor, écarté de `F4`.

## Annexes
1. Inventaire de la référence — §0 ci-dessus + fiches par matière dans les sorties de `03`-`05`.
2. Inventaire de la capture — `crops/sheet_1920.png`, `crops/bande_sous_hud.png`,
   `crops/pied_ref_vs_jeu.png`, `crops/e09_jeu_bas.png`, `crops/e04_jeu_bas.png`, `crops/manometre.png`.
3. **Correspondance des repères** : les deux familles font **1080 px de large à ×3,6** ⇒ X directement
   comparable, 1 px CSS = 3,6 px d'image des deux côtés. **Aucune comparaison en Y absolu** : toute
   grandeur verticale est en **% de la hauteur de l'image**. Les références portent un **fond de page
   de l'atelier RGB(58,67,86) en x=0..4**, hors du corps du téléphone — tous les scripts le sautent
   (`rect_utile`) ; c'est lui qui avait fait lire « bord clair » sur les 12 au premier essai.
4. **Scripts** — `mesures/00_instrument.py` (empreintes, tailles) · `01_hud_argent.py` ·
   `02_gouttiere_et_vide.py` (**abandonné** : contrôle faux) · `03_trous_et_bords.py` (**abandonné** :
   mesurait la planéité, confondue avec la matière) · `04_trous_encre.py` · `05_e04_e09_panneaux.py` ·
   `06_cta.py` · `07_manometre.py` · `08_filet_et_losange.py` · `09_contraste.py` · `10_carte_du_jour.py`.
   Chacun imprime la taille des images qu'il ouvre et porte ses contrôles.

### Ce que l'instrument a dû corriger (gardé exprès)
- `02` donnait « bord clair 257/257 » sur **les 12** références : il lisait le fond de page de
  l'atelier. Résultat uniforme ⇒ il mesurait autre chose.
- `03` mesurait un trou par la **planéité** : le liège de la maquette porte ±24/255 de grain, celui du
  jeu ±7 ⇒ le chiffre était confondu avec la matière. Refait sur l'**encre** (seuil 40/255) en `04`.
- `05` annonçait « marge 0 » sur le kraft encadré du cadre 54 : le prédicat prenait le cadre pour le
  champ. Remplacé par la lecture du **profil de couleur** au bord du panneau.
- `07` a donné un rayon d'arc aberrant sur ⑤ : le décor éclairé entre dans la fenêtre ⇒ écarté.
- `10` a « trouvé » un liseré d'or sur ⑤ à une ordonnée **fixe** : épaisseur médiane 106 px —
  c'étaient les fenêtres éclairées du décor. Refait en localisant le bord du feutre.
- `10b` v2 localisait ce bord sur la colonne **x=540, que la carte couvre à 1920** : il plaçait le
  bord à 70,6 % de la hauteur contre 43,4 % à 2400 — impossible — et concluait « liseré présent à
  1920 ». Corrigé en v3 : bord lu sur deux colonnes que la carte ne couvre jamais (x=40 et x=1040),
  qui doivent s'accorder. **Le finding a changé de contenu entre v2 et v3** : il ne vaut pas
  « absent à 2400 seulement » mais « absent aux deux résolutions ».
