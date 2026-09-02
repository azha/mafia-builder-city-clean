# 42 `screen_b7` — les clés `forensic.*` (item 0.6)

> `12` clés générées depuis le code. **`en` = le littéral EXACT**, en additif.

## ⛔ Ce qui ne doit pas devenir une clé

**La bande INCONNUE.** `Phrase()` rend le mot du serveur tel quel quand il ne le reconnaît pas.
Le keyer inverserait le choix : le joueur verrait une paraphrase rassurante à la place du mot
réellement envoyé. ★ Sur cet écran, montrer un mot non traduit est une INFORMATION, pas un
manque — c'est ainsi qu'on apprend que le serveur a inventé une valeur.

| clé | `en` attendu (byte-identique) |
|---|---|
| `forensic.bloc.ce_que_cet_ecran_ne_peut_pas_vous_dire` | `CE QUE CET ÉCRAN NE PEUT PAS VOUS DIRE` |
| `forensic.bloc.ce_que_le_serveur_envoie_vraiment` | `CE QUE LE SERVEUR ENVOIE VRAIMENT` |
| `forensic.bloc.ce_qui_se_voit` | `Ce qui se voit` |
| `forensic.bloc.pas_de_reponse` | `Pas de réponse` |
| `forensic.bloc.risque_d_audit` | `RISQUE D'AUDIT` |
| `forensic.bloc.train_de_vie` | `TRAIN DE VIE` |
| `forensic.bloc.trois_signaux_trois_bandes` | `TROIS SIGNAUX, TROIS BANDES` |
| `forensic.bloc.une_bande_sans_source_ressemble_a_une_bande_mesuree` | `Une bande sans source ressemble à une bande mesurée` |
| `forensic.bloc.visibilite_des_rejets` | `VISIBILITÉ DES REJETS` |
| `forensic.gravite.ca_se_voit_de_loin` | `Ça se voit de loin` |
| `forensic.gravite.on_vous_regarde` | `On vous regarde` |
| `forensic.gravite.rien_ne_depasse` | `Rien ne dépasse` |
