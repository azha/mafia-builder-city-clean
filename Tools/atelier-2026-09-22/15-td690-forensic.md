# TD-690 — ㊴ Le dossier : les 10 clés `forensic.*` dont le bundle anglais sert du français

> Atelier / DA, 2026-09-23. Classement du back : `_en-egal-fr-classement.txt` (`e75cf69d`, TD-690) — 10 clés `DEFAUT_FR_DANS_EN`. Le fr
> est la valeur servie, recopiée à l'octet ; l'en est la proposition. Aucun placeholder.
> Vérifié : `python3 Tools/atelier-2026-09-22/verifier-en-egal-fr.py <ce fichier> "## TD-690" forensic.`

## TD-690 — les 10 clés

| clé | classe | fr (servi) | en (proposé) |
|---|---|---|---|
| `forensic.bloc.ce_qui_se_voit` | `DEFAUT_FR_DANS_EN` | Ce qui se voit | What shows |
| `forensic.bloc.trois_signaux_trois_bandes` | `DEFAUT_FR_DANS_EN` | TROIS SIGNAUX, TROIS BANDES | THREE SIGNALS, THREE BANDS |
| `forensic.bloc.risque_d_audit` | `DEFAUT_FR_DANS_EN` | RISQUE D'AUDIT | AUDIT RISK |
| `forensic.bloc.visibilite_des_rejets` | `DEFAUT_FR_DANS_EN` | VISIBILITÉ DES REJETS | WASTE VISIBILITY |
| `forensic.bloc.train_de_vie` | `DEFAUT_FR_DANS_EN` | TRAIN DE VIE | LIFESTYLE |
| `forensic.bloc.pas_de_reponse` | `DEFAUT_FR_DANS_EN` | Pas de réponse | No answer |
| `forensic.gravite.rien_ne_depasse` | `DEFAUT_FR_DANS_EN` | Rien ne dépasse | Nothing sticks out |
| `forensic.gravite.on_vous_regarde` | `DEFAUT_FR_DANS_EN` | On vous regarde | You’re being watched |
| `forensic.gravite.ca_se_voit_de_loin` | `DEFAUT_FR_DANS_EN` | Ça se voit de loin | It shows from a distance |
| `forensic.bloc.ce_que_cet_ecran_ne_peut_pas_vous_dire` | `DEFAUT_FR_DANS_EN` | CE QUE CET ÉCRAN NE PEUT PAS VOUS DIRE | RETIRER — orpheline : le titre est devenu « CE QUE LA VILLE NE DIT PAS » (classe B, `ForensicScreenController.cs:176`) ; 0 `Lib(…)` qui le demande dans les deux arbres client |

## La clé qui la remplace — demandée, servie par AUCUN registre

Le client demande `Lib("CE QUE LA VILLE NE DIT PAS")` (`ForensicScreenController.cs:176`, cumul et arbre F), le titre maison ratifié
le 22/09 (`01-classe-B-reecritures.md`). Sa clé n'est ni dans `FR_MESSAGES` ni dans `EN_MESSAGES` à `e75cf69d` : ce n'est pas un défaut
TD-690 (l'instrument « émises vs servies » du back la voit), mais c'est la même passe.

| clé | fr | en |
|---|---|---|
| `forensic.bloc.ce_que_la_ville_ne_dit_pas` | CE QUE LA VILLE NE DIT PAS | WHAT THE CITY DOESN’T SAY |

## Notes

- **Les trois gravités** montent comme en fr : « Nothing sticks out » → « You’re being watched » → « It shows from a distance ». Elles
  s'arrêtent là : les derniers crans de chaque piste sont des événements (`10-…` §8 : « A file is open », « They came », « It jumps out
  at you », « Summons received »).
- **« REJETS »** = ce qui sort des cuves (cadre 131) : *waste*, le mot le plus court qui ne soit pas technique (*effluent*).
- « Ça se voit de loin » garde l'image de la distance, que « Ça saute aux yeux » (`glaring`) pousse d'un cran.
