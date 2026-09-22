# ⑥ — constats du r3-2026-09-06 classés pour le r4 : tenu / à rejuger / caduc

Atelier / DA, 2026-09-22. Généré par `Tools/juge-visuel/preparer-r4-famille-r17-miroir-2026-09-22.py` depuis sa table (la seule vérité).
Verdict du tour précédent : **APPROUVÉ (0 bloquant, 0 majeur, 14 mineurs)** — capture : client `77bd229` (planche `famille_1080x2400.png` du commit `4052923`, 06/09).
Arbre de comparaison : `gate/cumul-client-2026-09-22` (`81803f0a`), l'arbre que la recapture doit utiliser (il contient `55e674db`, RECAPTURE §2.6).

## Ce qui a changé depuis la capture du tour précédent

| source | ce qui a changé | effet sur ce tour |
|---|---|---|
| `f1bcd5d3` (22/09) | le dialogue de réaffectation en français (5 lignes) et le cycleur `AND_IF` sans condition dit « aucune » | TEXTE RÉÉCRIT — sous-vues que le r3 n'a pas vues |
| `a3404347` (22/09) | le cadenas des primitives de l'éditeur de règles : « 🔒 palier {n} » / « 🔒 pas encore » | TEXTE RÉÉCRIT — sous-vue que le r3 n'a pas vue |
| `3b92b976` (07/09) | un GLYPHE d'archétype (20 FX, teinte `hudCremeSecondary`) posé en tête de la ligne de pastille de chaque rang de lieutenant, quand le nom est servi (`LieutenantScreenController.cs` `PuceLigne`) | ÉLÉMENT NEUF sur l'organigramme — absent de la référence (rendue le 02/09, 0 occurrence de glyphe dans sa source) |
| `c4fd005e`, `06ef686b` (06/09) | une garde de catalogue (les 5 paliers d'ancienneté demandés) et un commentaire | aucun effet à l'écran |
| `ProceduralUI.cs` (5 commits) | fonctions AJOUTÉES (arc cuit, chemin, dégradés à palier, contraste) ; `Ring` : la rampe 1,5 devient la constante `RampeAntiCrenelagePx = 1.5f` (`5519acb3`), même valeur | aucun effet sur les primitives de ⑥ |
| bundle servi, `famille.*` | back `252a53ab` (06/09) → `4841d7ad` : 0 valeur changée ; 3 clés d'archétype ajoutées (MUSCLE, INTELLIGENCE, FACILITY_MANAGER), absentes de la capture r3 | aucun libellé de l'organigramme ne change |

## Classement

| id | gravité | écart (résumé) | classement | pourquoi |
|---|---|---|---|---|
| `F1` | MINEUR | bord haut du rang du Don gris au lieu d'or | **TENU** | rien n'a touché le rang du Don (pas d'archétype ⇒ pas de glyphe) |
| `F2` | MINEUR | bloc « qui » 19,7 % plus lâche (nom → pastille) | **TENU** | la ligne de pastille garde sa hauteur mini (28 FX) ; le glyphe (20 FX) s'y loge à gauche — à re-constater, pas à re-dériver |
| `F3` | MINEUR | rang du Don : deux lignes 30 % plus serrées | **TENU** | non touché |
| `F4` | MINEUR | halo du médaillon du Don à moins de la moitié | **TENU** | non touché |
| `F5` | MINEUR | ombre portée des rangs à 48 % | **TENU** | non touché |
| `F6` | MINEUR | anneau du bouton retour à −50 % d'énergie | **TENU** | `Ring` : même rampe (1,5), seulement nommée |
| `F7` | MINEUR | disque intérieur des médaillons plus sombre, moins bleu | **TENU** | non touché |
| `F8` | MINEUR | fond de tête en plaque pleine largeur | **TENU** | non touché |
| `F9` | MINEUR | texte de pastille +11,4 % de capitale | **TENU** | le texte de la pastille (`TenureBucketLabel`) n'a changé ni de valeur ni de corps |
| `F10` | MINEUR | rayon des coins des rangs −1,8 CSS | **TENU** | non touché |
| `F11` | MINEUR | haut des cartes plus bleu, liseré plat | **TENU** | non touché |
| `F12` | MINEUR | pointillé des emplacements vides plus clairsemé | **TENU** | non touché |
| `F13` | MINEUR | anneaux de médaillon −11 % d'énergie | **TENU** | `Ring` : même rampe |
| `F14` | MINEUR | rang du Don : « Vous » / « LE DON » au lieu de « Don V. » / « VOUS » (dépend des données) | **TENU** | aucun commit n'a touché ces fentes |

**14 tenus · 0 à rejuger · 0 caduc.** Le texte réécrit ne touche AUCUN constat du r3 : le r3 n'a vu que l'organigramme, et les lots du 22/09 ont réécrit deux sous-vues (réaffectation, éditeur de règles) qu'aucune planche ne montre. Ce que le r4 doit trancher est donc NEUF : le texte des sous-vues (s'il est capturé) et le glyphe d'archétype sur l'organigramme.

## Le texte réécrit à vérifier sur la capture fraîche

| où | texte attendu (fr) | source |
|---|---|---|
| dialogue de réaffectation, chargement | « Le lieutenant arrive… rouvrez « Réaffecter » quand sa fiche est là. » | ④ annexe a, ⑥ `:2862` |
| dialogue de réaffectation, question | « Confirmer la réaffectation ? Son ancienneté repart de zéro, et il lui faudra le temps de s'installer. » | ④ annexe a, ⑥ `:2866` |
| dialogue de réaffectation, ligne 1 | « Installation prévue : {bande} » | ④ annexe a, ⑥ `:2868` |
| dialogue de réaffectation, ligne 2 | « Ancienneté perdue : {bande} » | ④ annexe a, ⑥ `:2870` |
| dialogue de réaffectation, ligne 3 | « Rendement perdu : {bande} » | ④ annexe a, ⑥ `:2871` |
| éditeur de règles, cycleur `AND_IF` vide | « aucune » | ④ annexe a, ⑥ `:3405` |
| éditeur de règles, primitive verrouillée par palier | « {JETON}  🔒 palier {n} » | ④ annexe c3 |
| éditeur de règles, primitive pas dans ce build | « {JETON}  🔒 pas encore » | ④ annexe c3 |
