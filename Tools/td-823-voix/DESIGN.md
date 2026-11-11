# TD-823 côté client — la voix des lieutenants (㉛ Loi, ㉝ Démolition) et Wexler (㉓ Boutique) — design d'UNE page (11/11, CLIENT-1)

**Mandat** f2 11/11. Design back APPROUVÉ : BACK-2, `dette/b2` @949e5613 (§4 forme servie, §5 règle O2′, §6 phrases, §9 « ce que le CLIENT
doit déclarer »). Code back en cours (`lot/td-823-voix`) : clés dérivées + replis comptés jusqu'à son SHA, puis V15. Base : cumul c2f1b44c.

## Changement
1. **㉛** — `LegalCaseDto` déclare les 5 clés d'`ActiveCaseView` (recopiées du CODE, `legal.types.ts:147-167` main ; le DTO était VIDE
   exprès) ; `GetLegalResponseDto.speaker` (`LocuteurServiDto {id, name}`, racine). `.pl-dit` AVANT le geste : « **{nom} :** « … » » (nom en
   gras DROIT `#eef3f9`, phrase italique serif 8,6 px `#cdd6e0`), phrase choisie sur la PIRE fuite (`silent < low < significant < full_dump`) :
   `loi.dit.*` ×3 (low et significant : la même). Rien si `speaker` null, aucune affaire, ou bande hors domaine.
2. **㉝** — `GetFrictionStateResponseDto.speaker` ; `Locuteur(roster, site, servi)` : le lieutenant du SITE s'il est au roster (gardé, §5.1),
   sinon `speaker` servi ; le repli « premier du roster » est RETIRÉ.
3. **㉓** — la bande `.voix` (portrait toujours absent, f2 08/10) : `boutique.locuteur.nom` « Wexler » (serif gras 9,5 `#f0dfc4`),
   `boutique.locuteur.role` « derrière le comptoir » (6,5 px capitales, interlettre ,9 px, `#8a7f6b`), puis UNE réplique (italique serif 8,5
   `#d8cdb6`) par PRIORITÉ (règle f2 11/11) : solde 0 ET ≥ 1 acquis ⇒ « Vous avez tout claqué… » ; sinon solde > 0 ⇒ « Ce qui est là est à
   vendre… » ; sinon ⇒ « Les Marks, c’est dehors… » ; solde non lu ⇒ rien. Valeurs SANS `{nom}` (la bande dit qui parle), guillemets à U+00A0.

## Falsifiable (à JOUER au créneau)
- **EcranLoi** `EcranLoiTD823_*` : pire fuite, répliques, recette 3 × U+00A0 ; EFFET : « Lt. Rin » en tête + phrase ; contrôles `speaker` null
  et aucune affaire ⇒ rien.
- **LocuteurReel** L1/L2 : site d'abord, puis `speaker` ; CONTRÔLE : sans `speaker`, le premier du roster ne parle PLUS.
- **EcranVitrine** `VitrineTD823_*` : 3 états ⇒ 3 répliques ; CONTRÔLE : joueur neuf à 0 ⇒ JAMAIS « tout claqué » ; EFFET dans la bande.
- **BundleReel** (ZeroRepli) : les 8 clés neuves en DetteDatee (0 servie sur main).

## Hors lot / dette
- TD-1045 : V15 des 8 valeurs et des noms `boutique.dit.*` au SHA de BACK-2 ; la liste `docs/content/i18n-cles-du-client-<date>.tsv` (dépôt BACK)
  à régénérer par `Tools/cles-i18n-du-client.py` après ce lot (§9.5 du design back) — à router.
- Les 3 états de ㉛ non servables (avocat, arrangement, avocat nerveux) : dette du design BACK-2 (§8 de son design, plage TD-974..979 de SON registre, pas de celui-ci).


## Règle finale de Wexler (f2 11/11, après le juge-données)
(1) solde 0 ET ≥ 1 acquis ⇒ « tout claqué » ; (2) sinon « à vendre » si ≥ 1 article À PORTÉE (`ShopScreenController.ArticlesAPortee` : même règle que `abordable` de la carte — hors monnaie réelle, prix > 0, prix ≤ solde, non possédé) ; (3) sinon « dehors ». Catalogue ou possessions non lus ⇒ rien. Garde : `VitrineTD823_*` (3 états + contrôle positif « grant de 50 + article à 50 ⇒ à vendre »).
㉝ : le `speaker` de la fiche (`friction/nodes/:buildingId`, BACK-2 C2b) n'est pas encore servi ; au moment de le lire : lieutenant du site visé d'abord, repli = `speaker` servi, jamais une position de `lieutenant_ids`.
