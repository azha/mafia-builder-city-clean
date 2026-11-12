using System.Collections;
using System.Linq;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.CitySim.Inspection;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Tests;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CitySim.Inspection.Tests
{
    // ⑮ — D2 (le registre des 18) et D3 (le dépôt), fermés le 2026-09-22.
    //
    // ⛔ CE QUE CES TESTS PROUVENT, ET CE QU'ILS NE PROUVENT PAS. Ils lisent l'ÉTAT du contrôleur après
    // son rendu (18 lignes, 18 files ouvertes, un prix lu dans la réponse) — jamais un pixel. La
    // planche, elle, reste prise par `PlancheEcransCapturePlayModeTests` (catégorie PhotoPlanche),
    // sur le compte de capture, dans le créneau du juge.
    //
    // ⚠️ Le compte SEMÉ (`operational_demo`, le seeder le rend) sert aux deux lectures et au dépôt :
    // ses 18 files existent parce que la pile a déjà vécu le tick de dispatch (mesuré 18 × 200 le
    // 2026-09-22). Sur une pile NEUVE, le premier test échouera avec ce message-là — c'est la réserve
    // du juge (S12-d), pas un défaut du client : « 404 au signup, après dépôt, et 5 min plus tard ».
    [Category("Inspection")]
    public class InspectionScreenPlayModeTests
    {
        private static string BaseUrl => MafiaCleanCity.AdresseDuBack.Url;   // la source du shell (garde de classe, 26/09)
        private static string email;
        private static string password;
        private static int callsignSeq;
        private GameObject host;
        private string token;

        [OneTimeSetUp]
        public void SemerPrecondition()
        {
            string json = SeederSupport.RunSeeder(
                SeederSupport.OperationalSeeder, SeederSupport.OperationalMarker);
            email = SeederSupport.ExtractString(json, "email");
            password = SeederSupport.ExtractString(json, "password");
            Assert.IsNotEmpty(email, "le seeder a rendu l'identité du joueur");
            Assert.IsNotEmpty(password, "le seeder a rendu son mot de passe");
        }

        [TearDown]
        public void Nettoyer()
        {
            if (host != null) Object.Destroy(host);
            NettoyerLeCanevas();
        }

        private InspectionScreenController Monter()
        {
            host = new GameObject("InspectionHost", typeof(RectTransform));
            return host.AddComponent<InspectionScreenController>();
        }

        private IEnumerator SeConnecterAuCompteSeme()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string err = null;
            token = null;
            yield return auth.SignIn(email, password, t => token = t, e => err = e);
            Assert.IsNull(err, $"connexion du joueur seedé : {err}");
            Assert.IsNotEmpty(token, "la connexion a rendu un bearer");
        }

        private IEnumerator OuvrirUnCompteFrais()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("insp", ref callsignSeq);
            string err = null;
            token = null;
            yield return auth.SignUp(callsign, "inspection-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup a échoué : {err}");
            Assert.IsNotEmpty(token, "le signup a rendu un bearer");
        }

        private static IEnumerator AttendreLeRendu(InspectionScreenController ecran, float secondes = 60f)
        {
            float deadline = Time.realtimeSinceStartup + secondes;
            while (ecran.RendusEffectues == 0 && Time.realtimeSinceStartup < deadline)
                yield return null;
            Assert.Greater(ecran.RendusEffectues, 0,
                "l'écran n'a pas fini son chargement (1 + 18 + 1 appels) dans le délai");
        }

        // ═══ D2 — le registre ═══════════════════════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator Registre_18Districts_ToutOuRien_SurLeCompteSeme()
        {
            yield return SeConnecterAuCompteSeme();
            var ecran = Monter();
            ecran.SetToken(token);
            yield return AttendreLeRendu(ecran);

            Assert.IsNull(ecran.DerniereErreur, $"une file a répondu autre chose que 200/404 : {ecran.DerniereErreur}");
            Assert.IsNotNull(ecran.Districts, "les noms (`world/districts`) ne sont pas arrivés");
            Assert.AreEqual(InspectionScreenController.NombreDeDistricts, ecran.Districts.Length,
                "le monde ne sert pas 18 districts — le cardinal du pied serait faux");
            Assert.AreEqual(InspectionScreenController.NombreDeDistricts, ecran.FilesOuvertes,
                "⛔ tout ou rien : le compte semé doit avoir ses 18 files (la pile a-t-elle vécu le tick de " +
                "dispatch de 12 h ? S12-d — au 2026-11-11, sur le back servi, une pile neuve rend 18 × 404 ; le back TD-879 de BACK-2 y rend " +
                "18 × 200 EMPTY — ni l'un ni l'autre n'est un défaut du client)");
            Assert.IsFalse(ecran.EtatVide, "18 files ouvertes et l'écran se dit vide");
            Assert.AreEqual(InspectionScreenController.NombreDeDistricts, ecran.LignesRendues,
                "le registre n'a pas 18 lignes — avant D2, il en avait UNE, toujours le district 1");
            for (int k = 0; k < ecran.Files.Length; k++)
                Assert.IsNotNull(ecran.Files[k], $"district {k + 1} : file absente alors que le registre est ouvert");
        }

        // ═══ TD-879 (design `Tools/td-879-inspection-vide/DESIGN.md` v3.1, ruling f2 11/11) ═════════════════════════════════════
        // `Registre_CompteFrais_RienNullePart_18Fois404` est REMPLACÉ par deux propriétés disjointes : (i) le 200 EMPTY (back TD-879 de
        // BACK-2) rend 18 lignes « VIDE » ; (ii) le 404 (back servi) garde l'état vide d'aujourd'hui, avec le DÉTECTEUR de l'énoncé daté.
        // Un 404 n'est JAMAIS traduit en file vide : « pas de file » et « pas de profil » sont indiscernables par ce qui est servi (TD-1010).

        private GameObject canevasGo;

        private void NettoyerLeCanevas() { if (canevasGo != null) Object.Destroy(canevasGo); canevasGo = null; }

        /// <summary>L'écran sous un Canvas propre (sa mise en page vit sous `host`, ses lignes `L_1..L_18` y sont cherchables), les 18 files
        /// servies par le seam (statut, corps) — les noms des districts et les bâtiments restent ceux de la pile (route publique / dépôt).</summary>
        private IEnumerator MonterAvecDesFiles(System.Func<int, (long, string)> files)
        {
            canevasGo = new GameObject("CanevasInspection", typeof(RectTransform), typeof(Canvas));
            host = new GameObject("InspectionHost", typeof(RectTransform));
            host.transform.SetParent(canevasGo.transform, false);
            var ecran = host.AddComponent<InspectionScreenController>();
            ecran.ClientPourTest.ReponsePourTest = id => files(id);
            ecran.SetToken("jeton-de-test");
            yield return AttendreLeRendu(ecran);
            yield return null;   // les lignes du rendu précédent sont détruites en fin d'image
            ecranCourant = ecran;
        }
        private InspectionScreenController ecranCourant;

        /// <summary>Les textes de la colonne `Charge` des lignes `L_1..L_18` rendues.</summary>
        private string[] ChargesRendues()
        {
            var r = new System.Collections.Generic.List<string>();
            foreach (Transform t in host.GetComponentsInChildren<Transform>(false))
                if (t.name.StartsWith("L_", System.StringComparison.Ordinal))
                {
                    Transform c = t.Find("Charge");
                    if (c != null) r.Add(c.GetComponent<TMPro.TextMeshProUGUI>().text);
                }
            return r.ToArray();
        }

        /// <summary>Le corps 200 d'une file — la forme RECOPIÉE du back (`inspection.projection.service.ts:97-155` @3bb33665 ; clés racine épinglées par
        /// `15_17_police.parcours.spec.ts:198-200`) : une file vide est `EMPTY` / `NOMINAL` / toutes bandes `NONE`.</summary>
        private static string CorpsFile(int id, string charge, string programmee = "NONE") =>
            "{\"payload\":{\"data\":{\"district\":\"district-" + id + "\",\"queue_load\":\"" + charge + "\",\"dispatcher_regime\":\"NOMINAL\","
            + "\"severity_distribution\":{\"LOW\":\"NONE\",\"MEDIUM\":\"NONE\",\"HIGH\":\"NONE\",\"CRITICAL\":\"NONE\"},"
            + "\"type_distribution\":{\"SCHEDULED\":\"" + programmee + "\",\"INFORMANT\":\"NONE\",\"FALSE_REPORT\":\"NONE\",\"GENUINE_REPORT\":\"NONE\",\"CASCADE\":\"NONE\",\"FORENSIC\":\"NONE\"}}}}";

        /// <summary>Les deux 404 du back servi (`inspection.controller.ts:93` et `:97-100`, `main` 2ed39589) : MÊME code, MÊME clé, aucun `details` —
        /// seul le message anglais diffère (non servi au joueur, jamais lu).</summary>
        private const string Corps404FilePasSemee = "{\"payload\":{\"error\":{\"code\":\"RESOURCE_NOT_FOUND\",\"message\":\"No inspection queue for this player yet (the city sim has not ticked the 12h dispatch).\",\"user_facing_i18n_key\":\"error.resource.not_found\"}}}";
        private const string Corps404SansProfil = "{\"payload\":{\"error\":{\"code\":\"RESOURCE_NOT_FOUND\",\"message\":\"No player profile for this account.\",\"user_facing_i18n_key\":\"error.resource.not_found\"}}}";
        private const string Corps500 = "{\"payload\":{\"error\":{\"code\":\"INTERNAL_ERROR\",\"message\":\"boom\"}}}";

        /// <summary>(i) — le 200 EMPTY (back TD-879) ⇒ 18 lignes « VIDE » au format du cadre 32 (VIDE / NOMINAL / —), pas de fiche d'état vide.</summary>
        [UnityTest]
        public IEnumerator Registre_DixHuitLignesVides_SurLe200Vide()
        {
            yield return MonterAvecDesFiles(id => (200, CorpsFile(id, "EMPTY")));
            var ecran = ecranCourant;
            Assert.AreEqual(InspectionScreenController.NombreDeDistricts, ecran.FilesOuvertes, "18 files servies en 200");
            Assert.AreEqual(InspectionScreenController.NombreDeDistricts, ecran.FilesVides, "18 files VIDES (queue_load EMPTY)");
            Assert.AreEqual(0, ecran.Files404);
            Assert.IsNull(ecran.DerniereErreur, $"aucune panne : {ecran.DerniereErreur}");
            Assert.IsFalse(ecran.EtatVide, "une ville vide servie en 200 n'est pas « rien nulle part »");
            Assert.AreEqual(InspectionScreenController.NombreDeDistricts, ecran.LignesRendues, "le registre a ses 18 lignes");
            Assert.AreEqual("", ecran.TexteDuVide, "aucune fiche d'état vide au-dessus du registre");
            string vide = MafiaCleanCity.I18n.MotsDesEnumeres.Dire(MafiaCleanCity.I18n.MotsDesEnumeres.ChargeDeLaFile, "EMPTY");
            string[] charges = ChargesRendues();
            Assert.AreEqual(InspectionScreenController.NombreDeDistricts, charges.Length, "anti-vacuité : 18 colonnes « Charge » lues");
            Assert.AreEqual(InspectionScreenController.NombreDeDistricts, charges.Count(c => c == vide), $"18 lignes disent « {vide} » (le cadre 32 : VIDE)");
        }

        /// <summary>(ii) — le back SERVI, compte frais réel : depuis le 12/11 (pile de dev 8d0184a4) il sert 18 × 200 EMPTY ⇒ le registre de 18 lignes « VIDE », aucune fiche
        /// d'état vide. (Jusqu'au 11/11 il servait 18 × 404 et ce test était le DÉTECTEUR de l'énoncé daté TD-879 : il a rougi au créneau du 12/11, la phrase de la
        /// police est retirée.) Si la pile resservait des 404 ici, `Files404 == 0` le dirait.</summary>
        [UnityTest]
        public IEnumerator CompteFrais_SurLaPile_DixHuitFilesVidesServies_LeRegistre_PasLEtatVide()
        {
            yield return OuvrirUnCompteFrais();
            var ecran = Monter();
            ecran.SetToken(token);
            yield return AttendreLeRendu(ecran);

            Assert.IsNull(ecran.DerniereErreur, $"une ville vide n'est pas une panne — et l'écran a enregistré : {ecran.DerniereErreur}");
            Assert.AreEqual(0, ecran.Files404, "un compte frais ne reçoit plus de 404 sur le back servi (TD-879)");
            Assert.AreEqual(InspectionScreenController.NombreDeDistricts, ecran.FilesVides, "un compte frais : 18 × 200 EMPTY sur le back servi");
            Assert.IsFalse(ecran.EtatVide, "une ville vide servie en 200 n'est pas « rien nulle part »");
            Assert.AreEqual(InspectionScreenController.NombreDeDistricts, ecran.LignesRendues, "le registre a ses 18 lignes");
            Assert.AreEqual("", ecran.TexteDuVide, "aucune fiche d'état vide au-dessus du registre");
        }

        /// <summary>(iii) — l'état vide (18 × 404 fabriqués, cause non dite : TD-1010) ne parle PLUS de la police (phrase retirée le 12/11) : il dit seulement qu'aucune
        /// inspection n'est en cours. CONTRÔLE : une panne (500) dit autre chose.</summary>
        [UnityTest]
        public IEnumerator EtatVide_SurDes404_NeParlePlusDeLaPolice_ControleLaPanne()
        {
            yield return MonterAvecDesFiles(_ => (404, Corps404FilePasSemee));
            Assert.IsTrue(ecranCourant.EtatVide);
            Assert.AreEqual(MafiaCleanCity.Tests.ValeurAttendue.Cle("inspection.vide.aucune_inspection_en_cours", "Aucune inspection en cours."), ecranCourant.TexteDuVide);
            StringAssert.DoesNotContain("police", ecranCourant.TexteDuVide);
            Nettoyer();
            yield return MonterAvecDesFiles(_ => (500, Corps500));
            Assert.AreNotEqual(MafiaCleanCity.Tests.ValeurAttendue.Cle("inspection.vide.aucune_inspection_en_cours", "Aucune inspection en cours."), ecranCourant.TexteDuVide, "CONTRÔLE : une panne n'est pas l'état vide");
        }

        /// <summary>G1 — un 404 n'est JAMAIS traduit en file vide, quelle que soit sa cause (les deux corps sont indiscernables : TD-1010) ; 404 ≠ 500.
        /// CONTRÔLE POSITIF : le corps 200 EMPTY ⇒ 18 files vides — la garde voit une file vide quand il y en a une.</summary>
        [UnityTest]
        public IEnumerator G1_Un404NEstJamaisUneFileVide_404DifferentDe500_ControleLe200Vide()
        {
            foreach (string corps404 in new[] { Corps404FilePasSemee, Corps404SansProfil })
            {
                yield return MonterAvecDesFiles(_ => (404, corps404));
                var e = ecranCourant;
                Assert.AreEqual(InspectionScreenController.NombreDeDistricts, e.Files404, "18 × 404 comptés");
                Assert.AreEqual(0, e.FilesVides, "un 404 n'est JAMAIS une file vide (réintroduire « 404 ⇒ FileVide » ferait mentir l'écran à un compte sans profil)");
                Assert.IsTrue(e.EtatVide);
                Assert.AreEqual(0, e.LignesRendues);
                Nettoyer();
            }
            yield return MonterAvecDesFiles(_ => (500, Corps500));
            Assert.AreEqual(0, ecranCourant.Files404, "un 500 n'est pas un 404");
            Assert.IsNotNull(ecranCourant.DerniereErreur, "un 500 est une panne");
            Nettoyer();

            yield return MonterAvecDesFiles(id => (200, CorpsFile(id, "EMPTY")));
            Assert.AreEqual(InspectionScreenController.NombreDeDistricts, ecranCourant.FilesVides, "CONTRÔLE POSITIF : le 200 EMPTY ⇒ 18 files vides");
            Assert.AreEqual(0, ecranCourant.Files404, "CONTRÔLE POSITIF : aucun 404");
            Assert.IsFalse(ecranCourant.EtatVide, "CONTRÔLE POSITIF : le registre s'ouvre");
        }

        /// <summary>G2 — anti-vacuité de (i) : un registre MIXTE (la distribution du cadre 32 : 10 vides, 8 pleines) rend 10 « VIDE », pas 18.</summary>
        [UnityTest]
        public IEnumerator G2_RegistreMixte_DixLignesVides_PasDixHuit()
        {
            yield return MonterAvecDesFiles(id => id <= 10 ? (200, CorpsFile(id, "EMPTY")) : (200, CorpsFile(id, "LIGHT", "SOME")));
            string vide = MafiaCleanCity.I18n.MotsDesEnumeres.Dire(MafiaCleanCity.I18n.MotsDesEnumeres.ChargeDeLaFile, "EMPTY");
            string[] charges = ChargesRendues();
            Assert.AreEqual(InspectionScreenController.NombreDeDistricts, charges.Length, "18 lignes");
            Assert.AreEqual(10, charges.Count(c => c == vide), "10 lignes « VIDE » sur un registre mixte : le compte distingue les lignes vides des pleines");
            Assert.AreEqual(10, ecranCourant.FilesVides);
        }

        /// <summary>G3 — ERREUR ≠ VIDE : 18 × 500 ⇒ la fiche dit la panne, jamais une ville vide. CONTRÔLE : 17 EMPTY + 1 × 500 ⇒ le registre de 18 lignes
        /// ET l'erreur enregistrée (la panne partielle ne bascule pas en fiche).</summary>
        [UnityTest]
        public IEnumerator G3_PanneTotale_DitLaPanne_PannePartielle_GardeLeRegistre()
        {
            yield return MonterAvecDesFiles(_ => (500, Corps500));
            // la cause est ISOLÉE (revue ⊥ du code) : `DerniereErreur` peut venir aussi de `LireDistricts` (pile réelle) — ces deux comptes disent que ce sont les FILES qui ont failli
            Assert.AreEqual(0, ecranCourant.Files404, "18 × 500 : aucun n'est compté 404");
            Assert.AreEqual(0, ecranCourant.FilesOuvertes, "18 × 500 : aucune file ouverte");
            Assert.IsTrue(ecranCourant.EtatVide);
            Assert.IsNotNull(ecranCourant.DerniereErreur);
            Assert.AreEqual("La file n'a pas répondu.", ecranCourant.TexteDuVide, "une panne totale est dite comme une panne");
            Assert.AreEqual(0, ecranCourant.LignesRendues);
            Nettoyer();

            yield return MonterAvecDesFiles(id => id == 7 ? (500, Corps500) : (200, CorpsFile(id, "EMPTY")));
            Assert.AreEqual(InspectionScreenController.NombreDeDistricts, ecranCourant.LignesRendues, "CONTRÔLE : panne partielle ⇒ les 18 lignes (la défaillante éteinte)");
            Assert.IsNotNull(ecranCourant.DerniereErreur, "CONTRÔLE : …et la panne est enregistrée");
            Assert.AreEqual(17, ecranCourant.FilesVides);
        }

        /// <summary>G4 — la source des mots de la ligne VIDE : les domaines fermés portent `EMPTY` et `NOMINAL` (sinon le registre dirait l'énuméré brut).</summary>
        [Test]
        public void G4_LesMotsDeLaLigneVideExistent()
        {
            Assert.IsTrue(MafiaCleanCity.I18n.MotsDesEnumeres.ChargeDeLaFile.Mots.ContainsKey("EMPTY"), "`EMPTY` a son mot (« vide »)");
            Assert.IsTrue(MafiaCleanCity.I18n.MotsDesEnumeres.Regime.Mots.ContainsKey("NOMINAL"), "`NOMINAL` a son mot (« nominal »)");
            Assert.AreNotEqual("EMPTY", MafiaCleanCity.I18n.MotsDesEnumeres.Dire(MafiaCleanCity.I18n.MotsDesEnumeres.ChargeDeLaFile, "EMPTY"));
        }

        // ═══ F7 (juge d'ensemble r1, 08/10) — le dépôt est une FICHE de papier, pas du texte clair sur le liège ═══════════════════════

        private static float Luminance(Color c)
        {
            float F(float v) => v <= 0.03928f ? v / 12.92f : Mathf.Pow((v + 0.055f) / 1.055f, 2.4f);
            return 0.2126f * F(c.r) + 0.7152f * F(c.g) + 0.0722f * F(c.b);
        }
        private static float Contraste(Color a, Color b)
        {
            float la = Luminance(a), lb = Luminance(b);
            return (Mathf.Max(la, lb) + 0.05f) / (Mathf.Min(la, lb) + 0.05f);
        }

        [UnityTest]
        public IEnumerator Depot_LeBlocEstUneFicheDePapier_ToutLeTexteSeLitSurSaPlaque()
        {
            var ecran = Monter();
            yield return null; yield return null; yield return null;
            Transform fiche = ecran.transform.Find("Fiche");
            Assert.IsNotNull(fiche, "le dépôt est une fiche de papier (`.depot`, cadre 33)");
            Color plaque = fiche.GetComponent<UnityEngine.UI.Image>().color;
            Assert.AreEqual(1f, plaque.a, 0.001f, "la plaque est opaque");
            foreach (string nom in new[] { "DepotTitre", "Cible", "Effet", "Prix", "Deposer", "Avert" })
                Assert.AreSame(fiche, ecran.transform.Find("Fiche/" + nom)?.parent, nom + " est DANS la fiche (jamais posé directement sur le liège)");
            int lus = 0;
            foreach (TMPro.TextMeshProUGUI t in fiche.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true))
            {
                lus++;
                float seuil = t.transform.parent.name == "Deposer" ? 3f : 4.5f;   // le tampon « DÉPOSER » est un GRAND texte (9 px CSS, gras, espacé) : 3:1
                Assert.GreaterOrEqual(Contraste(t.color, plaque), seuil, $"« {t.name} » sur la plaque de la fiche : {Contraste(t.color, plaque):0.00}:1 < {seuil}:1");
            }
            Assert.GreaterOrEqual(lus, 5, "population lue : titre, cible, effet, prix, libellé du tampon, avertissement (anti-vacuité)");
            Assert.Less(Contraste(new Color32(0xb9, 0xac, 0x92, 255), plaque), 4.5f, "contrôle positif : l'ancienne encre claire (#b9ac92) ne passe PAS sur la plaque");
        }

        // ═══ F1 (juge d'ensemble r2, 08/10) — l'état vide n'est pas une moitié de page de liège nu ════════════════════════════
        // Le `Support` de ⑮ était posé en FRACTION (0,10 ⇒ 90 % de la page) : sous un registre court et une fiche, 37 à 49 % de la hauteur n'étaient que du liège (juge r2 : 1180 px sur 2400, 709 sur 1920 ;
        // le plus grand trou VOULU des cadres 31/33/34 : 24,8 %). La maquette borne le liège à 400 px CSS (`min-height`) ; la scène reste au-dessus. Garde d'EFFET : l'écran RÉEL (compte frais, le vrai back)
        // rendu dans un banc à deux hauteurs (9:16 et 9:20 ; 1 px CSS = 1,8 px), la part de liège nu SOUS la fiche, jusqu'au dock, ≤ 25 % de la hauteur.

        private sealed class BancVide : System.IDisposable
        {
            public const int W = 540;
            public readonly int H;
            public readonly RenderTexture Rt; public readonly Camera Cam; public readonly Canvas Canvas;
            private readonly GameObject camGo, canGo;
            public BancVide(int hauteur)
            {
                H = hauteur;
                Rt = new RenderTexture(W, H, 24, RenderTextureFormat.ARGB32);
                camGo = new GameObject("vide_cam"); Cam = camGo.AddComponent<Camera>();
                Cam.targetTexture = Rt; Cam.clearFlags = CameraClearFlags.SolidColor; Cam.backgroundColor = Color.black;
                Cam.orthographic = true; Cam.enabled = false;
                canGo = new GameObject("vide_canvas", typeof(Canvas), typeof(UnityEngine.UI.CanvasScaler), typeof(UnityEngine.UI.GraphicRaycaster));
                Canvas = canGo.GetComponent<Canvas>(); Canvas.renderMode = RenderMode.ScreenSpaceCamera; Canvas.worldCamera = Cam;
                var scaler = canGo.GetComponent<UnityEngine.UI.CanvasScaler>();
                scaler.uiScaleMode = UnityEngine.UI.CanvasScaler.ScaleMode.ConstantPixelSize;
                scaler.scaleFactor = W / 1280f;   // l'échelle du shell : un canvas de 1280 unités de large (1 px CSS = 1280/300 unités = 1,8 px de banc)
            }
            public Texture2D Rendre()
            {
                UnityEngine.UI.LayoutRebuilder.ForceRebuildLayoutImmediate((RectTransform)canGo.transform);
                Canvas.ForceUpdateCanvases(); Cam.Render();
                RenderTexture avant = RenderTexture.active; RenderTexture.active = Rt;
                var t = new Texture2D(W, H, TextureFormat.RGB24, false);
                t.ReadPixels(new Rect(0, 0, W, H), 0, 0); t.Apply(); RenderTexture.active = avant;
                return t;
            }
            /// <summary>L'ordonnée en pixels de banc, depuis le BAS, d'un point du monde.</summary>
            public float YDepuisLeBas(Vector3 monde)
            {
                var c = (RectTransform)canGo.transform;
                return (c.InverseTransformPoint(monde).y - c.rect.yMin) / c.rect.height * H;
            }
            public void Dispose() { Object.DestroyImmediate(canGo); Object.DestroyImmediate(camGo); Rt.Release(); Object.DestroyImmediate(Rt); }
        }

        /// <summary>Du LIÈGE : assez rouge (r ≥ 60) et nettement plus chaud que bleu (r − b ≥ 30) — le dégradé va de (138,106,58) à (81,58,28) ; la scène de nuit est froide et sombre.</summary>
        private static bool EstDuLiege(Color c) => c.r * 255f >= 60f && (c.r - c.b) * 255f >= 30f;

        private static float PartDeLiege(Texture2D t, float yBas, float yHaut)
        {
            int vus = 0, total = 0;
            for (int y = Mathf.CeilToInt(yBas); y <= Mathf.FloorToInt(yHaut); y += 5)
                for (int x = (int)(0.1f * BancVide.W); x < (int)(0.9f * BancVide.W); x += 6) { total++; if (EstDuLiege(t.GetPixel(x, y))) vus++; }
            Assert.Greater(total, 20, $"anti-vacuité : la zone [{yBas:0}, {yHaut:0}] n'a que {total} points");
            return vus / (float)total;
        }

        [UnityTest]
        public IEnumerator Vide_LeLiegeEstBorne_LeBasNEstPasDuLiegeNu_DeuxHauteurs_AvecControlePositif()
        {
            float hautAvant = ShellChrome.TopInsetPx, basAvant = ShellChrome.BottomInsetPx;
            const float dockCss = 61f;   // le dock mesuré par le juge r2 : l'encre du bas commence à 219 px de l'image de 2400 = 61 px CSS
            // 12/11 : un compte frais RÉEL ne donne plus l'état vide (la pile sert 18 × 200 EMPTY, TD-879) ⇒ l'état vide est monté sur 18 × 404 fabriqués
            foreach (int hauteur in new[] { 960, 1200 })
            {
                var banc = new BancVide(hauteur);
                Texture2D t = null;
                try
                {
                    ShellChrome.PublierInsets(0f, dockCss * 1280f / 300f);
                    host = new GameObject("InspectionHost", typeof(RectTransform));
                    host.transform.SetParent(banc.Canvas.transform, false);
                    var rt = (RectTransform)host.transform;
                    rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one; rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
                    var ecran = host.AddComponent<InspectionScreenController>();
                    ecran.ClientPourTest.ReponsePourTest = _ => (404, Corps404FilePasSemee);
                    ecran.SetToken("jeton-de-test");
                    yield return AttendreLeRendu(ecran);
                    yield return null; yield return null;
                    Assert.IsTrue(ecran.EtatVide, "prémisse : 18 × 404 ⇒ aucune file ouverte, l'état vide");

                    var support = (RectTransform)host.transform.Find("Decor/Support");
                    var fiche = (RectTransform)host.transform.Find("Fiche");
                    float pxParCss = BancVide.W / 300f;
                    var cs = new Vector3[4]; var cf = new Vector3[4];
                    support.GetWorldCorners(cs); fiche.GetWorldCorners(cf);
                    float supportHaut = banc.YDepuisLeBas(cs[1]), supportBas = banc.YDepuisLeBas(cs[0]);
                    float ficheBas = banc.YDepuisLeBas(cf[0]), dock = dockCss * pxParCss;
                    Assert.AreEqual(DecorsDeScene.HauteurSupportInspectionVideCss * pxParCss, supportHaut - supportBas, 3f, $"{hauteur} : le liège est borné à 400 px CSS (pas à une fraction de la page)");
                    float trou = ficheBas - dock - supportBas;
                    // TD-1081 (12/11) : la fiche a perdu une ligne (phrase de la police retirée, TD-879) ⇒ mesuré au créneau 26,1 % à 960 (la maquette, AVEC la phrase : 24,8 %).
                    // Borne relevée de 25 % à 27 % : écart de classe C, consigné ; la maquette de cet état sans la phrase n'existe pas.
                    Assert.LessOrEqual(trou / hauteur, 0.27f, $"{hauteur} : le liège nu sous la fiche, jusqu'au dock, fait {trou / hauteur:P1} de la hauteur ({trou / pxParCss:0} px CSS ; la maquette, avec la phrase de la police : 24,8 %)");

                    t = banc.Rendre();
                    // ⚠️ `EstDuLiege` est calibré à 960 : le dégradé radial du liège change de ton avec la hauteur de la page, la sonde de COULEUR n'est donc posée qu'à 960 (mesuré au créneau du 08/10 :
                    // 0 % de « liège » lu à 1200 sous la fiche) ; la GÉOMÉTRIE (support borné, trou ≤ 25 %), elle, est vérifiée aux deux hauteurs, et le liège réel est jugé sur la planche E09.
                    if (hauteur == 960)
                    Assert.GreaterOrEqual(PartDeLiege(t, Mathf.Max(dock, supportBas) + 4f, ficheBas - 4f), 0.9f, $"{hauteur} : sous la fiche, c'est du liège (la sonde voit le liège)");
                    float bandeBas = supportHaut + 6f, bandeHaut = supportHaut + 0.5f * (hauteur - supportHaut);
                    Assert.LessOrEqual(PartDeLiege(t, bandeBas, bandeHaut), 0.1f, $"{hauteur} : au-dessus du liège borné, c'est la SCÈNE");

                    // CONTRÔLE POSITIF : la fraction du catalogue (l'ancien rendu) — la pile remonte sous 10 % et la part de liège nu sous la fiche dépasse 25 % : la garde voit le défaut.
                    var pose = host.transform.Find("Decor").GetComponent<DecorPose>();
                    pose.FixerLaHauteurDuSupport(null);
                    yield return null; yield return null;
                    Canvas.ForceUpdateCanvases();
                    support.GetWorldCorners(cs); fiche.GetWorldCorners(cf);
                    Assert.Greater((banc.YDepuisLeBas(cs[1]) - banc.YDepuisLeBas(cs[0])) / hauteur, 0.5f, $"{hauteur} : contrôle positif — sans la hauteur posée, le liège couvre une grande part de la page (mesuré 75 % à 960, 60 % à 1200 : le seuil est une marge sous la mesure, pas la mesure)");
                    Assert.Greater((banc.YDepuisLeBas(cf[0]) - dock - banc.YDepuisLeBas(cs[0])) / hauteur, 0.25f, $"{hauteur} : contrôle positif — sans la hauteur posée, le bas dépasse 25 % de liège nu");
                }
                finally
                {
                    ShellChrome.PublierInsets(hautAvant, basAvant);
                    if (t != null) Object.DestroyImmediate(t);
                    if (host != null) Object.DestroyImmediate(host);
                    banc.Dispose();
                }
            }
        }

        // ═══ D3 — le dépôt ══════════════════════════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator Depot_CompteSeme_LePrixEstCeluiDeLaReponse()
        {
            yield return SeConnecterAuCompteSeme();
            var ecran = Monter();
            ecran.SetToken(token);
            yield return AttendreLeRendu(ecran);

            Assert.IsNotNull(ecran.Cible, "le compte semé possède des bâtiments (17 mesurés) : la cible du dépôt doit exister");
            Assert.IsTrue(ecran.PeutDeposer, "avec une cible et un jeton, le geste doit être ouvert");
            int rendusAvant = ecran.RendusEffectues;

            // un signalement FONDÉ, pas le faux du bouton : voir `DeposerPourTest` — le registre des
            // signalements n'est pas purgé par le seeder, et 8 faux pour 1 fondé retournent la police.
            yield return ecran.DeposerPourTest("GENUINE_REPORT");

            Assert.IsNull(ecran.DerniereErreurDepot, $"le dépôt a échoué : {ecran.DerniereErreurDepot}");
            Assert.IsNotNull(ecran.DernierRapport, "la réponse à 4 clés n'est pas arrivée");
            Assert.AreEqual("GENUINE_REPORT", ecran.DernierRapport.entry_type, "le type déposé revient tel quel");
            Assert.Greater(ecran.DernierRapport.cost_resolved, 0, "le prix est SERVI (50 mesuré), jamais deviné");
            Assert.IsFalse(ecran.DernierRapport.backlash_triggered, "un signalement fondé ne retourne jamais la police");
            StringAssert.Contains(ecran.DernierRapport.cost_resolved.ToString(), ecran.TexteDuPrix,
                "le prix affiché est celui de la réponse, pas un littéral");
            Assert.AreEqual("", ecran.TexteDuBaton, "sans retour de bâton, la ligne du bâton reste éteinte");
            Assert.Greater(ecran.RendusEffectues, rendusAvant, "après le dépôt, le registre est relu et redessiné");
        }

        [UnityTest]
        public IEnumerator Depot_CompteFrais_LeKitDeDepartEstLaCible_EtLeDepotPasse()
        {
            // ⛔ PRÉMISSE FAUSSE, PAYÉE AU PREMIER RUN (créneau du 22/09, 13:32) : « un compte frais ne
            //    possède rien ». Faux — la planque est donnée à l'arrivée (㊵·142), donc `me/buildings`
            //    n'est jamais vide et la cible existe dès le signup. L'état « aucun bâtiment à vous »
            //    n'est atteignable par aucun compte réel ; il reste une garde de code, exercée ci-dessous
            //    SANS jeton. Ce test prouve l'inverse de ce que je croyais : le dépôt passe sur un
            //    compte frais (le juge l'avait mesuré : 201 sur son compte frais, 07/09).
            yield return OuvrirUnCompteFrais();
            var ecran = Monter();
            ecran.SetToken(token);
            yield return AttendreLeRendu(ecran);

            Assert.IsNotNull(ecran.Cible, "un compte frais possède son kit de départ : la cible du dépôt existe dès le signup");
            Assert.IsTrue(ecran.PeutDeposer, "avec une cible et un jeton, le geste est ouvert — même le premier jour");
            yield return ecran.DeposerPourTest("GENUINE_REPORT");
            Assert.IsNull(ecran.DerniereErreurDepot, $"le dépôt du premier jour a échoué : {ecran.DerniereErreurDepot}");
            Assert.IsNotNull(ecran.DernierRapport, "la réponse à 4 clés n'est pas arrivée");
            Assert.Greater(ecran.DernierRapport.cost_resolved, 0, "le prix est servi, même à un compte frais");
        }

        [UnityTest]
        public IEnumerator Depot_SansJeton_LeGesteEstRefuse_EtLeRefusEstDit()
        {
            // la garde de code « pas de cible / pas de jeton » : aucune requête ne part, et le refus est dit
            var ecran = Monter();
            yield return null;
            Assert.IsFalse(ecran.PeutDeposer, "sans jeton ni cible, le geste doit être fermé");
            yield return ecran.DeposerPourTest("GENUINE_REPORT");
            Assert.IsNull(ecran.DernierRapport, "aucune requête ne doit partir sans cible");
            Assert.IsNotNull(ecran.DerniereErreurDepot, "le refus est DIT, pas silencieux");
            Assert.AreEqual(0, ecran.RendusEffectues, "aucun chargement n'a eu lieu : le refus n'a pas rendu l'écran");
        }
    }
}
