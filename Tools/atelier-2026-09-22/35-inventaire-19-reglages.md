# ⑲ Les réglages — ce qui est servi, ce qui est dessiné, ce qui manque des deux côtés

> Atelier / DA, 2026-09-23. Commande f2 : l'inventaire de ⑲ comme pour ⑦, rapproché de sa maquette série 6 (le Profil, cadres 95-97,
> ratifiés par délégation le 02/09, `front.md` l.22). Aucun dessin : il attend le GO.
>
> Lu :
> - back `d8e41362` : `auth.controller.ts`, `auth.service.ts`, `meta-market.controller.ts` ;
> - client cumul `80141d36` : `Assets/Scripts/Account/Settings/SettingsScreenController.cs`, `SettingsClient.cs` ;
> - corps réel `Tools/juge-visuel/compte/corps-reels/GET_me.json` (22/09, back servi `03cf564c`) ;
> - la page `ecrans-brennar-6.html`, cadres 95-97, avec la note du cadre 97 (« ㉖ Le compte — le coffre », la légende des lots L1-L11).

## 1. Le périmètre

La maquette ratifiée est UNE porte, « le coffre », pour deux écrans du client :
- **㉒ Profil** (Plus → VOTRE PROFIL) : le tiroir « Le compte » (le nom, l'adresse, le palier, les jetons…) ;
- **⑲ Réglages** (Plus → LES RÉGLAGES) : le tiroir **« Le jeu »** et les gestes de sortie en bas de la porte.

Cet inventaire couvre ⑲. Les champs de `GET /v1/me` qui servent ㉒ sont nommés, sans plus.

## 2. Ce que `GET /v1/me` sert — 7 champs, le contrôleur en lit 1

| champ | exemple servi | ⑲ le lit ? | dessiné (cadre) | verdict |
|---|---|---|---|---|
| `locale` | `fr` | **oui** | « La langue de la maison », 95-97 | ✅ lu et dessiné |
| `meta_market_visibility_enabled` | `true` | **non** | « Dire mes prix au marché » (97, lot **L1**) | ⚠️ **passé à côté** : servi depuis la lecture ajoutée au back (`auth.service.ts`, commentaire « ㉒ L1 (forme F) ») ; l'écrivain `PUT /v1/me/meta-market/visibility` existe (`meta-market.controller.ts:113`). **L1 est fermé au back**, le client ne l'a pas suivi. |
| `handle` | (le nom) | non | ㉒ « Le nom qu'on vous donne » (97, L7) | hors ⑲ (㉒) |
| `email` | (masqué ici) | non | ㉒ « L'adresse au dossier », masquée « r•••@•••.fr » (96-97) | hors ⑲ (㉒) ; le masquage est un choix de RENDU (le back la sert en clair) |
| `lifecycle_state` | `ACTIVE` | non | **retiré** par le juge (note du 97 : 100 % ACTIVE, zéro UPDATE) | ✅ ne pas dessiner |
| `account_id` | uuid | non | non | ✅ identifiant, jamais à l'écran (R2.2) |
| `player_id` | uuid | non | non | ✅ idem |

Hors de `GET /v1/me`, ⑲ porte aussi :
- `tutorials_opt_out` : lu par `GET /v1/ui/tutorial-state`, écrit par `PATCH /v1/ui/tutorial-opt-out`.
- la déconnexion : `POST /v1/auth/signout`, `auth.controller.ts:315`, lot-5 TD-001c (elle révoque la session courante).

## 3. Le tiroir « Le jeu » et les gestes de la porte, élément par élément

| élément ratifié (mot de la maquette) | cadre | ce qui le sert aujourd'hui | le client ⑲ | verdict |
|---|---|---|---|---|
| **La langue de la maison** — « English » / « Français » | 95-97 | `GET /v1/me.locale` + `PATCH /v1/me/settings {locale}` (domaine `en`, `fr`) | oui : section « LA LANGUE », deux lignes « Français » / « English » | ✅ ; ⚠️ deux sous-titres **en retard**, voir la note ci-dessous |
| **On vous explique encore** — « décochez le jour où vous n’avez plus besoin qu’on vous tienne la main » | 95-96 | `GET /v1/ui/tutorial-state.tutorials_opt_out` + `PATCH /v1/ui/tutorial-opt-out` | **non** : le client le range sous « Les autres préférences — pas encore » | ⚠️ **passé à côté (client)** : servi, écrit, ratifié ; même bascule que ㉕ (33 §2) — inversion opt-IN / opt-OUT, notée sur la maquette |
| **Dire mes prix au marché** — « sans ça, le marché de région ne vous dit rien non plus » | 97 (L1) | `GET /v1/me.meta_market_visibility_enabled` + `PUT /v1/me/meta-market/visibility` | **non** (« autres préférences — pas encore ») | ⚠️ **passé à côté (client)** : L1 fermé au back |
| **Depuis ce matin** — « 12 décisions · 4 exceptions tranchées · 1 engagement pris » | 97 (L5) | rien dans `/me` ; aucune route qui compte « depuis ce matin » | non | ⛔ **manque au back** (L5 ouvert) |
| **FERMER LE COFFRE** — « cette session seulement » | 95-96 | `POST /v1/auth/signout` (révoque la session courante) | **non** : « Se déconnecter — pas encore : la session se ferme avec l'appareil, pas d'ici » | ⚠️ **FAUX côté client** : la route existe (TD-001c) ; « pas encore » n'est plus vrai |
| **FERMER PARTOUT** — « toutes les sessions ouvertes » | 97 (L11) | aucune route (révoquer toutes les sessions) | non (absent de sa liste) | ⛔ **manque au back** (L11 ouvert) |
| **TOUT EFFACER** — « et ne plus jamais revenir » | 97 (L10) | aucune route. L'état `DELETED_TOMBSTONE` existe au schéma, sans écrivain joueur | « Tout effacer — pas encore » | ⛔ **manque au back** (L10 ouvert) ; le client dit vrai |

**Note sur la langue.**
- Le cadre 95 montre « English » : le défaut du signup était alors `en` (note du 97, `auth.service.ts:328` à l'époque). Il est `fr` depuis le
  ruling du 02/09 (« fr = langue réelle », `auth.service.ts:333-339`). Le cadre canon doit donc montrer « Français ».
- Les cadres 95-96 disent « réglée le jour où vous avez ouvert le compte ». C'est faux depuis que `PATCH /v1/me/settings` existe : c'était
  L8, fermé. Le cadre 97 (« français · anglais », avec un chevron) est le bon.

## 4. Ce qui manque, des deux côtés

- **Servi, et que ⑲ ne lit pas** : 3 éléments.
  - `meta_market_visibility_enabled` avec son écrivain ;
  - `tutorials_opt_out` avec son écrivain ;
  - la déconnexion (`POST /v1/auth/signout`).

  Tous trois sont DESSINÉS sur la maquette ratifiée. C'est du côté du client (CLIENT-2 ou CLIENT-1, à f2 de voir).
- **Dessiné, et non servi** : 3 éléments. « Depuis ce matin » (L5), « Fermer partout » (L11), « Tout effacer » (L10) : trois lots du back
  encore ouverts. Côté ㉒, hors ⑲ : L7, changer de nom et corriger l'adresse.
- **Servi, et non dessiné** : rien pour ⑲. Sur les 7 champs de `/me`, 3 sont volontairement absents (deux identifiants et `lifecycle_state`), et 2 vont à ㉒.

## 5. Les mots — ratifiés (D14) contre littéraux du client

| le client ⑲ écrit | la maquette ratifiée dit | D14 |
|---|---|---|
| LES RÉGLAGES (titre) | le tiroir « Le jeu », dans la porte « le coffre » | à trancher : la porte ratifiée réunit ㉒ et ⑲, le client en fait deux écrans (§6) |
| LA LANGUE | La langue de la maison | → « La langue de la maison » |
| Se déconnecter | FERMER LE COFFRE · cette session seulement | → « Fermer le coffre » |
| Tout effacer | TOUT EFFACER · et ne plus jamais revenir | même mot ; le sous-titre ratifié manque au client |
| CE QUI NE S'OUVRE PAS ENCORE / Les autres préférences | (rien : la maquette dessine chaque préférence dans le tiroir) | à retirer quand les deux préférences servies seront branchées |
| Français / English | Français / English | ✅ (des endonymes, comme la maquette) |

Aucun de ces mots n'a de clé servie aujourd'hui : `34-…` compte 41 mots distincts sans clé pour la porte ㉒·⑲.

## 6. Passé à côté ? — les questions

1. ⑲ lit 1 champ sur les 3 que sa maquette ratifiée dessine et que le back sert (la langue, la bascule des tutoriels, la visibilité du marché).
   Plus la déconnexion, servie et annoncée « pas encore ». **Le client doit-il brancher les trois ?** Les trois ont un écrivain.
2. **Une porte ou deux écrans ?** La maquette ratifiée est une seule porte (« le coffre », ㉒ + ⑲) ; le client monte deux entrées Plus. Le
   ruling du 02/09 (collision de nom avec ⑪) a gardé la fusion. ⑪ est maintenant retiré (9be2fe9d) : la raison du nom « coffre » pour ㉒
   ne change pas, mais la question « deux entrées pour une porte » reste ouverte. À f2.
3. Si GO pour dessiner : ⑲ n'a pas besoin d'une maquette NEUVE — la porte ratifiée le dessine déjà. Ce qui manque, c'est un cadre
   « ce que le back sert AUJOURD'HUI » :
   - la langue en « Français » avec un chevron ;
   - la bascule des tutoriels et celle du marché, les deux branchées ;
   - « Fermer le coffre » vivant ;
   - « Fermer partout » et « Tout effacer » éteints, avec leur lot.

   Proposé : **un cadre de mise à jour de la porte**, pas un écran neuf.

## 7. Tranché par f2 (23/09)

- **Une porte pour deux entrées** (㉒ « Le compte », ⑲ « Le jeu ») : **on garde**, c'est la porte ratifiée.
- **Les 3 éléments servis** (visibilité du méta-marché, bascule des tutoriels, déconnexion) : CLIENT-2 les branche, avec les mots ratifiés
  (« Fermer le coffre · cette session seulement », « La langue de la maison »). La langue n'est plus « réglée à l'ouverture du compte ».
- **Dettes de maquette** : dessinées, non servies. Le client dit vrai en les montrant éteintes.

  | lot | élément ratifié | cadre | ce qui manque au back |
  |---|---|---|---|
  | L5 | « Depuis ce matin » : 12 décisions · 4 exceptions tranchées · 1 engagement pris | 97 | une route qui compte la journée du joueur |
  | L10 | « TOUT EFFACER » : et ne plus jamais revenir | 97 | l'effacement du compte (`DELETED_TOMBSTONE` n'a pas d'écrivain joueur) |
  | L11 | « FERMER PARTOUT » : toutes les sessions ouvertes | 97 | la révocation de toutes les sessions |

- **Le cadre de mise à jour** (GO f2) : `~/project/atelier3d-mafia/ecrans-brennar-porte-2026-09-23.html`, 1 cadre, généré par
  `generer-porte-19-2026-09-23.py`.
  - Il part du cadre 97 lu dans la page, avec 7 remplacements vérifiés.
  - L1 et L8 perdent leur lot.
  - La bascule des tutoriels et « Fermer le coffre » reviennent du cadre 95.
  - L5, L10 et L11 sont éteints, avec leur lot.
  - Le rendu vient **après le gate back** : `rendre-porte-2026-09-23.py`.
