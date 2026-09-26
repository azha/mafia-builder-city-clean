using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational.Exceptions;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // ⑨-6 — après le tampon (cadre 17). Gardes de SOURCE et de STRUCTURE :
    //   R17     les 10 issues du back (lues sur `ExceptionBandes.DomaineIssue`) : chacune un mot de cachet non vide, jamais
    //           l'enum brut, jamais « — » ; une issue inconnue rend « — » ; la clé servie l'emporte
    //   R17bis  la carte tranchée garde la première place, `.parti` (sans bouton, .28, rail gris), le suivant s'avance (▼) ;
    //           « Deux attendent encore » ; le bloc de l'après entre la file et la bulle : cachet « EN RÉPARATION »,
    //           « Lt. Kane retourne au travail », « Le bâtiment se remet en marche, avec le temps » ; le cachet HORS du masque
    //   R17ter  une phrase par issue (atelier §3.10 A, `exceptions.apres.<issue>`) : les 10, ≠ enum, la clé servie l'emporte,
    //           hors domaine ⇒ pas de phrase ; la ville n'a pas de surtitre ; une carte que le serveur sert encore n'est pas partie
    //   R17sext  le surtitre de l'après est un GABARIT (`exceptions.bloc.nom_retourne_au_travail`, `{nom}`), plus une concaténation :
    //           le nom paraît UNE fois, à la place du paramètre, et l'ORDRE vient de la valeur servie (valeur fabriquée : le nom à la fin)
    //   R17quint les comptes en lettres (§3.10 B) : 0, 1, 2 et 7 par les pluriels servis à branches exactes (en fr, `one` couvre
    //           0 ET 1) ; sans clé, le repli composé ; une valeur servie à CHIFFRE (l'ancien `#`) est refusée (R2.2)
    //   R17quater  par la vraie résolution (coutures, aucune requête) : l'après apparaît, puis disparaît au rechargement suivant
    [Category("EcranFile")]
    public class ExceptionsApresPlayModeTests
    {
        private GameObject hostGo;
        private ExceptionQueueController ecran;

        [TearDown]
        public void TearDown()
        {
            I18nCatalog.Oublier();
            if (ecran != null && ecran.LastNavGameObject != null) Object.DestroyImmediate(ecran.LastNavGameObject);
            if (ecran != null && ecran.Decor != null) Object.DestroyImmediate(ecran.Decor.transform.parent.gameObject);
            if (hostGo != null) Object.DestroyImmediate(hostGo);
            ecran = null; hostGo = null;
        }

        private static readonly Dictionary<string, string> Mots = new Dictionary<string, string>
        {
            { "RESOLVED", "RÉGLÉ" }, { "ESCALATED", "ARCHIVÉ" }, { "REPAIRING", "EN RÉPARATION" },
            { "REPAIRING_SLOW", "RÉPARATION LENTE" }, { "BRIBE_SUCCEEDED", "ARRANGÉ" }, { "BRIBE_FAILED", "ÇA S'EST RETOURNÉ" },
            { "LAID_LOW", "PROFIL BAS" }, { "TAUGHT", "RÈGLE APPRISE" }, { "DEFERRED", "REMIS À PLUS TARD" }, { "DEMOLISHED", "RASÉ" },
        };

        private static CandidateActionDto Reparer() => new CandidateActionDto
        {
            id = "repair", label = "Repair", method = "REPAIR",
            effect = new ExceptionEffectDto { type = "REPAIR", target_building_id = "b-1" },
        };

        private static ExceptionCardDto Kane() => new ExceptionCardDto
        {
            exception_id = "k", lieutenant_id = "lt-kane", lieutenant = new ExceptionLieutenantDto { id = "lt-kane", name = "Lt. Kane" },
            event_descriptor = "They turned the building over last night.",
            severity_band = "SEVERE", priority_band = "critical", confidence_band = "confident",
            candidate_actions = new[] { Reparer() }, suggested_action = Reparer(),
        };

        private static ExceptionCardDto Ville() => new ExceptionCardDto
        {
            exception_id = "v", lieutenant_id = "", lieutenant = new ExceptionLieutenantDto(),
            severity_band = "SEVERE", priority_band = "urgent", confidence_band = "confident",
            candidate_actions = new CandidateActionDto[0], suggested_action = new CandidateActionDto(),
        };

        private static ExceptionCardDto Marr() => new ExceptionCardDto
        {
            exception_id = "m", lieutenant_id = "lt-marr", lieutenant = new ExceptionLieutenantDto { id = "lt-marr", name = "Lt. Marr" },
            severity_band = "MODERATE", priority_band = "urgent", confidence_band = "likely",
            candidate_actions = new CandidateActionDto[0], suggested_action = new CandidateActionDto(),
        };

        private void NouvelEcran(params ExceptionCardDto[] cartes)
        {
            hostGo = new GameObject("ExceptionQueue", typeof(RectTransform));
            ecran = hostGo.AddComponent<ExceptionQueueController>();
            ecran.RendrePourTest(cartes);   // même frame que AddComponent : `Start` ne lancera pas `Boot` (réseau)
        }

        [Test]
        public void R17_LesDixIssues_UnMotDeCachetChacune()
        {
            foreach (string v in ExceptionBandes.DomaineIssue)
            {
                string mot = ExceptionBandes.Issue(v);
                Assert.IsFalse(string.IsNullOrWhiteSpace(mot), v);
                Assert.AreNotEqual(ExceptionBandes.Inconnue, mot, v);
                Assert.IsFalse(string.Equals(v, mot, System.StringComparison.OrdinalIgnoreCase), $"{v} : l'enum brut");
                Assert.IsTrue(Mots.TryGetValue(v, out string attendu), $"{v} : sans mot attendu");
                Assert.AreEqual(attendu, mot, v);
            }
            Assert.AreEqual(Mots.Count, ExceptionBandes.DomaineIssue.Length, "aucun mot orphelin");
            Assert.AreEqual(ExceptionBandes.Inconnue, ExceptionBandes.Issue("EXPLODED"), "hors domaine : « — », jamais l'enum");
            Assert.AreEqual(ExceptionBandes.Inconnue, ExceptionBandes.Issue(null));

            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string> { { "exception_detail.outcome.repairing", "UNDER REPAIR" } });
            Assert.AreEqual("UNDER REPAIR", ExceptionBandes.Issue("REPAIRING"), "la clé servie, dérivée de la valeur");
            Assert.AreEqual("RASÉ", ExceptionBandes.Issue("DEMOLISHED"), "clé absente ⇒ le repli");
        }

        [Test]
        public void R17bis_LaCarteTrancheeGardeSaPlace_EtLeBlocDeLApres()
        {
            // Un écran VIDE d'abord : `RendreFile` vide la file par `Destroy`, différé à la fin de la frame — un premier rendu
            // à trois cartes laisserait ses attendants dans l'arbre pendant ce test synchrone.
            NouvelEcran();
            ecran.PoserApresPourTest(Kane(), "REPAIRING", new[] { Ville(), Marr() });

            GameObject parti = ecran.PartiPourTest;
            Assert.IsNotNull(parti, "la carte tranchée garde sa place (cadre 17)");
            Assert.AreEqual(0, parti.transform.GetSiblingIndex(), "la PREMIÈRE place");
            Assert.IsNull(parti.GetComponent<Button>(), "réglée : on ne la rouvre pas");
            Assert.IsNull(parti.transform.Find("Chevron"));
            Assert.AreEqual(0.28f, parti.GetComponent<CanvasGroup>().alpha, 1e-4f, "`.attendant.parti{opacity:.28}`");
            Color rail = parti.transform.Find("Rail").GetComponent<Image>().color;
            Assert.AreEqual(rail.r, rail.g, 1e-4f, "`grayscale(1)` sur le rail");
            Assert.AreEqual(rail.g, rail.b, 1e-4f);

            Assert.AreEqual(2, ecran.AttendantsPourTest().Count, "trois places dessinées, la tranchée en prend une");
            Assert.IsNotNull(ecran.AttendantsPourTest()[0].transform.Find("Chevron"), "le suivant s'avance : ▼");
            Assert.AreEqual("Deux attendent encore", ecran.LigneSoirTexte);

            Assert.IsTrue(ecran.ApresBloc.activeSelf);
            Assert.AreEqual("EN RÉPARATION", ecran.ApresCachet);
            Assert.AreEqual("Lt. Kane retourne au travail", ecran.ApresKicker, "atelier §3.5 : le nom servi, pas l'archétype");
            Assert.AreEqual("Le bâtiment se remet en marche, avec le temps", ecran.ApresTitre);
            Transform apres = ecran.ApresBloc.transform;
            // ⑨ (atelier D36, 26/09) : le zinc s'intercale — File, ZincPlace (le plateau), puis l'après
            Assert.AreEqual("ZincPlace", apres.parent.GetChild(ecran.FilePourTest.transform.GetSiblingIndex() + 1).name, "le zinc sous la file");
            Assert.AreEqual(ecran.FilePourTest.transform.GetSiblingIndex() + 2, apres.GetSiblingIndex(), "juste après le zinc");
            Assert.AreEqual(apres.GetSiblingIndex() + 1, ecran.ParlePourTest.transform.GetSiblingIndex(), "juste avant la bulle");
            Transform cachet = apres.Find("Cachet");
            Assert.IsNull(cachet.parent.GetComponent<Mask>(), "le cachet déborde (top:-10) : jamais sous le masque du verre");
            Assert.IsNotNull(apres.Find("Verre").GetComponent<Mask>());
            Assert.IsTrue(cachet.GetComponent<LayoutElement>().ignoreLayout);
        }

        [Test]
        public void R17ter_PasDePhraseInventee_LaVilleSansSurtitre_LeServeurFaitFoi()
        {
            foreach (string v in ExceptionBandes.DomaineIssue)
            {
                string phrase = ExceptionBandes.PhraseApres(v);
                Assert.IsFalse(string.IsNullOrWhiteSpace(phrase), $"{v} : une phrase par issue");
                Assert.IsFalse(phrase.ToUpperInvariant().Contains(v), $"{v} : jamais l'enum");
            }
            Assert.AreEqual("Le bâtiment se remet en marche, avec le temps", ExceptionBandes.PhraseApres("REPAIRING"), "cadre 17, à l'octet");
            Assert.IsNull(ExceptionBandes.PhraseApres("EXPLODED"), "hors domaine : pas de phrase");
            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string>
                { { "exceptions.apres.laid_low", "Lying low: the heat eases, the building stays damaged" } });
            Assert.AreEqual("Lying low: the heat eases, the building stays damaged", ExceptionBandes.PhraseApres("LAID_LOW"),
                "la clé dérivée de la valeur servie");
            I18nCatalog.Oublier();
            Assert.IsNull(ExceptionQueueController.KickerApres(Ville()), "la ville ne « retourne » nulle part");

            NouvelEcran(Kane(), Marr());
            ecran.PoserApresPourTest(Kane(), "REPAIRING", new[] { Kane(), Marr() });
            Assert.IsFalse(ecran.ApresPresent, "le serveur sert encore la carte : elle n'est pas partie");
            Assert.IsNull(ecran.PartiPourTest);
            Assert.IsFalse(ecran.ApresBloc.activeSelf);
        }

        private const string Ambiance =
            "{count, plural, =0 {Personne ne fait la queue — la routine tient} =1 {Un seul attend vos ordres — la file est calme} " +
            "=2 {Deux attendent vos ordres — la file est calme} =3 {Trois attendent vos ordres — la file est calme} " +
            "=4 {Quatre attendent vos ordres — la file est calme} =5 {Cinq attendent vos ordres — la file est calme} " +
            "=6 {Six attendent vos ordres — la file est calme} other {Plusieurs attendent vos ordres — la file est calme}}";
        private const string Encore =
            "{count, plural, =1 {Un seul attend encore} =2 {Deux attendent encore} =3 {Trois attendent encore} " +
            "=4 {Quatre attendent encore} =5 {Cinq attendent encore} =6 {Six attendent encore} other {Plusieurs attendent encore}}";

        [Test]
        public void R17quint_LesComptesEnLettres_ZeroUnDeuxSept()
        {
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
                { { "exceptions.file.ambiance", Ambiance }, { "exceptions.file.attendent_encore", Encore } });
            Assert.AreEqual("Personne ne fait la queue — la routine tient", ExceptionQueueController.LigneAmbiance(0));
            Assert.AreEqual("Un seul attend vos ordres — la file est calme", ExceptionQueueController.LigneAmbiance(1),
                "=1 avant `one` (qui couvre 0 ET 1 en français)");
            Assert.AreEqual("Deux attendent vos ordres — la file est calme", ExceptionQueueController.LigneAmbiance(2));
            Assert.AreEqual("Plusieurs attendent vos ordres — la file est calme", ExceptionQueueController.LigneAmbiance(7));
            Assert.AreEqual("Un seul attend encore", ExceptionBandes.CompteEnLettres("exceptions.file.attendent_encore", 1, "x"));
            Assert.AreEqual("Deux attendent encore", ExceptionBandes.CompteEnLettres("exceptions.file.attendent_encore", 2, "x"));
            Assert.AreEqual("Plusieurs attendent encore", ExceptionBandes.CompteEnLettres("exceptions.file.attendent_encore", 7, "x"));

            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
                { { "exceptions.file.ambiance", "{count, plural, =0 {Personne} other {# attendent vos ordres — la file est calme}}" } });
            Assert.AreEqual("Trois attendent vos ordres — la file est calme", ExceptionQueueController.LigneAmbiance(3),
                "la forme à `#` rend « 3 attendent » : refusée, le repli en lettres");
            I18nCatalog.Oublier();
            Assert.AreEqual("Plusieurs attendent vos ordres — la file est calme", ExceptionQueueController.LigneAmbiance(7), "le repli");
        }

        [Test]
        public void R17sext_LeSurtitre_UnGabarit_LOrdreVientDeLaValeurServie()
        {
            Assert.AreEqual("Lt. Kane retourne au travail", ExceptionQueueController.KickerApres(Kane()), "le repli fr");

            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
                { { "exceptions.bloc.nom_retourne_au_travail", "Au travail, à nouveau : {nom}" } });
            string k = ExceptionQueueController.KickerApres(Kane());
            Assert.AreEqual("Au travail, à nouveau : Lt. Kane", k, "l'ordre des mots vient de la valeur servie : le nom à la FIN");
            Assert.AreEqual(k.IndexOf("Lt. Kane", System.StringComparison.Ordinal), k.LastIndexOf("Lt. Kane", System.StringComparison.Ordinal),
                "le nom paraît UNE fois");
            StringAssert.DoesNotContain("{nom}", k, "le paramètre est remplacé");

            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string>
                { { "exceptions.bloc.nom_retourne_au_travail", "{nom} is going back to work" } });
            Assert.AreEqual("Lt. Kane is going back to work", ExceptionQueueController.KickerApres(Kane()), "l'en de l'atelier §3.5");
            Assert.IsNull(ExceptionQueueController.KickerApres(Ville()), "la ville n'a toujours pas de surtitre");
        }

        [UnityTest]
        public IEnumerator R17quater_ParLaVraieResolution_PuisLeRechargementSuivant()
        {
            NouvelEcran(Kane(), Ville(), Marr());
            ExceptionsClient client = ecran.ClientPourTest;
            client.SubstitutResolvePourTest = r => new ResolveResponse { resolved = true, outcome = "REPAIRING" };
            client.SubstitutFilePourTest = () => new[] { Ville(), Marr() };
            client.SubstitutEscalationsPourTest = () => 0;

            yield return ecran.ResoudreLaSuggestion();
            Assert.AreEqual("REPAIRING", ecran.DerniereIssue);
            Assert.IsTrue(ecran.ApresPresent, "le rechargement de la résolution garde la tranchée");
            Assert.AreEqual("EN RÉPARATION", ecran.ApresCachet);
            Assert.IsNotNull(ecran.PartiPourTest);

            yield return ecran.LoadQueue();
            Assert.IsFalse(ecran.ApresPresent, "le rechargement SUIVANT l'efface : l'après dit ce qui vient d'arriver");
            Assert.IsNull(ecran.PartiPourTest);
            Assert.AreEqual("Deux attendent vos ordres — la file est calme", ecran.LigneSoirTexte);
        }
    }
}
