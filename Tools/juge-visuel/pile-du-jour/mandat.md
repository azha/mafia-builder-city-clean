# Mandat pré-rempli — ⑬ Cue Stack — dossier `pile-du-jour`

> Généré par `Tools/juge-visuel/construire-dossiers.py` le 2026-09-03 (§DA-3). Le juge lit ceci, puis
> `.claude/skills/juge-visuel/mandat-juge.md` (dépôt back) qui est LA méthode. Tout ce qui est marqué
> « pré-rempli » vient d'une lecture mécanique (front.md, AppShell.cs, le contrôleur) : à confronter
> à l'image, jamais à croire sur parole.

## L'écran
- **Nom** : Cue Stack (⑬, canon `screen_8`) — contrôleur `CueStack (sections)`
- **Ce qu'on vient y faire** (pré-rempli, front.md « Montre ») : la pile de slots, réordonnancement, commit, séquences nommées.
- **Chemin joueur pour y arriver** : depuis une exception résolue
- **Routes lues dans le contrôleur** : aucune chaîne `/v1/` dans le dossier du contrôleur (les routes vivent dans un client partagé ailleurs — voir juge-donnees)
- **État `front.md`** (en-tête) : — ✅ **surface back COMPLÈTE**

## Référence (fait autorité : l'IMAGE)
| fichier | rôle | taille px | facteur | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `pile-du-jour/reference-1080x2102.png` | cadre nominal `ecrans-brennar-4.html` #19 rendu | 1080×2102 | ×3.6 | 300 CSS = 1080 px |
| `pile-du-jour/ecran-canon-vide.png` | canon existant (900×1752, ×3) | — | ×3 | 300 CSS = 900 px |
| `pile-du-jour/ecran-canon.png` | canon existant (900×1752, ×3) | — | ×3 | 300 CSS = 900 px |
- **Cadres de la maquette** : `ecrans-brennar-4.html` 19, 20, 21, 22, 23, 24 — atelier `3c02f72`. Cadres d'ÉTATS : les autres numéros du groupe.
- **Attribution cadre ↔ écran** : déduite. série 4 cadres 19-24 « Pile du jour » ; canon pile-du-jour/v4-19..24.png
- ⚠️ La référence fait **1080×2102** (le `.tel` de l'atelier est en 9:17,5) ; la capture fait 1080×2400
  (9:20). On aligne par PARTIES, en % de la largeur — pas par le pixel absolu.
- Polices : le rendu passe par Chrome sur cette machine (`fc-match Georgia` → Noto Serif, `fc-match
  sans-serif` → Noto Sans) ; le client embarque DejaVu. Un écart de FAMILLE est un arbitrage.

## Captures en jeu attendues
- `Assets/Screenshots/—` — ABSENTE — à capturer. Une capture est une mesure DATÉE : la reprendre APRÈS
  le dernier correctif, sur `main` du jour, et écrire son SHA ici.

## Ordre de lecture et identité (à écrire par le juge sur la référence SEULE — mandat §0)
- 1ʳᵉ chose que l'œil rencontre : <non pré-rempli : c'est le travail du juge>
- traits d'identité (3 à 5) : <idem>

## Ce que ce dossier ne fournit pas
- aucune capture prise pour ce mandat ; aucun rapport précédent lu ; pas de 2ᵉ résolution.
