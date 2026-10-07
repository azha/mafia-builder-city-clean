using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational.Selling;

namespace MafiaCleanCity.CityMap.Tests
{
    // COLLECTE (CLIENT-1, 07/10) — le ramassage de la caisse d'un dealer, dit par des BANDES et des CODES. Contrat lu dans le back
    // (BACK-1, lot/boucle-argent @615ca764, PAS déployé), textes : tables 75 (71747158) et 85 (91d40c01) de l'atelier. HORS RÉSEAU.
    //   C1  les cinq mots de bande, adressés par la valeur servie ; une valeur inconnue rend « — »
    //   C2  la phrase de succès : avec nom, sans nom, tout ramassé ; sans bandes servies ⇒ null (l'écran garde sa phrase d'avant)
    //   C3  la phrase de refus par CODE (trois codes partagent le 409) ; tout le reste dit la table 85 n° 7
    //   C4  GARDE : les clés `vente.bloc.*` de CAISSE ne sont plus lues (la jauge se dit par `vente.caisse.bande.<valeur>`)
    //   C5  le `code` du refus se lit dans `payload.error`, jamais dans un `code` imbriqué
    //   C6  le 409 GÉNÉRIQUE seul se réessaie, une fois, en silence
    //   C7  les DTO : la réponse a EXACTEMENT 5 clés ; le CORPS de la requête n'en porte qu'une (le back rejette tout champ inconnu)
    //   C8  les deux écrans disent la phrase de succès par `CollecteMots`, et plus par leurs littéraux d'avant
    [Category("CollecteMots")]
    public class CollecteMotsPlayModeTests
    {
        private const string Nbsp = " ";

        [SetUp]
        public void SansCatalogue() => Libelle.RemettreLesCompteurs();

        [Test]
        public void C1_LesCinqMotsDeBande_ParLaValeurServie()
        {
            CollectionAssert.AreEqual(new[] { "NONE", "LOW", "MODERATE", "HIGH", "FULL" }, CollecteMots.Bandes,
                "la liste FERMÉE du back (`cash-band.ts:37`), recopiée");
            CollectionAssert.AreEqual(new[] { "plus rien", "une petite somme", "une somme correcte", "une grosse somme", "tout ce qu’elle peut tenir" },
                CollecteMots.Bandes.Select(CollecteMots.Bande).ToArray(), "les mots de la table 75, un par valeur");
            Assert.AreEqual(5, CollecteMots.Bandes.Select(CollecteMots.Bande).Distinct().Count(), "cinq valeurs, cinq mots (« PLEINE » n'est plus donné à HIGH)");
            Assert.AreEqual("—", CollecteMots.Bande("OVERFLOW"), "une valeur neuve se voit comme inconnue, elle ne se déguise pas");
            Assert.AreEqual("—", CollecteMots.Bande(null));
            Assert.IsTrue(Libelle.ClesEnRepli.Contains("vente.caisse.bande.full"), "la clé est dérivée de la VALEUR servie : vente.caisse.bande.<valeur>");
        }

        [Test]
        public void C2_LaPhraseDeSucces_AvecNom_SansNom_ToutRamasse_SansBandes()
        {
            Assert.AreEqual("Ramassé" + Nbsp + ": une grosse somme. Encore chez Dov" + Nbsp + ": une petite somme.",
                CollecteMots.PhraseDeSucces("HIGH", "LOW", "Dov"));
            Assert.AreEqual("Ramassé" + Nbsp + ": une grosse somme. Encore chez le dealer" + Nbsp + ": une somme correcte.",
                CollecteMots.PhraseDeSucces("HIGH", "MODERATE", null), "sans nom servi : « chez le dealer »");
            Assert.AreEqual(CollecteMots.PhraseDeSucces("HIGH", "MODERATE", null), CollecteMots.PhraseDeSucces("HIGH", "MODERATE", "  "));
            Assert.AreEqual("Tout est ramassé" + Nbsp + ": tout ce qu’elle peut tenir.",
                CollecteMots.PhraseDeSucces("FULL", "NONE", "Dov"), "remaining_band = NONE ⇒ « Tout est ramassé »");
            Assert.IsNull(CollecteMots.PhraseDeSucces(null, "LOW", "Dov"), "un back antérieur au lot ne sert pas les bandes");
            Assert.IsNull(CollecteMots.PhraseDeSucces("LOW", "", "Dov"));
            StringAssert.DoesNotContain("€", CollecteMots.PhraseDeSucces("HIGH", "LOW", "Dov"), "jamais un montant (R2.2)");
            Assert.IsFalse(Regex.IsMatch(CollecteMots.PhraseDeSucces("HIGH", "LOW", "Dov"), @"\d"), "jamais un nombre");
        }

        [Test]
        public void C3_LaPhraseDeRefus_ParCode()
        {
            Assert.AreEqual("La planque est pleine" + Nbsp + ": blanchissez d’abord, pour faire de la place.",
                CollecteMots.PhraseDeRefus(CollecteMots.CodePlanquePleine, null));
            Assert.AreEqual("La caisse du dealer est vide.", CollecteMots.PhraseDeRefus(CollecteMots.CodeCaisseVide, null));
            Assert.AreEqual("La caisse de Dov est vide.", CollecteMots.PhraseDeRefus(CollecteMots.CodeCaisseVide, "Dov"));
            string repli = "La collecte n’a pas abouti.";
            Assert.AreEqual(repli, CollecteMots.PhraseDeRefus(null, null), "un 409 SANS code spécifique tombe sur la table 85 n° 7");
            Assert.AreEqual(repli, CollecteMots.PhraseDeRefus(CollecteMots.CodeConflitGenerique, null));
            Assert.AreEqual(repli, CollecteMots.PhraseDeRefus("AUTRE_CODE", "Dov"));
            Assert.AreEqual("il ne vend plus tant qu’on ne ramasse pas", CollecteMots.DitLePlafond());
        }

        // ── C4 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

        private static readonly Regex AncienneCaisse = new Regex(
            "Libelle\\.De\\(\\s*\"vente\"\\s*,\\s*\"bloc\"\\s*,\\s*\"(VIDE|PEU|MOYENNE|PLEINE|DÉBORDE)\"|vente\\.bloc\\.(vide|peu|moyenne|pleine|deborde)\\b");

        [Test]
        public void C4_GardeDeClasse_LesClesVenteBlocDeCaisse_NeSontPlusLues()
        {
            Assert.IsTrue(AncienneCaisse.IsMatch("b == \"HIGH\" ? MafiaCleanCity.I18n.Libelle.De(\"vente\", \"bloc\", \"PLEINE\") : \"—\""),
                "contrôle positif : l'ancienne lecture par le mot est vue");
            Assert.IsTrue(AncienneCaisse.IsMatch("Libelle.Gabarit(\"vente.bloc.deborde\", \"DÉBORDE\")"), "…et par la clé écrite");
            Assert.IsFalse(AncienneCaisse.IsMatch("Libelle.De(\"vente\", \"bloc\", \"RAMASSER\")"), "contrôle négatif : un autre mot du bloc n'est pas la caisse");
            Assert.IsFalse(AncienneCaisse.IsMatch("Libelle.ParValeur(\"vente\", \"caisse.bande\", b, \"x\")"));

            var lecteurs = Directory.GetFiles(Path.Combine(Application.dataPath, "Scripts"), "*.cs", SearchOption.AllDirectories)
                .Where(f => AncienneCaisse.IsMatch(File.ReadAllText(f))).Select(Path.GetFileName).ToList();
            Assert.IsEmpty(lecteurs, "ces fichiers lisent encore la caisse par `vente.bloc.<mot>` : « PLEINE » à HIGH et « DÉBORDE » à FULL sont faux — " +
                string.Join(", ", lecteurs));
        }

        [Test]
        public void C5_LeCodeDuRefus_SeLitDansPayloadError()
        {
            const string corps = "{\"payload\":{\"error\":{\"code\":\"SELLING_CASH_EMPTY\",\"http_status\":409,\"user_facing_i18n_key\":\"error.selling.cash_empty\"," +
                                 "\"payload_vars\":{},\"details\":{\"code\":\"AUTRE\"},\"message\":\"x\"}}}";
            Assert.AreEqual("SELLING_CASH_EMPTY", RefusServi.Code(corps));
            Assert.AreEqual("RESOURCE_STATE_CONFLICT", RefusServi.Code("{\"payload\":{\"error\":{ \"code\": \"RESOURCE_STATE_CONFLICT\" }}}"));
            Assert.IsNull(RefusServi.Code("{\"payload\":{\"data\":{\"code\":\"X\"}}}"), "un `code` hors de payload.error n'est pas un refus");
            Assert.IsNull(RefusServi.Code("{\"payload\":{\"error\":{\"http_status\":409}}}"));
            Assert.IsNull(RefusServi.Code(""));
            Assert.IsNull(RefusServi.Code(null));
        }

        [Test]
        public void C5b_LeCode_SeLitSurLeCorpsComplet_QuelQueSoitLOrdreDesCles()
        {
            // le corps d'erreur COMPLET, les 9 clés de `payload.error` (protocol/envelope.ts:113-123), `code` en tête
            const string complet = "{\"payload\":{\"error\":{\"code\":\"SELLING_SAFEHOUSE_FULL\",\"http_status\":409,\"user_facing_i18n_key\":\"error.selling.safehouse_full\"," +
                                   "\"payload_vars\":{},\"details\":{\"code\":\"LEURRE\",\"liste\":[{\"code\":\"AUTRE\"}]},\"message\":\"la planque est pleine\"," +
                                   "\"trace\":\"x\",\"retryable_class\":\"AFTER_USER_ACTION\",\"retry_after_s\":null}},\"response_meta\":{\"code\":\"META\"}}";
            Assert.AreEqual("SELLING_SAFEHOUSE_FULL", RefusServi.Code(complet));
            // les MÊMES clés dans un autre ordre : `details` (avec son `code` imbriqué) et `message` (avec des guillemets échappés) AVANT `code`
            const string melange = "{\"payload\":{\"error\":{\"details\":{\"code\":\"LEURRE\",\"x\":{\"code\":\"PIRE\"}},\"message\":\"dit \\\"code\\\": X\"," +
                                   "\"retry_after_s\":null,\"http_status\":409,\"code\":\"RESOURCE_STATE_CONFLICT\",\"trace\":\"t\"}}}";
            Assert.AreEqual("RESOURCE_STATE_CONFLICT", RefusServi.Code(melange), "le `code` de premier niveau, jamais celui d'un `details` imbriqué, où qu'il soit");
            Assert.IsNull(RefusServi.Code("{\"payload\":{\"error\":{\"details\":{\"code\":\"LEURRE\"},\"http_status\":409}}}"),
                "pas de `code` de premier niveau : null (le `code` imbriqué d'un `details` n'est pas le refus)");
            Assert.IsNull(RefusServi.Code("{\"payload\":{\"error\":{\"code\":\"\"}}}"), "un code vide n'est pas un code");
        }

        [Test]
        public void C10_LaPhraseAvecPrenom_Gagne_QuandLePrenomEstConnu()
        {
            Assert.AreEqual("La caisse de Dov est vide.", CollecteMots.PhraseAvecPrenom(CollecteMots.CodeCaisseVide, "Dov"),
                "m1 : la phrase servie `error.selling.cash_empty` est sans nom ; avec le prénom, celle de la table 75 n° 4 gagne");
            Assert.IsNull(CollecteMots.PhraseAvecPrenom(CollecteMots.CodeCaisseVide, null), "sans prénom : la phrase servie, puis la 4b");
            Assert.IsNull(CollecteMots.PhraseAvecPrenom(CollecteMots.CodeCaisseVide, " "));
            Assert.IsNull(CollecteMots.PhraseAvecPrenom(CollecteMots.CodePlanquePleine, "Dov"), "seule la caisse vide porte un nom");
            Assert.IsNull(CollecteMots.PhraseAvecPrenom(null, "Dov"));
        }

        [Test]
        public void C11_Le409Generique_ForceLaN7_LaPhraseServieEstSautee()
        {
            const string servie = "Un conflit de ressource est survenu.";   // ce que le bundle servirait pour error.resource.state_conflict
            string n7 = "La collecte n\u2019a pas abouti.";
            Assert.AreEqual(n7, CollecteMots.PhraseFinaleDeRefus(CollecteMots.CodeConflitGenerique, servie, "Dov"),
                "n1 : sur un RESOURCE_STATE_CONFLICT (déjà réessaye une fois) la n° 7 est forcée, la servie ET le prénom sont sautés");
            Assert.AreEqual(servie, CollecteMots.PhraseFinaleDeRefus(CollecteMots.CodePlanquePleine, servie, "Dov"), "un autre code : la servie passe avant le repli par code");
            Assert.AreEqual("La caisse de Dov est vide.", CollecteMots.PhraseFinaleDeRefus(CollecteMots.CodeCaisseVide, "La caisse est vide.", "Dov"),
                "caisse vide + prénom : la phrase avec prénom gagne sur la servie sans nom (m1)");
            Assert.AreEqual("La caisse est vide.", CollecteMots.PhraseFinaleDeRefus(CollecteMots.CodeCaisseVide, "La caisse est vide.", null));
            Assert.AreEqual("La planque est pleine" + Nbsp + ": blanchissez d\u2019abord, pour faire de la place.",
                CollecteMots.PhraseFinaleDeRefus(CollecteMots.CodePlanquePleine, null, null), "rien de servi : la phrase par code");
            Assert.AreEqual(n7, CollecteMots.PhraseFinaleDeRefus(null, null, null));
        }

        [Test]
        public void C6_LeConflitGenerique_SeReessaieUneFois_Seul()
        {
            Assert.IsTrue(CollecteMots.ReessayerEnSilence(409, CollecteMots.CodeConflitGenerique));
            Assert.IsFalse(CollecteMots.ReessayerEnSilence(409, CollecteMots.CodeCaisseVide), "rien n'a changé à attendre : c'est une phrase à dire");
            Assert.IsFalse(CollecteMots.ReessayerEnSilence(409, CollecteMots.CodePlanquePleine));
            Assert.IsFalse(CollecteMots.ReessayerEnSilence(409, null));
            Assert.IsFalse(CollecteMots.ReessayerEnSilence(500, CollecteMots.CodeConflitGenerique), "le code ne suffit pas : c'est un 409");
            Assert.IsTrue(RefusServi.EstGenerique("error.resource.state_conflict"),
                "la clé du 409 générique est de la famille générique : aucune phrase servie, l'écran dit la sienne");
        }

        // ── C7 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

        [Test]
        public void C7_LesDto_LaReponseACinqCles_LeCorpsEnPorteUne()
        {
            const string reponse = "{\"payload\":{\"data\":{\"dealer_id\":\"d1\",\"safehouse_id\":\"s1\",\"collected_band\":\"HIGH\",\"remaining_band\":\"LOW\"," +
                                   "\"dealer_name_i18n\":{\"key\":\"game.fiction.dealer.name\",\"params\":{\"prenom\":\"Dov\"}}}}}";
            CollectData d = JsonUtility.FromJson<CollectEnvelope>(reponse).payload.data;
            Assert.AreEqual("d1", d.dealer_id);
            Assert.AreEqual("s1", d.safehouse_id);
            Assert.AreEqual("HIGH", d.collected_band);
            Assert.AreEqual("LOW", d.remaining_band);
            Assert.AreEqual("Dov", d.Prenom);
            Assert.AreEqual(5, typeof(CollectData).GetFields(BindingFlags.Public | BindingFlags.Instance).Length,
                "EXACTEMENT les 5 clés du contrat (selling.controller.ts:125-131) : une sixième déclarée serait servie par personne");

            var dCityMap = JsonUtility.FromJson<DistrictCollectEnvelope>(reponse).payload.data;
            Assert.AreEqual("HIGH", dCityMap.collected_band);
            Assert.AreEqual("Dov", dCityMap.dealer_name_i18n.@params.prenom);

            CollectData ancien = JsonUtility.FromJson<CollectEnvelope>("{\"payload\":{\"data\":{\"safehouse_id\":\"s1\"}}}").payload.data;
            Assert.IsNull(ancien.collected_band, "un back antérieur au lot : pas de bande");
            Assert.IsNull(ancien.Prenom);

            Assert.AreEqual("{\"safehouse_id\":\"s1\"}", JsonUtility.ToJson(new CollectRequestDto { safehouse_id = "s1" }),
                "le CORPS de la requête : une seule clé — le back REJETTE tout champ inconnu");
            Assert.AreEqual("{\"safehouse_id\":\"s1\"}", JsonUtility.ToJson(new DistrictCollectRequestDto { safehouse_id = "s1" }));
        }

        // ── C9 — TD-757 ───────────────────────────────────────────────────────────────────────────────────────────────────────────

        [Test]
        public void C9_LePrenomDuDealer_ArriveDepuisLeCorpsReelDuBack()
        {
            // l'entrée `dealers[0]` du corps réel commité (22/09, back 03cf564c, compte operational_demo) : `name_i18n` y est un OBJET
            const string corps = "{\"payload\":{\"data\":{\"dealers\":[{\"dealer\":\"51844b17\",\"dealer_spot_id\":\"9ceece4a\"," +
                                 "\"name_i18n\":{\"key\":\"game.fiction.dealer.name\",\"params\":{\"prenom\":\"Dov\"}},\"activity_band\":\"WORKING\"," +
                                 "\"cash_band\":\"MODERATE\",\"substance\":\"BRINDLE\",\"margin_band\":\"STANDARD\",\"addiction_loyalty_status\":null," +
                                 "\"withdrawn\":false,\"district_name\":\"La Lisi\u00e8re\",\"lek_band\":\"HIGH\",\"lane_band\":\"FAST\"}]}}}";
            DealerDto d = JsonUtility.FromJson<DealerListEnvelope>(corps).payload.data.dealers[0];
            Assert.AreEqual("Dov", d.Prenom, "le prénom ARRIVE : `name_i18n` est un objet, plus une chaîne que JsonUtility ne sait pas remplir");
            Assert.AreEqual("game.fiction.dealer.name", d.name_i18n.key);
            Assert.AreEqual("MODERATE", d.cash_band, "le reste du corps passe toujours");
            Assert.IsNull(JsonUtility.FromJson<DealerListEnvelope>(corps.Replace("\"prenom\":\"Dov\"", "\"prenom\":\"\"")).payload.data.dealers[0].Prenom,
                "un prénom vide n'est pas un nom");
            var d2 = JsonUtility.FromJson<DealerListEnvelope>("{\"payload\":{\"data\":{\"dealers\":[{\"dealer\":\"x\"}]}}}").payload.data.dealers[0];
            Assert.IsNull(d2.Prenom, "sans `name_i18n` servi : pas de nom, la forme sans nom");
        }

        // ── C8 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

        [Test]
        public void C8_LesDeuxEcrans_DisentLaPhraseDeSucces_ParCollecteMots()
        {
            string racine = Path.Combine(Application.dataPath, "Scripts");
            string vente = File.ReadAllText(Path.Combine(racine, "Operational", "Selling", "SellingScreenController.cs"));
            string fiche = File.ReadAllText(Path.Combine(racine, "CityMap", "DistrictInteriorScreenController.cs"));
            string clientFiche = File.ReadAllText(Path.Combine(racine, "CityMap", "CityProjectionsClient.cs"));
            StringAssert.Contains("CollecteMots.PhraseDeSucces(", vente);
            StringAssert.Contains("CollecteMots.PhraseDeSucces(", fiche);
            StringAssert.Contains("CollecteMots.PhraseDeRefus(", vente);
            StringAssert.Contains("CollecteMots.PhraseDeRefus(", clientFiche);
            StringAssert.Contains("ReessayerEnSilence(", clientFiche, "① réessaie le 409 générique, comme ㉟");
            foreach (string mort in new[] { "Cette caisse est vide ou la planque est pleine", "la caisse est vide ou la planque est pleine", "\"Collecte indisponible : \" + raison" })
            {
                StringAssert.DoesNotContain(mort, vente, "le littéral d'avant (« la caisse est vide OU la planque est pleine » ne dit pas laquelle)");
                StringAssert.DoesNotContain(mort, fiche);
                StringAssert.DoesNotContain(mort, clientFiche);
            }
        }
    }
}
