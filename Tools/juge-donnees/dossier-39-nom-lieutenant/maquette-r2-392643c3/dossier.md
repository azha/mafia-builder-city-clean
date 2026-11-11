# Dossier du juge données — ㊴ Le dossier : piste « train de vie » AVEC le nom du lieutenant — maquette r2 BORNÉ — SHA atelier b2ceebeb

> Gabarit `.claude/skills/juge-donnees/dossier-gabarit.md`. Les cadres neufs ont été livrés par CLIENT-2 (SHA ci-dessous).
> Aucun rapport de juge précédent n'est fourni ni ne doit être cherché.

## Mode : maquette (moment 1 — maquette contre ce que le back renvoie)

## L'écran
- **Nom** : ㊴ Le dossier — « ce qu'ils ont sur vous », vue des pistes, piste « le train de vie »
- **Ce qu'on vient y faire** : voir par où ça fuit (comptabilité · rejets · train de vie) et, pour le train de vie, DE QUI il s'agit (un lieutenant nommé).
- **Domaine présumé** : `services/game-back/src/operational/forensic/` (`forensic.projection.service.ts`, `forensic-lifestyle-lieutenant.ts`), route `GET /v1/me/forensic` — le juge vérifie et complète.

## Maquette (M)

| fichier | rôle |
|---|---|
| `~/project/atelier3d-mafia-c2/ecrans-brennar-6.html` — cadres **152** (piste « le train de vie de Lt. Marrek », nom servi) et **153** (nom NON servi = null, option B) | source HTML/CSS — lis-la ÉPINGLÉE : `git -C ~/project/atelier3d-mafia-c2 show b2ceebeb6ca672f1a367d5e135ddfcc17fbc92d1:ecrans-brennar-6.html` |
| `reference/cadre-152-piste-nommee.png`, `reference/cadre-153-null.png` (1080×2102, ×3,6, rendus depuis ce SHA) | rendus |

- **SHA atelier** : `b2ceebeb6ca672f1a367d5e135ddfcc17fbc92d1`, branche `atelier/client2-q5-apres-2026-10-11`, arbre `~/project/atelier3d-mafia-c2` (propre). Mise à jour b2ceebeb : la ligne `.cle` de la piste du TRAIN DE VIE est SUPPRIMÉE (elle doublait le mot de la bande « On vous regarde ») ; celle des cuves (« Ça se remarque ») reste.
- Contraste / largeur de « On vous regarde » non remesurés (rendu gelé) : ne pas conclure dessus.

## Back (B)
- **Cumul back** : branche `gate/cumul-2026-10-10` @ `7807d6c8` (dépôt ~/project/mafia-clean-city) — B lu dans ce cumul.
- **Stack locale** : NE PAS LA TOUCHER (ruling f2 11/11 : la pile de dev tourne `main`, le gate arrive). **Au moment 1, la colonne B est DÉDUITE du source du cumul `gate/cumul-2026-10-10` @ `7807d6c8`** — à déclarer ainsi dans le rapport. Les corps RÉELS se mesurent au moment 2, après le gate, sur la pile reconstruite (f2 signalera).
- **Compte** : aucun au moment 1 (B déduite) ; au moment 2 : frais, `POST /v1/auth/signup` puis `POST /v1/session/open`.
- **Seed** : au moment 2 seulement ; au moment 1, dire quel état est productible d'après le source (« déduit »).

## Front (F) : sans objet au moment 1.


## Tour BORNÉ — ce que tu vérifies (rien d'autre n'est rouvert)
Au tour précédent la maquette a été jugée non ratifiable ; elle a été corrigée. Tu confrontes la maquette corrigée au back et tu dis, point par point, CORRIGÉ / PARTIEL / NON CORRIGÉ, avec la preuve (cadre + ligne de source). Puis tu signales tout constat NOUVEAU que la correction a introduit.
1. Les deux cadres dessinent la bande `watched`, mais aucun chemin joueur ne crée aujourd'hui de ligne `lifestyle_audit_state` : les étiquettes disent maintenant « productible après le lot back de l'écrivain lifestyle ». Cette déclaration est-elle exacte au regard du source (qui écrit la ligne, qui l'appelle) ?
2. Comptabilité : un seul état « clean » (« rien à signaler », 1 cran vert) ; « pas encore sur la table » n'est plus dessiné. Conforme à `audit_risk_bucket` (clean = « jamais audité » ET « audité propre », non distinguables) ?
3. Plus de valeur brute d'enum à l'écran : la ligne `.cle` des cuves dit « Ça se remarque », celle du train de vie « On vous regarde », la comptabilité clean n'a pas de `.cle`. Vérifier sur les rendus ET la source qu'aucune valeur brute (visible, watched, clean…) ne reste affichée. Le mot de la bande et la `.cle` du train de vie disent tous deux « On vous regarde » (doublon signalé par l'atelier) : (le doublon a été supprimé dans b2ceebeb : constate l'état réel).
4. Compteur « 02/3 pistes chaudes » : dénominateur 3 = 3 pistes ; source ? Le « 00 franchies » est retiré : confirmer qu'il n'en reste aucune trace.
5. La note « Les livres : personne ne regarde par là. » est inchangée : la clé existe-t-elle ou reste-t-elle sans source (le back doit la servir ; ne pas la compter comme défaut atelier si c'est annoncé ainsi) ?
6. Étiquette du 153 : « aucune ligne unique ne porte les trois maxima » : conforme à la règle de choix du lieutenant (null si 0 ou ≥2 lignes aux trois maxima…) ?
7. Les 2 autres pistes (rejets) et la vue acteurs : inchangées côté back.

## Écarts ASSUMÉS — le juge les re-vérifie, il ne les rouvre pas comme défauts
| point | décision f2 |
|---|---|
| écrivain de `lifestyle_audit_state` absent des chemins joueur | lot back confié à BACK-1 ; états 152/153 « productibles après ce lot » |
| clés de note/bandes en clair (B2/B3) | clés servies par BACK-1 ; le client lit par clé — côté client, pas côté maquette |
| noms des cibles (forme F), `status: skipped` | DETTE back, pas maintenant |
| constats C du tour précédent | consignés, ni correctif ni tour |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- les notes d'implémentation ; les rapports de juges précédents (visuels ou données) ; les choix non sourcés ci-dessus.
- le dossier `maquette-9fa533b5/` (tour précédent) : N'Y TOUCHE PAS, ne l'ouvre pas.
