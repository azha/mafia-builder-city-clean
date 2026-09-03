# ecran_loi « La loi » (㉛) — « le parloir » — notes d'implémentation, 2026-09-03

Régime de la semaine : PAS de suite complète, PAS de revue ⊥, PAS de gate. Preuve exigée :
compilation 0 erreur avec contrôles positifs (`Tools/verifier-compilation-sans-unity.sh` +
`Tools/verifier-references-asmdef.py`, chacun avec `--controle-positif`). **L'éditeur Unity n'a
PAS été lancé** (consigne du chantier) : rien de ce qui suit n'a été vérifié visuellement en Play
Mode ni jugé par `juge-visuel`/`juge-données`. Aucun des 22 tests écrits n'a couru.

## Fichiers touchés

- `Assets/Scripts/Operational/Loi/LoiScreenController.cs` (neuf, 700 lignes) — métier complet :
  §1 roster + geste rétention, §2 recrutement (2 tiers payants), §3 affaires en état vide honnête.
- `Assets/Scripts/Operational/Loi/LoiClient.cs` (neuf, 186 lignes) — squelette généré par
  `Tools/nouvel-ecran.py` pour les 4 routes du brief, PLUS une 5ᵉ méthode écrite à la main
  (`PutLegalLawyersRetainer`) absente du squelette (le brief demandait de la mesurer moi-même).
- `Assets/Scripts/Operational/Loi/LoiDtos.cs` (neuf, 152 lignes) — les 5 clés de `lawyerRoster[]`,
  le corps `{tier}` de la création, le corps `{active}` du retainer (mesuré par ce lot), et les
  placeholders `MÉTIER ICI` intacts pour `plea`/`payoff` (jamais mesurés, jamais câblés).
- `Assets/Tests/PlayMode/LoiScreenPlayModeTests.cs` (neuf, 481 lignes) — plancher structurel,
  capture, QUATRE tests de PARCOURS réel (compte frais vide, compte de démo peuplé + épingle de
  clés, geste rétention aller-retour, geste recrutement de bout en bout), 5 tests d'ÉTAT
  (`RendrePourTest`), 4 tests de résolveur.
- `Assets/Scripts/Shell/AppShell.cs` — UNE ligne ajoutée dans `DestinationsPlus()` (+4/-0, voir
  `git diff --stat`) ; **le bloc imprimé par le générateur pour `case Tab.More:` n'a PAS été
  exécuté** (consigne explicite du brief : `Tab.More` ouvre désormais le menu « Plus », pas un
  écran direct — périmé depuis le chantier joignabilité du 2026-09-02).
- `Assets/Editor/MafiaCI.cs` — `EcranLoi`/`PhotoEcranLoi` ajoutées à `Categories` (+4/-1, TD-490 :
  sans ça, la suite compile et ne tourne jamais, en silence — je l'avais déjà payé une fois moi-même
  la veille sur ㉘, cf. commentaire dans le fichier).
- `Tools/juge-visuel/ecran_loi/dossier.md` — généré par `nouvel-ecran.py`, NON rempli (aucune
  capture prise cette passe, éditeur non lancé).
- Ce fichier (`Tools/loi-implementation-notes.md`).

## Ce que les six cadres de la maquette montrent (Tools/juge-visuel/v6/m-67.png .. m-72.png)

Les SIX sont des états d'UNE SEULE affaire active, « Tomas Verrick » (coursier arrêté), pas des
états de l'écran-liste que ce lot construit :

| cadre | ce qu'il montre |
|---|---|
| m-67 | Fiche de l'affaire — 5 éléments « ce qu'il sait » (`lourd`/`mineur`), compte à rebours « 9 jours avant le jugement », bouton « LUI TROUVER UN AVOCAT » |
| m-68 | « Lui trouver un avocat » — TROIS cartes : Commis d'office (`EN PLACE`, gratuit), Un cabinet (`DISPONIBLE`, `tier=boutique`), La filière (`À VOS RISQUES`, `tier=corruption_pipeline`) + un paragraphe d'avertissement sur la filière |
| m-69 | Même affaire, escaladée — 3 des 5 éléments passés à `SORTI`, compte à rebours à 5 |
| m-70 | Même affaire, tout est `SORTI`, charge passée à « un crime », compte à rebours à 1, PLUS de bouton (juste une note) |
| m-71 | « Il y a un arrangement possible » — deux cartes d'action : « Accepter l'accord » (`SANS FRAIS`) et « Faire classer par la filière » (`ÇA SE PAIE`) — correspond à `POST .../plea` et `POST .../payoff` |
| m-72 | « Votre avocat est nerveux » — avertissement de la filière SANS AUCUN CHIFFRE (« Le jeu ne vous donnera jamais de chiffre là-dessus ») + bouton « LE RETIRER DE L'AFFAIRE » |

⇒ **Cet écran (le parloir vu SANS affaire active) n'a AUCUN cadre source.** Ce que ce lot construit
— le roster déjà engagé + le recrutement hors contexte d'affaire + une section affaires vide — est
une COMPOSITION à partir de ce que les données réelles permettent, pas une reproduction d'un cadre.
Seule la carte « qui peut vous défendre » (§2 du contrôleur) reprend une copie VERBATIM de m-68 ;
tout le reste (titre, sous-titre, eyebrow des sections, note de la section affaires) est une
synthèse d'interface, marquée comme telle dans le code.

## ⛔⛔ « JAUGE DE RISQUE » DU BRIEF — PRÉMISSE VÉRIFIÉE FAUSSE

Le brief demandait explicitement : « si un cadre montre une jauge de risque, écris qu'elle n'a
pas de source plutôt que d'en fabriquer une ». **Mesuré sur les 6 images (ouvertes une par une,
décrites ci-dessus) : AUCUN des 6 cadres ne porte de jauge de risque PROPRE À CET ÉCRAN.** La
seule jauge visible est celle du HUD partagé en haut de chaque capture (« ARGENT $24 850 / tiède
HEAT / JOUR 12 Matin ») — chrome du shell (barre supérieure), **identique pixel pour pixel sur
les 6 images** (même valeur « tiède », même montant), donc structurellement le bandeau commun à
tout écran monté sous le shell, PAS un `burn_risk_score` qui varierait avec l'affaire.
`burn_risk_score` n'apparaît nulle part visuellement — ce que m-72 montre à la place est un texte
qui REFUSE explicitement de donner un chiffre (« vous n'aurez que ce signe »). Aucun code de ce
lot ne construit de gauge de risque : il n'y en avait rien à combler.

## Prémisses du brief RÉFUTÉES OU CORRIGÉES PAR LA MESURE (`rtk proxy curl`, 2026-09-03)

1. **`GET /v1/me/legal` confirmé** : `{activeCases: [], lawyerRoster: [...]}`, exactement comme
   annoncé, sur le compte de démo. Re-mesuré aussi sur un compte FRAIS (signup réel) : les deux
   clés sont vides — le brief ne le disait pas, mesure ajoutée par ce lot.
2. **`POST /v1/me/legal/lawyers` confirmé** : corps `{tier}`, domaine fermé par le 422 exact
   `"tier must be 'boutique' or 'corruption_pipeline'."`, réponse = état complet (pas un accusé).
   ⚠️ **`corruption_pipeline` coûte 4 000 000 cents** — mesuré via un 402 PAYMENT_REQUIRED sur un
   compte frais (pas assez d'argent). `boutique` a réussi (201) sur le même compte frais.
3. **`PUT /v1/me/legal/lawyers/:id/retainer` — MESURÉE PAR CE LOT, absente du brief** (« je ne
   l'ai pas appelé »). Corps `{active: bool}` (PAS `{retainer}`), domaine fermé par le 422
   `"active must be a boolean."`, réponse = état complet, `lawyerRoster[].retainer` mis à jour.
   Mesuré ALLER-RETOUR (`true` puis `false`) sur le compte de démo pour ne pas laisser l'état
   modifié — voir `retainer1.json`/`retainer2.json`/`retainer3.json` dans le scratchpad de la
   session (non commités, hors dépôt).
4. **`lawyerLabel` confirmé prose anglaise** : "Boutique Counsel" pour `tier=boutique`, sur DEUX
   comptes indépendants (démo ET frais) — le back envoie la MÊME chaîne littérale, donc ce n'est
   pas un artefact du compte de démo. Affiché tel quel, jamais traduit côté client (consigne du
   brief, TD-452).
5. **`lawyerRoster[]` porte exactement 5 clés confirmées** : `lawyerId`, `lawyerLabel`, `tier`,
   `retainer`, `activeCaseCount` — pas plus, pas moins, sur les deux comptes.
6. **`cases/:id/plea`/`cases/:id/payoff` — le brief avait raison, confirmé structurellement
   inatteignables** : `activeCases` mesuré vide sur DEUX comptes (démo, frais). Le client les
   porte (mécaniquement, squelette généré) mais aucun code du contrôleur ne les appelle.

## Clés servies (AFFICHÉES) vs non affichées

`GET /v1/me/legal` :

| clé | affichée ? | où |
|---|---|---|
| `lawyerRoster[].lawyerId` | non affiché | clé de nommage GameObject + identifiant du geste retainer |
| `lawyerRoster[].lawyerLabel` | oui, TEL QUEL | ligne roster, prose brute (TD-452) |
| `lawyerRoster[].tier` | oui, résolu | tag court (`LoiResolvers.TierLabelCourt`) + choix de couleur du badge de recrutement |
| `lawyerRoster[].retainer` | oui, résolu | texte d'état + libellé du bouton (`TexteRetainer`/`TexteBoutonRetainer`) |
| `lawyerRoster[].activeCaseCount` | oui, brut formaté | ligne roster (« N affaire(s) en cours ») |
| `activeCases` (jamais peuplé) | oui, comme COMPTE seul | section §3 — voir § ci-dessous |
| `activeCases[].*` (jamais mesuré) | NON | aucun champ inventé — voir `LoiDtos.LegalCaseDto` |

## Éléments DESSINÉS SANS SOURCE, avec leur pis-aller

1. **Titre « Le parloir » / sous-titre « Vos avocats, et ce qu'ils peuvent faire pour vous. »** —
   aucun cadre ne montre cet écran à l'état « aucune affaire ». « Le parloir » est le nom que le
   BRIEF lui-même donne à ce chantier (verbatim) ; le sous-titre est une synthèse d'interface,
   même geste que « VOS COURRIERS » sur ㉘ (déjà consigné là comme non sourcé).
2. **Eyebrow « QUI PEUT VOUS DÉFENDRE »** — adapté depuis « QUI PEUT LE DÉFENDRE » de m-68 (cet
   écran n'a personne de spécifique « à défendre », donc la 3ᵉ personne ne s'applique plus).
   Les TROIS cartes elles-mêmes (titre/sous-titre/badge) restent verbatim m-68.
3. **Eyebrow « VOS AVOCATS » / « AFFAIRES EN COURS »** — labels de section inventés, aucune
   maquette ne montre de vue-liste (m-67..m-72 ne portent qu'UN fil narratif par affaire), même
   raison que « VOS COURRIERS » sur ㉘.
4. **« Vous n'avez encore engagé personne. » / « Aucune affaire en cours. » / « Une affaire naît
   d'une descente — rien sur cet écran n'en crée. »** — brief §3 : état vide honnête, raison écrite
   dans le code (`RendreAffaires`, `RendreRoster`).
5. **Libellés de bouton de rétention (« METTRE SOUS RÉTENTION » / « LIBÉRER »)** — aucune
   maquette ne montre ce geste (il n'existe QUE hors affaire, ce que la maquette ne couvre pas) ;
   synthétisés depuis le nom de la route (`retainer`).
6. **Repli défensif de la section affaires si `activeCases` devient non vide** (§3 du contrôleur,
   jamais exercé sur les comptes sondés) — affiche UNIQUEMENT le compte (« N affaires en cours »),
   parce que `LegalCaseDto` ne porte AUCUN champ mesuré. Ce n'est pas une réduction R2.2 d'une
   projection connue : il n'y a rien de connu à réduire. Le jour où une affaire existe vraiment,
   juge-données ⊥ doit mesurer son corps AVANT que ce repli ne soit remplacé par un rendu détaillé.

## Ce qui a été TRANCHÉ

### Domaine `tier` — deux niveaux de fermeture, un seul résolveur, jamais de `throw`

Le 422 de création (`POST .../lawyers`) ferme le CORPS qu'on peut ENVOYER (« boutique » ou
« corruption_pipeline », rien d'autre — message exact cité plus haut). Ce lot n'écrit AUCUN
`default: throw` sur `tier`, y compris côté recrutement : les deux cartes payantes sont
construites par DEUX appels EXPLICITES et LITTÉRAUX à `ConstruireCarteAvocat` (un par tier connu,
avec sa copie verbatim m-68), jamais par un résolveur qui itérerait sur un tableau de tiers — donc
aucune ligne de ce lot n'a besoin de résoudre un `tier` arbitraire à cet endroit.
Le seul résolveur qui LIT un `tier` SERVI par le back (`LoiResolvers.TierLabelCourt`, appelé
depuis `lawyerRoster[].tier`) garde un repli GRACIEUX, jamais un throw — patron
`DistributionResolvers.TexteVehicule`, qui fait le même choix malgré un domaine de BODY confirmé
fermé par un 422 sœur. Raison : le 422 ferme ce qu'on peut ENVOYER, pas ce qu'on peut RECEVOIR en
retour — et la valeur reçue n'a été observée qu'UNE fois (« boutique »).

### Pas de `ScrollRect`

Le contenu (roster + recrutement + affaires) peut dépasser un écran si le roster grandit
beaucoup. Aucun écran de ce dépôt (㉘/㊲/㉚, mesurés) n'utilise `ScrollRect`/`Mask` pour ça — j'ai
commencé à l'introduire puis je suis revenu en arrière : l'introduire sans pouvoir le vérifier en
Play Mode cette semaine (éditeur non lancé) aurait été le risque inverse de « coller au code
environnant ». Un contenu qui déborde reste une limite partagée par tous les écrans opérationnels
de ce dépôt à ce jour, pas un défaut propre à celui-ci.

### DTO — duplication délibérée plutôt qu'héritage

`GetLegalResponseDto`/`PostLegalLawyersResponseDto`/`PutLegalLawyersRetainerResponseDto` portent
chacun leur PROPRE copie des 2 champs (`activeCases`, `lawyerRoster`) au lieu d'hériter d'une
classe de base commune. Mesuré : 0 fichier de ce dépôt ne fait désérialiser `JsonUtility` à
travers une classe DÉRIVÉE. Au moindre doute, la forme déjà vérifiée par ce dépôt (duplication
plate, composition via `LawyerDto`/`LegalCaseDto` comme types de champ) gagne sur la forme plus
courte et non précédée.

## Ce qui reste ouvert (à trancher par l'user, une revue ⊥, ou juge-visuel/juge-données)

- Le titre/sous-titre/eyebrows synthétisés (§ ci-dessus) n'ont jamais été vus par personne
  d'autre que ce lot — à confronter à une VRAIE maquette de l'écran-liste le jour où elle existe.
- Le geste « retainer » change-t-il vraiment quelque chose de MÉCANIQUE (coût récurrent ?
  priorité d'assignation à une future affaire ?) ou est-ce cosmétique côté joueur ? Aucune des 4
  routes ne le dit — la copie de bouton reste donc neutre (« mettre sous rétention »/« libérer »)
  plutôt que de promettre un effet non mesuré.
- `cases/:id/lawyer` (assigner un avocat du roster à une affaire) n'a JAMAIS été mentionnée par le
  brief ni mesurée par ce lot — sa forme reste inconnue. Le jour où une affaire existe, c'est
  probablement le premier geste à câbler avant `plea`/`payoff`.
- Capture et jugement (`juge-visuel`/`juge-données`) : aucun des deux n'a tourné cette passe
  (éditeur non lancé, consigne du chantier). Le dossier `Tools/juge-visuel/ecran_loi/dossier.md`
  est généré mais vide.
