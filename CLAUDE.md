# mafia-builder-city-clean — client Unity (socle court)

Socle complet : `~/project/mafia-clean-city/CLAUDE.md` (§1 régime, §3 règles vitales V1-V21). **Ici,
seulement ce qui s'applique aux sessions CLIENT** ; les autres pièges (police réelle de la référence par `fc-match`, boîte plus grande que son encre, parent commun
d'un espacement, domaine d'un `Max`…) : `docs/socle/lecons-unity.md` du back.

## Porte Unity — un seul pilote à la fois

`~/project/mafia-clean-city/scripts/creneau-unity.sh queue <session>`, puis `take`, `release`,
`status`. Le découpage par fichiers **ne protège pas** d'un runtime partagé : une recompilation tue
le run du voisin. **Un éditeur ouvert à la main bloque `take` sans prendre la porte.**

## Typechecker sans brûler la porte

`python3 Tools/typecheck-hors-porte.py --tout` (17 assemblies, 20 s) · `--frais <Assembly>` une fois par
assembly modifiée, dans l'ordre · `--controle <fichier>` injecte une faute qui DOIT rougir.
**`--controle` n'est pas optionnel** : un compilateur qui n'a rien vu rend `EXIT=0` comme un compilateur
satisfait. `.csproj` et DLL sœurs sont **datés** : un symbole supprimé y survit, le vert
ment. ⇒ Ça typecheck, rien de plus.

## Fin d'écran — deux juges ⊥ à contexte vierge

Skills **`juge-visuel`** puis **`juge-donnees`**, chacun par un agent **NEUF** : jamais celui qui a
construit, jamais un juge précédent de cet écran. Les deux rapports sont cités au commit de clôture.
**Écarts (ruling user 07/10)** : **A/B** = ce qu'un joueur perçoit (fond, matière, élément absent,
texte, geste, lisibilité) ⇒ corrigés **fidèlement** ; **C** = pixel ou nuance ⇒ **consignés, ni
correctif ni tour de juge**. Un juge APPROUVE un écran sans A/B.

## Gardes — structurelles AVANT les gardes de valeur

Seules celles-là ont fermé des classes ici : tout `Graphic` sous un `Mask` est un `MaskableGraphic` ·
tout `Graphic` porte son `CanvasRenderer` (`AddComponent` à l'exécution n'honore pas
`[RequireComponent]` ; sans lui, rien ne dessine et la console est muette) · l'ordre de fratrie.
⇒ **Une garde sur les PARAMÈTRES d'un effet n'est pas une garde sur son EFFET** : rendre et compter les
pixels — un réglage valide et non nul peut ne produire **aucun** pixel.

## Rendu et mesure

- **Unity compose en LINÉAIRE, la maquette HTML en sRGB** : recopier une opacité, un dégradé ou une
  ombre d'une maquette est un changement d'unité silencieux. Garder l'opacité du CSS et déplacer la
  **couleur** (3 équations, 3 inconnues) rend 0/255. ⚠️ Un modèle faux tombe **juste** là où encre et
  fond se confondent : ne pas l'innocenter sur ce cas.
- **Une capture d'animation se prend à t=0** : sinon deux captures diffèrent par
  deux variables et ne départagent rien.
- `cat` et `head` passent par `rtk read` (lignes **élidées**) : lire avec `Read`, `sed -n`, `python3` ;
  un compte qui décide : `$( )`, `rtk proxy`. **Evidence** : commande + sortie collée.
