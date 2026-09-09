# Addendum ㊲ r14 — B2 : observation exacte, attribution corrigée (f2, 2026-09-07 05:05, TD-659)

- Le r14 mesurait **+678 px d'or étranger dans le panneau d'enseigne, losange posé sur le mot « miroir »** à 1920 sous chrome, et
  l'attribuait au chrome « tombé dans le cadre » après le correctif de placement du r13.
- Cause établie par le correcteur : **le losange est CANONIQUE** (`TopBarController.cs:1182`, relevé sur `hud-topbar-reference-2560.png`)
  — deux juges l'avaient d'ailleurs signalé ABSENT avant qu'il soit construit. **Il n'était pas mal placé : sa place n'était pas
  réservée** — la barre publiait un inset de **0,44** au lieu de **105,17**, donc l'écran ne réservait rien et le losange tombait 49 px sous
  le filet haut (**TD-659**, même famille que l'effondrement du débord `lossyScale`).
- ⇒ *Un juge mesure où l'objet est ; il ne peut pas savoir si c'est l'objet qui a bougé ou la place qui a disparu.* La mesure tient, la
  cause est ailleurs : le finding a mené à la cause par un chemin que personne n'avait prévu. Rien n'est retiré du rapport.
- Pour le r15 (à venir sur ligne GO complète) : B2 attendu FERMÉ (cadre y 166..254, losange à y 228 ⇒ 24 px de garde, sorti du cadre) ;
  **B1 attendu fermé PAR DISPARITION DU CHAMP** — à 1920 le cadre réserve 88 px de plus et le CTA passe sous la ligne de flottaison,
  atteignable par défilement = **régime déclaré par le ruling user « écran 16:9 = rendre l'écran défilable »** : à juger comme un
  régime (vivable ou non), pas comme un défaut à rouvrir ; 2400 = le format visé (losange dégagé, CTA visible, vide du canon sous le
  bouton) ; halo poussé sur `correcteur/ecrans` (Underlay TMP via `fontMaterial`, amplitude 1/2,13, dilatation 0,12, douceur 0,55) —
  critère : plateau et vallée en points, jamais un compte de bandes.
