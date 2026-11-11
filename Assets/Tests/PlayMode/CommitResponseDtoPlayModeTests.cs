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

                // une clé d'arrêt GÉNÉRIQUE ne dit rien de plus que l'écran : la phrase de repli du client
                d.stopped_at_i18n_key = "error.resource.not_found";
                StringAssert.EndsWith(ApresGesteHl.PhraseDeRepli(), ApresGesteHl.Mot(d, 3));
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

        [Test]
        public void LEchecDeLaPremiereCible_DitRienNEstParti_AvecLaPhraseServieOuLeRepli()
        {
            try
            {
                I18nCatalog.ChargerPourTest("fr", BundleDuDesign());
                Assert.AreEqual("Rien n’est parti : ça n’a pas pu se faire pour l’instant.", ApresGesteHl.RienNEstParti(null));
                Assert.AreEqual("Rien n’est parti : Cette carte n’est plus là.", ApresGesteHl.RienNEstParti("Cette carte n’est plus là."));
                Assert.AreEqual(ApresGesteHl.RienNEstParti(null), ApresGesteHl.RienNEstParti("   "), "une phrase vide est un repli");
            }
            finally { I18nCatalog.Oublier(); }
        }
    }
}
