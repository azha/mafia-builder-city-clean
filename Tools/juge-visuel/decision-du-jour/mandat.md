# Mandat pré-rempli — ⑤ Decision Detail — dossier `decision-du-jour`

> Généré par `Tools/juge-visuel/construire-dossiers.py` le 2026-09-03 (§DA-3). Le juge lit ceci, puis
> `.claude/skills/juge-visuel/mandat-juge.md` (dépôt back) qui est LA méthode. Tout ce qui est marqué
> « pré-rempli » vient d'une lecture mécanique (front.md, AppShell.cs, le contrôleur) : à confronter
> à l'image, jamais à croire sur parole.

## L'écran
- **Nom** : Decision Detail (⑤, canon `screen_1a`) — contrôleur `DecisionDetailScreenController`
- **Ce qu'on vient y faire** (pré-rempli, front.md « Montre ») : le détail d'une carte à fort levier, son coût, ses conséquences, Commit / Skip.
- **Chemin joueur pour y arriver** : surimpression depuis la carte de tête (hl_card) de l'Accueil
- **Routes lues dans le contrôleur** : `/v1/flag-review`, `/v1/flag-review/`, `/v1/flag-review/batch-confirm`, `/v1/flag-review/{flagId}/dismiss`, `/v1/flag-review/{flagId}/validate`, `/v1/session/hl-card/`, `/v1/session/hl-card/{cardId}/commit`, `/v1/session/hl-card/{cardId}/skip`, `/v1/session/open` (`Assets/Scripts/Shell/*.cs`)
- **État `front.md`** (en-tête) : —

## Référence (fait autorité : l'IMAGE)
| fichier | rôle | taille px | facteur | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `decision-du-jour/reference-1080x2102.png` | cadre nominal `ecrans-brennar-4.html` #4 rendu | 1080×2102 | ×3.6 | 300 CSS = 1080 px |
| `decision-du-jour/ecran-canon-vide.png` | canon existant (900×1752, ×3) | — | ×3 | 300 CSS = 900 px |
| `decision-du-jour/ecran-canon.png` | canon existant (900×1752, ×3) | — | ×3 | 300 CSS = 900 px |
- **Cadres de la maquette** : `ecrans-brennar-4.html` 4, 5, 6, 7, 8 · `ecrans-brennar-6.html` 4, 5, 6, 7, 8 — atelier `3c02f72`. Cadres d'ÉTATS : les autres numéros du groupe.
- **Attribution cadre ↔ écran** : mesurée. série 4 cadres 4-8 RATIFIÉS par l'user (« ok top on garde comme ça », 2026-08-26)
- ⚠️ La référence fait **1080×2102** (le `.tel` de l'atelier est en 9:17,5) ; la capture fait 1080×2400
  (9:20). On aligne par PARTIES, en % de la largeur — pas par le pixel absolu.
- Polices : le rendu passe par Chrome sur cette machine (`fc-match Georgia` → Noto Serif, `fc-match
  sans-serif` → Noto Sans) ; le client embarque DejaVu. Un écart de FAMILLE est un arbitrage.

## Captures en jeu attendues
- `Assets/Screenshots/decision_du_jour_1080x2400.png` — existe. Une capture est une mesure DATÉE : la reprendre APRÈS
  le dernier correctif, sur `main` du jour, et écrire son SHA ici.

## Ordre de lecture et identité (à écrire par le juge sur la référence SEULE — mandat §0)
- 1ʳᵉ chose que l'œil rencontre : <non pré-rempli : c'est le travail du juge>
- traits d'identité (3 à 5) : <idem>

## Ce que ce dossier ne fournit pas
- aucune capture prise pour ce mandat ; aucun rapport précédent lu ; pas de 2ᵉ résolution.
