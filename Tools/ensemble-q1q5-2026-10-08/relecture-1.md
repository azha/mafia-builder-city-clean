# Relecture ⊥ r1 du mini-design Q1+Q5 (08/10/2026) — NOT_APPROVED

Relecteur indépendant (n'a pas écrit `design.md`). Preuves = commande + sortie collée.
Cible : `Tools/ensemble-q1q5-2026-10-08/design.md`, HEAD `d5ff4a8b`.

---

## BLOQUANT B1 — la clé i18n de Q5 n'est pas celle que le code dérive

`design.md:24` et `:26` : « **clé neuve** `forensic.piste.train_de_vie_de` à lister en `DetteDatee` ».

Ce que `Lib()` fait réellement :

```
$ sed -n '706,707p' Assets/Scripts/Operational/Forensic/ForensicScreenController.cs
        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("forensic", "bloc", litteral);

$ sed -n '160,161p' Assets/Scripts/I18n/Libelle.cs
        public static string CleDe(string domaine, string role, string litteral) =>
            domaine + "." + role + "." + Slug(litteral);
```

Slug rejoué à l'identique (`Libelle.cs:165-176`) :

```
$ python3 -I slug.py
'le train de vie de' -> forensic.bloc.le_train_de_vie_de
'le train de vie d’un lieutenant' -> forensic.bloc.le_train_de_vie_d_un_lieutenant
'le train de vie de {nom}' -> forensic.bloc.le_train_de_vie_de_nom
```

Le rôle est `bloc`, pas `piste`, et le slug garde `le_`. La clé du design n'est demandée par aucun
site. Conséquences mesurables :
- l'entrée de `DetteDatee` (`Assets/Tests/PlayMode/ZeroRepliDesLocatairesPlayModeTests.cs:43`)
  couvrirait une clé jamais interrogée ;
- la garde « hors dette » (`BundleReelZeroRepliPlayModeTests.cs:121-127`) ne peut pas voir l'écart :
  sa règle (2) n'exige que « non servi », ce que la fausse clé satisfait ;
- le jour où f2 sert `forensic.piste.train_de_vie_de`, le client rend toujours son repli, sans rouge.

## BLOQUANT B2 — la composition par concaténation est intraduisible (MESURÉ en anglais)

`design.md:24` : « texte COMPOSÉ client avec `Lib("le train de vie de")` + nom servi » ;
`:26` : « la préposition « de » est celle de la maquette ».

Bundle réel des mesures de clôture :

```
$ python3 -I look.py
fr payload.data.messages.forensic.bloc.le_train_de_vie_d_un_lieutenant = 'le train de vie d’un lieutenant'
en payload.data.messages.forensic.bloc.le_train_de_vie_d_un_lieutenant = 'a lieutenant’s lifestyle'
```

En anglais le nom passe **devant** et prend le possessif `’s`. `Lib(fragment) + nom` ne peut
structurellement pas rendre « Lt. Hara’s lifestyle » : il rend un fragment + un nom collé.
L'outil existe déjà dans le dépôt, et son en-tête décrit EXACTEMENT ce cas (le `{nom}` d'un
lieutenant) :

```
$ sed -n '117p;132,137p' Assets/Scripts/I18n/Libelle.cs
        public static string Gabarit(string cle, string repli, IDictionary<string, string> parametres = null)
        /// <summary>UN GABARIT EXIGEANT, en OPT-IN par site (f2 26/09) : ... Pour les répliques NOMMÉES de la table 64 :
        /// le back sert encore « Nestor : … », « Lt. Hara — … », un nom écrit DANS la valeur ; le client fournit `{nom}` = le vrai
        /// lieutenant.
        public static string GabaritExigeant(string cle, string repli, IDictionary<string, string> parametres, string trouRequis)
```

⇒ UNE clé de phrase ENTIÈRE à trou (`forensic.bloc.le_train_de_vie_de_nom`, repli
« le train de vie de {nom} »), via `Libelle.Gabarit`. Pas un fragment concaténé.

## BLOQUANT B3 — le nom servi ne décrit pas la bande affichée

`design.md:22` demande une « ligne retenue » lexicographique pour le nom, tout en gardant les bandes
« comme aujourd'hui (maxima indépendants) : on n'y touche pas ».

Le code de l'étape 3 ne retient AUCUNE ligne — trois maxima pris indépendamment :

```
$ sed -n '329,348p' .../operational/forensic/forensic.projection.service.ts
    const STAGE_ORDER: Record<string, number> = { none: 0, passive: 1, tailing: 2, subpoena: 3 };
    ...
    for (const row of lifestyleRows) {
      if (STAGE_ORDER[stage] > STAGE_ORDER[worstStage]) { worstStage = stage; }
      if (consecutive > worstConsecutive) { worstConsecutive = consecutive; }
      if (gap !== null && (worstGap === null || gap > worstGap)) { worstGap = gap; }
    }
```

Et il y a bien N lignes par joueur :

```
$ sed -n '504,511p' services/game-back/src/db/schema/forensic.ts
     * lieutenant_id — PK: the lieutenant's uuid.
     * One row per lieutenant — partition key for §5.3 monthly gap computation (C17).
    lieutenant_id: uuid('lieutenant_id').primaryKey().references(
```

⇒ la bande peut venir du `last_gap` de Lt. A pendant que le nom servi est Lt. B. L'écran dirait
« le train de vie de Lt. B » sur une alarme produite par A. Le commentaire `:313-315` du back
(« select the most severe lifestyle row ») décrit une sélection que le code ne fait pas : le design
s'appuie sur ce commentaire, pas sur le code. Soit la bande se calcule sur la ligne retenue (et ce
n'est plus additif), soit le nom n'est pas servi.

---

## MAJEUR M1 — « pas de dépendance Forensic→Loi » est faux

`design.md:10` justifie un DTO local par l'absence de dépendance. Même assembly, même namespace :

```
$ ls Assets/Scripts/Operational/*.asmdef ; find Assets/Scripts/Operational/{Loi,Forensic} -name '*.asmdef' | wc -l
Assets/Scripts/Operational/Operational.asmdef
0
$ sed -n '3p' Assets/Scripts/Operational/Forensic/ForensicDtos.cs ; sed -n '3p' Assets/Scripts/Operational/Loi/LoiDtos.cs
namespace MafiaCleanCity.Operational
namespace MafiaCleanCity.Operational
```

`LawyerDto` est donc déjà visible, sans un `using` de plus :

```
$ sed -n '22,24p;34,42p' Assets/Scripts/Operational/Loi/LoiDtos.cs
    /// <summary>Un avocat du roster — 5 clés MESURÉES (2026-09-03, `GET /v1/me/legal` et
    /// `{lawyerId, lawyerLabel, tier, retainer, activeCaseCount}`.
    public class LawyerDto
    { public string lawyerId; public string lawyerLabel; public string tier; public bool retainer; public int activeCaseCount; }
```

Or `me_legal.json` du 08/10 sert **7** clés : `lawyerId, lawyerLabel, lawyerNameI18n,
lawyerLabelI18n, tier, retainer, activeCaseCount`. Le témoin « 5 clés MESURÉES » est périmé.
Le geste conservateur est ADDITIF sur `LawyerDto` + témoin corrigé, pas un second DTO divergent.

## MAJEUR M2 — la jointure `lieutenant` n'est pas scopée (authz)

`design.md:23` : « un nom d'un AUTRE joueur jamais servi (scope `player_id`) ». Le scope cité est
celui de `lifestyle_audit_state`, pas celui de la table jointe :

```
$ sed -n '591,600p' services/game-back/src/db/schema/forensic.ts
    /** Index for player-scoped lookups (all lifestyle rows for a player). */
    player_idx: index('lifestyle_audit_state_player_idx').on(t.player_id),
  lieutenant: one(lieutenant, {
    fields: [lifestyleAuditState.lieutenant_id],
    references: [lieutenant.lieutenant_id],
```

Aucune FK composite ne lie `lifestyle_audit_state.player_id` à `lieutenant.player_id` — le schéma
dit lui-même que le durcissement est « structurally possible here **later** » (`:520-523`).
`lieutenant.player_id` existe (`db/schema/lieutenant.ts:86`). ⇒ la jointure doit porter
`eq(lieutenant.player_id, playerId)`, et le test doit fabriquer une ligne INCOHÉRENTE (ligne du
joueur A + lieutenant du joueur B) : sur des fixtures propres il est vert sans rien prouver.

## MAJEUR M3 — les gardes Q1 (a)-(d) n'ont pas de couture de test

```
$ grep -n "public void RendrePourTest" Assets/Scripts/Operational/Forensic/ForensicScreenController.cs
117:        public void RendrePourTest(GetForensicResponseDto dto, ActeurDto[] acteurs = null)
```

Deux corps imposables, aucun moyen d'imposer la table des noms. `design.md:15` ne prévoit que le
drapeau `NomsIndisponibles`. La couture (3ᵉ paramètre ou setter) doit être spécifiée.

## MAJEUR M4 — « aucune géométrie touchée » est DÉDUIT, et la garde mesure un paramètre

`design.md:13` affirme « aucune géométrie touchée » et l'ellipse, et les gardes (a)-(e) ne mesurent
aucune largeur. Le nœud vit dans un `VerticalLayoutGroup` à `childControlWidth = true`, dans une
rangée horizontale où `Statut` est épinglé :

```
$ sed -n '321,325p;328,330p;336,337p' Assets/Scripts/Operational/Forensic/ForensicScreenController.cs
            var colLe = col.AddComponent<LayoutElement>(); colLe.flexibleWidth = 1f; colLe.minWidth = 0f;
            var v = col.AddComponent<VerticalLayoutGroup>();
            v.childControlWidth = true; ...
            NouveauTexte(col.transform, "Reference", DossierCalculs.RefAffichee(a.actorRef), Px(5.6f),
            var stLe = st.gameObject.AddComponent<LayoutElement>(); stLe.flexibleWidth = 0f;
```

`overflowMode = Ellipsis` est un RÉGLAGE ; CLAUDE.md : « une garde sur les PARAMÈTRES d'un effet
n'est pas une garde sur son EFFET ». Exiger une garde qui REND le nom le plus long et compte la
largeur / le non-chevauchement.

## MAJEUR M5 — « Lt. Marek » est un mot inventé

```
$ sed -n '44,46p' services/game-back/src/operational/lieutenant/lieutenant-name-pool.ts
/** Le préfixe de la forme canon « Lt. Nom ». `lieutenant.name` est un `varchar(64)` — mesuré ; le
const PREFIXE = 'Lt. ';
$ python3 -c "... 'Marek' in pool ..."
Marek dans le pool ? False | Marrek ? True | n= 24
```

Le pool porte « Marr » et « Marrek », jamais « Marek ». Une fixture de garde est un mot comme un
autre : prendre « Lt. Hara ».

---

## MINEURS

- `piLib` (`design.md:24`) n'existe pas : `grep -c 'piLib' ForensicScreenController.cs` → **0**.
  Le champ est `piTitre[]` (`:384`), écrit en `:262` (`piTitre[i].text = Lib(piste.Titre);`).
- Citations à corriger : « Lt. Nom » est dans `lieutenant-name-pool.ts:44/64`, pas
  `lieutenant.projection.service.ts:138-144` (`grep -n "Lt\." ` sur ce fichier → 0 ligne) ;
  `PistesConstantes` est en **:851**, pas ~845 ; la preuve que `actorRef` EST `lawyer_id` est en
  **:267** (`select({ ref: lawyer.lawyer_id })`), `:274-276` ne montre que `actorRef: l.ref`.
- `lieutenant.name` est `notNull` (`db/schema/lieutenant.ts:91`) : le cas « nom vide » de `:23` est
  inatteignable par la colonne — le garder comme garde d'espaces, et le dire.
- `params` est un mot réservé C# : le champ du DTO Q1 doit s'écrire `@params` pour que `JsonUtility`
  lie la clé JSON `params`. Une ligne dans le design évite un aller-retour de compilation.

---

## VÉRIFIÉ JUSTE (contrôles négatifs de cette relecture)

- `actorRef` == `lawyerId` : les deux valent `7abe1833-237a-4817-a247-dda968ae569d`
  (`mesures/actors_plein.json`, `mesures/me_legal.json`). ✓
- Sentinelle : `fiction-names.ts:318` `const valeur = ... : 'unknown_lawyer';`. ✓
- `lawyerLabelI18n` EST le tier : servi `game.legal.lawyer_tier.boutique`
  (`legal-projection.service.ts:276`, `lawyerTierNameRef(l.tier)`). ✓
- Préférer `lawyerNameI18n` à `lawyerLabel` est justifié : `legal-projection.service.ts:270`
  `lawyerLabel: l.name ?? 'Unknown'` (dégrade sur un mot anglais, pas sur une sentinelle opaque). ✓
- Q1 « aucune clé neuve » tient, MESURÉ dans les deux langues :
  `game.fiction.lawyer.name = '{nom}'` en fr ET en en ⇒ lire `params.nom` est équivalent à résoudre
  la clé. ✓
- `RefAffichee` → `ia.actor.7abe` (`:982-987`, 4 premiers caractères). La garde (b) est exacte. ✓
- Ordre de livraison Q5 (client avant back) : aucune garde n'assert l'ensemble des champs de
  `GetForensicResponseDto` (`grep -n "typeof(GetForensicResponseDto)" Assets/Tests/PlayMode/*.cs`
  → 0) ; clé JSON absente ⇒ `null` ⇒ repli ⇒ écran inchangé. Sûr **sur cet axe** ; B1/B2/B3 restent.
- `ForensicScreenPlayModeTests.cs:533` épingle `PistesConstantes` aux deux mêmes clés : Q5 n'y
  touche pas, la piste reste éteinte. ✓
