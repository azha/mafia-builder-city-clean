# Candidats socle — session « redimensionnement », 2026-09-01

> ⛔ **NON RATIFIÉE.** Ce document ne modifie pas `CLAUDE.md` et ne prétend pas à l'autorité du
> socle. C'est une proposition, avec ses mesures, pour que l'user tranche. Rien ici n'a été
> promu.
>
> **Chaque entrée porte : ÉNONCÉ · MESURE · ANCRE RE-VÉRIFIABLE.** Un candidat sans ancre n'est
> pas opposable — c'est une opinion bien tournée. Les huit ancres de commit citées ont été
> re-résolues avant écriture (`git log --format=%s -1 <sha>`), pas recopiées de mémoire.
>
> ⚠️ **Les formes fautives sont PARAPHRASÉES, jamais reproduites** — décrire un correctif est un
> acte de citation, et le message de commit compte autant que la prose.

---

## 1. Une règle d'arrêt doit compter la PROGRESSION, pas les essais

**ÉNONCÉ.** Une règle qui borne l'entêtement doit se déclencher sur l'absence de *progrès*, jamais
sur un nombre de *tentatives*. Compter les essais tue une démarche exactement au tour où elle
converge, parce que sur ce dépôt **le défaut migre vers l'intérieur** : chaque réparation démasque
la suivante, et de l'extérieur cela ressemble à du surplace.

**MESURE.** Trois runs batchmode successifs de la même sonde, **trois causes distinctes**, chacune
révélée par la réparation de la précédente :

| run | ce qui a échoué | pourquoi c'était invisible avant |
|---|---|---|
| r1 | lecture d'un état **statique** pollué par les 260 autres tests du processus | la valeur lue était *plausible* |
| r2 | l'écriture qu'on attendait n'est **jamais déclenchée** par un montage nu | r1 masquait r2 : on lisait autre chose |
| r3 | destruction **différée** à la fin de frame ⇒ le montage suivant se lie à l'objet mourant | r2 masquait r3 : on n'atteignait pas le 2ᵉ point |

Le 4ᵉ état a rendu la mesure : `topLocal=120,000 · bottomLocal=80,000` contre une prédiction
arithmétique de `60/0,5` et `40/0,5` — **exact au millième**.
⇒ La règle que j'avais posée (« trois runs sans mesure ⇒ arrêter ») **se serait déclenchée au
run 3**, c'est-à-dire juste avant le succès, et sur une comparaison invalide de surcroît : le run 3
tournait sous une contention que les deux premiers n'avaient pas.

**ANCRE.** `b11aaaa` (r1, le faux rouge) · `7a88b19` (r2, l'échec nommé) · `fbb999b` (r3, la
mesure). Journaux préservés : `scratchpad/sonde-seam-r{1,2,3}.log`.

---

## 2. Réparer un instrument aveugle, c'est lui faire DÉCLARER ce qu'il ne couvre pas — pas élargir son filtre

**ÉNONCÉ.** Quand un instrument rend un vert sur un domaine qu'il n'observe pas, élargir son filtre
le rend correct **aujourd'hui** et le laisse muet sur le prochain domaine oublié. La forme qui tient
dans le temps est la **déclaration de non-couverture**, imprimée dans la sortie — sinon le lecteur
suivant lira le vert comme un verdict général.

**MESURE.** Deux instruments, deux domaines, même défaut :
- un oracle d'état d'éditeur répondait correctement « un éditeur tourne-t-il ? » et était sur le
  point d'être lu comme « le créneau est-il libre pour moi ? ». **La réservation ne vit sur aucun
  disque** : aucun instrument local ne peut la voir. Il déclare désormais, dans sa sortie et dans
  son en-tête, qu'il mesure la **disponibilité** et jamais l'**attribution** ;
- un nettoyeur de conteneurs filtrait par label de projet, et ses **deux comptes d'orphelins
  concordaient honnêtement**. Il était néanmoins aveugle à une quinzaine de processus hors Docker
  qui écrivaient dans l'arbre pendant qu'il certifiait la propreté.

⇒ ***Un instrument correct sur son domaine certifie la propreté d'un domaine voisin qu'il n'a
jamais regardé.*** Et son honnêteté interne est ce qui rend le piège invisible : rien à corriger
dans ses comptes.

**ANCRE.** `fe3aaa5` — `Tools/editeur-unity-etat.sh`, exécutable, la déclaration est dans sa sortie.

---

## 3. Un DELTA de total n'est pas une ATTRIBUTION

**ÉNONCÉ.** Constater qu'un compte agrégé a changé ne dit pas **ce qui** l'a changé. Pour affirmer
qu'un élément apporte N unités, il faut le confronter **seul** au reste. La soustraction est
gratuite, toujours disponible, et **elle désigne toujours le dernier changement qu'on a en tête**.

**MESURE.** J'ai publié qu'un artefact nouvellement inclus dans une population apportait 3 unités,
en soustrayant deux totaux successifs. Confronté ensuite un par un aux huit autres artefacts : il en
apporte **zéro**. Trois variables avaient bougé entre les deux exécutions — l'appartenance à la
population, et deux séries d'éditions de ma main.
⇒ **Quatre attributions déduites publiées dans la même journée**, toutes plausibles : un compte de
fichiers obtenu par soustraction et rapporté à un seul répertoire alors qu'il en couvrait treize ·
un compte exact d'un pair, juste pour un répertoire et faux pour le commit qui le contenait · les 3
unités ci-dessus · un fichier de diagnostic vieux de **19 heures** rangé dans les effets d'un run de
la minute. **Les quatre se tranchaient en une commande.**
⇒ ***Un déduit absurde se corrige tout seul ; un déduit plausible traverse les revues.***

**ANCRE.** `40914be` — le rectificatif porte la mesure par artefact.

---

## 4. Un glob est une allowlist qui n'a pas l'air d'en être une

**ÉNONCÉ.** Une population définie par un motif de **nom**, d'**extension** ou de **chemin** est une
énumération déguisée en dérivation. Elle paraît structurelle, elle est cohérente avec elle-même, et
son trou tombe **là où le corpus bouge** — c'est-à-dire sur l'élément le plus récent, celui qu'on
vient d'ajouter.

**MESURE.** Quatre définitions successives de la même population, **chacune déclarée corrigée**,
chacune encore courte :

| définition | population | signal publié |
|---|---|---|
| liste écrite à la main | 5 | 3 |
| motif de nom + extension | 7 | 22 |
| éléments liés par l'historique au document pivot | 8 | 25 |
| union avec le répertoire que le lot **possède** | 9 | 28 |

La troisième ratait un fichier ajouté par **le commit immédiatement précédent**. La quatrième est
née d'une question posée avant sa promesse : *ce critère prouve qu'un élément a un commit, pas que
ce commit touche aussi le pivot* — et le contre-exemple **existait déjà** dans l'historique.
⇒ **Le geste qui les prend en défaut, et le seul** : dériver la population par un **chemin
indépendant, écrit AVANT** de lire la définition en place, puis comparer les **ENSEMBLES**. Aucune
inspection du script ne l'aurait donné : il est cohérent avec lui-même à chaque version.
⇒ Et ce qui échappe encore doit être **imprimé dans la sortie**, comme une propriété **datée de
l'historique** et non de la dérivation.

**ANCRE.** `f8cd712` · `Tools/claims-partagees.py`, fonction `population()`.
⚠️ **Le signal publié est une mesure DATÉE** : re-exécuté à la rédaction de cette note, il rend
**30** et non 28 — il monte à mesure que j'écris dans les artefacts qu'il compare. C'est exactement
pourquoi un compte se lit **en exécutant la commande**, jamais en recopiant un nombre.

---

## Ce que je ne propose PAS, et pourquoi

Cette section vaut autant que les entrées : une règle diluée protège moins qu'une règle absente.

- **« Un rouge plausible est plus traître qu'un vert plausible. »** Vrai et mesuré ici — j'allais
  ouvrir un chunk de correctif sur un défaut inexistant. Mais ce n'est **pas une règle d'action** :
  elle ne dit pas quoi faire. Ce qu'elle recommande est **déjà couvert par l'entrée 1** et par les
  gardes anti-vacuité du socle. Elle vit mieux comme **observation dans le rapport du lot**.
- **« Avant d'écrire un instrument, chercher qui exerce déjà la même couture. »** Mesuré **deux
  fois** dans la même soirée, et le coût est réel. Mais c'est un **conseil d'hygiène de
  développement**, pas une propriété de vérification, et le socle n'est pas un guide de style. Sa
  place est le commentaire en tête des instruments concernés, où le prochain auteur le lit **au
  moment où il en a besoin**.
- **Les faits d'outillage de cette session** — une couche d'affichage qui tronque, une casse, une
  apostrophe typographique, un motif qui se matche lui-même. Le socle **porte déjà** cette classe
  (« un contrôle qui asserte un zéro peut le rendre pour la mauvaise raison »). Y ajouter quatre
  instances ne la renforce pas ; elle est déjà comprise, et sa forme opérationnelle — passer le jeu
  complet sur le fichier **intact** d'abord — y est écrite.
- **Une entrée sur la coordination entre sessions** (*une autorisation ne s'exécute pas sur sa
  réception ; celui qui lance mesure au moment où il lance*). Elle est juste et elle a coûté quatre
  croisements ce soir — mais elle appartient au **protocole d'orchestration**, pas au socle
  technique, et elle a été proposée par une autre session : **ce n'est pas à moi de la porter.**
