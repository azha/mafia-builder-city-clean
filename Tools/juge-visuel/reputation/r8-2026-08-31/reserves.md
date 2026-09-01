# ㊲ LA RÉPUTATION — réserves du juge visuel r8, prêtes à transcrire

> Verdict r8 : **APPROUVÉ SOUS RÉSERVE**. 15 findings (12 `NOUVEAU`), **0 BLOQUANT**, 8 MAJEUR,
> 7 MINEUR. Porte : 2 `EMPÊCHE` (une seule et même cause) · 6 `RAFFINEMENT`.
> Rapport : `Tools/juge-visuel/reputation/r8-2026-08-31/rapport.md` (commit `e391904`).
>
> ⛔ **Les deux `EMPÊCHE` sont LEVÉS** (commit `2af4343`) : ils ne partent pas en dette. Ce document
> ne porte que les `RAFFINEMENT`, c'est-à-dire ce que le juge a explicitement jugé livrable.
>
> Registre cible : `docs_int/tech_debt_inventory.md`, plage **430-439** (libre, vérifié).
> ⚠️ Ce fichier n'est pas dans le worktree `pilote-B` — la transcription revient à la session qui
> tient l'arbre principal. Une entrée par ligne, rien à rédiger.

## Ce qui a été levé, et n'est donc PAS une dette

| finding | ce que le juge a écrit | ce que c'était réellement | levé par |
|---|---|---|---|
| F1 | « la montre porte deux barres horizontales là où la maquette dessine deux aiguilles » | **le gant**, dont les marques de saleté étaient plates au lieu d'obliques (pentes SVG +0,53 / −0,33) | `2af4343` |
| F2 | « son ellipse déborde d'un tiers hors de la silhouette du buste » | **le gant**, dont le liseré à 6,4 mordait le bord d'épaule situé à 6,2 | `2af4343` |

⚠️ **La montre n'était pas en cause : zéro pixel d'or dans la carte du portrait.** En état vierge
`watch = "hidden"`, elle n'est pas rendue — conformément à la maquette. Troisième juge sur quatre à
nommer « montre » ce qui est le gant : deux ellipses claires de taille voisine, aux deux poignets du
même buste, dont une seule est rendue à la fois.

## Les réserves à porter en dette

| id proposé | titre | mesure du juge | instrument | classement |
|---|---|---|---|---|
| TD-430 | La coiffe est une ellipse posée, pas une calotte enveloppante | forme ; la maquette la fait épouser le crâne | `r8/mesures/` | RAFFINEMENT |
| TD-431 | Le visage est 10,8 % trop large | +10,8 % ; rapport interne, invariant d'échelle | `r8/mesures/` | RAFFINEMENT |
| TD-432 | La figure est décentrée de −3,2 px CSS dans sa carte | −3,2 CSS, alors que ses légendes restent centrées | `r8/mesures/` | RAFFINEMENT |
| TD-433 | Les revers du veston ont disparu | absents des deux images à l'état vierge | `r8/mesures/` | RAFFINEMENT |
| TD-434 | Le mou de mise en page s'accumule sous la 4ᵉ carte de règle | cartes −8,9 % de haut ⇒ vide 44,1 → 67,7 CSS (+53 %) | `r8/mesures/` | RAFFINEMENT |
| TD-435 | La légende de la colonne droite passe de 3 à 2 lignes | ARBITRAGE de chasse de police, non tranché | `r8/mesures/` | RAFFINEMENT |

## Ce que le juge n'a pas pu vérifier — à ne PAS porter en dette

Ce ne sont pas des défauts mais des **non-mesures**, et elles ont chacune leur cause :

- **le chrome** (angle mort A4) — et l'arithmétique qu'il signale mérite d'être reprise par qui
  montera le shell : 122 + 462 = 584 px CSS pour un écran 16:9 de 533, soit **51 CSS manquants,
  la hauteur du bouton d'action**. En 20:9 (la cible) ça passe. Trancherait : une capture montée ;
- les traits **« buste incliné »** et **« gants »** : symétriques ou hors cadre à l'état vierge ;
- les états `derive` / `gages` / `wary` / liste pleine (angle mort A5, moitié CONTRAT) : aucune
  image n'existe, la garde `B3S5` n'exerce que le RENDU ;
- la famille de police, non déterminable depuis une image ;
- la translucidité résultante du reflet sur ses deux fonds.

## Honnêteté d'instrument du juge — à conserver avec le rapport

Trois de ses instruments ont **échoué leur contrôle** et leurs chiffres ont été **écartés, pas
publiés** : deux masques attrapaient le texte « SALVATORE » et le fond de carte, et un premier
détecteur de halo mesurait le rééchantillonnage LANCZOS de son propre redimensionnement plutôt que
l'écran. Un finding entier a été retiré pour cette raison.

★ C'est ce qui rend ce verdict opposable : un rapport qui dit ce qu'il a jeté vaut mieux qu'un
rapport qui ne dit que ce qu'il a trouvé.
