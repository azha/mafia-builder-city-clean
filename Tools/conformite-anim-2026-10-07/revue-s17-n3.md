# Revue ⊥ n°3, très ciblée — delta du commit `4d0c3dbd` (§17 v4.6)

Dépôt `/home/erutheone/project/mafia-unity-anim`, branche `design/conformite-anim-2026-10-07`, HEAD `4d0c3dbd`.
Lecture seule : rien écrit dans le dépôt, aucun commit, aucun Unity lancé. Auteur ≠ relecteur : je n'ai écrit ni
le §17, ni le catalogue, ni `Regie.cs`, ni le test neuf.

## 1. Verdict et comptes

**NOT_APPROVED — 1 BLOCKING, 4 IMPORTANT, 5 mineurs.**

| compte | mesure (binaire, pas un affichage) |
|---|---|
| points de n2 (1 B + 7 M + 6 m) | **14** |
| fermés | **12** |
| mal fermés | **1** (M1 → B1 ci-dessous) |
| fermés au design, ouverts dans le CODE | **1** (m2 : `Gardes.cs:280`) |
| appels de `AttacherRetourAppui` dans `Assets/Scripts` | **0** (grep : seules la déclaration `Regie.cs:85` et deux commentaires) ⇒ le déplacement de `VerifierAdmise` ne casse aucun chemin de production |
| appels de `AttacherRetourAppui` dans les tests | **4** (`MouvementsRegiePlayModeTests.cs:105`, `:116`, `:145`, `:222`), tous avec une `Entree` `Admise(…)` sauf le hors-catalogue voulu ⇒ **aucun test existant cassé** |

Ce que je salue, vérifié ligne à ligne :
- **Le BLOCKING de n2 est fermé net.** `design-couche-mouvement.md:239` : « **sur le plus grand des trois canaux
  R, G, B** » ; le second axe (sRGB / linéaire) est tranché lui aussi (« telles que Unity les stocke dans `Color` »).
  Les trois nombres cités (R 5,9 · G 4,6 · B 2,1) sont recalculés justes sur `InspectionScreenController.cs:415`
  (`fondBouton.color = new Color(Or.r, Or.g, Or.b, 0.18f)`, lu).
- **m4 est fermé par du CODE et un vrai test à mutation.** `Regie.cs:92` `VerifierAdmise(appui);` est maintenant
  AVANT le `if` de `:93` ; le test `:207-224` remplit les 10 places `Melange`, épingle `Assert.IsFalse(regie.PlaceMelangeLibre)`,
  passe un `appui` NON admis avec un `voile` admis non nul, et exige le `throw` **plus** `BasculesVoile == 0`. Sous mutation
  (retour de `VerifierAdmise` après le `if`), la branche voile attache et le test rougit sur les deux assertions. Aucun
  autre test ne régresse : les 3 autres appels passent des entrées admises.
- M3, M4, M5, M6, M7, m1, m3, m5, m6 de n2 sont tous fermés, et les arithmétiques du catalogue l.1181
  (7 + 7 + 1 + 1 = 16) et de la réserve (15 + 1) se recomptent justes.

## 2. Statut de chaque point de n2

| n2 | statut | preuve |
|---|---|---|
| **B1** canal de `RendSurface` | **FERMÉ** | `design:239` « le plus grand des trois canaux R, G, B, en valeurs sRGB 0-255 » ; résidus de rédaction ⇒ IMPORTANT 1 + mineur 3 |
| M1 `AttacherRetourAppui` ne garde que le `Genre` | **MAL FERMÉ** | la garde promise est G14 (`design:141`), **de source** ; elle n'est pas écrivable et serait rouge aujourd'hui ⇒ **BLOCKING B1**. `Regie.cs:88` ne teste toujours que `appui.Genre != Genre.Retour` |
| M2 chemins de refus non neutralisés | **FERMÉ** (liste présente) | `design:252-258`. Vérifiée contre `Creer` : conforme sauf deux bornes manquantes ⇒ IMPORTANT 3, IMPORTANT 4, mineur 5 |
| M3 catalogue `:343` | **FERMÉ** | `catalogue-mouvements.md:343` porte « **à défaut le `Graphic` porté par le GameObject du bouton** » et « appel **obligatoire** par `Regie.AttacherRetourAppui` » |
| M4 `CanvasGroup` du nœud lui-même | **FERMÉ** | `design:239` « du GameObject de `g` lui-même et de ses ancêtres » ; `design:244` idem pour `Peint`, « jusqu'à la racine du Canvas » |
| M5 seuil nu de `Peint` | **FERMÉ** | `design:244` « 0,20 × max(R,G,B) × color.a × (alpha cumulé …) … atteint `SeuilCouleurRendue` » ; calculabilité sur un `TMP_Text` ⇒ IMPORTANT 2 |
| M6 « 18 sur 48 » du catalogue | **FERMÉ** | `catalogue:1181-1182` recompté sur le quota non-`Ambiance`, « la place réservée … est porteuse, ne la retirez pas » |
| M7 protocole de relevé de G9 | **FERMÉ** | `design:286-290` : régie vierge + `Detacher` après chaque bouton + états montables nommés. `RegieMouvement.PourTest()` existe et PUBLIE la régie comme `Courante` (`RegieMouvement.cs:47-56`) : le protocole est exécutable |
| m1 G14 dans la table | **FERMÉ** (ligne présente) | `design:141`, colonne « source » ⇒ voir B1 |
| m2 le « 8 » | **FERMÉ au catalogue, OUVERT dans le code** | `catalogue:1391` « (proposé à 8, ramené à 10 deux phrases plus bas) » ✔ ; `Gardes.cs:280` dit encore « Le plafond de 8 pistes `Melange` vivantes » ⇒ mineur 1 |
| m3 `Reglage.Defaut` / `quandFini` | **FERMÉ** | `design:257-258` |
| m4 G1 sur le chemin du voile | **FERMÉ, bien fermé** | `Regie.cs:92` + test `:207-224` (voir §1) |
| m5 prédicat de `Reduit` | **FERMÉ** | `design:91` reproduit exactement `PolitiqueMouvement.cs:30` (`Melange` d'un `Retour`, ou `Alpha` sans `PoseDefinie`) ; symbole cité faux ⇒ mineur 2 |
| m6 `RectMask2D` | **FERMÉ** | `design:241` : « il filtre aussi les raycasts … un écart de nuance (C), pas un retour invisible » |

## 3. Constats neufs

### BLOCKING

**B1 — G14 n'est pas écrivable en source, et serait ROUGE aujourd'hui : la fermeture de M1 (n2) ne tient pas, et
le trou qu'elle visait reste ouvert.**

*Où* : `design-couche-mouvement.md:141` (colonne « s'exécute » = **source**), `dettes-design-mouvement.md:21`.

*Citation* : « (b) `AttacherRetourAppui(` n'est appelé que depuis `Retour.cs` (E2), avec ces deux `Id` seulement —
jamais `retour.appui-long` ni `carnet.en-main` ».

*Preuve* :
1. **Rouge par construction.** `AttacherRetourAppui(` est appelé depuis `Assets/Tests/PlayMode/MouvementsRegiePlayModeTests.cs:105`,
   `:116`, `:145` et `:222` — **dont le test ajouté par ce commit** — jamais depuis `Retour.cs` (qui n'existe pas
   encore), et avec les `Id` `t.appui`, `t.appui.q`, `t.appui.g1`, `t.voile*` : ni l'un ni l'autre des deux `Id` du
   catalogue. Le design ne borne pas le périmètre du scan ; le seul précédent de garde de source du dépôt, G7, scanne
   `Assets/Scripts/ShellContracts/Mouvements` et RIEN d'autre (`MouvementsGardesPlayModeTests.cs:315-317`).
2. **Non écrivable, même bien bornée.** Le membre « avec ces deux `Id` seulement » porte sur l'**`Id` d'une `Entree`
   passée par référence** : `Retour.cs` écrira `regie.AttacherRetourAppui(catalogue.RetourAppui, …)`, et le littéral
   `"retour.appui"` ne sera pas au site d'appel (il est dans le fichier de catalogue). Aucun scan textuel ne décide la
   propriété ; c'est une propriété d'exécution.
3. **Le trou reste donc ouvert.** `Regie.cs:88` ne garde que le `Genre` : `if (appui.Genre != Genre.Retour) throw …`.
   N'importe quel `Retour` (`retour.appui-long`, `carnet.en-main`) prend encore la place réservée. Et `design:259`
   AFFIRME le contraire — « **Seul `retour.appui` / `retour.appui-voile` passe par cette méthode** (G14) » — ce que ni
   le code ni les tests ne tiennent : contradiction design ↔ code.

*Pourquoi BLOCKING* : garde impossible (critère de gate), plus une affirmation du §17 que le code ne porte pas.

*Correction* (deux demi-lignes) : borner G14 (a) à `Assets/Scripts` **hors `Assets/Tests`**, et remplacer (b) par une
garde d'EXÉCUTION dans `AttacherRetourAppui` — l'idiome du dépôt existe déjà (`Gardes.cs:181`
`if ((e.Id == "retour.appui" || e.Id == "retour.appui-voile") && …)`) : c'est ce que M1 de n2 demandait.

### IMPORTANT

**1 — `RendSurface` : « c'est `Couleurs.EcartRvb` » est faux du prédicat entier, et la seule implémentation
existante d'un « écart rendu » de `Melange` laisse tomber les deux alphas.**
`design:239` renvoie à `Couleurs.cs:32`. Lu : `EcartRvb(a, b) => Mathf.Max(|a.r−b.r|, Mathf.Max(|a.g−b.g|, |a.b−b.b|))`
— le plus grand canal, **sans `color.a`, sans alpha de groupe** (son commentaire le dit : « l'alpha n'entre pas »).
Le frère vivant est `Gardes.cs:243` : `return amp * Couleurs.EcartRvb(a, b) >= MouvementTunables.SeuilCouleurRendue;`
— pas d'`ctx.AlphaGraphic` non plus. Un E2 qui « réutilise `FranchitLeSeuil` » obtient donc 0,15 × 0,851 = 0,128 ≥ 3/255
sur `InspectionScreenController.cs:415` et classe vrai presque tout, alors que §17 veut 0,15 × 0,851 × 0,18 = 0,023.
Symétriquement, la branche `Alpha` (`Gardes.cs:236`, `amp * ctx.AlphaGraphic`) n'a pas le facteur couleur que le
nouveau `Peint` exige : deux définitions de « écart rendu » coexistent sans que §17 le dise.
*Correction* : écrire le prédicat comme `Couleurs.EcartRvb(C, 0,85·C) × color.a × alphas ≥ SeuilCouleurRendue`, et une
demi-phrase : « `Gardes.FranchitLeSeuil` n'est PAS ce prédicat (sa branche `Melange` ignore les alphas, sa branche
`Alpha` ignore la couleur) ».

**2 — `Peint` n'est pas calculable sans ambiguïté sur un `TMP_Text` dont la couleur vient d'une balise.**
`design:244` : « 0,20 × max(R,G,B) × color.a ». Le dépôt peint des libellés par balise de texte riche, dont le site
que §17 cite lui-même : `Shell/BandeauEphemere.cs:145` `return "<color=#" + or + "><b><noparse>" + s + …` ; aussi
`DailyReviewScreenController.cs:546`, `ConflitScreenController.cs:972`, `ReputationScreenController.cs:1235`. Pour ces
`TMP_Text`, les sommets rendus ne portent pas `color` : « l'écart **RENDU** » et « `max(R,G,B) × color.a` » désignent
deux choses différentes, et §17 n'en nomme aucune (ni `colorGradient`, absent du dépôt — mesuré : 0 site).
Je n'exhibe pas de site où les deux lectures changent le CAS retenu, d'où IMPORTANT et non BLOCKING.
*Correction* : une clause — « `color` du composant, balises `<color>` ignorées (majorant assumé) » ou « la couleur de
sommet rendue ». Au passage, nommer où vit ce prédicat : `Peint` doit lire `TMP_Text.text`, et G7 interdit le motif
`TMPro` dans `Mouvements/` (`Gardes.cs:302`, scan `MouvementsGardesPlayModeTests.cs:315`) — `Retour.cs` ne peut donc
pas être un voisin de `Regie.cs`.

**3 — « Ce que la réserve neutralise : le quota non-`Ambiance` » n'est pas borné : la réserve est UNE place.**
`Regie.cs:491-493` : `int plafondAutres = QuotaAlerteRetourTransition - (retourAppui ? 0 : PlacesReserveesRetourAppui);`
puis `if (… nAutres >= plafondAutres) return Refuser(…)`. Avec `QuotaAlerteRetourTransition = 16` et
`PlacesReserveesRetourAppui = 1` (`MouvementTunables.cs:17,20`) : un appui vivant porte `nAutres` à 16, et un **second
appui simultané** (multi-touch, ou appui dont le relâchement n'est pas venu) retombe dans le refus ordinaire. Le §17
l'annonce comme une neutralisation sans réserve.
*Correction* : « (une seule place : un second appui simultané retombe dans le refus ordinaire) », ou dimensionner
`PlacesReserveesRetourAppui` sur le nombre de doigts admis.

**4 — « G12 (inatteignable sur ce catalogue : `retour.appui` n'a qu'un `Absolu` par couple) » : l'argument porte sur
l'autre G12.**
`design:255`. « une entrée n'a qu'un `Absolu` par couple » est le G12 de **donnée** (`Gardes.cs:191-201`, deux canaux
`Absolu` dans UNE entrée). Celui qui refuse à l'attachement est celui d'**exécution** (`Regie.cs:517-521`) : il mord
quand une **autre piste** occupe déjà le couple `(cible, Melange)` avec un `Absolu` venu d'`Attacher`. La prémisse qu'il
faudrait est « aucune entrée `Melange`/`Absolu` du catalogue ne vit sur la cible d'un `retour.appui` » — non écrite, et
non mesurable statiquement : les 11 cibles `Melange` du catalogue sont nommées en design (`Row_descente`, `Tampon`,
`Jeton`, `Regime`, `cran`, `Rond`, `Cro`…), pas en code (`Row_descente` : 0 occurrence dans `Assets/Scripts`). J'ai
tenté le contre-exemple le plus probable, le `Tampon` de ⑤ : il tombe — `DecisionDetailScreenController.cs:417` pose
l'`Image tf` et `:428` un `LongPressButton`, **qui n'est pas un `Button`** (`LongPressButton.cs:15 : MonoBehaviour`),
donc aucun `retour.appui` n'y est posé.
*Correction* : remplacer la raison par la prémisse, et la renvoyer au relevé de G9 — qui relève justement la CIBLE de
chaque appui, donc la croise avec les 11 cibles `Melange` sans travail neuf.

### mineurs

- **1** — `Gardes.cs:280` : « (Le plafond de **8** pistes `Melange` vivantes est une affaire de régie, pas de donnée.) »
  Le m2 de n2 a été corrigé au catalogue (`:1391`) et non dans le code ; `MouvementTunables.cs:25` et `Regie.cs:495`
  disent 10.
- **2** — `design:91` cite « prédicat implémenté, `PolitiqueMouvement.Gele` » : `PolitiqueMouvement` est un **enum**
  (`PolitiqueMouvement.cs:7`). Le symbole est `GelDeMouvement.Gele` (`PolitiqueMouvement.cs:22`, règle `Retour` à `:30`).
  Le prédicat recopié est juste, c'est le nom qui est faux.
- **3** — unités : `design:239` « en valeurs sRGB **0-255** telles que Unity les stocke dans `Color` » et `design:244`
  « en 0-255 … atteint `SeuilCouleurRendue` (3/255) ». `Color` stocke des composantes **0..1** et
  `MouvementTunables.cs:76` pose `SeuilCouleurRendue = 3f / 255f`, normalisé. La borne est la même dans les deux
  échelles, mais la phrase invite à mélanger. Écrire « ≥ 3 sur 255, soit `SeuilCouleurRendue` sur les composantes 0..1 ».
- **4** — « l'alpha cumulé … jusqu'à la racine du Canvas » (`design:244`) ignore `CanvasGroup.ignoreParentGroups`, qui
  tronque la chaîne. Mesuré : **0 site** dans `Assets/Scripts` aujourd'hui. Une incise (« `ignoreParentGroups`
  interrompt le cumul ; aucun site n'en pose — mesuré le 08/10 ») évite que le prochain site casse le prédicat en silence.
- **5** — la liste « ce qu'elle ne neutralise pas » (`design:253-256`) omet deux refus de `Creer` : `EstSansHote`
  (`Regie.cs:480`) et G8 (`:483`). Aucun des deux ne mord ces deux `Id` (hôte « client » au catalogue `:343-344` ;
  `Gardes.cs:181` les borne déjà à `AnimMaxBlockMs = 250` ms), mais le dire en trois mots ferme la liste au lieu de la
  laisser ouverte.

## 4. Ce que les corrections n'ont PAS cassé (vérifié)

- **Le déplacement de `VerifierAdmise(appui)`** (`Regie.cs:92`) : 0 appelant de `AttacherRetourAppui` dans
  `Assets/Scripts` ; les 3 appels de test antérieurs (`:105`, `:116`, `:145`) passent des entrées `Admise(…)`
  (`:97`, `:101`, `:139`, `:143`). Seul effet d'ordre : un `appui` hors catalogue lève maintenant AVANT le contrôle
  « le voile est un `Retour` » (`:95`) — aucun test n'épingle ce message.
- **Le nouveau `Peint`** ne casse pas §17 l.282 (`Reduit` garde le voile) : `retour.appui-voile` ne déclare pas de
  `PoseDeReposS` (`catalogue:344` « — »), donc `GelDeMouvement.Gele` rend `false` (`PolitiqueMouvement.cs:30`) et le
  voile reste animé sous `Reduit`, comme le design le veut.
- **`RegieMouvement.PourTest()`** publie bien la régie comme `Courante` avec une `HorlogeFigee(0)`
  (`RegieMouvement.cs:47-56`) : le protocole de relevé de G9 (`design:286`) est exécutable tel qu'écrit.

---

**NOT_APPROVED — 1 BLOCKING, 4 IMPORTANT, 5 mineurs.** Le BLOCKING de n2 est fermé proprement, et m4 l'est par du
code avec un test à mutation. Le BLOCKING neuf est la contrepartie d'un choix : M1 demandait une garde d'exécution,
la réponse l'a renvoyée en garde de SOURCE — qui ne peut pas voir l'`Id` d'une `Entree`, et qui rougirait sur le test
même que ce commit ajoute.
