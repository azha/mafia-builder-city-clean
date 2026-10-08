# Revue ⊥ n°2, ciblée — §17 du design de la couche de mouvement (v4.5), G9, cas 0, et le code E1 qui le porte

Dépôt `/home/erutheone/project/mafia-unity-anim`, branche `design/conformite-anim-2026-10-07`, HEAD `fd10fa44`.
Lecture seule : rien écrit dans le dépôt, aucun commit, aucun Unity lancé. Auteur ≠ relecteur : je n'ai écrit ni
le §17, ni le catalogue, ni `Regie.cs`.

## 1. Verdict et comptes

**NOT_APPROVED — 1 BLOCKING, 7 MAJOR, 6 mineurs.**

| compte | mesure (binaire, pas un affichage) |
|---|---|
| `AddComponent<Button>()` dans `Assets/Scripts` | **67** (`grep -rn … \| wc -l`) |
| sites `Selectable.Transition.None` | **15**, dont **1 `Scrollbar`** (`ReputationScreenController.cs:990` `Scrollbar sb`, `:994`) ⇒ **14 `Button`** |
| design §8 « 53 d'entre eux » perdent le `ColorTint` | **juste** : 67 − 14 = 53 ✔ |
| findings de n1 fermés | **8 / 15** (B1, B2, M2, M6, M7, M8, m2, m3, m4 — voir §2) |
| findings de n1 **mal fermés** | **4** (M3, M4, M5, m1) |
| findings de n1 fermés par dette, à surveiller | **2** (M1 → dette 21, m5 → dette 23) |
| tests §17 présents et corrects | **2** (`MouvementsRegiePlayModeTests.cs:84` et `:122`) ; les 2 tests de quota recalés sur 15 (`:186-191`, `:965-967`) |
| sites cités par §17 vérifiés VRAIS | **13 / 13** (table en §4) |

Ce que je salue, vérifié ligne à ligne :
- **B1 est réellement fermé, et bien fermé.** `MouvementTunables.cs:18-20` pose `PlacesReserveesRetourAppui = 1` ;
  `Regie.cs:491` calcule `int plafondAutres = MouvementTunables.QuotaAlerteRetourTransition - (retourAppui ? 0 :
  MouvementTunables.PlacesReserveesRetourAppui);` ; `Regie.cs:97` compte `if (!hv.EstNul) BasculesVoile++;`. Le test
  neuf (`:122-154`) remplit **les deux** plafonds (10 `Melange` puis 5 `Alpha` = 15 non-`Ambiance`), prouve qu'une
  16ᵉ `Alerte` ordinaire est refusée (`:134`), que l'appui passe quand même (`:146`), que `Refus` ne bouge pas
  (`:147`), et porte un **vrai contrôle négatif** : après `Detacher`, le même voile par le chemin `Attacher`
  ordinaire est refusé (`:151-153`). Arithmétique du test revérifiée à la main : 10 + 5 = 15 = `16 − 1` ✔.
- Les deux tests de quota ont été recalés de 16 à 15 sans tricher : `:189` `Assert.AreEqual(47, regie.PistesVivantes,
  "32 + 15 : la 16e place non-Ambiance est RÉSERVÉE…")`.
- **Les 13 sites de code cités par §17 sont tous vrais**, au numéro de ligne près (table §4). Aucun fait cité faux.
- M2 est fermé proprement : `Peint` exige `!string.IsNullOrWhiteSpace(text)` (l.242-243), et l'exemple de
  remplacement est mesuré bon — `ExceptionQueuePanelController.cs:258` pose
  `Libelle.De("chrome", "bandeau", "trancher")`, clé réellement servie (épinglée par
  `BandeauEphemerePlayModeTests.cs:103,115`), donc non vide.
- M7 est fermé : les deux cas 5 sont déclarés (design l.271-273) **et** portés en dette 20, et §4 l.83 est borné
  en « jamais refusé **par la régie** ».

## 2. Statut de chaque point de la revue n°1

| n1 | statut | preuve |
|---|---|---|
| **B1** quota de 16 refusait l'appui ; `BasculesVoile` menteur | **FERMÉ** (2 moitiés sur 3) | `MouvementTunables.cs:20`, `Regie.cs:491,97`, test `:122-154`. **La 3ᵉ moitié de la correction demandée — « écrire la liste des chemins de refus que la règle de classe neutralise » — n'est pas faite** ⇒ nouveau M2 |
| **B2** le catalogue ignorait le cas 0 | **FERMÉ** | `catalogue-mouvements.md:415` : « **OU dont la surface rend mais le plafond `Melange` du §4 est atteint (cas 0) : la bascule est comptée dans `Regie.BasculesVoile`** » ; `:344` idem. Un codeur qui recopie la ligne du voile attache bien le voile |
| M1 rien n'oblige à passer par `AttacherRetourAppui` | **fermé par déclaration + dette** | design l.248-249 « il passe TOUJOURS par `Regie.AttacherRetourAppui` » ; `catalogue:414` « **Appel obligatoire** » ; dette 21. Deux résidus : la garde n'est pas dans la table §10 (m1) et la dette est **unidirectionnelle** (nouveau M1) |
| M2 `Peint` vrai sur un texte vide ; exemple `:940` jamais actif | **FERMÉ** | design l.242-243 ; `:940` « n'est pas jugé » (l.270) ; nouvel exemple vérifié servi |
| M3 `CanvasGroup` des ancêtres (et `RectMask2D`) ignorés | **MAL FERMÉ** | `RendSurface` les intègre (l.238) ✔ — et c'est le bon correctif pour le site cité, le groupe de `BandeauEphemere.cs:207` étant bien un **ancêtre** de l'enfant `Fond` (`:209-212`). Mais le mot « ancêtres » **exclut le groupe porté par le nœud lui-même**, et `Peint` en souffre ⇒ nouveau M4. La moitié `RectMask2D` est abandonnée sans un mot ⇒ m6 |
| M4 seuil α sans lien avec la perception | **MAL FERMÉ** | `RendSurface` a un écart rendu ≥ 3/255 (l.238) ✔, mais (a) **le canal n'est pas nommé** ⇒ **BLOCKING B1** ; (b) `Peint` garde le `color.a ≥ 0,1` nu (l.243) ⇒ nouveau M5 |
| M5 `targetGraphic` nul à l'exécution (9 sites) | **MAL FERMÉ** | design l.259 et `catalogue:414` portent le repli ✔ ; **`catalogue:343`, « la table que E1 recopie dans `Catalogue` » (l.332), ne l'a pas reçu** ⇒ nouveau M3 |
| M6 `:2312` a deux variantes | **FERMÉ** | design l.256-258 ; `catalogue:414` ; vérifié : `DistrictInteriorScreenController.cs:2282-2283` `CouleurPourMelangeLineaire(…, 0.039f, …)` ✔ |
| M7 cas 5 non déclarés | **FERMÉ** | design l.271-273 + dette 20 ; §4 l.83 borné « PAR LA RÉGIE » |
| M8 le test ne couvrait pas le quota de 16 | **FERMÉ** | `MouvementsRegiePlayModeTests.cs:122-154`, contrôle négatif compris |
| m1 commentaire « 8 » contre `PistesMelangeMax = 10` | **fermé côté code** | `Regie.cs:495` dit bien 10. Reliquat au catalogue l.1392 ⇒ m2 |
| m2 « 15 sites `Transition.None` » | **FERMÉ et vérifié** | `catalogue:404` « 14 `Button` en `Transition.None` sur 67 sites — le 15ᵉ site `Transition.None` est une `Scrollbar` » ; design §8 l.112 « 53 » ✔ ; mesuré 67 / 15 / 1 `Scrollbar` |
| m3 G9 résumé sans « actif et `interactable` » | **FERMÉ** | design l.277 porte la précision, alignée sur §10 l.136 |
| m4 deux `Graphic` sur un GameObject | **fermé par déclaration** | l.240-241 « La surface est le PREMIER `Graphic` de son GameObject (la régie le re-résout par `GetComponent<Graphic>()`, `RegieInterne.cs:124`) » — citation vérifiée exacte (`RegieInterne.cs:124` `gr = rt.GetComponent<Graphic>();`) |
| m5 `Reglage.Defaut` / pas de `quandFini` | **reporté en dette 23** | §17 reste muet ⇒ m3 |

## 3. Constats neufs

### BLOCKING

**B1 — `RendSurface` ne dit pas SUR QUEL CANAL l'écart rendu doit atteindre 3/255 : deux implémenteurs classent
différemment un site mesuré, et G9 ne tranche pas puisqu'elle relève le cas SOUS ce prédicat.**

*Où* : `design-couche-mouvement.md:236-239`.

*Citation* : « et dont l'écart RENDU de `Cible` à `Cible × 0,85`, multiplié par `g.color.a` et par l'alpha cumulé
des `CanvasGroup` de ses ancêtres, atteint `MouvementTunables.SeuilCouleurRendue` (3/255, §6.2) ».

*Preuve mesurée* — `CitySim/Inspection/InspectionScreenController.cs:414-417` :
```csharp
Image fondBouton = bGo.AddComponent<Image>();
fondBouton.color = new Color(Or.r, Or.g, Or.b, 0.18f);     // :415
deposerBouton = bGo.AddComponent<Button>();                 // :416
deposerBouton.targetGraphic = fondBouton;                   // :417
```
`Or = DesignTokens.Current.hudMoneyUnderlineGold` (`:81`) = `{r: 0.851, g: 0.671, b: 0.306, a: 1}`
(`DesignTokens.asset:73`), et le bouton **devient interactable** (`:250` `deposerBouton.interactable = PeutDeposer`),
donc G9 le juge. Écart rendu par canal, `0,15 × C × 0,18 × 255` :

| canal | écart | verdict |
|---|---|---|
| R | **5,86/255** | ≥ 3/255 |
| G | **4,62/255** | ≥ 3/255 |
| B | **2,11/255** | **< 3/255** |

Lecture « le plus grand canal » (celle que n1 a employée) ⇒ `RendSurface` vrai ⇒ **cas 2** : un `Melange` qui
consomme une des 10 places du plafond §4. Lecture « tous les canaux » ⇒ faux ⇒ **cas 3** : un voile `Alpha`.
Lecture « luminance » (4,70/255) ⇒ cas 2. Le §17 n'en nomme aucune, et §6.2 (l.98) dit seulement « variation
≥ 3/255 de la couleur rendue ». Second axe d'ambiguïté du même membre : sRGB ou linéaire — Unity en espace
linéaire convertit, et « 3/255 » n'a de sens qu'en sRGB, mais le design ne le dit pas.

*Pourquoi BLOCKING* : prédicat ambigu au point que deux implémenteurs divergent, démontré sur un site mesuré et
jugé par G9 ; la divergence change le type de piste (`Melange` contre `Alpha`), la consommation du plafond de 10,
et le relevé de G9. Et la mesure prévue **ne la tranche pas** : G9 relève le cas *sous* le prédicat, elle ne
définit pas le prédicat.

*Correction* : « … atteint 3/255 **sur le plus grand des trois canaux, en sRGB (0-255)** » — une demi-ligne.

### MAJOR

**M1 — `AttacherRetourAppui` ne garde que le `Genre`, pas l'`Id` : n'importe quel `Retour` peut prendre la place
réservée, et la dette 21 n'interdit que le sens inverse.**
`Regie.cs:88` : `if (appui.Genre != Genre.Retour) throw new ArgumentException("AttacherRetourAppui : une entrée
Retour", nameof(appui));` — rien de plus. Le catalogue a d'autres `Retour` (`retour.appui-long`, `carnet.en-main`),
et la dette 21 n'écrit que « aucun `Attacher(` sur `retour.appui` / `retour.appui-voile` hors
`Regie.AttacherRetourAppui` » : la réciproque (aucun autre `Id` **dans** `AttacherRetourAppui`) n'est nulle part.
Le dépôt a déjà le bon idiome — `Gardes.cs:181` : `if ((e.Id == "retour.appui" || e.Id == "retour.appui-voile") &&
dureeMs > UiTimingTunables.AnimMaxBlockMs)`. *Correction* : tester l'`Id` (ou un drapeau sur l'`Entree`) dans
`AttacherRetourAppui`, et l'écrire en §17 cas 0 + dette 21.

**M2 — « jamais refusé PAR LA RÉGIE » reste une affirmation non bornée : le design ne liste pas les chemins de
refus que la réserve ne neutralise pas, alors que le code en documente un que le design ignore.**
C'était la 3ᵉ moitié de la correction de B1, non faite. `Regie.cs:83-84` (XML de la méthode) : « Sans place et sans
voile possible (`voile` ou `cibleVoile` nuls), le refus ordinaire s'applique. » Le design (l.248-252, §4 l.83) dit
seulement « (a) … RÉSERVE une place … (b) … envoie les cas 1-2 … au voile ». Restent aussi non neutralisés, dans
`Creer` : `Couple.Realisable` (`:514` ; `RegieInterne.cs:102` exige un `Graphic` pour `Melange`), G12 (`:521`),
couples épuisés (`:527`), 48 pistes (`:507`). n1 avait vérifié que G12 est inatteignable sur ce catalogue — mais
le design ne le dit pas, et un implémenteur de `Retour.Poser` écrit d'après §17 ne traitera pas le handle nul.
*Correction* : une phrase en §17 cas 0 nommant ce que la réserve neutralise (quota non-`Ambiance`, plafond
`Melange`) et ce qu'elle ne neutralise pas, avec ce que `Retour.Poser` fait d'un handle nul.

**M3 — la table que E1 recopie (`§I.4`) n'a pas reçu le repli de M5 ni l'appel obligatoire : elle contredit §17
sur 9 des 67 sites.**
`catalogue-mouvements.md:332` : « C'est la table que E1 recopie dans `Catalogue`. » Et `:343`, colonne « cible » de
`retour.appui`, inchangée par `fd10fa44` : « la surface qui `RendSurface` au `PointerDown` (**nommée, sinon
`targetGraphic`**) » — pas de « à défaut le `Graphic` du GameObject », pas de renvoi à `AttacherRetourAppui`.
n1 demandait explicitement les deux lignes 343-344 ; seule 344 a été corrigée. Même mécanisme que B2, sur l'autre
ligne. *Correction* : reporter en `:343` le membre de `:414` (« à défaut le `Graphic` porté par le GameObject du
bouton ») et l'appel obligatoire.

**M4 — « l'alpha cumulé des `CanvasGroup` de ses ancêtres » exclut le groupe porté par le nœud lui-même, et pour
`Peint(t)` on ne sait pas de qui on prend les ancêtres : `t` ou le `Graphic` trouvé.**
`design:244` : « l'alpha cumulé des `CanvasGroup` ancêtres ≥ 0,1 ». Mesuré sur le site que §17 cite lui-même :
`Shell/BandeauEphemere.cs:207` `groupe = gameObject.AddComponent<CanvasGroup>();` et `:251`
`var bouton = gameObject.AddComponent<Button>();` — **même GameObject** ; `:298` `groupe.alpha = 1f - t / FonduS`
descend jusqu'à 0 pendant que le bouton reste actif. En plein fondu : `RendSurface(fond)` devient faux (correct —
le groupe est bien un ancêtre de l'enfant `Fond`, `:209-212`), on passe en cas 3, et `Peint(bandeau)` **ignore le
groupe du bandeau lui-même** puisqu'il n'en est pas un ancêtre ⇒ voile posé sur un `CanvasGroup` à ~0,05, qui
l'assombrit à 0,04 : rien de perceptible, et aucune garde ne le relève. Le même mot pèsera dès que la régie
elle-même aura posé un `CanvasGroup` sur un bouton (`RegieInterne.cs:119-120`, réutilisé s'il préexiste).
*Correction* : « l'alpha cumulé des `CanvasGroup` **du nœud lui-même et de ses ancêtres** », et préciser que pour
`Peint` le cumul est celui du `Graphic` retenu jusqu'à la racine du Canvas.

**M5 — `Peint` garde le seuil nu `color.a ≥ 0,1` : exactement le défaut que M4 reprochait à `RendSurface`, déplacé
sur le côté voile, et aucune garde ne le rattrape.**
`design:243` : « `enabled`, actif, `color.a ≥ 0,1`, hors `Mask` invisible ». Le voile vaut `Alpha` `Multiplicatif`
1 → 0,80 (l.262) : sur une sous-arborescence dont un seul `Graphic` peint à α 0,10 au-dessus d'un fond sombre,
l'écart rendu est `0,20 × 0,10 × C`, soit **≤ 0,8/255 pour `C ≤ 0,15`** — p. ex. la teinte mesurée
`Operational/Conflit/ConflitScreenController.cs:712` `fondLigne.color = choisie ? CouleurLocale("#2e2114") :
CouleurLocale("#241c14")` (canal bleu 0,078). Sous le seuil de §6.2, et hors de portée des gardes : G9 (§10 l.136)
ne ROUGIT que pour un cas 5 non déclaré, G13 (l.140) ne vise que les `Ambiance`. *Correction* : donner à `Peint` le
même critère d'écart rendu (`0,20 × couleur × alphas ≥ 3/255`, sur le `Graphic` le plus fort de la
sous-arborescence), ou étendre G13 aux `Retour` comme n1 le proposait.

**M6 — le catalogue garde debout le compte que B1 a réfuté, et la conclusion qu'il en tire.**
`catalogue-mouvements.md:1181-1182` : « **Pire cas simultané dans tout le client** : ㉙ résolu (14) + les 4
`Alerte` du chrome en descente (design §9) = **18 pistes sur 48** (design §4). La couche de mouvement n'approche
pas son plafond avec ce catalogue ». Vérifié dans `CatalogueHud.cs` : 3 entrées `Alerte` (`pouls` `:46`, `tremble`
`:63`, `gyroflip` `:80` — `pouls` sur 2 cibles ⇒ 4 pistes) **plus 3 `Transition` qui tiennent leur valeur**
(`aiguille.balayage` `:106`, `virage` ×2 par la fabrique `:136`) : §V n'en compte aucune. C'est précisément
l'affirmation qui avait laissé passer B1 ; la laisser debout invite le prochain lot à défaire la réserve comme
inutile. *Correction* : recompter l.1181 sur le total **non-`Ambiance`** (7 chrome + 7 de ⑮ + `shell.entree` +
bandeau = 16) et écrire que la réserve de `PlacesReserveesRetourAppui` est désormais porteuse.

**M7 — le protocole de relevé de G9 n'est pas écrit, et depuis que le cas 0 existe le relevé dépend de l'état de
la régie : un relevé naïf classe tout en cas 0 à partir du 11ᵉ bouton.**
`design:277-279` : « le test, après le premier rendu de chaque écran, simule un `PointerDown` sur chaque bouton et
relève le cas retenu et la cible ». Le cas 0 (l.248-251) se déclenche sur `!PlaceMelangeLibre`
(`Regie.cs:76` `nMelange < MouvementTunables.PistesMelangeMax`) : si le relevé n'appelle pas `Detacher` entre deux
boutons, les 10 premiers cas 1-2 remplissent le plafond et **tous les suivants basculent sur le voile**, faussant
le relevé — et masquant les cas 5 que G9 est censée faire rougir. Second point : §17 note lui-même que l'état est
MUTABLE (l.230-232) ; un seul relevé « après le premier rendu » ne tranche pas les sites conditionnels
(n1 : `DistrictInteriorScreenController.cs:691`, `ExceptionQueueController.cs:605`). *Correction* : écrire dans
§17/G9 que le relevé `Detacher` après chaque bouton et se fait sur une régie vierge, et nommer l'état (ou les
états) sur lequel le cas est relevé.

### mineurs

- **m1** — la garde de source promise par la dette 21 n'est pas dans la table des gardes (§10 l.126-140) : une
  garde qui n'existe que dans un fichier de dettes se perd. L'inscrire comme G14, ou l'ajouter aux
  `Gardes.MotifsInterdits` (`Gardes.cs:297`, G7 `:312`).
- **m2** — `catalogue-mouvements.md:1392` garde « au plus **8** pistes `Melange` vivantes » deux phrases avant de
  dire 10. Le code est corrigé (`Regie.cs:495` « au plus 10 ») ; la narration du catalogue reste à relire.
- **m3** — m5 de n1 est parti en dette 23 sans une ligne en §17 : le §17 ne dit toujours pas que
  `AttacherRetourAppui` impose `Reglage.Defaut` et n'offre pas de `quandFini` (`Regie.cs:96`, `:101`). La dette est
  honnête et datée ; une demi-phrase en §17 économiserait la question.
- **m4** — `VerifierAdmise(appui)` n'est appelé qu'**hors** de la branche voile (`Regie.cs:95` pour le voile, `:100`
  pour l'appui) : quand le plafond `Melange` est plein, un `appui` hors catalogue ne lève plus. G1 (§10 l.128,
  « `Attacher` hors catalogue lève ») est contournée sur ce chemin. Déplacer le `VerifierAdmise(appui)` avant le
  `if` de `:92`.
- **m5** — `PolitiqueMouvement.cs:30` garde sous `Reduit` **tout** `Retour` dont le canal est `Melange`, ou `Alpha`
  sans pose définie : `if (m.G == Genre.Retour && (c.P == Propriete.Melange || (c.P == Propriete.Alpha &&
  !m.PoseDefinie))) return false;`. Le §17 l.274-275 dit « le `Melange` des `Retour` et le voile de
  `retour.appui-voile`, **et rien d'autre** ». Vacuité correcte sur le catalogue v5 (`carnet.en-main` déclare
  `PoseDeReposS = 0` ⇒ `PoseDefinie`, `Modele.cs:178`), mais la prochaine entrée `Retour`/`Alpha` sans pose sera
  gardée en silence. Soit écrire le prédicat implémenté en §5 (i), soit clé par `Id` comme `Gardes.cs:181`.
- **m6** — la moitié `RectMask2D` de M3 est abandonnée sans un mot. Elle est, je crois, **sans objet** — un
  `RectMask2D` filtre aussi les raycasts, donc un bouton pressable n'est pas entièrement découpé —, mais c'est un
  argument qui mérite une ligne dans §17, sinon la prochaine revue le re-soulève.

## 4. Les sites cités par §17 — tous vérifiés VRAIS

| cité par §17 | vérifié | ligne lue |
|---|---|---|
| `ExceptionDetailController.cs:570` → `Verre` | ✔ | `:569` `Button choix`, `:570` `choix.targetGraphic = fondCarte;`, `:538` `face.AddComponent<Mask>().showMaskGraphic = false;`, `:540` `NewUI("Verre", face.transform)` |
| `DistrictInteriorScreenController.cs:2312` | ✔ | `b.targetGraphic = fond;` (`Button` à `:2310`) |
| `…:2282` variante `.btn.ligne` α 0,039 | ✔ | `:2282-2283` `CouleurPourMelangeLineaire(Color.white, …ficheGlassTop, 0.039f, out atteignable)` |
| `…:2128` (`Tete_OuvrirFiche`, cas 5) | ✔ | `:2122` `NewUI("Tete_OuvrirFiche", corps.transform)`, `:2125-2126` α 0, `:2128` `Button tapTete`, `:2130` `targetGraphic = zoneTete` |
| `LaSuitePanelController.cs:209-223` | ✔ | `:209` `if (premierGeste)`, `:211` `Mask … showMaskGraphic = false`, `:212` `"Degrade"`, `:223` `b.targetGraphic = im;` |
| `ExceptionQueuePanelController.cs:99` | ✔ | `Color transparent = vaImg.color; transparent.a = 0f; vaImg.color = transparent;` |
| `ExceptionQueuePanelController.cs:249` | ✔ | `Button b = trancherGo.AddComponent<Button>();` ; `:247-248` `zone` α 0 ; `:258` `mot` = libellé servi |
| `TopBarController.cs:940` | ✔ | `Button leadingBtn` ; `:938-939` α 0 ; `:974` `leadingGo.SetActive(false)` ; `:638` `SetActive(visible)` ; `:657` `default: return "";` |
| `CityMapController.cs:894` | ✔ | `Button cellButton` ; `:895` `targetGraphic = hit` |
| `DelegationScreenController.cs:1527-1535` | ✔ | `:1527` `"Touche"`, `:1529` `Etirer`, `:1531` α 0, `:1533` `Button b`, `:1534` `Transition.None` |
| `DemolitionScreenController.cs:1453-1459` | ✔ | idem, `:1457` α 0, `:1459` `Button b` |
| `BandeauEphemere.cs:207` / `:298` | ✔ | `:207` `groupe = gameObject.AddComponent<CanvasGroup>();` ; `:298` `groupe.alpha = 1f - t / FonduS;` |
| `RegieInterne.cs:124` | ✔ | `gr = rt.GetComponent<Graphic>();` |
| `AppShell.cs:275` / `:1563` | ✔ | les deux posent `TopBarController.LeadingAction.None` |

## 5. Ce que la mesure prévue tranche, et ce qu'elle ne tranche pas

- **Elle tranche** : la répartition des 67 sites entre les cas 1-5 (G9 au créneau E2), les 20 sites non classés
  (dette 22), et les deux cas 5 déclarés (dette 20). Le §17 a raison de n'affirmer aucun compte.
- **Elle ne tranche pas** : le canal de `RendSurface` (**B1**) — G9 relève le cas *sous* le prédicat ; la
  perceptibilité du voile (**M5**) — aucune garde ne la mesure, G13 ne vise que les `Ambiance` ; la validité du
  relevé lui-même (**M7**) — un relevé sans `Detacher` se trompe sans rougir.

---

**NOT_APPROVED — 1 BLOCKING, 7 MAJOR, 6 mineurs.** Les deux BLOCKING de n1 sont fermés, et B1 l'est très
proprement (code, test neuf, contrôle négatif, deux tests recalés). Le BLOCKING neuf est d'un mot : nommer le canal
sur lequel l'écart de 3/255 se mesure.
