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


---

# La série des onze (2026-09-06, après verdict R3)

**Toujours une PROPOSITION.** Rien n'est câblé, rien n'est remplacé. Deux directions sont soumises,
la même série traitée deux fois — planches `serie-11-illustre.png` et `serie-11-posterise.png`.

## Les onze

`COOK · LOGISTICS · DISTRIBUTION · LAUNDERING · SECURITY · BOOKKEEPER · MUSCLE · INTELLIGENCE ·
FACILITY_MANAGER` (les 9 de `FamilleLabels.ArchetypesCanoniques`) + **LE DON** (le joueur, ⑥) +
**UNKNOWN** (silhouette, pas un visage). Graine 41 sur les onze, `fal-ai/flux/dev`, 1024².

**Variété appliquée** (le style était figé, elle ne bouge donc plus qu'une variable) : âges de 20 à 60
ans, quatre origines, corps différents, cinq femmes sur onze — une famille de port des années 2000,
pas onze fois le même homme.

## Deux dispositifs imposés après coup, jamais demandés au modèle

| dispositif | pourquoi | mesure |
|---|---|---|
| **Fond** (`aplat-fond.py`) | le modèle ignore l'hex : fond demandé `#161c2b` (L 27), obtenu L 39 à 231 | les onze rendent **L = 27,8**, identique |
| **Encres** (`posteriser.py`) | il ne postérise pas non plus : « three inks only » donne une illustration ordinaire | 4 encres du canon, seuils par quantiles |

★ **La postérisation corrige aussi ce que le prompt n'a pas obtenu** : les bandes réfléchissantes de
LOGISTICS sont sorties **orange saturé** malgré l'interdiction écrite ; postérisées, elles reviennent
au laiton. Un dispositif imposé après coup rattrape les écarts du modèle ; un prompt les espère.

## Ce que la mesure dit des deux directions (écart au fond à 26 px)

| | COOK | BOOKKEEPER | lecture |
|---|---|---|---|
| illustrée | 12,7 % | 21,6 % | plus douce, plus « peinte » |
| **postérisée** | **30,2 %** | **31,1 %** | deux fois plus de matière à la plus petite taille câblée |

⚠️ **Pondérer les encres vers l'ombre est tentant et coûte l'avantage** : à 0,52/0,28/0,14/0,06 le
portrait est plus canonique de près (moins d'or) et retombe à **12,6 / 14,5 %** — le niveau de
l'illustration. Le défaut du script suit la mesure (quantiles égaux) ; `POIDS_OMBRE` reste disponible
pour trancher autrement en connaissance de cause.

⚠️ **UNKNOWN ne se postérise pas** : seuiller un aplat uni amplifie le bruit de compression et rend
une silhouette **mouchetée** (vu à 26 px). Une silhouette se REMPLIT depuis son matte — 45,6 % d'écart,
3,98:1.

## Défauts restants, nommés

- Le **masque du COOK** est calmé (gris), mais **LOGISTICS** est sortie avec des bandes orange dans la
  version illustrée : cette direction-là demanderait une regénération, la postérisée non.
- Les onze partagent une même lumière et un même cadrage : c'est voulu pour qu'ils s'assoient ensemble
  dans une liste, mais aucun n'a été jugé **sous le chrome réel** (encre crème, laiton) — seulement
  sur l'aplat. C'est la mesure suivante, et elle demande une capture d'écran, donc la porte Unity.


---

## ⚠️ PÉREMPTION — la prémisse d'époque des onze est CHANGÉE (ruling user, 2026-09-06 soir)

**L'ère passe de 1A « contemporain 2000-2010 » à 1B « fin des années 1980 – début des années 1990 »**
(cabines, pagers, béton) — enregistré dans `2026-09-01-reorganisation-production-ecrans.md:61`.
**Et aucun PAYS n'a jamais été décidé** : la mention « port français » qui apparaît dans les prompts de
cette série vient d'une invention relayée dans le mandat, pas d'un arbitrage ; l'arbitrage du 2026-09-02
portait sur la LANGUE. Le cadre est un **port indéterminé**.

⇒ **Les onze portraits ci-dessus sont donc datés d'une ère qui n'est plus la bonne.** Ce n'est pas une
retouche : c'est un tour complet, même graine, même postérisation aux 4 encres, même protocole (jugé à
26 px), en 1B. Ce qui tombe : le bonnet + casque audio d'INTELLIGENCE et la polaire technique de
SECURITY lisent 2010. Ce qui passe sans retouche : le masque à gaz, la casquette plate, le manteau du Don.

**Second axe à trancher dans le même tour, sans mélanger les variables** — l'ère est une contrainte
FIXÉE (elle ne se compare pas), l'identité est la variable. Mesuré sur la planche des onze :
**3 archétypes sur 11 portent un attribut qui dit le métier** (masque à gaz, casque, casquette plate) ;
les huit autres sont des visages. Deux directions à soumettre sur les mêmes trois archétypes :
- **E « emblème »** — chaque archétype construit autour d'UN objet non ambigu (registre, tablier,
  trousseau, sacoche). Hypothèse : la lisibilité à 26 px vient de l'ATTRIBUT, pas de l'époque.
- **N « typé »** — identité forte et assumée, proposée par l'user. Rien ne s'y oppose côté fiction
  puisqu'aucun pays n'est posé.

*Ce paragraphe est écrit pour qu'un lecteur de l'INDEX ne relance pas la série en 1A : la partie
au-dessus reste vraie comme MESURE (les chiffres à 26 px, les dispositifs imposés), et fausse comme
CONSIGNE d'époque.*
