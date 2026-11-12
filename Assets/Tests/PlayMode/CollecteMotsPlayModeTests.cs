using System.Collections.Generic;
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
        public void SansCatalogue()
        {
            // SANS catalogue, pour de vrai : un bundle laissé chargé par une suite voisine servirait les clés et plus aucun repli ne se compterait
            // (revue ⊥ t2 I1 ; même porte que `ZeroRepliDesLocatairesPlayModeTests.SetUp`)
            I18nCatalog.Oublier();
            Libelle.RemettreLesCompteurs();
        }

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
        public void C12_LeSuccesSansBandes_PasseParLibelle_TD840()
        {
            Libelle.RemettreLesCompteurs();
            Assert.AreEqual("La caisse a rejoint votre planque.", CollecteMots.PhraseDeSuccesSansBandes(), "le repli est le texte d'avant, octet pour octet");
            Assert.IsTrue(Libelle.ClesEnRepli.Contains("vente.geste.la_caisse_a_rejoint_votre_planque"),
                "la phrase se COMPTE comme un repli : elle n'est plus un littéral que le cliquet et la garde zéro-repli ne voient pas");
            string racine = Path.Combine(Application.dataPath, "Scripts");
            foreach (string f in new[] { Path.Combine("Operational", "Selling", "SellingScreenController.cs"), Path.Combine("CityMap", "DistrictInteriorScreenController.cs") })
                StringAssert.DoesNotContain("\"La caisse a rejoint votre planque.\"", File.ReadAllText(Path.Combine(racine, f)), f + " : plus de littéral, la phrase passe par CollecteMots");
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
            StringAssert.Contains("CollecteMots.PhraseFinaleDeRefus(", vente, "n1 : ㉟ passe par la phrase finale (409 générique forcé, prénom, servie, code)");
            StringAssert.Contains("CollecteMots.PhraseDeRefus(", clientFiche);
            StringAssert.Contains("ReessayerEnSilence(", clientFiche, "① réessaie le 409 générique, comme ㉟");
            foreach (string mort in new[] { "Cette caisse est vide ou la planque est pleine", "la caisse est vide ou la planque est pleine", "\"Collecte indisponible : \" + raison" })
            {
                StringAssert.DoesNotContain(mort, vente, "le littéral d'avant (« la caisse est vide OU la planque est pleine » ne dit pas laquelle)");
                StringAssert.DoesNotContain(mort, fiche);
                StringAssert.DoesNotContain(mort, clientFiche);
            }
        }

        // ── V — ㉟ le coin, l'écoulement, la clientèle (CLIENT-3, 12/11 ; 11 mots ratifiés f2, atelier cadre 171 @73806af8) ─────────────

        private static (GameObject racine, SellingScreenController ecran) MonterLaVente()
        {
            GameObject racine = new GameObject("VenteMotsCanvas", typeof(RectTransform), typeof(Canvas));
            GameObject hote = new GameObject("Vente", typeof(RectTransform));
            hote.transform.SetParent(racine.transform, false);
            RectTransform rt = (RectTransform)hote.transform;   // étiré sous le Canvas, comme les montages éprouvés (revue ⊥ m4)
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one; rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
            return (racine, hote.AddComponent<SellingScreenController>());
        }

        /// <summary>Le texte du nœud `nom` placé sous le nœud `sous` de la rangée du dealer (« Caisse »/« Marge » → « Lib », « Val »), ou null.</summary>
        private static string DitSous(SellingScreenController ecran, string dealer, string sous, string nom)
        {
            TMPro.TextMeshProUGUI t = ecran.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true)
                .FirstOrDefault(x => x.name == nom && x.transform.parent != null && x.transform.parent.name == sous
                                     && x.GetComponentsInParent<Transform>(true).Any(p => p.name == "Dealer_" + dealer));
            return t == null ? null : t.text;
        }

        /// <summary>Le texte du nœud `nom` de la rangée du dealer, ou null si le nœud n'existe pas.</summary>
        private static string Dit(SellingScreenController ecran, string dealer, string nom)
        {
            TMPro.TextMeshProUGUI t = ecran.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true)
                .FirstOrDefault(x => x.name == nom && x.GetComponentsInParent<Transform>(true).Any(p => p.name == "Dealer_" + dealer));
            return t == null ? null : t.text;
        }

        [Test]
        public void V1_LesOnzeMots_ParLaValeurServie_EtRienPourUneValeurInconnue()
        {
            CollectionAssert.AreEqual(new[] { "ABSENT", "LOW", "MEDIUM", "HIGH" }, VenteMots.Coins, "`DealerLekBand` (selling.projection.service.ts:87), recopié");
            CollectionAssert.AreEqual(new[] { "FAST", "STEADY", "SCATTERED" }, VenteMots.Ecoulements, "`LaneClearingZone` (lane-clearing-zone.ts:31)");
            CollectionAssert.AreEqual(new[] { "LOW", "STABLE", "HIGH" }, VenteMots.Clienteles, "`HushLoyaltyStatus` (hush-addiction.service.ts:31)");
            CollectionAssert.AreEqual(new[] { "pas de coin ici", "coin mort", "du passage", "coin animé" }, VenteMots.Coins.Select(VenteMots.Coin).ToArray());
            CollectionAssert.AreEqual(new[] { "ça part vite", "ça s’écoule", "ça se disperse" }, VenteMots.Ecoulements.Select(VenteMots.Ecoulement).ToArray(),
                "« ça s’écoule » porte l'apostrophe typographique U+2019");
            CollectionAssert.AreEqual(new[] { "clientèle neuve", "des habitués", "clientèle accrochée" }, VenteMots.Clienteles.Select(VenteMots.Clientele).ToArray());
            Assert.AreEqual("resté à sec" + Nbsp + ": la clientèle a décroché", VenteMots.Perdue(), "U+00A0 avant « : »");

            CollectionAssert.AreEquivalent(new[]
            {
                "vente.coin.bande.absent", "vente.coin.bande.low", "vente.coin.bande.medium", "vente.coin.bande.high",
                "vente.ecoulement.bande.fast", "vente.ecoulement.bande.steady", "vente.ecoulement.bande.scattered",
                "vente.clientele.bande.low", "vente.clientele.bande.stable", "vente.clientele.bande.high",
                "vente.clientele.perdue",
            }, Libelle.ClesEnRepli.ToArray(), "les 11 clés ratifiées, dérivées de la VALEUR servie, et aucune autre");

            foreach (string inconnue in new[] { null, "", "VERY_HIGH", "high" })
            {
                Assert.IsNull(VenteMots.Coin(inconnue), "une valeur hors liste ne se déguise pas en mot");
                Assert.IsNull(VenteMots.Ecoulement(inconnue));
                Assert.IsNull(VenteMots.Clientele(inconnue));
            }
        }

        [Test]
        public void V2_LaRangee_DitLePrenom_LeLieu_LeCoin_LaMarge_LEcoulement_LaClientele()
        {
            var (racine, ecran) = MonterLaVente();
            try
            {
                ecran.RendrePourTest(new[]
                {
                    new DealerDto
                    {
                        dealer = "d-1", dealer_spot_id = "b-1", activity_band = "WORKING", cash_band = "MODERATE", substance = "HUSH", margin_band = "ELEVATED",
                        name_i18n = new DealerNomI18nDto { key = "game.fiction.dealer.name", @params = new DealerNomParamsDto { prenom = "Mira" } },
                        district_name = "Dépôt-Est", lek_band = "MEDIUM", lane_band = "STEADY", addiction_loyalty_status = "STABLE", withdrawn = false,
                    },
                }, null, "s-1");
                Assert.AreEqual("Mira", Dit(ecran, "d-1", "Nom"), "la tête de rangée est le prénom servi, SEUL (cadre 171 : la substance se lit à la pastille)");
                Assert.IsNull(Dit(ecran, "d-1", "Substance"), "aucun mot de substance à côté du prénom");
                Assert.AreEqual("Dépôt-Est · du passage · <lowercase>AU-DESSUS</lowercase>", Dit(ecran, "d-1", "Lieu"),
                    "district_name · lek_band · margin_band ; le mot de marge garde SA casse servie, le bas de casse est une balise de style");
                Assert.IsNull(DitSous(ecran, "d-1", "Marge", "Val"), "le mot de marge ne se dit plus dans la ligne de jauge");
                Assert.IsNotNull(DitSous(ecran, "d-1", "Caisse", "Val"), "la caisse garde son mot");
                Assert.AreEqual("ça s’écoule · des habitués", Dit(ecran, "d-1", "Suite"), "lane_band · addiction_loyalty_status");
            }
            finally { UnityEngine.Object.DestroyImmediate(racine); }
        }

        [Test]
        public void V3_Withdrawn_RemplaceLaClientele_EtLesNullsNEcriventRien()
        {
            // le corps tel que le back le sert : `null` pour un coin qui n'est pas Hush et pour une lane jamais formée
            const string corps = "{\"payload\":{\"data\":{\"dealers\":[" +
                "{\"dealer\":\"d-sec\",\"dealer_spot_id\":\"b-1\",\"name_i18n\":{\"key\":\"game.fiction.dealer.name\",\"params\":{\"prenom\":\"Ilse\"}},\"activity_band\":\"IDLE\"," +
                "\"cash_band\":\"LOW\",\"substance\":\"HUSH\",\"margin_band\":\"ELEVATED\",\"addiction_loyalty_status\":\"LOW\",\"withdrawn\":true," +
                "\"district_name\":\"Orsel\",\"lek_band\":\"LOW\",\"lane_band\":\"SCATTERED\"}," +
                "{\"dealer\":\"d-nul\",\"dealer_spot_id\":\"b-2\",\"name_i18n\":{\"key\":\"game.fiction.dealer.name\",\"params\":{\"prenom\":\"Dov\"}},\"activity_band\":\"ABSENT\"," +
                "\"cash_band\":\"NONE\",\"substance\":\"BRINDLE\",\"margin_band\":\"STANDARD\",\"addiction_loyalty_status\":null,\"withdrawn\":false," +
                "\"district_name\":\"Les Friches\",\"lek_band\":\"ABSENT\",\"lane_band\":null}," +
                "{\"dealer\":\"d-nu\",\"dealer_spot_id\":\"b-3\",\"activity_band\":\"WORKING\",\"cash_band\":\"LOW\",\"substance\":\"BRINDLE\",\"margin_band\":\"NEUVE\"," +
                "\"addiction_loyalty_status\":null,\"withdrawn\":false,\"district_name\":null,\"lek_band\":\"NEUVE\",\"lane_band\":null}]}}}";
            DealerDto[] dealers = JsonUtility.FromJson<DealerListEnvelope>(corps).payload.data.dealers;
            Assert.AreEqual(3, dealers.Length);

            var (racine, ecran) = MonterLaVente();
            try
            {
                ecran.RendrePourTest(dealers, null, "s-1");

                string suite = Dit(ecran, "d-sec", "Suite");
                StringAssert.StartsWith("ça se disperse · <b>", suite, "l'écoulement, puis la phrase en gras (une forme, pas la couleur seule)");
                StringAssert.Contains("resté à sec" + Nbsp + ": la clientèle a décroché", suite);
                StringAssert.DoesNotContain("clientèle neuve", suite, "`withdrawn` REMPLACE le mot de clientèle");
                Assert.AreEqual("Orsel · coin mort · <lowercase>AU-DESSUS</lowercase>", Dit(ecran, "d-sec", "Lieu"));

                Assert.AreEqual("Les Friches · pas de coin ici · <lowercase>AU TARIF</lowercase>", Dit(ecran, "d-nul", "Lieu"));
                Assert.IsNull(Dit(ecran, "d-nul", "Suite"), "lane_band null et coin non Hush : la seconde ligne n'existe pas");

                Assert.AreEqual("Brindle", Dit(ecran, "d-nu", "Nom"), "sans prénom servi, la substance garde la tête");
                Assert.IsNull(Dit(ecran, "d-nu", "Substance"), "…et n'est pas dite deux fois");
                Assert.IsNull(Dit(ecran, "d-nu", "Lieu"), "ni lieu, ni coin connu, ni marge connue : la ligne n'existe pas");
                Assert.IsNull(Dit(ecran, "d-nu", "Suite"));
            }
            finally { UnityEngine.Object.DestroyImmediate(racine); }
        }

        [Test]
        public void V4_GardeDeSource_LaRangeeLitLesChampsServis()
        {
            // le CODE seul : une ligne de commentaire qui nommerait le champ ne compte pas (revue ⊥ m3)
            string Code(string source) => string.Join("\n", source.Split('\n').Where(l => !l.TrimStart().StartsWith("//")));
            Assert.IsFalse(Code("    // d.lek_band\n    /// d.lek_band").Contains("d.lek_band"), "contrôle positif : un champ seulement commenté n'est pas vu");
            string vente = Code(File.ReadAllText(Path.Combine(Application.dataPath, "Scripts", "Operational", "Selling", "SellingScreenController.cs")));
            foreach (string champ in new[] { "d.district_name", "d.lek_band", "d.lane_band", "d.addiction_loyalty_status", "d.withdrawn", "d.Prenom" })
                StringAssert.Contains(champ, vente, "servi, déclaré, et LU par l'écran (mesure du 12/11 : 0 lecteur)");
        }

        [Test]
        public void V5_LaJaugeDeCaisse_QuatreCrans_UnParPalierAuDessusDeNone()
        {
            // le barème ATTENDU, écrit à la main par valeur de bande (f2 12/11, maquette) : NONE 0, LOW 1, MODERATE 2, HIGH 3, FULL 4
            var attendu = new Dictionary<string, int> { { "NONE", 0 }, { "LOW", 1 }, { "MODERATE", 2 }, { "HIGH", 3 }, { "FULL", 4 } };
            CollectionAssert.AreEquivalent(CollecteMots.Bandes, attendu.Keys, "les cinq valeurs de `DealerCashBand`, toutes");
            // contrôle positif de la propriété : l'ANCIEN barème (0, 2, 3, 4, 5 sur cinq crans) la viole — il sautait de 0 à 2
            Assert.IsFalse(MonteDUnCranParPalier(new[] { 0, 2, 3, 4, 5 }), "l'ancien barème saute un cran : la propriété doit le refuser");
            Assert.IsTrue(MonteDUnCranParPalier(CollecteMots.Bandes.Select(b => attendu[b]).ToArray()));

            var (racine, ecran) = MonterLaVente();
            try
            {
                DealerDto[] dealers = CollecteMots.Bandes.Concat(new[] { "OVERFLOW" })
                    .Select(b => new DealerDto { dealer = "d-" + b, dealer_spot_id = "b-" + b, activity_band = "WORKING", cash_band = b, substance = "BRINDLE", margin_band = "STANDARD" })
                    .ToArray();
                ecran.RendrePourTest(dealers, null, "s-1");
                var allumes = new List<int>();
                foreach (string b in CollecteMots.Bandes)
                {
                    Transform crans = Crans(ecran, "d-" + b, "Caisse");
                    Assert.AreEqual(4, crans.childCount, "quatre crans, pas cinq (" + b + ")");
                    int n = crans.Cast<Transform>().Count(c => c.name == "CranAllume");
                    Assert.AreEqual(attendu[b], n, "crans allumés pour " + b);
                    allumes.Add(n);
                }
                Assert.IsTrue(MonteDUnCranParPalier(allumes.ToArray()), "le barème RENDU monte d'un cran par palier, de 0 au dernier cran");
                Assert.AreEqual(0, Crans(ecran, "d-OVERFLOW", "Caisse").Cast<Transform>().Count(c => c.name == "CranAllume"), "une valeur inconnue n'allume rien");
                Assert.AreEqual(4, Crans(ecran, "d-FULL", "Marge").childCount, "la marge garde ses quatre traits");
            }
            finally { UnityEngine.Object.DestroyImmediate(racine); }
        }

        private static bool MonteDUnCranParPalier(int[] rangs) =>
            rangs.Length > 0 && rangs[0] == 0 && Enumerable.Range(1, rangs.Length - 1).All(i => rangs[i] == rangs[i - 1] + 1);

        private static Transform Crans(SellingScreenController ecran, string dealer, string jauge) =>
            ecran.GetComponentsInChildren<Transform>(true).First(t => t.name == "Crans" && t.parent.name == jauge && t.parent.parent.name == "Dealer_" + dealer);

        [Test]
        public void V6_LesLitterauxDeLEcran_PassentParLibelle()
        {
            var (racine, ecran) = MonterLaVente();
            try
            {
                ecran.RendrePourTest(new[]
                {
                    new DealerDto { dealer = "d-vide", dealer_spot_id = "b-1", activity_band = "WORKING", cash_band = "NONE", substance = "BRINDLE", margin_band = "STANDARD" },
                }, null, null);
                string[] dits = ecran.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true).Select(t => t.text).ToArray();
                foreach (string mot in new[] { "La vente", "qui vend, et ce qu’il y a dans la caisse", "au travail", "caisses pleines", "grillés", "Ramasser", "caisse vide", "Caisse", "Marge" })
                    CollectionAssert.Contains(dits, mot, "le repli ratifié (f2 12/11), à l'octet");
                CollectionAssert.DoesNotContain(dits, "LES POINTS DE VENTE", "le titre est celui de la maquette");
                CollectionAssert.IsSubsetOf(new[]
                {
                    "plus.entree.la_vente", "accueil.suite.ramasser",   // REUSE de deux clés servies
                    "vente.sous_titre.qui_vend_et_ce_qu_il_y_a_dans_la_caisse", "vente.compteur.caisses_pleines", "vente.compteur.grilles",
                    "vente.raison.caisse_vide", "vente.jauge.caisse", "vente.jauge.marge", "vente.bloc.au_travail",
                }, Libelle.ClesEnRepli.ToArray(), "chaque mot est demandé au catalogue par sa clé");
            }
            finally { UnityEngine.Object.DestroyImmediate(racine); }

            Libelle.RemettreLesCompteurs();
            var (racine2, ecran2) = MonterLaVente();
            try
            {
                ecran2.RendrePourTest(new[]
                {
                    new DealerDto { dealer = "d-plein", dealer_spot_id = "b-1", activity_band = "WORKING", cash_band = "HIGH", substance = "BRINDLE", margin_band = "STANDARD" },
                }, null, null);
                CollectionAssert.Contains(ecran2.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true).Select(t => t.text).ToArray(), "aucune planque disponible");
                CollectionAssert.Contains(Libelle.ClesEnRepli.ToArray(), "vente.raison.aucune_planque_disponible");
            }
            finally { UnityEngine.Object.DestroyImmediate(racine2); }
        }
    }
}
