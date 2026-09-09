# Dossier du juge visuel — ÉTATS VIDES (12 images de fall.ia) — mode MAQUETTE — 2026-09-07

> ⚠️ **Ce dossier n'est pas une comparaison capture ↔ maquette** : il n'existe encore AUCUNE capture en jeu de ces états (le client
> affiche aujourd'hui du texte sur du noir). Ce qui est jugé, ce sont **les 12 images elles-mêmes**, comme maquettes du premier écran
> qu'un joueur neuf voit — sur quatre critères mesurables et un critère de SENS. Tu ne corriges rien, tu ne regénères rien.

## Le matériel

12 images générées (fal.ai, campagne « aplat » — postérisation à 3 encres : bleu nuit, ocre, crème ; objet remplissant le cadre,
lumière hors-champ, `--ombre-dominante`), commit `4e6697f` (2026-09-07 00:50, branche `da/portraits-lieutenants`, **non fusionnée
dans `main`** au moment du dossier), copiées ici avec leur empreinte (`captures-provenance.md`). Aides de lecture : `source-generer.py`,
`source-aplat-fond.py` (le procédé, pas une vérité sur l'image — l'IMAGE prime).

| image | écran qu'elle habille | format |
|---|---|---|
| `vide-appro.png` | ㉚ Approvisionnement (ecran_appro) | 1024×1024, RGB, 3 encres postérisées |
| `vide-carnet.png` | ㉞ Le carnet (carnet) | 1024×1024, RGB, 3 encres postérisées |
| `vide-coffre.png` | ⑪ Le coffre (coffre — sans maquette série 6) | 1024×1024, RGB, 3 encres postérisées |
| `vide-conflit.png` | ㉙ Conflit (ecran_conflit) | 1024×1024, RGB, 3 encres postérisées |
| `vide-distribution.png` | ㉘ Distribution (ecran_distribution) | 1024×1024, RGB, 3 encres postérisées |
| `vide-exceptions.png` | ⑨ La file d’exceptions (exceptions) | 1024×1024, RGB, 3 encres postérisées |
| `vide-famille.png` | ⑥ La Famille (famille) | 1024×1024, RGB, 3 encres postérisées |
| `vide-journal.png` | ㊳ Le journal & la rue (screen_c1) | 1024×1024, RGB, 3 encres postérisées |
| `vide-marche.png` | ㉑ Le marché (marche) | 1024×1024, RGB, 3 encres postérisées |
| `vide-recrutement.png` | ⑳ Recrutement (recrutement) | 1024×1024, RGB, 3 encres postérisées |
| `vide-revue.png` | ⑯ La revue du jour (revue-du-jour) | 1024×1024, RGB, 3 encres postérisées |
| `vide-vitrine.png` | La vitrine (la_vitrine) | 1024×1024, RGB, 3 encres postérisées |

## Les critères, dans l'ordre

1. **SENS — ruling user (2026-09-06 soir)** : la règle du non-ramassage est « **ça plafonne et ça BLOQUE, rien n'est jamais perdu** ».
   Un état vide doit se lire « **il n'y a rien ENCORE** », jamais « tu as raté / perdu / tout est fini ». Pour chaque image : écris
   la première chose qu'un joueur lit (l'objet, sa scène), puis cherche activement les **indices de perte ou de punition** — abandon,
   délabrement, casse, poussière, fermeture, rayons dévalisés, chaise renversée, lumière éteinte, décor ruiné — et les **indices
   d'attente** — lampe allumée, objet propre et prêt, place réservée, porte ouverte. Classe : **RIEN ENCORE** (recevable) ·
   **AMBIGU** (les deux lectures possibles — dis laquelle domine et pourquoi) · **PERTE** (défaut de sens = BLOQUANT). Un vide
   « propre » et un vide « ruiné » sont deux images différentes : c'est la distinction à faire.
2. **IDENTITÉ — l'objet dit-il l'écran ?** Nomme l'objet ; dis s'il désigne sans ambiguïté l'écran qu'il habille (une corbeille pour
   la file d'exceptions, des rayons pour la vitrine…). Un objet interchangeable entre deux écrans est un MAJEUR ; un objet qui dit un
   autre écran est un BLOQUANT.
3. **CADRE DE STYLE — ruling user** : sombre, napolitain, mafieux, ère **fin des années 1980 – début 1990**. Un anachronisme
   (objet, matière, typographie postérieurs à ~1995) est un défaut ; une divergence de DIRECTION (autre ambiance également plausible)
   est un ARBITRAGE, pas un défaut — dis lequel.
4. **PALETTE et SÉRIE** : mesure les 3 encres de chaque image (médianes des trois amas de l'histogramme, en RGB) et compare-les
   aux jetons du canon lus dans la source (`/home/erutheone/project/atelier3d-mafia/hud-brennar.html` et `ecrans-brennar-6.html` :
   `--encre`, `--or`, `--creme`, `--laiton`, `--braise`…) ; part d'aire de chaque encre (%). Les 12 doivent se lire comme UNE main :
   écarts de palette entre images ≤ 6/255 par canal par encre, sinon MINEUR ; une encre hors famille (bleu → gris, ocre → jaune) :
   MAJEUR.
5. **RÉSERVE DE LISIBILITÉ** : ces images porteront un texte court (« Il n'y a rien encore… »). Sans savoir où il tombera, mesure
   pour chaque image la **zone calme la plus grande** (fenêtre d'au moins 60 % de largeur × 20 % de hauteur où la luminance est la
   plus uniforme, σ minimale) : sa position, sa luminance médiane, et le **contraste WCAG** qu'y auraient la crème et l'encre bleu
   nuit du canon. En dessous de 4,5:1 pour les DEUX : MAJEUR (aucun texte ne tiendra sans voile).
6. **CADRAGE** : l'image est carrée ; l'écran est un portrait 9:20 (1080×2400) dont le rect libre fait ~1080×1900 sous le chrome.
   Dis ce qu'un recadrage en largeur pleine (1080 px, hauteur ~1080 centrée ou ancrée) coupe de l'objet (perd-il sa tête, sa base ?) —
   estimation géométrique, marquée comme telle.

## Gravité

| classe | critère |
|---|---|
| **BLOQUANT** | lecture de PERTE / punition ; objet qui dit un autre écran |
| **MAJEUR** | lecture AMBIGUË où la perte domine ; objet interchangeable ; anachronisme ; encre hors famille ; aucune zone lisible ≥ 4,5:1 |
| **MINEUR** | palette hors des 6/255 entre images ; cadrage qui coupe un attribut secondaire |
| **ARBITRAGE** | divergence de direction plausible ; choix d'objet entre deux candidats aussi justes |

Ne sois pas sévère : le mandat est global. Une image dont l'objet est juste, la lecture « rien encore » nette et la palette dans
la famille est RECEVABLE même avec un mineur.

## Instruments

PIL seul (`python3 -c "import PIL"`), pas de numpy. Tes scripts dans `mesures/`, chacun imprime la taille des images qu'il ouvre ;
un contrôle positif par instrument (une grandeur dont tu sais qu'elle est égale — la même encre mesurée deux fois, la taille).
Un chiffre non produit par un script est « estimé à l'œil » et va en non vérifié. Tu n'ouvres pas `Assets/Scripts`, ni les autres
dossiers de `Tools/juge-visuel/`.

## Ce qui N'EST PAS fourni

- aucune capture en jeu (les états vides ne sont pas encore intégrés) ; aucun texte ni gabarit de superposition ;
- la doctrine v3.3 « matières » en document (les 12 matières sont dans un autre lot, hors mandat) ;
- les prompts de génération (seul le procédé est copié).

## Forme du rapport — `rapport.md`

```
# Juge visuel ⊥ — États vides (12) — maquette — 2026-09-07
## Verdict global : N recevables / N à reprendre / N arbitrages — une phrase
## Contrôle positif (palette de série, tailles, procédé)
## Par image — table : | id | image | écran | objet lu | SENS (RIEN ENCORE / AMBIGU / PERTE) + indice | identité | style | encres (RGB ×3, % aire) | zone calme + contrastes | cadrage | classe |
## Les 3 images de tête (par impact sur un joueur neuf)
## Série — les 12 se lisent-elles comme une main ? (palette, motif de lampe, échelle de traitement)
## Non vérifié
## Annexes : scripts + sorties
```
Ids `E1…E12` dans l'ordre alphabétique des fichiers ; classe dans une colonne à part (BLOQUANT / MAJEUR / MINEUR / ARBITRAGE / RECEVABLE).
