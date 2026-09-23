# Mandat pré-rempli — ㉞ Les ordres du soir — dossier `carnet`

> Généré par `Tools/juge-visuel/construire-dossiers.py` le 2026-09-23 (§DA-3). Le juge lit ceci, puis
> `.claude/skills/juge-visuel/mandat-juge.md` (dépôt back) qui est LA méthode. Tout ce qui est marqué
> « pré-rempli » vient d'une lecture mécanique (front.md, AppShell.cs, le contrôleur) : à confronter
> à l'image, jamais à croire sur parole.

## L'écran
- **Nom** : Les ordres du soir (㉞, canon `sans id canon (écran neuf)`) — contrôleur `CarnetScreenController`
- **Ce qu'on vient y faire** (pré-rempli, front.md « Montre ») : non fourni (front.md ne porte pas de puce « Montre » pour cet écran)
- **Chemin joueur pour y arriver** : Plus → LES ORDRES DU SOIR
- **Routes lues dans le contrôleur** : aucune chaîne `/v1/` dans le dossier du contrôleur (les routes vivent dans un client partagé ailleurs — voir juge-donnees) (`Assets/Scripts/Operational/Carnet/*.cs`)
- **État `front.md`** (en-tête) : — « le carnet, la ville, ce qui arrive » · **ÉCRAN NEUF** (2026-08-27)

## Référence (fait autorité : l'IMAGE)
| fichier | rôle | taille px | facteur | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `carnet/reference-1080x2102.png` | cadre nominal `ecrans-brennar-6.html` #85 rendu | 1080×2102 | ×3.6 | 300 CSS = 1080 px |
- **Cadres de la maquette** : `ecrans-brennar-6.html` 85, 86, 87, 88, 89, 90, 91 — atelier `f67ca63`. Cadres d'ÉTATS : les autres numéros du groupe.
- **Attribution cadre ↔ écran** : déduite. cadres 85-91 (ordres du soir, rejouer, ce qui arrive) par le titre. ⛔ PLANCHE RETIRÉE le 2026-09-07 : planche_signer_l_ordre_1080x2400.png NE PHOTOGRAPHIE PAS cet écran. Elle montre une fiche de LIEUTENANT (Lt. Halde, Cuisinier, Au repos, AUTONOMIE / RÉAFFECTER / ÉDITEUR DE RÈGLES, 23 lignes de Diagnostics). Mesuré par le juge du r1, non uniforme donc discriminant : l'aplat crème #efe7d6, élément héros du carnet, couvre 34,361 % de la référence, 0,144 % de la capture — et 0,436 % du canon HUD, un écran SANS carnet, soit 3x plus que la capture. Luminance de contenu 143,0 -> 28,8. Ni doublon d'assemblage (écart minimal 40,2 % avec les 22 autres planches) ni fichier corrompu (sha256 identique au dépôt). ⚠️ ET CE CHAMP PORTAIT DÉJÀ SON PROPRE AVERTISSEMENT — « nom de planche à confirmer » — et un juge a été routé dessus quand même : la mise en garde vivait dans une PROSE que le générateur ne lit pas, et il a émis la planche comme les autres. ⇒ Un champ qui porte son doute dans un commentaire est consommé comme un fait. Le doute doit vivre dans la DONNÉE (ici : chaîne vide), jamais dans la note. ⇒ Deuxième attribution fausse de cette table après planche_le_coffre — et la première invisible à la garde des doublons, puisqu'elle ne concerne qu'UNE ligne : une planche attribuée à un seul écran peut aussi être la mauvaise. À re-remplir par MESURE.
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
