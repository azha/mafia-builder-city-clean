# ③ Le décor étendu · ④ La référence par écran (2026-09-07)

## ③ Les quatre décors en 1080×2400 — et ce n'est PAS un provisoire

⛔ Le re-rendu 20:9 a été **annulé** après mesure des caméras : à capteur 36 / focale 50 en
`sensor_fit=AUTO`, passer de 1080×1920 à 1080×2400 garde le champ vertical à 39,6° et fait tomber
l'horizontal de 22,9° à **18,4°** — **−20 % de largeur, zéro gain en hauteur**. Gagner de la hauteur
demanderait de reculer la caméra ou d'élargir la focale, donc de re-cadrer chaque scène, et deux n'ont
plus de `.blend`. ⇒ **L'extension est le remède, pas une attente.** *Un dispositif qu'on croit
temporaire meurt de bonne foi.*

**Formats VÉRIFIÉS, pas déduits** : sur les 10 rendus, **4 sont en portrait** (`DISTRICT_D` et
`DISTRICT_ZO`, jour et nuit, 1080×1920) et **6 en paysage** (`DOCKS`, `VERGE`, `VERGE3`, 1728×1080).
Seuls les 4 portraits sont extensibles — un paysage ne devient pas un fond portrait par extension, il
demande un recadrage, donc l'atelier.

**Le geste** : +480 px **EN HAUT uniquement**. Le sol, l'horizon et tout ce qui est ancré au bas ne
bougent pas d'un pixel — même contrainte que le pivot du fond pré-rendu (*un recadrage déplace le pivot
dès qu'il est ancré sur le FICHIER*), respectée par construction.

**Deux gardes, exécutées à chaque appel** : fidélité de la bande d'origine = **0,000** sur les quatre ;
continuité au raccord = **0,00**, avec un contrôle positif (extension par une couleur arbitraire) qui
rend 103 à 211 selon la scène — il rougit, donc la garde voit.

⚠️ **Et un défaut que les deux gardes ne pouvaient pas voir** : répliquer la première ligne telle quelle
donne des **traînées verticales**, parce que sur ces scènes la ligne du haut n'est pas du ciel — des
toits la touchent, et chaque toit se prolonge en colonne jusqu'en haut du cadre. Les gardes étaient
vertes et l'image était fausse. *Une garde de raccord ne dit rien de ce qu'il y a AU-DESSUS du
raccord.* Corrigé : la bande part de la ligne d'origine (raccord exact) et **fond vers la couleur
médiane du ciel** en montant.

## ④ La référence par écran

`planches/reference-par-ecran.png` — pour chacun des 20 écrans qui ont une matière : la **matière**, son
**état vide** quand il existe, l'**encre** qui va dessus (crème `#eae0c8` ou sombre `#241804` selon la
matière) et le **filet laiton** `#b08d3e`. C'est ce qui manquait à la liste de polish : elle dit *quoi
corriger*, pas *à quoi ça doit ressembler*.

Elle sert de cible aux juges et au correcteur, et elle rend visible d'un coup d'œil quels écrans ont
encore un trou : **8 écrans n'ont pas d'état vide** (compression, fiche bâtiment, lieutenant, autonomie,
police, bureau, loi, confié, raser, vente) — non pas parce qu'ils n'en ont pas besoin, mais parce que je
n'en ai produit que douze. C'est la prochaine série si elle est demandée.
