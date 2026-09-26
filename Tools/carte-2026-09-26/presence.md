# ③ la carte — présence du joueur (ruling user du 24/09, ARBITRAGES D21) · 2026-09-26

Ordre de l'orchestrateur (26/09). Maquette PROPOSÉE `~/project/atelier3d-mafia/ecrans-brennar-3-presence.html` (atelier 8616acc,
générateur `mafia-unity-DA/Tools/atelier-2026-09-22/maquette-3-presence-2026-09-26.py`), table 58
(`58-carte-presence-2026-09-26.tsv`, clé `carte.presence.batiments`, ICU `{n, plural, one {# bâtiment} other {# bâtiments}}`).

Câblé (branche `carte/presence-2026-09-26`, depuis le cumul 6bdea032) :
- décompte : `GET /v1/me/buildings` (`MesBatimentsClient`, déjà là), compté par `district_id` côté client
  (`CityMapController.CompterParDistrict`), lu après l'authentification, avant la chaleur ; un échec laisse la carte sans présence ;
- état `mien` ratifié (série 6 `.q.mien`) : nom en or `hudMoneyGold` (#f2c96b), corps ×7,4/6,6 ; sol chaud ;
- le nombre en mots sous le nom (`.nbq` : DejaVu gras, corps 18 = 26 × 4,6/6,6, or, espacement .22em, capitales en style) — valeur
  SERVIE par `Libelle.Gabarit` ; clé non servie ⇒ l'état `mien` SANS le nombre (repli ordonné). Clé en DETTE DATÉE de la garde
  zéro repli jusqu'à ce que le back la serve ;
- le pin « VOUS ÊTES ICI · ⌂ » : n'a jamais existé côté client (0 occurrence) — rien à retirer.

Décidé (reco, 26/09) — réversibles :
- Le « sol chaud » : le sol du district est CUIT dans la texture, le client ne peut pas le repeindre. Il devient un voile radial or
  (`SolMien`, token `hudMoneyGold`, α = `AlphaHaloMax` 0,15) SOUS le halo — le halo garde l'état de contrôle (contrat « la couleur
  porte l'état ») ; aucune couleur neuve (garde Palette).
- Le badge de chaleur descend d'une ligne (18) quand le nombre est affiché, sinon les deux se chevauchent.

Reste (1) la texture sans les carrés peints des districts Glass : après le gate, rendu de l'atelier (`ville-peinte/rendre-ville-peinte.py`),
copie dans `Assets/Resources/CityMap/carte_ville_nuit.png` à dimensions et pivot identiques, 0 `rect.tour` dans les 3 districts Glass.
