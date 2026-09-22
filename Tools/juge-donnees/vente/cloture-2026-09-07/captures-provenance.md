# Provenance des captures — `vente/cloture-2026-09-07/` (dossier de juge-données du 2026-09-07)

> Reconstituée le 2026-09-23 par l'atelier (DA), **rien n'a été re-capturé**. Sources : la table « planches » de `dossier.md` (écrite le
> 07/09, commit `de228fe4`), le corps du commit qui a posé chaque PNG dans `Assets/Screenshots/`, et le journal quand il a été commité.
> **Vérifié, pas recopié** : pour chaque copie, le sha256 complet est recalculé, le préfixe déclaré dans `dossier.md` est comparé, et le blob
> source (`git show <commit>:<chemin> | git lfs smudge`) est haché à son tour — **identique à l'octet** pour toutes les lignes ci-dessous.
> ⚠️ « commit du PNG » ≠ arbre de rendu : aucune de ces campagnes n'a imprimé le SHA de l'arbre qui a rendu.

| capture (copie dans ce dossier) | source | commit du PNG | sha256 (copie = source) | arbre de rendu | identité photographiée | statut de l'identité |
|---|---|---|---|---|---|---|
| `planche-la_vente_1080x2400.png` | `Assets/Screenshots/la_vente_1080x2400.png` | `fd0e21e` (2026-09-06 20:53, « planches : 39 recapturées post-merge ») | `5371053c4796f37757b4e8672158d6e3928b6600d81ca518afb26b1ac71fda3e` | non imprimé | `demo_capture` — déclarée par le commit (empreinte horloge 72155) | **DÉCLARÉE, NON PROUVÉE** |

## ⚠️ Réserve d'identité (même mesure que ㉟, RECAPTURE-2026-09-22 §2.4)

Avant le client `55e674db` (2026-09-22), le shell ne lisait que `MAFIA_DEMO_*` pour signer, et `CapturerLocataire` jetait la paire de
capture qu'il vérifiait. Une campagne « sur demo_capture » a donc photographié `demo_capture` **si** `MAFIA_DEMO_*` pointait ce compte ce
jour-là, et le compte semé `operational_demo` sinon. Sans ligne `[DemoIdentityResolver]` ni `[IDENTITE-CONNECTEE]` jointe, l'identité reste
**DÉCLARÉE, NON PROUVÉE** : la FORME de ces planches se juge, leurs VALEURS ne se comparent à aucun corps.
