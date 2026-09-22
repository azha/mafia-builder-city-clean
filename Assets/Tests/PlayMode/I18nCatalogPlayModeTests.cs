using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.I18n;
using MafiaCleanCity.CityMap;   // REUSE AuthClient (signin)

namespace MafiaCleanCity.I18nTests
{
    /// <summary>Le résolveur i18n du client (socle, item 0.6).
    ///
    /// ⛔ CE QUE CES GARDES NE PROUVENT PAS : que les écrans seront traduits. Mesuré le
    /// 2026-09-02, le bundle sert **67 clés — 63 `error.*`, 4 `game.*`** — et les deux clés que
    /// les écrans reçoivent vraiment (`game.fiction.building.name`,
    /// `onboarding.preseed_exception.card`) n'y sont PAS. Le recouvrement demandé/servi est de
    /// **zéro**. Ces tests fixent donc le COMPORTEMENT du résolveur, pas la couverture du
    /// dictionnaire ; la couverture est un lot back, et elle est mesurée séparément ci-dessous
    /// pour que le chiffre soit daté plutôt que raconté.</summary>
    [Category("I18n")]
    public class I18nCatalogPlayModeTests
    {
        private const string BaseUrl = "http://localhost";

        // ⛔ LA PRÉCONDITION SE POSE AU SETUP, PAS SEULEMENT AU TEARDOWN (23/09). Le catalogue est un global STATIQUE :
        //    la classe le rendait après chacun de ses tests, jamais AVANT le premier. Mesuré à la partie 1 du cumul
        //    regroupé : `InspectionScreenPlayModeTests` (juste avant) laisse le bundle RÉEL chargé ; le premier cas de
        //    `ArchetypeServi_…` (MUSCLE) trouvait donc la clé servie — « Gros bras » rendu, AUCUN repli, `DernierRepli`
        //    null — et rougissait ; les deux cas suivants, après le TearDown, passaient. Un test qui dépend de l'état
        //    laissé par la classe d'avant mesure la classe d'avant.
        [SetUp] public void SetUp() { I18nCatalog.Oublier(); Libelle.RemettreLesCompteurs(); }
        [TearDown] public void TearDown() => I18nCatalog.Oublier();

        // ═══ 1. Le repli : la clé, visible — jamais un texte inventé ═════════════════════════

        [Test]
        public void UneCleAbsenteEstRendueTelleQuelle_JamaisUnTexteFabrique()
        {
            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string> {
                { "game.ui_common.confirm_button", "Confirm" } });

            Assert.AreEqual("Confirm", I18nCatalog.Traduire("game.ui_common.confirm_button"));

            // ⛔ Le cœur du socle : rien d'inventé, rien de vide, rien de « — ». La clé.
            Assert.AreEqual("game.fiction.building.name",
                I18nCatalog.Traduire("game.fiction.building.name"),
                "une clé absente doit rester LISIBLE à l'écran : c'est ce qui fera écrire le texte");
            Assert.IsFalse(I18nCatalog.Connait("game.fiction.building.name"));
            Assert.IsTrue(I18nCatalog.Connait("game.ui_common.confirm_button"));

            // pas de clé du tout ⇒ rien à dire ; « — » serait déjà une interprétation
            Assert.AreEqual("", I18nCatalog.Traduire(null));
            Assert.AreEqual("", I18nCatalog.Traduire(""));
        }

        [Test]
        public void SansBundleChargeToutRendSaCle_PlutotQueDeVider()
        {
            // Contrôle négatif : catalogue vide (réseau tombé). Un résolveur qui rendrait "" ici
            // ferait des écrans muets qu'on lirait comme des écrans finis.
            Assert.AreEqual("game.fiction.building.name",
                            I18nCatalog.Traduire("game.fiction.building.name"));
        }

        // ═══ 2. ICU — le sous-ensemble réellement présent dans le bundle ═════════════════════

        [Test]
        public void LesParametresSontSubstitues_EtUnParametreManquantResteVisible()
        {
            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string> {
                { "n", "Lab {district}-{block}" } });

            Assert.AreEqual("Lab 16-1501", I18nCatalog.Traduire("n",
                new Dictionary<string, string> { { "district", "16" }, { "block", "1501" } }));

            // ⛔ Un paramètre absent laisse `{block}` dans le texte. Un blanc se lirait comme une
            // phrase finie, et personne ne saurait qu'il manque une donnée.
            Assert.AreEqual("Lab 16-{block}", I18nCatalog.Traduire("n",
                new Dictionary<string, string> { { "district", "16" } }));
        }

        /// <summary>Le `plural` du bundle réel (`game.lieutenant.assignment.summary`), copié tel
        /// quel. Sans ce sous-ensemble d'ICU, cette clé sortirait en bouillie d'accolades — pire
        /// qu'une clé brute, parce que ça RESSEMBLE à du texte.</summary>
        [Test]
        public void LePluriel_EstResoluSurLeMotifREEL_DuBundle()
        {
            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string> {
                { "s", "{count, plural, =0 {No lieutenants assigned} one {{count} lieutenant assigned} " +
                       "other {{count} lieutenants assigned}}" } });

            Assert.AreEqual("No lieutenants assigned",
                I18nCatalog.Traduire("s", new Dictionary<string, string> { { "count", "0" } }));
            Assert.AreEqual("1 lieutenant assigned",
                I18nCatalog.Traduire("s", new Dictionary<string, string> { { "count", "1" } }));
            Assert.AreEqual("4 lieutenants assigned",
                I18nCatalog.Traduire("s", new Dictionary<string, string> { { "count", "4" } }));
        }

        /// <summary>Le `select` de genre imbriquant un `plural` — l'autre motif réel du bundle.
        /// Il exige de compter les accolades : une lecture naïve couperait à la première `}`.</summary>
        [Test]
        public void LeSelectImbriquantUnPluriel_EtLeDieseRemplaceParLeNombre()
        {
            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string> {
                { "r", "{gender, select, feminine {{count, plural, one {She took 1 action this cycle.} " +
                       "other {She took # actions this cycle.}}} masculine {{count, plural, one " +
                       "{He took 1 action this cycle.} other {He took # actions this cycle.}}} " +
                       "other {{count, plural, one {This lieutenant took 1 action this cycle.} " +
                       "other {This lieutenant took # actions this cycle.}}}}" } });

            Assert.AreEqual("She took 3 actions this cycle.", I18nCatalog.Traduire("r",
                new Dictionary<string, string> { { "gender", "feminine" }, { "count", "3" } }));
            Assert.AreEqual("He took 1 action this cycle.", I18nCatalog.Traduire("r",
                new Dictionary<string, string> { { "gender", "masculine" }, { "count", "1" } }));
            // genre inconnu ⇒ branche `other`, jamais une supposition
            Assert.AreEqual("This lieutenant took 2 actions this cycle.", I18nCatalog.Traduire("r",
                new Dictionary<string, string> { { "gender", "zzz" }, { "count", "2" } }));
        }

        [Test]
        public void UnMotifIncomprisEstRenduTelQuel_JamaisDevine()
        {
            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string> {
                { "d", "il reste {jours, date, short} jours" },
                { "b", "accolade non fermée {oups" } });

            // `date` n'est pas géré : le motif ressort visible plutôt que remplacé par du vide
            StringAssert.Contains("{jours, date, short}", I18nCatalog.Traduire("d",
                new Dictionary<string, string> { { "jours", "3" } }));
            Assert.AreEqual("accolade non fermée {oups", I18nCatalog.Traduire("b"));
        }

        // ═══ 3. Le bundle RÉEL — et la couverture, mesurée plutôt que racontée ═══════════════

        /// <summary>⛔ CE TEST NE VÉRIFIE PAS UNE COUVERTURE, IL LA MESURE ET L'IMPRIME. Il
        /// échouerait si le bundle devenait illisible ou vide — pas s'il manque des clés, parce
        /// que les clés manquantes sont un lot back et non un défaut du client.
        /// ⚠️ Le plancher est à 1 : un bundle vide serait indiscernable d'un catalogue non
        /// chargé, et tous les écrans afficheraient leurs clés en silence.</summary>
        [UnityTest, Category("I18nReseau")]
        public IEnumerator LeBundleReel_EstLisible_EtSaCouvertureEstIMPRIMEE()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string token = null, err = null;
            yield return auth.SignIn("operational_demo@example.test", "operational-demo-pw",
                                     t => token = t, e => err = e);
            Assert.IsNull(err, $"connexion au compte de démo échouée : {err}");

            yield return I18nCatalog.Amorcer(new I18nClient { BaseUrl = BaseUrl }, token);

            Assert.IsTrue(I18nCatalog.Charge, "le bundle doit être chargé");
            Assert.Greater(I18nCatalog.NbClesServies, 0,
                "bundle VIDE : indiscernable d'un catalogue non chargé, tous les écrans " +
                "afficheraient leurs clés sans que rien ne le signale");

            // Les deux clés que les écrans reçoivent vraiment (mesuré 2026-09-02).
            string[] demandees = { "game.fiction.building.name", "onboarding.preseed_exception.card" };
            int servies = 0;
            foreach (string k in demandees) if (I18nCatalog.Connait(k)) servies++;
            // ⚠️ `Locale` n'est PAS une preuve de langue : `?locale=fr` rend 200 avec 63 des 67
            // valeurs identiques à l'anglais (mesuré par la session back). On l'imprime pour
            // mémoire, on n'en conclut rien.
            Debug.Log($"[I18N] locale={I18nCatalog.Locale} · {I18nCatalog.NbClesServies} clés servies · " +
                      $"clés demandées par les écrans résolues : {servies}/{demandees.Length}");
            foreach (string k in demandees)
                Debug.Log($"[I18N]   {(I18nCatalog.Connait(k) ? "✓ servie" : "✗ ABSENTE")}  {k}");
        }
    
        // ═══ La FALSIFIABLE de l'item 0.6, telle que `front.md` l'écrit ═════════════════════

        /// <summary>« Un test rend un écran dont TOUT libellé vient d'une clé, et asserte
        /// qu'AUCUNE CLÉ BRUTE ne reste à l'écran. Contrôle positif OBLIGATOIRE : une clé
        /// volontairement absente du bundle DOIT être détectée — sinon la garde certifie le
        /// défaut. » (`front.md`, item 0.6)
        ///
        /// ⛔ CE QUE J'AI DÛ CORRIGER DANS MA PROPRE LECTURE. Écrite naïvement contre les écrans
        /// que je viens de convertir, cette garde serait VIDE : leur repli est le LITTÉRAL
        /// (byte-identique), donc aucune clé brute ne peut apparaître, et l'assertion passerait
        /// toujours — en certifiant exactement le défaut qu'elle prétend traquer.
        /// ⇒ Elle porte donc sur le chemin où une clé brute PEUT sortir : les clés venues du
        ///   SERVEUR (`event_descriptor_i18n`, `name_i18n`…), dont le repli est la prose — et,
        ///   à défaut de prose, la clé nue.
        /// ★ Le contrôle positif n'est pas une formalité ici : c'est lui qui distingue « aucune
        ///   clé à l'écran » de « mon détecteur ne voit rien ».</summary>
        [Test]
        public void Item06_AucuneCleBruteALEcran_EtLeDetecteurLeProuve()
        {
            // Un détecteur de clé brute : trois segments minuscules séparés par des points.
            bool EstUneCleBrute(string s) =>
                !string.IsNullOrEmpty(s) &&
                System.Text.RegularExpressions.Regex.IsMatch(s.Trim(),
                    @"^[a-z][a-z0-9_]*(\.[a-z0-9_]+){2,}$");

            // — CONTRÔLE POSITIF, en premier : le détecteur doit VOIR une clé nue. —
            Assert.IsTrue(EstUneCleBrute("game.fiction.building.name"),
                "le détecteur ne reconnaît pas une clé nue : tout le reste de ce test serait vide");
            Assert.IsTrue(EstUneCleBrute("exception.heat_pressure.card.descriptor"));
            Assert.IsTrue(EstUneCleBrute("onboarding.preseed_exception.card"),
                "c'est la clé RÉELLE que le serveur envoie et que le bundle ne sert pas (mesuré)");

            // — CONTRÔLES NÉGATIFS : une phrase n'est pas une clé. —
            Assert.IsFalse(EstUneCleBrute("Citywide heat is high — your operations are under pressure."));
            Assert.IsFalse(EstUneCleBrute("Il vous écoute"));
            Assert.IsFalse(EstUneCleBrute("Dans 30 j"));
            Assert.IsFalse(EstUneCleBrute("exc_demo_teach_heat"),
                "un identifiant de seeder n'a pas de point : il n'est pas une clé i18n, et c'est " +
                "un AUTRE défaut (⑨ l'affiche comme une réplique) — ne pas les confondre");

            // — Le comportement garanti : une clé SERVIE ne sort jamais nue. —
            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string> {
                { "exception.heat_pressure.card.descriptor", "Citywide heat is high." } });
            string rendu = I18nCatalog.Traduire("exception.heat_pressure.card.descriptor");
            Assert.IsFalse(EstUneCleBrute(rendu),
                $"une clé SERVIE ne doit jamais sortir nue à l'écran (rendu : « {rendu} »)");
            Assert.AreEqual("Citywide heat is high.", rendu);

            // — Et une clé ABSENTE sort nue, VISIBLEMENT : c'est le repli voulu du socle. —
            string absent = I18nCatalog.Traduire("onboarding.preseed_exception.card");
            Assert.IsTrue(EstUneCleBrute(absent),
                "une clé absente doit rester LISIBLE comme une clé — c'est ce qui fait écrire le " +
                "texte. Si elle sortait vide ou remplacée, le manque deviendrait invisible.");
        }

        // ═══ ⑥ — les trois archétypes que le client croyait non servis ════════════════════════

        /// <summary>⛔ UNE FALSIFIABLE PAR ARCHÉTYPE : la clé SERVIE produit le texte du CATALOGUE. Le
        /// catalogue chargé est l'`en` du back (58ab315a) — un `return "Gros bras";` en dur, l'état
        /// d'avant, rend le français et rougit ici. Sans catalogue, la clé DEMANDÉE est exactement celle
        /// que le back sert (un littéral réécrit changerait la clé, et ce test le verrait).</summary>
        [TestCase("MUSCLE",           "famille.archetype.gros_bras",     "Muscle",           "Gros bras")]
        [TestCase("INTELLIGENCE",     "famille.archetype.renseignement", "Intelligence",     "Renseignement")]
        [TestCase("FACILITY_MANAGER", "famille.archetype.intendant",     "Facility manager", "Intendant")]
        public void ArchetypeServi_RendLeTexteDuCatalogue(string archetype, string cle, string servi, string repli)
        {
            Libelle.RemettreLesCompteurs();
            Assert.AreEqual(repli, MafiaCleanCity.Operational.FamilleLabels.Archetype(archetype),
                $"sans catalogue, « {archetype} » doit rendre le mot français de l'atelier");
            Assert.AreEqual(cle, Libelle.DernierRepli,
                $"« {archetype} » ne demande pas la clé que le back sert");

            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string> { { cle, servi } });
            Assert.AreEqual(servi, MafiaCleanCity.Operational.FamilleLabels.Archetype(archetype),
                $"« {archetype} » : la clé est servie, l'anglophone doit lire « {servi} », pas le français");
        }

        // ═══ ㉔ sur ⑥ — un geste, un nom ═══════════════════════════════════════════════════════

        /// <summary>⛔ UNE FALSIFIABLE PAR GESTE D'AUTONOMIE : le bouton de ⑥ porte le mot de ㉔, et DEMANDE la clé que
        /// le back servira. Sans catalogue, le mot français de l'atelier (et plus l'ancien) ; avec un catalogue `en`
        /// qui ne sert QUE la clé neuve, le texte `en` — donc la clé dérivée est exactement celle-là. Écran bâti sur un
        /// hôte INACTIF (`Start` ne part pas : ni connexion, ni requête), sous un canvas du test, détruit en immédiat.</summary>
        [TestCase("Action_remettre_le_budget_a_zero", "Lui rendre sa marge", "Remettre le budget à zéro",
                  "famille.ecran.lui_rendre_sa_marge", "Give them their margin back")]
        [TestCase("Action_relever_le_plafond", "Lui élargir sa marge", "Relever le plafond",
                  "famille.ecran.lui_elargir_sa_marge", "Widen their margin")]
        [TestCase("Action_forcer_une_fois", "Laisser passer celle-ci", "Forcer une fois",
                  "famille.ecran.laisser_passer_celle_ci", "Let this one through")]
        public void GesteDAutonomie_PorteLeMotDe24_EtSaCle(string objet, string mot, string ancien, string cle, string en)
        {
            Assert.AreEqual(mot, LibelleDuBouton(objet, null), $"« {objet} » ne porte pas le mot de ㉔");
            Assert.AreNotEqual(ancien, LibelleDuBouton(objet, null), $"« {objet} » porte encore l'ancien nom");
            Assert.AreEqual(en, LibelleDuBouton(objet, new Dictionary<string, string> { { cle, en } }),
                $"« {objet} » ne demande pas la clé « {cle} » : le texte servi n'arrive pas au bouton");
        }

        /// <summary>Bâtit ⑥ sans réseau et rend le texte du bouton `objet` (nom d'objet stable, jamais le libellé).</summary>
        private static string LibelleDuBouton(string objet, Dictionary<string, string> catalogueEn)
        {
            I18nCatalog.Oublier();
            if (catalogueEn != null) I18nCatalog.ChargerPourTest("en", catalogueEn);
            bool avaitUnEventSystem = Object.FindFirstObjectByType<UnityEngine.EventSystems.EventSystem>() != null;
            var canvasGo = new GameObject("GestesCanvas", typeof(RectTransform), typeof(Canvas));
            var hote = new GameObject("GestesHote", typeof(RectTransform));
            hote.SetActive(false);
            try
            {
                var ecran = hote.AddComponent<MafiaCleanCity.Operational.Lieutenant.LieutenantScreenController>();
                ecran.SetMountParent(canvasGo.transform);
                ecran.PickedArchetype = "COOK";   // EnsureInitialized → BuildLayout, sans réseau
                foreach (Transform t in canvasGo.GetComponentsInChildren<Transform>(true))
                    if (t.name == objet)
                    {
                        var texte = t.GetComponentInChildren<TMPro.TextMeshProUGUI>(true);
                        Assert.IsNotNull(texte, $"« {objet} » n'a pas de libellé");
                        return texte.text;
                    }
                Assert.Fail($"aucun bouton « {objet} » sous l'écran bâti — l'identifiant d'objet a changé ?");
                return null;
            }
            finally
            {
                Object.DestroyImmediate(hote);
                Object.DestroyImmediate(canvasGo);
                if (!avaitUnEventSystem)
                {
                    var es = Object.FindFirstObjectByType<UnityEngine.EventSystems.EventSystem>();
                    if (es != null) Object.DestroyImmediate(es.gameObject);
                }
                I18nCatalog.Oublier();
            }
        }
}
}
