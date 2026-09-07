# Addendum ㉟ r1 — routage et table d'assumés de f2 (2026-09-07 ~10:10), consignés tels quels (décisions de f2, pas de l'user ni du juge)

| écart r1 | décision f2 | destinataire |
|---|---|---|
| B1 châssis absent · B2 écran vide à 74 % · B3 « Moderate »/« Standard » · M1 cadre du bouton brisé | écran non construit, pas un polish | **`mafia-unity`** (pas le correcteur, dont la file porte ㊲ et ㊱) |
| R5 « AFFECTER UN DEALER » absent (M2) | **ASSUMÉ** — dépendance BACK : aucune route ne sert la liste des dealers affectables (lot L3) ; *un écran ne peut pas afficher une action que rien ne lui permet de proposer* | back |
| R2 `$ 24 850` / `HEAT` · R3 format monétaire | **la maquette est en retard** (le jeu dit CHALEUR et des euros, fiction tranchée) — même écart sur ㊲ ㊱ ㉟ ⇒ une CLASSE, pas trois instances | blender |
| R4 sérif : chrome couvert par la substitution ; panneau `.vnt6` sans Georgia ⇒ **m3 est un ÉCART** sur le panneau | règle corrigée par f2 : *une excuse globale se vérifie PAR ÉLÉMENT — la substitution ne s'applique qu'aux éléments qui demandaient la police absente* | correcteur (m3) |
| R1 la référence porte un artefact d'animation figé (`.vnt6` 3 `@keyframes`, trait teal figé coupant « Mira ») | **blender la corrige AVANT tout r2** — une cible qui embarque un artefact ne peut pas servir de cible (3ᵉ fois que la référence est en cause : polices, sRGB, ceci) | blender |
| M11 « aucune planque n'existe encore » contre 2 planques d'empreinte | deux DÉCLARATIONS opposées (journal non joint) — **pas monté en écart** ; il faut une recapture AVEC journal pour trancher | r2, avec journal |

Pour le dossier r2 : table d'assumés à porter — (1) « AFFECTER UN DEALER » absent (dépendance back L3, rendu proprement = pas de bouton fantôme ni de libellé de repli) ; (2) les libellés de la maquette en retard (`HEAT`, `$`) ne sont pas des écarts.

## Correction f2 (10:40) — R1 : le ruling « sans animation » était PÉRIMÉ (renversé le soir du 27/08 : « animé le truc »)

L'animation n'est pas un écart ; le rendu figé à t = 0 avec `animation-delay: −2,6 s` (t = 34,7 % du cycle, opacity 0,45, translateY ≈ +62 px)
est le DISPOSITIF qui rend l'animation visible sur une capture (note de l'atelier, verbatim). **Ce qui reste du finding** : le trait coupe la
ligne de « Mira » — *le défaut n'est pas que l'animation traverse du texte, c'est que la CAPTURE le fige dessus* ⇒ correctif décidé : un
`animation-delay` propre à ㉟ pour que t = 0 tombe entre deux rangées (paramètre de CAPTURE, pas d'animation) ; blender vérifie la classe
(9 règles identiques sur ≥ 6 écrans). ㉟ reste NON APPROUVÉ ; B3 déjà fermé par `mafia-unity`, qui a mesuré que le châssis n'est jamais
construit (`ProceduralUI` : 0 appel dans `Construire()`) — la saturation 0,0079 mesurée est exactement celle du jeton de fond.
Règle de f2 : *un ruling cité par l'orchestrateur est une DÉCLARATION, à vérifier comme une clôture de correcteur.*

## Mesures back de f2 (10:55) sur les trois « sans source identifiée » de ㉟

| absence relevée par le juge | mesure back | réparation |
|---|---|---|
| « Brindle » (m7) | **RÉFUTÉ** : `substance: "BRINDLE"`, enum fermée et servie — si l'écran affiche « Brindle », c'est le CLIENT qui met la capitale | client (casse) |
| district (M9) | en base, déjà lu par le domaine de la vente (lane de prix clée par district) ⇒ **forme F**, refermée (`district_name`, sous le nom de fiction) | back, refermé |
| lek (M9) | en base, gate la vente (`lek_score > 0`) ⇒ **forme F**, refermée (`lek_band`) | back, refermé |
| tarif (M9) | ⛔ PAS une forme F : R2.2 interdit le prix brut, `margin_band` en est la projection — mais elle répond à une AUTRE question (palier de la SUBSTANCE, pas ce qu'on gagne ICI) ⇒ **trou d'information RÉEL**, comblé par une bande de PRIX DE LANE commandée | back, commandé |

La route sert 8 clés, le contrôleur n'en ajoute aucune (vérifié par f2) ⇒ l'inventaire de ce que ㉟ peut montrer est fermé. Règle gardée :
*« sans source identifiée » laisse la mesure possible ; « le back ne sert pas » la ferme.* Trois absences semblables, trois réparations différentes.
