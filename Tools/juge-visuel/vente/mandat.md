# Mandat pré-rempli — ㉟ La vente — dossier `vente`

> Généré par `Tools/juge-visuel/construire-dossiers.py` le 2026-09-23 (§DA-3). Le juge lit ceci, puis
> `.claude/skills/juge-visuel/mandat-juge.md` (dépôt back) qui est LA méthode. Tout ce qui est marqué
> « pré-rempli » vient d'une lecture mécanique (front.md, AppShell.cs, le contrôleur) : à confronter
> à l'image, jamais à croire sur parole.

## L'écran
- **Nom** : La vente (㉟, canon `sans id canon (écran neuf)`) — contrôleur `SellingScreenController`
- **Ce qu'on vient y faire** (pré-rempli, front.md « Montre ») : non fourni (front.md ne porte pas de puce « Montre » pour cet écran)
- **Chemin joueur pour y arriver** : Plus → LA VENTE
- **Routes lues dans le contrôleur** : aucune chaîne `/v1/` dans le dossier du contrôleur (les routes vivent dans un client partagé ailleurs — voir juge-donnees) (`../mafia-builder-city-clean/Assets/Scripts/Operational/Selling/*.cs`)
- **État `front.md`** (en-tête) : — « les points de vente » · **ÉCRAN NEUF** (2026-08-27 nuit)

## Référence (fait autorité : l'IMAGE)
| fichier | rôle | taille px | facteur | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `vente/reference-1080x2102.png` | cadre nominal `ecrans-brennar-6.html` #107 rendu | 1080×2102 | ×3.6 | 300 CSS = 1080 px |
- **Cadres de la maquette** : `ecrans-brennar-6.html` 107, 108, 109, 110, 111, 112 — atelier `9f38a24`. Cadres d'ÉTATS : les autres numéros du groupe.
- **Attribution cadre ↔ écran** : mesurée. ⛔ RÉTABLI 107-112 / nominal 107 le 2026-09-22, MESURÉ sur le TEXTE AFFICHÉ (pas sur une classe CSS) : le cadre 107 porte l'étiquette « La vente — qui vend et ce qu'il y a dans la caisse » et dessine les six dealers + « AFFECTER UN DEALER » (c'est l'état nominal) ; 108 est « La caisse de Oskar » (un état) ; 113 est « L'horizon — ce qui s'ouvre et à quel prix » (㊱, déjà dans SA plage 113-118). Le PNG commité `vente/reference-1080x2102.png` EST le cadre 107 (7,1 % d'écart, dû au lot de vocabulaire de l'atelier ; 34,3 % contre 108) — le juge r1 a comparé au bon cadre. La « correction » du 2026-09-07 (107-112 -> 108-113, « #107 appartient à ㉗ : ses 47 occurrences de `vnt6` sont le bloc <style> ») déduisait l'appartenance d'un cadre de l'endroit où sa CSS est déclarée : le segment de 107 CONTIENT le <style> de la rangée ET son contenu — une déclaration dense n'exclut pas l'usage, elle le précède. ⇒ 5e mécanisme d'attribution fausse : corriger une table sur un compte de classe CSS sans relire le cadre. dealers en prénoms servis (§DA-2)
- ⚠️ La référence fait **1080×2102** (le `.tel` de l'atelier est en 9:17,5) ; la capture fait 1080×2400
  (9:20). On aligne par PARTIES, en % de la largeur — pas par le pixel absolu.
- Polices : le rendu passe par Chrome sur cette machine (`fc-match Georgia` → Noto Serif, `fc-match
  sans-serif` → Noto Sans) ; le client embarque DejaVu. Un écart de FAMILLE est un arbitrage.

## Captures en jeu attendues
- `Assets/Screenshots/planche_la_vente_1080x2400.png` — existe. Une capture est une mesure DATÉE : la reprendre APRÈS
  le dernier correctif, sur `main` du jour, et écrire son SHA ici.

## Ordre de lecture et identité (à écrire par le juge sur la référence SEULE — mandat §0)
- 1ʳᵉ chose que l'œil rencontre : <non pré-rempli : c'est le travail du juge>
- traits d'identité (3 à 5) : <idem>

## Ce que ce dossier ne fournit pas
- aucune capture prise pour ce mandat ; aucun rapport précédent lu ; pas de 2ᵉ résolution.
