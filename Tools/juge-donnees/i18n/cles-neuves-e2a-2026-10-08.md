# Clés i18n NEUVES — E2a, ⑲ « Mouvement réduit » (CLIENT-3, 2026-10-08)

Non servie à la tête mesurée (`string_table-83b4f291.ts`, aucune clé `reglages.bloc.mouvement*`). Le français est le REPLI du client.
Inscrite à `ZeroRepliDesLocatairesPlayModeTests.DetteDatee` (règle 2 : retirée dès qu'elle est servie).

| clé | repli fr du client | où |
|---|---|---|
| `reglages.bloc.mouvement_reduit` | Mouvement réduit | libellé de la bascule du tiroir « Le jeu » de ⑲ (`SettingsScreenController`) |

Source du mot : le canon, `screen_14_settings.md:208` (`settings.a11y.reduced_motion` · « Reduced motion » · « Mouvement réduit »).
La clé du canon (`settings.a11y.reduced_motion`) n'est PAS celle du client : ⑲ dérive ses clés de ses littéraux (`reglages.bloc.<slug>`,
`Libelle.De`) — convention du fichier, aucune clé existante renommée. Pas de sous-ligne (le canon n'en a pas).
