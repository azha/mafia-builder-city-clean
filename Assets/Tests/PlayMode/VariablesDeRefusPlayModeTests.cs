using System.Collections.Generic;
using NUnit.Framework;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational;

namespace MafiaCleanCity.CityMap.Tests
{
    // LOT DES REFUS (f2, 2026-09-26) — `payload_vars` d'un refus servi : tout `<racine>_key` est une clé SERVIE, résolue en MOT, injecté
    // dans `<racine>` ; le client ne concatène jamais une clé. Hors réseau, catalogue fabriqué, corps de la forme convenue avec le back.
    //   V1  POSITIF : error.production.precursor_missing + { precursor_type: "pyralin", precursor_key: "building.precursor.pyralin" }
    //       ⇒ « … la Pyraline … », de bout en bout jusqu'à la ligne d'action de ②
    //   V2  NÉGATIF : une variable sans `_key` passe telle quelle ; `precursor_type` seul n'est JAMAIS changé en clé fabriquée
    //   V3  NÉGATIF : `_key` non servie ⇒ repli = la valeur que le back a posée dans la racine (comptée en repli), jamais la clé
    //   V4  lecture : objet plat, échappements, nombres ; l'imbriqué est sauté ; pas de payload_vars ⇒ vide
    //   V5  RefusServi (table 67) : la clé de l'enveloppe → la phrase servie, trous remplis ; pas de clé, ou clé non servie ⇒ null
    //       (l'appelant garde sa phrase d'avant, jamais le message de développeur)
    //   V6  clé GÉNÉRIQUE servie (couche protocole : error.resource.state_conflict, error.validation.failed…) ⇒ null ⇒ la phrase
    //       d'ÉCRAN ; clé spécifique servie ⇒ la phrase servie (suivi ⊥ UX §I, f2 26/09 — BLANCHIR régressait)
    [Category("VariablesDeRefus")]
    public class VariablesDeRefusPlayModeTests
    {
        [TearDown] public void Oublier() => I18nCatalog.Oublier();

        private const string Corps =
            "{\"payload\":{\"error\":{\"code\":\"RESOURCE_STATE_CONFLICT\",\"user_facing_i18n_key\":\"error.production.precursor_missing\"," +
            "\"payload_vars\":{\"precursor_type\":\"pyralin\",\"precursor_key\":\"building.precursor.pyralin\"}}}}";

        [Test]
        public void V1_LaCleEstResolueEnMot_JusquALaLigneDAction()
        {
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
            {
                { "building.precursor.pyralin", "la Pyraline" },
                { "error.production.precursor_missing", "Il manque {precursor_type} au labo." },
            });
            Dictionary<string, string> v = VariablesDeRefus.Resoudre(VariablesDeRefus.Lire(Corps));
            Assert.AreEqual("la Pyraline", v["precursor_type"], "le MOT servi, pas l'identifiant");
            var o = new ActionOutcome { Ok = false, CleI18n = "error.production.precursor_missing", Variables = v };
            Assert.AreEqual("La cuisson n’a pas démarré — Il manque la Pyraline au labo.",
                BuildingCardController.LigneDAction(o, "ok", "La cuisson n’a pas démarré"));
        }

        [Test]
        public void V2_SansSuffixeCle_RienNeBouge()
        {
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { "building.precursor.pyralin", "la Pyraline" } });
            var brut = new Dictionary<string, string> { { "precursor_type", "pyralin" }, { "reason", "building.precursor.pyralin" } };
            Dictionary<string, string> v = VariablesDeRefus.Resoudre(brut);
            Assert.AreEqual("pyralin", v["precursor_type"], "sans precursor_key, la racine n'est pas touchée (aucune clé fabriquée)");
            Assert.AreEqual("building.precursor.pyralin", v["reason"], "une variable sans `_key` passe telle quelle");
        }

        [Test]
        public void V3_CleNonServie_ReplisSurLaValeurDuBack()
        {
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>());
            Libelle.RemettreLesCompteurs();
            Dictionary<string, string> v = VariablesDeRefus.Resoudre(VariablesDeRefus.Lire(Corps));
            Assert.AreEqual("pyralin", v["precursor_type"], "clé non servie : la valeur posée par le back, jamais la clé");
            Assert.AreEqual(1, Libelle.NbReplis, "et le repli est COMPTÉ (garde zéro repli)");
        }

        [Test]
        public void V4_Lecture()
        {
            var v = VariablesDeRefus.Lire("{\"payload_vars\":{\"a\":\"x \\\"y\\\"\",\"n\":3,\"o\":{\"b\":\"c\"},\"z\":\"\\u00e9\",\"t\":[1,2],\"f\":true}}");
            Assert.AreEqual("x \"y\"", v["a"]);
            Assert.AreEqual("3", v["n"]);
            Assert.AreEqual("é", v["z"]);
            Assert.AreEqual("true", v["f"]);
            Assert.IsFalse(v.ContainsKey("o") || v.ContainsKey("t"), "l'imbriqué est sauté, jamais deviné");
            Assert.IsEmpty(VariablesDeRefus.Lire("{\"payload\":{}}"));
            Assert.IsEmpty(VariablesDeRefus.Lire(null));
        }
    
        [Test]
        public void V5_RefusServi_LaPhraseDeLaCle_OuRien()
        {
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
            {
                { "building.precursor.pyralin", "Pyraline" },
                { "error.production.precursor_missing", "Pas assez de {precursor_type} au labo pour cuire." },
            });
            Assert.AreEqual("error.production.precursor_missing", RefusServi.Cle(Corps));
            Assert.AreEqual("Pas assez de Pyraline au labo pour cuire.", RefusServi.Phrase(Corps), "positif : la phrase servie, trou résolu");
            Assert.IsNull(RefusServi.Phrase("{\"payload\":{\"error\":{\"code\":\"X\",\"message\":\"dev\"}}}"), "sans clé : null, jamais le message");
            Assert.IsNull(RefusServi.Phrase("{\"payload\":{\"error\":{\"user_facing_i18n_key\":\"error.inconnue\"}}}"), "clé non servie : null");
            Assert.IsNull(RefusServi.Phrase(null));
        }

        [Test]
        public void V6_CleGenerique_LEcranGardeSaPhrase()
        {
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
            {
                { "error.resource.state_conflict", "La situation a changé depuis votre dernier coup d’œil. Rechargez et décidez à nouveau." },
                { "error.validation.failed", "Une partie de ce que vous avez saisi n’est pas acceptée." },
                { "error.core_loops.structural_cap_exhausted", "Plus de décision de structure aujourd’hui." },
            });
            string ecran = MafiaCleanCity.CityMap.CityProjectionsClient.PhraseDuRefusDInject(409, null);   // la phrase d'écran de BLANCHIR (① ㊵, 409, table 84)
            // le corps mesuré du 409 de BLANCHIR sur le chemin du joueur neuf : la clé générique, servie par le bundle
            string blanchir = @"{""payload"":{""error"":{""code"":""RESOURCE_STATE_CONFLICT"",""http_status"":409,"
                + @"""user_facing_i18n_key"":""error.resource.state_conflict"",""message"":""safehouse holds less than requested""}}}";
            Assert.AreEqual(ecran, RefusServi.Phrase(blanchir) ?? ecran, "clé générique ⇒ la phrase d'écran, pas « Rechargez »");
            Assert.IsNull(RefusServi.Phrase(@"{""payload"":{""error"":{""user_facing_i18n_key"":""error.validation.failed""}}}"));
            Assert.IsTrue(RefusServi.EstGenerique("error.idempotency.key_conflict"), "par famille");
            Assert.IsFalse(RefusServi.EstGenerique("error.auth.session_expired"), "se reconnecter : une phrase qui dit quoi faire");

            string plafond = @"{""payload"":{""error"":{""user_facing_i18n_key"":""error.core_loops.structural_cap_exhausted""}}}";
            Assert.AreEqual("Plus de décision de structure aujourd’hui.", RefusServi.Phrase(plafond) ?? ecran,
                "clé spécifique servie ⇒ la phrase servie passe devant");
        }
}
}
