# Portraits de lieutenants — lot d'essai (2026-09-06)

**Statut : PROPOSITION DE DA, non ratifiée, non câblée.** Rien n'est remplacé dans le client. La
ratification est un geste user ; le câblage viendra après, et par quelqu'un d'autre.

## ⚠️ Ce que ces portraits ne peuvent PAS remplacer — mesuré avant de générer

`ReputationPortrait.cs` (écran ㊲, « le miroir ») **n'est pas un dessin, c'est un instrument** : sa
docstring l'écrit noir sur blanc — *cinq clés du corps de réponse pilotent cinq traits, et AUCUN n'est
décoratif* (`portrait_posture` → inclinaison du buste et direction du regard · `uniform_tells.collar` →
le col · `.sleeves` → les revers · `.watch` → la montre · `.gloves` → les gants, propres ou salis).
Une image fixe par archétype ne peut porter aucun de ces états : il faudrait une image par combinaison.
⇒ **㊲ reste procédural** ; TD-651 (la calotte de cheveux) se corrige dans le dessin, pas par ces images.
Ces portraits servent les emplacements d'**IDENTITÉ** : médaillon de fiche (71 px), rangées
d'organigramme (~40 px), rangées de ㉙ Conflit et ㉘ Distribution (**26 px** — la plus petite taille
mesurée, `AddLayoutElement(portrait, preferredWidth: Px(26f))`).

## L'oracle : 26 px, pas 1024

`Tools/fal/planche-portraits.py` juge chaque image à **71 · 40 · 26 px** et imprime, par portrait, la
luminance du fond, le contraste max/fond et la part de pixels clairs à 26 px. Une image qui ne se
distingue pas de sa voisine à 26 px n'a pas d'identité, quelle que soit sa tenue à 1024.

## Les deux directions soumises à l'arbitrage

| round | prompt | fond (L) | contraste | clairs à 26 px | verdict de la mesure |
|---|---|---|---|---|---|
| **R1** « painted portrait » | `portrait-{cook,muscle,bookkeeper}-e1` | 53 · **91** · 56 | 3,00 · **1,90** · 3,32 | 3,7 · 2,2 · 5,5 % | fonds inégaux (écart 38 L) ⇒ ne s'assoient pas ensemble dans une liste ; MUSCLE disparaît à 26 px ; lumière chaude absente ; photoréalisme étranger aux silhouettes plates du jeu |
| **R2** « flat vector poster » | `portrait-{cook,muscle,bookkeeper}-e2` | 48 · 61 · 39 | 4,02 · 3,33 · 4,92 | 4,6 · 5,0 · 3,4 % | plus graphique, plus sombre, contraste en hausse sur les trois ; fonds encore inégaux (écart 22 L) ; la capuche orange de COOK est le seul élément saturé du lot |

Aucun des deux n'atteint le fond du canon (`hudBg` #161c2b ≈ **L 27**) : le modèle ignore l'hexadécimal
donné en prompt. Si R2 est retenu, le correctif n'est pas un prompt de plus — c'est un **aplat de fond
imposé après coup** (détourage `detourer.py` + fond peint au token exact), qui rend les 11 portraits
uniformes par construction au lieu de l'espérer du modèle.

## Reproductibilité

Tous les prompts sont archivés à côté de leur image (`<slug>-<n>.prompt.txt`), avec le sidecar de
provenance (`<slug>-<n>.fal.json` : modèle, graine, durée, coût, request_id). Modèle `fal-ai/flux/dev`,
graine **41** sur les six, 1024×1024, ~0,025 $ pièce.

| archétype | R1 | R2 |
|---|---|---|
| COOK | `portrait-cook-e1-1.png` | `portrait-cook-e2-1.png` |
| MUSCLE | `portrait-muscle-e1-1.png` | `portrait-muscle-e2-1.png` |
| BOOKKEEPER | `portrait-bookkeeper-e1-1.png` | `portrait-bookkeeper-e2-1.png` |

Reste à produire après arbitrage : `LOGISTICS · DISTRIBUTION · LAUNDERING · SECURITY · INTELLIGENCE ·
FACILITY_MANAGER` (`FamilleLabels.ArchetypesCanoniques`), plus **le Don** (le joueur, « VOUS / LE DON »
sur ⑥) et **UNKNOWN** (silhouette neutre, pas un visage) — 8 images, ~0,20 $, plus les variantes pour
que deux lieutenants du même archétype ne soient pas la même image.
