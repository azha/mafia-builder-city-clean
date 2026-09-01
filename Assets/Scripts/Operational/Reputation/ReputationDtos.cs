using System;

namespace MafiaCleanCity.Operational
{
    // ㊲ La réputation (screen_b3) — DTO fil de `GET /v1/me/reputation`
    // (`operational/reputation/reputation.controller.ts:126` →
    // `ReputationSurfaceProjection`, `reputation-hub.service.ts:247-252`).
    //
    // Ces DTO sont dérivés du CORPS RÉEL mesuré, pas de l'interface TypeScript lue seule
    // (juge-données ⊥ du 2026-08-30,
    // `Tools/juge-donnees/reputation/maquette-2026-08-30/mesures/me-reputation-frais.json`) :
    //
    //   {"payload":{"data":{
    //      "player_id":"01a05428-…",
    //      "boss_mirror":{"portrait_posture":"attentive","declared_rules":[],
    //                     "consistency_cue":"indeterminate"},
    //      "hidden_curriculum":{"uniform_tells":{"collar":"open","sleeves":"down",
    //                                            "watch":"hidden","gloves":"dirty"}}}}}
    //
    // ⇒ 3 clés sur compte frais. `restraint` est ABSENTE — voir le piège ci-dessous, qui est
    //   la raison d'être de `RestraintEstPresente`.

    /// <summary>Une règle de maison déclarée. Le serveur ne rend QUE `rule_id` : `declared_at`
    /// est persisté puis dépouillé par la projection (`reputation-hub.service.ts:301`, `:440` —
    /// « Strip declared_at »). ⛔ Et `rule_id` est une chaîne LIBRE écrite par le joueur
    /// (`reputation.controller.ts:84-86` — « free-form, player-authored ») : aucun libellé
    /// n'existe, ni côté serveur ni dans le bundle i18n (mesuré : 67 clés, 63 `error.*` +
    /// 4 `game.*`, zéro du domaine). L'écran affiche donc l'identifiant EN CLAIR — il ne
    /// masque pas le trou.</summary>
    [Serializable]
    public class DeclaredRuleDto
    {
        public string rule_id;
    }

    /// <summary>Le miroir du lieutenant. Trois bandes, aucun scalaire (R2.2).</summary>
    [Serializable]
    public class BossMirrorDto
    {
        /// <summary>attentive | cautious | withdrawn | hostile — dérivée server-side de
        /// `violation_density`, qui ne sort JAMAIS (`reputation-hub.service.ts:65`).</summary>
        public string portrait_posture;

        /// <summary>Le registre PUBLIC des règles déclarées (canon :65 — « public observable,
        /// NOT a hidden scalar »). Plafonné à 4 : la 5ᵉ déclaration rend 409
        /// `RESOURCE_STATE_CONFLICT` avec `current`/`cap` dans le message
        /// (`reputation.controller.ts:106-111`, tunable `reputation-tunables.ts:43-50`,
        /// défaut 4, plage 2..8 — donc JAMAIS écrire « 4 » en dur côté client).</summary>
        public DeclaredRuleDto[] declared_rules;

        /// <summary>aligned | drifting | indeterminate.
        /// ⛔⛔ `indeterminate` N'EST PAS « moyen » : c'est « pas encore assez de matière pour
        /// juger ». Le placer au milieu d'une jauge à trois crans serait un mensonge d'écran —
        /// c'est un ÉTAT À PART, avec son propre cadre. Mesuré sur compte frais : la valeur
        /// rendue est bien `indeterminate`, donc c'est le premier état que tout joueur
        /// rencontre, pas un cas limite.</summary>
        public string consistency_cue;
    }

    /// <summary>Les termes d'offre d'une contrepartie. ⛔ Section OMISE du corps (jamais
    /// neutralisée) quand la requête ne porte pas de `counterparty_id`
    /// (`reputation-hub.service.ts:454-462`, design D-2). Voir `RestraintEstPresente`.</summary>
    [Serializable]
    public class RestraintDto
    {
        /// <summary>standard | wary (`wary` = on demande des gages).</summary>
        public string offer_posture;

        /// <summary>⚠️ MESURÉ : ce ne sont PAS des noms. Le corps réel rend
        /// `["settlement-1","settlement-2","settlement-3"]` — des étiquettes POSITIONNELLES,
        /// parce que l'entité contrepartie est un concept différé, sans table de noms
        /// (`restraint-index.service.ts:330-336`, `db/schema/reputation_state.ts:180` — « no FK »).
        /// Le canon (:95) demande « les trois derniers avec qui vous avez réglé, par leur nom » ;
        /// le code n'y répond pas encore. ⇒ Tout écran qui promet des noms ment tant qu'un lot
        /// back n'a pas livré la table. (juge-données ⊥ 2026-08-30, écart É3.)
        /// ⚠️ Et ce sont les ≤3 derniers règlements AVEC CETTE contrepartie (`slots.slice(-3)`
        /// d'un ring à PK composite `(player_id, counterparty_id)`), pas trois contreparties
        /// différentes : ce n'est pas un palmarès (écart É4).</summary>
        public string[] marginalia;
    }

    /// <summary>Les quatre poses de tenue — des INSTRUCTIONS DE DESSIN, déjà calculées côté
    /// serveur, pas des libellés à traduire.
    ///
    /// ⛔⛔ DEUX PIÈGES MESURÉS, tous deux capables de faire dessiner le contraire du vrai, tous
    /// deux TRANCHÉS le 2026-08-30 (juge-données ⊥, écarts É1/É2 ; arbitrage session 78, la
    /// maquette v2 est posée en conséquence) :
    ///
    /// 1. **La donnée est PAR LIEUTENANT, pas par joueur.** Clé primaire `lieutenant_id`
    ///    (`db/schema/reputation_state.ts:222-225`) ; la projection appelle
    ///    `projectUniformTells(lieutenantId, playerId)` (`reputation-hub.service.ts:465`) ; et
    ///    le canon met posture ET tenue sur LE MÊME portrait, celui du lieutenant
    ///    (`reputation_mechanics.md:170`, `:233` — « Both appear on same portrait »).
    ///    ⇒ **TRANCHÉ : l'écran est UN portrait, celui du lieutenant**, qui porte à la fois son
    ///    attitude et ce qu'il a absorbé de vous. La v1 en dessinait deux (« le vôtre et le
    ///    sien ») et attribuait au joueur ce qui décrit le lieutenant.
    ///
    /// 2. **La polarité n'est pas celle qu'on croit.** Les valeurs NEUTRES (flag = false, ou
    ///    ligne absente) sont `open` / `down` / `hidden` / `dirty` ; les valeurs ACTIVES sont
    ///    `buttoned` / `rolled` / `visible` / `clean` (`hidden-curriculum.service.ts:76-85`).
    ///    Mesuré des deux côtés : compte frais → open/down/hidden/dirty ; les 4 flags à true →
    ///    buttoned/rolled/visible/clean.
    ///    ⇒ **TRANCHÉ : `ActifEstAbsorbe` ci-dessous est la SEULE lecture de polarité du client.**
    ///    Un lieutenant vierge doit allumer ZÉRO voyant ; la v1 en allumait deux sur quatre.
    ///
    /// Ce commentaire existe pour qu'aucun futur site d'appel ne les redécouvre à ses frais.
    ///
    /// ⚠️ Enfin : quand `projectUniformTells` rend `null`, la projection SUBSTITUE
    /// `{open, down, hidden, dirty}` (`reputation-hub.service.ts:466`). Les quatre poses
    /// arrivent donc TOUJOURS remplies, et rien dans le corps ne distingue « mesuré » de
    /// « valeur de repli ». Le client ne peut pas le savoir : ne pas prétendre l'inverse.</summary>
    [Serializable]
    public class UniformTellsDto
    {
        public string collar;   // buttoned | open
        public string sleeves;  // rolled   | down
        public string watch;    // visible  | hidden
        public string gloves;   // clean    | dirty

        /// <summary>Les quatre poses, dans l'ordre de lecture de la maquette.</summary>
        public enum Pose { Collar, Sleeves, Watch, Gloves }

        /// <summary>⛔ L'UNIQUE lecture de polarité du client — et c'est une FONCTION NOMMÉE
        /// exprès, pas quatre comparaisons de littéraux disséminées dans la mise en page.
        ///
        /// La raison est mesurée sur ce dépôt : une correspondance « valeur du domaine →
        /// apparence » portée par des littéraux épars, par l'ordre d'un tableau ou par un
        /// commentaire **n'a aucune forme exécutable à asserter** — un balayage passe à côté, et
        /// la garde qu'on écrit ensuite ne peut pas voir sa cible. La séquence qui marche est :
        /// (1) une fonction nommée qui prend la valeur du domaine, (2) ALORS la garde mord.
        ///
        /// ⇒ Toute garde de polarité s'écrit contre CETTE méthode. Celle qui compte — « un
        /// lieutenant vierge allume ZÉRO voyant » — est une propriété de la SORTIE, pas des
        /// libellés : elle reste vraie si quelqu'un renomme les textes, et rouge s'il réinverse
        /// le sens. C'est la même garde que la session 78 a posée côté maquette.</summary>
        public bool ActifEstAbsorbe(Pose pose)
        {
            switch (pose)
            {
                case Pose.Collar:  return collar  == "buttoned";
                case Pose.Sleeves: return sleeves == "rolled";
                case Pose.Watch:   return watch   == "visible";
                case Pose.Gloves:  return gloves  == "clean";
                default: return false;
            }
        }

        /// <summary>Combien de vertus le lieutenant a ABSORBÉES (0..4) — le numérateur du
        /// compteur « NN/4 » de la maquette v2. Le dénominateur est le nombre de poses, pas un
        /// plafond de règles : ne pas le confondre avec le plafond de 4 déclarations
        /// (`reputation-tunables.ts`, tunable de plage 2..8) — deux « 4 » sans rapport, qui
        /// coïncident aujourd'hui et n'ont aucune raison de rester égaux.</summary>
        public int CompteAbsorbe()
        {
            int n = 0;
            foreach (Pose p in (Pose[])Enum.GetValues(typeof(Pose)))
                if (ActifEstAbsorbe(p)) n++;
            return n;
        }
    }

    [Serializable]
    public class HiddenCurriculumDto
    {
        public UniformTellsDto uniform_tells;
    }

    [Serializable]
    public class ReputationSurfaceDto
    {
        public string player_id;
        public BossMirrorDto boss_mirror;
        public RestraintDto restraint;
        public HiddenCurriculumDto hidden_curriculum;

        /// <summary>⛔ LE DISCRIMINANT QUI REMPLACE UN `!= null` QUI NE MARCHERAIT PAS.
        ///
        /// `restraint` est OMISE du corps sans `counterparty_id` — mais `JsonUtility` ne laisse
        /// pas forcément un champ de type classe à `null` quand la clé manque : selon le cas il
        /// instancie l'objet avec ses valeurs par défaut. Un `if (restraint != null)` risque
        /// donc d'être TOUJOURS vrai, et de dessiner une section « standard, zéro marginalia »
        /// là où le serveur a refusé de se prononcer — une garde qui CERTIFIE le défaut au lieu
        /// de l'attraper.
        ///
        /// ⇒ On teste la PRÉSENCE D'UNE VALEUR, jamais l'absence d'une clé : `offer_posture` est
        /// non-vide dans toute réponse qui porte réellement la section (c'est un enum
        /// obligatoire côté serveur), et vide/null dans un objet fabriqué par le
        /// désérialiseur. Même famille que « épingler la VALEUR d'une clé présente, jamais
        /// l'absence d'une clé ».
        ///
        /// ⚠️ NON MESURÉ à ce jour : le comportement exact de `JsonUtility` sur cette
        /// omission — l'éditeur n'était pas joignable quand ce fichier a été écrit. C'est
        /// précisément pourquoi la forme retenue est correcte DANS LES DEUX CAS, au lieu de
        /// dépendre de la réponse. Un test EditMode qui désérialise
        /// `mesures/me-reputation-frais.json` (sans `restraint`) et
        /// `mesures/me-reputation-counterparty-uuid.json` (avec) tranche en deux assertions.</summary>
        public bool RestraintEstPresente =>
            restraint != null && !string.IsNullOrEmpty(restraint.offer_posture);
    }

    [Serializable] public class ReputationPayload { public ReputationSurfaceDto data; }
    [Serializable] public class ReputationEnvelope { public ReputationPayload payload; }

    /// <summary>`POST /v1/me/house-rules` → 201 `{ declared: true }`
    /// (`reputation.controller.ts:92-113`). Le seul retour du geste : ni la liste rafraîchie,
    /// ni l'état du plafond. Pour connaître le nouveau compte, il faut re-lire
    /// `GET /v1/me/reputation`.</summary>
    [Serializable] public class DeclareRuleResponseDto { public bool declared; }
    [Serializable] public class DeclareRulePayload { public DeclareRuleResponseDto data; }
    [Serializable] public class DeclareRuleEnvelope { public DeclareRulePayload payload; }
}

    /// <summary>La fiche renvoyée par `GET /v1/lieutenants/:id`. On n'y déclare que ce qu'on
    /// CONSOMME — `name`. Les 17 autres clés existent et sont listées comme « passé à côté ? »
    /// par le juge données ; les déclarer ici sans les afficher donnerait l'illusion qu'elles
    /// sont traitées.</summary>
    [System.Serializable]
    public class LieutenantFicheDto
    {
        public string name;
    
}
