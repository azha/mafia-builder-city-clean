# Juge visuel ⊥ — ㊲ LA RÉPUTATION (`screen_b3`) — r4 — 2026-08-31

Référence d'autorité : `reference/m-120.png` (état VIERGE, 900×1752, ×3,0).
Captures : `Assets/Screenshots/screen_b3_reputation_1080x1920.png` (×3,6),
`…_1080x2400.png`, `…_1080x1920_t1s.png`.
Toutes les grandeurs de ce rapport sont **en px CSS** (réf ÷3,0 ; jeu ÷3,6) ou en
**% du parent** ; aucune comparaison en px bruts. Correspondance des repères : annexe 3.

---

## Verdict : NON APPROUVÉ — (vocabulaire orchestrateur : **REFUSÉ**)

Ce qui bloque : à la résolution cible 20:9, **un tiers de l'écran est un trou noir** —
toute la hauteur supplémentaire tombe dans le seul bloc élastique, sous la carte du
portrait ; s'y ajoutent quatre écarts MAJEURS (l'enseigne du titre absente, un halo
teal en bas du panneau, le reflet du miroir occulté et 1,6× trop fort, et deux des
cinq traits du portrait — montre et revers — perdus ou remplacés).

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

| # | grandeur | réf | jeu | script |
|---|---|---|---|---|
| 1 | largeur intérieure du panneau racine | 287,0 CSS | 289,2 CSS (+0,8 %) | 03 |
| 2 | or du liseré du panneau racine | (176,141,62) | (176,141,61) | 02 |
| 3 | or des glyphes de « Le miroir » | (242,201,107) | (242,201,106) | 18a |
| 4 | filet doré sous le titre, sous le haut du panneau | 58,3 CSS | 56,4 CSS | 01/02 |
| 5 | largeur d'une tuile compteur | 85,7 CSS (29,8 % du panneau) | 86,5 CSS (29,9 %) | 12 |
| 6 | hauteur d'une tuile compteur | 31,0 CSS | 31,9 CSS | 02 |
| 7 | écart entre tuiles compteurs | 7,0 CSS | 6,9 CSS | 12 |
| 8 | liseré des tuiles | (42,54,72) | (42,53,73) | 04 |
| 9 | cyan des chiffres / hauteur du « 00 » | (127,212,217) / 10,7 CSS | (127,212,217) / 10,8 CSS | 14 |
| 10 | largeur de la carte du portrait | 117,0 CSS | 117,1 CSS | 03 |
| 11 | écart carte du portrait → colonne des voyants | 11,0 CSS | 11,1 CSS | 18b |
| 12 | écart entre deux tuiles voyants | 5,0 CSS | 4,9 CSS | 12 |
| 13 | pastille d'un voyant (couleur / diamètre) | (42,54,72) / 7,0 CSS | (42,53,73) / 6,7 CSS | 18c |
| 14 | bloc de texte d'un voyant (h × largeur d'encre) | 15,0 × 71,3 CSS | 14,7 × 71,1 CSS | 13 |
| 15 | hauteur de la plaque du verdict | 75,3 CSS | 73,9 CSS | 02 |
| 16 | hauteur du CTA | 25,3 CSS | 24,2 CSS | 02 |
| 17 | encre de « Le miroir » (h / largeur) | 13,3 / 115,7 CSS | 12,8 / 116,7 CSS | 13 |
| 18 | encre du CTA (h / largeur) | 8,0 / 169,7 CSS | 8,1 / 168,6 CSS | 13 |
| 19 | encre « SALVATORE, VOTRE LIEUTENANT » | 5,0 CSS | 5,0 CSS | 13 |
| 20 | encre « lieutenant.name — non projeté (L0.4) » | 5,0 / 93,3 CSS | 5,0 / 91,9 CSS | 13 |
| 21 | encre du titre du verdict / des 3 lignes du corps | 11,0 / 6,3-6,7 CSS | 10,8 / 6,7-6,9 CSS | 18d |
| 22 | chair du visage · triangle du col · plastron | (185,173,146) · (234,224,200) · (185,173,146) | identiques au pixel | 04 |
| 23 | teinte de la montre | (35,42,45) | (34,42,46) | 10 |
| 24 | épaisseur du reflet | 2,0 CSS | 1,9 CSS | 08 |
| 25 | fond des tuiles voyants (4 tuiles, même état) | (17,24,35) | (13,22,34) | 18c |
| 26 | gouttière intérieure du panneau racine | (15,21,30) | (16,23,32) | 04 |
| 27 | fond hors panneau, 10 relevés le long de la marge gauche | — | Δ ≤ 5/255 par canal | 05 |
| 28 | **stabilité T / T+1 s** | — | **1 pixel sur 2 073 600, Δ ≤ 8** | 06 |

Le point 28 vaut ruling : cet écran ne porte **aucune** animation (contrôle négatif du
comparateur : la même image décalée d'1 px rend 134 469 pixels différents).

---

## 0. L'écran, tel que la maquette le dit

**But.** « Le miroir » : on y vient lire ce que le lieutenant a *absorbé* des règles
qu'on lui a données. À l'état vierge (`m-120`), l'écran a un second but, plus délicat :
dire qu'il n'y a **rien** à lire, sans que ce vide se lise comme une panne — d'où
« Pas encore jugeable », « Rien n'a encore déteint », et le CTA « DONNER UNE PREMIÈRE
RÈGLE » qui donne la sortie.

**Ordre de lecture.** (1) « Le miroir » en or, dans son enseigne encadrée, en haut du
panneau — le plus gros, le plus contrasté ; (2) la rangée des trois compteurs, cyan sur
noir, qui donne le chiffre du jour (00 / 00·4 / 00) ; (3) le portrait du lieutenant dans
sa carte cerclée d'or — seul objet figuratif de l'écran, donc irrésistible ; (4) la
colonne des quatre voyants éteints à sa droite ; (5) la plaque du verdict ; (6) le CTA.

**Zones.** Chrome (bandeau ARGENT/HEAT/JOUR) — hors capture ; enseigne du titre ;
rangée des compteurs ; grand panneau « portrait + voyants » ; plaque du verdict ;
CTA. Le grand panneau est le cœur : c'est le miroir proprement dit.

**Traits d'identité.** (a) le tout-or sur bleu-nuit, un seul accent cyan pour les
chiffres ; (b) l'**enseigne** : le titre encadré et souligné d'un filet d'or ; (c) le
**reflet** — un trait cyan horizontal qui balaie *tout* le panneau, carte du portrait
comprise : c'est ce qui fait du panneau une surface réfléchissante et non une liste ;
(d) le **portrait** et ses cinq traits porteurs de données (buste, col, revers, montre,
gants) ; (e) un rythme vertical serré : rien ne flotte, chaque bloc touche presque le
suivant.

C'est la grille de gravité : ce qui casse (b), (c), (d) ou le rythme (e) pèse plus lourd
que des pixels.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Le squelette est juste et il l'est finement : le panneau racine, les compteurs, la carte
du portrait, la plaque du verdict et le CTA tombent tous à moins de 1,5 CSS px de la
maquette, avec les mêmes ors, le même cyan, les mêmes hauteurs de capitale. Le texte est
au bon endroit, à la bonne taille, à la bonne chasse. Un juge qui s'arrêterait au
gabarit signerait.

Mais l'écran ne se **lit** pas comme la maquette, pour trois raisons, dans cet ordre
d'impact.

**(1) Le rythme est cassé par le bas.** La maquette est un empilement serré ; le jeu
laisse, sous la carte du portrait, un vide de 85,0 CSS px en 16:9 et de **218,3 CSS px en
20:9** — contre 21,0 en maquette. Toute la hauteur ajoutée par le passage en 20:9
(+133 CSS) tombe dans ce seul endroit : le grand panneau devient un cadre presque vide
dont le contenu est tassé en haut. À la cible téléphone, ce trou fait 33 % de la hauteur
de l'écran et devient, en aire, le plus grand objet de la page. L'ordre de lecture change :
après le portrait, l'œil traverse un noir sans repère avant de retrouver le verdict, et
le CTA se retrouve seul, très bas. Le vide se met à dire ce que l'écran s'efforçait
précisément de ne pas dire — « il manque quelque chose », « ça n'a pas fini de charger ».

**(2) Le miroir ne réfléchit plus, il souligne.** En maquette le reflet traverse le
panneau entier en cloche, atténué et centré ; en jeu il est *nul* sur toute la carte du
portrait (surcroît 0,0 de x=118 à x=470) et n'apparaît qu'à sa droite, à +118,7 de
surcroît, en décroissance monotone. Résultat : un trait cyan vif collé sous la tuile
« col ouvert ». Un joueur ne lit pas un reflet, il lit un soulignement — une affordance
d'interface qui n'existe pas. Un trait d'identité converti en faux signal.

**(3) L'en-tête a perdu son enseigne et le bas a pris un halo.** Le cadre bleuté qui
entoure « Le miroir » et son sous-titre est purement absent (zéro saut de luminance sur
toute la bande) : le titre flotte. À l'autre bout, le fond passe de (20,27,29) à
(36,61,63) autour du CTA — deux fois plus lumineux, franchement teal, là où la maquette
est calme et neutre. La page gagne une lumière que la DA ne lui a pas donnée.

S'y ajoute, sur l'élément héros, la perte de deux des cinq traits du portrait : la montre
n'a plus d'aiguilles (aplat parfait) et les revers ont disparu, remplacés par un trait
horizontal clair qui n'est dans aucun état de la maquette.

Palette et densité : proches (annexes 1-2), la palette du jeu ne s'écarte que par
l'apparition du noir pur (13,13,13) à 19,8 % de l'aire du panneau — c'est le vide — et par
le halo teal du bas.

---

## 3. Écarts

| # | partie (id) | classe | réf | jeu | delta | script | note |
|---|---|---|---|---|---|---|---|
| E1 | `P.portrait.vide` — vide sous la carte du portrait, **à 1080×2400** | **BLOQUANT** | 21,0 CSS (10,0 % du panneau) | **218,3 CSS (54,7 % du panneau, 32,7 % de l'écran)** | ×10,4 | 18e | rapport interne, invariant d'échelle. La carte (y 435..1061) et tout ce qui est au-dessus sont **identiques au pixel** entre 1920 et 2400 : les +480 px du 20:9 vont intégralement là. Même cause que E2. |
| E2 | `P.portrait.vide` — le même, à 1080×1920 | MAJEUR | 21,0 CSS (10,0 %) | 85,0 CSS (32,0 %) | ×4,05 | 18e | le bloc élastique absorbe bien la hauteur ajoutée, mais **toute** au même endroit ; en maquette le mou est réparti. |
| E3 | `P.titre.enseigne` — cadre + fond de la plaque du titre | **MAJEUR / ABSENT EN JEU** | liseré (42,54,72) à x=43 et x=856, fond (12,18,28) | rien : 0 saut de luminance ≥ 4/255 entre le liseré doré du panneau et les glyphes, sur y=60 et y=120 | absent | 03, 07a, 18a | contrôles + (les tuiles compteurs, où le même détecteur trouve les liserés) et − (aplat) passés. Le filet d'or sous le titre, lui, est présent et à sa place. |
| E4 | `P.fond.halo` — halo teal au bas du panneau racine | MAJEUR | (20,27,29) L=25,7 V=+2,5 | (36,61,63) L=55,8 V=+11,5 | L ×2,2 ; verdeur +9 | 05, 18e | s'étend de y≈1680 au bas de l'image, cloche centrée sur l'axe (verdeur 12,0 au centre, 3,5 aux bords) ; identique en 1920 et 2400. Contrôle positif : le fond du HAUT est le même dans les deux images (V −1,5 / −2,0), donc l'écart du bas n'est pas un décalage global. |
| E5 | `P.portrait.reflet` — occultation par la carte du portrait | MAJEUR | traverse la carte (surcroît de luminance +9,9 à +63,5 sur x 102..382) | 0,0 sur x 118..470 | disparu sur 44 % de la largeur du panneau | 07b, 08, 09 | confirmé par deux instruments indépendants : le profil de surcroît ET le masque de silhouette (la réf a une rangée pleine largeur à 94 % de la carte, le jeu non). C'est un ordre de superposition : la carte est peinte **par-dessus** le reflet. |
| E6 | `P.portrait.reflet` — intensité et forme du profil | MAJEUR | cloche centrée x≈460 (centre du panneau), max +73,6 | décroissance monotone de +118,7 (bord droit de la carte) à +0,8 | max ×1,6 | 08 | même cause probable que E5 : le sommet du dégradé est masqué, ce qui laisse voir une rampe au lieu d'une cloche. L'épaisseur, elle, est ÉGALE (2,0 / 1,9 CSS). |
| E7 | `P.portrait.montre` — le cadran (aiguilles) | MAJEUR / ABSENT EN JEU | ellipse avec deux aiguilles claires lisibles (profil `@.=@@..` à y=78 % ; structure interne mesurée) | ellipse d'un aplat parfait (profil `@@@@@@`, aucun pixel plus clair à l'intérieur) | absent | 11, 17 | un des cinq traits porteurs de données (A7). La teinte du remplissage, elle, est ÉGALE. |
| E8 | `P.portrait.revers` — le V du veston sous le col | MAJEUR / ABSENT EN JEU | creux sombre central entre deux plateaux de veste, à y=74 % de la carte | plateau continu, aucun creux, à y=76 % (rangée homologue, juste sous la pointe du col) | absent | 17 | |
| E9 | `P.portrait.trait` — trait clair horizontal sous la pointe du col | MAJEUR / EN TROP | aucun (détecteur : « AUCUN ») | y=75,3 % de la carte, x 38,0 %..56,5 %, 69 px d'encre | en trop | 10 | n'existe dans aucun état de la maquette. Se lit, à 1:1, comme un soulignement égaré sur le buste. Probablement le rendu dégradé du même élément que E8. |
| E10 | `P.portrait.montre` — taille de l'ellipse | MINEUR | 13,3 × 8,0 CSS | 15,8 × 9,2 CSS | +19 % / +15 % | 11 | |
| E11 | `P.portrait.*` — centrage du portrait dans sa carte | MINEUR | axe à 49,85 % de la largeur de la carte (5 rangées concordantes) | axe à 47,3 % (5 rangées concordantes) | −2,55 % de la carte = −3,0 CSS | 09 | l'ensemble tête + buste + col est décalé du même montant : un seul conteneur en cause, pas cinq éléments. |
| E12 | `P.portrait.col` — taille du triangle | MINEUR | 16,5 × 16,4 CSS (14,4 % × 9,2 % de la carte) | 21,7 × 20,8 CSS (18,7 % × 12,1 %) | +31 % / +27 % | 09, 10 | **la forme reste un triangle** (aire/boîte 0,410 → 0,389 ; le dossier exclut 0,9) et il reste centré sur l'axe du cou : l'écart assumé tient. Mais le dossier dit que ce triangle « porte le signal ouvert/fermé par sa LARGEUR » — une largeur +31 % fausse l'échelle de ce signal dans les états non capturés. |
| E13 | `P.compteurs.fond` — dégradé du fond des tuiles | MINEUR | dégradé, amplitude 5,4 à 6,3 de luminance, (13,21,29) → (18,28,36) | aplat parfait (13,13,22), amplitude **0,0** | dégradé perdu | 15 | contrôle positif : la gouttière (aplat connu) donne 1,1 et 0,8 dans les deux. |
| E14 | `P.compteurs.fond` — teinte de l'aplat | MINEUR | médiane (14,22,30) — G−R = +8 | (13,13,22) — G−R = **0** | Δ vert 9/255 | 04, 15 | seul aplat de l'écran où le vert rejoint le rouge ; ailleurs la famille de teinte est tenue. |
| E15 | `P.voyants.tuile` — hauteur d'une tuile voyant | MINEUR | 27,3 CSS | 24,9 CSS | −8,8 % | 12 | les écarts entre tuiles, eux, sont ÉGAUX (5,0 / 4,9) : écart sélectif ⇒ la hauteur vient du contenu ou du padding de la tuile, pas de la liste. |
| E16 | `P.verdict.corps` — interligne du corps du verdict | MINEUR | 9,17 CSS (lignes à 1490, 1518, 1545) | 7,64 CSS (1540, 1567, 1595) | −16,7 % | 18d | la hauteur d'encre des lignes est ÉGALE : c'est l'interligne seul. |
| E17 | `P.portrait.panneau` — marge intérieure gauche et droite du grand panneau | MINEUR | 9,0 CSS de chaque côté | 7,1 CSS | −21 % | 18b | conséquence : les tuiles voyants font 131,1 CSS au lieu de 125,0 (+4,9 %). |
| E18 | `P.racine.padding` — marge basse du panneau racine (sous le CTA) | MINEUR | 8,7 CSS | 31,1 CSS | ×3,6 | 02 | deuxième endroit où part le mou, après E2. |
| E19 | `P.voyants.entete` — bloc d'en-tête de la colonne des voyants | MINEUR | 42,0 CSS (haut du panneau → 1re tuile), sous-titre sur 3 lignes | 34,4 CSS, sous-titre sur 2 lignes | −18 % | 03, 12 | le reflux est correct (rien n'est coupé) mais la 2e ligne « de vos règles » vient à ~1,5 CSS de la 1re tuile. |
| A1 | nom « Salvatore » non projeté | ASSUMÉ ✓ | — | mention présente, lisible, sous le verdict, encre 5,0 CSS (identique à la réf) | — | 13 | rendu proprement ; ne sort pas de l'assumé. |
| A2 | compteur ENFREINTES à « — » | ASSUMÉ ✓ | — | couleur **(127,212,217)**, identique aux deux « 00 » du jeu ; centré à 50,0 % de sa tuile comme le 1er ; milieu vertical à 12,5 CSS sous le bord haut contre 11,4 et 11,7 (Δ ≤ 1,1 CSS) | — | 14 | test conduit contre les « 00 » **du jeu**, seuls homologues valides. Le trou se lit comme un trou. Ne sort pas de l'assumé. |
| A3 | col rendu par un triangle plein | ASSUMÉ ✓ | aire/boîte 0,410 | 0,389 | — | 09, 10 | triangle confirmé, centré sur l'axe du cou, ne recouvre pas le cou. Voir E12 pour la taille, qui n'est pas couverte par l'assumé. |
| A4 | 4 couleurs hors `DesignTokens` | ASSUMÉ ⚠ | — | portrait, ors, cyan, liserés : identiques au pixel | — | 04 | l'assumé exige « aucune conséquence visible ». Vrai pour les quatre couleurs nommées ; **E4, E13 et E14 sont, eux, des conséquences visibles** et sont remontés à part. |
| A5 | reflet fixe, non animé | ASSUMÉ ✓ (position) | — | 1 pixel différent T/T+1 s ; présent ; à 23,5 % de la hauteur du panneau en 16:9 et 15,6 % en 20:9 — dans le tiers haut | — | 06, 08 | ne sort pas de l'assumé sur les deux conditions écrites (présence, tiers haut). L'occultation (E5) et l'intensité (E6) ne sont couvertes par aucune clause. |
| B1 | famille de police | ARBITRAGE | Georgia/Noto Serif au rendu de la maquette | police du client | hauteurs de capitale et largeurs d'encre ÉGALES à ±2 % sur 8 lignes mesurées | 13 | la famille ne se tranche pas depuis une image ; ce qui se compare — hauteur de capitale, chasse — est juste. Pas un défaut. |

---

## 5. Autres résolutions

**1080×2400 (cible téléphone).** L'inventaire du temps 2 tient **à l'identique au-dessus
du bloc élastique** : filets dorés à y = 18-20 et 222-229, carte du portrait à
(72..496, 435..1061), grand panneau ouvrant à 410 — les mêmes pixels qu'en 1920. Rien
n'est coupé, rien ne déborde, rien n'est hors cadre, le reflux garde l'ordre de lecture,
et le halo teal (E4) est mesuré identique. **Le seul écart propre à cette résolution est
E1** : les 480 px ajoutés vont intégralement dans le vide sous la carte du portrait
(786 px = 218,3 CSS), qui devient 54,7 % du grand panneau et 32,7 % de l'écran. C'est
l'écart le plus grave du rapport et il n'existe qu'ici, à pleine amplitude.

**1080×1920 à T+1 s.** Identique à T à 1 pixel près (Δ ≤ 8/255), en (389,162), dans la
frange d'anti-crénelage du sous-titre. Aucune animation ; le contrôle négatif du
comparateur discrimine (134 469 pixels sur un décalage d'1 px). Rien à signaler.

---

## 6. Non vérifié

1. **Tout ce que masque l'absence du chrome (A4 de la déclaration d'auteur).** Les
   captures n'ont ni bandeau ARGENT/HEAT/JOUR ni dock. Je ne peux donc pas vérifier :
   que le haut de l'enseigne ne passe pas sous le bandeau (en jeu le panneau racine
   commence à 5,3 CSS px du bord haut de l'image, contre ~130 CSS de chrome en
   maquette) ; que le CTA ne touche pas le dock ni ne passe sous lui ; que le halo teal
   (E4) n'est pas, en partie, la zone que le dock recouvrirait — il déborde toutefois
   jusqu'à ~60 CSS px *au-dessus* du bas du panneau racine, donc au moins une partie est
   dans le cadre. **Ce qui trancherait : une capture montée dans le shell.**
2. **Les gants**, cinquième trait déclaré du portrait. Je n'en distingue aucun, ni dans
   `m-120`, ni dans la capture : le buste est coupé au-dessus des mains dans les deux.
   Je ne peux ni confirmer ni infirmer. **Ce qui trancherait : un état où les mains sont
   visibles, ou la définition SVG du trait.**
3. **Les états `drifting` / `hostile` / `wary` / liste pleine** (A5 déclaré). Je juge ce
   qu'on me montre : un seul état. En particulier, E12 (col +31 %) ne peut pas être
   évalué pour ce qu'il compte vraiment — l'échelle du signal ouvert/fermé — sans une
   capture d'un col *fermé* à comparer. **Ce qui trancherait : une capture de l'état
   `drifting` ou un seed.**
4. **La famille de police.** Non déterminable depuis une image. Classée ARBITRAGE (B1) ;
   les grandeurs comparables sont ÉGALES. **Ce qui trancherait : `fc-match` sur la CSS de
   la maquette contre la police embarquée du client.**
5. **La cause du halo teal (E4)** — vignette, halo de bouton, lumière de fond ou fuite
   d'un autre élément : je constate le pixel, pas l'objet. Il est identique aux deux
   résolutions, ce qui exclut un artefact de capture.
6. **L'aire de la silhouette du portrait.** Mon masque « silhouette » (écart > 8/255 au
   fond de la carte) est à la limite de la teinte du buste en maquette ((22,25,27) contre
   un fond (17,24,35) : écart maximal exactement 8) ; les chiffres d'aire (13,9 % contre
   21,1 %) mesurent donc mon seuil autant que le dessin, et je ne les retiens pas. Les
   profils de largeur par rangée, eux, sont stables et sont ce sur quoi E11 s'appuie.
7. **Le dégradé de fond du panneau racine sous le CTA** est confondu avec E4 : je ne peux
   pas séparer un éventuel dégradé légitime du halo.
8. **La cohérence du dossier.** Aucun champ « à remplir » trouvé ; le dossier est
   instruisable tel quel. Un point mérite d'être relevé pour le prochain tour :
   `angles-morts-declares.md` déclare A3 (« les espacements à l'écran ») **fermé** par la
   garde `B3S4`, en précisant lui-même que celle-ci ne mesure ni la répartition à
   l'intérieur du contenu, ni les espacements entre blocs. E1, E2, E16, E17, E18 et E19
   tombent tous dans cet interstice. La garde est verte et le rendu est faux — exactement
   le scénario que la déclaration disait s'être déjà produit une fois.

---

## Annexes

### Annexe 1 — Inventaire de la référence `m-120.png` (fiches abrégées)

Origine des `y` : bord haut intérieur du panneau racine (y=377 px réf). Unité : CSS.

| id | catégorie | parent | y (CSS) | h (CSS) | remplissage | bord | texte |
|---|---|---|---|---|---|---|---|
| `P` | panneau racine | écran | 0 | 451,0 | (15,21,30) | or (176,141,62), 1 CSS | — |
| `P.titre` | enseigne | `P` | 8,0 → ~57 | ~49 | (12,18,28) | liseré (42,54,72) 3 côtés, filet d'or (176,141,62) 2 CSS en bas à 58,3 | « Le miroir » or (242,201,107), capitale 13,3 ; sous-titre capitales 4,7 (2 lignes) |
| `P.cpt1..3` | tuiles compteurs | `P` | 69,3 | 31,0 | **dégradé** (13,21,29)→(18,28,36) | liseré (42,54,72) | « 00 » cyan (127,212,217) cap. 10,7 ; libellé cap. ~4,3 |
| `P.portrait` | grand panneau | `P` | 110,3 | 210,7 | (9,11,11) | liseré (42,54,72) | — |
| `P.portrait.carte` | carte | `P.portrait` | 118,7 | 181,7 | (17,24,35) | or (176,141,62) | « SALVATORE… » cap. 5,0 ; « Il vous écoute » vert cap. 7,3 ; mention cap. 5,0 |
| `P.portrait.reflet` | trait | `P.portrait` | ~176 | 2,0 | cyan, surcroît max +73,6 au centre du panneau, en cloche de x≈70 à x≈850 px | — | — |
| `P.voyants.1..4` | tuiles | `P.portrait` | 152,7 + n×32,3 | 27,3 | (17,24,35) | liseré (42,54,72) | titre cap. 6,0 + sous-titre 5,3, bloc 15,0 |
| `P.verdict` | plaque | `P` | 331,0 | 75,3 | (16,23,34) | liseré (42,54,72) | sur-titre cap. 5,3 ; titre cap. 11,0 ; corps 3 lignes cap. 6,3-6,7, interligne 9,15 |
| `P.cta` | bouton | `P` | 416,3 | 25,3 | (22,25,27) | or (176,141,62) | capitales cap. 8,0, encre 169,7 de large |

**Couche globale (panneau racine, quantification 16 couleurs)** : (17,24,35) 20,2 % ·
(13,20,29) 12,5 % · (9,11,13) 10,4 % · (65,63,50) 8,7 % · (21,26,30) 7,7 % · (37,41,45)
7,0 %. Fond hors panneau : dégradé continu de (19,26,35) en haut à (20,23,22) en bas,
verdeur ≈ 0 partout.

### Annexe 2 — Inventaire de la capture `1080x1920` (fiches abrégées)

| id | y (CSS) | h (CSS) | remplissage | bord | note |
|---|---|---|---|---|---|
| `P` | 0 | **522,5** | (16,23,32) | or (176,141,61) | +71,5 CSS par rapport à la réf |
| `P.titre` | — | — | — | **aucun** | E3 : l'enseigne n'existe pas ; seuls le texte et le filet d'or subsistent, ce dernier à 56,4 |
| `P.cpt1..3` | 67,5 | 31,9 | **aplat (13,13,22)** | liseré (42,53,73) | E13, E14 |
| `P.portrait` | 108,6 | **265,6** | (13,13,13) | liseré (42,53,73) | E2 |
| `P.portrait.carte` | 115,7 | 173,1 | (13,22,34) | or | portrait décalé de −3,0 CSS (E11) |
| `P.portrait.reflet` | ~176 | 1,9 | cyan, **nul sur la carte**, +118,7 → +0,8 de gauche à droite hors carte | — | E5, E6 |
| `P.portrait.vide` | 190 → 375 | **85,0** | (13,13,13) | — | E2 ; 218,3 en 20:9 (E1) |
| `P.voyants.1..4` | 143,8 + n×29,8 | 24,9 | (13,22,34) | liseré (42,52,72) | E15 ; largeur 131,1 (E17) |
| `P.verdict` | 384,2 | 73,9 | (13,22,34) | liseré | interligne 7,64 (E16) |
| `P.cta` | 467,2 | 24,2 | (22,22,28) | or | encre 168,6 |
| `P.fond.halo` | ≈ 462 → bas | ~60 | (36,61,63) au centre | — | **EN TROP** (E4) |

**Couche globale** : (13,22,34) 23,2 % · **(13,13,13) 19,8 %** · (56,62,55) 10,9 % ·
(19,24,31) 7,3 % · (36,43,47) 7,2 % · (23,34,41) 7,2 %. Le second poste, à 19,8 %, est
le vide.

### Annexe 3 — Correspondance des repères

- Échelle : réf ×3,0 (900 px = 300 CSS) ; capture ×3,6 (1080 px = 300 CSS). Rapport
  capture/réf = 1,2. Toute grandeur de ce rapport est divisée par le facteur de son image
  **avant** comparaison.
- Origine verticale : bord haut intérieur du panneau racine — **y = 377 px** en réf,
  **y = 19 px** en capture. Conversion : `y_capture = 19 + (y_réf − 377) × 1,2`, valable
  jusqu'au haut du bloc élastique (vérifiée à ±1,5 CSS sur 5 repères : filet d'or,
  haut et bas des tuiles compteurs, haut du grand panneau, haut de la carte).
  **Au-delà du bloc élastique la correspondance est rompue** : on ancre alors sur le bas
  du panneau racine (réf 1730, capture 1900 / 2380).
- Origine horizontale : bord gauche intérieur du panneau racine — x = 19 px dans les deux.
  Largeur intérieure 287,0 CSS (réf) / 289,2 CSS (capture).
- Le chrome absent vaut ~130 CSS de décalage vertical : aucune position absolue n'est
  comparée à travers lui.

### Annexe 4 — Scripts

Dans `mesures/` ; chaque script imprime la taille des images qu'il ouvre et porte ses
contrôles.

| script | ce qu'il mesure | contrôles |
|---|---|---|
| `01_reperes.py` | liserés dorés, filets pleine largeur | + largeurs déclarées ; − aucune rangée dorée dans y<10 |
| `02_profils.py` | sauts de luminance le long d'une colonne (frontières des plaques) | − colonne hors panneau : 0 saut |
| `03_boites.py` | bbox des boîtes majeures, en px et CSS | + largeur du panneau racine = 287 ; − pas d'or sur la plaque du verdict |
| `04_couleurs.py` | médianes 7×7 sur 17 points homologues | + or du liseré ; − fond du grand panneau |
| `05_fond_palette.py` | fond hors panneau + palette quantifiée | + fond en haut identique ; − point intérieur diverge |
| `06_stabilite.py` | diff T / T+1 s | + image contre elle-même = 0 ; − décalage 1 px = 134 469 |
| `07_plaque_titre_et_reflet.py` | absence de l'enseigne ; rangée la plus cyan | + liserés des compteurs trouvés ; − aplat = rien |
| `08_reflet_profil.py` | profil et épaisseur du reflet | − même profil 200 px plus bas ≈ 0 |
| `09_portrait.py` | silhouette, asymétrie, profil de largeur, col | + col réf = 0,41 ; − fond pur = None |
| `10_traits_portrait.py` | montre, col, plastron, trait sous le col | + montre trouvée à gauche ; − 1,3-1,4 % à droite |
| `11_montre.py` | carte ASCII de la montre, étendue de luminance | + visage (aplat connu) ; − fond de carte : étendue 0,0 |
| `12_tuiles.py` | compteurs et voyants, largeurs/hauteurs/écarts | + 3 et 4 tuiles trouvées dans les deux ; − ligne du vide = [] |
| `13_textes.py` | hauteur et largeur d'encre par ligne | + « SALVATORE… » et « (L0.4) » à ±2 % ; − aplat = 0 bande |
| `18_complements.py` | (a) or des glyphes + balayage d'arêtes de l'en-tête ; (b) colonne des voyants et marges ; (c) les 4 voyants + pastille ; (d) lignes de texte au seuil 60 ; (e) halo teal + vide aux deux résolutions | + enseigne vue dans la réf aux deux y ; + arêtes dorées vues dans le jeu ; + 4 voyants identiques ; + bas de la carte au même y en 1920 et 2400 |
| `14_compteurs_et_degrade.py` | le tiret assumé contre les « 00 » | + les deux « 00 » identiques (Δ 0) |
| `15_degrade_tuile.py` | dégradé du fond des tuiles | + gouttière plate (1,1 / 0,8) |
| `16_halo_vert_et_2400.py` | verdeur du fond ; repères du 20:9 | + haut de l'écran identique ; − texte vert détecté |
| `17_revers_et_contour.py` | profils du buste (revers, contour, cadran) | + crête du plastron présente ; − rangée sous le buste plate |

Deux instruments ont été **écartés** après échec de leur contrôle : un masque de teinte
« chair » (il classait le texte crème du verdict comme de la peau) et un masque « gris
moyen » pour la montre (aire/boîte 0,06 : il ne délimitait rien). Leurs chiffres ne
figurent pas dans ce rapport. C'est aussi pourquoi l'aire de silhouette est écartée au
point 6 des non-vérifiés.
