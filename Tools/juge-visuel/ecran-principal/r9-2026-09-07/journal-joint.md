# Journal du run de capture — JOINT (fichier `Tools/journal-recapture-district-2026-09-07.md` @ `d5ddc40`, copié tel quel ; écrit par le correcteur — à lire comme une déclaration mesurable, pas comme une prémisse)

# Journal de recapture — planches de district, 2026-09-07

Joint à la planche parce qu'un régime **déclaré** vaut mieux qu'un régime **deviné**, et qu'un
juge a dû fabriquer son propre `journal-declare.txt` faute d'en trouver un dans l'arbre.

## Ce qui a changé, et pourquoi ces planches remplacent les précédentes

`SnapToScreenPixel` arrondissait une position **monde** en croyant arrondir des pixels d'écran
(client `78a90aa`, TD-684). En capture, 1 unité de monde vaut ~192 px : l'arrondi quantifiait
sur une grille de 192.
⇒ **Les planches de district antérieures à `78a90aa` ne sont pas comparables à celles-ci**, et
les verdicts de juge rendus sur des badges de district avant cette date sont des artefacts de
l'instrument, pas des observations.

## Régime, LU dans le journal du run et non supposé

```
[DemoIdentityResolver] régime=défaut identité=operational_demo@example.test
```
⚠️ La planche photographie **`operational_demo`**, PAS le compte de capture gelé — la capture de
district passe par le résolveur du client, elle n'appelle pas `IdentiteDeCaptureOuEchoue`.
★ J'avais d'abord pris l'empreinte de `demo_capture` : **le mauvais compte**. Le journal du run
l'a dit ; je l'ai refaite sur celui qui est réellement photographié. *Une planche ne dit pas
d'elle-même qui elle photographie — mais son journal, si.*

Lancé avec la **seule** paire `MAFIA_CAPTURE_*` (`MAFIA_DEMO_*` retirée par `env -u`), catégorie
`CaptureDistrict` — **jamais `Screenshot`**.

## Empreinte du compte photographié, AVANT et APRÈS la capture

```
# Empreinte — operational_demo@example.test
player_id = 01a01f34-fd4e-7771-83b0-b75efa6e8023
prise le  = 2026-09-07T02:25:09Z (UTC)

horloge_game_minute          77353
buildings                    17
lieutenant                   3
safehouses                   2
highest_leverage_cards       314
autonomy_reports             1
cartes_non_resolues          6
cartes_total                 6

APRÈS :

horloge_game_minute          77353
buildings                    17
lieutenant                   3
safehouses                   2
highest_leverage_cards       314
autonomy_reports             1
cartes_non_resolues          6
cartes_total                 6
```
⇒ **IDENTIQUE hors horodatage : la capture n'a rien muté.**
⚠️ Et « gelé » n'est pas une propriété du compte mais d'une CAMPAGNE : les empreintes du
2026-09-06 montrent +142 min de jeu, +3 bâtiments et +2 cartes entre 06:56 et 20:53, chacune
déclarant pourtant « identique avant et après ». C'est pour ça que celle-ci est jointe.

## Mesure du correctif, dans le run de cette capture

```
39 sites de snap en mode CAMÉRA
   corrigé : médiane 0,48 px · max 0,58
   ANCIEN  : médiane 85,42 px · max 120,15   (calculé À CÔTÉ, même appel, même frame)
capture : passed=1 failed=0 declares=1 comptes=1
```

## Ce que cette planche N'établit PAS

- **Que les badges sont sur les bons bâtiments.** Ça se tranche en confrontant les 51 ancres de
  l'atelier à l'écran, et cette réconciliation appartient à qui tient les ancres — pas à moi.
- **Que la mise en page est conforme.** C'est le juge qui le dit ; mon instrument établit que le
  déplacement de l'instrument a disparu, pas que l'image est juste.
- L'arrondi reste juste **pour le mode actif à l'appel** : snapper en Overlay puis basculer en
  caméra garderait l'arrondi de l'ancien mode. Le remède est de re-snapper après bascule, ce que
  la navigation fait déjà après chaque pan.
