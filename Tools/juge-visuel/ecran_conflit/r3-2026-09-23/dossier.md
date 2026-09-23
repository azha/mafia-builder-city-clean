# Dossier du juge visuel — ㉙ Le conflit — r3 — 2026-09-23

## L’écran

- **Nom produit** : ㉙ Le conflit — « la table du fond ».
- **But joueur** : préparer le coup du soir en lisant une phrase simple — qui part, chez quelle
  famille, sur quoi — puis confirmer un envoi irrévocable.
- **Chemin joueur** : Plus → LE CONFLIT.
- **État capturé** : état nominal composé, avec Lt. Kest, La Coil et l’axe « leurs installations ».
  La famille visée est marquée « CE SOIR » et aucune visite antérieure n’est présente.

## Référence — l’image fait autorité

| fichier | rôle | taille | échelle |
|---|---|---:|---:|
| `reference-1080x2102.png` | cadre nominal #59 ratifié, sans l’étiquette d’atelier | 1080×2102 | 300 CSS → 1080 px, ×3,6 |

- Source de lecture seulement :
  `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html`, bloc `.cfl6`, cadre #59.
- Le client embarque DejaVu Sans et DejaVu Serif. La référence demande ces deux familles ; aucune
  substitution Georgia n’intervient dans ce cadre.
- SHA-256 :
  `57b9ccb511bee9de4ab577882fca0933fbee7a2fa17eb41cb18bde9d2446eabf`.

## Captures en jeu

| fichier | rôle | taille | SHA-256 |
|---|---|---:|---|
| `capture-1080x2400.png` | capture principale, portrait 20:9 | 1080×2400 | `099784b0ca44d72e74ce49b02b11c407c4b9020f02684ee6f384bd8b36948685` |
| `capture-1080x1920.png` | seconde hauteur téléphone | 1080×1920 | `4aed3814b904bc6d052ac4350f061e9678f992a8e6ad980db3db79d6f92e9029` |

- Les deux PNG sont rendus dans le **véritable `AppShell`**, avec son bandeau, son manomètre, ses
  insets et son dock, sur un canvas construit nativement à la résolution cible.
- Le contenu de ㉙ garde l’échelle de la série 6 : largeur 300 CSS → 1080 px, ×3,6. Le chrome partagé
  emploie sa propre largeur canonique ; ne pas comparer ses px bruts au contenu `.cfl6`.
- Le test a rendu une donnée déterministe pour obtenir le même état que la référence. Il ne prouve
  donc **aucune valeur de back** ; il prouve seulement la forme, la hiérarchie, le shell et le reflux.
- À 1080×1920, la zone centrale est scrollable : juger comme défaut seulement ce qui est réellement
  coupé par son parent ou inaccessible, pas ce qui continue naturellement sous la fenêtre.

## Doctrine applicable

- Portrait téléphone ; gouttières symétriques ; aucun dessin par-dessus le dock ou le bandeau.
- Français affiché ; aucune clé machine, route ou note de fabrication visible.
- Contraste plancher : 4,5:1 pour le texte courant, 3:1 pour les grands textes et composants.
- Direction : sombre, mafieuse, fin 80s–début 90s ; palette chaude bois/sépia pour le corps, papier
  crème comme élément héros, bande basse bleu nuit, laiton pour la cible et le CTA.
- L’ordre de lecture attendu est : titre d’action → serviette/ordre → quatre familles → réplique et
  CTA. Les choix de formulaire qui produisent l’ordre ne font pas partie du cadre nominal final.

## Écarts assumés à inventorier séparément

| écart | raison | ce qui le ferait sortir de l’assumé |
|---|---|---|
| ARGENT et JOUR portent « — » | capture déterministe sans session de joueur ; le juge ne dispose d’aucune valeur live | un défaut de géométrie ou de lisibilité du chrome lui-même |
| Les ronds du dock sont vides | arbitrage user connu : pas d’icônes | une forme cassée, un débordement ou un libellé illisible |
| Le dock dit FILIÈRE | nom du chrome partagé, hors périmètre de ㉙ | un écart de forme du dock qui contamine le panneau |
| La capture 2400 est plus haute que la référence 2102 | hauteur d’appareil différente ; comparer les parties et les ratios de largeur | une zone non ancrée qui crée un trou incohérent ou masque une partie |
| Données de l’ordre fabriquées | seul moyen local de rendre l’état homologue sans la paire de capture externe ; aucune conclusion de données n’est recevable | une capture live avec provenance d’identité et même état |

## Ce qui n’est pas fourni — ne pas le chercher

- Aucun code Unity (`Assets/Scripts`), aucune note d’implémentation.
- Aucun rapport de juge précédent et aucun texte disant ce qui aurait été corrigé.
- Aucun état « pas de gros bras », « en cours » ou « rentré » : ne pas extrapoler leur conformité.
- Aucune paire T/T+1 s : l’absence ou la présence d’animation n’est pas vérifiable ici.
- Aucune preuve de valeurs back : la capture est explicitement déterministe.

## Sortie demandée

Écrire `rapport.md` et les instruments dans `mesures/`, conformément au mandat. Le rapport doit
commencer par un contrôle positif, juger les deux résolutions, classer chaque écart par perception
joueur, et contenir une section non vérifié explicite.
