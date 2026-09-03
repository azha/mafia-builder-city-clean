# Mandat pré-rempli — ⑨ Exception Queue — dossier `exceptions`

> Généré par `Tools/juge-visuel/construire-dossiers.py` le 2026-09-03 (§DA-3). Le juge lit ceci, puis
> `.claude/skills/juge-visuel/mandat-juge.md` (dépôt back) qui est LA méthode. Tout ce qui est marqué
> « pré-rempli » vient d'une lecture mécanique (front.md, AppShell.cs, le contrôleur) : à confronter
> à l'image, jamais à croire sur parole.

## L'écran
- **Nom** : Exception Queue (⑨, canon `screen_5`) — contrôleur `ExceptionQueueController`
- **Ce qu'on vient y faire** (pré-rempli, front.md « Montre ») : la file des exceptions, tri, filtres, swipe, résolution par lot, états riches.
- **Chemin joueur pour y arriver** : Accueil → la file d'exceptions
- **Routes lues dans le contrôleur** : aucune chaîne `/v1/` dans le dossier du contrôleur (les routes vivent dans un client partagé ailleurs — voir juge-donnees) (`Assets/Scripts/Operational/Exceptions/*.cs`)
- **État `front.md`** (en-tête) : ★ *déclencheur de §S6*

## Référence (fait autorité : l'IMAGE)
| fichier | rôle | taille px | facteur | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `exceptions/reference-⑨-1080x2102.png` | cadre nominal `ecrans-brennar-4.html` #14 rendu | 1080×2102 | ×3.6 | 300 CSS = 1080 px |
| `exceptions/ecran-canon-vide.png` | canon existant (900×1752, ×3) | — | ×3 | 300 CSS = 900 px |
| `exceptions/ecran-canon.png` | canon existant (900×1752, ×3) | — | ×3 | 300 CSS = 900 px |
- **Cadres de la maquette** : `ecrans-brennar-4.html` 14, 16, 17, 18 · `ecrans-brennar-6.html` 9, 11, 12, 13 — atelier `3c02f72`. Cadres d'ÉTATS : les autres numéros du groupe.
- **Attribution cadre ↔ écran** : mesurée. le contrôleur cite série 4 cadre 14, ratifié (« ok c'est bien », 2026-08-26)
- ⚠️ La référence fait **1080×2102** (le `.tel` de l'atelier est en 9:17,5) ; la capture fait 1080×2400
  (9:20). On aligne par PARTIES, en % de la largeur — pas par le pixel absolu.
- Polices : le rendu passe par Chrome sur cette machine (`fc-match Georgia` → Noto Serif, `fc-match
  sans-serif` → Noto Sans) ; le client embarque DejaVu. Un écart de FAMILLE est un arbitrage.

## Captures en jeu attendues
- `Assets/Screenshots/screen_5_exceptions_sous_chrome_1080x2400.png` — existe. Une capture est une mesure DATÉE : la reprendre APRÈS
  le dernier correctif, sur `main` du jour, et écrire son SHA ici.

## Ordre de lecture et identité (à écrire par le juge sur la référence SEULE — mandat §0)
- 1ʳᵉ chose que l'œil rencontre : <non pré-rempli : c'est le travail du juge>
- traits d'identité (3 à 5) : <idem>

## Ce que ce dossier ne fournit pas
- aucune capture prise pour ce mandat ; aucun rapport précédent lu ; pas de 2ᵉ résolution.
