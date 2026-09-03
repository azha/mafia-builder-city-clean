# Mandat pré-rempli — ① Intérieur de district — dossier `ecran-principal`

> Généré par `Tools/juge-visuel/construire-dossiers.py` le 2026-09-03 (§DA-3). Le juge lit ceci, puis
> `.claude/skills/juge-visuel/mandat-juge.md` (dépôt back) qui est LA méthode. Tout ce qui est marqué
> « pré-rempli » vient d'une lecture mécanique (front.md, AppShell.cs, le contrôleur) : à confronter
> à l'image, jamais à croire sur parole.

## L'écran
- **Nom** : Intérieur de district (①, canon `sans id canon (écran neuf)`) — contrôleur `DistrictInteriorScreenController`
- **Ce qu'on vient y faire** (pré-rempli, front.md « Montre ») : la ville jouée — grille / socle / brume / hors-district / sol, plus **5 bindings
- **Chemin joueur pour y arriver** : depuis la carte : ENTRER dans le quartier
- **Routes lues dans le contrôleur** : `/v1/auth/signin`, `/v1/auth/signup`, `/v1/city/district/`, `/v1/city/district/{districtId}/heat`, `/v1/world/districts` (`Assets/Scripts/CityMap/*.cs`)
- **État `front.md`** (en-tête) : — *hors canon* · « Le HUD de Brennar »

## Référence (fait autorité : l'IMAGE)
| fichier | rôle | taille px | facteur | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `ecran-principal/ecran-canon.png` | canon existant (900×1752, ×3) | — | ×3 | 300 CSS = 900 px |
- **Cadres de la maquette** : `hud-brennar.html` le HUD de Brennar — atelier `3c02f72`. Cadres d'ÉTATS : les autres numéros du groupe.
- **Attribution cadre ↔ écran** : mesurée. hors canon (front.md ①) ; canon ecran-principal/ecran-canon.png + mesure-canon.txt
- ⚠️ La référence fait **1080×2102** (le `.tel` de l'atelier est en 9:17,5) ; la capture fait 1080×2400
  (9:20). On aligne par PARTIES, en % de la largeur — pas par le pixel absolu.
- Polices : le rendu passe par Chrome sur cette machine (`fc-match Georgia` → Noto Serif, `fc-match
  sans-serif` → Noto Sans) ; le client embarque DejaVu. Un écart de FAMILLE est un arbitrage.

## Captures en jeu attendues
- `Assets/Screenshots/screen_1_district_sous_chrome_1080x2400.png` — existe. Une capture est une mesure DATÉE : la reprendre APRÈS
  le dernier correctif, sur `main` du jour, et écrire son SHA ici.

## Ordre de lecture et identité (à écrire par le juge sur la référence SEULE — mandat §0)
- 1ʳᵉ chose que l'œil rencontre : <non pré-rempli : c'est le travail du juge>
- traits d'identité (3 à 5) : <idem>

## Ce que ce dossier ne fournit pas
- aucune capture prise pour ce mandat ; aucun rapport précédent lu ; pas de 2ᵉ résolution.
