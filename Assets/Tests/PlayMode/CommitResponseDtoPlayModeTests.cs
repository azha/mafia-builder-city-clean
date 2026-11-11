using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.I18n;

namespace MafiaCleanCity.Shell.Tests
{
    /// <summary>Chunk 3 client « hl-card agit » — le contrat de `POST /v1/session/hl-card/:id/commit` côté client, sans réseau.
    ///   · la RÉPONSE : les 10 clés servies (lot back `hl-card-apres-geste-servi` D4, `hl-card-types.ts`) sont TOUTES déclarées par `CommitResponseDto` (forme G :
    ///     `JsonUtility` jette en silence une clé non déclarée) — bijection comptée, et un corps réel relu champ par champ ;
    ///   · le CORPS : `chosen_option` posé quand l'appelant choisit, `{}` sinon ;
    ///   · l'APRÈS-GESTE : `ApresGesteHl` résout les clés SERVIES avec `n` et `total`, jamais un mot dérivé.
    /// ⚠️ Les textes ci-dessous sont ceux du DESIGN approuvé (`2026-11-11-hl-card-apres-geste-servi-design.md` §3.2, @464defd1), pas ceux du CODE back, qui
    /// n'est pas livré : la bijection client ↔ back (V15) se rejoue au SHA que donnera f2.</summary>
    [Category("Charpente")]
    public class CommitResponseDtoPlayModeTests
    {
        /// <summary>Les DIX clés de la réponse 200, ordre lexicographique du design (F4.2) — `stopped_at_i18n_key` AVANT `stopped_at_id` (`'1' < 'd'`).</summary>
        private static readonly string[] ClesServies =
        {
            "committed", "executed_ids", "navigate_ids", "navigate_screen", "outcome", "outcome_i18n_key",
            "stopped_at_error", "stopped_at_i18n_key", "stopped_at_id", "structural",
        };

        private static string[] ChampsDuDto() =>
            typeof(CommitResponseDto).GetFields().Select(f => f.Name).OrderBy(n => n, System.StringComparer.Ordinal).ToArray();

        /// <summary>Bijection comptée : 10 servies, 10 déclarées, 0 orphelin des deux côtés.</summary>
        [Test]
        public void LesDixClesServies_SontToutesDeclarees_ZeroOrphelin()
        {
            string[] champs = ChampsDuDto();
            Assert.AreEqual(10, ClesServies.Length, "le back sert 10 clés (design D4)");
            Assert.AreEqual(10, champs.Length, "le DTO déclare 10 champs");
            CollectionAssert.AreEqual(ClesServies, champs, "ensemble EXACT, jamais une inclusion");
            Assert.IsEmpty(ClesServies.Except(champs).ToArray(), "servie et jetée par JsonUtility (forme G)");
            Assert.IsEmpty(champs.Except(ClesServies).ToArray(), "déclarée mais jamais servie");
        }

        /// <summary>CONTRÔLE POSITIF : une clé renommée d'un côté fait rougir la comparaison — sinon la bijection ne mesure rien.</summary>
        [Test]
        public void ControlePositif_UneCleRenommeeFaitRougir()
        {
            string[] renommee = ClesServies.Select(k => k == "outcome_i18n_key" ? "outcome_key" : k).OrderBy(k => k, System.StringComparer.Ordinal).ToArray();
            CollectionAssert.AreNotEqual(renommee, ChampsDuDto(), "`outcome_i18n_key` renommée côté back doit rougir");
            string[] seulementHuit = ClesServies.Where(k => !k.EndsWith("_i18n_key")).ToArray();
            Assert.AreEqual(8, seulementHuit.Length);
            CollectionAssert.AreNotEqual(seulementHuit, ChampsDuDto(), "l'ancienne réponse à 8 clés ne doit plus suffire");
        }

        /// <summary>Un corps RÉEL de la forme du design (arrêt partiel : 1 fait, 1 en échec) relu par `JsonUtility` : chaque clé arrive.</summary>
        [Test]
        public void UnCorpsReel_EstRelu_ChampParChamp()
        {
            const string corps = "{\"payload\":{\"data\":{\"committed\":true,\"structural\":false,\"outcome\":\"executed\"," +
                "\"executed_ids\":[\"b1\"],\"stopped_at_id\":\"b2\",\"stopped_at_error\":\"RESOURCE_NOT_FOUND\"," +
                "\"navigate_screen\":null,\"navigate_ids\":[]," +
                "\"outcome_i18n_key\":\"hl.after_choice.partial_stop\",\"stopped_at_i18n_key\":\"error.hl_card.not_found\"}}}";
            CommitResponseDto d = JsonUtility.FromJson<CommitEnvelope>(corps).payload.data;
            Assert.IsTrue(d.committed);
            Assert.IsFalse(d.structural);
            Assert.AreEqual("executed", d.outcome);
            CollectionAssert.AreEqual(new[] { "b1" }, d.executed_ids);
            Assert.AreEqual("b2", d.stopped_at_id);
            Assert.AreEqual("RESOURCE_NOT_FOUND", d.stopped_at_error);
            Assert.IsTrue(string.IsNullOrEmpty(d.navigate_screen), "navigate_screen null : jamais un mot");
            Assert.AreEqual(0, d.navigate_ids.Length);
            Assert.AreEqual("hl.after_choice.partial_stop", d.outcome_i18n_key);
            Assert.AreEqual("error.hl_card.not_found", d.stopped_at_i18n_key);
        }

        [Test]
        public void LeCorpsDuCommit_PoseChosenOption_OuRienQuandLAppelantNeChoisitPas()
        {
            Assert.AreEqual("{\"chosen_option\":0}", HlCardClient.CorpsDuCommit(HlCardClient.OptionAgir));
            Assert.AreEqual("{\"chosen_option\":1}", HlCardClient.CorpsDuCommit(HlCardClient.OptionLaisser));
            Assert.AreEqual("{}", HlCardClient.CorpsDuCommit(null), "⑤ ne choisit pas : le back lit « n'agit pas » (D1)");
            Assert.AreEqual(0, HlCardClient.OptionAgir);
            Assert.AreEqual(1, HlCardClient.OptionLaisser);
        }

        // ------------------------------------------------------------------ l'après-geste

        /// <summary>Le bundle du design (§3.2 FR) — la valeur de chaque clé servie, `partial_stop` avec son U+00A0 devant le deux-points.</summary>
        private static Dictionary<string, string> BundleDuDesign() => new Dictionary<string, string>
        {
            { "hl.outcome.damaged_building.executed", "Les travaux sont lancés et payés pour {n, plural, one {# local} other {# locaux}}. L’activité reprend à la fin du chantier." },
            { "hl.outcome.severed_route.executed", "{n, plural, one {Le chantier de la route est lancé et payé.} other {Les chantiers des # routes sont lancés et payés.}} Les livraisons repassent à la fin des travaux." },
            { "hl.outcome.legal_case.executed", "L’avocat a négocié un arrangement. L’affaire se solde à moindre peine." },
            { "hl.outcome.mycelial_stressed_leg.executed", "{n, plural, one {L’entretien du maillon est lancé et payé.} other {L’entretien des # maillons est lancé et payé.}} La marchandise y repasse à la fin du chantier." },
            { "hl.after_choice.partial_stop", "Fait pour {n} sur {total} : " },
            { "hl.after_choice.noted", "Rien ne bouge. On en reparlera si ça empire." },
            { "error.hl_card.not_found", "Cette carte n’est plus là." },
            { "error.hl_card.already_resolved", "C’était déjà tranché" },
            { "error.hl_card.nothing_to_act_on", "Plus rien à faire sur cette carte." },
        };

        private static CommitResponseDto Reponse(string outcome, string cleMot, int faits, string arretId = "", string cleArret = "") => new CommitResponseDto
        {
            committed = true, outcome = outcome, outcome_i18n_key = cleMot,
            executed_ids = Enumerable.Range(0, faits).Select(i => "t" + i).ToArray(),
            stopped_at_id = arretId, stopped_at_i18n_key = cleArret, navigate_ids = new string[0],
        };

        [Test]
        public void ExecutedSansArret_RendLaPhraseServie_AvecN()
        {
            try
            {
                I18nCatalog.ChargerPourTest("fr", BundleDuDesign());
                Assert.AreEqual("Les travaux sont lancés et payés pour 2 locaux. L’activité reprend à la fin du chantier.",
                    ApresGesteHl.Mot(Reponse("executed", "hl.outcome.damaged_building.executed", 2), 2));
                Assert.AreEqual("Les travaux sont lancés et payés pour 1 local. L’activité reprend à la fin du chantier.",
                    ApresGesteHl.Mot(Reponse("executed", "hl.outcome.damaged_building.executed", 1), 1), "n = 1 : la branche `one`");
                Assert.AreEqual("Les chantiers des 3 routes sont lancés et payés. Les livraisons repassent à la fin des travaux.",
                    ApresGesteHl.Mot(Reponse("executed", "hl.outcome.severed_route.executed", 3), 3));
                Assert.AreEqual("L’entretien du maillon est lancé et payé. La marchandise y repasse à la fin du chantier.",
                    ApresGesteHl.Mot(Reponse("executed", "hl.outcome.mycelial_stressed_leg.executed", 1), 1));
                Assert.AreEqual("L’avocat a négocié un arrangement. L’affaire se solde à moindre peine.",
                    ApresGesteHl.Mot(Reponse("executed", "hl.outcome.legal_case.executed", 1), 1), "105 : aucun paramètre");
            }
            finally { I18nCatalog.Oublier(); }
        }

        [Test]
        public void ArretPartiel_PrefixeServi_PuisLaPhraseJoueurDeLErreur_JamaisLeCodeBrut()
        {
            try
            {
                I18nCatalog.ChargerPourTest("fr", BundleDuDesign());
                CommitResponseDto d = Reponse("executed", "hl.after_choice.partial_stop", 1, "t1", "error.hl_card.not_found");
                d.stopped_at_error = "RESOURCE_NOT_FOUND";
                string mot = ApresGesteHl.Mot(d, 3);
                Assert.AreEqual("Fait pour 1 sur 3 : Cette carte n’est plus là.", mot);
                StringAssert.DoesNotContain("RESOURCE_NOT_FOUND", mot, "le code brut n'est jamais montré");
                Assert.IsTrue(ApresGesteHl.ArretPartiel(d));

                // `target_count` non lu (0) : le dénominateur reste un entier cohérent, jamais « sur 0 » ni une accolade
                Assert.AreEqual("Fait pour 1 sur 2 : Cette carte n’est plus là.", ApresGesteHl.Mot(d, 0));

                // une clé d'arrêt GÉNÉRIQUE (ou non servie) ne dit rien de plus que le préfixe SERVI, sans son « : » final — jamais une phrase de repli du client (f2 11/11)
                d.stopped_at_i18n_key = "error.resource.not_found";
                Assert.AreEqual("Fait pour 1 sur 3", ApresGesteHl.Mot(d, 3));
                d.stopped_at_i18n_key = "";
                Assert.AreEqual("Fait pour 1 sur 3", ApresGesteHl.Mot(d, 3), "aucune clé d'arrêt : le préfixe seul");
                d.stopped_at_i18n_key = "error.hl_card.inconnue";
                Assert.AreEqual("Fait pour 1 sur 3", ApresGesteHl.Mot(d, 3), "clé non servie : le préfixe seul");
            }
            finally { I18nCatalog.Oublier(); }
        }

        [Test]
        public void Noted_Navigate_EtCleNonServie_NeDisentJamaisUnMotInvente()
        {
            try
            {
                I18nCatalog.ChargerPourTest("fr", BundleDuDesign());
                Assert.AreEqual("Rien ne bouge. On en reparlera si ça empire.", ApresGesteHl.Mot(Reponse("noted", "hl.after_choice.noted", 0), 2));
                Assert.IsNull(ApresGesteHl.Mot(Reponse("navigate", null, 0), 0), "navigate : clé NULLE (D6), aucun mot d'après-geste");
                Assert.IsNull(ApresGesteHl.Mot(Reponse("navigate", "", 0), 0));
                Assert.IsNull(ApresGesteHl.Mot(null, 2));
                Assert.IsNull(ApresGesteHl.Mot(Reponse("executed", "hl.outcome.inconnue.executed", 1), 1), "clé non servie : rien, jamais un mot dérivé côté client");
            }
            finally { I18nCatalog.Oublier(); }
        }

        /// <summary>CONTRÔLE POSITIF du paramètre : sans `n`, le résolveur ICU rend l'accolade BRUTE — la raison pour laquelle `Parametres` pose toujours
        /// `n` et `total` en entiers de chaîne. Une version qui oublierait `n` rougirait ici avant de rougir à l'écran.</summary>
        [Test]
        public void ControlePositif_SansN_LePluriel_RendLAccoladeBrute()
        {
            try
            {
                I18nCatalog.ChargerPourTest("fr", BundleDuDesign());
                string sans = I18nCatalog.Traduire("hl.outcome.damaged_building.executed", null);
                StringAssert.Contains("{", sans, "le défaut qu'on évite : l'accolade brute à l'écran");
                string avec = ApresGesteHl.Mot(Reponse("executed", "hl.outcome.damaged_building.executed", 2), 2);
                Assert.AreEqual(-1, avec.IndexOfAny(new[] { '{', '}' }), "avec `n` posé, aucune accolade");
                var p = ApresGesteHl.Parametres(Reponse("executed", "x", 2), 5);
                Assert.AreEqual("2", p["n"]);
                Assert.AreEqual("5", p["total"]);
                Assert.IsTrue(p.Values.All(v => long.TryParse(v, out _)), "chaque paramètre est un entier en chaîne");
            }
            finally { I18nCatalog.Oublier(); }
        }

        // ------------------------------------------------------------------ la VUE des cadres 6-7 (pure)

        private static HlCardDto Carte(bool structurelle = false) => new HlCardDto
        {
            card_id = "c1", decision_type_key = "DAMAGED_BUILDING", impact_bucket = "major", urgency_bucket = "pressing", structural = structurelle, target_count = 2,
        };

        private static ApresGesteHl.IssueDuGeste Ok(CommitResponseDto d, bool structurelle = false) => new ApresGesteHl.IssueDuGeste { Carte = Carte(structurelle), Reponse = d };

        private static ApresGesteHl.IssueDuGeste Refus(string cle, string phrase) => new ApresGesteHl.IssueDuGeste { Carte = Carte(), CleDeRefus = cle, PhraseDeRefus = phrase };

        [Test]
        public void Vue_Executee_CadreSix_TrancheeAvecTampon_MotServi_LigneSelonLaFile()
        {
            try
            {
                I18nCatalog.ChargerPourTest("fr", BundleDuDesign());
                var d = Reponse("executed", "hl.outcome.damaged_building.executed", 2);
                ApresGesteHl.VueApres v = ApresGesteHl.Vue(Ok(d), 2, 0, null);
                Assert.AreEqual(ApresGesteHl.Issue.Executee, v.Issue);
                Assert.AreEqual("Vous avez tranché", v.Grave);
                Assert.AreEqual("Les travaux sont lancés et payés pour 2 locaux. L’activité reprend à la fin du chantier.", v.Mot);
                Assert.IsFalse(v.MotRouge);
                Assert.IsTrue(v.CarteTranchee); Assert.IsTrue(v.Tampon); Assert.IsFalse(v.Deja);
                Assert.AreEqual("Retour à l’accueil", v.Action);
                Assert.AreEqual("Rien d’autre à trancher pour l’instant.", v.SousLigne, "file vide");
                Assert.AreEqual("Plusieurs attendent encore", ApresGesteHl.Vue(Ok(d), 2, 3, null).SousLigne, "file non vide : un MOT, jamais un chiffre");
                // arrêt partiel : le préfixe servi (+ la phrase servie de l'erreur) ; y compris sans phrase servie : le préfixe SEUL, sans « : »
                var p = Reponse("executed", "hl.after_choice.partial_stop", 1, "t1", "error.hl_card.not_found");
                Assert.AreEqual("Fait pour 1 sur 2\u00a0: Cette carte n’est plus là.", ApresGesteHl.Vue(Ok(p), 2, 0, null).Mot, "le préfixe servi porte son U+00A0 devant le deux-points");
                p.stopped_at_i18n_key = "";
                Assert.AreEqual("Fait pour 1 sur 2", ApresGesteHl.Vue(Ok(p), 2, 0, null).Mot);
            }
            finally { I18nCatalog.Oublier(); }
        }

        [Test]
        public void Vue_Notee_DitCEstNote_Navigate_EtCleNonServie_NeDonnentAucuneVue()
        {
            try
            {
                I18nCatalog.ChargerPourTest("fr", BundleDuDesign());
                ApresGesteHl.VueApres v = ApresGesteHl.Vue(Ok(Reponse("noted", "hl.after_choice.noted", 0)), 2, 0, null);
                Assert.AreEqual(ApresGesteHl.Issue.Notee, v.Issue);
                Assert.AreEqual("C’est noté", v.Grave);
                Assert.AreEqual("Rien ne bouge. On en reparlera si ça empire.", v.Mot);
                Assert.IsTrue(v.Tampon, "la carte est tranchée (committed)");
                Assert.IsNull(ApresGesteHl.Vue(Ok(Reponse("navigate", null, 0)), 0, 0, null), "navigate : aucun mot servi, aucune vue — la carte remonte tout de suite (TD-938)");
                Assert.IsNull(ApresGesteHl.Vue(Ok(Reponse("executed", "hl.outcome.inconnue.executed", 1)), 1, 0, null), "clé non servie : rien, jamais un mot du client");
                Assert.IsNull(ApresGesteHl.Vue(null, 0, 0, null));
                Assert.IsNull(ApresGesteHl.Vue(Refus(null, null), 0, 0, null), "refus sans clé servie (réseau) : rien à lire, le refus se dit sur place");
            }
            finally { I18nCatalog.Oublier(); }
        }

        [Test]
        public void Vue_LesTroisCodesHlCard_EtLEchecDeLaPremiereCible()
        {
            try
            {
                I18nCatalog.ChargerPourTest("fr", BundleDuDesign());
                // 409 déjà tranché : le TITRE servi en grave, aucun mot-or, la pastille, PAS de tampon neuf
                ApresGesteHl.VueApres dj = ApresGesteHl.Vue(Refus(ApresGesteHl.CleDejaTranchee, "C’était déjà tranché"), 2, 0, null);
                Assert.AreEqual(ApresGesteHl.Issue.DejaTranchee, dj.Issue);
                Assert.AreEqual("C’était déjà tranché", dj.Grave);
                Assert.IsNull(dj.Mot); Assert.IsTrue(dj.Deja); Assert.IsFalse(dj.Tampon);
                // 404 (y c. carte `superseded`, B1) et 409 « rien à agir » : aucun grave, le mot = la phrase SERVIE
                ApresGesteHl.VueApres nf = ApresGesteHl.Vue(Refus(ApresGesteHl.CleIntrouvable, "Cette carte n’est plus là."), 2, 0, null);
                Assert.AreEqual(ApresGesteHl.Issue.Disparue, nf.Issue);
                Assert.IsNull(nf.Grave); Assert.AreEqual("Cette carte n’est plus là.", nf.Mot); Assert.IsFalse(nf.Tampon); Assert.IsFalse(nf.MotRouge);
                ApresGesteHl.VueApres ra = ApresGesteHl.Vue(Refus(ApresGesteHl.CleRienAFaire, "Plus rien à faire sur cette carte."), 2, 0, null);
                Assert.AreEqual(ApresGesteHl.Issue.RienAFaire, ra.Issue);
                Assert.IsNull(ra.Grave); Assert.AreEqual("Plus rien à faire sur cette carte.", ra.Mot);
                // l'échec de la 1ʳᵉ cible : la carte RESTE (ni tampon ni .tranchee), mot rouge = la phrase SERVIE de la route
                ApresGesteHl.VueApres ec = ApresGesteHl.Vue(Refus("error.core_loops.structural_cap_exhausted", "Votre décision du jour est déjà prise."), 2, 0, null);
                Assert.AreEqual(ApresGesteHl.Issue.CarteReste, ec.Issue);
                Assert.AreEqual("La carte reste sur la table", ec.Grave);
                Assert.AreEqual("Votre décision du jour est déjà prise.", ec.Mot); Assert.IsTrue(ec.MotRouge);
                Assert.IsFalse(ec.Tampon); Assert.IsFalse(ec.CarteTranchee);
                Assert.AreEqual("La carte vous attend encore.", ec.SousLigne);
                // sans phrase servie (clé générique) : la phrase EXISTANTE de la carte, jamais « Rien n'est parti : … »
                Assert.AreEqual("La décision n’a pas été prise.", ApresGesteHl.Vue(Refus("error.resource.state_conflict", null), 2, 0, null).Mot);
            }
            finally { I18nCatalog.Oublier(); }
        }

        [Test]
        public void LeJeton_TroisEtats_SansChiffre_EtLaStructurelleTrancheeLePrend()
        {
            Assert.AreEqual(ApresGesteHl.EtatDuJeton.Libre, ApresGesteHl.Jeton(null, false));
            Assert.AreEqual(ApresGesteHl.EtatDuJeton.Libre, ApresGesteHl.Jeton(new StructuralBudgetDto { used = 0, cap_reached = false }, false));
            Assert.AreEqual(ApresGesteHl.EtatDuJeton.Pris, ApresGesteHl.Jeton(new StructuralBudgetDto { used = 1, cap_reached = true }, false));
            Assert.AreEqual(ApresGesteHl.EtatDuJeton.FermeeAujourdhui, ApresGesteHl.Jeton(new StructuralBudgetDto { used = 0, cap_reached = true }, false), "cap atteint ET used = 0");
            Assert.AreEqual(ApresGesteHl.EtatDuJeton.Pris, ApresGesteHl.Jeton(new StructuralBudgetDto { used = 0, cap_reached = false }, true), "une carte structurelle vient d'être tranchée : le budget lu à l'ouverture est périmé");
            try
            {
                I18nCatalog.ChargerPourTest("fr", BundleDuDesign());
                var ouverture = new StructuralBudgetDto { used = 0, cap_reached = false };
                var d = Reponse("executed", "hl.outcome.damaged_building.executed", 1); d.structural = true;
                Assert.AreEqual(ApresGesteHl.EtatDuJeton.Pris, ApresGesteHl.Vue(Ok(d, true), 1, 0, ouverture).Jeton);
                d.structural = false;
                Assert.AreEqual(ApresGesteHl.EtatDuJeton.Libre, ApresGesteHl.Vue(Ok(d), 1, 0, ouverture).Jeton, "tactique : le jeton ne bouge pas");
                // PROVENANCE (f2 11/11) : « pris » vient de `commit.structural` + `commit.committed`, PAS du budget — il se pose même sans budget, et chacune des deux clés compte
                d.structural = true;
                Assert.AreEqual(ApresGesteHl.EtatDuJeton.Pris, ApresGesteHl.Vue(Ok(d, true), 1, 0, null).Jeton, "sans budget du tout : `structural` + `committed` suffisent");
                d.committed = false;
                Assert.AreEqual(ApresGesteHl.EtatDuJeton.Libre, ApresGesteHl.Vue(Ok(d, true), 1, 0, ouverture).Jeton, "structurelle mais NON `committed` : le jeton ne se prend pas");
                d.committed = true; d.structural = false;
                Assert.AreEqual(ApresGesteHl.EtatDuJeton.Libre, ApresGesteHl.Vue(Ok(d, true), 1, 0, null).Jeton, "`committed` sans `structural` (la carte du client dit structurelle, la RÉPONSE non) : la réponse décide");
                Assert.AreEqual("libre", ApresGesteHl.MotDuJeton(ApresGesteHl.EtatDuJeton.Libre));
                Assert.AreEqual("pris", ApresGesteHl.MotDuJeton(ApresGesteHl.EtatDuJeton.Pris));
                Assert.AreEqual("fermée aujourd’hui", ApresGesteHl.MotDuJeton(ApresGesteHl.EtatDuJeton.FermeeAujourdhui));
                Assert.AreEqual("votre grande décision du jour", ApresGesteHl.PetitTexteDuJeton());
            }
            finally { I18nCatalog.Oublier(); }
        }

        /// <summary>DÉTECTEUR (f2 11/11) du repli transitoire : un VRAI corps de refus (`user_facing_i18n_key`) lu par `RefusServi` (clé + phrase) puis passé à `Vue` — le chemin que `HlCardClient`
        /// emprunte. Un 409 `already_resolved` SERVI doit rendre « C’était déjà tranché » (cadre 6, pastille, pas de tampon neuf) et JAMAIS « La carte reste sur la table » (cadre 7) ; le même
        /// 409 avec la clé GÉNÉRIQUE (le back d'avant le lot) tombe, lui, dans le cadre 7 — le CONTRÔLE POSITIF : si ce second cas cessait de se distinguer du premier, le détecteur ne verrait plus rien.</summary>
        [Test]
        public void Detecteur_Un409AlreadyResolvedServi_RendDejaTranche_PasLeCadreSept()
        {
            try
            {
                I18nCatalog.ChargerPourTest("fr", BundleDuDesign());
                const string servi = "{\"error\":{\"code\":\"HL_CARD_ALREADY_RESOLVED\",\"user_facing_i18n_key\":\"error.hl_card.already_resolved\"}}";
                const string ancien = "{\"error\":{\"code\":\"RESOURCE_STATE_CONFLICT\",\"user_facing_i18n_key\":\"error.resource.state_conflict\"}}";
                ApresGesteHl.VueApres v = ApresGesteHl.Vue(new ApresGesteHl.IssueDuGeste { Carte = Carte(), CleDeRefus = RefusServi.Cle(servi), PhraseDeRefus = RefusServi.Phrase(servi) }, 2, 0, null);
                Assert.AreEqual(ApresGesteHl.Issue.DejaTranchee, v.Issue, "409 already_resolved SERVI : le cadre 6 « déjà tranché »");
                Assert.AreEqual("C’était déjà tranché", v.Grave);
                Assert.IsTrue(v.Deja); Assert.IsFalse(v.Tampon); Assert.IsNull(v.Mot);
                Assert.AreNotEqual("La carte reste sur la table", v.Grave, "jamais le cadre 7 pour un 409 servi");

                ApresGesteHl.VueApres t = ApresGesteHl.Vue(new ApresGesteHl.IssueDuGeste { Carte = Carte(), CleDeRefus = RefusServi.Cle(ancien), PhraseDeRefus = RefusServi.Phrase(ancien) }, 2, 0, null);
                Assert.AreEqual(ApresGesteHl.Issue.CarteReste, t.Issue, "CONTRÔLE POSITIF : la clé générique d'avant le lot tombe dans le cadre 7 — le détecteur distingue bien les deux");
                Assert.AreNotEqual(v.Issue, t.Issue);
            }
            finally { I18nCatalog.Oublier(); }
        }
    }
}
