# Mandat pré-rempli — ⑩ Exception Detail — dossier `exceptions`

> Généré par `Tools/juge-visuel/construire-dossiers.py` le 2026-09-23 (§DA-3). Le juge lit ceci, puis
> `.claude/skills/juge-visuel/mandat-juge.md` (dépôt back) qui est LA méthode. Tout ce qui est marqué
> « pré-rempli » vient d'une lecture mécanique (front.md, AppShell.cs, le contrôleur) : à confronter
> à l'image, jamais à croire sur parole.

## L'écran
- **Nom** : Exception Detail (⑩, canon `screen_5a`) — contrôleur `ExceptionDetailController`
- **Ce qu'on vient y faire** (pré-rempli, front.md « Montre ») : descripteur, bandes, actions candidates, toggle Add-rule + preview DSL, Escalate, Back.
- **Chemin joueur pour y arriver** : depuis la file : une exception
- **Routes lues dans le contrôleur** : aucune chaîne `/v1/` dans le dossier du contrôleur (les routes vivent dans un client partagé ailleurs — voir juge-donnees) (`../mafia-builder-city-clean/Assets/Scripts/Operational/Exceptions/*.cs`)
- **État `front.md`** (en-tête) : —

## Référence (fait autorité : l'IMAGE)
| fichier | rôle | taille px | facteur | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `exceptions/reference-⑩-1080x2102.png` | cadre nominal `ecrans-brennar-4.html` #15 rendu | 1080×2102 | ×3.6 | 300 CSS = 1080 px |
| `exceptions/ecran-canon-vide.png` | canon existant (900×1752, ×3) | — | ×3 | 300 CSS = 900 px |
| `exceptions/ecran-canon.png` | canon existant (900×1752, ×3) | — | ×3 | 300 CSS = 900 px |
- **Cadres de la maquette** : `ecrans-brennar-4.html` 15 · `ecrans-brennar-6.html` 10 — atelier `9f38a24`. Cadres d'ÉTATS : les autres numéros du groupe.
- **Attribution cadre ↔ écran** : déduite. cadre 15 « Exception — sa main » par le titre
- ⚠️ La référence fait **1080×2102** (le `.tel` de l'atelier est en 9:17,5) ; la capture fait 1080×2400
  (9:20). On aligne par PARTIES, en % de la largeur — pas par le pixel absolu.
- Polices : le rendu passe par Chrome sur cette machine (`fc-match Georgia` → Noto Serif, `fc-match
  sans-serif` → Noto Sans) ; le client embarque DejaVu. Un écart de FAMILLE est un arbitrage.

## Captures en jeu attendues
- `Assets/Screenshots/screen_5a_detail_main-de-cartes_sous_chrome_1080x2400.png` — existe. Une capture est une mesure DATÉE : la reprendre APRÈS
  le dernier correctif, sur `main` du jour, et écrire son SHA ici.

## Ordre de lecture et identité (à écrire par le juge sur la référence SEULE — mandat §0)
- 1ʳᵉ chose que l'œil rencontre : <non pré-rempli : c'est le travail du juge>
- traits d'identité (3 à 5) : <idem>

## Ce que ce dossier ne fournit pas
- aucune capture prise pour ce mandat ; aucun rapport précédent lu ; pas de 2ᵉ résolution.

## Décisions CLIENT, non dessinées par la maquette — à juger EXPLICITEMENT (ajouté le 2026-09-23, CLIENT-2)

La maquette (cadre 15) dessine trois cartes, un talon « +3 » et un tampon ; elle ne dit pas comment on atteint les issues du talon ni où
est l'escalade. La règle de l'orchestrateur (D09) : **aucune route joueur ne doit devenir inatteignable.** Mesuré le 23/09 : ESCALATE
n'est servie en issue que sur 2 cartes sur 6 (chaleur, onboarding), et `lay_low` de la carte de chaleur partait au talon, que rien ne
dépliait.

| décision | lot | ce que fait l'écran | pourquoi | ce qu'il faut regarder |
|---|---|---|---|---|
| **(a) le talon se DÉPLIE au toucher** | ⑩-1b | toucher le talon ouvre une rangée de cartes SOMBRES sous la main : les issues restantes ; le retoucher la replie | D09 : sans lui, les issues hors des trois rôles sont des routes mortes | le talon se lit-il comme touchable ? la rangée dépliée (cartes sombres, sans rôle écrit) se lit-elle comme « les autres issues » et pas comme une seconde main ? |
| **(b) « Escalader » est une carte du talon** quand aucune issue servie ne porte `method ESCALATE` | ⑩-1b | la carte envoie ESCALATE avec l'id suggéré (comme l'ancien bouton) ; elle COMPTE dans le « +N » ; quand une issue servie porte ESCALATE, c'est elle qu'on montre, sans doublon | D09 : l'escalade est une disposition de carte (back `escalate.handler.ts:6-7`), elle doit rester atteignable partout ; on ne change pas la surface de jeu | une carte à une seule issue montre maintenant un talon « +1 » : est-ce lisible ? « Escalader » au milieu des issues servies se distingue-t-elle assez de la famille « risqué » ? |
| **une carte se CHOISIT, le tampon envoie le choix** | ⑩-1b | toucher une carte (rôle ou talon) la choisit ; le tampon affiche et envoie SON libellé (par défaut la suggérée) | sans choix, le tampon n'envoyait que la suggérée : les cartes « risqué » et « lui apprendre » étaient du décor | le choix se voit-il ailleurs que sur le tampon ? (la carte choisie n'est pas marquée : la levée reste à la suggérée, comme le dessin) |
| **« Retour » hors shell seulement** | ⑩-1b | sous shell, pas de bouton : le retour est le geste du shell ; hors shell (montage autonome), le bouton reste, seule sortie autre que la résolution | D09 ; `Back()` reste public (tests) | — |
| **la main se referme sur la résolution** | ⑩-1a `c1e6752c` | plus d'état « Résolu ✓ · Issue : … » sur ⑩ : la main se ferme, ⑨ montre l'après (cadre 17, cachet) | écart D10 : la maquette ne montre pas d'état résolu sur ⑩ | — (parcours ; l'après se juge sur ⑨) |

Falsifiables (EcranFile, `ExceptionsMainAtteignablePlayModeTests`) : chaque issue servie d'une carte part depuis ⑩, comptée sur les
requêtes émises par la couture de résolution (R19, R19bis) ; sur une carte sans issue ESCALATE, la carte « Escalader » envoie ESCALATE
avec l'id suggéré (R19bis) ; ni bouton « Escalate », ni « Retour » sous shell (R19ter).

**Plus de planche « après tampon » pour ⑩ (2026-09-23)** : ⑩ se refermant sur la résolution, l'ancienne
`screen_5a_detail_apres-tampon_sous_chrome_1080x2400.png` est retirée ; l'après se juge sur ⑨
(`screen_5_file_apres-resolution_sous_chrome_1080x2400.png`, voir mandat-⑨). La planche de ⑩ reste `screen_5a_detail_main-de-cartes_…`.
