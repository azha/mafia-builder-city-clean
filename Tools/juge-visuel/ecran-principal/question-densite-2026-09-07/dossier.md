# Dossier — QUESTION DE JUGE : la vue de district de NUIT se perçoit-elle comme une ville DENSE, ou comme un espace VIDE ? — ① — 2026-09-07

> Une question de perception, posée à un juge à contexte vierge, SANS chiffre, SANS soupçon, SANS direction. Tu décris ce que tu vois
> et tu tranches seul ; une autre mesure existe ailleurs, tu ne la connais pas et tu ne la cherches pas. Les deux réponses sont
> recevables — c'est le point.

## Le matériel

- `capture-nuit-1080x1920.png` — la vue de district de NUIT de l'écran ① (`DistrictInteriorScreenController (+ le chrome du shell : bandeau, médaillon, dock)`), 1080×1920, écrite le 2026-09-07 à
  01:17:03 par un run batchmode (commit `3d1c679` — la **première planche de nuit jamais écrite par ce chemin**). Provenance et empreinte :
  `captures-provenance.md`. Le journal du run n'est pas joint (identité non établie ⇒ les valeurs du chrome ne se comparent à rien).
- Aucune référence n'est fournie pour cette question : elle porte sur ce qu'un joueur PERÇOIT de l'image elle-même.

## L'écran, tel que la doctrine le dit (sans plus)

- **But** : l'écran que l'user désigne comme le plus important : voir son quartier vivant, repérer ses bâtiments, en toucher un pour lire ce qu'il vaut (la `.fiche`) et décider quoi en faire (COLLECTER · BLANCHIR · AMÉLIORER). Le bandeau porte l'argent, le manomètre de chaleur, le jour.
- **Chemin joueur** : session réelle → carte de ville → ENTRER dans le district (16) → [pour les captures « fiche »] appui sur le premier bâtiment.
- Le chrome (bandeau haut, dock bas) est celui du shell ; il n'est pas l'objet de la question.

## La question, telle quelle

> *Un joueur qui regarde cette vue de district de nuit la perçoit-il comme une ville DENSE, ou comme un espace VIDE ? Et si quelque
> chose y manque, quoi ?*

Faits de composition, donnés sans indice : la scène comporte un fleuve, des quais et une usine.

## Ce qu'on te demande

1. **Décris la COMPOSITION** avant de juger : ce qui occupe l'espace, ce qui est bâti et ce qui ne l'est pas, où va l'œil (1ʳᵉ, 2ᵉ,
   3ᵉ chose vue, et pourquoi), les masses, les vides, les lignes de fuite, la lumière. Mesure ce qui se mesure (part de l'aire bâtie /
   non bâtie / eau / ciel ; répartition par tiers de l'image ; luminance par zone ; nombre de masses bâties distinctes que tu identifies)
   avec des instruments qui impriment la taille de l'image et portent un contrôle positif — et sépare ce qui est mesuré de ce qui est
   perçu.
2. **Tranche** : DENSE ou VIDE, pour un joueur qui ouvre l'écran pour la première fois — et dis ce qui, dans l'image, fait pencher. Si
   c'est « entre les deux », dis de quel côté et de combien.
3. **Si quelque chose manque, quoi** — nommé par ce que la scène montre déjà (un quai sans bateaux, une rue sans façades, un ciel
   sans skyline…), jamais par ce que tu supposerais du jeu.
4. **Ce que tu n'as PAS pu vérifier**, à part : une seule résolution, une seule vue (pas de déplacement ni de zoom), la nuit seulement,
   pas de référence, pas de jour — et la mesure qui trancherait pour chaque point.

## Ce que tu rends — `rapport.md`

```
# Question de juge — densité perçue de la vue de district de nuit — 2026-09-07
## Réponse en trois lignes (DENSE / VIDE / entre les deux ; ce qui manque, s'il manque quelque chose)
## Composition décrite (masses, vides, ordre de lecture, lumière)
## Mesures (aires par classe, par tiers, luminance, masses bâties distinctes) — avec la méthode et son contrôle positif
## Ce qui fait pencher (perçu, séparé du mesuré)
## Non vérifié
## Annexes : scripts + sorties (mesures/)
```
Un chiffre non produit par un script est « estimé à l'œil » et va en non vérifié.
