# Addendum ㊲ r9 — la planche jugée est celle de `main` `76ee3cc` (2026-09-04 11:23), antérieure aux sept correctifs du jour

- Le tour r9 a été lancé dans la NUIT du 2026-09-06 sur les 15 planches de `main` `76ee3cc` — c'était le mandat (« commence par les
  15 planches sur `76ee3cc` »). Sa capture était un LIEN SYMBOLIQUE vers `Assets/Screenshots/screen_b3_reputation_sous_chrome_1080x2400.png`
  du worktree ; le worktree n'a pas bougé depuis (`git diff --stat 76ee3cc HEAD -- Assets/Screenshots` vide), donc ce que le juge a lu
  est bien ce fichier — désormais COPIÉ dans le dossier (`captures-provenance.md`).
- Conséquence (ruling f2, 20:05) : **aucun des 13 constats n'est déclaré faux ; aucun n'est attribuable au code du soir** (sept correctifs
  ㊲ sont passés entre `76ee3cc` et le soir — l'interligne F4, par exemple, est posé depuis 13:22). Ils sont la LIGNE DE BASE de nuit,
  **à rejuger sur une planche fraîche** (recapture ㊲ en seconde passe par Unity), jamais retirés. Les tours r10 et r11 ont, eux, jugé
  les planches de leurs lignes GO (`0da8895`, `3b0ffae`), copiées en fichiers réels.
- Amendement de mandat appliqué au générateur : **les CAPTURES se COPIENT avec leur SHA de commit et leur empreinte ; le lien
  symbolique est interdit pour les captures** (les références canon, qui ne bougent pas, peuvent rester liées).
