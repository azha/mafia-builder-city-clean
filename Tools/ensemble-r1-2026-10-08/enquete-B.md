# Enquête B — juge d'ensemble r1 (08/10) — F12 F13 F4 (E11) · F8 F9 (E03) · F11 (E10) · F14 (E07)

Lecture seule : aucun fichier du dépôt modifié, ni Unity ni typecheck. Tête client : `7ba66394`.
Instruments : scripts `enquete-B-mesures/m_e11.py`, `m_card.py` (copies ; PIL seul, `python3 -I`) + scripts du juge
`mesures/06` et `mesures/07` rejoués tels quels.

## 0. Constat de méthode — le juge a pris le MAUVAIS cadre pour E11

`INDEX.md` ligne ⑤ : références `ecrans-brennar-4.html` cadres 4-8 **ET** `ecrans-brennar-6.html` cadres 4-8. Le dossier du juge n'a
donné que `decision-du-jour/reference-1080x2102.png` = **série 4, cadre 4** (zinc, AUCUN feutre, ligne « LAISSER SUR LE ZINC »).
Le décor de scène du client (`DecorsDeScene.cs:65-72`, DESIGN §4 ligne ⑤, INVENTAIRE ligne ⑤ « tapis-feutre ») suit la **série 6,
cadre 5** (feutre vert radial à 34 %). J'ai rendu ce cadre (`rendre-tel.py ecrans-brennar-6.html 4 … 3.6`, 1080x2102) :

```
$ python3 -I m_e11.py   (extraits)
IMAGE s6-idx4.png 1080x2102   feutre : lignes vertes y 732 .. 883 (carte par-dessus ensuite) ; haut du feutre = 732/2102 = 34,8 %
IMAGE reference-1080x2102.png (série 4)   feutre (lignes >50% vertes): y None .. None
IMAGE E11_DecisionDetail_1080x2400.png     feutre y 816 .. 1930 ; haut = 816/2400 = 34,0 %
```
⇒ **la matière feutre et sa position (34 %) sont FIDÈLES au cadre 5 de la série 6** : la partie « F5 / matière de fond » du juge
pour E11 (35,8 % de feutrine « que la maquette ne montre pas ») est un faux positif de RÉFÉRENCE (0,0 % mesuré par lui sur la
série 4). Le client mélange en revanche deux maquettes : décor et jeton de la série 6, kicker dans la carte + ligne « zinc » de la
série 4 (la série 6 a un titre doré « CE QUI PÈSE LE PLUS CE SOIR » hors carte et « LAISSER SUR LE TAPIS »). **À faire trancher par
f2 : quelle série fait foi pour ⑤** (les deux cartes sont identiques en forme : voir F13). Ce qui reste un défaut, F12/F13, ne dépend
pas de ce choix : la CARTE et la table de la série 4 et de la série 6 sont mesurées égales (627x757 px chacune).

## F12 — CONFIRMÉ (le vide existe ; ce n'est pas un état vide légitime)

Mesure (y compris contre la bonne référence) :

```
                              feutre vide (encre<1,5 %)         carte (crème)
série 6 cadre 5 (2102)        3 px de 151  = 2,0 %              y 883..1639  H=756  L=627  L/H=0,83
jeu 1080x2400                 616 px de 1114 = 55,3 % (y866..)  y 1501..1831 H=330  L=702  L/H=2,13
jeu 1080x1920                 300 px de 797  = 37,6 % (y702..)  y 1021..1351 H=330  L=702  L/H=2,13
```
Le feutre débute à 34 % partout (ok) ; ce qui est faux est ce qu'il y a DEDANS. Pas un état vide : l'écran est servi (carte
fabriquée, pas de sabot) ; la zone vide est du feutre qui n'a pas de contenu à sa taille.

**Cause racine (deux étages)**
1. Contenu trop court : la carte est paysage 330 px de haut au lieu de 757 (F13), la rangée « laisser » (130 px) est supprimée (F4), le
   titre doré de la série 6 n'existe pas : ≈ 600 px manquent au-dessus d'une pile alignée en bas.
   `DecisionDetailScreenController.cs:350-378` (carte), `:348-349` (table `LowerLeft`, `Bloc` ⇒ `childForceExpandWidth=true`).
2. Le support est **ancré par FRACTION** : `DecorDeScene.cs:664-669` `AncrerSousLaBande` ⇒ `anchorMax.y = 1 − Bande` ;
   appelé en `DecorDeScene.cs:361` ; `Bande = 0.34f` en dur `DecorsDeScene.cs:66`; le retrait haut du contenu est aussi une fraction :
   `ReserveDeBande.cs:31-34`. Or dans la maquette le feutre est `.tapis-feutre` dans `.panneau{margin-top:auto}` (série 6 l.206,240) :
   il ÉPOUSE son contenu, et le « 34 % » n'est qu'une mesure de ce contenu à 583 px CSS de haut. **Même classe que ㊴** (hauteur par
   fraction au lieu de hauteur du contenu).

**Risque calculé (non mesuré en jeu)** : la pile portrait de la maquette mesure ≈ 1 262 px (haut du feutre 732 → bas de la plaque ≈ 2 048
sur 2102, moins 54 px) ; bas réservé par le shell ≈ 279 px (planches : bas de plaque à 2121/2400 et 1641/1920). À 2400 : 1584 − 279 = 1305
≥ 1262 ⇒ le vide tombe à ≈ 43 px (≈ 3 %, comme les 2 % de la maquette). **À 1920 : 1920×0,66 − 279 = 988 < 1262 ⇒ −274 px** : restaurer
seulement le contenu ferait déborder la carte au-dessus du feutre. D'où le correctif en deux temps.

**Correctif proposé** (effort M)
```
# 1. F13 + F4 d'abord (contenu fidèle) — voir plus bas.
# 2. le support suit le contenu (pas de fraction) — DecorDeScene.cs / ReserveDeBande.cs
-  AncrerSousLaBande(supRt, spec.Bande);                       // :361
+  if (spec.SupportEpouseLeContenu) { /* ancrage posé par ReserveDeBande à chaque changement de rect */ }
+  else AncrerSousLaBande(supRt, spec.Bande);
# ReserveDeBande.Maj() (:27-39), branche SupportEpouseLeContenu :
+  float hContenu = LayoutUtility.GetPreferredHeight((RectTransform)pile.transform) - pile.padding.top - pile.padding.bottom;
+  float hautSupport = h - pile.padding.bottom - hContenu - margeHaut;          // bord haut du feutre, en unités
+  pose.Support.anchorMax = new Vector2(1f, Mathf.Clamp01(hautSupport / h));
+  retrait = Mathf.RoundToInt(ShellChrome.TopInsetPx + margeHaut);               // plus Bande×h : la barre seule
# DecorsDeScene.cs:65-72 : ⑤ déclare SupportEpouseLeContenu = true (Bande 0.34 reste la valeur MESURÉE, plancher de test D4).
```
Garde à ajouter (D4) : aux deux résolutions, 0 ligne vide > 8 % de la hauteur du feutre ET le haut de la carte sous le haut du feutre.
Alternative S (si f2 refuse le nouveau champ) : `Bande` de ⑤ = max(barre, 1 − contenu/H) calculée au montage — fragile, non recommandée.

## F13 — CONFIRMÉ (4 écarts, 4 causes dans UN contrôleur)

| écart | mesure | cause (fichier:ligne) |
|---|---|---|
| carte paysage au lieu de portrait | jeu L=702 H=330 (2,13) ; maquettes (série 4 ET 6) L=627 H=757 (0,83) ; 627 px / 3,6 = 174 CSS ≈ `.carte-or{width:176px;min-height:212px}` | `DecisionDetailScreenController.cs:378` `carte.AddComponent<LayoutElement>().flexibleWidth = 1f` : la carte prend TOUTE la largeur que le jeton laisse ; aucune largeur propre, aucune hauteur minimale ; `:348-349` table `LowerLeft` + `Bloc` (`childForceExpandWidth = true`, `:519`) |
| PORTÉE / URGENCE en lignes, pas en colonnes | maquette : `.bandes{display:flex;justify-content:space-between;border-top:1px solid #93402c44}` ; `.bande{flex-direction:column}` (libellé, pips, valeur empilés) | `:462-489` `BandeDePips` : `Bloc(…, horizontal: true)` (`:464`), libellé + pips + valeur sur UNE ligne ; les deux bandes empilées par `:395-396` |
| cachet de cire absent | px rouge vif (R>170, G<70, B<60) : jeu **0**, maquette série 6 **307**, série 4 **310** | jamais construit (git : 0 occurrence dans les 12 dernières versions du fichier) ; `:382` n'en pose que le « ♦ » texte du coin. La recette existe : `mafia-builder-city-clean/Tools/juge-visuel/decision-du-jour/spec-cachet-et-jeton.md` (F13). `DECISION-F4-F5-2026-10-07.md` l'avait rangé « classe C, non posé » : sous le ruling du 07/10 (élément absent = A/B) ce classement ne tient plus |
| jeton sans tranche moletée | écart-type de la couronne à 0,44·D : maquette **41,8**, jeu **30,9** (le lisse seul du dégradé en fait déjà 31 : l'écart-type n'est pas discriminant ici ; l'image l'est : vignette comparée, disque plat vs anneau de crans blancs) | `:408-409` `ProceduralUI.RadialDisc(Px(40), #f2d9a0, #7a5a14)` seul ; recette `spec-cachet-et-jeton.md` F15 : `border:2px dashed #fff5` + `inset 0 0 0 3px #b08d3e` + ombre ; aucun primitif « disque à tiretés » dans `ProceduralUI` (seul `RoundedRectDashedOutline`, rectangulaire, `ProceduralUI.cs:634`) |

Aussi : titre non gras (`:390` `Texte(… hudSerifFont)` sans `FontStyles.Bold` ; maquette `font-weight:700`), centré dans le vide de la carte
(`margin:auto`), filet `border-top` au-dessus des bandes : tous dans le même corps de `Construire`.

**Correctif proposé** (effort M ; jeton moleté = primitive neuve, le reste S)
```
# :348-349  table centrée, largeur propre
-  table.GetComponent<HorizontalLayoutGroup>().childAlignment = TextAnchor.LowerLeft;
+  var ht = table.GetComponent<HorizontalLayoutGroup>();
+  ht.childAlignment = TextAnchor.LowerCenter; ht.childForceExpandWidth = false; ht.spacing = Px(14f);
# :378
-  carte.AddComponent<LayoutElement>().flexibleWidth = 1f;
+  var lc = carte.AddComponent<LayoutElement>();
+  lc.minWidth = lc.preferredWidth = Px(176f); lc.flexibleWidth = 0f; lc.minHeight = Px(212f);
# :390-393 titre : lc.flexibleHeight = 1 ; alignment = MiddleCenter ; fontStyle |= Bold ; padding haut Px(24f)
# :395-396 BandeDePips -> colonne : Bloc("Bandes", horizontal:true) + deux Bloc vertical (libellé / pips / valeur), JustifyContent = espace entre ;
#          filet haut 1 px Rouge@0.27 (Filets.Poser, jamais un Image à la main : garde D6b)
# cachet (nouveau, ignoreLayout, enfant de `carte`, APRÈS le fond) :
+  Cachet(carte.transform);   // 36 CSS, RadialDisc(Px(36), #c9432c, #7a1f12) + Ring #8a2a18 3 CSS + « ♦ » hudMoneyGold 13 CSS,
+                              // rotation −12°, ancre haut-droite, décalage (+10, +14) CSS HORS carte ; alphas convertis en linéaire (cf. spec §espace colorimétrique)
# jeton moleté (nouveau) : ProceduralUI.DisqueMolete(int d, Color centre, Color bord, Color tranche, int tiretPx)
#   = RadialDisc + anneau de tirets blancs α0,333 convertis (couleur déplacée, opacité gardée) ; remplace :408-409
```

## F4 — CONFIRMÉ comme écart de maquette ; RETRAIT DÉLIBÉRÉ ; arbitrage produit, pas du code

- La route existe et vit : `POST /v1/session/hl-card/:id/skip` (`hl-card.service.ts:238`, marque `skipped`, `decisions_made++`, 409 si la
  carte n'est pas `active`) ; client `HlCardClient.Skip` ; `HighestLeverageCardController.RequestSkip` (`:223`) vit mais **aucun geste ne l'appelle**.
- Retiré exprès : commit `2b56310b` (f2 08/10 nuit, « option (c) »), en-tête `DecisionDetailScreenController.cs:15-17` et `:436` : « geste MORT —
  200, puis rien — et le back ne sert aucune carte suivante (la carte sautée est reportée telle quelle) ; écart à la maquette ASSUMÉ par f2, à
  consigner au dossier de ⑤ ». **Il n'a pas été consigné** au dossier du juge (tableau « assumés » : 11 lignes, aucune sur ce geste) ⇒ le juge
  l'a compté BLOQUANT à bon droit.
- Donc : (a) **action process** : inscrire « ⑤ geste « laisser sur le zinc/tapis » retiré, f2 08/10 (c) » aux écarts ASSUMÉS du dossier, et corriger
  la phrase du dossier (« la trancher ou la passer ») ; (b) **arbitrage produit à remonter** : rétablir le geste avec une conséquence visible
  (la ligne « mise de côté » de l'option (a)) = lot client + atelier ; ou faire retirer la ligne de la maquette (série 4 ET 6 la dessinent). Aucun correctif de code
  proposé ici. Effort : L si (a)-rétablir (état « mise de côté » à dessiner), S si on amende la maquette.

## F8 — CONFIRMÉ

```
$ python3 -I mesures/06-contraste.py   (extraits E03)
E03 libelle "A QUOI CA SERT" (gris sur creme)   encre L=0.4228 fond L=0.7497  => 1.69:1
[REF] E03 libelle "A QUOI CA SERT"              encre L=0.1377 fond L=0.8036  => 4.55:1
```
Recalcul indépendant de la couleur CODÉE : `#b9ad92` (`hudCremeSecondary`) sur la plaque jeu (234,224,200) = **1,69:1 exactement**. Ce n'est donc pas
l'anticrénelage : c'est la teinte.

**Cause** : `ChaineDApproScreenController.cs:792` `CremeSecondaire => hudCremeSecondary` (jeton pensé pour le fond SOMBRE, le token appartient à la fiche sombre
de l'écran principal : le commentaire `:785-790` le dit) réutilisé comme encre de libellé sur PAPIER : `:501` (libellés de ligne) et `:438`
(« BON DE COMMANDE »). Maquette (`ecrans-brennar-6.html:4543-4545`) : `.bon h4 span` `#6f6656`, `.bon .l u` `#726552`.
**Correctif** (S) :
```
+  private static Color EncreFaibleDuBon => Hex("#726552");   // `.bon .l u` ; 4,62:1 sur #efe7d6, 4,32:1 sur la plaque actuelle (234,224,200)
-  … 7.5f, CremeSecondaire, false);  // :501        +  … 7.5f, EncreFaibleDuBon, false);
-  … 8f,   CremeSecondaire, false);  // :438        +  … 8f,   Hex("#6f6656"), false);
# et, pour franchir 4,5:1 sur la plaque, la plaque à la maquette (F23, classe C mais elle porte le seuil) : :748  Image.color = Creme → Hex("#efe7d6")
```
Vérifier la garde TD-612 (littéraux ≥ 4 d'un jeton : aucun jeton proche, d'après `teintes.json`, à re-lire avant commit).

## F9 — CONFIRMÉ

```
$ python3 -I mesures/07-plaque-appro.py
capture : filet y=924, haut de capitale y=927, hauteur 19 px ; ECART filet->capitale = 3 px (0.8 px CSS) ; largeur 229 px
reference: filet y=751, haut de capitale y=772, hauteur 18 px ; ECART = 21 px (5.8 px CSS) ; largeur 233 px
```
Pas de police en cause (229 vs 233 px).
**Cause** : `ChaineDApproScreenController.cs:490-512` `ConstruireLigne` : le `HorizontalLayoutGroup` de la ligne n'a **aucun padding** (`h` `:496-498`) ;
la maquette est `.l{padding:4px 0;border-top:1px dotted #c3b79e}` (l.4544) ; le filet (`Filets.Poser`, `:494`) est collé au bord haut du rect et le libellé
démarre à ce même bord. Rangées : maquette 68 px d'un filet à l'autre (18,9 CSS), jeu 76 px.
**Correctif** (S, valeur prédite non mesurée) :
```
   h.childForceExpandWidth = true; h.childForceExpandHeight = false;
+  h.padding = new RectOffset(0, 0, PxTrait(4f), PxTrait(4f));          // `.l{padding:4px 0}`
-  AddLayoutElement(ligne, minHeight: Px(16f), flexibleHeight: 0);      // la hauteur vient du padding + de la ligne de texte
+  AddLayoutElement(ligne, flexibleHeight: 0);
```
Attendu : 3 px + 4 CSS (14 px) ≈ 17 px contre 21 (le reste = interligne de la maquette 1,3, classe C). **Cause commune F8/F9 ? Non** : même fonction,
deux causes (jeton réutilisé hors de son fond / padding absent).

## F11 — RÉFUTÉ (par mesure contre le BON cadre)

Le juge a comparé E10 vide au cadre NOMINAL 137 (4 étapes, panneau plein). L'état « aucune filière » de la maquette est le **cadre 141**
(`ecrans-brennar-6.html`, étiquette « Vous n'avez pas encore de filière » ; rendu `rendre-tel.py … 140 … 3.6`) : la boîte `.elast` y est elle aussi
noire, plus sombre que le corps, à taille nominale, une seule phrase centrée.

```
                      boîte noire (colonne x=100)               fond de la boîte      corps autour (x=21..31)
maquette cadre 141    y 828..1610 = 782 px = 37,2 % de H (2102)   (11, 13, 14)          (14, 20, 29)
jeu 1080x2400         y 927..1557 = 630 px = 26,2 % de H          (13, 13, 13)          (13, 18, 28)
jeu 1080x1920         y 826..1077 = 251 px = 13,1 % de H          (13, 13, 13)          (12, 17, 27)
```
Le jeu a une boîte PLUS PETITE et de même teinte relative que la maquette ; la phrase est à 5,05:1 (mesure du juge, non contestée). Le code l'écrit comme
tel : `FiliereScreenController.cs:953-960` (« tout l'espace que la pile laisse, fond `#0d0f10`, cerne 1 px `#2a3648` », décision A2 du 07/10) et `:748-752`
`DireLaChaineVide`. Le « se lit comme un trou » est donc le **parti pris de la maquette** (cadres 140/141), pas une dérive client. Nuance C seulement : fond neutre
(13,13,13) contre (11,13,14) bleuté. Si f2 juge l'état vide de la maquette lui-même trop sombre, c'est un retour à l'atelier, pas au client.

## F14 — CONFIRMÉ comme écart, cause = DONNÉE non servie ; arbitrage f2 08/10 déjà pris, absent du dossier

- Aucun « Wexler », « derrière le comptoir » ou réplique de tenancier dans `services/game-back/src` (grep : 0) ; côté client, uniquement des commentaires :
  `ShopScreenController.cs:23` et `:636-638` — « la voix du lieutenant (Wexler, « derrière le comptoir », sa réplique) n'est pas servie (**TD-823**, registre
  back) ; rien n'est inventé à sa place, **pas même le cadre rond du portrait** (décision de f2, 08/10) : un cercle vide se lit comme un défaut ».
- `Tools/juge-visuel/compte/dossier-㉓.md:109` l'écrit (« Le juge verra la bande SANS personnage : c'est l'état attendu ») ; **le dossier d'ensemble r1 ne
  l'a pas repris** dans ses 11 écarts assumés (c'est son propre avertissement n°1 : un élément que le back ne sait pas alimenter et qui n'est pas listé est un vrai finding).
- Pas de correctif client sans donnée. Arbitrage à remonter : livrer TD-823 côté back (3 répliques des cadres 98-100 + nom + portrait), ou statuer que la bande basse
  sans voix est l'état final de ㉓ (alors retirer la bande vide ? la maquette la place pour le texte du solde nul seulement). Effort : L (back + client), S pour la ligne au dossier.

## Causes communes

1. **F12 + F13 + F4 : une seule famille** — contenu de ⑤ plus court que la maquette (carte paysage 330/757, rangée « laisser » retirée, pas de titre doré) sous un
   support feutre ancré par fraction (`DecorDeScene.cs:664-669`, `Bande` 0,34 `DecorsDeScene.cs:66`). Même classe que ㊴ (hauteur « par fraction », pas par contenu) :
   à balayer dans le catalogue pour tout écran où le support n'est pas une plaque pleine (`Bande` < 0,34 avec contenu variable) — non fait ici.
2. **F13 ×4** : un contrôleur, `DecisionDetailScreenController.Construire` (`:317-460`), qui ne place ni largeur de carte, ni colonnes, ni cachet, ni moletage.
3. **F8/F9** : même fonction (`ConstruireLigne`), causes distinctes. **F11** : aucune cause client. **F14** : donnée absente.
4. **Référence du juge** : E11 jugé sur la série 4 alors que décor et jeton suivent la série 6 ; E10 vide jugé sur le nominal 137 au lieu de 141. Deux findings
   (F5 pour E11, F11) en découlent ; à corriger dans le gabarit du dossier (une référence PAR ÉTAT capturé).

## Reproduction

`python3 Tools/rendre-tel.py /home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html 4 s6-idx4.png 3.6` (cadre ⑤ « la carte distribuée ») ·
`… 140 s6-idx140.png 3.6` (㊵ vide, cadre 141) ; puis `enquete-B-mesures/m_e11.py`, `m_card.py` (adapter la constante `S`).
