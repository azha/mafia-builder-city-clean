# ㉔ L'autonomie (`screen_c7`) — le burner : inventaire, l'art qui existe, les mots, et ce qu'il faut pour le ratifier

> Atelier / DA, 2026-09-23. Côté atelier seulement : **CLIENT-2 fera l'écart avec le contrôleur.** Aucun rendu.
> **Cadres cités** : `ecrans-brennar-6.html` (série 6) cadres **25** (deux messages), **26** (un message : tapez 1 ou 2), **27** (le même homme,
> chaque cycle), **28** (OPTIONS : traiter la cause), **29** (après votre réponse), **30** (aucun message) — atelier `0ccd8d5` ; nominal 25
> (INDEX). **Juge visuel r1** (06/09) : `Tools/juge-visuel/autonomie/r1-2026-09-06/rapport.md` — **NON APPROUVÉ**, 8 bloquants (F1-F8),
> 5 majeurs, 1 mineur. **Back** `4841d7ad` / `e75cf69d` (registres lus par leur nom) : `operational/lieutenant/autonomy/*`,
> `lieutenant.controller.ts`. **Client** : arbre F `b82c3b9e`, `AutonomyInboxController.cs` (dernier commit `0f058641`, 22/09).

---

## 1. Les blocs

| bloc | cadres | nature | source dans la maquette |
|---|---|---|---|
| **le décor** : le quartier de nuit | 25-30 | **ART** (image) | `.scene.district` (`:185`), JPEG embarqué 720×1280 ; `.voile-scene` par-dessus |
| le chrome du shell (ARGENT · CHALEUR · JOUR · moment) | 25-30 | shell | `.barre` — hors de cet écran |
| **le burner** : coque, marque « BRENNAR · GSM », dalle LCD verte à balayage, réseau, batterie | 25-30 | CSS | `.burner` (`:418`), `.coque-h`, `.marque`, `.lcd` (`:422`), `.scan`, `.sig`, `.bat-lcd` |
| la liste des messages (enveloppe, lieutenant, âge, résumé) | 25, 27 | CSS + mots | `.lcd-corps`, « MESSAGES N » |
| le message ouvert : de qui, quand, la catégorie, le refus, la question | 26, 29 | CSS + mots | `.sms-fil`, `.bulle-lcd`, `.hh` |
| « SA MARGE » : 4 barres par catégorie | 26 | CSS + mots | `.marge-lcd` |
| les deux réponses « 1 » / « 2 » et leur conséquence | 26 | CSS + mots | `.choix`, `.ch` |
| la saisie « TAPEZ 1 OU 2 », le curseur | 26 | CSS | `.saisie`, `.curseur` |
| le menu OPTIONS (3 gestes + retour) | 28 | CSS + mots | `.choix` |
| la réponse envoyée et son issue | 29 | CSS + mots | `.sms-fil` |
| les touches programmables (LIRE · OK · OPTIONS / RETOUR / SUIVANT) et le pavé 4×3 | 25-30 | CSS | `.softs`, `.ok`, `.clavier` (`:470`) |

⇒ **Un seul bloc d'art : le décor.** Le téléphone entier est du CSS, donc de l'UI procédurale côté client (dégradés, bordures, lignes de
balayage), sans asset à produire. Couleurs CSS = **sRGB** ; le vert du LCD est une teinte de la maquette, pas un jeton existant.

---

## 2. L'art — le décor existe, et il est DÉJÀ dans le client

```
fond `.scene.district` de ecrans-brennar-6.html : 720x1280, 104691 octets
contrôle POSITIF : 0.00/255
  DISTRICT_D_NUIT_FINAL.png            1080x1920  écart gris   1.26/255  échelle 0.667  boîte (0, 0, 1080, 1920)
  p2_fonds/VERGE_D_NUIT_FINAL.png      1080x1920  écart gris  12.16/255
  DISTRICT_ZO_NUIT_FINAL.png, DISTRICT_{D,ZO}_JOUR_FINAL.png, VERGE_D_JOUR_FINAL.png : 34,85 à 53,75
meilleur : DISTRICT_D_NUIT_FINAL.png — RVB 1,78/255 ; VOISINS 6,34 et 9,16 ; NÉGATIF (VERGE3_JOUR_FINAL) 65,49
```

| | |
|---|---|
| source | `~/project/atelier3d-mafia/DISTRICT_D_NUIT_FINAL.png` — 1080×1920 RGBA, 2 873 071 octets, sha256 `ce179a27334f0941…`, `22af573` (2026-08-20) ; la maquette l'embarque **entier**, réduit à ×0,667 |
| **dans le client** | **oui, sous un autre nom** : `Assets/Art/District/Backgrounds/VERGE_D_NUIT_FINAL.png` a **le même sha256** (arbre F). ⚠️ Ce n'est PAS `p2_fonds/VERGE_D_NUIT_FINAL.png` de l'atelier (12,16 : une autre passe) — le nom a voyagé, pas le fichier. |
| version d'écran | `Tools/fal/generees/2026-09-06/decors/DISTRICT_D_NUIT_1080x2400.png` : ses 1920 px du bas sont la source à l'identique (0, max 0) ⇒ montable en natif 1080×2400 |

⇒ **Rien à produire.** Le client a le fichier ; ㉔ n'a qu'à le lire (aujourd'hui `AutonomyInboxController` ne charge aucun décor).

---

## 3. Les mots — registre par registre

### 3.1 Déjà servis, dans les deux langues

- **Les 18 libellés d'options** `autonomy.{cook,launder,book,sec,log,dist,muscle,intel,facility}.*` (fr + en, livrés le 22/09, `05-…`) — ex.
  `autonomy.cook.now` = « Cuisiner maintenant » / « Cook now ». ⇒ **S7-b est fermé** (voir §4).
- **Les 4 conséquences** `autonomie.etat.{consequence_minime,un_compromis,on_s_expose,on_laisse_passer_quelque_chose}` et le repli
  `autonomie.etat.inconnu`, demandés par le client (`AutonomyInboxController.cs:377-381`).
- **Les 7 catégories** au nom long : `famille.category.{operations_de_production, routage_logistique, envoi_de_distribution,
  flux_de_blanchiment, reponse_securite, audit_comptable, incident_transversal}`.

### 3.2 Au back : 4 orphelines qui portent encore les glyphes retirés

`autonomie.etat.{elevated_exposure, opportunity_cost, tradeoff, unknown}` (« [!] Exposition élevée », « [$] Coût d'opportunité »,
« [<>] Arbitrage », « [?] Inconnu ») : clés à slug anglais, **aucun demandeur** (le client demande les clés à slug français, sans glyphe —
décision c4 de `04-…`). À retirer, comme les `famille.*` à slug anglais.

### 3.3 À écrire — le texte du téléphone (aucune clé aujourd'hui)

Le fr est donné **en casse de phrase, avec ses accents** : les capitales sans accent du LCD (« IL A REFUSE ») sont le **rendu** de la dalle,
pas la donnée (règle posée au `05-…`). Le client met en capitales et retire les accents au rendu, s'il garde la dalle.

| où | fr | en | source de la donnée |
|---|---|---|---|
| la marque | Brennar · GSM | Brennar · GSM | nom propre |
| l'en-tête de liste | Messages {n} | Messages {n} | `reports.length` |
| l'âge d'un message | Ce cycle · {n} cycle · {n} cycles | This cycle · {n} cycle · {n} cycles | `backlog_age_cycles` (0 ⇒ « ce cycle ») — pluriel ICU |
| l'expéditeur | De {nom} | From {name} | `lieutenant_id` → **nom par jointure** sur `GET /v1/lieutenants` (le rapport ne porte que l'id : r1 F5 affichait l'UUID) |
| le refus | A refusé de {verbe}. | Refused to {verb}. | `refused_action` = l'**archétype** ⇒ un verbe par archétype, ci-dessous. Pas de pronom : l'expéditeur est nommé juste au-dessus, et une lieutenante ne lira pas « il ». |
| la cause | Marge épuisée. | Margin used up. | **toujours vraie** : un rapport naît d'un `EXECUTE_DEFAULT` refusé parce que le budget de la catégorie est épuisé (`autonomy-report.producer.ts:7`) |
| la question | Que dois-je faire ? | What should I do? | fixe |
| la marge | Sa marge | Their margin | `budget_bands` de `GET /v1/lieutenants/:id` (7 catégories × 4 paliers) |
| la saisie | Tapez 1 ou 2 | Press 1 or 2 | les deux options du point (`option_a`, `option_b`) |
| envoyer | Envoyer | Send | `POST …/issues/:issueId/resolve` `{chosen}` |
| les touches | Lire · OK · Options · Retour · Suivant | Read · OK · Options · Back · Next | fixe |
| l'aide de liste | ▲▼ choisir · OK lire | ▲▼ select · OK read | fixe |
| le délai | Sans réponse, la 1 s'appliquera seule | No answer, and 1 applies itself | **sourcé** : `default_on_timeout` applique l'option A quand l'âge atteint `backlog_cap_cycles` (3 par défaut, `lieutenant-tunables.ts:187-189`) |
| la répétition | La même personne, chaque cycle *(la maquette dit « le même homme » : genré, remplacé)* | The same person, every cycle | dérivé : même `lieutenant_id` sur plusieurs rapports ouverts |
| envoyé | Envoyé | Sent | ✅ **sans heure** (tranché le 23/09 : le rapport porte un cycle, pas un horodatage ; maquette corrigée, atelier `ec4c09a`) |
| la réponse | Réponse | Reply | `outcome` de `resolve` |
| message suivant | Message suivant | Next message | fixe |
| aucun message | Aucun message · Vos lieutenants agissent dans leur marge | No messages · Your lieutenants are acting within their margin | `reports.length == 0` |
| retour au message | Retour au message | Back to the message | fixe |

**Le verbe du refus, par archétype** (`refused_action`) :

| archétype | fr | en |
|---|---|---|
| COOK | cuisiner | cook |
| LOGISTICS | expédier | ship |
| DISTRIBUTION | ramasser | collect |
| LAUNDERING | injecter | inject |
| SECURITY | réparer | repair |
| BOOKKEEPER | déposer | deposit |
| MUSCLE | intervenir | move in |
| INTELLIGENCE | observer | watch |
| FACILITY_MANAGER | faire l'entretien | do the upkeep |

Chaque verbe est celui de l'option A de l'archétype (`option-pairs.ts:42-66`, libellés `autonomy.*`) : le lieutenant refuse de faire ce
qu'on lui proposera de faire.

**La catégorie, en court** (l'en-tête du message et les barres « Sa marge ») :

| catégorie | fr (en-tête) | fr (barre) | en (en-tête) | en (barre) |
|---|---|---|---|---|
| `PRODUCTION_OPS` | Production | PROD | Production | PROD |
| `LOGISTICS_ROUTING` | Logistique | LOGI | Logistics | LOGI |
| `DISTRIBUTION_DISPATCH` | Distribution | DIST | Distribution | DIST |
| `LAUNDERING_FLOW` | Blanchiment | BLAN | Laundering | LAUN |
| `SECURITY_RESPONSE` | Sécurité | SÉCU | Security | SECU |
| `BOOKKEEPING_AUDIT` | Comptes | CPTE | Books | BOOK |
| `CROSS_CATEGORY_INCIDENT` | Incident | INCI | Incident | INCI |

**Le menu OPTIONS** (cadre 28) = les trois gestes de `POST /v1/lieutenants/:id/autonomy/decision` (`lieutenant.controller.ts:93`, `:381`) :

| `kind` | fr (libellé) | fr (sous-titre, maquette) | en (libellé) | en (sous-titre) |
|---|---|---|---|---|
| `reset_budget` | Lui rendre sa marge | il repart la fenêtre pleine | Give them their margin back | a full window again |
| `raise_ceiling` | Lui élargir sa marge | pour de bon · décision structurelle | Widen their margin | for good · a structural decision |
| `override_one_shot` | Laisser passer celle-ci | une fois, sans toucher la règle | Let this one through | once, without touching the rule |

⚠️ ⑥ nomme deux de ces gestes autrement (« Remettre le budget à zéro », « Relever le plafond », `LieutenantScreenController.cs:2929-2930`).
Un geste, un nom : l'atelier recommande ceux de ㉔ (la maquette, dans la voix du jeu) pour les deux écrans.

**Les issues d'une réponse** (`outcome` de `resolve`, lues dans les 12 effets `option-handlers/*.handler.ts`) :

| `outcome` | fr | en |
|---|---|---|
| `COOK_STARTED` | La cuisson est lancée. | The cook is on. |
| `DISPATCHED` | C'est parti. | It's on its way. |
| `HELD` | Le chargement attend. | The load is waiting. |
| `COLLECTED` | C'est ramassé. | Collected. |
| `LEFT_TO_RIDE` | On laisse courir. | Letting it ride. |
| `INJECTED` | C'est injecté. | Injected. |
| `INJECTED_CONSERVATIVE` | Injecté, prudemment. | Injected, carefully. |
| `DEPOSITED` | Tout est déposé. | All deposited. |
| `DEPOSITED_RESERVE` | Déposé, une réserve gardée. | Deposited, a reserve kept. |
| `REPAIRED` | C'est réparé. | Repaired. |
| `DEFERRED` | C'est remis à plus tard. | Put off. |
| `NOOP` | Rien n'a pu se faire. | Nothing could be done. |

✅ **Corrigé (atelier `ec4c09a`)** — *note d'origine :* **le cadre 29 dessinait un état impossible** : Lt. Marr (LOGISTICS) répond **2** (= `HOLD`, « Retenir le chargement ») et la dalle
affiche `NOOP` « … il n'y avait rien à retenir ». Or `hold.handler.ts` ne renvoie **que** `HELD`, jamais `NOOP`. Le `NOOP` d'une réponse
logistique vient de l'option **1** (`DISPATCH_NOW` : rien à expédier). ⇒ Tranché : la maquette garde la réponse 2 et montre l'état réel, `HELD` — « LE CHARGEMENT ATTEND. » (le mot, pas le jeton brut).

---

## 4. ⚠️ Ce qu'il faut pour ratifier ㉔ — ce qui a changé, et ce que le back sert vraiment

### 4.1 Les maillons de `back.md` §S7, re-mesurés — `back.md` est en retard

| maillon | `back.md` dit | mesuré (`4841d7ad` / `e75cf69d`) | pour la maquette |
|---|---|---|---|
| **S7-a** | ⛔ aucune ESCALADE : `resolve` n'accepte que A ou B | **vrai** — mais la maquette ne dessine **aucune escalade** : ses réponses sont 1/2 (= A/B) et son menu OPTIONS est la route `autonomy/decision` (3 gestes, **existe**, `lieutenant.controller.ts:381`) | **n'est pas bloquant pour ㉔ tel que dessiné** |
| **S7-b** | `label_key` sans traduction | **fermé** : les 18 `autonomy.*` sont servis en fr ET en (`05-…`) | — |
| **S7-c** | 2 options maximum | vrai ; la maquette en dessine 2 | conforme |
| **S7-d** | la jauge de budget n'a aucune source | **réfuté** (déjà par le juge-données du 25/08) : `budget_bands` (7 × 4) est servi par `GET /v1/lieutenants/:id` — c'est « Sa marge » ; seul le compteur `complexity_budget_cap/_used` reste sans surface, et la maquette ne le dessine pas | **sourcé**, par un 2ᵉ appel |

### 4.2 Ce que la maquette dessine sans source (à trancher)

1. ✅ **L'heure — tranché (23/09)** : elle sort de la maquette (aucune source ; on n'écrit pas une donnée inventée). Si l'user la veut,
   c'est une commande back. Atelier `ec4c09a`.
2. ✅ **Le cadre 29** : ramené à l'état réel `HELD` (atelier `ec4c09a`).
3. **Le nom du lieutenant** : pas sur le rapport ; une jointure client suffit (pas de lot).

### 4.3 Ce qui a changé depuis le cadre, et depuis le juge r1

- **Le chrome** : la maquette est passée à « ARGENT · 24 850,00 € · Tiède · CHALEUR » (`ea23a54`, 07/09) ; **la référence
  `autonomie/reference-1080x2102.png` a été rendue le 03/09** (`6a2971e7`) avec l'ancien chrome « $ 24 850 · HEAT », et la page a changé
  depuis (contraste `5b0676a`, profondeur `ba05356`). Le texte des cadres 25-30 est identique à celui du rendu, hors chrome. ⇒ **re-rendre
  la référence** (au signal) avant tout juge.
- **Les mots** : S7-b fermé (§3.1) ; les glyphes retirés côté client (`0f058641`, c4) ; les 4 orphelines à glyphe restent au back (§3.2).
- **Le client n'a pas changé de forme depuis le r1** : toujours une liste de cartes (0 occurrence de LCD, de burner, de clavier dans
  `AutonomyInboxController.cs`) ; toujours « Lt <id> · Oldest: n cycles » et « Choose A/B » en anglais (`:275`, `:356`). Les 8 bloquants du
  r1 (dalle absente, châssis absent, clés brutes, anglais, UUID, contenu sous le bandeau, titre tronqué, manomètre sur la carte) restent à
  fermer — F3 (clés brutes) l'est côté bundle, pas encore à l'écran.

### 4.4 Ce que l'user a à décider

(a) **Le burner** comme forme de ㉔ — c'est ce que la série 6 dessine et ce que le r1 exige (F1, F2) ; le client construit aujourd'hui autre
chose. **Seule décision encore ouverte** : (b) l'heure et (c) un nom par geste sont tranchés par les règles (orchestrateur, 23/09) — §5.

---

## 5. Un geste, un nom — la table pour CLIENT-1 (tranché le 2026-09-23)

Les trois gestes de `POST /v1/lieutenants/:id/autonomy/decision` prennent les mots de ㉔ (la maquette, cadre 28), **sur ⑥ aussi**. Sites
mesurés sur `gate/cumul-client-2026-09-22` (`bb47e048`) : **3, tous dans `LieutenantScreenController.cs`** ; aucun autre littéral du client
ne nomme ces gestes, et aucun test ne cite leur libellé ni leur identifiant d'objet.

| `kind` | site ⑥ (aujourd’hui) | clé servie aujourd'hui (fr / en) | mot de ㉔ (fr) | en | clé dérivée neuve |
|---|---|---|---|---|---|
| `reset_budget` | `:2974` `Lib("Remettre le budget à zéro")` | `famille.ecran.remettre_le_budget_a_zero` — Remettre le budget à zéro / Reset budget | **Lui rendre sa marge** | Give them their margin back | `famille.ecran.lui_rendre_sa_marge` |
| `raise_ceiling` | `:2975` `Lib("Relever le plafond")` | `famille.ecran.relever_le_plafond` — Relever le plafond / Raise ceiling | **Lui élargir sa marge** | Widen their margin | `famille.ecran.lui_elargir_sa_marge` |
| `override_one_shot` | `:2976` `Lib("Forcer une fois")` | `famille.ecran.forcer_une_fois` — Forcer une fois / Override one-shot | **Laisser passer celle-ci** | Let this one through | `famille.ecran.laisser_passer_celle_ci` |

- **Au back** : servir les trois clés neuves (fr + en ci-dessus) ; les trois anciennes deviennent orphelines à la bascule du client.
- **Au client** : le premier argument d'`AddActionButton` (`"remettre_le_budget_a_zero"`…) est un identifiant d'objet, pas un texte ;
  aucun test ne le lit — le garder ou l'aligner est un choix du client, sans effet joueur.
- Les sous-titres de ㉔ (« il repart la fenêtre pleine », « pour de bon · décision structurelle », « une fois, sans toucher la règle »,
  §3.3) valent aussi pour ⑥ s'il affiche une aide sous le bouton.
