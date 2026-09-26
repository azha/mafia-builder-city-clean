# Clés i18n NEUVES — C8, ㉞ « Ce qui arrive » (CLIENT-2, 2026-09-26)

Toutes NON servies à la tête back `5e792a3c`. Le français est le REPLI du client ; mots définitifs et anglais : l'atelier, via f2.
Inscrites à `ZeroRepliDesLocatairesPlayModeTests.DetteDatee` (règle 2 : retirées dès qu'elles sont servies).
Cadre de référence : maquette m-91 (`ecrans-brennar-6.html` #91) — « Ce qui arrive », état « en cours » / « annoncé », AUCUNE date.

| clé | repli fr du client | où |
|---|---|---|
| `carnet.bloc.ce_qui_arrive` | CE QUI ARRIVE | surtitre du panneau (le sous-titre reprend la clé servie `carnet.bloc.ce_que_la_ville_prepare`) |
| `carnet.bloc.en_cours` | en cours | après le nom d'un événement actif |
| `carnet.bloc.annonce` | annoncé | après le nom d'un événement à venir |
| `carnet.bloc.rien_n_est_annonce` | Rien n’est annoncé. | calendrier servi, vide |
| `carnet.bloc.le_calendrier_n_a_pas_repondu` | Le calendrier n’a pas répondu. | la route n'a pas répondu |
| `politique.evenement.e_pol_01` … `e_pol_12` | le `name` servi (anglais, K2) | le nom de l'événement, keyé par `eventId` (`Libelle.ParValeur`) — 12 ids du catalogue `operational/political/*` |

Orphelines (servies, plus demandées) : `carnet.bloc.ce_que_la_ville_ne_dit_pas`,
`carnet.bloc.ce_que_la_ville_prepare_personne_ne_vous_le_rapporte_encore_ce_sera_ici_le_jour_ou_quelqu_un_le_fera` — elles RESTENT au
servi (contrat additif, f2 26/09 : on n'enlève ni ne renomme une clé servie) ; sans consommateur, le juge des données les verra.
