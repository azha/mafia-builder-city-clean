# ㉑ « Le marché — l'ardoise du courtier » — DESIGN CLIENT v1, 2026-11-11

Arbre `/home/erutheone/project/mafia-unity-C1-marche`, br. `lot/client1-marche-ardoise-2026-11-11` (tirée du cumul
`0b24be49`). Back lu en lecture seule : `mafia-clean-city` `main` = **`2ed39589`**, lot BACK-3 `lot/marche-ardoise-enumerateur`
= **`ef8be64e`**, design BACK-3 `mafia-design-ardoise` `design/marche-ardoise-enumerateur` = **`cc13304f`**. Maquette
`~/project/atelier3d-mafia/ecrans-brennar-6.html` (**159 cadres**, index 0-based, relus par leur TEXTE). Tout fait porte
`fichier:ligne` relu ici ; le reste est **non mesuré**. Rien de commité, ni Unity ni PlayMode.

**v1.1** (APPROVED + retouches f2) : §2 la raison de « aucune garde neuve » est corrigée — `MenuPlusEntrees` n'a **aucun
compte attendu à mettre à jour** (`MenuPlusParcoursJoueurPlayModeTests.cs:76` est un **plancher** `GreaterOrEqual(…, 11)` qui
« rougit sur une TABLE QUI RÉTRÉCIT » `:74-75`, et `:91` une **cohérence interne** `AreEqual(MenuPlusEntrees, noms.Count)`) ·
§1 gagne le fait des **deux routes sur un seul type** et la réponse : ㉑ **n'appelle pas** la route par lane · ancres
re-mesurées : `LaneConfidenceBucket` **`:38`**, noms **`district-names.ts:21-28`** (ids `:22-27`), le démontage de
`MountTenant` est **`AppShell.cs:1535-1557`**, `UnmountCurrentTenant()` **`:1553`** (v1 citait `:1224-1237`, qui est la
**table** des destinations), `GroupesPlus():1514-1515` est `vos_journees` **en production**, pas une garde ·
**ruling `ash` = (A)** (présente, éteinte, nommée ; `/72` reste vrai) · §5 remplacé par la table des **29 mots RATIFIÉS**.

## 1. La route — RECOPIÉE DU CODE (pas du design) ⇒ l'énumérateur EXISTE
L'énumérateur **est codé** sur `lot/marche-ardoise-enumerateur` @`ef8be64e` ; je recopie **le code**, non le design :
```
market.controller.ts:104  @Get('me/market/lanes')   :105 @UseGuards(JwtAuthGuard)
market.controller.ts:106  async listLanes(): Promise<{ lanes: LaneConfidenceRow[] }>
market.controller.ts:111-113    district_id: row.district_id / substance_type: row.substance_type / lane_confidence_bucket: this.projection.laneConfidenceBucket(row.c)
market-projection.service.ts:46-50  interface LaneConfidenceRow { district_id: number; substance_type: SubstanceTypeValue; lane_confidence_bucket: LaneConfidenceBucket }
```
**Domaines fermés, recopiés (V15)** : `SubstanceTypeValue = 'brindle' | 'crick' | 'hush' | 'ash'`
(`lane-collapse-pricing.service.ts:59`) · `LaneConfidenceBucket = 'LOW' | 'MODERATE' | 'HIGH'`
(`market-projection.service.ts:38`).
**UN type, DEUX routes** — `market-projection.service.ts:42-44` : « The SINGLE type behind BOTH
`GET /v1/me/market/lanes/:districtId/:substanceType` (as the body) and `GET /v1/me/market/lanes` (as the array element): a key
added to one reaches the other by construction (structural guard, not a pinned equality) ». ⇒ **㉑ n'appelle PAS la route par
lane**, et la raison est mesurée : le pied d'une case (§4) a besoin du nom du quartier (`/v1/world/districts`), de la
substance et de sa glose (mots du client, §5) et de la **bande** — or la bande d'une case servie est **déjà** dans `lanes`,
au même type. Pour une case **sans ligne**, la route par lane rendrait **404** (`market.controller.ts:23-25`), ce que la liste
dit déjà par **omission** (D1) : l'appeler ajouterait un aller-retour pour apprendre ce que le client sait, et un second
chemin d'erreur sur le geste le plus fréquent de l'écran. ⇒ **une seule lecture, `GET /me/market/lanes`** (+ `world/districts`).
**Contrat, mesuré au design BACK-3** : ordre `district_id ASC, substance_type ASC` (D3, l. 192) · **aucune** pagination, 72
lignes au maximum par le FK `REFERENCES districts(id)` + la PK (D3, l. 193) · liste vide ⇒ **`{lanes: []}` en 200**, jamais
404 (D3, l. 194) · aucun query param · JWT obligatoire (401 sans) · **absence = omission** : une ligne jamais « ensured » n'est
pas dans le tableau, jamais un bucket neutre fabriqué (D1, l. 128-133).
**Le dénominateur n'est PAS servi** (D2) : 72 = 18 districts × 4 substances, **calculé par le client** à partir de
`/v1/world/districts` et du domaine fermé des substances — jamais une constante en dur.

### DTO client — forme G, bijection corps ↔ DTO
NEW `Assets/Scripts/Operational/Marche/MarcheDtos.cs` :
`[Serializable] class LaneConfidenceRowDto { public int district_id; public string substance_type; public string lane_confidence_bucket; }`
· `class LanesResponseDto { public LaneConfidenceRowDto[] lanes; }` · `LanesPayload { public LanesResponseDto data; }` ·
`LanesEnvelope { public LanesPayload payload; }` — l'idiome enveloppe/payload/data de la maison (patron mesuré
`InspectionDtos.cs:78-84` + `ChaineDApproDtos.cs:107-109`). **3 clés, exactement** : `JsonUtility` jette en silence toute clé
non déclarée, donc la bijection est une **garde** (patron `CommitResponseDtoPlayModeTests.cs:22-30`, qui épingle l'ensemble
des clés d'un corps de succès). ⚠️ Le mur R2.2 est verbatim au contrôleur (`market.controller.ts:16-17` : « no `p_cents`, `c`,
`t_refractory`, `k_current`, `q_total` ever leaves ») : **une 4ᵉ clé dans ce DTO serait un bug de protocole**, et la garde doit
le dire.

## 2. Le point d'entrée — le menu Plus, deux lignes
Mesuré : `AppShell.DestinationsPlus()` (`:1216-1245`) est la table des entrées (chacune
`(idStable, Libelle.De("plus","entree",…), () => MountTenant<T>())`), `GroupesPlus()` (`:1512-1524`) les **cinq** groupes par
`idStable`, et `ConstruireEntreeDuMenu` (`:1478`) les bâtit deux par rangée (`:1457-1470`). ⇒ **deux ajouts** :
`("le_marche", Libelle.De("plus","entree","Le marché"), () => MountTenant<MarcheScreenController>())` dans `DestinationsPlus`,
et `"le_marche"` dans le groupe **`vos_affaires`** (`:1517-1518`, qui passe de 4 à 5 ids — il porte déjà `la_chaine_d_appro`,
`la_distribution`, `la_vente`, `raser_un_site` : l'ardoise est de la même famille).
⛔ `MountTenant<T>` est le bon verbe : il **démonte** d'abord — `UnmountCurrentTenant()` en tête de corps (`:1553`, dans
`MountTenant` `:1535-1557`), posé pour le défaut mesuré le 2026-09-06 où 21 destinations se dessinaient par-dessus le menu
(`:1537-1552`).
**Aucune garde neuve n'est due pour l'entrée, et aucun compte attendu n'est à mettre à jour** (correction v1.1) : la bijection
`GroupesPlus` ↔ `DestinationsPlus` (`:1510-1511`, « chaque entrée dans UN groupe exactement ») **mord** sur les deux ajouts, et
les deux assertions du parcours sont **sans littéral à bouger** — `MenuPlusParcoursJoueurPlayModeTests.cs:76` est un
**plancher** (`Assert.GreaterOrEqual(shell.MenuPlusEntrees, 11, …)`, dont le commentaire `:74-75` dit que le `>=` « laisse
passer les ajouts légitimes et rougit sur une TABLE QUI RÉTRÉCIT »), et `:91` une **cohérence interne**
(`Assert.AreEqual(shell.MenuPlusEntrees, noms.Count, …)`, boutons nommés `MenuPlus_*`). ⇒ il suffit de ne pas les casser.
`MenuPlusEntrees` lui-même est déclaré `:1533` ; `GroupesPlus():1514-1515` est le groupe `vos_journees` **en production**,
pas une garde.

## 3. Le contrôleur — patron mesuré : ⑮ `InspectionScreenController`
NEW `Assets/Scripts/Operational/Marche/MarcheScreenController.cs` : `MonoBehaviour, IShellTenant`, `SetMountParent`,
`SetToken`, un `Charger()` qui lit **deux** routes puis **UN** rendu.
**Pourquoi ⑮ et pas ㊲ ni ㉚** : ⑮ dessine déjà **cette forme exacte** — 18 rangées de districts nommés par
`/v1/world/districts`, colonnes d'énumérés, états vide/partiel/erreur, décor de scène. Ancres réutilisables :
`NombreDeDistricts = 18` (`InspectionScreenController.cs:60`) · `Districts` servis tels quels (`:62`) ·
`client.LireDistricts` (`:158`, route **publique**, `InspectionClient.cs:43-45`) · `NomDuDistrict(id)` (`:281-284`) ·
l'en-tête (`:300-312`) · une rangée (`:317-352`) · le corps vidé puis rebâti (`:225-228`).
⚠️ **À NE PAS copier de ⑮** : son ordre de rangées est `for (int id = 1; id <= 18; id++)` (`:250`) — l'ardoise en a un autre (§4).
**Le nom d'un quartier est SERVI** : `DistrictNomDto { id, name, name_canonical }` (`InspectionDtos.cs:78-83`). ⇒ **la
prémisse L3 du cadre 111 est RÉFUTÉE** (« la ville n'a pas de noms de fiction ») : `district-names.ts:21-28` porte les 18 noms,
gardés par `NOMBRE_DE_DISTRICTS_NOMMES = 18` (`:33`). À amender auprès de l'atelier (§9).
**Client** : NEW `MarcheClient.GetLanes(bearer, onOk, onErr)` sur l'idiome de `InspectionClient.LireFile` (`:22-41` :
`UnityWebRequest.Get`, `ClientHttp.Delai`/`Authentifier`, `JsonUtility.FromJson<LanesEnvelope>(…)?.payload?.data`, refus
nommés `:36-38`) ; **plus** un seam `Func<(long statut, string corps)>` **porteur du statut ET du corps**, patron mesuré
`HlCardClient.cs:79-91` — sans lui, les états partiel et erreur (§7) sont inécrivables.

## 4. La mise en page = les cadres, relus par leur TEXTE
Les cadres de ㉑ : **106** (le tableau), **107** (une case recoupée), **108** (voyant éteint), **109** (le tableau de
RÉGION), **110** (le mur de réciprocité), **151** (la tuile ash) ; **111** est la carte « ce qui manque encore », **pas** un
écran de jeu. L'aside de l'écran est à `ecrans-brennar-6.html:5663-5672`.
**Cadre 106, collé** : enseigne `LE MARCHÉ` / `tableau du Verge d'Or` · trois compteurs `03 /72 lignes connues`, `01 sûres`,
`15 quartiers noirs` · en-tête `quartier | brindle | crick | hush | ash` · **18** rangées de noms · une légende de substance
(`crick · extrait de racine`) · la phrase « Trois lignes sur soixante-douze. Le reste, personne des nôtres n'y a jamais
traité. »
**Les trois compteurs sont tous DÉRIVABLES** de `lanes` + 18 : `lignes connues` = `lanes.Length` sur **72** · `sûres` =
`count(lane_confidence_bucket == "HIGH")` · `quartiers noirs` = 18 − `distinct(district_id)`. Aucun n'est servi (D2) ⇒ ce sont
des **comptes du client**, pas des valeurs servies : à écrire comme tels et à garder.
**L'ORDRE DES RANGÉES est une affaire de client** (D2-bis, l. 185-188) et il **n'est pas** l'ordre d'id. **Re-vérifié
moi-même** en appariant les 18 libellés du cadre 106 à `district-names.ts:22-27` :
`[1,2,3,4,5,6,7,11,12,8,9,13,10,14,16,15,17,18]` (Les Bassins 1 … Saint-Brand 7, **Les Entrepôts 11, Dépôt-Est 12, Le
Treillis 8, Marne-Basse 9, Le Verre 13, Orsel 10**, Place des Comptes 14, **La Lisière 16, La Chancellerie 15**, Les Friches
17, Pont-Gris 18) — identique à l'ordre du design BACK-3. ⇒ **constante nommée** `OrdreDesRangees`, recopiée, avec une garde
(§7, G2) : un tableau d'ordre est exactement ce que le socle §5 interdit de laisser porter une correspondance non assertée.
**Cadres 107 / 108 / 151 = le pied d'UNE case sélectionnée** : titre `<QUARTIER> · <MOT>` puis une phrase — 107
`DÉPÔT-EST · RECOUPÉ` (« deux sources concordantes … On ne vous dira pas le prix, ni ce qui s'écoule ») · 108
`LA CHANCELLERIE · VOYANT ÉTEINT` (« … Ce n'est pas une ligne à zéro : c'est une ligne jamais ouverte. ») · 151
`LE VERRE · UNE LIGNE QUI TIENT`, légende `ash · lys de verre`.
⇒ **Le geste de l'écran est le TOUCHER d'une case**, et c'est le seul (l'aside interdit prix, pourcentage et graphe,
`:5667`). Une case **sans ligne est touchable** : son pied est celui de 108 — le renseignement central (`★★★` `:5666` : « UNE
CASE VIDE EST UN RENSEIGNEMENT, PAS UN TROU »).
⛔ **Cadres 109 et 110 HORS LOT** : autres routes (`GET /me/meta-market/signal` pour les 6 genres et `▲/=/▼` ;
`PUT /v1/me/meta-market/visibility` pour le mur, piloté depuis ㉖) ⇒ **TD-1040**. Les dessiner avec `lanes` refarait la faute
de la série 2 que l'aside réfute (`:5664`).

## 5. Les mots — 29 entrées RATIFIÉES par f2 (v1.1)
Mesuré : `string_table.ts` @`main 2ed39589` ne sert **aucune** clé `marche.*`/`market.*` (`grep -nE "'(marche|market)\."` ⇒
**0**) ⇒ le client code **clé dérivée + repli COMPTÉ** sur les textes exacts ci-dessous (BACK-3 servira les clés `marche.*`),
régime de TD-938 (b) pour `accueil.carte.*`. Source : `/home/erutheone/project/mafia-clean-city/scratchpad/MOTS-MARCHE-21.md`
(FR + EN, ratifiée f2 11/11). Aucun mot n'est **dérivé** d'un énuméré.

| n° | rôle `marche.<rôle>` | littéral FR exact | où il s'affiche |
|---|---|---|---|
| 1 | `enseigne` | LE MARCHÉ | enseigne, cadres 106-108/151 |
| 2 | `enseigne` | tableau du Verge d’Or | sous-enseigne |
| 3-5 | `compteur` | lignes connues · sûres · quartiers noirs | les 3 fenêtres du cadre 106 |
| 6 | `entete` | quartier | 1ʳᵉ colonne de l'en-tête |
| 7-10 | `substance` | brindle · crick · hush · ash | en-tête des 4 colonnes |
| 11-14 | `forme` | briques · cristaux · plaque · prismes | glose sous la substance (cadre 109) |
| 28, 15-17 | `origine` | herbe des friches *(GÉNÉRÉ)* · extrait de racine · résine de lull · lys de verre | légende de la colonne touchée |
| 18-20 | `bande` | ouï-dire · recoupé · sûr | titre du pied, `LOW`/`MODERATE`/`HIGH` |
| 21 | `bande` | voyant éteint | titre du pied, case **sans ligne** |
| 26 | `pied` | une seule source, jamais recoupée — un bruit de comptoir. On ne vous dira pas le prix : seulement qu’on en parle. *(GÉNÉRÉ)* | pied `LOW` |
| 22 | `pied` | deux sources concordantes — ni une rumeur, ni une certitude. On ne vous dira pas le prix, ni ce qui s’écoule : seulement à quel point on peut s’y fier. | pied `MODERATE` (cadre 107) |
| 27 | `pied` | plusieurs des nôtres y ont traité, les sources se tiennent. On ne vous dira toujours pas le prix : seulement que la ligne tient. *(GÉNÉRÉ)* | pied `HIGH` |
| 23 | `pied` | aucun des nôtres n’a jamais rien écoulé là-bas. Ce n’est pas une ligne à zéro : c’est une ligne jamais ouverte. Elle s’allumera le jour où un de vos dealers y traitera. | pied d'une case sans ligne (cadre 108) |
| 24a | `bande` | HORS DU TABLEAU | titre du pied de **toute** case `ash` (réécrit, ruling A) |
| 24b | `pied` | la poudre grise ne se vend pas à un dealer : elle se place, au rendez-vous, chez ceux du Verre. | pied de toute case `ash` (1ʳᵉ phrase du cadre 151 **seule**) |
| 25 | `bas` | *à trou, ICU — voir ci-dessous* | phrase du bas, sous le tableau |
| 29a | `etat` | On interroge le tableau… *(GÉNÉRÉ)* | pendant le chargement |
| 29b | `etat` | Le tableau ne répond pas. *(GÉNÉRÉ)* | échec de la route |

⛔ **Retirés par le ruling** (ne pas les coder) : le titre « une ligne qui tient » et la **2ᵉ** phrase de la case `ash` du
cadre 151 — `ash` ne s'allume jamais (TD-966). **Écart de classe C assumé** : la maquette écrit les nombres en lettres
(« Trois lignes sur soixante-douze »), le client les écrit en **chiffres**.
**La phrase du bas (n° 25), côté client** : c'est une clé **à paramètres**, donc `MafiaCleanCity.I18n.Libelle.Gabarit("marche.bas.<slug>", <repli FR>, parametres)` — jamais `Libelle.De`. Les deux paramètres sont posés en **entiers de chaîne**, patron
mesuré `ApresGesteHl.Parametres` (`Assets/Scripts/Shell/ApresGesteHl.cs:38-48` : `n.ToString(CultureInfo.InvariantCulture)`),
parce que le résolveur ICU rend l'**accolade brute** d'un `plural` dont le paramètre manque ou n'est pas un entier
(`long.TryParse`) — jamais une branche par défaut : `{ {"n", lanes.Length}, {"total", 18 * 4} }`. Les trois branches
`=0 / one / other` couvrent exactement les trois états non-erreur de §7 (nue / une ligne / plusieurs), et `#` rend `n`.
⇒ **TD-1017** se réduit à « BACK-3 sert les 29 clés » : les textes ne sont plus un trou, le repli est **compté**.
Patron du résolveur d'énuméré : `MotsDesEnumeres.Domaine` + `Dire(domaine, valeur)` (`MotsDesEnumeres.cs:70-77`) ⇒ NEW
`BandeDeLane = new Domaine("marche","bande",{{"LOW","ouï-dire"},{"MODERATE","recoupé"},{"HIGH","sûr"}})`, **avec sa garde de
source** (§7, G4).

## 6. La colonne `ash` — RULING f2 = (A)
Fait connu (TD-966, **relayé par f2 ; introuvable dans cet arbre comme dans `main` — non mesuré par moi**) : `ash` ne
s'allume **jamais** par un chemin joueur. Le dessin ne doit pas promettre le contraire. La maquette **dessine** la colonne
(en-tête `quartier | brindle | crick | hush | ash`, cadres 106/107/108/151) et lui consacre le cadre 151.
- **(A) colonne présente, ÉTEINTE et NOMMÉE** : les 18 cases d'`ash` portent le même pied que le voyant éteint (cadre 108),
  et l'en-tête `ash` porte la glose servie (`lys de verre`) ; rien ne suggère qu'un geste l'allumerait. **Fidèle aux 4
  cadres**, et honnête : « jamais ouverte » est précisément ce que dit 108.
- **(B) colonne ABSENTE** : 18 × 3 cases, dénominateur **54** et non 72. ⇒ contredit les 4 cadres, **contredit le
  dénominateur du back** (72, borné par la PK sur le pgEnum à 4 membres, D3), et casse `/72` des compteurs du cadre 106.
**RULING f2 (11/11) = (A)** : colonne **présente, éteinte et NOMMÉE**, et le **`/72` reste vrai**. (B) est écartée — elle
ferait mentir un compte porté par le contrat pour cacher un état que la maquette sait déjà dire. Le pied de **toute** case
`ash` est le couple ratifié **24a/24b** (« HORS DU TABLEAU » + la 1ʳᵉ phrase du cadre 151 seule), **pas** le pied du voyant
éteint : « hors du tableau » et « jamais ouverte » ne disent pas la même chose, et c'est la nuance que le ruling retient.
⇒ **TD-1018** consigne que `ash` est structurellement éteint, une fois dans le code, pour que personne ne « corrige »
l'absence de lignes en fabriquant une donnée.

## 7. États, puis gardes — structurelles AVANT l'effet
**Quatre états, tous distincts et tous nommés** : `lanes == null` + erreur ⇒ **erreur** (le tableau n'est pas dessiné, une
phrase nommée) · `lanes.Length == 0` en 200 ⇒ **ardoise nue** (les 18 × 4 cases éteintes, compteurs `00 /72`, `00 sûres`,
`18 quartiers noirs` — l'état du cadre 108 généralisé, qui est de l'**information**) · `0 < Length < 72` ⇒ **partiel** (le
cadre 106) · `Length == 72` ⇒ **plein**. ⛔ L'ardoise nue **n'est pas** une erreur : c'est la leçon de TD-879 sur ⑮, et ici
elle est en plus écrite au contrat (D3, l. 194).
**Structurelles d'abord** (CLAUDE.md : seules celles-là ont fermé des classes) : **G0a** tout `Graphic` du tableau porte son
`CanvasRenderer` (`AddComponent` à l'exécution n'honore pas `[RequireComponent]` : sans lui **rien ne dessine et la console
est muette** ; précédent `DecorDeScenePlayModeTests.cs`, `HorizonScreenPlayModeTests.cs`) · **G0b** tout `Graphic` sous un
`Mask` est un `MaskableGraphic` (l'ardoise défile : 18 rangées, donc un masque) · **G0c** ordre de fratrie : en-tête, les 18
rangées, le pied. *Contrôle positif* : un `Image` sans `CanvasRenderer` **DOIT** faire rougir G0a.
**Puis l'effet** (une garde sur les PARAMÈTRES n'est pas une garde sur l'EFFET : rendre et compter) :
- **G1 BIJECTION du corps** : un corps de succès à 3 clés se désérialise avec les 3 champs non nuls, et l'ensemble des clés
  **assertées** est exactement `{district_id, substance_type, lane_confidence_bucket}`. *Contrôle positif* : un corps portant
  une 4ᵉ clé (`"c":0.42`) ⇒ la garde **nomme** la clé en trop (mur R2.2, `market.controller.ts:16-17`).
- **G2 ORDRE DES RANGÉES** : les 18 libellés rendus, **dans l'ordre**, égalent les noms servis appliqués à
  `OrdreDesRangees` = `[1,2,3,4,5,6,7,11,12,8,9,13,10,14,16,15,17,18]`. *Contrôle positif* : l'ordre d'id croissant (celui de
  ⑮) **DOIT** rougir — c'est l'erreur exacte qu'un copier-coller de ⑮ produirait.
- **G3 EFFET d'une case** : un `lanes` à une ligne (`district_id`, `substance_type`, `HIGH`) ⇒ **une** case allumée, à
  l'intersection mesurée (rangée = index dans `OrdreDesRangees`, colonne = index dans le domaine fermé), **71** éteintes, et
  son mot est la valeur **servie** de la bande. *Anti-vacuité* : la grille doit porter 72 cases avant de compter les allumées
  — un compte qui vaudrait 0 partout serait vrai sur une grille absente.
- **G4 SOURCE DES MOTS** : `BandeDeLane` couvre **exactement** les 3 membres de `LaneConfidenceBucket` et le domaine des
  substances exactement les 4 de `SubstanceTypeValue` (bijection, compte asserté). *Contrôle positif* : un domaine amputé
  d'un membre **DOIT** rougir.
- **G5 COMPTEURS** : sur un `lanes` fabriqué à 3 lignes dans 3 districts dont 1 `HIGH` ⇒ `03 /72`, `01 sûres`,
  `15 quartiers noirs` — **les chiffres du cadre 106**. *Contrôle positif* : 3 lignes dans **2** districts ⇒ `16`, pas `15`.
- **G6 ÉTATS** : les quatre états de §7 rendent quatre écrans distincts ; l'ardoise nue porte 72 cases éteintes **et aucune
  phrase d'erreur**. *Contrôle positif* : un 500 ⇒ la phrase d'erreur **et** 0 case.

**V19.** (1) ÉVÉNEMENT : clé ajoutée au corps (G1), ordre d'id recopié de ⑮ (G2), membre d'énuméré perdu (G4), compteur dérivé
faux (G5) ; classes DONNÉE et GÉOMÉTRIE (la fratrie, G0c). (2) DÉGÉNÉRÉ : « 72 cases » serait vrai pour 72 cases **sans
grille** ⇒ G3 asserte la grille **puis** le compte d'allumées, dans la même grandeur. (3) EFFET : G1/G2/G4 sont des
paramètres ; G0a-c, G3, G5, G6 rendent et comptent. (4) CONTRÔLES POSITIFS : `Image` sans `CanvasRenderer`, 4ᵉ clé, ordre
d'id, domaine amputé, 3 lignes/2 districts, 500 ; cible inerte : une case **éteinte**, jamais comptée comme allumée.
(5) VALEUR d'une clé PRÉSENTE : toutes partent d'un corps de **succès** à 3 clés, jamais d'une absence. (6) DIMENSIONNÉ : 4
états × (0, 1, 3, 72 lignes) + le cas `ash` = 5 scénarios, grille à son cardinal réel (18 × 4). (7) LIGNES ACTIVES : G2 et G4
lisent les **constantes compilées**, jamais un commentaire ni la maquette. (8) MÊME CLÉ : tous les comptes de cases portent
sur les enfants de la **même** grille, par le même nom d'objet.

## 8. Capture pour les juges (à prévoir, non jouée)
Quatre planches à **deux** résolutions (1080×1920, 1080×2400), à **t=0** : `ardoise_pleine` (72 lignes fabriquées),
`ardoise_partielle` (les 3 du cadre 106), `ardoise_nue` (`{lanes: []}`), `case_eteinte` (pied du cadre 108). Patron
`PlanchesParEcranCapturePlayModeTests.cs` + `CaptureSousShell.cs`. ⚠️ Le discriminant de débordement y est un **rouge**
(`Assert.IsEmpty(trous, …)` `:119`, alimenté `:553`) : 18 rangées débordent ⇒ la planche `_bas` est **due**, calibrée **par la
mesure** au créneau. Deux juges ⊥ (`juge-visuel` puis `juge-donnees`), agents neufs, référence = cadres 106/107/108/151.

## 9. Demandes à router par f2, et dettes (TD-1017..1019 puis TD-1040..1049)
**ATELIER** : amender **L3** du cadre 111 — « les quartiers portent un nom » est **livré**, pas manquant
(`district-names.ts:21-28`, `:33` ; servi par `/v1/world/districts` et par la projection de ㉟). Et **L1** (« le tableau
s'allume d'un coup ») est **livré** par l'énumérateur @`ef8be64e` : la carte des manques a deux lots de moins.
**BACK-1** : la liste des mots de §5 (TD-1017).
- **TD-1017** (NEW) les **29** mots de §5 sont ratifiés mais aucune clé `marche.*` n'est encore servie
  (`string_table.ts` @`2ed39589` : 0) ⇒ clé dérivée + repli **compté** sur ces textes exacts. Se ferme quand **BACK-3** sert
  les 29 clés ; ce n'est plus un trou de contenu, seulement un repli daté.
- **TD-1018** (NEW, ruling (A)) la colonne `ash` est **structurellement éteinte** et porte le pied 24a/24b : dit une fois dans
  le code, pour que l'absence de lignes ne soit jamais « corrigée » par une donnée fabriquée. **TD-966 est à inscrire par
  `lot/marche-ardoise-enumerateur`** (décision f2) — je ne l'ai pas mesurée : introuvable dans cet arbre comme dans `main`.
- **TD-1019** (NEW) les trois compteurs du cadre 106 sont **dérivés côté client** (D2 : le dénominateur n'est pas servi) :
  deux écrans pourraient en donner deux lectures. Se ferme si le back sert un compte, ou reste assumée avec G5 pour garde.
- **TD-1040** (NEW) les cadres **109** (tableau de région, 6 genres, `▲/=/▼`) et **110** (mur de réciprocité) sont **hors
  lot** : autres routes (`GET /me/meta-market/signal`, `PUT /me/meta-market/visibility`), autres préconditions, et un
  arbitrage user ouvert sur les prix de région (aside `:5670-5671`). ㉑ reste **incomplet** tant qu'ils ne sont pas livrés :
  écrit ici pour que personne ne les croie oubliés.
- **TD-1041** (NEW) l'aside signale une **contradiction mesurée non tranchée** du back (`meta-market-read.service.ts:11`
  affirme que `sample_count` n'est jamais exposé, le contrôleur `:99` le renvoie — `:5669`). Sans effet sur ce lot (㉑ ne
  l'imprime pas) ; à router à BACK-1 avec TD-1040.
