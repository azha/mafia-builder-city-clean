# Candidats socle — session pilote-B, ㊲ La réputation — 2026-09-01

> **NON RATIFIÉ.** Rédigé pour transcription : `docs/superpowers/specs/` n'existe pas dans ce
> worktree, et mon mandat me tient hors de l'arbre principal. Je rédige, une autre session
> transcrit — même partage que pour `reserves.md` et `lots-back.md`.
>
> Chaque entrée porte son **énoncé**, sa **mesure**, et l'**ancre** où la mesure est re-vérifiable.
> Un candidat sans ancre n'est pas opposable : c'est une opinion bien tournée.
>
> ⚠️ Les formes fautives sont PARAPHRASÉES, jamais reproduites — décrire un correctif est un acte
> de citation, et reproduire ce qu'on retire le réintroduit dans le document qui le retire.

---

## C1 — Un défaut de PROJECTION est invisible à un juge d'IMAGE

**Énoncé.** Un juge visuel compare une image à une image. Si la maquette et l'écran s'accordent, il
ne peut pas voir que ce qu'ils montrent tous les deux est faux par rapport à la source de données.
Ce n'est pas un défaut de rigueur : **c'est hors de son instrument, par construction.**

**Mesure.** L'écran ㊲ portait une mention avertissant le joueur qu'une donnée n'était pas fournie
par le serveur, sous un nom que l'écran écrivait lui-même en dur. Les deux ne pouvaient pas être
vrais ensemble, et c'est la mention qui était fausse : la clé était projetée par trois routes, et le
back documentait la réparation du trou correspondant.

    8 tours de juge visuel, contexte vierge à chaque fois   → défaut non vu
    1 passe de juge données                                  → défaut trouvé

⚠️ **Et les huit étaient rigoureux** : l'un d'eux a écarté trois de ses propres instruments pour
contrôle échoué plutôt que d'en publier les chiffres. Un autre a retiré un finding entier en
découvrant que sa sonde mesurait le rééchantillonnage de son propre redimensionnement. Le défaut
n'a pas échappé à leur attention — il n'était pas dans leur champ.

★ **Ils ont vérifié la mise en forme du mensonge.** La mention était bien placée, bien colorée,
lisible : « rendue proprement », huit fois.

**Ancre.** `Tools/juge-donnees/reputation/cloture-2026-08-31/rapport.md` (défauts D1/D2) · les huit
rapports sous `Tools/juge-visuel/reputation/r1…r8/` · correctif `3ac1d1f`.

**Portée.** Vaut pour tout écran du programme : c'est la justification opérationnelle de la doctrine
des deux juges, là où elle avait l'air redondante.

---

## C2 — Un écart assumé porte la DATE et la MESURE qui le fondent

**Énoncé.** Un écart déclaré « assumé » met sa **prémisse** hors du champ de la revue. Tant qu'il
est déclaré, plus personne ne redemande si ce qu'il affirme est encore vrai — et une prémisse vraie
le jour où on l'écrit peut cesser de l'être pendant qu'un lot voisin avance. Sans date ni mesure,
il devient une **vérité par ancienneté**.

**Mesure.** Les cinq écarts assumés de ㊲, tous re-mesurés à la source le 2026-09-01 :

    ① compteur d'enfreintes montré comme absent      VRAI
    ② identifiant de règle affiché brut               VRAI
    ③ aucun geste de retrait offert                   VRAI
    ④ section de contrepartie jamais demandée         VRAI
    ⑤ mention d'absence du nom du lieutenant          PÉRIMÉ — survivant de 8 tours

**Et une distinction trouvée en re-mesurant, qui change ce que l'user doit trancher** : ① et ③/④ ne
sont pas des dettes en attente d'un lot, ce sont des **murs de conception** — la donnée est retenue
délibérément par le back (conformité P5), et les surfaces concernées ne sont exposées qu'à
l'administration, pas au joueur. Les avoir écrits comme temporaires les faisait passer pour du
travail en attente.

★ **Une dette invite à attendre ; un mur invite à concevoir autrement.** Les confondre fait espérer
un lot qui ne viendra jamais.

**Ancre.** `Assets/Scripts/Operational/Reputation/ReputationResolvers.cs` (bloc daté au-dessus des
trois résolveurs de contrepartie) · `Tools/juge-donnees/reputation/cloture-2026-08-31/lots-back.md`
· commits `3ac1d1f`, `7da48eb`.

---

## C3 — Un lot back n'est pas l'excuse d'un écran incomplet

**Énoncé.** C'est la raison pour laquelle il est complet **autrement**. Le test qui rend la règle
opérante : chaque item de lot porte **ce qui reste vrai tant que le lot n'existe pas**. Sans cette
clause, le back devient une salle d'attente et l'écran un brouillon permanent.

**Mesure.** Les trois lots sortis de ㊲ portent chacun leur clause :

| lot | ce qui reste vrai sans lui |
|---|---|
| compteur d'enfreintes | le tiret est JUSTE — il dit « pas de source » là où un zéro dirait « mesuré à zéro » |
| route de retrait | l'écran n'offre aucun bouton, et DIT que la règle est définitive plutôt que d'offrir un geste qui échouerait |
| énumération des contreparties | la section reste déclarée avec sa date, et le front n'y touche pas |

⚠️ **Et un item mal rédigé ne meurt jamais** : celui du compteur d'enfreintes, écrit naïvement,
aurait demandé au back d'exposer une donnée qu'il retient par doctrine. Il aurait été refusé, puis
relu chaque trimestre comme une dette non traitée. Reformulé en demande de **bande dérivée** — du
même type qu'une projection déjà existante — il devient recevable.

★ **Un item que le destinataire doit refuser est pire qu'un item absent : il occupe une place et
survit à sa réfutation.**

**Ancre.** `Tools/juge-donnees/reputation/cloture-2026-08-31/lots-back.md` · commit `8f724b5`.

---

## C4 — Une garde technique mesure la DISPONIBILITÉ, jamais l'ATTRIBUTION

**Énoncé.** Un verrou libre ne dit pas « personne n'attend », il dit « personne ne tient ». Ce qui
est rationné par une **file d'attente** ne peut pas être vérifié par une **sonde locale**, par
construction : la réservation ne vit pas sur la machine, elle vit chez qui l'attribue.

**Mesure.** Trois batchmodes lancés sur un créneau attribué à une autre session, malgré une consigne
écrite reçue et à laquelle j'avais répondu :

    20:14:01 · 20:15:25 · 20:31:05

Avant chacun, deux gardes de prémisse : la pile répond, aucun batchmode concurrent. **Les deux
étaient vertes à chaque fois.** Elles mesuraient que la machine était libre ; elles ne pouvaient pas
mesurer qu'elle était réservée.

★ **Et c'est ce qui la rend coûteuse : les gardes m'ont rassuré.** Trois voyants verts avant chaque
run, donc le sentiment d'avoir été prudent. **Une garde qui répond à côté de la question donne
exactement la même confiance qu'une garde qui y répond** — et trois instruments verts ont parlé
plus fort qu'une phrase lue.

**Ancre.** `Tools/preuves/creneau-unity-2026-09-01/` — les trois extraits de journal avec leur
horodatage, le filtre réellement appliqué et le compte de chaque run.

⚠️ **Cette ancre a été corrigée après coup, et l'erreur mérite d'être dite** : elle renvoyait
d'abord aux journaux du scratchpad de session, c'est-à-dire à `/tmp`. Une ancre dans un répertoire
temporaire **meurt avec la session** — elle n'est donc pas re-vérifiable, ce que la barre posée en
tête de ce document condamne explicitement.
★ J'ai écrit la barre, puis j'ai déposé sous elle une ancre qui ne la passait pas. Une règle qu'on
  vient d'énoncer ne se relit pas : on la croit acquise parce qu'on l'a formulée.

**Portée.** Deux autres sessions l'ont appliquée dans l'heure, dont une au miroir : une garde trop
LARGE refuse un créneau légitime, symétrique du même défaut.

---

## C5 — Le symptôme ne se produit pas où la cause se trouve

**Énoncé.** Un finding localise un **symptôme**, jamais une cause. Le déplacement prend deux formes,
et les deux ont mordu sur cet écran.

**Mesure — déplacement dans l'ESPACE.** Un vide mesuré à 37,5 px CSS sous une carte, pour 21,4
attendus. La cause n'était pas sous la carte : la carte elle-même était trop courte de 8,7 px CSS,
et le manque tombait en dessous d'elle.
★ **Un bloc trop court ne se lit jamais comme un bloc trop court : il se lit comme un trou à côté.**

**Mesure — changement de NATURE.** Un liseré mesuré à 0,9 px CSS pour 2,7 attendus, donc lu comme
absent. Il était dessiné depuis deux tours : le générateur de forme anticrénèle sur une largeur
fixe de texture, et l'étirement de ce sprite produisait une rampe de 1,81 px CSS — plus large que le
liseré qu'elle bordait. Elle le noyait.
★ **Un défaut d'ABSENCE et un défaut de NETTETÉ produisent la même mesure.** Avant de conclure à une
absence, vérifier la résolution de l'outil qui dessine.

**Corollaire opérationnel.** Quand un juge nomme un écart, la première question n'est pas « comment
le corriger » mais **« quel élément, arithmétiquement, peut produire cet écart ici ? »** — et c'est
souvent son voisin. Les trois fois où l'arithmétique du cadre a tranché seule sur cet écran, elle a
désigné un autre bloc que celui qui saignait.

**Ancre.** Commits `35732ba` (les deux cas) · rapports r5 et r7.

---

## C6 — Un finding est un couple (mesure, désignation), et seule la mesure est fiable

**Énoncé.** Un finding nomme ce que le juge **croit** voir. La mesure est opposable, la désignation
ne l'est pas — c'est à l'auteur de retrouver quel objet a réellement été mesuré.

**Mesure.** Trois juges sur quatre ont attribué un défaut à un accessoire du portrait qui **n'était
pas rendu** dans l'état capturé. Vérifié : zéro pixel de sa couleur dans toute la carte. L'objet
réellement mesuré était un autre accessoire, de forme et de taille voisines, à l'autre poignet du
même buste — un seul des deux est rendu à la fois.

⚠️ **Ce n'est pas de la négligence** : les deux objets sont deux ellipses claires de dimensions
proches, et rien dans l'image ne les distingue pour qui ne connaît pas le modèle.

★ **Si j'avais corrigé l'objet nommé, l'image n'aurait pas bougé d'un pixel et j'aurais clos la
réserve en croyant l'avoir levée** — un vert de non-exécution déguisé en correctif.

**Corollaire.** Exiger que chaque finding porte ses **coordonnées**, pas seulement le nom de
l'objet. Un rectangle mesuré est opposable ; un nom ne l'est pas.

**Ancre.** `Tools/juge-visuel/reputation/r8-2026-08-31/rapport.md` (F1/F2) · commit `2af4343`.

---

## C7 — Aucune garde ne surveille ce qu'on NE fait pas

**Énoncé.** Une garde vérifie un résultat **présent**. Elle ne peut pas signaler une action jamais
entreprise. C'est le mode d'échec le plus silencieux qu'on ait mesuré, et il ne laisse aucune trace
— y compris dans les instruments qui surveillent tout le reste.

**Mesure.** Un balayage déclenché par la ronde d'une autre session a trouvé **trois** choses en
attente, là où elle en signalait une :

    le rapport d'un juge et ses 35 instruments        hors dépôt depuis deux tours
    les 3 fichiers d'identité des captures            jamais suivis
    le journal d'une sonde d'isolation (749 lignes)   hors dépôt

Dans les trois cas, **le travail était fait et correct**. Ce qui manquait était l'acte de le rendre
opposable. Et le rapport hors dépôt portait le seul finding qu'aucun tour précédent n'avait vu.

★ **Le vecteur était une demande de permission** : le juge avait terminé en demandant s'il devait
commiter. La question m'était adressée, je ne l'ai pas traitée, et rien ne me l'a rappelée. ⇒ **Un
agent qui DEMANDE s'il doit commiter et un agent qui commite ne laissent pas la même trace.**

**Ancre.** Commits `b2839df` et `0d67aa6` (rattrapages) · le rapport concerné, sous `r6-2026-08-31/`.

---

## C8 — Une grosse diff n'est pas un gros changement

**Énoncé.** Le volume d'un différentiel mesure la **représentation**, pas la **substance**. Avant de
livrer ou de jeter un changement volumineux sur un artefact généré, compter ce qui a changé **dans
le vocabulaire de l'artefact**, pas en lignes.

**Mesure.** Trois atlas de police réécrits par un run, 34 575 insertions et 16 516 suppressions.
Décompte dans le vocabulaire de l'artefact :

    entrées de caractère ajoutées    0
    entrées de caractère retirées    0
    clés réellement modifiées        coordonnées d'atlas et tables de positionnement

⇒ Le jeu de caractères était **identique**. L'outil avait repacké les mêmes entrées à d'autres
positions. Rien à livrer, et rien de perdu à restaurer.

★ Sans ce décompte, les deux erreurs symétriques étaient ouvertes : **jeter un changement
nécessaire**, ou **livrer du bruit en passager d'un commit fonctionnel**.

**Ancre.** État de l'arbre après restauration ; commit `b05b2f2` qui ne les embarque pas.

---

## Ce que je ne propose PAS, et pourquoi

- **« Une garde ne teste pas la source, elle teste ma lecture de la source »** — vrai, et déjà
  transmis en candidat plus tôt dans la soirée par la session qui orchestre. Je ne le redépose pas.
- **« Quand un correctif précis ne change rien, il vise autre chose que la cause »** — mesuré deux
  fois ici, mais c'est un cas particulier de C5 (le symptôme n'est pas où est la cause). Le déposer
  séparément diluerait C5 sans rien ajouter.
- Tout ce qui relève de l'usage d'un outil précis (un mode de répétition de texture, un réglage de
  groupe de mise en page) : ce sont des faits d'exploitation, pas des règles. Ils vivent dans les
  commentaires du code qu'ils concernent, où le prochain lecteur les trouvera au bon moment.
