# Conditions notées AVANT le premier run — donc avant d'en connaître le résultat

Écrit le 2026-08-31, éditeur encore verrouillé. **Le point de cette page est sa DATE** : elle
est antérieure au run, donc rien de ce qu'elle dit ne peut avoir été taillé pour l'excuser.

## Deux raisons DISTINCTES pour lesquelles un rouge n'accusera pas le code — ne pas les confondre

1. **Pression machine.** Le plancher E2E de f1 tourne en parallèle et un batchmode Unity
   tourne à côté ; la charge est annoncée à 10-11. Ce dépôt a déjà pris **589 faux rouges**
   pour une régression systémique dans exactement cette situation, et un `ENOBUFS` avait
   produit 23 rouges en cascade depuis **un** spawn raté.
   ⇒ **Aucun rouge ne va au débit du code sans reproduction sur machine calme.**
   ⇒ Et devant un cluster de rouges : **lire l'erreur avant d'accuser** — un `socket hang up`,
   un `ECONNREFUSED` ou un id vide ne sont pas des assertions fausses.

2. **Trois classes qui n'ont jamais tourné.** Ajouter `DemoIdentity` au filtre du juge fait
   entrer `DemoIdentityResolverPlayModeTests` et `DemoIdentityTwoAccountsPlayModeTests`, qui
   ne tournaient sous **aucun** juge. Un rouge venu de là est un **défaut démasqué**, pas une
   régression — la distinction se fait **avant** le premier correctif.

⚠️ **Ces deux raisons ne se recouvrent pas et ne se remplacent pas.** Un rouge peut être
démasqué ET faux ; il peut aussi être démasqué et **vrai**, et c'est le cas qui compte. Écrire
laquelle des deux s'applique, avec sa mesure, avant de toucher une ligne.

## Ce que je note avant de lancer (à remplir au lancement, jamais après)

- heure · charge (`/proc/loadavg`) · `docker ps -q | wc -l` · verrou éditeur détenu ou non
- run **complet d'abord**, jamais scopé — pour ne pas confondre un rouge de contexte avec un
  rouge de code, et parce qu'un filtre de catégorie inexact **exécute un autre jeu et le
  déclare vert**
- après le run : vérifier que **les 23 gardes sont dans le compte**, en les relançant
  **seules par leur nom complet**. Le total ne le dit pas.

## Ce qui n'est PAS une excuse recevable

- « la machine était chargée » sans reproduction sur machine calme → c'est un pari, pas une mesure
- « c'est un défaut démasqué » sans avoir nommé lequel des huit énoncés N1..N8 il réfute
- un vert obtenu en **isolant** ou en **attendant** : demander si le mécanisme a disparu ou
  seulement la fenêtre où le test le voyait
