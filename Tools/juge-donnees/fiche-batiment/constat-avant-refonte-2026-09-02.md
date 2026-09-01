# ② Building Card — pourquoi je ne code pas cette maquette telle quelle

> Constat écrit **avant** d'ouvrir le contrôleur, à partir du rapport du juge données du 2026-08-25
> (`maquette-2026-08-25/rapport.md`) que j'ai re-vérifié aujourd'hui. Le document de lot marque
> déjà cette maquette **« à re-ratifier »** ; ce fichier dit précisément pourquoi, et ce qu'on peut
> livrer sans arbitrage.

## Trois des cinq éléments visibles ne peuvent pas être rendus honnêtement

| ce que la maquette dessine | pourquoi c'est bloqué | ce que le back donne à la place |
|---|---|---|
| **« $ 2 400 » — À collecter** | ⛔ conflit de doctrine. Le montant existe en base mais la projection le rend **en bande**, avec la consigne écrite « jamais les cents bruts (R2.2) ». Et le pool n'existe que sur un `money_holding` — aucun des 4 bâtiments du kit de départ n'en est un (mesuré : bande `NONE` ×4) | `held_band` : NONE / LOW / MODERATE / HIGH / MASSIVE |
| **« 12 % » — Heat local** | ⛔ conflit de doctrine. La valeur est lue par la requête de la fiche puis **bucketée et jetée**, avec la mention « jamais transmise (R2.2) ». 12 % ne sera jamais rendu — il tomberait dans `COLD` | `heat_bucket` : COLD / WARM / HOT / BURNING — mais **sur une autre route** |
| **CTA « COLLECTER »** | ⛔ chaîne morte. La seule route de collecte porte sur un **dealer**, pas un bâtiment, et exige un safehouse possédé — table sans aucun écrivain de production | — |
| **CTA « BLANCHIR »** | ⛔ chaîne morte. Exige le même safehouse ; appelé en direct avec le kit de départ, il rend `RESOURCE_NOT_FOUND` | — |

⇒ **Coder la maquette telle quelle produirait un écran qui affiche deux chiffres inventés et offre
deux gestes qui échouent toujours.** C'est exactement le défaut que ㊲ a payé pendant huit tours de
juge : un écran qui comble un trou plutôt que de le montrer.

## Une boucle fermée, qui mérite d'être vue avant de promettre le heat

`heat_bucket` est déjà projeté et déjà légal — mais par la route de heat du district, pas par la
fiche. Or **pour appeler cette route il faut l'identifiant du district, que la fiche ne projette
pas**. La donnée existe, elle est correcte, et elle est inatteignable depuis cet écran.
★ Une donnée disponible sur une route qu'on ne peut pas atteindre équivaut, pour l'écran, à une
donnée absente — et elle est plus trompeuse, parce qu'elle apparaît « faisable » dans un inventaire.

## Ce qu'on peut livrer SANS arbitrage

Le rapport nomme le seul signal numérique que cette fiche a le droit d'afficher :
**`days_until_maintenance_due`** — un entier signé (négatif = en retard), accompagné de
`lapse_phase_bucket`. Sa propre documentation dit qu'il est « le SEUL signal numérique de
maintenance exposé ». Si l'écran veut un chiffre, c'est celui-là et aucun autre.

⇒ Version livrable sans rien demander à personne : titre, type, **bandes** au lieu des trois
chiffres, l'échéance d'entretien comme unique valeur numérique, et **les CTA réduits à ceux qui
aboutissent**. C'est moins que la maquette dessine ; c'est tout ce qui est vrai aujourd'hui.

## Ce qui demande un arbitrage — et à qui

**À l'user** (c'est du produit, pas de la technique) : la maquette montre des chiffres exacts et
deux actions que le domaine ne permet pas. La re-ratifier suppose de choisir entre
— une fiche en **bandes**, fidèle à la doctrine et pauvre en apparence ;
— ou une fiche qui garde sa forme et attend deux lots back (un pool de collecte atteignable, un
   safehouse écrit par un geste de production).

**Aux lots back**, si la seconde voie est choisie : `heat_bucket` sur la fiche (additif — la donnée
existe déjà, elle est sur la mauvaise route) · un écrivain de production pour `safehouses`, sans
quoi les deux CTA resteront morts quel que soit le travail côté écran.

## Ce que je fais en attendant

Je prépare la version livrable ci-dessus — bandes, échéance, CTA réduits — pour qu'elle soit prête
quel que soit l'arbitrage : elle est le socle commun des deux voies. **Je ne dessine aucun chiffre
que le serveur ne projette pas**, et je ne pose aucun bouton dont je sais qu'il échouera.
