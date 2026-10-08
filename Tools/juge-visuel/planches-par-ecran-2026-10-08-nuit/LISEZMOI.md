# Planches du 08/10 nuit — ④ la file à 2 cartes, ANCRAGE de ce qui est au-dessus (créneau CLIENT-1)

Harnais `PlanchesParEcran`, test `Planche_AccueilFile_DeuxCartes_MesureDuDebordement` seul (par nom), **compte NEUF** sur la pile dev
(`http://localhost`), shell entier, 1080×2400 et 1080×1920. Cumul `dcf6dc9f` + le correctif du harnais commité avec ces planches. Verdicts :
`Tools/preuves/creneau-2026-10-08c/VERDICTS.txt` (run 6, 1/1, VERDICT 0).

Deux variantes, cartes de file FABRIQUÉES (une réplique de lieutenant, une carte de la ville) :
- `A01_AccueilFile2Cartes_*` — « LA SUITE » au-dessus de la ligne, raison courte ;
- `A01_AccueilFile2Cartes_TeteRaisonLongue_*` — une carte de TÊTE fabriquée (celle de E11, NON servie : la carte des rapports) au-dessus, raison longue.

Mesures (`journal.tsv`) : l'écart entre le bas de ce qui est au-dessus et le haut RÉEL de la ligne vaut **0,0250 de la zone sûre** aux deux
résolutions et dans les deux variantes (56,9 u à 2400, 42,7 u à 1920) : la marge du cadre 5 (atelier 5240cec), aucune intersection. La ligne
TIENT (disponible 423,6 u à 2400 et 308,6 u à 1920 ; voulu 208,9 u, puis 249,7 u avec la raison longue) : aux résolutions de jeu elle ne grandit
pas au-delà de sa bande mesurée.

⚠️ À LIRE AVANT DE JUGER la variante `_TeteRaisonLongue` : la CARTE DE TÊTE n'est pas construite sur le cadre 5. C'est l'ancien widget W3U1
(textes de 14 à 18 u, en haut à gauche, hors du bloc). Sa rangée d'actions s'étire sur toute la hauteur de la carte : un grand aplat jaune
(« Lire maintenant », accentGold). Ce défaut est ANTÉRIEUR au retrait de « Laisser en attente » (2b56310b), qui ne faisait que partager cet
aplat avec un bouton gris. C'est le point (3) de f2 (aligner la carte sur le cadre 5 : options = gestes, bloqué par un manque back) : un A
attendu au juge de ④, pas un écart de cette planche. Autre point : la raison longue est coupée à 2 lignes (`maxVisibleLines`), sans « … »
visible.
