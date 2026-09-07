# Addendum états vides — la « réserve de texte 614×204 » n'est pas un objet du client (f2, 2026-09-07 ~08:05)

Mesuré par f2 par trois chemins indépendants : (1) « 614 » et « 204 » ⇒ 0 occurrence dans `Tools/` et `Assets/Scripts/` ; (2) le helper
`Texte(…)` pose `enableWordWrapping = false` et un `LayoutElement` vide — largeur héritée du `VerticalLayoutGroup`, hauteur = UNE ligne,
toujours ; (3) 204 px à `Px(11f)` ≈ dix lignes, il n'y en aura jamais qu'une. ⇒ **La réserve n'est pas une région : c'est une ligne de
texte de corps 11.** Le finding qui la mesure porte sur une IMAGE d'atelier, pas sur un écran du jeu.

Et le contraste « sous 4,5:1 » : `mafia-unity` a balayé la classe — **zéro contrôleur ne monte d'illustration d'état vide**
(`Resources.Load<Sprite>` = 4 dans tout `Assets/Scripts` : deux bustes, la peinture de la carte, un seam d'icônes) ; les 22 images de
l'atelier sont sous `Tools/`, 0 sous `Assets/`. ⇒ Il n'y a rien derrière le texte, sur aucun écran : **propriété d'un asset non monté,
sans destinataire tant que le montage n'existe pas** — pas un finding d'écran.

Règle retenue (troisième cas de la nuit, avec le district déformé et le compte gelé qui dérive) : *une grandeur exacte rapportée à un objet
qui n'est pas celui du client*. La parade est en amont du juge : l'orchestrateur dit à quel objet du CLIENT une région d'image correspond
avant qu'elle soit mesurée ; quand il ne peut pas, la classe est « non vérifiable — objet non identifié », jamais un écart.
