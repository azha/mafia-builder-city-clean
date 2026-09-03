# Mandat pré-rempli — ④ Home Dashboard — dossier `accueil`

> Généré par `Tools/juge-visuel/construire-dossiers.py` le 2026-09-03 (§DA-3). Le juge lit ceci, puis
> `.claude/skills/juge-visuel/mandat-juge.md` (dépôt back) qui est LA méthode. Tout ce qui est marqué
> « pré-rempli » vient d'une lecture mécanique (front.md, AppShell.cs, le contrôleur) : à confronter
> à l'image, jamais à croire sur parole.

## L'écran
- **Nom** : Home Dashboard (④, canon `screen_1`) — contrôleur `DashboardController`
- **Ce qu'on vient y faire** (pré-rempli, front.md « Montre ») : canon) : `HighestLeverageCard` · `ExceptionQueuePanel` top-3 inline ·
- **Chemin joueur pour y arriver** : surimpression à l'ouverture de session (acquisition), puis Accueil
- **Routes lues dans le contrôleur** : `/v1/economy/wallet`, `/v1/me` (`Assets/Scripts/Operational/Dashboard/*.cs`)
- **État `front.md`** (en-tête) : · l'ouverture de session (décision B)

## Référence (fait autorité : l'IMAGE)
| fichier | rôle | taille px | facteur | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `accueil/reference-1080x2102.png` | cadre nominal `ecrans-brennar-6.html` #20 rendu | 1080×2102 | ×3.6 | 300 CSS = 1080 px |
- **Cadres de la maquette** : `ecrans-brennar-6.html` 20, 21 — atelier `3c02f72`. Cadres d'ÉTATS : les autres numéros du groupe.
- **Attribution cadre ↔ écran** : déduite. cadres 20-21 « Le Bureau » rattachés par le titre seulement — à confirmer
- ⚠️ La référence fait **1080×2102** (le `.tel` de l'atelier est en 9:17,5) ; la capture fait 1080×2400
  (9:20). On aligne par PARTIES, en % de la largeur — pas par le pixel absolu.
- Polices : le rendu passe par Chrome sur cette machine (`fc-match Georgia` → Noto Serif, `fc-match
  sans-serif` → Noto Sans) ; le client embarque DejaVu. Un écart de FAMILLE est un arbitrage.

## Captures en jeu attendues
- `Assets/Screenshots/planche_l_accueil_1080x2400.png` — existe. Une capture est une mesure DATÉE : la reprendre APRÈS
  le dernier correctif, sur `main` du jour, et écrire son SHA ici.

## Ordre de lecture et identité (à écrire par le juge sur la référence SEULE — mandat §0)
- 1ʳᵉ chose que l'œil rencontre : <non pré-rempli : c'est le travail du juge>
- traits d'identité (3 à 5) : <idem>

## Ce que ce dossier ne fournit pas
- aucune capture prise pour ce mandat ; aucun rapport précédent lu ; pas de 2ᵉ résolution.
