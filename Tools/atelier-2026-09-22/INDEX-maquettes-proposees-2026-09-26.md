# Maquettes PROPOSÉES du 26/09 — index unique (atelier / DA)

Toutes rendues au créneau navigateur du 26/09 (04:46:02-04:46:12, au signal f2, après le gate). Les PNG sont dans le client, sous
`Tools/juge-visuel/` (commit `08dc967d`) ; les pages sources dans `~/project/atelier3d-mafia` (atelier `2cb375f`).
Statut : **Décidé (reco, 26/09)** = retenu par f2 sous la délégation user du 26/09 (ARBITRAGES D26 : « continue avec les meilleures idées
sans me demander ») ; les mots restent PROPOSÉS jusqu'à leur service par le back.

| écran | cadre | PNG (sous `Tools/juge-visuel/`) | page source | ce que la maquette montre | décision qui l'a retenue | mots |
|---|---|---|---|---|---|---|
| ④ l'Accueil — carte ordinaire (branche A) | 1 | `accueil/maquette-2026-09-23/cadre-1-1080x2102.png` | `ecrans-brennar-accueil.html` #1 | **état cible** du chunk 3 de HL : les deux boutons portent les options servies, la conséquence sous chacun ; « Prendre acte » sort | Décidé (reco, 26/09) — ARBITRAGES **D28** ; en attendant le chunk 3, le client garde Prendre acte / Pas maintenant SANS ligne de conséquence | table **57** |
| ④ l'Accueil — carte des rapports (branche B) | 2 | `accueil/maquette-2026-09-23/cadre-2-1080x2102.png` | `ecrans-brennar-accueil.html` #2 | la conséquence sous chaque bouton, en deux colonnes | Décidé (reco, 26/09) — **D29** | table **57** |
| ③ la Carte — présence du joueur | 0 | `carte/maquette-presence-2026-09-26/cadre-0-1080x2102.png` | `ecrans-brennar-3-presence.html` #0 | les districts où le joueur a des bâtiments : état ratifié `mien` + « 4 BÂTIMENTS » en mots, sans icône ; tours Glass retirées | Décidé (reco, 26/09) — ruling user du 24/09 **D21** | table **58** |
| ③ la Carte — texture | — | *(pas de PNG de juge)* `~/project/atelier3d-mafia/ville-peinte/ville-nuit-2100x3640.png` | `ville-peinte/rendre-ville-peinte.py` | la ville peinte sans les carrés des 3 districts Glass | ruling user du 24/09 **D21** ; copiée par CLIENT-1 | — |
| Navigation — G1 | 0 | `navigation/maquette-2026-09-26/cadre-0-1080x2102.png` | `ecrans-brennar-navigation.html` #0 | la carte, Empire actif : toucher EMPIRE rouvre l'Accueil | Décidé (reco, 26/09) — retenu par f2 tel que proposé | — |
| Navigation — G1 | 1 | `navigation/maquette-2026-09-26/cadre-1-1080x2102.png` | `ecrans-brennar-navigation.html` #1 | l'Accueil rouvert ; le retour système le referme sur la carte (flèche retirée, §C.14) | Décidé (reco, 26/09) | — |
| Navigation — G5, le menu Plus | 2 | `navigation/maquette-2026-09-26/cadre-2-1080x2102.png` | `ecrans-brennar-navigation.html` #2 | 20 entrées en 5 groupes titrés, deux colonnes, sans défiler ; la Filière est au dock (D6) | Décidé (reco, 26/09) — retenu par f2 tel que proposé | table **60** |
| ④ l'Accueil — un joueur neuf sans carte de tête : « la suite » | 4 | `accueil/maquette-2026-09-23/cadre-4-1080x2102.png` | `ecrans-brennar-accueil.html` #4 | au plus 3 prochaines choses, chacune allumée et éteinte sur un état servi, avec son geste. **Page mise à jour le 26/09 (juge ④ r1, F19 et F17 ; PNG pas encore re-rendu)** : ordre réel A · B|C · E · D plafonné à 3 — labo → Commander, vente → Voir la vente, planque → Blanchir (D, « Écrire une règle », tombe au plafond) ; la file porte « légère » en gris chaud | Décidé (reco, 26/09) — commande f2 du 26/09, retenue ; ordre et gris chaud tranchés par f2 le 26/09 | tables **72** et **76** |

## Réserves de relecture (à porter au client, pas à la maquette)
- ③ présence et navigation #0 : le pied de carte hérité de ③·22 ratifié (« Brennar, la nuit — … ») recouvre la rangée du bas (Les Friches,
  La Chancellerie, Pont-Gris). Au client, le pied ne doit couvrir aucun nom.
- ④ #1 : l'étiquette du cadre dit l'état cible ; le client ne montre les conséquences qu'avec les vrais gestes (D28).

## Tables de mots du jour, pour mémoire
57 conséquences ④ · 58 présence ③ · 59 titres au pluriel · 60 menu Plus · 61 règles de maison ㊲ · 62 gestes de vente ㉟ · 63 états vides ·
64 noms figés · 65 calendrier politique ㉞ · 66 chaufferie + éditeur ⑧ · 67 refus · 68 panneau de ③ — toutes PROPOSÉES, sous
`Tools/atelier-2026-09-22/`.
