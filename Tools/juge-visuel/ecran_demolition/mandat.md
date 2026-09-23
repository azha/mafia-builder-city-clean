# Mandat pré-rempli — ㉝ Raser un site — dossier `ecran_demolition`

> Généré par `Tools/juge-visuel/construire-dossiers.py` le 2026-09-23 (§DA-3). Le juge lit ceci, puis
> `.claude/skills/juge-visuel/mandat-juge.md` (dépôt back) qui est LA méthode. Tout ce qui est marqué
> « pré-rempli » vient d'une lecture mécanique (front.md, AppShell.cs, le contrôleur) : à confronter
> à l'image, jamais à croire sur parole.

## L'écran
- **Nom** : Raser un site (㉝, canon `sans id canon (écran neuf)`) — contrôleur `DemolitionScreenController`
- **Ce qu'on vient y faire** (pré-rempli, front.md « Montre ») : non fourni (front.md ne porte pas de puce « Montre » pour cet écran)
- **Chemin joueur pour y arriver** : Plus → RASER UN SITE
- **Routes lues dans le contrôleur** : `/v1/city/district/`, `/v1/friction/nodes/`, `/v1/friction/replacement-options`, `/v1/friction/replacement-options/`, `/v1/friction/state`, `/v1/world/districts` (`../mafia-builder-city-clean/Assets/Scripts/Operational/Demolition/*.cs`)
- **État `front.md`** (en-tête) : — « la fiche et la parcelle libérée » · **ÉCRAN NEUF** (2026-08-27)

## Référence (fait autorité : l'IMAGE)
| fichier | rôle | taille px | facteur | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `ecran_demolition/reference-1080x2102.png` | cadre nominal `ecrans-brennar-6.html` #79 rendu | 1080×2102 | ×3.6 | 300 CSS = 1080 px |
- **Cadres de la maquette** : `ecrans-brennar-6.html` 79, 80, 81, 82, 83, 84 — atelier `9f38a24`. Cadres d'ÉTATS : les autres numéros du groupe.
- **Attribution cadre ↔ écran** : mesurée. le contrôleur cite m-79..84. ⛔ NOMINAL CORRIGÉ le 2026-09-07, 80 → 79 : le juge du r1 a mesuré que la CAPTURE montre 79 (« L'organisation frotte ») et non 80 (« Ce bâtiment vous coûte »), prouvé par 4 marqueurs de source dont VOIR CE QUI COÛTE LE PLUS, 1 seule occurrence dans toute la page, en 79. Le dossier faisait donc rendre la mauvaise référence, et la couche globale devenait incomparable (luminance ×8 : la fiche crème de 80, 29,2 % de l'image, absente de 79 — cet écart n'accusait rien). ⇒ Un nominal est l'état que la CAPTURE montre, jamais l'état le plus représentatif du groupe : il se mesure sur la planche, pas se choisit sur la maquette.
- ⚠️ La référence fait **1080×2102** (le `.tel` de l'atelier est en 9:17,5) ; la capture fait 1080×2400
  (9:20). On aligne par PARTIES, en % de la largeur — pas par le pixel absolu.
- Polices : le rendu passe par Chrome sur cette machine (`fc-match Georgia` → Noto Serif, `fc-match
  sans-serif` → Noto Sans) ; le client embarque DejaVu. Un écart de FAMILLE est un arbitrage.

## Captures en jeu attendues
- `Assets/Screenshots/planche_raser_un_site_1080x2400.png` — existe. Une capture est une mesure DATÉE : la reprendre APRÈS
  le dernier correctif, sur `main` du jour, et écrire son SHA ici.

## Ordre de lecture et identité (à écrire par le juge sur la référence SEULE — mandat §0)
- 1ʳᵉ chose que l'œil rencontre : <non pré-rempli : c'est le travail du juge>
- traits d'identité (3 à 5) : <idem>

## Ce que ce dossier ne fournit pas
- aucune capture prise pour ce mandat ; aucun rapport précédent lu ; pas de 2ᵉ résolution.
