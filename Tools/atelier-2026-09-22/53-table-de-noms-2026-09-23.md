# 53 — Les réservoirs complets de noms de la fiction (option A, napolitain, ère 1B)

Commande f2 du 23/09, après le 52 (`03689a40`). Table : `53-reservoirs-noms-2026-09-23.tsv`, **générée** par
`generer-53-reservoirs-noms.py` (source unique des listes, contrôle intégré, code 0).

**Somme = 140 lignes = 48 lieutenants + 18 dealers + 72 enseignes + 2 absents** · par statut : canon 3, proposé 128,
servie gardée 7, absent 2 · enseignes = 7 servies gardées + 40 à patronyme + 25 à nom de lieu.

## Cadre (lu dans les registres, pas de question à l'user)

- **Ton** : ruling user du 06/09 « sombre / napolitain / mafieux » ⇒ option A du 52 (f2, 23/09). **Ère** : 1B, fin des
  années 80 – début des années 90 (arbitrages du 07/09, état du point 13).
- **GDD 02** : aucune personne ni aucun clan réel, aucune marque, aucune ville réelle, pas de cliché italo-américain des
  années 1950.
- **Canon gardé** : Hara, Salvatore, Nestor (« le canon prime sur le réservoir », f2).
- **Forme servie gardée** (`common/dealer-names.ts`, en-tête) : lieutenant = « Lt. {nom} », dealer = **prénom seul**.
  Les deux réservoirs restent **disjoints**. ⚠️ **Correction du 52** : son échantillon proposait des *prénoms* pour les
  lieutenants, ce qui contredisait cette règle servie. Les 45 neufs sont des **noms de famille**.
- **Enseignes** : grammaire servie « {métier en français} {nom} ». Les 7 enseignes servies **sans nom propre** sont
  gardées.
- ⛔ **Décision f2 du 23/09 : lieutenants et enseignes ne partagent AUCUN nom de famille.** Avec « Pressing Varne » et
  « Lt. Varne », le joueur lirait un lien de propriété qui n'existe pas. C'est pourtant la conception servie
  aujourd'hui, et elle est abandonnée. Les enseignes ont leur propre stock :
  - **40 patronymes** distincts, qu'aucun lieutenant ne porte ;
  - **25 noms de lieu du port** (du Marché, de l'Écluse, des Tanneurs, du Phare…), sans personne, donc sans risque
    de personne réelle. Aucun ne recoupe un district, parce que la forme servie est « {enseigne} — {district},
    îlot {bloc} ».

  « Crédit Hara » sort, puisque Hara est un lieutenant ; il devient « Crédit du Port ». Contrôlé (code 1 si un
  patronyme est commun, contrôle positif fait). Les noms déjà stockés ne changent pas.
- **Surnoms** : 6 sur 48, dans un **champ à part** ; le nom servi reste « Lt. {nom} » (les puces n'ont pas la place).
- **Mise en œuvre (f2)** : le back remplace les réservoirs pour les **nouvelles** lignes seulement (les noms déjà
  stockés ne changent pas), **avant** les portraits du lot 6. Le rétro-remplissage des lignes d'avant le 02/09 est une
  dette notée, pas maintenant.

## Structure de la table

`catégorie · groupe · rang · nom · forme servie · statut · note`

- **Lieutenants** : 4 groupes de 12, servis dans l'ordre (comme « Sec » puis « Estuaire » aujourd'hui) ; le groupe 1
  porte les trois canons.
- **Dealers** : 18 diminutifs de rue (8 féminins ; aucun accord servi, D13).
- **Enseignes** : 6 par type × les 12 types servis (clés lues dans `building-signs.ts`).
- **Absents** : chefs rivaux (4 : aucun nom, aucun visage, à écrire avec le lot 6) ; précincts (6 : le numéro suffit,
  `police.bloc.precinct_n` de la 51).

## Contrôles

1. **Intégré au générateur** (code 0) : comptes 48 / 18 / 72 (6 × 12 types servis), unicité, disjonction
   lieutenants / dealers **et lieutenants / enseignes**, lieux distincts et hors districts servis, apostrophe
   typographique (D10), aucun nom neuf repris d'un réservoir servi, liste d'exclusion de l'atelier (clans de
   Campanie, Cosa Nostra, 'Ndrangheta, personnalités, fictions célèbres, et tout ce que la revue a relevé).
   Contrôles positifs : un nom exclu, un nom servi et un doublon, puis un patronyme de lieutenant sur une enseigne et
   une apostrophe droite, glissés dans une copie, donnent code 1.
2. **Revue ⊥ n° 1** : agent frais qui ne lit **que** la liste et GDD 02. Verdict **NOT_APPROVED**, avec 7 entrées
   probables et 13 incertaines. Traitement :

| entrée | motif de la revue | décision |
|---|---|---|
| Cirillo | affaire Ciro Cirillo (1981, Cutolo) | **remplacé** → Ciaramella |
| Rosetta (dealer) | Rosetta Cutolo, arrêtée en 1993 | **remplacé** → Marietta |
| Carmela (dealer) | Carmela Soprano | **remplacé** → Vincenzina → Assuntina (revue n° 2) |
| Chianese | Dominic Chianese (*Les Soprano*, *Le Parrain II*) | **remplacé** → Cascone → Buonanno (revue n° 2) |
| Nappi | personnalité connue | **remplacé** → Palomba (le Nuzzo proposé par la revue est un nom de clan de la liste d'exclusion) |
| Apicella | chanteur, duos avec Berlusconi | **remplacé** → Acampora |
| « Recyclage » | métier postérieur à 1992 | **remplacé** → « Récupération Pignalosa » |
| Cacace | effet comique en français | **remplacé** → Capasso → Capuano (revue n° 2) |
| « Clés-Minute » | proche d'une marque | **remplacé** → « Serrurerie Arpaia » → « Serrurerie Auriemma » (revue n° 2) |
| 'o Ragioniere | surnom de presse de Provenzano | **remplacé** → 'o Quaderno |
| Titti | Titi (Looney Tunes) | **remplacé** → Tittina → Graziella (revue n° 2) → Nunziatina (revue n° 3) |
| Gaeta | ville réelle | **remplacé** → « Prêts Amodio » |
| 6 patronymes en double (bloc laboratoire) | artefact | **remplacés** → 6 patronymes neufs, 65 distincts (deux revus au n° 2) |
| **Salvatore** | seul prénom de la liste ; registre des années 50 ; Riina, Gravano | **GARDÉ : canon posé par f2** — désaccord signalé à f2 |
| Hara, Nestor | hors registre (japonais, grec) | **GARDÉS : canon** — signalé |
| Langella, Carotenuto, Iannone, Capuozzo, Iaccarino, Varriale, Caiazza | homonymes connus en Italie seulement (confiance faible) | gardés : la règle vise une personne identifiable par un joueur francophone, pas un patronyme |
| Guarracino | tarentelle du XVIIIᵉ, domaine public | gardé (folklore, pas une personne) |

   ⚠️ Les **enseignes** citées dans les revues n° 1 à 3 ont été refaites après la décision de disjonction (voir le
   cadre). Leur métier corrigé est gardé (« Récupération », « Serrurerie », « Traitement de surface »), mais leur nom
   a changé. **L'état final est celui de la table**, relu en entier par la revue n° 4.

   En plus de la revue, trois noms neufs ont été retirés **avant** la revue n° 2 : Somma (ville), Ferrigno
   (Lou Ferrigno), Spinelli (Altiero Spinelli).
3. **Revue ⊥ n° 2** (les 23 noms neufs seulement, même protocole) : **NOT_APPROVED**, avec 5 entrées bloquantes et 7 en
   surveillance.

| entrée | motif | décision |
|---|---|---|
| Arpaia (lieutenant **et** enseigne) | commune réelle de Campanie (Bénévent) ; la revue n° 1 ne l'avait pas vu | **remplacé** → Auriemma |
| « Mesures Trapanese » | « de Trapani » : ville réelle, géographie de Cosa Nostra | **remplacé** → Lanzetta |
| Tittina | Titina De Filippo ; double sens en italien et en français | **remplacé** → Graziella |
| Cascone (lieutenant et enseigne) | finale lue « -conne » en français ; « Traitement » seul n'est pas une enseigne | **remplacé** → Buonanno, « Traitement de surface Buonanno » |
| Cuccurullo | « cucul » en français | **remplacé** → Mennella |
| Vincenzina | titre de chanson canonique (Jannacci, 1974) | **remplacé** → Assuntina |
| Capasso | homophone « ça passe » | **remplacé** → Capuano |
| Mascolo, Nastri, Pignalosa, Di Martino | homonymie faible ou incertaine | gardés |

   **Deux remarques d'ensemble de la revue, remontées à f2 et non tranchées ici :**
   - **Tension de canon** (GDD 02 l. 11 contre le ruling) → **tranchée par f2** : le ruling du 06/09 l'emporte, parce
     qu'il vient de l'user et qu'il est postérieur au GDD. La ville reste fictive, sans pays réel nommé ; le
     **registre des noms** est napolitain, ère 1B. Formulation d'amendement : § « Amendement proposé à GDD 02 ».
   - **Même nom pour un lieutenant et une enseigne** → **tranchée par f2** : NON voulu. Réservoirs disjoints (voir
     le cadre).
4. **Revue ⊥ n° 3** (les 10 noms neufs de la revue n° 2) : **NOT_APPROVED**, avec 2 entrées probables et 4
   incertaines.

| entrée | motif | décision |
|---|---|---|
| Graziella | marque de vélo pliant vendue en France ; roman de Lamartine | **remplacé** → Nunziatina |
| « Analyses Mennella » | enseigne alimentaire napolitaine réelle | **remplacé** → « Analyses Porzio » |
| Auriemma (lieutenant) | homonyme célèbre aux États-Unis, peu connu d'un joueur francophone | gardé ; son enseigne est sortie avec la disjonction |
| Buonanno (lieutenant) | homonyme politique ; se lit « buon anno » | gardé : le remplaçant proposé, Terracciano, est un **nom de clan** (liste d'exclusion) ; son enseigne est sortie avec la disjonction |

   La revue n° 3 note aussi, à juste titre, que **ma connaissance, et la sienne, filtre mais ne blanchit pas**. Il
   manque un passage contre un registre des clans et une recherche de marques déposées. Hors ligne, je ne peux pas le
   faire. **À faire avant que le back ne serve ces listes.**
5. **Revue ⊥ n° 4** (liste COMPLÈTE de 138 entrées, agent frais, même protocole) : **NOT_APPROVED**, avec 8 entrées
   sûres ou probables et 17 incertaines. Côté structure, tout passe : comptes, aucun doublon, **aucun patronyme commun
   entre lieutenants et enseignes**. Aucun nom de clan (catégorie A) sur les 48 lieutenants ni sur les 6 surnoms.

   **Règle d'arrêt appliquée**, parce que chaque revue fraîche trouve de nouvelles associations faibles :
   - on remplace tout ce qui est sûr ou probable ;
   - on remplace aussi les incertains qui touchent **un joueur francophone** (effet comique, marque ou commune sur
     une enseigne, écho du cinéma italien des années 50 que GDD 02 proscrit) ;
   - les homonymes connus en Italie seulement étaient gardés jusqu'ici. Cette fois, on les remplace aussi quand le
     remplaçant ne coûte rien.

| entrée | motif | décision |
|---|---|---|
| Cafiero | Federico Cafiero De Raho, procureur antimafia | → Guardascione |
| Capuozzo | Toni Capuozzo (reporter) ; Gennaro Capuozzo (1943, figure civique de Naples) | → Sparano |
| Iannone | Andrea Iannone (MotoGP, presse people) | → Astarita |
| « Ferblanterie Napolano » | se lit Napoli / Napolitano : ville réelle | → Vetrano |
| « Caisse Bove » | José Bové, nom politique très connu en France | → Zurolo |
| Pinuccio (dealer) | se lit Pinocchio ; figure de la télévision | → Ciccillo |
| « Cordonnerie des Halles » | les Halles : quartier réel de Paris | → « de la Fontaine » (le « des Bassins » proposé est un **district**) |
| Visone | « vison » : le GDD dit « not a kingpin in a fur coat » | → Conturso |
| Carotenuto | maréchal Carotenuto, film de 1953 : le registre des années 50 proscrit | → Sicignano (le Marfella proposé est dans la liste d'exclusion) |
| Langella · Auriemma · Buonanno | homonymes connus (Frank Langella ; Geno Auriemma ; Gianluca Buonanno) | → Pellino · Cervone · Anzalone |
| Tammaro | *tamarro* (argot : frimeur) sous le surnom « 'o Silenzio » | → Verrusio (surnom gardé) |
| Ninetta · Totonno (dealers) | Ninetta Bagarella (épouse de Riina) ; Totò | → Nella · Vicienzo |
| Varriale · Di Martino · Mele · Marzano · Salzano · Fiorillo · Di Palma · Nunziante (enseignes) | personnalité, marque (pâtes Di Martino, Emporio Mele, San Marzano) ou commune | → Cinquegrana · Chiacchio · Ascolese · Scamardella · Pacilio · Sorvillo · Aliperta · Fusco |
| « Horticulture du Ponant » | Compagnie du Ponant, marque française (1988) | → « du Couchant » |

   **Remonté à f2 et à l'user, non modifié, parce que c'est du canon** : **Nestor** évoque Nestor Burma, détective de
   fiction français, avec une série télévisée lancée en **1991**, en plein dans l'ère ; **Salvatore** évoque Riina
   (arrêté en janvier 1993), c'est un prénom qui casse la forme « Lt. {nom} », et c'est le registre proscrit par GDD
   02 ; **Hara** évoque « hara-kiri » (et le journal *Hara-Kiri*) pour un lecteur français.
   **Notes non bloquantes** : « du Quai » et « du Verre » servent deux fois chacun, et « Verre » et « Treillis » sont
   des profils du GDD pris comme lieux. Ce sont des enseignes **servies** gardées : à trancher au niveau de la bible de
   fiction.

   ⚠️ **Limite, dite telle quelle** : environ 25 remplaçants, pour la plupart proposés par la revue elle-même, n'ont
   été vérifiés que par elle et par la liste d'exclusion. Une 5ᵉ revue trouverait sans doute encore des associations
   faibles. **La vraie garde reste le passage contre un registre des clans et une recherche de marques**, qu'il faut
   faire en ligne, avant que le back ne serve ces listes.

## Amendement proposé à GDD 02 (le back le commite, le GDD vit chez lui)

Ligne 11, remplacer la phrase sur l'époque et le vocabulaire par :

> Time period is **late 1980s – early 1990s** (era 1B — user ruling of 2026-09-06, « sombre / napolitain / mafieux »,
> which supersedes the earlier undated wording). No specific technology or brand is name-checked.
> Brennar stays fictional and is **not located in any real country**: the ruling sets the *register* of names and
> mood, not a real place.

Ajouter après le paragraphe « Districts have names — invent at art-bible time » :

> ### Naming register
> Personal names follow a **Neapolitan register** (user ruling of 2026-09-06): lieutenants carry a surname (« Lt.
> {surname} »), dealers a first name or diminutive, shop signs a French trade plus either a surname no lieutenant
> carries or a port-place name. Names must never match a real clan, a real public figure, a real brand, a real town
> or a famous fictional crime character. The name pools live in the fiction bible (atelier table 53).

⚠️ **Non tranché ici, signalé** : la phrase actuelle « Smartphones are referred to as "handsets," computers as
"terminals," messaging apps generically as "channels" » suppose des smartphones et des messageries, anachroniques en
1B. La supprimer ou la réécrire touche aux **objets** du jeu, pas aux noms, et donc à l'écart « fin 80 » / « fin 90 »
relevé par le lot 6. Question pour qui tient le canon.
