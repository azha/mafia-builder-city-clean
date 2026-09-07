# ㉟ La vente — commande de capture

*Écrit par celui qui a construit l'écran, pour celui qui prendra la porte.* La capture n'a
pas eu lieu dans mon créneau : la garde d'identité a refusé faute de
`MAFIA_DEMO_IDENTIFIER`/`MAFIA_DEMO_PASSWORD`, et je ne fais pas circuler la paire.

## Ce qu'il y a à lancer — rien de spécifique à ㉟

㉟ est **déjà** dans la planche des huit écrans (`PlancheEcransCapturePlayModeTests.cs:114`,
sujet `la_vente`, garde `RendusEffectues > 0`). Il n'y a **aucun test à ajouter** et aucune
variable de plus que celles du régime habituel :

    MAFIA_CI_CATEGORIES=PhotoPlanche

Sortie : `Assets/Screenshots/planche_la_semaine_1080x2400.png` — une seule image, huit écrans,
**1080×2400**. Si la planche sort, ㉟ est dedans.

⚠️ Le créneau photographie les huit d'un coup : ce n'est pas une capture pour moi, c'est la
planche de tout le monde. Rien à isoler.

## ⛔ Ce que la planche doit montrer pour que B1 soit fermé

Le juge ⊥ a chiffré B1 « saturation 0,0079 » : `Construire()` ne posait qu'un **aplat**
`surfaceBase` — **zéro** appel `ProceduralUI` sur le châssis. Les quatre appels du rendu des
lignes prouvaient que le mécanisme marchait ; c'est le châssis qui n'en avait aucun.

**Trois choses, et elles se lisent à l'œil sur la vignette — pas besoin d'un instrument :**

1. **UN CERNE** — un filet or fin (1 px à l'échelle, rayon 3) qui suit le bord de l'écran à
   5 px des quatre côtés. C'est lui qui ferme B1 : sa présence prouve qu'un `ProceduralUI` a
   tourné sur le châssis. **S'il n'y a pas de filet, B1 n'est pas fermé**, quoi que dise le
   reste.
2. **UNE ENSEIGNE** — le titre `LES POINTS DE VENTE` avec, dessous, le sous-titre
   *« qui vend, et ce qu'il y a dans la caisse »*. Le sous-titre est **verbatim** : s'il est
   coupé, tronqué, ou remplacé par une clé, c'est un finding.
3. **TROIS COMPTEURS** sur une ligne, sous l'enseigne, de la forme
   `03/6 au travail · 03 caisses pleines · 01 grillés`. ⚠️ Les nombres sont des **comptes de
   lignes visibles**, pas des scalaires servis : R2.2 tient. Et le tiret cadratin `—`
   remplace le nombre quand la donnée manque — **si vous lisez `0`, c'est un défaut** : `0`
   affirme « aucun », `—` dit « on ne sait pas ».

## Ce qui n'est PAS à juger sur cette planche

- **M1 (cadre du bouton en pointillés)** : corrigé en `Image.Type.Tiled`. Visible seulement
  si le bouton est rendu ; s'il ne l'est pas, ce n'est pas un finding de cette planche.
- **B3 (valeurs d'enum en anglais)** : `Caisse()` et `Marge()` rendent maintenant
  VIDE/PEU/MOYENNE/PLEINE/DÉBORDE et AU TARIF/AU-DESSUS/CHER/TRÈS CHER. **« TRÈS CHER » et
  les cinq mots de caisse attendent la ratification de l'atelier** — les lire sur la planche
  ne vaut pas ratification.
- **L'illustration d'état vide** (`vide-vente.png`) n'apparaît QUE si le compte n'a aucun
  point de vente. Sur le compte de capture il en a : **son absence est normale**.

## Si la planche ne sort pas

Le message de refus **nomme sa cause** (identité non exportée, écran non entré, contenu non
rendu). Le recopier tel quel vaut mieux que le reformuler : il cite l'incident qui l'a fait
naître.
