# ㉛ Loi côté client — l'élément donné (LB-1) et l'état d'accord (LB-4) — design d'UNE page (12/11, CLIENT-1)

**Mandat** : file f2 du 12/11, n°1. Back : `lot/loi-31` (BACK-3) dans `gate/cumul-2026-11-15` @70ea6e07, spec `design/loi-31-lots` @cf7d5ab9
(§3 forme servie, §4 mots ratifiés, §7 « côté client »). Base client : cumul @0034237b, branche `lot/client1-loi-31-2026-11-12`.

## Mesuré (V15, au SHA 70ea6e07)
- `ActiveCaseView` sert **7** clés : les 5 déjà déclarées par `LegalCaseDto` + `leakedItemI18n: {key, params:{}} | null` + `pleaOffer:
  'offered' | 'unavailable'` (`legal.types.ts:182,187`, `legal-projection.service.ts:255-256`). ⚠️ Le §7 de la spec back est daté (lu à d8fea594 :
  « DTO vide ») : depuis TD-823 le DTO porte 5 champs ; le travail est l'ajout de 2 champs, pas un remplissage.
- `string_table.ts` : `loi.element.*` ×8 et `loi.dit.il_a_donne_ce_qui_est_sorti_ne_rentrera_pas` : 18 lignes à 70ea6e07, **0** sur la pile de dev
  (8d0184a4). Valeur FR du n°9 lue à l'octet : `{nom}\xa0: «\xa0Il a donné {element}. Ce qui est sorti ne rentrera pas.\xa0»` (U+00A0 ×3).
- Au passage, TD-1045 (㉛) : les 3 replis `loi.dit.*` du client sont IDENTIQUES à l'octet aux valeurs FR de 70ea6e07 (3/3).

## Changement — 2 fichiers de code, 1 de test, 2 registres
1. **`LoiDtos.cs`** — `LegalCaseDto` gagne `leakedItemI18n` (`ElementFuiteI18nDto { key }` ; `params` est un objet VIDE, non déclaré) et
   `pleaOffer` (chaîne, domaine serveur). `JsonUtility` rend une instance VIDE pour `null` : l'absence se lit `key` vide.
2. **`LoiScreenController.cs`** — `LoiResolvers.ElementDonne(affaires, pire)` (pure, hors lecture du catalogue) : rend le TEXTE servi de l'élément,
   ou null. Règle : seulement si la pire bande est `low` ou `significant` (la clé n°9 remplace la phrase appauvrie « Il a commencé à parler… », et
   elle seule ; `silent` et `full_dump` gardent la leur — spec §4 recos (9)) ; parmi les affaires À CETTE BANDE, la première, dans l'ordre servi,
   dont `leakedItemI18n.key` est non vide ET connue du catalogue. La clé est une RÉFÉRENCE SERVIE (`I18nCatalog.Traduire(a.leakedItemI18n.key)`,
   forme admise par la garde L2 de `I18nHorsLibelle`) : **aucun `switch` client sur les 8 types, aucun repli client pour un élément** — une clé
   que le bundle ne connaît pas ⇒ la phrase appauvrie, jamais une clé affichée ni un mot inventé.
   `RendreLaVoix` : si `ElementDonne` ≠ null ⇒ `Libelle.GabaritExigeant(n°9, repli FR à l'octet, {nom, element}, "nom")` ; sinon inchangé.
   L'élément est dit en italique comme le reste de la phrase (maquette `ecrans-brennar-6.html:4894` : seul le nom est en gras).
3. **`ZeroRepliDesLocataires…DetteDatee`** — + la clé n°9 (demandée par le code, 0 servie sur la pile) ; à retirer quand la règle (2) rougit.
4. **`dettes-client1.md`** — TD-1082 (ci-dessous) ; TD-1045 annotée (V15 des 3 `loi.dit.*` faite).

## Ce que le lot NE fait PAS — et pourquoi (à trancher par f2 si autrement)
**Le CTA « ACCEPTER L’ACCORD » (mots n°10-11) n'est pas rendu ; `pleaOffer` est déclaré, non lu ⇒ TD-1082.** Mesuré : `pleaOffer` vaut `'offered'`
sur TOUTE affaire active (`derivePleaOffer`, TD-383 ouverte côté back). Le pied de ㉛ est UN geste : le choisir sur `pleaOffer` remplacerait
« LUI TROUVER UN AVOCAT » (cadres 67/69) par l'accord (cadre 71) sur toute affaire, c'est-à-dire le défaut que la spec back nomme en §8 (b) pour
la réplique. Et `POST …/plea` clôt l'affaire sans retour : un geste irréversible posé par défaut sur chaque affaire, sans le cadre 71 autour
(« Ce qu’on peut faire », deux `.pl-choix`), serait un bouton qui en dit moins que ce qu'il fait. Les clés n°10-11 ne sont pas demandées par le
code ⇒ pas en DetteDatee. **Détecteur** : TD-383 tombe (une vraie offre) ou f2 tranche le sélecteur du cadre 71 ⇒ lire `pleaOffer`, câbler `plea`.
Hors lot aussi : la vitre du prévenu et « Ce qu’il sait » (cadres 67-72, TD-975/TD-1114 du back) — `RendreAffaires` garde son compte.

## Falsifiable
Statique (hors porte) : typecheck `--frais Operational` + tests, `--controle` sur `LoiScreenController.cs` ; garde L2 relue sur la source.
À JOUER au créneau (catégories `EcranLoi`, `BundleReel`) :
- `EcranLoiLB1_ElementDonne_…` (pur, catalogue injecté) : `significant` + clé connue ⇒ « la planque » ; CONTRÔLES ⇒ null : pire bande `full_dump`
  ou `silent` avec élément · clé inconnue du catalogue · `leakedItemI18n` null (instance vide) · l'élément d'une affaire `low` quand la pire est
  `significant` sans élément. Deux affaires à la pire bande, la 1ʳᵉ sans élément ⇒ celui de la 2ᵉ.
- `EcranLoiLB1_CorpsReel_…` : un corps à la forme de 70ea6e07 (7 clés, un `leakedItemI18n` objet, un `null`) passe par `JsonUtility` ⇒ `key` lue,
  `pleaOffer == "offered"`, et `null` ⇒ `key` vide.
- `EcranLoiLB1_LaVoixNommeLElement` (EFFET) : rendu == `Lt. Rin : « Il a donné la planque. Ce qui est sorti ne rentrera pas. »`,
  avec le n°9 servi ET en repli (même texte) ; CONTRÔLE : sans élément ⇒ « Il a commencé à parler… », le test TD-823 existant reste vert.
NON mesurable ici : un vrai corps avec fuite (≥ 8 jours de jeu en espérance, spec back §2) ; le parcours back épingle `null`.
