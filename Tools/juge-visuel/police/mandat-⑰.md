# Mandat pré-rempli — ⑰ Precinct View — dossier `police`

> Généré par `Tools/juge-visuel/construire-dossiers.py` le 2026-09-23 (§DA-3). Le juge lit ceci, puis
> `.claude/skills/juge-visuel/mandat-juge.md` (dépôt back) qui est LA méthode. Tout ce qui est marqué
> « pré-rempli » vient d'une lecture mécanique (front.md, AppShell.cs, le contrôleur) : à confronter
> à l'image, jamais à croire sur parole.

## L'écran
- **Nom** : Precinct View (⑰, canon `screen_9`) — contrôleur `PrecinctScreenController`
- **Ce qu'on vient y faire** (pré-rempli, front.md « Montre ») : la mémoire du precinct, l'achat de renseignement, le recrutement de clerc.
- **Chemin joueur pour y arriver** : Plus → LE COMMISSARIAT
- **Routes lues dans le contrôleur** : aucune chaîne `/v1/` dans le dossier du contrôleur (les routes vivent dans un client partagé ailleurs — voir juge-donnees) (`../mafia-builder-city-clean/Assets/Scripts/CitySim/Precinct/*.cs`)
- **État `front.md`** (en-tête) : —

## Référence (fait autorité : l'IMAGE)
| fichier | rôle | taille px | facteur | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `police/reference-⑰-1080x2102.png` | cadre nominal `ecrans-brennar-6.html` #31 rendu | 1080×2102 | ×3.6 | 300 CSS = 1080 px |
| `police/commissariat-canon.png` | canon existant (900×1752, ×3) | — | ×3 | 300 CSS = 900 px |
| `police/inspections-canon.png` | canon existant (900×1752, ×3) | — | ×3 | 300 CSS = 900 px |
- **Cadres de la maquette** : `ecrans-brennar-6.html` 31, 32, 33, 34, 35 — atelier `bd6c3be`. Cadres d'ÉTATS : les autres numéros du groupe.
- **Attribution cadre ↔ écran** : déduite. partage les cadres 31-35 avec ⑮ ; canon police/commissariat-canon.png. ⛔ NOMINAUX ÉCHANGÉS le 2026-09-07 : ⑮ portait 31 et ⑰ portait 32, c'était l'INVERSE. Établi à la source par le juge du r1 puis re-vérifié dans ecrans-brennar-6.html : le cadre 31 parle de « précinct » et porte belief + patrol_heat PAR PRÉCINCT (⑰), le cadre 32 de « dispatch / registre » (⑮) ; 34 et 35 « précinct » aussi. Confirmé par la luminance : contenu 15,5 capture / 22,7 canon série 2 / 141,2 cadre 31 — l'écart vers le canon est 17x plus petit. ⇒ Les DEUX dossiers faisaient rendre la référence de l'autre. ⇒ 3e attribution fausse de cette table (coffre, carnet, police) et TROIS MÉCANISMES DIFFÉRENTS : doublon, planche d'un autre écran, cadres croisés. Une table écrite à la main depuis des preuves n'a jamais été confrontée à sa source ligne par ligne. 
- ⚠️ La référence fait **1080×2102** (le `.tel` de l'atelier est en 9:17,5) ; la capture fait 1080×2400
  (9:20). On aligne par PARTIES, en % de la largeur — pas par le pixel absolu.
- Polices : le rendu passe par Chrome sur cette machine (`fc-match Georgia` → Noto Serif, `fc-match
  sans-serif` → Noto Sans) ; le client embarque DejaVu. Un écart de FAMILLE est un arbitrage.

## Captures en jeu attendues
- `Assets/Screenshots/planche_le_commissariat_1080x2400.png` — existe. Une capture est une mesure DATÉE : la reprendre APRÈS
  le dernier correctif, sur `main` du jour, et écrire son SHA ici.

## Ordre de lecture et identité (à écrire par le juge sur la référence SEULE — mandat §0)
- 1ʳᵉ chose que l'œil rencontre : <non pré-rempli : c'est le travail du juge>
- traits d'identité (3 à 5) : <idem>

## Ce que ce dossier ne fournit pas
- aucune capture prise pour ce mandat ; aucun rapport précédent lu ; pas de 2ᵉ résolution.
