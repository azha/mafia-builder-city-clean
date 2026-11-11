# TD-879 côté CLIENT — ⑮ le registre de dispatch sur une ville VIDE — DESIGN v3, 2026-11-11

## Changements v2 → v3 (re-revue ⊥ v2 : NOT_APPROVED ; ruling f2 : option (a) RETENUE)
- **BLOCKING levé** : le seam `Func<int, FileData>` de la v2 **ne pouvait rendre qu'un succès** ⇒ G1 (18 × 404), son cas
  « No player profile » et G3 (18 × 500) étaient **inécrivables**, et 404 ne se distinguait pas de 500. Remplacé par un seam
  **qui porte le statut et le corps**, sur le patron **mesuré** du lot TD-938 (§6a) : `HlCardClient.cs:79`
  `public Func<string, (long statut, string corps)> ReponsePourTest;`, lu `:81-91`, déjà employé par
  `NavigationApresGestePlayModeTests.cs:206, 230, 254, 276` et `AccueilEtatsPlayModeTests.cs:246`. Édition de `LireFile`
  spécifiée.
- **Contrôle positif de G1 réécrit** (mineur a) : la v2 donnait un **second cas négatif**. Le vrai contrôle est le **même
  corps rejoué en 200 `EMPTY`** ⇒ `FilesVides == 18` ∧ `Files404 == 0` — il rougit si la garde cesse de discriminer.
- **Reformulé** (mineur b) : « RIEN à changer » était contredit par les éditions de `:176`/`:177`. Dit exactement ce qui change.
- **Re-mesuré** (mineur c) : le pied de la branche pleine est **`:255`**, `RendreDepot()` **`:256`** (v2 : `:254`).
- **TD-1012 re-mesurée** (mineur d) : le discriminant de débordement **est un ROUGE**, pas un relevé — `Assert.IsEmpty(trous,
  …)` (`PlanchesParEcranCapturePlayModeTests.cs:119`), `trous` alimenté `:553` sous la condition `identiques ||
  !course.AtteintLeBout` (`:550`) ; le cas « tout tient » est le seul relevé (`:545`, `continue`). Les `:528-530` que citait la
  v2 sont des **commentaires** : corrigé.
- **Retrait de l'ancien message** : énoncé **DATÉ avec son détecteur** (ruling f2), spécifié en §5a.
- **Option (b)** (404 ⇒ erreur) : **NON RETENUE**, conservée en une ligne pour mémoire (§3).
- **v3.1** (APPROVED + retouches f2) : le contrôle positif de G1 porte le **corps 200 EMPTY**, pas le corps d'erreur de (i)
  rejoué en 200 — celui-ci rendrait `payload.data` null ⇒ refus « corps sans `payload.data` » ⇒ `FilesVides == 0`, vert pour la
  mauvaise raison (§6b, G1) ; la phrase « une seule variable change » est retirée. En-tête : têtes re-mesurées à la **v3**.

Arbre `/home/erutheone/project/mafia-unity-C1`, br. `lot/client1-td891-2026-11-11` (le code ira sur une branche dédiée créée
par f2). Backs lus en **lecture seule**, têtes **re-mesurées à l'écriture de cette v3** : back **SERVI**
`/home/erutheone/project/mafia-clean-city` `main` = **`2ed39589`** · back **à venir** `/home/erutheone/project/mafia-dette-b2`
`dette/b2-fin-tranche-2026-11-11` = **`3bb33665`**. Tout fait porte `fichier:ligne` relu ici ; le reste est **non mesuré**.
Rien de commité, ni Unity ni PlayMode.

## Changements v1 → v2 (re-revue ⊥ v1 : NOT_APPROVED)
- **BLOCKING levé par la mesure, et il invalide la normalisation de la v1** : les **deux** 404 de
  `GET /v1/city/district/:id/inspection` sont **indiscernables** par ce que le back SERT (§2). ⇒ « 404 ⇒ `FileVide(id)` » est
  **RETIRÉ**. Les 18 lignes VIDE viennent du **200 `EMPTY`** seul ; le 404 **garde le comportement d'aujourd'hui** (§3).
  Option conservatrice de f2 (404 ⇒ erreur) écrite et **non retenue en reco** : elle régresse (§3, Q1).
- **Une seule tête, re-mesurée** : l'en-tête ne cite plus `8bdb54d1`. La v1 avait en outre écrit « `inspection-empty-state.ts`
  non trouvé » : **FAUX** — le fichier existe et, à `3bb33665`, il est **câblé** (§1).
- **`EtatVide` lu par réflexion hors de ⑮** : effet sur l'étiquette des planches tranché et chiffré (§6).
- **Mineurs re-mesurés par `grep -n`, lignes collées** (§5) : le `return` de la branche vide est **`:248`** (v1 : `:244`) ·
  `Registre_18Districts_ToutOuRien_SurLeCompteSeme` est **`:90`** (v1 : `:88`) · l'assertion du liège borné est **`:245`**
  (v1 : `:244`) · `Vide_LeLiegeEstBorne_…` **`:216`**, sa prémisse **`:236`**.

## 1. Les deux réponses — ce qui est codé où
**Back SERVI (`main` `2ed39589`) : 404.** `inspection.controller.ts` : hors 1..18 ⇒ `VALIDATION_FAILED` (`:84-86`, 422) ;
pas de profil ⇒ `RESOURCE_NOT_FOUND` (`:93`) ; `projectDistrict` rendu `null` ⇒ `RESOURCE_NOT_FOUND` (`:97-100`).
**Back À VENIR (`3bb33665`) : 200 vide CODÉ.** `projectDistrict(...): Promise<InspectionQueueProjection>` **sans `| null`**
(`inspection.projection.service.ts:98`), `const stored = await this.inspection.getQueueRaw(…)` (`:99`),
**`const raw = stored ?? emptyQueueState(districtId);`** (`:100`), import `:32` ; `emptyQueueState` est PURE —
`{ district_id, entries: [], length: 0, processing_rate_per_day: 4, budget_modifier: 0 }` (`inspection-empty-state.ts:9-11`) ;
unitaire `tests/unit/citysim/td879_file_vide_unit.spec.ts:19-52`. Les deux `RESOURCE_NOT_FOUND` qui restent au contrôleur y
sont « No player profile » (`:93`, `:136` — `:136` est la route de **dépôt**, pas celle de lecture).
**Corps du 200 vide, vérifié aux deux têtes** : `district: "district-<id>"` (`:101`/`:102`) · `queue_load = loadBucket(0, id)`
→ `count <= LIGHT_FRACTION` avec `LIGHT_FRACTION = 0.0` (`:73`) ⇒ **`EMPTY`** (`:115`) · `severity_distribution` =
`presenceBand(0,0)` → `total <= 0` ⇒ **`NONE`** × 4 · `type_distribution` ⇒ **`NONE`** × 6 (`SCHEDULED, INFORMANT,
FALSE_REPORT, GENUINE_REPORT, CASCADE, FORENSIC`, domaine `inspection.repository.ts:56`).
**D'où vient `NOMINAL`** : `dispatcherRegime` (`inspection.service.ts:882-888`) — `budget_modifier < 0` ⇒ `BUDGET_CUT`, `> 0`
⇒ `SURGE`, `length >= cap * BACKLOGGED_FILL_RATIO` ⇒ `BACKLOGGED`, **sinon `return 'NOMINAL'` (`:888`)**. Sur l'état vide les
trois gardes sont fausses ⇒ `NOMINAL` est la **retombée** de la fonction, pas un régime mesuré. ⇒ **le test de vacuité du
client est `queue_load == "EMPTY"`, jamais le régime** (ruling f2).

## 2. BLOCKING — il n'existe AUCUN discriminant sûr entre les deux 404
Mesuré sur le back **servi** (`main` `2ed39589`), les deux seuls 404 de la route de lecture :

| | code | `http_status` | `user_facing_i18n_key` | `details` | `message` (texte libre, anglais, dev) |
|---|---|---|---|---|---|
| pas de profil | `RESOURCE_NOT_FOUND` | 404 | `error.resource.not_found` | **aucun** | `No player profile for this account.` (`:93`) |
| file pas semée | `RESOURCE_NOT_FOUND` | 404 | `error.resource.not_found` | **aucun** | `No inspection queue for this player yet (the city sim has not ticked the 12h dispatch).` (`:98-100`) |

`RESOURCE_NOT_FOUND` : `http_status: 404`, `user_facing_i18n_key: 'error.resource.not_found'`, `retryable_class: 'NEVER'`
(`protocol/error-codes.ts:103-107`) — **une seule entrée pour les deux**. ⇒ **code identique, clé servie identique, aucun
`details` : seul le `message` anglais de développeur diffère.**
Et le client **ne lit même pas le corps** d'un 404 ici : `LireFile` fait `onErr?.Invoke(req.responseCode, req.error ?? "network
error")` (`InspectionClient.cs:30-33`) — `req.error`, pas `downloadHandler.text`.
**Rejetés, avec leur raison** : (a) discriminer sur le `message` ⇒ le client parserait une phrase anglaise **non servie**, qui
peut changer sans préavis et qui n'est pas une clé joueur ; (b) corroborer par une autre route (« pas de profil » ferait aussi
échouer la route des bâtiments, `InspectionScreenController.cs:161`) ⇒ **inférence sans auteur**, et `LireDistricts` est une
route **publique** (`InspectionClient.cs:43-45`) qui réussirait dans les deux cas — **non mesuré** pour les bâtiments.
⇒ **Conséquence** : la v1 aurait rendu **18 lignes « VIDE », sans erreur**, à un compte **sans profil** — l'écran aurait menti,
et G2 aurait été **verte dessus**. La normalisation au bord est retirée.

## 3. Décision — les 18 lignes viennent du 200 `EMPTY` SEUL
`queue_load == "EMPTY"` est le test de vacuité (ruling f2). Le 404 n'est **pas** traduit en file vide.

| cas | `DerniereErreur` | `FilesOuvertes` | rendu |
|---|---|---|---|
| 18 × 200 `EMPTY` (back à venir) | null | 18 | **18 lignes VIDE** au format du cadre 32, pas de fiche |
| 18 × 404 (back servi) | null | 0 | l'état vide **d'aujourd'hui**, inchangé (fiche + phrase de la police) |
| mixte 200 (pleines + vides) | null | 18 | le registre mixte, inchangé |
| 1..17 districts en 500/réseau | non null | < 18 | le registre des lues ; les défaillantes restent `f == null` ⇒ « — » éteint (`:345-350`, déjà codé) |
| 18 × 500 / réseau | non null | 0 | la fiche, **« La file n'a pas répondu. »** (`:246`) |
⇒ **jamais** un « rien nulle part » sur une ville vide servie en 200, **jamais** un registre qui mentirait sur une panne, et
**aucune** régression sur le back servi. Le lot est **strictement additif** : il n'enlève rien au chemin 404.

**Changement minimal, exactement (mineur b)** — la **logique de vacuité** n'est pas touchée : `EtatVide = FilesOuvertes == 0`
(`:228`) reste tel quel, et avec le 200 vide `FilesOuvertes == 18` ⇒ `EtatVide` faux ⇒ la boucle `:250-253` dessine déjà les 18
lignes, sans aucune retouche de rendu. Le lot édite **trois** choses, toutes sans effet visuel :
1. `:176` (`f => { Files[k] = f; FilesOuvertes++; }`) ⇒ **ajout** de `if (f.queue_load == "EMPTY") FilesVides++;` ;
2. `:177` (`(c, m) => { if (c != 404) DerniereErreur = $"{c}: {m}"; }`) ⇒ **ajout** de `else Files404++;` dans la branche 404
   (le 404 continue d'être avalé **et** n'écrit **jamais** `Files[k]`) ;
3. `:170-171` ⇒ remise à 0 de `FilesVides` et `Files404` avec `FilesOuvertes`.
`FilesVides` et `Files404` sont des **crochets de test** : ce sont eux qui rendent G1/G2/G3 écrivables, et eux seuls.

**Option (b), NON RETENUE** (ruling f2 : (a) retenue) — « 404 ⇒ erreur » : sur le back servi, un compte frais afficherait
« La file n'a pas répondu. » (`:245`) alors que **rien n'est en panne**, échangeant un mensonge contre un autre. Le compte sans
profil reste donc dit par la phrase de la police : défaut **préexistant**, écrit en **TD-1010** (routée à BACK-2 par f2).

## 4. Ce que le cadre 32 dessine — relu par son TEXTE (amendement accepté par f2)
`~/project/atelier3d-mafia/ecrans-brennar-6.html`, **159 cadres** (compté), index **32** (0-based) **confirmé**. 105 jetons,
**5 colonnes** `DISTRICT | N | CHARGE | REGIME | ORIGINES`, **18 rangées**, dont **10 VIDE** (compté) de forme exacte :
```
QUAI-NORD | 0 | VIDE | NOMINAL | —
```
⇒ le cadre 32 **ne dessine pas 18 lignes VIDE** : il dessine un registre **mixte** dont on prend **la forme d'une ligne
VIDE**, répétée 18 fois quand la ville entière est vide (V17, paraphrase). Pied identique (`:236`, `:256`).
**Le rendu existe déjà** — mesuré sur `Ligne(parent, id, nom, f)` (`:317-352`) avec `EMPTY` / `NOMINAL` / bandes `NONE` :
pas de zébrage (la teinte n'est posée que si `f.queue_load != "EMPTY"`, `:325-328`) · `tendu` faux (`:323`) ⇒ encre normale ·
**CHARGE** = `Dire(ChargeDeLaFile, "EMPTY")` (`:345-346`) → `"vide"` (`MotsDesEnumeres.cs:72`) + `FontStyles.UpperCase`
(`:346`) ⇒ **« VIDE »** · **RÉGIME** = `Dire(Regime, "NOMINAL")` (`:347-348`) → `"nominal"` (`MotsDesEnumeres.cs:76`) ⇒
**« NOMINAL »** · **ORIGINES** = `Origines(…)` (`:349`) : `BandeRang("NONE") = 0` (`:375-376`) ⇒ rien n'est ajouté (`:369-372`)
⇒ `parts.Count == 0` ⇒ **`"—"`** (`:366`). ⇒ **aucun changement de rendu n'est dû.**
⚠️ La colonne **`N`** (`0`) n'est **ni servie** (aucun compte n'échappe au back, `inspection.projection.service.ts:93-96`,
Inv 4 / P5) **ni rendue** (en-tête à **4** colonnes, `:307-310`) ⇒ **TD-989**.

## 5. Ce qui reste de l'ancien état vide (ruling f2 : retrait)
Le bloc `if (EtatVide)` est `:237-249`, `return` à **`:248`** (mesuré ; v1 disait `:244`) :
```
237:            if (EtatVide)
242:                videTexte.text = DerniereErreur == null
243:                    ? "La police n'a pas encore ouvert ses files — elle les ouvre sur les 18 districts à la fois."
244:                      + "\n" + MafiaCleanCity.I18n.Libelle.Gabarit("inspection.vide.aucune_inspection_en_cours", "Aucune inspection en cours.")
245:                    : "La file n'a pas répondu.";
246:                RendreDepot();
248:                return;
```
**Reste** : la fiche, `videTexte` (`:234`), le liège borné `HauteurSupportInspectionVideCss` (`:231`), la branche d'erreur
`:245`, et la phrase de la police `:243-244` **tant que le back servi 404e**.
**Inchangé** : pied de la branche vide `:236` et de la branche pleine **`:255`**, sous-titre `:233`, `RendreDepot` dans les
deux branches (`:246` et **`:256`**), ③ (`CityMapController.cs:1151-1152` — laissé, la revue l'a jugé juste).

### 5a. Le retrait du message : un ÉNONCÉ DATÉ qui porte son détecteur (ruling f2)
La branche `:243-244` devient **inatteignable** le jour où le back servi rend 200 `EMPTY` sur un compte frais — pas avant :
l'écrire retirée maintenant la rendrait **fausse** sur `main 2ed39589`. **L'énoncé daté** : « au 2026-11-11, sur
`mafia-clean-city main 2ed39589`, un compte frais reçoit 18 × 404 et ⑮ dit la phrase de la police (`:243-244`) ».
**Son détecteur — OÙ et QUOI** : dans `EtatVide_SurUn404DeFile_DitLaPhraseDeLaPolice` (§6, la propriété (ii), qui tourne
**contre la pile réelle** sur un compte frais), une assertion **sur le code servi**, pas sur le texte :
`Assert.AreEqual(0, ecran.FilesVides, "TD-879 : la pile sert désormais 200 EMPTY sur un compte frais — retirer la phrase de
la police (InspectionScreenController.cs:243-244) et cet énoncé daté")`.
⇒ **l'événement qui la fait rougir est exactement celui qui périme l'énoncé** : `FilesVides` ne peut passer de 0 à 18 que si
la route a répondu 200 `EMPTY`. Ni un 500, ni un réseau coupé, ni un changement de maquette ne la font bouger. Le message de
l'assertion **nomme la ligne à retirer** : le prochain créneau n'a rien à redécouvrir.

**Sites CLIENT de la chaîne de ⑮ — recompte scopé.** Le `grep -n '404|EtatVide|FilesOuvertes|LignesRendues'` sous `Assets/`
**rend 77 fichiers** (`404` est l'idiome d'erreur de toute la maison ; `EtatVide` celui de 10 écrans). Scopé à ⑮ : **13 sites,
5 fichiers** — `InspectionScreenController.cs` `:176`, `:177`, `:228`, `:231`, `:234`, `:237-249`, `:250-253` ·
`InspectionClient.cs` `:19-21`, `:30-33` · `CityProjectionDtos.cs` `:83`, `:306` · `CityMapController.cs` `:1151-1152` ·
`InspectionScreenPlayModeTests.cs` `:103`, `:112-124`, `:236` · `PlanchesParEcranCapturePlayModeTests.cs` `:634` ·
`CaptureSousShell.cs` `:342`. (Le §6 du design back annonce « 10 sites » : désaccord de **périmètre**, pas de fait.)

## 6. Tests remplacés, gardes neuves, et les lecteurs par RÉFLEXION
### 6a. Le seam — il doit porter le STATUT et le CORPS (BLOCKING de la v2)
`InspectionClient` n'a **aucun** substitut (`grep -c Substitut` = **0**). La v2 proposait `Func<int, FileData>` : il **ne rend
qu'un succès**, donc 18 × 404, le cas « No player profile » et 18 × 500 étaient **inécrivables** et 404 ne se distinguait pas
de 500. ⇒ **patron mesuré du lot TD-938, déjà en place dans cet arbre** :
```
HlCardClient.cs:79        public Func<string, (long statut, string corps)> ReponsePourTest;
HlCardClient.cs:83            if (ReponsePourTest != null)
HlCardClient.cs:85                (long statut, string texte) = ReponsePourTest(path);
HlCardClient.cs:86                bool succes = statut >= 200 && statut < 300;
HlCardClient.cs:89                if (succes) onOk?.Invoke(texte);
HlCardClient.cs:90                else onErr?.Invoke(statut, $"{path} failed ({statut}) (réponse de test)");
```
(employé par `NavigationApresGestePlayModeTests.cs:206, 230, 254, 276` et `AccueilEtatsPlayModeTests.cs:246` ; sa doc `:77-78`
dit la propriété qui compte : « le corps passe par le MÊME chemin de lecture que la réponse réseau — seul le transport est
remplacé ».)
**NEW sur `InspectionClient`** : `public Func<int, (long statut, string corps)> ReponsePourTest;` — indexé par **district**,
puisque c'est la variable de ⑮ (18 appels, un par district, `InspectionScreenController.cs:172-178`).
**Édition de `LireFile`** (`InspectionClient.cs:22-41`) : insérer **en tête du corps**, avant le `using (UnityWebRequest …)`
de `:25` :
```
if (ReponsePourTest != null)
{
    (long statut, string texte) = ReponsePourTest(districtId);
    if (statut < 200 || statut >= 300) { onErr?.Invoke(statut, $"inspection {districtId} failed ({statut}) (réponse de test)"); yield break; }
    FileData dto = null;
    try { dto = JsonUtility.FromJson<FileEnvelope>(texte)?.payload?.data; }
    catch (Exception ex) { onErr?.Invoke(statut, "parse error: " + ex.Message); yield break; }
    if (dto == null) { onErr?.Invoke(statut, "corps sans `payload.data`"); yield break; }
    onOk?.Invoke(dto); yield break;
}
```
⇒ **le même chemin de lecture que le réseau** : `JsonUtility.FromJson<FileEnvelope>(…)?.payload?.data` est **recopié** de
`:36`, et les deux refus (`parse error`, `corps sans payload.data`) de `:37-38` ; seul le transport est remplacé. Un seam qui
désérialiserait autrement prouverait le seam, pas le client.

- **`Registre_CompteFrais_RienNullePart_18Fois404` (`:112-124`) → REMPLACÉ** par **deux** propriétés disjointes, pas une
  assouplie : (i) `Registre_DixHuitLignesVides_SurLe200Vide` (substitut, 18 × `EMPTY`) ⇒ `LignesRendues == 18`,
  `EtatVide == false`, `DerniereErreur == null`, **18** lignes dont `Charge` = « VIDE », `Regime` = « NOMINAL », `Origines` =
  « — » ; (ii) `EtatVide_SurUn404DeFile_DitLaPhraseDeLaPolice` (compte frais réel) ⇒ `EtatVide == true`,
  `LignesRendues == 0`, `DerniereErreur == null`, `videTexte.text` commence par « La police n'a pas encore ouvert ». (i) et
  (ii) sont **contradictoires** avec l'ancienne assertion `0 == LignesRendues` (`:123`) **seulement** sur le 200 vide : (ii)
  conserve la propriété d'origine, (i) en ajoute une neuve — c'est ce que « deux réponses » veut dire une fois le BLOCKING pris
  en compte.
- **`Vide_LeLiegeEstBorne_…` (`:216-247`)** : prémisse `:236` `Assert.IsTrue(ecran.EtatVide, "prémisse : un compte frais n'a
  aucune file ouverte")` — **tient toujours** sur le back servi (404) ⇒ **garde conservée telle quelle**, assertions de
  géométrie inchangées (liège borné **`:245`**, trou ≤ 25 % `:247`). ⚠️ Elle devient insatisfiable **le jour** où le back à
  venir arrive : la prémisse devra alors être fabriquée par substitut (18 × 500) et non par un compte frais ⇒ **TD-1011**
  (détecteur : c'est `:236` lui-même qui rougira, au bon moment, sur la bonne ligne).
- **`Registre_18Districts_ToutOuRien_SurLeCompteSeme` (`:90`)** : assertions inchangées ; le message `:103` (« sur pile neuve,
  18 × 404 est l'état normal ») est **paraphrasé** (V17) — il devient faux quand le back à venir arrive.

**Gardes neuves**
- **G1 DISCRIMINANT — exigée par la revue** : un 404 n'est **jamais** traduit en file vide. Trois cas par le seam §6a, le
  corps réel de §2 : (i) 18 × `(404, corps « No inspection queue … 12h dispatch »)` ⇒ `Files404 == 18` ∧ `FilesVides == 0` ∧
  `EtatVide == true` ∧ `LignesRendues == 0` ; (ii) 18 × `(404, corps « No player profile »)` ⇒ **le même résultat** (c'est le
  fait de §2 : les deux corps sont indiscernables — code `RESOURCE_NOT_FOUND`, clé `error.resource.not_found`, aucun
  `details`) ; (iii) 18 × `(500, …)` ⇒ `Files404 == 0` ∧ `DerniereErreur != null` — **404 ≠ 500**, ce que le seam de la v2 ne
  pouvait pas montrer. **Contrôle positif (mineur a, corrigé en v3.1)** : 18 × `(200, corps 200 EMPTY)` — **le corps de §0**,
  `{"payload":{"data":{ district, queue_load:"EMPTY", dispatcher_regime:"NOMINAL", severity_distribution:…, type_distribution:… }}}`
  ⇒ `FilesVides == 18` ∧ `Files404 == 0` ∧ `EtatVide == false`. ⛔ Il **ne peut pas** rejouer le corps d'erreur de (i) avec un
  statut 200 : `JsonUtility.FromJson<FileEnvelope>` d'un corps `payload.error` rend `payload.data` **null** ⇒ le seam part sur
  son refus « corps sans `payload.data` » (`InspectionClient.cs:38`, recopié dans le seam) ⇒ `FilesVides == 0`, et le contrôle
  serait **vert pour la mauvaise raison**. Corps **et** statut changent donc entre le contrôle et (i) — c'est le prix de ce
  chemin de lecture, et c'est écrit plutôt que maquillé. Le message de G1 **nomme** l'indiscernabilité de §2 : la garde rougit
  si quelqu'un réintroduit la normalisation de la v1.
- **G2 EFFET (200 vide)** : 18 × `EMPTY` ⇒ `LignesRendues == 18`, **aucune** fiche (`host.transform.Find("Fiche")` nul), et le
  **compte** de lignes dont la colonne `"Charge"` lit « VIDE » == **18**. *Anti-vacuité* : le même compte sur un registre
  mixte (substitut à la distribution du cadre 32 : 8 pleines / 10 vides) rend **10**, pas 18.
- **G3 ERREUR ≠ VIDE** : 18 × 500 ⇒ `EtatVide == true`, `DerniereErreur != null`, `videTexte.text` == « La file n'a pas
  répondu. » (`:245`), `LignesRendues == 0`. *Contrôle positif* : 17 × `EMPTY` + 1 × 500 ⇒ `LignesRendues == 18` **et**
  `DerniereErreur != null` — la panne partielle ne bascule pas en fiche.
- **G4 SOURCE DES MOTS** : `ChargeDeLaFile` porte la clé `EMPTY` et `Regime` la clé `NOMINAL` (`MotsDesEnumeres.cs:72`,
  `:76`) ; rougit si un mot servi disparaît (le registre dirait l'énuméré brut).

**Lecteurs par RÉFLEXION de `EtatVide` (demande de la revue)** — deux sites, aucune assertion, que des étiquettes :
`PlanchesParEcranCapturePlayModeTests.cs:634` `if (v != null && lire("EtatVide") is bool vide && vide) v += " · état vide";`
et `CaptureSousShell.cs:342` (diagnostic, imprime `EtatVide=…`). **Valeur attendue** : sur le back **servi**, un compte frais
garde `EtatVide = true` ⇒ l'étiquette de la planche E09 **ne change pas** (c'est l'effet de la reco de Q1 : aucune planche ne
bouge dans ce lot). Sur le back **à venir**, `EtatVide` passe à **false** ⇒ le suffixe « · état vide » **disparaît** et la
planche montre le registre de 18 lignes — attendu et juste, mais la planche passe d'une fiche courte à une liste de 18
rangées, ce qui peut déclencher le **discriminant de débordement** de ce même test (`:528-530` : « une liste qui déborde sans
atteindre son bout … le test rougit ») ⇒ **TD-1012**.

**V19 — huit questions.** (1) ÉVÉNEMENT : réintroduire « 404 ⇒ file vide », ou un back qui cesse de servir `EMPTY` ⇒ G1/G2
rougissent ; classe DONNÉE (chaînes d'énumérés + code d'erreur). (2) DÉGÉNÉRÉ : « 18 lignes » serait vrai aussi pour 18 lignes
**éteintes** (`f == null`, « — ») ⇒ G2 asserte en plus le **compte de « VIDE » == 18**, dans la grandeur assertée (des textes
de colonne, pas un booléen). (3) EFFET : G1 et G4 sont des paramètres ; G2/G3 comptent les **lignes rendues** et lisent le
**texte** des colonnes. (4) CONTRÔLES POSITIFS : 404 « No player profile » (G1), registre mixte (G2, anti-vacuité), panne
partielle (G3) ; cible INERTE = la fiche `"Fiche"`, qui ne doit **pas** exister dans G2. (5) VALEUR d'une clé PRÉSENTE :
G2/G3 lisent `queue_load`/`dispatcher_regime` **servis** sur un corps de succès, jamais l'absence de `Files[k]` ; G1 lit le
**code servi** du refus, pas son message anglais. (6) DIMENSIONNÉ : 18 districts × (200 vide, 404 file, 404 profil, mixte,
panne totale, panne partielle) = 6 scénarios nommés. (7) LIGNES ACTIVES : G4 lit les dictionnaires C# compilés ; les
commentaires 404 de `CityProjectionDtos.cs:83, :306` et `InspectionClient.cs:19-21` sont mis à jour mais **jamais assertés**.
(8) MÊME CLÉ : les comptes de G2 portent tous sur les enfants `L_1..L_18` de `corps` et sur la colonne nommée `"Charge"`.

## 7. Dettes
- **TD-989** la colonne **`N`** du cadre 32 n'est **ni servie ni rendue** (`inspection.projection.service.ts:93-96` ;
  en-tête à 4 colonnes `:307-310`). Écart **préexistant**, classe C. Se ferme si le back sert une **bande** de compte, ou si
  l'atelier retire la colonne.
- **TD-1010** (NEW) un compte **sans profil** reçoit le **même** 404 que « file pas semée » (code, clé et absence de `details`
  identiques, §2) ⇒ ⑮ lui dit « La police n'a pas encore ouvert ses files » : phrase **fausse** pour ce compte. Défaut
  **préexistant**, désormais écrit. Se ferme quand le back distingue les deux (code propre, `details`, ou clé servie
  distincte) — **demande à router à BACK-2**, c'est la seule correction qui rende le client capable de trancher.
- **TD-1011** (NEW) `Vide_LeLiegeEstBorne_…:236` devient insatisfiable par un compte frais le jour où le back à venir arrive
  sur la pile ; la prémisse passera à un substitut (18 × 500). Détecteur : `:236` lui-même.
- **TD-1012** (NEW) la planche E09 passe d'une fiche courte à un registre de 18 rangées quand le back sert `EMPTY`.
  **Re-mesuré (mineur d)** : le discriminant est un **ROUGE**, pas un relevé — `Assert.IsEmpty(trous, "liste(s) qui débordent
  à la résolution de capture sans que le défilement atteigne leur bout (contenu INATTEIGNABLE) …")`
  (`PlanchesParEcranCapturePlayModeTests.cs:119`), `trous` alimenté à **`:553`** sous la condition `identiques ||
  !course.AtteintLeBout` (**`:550`**) ; le seul **relevé** est le cas « tout tient (contenu − fenêtre < 12 u) » (**`:545`**,
  suivi d'un `continue`). Les `:528-530` cités par la v2 sont des **commentaires** : corrigé. ⇒ le recalibrage se fait **PAR
  LA MESURE** au créneau (ruling f2), sur les grandeurs que le test imprime lui-même (`course.Fenetre`, `course.Contenu`,
  `course.Remontee`, `course.Attendue`, `:549`, `:552`) — **jamais un seuil deviné**, et rien n'est à toucher avant d'avoir le
  journal du run.
- **Sans id neuf** : le 200 vide est **codé** à `3bb33665` et ne l'était pas à `8bdb54d1` — suivi par **TD-879 côté BACK-2**.
  **Péremption** : §1 et §2 sont datés de `main 2ed39589` / `b2 3bb33665` ; l'événement qui les invalide est un commit sur
  l'une des deux branches, ce qui est arrivé **pendant** la rédaction de la v1. §3 à §6 ne dépendent d'aucune des deux têtes.
