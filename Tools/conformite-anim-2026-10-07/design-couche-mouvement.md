# Design — la couche de mouvement du client Unity (CLIENT-3, 07-08/10/2026) — **v4.8** — corps ✅ APPROUVÉ (revue ⊥ n°4 du design : 0 BLOCKING) + ajouts §16 (`CouleurA = Cible`, jugé cohérent par les revues n°2 à n°4 du catalogue), §17 (cible du retour d'appui, réécrit en v4.5 : prédicats évalués à l'appui, voile borné), G11 au prédicat exact, et les règles E0 du §4 ; le **§17 seul** est en revue ⊥ ciblée — **v4.6** répond à sa revue n°2 (table en fin de §17), **v4.7** à sa n°3, **v4.8** à sa n°4 : `Echelle` **RETIRÉE** du retour d'appui (arbitrage f2 du 08/10), G14 réécrite **par la propriété** (garde d'exécution + contrôle positif), G9 rendue sensible au handle nul

Statut : **design, rien n'est codé.** Historique des revues ⊥ (agent neuf à chaque tour) : v1 NOT_APPROUVÉ (6 BLOCKING / 13 MAJEUR / 11 mineurs) ; v2 NOT_APPROUVÉ (3 BLOCKING / 9 MAJEUR / 10 mineurs, commit `d207b48b`) ; v3 NOT_APPROUVÉ (2 BLOCKING / 5 MAJOR / 9 mineurs, commit `5a47e04c` ; les trois BLOCKING de la v2 vérifiés corrigés). Cette v4 répond aux findings de la v3 (table §14) ; la revue n°4 l'**APPROUVE** (0 BLOCKING, 5 MAJOR, 10 mineurs) et la v4.1 ferme les 5 MAJOR (table §15) ; les 10 mineurs vont en dette (`dettes-design-mouvement.md`). Règles de revue en vigueur : **BLOCKING = « le code écrit d'après ce design serait faux » ; une prémisse non démontrable depuis le dépôt se tranche par une MESURE planifiée (E0) avec un défaut sûr.** Rulings du 07/10 : écarts de nuance (pixels, millisecondes, forme exacte d'une courbe) consignés, pas traités ; animations **fidèles en cause, rythme et sensation** ; animations DIÉGÉTIQUES ; ère des objets 2000-2010 (le laiton du chrome d'interface reste).

Entrées : `inventaire-animations.md` (40 paires), `oracle-css-*.json`, `transitions-hud.json`, `catalogue-mouvements.md` (42 entrées proposées, en attente de revue), rulings 27/08 soir, canon `global_conventions_core.md`.

## 0. Exigences

| # | exigence |
|---|---|
| X1 | UN mécanisme commun ; aucune animation visuelle écrite à la main hors de lui (G10, tout `Assets/Scripts`, liste d'exclusions fermée) |
| X2 | Toute animation a une CAUSE dans la fiction, dans une table, vérifiée par un test |
| X3 | IL2CPP/mobile : pas de réflexion ni de codegen runtime ; 0 octet alloué par image en régime |
| X4 | Coût d'image borné par plafonds durs ; les inconnues d'uGUI sont des MESURES planifiées (E0) |
| X5 | Mouvement réduit conforme au canon F2 |
| X6 | Preuve par captures multi-images qui traverse le chemin réel du jeu |
| X7 | Fidélité à la maquette : cause, rythme (période ±10 %), sensation (forme à ±0,15 en valeur normalisée, **signe et ordre des extrema exacts**), mesurée contre Chromium |
| X8 | Aucune animation ne REFUSE l'entrée du joueur (le canon borne le BLOCAGE, pas la durée) |
| X9 | Chaque garde a un contrôle négatif exécutable |

## 1. Placement et assemblies

Mesuré : `ShellContracts.asmdef` référence `Theme`, `I18n` seulement ; `Shell`, `CityMap`, `Operational`, `Economy`, `Account`, `CitySim`, `CoreLoops`, `Onboarding` référencent `ShellContracts` ; aucun ne référence `Shell`.
- **Mécanisme et catalogue dans `ShellContracts`** (`Assets/Scripts/ShellContracts/Mouvements/`, espace de noms `MafiaCleanCity.Mouvements`). Catalogue = donnée pure, aucune référence vers `Shell`/`CityMap`/`Operational`.
- Les courbes de `TopBarController.Pouls/Tremblement` et `Gyrophare.TeinteA` passent au catalogue en images clés. `HueRotate` descend dans `ShellContracts/Mouvements/Couleurs.cs`. Les anciennes méthodes restent comme **enveloppes** qui lisent la même courbe (leurs appelants de tests continuent de compiler ; `Gyrophare.HueRotate` n'a qu'un appelant externe, `DistrictDescentePlayModeTests.cs:60`). Leurs valeurs changent là où le `SmoothStep` s'écartait du `ease` CSS (mesuré : à p = 0,125, 0,914 pour 0,775) : les tests qui épinglent ces valeurs sont réécrits dans le même lot, listés §9.
- `ShellContracts` utilise déjà uGUI (8 fichiers) ; il ne référence pas `Unity.TextMeshPro` : **G6 (pas de canal ≠ `Alpha` sur un texte) est une garde de TEST** (l'assembly de tests voit TMP), pas un refus runtime.
- Le typecheck Roslyn hors Unity ne voit pas les frontières d'assemblies : **E1 et E2 exigent un créneau batchmode** (compilation réelle des 17 projets du typecheck), groupé avec les autres créneaux.

## 2. Modèle de données

Tout est `static readonly`, immuable.

**Convention de repère (BL-2 v2).** Les valeurs du catalogue sont dans le repère d'**Unity**. Le passage CSS → Unity est écrit une fois, dans l'oracle et son test : **`Rotation` Unity = − rotation CSS** (CSS horaire, Unity antihoraire), **`TranslationY` Unity = − translateY CSS** (CSS vers le bas), `TranslationX` inchangé, `Alpha`, `Echelle`, `EchelleX`, `EchelleY` inchangés (une échelle est invariante au retournement d'axe). Exemple : `tremble` CSS `52° → 56° → 52°` = **`0 → −4° → 0`** en `Additif` côté Unity (vers le chaud, `Tremblement(0.07) = −4`, épinglé par `DistrictDescentePlayModeTests.cs:179`).

- **`Genre`** : `Alerte`, `Ambiance`, `Retour`, `Transition`.
- **`Propriete`** : `Alpha` (CanvasGroup.alpha) · `Melange` (0..1 entre `CouleurA` et `CouleurB`, écrit RGB dans `Graphic.color` sans toucher l'alpha ; **v4.2** : `CouleurA` vaut une couleur nommée **ou `Cible`** — le RGB de la cible lu à l'attachement, traité comme la base d'un transform (`Rebaser` et la détection du §3 le relisent, `Detacher` le restitue) — et `CouleurB` une couleur nommée **ou `Cible × k`**, facteur RGB par canal, résultat borné à [0, 1] ; §16) · `Hue` (degrés ; **base = `CouleurA`** déclarée sur le mouvement, écrit RGB seulement, sans composition — le gyrophare recalcule depuis sa teinte comme aujourd'hui) · `Eclat` (alpha d'un calque de lumière enfant nommé `Eclat`, car un `Graphic` ne peut pas dépasser sa couleur : `filter:brightness(1.35)`) · `TranslationX`, `TranslationY`, `Rotation`, `Echelle` (uniforme : X et Y ensemble), `EchelleX`, `EchelleY` (axes seuls : `ec` et `mk-buee` ne bougent qu'en X, `drip` et `gt` qu'en Y — mesuré dans l'oracle) · `Remplissage` (`Image.fillAmount`, **progression fonctionnelle** : l'arc d'appui long de 1 000 ms du canon) · `Parametre` (puits générique : `IParametreAnime.PoserParametre(int canal, float v)`, implémenté par un graphe sur mesure — la ficelle de ㉘ ; un seul point d'extension, testable avec un faux implémenteur).
- **`Mode`** par canal : `Additif` (delta : translations, rotation du tremblement), `Multiplicatif` (facteur : alpha, échelle), `Absolu` (valeur imposée : mélange, hue, balayage d'aiguille, remplissage).
- **`ImageCle`** `{ T; V; Aisance E }` ; **`Aisance`** (lue dans `easing_cles[i].easing` de l'oracle, **jamais** dans `easing` de l'effet, qui vaut « linear » pour toute animation CSS : l'`animation-timing-function` devient l'assouplissement par image clé) = struct à 4 flottants (`Lineaire`, `Ease`, `EaseIn`, `EaseOut`, `EaseInOut`, `Bezier(x1,y1,x2,y2)`), résolue par 6 itérations de Newton sans allocation.
- **`Canal`** `{ Propriete P; Mode M; ImageCle[] Cles; }` ; **`MouvementDefini`** `{ Id; Genre G; float PeriodeS; Canal[] Canaux; Iteration (Infini | Fois n); bool Alterne; float PoseDeReposS; Couleur CouleurA, CouleurB; bool Fonctionnelle; }`.
- **`Reglage`** par instance `{ PhaseS; KAmp; KDuree; KDepl; float Dx; float Chute; }` (équivalents de `--own --amp --dur --mo --dx --chute`). Phase repliée par piste, avancée par `dt`. `%` de maquette résolus contre le rect de la cible à l'attachement ; px maquette → px Unity par le `scaleFactor` du Canvas.
- **`Entree`** : `{ Id; string[] Ecrans (ou "*"); Source ("paire d'inventaire" | "PROPOSE"); Cause; Genre; MouvementDefini; Pistes; bool Bloquante; Hote ("client" | "SansHote:<raison>") }`. **Une `Entree` à plusieurs écrans** compte, pour G4, **sur chacun des écrans résolus**.

## 3. L'exécution : UNE régie

```
Regie : MonoBehaviour   (créée par AppShell)
  Piste[] pistes ; IHorloge horloge (Reelle = Time.unscaledTime | Figee)
  Handle Attacher(Entree e, RectTransform cible, Reglage r, Action<Handle> quandFini = null)  // lève si e hors catalogue
  Handle Transitionner(Entree e, RectTransform cible, float de, float vers, Action<Handle> quandFini = null)
  void Rebaser(RectTransform cible, Propriete p)       // le PROPRIÉTAIRE vient de réécrire cette propriété
  void Detacher(Handle h)                              // restitue (voir « Fin de piste »)
  void DetacherSous(Transform racine)
  int PistesVivantes { get; }  int Refus { get; }  int SansRegie { get; }   // compteurs lisibles par les tests (quota, refus, hôte nu)
  void Tick(float t)       // appelé par Update ET par la planche ; IDEMPOTENT pour un même t ; aucun contournement
```

**Accès à la régie (MA-3 v2).** `AppShell` crée la régie et la **publie** dans un registre statique de `ShellContracts` (`RegieMouvement.Courante`), sur le précédent de `ShellChrome.PublierInsets`. Un hôte nu (tests de contrôleur sans shell) obtient `Courante == null` : `Attacher` rend alors un handle nul **compté** (`SansRegie`) ; un test qui veut des pistes crée sa régie (`RegieMouvement.PourTest()`). `DistrictInteriorScreenController.TryStartAmbientLoop` continue de compter ses sources **admises par le budget** (`ActiveAmbientLoopCount`, contrat épinglé `:126`) même sans régie, et attache seulement si elle existe : le compte épinglé ne dépend plus de la présence d'une régie, le nombre de pistes réelles se vérifie là où la régie existe.

**Ordre dans `Tick`** : (1) cible nulle ⇒ libérée ; (2) idempotence (`t == dernierT` ⇒ retour) ; (3) cadence ; (4) visibilité ; (5) évaluation ; (6) composition ; (7) écriture.

**Composition** par couple (cible, propriété) : `valeur = base ⊕ pistes` — `Additif` s'additionnent, `Multiplicatif` se multiplient, deux `Absolu` sur le même couple refusées (G12). Une `Transitionner` en cours fournit la base à la place du propriétaire.

**Base d'un transform = propriété du propriétaire (B4 v1, MA-1 v2).** Deux mécanismes, le second en filet :
1. **Explicite** : un propriétaire qui écrit une propriété animée appelle `Rebaser` juste après. Sites connus et nommés : `TopBarController.SetCitywideHeatBucket` (aiguille, `:703`), `SetDescente(false)` (`:735`) ; **`UpdateAlarmState` (`:822-823, 836-837, 851`) écrit la couleur du cerclage et du filet** : ces trois sites deviennent des `Transitionner(chrome.filet.virage / chrome.anneau.virage, de, vers)` (B6/B7, `Melange`), plus aucune écriture directe de `color` sur ces deux cibles.
2. **Détection** (filet pour un propriétaire oublié) : à chaque tick la régie compare la valeur courante à ce qu'elle a écrit ; si l'écart dépasse l'**epsilon de la propriété** — alpha 1/512, échelle 1/512, translation 0,05 px, **rotation 0,01°, `Melange`/`Eclat`/`Remplissage` 1/512, `Hue` 0,5°, comparée par `Mathf.DeltaAngle` (jamais en brut : `localEulerAngles` est normalisé dans [0,360) et les bandes sont négatives)** — le propriétaire a réécrit : la base devient la valeur courante. `Tick` idempotent : deux appels au même `t` (planche + `Update`) n'ajoutent pas deux deltas.

**Fin de piste (BL-3 v2).** `Detacher(h)` **restitue** : transform → base ; `CanvasGroup` posé par la régie → 1 (ou la valeur d'avant s'il préexistait) ; `Melange`/`Hue` → `CouleurA` ; `Eclat` → 0 ; **puis** libère l'emplacement. Une piste dont la cible reste **inactive plus de 30 s MESURÉES SUR `IHorloge` de la régie** (donc gelées sous `Figee` : une planche qui rend 24 images en 60 s de temps réel ne libère rien) est libérée de la même façon (journalisée) : un écran qui ne démonte pas ne retient pas la ressource que §4 rationne. Les deux sites épinglés qui exigeaient « état nommé » détachent explicitement : `SetDescente(false)` détache pouls (cerclage, filet) et tremble ; `BandeauEphemere.Effacer` détache le fondu (un toucher pendant le fondu l'annule comme aujourd'hui) ; **`BandeauEphemere.Annoncer` détache AUSSI** le fondu en cours avant de poser `groupe.alpha = 1` (il remplaçait la coroutine par `StopCoroutine`, `:270` ; le fondu étant devenu une piste, c'est `Detacher` qui prend ce rôle) : sinon une Descente arrivant pendant le fondu de 0,4 s d'une Carte — `Visible` est vrai pendant le fondu, `AnnonceDuBandeau.Suivante` admet toute annonce strictement plus prioritaire — laisserait la piste périmée écrire vers 0 puis `Effacer` : l'annonce serait signée, jamais vue. **Interruptibilité (le canon l.125 parle du TAP du joueur ; la règle de remplacement en est le pendant côté animations)** : une `Transitionner` ou un `Attacher` `Absolu` sur un couple déjà occupé par une transition en vol la REMPLACE (la dernière gagne ; ce n'est pas un conflit G12).

**Fin d'animation.** `quandFini` appelé une fois, sur un délégué mis en cache par l'appelant. Le bandeau garde sa coroutine **comme minuterie** (l'attente n'est pas une animation) ; puis `Transitionner(bandeau.sortie, quandFini: Effacer)`.

**Application** : `Alpha` → `CanvasGroup` **posé sur la cible elle-même, réutilisé s'il y est déjà** (jamais celui d'un ancêtre : il ferait fondre la fratrie) (11 existent déjà, dont celui de `BandeauEphemere`), sinon ajouté ; jamais `Graphic.color.a` en boucle ; `Melange`/`Hue` → `Graphic.color` (non texte) ; `Eclat` → calque ; transforms → `RectTransform`. Écriture seulement si la valeur a changé de plus de l'epsilon de la propriété. **Jamais de texte animé** autre que `Alpha`.

## 4. Coût borné

| plafond | valeur | preuve |
|---|---|---|
| pistes vivantes | **48**, quota réservé : 16 `Alerte`/`Retour`/`Transition`, 32 `Ambiance` ; refus compté et journalisé | test : 33ᵉ `Ambiance` refusée, `Alerte` encore acceptée |
| **unité de budget** | **une piste = une cible animée** (tous ses canaux comptent pour 1). Budget par écran ≤ 16 pistes (G4), pas en instances | G4 |
| cadence | `Ambiance` ≤ 30 Hz | test (dt injectés) |
| hors champ | non évaluée, emplacement conservé 30 s d'horloge de régie, puis libérée (§3) | test (horloge injectée) |
| délestage | **relatif à la cadence mesurée** : médiane de `dt` sur 120 images = `cible` ; EMA(0,2) de `dt` > 1,5 × cible pendant 1 s ⇒ `Ambiance` à demi-cadence ; > 2,5 × ⇒ figée à `PoseDeReposS` ; retour sous 1,25 × pendant 2 s | test + contrôle négatif |
| allocation | 0 octet par `Tick` : `Is.Not.AllocatingGCMemory()` du test-framework 1.6.0 (présent au manifeste ; **aucun précédent dans le dépôt**, c'est un outil, pas un idiome) | test |
| **inconnues d'uGUI → E0 — MESURÉES le 08/10** (`e0-spike-rapport.md`) | (a) `CanvasGroup.alpha` : pas de reconstruction (1,3 µs de mise à jour des canvas pour 48 cibles) ; (b) `Graphic.color` (`Melange`) : reconstruit les lots, ≈ 100 × (125 µs) ; (c) Canvas imbriqués : rendu CPU × 2, SetPass 2 → 96 sous masque ; (d) un `RectMask2D` découpe bien une cible posée dans un Canvas imbriqué. **Règles ratifiées par f2 (08/10)** : **aucun Canvas créé par le mécanisme** (garde G7 : motif `AddComponent<Canvas>`) ; **`Alpha` d'abord** partout où il suffit ; **`Melange` interdit aux `Ambiance`** (garde de donnée `Gardes.MelangeEtAmbiance` et refus à l'attachement) ; **au plus 10 pistes `Melange` vivantes** dans le client (pire cas compté : 2 virages TENUS du chrome + 6 voyants de ⑮ + 1 retour d'appui = 9, plus une marge ; 8, proposé d'abord, était trop bas), refus COMPTÉ (`Regie.RefusMelange`, `MouvementTunables.PistesMelangeMax`) ; **RÈGLE DE CLASSE : le retour d'appui du joueur n'est JAMAIS refusé par la régie** — une place non-`Ambiance` lui est réservée (les autres genres s'arrêtent à 15), et plafond `Melange` atteint ⇒ l'appui passe sur le voile `Alpha` (`Regie.AttacherRetourAppui`, bascule comptée dans `BasculesVoile` après un handle non nul, aucune piste évincée, aucun refus) ; un bouton qui ne peint rien se DÉCLARE (§17 cas 5) ; **sous un masque, transformations plafonnées à 6 pistes** (défaut maintenu : aucune mesure ne le contredit, et le catalogue v4 n'en pose aucune). Raison du `Melange` : l'`Alpha` n'éclaircit pas et ne change pas la teinte, d'où les 4 `Alerte` du catalogue gardées en `Melange`. **Limite** : coût CPU en batchmode sur poste de travail ; le coût de rendu réel se mesure sur appareil, aucun seuil GPU n'en est tiré | spike E0, créneau du 08/10 ; tests `E0_Quota_11eMelangeRefuse_EtCompte`, `E0_RetourDAppui_JamaisRefuse_PlafondPlein_BasculeSurLeVoile`, `E0_MelangeSurAmbiance_Refuse`, `E0_MelangeSurAmbiance_ControleNegatif` |

Constantes dans un `MouvementTunables` voisin de `UiTimingTunables`. **`UiTimingTunables.AnimMaxBlockMs` (250, 0 consommateur aujourd'hui) est CONSOMMÉ** : `Regie.Attacher` refuse une entrée `Bloquante` dont la durée dépasse cette valeur (G8) ; un test le lit.

## 5. Mouvement réduit

Canon (`global_conventions_core.md` l.33, l.127) : option **toggleable**, désactive les transitions (F2).
- `PolitiqueMouvement` = `Plein | Reduit` (`Aucun` : tests et contrôle négatif seulement).
- **`Reduit`** : tout est figé à `PoseDeReposS`, **y compris** `Alerte` (son état statique nommé existe sans pulsation). **Exceptions** : (i) `Retour` garde le **mélange** de couleur à l'appui (prédicat implémenté, `GelDeMouvement.Gele` (`PolitiqueMouvement.cs:20`) : tout canal `Melange` d'un `Retour`, et tout canal `Alpha` d'un `Retour` SANS `PoseDeReposS` déclarée ; une nouvelle entrée `Retour`/`Alpha` doit donc déclarer sa pose, comme `carnet.en-main`, sinon elle reste animée sous `Reduit`) — **ou, pour `retour.appui-voile` seulement, son voile `Alpha` (§17)** —, plus le liseré du bouton quand il en a un (le canon veut qu'une couleur ne soit pas le seul différenciateur), sans échelle ; (ii) une entrée **`Fonctionnelle`** (un `Remplissage` de progression : l'arc de 1 000 ms de l'appui long) **ne se gèle pas** : elle devient un indicateur statique plus un compteur textuel (`screen_2a:314`, `screen_13:308`), car le geler supprimerait le seul signal d'une action irréversible.
- **Source** : le réglage du joueur dans ⑲ est **un REUSE du canon** (`screen_14:71,146,208,251,298`), pas une question produit ; persistance en `PlayerPrefs` en attendant `PATCH /v1/me/settings` (aucun `GET` n'existe : lot back différé). S'y ajoute Android `Settings.Global.ANIMATOR_DURATION_SCALE == 0` (JNI), relu à chaque `OnApplicationPause(false)`. iOS : réglage joueur seul. Niveau = `Reduit` si l'une des deux sources le demande.
- Limite de clignotement (G5) : toutes politiques, tous canaux, après `Alterne`, **au plus 3 extrema par seconde (période ≥ 0,667 s)** par piste d'alpha/mélange/éclat. (Le canon de ③ demande un flash toutes les 250 ms : G5 gagne, contradiction consignée avant E3.)

## 6. La preuve multi-images

1. **Un seul chemin** : la planche pose `IHorloge.Figee(t_k)` et appelle `Regie.Tick(t_k)`, le même `Tick` que `Update`, filtres actifs ; `Tick` est idempotent pour un même `t`.
2. **Échantillonnage par seuil de perception, défini PAR PROPRIÉTÉ (MA-5 v2)** : alpha/mélange/éclat/hue : variation ≥ 3/255 de la couleur rendue ; transformations : déplacement à l'écran du point le plus éloigné de la cible ≥ **0,5 px** (translation : delta ; rotation : rayon × θ ; échelle : rayon × Δk). `t_k` = instants où la valeur analytique franchit ce seuil par rapport à l'image précédente. **Les groupes de pistes sont séparés par classe de période** (rapide < 0,5 s, moyenne, lente) : une planche par classe, 8 à 24 images par classe, couvrant la plus longue période **de la classe** (le tremblement de 0,14 s n'est pas noyé dans le pouls de 1,1 s).
3. **Anti-vacuité** : ≥ 80 % des paires d'images successives diffèrent d'au moins 12 pixels de ≥ 2 niveaux **dans le masque** (union des rects des pistes évaluées au tick).
4. **Contrôles négatifs** : `Aucun` ⇒ 0 % ; **délestage armé** ⇒ l'anti-vacuité DOIT rougir ; **hors champ** ⇒ rougit ; **libération à 30 s** : sous `Figee`, rendre 24 images sur 60 s de temps réel ne libère aucune piste (sur l'horloge réelle, la même durée en libère). L'anti-vacuité se calcule hors ligne sur les PNG et **ne remplace pas** la garde de teintes distinctes de `CaptureSousShell` (`teintes.Count <= 12`) ; chaque image repaye un `GET /v1/me` (jusqu'à ~72) : les planches animées sont groupées dans un créneau, nommées `planche_<ecran>_<classe>_<k>`.
5. Livrables : N PNG par classe, une bande contact, `journal.tsv`, et la comparaison à la maquette aux **mêmes fractions de période (k/8)** — fixées par la maquette, pas par l'implémentation — via `echantillonneur-gif.py --seek`.
6. **G13** : une `Ambiance` dont aucune propriété ne franchit le seuil de perception de son canal est refusée (invisible, donc sans cause).

## 7. Oracle CSS (X7) — large en valeur, strict en signe et en ordre

`oracle-css.cjs` échantillonne dans Chromium la valeur calculée de chaque `@keyframes` appliqué, pseudo-éléments inclus, sur l'**union de 17 points uniformes et de tous les pourcentages d'images clés** (corrigé : la v2 annonçait cette union sans l'implémenter ; vérifié : `gt` est échantillonné à 9 %, `led` à 38 % et 64 %, `mk-eclat` à 72 % et 82 %). Sorties : `oracle-css-ecrans-brennar-6.json` (29 keyframes), `oracle-css-hud.json` (3). Transitions CSS : `recenser-transitions.cjs` → `transitions-hud.json` (6 : 5 déclarées en feuille + 1 inline sur l'aiguille).
Le test pur applique la table de repère du §2 puis exige : valeur normalisée ±0,15 ; période ±10 % ; **signe de la dérivée à chaque extremum et ordre des extrema identiques** (une courbe 0→+1→0 et 0→−1→0 ne sont plus confondues) ; `transform-origin` comparé au pivot.
**Couverture nominative (40 paires : 29 maquette + 11 HUD/⑭)** : exprimables en `Alpha`/`Echelle`/`EchelleX`/`EchelleY`/translations/`Rotation` : `hl led derive drip spl respire tg clign rl bl ec(EchelleX) ch vp cd rd gt(EchelleY) am po sc pe cl ci mk-lampe mk-buee(EchelleX) mk-scan mk-eclat pouls tremble` ; `gyroflip` en `Hue` ; `mk-veille` en `Eclat` ; **B5** (fondu jour↔nuit de `.fond`) et **B9** (fondu du gyro) en `Transition` `Alpha` — B5 exige un **hôte de fondu croisé** (deux couches de fond) que `DistrictInteriorScreenController` n'a pas, besoin structurel nommé pour E3 ; B6/B7 (filet, anneau) en `Melange` ; B8 (`box-shadow` de la lunette) approché par `Eclat` (écart déclaré, **aucune mesure oracle** : les 6 transitions sont recensées par machine mais pas échantillonnées) ; B10 (aiguille du HUD) et **B11 (aiguille de ⑭, six angles, cadres 14-19)** en `Transitionner` `Rotation Absolu` — B11 a pour hôte un cadran que le client ne construit pas encore : `SansHote:⑭ cadran absent (CompressionScreenController:194-204 rend stress_bucket en texte)`, levé par l'étape E4. **Hôte absent du client** : `fl` (`stroke-dashoffset` : le puits `Parametre` l'accueillerait, c'est l'hôte — le serpentin du labo — qui manque), `monte` (flotteur : R2.2 d'abord). **Non portables en pistes CPU, E5** : `sf` (202 instances), `po` (78), `bl` (52) — trois paires qui dépassent seules le plafond de 48.

## 8. Retour d'appui (demande f2)

`RetourAppui` posé par un assistant `Retour.Poser(Button)` : appui → **mélange vers sombre** (`Cible` → `Cible × 0,85`), 90 ms `EaseOut` ; relâché → 140 ms. **La cible du mélange et le repli quand rien ne rend : §17.** États : repos, appui, relâché, **annulé** (`IPointerExitHandler` + relâchement forcé après 400 ms).
**L'`Echelle` est RETIRÉE du retour d'appui (v4.8 — arbitrage f2 du 08/10, revue ⊥ n°4 du §17, B2).** L'ancienne règle « échelle seulement si la plus grande dimension du bouton ≤ 1/3 du cadre ; au-delà, mélange seul » est **ANNULÉE** : elle n'avait aucun chemin d'implémentation. La condition est **par bouton**, le jeu de canaux est une donnée **statique partagée** par les 67 boutons sous un même `Id` ; fabriquer une variante au même `Id` lève (`Regie.cs:115-116` et `:476`, l'admissibilité est par identité de référence) ; et aucun masque de canal n'existe au site d'appel, le seul levier possible (`Reglage.KAmp`, `Regie.cs:330`) n'étant pas atteignable puisque `AttacherRetourAppui` impose `Reglage.Defaut` (`Regie.cs:98`, `:102` ; dette 23). Le retour d'appui est donc **teinte et opacité seules**, sous `Reglage.Defaut`, aux **deux seuls** `Id` `retour.appui` / `retour.appui-voile` : **pas de 3ᵉ `Id`, pas de levier `Reglage` exposé.** Le geste perdu (−3 % d'échelle sur les petits boutons) est une **dette**, pas un correctif de ce lot : `dettes-design-mouvement.md` (29). Au catalogue, la colonne canaux de `retour.appui` (`catalogue-mouvements.md:343`, §I.4) perd son `Echelle` et ne garde que `Melange` Abs ; la colonne `Pistes` (1) et donc §V sont inchangés.
67 boutons : **tous** reçoivent `RetourAppui` et perdent le tintement `ColorTint` par défaut (53 d'entre eux : 14 boutons posent `Transition.None`, le 15ᵉ site est une `Scrollbar`) ; `ReputationScreenController.cs:994` est une `Scrollbar`, pas un bouton : exclusion nommée de G9. Appui long : `UiTimingTunables.AppuiLongDeplacementMs = 500` (**à CRÉER** : décision f2 Q12 ; l'en-tête de `UiTimingTunables.cs` épingle « les 4 identifiants `T.ui.*` » du canon, il faut y dire que cette constante est du client) ; `AppuiLong.Duree` est une `public const float` (`AppuiLong.cs:10`) : `= UiTimingTunables.AppuiLongDeplacementMs / 1000f` reste une expression constante, et la constante n'a aucun appelant externe (mesuré). **Une piste `Retour` est attachée à `PointerDown` et détachée au relâchement** (transitoire), jamais à `Retour.Poser` : 67 boutons ne consomment donc pas 67 pistes.

## 9. Migration des existants — assertion par assertion

| existant | devient | ce que les tests doivent CONTINUER à prouver |
|---|---|---|
| `TopBarController.Update` (pouls, tremble) | 3 pistes `Alerte` : pouls du cerclage, pouls du filet (`Multiplicatif`), tremble (`Rotation Additif 0 → −4° → 0`) ; `Update` supprimé | **`DistrictDescentePlayModeTests.cs:164` lit `cerclage.color.a` (un `Image`, `:149`) : après migration l'alpha du pouls vit sur un `CanvasGroup` que la régie pose sur `BoitierRing` et `hairline`, et `UpdateAlarmState` réécrit `color` en entier (alpha 1) : `:164` deviendrait vrai quel que soit le pouls (assertion VIDE). Il est donc RÉÉCRIT** : lire l'alpha effectif du pouls (le `CanvasGroup` de `BoitierRing`, valeur composée de la régie) après `SetDescente(false)` — doit valoir 1 — ; ⚠️ ce test monte un `GameObject` nu (`NouvelleBarre`, sans `AppShell`) : il **crée sa régie par `RegieMouvement.PourTest()`**, sinon aucun `CanvasGroup` n'est posé et il retomberait sur `color.a` ; avec contrôle négatif « pouls resté armé ⇒ rouge » ; `:167` (angle = bande, `DeltaAngle`) après `Detacher` ; **`:172-181` (`T2_LePouls_EtLeTremblement`, épingle le signe `4f * versLeChaud`)** réécrit sur la courbe du catalogue, signe inclus |
| `TopBarController.SetCitywideHeatBucket` (`:697-703`) | `:703` : première pose directe + `Rebaser` ; ensuite `Transitionner(chrome.aiguille.balayage, de=ancien, vers=nouveau)` (B10) ; le tremblement `Additif` se pose dessus | l'aiguille ne saute pas ; `HeatNeedleAngleDegrees` (contrat pinné) reste la bande ; sortie de descente : aiguille sur sa bande |
| `Gyrophare.Update` | piste `Alerte` `Hue` (`CouleurA` = `#ff5a3c`) | `DoitSAllumer` et `Poser` inchangés ; `TeinteA(0/0.45/0.9)` = bornes d'images clés |
| `AmbientPulseLoop` | pistes `Ambiance` `Alpha Multiplicatif`. Le `Graphic.color.a` initial des sources (`BuildRevenueSign`, `BuildActivitySmoke`, `BuildMaintenanceFlicker`) **n'est pas touché** : la régie ne règle que le `CanvasGroup`. **Écart déclaré, bases MESURÉES** (`DesignTokens.asset` : néon `nightNeonGlow` a = 1, flicker `accentWarning` a = 1, fumée `nightSmoke` a = 0,35) : un `CanvasGroup` ne dépasse pas l'alpha du `Graphic`, la crête est donc la base. Néon et flicker (base 1) : l'ancien battement clampé allait de 0,88 à 1 ⇒ facteur **[0,88 .. 1]** ; fumée (base 0,35) : l'ancien allait de 0,23 à 0,47 ⇒ facteur **[0,31 .. 1]** (même amplitude 0,24, crête = base, moyenne plus basse de 0,12 — nuance) | `DistrictInteriorAmbientLoopsPlayModeTests.cs` : les assertions qui ne lisent que `ActiveAmbientLoopCount` (`:126, 163, 186, 191`) restent vertes sans régie ; **les trois assertions `GetComponentsInChildren<AmbientPulseLoop>().Length == ActiveAmbientLoopCount` (`:130-132`, `:166-168`, `:206-207`) sont RÉÉCRITES dans le même lot** : le type `AmbientPulseLoop` est SUPPRIMÉ, et chaque triplet compte les pistes vivantes **dans le même hôte** après `RegieMouvement.PourTest()` (pistes observées sur les objets : `CanvasGroup` présent et alpha qui varie sur deux ticks), avec contrôle négatif par assertion |
| `BandeauEphemere.Effacement` | minuterie conservée ; fondu = `Transitionner(…, quandFini: Effacer)` ; `Effacer` **et `Annoncer`** détachent | `BandeauEphemerePlayModeTests.cs:144` (`Opacite == 0` quand invisible) **ne suffit pas** (`Opacite` rend 0 dès que `Visible` est faux) : un test lit `groupe.alpha` réel après `Effacer`, puis après un nouvel `Annoncer` (doit valoir 1) ; **test de la perte d'annonce** : annonce A (Carte), fondu entamé, annonce B plus prioritaire (Descente) ⇒ `groupe.alpha == 1`, le bandeau reste `Visible` et porte B |

## 10. Gardes

| id | garde | s'exécute |
|---|---|---|
| G1 | catalogue : `Cause` (≥ 20 car.), `Source`, `Ecrans`, `Id` unique ; `Attacher` hors catalogue lève | Unity (runner) |
| G2 | **mesure ⇄ catalogue** : lit `mesure-ecrans-brennar-6.json`, `transitions-hud.json` ET `transitions-brennar-6.json` (les 6 aiguilles de ⑭, B11) ; chaque paire/transition mesurée a une entrée ou `SansHote:<raison>` compté | runner |
| G3 | `PoseDeReposS` donne une valeur ≠ repos (frame riche) | runner |
| G4 | budget par écran résolu ≤ 16 pistes | runner |
| G5 | ≤ 3 extrema/s, toutes politiques | runner |
| G6 | pas de canal ≠ `Alpha` sur un `TMP_Text` | runner (assembly de tests) |
| G7 | motifs interdits dans `Mouvements/` | source |
| G8 | **une entrée `Bloquante` ET > `AnimMaxBlockMs` est refusée ; une entrée non bloquante peut durer davantage (appui long 1 000 ms, `carnet.en-main` 500 ms, balayage d'aiguille 700 ms)** (le canon l.124 dit « coupée OU exécutée en arrière-plan » : le client choisit le refus à l'attachement ; l'interruptibilité de l.125 est la règle de remplacement du §3) ; aucun canal n'écrit `blocksRaycasts`/`interactable` ; les `Retour` d'APPUI (`retour.appui`, `retour.appui-voile`) ≤ 250 ms | runner |
| G9 | **v4.5** : tout `Button` monté, **actif et `interactable`** au moment du relevé, a un `RetourAppui` dont l'appui simulé tombe en cas 1-4 du §17, ou une exclusion nommée (la `Scrollbar` de `ReputationScreenController:994`…) ; un bouton non interactif ou inactif est relevé et compté, pas jugé (il ne peut pas être pressé) ; un cas 5 non déclaré ROUGIT. **v4.8 (revue ⊥ n°4 du §17, B3) — G9 est aussi sensible au HANDLE NUL** : un bouton classé en cas 1-4 dont `AttacherRetourAppui` rend `Handle.Nul` ROUGIT lui aussi (il n'est ni un cas 5, ni une déclaration : sans ce rouge, G9 ne voit pas la seule façon dont un retour disparaît **en silence**, et le §17 affirmerait « la répartition se MESURE par G9 » avec un instrument aveugle). Le relevé note donc, par bouton : le cas retenu, la cible, **et si le handle est nul** | runner |
| G10 | aucun `Update`/`LateUpdate`/coroutine **hors `Mouvements/` et hors la liste FERMÉE ci-dessous** n'écrit couleur, alpha, rotation, échelle ou position visuelle. **Liste fermée, par fichier:méthode (**12** `Update`/`LateUpdate` mesurés dans `Assets/Scripts` — 10 annoncés en v4.x, le compte à la main était faux : revue de code E2a, B1 — : 3 migrés en §9, **9** nommés ici ; plus 1 coroutine visuelle, celle du bandeau, dont le fondu migre et la minuterie reste)** : `AppShell.Update` (touche retour) · `DistrictMapNavigation.Update` (pan/zoom au doigt) · `LongPressButton.Update`, `AppuiLong.Update` (minuteries, aucune écriture visuelle) · `ExceptionQueueController.LateUpdate` (`CalerLeZinc`, mise en page) · `LaSuitePanelController.LateUpdate` (`Ajuster` → `localScale` d'ajustement à la bande : de la mise en page, pas du mouvement — **nommée parce qu'elle écrit une échelle**) · `ReputationScreenController…LateUpdate` (visibilité de l'ascenseur) · `ListeDefilante.LateUpdate` (fondu et ascenseur d'une liste, **fonction de la position de défilement, jamais du temps**) · `SuiviDuCadre.LateUpdate` (ancres de mise en page) · minuterie de `BandeauEphemere`. Tout autre `Update`/`LateUpdate`/coroutine visuel nouveau fait rougir | source |
| G11 | **v4.4, prédicat exact** : une **translation** est refusée si le **parent direct** de la cible porte un `LayoutGroup` (sans `LayoutElement.ignoreLayout` sur la cible) — un `LayoutGroup` ne réécrit la position que de ses enfants directs — ou si la cible porte elle-même un `ContentSizeFitter` ; une **`Echelle`** est refusée si la cible **ou un ancêtre quelconque** porte un `ContentSizeFitter`. (Un `LayoutGroup` ne pilote pas `localScale` : 306 `LayoutGroup` coexistent avec les 67 boutons). **Sa portée réelle est l'ENTRÉE, pas le canal** : `Creer` la consulte canal par canal et REFUSE l'entrée entière au premier canal fautif (`Regie.cs:545-546`, juste après `Couple.Realisable` à `:544`) — un seul canal refusé emporte tout le mouvement. Depuis la v4.8, `retour.appui` ne porte plus d'`Echelle` : **G11 ne mord plus sur le retour d'appui** (preuve au §17, cas 0) | runner |
| G12 | pas de deux `Absolu` sur le même couple | runner |
| G13 | `Ambiance` invisible refusée (seuils par propriété, §6.2) | runner |
| G14 | **v4.8 — par la PROPRIÉTÉ, pas par la syntaxe** (arbitrage f2 du 08/10 ; revue ⊥ n°4 du §17, B1) : **seule `Regie.AttacherRetourAppui` peut poser les `Id` `retour.appui` / `retour.appui-voile`.** Garde **structurelle côté `Regie`** (l'`Id` est posé par la méthode elle-même, jamais passé en argument) **+ un contrôle positif d'exécution** qui rougit si un autre site pose l'un des deux `Id`. Le mécanisme, pièce par pièce, est écrit sous la table. Les deux lectures de la v4.7 sont abandonnées : la garde de source scannait un motif **impossible** (`Attacher(Entree e, …)`, `Regie.cs:156` : un `Id` n'y est pas un argument, donc le scan était vert par construction), et la garde d'exécution « par l'`Id` » était jugée incompatible avec les entrées synthétiques des tests — ce qui n'est plus vrai (voir (d)) | runner |

**G14 — le mécanisme (v4.8, à écrire en E2e).** Quatre pièces ; chacune s'appuie sur du code qui existe déjà.

- **(a) Les deux `Id` cessent d'être des arguments.** `AttacherRetourAppui(Entree appui, RectTransform surface, Entree voile, RectTransform cibleVoile)` (`Regie.cs:86`) devient **`AttacherRetourAppui(RectTransform surface, RectTransform cibleVoile)`** : la méthode résout elle-même les deux entrées dans son propre dictionnaire d'admises, par `CatalogueHud.IdRetourAppui` / `IdRetourAppuiVoile`. Rien à inventer : `admises` est **déjà** indexé par `Id` (`private readonly Dictionary<string, Entree> admises = CatalogueInitial();`, `Regie.cs:23` ; `TryGetValue` à `:476` et `:115`). Une entrée absente lève `ArgumentException` comme aujourd'hui (G1 inchangée). ⇒ **aucun site d'appel ne peut nommer l'entrée** : il n'y a plus de paramètre où la mettre.
- **(b) Les deux `Entree` ne sont pas exposées.** Elles sont **créées** en E2e dans `CatalogueHud` et entrent dans `CatalogueHud.Entrees`, donc admises à la construction de toute régie (`CatalogueInitial()`, `Regie.cs:54-60`) — mais **sans** champ `public static readonly` à leur nom, contrairement à `CatalogueHud.Pouls`/`Tremble`/… Et `Regie` n'offre aucune recherche par `Id` : son API publique (relevée en entier par la revue n°4) ne contient **aucune** `Entree Trouver(string)`. ⇒ la seule voie restante pour obtenir l'une des deux entrées est d'énumérer `CatalogueHud.Entrees` et de filtrer sur l'`Id` : c'est cette voie, et elle seule, que (c) ferme.
- **(c) Contrôle positif, à l'exécution, dans `Creer`.** `Creer` porte **déjà** le drapeau qui distingue les deux chemins (`private Handle Creer(Entree e, …, bool retourAppui)`, `Regie.cs:503`, passé `true` seulement par `AttacherRetourAppui` à `:98` et `:102`). La garde est une ligne, avant les quotas : `if (!retourAppui && (e.Id == CatalogueHud.IdRetourAppui || e.Id == CatalogueHud.IdRetourAppuiVoile)) return Refuser(e, "G14 : retour d'appui hors AttacherRetourAppui");` — un **refus** (handle nul, `Refus++`), pas une levée, puisque la règle « le retour d'appui n'est jamais refusé par la régie » (§17 cas 0) ne vaut que pour le chemin du retour d'appui. **Le test qui la tient** : prendre l'entrée par `CatalogueHud.Entrees` (seule voie, cf. (b)), l'`Attacher` sur un `Image` neuf, exiger un handle **nul** et un `Refus` de plus ; **retirer la ligne fait rougir ce test** (mutation à vérifier au créneau). C'est le « contrôle positif » demandé : la garde rougit sur un site fautif, au lieu d'être verte parce que son motif n'existe pas.
- **(d) Pourquoi les entrées synthétiques des tests ne s'y opposent plus.** L'argument de la v4.7 (« une garde d'exécution casserait les entrées synthétiques des tests ») tombe **par construction** dès que les deux entrées réelles existent au catalogue : `Admettre` refuse une autre référence sous un `Id` déjà admis (`Regie.cs:115-116`, `"Id déjà admis pour une autre entrée : "`), donc **aucun test ne peut plus injecter de `t.appui` sous `retour.appui`**, garde ou pas. Les tests passent aux entrées réelles, qui portent exactement les canaux dont ils ont besoin (`retour.appui` : `Melange` `Absolu` ; `retour.appui-voile` : `Alpha` `Multiplicatif`).
- **Conséquence sur le harnais déjà vert — à signaler au gate.** Les 4 appels de `AttacherRetourAppui` (`MouvementsRegiePlayModeTests.cs:105`, `:116`, `:145`, `:222`) perdent leurs deux arguments `Entree` et leurs entrées synthétiques `t.appui`/`t.voile` ; **`E0_AttacherRetourAppui_HorsCatalogue_Leve_MemeSurLeCheminDuVoile` (`:206-224`) perd son porteur** — on ne peut plus passer une entrée hors catalogue — et son invariant (« G1 sur TOUS les chemins, voile compris ») devient un invariant **de construction**. Il est donc REMPLACÉ par deux tests : le contrôle positif (c), et un test qui épingle l'admission à la construction (les deux `Id` sont dans `admises` dès la création d'une régie ; `Admettre` d'une entrée étrangère sous l'un des deux lève). C'est **le seul endroit** où ce lot réécrit un test déjà vert : à déclarer au gate de E2e, et consigné en dette 30.

Ce qui prouve quoi : le typecheck hors Unity prouve syntaxe et types ; **toute exécution passe par un créneau** (une seule assembly de tests, `Assets/Tests/PlayMode`, `[Test]` et `[UnityTest]` dans le runner). Groupés.

## 11. Plan de code (ordre de valeur joueur) et décisions

| étape | contenu | créneau |
|---|---|---|
| E0 | spike des inconnues d'uGUI (§4) | OUI |
| E1 | `Mouvements/` : modèle, courbes, régie, politique, registre, catalogue (HUD), `oracle`, gardes | OUI |
| E2 | `AppShell` publie la régie ; migration des 4 existants (§9) ; `RetourAppui` (§8) ; ligne « Mouvement réduit » de ⑲ ; G2 G6 G9 G10 G11 | OUI |
| E3 | ① HUD : flotteur (R2.2 d'abord), fondus B5/B9 (hôte de fondu croisé), virages B6/B7/B8, balayage B10 | planche multi-images + juge |
| E4 | ④, puis **le manomètre de tension de ⑭** (élément A construit, à nous : cadran, arcs teal/ambre/rouge, aiguille et pivot d'après les cadres 14-19 — six angles 12, 64, 60, 20, −60, 64 ; géométrie réutilisée du chrome, `TopBarController` face/arcs ; le juge groupé a mesuré secteurs teal 8 378 px et rouge 8 448 px → 0 en jeu ; son balayage de 0,7 s est `chrome.aiguille.balayage`/`semaine.aiguille`), puis les écrans montés du catalogue | planches + juge, UN créneau groupé |
| E5 | scènes serre/labo/Ash : ART d'abord ; `sf`, `po`, `bl`, `fl` : shader d'UI ou rien | — |

Décisions déjà prises par f2/l'user : ligne ⑲ = REUSE du canon ; `RetourAppui` partout ; l'ère des objets est 2000-2010. Reste ouvert : le flotteur « + $ » (montant exact, R2.2).

## 12. Ce que ce design ne couvre pas

Le catalogue (42 entrées) est une proposition à relire une fois ce mécanisme approuvé : ses champs `Ecrans` (liste), `Fonctionnelle`, `Parametre`, `Bloquante` sont ceux de ce modèle.

## 13. Réponse à la revue ⊥ v2 (v3)

| finding | traitement |
|---|---|
| BL-1 oracle sans coudes | `oracle-css.cjs` corrigé (union 17 points + pourcentages d'images clés), JSON régénérés, §7 vrai ; `recenser-transitions.cjs` ajouté |
| BL-2 signe CSS→Unity | convention de repère écrite (§2), `tremble` = `0 → −4° → 0`, test d'oracle sur le SIGNE de la dérivée aux extrema, `DistrictDescentePlayModeTests.cs:172-181` dans §9 |
| BL-3 `Detacher` | sémantique de restitution + libération après 30 s d'inactivité (§3) ; `SetDescente(false)` et `Effacer` détachent ; test sur `groupe.alpha` réel (§9) |
| MA-1 | `Rebaser` explicite + detection avec epsilon par propriété, `DeltaAngle`, `Tick` idempotent (§3) |
| MA-2 | G11 restreinte à `TranslationX/Y` (§10) |
| MA-3 | registre `RegieMouvement.Courante` publié par `AppShell`, `PourTest`, `SansRegie` compté (§3, §9) |
| MA-4 | B5/B9 classées, hôte de fondu croisé nommé ; transitions recensées par machine ; B8 sans oracle déclaré (§7) |
| MA-5 | seuils par propriété ; classes de période (§6.2) |
| MA-6 | unité = piste ; 3 paires non portables (`sf`, `po`, `bl`) (§4, §7) |
| MA-7 | `Hue` : base `CouleurA`, RGB seulement (§2) |
| MA-8 | ligne `SetCitywideHeatBucket` ajoutée à §9 |
| MA-9 | G10 : liste fermée par fichier:méthode, `LaSuitePanelController.LateUpdate` nommée (§10) |
| mineurs | `Reglage` + `Dx`/`Chute` ; `Is.Not.AllocatingGCMemory` : outil, pas idiome ; « 17 projets du typecheck » ; `mk-eclat` dans l'oracle, `monte` hors oracle ; `CanvasGroup` réutilisé ; `Retour` sous `Reduit` : mélange + liseré ; catalogue en cours de mise à jour sur ce modèle ; comparaison maquette à fractions de période fixes ; planches par classe de période ; G6 déplacée côté test (TMP) |

## 14. Réponse à la revue ⊥ v3

| finding | traitement |
|---|---|
| B1 test `:164` vide après migration | §9 ligne 1 : `:164` lit `Image.color.a`, deviendrait vrai quoi que fasse le pouls ; RÉÉCRIT sur l'alpha effectif du `CanvasGroup` de `BoitierRing` + contrôle négatif |
| B2 `Annoncer` non détaché | §3 : `Annoncer` détache le fondu ; test de la perte d'annonce (§9) ; interruptibilité écrite (dernière transition gagne) |
| M1 39 vs 40, B11 | 40 paires partout ; B11 (aiguille de ⑭) classée `SansHote` ; `transitions-brennar-6.json` ajouté aux entrées de G2 (§7, §10) |
| M2 échelle X | `EchelleX` ajouté ; `ec` et `mk-buee` en X, `drip` et `gt` en Y (§2, §7) |
| M3 easing « linear » | l'oracle capture `getKeyframes()[i].easing` (`easing_cles`, régénéré : `ease-in-out` 55, `ease` 9, `linear` 14…) ; `Aisance` se lit là (§2) |
| M4 triplets AmbientPulseLoop | §9 : trois triplets nommés, réécrits dans le même lot, `AmbientPulseLoop` supprimé |
| M5 horloge des 30 s | mesurée sur `IHorloge` de la régie, gelée sous `Figee` ; contrôle négatif ajouté (§3, §4, §6.4) |
| mineurs | G10 : 10 mesurés = 3 migrés + 7 nommés ; `base = 1` pour l'équivalence d'amplitude ; `fl` : l'hôte manque, pas le modèle ; G8 vs canon l.124/125 ; `AppuiLong.Duree` public const ; `Retour` attaché à `PointerDown` ; `CanvasGroup` sur la cible elle-même ; garde de teintes de `CaptureSousShell` conservée ; oracle : un seul `--etat` par exécution (seul `descente` commité) ; catalogue recalé sur 40 paires |

## 15. Revue ⊥ n°4 — APPROUVÉ (0 BLOCKING) ; fermeture des 5 MAJOR

| finding | traitement (v4.1) |
|---|---|
| MA-1 G8 refuse `retour.appui-long` (1 000 ms) et `carnet.en-main` (500 ms) | G8 lit « `Bloquante` ET > 250 ms » ; seuls les `Retour` d'APPUI ≤ 250 ms (§10) |
| MA-2 équivalence d'amplitude fausse | bases mesurées (1, 1, 0,35) ; facteurs [0,88..1] néon/flicker, [0,31..1] fumée (§9) |
| MA-3 `Rebaser` manque `UpdateAlarmState`, epsilons manquants | trois sites `:822/836/851` migrés en `Transitionner` ; epsilons ajoutés (§3) |
| MA-4 B1 sans précondition | §9 : le test crée sa régie par `PourTest()` |
| MA-5 compteurs non exposés | `PistesVivantes`, `Refus`, `SansRegie` (§3) |

## 16. Ajout v4.2 — `CouleurA = Cible` (porté par la revue ⊥ n°1 du catalogue, 08/10)

**Pourquoi.** `CouleurA`/`CouleurB` sont déclarées sur le `MouvementDefini`, donc statiques. Or le §8 pose un
`Melange` « vers sombre » sur **les 67 boutons**, dont les `Image.color` diffèrent : avec une `CouleurA`
statique, `Detacher` (§3, « `Melange`/`Hue` → `CouleurA` ») repeindrait chaque bouton de la même couleur.
Le catalogue rencontre le même cas sur les crans de ⑰ (teinte selon le rang) et les voyants de ⑮.

**Quoi.** `CouleurA ∈ { couleur nommée, Cible }` ; `CouleurB ∈ { couleur nommée, Cible × k }`.
- `Cible` = `Graphic.color` RGB **lu à l'`Attacher`/`Transitionner`**, après que le propriétaire a posé son
  état d'arrivée. C'est la base de la propriété `Melange`, exactement comme pour un transform : `Rebaser(cible,
  Melange)` la relit, la détection (epsilon 1/512 par canal) la relit si le propriétaire réécrit, `Detacher` la
  restitue. L'alpha du `Graphic` n'est jamais touché (inchangé).
- `Cible × k` = produit par canal, borné à [0, 1]. `k < 1` assombrit. `k > 1` n'éclaircit que les canaux
  sous 1 : sur un `Graphic` **blanc** dont la couleur est cuite dans le sprite, il ne fait rien — G13 le voit
  pour une `Ambiance`, et le catalogue l'interdit pour les autres genres (§I.1 du catalogue, règle 3). Un `Graphic` à alpha nul,
  ou l'absence de `Graphic`, est l'autre moitié de ce trou : §17.
- Coût : un `Color` par piste, lu une fois à l'attachement ; aucune allocation par `Tick` (X3 inchangé).

**Ce qui ne change pas.** G12 (deux `Absolu` sur le même couple) ; la règle de remplacement du §3 ; le
§5 (i) (`Retour` garde le `Melange` sous `Reduit`) ; le test de fin de piste, qui vérifie maintenant que la
couleur restituée est **celle de la cible**, avec un contrôle négatif sur deux boutons de couleurs différentes.

## 17. Ajout v4.3, réécrit v4.5, amendé v4.6 / v4.7 / **v4.8** — la cible du retour d'appui, et le voile (revues ⊥ n°2, n°3 et n°4 du catalogue, 08/10 ; revues ⊥ CIBLÉES n°2, n°3 et n°4 du §17, tables en fin de section)

**Pourquoi.** `Melange` n'écrit que le RGB d'un `Graphic` : s'il ne peint rien, le retour d'appui est invisible. Trois
revues ont mesuré ce qui fait qu'un `Graphic` ne peint pas (alpha nul, `Mask` à `showMaskGraphic = false`,
`Graphic.enabled = false`, GameObject inactif), qu'une recherche d'enfant retient l'OMBRE PORTÉE de ⑥, qu'un voile posé
sur une zone de clic nue n'assombrit rien, et qu'un voile qui remonte sans borne assombrit toute la barre du haut
(`TopBarController.cs:940`) ou toute la carte (`CityMapController.cs:894`). Et l'état qui décide est MUTABLE : un
`targetGraphic` opaque à la construction peut être forcé à α 0 ensuite (`ExceptionQueuePanelController.cs:99`), un
calque éteint peut s'allumer (`DistrictCellView.cs:65`, `:114`).

**Deux prédicats, évalués AU `PointerDown`, à chaque appui** (B4-3 : pas une décision figée à la pose — à l'instant de
l'appui, l'état est celui que le joueur voit, et la règle donne un résultat calculable et stable pour cet appui) :
- `RendSurface(g)` ⇔ `g` est un `Graphic` **non texte**, `g.enabled`, `g.gameObject.activeInHierarchy`, sans `Mask` à
  `showMaskGraphic = false` sur `g.gameObject`, et dont l'écart RENDU de `Cible` à `Cible × 0,85`, multiplié par `g.color.a`
  et par l'alpha cumulé des `CanvasGroup` **du GameObject de `g` lui-même et de ses ancêtres**, atteint `MouvementTunables.SeuilCouleurRendue` (§6.2) **sur le plus grand des trois canaux R, G, B**, le calcul se faisant **en unités `Color` 0-1** — `SeuilCouleurRendue = 3f / 255f` (`MouvementTunables.cs:76`), soit 3 sur l'échelle 0-255 ; corrigé v4.8 (mineur 1 de la revue n°4 : `Color` stocke 0..1, pas 0-255 ; la v4.7 juxtaposait les deux énoncés) — (le facteur « couleur » est `Couleurs.EcartRvb`, `Couleurs.cs:32`, qui ne porte NI `color.a` NI les alphas de groupe : ils se multiplient en plus. ⚠️ **`Gardes.FranchitLeSeuil` n'est ce prédicat dans AUCUNE de ses deux branches** — corrigé v4.8, I1 de la revue n°4, la v4.7 affirmait l'inverse : sa branche `Melange` (`Gardes.cs:272`, `return amp * Couleurs.EcartRvb(a, b) >= MouvementTunables.SeuilCouleurRendue;`) ne porte **aucun** alpha, ni `color.a` ni groupe ; sa branche `Alpha` (`Gardes.cs:265`, `return amp * ctx.AlphaGraphic >= …`) ne porte **aucune** couleur, et `amp` y est l'amplitude des images clés, pas un alpha de `Graphic`. Le prédicat de `RendSurface` est donc **NEUF**, écrit dans `Retour.cs` : réutiliser `FranchitLeSeuil` en n'y ajoutant que le `CanvasGroup` donne 0,15 × 0,851 = 0,128 ≥ 3/255 là où le §17 veut 0,15 × 0,851 × 0,18 = 0,023, et classe presque tout en cas 2 ; revue ⊥ n°2 du §17, B1 : sur `InspectionScreenController.cs:415`, `Or` à α 0,18, l'écart vaut R 5,9 · G 4,6 · B 2,1 sur 255 — « le plus grand canal » ⇒ cas 2, « tous les canaux » ⇒ cas 3 ; c'est le plus grand canal qui est retenu) —
  revue du §17, M3-M4 : un seuil d'alpha seul acceptait un mélange invisible (α 0,10 sur fond sombre : 0,5/255), et un
  bouton dans un groupe en fondu (`BandeauEphemere.cs:211` `groupe = gameObject.AddComponent<CanvasGroup>();`, écrit à `:279` `groupe.alpha = 1f;` et lu à `:181` — citations rafraîchies en v4.8 avec le mineur 3 : `:207`/`:298` ne portaient plus rien du propos à HEAD, `:207` étant `rt = (RectTransform)transform;` et `:298` `public void Toucher()`). `RendSurface`, `Peint` et `Retour.Poser` sont des fonctions de **`Assets/Scripts/ShellContracts/Retour.cs`** (chemin NOMMÉ, corrigé v4.8 — I4 de la revue n°4 : « l'assembly de l'écran » ne désignait rien. Mesuré : **13** `.asmdef` dans `Assets`, dont **8** assemblies d'écran référencent `ShellContracts` — `Account, CityMap, CitySim, CoreLoops, Economy, Onboarding, Operational, Shell` — et les 67 boutons sont répartis sur plusieurs d'entre elles ; un `Retour.Poser` **unique** ne peut donc vivre que dans `ShellContracts`, qui référence déjà `Unity.TextMeshPro` — `ShellContracts.asmdef` — si bien que le `TMP_Text` de `Peint` y est lisible). Le fichier est **hors** `Mouvements/`, le seul dossier scanné par G7 (`MouvementsGardesPlayModeTests.cs:478` : `Path.Combine(Application.dataPath, "Scripts", "ShellContracts", "Mouvements")`) : G7 interdit le motif `TMPro` **dans** `Mouvements/` seulement. **Un seul `Retour.cs`, à ce chemin** : c'est ce qui fait de `Retour.Poser` l'assistant unique des 67 boutons (un `Retour.cs` par assembly d'écran dupliquerait l'assistant et le prédicat). Pour `Peint`, un `TMP_Text` est jugé sur la propriété `color` du COMPOSANT (couleur des sommets hors périmètre : `colorGradient` / `enableVertexGradient` / `VertexGradient` ⇒ **0 occurrence mesurée** dans `Assets`) ; un texte peint par balise `<color>` est jugé sur le composant, donc peut tomber en cas 5 : G9 le relève et il se déclare. **Les sites sont NOMMÉS, pas comptés** (corrigé v4.8, I3 : la v4.7 annonçait « 4 », la mesure en donne **7 en code** dans 6 fichiers) : `JournalScreenController.cs:944`, `ConflitScreenController.cs:972`, `DailyReviewScreenController.cs:546`, `ReputationScreenController.cs:1176`, `ForensicScreenController.cs:527` et `:704`, `BandeauEphemere.cs:146` (`DailyReviewScreenController.cs:537` est un commentaire, pas un site). Sur les 7, **cinq** colorent un **fragment** (`:527`, `:704`, `:944`, `:546`, `:1176` — le reste de la chaîne garde la couleur du composant : le majorant « `color` du composant » est alors la bonne lecture) et **deux** colorent **toute** la chaîne (`BandeauEphemere.cs:146`, `ConflitScreenController.cs:972` : le majorant est faux par excès, et le cas retenu peut en dépendre). Ces deux-là sont renvoyés au **relevé de G9**, qui nomme la cible de chaque appui : le §17 n'affirme aucun cas pour eux. Le risque symétrique est nul aujourd'hui : `<alpha=` ⇒ **0 occurrence** dans `Assets/Scripts` (un texte opaque rendu transparent par balise ferait un faux cas 3). Un `RectMask2D` n'entre pas dans le prédicat (revue ⊥ n°2 du §17, m6) : il filtre aussi les raycasts, donc un bouton pressable n'est jamais entièrement découpé, et son découpage partiel est un écart de nuance (C), pas un retour invisible. La surface est le PREMIER `Graphic` de son GameObject
  (la régie le re-résout par `GetComponent<Graphic>()`, `RegieInterne.cs:124`).
- `Peint(t)` ⇔ la sous-arborescence de `t` (lui compris) porte au moins un `Graphic`, **texte compris** (un `TMP_Text` NON
  VIDE : `!string.IsNullOrWhiteSpace(text)`, revue du §17 M2), `enabled`, actif, hors `Mask` invisible, et dont l'écart RENDU du voile — 0,20 × max(R,G,B) × color.a × (alpha cumulé des `CanvasGroup` du GameObject du `Graphic` et de ses ancêtres, jusqu'à la racine du Canvas), en 0-255 — atteint `SeuilCouleurRendue` (3/255) : le même critère de perceptibilité que `RendSurface` (revue ⊥ n°2 du §17, M4-M5 : un seuil d'alpha nu laissait passer un fond à α 0,10, soit 0,8/255). C'est ce qu'un voile `Alpha` peut assombrir (un `CanvasGroup` fond un texte :
  G6 n'interdit que les canaux ≠ `Alpha`).

**Ce que le cumul des `CanvasGroup` ignore — pour les DEUX prédicats** (déplacé ici en v4.8, mineur 2 de la revue n°4 : la
clause était logée dans la seule clause `TMP_Text` de `Peint`, alors qu'elle qualifie la chaîne d'alphas de `RendSurface`
**et** de `Peint`). Le cumul « du GameObject du `Graphic` et de ses ancêtres, jusqu'à la racine du `Canvas` » ignore
`CanvasGroup.ignoreParentGroups`, qui interrompt la chaîne. **Trou mesuré à 0 et nommé** : `ignoreParentGroups` ⇒ 0
occurrence dans `Assets`. Le jour où un `CanvasGroup` le pose, les deux prédicats deviennent faux **par excès** (ils
multiplient des alphas qui ne s'appliquent plus) et doivent s'arrêter à ce groupe.

**Quoi.** `Retour.Poser(Button b, Graphic surface = null)` attache un `RetourAppui` ; au `PointerDown`, il choisit :
0. **Le retour d'appui n'est jamais refusé PAR LA RÉGIE** (f2, 08/10 ; revue du §17, B1) : il passe TOUJOURS par
   `Regie.AttacherRetourAppui`, qui (a) lui RÉSERVE une place non-`Ambiance` (`MouvementTunables.PlacesReserveesRetourAppui
   = 1` : les autres `Alerte/Retour/Transition` s'arrêtent à 15) et (b) si le plafond `Melange` du §4 est atteint, envoie les
   cas 1-2 directement au voile (cas 3-4), la bascule comptée APRÈS un handle non nul. Rien n'est évincé. Un bouton qui ne
   peint rien du tout (cas 5) n'est pas un refus de la régie : il se DÉCLARE (G9). **Ce que la réserve neutralise** : le quota
   non-`Ambiance` et le plafond `Melange`. **Ce qu'elle ne neutralise pas** (revue ⊥ n°2 du §17, M2 ; n°3) : la réserve est UNE place — deux appuis SIMULTANÉS (multi-touch) sur deux boutons, le quota non-`Ambiance` à 16, refusent le second (handle nul, compté `SansRetour`) ; une entrée `SansHote` et G8 (`Bloquante` > 250 ms : jamais pour ces deux entrées) ; l'absence de voile
   (`voile` ou `cibleVoile` nuls ⇒ le refus ordinaire s'applique), `Couple.Realisable` (`Melange` exige un `Graphic` sur la cible,
   `RegieInterne.cs:102`), **G11** (voir ci-dessous), G12 d'EXÉCUTION (`Regie.cs:549-553` — citation rafraîchie en v4.8, mineur 3 : `:517-521` était juste au commit de rédaction, les deux commits E2a l'ont décalée ; le §17 est lu à HEAD —, deux `Absolu` sur le même couple cible × propriété : `Retour.Poser` DÉTACHE le handle précédent du même `RetourAppui` avant d'attacher, et deux boutons distincts ont des cibles distinctes ; le seul cas résiduel est une même `surface` nommée partagée par deux boutons appuyés ensemble — handle nul compté, et la prémisse est renvoyée au relevé de G9, qui nomme toute surface partagée), les couples épuisés et les 48 pistes du client. **`Retour.Poser` traite donc un handle NUL** : le retour est
   alors perdu pour cet appui, et compté (`RetourAppui.SansRetour`, comme le cas 5) ; il ne lève jamais. `AttacherRetourAppui`
   impose `Reglage.Defaut` et n'offre pas de `quandFini` (dette 23) : le retour se détache au relâchement par `Detacher`.
   **Seul `retour.appui` / `retour.appui-voile` passe par cette méthode** : c'est la PROPRIÉTÉ que G14 porte (§10, « le
   mécanisme »), et elle est désormais **tenue par une garde** — les deux `Id` ne sont plus des arguments de la méthode, les
   deux `Entree` ne sont pas exposées, et `Creer` refuse l'un des deux `Id` venu du chemin ordinaire. La réserve est donc
   bien celle du geste du joueur, et pas d'un `Retour` quelconque : en v4.7 c'était une affirmation sans garde (revue ⊥ n°4
   du §17, B1), `Regie.cs:89` ne vérifiant que `appui.Genre != Genre.Retour`, ce qui laissait `retour.appui-long` ou
   `carnet.en-main` prendre la 16ᵉ place réservée.

   **G11 ne mord plus sur le retour d'appui — et pourquoi** (v4.8 ; revue ⊥ n°4 du §17, B3, réglé **par construction** par
   le retrait de l'`Echelle`, B2). La chaîne qu'il fallait casser était celle-ci, et elle est réelle : `Creer` consulte G11
   **par canal** (`Regie.cs:545` `string g11 = Gardes.G11(cible, c);`, `:546` `if (g11 != null) return Refuser(e, g11);`) et
   `Refuser` rend `Handle.Nul` en comptant un `Refus` (`Regie.cs:480-485`) ⇒ **un seul canal refusé emportait l'entrée
   entière**, `Melange` compris ; et le prédicat mord sur **tous** les ancêtres (`Gardes.cs:211` : `else if (c.P ==
   Propriete.Echelle && cible.GetComponentInParent<ContentSizeFitter>(true) != null)`). Des boutons étaient concernés, par
   parenté lue : `DelegationScreenController.cs:980` crée `Contenu`, `:999` y pose un `ContentSizeFitter`, `:919` en fait la
   `zoneCentrale` (le CONTENU qui défile, `:964-965` ; elle rend bien ce GameObject : `:981` `RectTransform rtc =
   (RectTransform)contenu.transform;` puis `:1001` `return rtc;`), `:457`, `:508`, `:548` y parentent chaque plaque,
   `:1176-1177` la rendent cliquable et `RendreCliquable` (`:1519-1531`) crée le `Button` dessous (`:1528`) ⇒ **tout bouton de la liste défilante de ㉜ a un
   `ContentSizeFitter` ancêtre** (ampleur mesurée, non déduite : `ContentSizeFitter` ⇒ **75** occurrences dans **22**
   fichiers de `Assets/Scripts`). **La preuve que la chaîne est coupée** : `retour.appui` ne porte plus qu'un canal `Melange`
   `Absolu` et `retour.appui-voile` qu'un canal `Alpha` `Multiplicatif` ; or `Gardes.G11` n'a que deux branches — `if
   (c.EstTranslation)` (et `EstTranslation` ⇔ `P == TranslationX || P == TranslationY`, `Modele.cs:84`) et `else if (c.P ==
   Propriete.Echelle …)` (`Gardes.cs:211`) — donc elle rend `null` sur `Melange` comme sur `Alpha`, et `Regie.cs:546` ne
   refuse pas. ⚠️ Ce n'est vrai **que** parce que l'`Echelle` est retirée : un `KAmp = 0` n'aurait pas suffi, `Gardes.G11`
   ne voyant pas le `Reglage`. **Garde, au relevé de G9 (nommée)** : un bouton sous un `ContentSizeFitter` **garde son
   retour** — le handle est **NON nul** en cas 1-2. Contrôle positif : un `Button` monté sous un ancêtre
   `ContentSizeFitter` (un bouton de la liste défilante de ㉜, cf. la chaîne ci-dessus), appui simulé ⇒ cas 1 ou 2,
   `EstVivant(handle)` vrai, `Refus` inchangé ; et G9 rougit sur tout handle nul en cas 1-4 (§10).
1. la `surface` nommée par l'appelant, si `RendSurface` ⇒ `retour.appui` (`Melange` `CouleurA = Cible` → `Cible × 0,85`,
   **sans échelle** : v4.8, §8). L'appelant la nomme quand le `targetGraphic` est un masque qui ne peint pas : ce sont
   trois **sites** de création (un par carte, par geste…), `ExceptionDetailController.cs:570` → `Verre`,
   `DistrictInteriorScreenController.cs:2312` → `Remplissage` (variante « or » seulement : la variante `.btn.ligne` pose
   `Remplissage` à α 0,039, `:2282`, et tombe en cas 3), `LaSuitePanelController.cs:223` → `Degrade` **seulement
   `if (premierGeste)`** (`:209-220` ; les autres gestes ont un `im` qui rend, cas 2) ;
2. sinon `b.targetGraphic` — **à défaut, le `Graphic` porté par `b.gameObject`** (revue du §17, M5 : `targetGraphic` reste NUL
   à l'exécution quand personne ne l'assigne, `Selectable.Reset` n'existe qu'en éditeur ; 9 sites sur 67) —, si `RendSurface`
   ⇒ `retour.appui` ;
3. sinon, si `Peint(b)` ⇒ **`retour.appui-voile`** sur `b` (`Alpha` `Multiplicatif` 1 → 0,80, 90 ms / 140 ms, sans échelle) ;
4. sinon, si le **parent direct** `q` de `b` vérifie `Peint(q)` **et** aire(`q`) ≤ 2 × aire(`b`) ⇒ voile sur `q` (la plaque
   d'une zone de clic nue : `DelegationScreenController.cs:1519-1531` et `DemolitionScreenController.cs:1449-1461`, les deux
   `RendreCliquable` — citations rafraîchies en v4.8 (mineur 3) : `Image` à `new Color(0f,0f,0f,0f)`, `Button` à
   `transition = None` posé dessus ⇒ cas 1-2 impossibles, et la zone est étirée sur son parent, donc de même aire) ;
5. sinon **aucun retour**, compté (`RetourAppui.SansRetour`) : jamais de remontée au-delà d'un cran ni d'un ancêtre plus
   grand que deux fois le bouton (la barre, la carte).
**Aucun compte n'est affirmé ici** : la répartition des 67 sites entre les cas 1 à 5 se MESURE par G9 au créneau E2, bouton
monté par bouton monté (les revues en ont donné des classements successifs — 18, 16, 17 — sous des règles différentes ;
seul le relevé de G9 vaut). Exemples mesurés (revue du §17) : `ExceptionQueuePanelController.cs:249` en cas 3 (le mot servi « TRANCHER » peint) ;
`TopBarController.cs:940` n'est pas jugé (jamais actif en production : `AppShell.cs:275`, `:1563` ne posent que `None`).
**Cas 5 DÉCLARÉS** (à porter en E2 comme `surface` nommée ou exclusion de G9) : `CityMapController.cs:894` (cellule de
quartier : `hit` α 0, calques éteints) et `DistrictInteriorScreenController.cs:2128` (`Tete_OuvrirFiche` : `zoneTete` α 0,
sans enfant, parent ≈ 4,5× son aire) — consignés dans `dettes-design-mouvement.md` (20).
Sous `Reduit`, le voile est gardé comme le mélange : §5 (i) vise le `Melange` des `Retour` et le voile de
`retour.appui-voile`, **et rien d'autre**.

**Gardes.** G9 : tout `Button` monté, **actif et `interactable`** au moment du relevé, a un `RetourAppui` ; le test, après le premier rendu de chaque écran, simule un
`PointerDown` sur chaque bouton et relève **le cas retenu, la cible, et si le handle rendu est NUL** (v4.8). **Protocole du relevé** (revue ⊥ n°2 du §17, M7) : sur une régie
VIERGE (`RegieMouvement.PourTest()`), avec un `Detacher` du handle APRÈS chaque bouton relevé — sans quoi les 10 premiers
cas 1-2 remplissent le plafond `Melange` et tous les suivants basculent en cas 0, faussant le relevé et masquant les cas 5 ;
le cas est relevé dans l'état MONTÉ à ce moment, et les sites conditionnels (`DistrictInteriorScreenController.cs:691`,
`ExceptionQueueController.cs:605`) le sont dans CHACUN de leurs états montables, chaque état nommé au relevé ; il ROUGIT si un bouton tombe en cas 5 sans
déclaration (surface nommée ou exclusion nommée avec sa raison), **et il ROUGIT aussi sur un handle NUL en cas 1-4**
(v4.8, B3 : ce défaut-là est le seul silencieux — ni cas 5 à déclarer, ni refus visible au joueur). Contrôles négatifs NOMMÉS, un par façon de ne rien
peindre : `Image` d'alpha 0, `Mask` à `showMaskGraphic = false`, `Graphic.enabled = false`, GameObject inactif, état qui
change entre la pose et l'appui (α 1 → 0), zone de clic nue sans enfant (voile sur le parent), parent trop grand (cas 5),
bouton posé sur un `TMP_Text` (cas 3, voile sur le texte). **Contrôle POSITIF ajouté en v4.8** (B3) : un `Button` dont un
ANCÊTRE porte un `ContentSizeFitter` — un bouton de la liste défilante de ㉜ (`DelegationScreenController`, chaîne au cas 0)
— tombe en cas 1 ou 2 avec un handle **NON nul** et `Refus` inchangé ; si un jour une `Echelle` revient au retour d'appui,
ce contrôle rougit immédiatement (G11, `Gardes.cs:211`) au lieu de laisser 22 fichiers d'écran perdre leur retour en silence.

**Note pour E4 (manomètre de ⑭), 08/10, CLIENT-2.** ⑭ porte le décor de scène (`5c71a421`, `feat/decor-de-scene`) : la
pile est le `VerticalLayoutGroup` du GameObject de `CompressionScreenController` (variable `v` dans `Construire()`), et un
`ReserveDeBande` recalcule `v.padding.top` à chaque changement de rect. Le manomètre s'ajoute en ENFANT de la pile ; ne
jamais écrire `padding.top` à la main.


**Réponse à la revue ⊥ n°2 du §17 (v4.6, 08/10 — 1 BLOCKING, 7 MAJOR, 6 mineurs).**

| point | traitement |
|---|---|
| B1 canal de `RendSurface` | le plus grand des canaux R, G, B (= `Couleurs.EcartRvb`) ; mesure de `InspectionScreenController.cs:415` en exemple. *(Unité recalée en v4.8 : le calcul est en unités `Color` 0-1, le seuil `3f/255f` ; « sRGB 0-255 » était la formulation fausse de la v4.6)* |
| M1 / m1 `AttacherRetourAppui` ne garde que le `Genre` | G14 (source, §10) : dans les deux sens, `Retour.cs` seul appelant, deux `Id` seulement ; dette 21 réciproque. *(Remplacée en v4.8 par une garde de PROPRIÉTÉ : la garde de source n'était pas écrivable)* |
| M2 chemins de refus non neutralisés | cas 0 : liste de ce que la réserve neutralise / ne neutralise pas ; `Retour.Poser` traite un handle nul (perdu, compté `SansRetour`) |
| M3 catalogue §I.4 (`:343`) sans le repli ni l'appel obligatoire | reporté |
| M4 / M5 `CanvasGroup` du nœud lui-même ; seuil d'alpha nu de `Peint` | cumul « du GameObject du `Graphic` et de ses ancêtres » ; `Peint` au même critère d'écart rendu (0,20 × canal max × alphas ≥ 3/255) |
| M6 « 18 sur 48 » du catalogue | recompté sur le quota non-`Ambiance` ; la place réservée est porteuse |
| M7 protocole de relevé de G9 | régie vierge + `Detacher` après chaque bouton ; états montables nommés |
| m2 « 8 » au catalogue · m3 `Reglage.Defaut` / pas de `quandFini` · m5 prédicat de `Reduit` · m6 `RectMask2D` | catalogue corrigé ; dits en §17 cas 0 · §5 (i) · §17 `RendSurface` |
| m4 G1 contournée sur le chemin du voile | CODE : `VerifierAdmise(appui)` avant la bascule (`Regie.cs`), test neuf `E0_AttacherRetourAppui_HorsCatalogue_Leve_MemeSurLeCheminDuVoile`, mutation vérifiée (harnais 82/82) |

**Réponse à la revue ⊥ n°3 du §17 (v4.7, 08/10 — 1 BLOCKING, 4 IMPORTANT, 5 mineurs).** Table écrite en v4.8 : la v4.7
avait fermé ses points par des retouches en ligne, sans table ni en-tête de version (mineur I5 de la revue n°4 — un gate
n'est vérifiable que sans archéologie). Les verdicts de la colonne de droite sont ceux que la revue n°4 a rendus en
RELISANT chaque fermeture ; ce qu'elle a réouvert est traité par la table suivante.

| point de n°3 | traitement en v4.7 | verdict de la revue n°4 |
|---|---|---|
| B1 G14 inécrivable en source | portée du scan restreinte à `Assets/Scripts` (`Assets/Tests` exclu) | **NON fermé** (motif impossible : un `Id` n'est pas un argument de `Attacher`) ⇒ **v4.8, G14 par la propriété** |
| I1 `RendSurface` ≠ `Couleurs.EcartRvb` seul ; `FranchitLeSeuil` laisse tomber les alphas | phrase ajoutée en §17 `RendSurface` | **mal fermé** (la phrase disait l'inverse de la mesure) ⇒ **v4.8, I1** |
| I2 `Peint` ambigu sur un `TMP_Text` peint par balise | clause « jugé sur `color` du COMPOSANT » + cas 5 déclarable, et `Retour.cs` sorti de `Mouvements/` (G7 interdit `TMPro`) | fermé **de travers** : l'hôte « assembly de l'écran » ne désignait rien, et la liste des sites était comptée à la louche ⇒ **v4.8, I3 + I4** |
| I3 « la réserve neutralise le quota » non borné (UNE place) | cas 0 : « la réserve est UNE place — deux appuis SIMULTANÉS refusent le second » | **fermé net et juste** (`Regie.cs:520`, `:523`, `QuotaAlerteRetourTransition = 16`, `PlacesReserveesRetourAppui = 1`) |
| I4 G12 : l'argument portait sur le G12 de DONNÉE | prémisse (et non argument) + G12 d'EXÉCUTION cité | **fermé, citation exacte au commit de rédaction** (ligne décalée depuis : mineur 3 ci-dessous) |
| m1 `Gardes.cs` « plafond de 8 pistes `Melange` » | corrigé DANS LE CODE : « 10 » (`Gardes.cs:309`) ; dette 36 | fermé |
| m2 `PolitiqueMouvement.Gele` : `PolitiqueMouvement` est un enum | citation recalée sur `GelDeMouvement` (`PolitiqueMouvement.cs:20`, méthode `:22`, règle `Retour` `:30`) | fermé |
| m3 unités sRGB 0-255 vs `Color` 0-1 | correction « en unités `Color` 0-1, seuil `3f/255f` » ajoutée… à côté de l'ancienne phrase fausse | fermé **à moitié** ⇒ **v4.8, mineur 1** |
| m4 `CanvasGroup.ignoreParentGroups` ignoré | incise « hors périmètre : 0 site mesuré » | fermé **au mauvais endroit** (dans la clause `TMP_Text`) ⇒ **v4.8, mineur 2** |
| m5 liste « ce qu'elle ne neutralise pas » : `EstSansHote` et G8 omis | ajoutés au cas 0 | fermé et vrai — mais **G11 manquait encore** ⇒ **v4.8, B3** |

**Réponse à la revue ⊥ n°4 du §17 (v4.8, 08/10 — NOT_APPROVED : 3 BLOCKING, 5 IMPORTANT, 4 mineurs).** Arbitrage f2 du
08/10 sur B2 et B1 (non négociable) ; rien n'est codé, aucun `.cs` touché par cette version.

| point | traitement en v4.8 |
|---|---|
| **B1** G14 inécrivable, et §17 affirmait sans garde | **G14 réécrite par la PROPRIÉTÉ** (§10 + « le mécanisme ») : les deux `Id` ne sont plus des arguments (`AttacherRetourAppui(RectTransform, RectTransform)`, résolution par `admises`), les deux `Entree` ne sont pas exposées, **contrôle positif d'exécution** dans `Creer` via le drapeau `retourAppui` existant (`Regie.cs:503`) ; l'argument « entrées synthétiques des tests » tombe par construction (`Regie.cs:115-116`) ; le §17 cas 0 renvoie à la garde au lieu d'affirmer. Conséquences sur 5 tests déjà verts : nommées, dette 30 |
| **B2** `Echelle` « sous condition » inimplémentable sous un `Id` unique | **`Echelle` RETIRÉE** du retour d'appui (arbitrage f2) : §8 réécrit, règle « ≤ 1/3 du cadre » **ANNULÉE**, cas 1 du §17 sans échelle, `catalogue-mouvements.md:343` ramené à `Melange` Abs. Pas de 3ᵉ `Id`, pas de levier `Reglage`. Le geste perdu part en **dette 29** |
| **B3** un bouton sous `ContentSizeFitter` perdait TOUT son retour, et G9 ne le voyait pas | réglé **par construction** par B2, **avec la preuve** : `Creer` consulte G11 par canal et refuse l'entrée entière (`Regie.cs:545-546`, `Refuser` → `Handle.Nul` `:480-485`), le prédicat mord sur tous les ancêtres (`Gardes.cs:211`) — mais ses deux seules branches sont `EstTranslation` (`Modele.cs:84`) et `Propriete.Echelle`, donc `null` sur `Melange` et sur `Alpha`. G11 **ajouté** à la liste du cas 0 ; **G9 rougit désormais sur un handle nul en cas 1-4** ; **contrôle positif nommé** (bouton sous `ContentSizeFitter` ⇒ handle NON nul) |
| **I1** « `Gardes.cs:243` ne multiplie que l'alpha du `Graphic` » est faux | remplacé par l'avertissement demandé : **ni** la branche `Melange` (`Gardes.cs:272`, aucun alpha) **ni** la branche `Alpha` (`:265`, aucune couleur) n'est ce prédicat ; `RendSurface` est un prédicat NEUF de `Retour.cs`, avec le calcul 0,15 × 0,851 × 0,18 = 0,023 opposé à 0,128 |
| **I2** dette 24 part d'une prémisse fausse ; dette 21 contredit G14 | dettes **réécrites** : les deux entrées sont à **CRÉER** (mesuré : `appui`/`Appui` ⇒ 0 ligne dans `CatalogueHud.cs` ; les seuls littéraux sont à `Gardes.cs:183`), `Gardes.cs:183` doit **consommer** les constantes (sinon G8 devient muette sur un `Id` renommé), et la dette 21 est alignée sur G14 v4.8 (la réciproque est tenue par construction, non par un scan) ; `Gardes.cs:280` → `:309` |
| **I3** « 3 autres sites » non mesuré (7 en réalité) | les **7 sites nommés** (6 fichiers), le commentaire `DailyReviewScreenController.cs:537` écarté, et la distinction **fragment (5) / chaîne entière (2)** écrite : les deux sites « chaîne entière » sont renvoyés au relevé de G9 |
| **I4** « `Retour.cs` (assembly de l'écran) » ne désigne rien | chemin NOMMÉ : **`Assets/Scripts/ShellContracts/Retour.cs`** (mesuré : 13 `.asmdef`, 8 assemblies d'écran référencent `ShellContracts` ; `ShellContracts.asmdef` référence `Unity.TextMeshPro`), hors du dossier scanné par G7 (`MouvementsGardesPlayModeTests.cs:478`) ; unicité du fichier dite |
| **I5** §17 non traçable (pas de table n°3, en-tête v4.5) | **cette table et la précédente** ; en-tête du document à **v4.8**, §17 daté `v4.3 → v4.5 → v4.6/v4.7/v4.8` |
| **m1** unités : les deux énoncés dans la même phrase | la moitié fausse (« sRGB 0-255 telles que Unity les stocke dans `Color` ») **retirée** ; `MouvementTunables.cs:76` cité |
| **m2** `ignoreParentGroups` au mauvais endroit | **déplacé** en clause propre, qualifiant la chaîne d'alphas des **deux** prédicats |
| **m3** citations décalées par les deux commits E2a | rafraîchies à HEAD : `Gardes.cs:243` → **`:272`** (et `:236` → `:265`) · `Regie.cs:517-521` → **`:549-553`** · `BandeauEphemere.cs:145` → **`:146`** · et, **non relevées par la revue mais vérifiées fausses à HEAD**, les deux `RendreCliquable` du cas 4 (`Delegation` `:1519-1531`, `Demolition` `:1449-1461`) et le groupe en fondu du bandeau (`BandeauEphemere.cs:207`/`:298` → `:211`/`:279`) |
| **m4** G14 scannait du texte (commentaires inclus) | **sans objet** : G14 v4.8 n'est plus un scan de source. Le nom nu `AttacherRetourAppui` peut rester en commentaire (`MouvementTunables.cs:18`, `Regie.cs:518`) sans rien faire rougir |
