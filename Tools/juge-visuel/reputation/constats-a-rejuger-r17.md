# ㊲ — constats du r16-2026-09-07 classés pour le r17 : tenu / à rejuger / caduc

Atelier / DA, 2026-09-22. Généré par `Tools/juge-visuel/preparer-r4-famille-r17-miroir-2026-09-22.py` depuis sa table (la seule vérité).
Verdict du tour précédent : **NON APPROUVÉ (0 bloquant, 3 majeurs, 8 mineurs)** — capture : client `3465929` (`correcteur/ecrans`, 07/09) ; référence reçue = `reference-1080x2102.png` au commit du rapport `5912525e`.
Arbre de comparaison : `gate/cumul-client-2026-09-22` (`81803f0a`), l'arbre que la recapture doit utiliser (il contient `55e674db`, RECAPTURE §2.6).

## Ce qui a changé depuis la capture du tour précédent

| source | ce qui a changé | effet sur ce tour |
|---|---|---|
| `240bbe34` (22/09) | « Et personne ne jugera votre constance… » (#120) et « On vous dit que … ce n'est pas un choix, c'est ce qui manque encore » (#121) — `ReputationScreenController.cs` | TEXTE RÉÉCRIT — le paragraphe du bloc bas |
| `0d66e2e8` (07/09) | l'ascenseur passe dans la gouttière libre (`CssAscenseurDepuisLeBord = 7`) — « 439 rangées sur l'encre → 0 » | CORRECTIF CLIENT de `M1` |
| `09acbe38` (07/09) | l'état d'erreur : « LE MIROIR N'A PAS RÉPONDU » | hors de l'état nominal capturé |
| `be660caf` (09/09) | chargement explicite (captures indépendantes de l'ordre) | aucun effet à l'écran |
| référence #120 re-rendue (atelier `20d006d`, 22/09) | mesuré contre la référence que le r16 a reçue : chrome « $ 24 850 » → « 24 850,00 € », « tiède / HEAT » → « Tiède / CHALEUR » ; paragraphe bas réécrit et re-coupé ; **le reflet du miroir ne traverse plus la carte portrait** (médiane de la bande y 1000..1200, x 100..460 : 56,3 → 41,4) ; titre, compteurs, carte et tuiles : au pixel près (0,0 et 0,9/255, aucun décalage) | RÉFÉRENCE CHANGÉE |

## Classement

| id | gravité | écart (résumé) | classement | pourquoi |
|---|---|---|---|---|
| `M1` | MAJEUR | à 1920, l'ascenseur posé SUR le contenu | **À REJUGER** | correctif client `0d66e2e8` (gouttière libre) — la planche 1920 le tranche |
| `M2` | MAJEUR | panneau élastique −11,6 %, la carte portrait en sort par le bas | **À REJUGER** | le paragraphe du bloc bas est RÉÉCRIT (`240bbe34`) : son nombre de lignes fixe la hauteur laissée au panneau élastique ; la référence garde 3 lignes, le client peut en rendre un autre nombre |
| `M3` | MAJEUR | le visage déborde de la chevelure | **TENU** | portrait inchangé des deux côtés (`ReputationPortrait.cs` non touché ; référence au pixel près sur la carte) |
| `m1` | MINEUR | col en V +54,4 % d'aire | **TENU** | non touché |
| `m2` | MINEUR | reflet du miroir +68 % et bord à bord | **À REJUGER** | la RÉFÉRENCE a changé : son reflet ne traverse plus la carte (56,3 → 41,4 sur la bande) — l'écart se re-mesure contre #120 re-rendu |
| `m3` | MINEUR | boîte de compteur sans dégradé intérieur | **TENU** | compteurs au pixel près dans la référence ; client non touché |
| `m4` | MINEUR | lueur ambrée sous le rail haut | **TENU** | non touché |
| `m5` | MINEUR | aparté « ce qu'il a absorbé » en 2 lignes au lieu de 3 | **TENU** | texte de l'aparté inchangé des deux côtés |
| `m6` | MINEUR | marges et hors-tout du cadre | **TENU** | non touché |
| `m7` | MINEUR | boîte du CTA 6 px plus basse | **TENU** | non touché |
| `m8` | MINEUR | filet or sous le sous-titre 6 px plus haut | **TENU** | non touché |
| `A3` | ASSUMÉ | le reflet est FIXE, dans le tiers haut | **À RE-VÉRIFIER** | même cause que `m2` : le reflet de la référence a changé |
| `R4` | ARBITRAGE | libellés de la maquette en retard (HEAT, tiède, $ 24 850, JOUR 12) | **CADUC (3 sur 4)** | la référence re-rendue dit « CHALEUR », « Tiède », « 24 850,00 € » ; « JOUR 12 » reste une valeur de maquette |

**8 tenus · 3 à rejuger (M1, M2, m2) · 1 assumé à re-vérifier (A3) · 1 arbitrage caduc aux trois quarts (R4).** Les autres assumés (A1, A2, A4-A10) et arbitrages (R1-R3, R5, R6) tiennent. Le texte réécrit est le paragraphe du bloc bas.

## Le texte réécrit à vérifier sur la capture fraîche

| où | texte attendu (fr) | source |
|---|---|---|
| bloc bas, état vierge (#120) | « … pas parce qu’il est médiocre. Et personne ne jugera votre constance tant qu’il n’a pas assez vu : indéterminé, jamais au milieu d’une jauge. » | ① classe B ; client `240bbe34` ; référence `reference-1080x2102.png` |
| bloc bas, état de dérive (#121) — si le compte du run le sert | « … On vous dit que vous dérivez, jamais sur quelle règle : ce n’est pas un choix, c’est ce qui manque encore. » | ① classe B ; client `240bbe34` ; `reference-derive-1080x2102.png` |
