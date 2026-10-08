using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using UnityEngine.TestTools;
using MafiaCleanCity.Tests;     // ProductionClickSupport
using MafiaCleanCity.Theme;
using MafiaCleanCity.CityMap;   // REUSE AuthClient (signin)
using MafiaCleanCity.Operational;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>screen_b7 « Forensic » — squelette de suite généré par Tools/nouvel-ecran.py.
    ///
    /// ⛔ CE QUE CE SQUELETTE COUVRE : le montage structurel (CanvasRenderer, MaskableGraphic) et
    /// la capture pour le juge visuel. ⛔ CE QU'IL NE COUVRE PAS, et c'est // MÉTIER ICI partout
    /// où il manque : le PARCOURS joueur qui atteint cet écran (doctrine 4-couches, `CLAUDE.md`
    /// § « quatre couches ») — signup → `session/open` → la route, jamais un seed SQL sans le
    /// dire dans le nom du test. Le patron complet est `ReputationScreenPlayModeTests` (㊲,
    /// `pilote-B`) : `OuvrirJoueurFrais()` (signup + `session/close` défensif + lecture d'un
    /// lieutenant du kit de départ) — à adapter ici selon ce que `GetForensic` exige
    /// réellement comme précondition.</summary>
    // ⛔ `ScreenB7` est posée TEST PAR TEST, pas sur la classe (lot de classe du 2026-09-24) : posée sur la classe, elle emportait la
    // capture (Cliche…) avec l'écran — une capture exige l'identité de capture et écrit des PNG. La capture ne porte que sa catégorie.
    public class ForensicScreenPlayModeTests
    {
        private static string BaseUrl => MafiaCleanCity.AdresseDuBack.Url;   // la source du shell (garde de classe, 26/09)
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            MafiaCleanCity.CityMap.DemoIdentityResolver.SortirModeCapture(GetType().Name);   // mode capture levé en fin de test (22/09)
            GameObject reste = GameObject.Find("ForensicRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("ForensicRoot"); }
            if (hostGo != null) Object.Destroy(hostGo);
            hostGo = null;
        }

        /// <summary>La racine RÉELLE de l'écran n'est PAS `hostGo` : hors shell, le contrôleur
        /// découvre un Canvas et bâtit dessous (patron ㊲, ligne pour ligne). Chercher
        /// `hostGo.GetComponentsInChildren` rendrait ZÉRO en silence.</summary>
        private GameObject RacineEcran()
        {
            GameObject r = GameObject.Find("ForensicRoot");
            Assert.IsNotNull(r, "ForensicRoot introuvable : le contrôleur n'a pas construit sa " +
                                "mise en page (ni sous mountParent, ni sous un Canvas découvert)");
            return r;
        }

        private ForensicScreenController MonterEcran()
        {
            hostGo = new GameObject("ForensicScreen", typeof(RectTransform));
            var ecran = hostGo.AddComponent<ForensicScreenController>();
            return ecran;
        }

        // ═══ 1. GARDE STRUCTURELLE — ne lit aucun pixel, ne dépend d'aucune résolution ═══════

        /// <summary>⛔ TOUT `Graphic` PORTE SON `CanvasRenderer`, et TOUT Graphic sous ce fond
        /// est `MaskableGraphic` (donc masquable par un futur `Mask` parent) — patron ㊲, garde
        /// structurelle AVANT toute garde de valeur (c'est celle qui a fermé la classe
        /// "occlusion par fratrie" en 12 lignes là où 4 tours de gardes pixel n'y voyaient rien).
        ///
        /// ⚠️ Anti-vacuité : `AddComponent<ForensicScreenController>()` seul construit déjà le
        /// fond de `BuildLayout()` (appelé depuis `Awake()`), donc CETTE garde mord même sur le
        /// squelette non rempli — au moins 1 Graphic (le fond). Une fois le MÉTIER ICI de
        /// `BuildLayout()` rempli, relever le plancher `Assert.Greater(comptes, 1, ...)` vers une
        /// valeur qui reflète le contenu réel (㊲ l'a posé à 10).</summary>
        [UnityTest]
        [Category("ScreenB7")]
        public IEnumerator ScreenB7S1_ToutGraphic_PorteSonCanvasRenderer()
        {
            MonterEcran();
            yield return null;   // laisser Awake()/BuildLayout() s'exécuter

            var sansRenderer = new List<string>();
            var nonMaskable = new List<string>();
            int comptes = 0;
            foreach (Graphic g in RacineEcran().GetComponentsInChildren<Graphic>(true))
            {
                comptes++;
                if (g.GetComponent<CanvasRenderer>() == null) sansRenderer.Add(g.name);
                if (!(g is MaskableGraphic)) nonMaskable.Add(g.name);
            }

            Assert.Greater(comptes, 0,
                "0 Graphic dans l'arbre — l'écran n'a pas été construit, la garde suivante " +
                "serait vraie À VIDE");
            Assert.IsEmpty(sansRenderer,
                "des Graphic sans CanvasRenderer ne dessinent RIEN, en silence : " +
                string.Join(", ", sansRenderer));
            Assert.IsEmpty(nonMaskable,
                "des Graphic non-MaskableGraphic ignoreraient tout Mask parent (un `Graphic` nu " +
                "dérivé sur mesure, jamais `UnityEngine.UI.Image`/`TextMeshProUGUI`) : " +
                string.Join(", ", nonMaskable));
        }

        // ═══ 2. CAPTURE pour le juge visuel ⊥ — deux résolutions ══════════════════════════════

        /// <summary>Patron ㊲ (`CapturerA`) : bascule le Canvas en `ScreenSpaceCamera` sur une
        /// `RenderTexture` de la taille CIBLE (le batchmode reste bloqué à 640 de large — capturer
        /// une résolution qu'on n'a pas passe par la caméra, pas par `-screen-width`), reconstruit
        /// le layout APRÈS la bascule (sinon on photographie une géométrie calculée pour 640), et
        /// cadre l'ortho sur le rect RÉEL du canvas (pas sur la résolution demandée : le
        /// CanvasScaler change les unités).
        ///
        /// ⚠️ `Canvas.scaleFactor` lu la frame de la création rend 1,0 — plausible et faux, d'où
        /// les `yield return null` avant tout rendu.
        ///
        /// Catégorie propre `PhotoScreenB7` (2026-09-22, gabarit de ㊳) : la classe porte `ScreenB7`,
        /// qui couvre déjà cette méthode — ne pas la répéter ici.
        /// ⚠️ DETTE OUVERTE, MÊME FORME QUE L'ANCIENNE `ScreenC6C1` : cette capture monte l'écran SANS
        /// jeton et SANS `Charger()`, donc ses planches `screen_b7_1080x{1920,2400}.png` montrent la
        /// coquille. Lancer `PhotoScreenB7` ne photographie AUCUNE donnée servie ; la planche chargée
        /// est `ScreenB7C2` (`CaptureForensic`).</summary>
        [UnityTest, Category("Capture"), Category("ClicheB7")]
        public IEnumerator ScreenB7C1_CapturerPourLeJugeVisuel_DeuxResolutions()
        {
            MonterEcran();
            yield return null;

            yield return CapturerA(1080, 1920, "Assets/Screenshots/screen_b7_1080x1920.png");
            yield return CapturerA(1080, 2400, "Assets/Screenshots/screen_b7_1080x2400.png");
        }

        /// <summary>Délègue au support partagé — ses gardes (anti-vacuité, recouvrement,
        /// format) valent alors pour cet écran comme pour les autres.</summary>
        /// <summary>42 `screen_b7` — capture chargée par le RÉSEAU, sur le compte de démo.
        ///
        /// ⚠️ CE QUE CETTE CAPTURE MONTRE, ET CE QU'ELLE NE PROUVE PAS. Les trois bandes sont
        /// servies (`audit_risk_bucket`, `effluent_visibility_bucket`, `lifestyle_alarm_bucket`).
        /// Mais la session back a mesuré le 2026-09-02 que `lifestyle_alarm_bucket` rend `quiet`
        /// avec **zéro ligne** dans `lifestyle_audit_state` pour ce joueur : c'est une valeur par
        /// DÉFAUT, pas une mesure — et **le corps ne permet pas de les distinguer**.
        /// ★ Une bande rendue sans source a exactement la même forme qu'une bande mesurée. Ni ce
        ///   test ni l'écran ne peuvent trancher ; c'est pourquoi l'écran porte l'écart, daté,
        ///   dans son panneau, au lieu de présenter les trois bandes comme trois faits.
        /// ⛔ Et il n'existe AUCUNE maquette ratifiée pour cet écran (`front.md` : maquette ❌,
        /// 20 des 24 écrans v1.x n'en ont aucune). Cette capture ne peut donc pas être jugée
        /// « conforme au dessin » — il n'y a pas de dessin.
        ///
        /// ⛔⛔ CE QUE LE VERT DE CE TEST NE DIT PAS : RIEN SUR LES INSETS DE CHROME. Cet écran
        /// pose son bandeau et son dock PAR ANALOGIE avec les autres — les valeurs n'ont jamais
        /// été mesurées sur lui — et AUCUNE assertion de ce fichier ne les regarde. Vérifié le
        /// 2026-09-02 : `TopInsetPx` / `BottomInsetPx` n'apparaissent nulle part ici.
        /// ★ J'ai failli cocher « insets de 42 vérifiés » parce que la catégorie était verte.
        ///   Un vert dit que rien n'a levé ; il ne dit pas que la propriété a été MESURÉE. Le
        ///   même piège que la garde de lisibilité armée sur un écran injoignable — présente,
        ///   inopérante, et verte.
        /// ⚠️ ET ON NE PEUT PAS SIMPLEMENT AJOUTER LA GARDE ICI : hors shell, `ShellChrome`
        /// publie des insets à ZÉRO, donc `offsetMin.y >= 0` serait vrai toujours et ne
        /// mesurerait rien. C'est exactement le piège que ⑨ neutralise par un
        /// `Assert.Greater(BottomInsetPx, 0f, "…sinon la garde ci-dessous ne mesure rien")`.
        /// ⇒ CONDITION DE LEVÉE : `AppShell.ActivateTab` ne monte que ㊲ sous `Tab.More` SUR
        ///   CETTE BRANCHE — donc ㊴ n'y est atteignable par aucun chemin joueur.
        /// ⚠️ CORRIGÉ le 2026-09-02 : j'avais d'abord écrit « le jour où ㊴ sera monté », comme
        ///   si le montage restait à faire. Il est fait — `Tab.More` est devenu un MENU de douze
        ///   entrées sur `main`, et ㊴ y figure depuis ce matin. Ma branche avait 71 commits de
        ///   retard, ce que je n'avais pas vérifié avant de conclure.
        /// ★ La mesure était juste et sa PORTÉE fausse : « ㊴ n'est monté nulle part » valait
        ///   pour cette branche, pas pour le dépôt. Une mesure locale énoncée au présent général
        ///   se lit comme un état du monde — c'est la même faute que le vert qui ne mesurait pas
        ///   les insets, un cran plus haut : exacte, et pas sur ce qu'on croit.
        /// ⇒ Donc : dès que `main` atteint cette branche, écrire ici la capture SOUS CHROME et
        ///   ses deux gardes d'inset, sur le patron de ⑨/②/㊱. Jusque-là, les insets de ㊴ sont
        ///   une SUPPOSITION, et c'est écrit plutôt que passé sous silence.</summary>
        [UnityTest, Category("Capture"), Category("CaptureForensic")]
        public IEnumerator ScreenB7C2_CapturerParLeReseau()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string token = null, err = null;
            // ⛔ PLUS D'IDENTITÉ EN DUR (22/09) : `operational_demo` était écrit ici, hors de la règle unique de 55e674db — la planche
            // photographiait un compte que le RUN ne désignait pas. La règle du résolveur, puis la garde d'effet.
            var (idCapture, mdpCapture) = MafiaCleanCity.Shell.Tests.CaptureSousShell.IdentiteDeCaptureOuEchoue("screen_b7_forensic");
            yield return auth.SignIn(idCapture, mdpCapture,
                                     t => token = t, e => err = e);
            Assert.IsNull(err, $"connexion au compte de capture « {idCapture} » échouée : {err}");
            yield return MafiaCleanCity.Shell.Tests.CaptureSousShell.IdentiteConnecteeOuEchoue(token, idCapture, "screen_b7_forensic");

            ForensicScreenController ecran = MonterEcran();
            ecran.SetToken(token);
            yield return null;
            yield return ecran.Charger();
            yield return null;

            // Le vide RENDU et le vide SUBI ont la même image.
            Assert.IsNull(ecran.DerniereErreur,
                $"la route a échoué (code {ecran.DernierCodeErreur}) : la capture montrerait " +
                "l'état d'indisponibilité, pas les signaux");
            Assert.IsNotNull(ecran.DernierChargement, "aucun corps reçu");

            yield return CapturerA(1080, 2400, "Assets/Screenshots/screen_b7_forensic_1080x2400.png");
        }

        /// <summary>Les résolveurs de bande, avec leurs contrôles NÉGATIFS.
        /// ⛔ Le vocabulaire complet de chaque bande n'est pas connu — une seule valeur par signal
        /// a été observée. Ce test fixe donc la propriété qui compte : une bande inconnue rend
        /// `Inconnu` et s'affiche TELLE QUELLE, jamais rabattue sur « calme ». Sans les négatifs,
        /// un résolveur qui rendrait `Calme` pour tout passerait les positifs.</summary>
        [Test]
        [Category("ScreenB7")]
        public void ScreenB7_UneBandeInconnueNEstJamaisRabattueSurCalme()
        {
            Assert.AreEqual(ForensicResolvers.Gravite.Calme,     ForensicResolvers.NiveauDe("quiet"));
            Assert.AreEqual(ForensicResolvers.Gravite.Surveille, ForensicResolvers.NiveauDe("watched"));
            Assert.AreEqual(ForensicResolvers.Gravite.Criant,    ForensicResolvers.NiveauDe("visible"));
            // 22/09 : `glaring` est le DERNIER cran de sa piste — un événement (cadre 143), plus une gravité
            Assert.AreEqual(ForensicResolvers.Gravite.Franchi,   ForensicResolvers.NiveauDe("glaring"));

            Assert.AreEqual(ForensicResolvers.Gravite.Inconnu, ForensicResolvers.NiveauDe("smouldering"),
                "un mot que le serveur inventerait doit rester INCONNU, pas devenir « calme »");
            Assert.AreEqual(ForensicResolvers.Gravite.Inconnu, ForensicResolvers.NiveauDe(""));
            Assert.AreEqual(ForensicResolvers.Gravite.Inconnu, ForensicResolvers.NiveauDe(null));

            // et la phrase ne RASSURE pas : 23/09 (règle f2, atelier 28), le mot BRUT du serveur est remplacé par « état inconnu »
            // — toujours jamais « calme ». L'épingle est remplacée par la propriété qui compte, pas assouplie.
            Assert.AreEqual(MafiaCleanCity.I18n.Repli.EtatInconnu, ForensicResolvers.Phrase("smouldering"));
            Assert.AreNotEqual(ForensicResolvers.Phrase("quiet"), ForensicResolvers.Phrase("smouldering"), "jamais rabattue sur calme");
            Assert.AreEqual("—", ForensicResolvers.Phrase(null));
        }

        /// <summary>⛔ UNE FALSIFIABLE PAR VALEUR SERVIE (22/09, classe « le client compare une valeur que le back ne sert pas »,
        /// mesurée par CLIENT-2) : les douze valeurs des trois domaines du back (`forensic.projection.service.ts:79/98/118`) —
        /// chacune doit rendre un texte NON VIDE et DIFFÉRENT de la valeur brute. Avant : `flagged`, `audited`, `subpoenaed`
        /// sortaient brutes (« Inconnu »). Et le dernier cran de chaque piste est un ÉVÉNEMENT (`Franchi`), jamais une gravité.</summary>
        [Test]
        [Category("ScreenB7")]
        public void ScreenB7_ChaqueValeurServie_RendUnTexte_EtLeDernierCranEstUnEvenement()
        {
            string[] servies = { "clean", "watched", "flagged", "audited",       // AuditRiskBucket
                                 "clear", "faint", "visible", "glaring",          // EffluentVisibilityBucket
                                 "quiet", "noticed", "watched", "subpoenaed" };   // LifestyleAlarmBucket
            foreach (string v in servies)
            {
                string texte = ForensicResolvers.Phrase(v);
                Assert.IsFalse(string.IsNullOrWhiteSpace(texte), $"« {v} » rend un texte vide");
                Assert.AreNotEqual(v, texte, $"« {v} » sort BRUTE : aucune correspondance pour une valeur que le back sert");
                Assert.AreNotEqual(ForensicResolvers.Gravite.Inconnu, ForensicResolvers.NiveauDe(v), $"« {v} » est rangée « Inconnu »");
                Assert.DoesNotThrow(() => ForensicResolvers.CouleurPour(ForensicResolvers.NiveauDe(v)), $"« {v} » n'a pas de couleur");
            }
            foreach (string evenement in new[] { "audited", "glaring", "subpoenaed" })
                Assert.AreEqual(ForensicResolvers.Gravite.Franchi, ForensicResolvers.NiveauDe(evenement),
                    $"« {evenement} » est le dernier cran de sa piste : un événement, pas une gravité de plus (cadre 143)");
            Assert.AreEqual(ForensicResolvers.Gravite.Surveille, ForensicResolvers.NiveauDe("flagged"),
                "« flagged » est un cran de surveillance, SOUS « audited » (atelier ca69012c §4)");
            Assert.AreNotEqual(ForensicResolvers.Phrase("watched"), ForensicResolvers.Phrase("flagged"),
                "« flagged » a SON mot (« un dossier est ouvert »), pas la phrase générique de sa gravité");

            // « Convocation reçue », pas « Convoqué » (22/09, variante neutre de l'atelier 32e29ab8) : la bande ne dit pas le
            // genre du joueur. Le back sert CETTE clé — un littéral qui change change la clé, et ce test le voit.
            const string cleConvocation = "forensic.evenement.convocation_recue";
            MafiaCleanCity.I18n.Libelle.RemettreLesCompteurs();
            string convocation = ForensicResolvers.Phrase("subpoenaed");
            if (MafiaCleanCity.I18n.Libelle.NbReplis == 1)
            {
                Assert.AreEqual(cleConvocation, MafiaCleanCity.I18n.Libelle.DernierRepli, "« subpoenaed » ne dérive pas la clé que le back sert");
                Assert.AreEqual("Convocation reçue", convocation, "« subpoenaed » : le repli n'est pas le mot retenu");
            }
            else
                Assert.AreEqual(MafiaCleanCity.I18n.I18nCatalog.Traduire(cleConvocation), convocation,
                    "« subpoenaed » : le mot servi n'est pas celui de la clé convocation_recue");
        }

        private IEnumerator CapturerA(int largeur, int hauteur, string chemin)
        {
            GameObject racine = RacineEcran();
            Canvas canvas = racine.GetComponentInParent<Canvas>();
            yield return MafiaCleanCity.Tests.CaptureSupport.CapturerCanvas(
                canvas, (RectTransform)racine.transform, largeur, hauteur, chemin);
            MafiaCleanCity.Tests.CaptureSupport.GarderLaCapture(chemin);
        }

        // ═══ 3. LE DOSSIER (㊴, DESIGN v5.2 §6) — corps FABRIQUÉS, aucun réseau ═══════════════════════════════════════

        private static GetForensicResponseDto Bandes(string audit, string effluent, string lifestyle) =>
            new GetForensicResponseDto { audit_risk_bucket = audit, effluent_visibility_bucket = effluent, lifestyle_alarm_bucket = lifestyle };

        private static ActeurDto Acteur(string type, string statut, string reference) =>
            new ActeurDto { actorType = type, status = statut, actorRef = reference };

        /// <summary>Le roster du cadre 151 : quatre acteurs, un par statut.</summary>
        private static ActeurDto[] RosterDe4() => new[]
        {
            Acteur("lawyer", "steady", "4f21aaaa"), Acteur("clerk", "nervous", "9c07bbbb"),
            Acteur("clerk", "unavailable", "1b44cccc"), Acteur("lawyer", "gone", "7e90dddd"),
        };

        private Transform Sous(string chemin)
        {
            Transform t = RacineEcran().transform.Find(chemin);
            Assert.IsNotNull(t, $"{chemin} introuvable sous ForensicRoot");
            return t;
        }
        private string Texte(string chemin) => Sous(chemin).GetComponent<TMPro.TextMeshProUGUI>().text;
        private static string Nu(string riche) => System.Text.RegularExpressions.Regex.Replace(riche, "<[^>]+>", "");
        private string Compteur(int i) => Nu(Texte($"Compteurs/Fenetre{i}/Nombre"));
        private static bool Meme(Color a, Color b)
        {
            Color32 x = a, y = b;
            return x.r == y.r && x.g == y.g && x.b == y.b && x.a == y.a;
        }

        /// <summary>Les trois fenêtres de compteur de la vue PISTES (cadre 150) et ses trois pistes : « 01/1 pistes chaudes · 00 franchies ·
        /// 01/4 acteurs qui tiennent », la piste des cuves à « ça se voit » (3 crans sur 4, l'orange), les deux autres ÉTEINTES (0 cran coloré,
        /// « — », « pas encore sur la table »). Les nombres sont recalculés ICI, indépendamment de l'écran, sur le corps fabriqué.</summary>
        [UnityTest]
        [Category("ScreenB7")]
        public IEnumerator ScreenB7D1_VuePistes_CompteursEtTroisPistes_DeuxEteintes()
        {
            ForensicScreenController ecran = MonterEcran();
            ecran.RendrePourTest(Bandes("clean", "visible", "quiet"), RosterDe4());
            yield return null; yield return null;
            Assert.AreEqual(VueDossier.Pistes, ecran.Vue);
            Assert.AreEqual("01/1", Compteur(0), "pistes chaudes : l'effluent seul est vivant, hors de son premier cran");
            Assert.AreEqual("00", Compteur(1), "franchies : aucune piste vivante au dernier cran");
            Assert.AreEqual("01/4", Compteur(2), "acteurs qui tiennent : 1 `steady` sur 4 servis");
            Assert.IsTrue(Sous("Elast/Contenu/Pistes").gameObject.activeSelf && !Sous("Elast/Contenu/Acteurs").gameObject.activeSelf && !Sous("Elast/Rien").gameObject.activeSelf);
            Assert.IsTrue(Sous("Pied").gameObject.activeSelf && Sous("Pied/BoutonAcheter").gameObject.activeSelf, "le pied éteint est montré en vue pistes");

            Color vide = new Color32(0x2A, 0x36, 0x48, 0xFF);   // `#2a3648`, le cran éteint
            for (int i = 0; i < 3; i++)
            {
                Assert.AreEqual(4, Sous($"Elast/Contenu/Pistes/Piste{i}/Crans").childCount, $"piste {i} : quatre crans");
                int allumes = 0;
                for (int c = 0; c < 4; c++) if (!Meme(Sous($"Elast/Contenu/Pistes/Piste{i}/Crans/Cran{c}").GetComponent<Image>().color, vide)) allumes++;
                if (i == 1)
                {
                    Assert.AreEqual(3, allumes, "« visible » = le troisième cran : trois crans allumés");
                    Assert.IsTrue(Meme(Sous("Elast/Contenu/Pistes/Piste1/Crans/Cran0").GetComponent<Image>().color, DesignTokens.Current.accentWarning), "le cran allumé est l'orange de `visible`");
                    Assert.IsTrue(Meme(Sous("Elast/Contenu/Pistes/Piste1/Crans/Cran3").GetComponent<Image>().color, vide), "le plus haut cran reste éteint");
                    Assert.AreEqual(ForensicResolvers.Phrase("visible"), Texte("Elast/Contenu/Pistes/Piste1/Mot"));
                    Assert.AreEqual("visible", Texte("Elast/Contenu/Pistes/Piste1/Cle"), "la clé servie, brute");
                }
                else
                {
                    Assert.AreEqual(0, allumes, $"piste {i} ÉTEINTE : aucun cran coloré");
                    Assert.AreEqual("—", Texte($"Elast/Contenu/Pistes/Piste{i}/Mot"));
                    StringAssert.Contains("table", Texte($"Elast/Contenu/Pistes/Piste{i}/Cle"), "« pas encore sur la table » à la place de la clé");
                }
            }
            // la 1ʳᵉ fenêtre porte l'or de `.fen.ici` (recette composée) : un nœud `Bas1` doré, ancré en BAS, au-dessus du bord
            Transform or = Sous("Compteurs/Fenetre0/Filets/Bas1");
            Assert.IsTrue(Meme(or.GetComponent<Image>().color, DesignTokens.Current.hudMoneyGold), "l'or de la fenêtre « ici »");
            Assert.AreEqual(0f, ((RectTransform)or).anchorMax.y, "l'or est ancré au bas de la fenêtre");
            Assert.IsNull(Sous("Compteurs/Fenetre1").Find("Filets/Bas1"), "la 2ᵉ fenêtre n'a pas d'or");
        }

        /// <summary>La BASCULE (la porte) : un geste LOCAL qui montre les acteurs (cadre 151) — « 04 acteurs connus · 01 qui ont peur · 01/1
        /// pistes chaudes » —, une ligne par acteur, le geste « renseignement » ÉTEINT en DERNIER enfant de chaque ligne sauf « parti »
        /// (qui est à 45 % d'opacité), les quatre mots de statut distincts. Et le retour.</summary>
        [UnityTest]
        [Category("ScreenB7")]
        public IEnumerator ScreenB7D2_Bascule_VueActeurs_UneLigneParActeur_GesteEteintSaufParti()
        {
            ForensicScreenController ecran = MonterEcran();
            ecran.RendrePourTest(Bandes("clean", "visible", "quiet"), RosterDe4());
            yield return null;
            ecran.Basculer();
            yield return null; yield return null;
            Assert.AreEqual(VueDossier.Acteurs, ecran.Vue);
            Assert.AreEqual("04", Compteur(0), "acteurs connus : tous les servis, `gone` compris");
            Assert.AreEqual("01", Compteur(1), "qui ont peur : 1 `nervous`");
            Assert.AreEqual("01/1", Compteur(2), "la porte montre le MÊME compte de pistes chaudes que la vue pistes");
            Assert.IsTrue(!Sous("Elast/Contenu/Pistes").gameObject.activeSelf && Sous("Elast/Contenu/Acteurs").gameObject.activeSelf);
            Assert.IsTrue(Sous("Pied").gameObject.activeSelf && !Sous("Pied/BoutonAcheter").gameObject.activeSelf, "en vue acteurs, le pied n'est que sa note");

            Transform liste = Sous("Elast/Contenu/Acteurs");
            Assert.AreEqual(4, liste.childCount, "une ligne par acteur servi");
            var mots = new HashSet<string>();
            string[] statuts = { "steady", "nervous", "unavailable", "gone" };
            for (int i = 0; i < 4; i++)
            {
                Transform ligne = liste.GetChild(i);
                string mot = ligne.Find("Statut").GetComponent<TMPro.TextMeshProUGUI>().text;
                Assert.AreEqual(DossierCalculs.MotDuStatut(statuts[i]), mot);
                mots.Add(mot);
                bool parti = statuts[i] == "gone";
                Assert.AreEqual(!parti, ligne.Find("Renseignement") != null, $"{statuts[i]} : le geste éteint n'existe que hors « parti »");
                if (!parti) Assert.AreEqual("Renseignement", ligne.GetChild(ligne.childCount - 1).name, "le geste est le DERNIER enfant de la ligne");
                CanvasGroup g = ligne.GetComponent<CanvasGroup>();
                if (parti) { Assert.IsNotNull(g); Assert.AreEqual(DossierCalculs.AlphaUguiDuParti, g.alpha, 0.001f, "`.ac.parti{opacity:.45}` rendu en alpha uGUI (composition linéaire)"); }
                else Assert.IsNull(g, "seule la ligne « parti » est atténuée");
            }
            Assert.AreEqual(4, mots.Count, "quatre statuts, quatre mots");

            ecran.Basculer();
            yield return null;
            Assert.AreEqual(VueDossier.Pistes, ecran.Vue, "la porte revient aux pistes");
        }

        /// <summary>L'ÉTAT VIDE (cadre 135) : toutes les pistes vivantes au premier cran ET un roster SERVI vide ⇒ trois fenêtres nues
        /// (« 00/1 pistes chaudes · 00 franchies · 00 acteurs connus »), « rien à votre nom », PAS de bascule, PAS de pied. Et la porte
        /// ne rouvre rien. Les deux cas voisins ne sont PAS vides : un roster vide avec une piste chaude, et un roster non servi.</summary>
        [UnityTest]
        [Category("ScreenB7")]
        public IEnumerator ScreenB7D3_EtatVide_SansBascule_SansPied_EtLesCasVoisinsNeLeSontPas()
        {
            ForensicScreenController ecran = MonterEcran();
            ecran.RendrePourTest(Bandes("clean", "clear", "quiet"), new ActeurDto[0]);
            yield return null; yield return null;
            Assert.AreEqual(VueDossier.Vide, ecran.Vue);
            Assert.AreEqual("00/1", Compteur(0)); Assert.AreEqual("00", Compteur(1)); Assert.AreEqual("00", Compteur(2));
            Assert.IsTrue(Sous("Elast/Rien").gameObject.activeSelf && !Sous("Elast/Contenu/Pistes").gameObject.activeSelf && !Sous("Elast/Contenu/Acteurs").gameObject.activeSelf);
            Assert.IsFalse(Sous("Pied").gameObject.activeSelf, "135 n'a pas de pied");
            Button porte = Sous("Compteurs/Fenetre2").GetComponent<Button>();
            Assert.IsFalse(porte.interactable, "135 n'a pas de bascule");
            Assert.IsFalse(Sous("Compteurs/Fenetre2").GetComponent<Image>().raycastTarget, "la 3ᵉ fenêtre n'attrape aucun clic en état vide");
            Assert.IsFalse(Sous("Compteurs/Fenetre2/Fleche").gameObject.activeSelf, "pas de flèche");
            Assert.IsNull(Sous("Compteurs/Fenetre0").Find("Filets/Bas1"), "pas d'« ici » doré en état vide");
            ecran.Basculer();
            yield return null;
            Assert.AreEqual(VueDossier.Vide, ecran.Vue, "rien à basculer");

            // voisin 1 : roster vide MAIS une piste chaude ⇒ la vue pistes ; sa porte mène à « 00 acteurs connus », sans ligne
            ecran.RendrePourTest(Bandes("clean", "faint", "quiet"), new ActeurDto[0]);
            yield return null;
            Assert.AreEqual(VueDossier.Pistes, ecran.Vue);
            Assert.AreEqual("01/1", Compteur(0));
            ecran.Basculer();
            yield return null;
            Assert.AreEqual("00", Compteur(0)); Assert.AreEqual(0, Sous("Elast/Contenu/Acteurs").childCount);
            ecran.Basculer();

            // voisin 2 : roster NON servi (route en erreur) ⇒ jamais « vide » : on ne sait pas
            ecran.RendrePourTest(Bandes("clean", "clear", "quiet"), null);
            yield return null;
            Assert.AreEqual(VueDossier.Pistes, ecran.Vue, "un roster inconnu n'est pas un roster vide");
        }

        /// <summary>Une route en erreur ⇒ « — », JAMAIS 0 : un zéro dirait « mesuré à zéro ». Les deux routes sont indépendantes.</summary>
        [UnityTest]
        [Category("ScreenB7")]
        public IEnumerator ScreenB7D4_RouteEnErreur_DisentTiret_JamaisZero()
        {
            ForensicScreenController ecran = MonterEcran();
            ecran.RendrePourTest(Bandes("clean", "visible", "quiet"), null);   // roster en erreur
            yield return null;
            Assert.AreEqual("01/1", Compteur(0), "les pistes restent lisibles");
            Assert.AreEqual("—", Compteur(2), "les acteurs qui tiennent : « — », pas « 00/0 »");
            ecran.Basculer();
            yield return null;
            Assert.AreEqual("—", Compteur(0)); Assert.AreEqual("—", Compteur(1));
            Assert.AreEqual("01/1", Compteur(2), "la porte vers les pistes garde son compte");
            ecran.Basculer();

            ecran.RendrePourTest(null, RosterDe4());   // bandes en erreur
            yield return null;
            Assert.AreEqual("—", Compteur(0)); Assert.AreEqual("—", Compteur(1));
            Assert.AreEqual("01/4", Compteur(2), "le roster reste lisible");
        }

        /// <summary>« Un geste éteint n'émet AUCUNE requête » (DESIGN v5.2 §6). Valide seulement parce que le MÊME compteur est mis à
        /// l'épreuve : (a) le chargement le FAIT BOUGER (compteur branché) ; (b) la porte est cliquée par `ProductionClickSupport.Click` (le
        /// raycast de son centre touche un gestionnaire de clic) et bascule SANS requête ; (c) le pied éteint et un « renseignement » sont
        /// TROUVÉS, ont un rect, et le raycast de leur centre ne rencontre AUCUN gestionnaire de clic ⇒ le compteur ne bouge pas.</summary>
        [UnityTest, Timeout(120000)]
        [Category("ScreenB7")]
        public IEnumerator ScreenB7D5_GestesEteints_AucuneRequete_CompteurMisALEpreuve()
        {
            GameObject es = EventSystem.current == null ? new GameObject("fil_es", typeof(EventSystem), typeof(StandaloneInputModule)) : null;
            try
            {
                ForensicScreenController ecran = MonterEcran();
                ecran.RendrePourTest(Bandes("clean", "visible", "quiet"), RosterDe4());   // arrête l'auto-chargement
                yield return null;
                // (a) le compteur est BRANCHÉ : un chargement (même sans back joignable) envoie au moins une requête
                ecran.SetToken("jeton-de-controle-sans-valeur");
                yield return ecran.Charger();
                Assert.GreaterOrEqual(ecran.RequetesEmises, 1, "(a) le chargement n'a fait bouger le compteur : il serait muet");
                ecran.RendrePourTest(Bandes("clean", "visible", "quiet"), RosterDe4());   // l'état fabriqué, rétabli
                yield return null; yield return null;
                int avant = ecran.RequetesEmises;

                // (b) la porte : un vrai clic, le raycast de son centre la touche, la vue bascule, aucune requête
                Button porte = Sous("Compteurs/Fenetre2").GetComponent<Button>();
                Assert.IsTrue(AUnGestionnaireDeClic(Toucher((RectTransform)porte.transform)), "(b) le raycast du centre de la porte ne touche aucun gestionnaire : la garde (c) serait vraie à vide");
                Assert.IsTrue(ProductionClickSupport.Click(porte));
                yield return null; yield return null;
                Assert.AreEqual(VueDossier.Acteurs, ecran.Vue, "(b) le clic de production bascule");
                Assert.AreEqual(avant, ecran.RequetesEmises, "(b) la bascule est locale : aucune requête");

                // (c) un « renseignement » éteint (vue acteurs)
                RectTransform rg = (RectTransform)Sous("Elast/Contenu/Acteurs/Acteur0/Renseignement");
                Assert.Greater(rg.rect.width, 0f); Assert.Greater(rg.rect.height, 0f);
                Assert.IsFalse(AUnGestionnaireDeClic(Toucher(rg)), "(c) le « renseignement » éteint ne doit porter aucun gestionnaire de clic");
                Assert.AreEqual(avant, ecran.RequetesEmises, "(c) aucune requête");

                // (c) le pied éteint (vue pistes)
                ecran.Basculer();
                yield return null; yield return null;
                RectTransform pied = (RectTransform)Sous("Pied/BoutonAcheter");
                Assert.Greater(pied.rect.width, 0f); Assert.Greater(pied.rect.height, 0f);
                Assert.IsFalse(AUnGestionnaireDeClic(Toucher(pied)), "(c) « ACHETER DU RENSEIGNEMENT » éteint ne doit porter aucun gestionnaire de clic");
                Assert.AreEqual(avant, ecran.RequetesEmises, "(c) aucune requête");
            }
            finally { if (es != null) Object.DestroyImmediate(es); }
        }

        private static List<RaycastResult> Toucher(RectTransform rt)
        {
            Vector3 monde = rt.TransformPoint(rt.rect.center);
            var donnees = new PointerEventData(EventSystem.current) { position = RectTransformUtility.WorldToScreenPoint(null, monde) };
            var resultats = new List<RaycastResult>();
            EventSystem.current.RaycastAll(donnees, resultats);
            return resultats;
        }

        private static bool AUnGestionnaireDeClic(List<RaycastResult> resultats)
        {
            foreach (RaycastResult r in resultats)
                if (ExecuteEvents.GetEventHandler<IPointerClickHandler>(r.gameObject) != null) return true;
            return false;
        }

        /// <summary>Le CALCUL pur du dossier, sur des corps fabriqués : les échelles (quatre crans par piste, domaines clos du back), les
        /// pistes constantes lues en UN site, un mot inconnu n'est ni chaud ni calme, l'état vide.</summary>
        [Test]
        [Category("ScreenB7")]
        public void ScreenB7D6_DossierCalculs_Echelles_Constantes_EtatVide()
        {
            Assert.AreEqual(3, DossierCalculs.Pistes.Length);
            foreach (DossierCalculs.Piste p in DossierCalculs.Pistes)
            {
                Assert.AreEqual(DossierCalculs.Crans, p.Echelle.Length, $"{p.Cle} : quatre crans");
                for (int c = 0; c < p.Echelle.Length; c++) Assert.AreEqual(c, DossierCalculs.CranDe(p, p.Echelle[c]));
                Assert.AreEqual(-1, DossierCalculs.CranDe(p, "smouldering"), "un mot inconnu n'a pas de cran");
                Assert.AreEqual(-1, DossierCalculs.CranDe(p, null));
            }
            CollectionAssert.AreEqual(new[] { "audit_risk_bucket", "lifestyle_alarm_bucket" }, DossierCalculs.PistesConstantes, "les deux pistes constantes (TD-881)");
            Assert.AreEqual(1, DossierCalculs.PistesVivantes());
            // la vivacité ne dépend QUE de PistesConstantes : une bande « chaude » d'une piste constante ne compte pas
            Assert.AreEqual(0, DossierCalculs.PistesChaudes(Bandes("audited", "clear", "subpoenaed")), "les constantes ne chauffent pas le compteur");
            Assert.AreEqual(0, DossierCalculs.PistesFranchies(Bandes("audited", "clear", "subpoenaed")));
            Assert.AreEqual(1, DossierCalculs.PistesFranchies(Bandes("clean", "glaring", "quiet")));
            Assert.AreEqual(0, DossierCalculs.PistesChaudes(Bandes("clean", "smouldering", "quiet")), "une bande inconnue n'est pas « chaude »");
            Assert.IsTrue(DossierCalculs.EtatVide(Bandes("clean", "clear", "quiet"), new ActeurDto[0]));
            Assert.IsFalse(DossierCalculs.EtatVide(Bandes("clean", "clear", "quiet"), null), "roster non servi ≠ vide");
            Assert.IsFalse(DossierCalculs.EtatVide(null, new ActeurDto[0]), "bandes non servies ≠ vide");
            Assert.IsFalse(DossierCalculs.EtatVide(Bandes("clean", "faint", "quiet"), new ActeurDto[0]));
            Assert.IsFalse(DossierCalculs.EtatVide(Bandes("clean", "clear", "quiet"), new[] { Acteur("clerk", "gone", "x") }));
        }

        /// <summary>Les pistes constantes sont lues en UN SEUL SITE (TD-881) : ni `audit_risk` ni `lifestyle_alarm` ne sont comparés
        /// ailleurs dans le contrôleur — la liste est `DossierCalculs.PistesConstantes`, rien d'autre. Garde de SOURCE.</summary>
        [Test]
        [Category("ScreenB7")]
        public void ScreenB7D7_PistesConstantes_LuesEnUnSeulSite()
        {
            string[] fichiers = System.IO.Directory.GetFiles(System.IO.Path.Combine(Application.dataPath, "Scripts", "Operational", "Forensic"), "*.cs");
            int sites = 0;
            foreach (string f in fichiers)
            {
                string src = System.IO.File.ReadAllText(f);
                sites += System.Text.RegularExpressions.Regex.Matches(src, @"PistesConstantes\s*=").Count;
                Assert.IsFalse(System.Text.RegularExpressions.Regex.IsMatch(src, @"(audit_risk|lifestyle_alarm)_bucket""\s*\)\s*(==|!=)|(==|!=)\s*""(audit_risk|lifestyle_alarm)"),
                    $"{System.IO.Path.GetFileName(f)} compare une piste constante hors de `PistesConstantes`");
            }
            Assert.AreEqual(1, sites, "`PistesConstantes` est DÉCLARÉE en un seul site");
            // CONTRÔLE POSITIF de la regex négative : elle DOIT voir une comparaison écrite en dur (sinon « 0 comparaison » serait vrai à vide)
            const string motif = @"(audit_risk|lifestyle_alarm)_bucket""\s*\)\s*(==|!=)|(==|!=)\s*""(audit_risk|lifestyle_alarm)";
            Assert.IsTrue(System.Text.RegularExpressions.Regex.IsMatch("if (cle == \"audit_risk\") x();", motif), "la regex ne voit pas `cle == \"audit_risk\"`");
            Assert.IsFalse(System.Text.RegularExpressions.Regex.IsMatch("DossierCalculs.PistesConstantes.Contains(cle)", motif));
        }

        // ═══ 4. LES PIXELS (DESIGN v5.2 §6, revue de code M1) — l'écran RENDU dans un banc, jamais ses seuls paramètres ═══════

        /// <summary>Un banc comme celui des gardes de filets : Canvas `ScreenSpaceCamera` en pixels constants sur une cible 540×960 (1 px CSS =
        /// 1,8 px), l'hôte de l'écran PARENTÉ sous lui (donc `CanvasRacine` y bâtit l'écran).</summary>
        private sealed class BancEcran : System.IDisposable
        {
            public const int W = 540, H = 960;
            public readonly RenderTexture Rt; public readonly Camera Cam; public readonly Canvas Canvas;
            private readonly GameObject camGo, canGo;
            public BancEcran()
            {
                Rt = new RenderTexture(W, H, 24, RenderTextureFormat.ARGB32);
                camGo = new GameObject("ecr_cam"); Cam = camGo.AddComponent<Camera>();
                Cam.targetTexture = Rt; Cam.clearFlags = CameraClearFlags.SolidColor; Cam.backgroundColor = Color.black;
                Cam.orthographic = true; Cam.enabled = false;
                canGo = new GameObject("ecr_canvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
                Canvas = canGo.GetComponent<Canvas>(); Canvas.renderMode = RenderMode.ScreenSpaceCamera; Canvas.worldCamera = Cam;
                canGo.GetComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ConstantPixelSize;
            }
            public Transform Racine => canGo.transform;
            public Texture2D Rendre()
            {
                Canvas.ForceUpdateCanvases(); Cam.Render();
                RenderTexture avant = RenderTexture.active; RenderTexture.active = Rt;
                var t = new Texture2D(W, H, TextureFormat.RGB24, false);
                t.ReadPixels(new Rect(0, 0, W, H), 0, 0); t.Apply(); RenderTexture.active = avant;
                return t;
            }
            /// <summary>Le pixel (x, y ; origine en BAS) du point (`fx`, `fy` ∈ [0, 1], origine en bas à gauche) du rect `r`.</summary>
            public Vector2Int Pixel(RectTransform r, float fx, float fy)
            {
                var c = (RectTransform)canGo.transform;
                Vector3 monde = r.TransformPoint(new Vector3(r.rect.xMin + fx * r.rect.width, r.rect.yMin + fy * r.rect.height, 0f));
                Vector3 p = c.InverseTransformPoint(monde);
                return new Vector2Int(Mathf.FloorToInt((p.x - c.rect.xMin) / c.rect.width * W), Mathf.FloorToInt((p.y - c.rect.yMin) / c.rect.height * H));
            }
            public void Dispose()
            {
                Object.DestroyImmediate(canGo); Object.DestroyImmediate(camGo);
                Rt.Release(); Object.DestroyImmediate(Rt);
            }
        }

        private static float Ecart(Color a, Color b) =>
            Mathf.Max(Mathf.Abs(a.r - b.r), Mathf.Max(Mathf.Abs(a.g - b.g), Mathf.Abs(a.b - b.b))) * 255f;

        /// <summary>Les pixels du rect `r` qui diffèrent de plus de 30/255 du `fond` : de l'ENCRE. Un rect sans texte rend 0.</summary>
        private static int EncreDans(Texture2D t, BancEcran banc, RectTransform r, Color fond)
        {
            Vector2Int a = banc.Pixel(r, 0f, 0f), b = banc.Pixel(r, 1f, 1f);
            int n = 0;
            for (int x = Mathf.Max(0, Mathf.Min(a.x, b.x)); x <= Mathf.Min(BancEcran.W - 1, Mathf.Max(a.x, b.x)); x++)
                for (int y = Mathf.Max(0, Mathf.Min(a.y, b.y)); y <= Mathf.Min(BancEcran.H - 1, Mathf.Max(a.y, b.y)); y++)
                    if (Ecart(t.GetPixel(x, y), fond) > 30f) n++;
            return n;
        }

        /// <summary>Compte, sur le segment de `n` pixels qui part de (x, y) dans la direction (dx, dy), ceux à `tol`/255 de `cible`.</summary>
        private static int Compter(Texture2D t, int x, int y, int dx, int dy, int n, Color cible, float tol)
        {
            int k = 0;
            for (int i = 0; i < n; i++) if (Ecart(t.GetPixel(x + i * dx, y + i * dy), cible) <= tol) k++;
            return k;
        }

        /// <summary>L'EFFET, pas les paramètres : l'écran RENDU. (1) vue pistes — au centre de chaque cran, la couleur de la piste (l'orange pour
        /// les trois crans de « visible », le cran vide `#2a3648` au-dessus ; AUCUN cran coloré sur les deux pistes éteintes) ; la porte a son bord
        /// laiton sur `PxTrait(1)` colonnes, la 2ᵉ fenêtre aucun ; la 1ʳᵉ fenêtre a son or en BAS (et pas en haut) ; la note et le « — » ont de
        /// l'encre. (2) vue acteurs — la ligne « parti » est à 45 % : sa silhouette rouge est mêlée à son fond, pas pleine.</summary>
        [UnityTest]
        [Category("ScreenB7")]
        public IEnumerator ScreenB7P1_Pixels_Crans_Porte_Or_Note_EtLeParti()
        {
            var banc = new BancEcran();
            Texture2D t = null;
            try
            {
                hostGo = new GameObject("ForensicScreen", typeof(RectTransform));
                hostGo.transform.SetParent(banc.Racine, false);
                ForensicScreenController ecran = hostGo.AddComponent<ForensicScreenController>();
                ecran.RendrePourTest(Bandes("clean", "visible", "quiet"), RosterDe4());
                yield return null; yield return null;
                t = banc.Rendre();
                Color vide = new Color32(0x2A, 0x36, 0x48, 0xFF);
                Color orange = DesignTokens.Current.accentWarning, laiton = DesignTokens.Current.hudHairlineGold, dore = DesignTokens.Current.hudMoneyGold;
                int ep = MafiaCleanCity.Shell.EchelleMaquette.PxTrait(1f, (RectTransform)banc.Racine, MafiaCleanCity.Shell.EchelleMaquette.LargeurEcransBrennar6);
                int ep2 = MafiaCleanCity.Shell.EchelleMaquette.PxTrait(2f, (RectTransform)banc.Racine, MafiaCleanCity.Shell.EchelleMaquette.LargeurEcransBrennar6);

                // (1) les crans
                for (int i = 0; i < 3; i++)
                    for (int c = 0; c < 4; c++)
                    {
                        Vector2Int px = banc.Pixel((RectTransform)Sous($"Elast/Contenu/Pistes/Piste{i}/Crans/Cran{c}"), 0.5f, 0.5f);
                        Color vu = t.GetPixel(px.x, px.y);
                        Color attendu = (i == 1 && c <= 2) ? orange : vide;
                        Assert.LessOrEqual(Ecart(vu, attendu), 8f, $"cran {c} de la piste {i} : pixel {vu} au lieu de {attendu}");
                    }

                // la porte : bord laiton sur ep colonnes (en partant du bord gauche, à mi-hauteur) ; la 2ᵉ fenêtre n'en a aucun
                RectTransform porte = (RectTransform)Sous("Compteurs/Fenetre2"), deux = (RectTransform)Sous("Compteurs/Fenetre1");
                Vector2Int gp = banc.Pixel(porte, 0f, 0.5f), dp = banc.Pixel(deux, 0f, 0.5f);
                Assert.That(Compter(t, gp.x, gp.y, 1, 0, 8, laiton, 10f), Is.InRange(ep - 1, ep + 1), "la porte a son bord laiton");
                Assert.AreEqual(0, Compter(t, dp.x, dp.y, 1, 0, 8, laiton, 10f), "la 2ᵉ fenêtre n'a pas de bord laiton");

                // la 1ʳᵉ fenêtre : l'or de `.fen.ici` en BAS, jamais en haut
                RectTransform ici = (RectTransform)Sous("Compteurs/Fenetre0");
                Vector2Int bas = banc.Pixel(ici, 0.5f, 0f), haut = banc.Pixel(ici, 0.5f, 1f);
                Assert.That(Compter(t, bas.x, bas.y, 0, 1, 12, dore, 10f), Is.InRange(ep2 - 1, ep2 + 1), "l'or de la fenêtre « ici », en bas");
                Assert.AreEqual(0, Compter(t, haut.x, haut.y - 11, 0, 1, 12, dore, 10f), "pas d'or en haut de la fenêtre « ici »");

                // de l'ENCRE là où le texte doit être (des pixels qui DIFFÈRENT du fond : le texte antialiasé n'a presque jamais sa couleur exacte)
                Color fondElast = DesignTokens.Current.surfaceBase, fondPiste = DesignTokens.Current.lieutenantMedallionOuter;
                Assert.GreaterOrEqual(EncreDans(t, banc, (RectTransform)Sous("Elast/Contenu/NotePistes"), fondElast), 20, "la note « Les livres et le train de vie… » a de l'encre");
                Assert.GreaterOrEqual(EncreDans(t, banc, (RectTransform)Sous("Elast/Contenu/Pistes/Piste0/Mot"), fondPiste), 4, "le « — » de la piste éteinte a de l'encre");
                Assert.GreaterOrEqual(EncreDans(t, banc, (RectTransform)Sous("Elast/Contenu/Pistes/Piste0/Cle"), fondPiste), 10, "« pas encore sur la table » a de l'encre");

                // (2) la vue acteurs : la ligne « parti » est à 45 %
                ecran.Basculer();
                yield return null; yield return null;
                Object.DestroyImmediate(t); t = banc.Rendre();
                RectTransform vivante = (RectTransform)Sous("Elast/Contenu/Acteurs/Acteur0"), parti = (RectTransform)Sous("Elast/Contenu/Acteurs/Acteur3");
                Color fondVivant = t.GetPixel(banc.Pixel(vivante, 0.02f, 0.5f).x, banc.Pixel(vivante, 0.02f, 0.5f).y);
                Color fondParti = t.GetPixel(banc.Pixel(parti, 0.02f, 0.5f).x, banc.Pixel(parti, 0.02f, 0.5f).y);
                Color elast = t.GetPixel(banc.Pixel((RectTransform)Sous("Elast/Contenu/Acteurs"), 0f, 0.5f).x - 4, banc.Pixel(parti, 0.02f, 0.5f).y);
                Color attenduFond = Color.Lerp(elast, fondVivant, DossierCalculs.OpaciteDuParti);
                Assert.LessOrEqual(Ecart(fondParti, attenduFond), 7f, $"le fond de la ligne « parti » : {fondParti} au lieu de {attenduFond} (45 % de {fondVivant} sur {elast})");
                RectTransform sil = (RectTransform)Sous("Elast/Contenu/Acteurs/Acteur3/Silhouette");
                Vector2Int tete = banc.Pixel(sil, 0.5f, 11f / 16f);
                Color vuTete = t.GetPixel(tete.x, tete.y);
                Color attenduTete = Color.Lerp(elast, DesignTokens.Current.accentDanger, DossierCalculs.OpaciteDuParti);   // la maquette compose le GROUPE : rouge à 45 % sur le fond de la boîte
                Assert.LessOrEqual(Ecart(vuTete, attenduTete), 14f, $"la tête de la silhouette « parti » : {vuTete} au lieu de {attenduTete} (rouge à 45 % SRGB sur son fond ; Unity compose en linéaire : 0,45 recopié rendrait (179, 63, 55))");
                Assert.Greater(Ecart(vuTete, DesignTokens.Current.accentDanger), 40f, "la silhouette « parti » n'est pas en rouge PLEIN");
            }
            finally { if (t != null) Object.DestroyImmediate(t); banc.Dispose(); }
        }

        // ═══ 4. LE CONTENU DANS SON PANNEAU (juge visuel r1, 08/10 — F1, F2, F5) ═══════════════════════════════════════
        //   La classe : « du contenu hors de son panneau ». À 1080×1920 la note s'imprimait sur « loin » (F1) et le 4ᵉ acteur était tranché (F2) ; `journal.tsv` ne le voyait pas, ni aucune garde
        //   de PARAMÈTRES. Ces gardes sont STRUCTURELLES (vraies à toute hauteur) : (a) la boîte élastique est une fenêtre DÉFILANTE sur un contenu qui épouse ses enfants ; (b) aucun texte n'est écrasé
        //   sous sa hauteur préférée ; (c) la note est SOUS les cartes ; (d) sous une fenêtre volontairement trop basse, le contenu défile et sa dernière ligne est ATTEIGNABLE.

        private static Rect Monde(RectTransform r)
        {
            var c = new Vector3[4]; r.GetWorldCorners(c);
            return new Rect(c[0].x, c[0].y, c[2].x - c[0].x, c[2].y - c[0].y);
        }

        [UnityTest]
        [Category("ScreenB7")]
        public IEnumerator ScreenB7G1_ContenuDansSonPanneau_JamaisTranche_NiImprimeSurLeReste()
        {
            var banc = new BancEcran();
            try
            {
                hostGo = new GameObject("ForensicScreen", typeof(RectTransform));
                hostGo.transform.SetParent(banc.Racine, false);
                ForensicScreenController ecran = hostGo.AddComponent<ForensicScreenController>();
                var vues = new (string nom, GetForensicResponseDto bandes, ActeurDto[] acteurs, string derniere)[]
                {
                    ("pistes", Bandes("clean", "visible", "quiet"), RosterDe4(), "Elast/Contenu/NotePistes"),
                    ("acteurs", Bandes("clean", "visible", "quiet"), RosterDe4(), "Elast/Contenu/Acteurs/Acteur3"),
                };
                foreach (var vue in vues)
                {
                    ecran.RendrePourTest(vue.bandes, vue.acteurs);
                    if (vue.nom == "acteurs") ecran.Basculer();
                    yield return null; yield return null;
                    Canvas.ForceUpdateCanvases();

                    // (a) la fenêtre défilante, son contenu
                    MafiaCleanCity.Shell.ListeDefilante fen = ecran.FenetreDefilante;
                    Assert.IsNotNull(fen, vue.nom + " : la boîte élastique n'est pas une ListeDefilante");
                    RectTransform elast = (RectTransform)Sous("Elast"), contenu = (RectTransform)Sous("Elast/Contenu");
                    Assert.AreSame(elast, fen.Defilement.viewport, vue.nom + " : la fenêtre est la boîte élastique");
                    Assert.AreSame(contenu, fen.Defilement.content, vue.nom + " : le contenu défilant");

                    // (b) aucun texte écrasé sous sa hauteur préférée (la forme exacte de F1 : le texte sort de sa carte)
                    foreach (TMPro.TextMeshProUGUI t in contenu.GetComponentsInChildren<TMPro.TextMeshProUGUI>(false))
                    {
                        t.ForceMeshUpdate();
                        Assert.LessOrEqual(t.preferredHeight, t.rectTransform.rect.height + 1f,
                            $"{vue.nom} : « {Nu(t.text)} » ({t.name}) est écrasé : il lui faut {t.preferredHeight:0.#}, il a {t.rectTransform.rect.height:0.#}");
                    }
                    // le contenu va jusqu'au bout de ses enfants (aucun enfant ne déborde du contenu défilant)
                    Rect rc = Monde(contenu);
                    foreach (RectTransform enfant in contenu)
                        if (enfant.gameObject.activeSelf)
                            Assert.GreaterOrEqual(Monde(enfant).yMin, rc.yMin - 0.5f, vue.nom + " : " + enfant.name + " sort sous le contenu");

                    // (c) la note est SOUS les cartes, jamais dessus
                    if (vue.nom == "pistes")
                        Assert.LessOrEqual(Monde((RectTransform)Sous("Elast/Contenu/NotePistes")).yMax, Monde((RectTransform)Sous("Elast/Contenu/Pistes")).yMin + 0.5f,
                            "la note recouvre les cartes");

                    // (d) fenêtre trop BASSE : le contenu défile, le fondu le dit, la dernière ligne est atteignable
                    LayoutElement le = elast.GetComponent<LayoutElement>();
                    float minAvant = le.minHeight, prefAvant = le.preferredHeight, flexAvant = le.flexibleHeight;
                    float basse = Mathf.Max(8f, contenu.rect.height * 0.5f);   // en unités du CANVAS (le LayoutElement), pas en unités monde
                    le.minHeight = basse; le.preferredHeight = basse; le.flexibleHeight = 0f;
                    LayoutRebuilder.ForceRebuildLayoutImmediate((RectTransform)RacineEcran().transform);
                    yield return null; Canvas.ForceUpdateCanvases();
                    fen.Rafraichir();
                    Assert.IsTrue(fen.ContenuDepasse, vue.nom + " : la fenêtre est basse, le contenu doit se dire « il y a une suite »");
                    fen.Defilement.verticalNormalizedPosition = 0f;
                    Canvas.ForceUpdateCanvases(); fen.Rafraichir();
                    Rect fenetre = Monde(elast), derniere = Monde((RectTransform)Sous(vue.derniere));
                    Assert.GreaterOrEqual(derniere.yMin, fenetre.yMin - 1f, vue.nom + " : la dernière ligne reste hors de la fenêtre au bout de la course (inatteignable)");
                    le.minHeight = minAvant; le.preferredHeight = prefAvant; le.flexibleHeight = flexAvant;
                }
            }
            finally { banc.Dispose(); }
        }

        /// <summary>F3 — chaque bande de l'effluent dit le MOT DE SON CRAN (cadre 143 : invisible · des traces · ça se voit · ça saute aux yeux), jamais la phrase de sa gravité.
        /// Le mot est épinglé EN DUR : l'ancien test comparait `Phrase("visible")` à lui-même.</summary>
        [Test]
        public void ScreenB7F3_LEffluent_DitLeMotDeSonCran_PasLaPhraseDeSaGravite()
        {
            Assert.AreEqual("invisible", ForensicResolvers.Phrase("clear"));
            Assert.AreEqual("des traces", ForensicResolvers.Phrase("faint"));
            Assert.AreEqual("ça se voit", ForensicResolvers.Phrase("visible"));
            Assert.AreEqual("Ça saute aux yeux", ForensicResolvers.Phrase("glaring"));
            StringAssert.DoesNotContain("loin", ForensicResolvers.Phrase("visible"));
        }

        /// <summary>F4 — une valeur SERVIE sans accolades reprend l'emphase du littéral (la valeur servie gagne, l'emphase de la maquette reste).</summary>
        [Test]
        public void ScreenB7F4_UneValeurServieSansAccolades_ReprendLEmphaseDuLitteral()
        {
            const string litteral = "elles disent que {vous n’avez pas encore commencé}.";
            Assert.AreEqual("elles disent que {vous n’avez pas encore commencé}.", ForensicScreenController.ReposerLesEmphases("elles disent que vous n’avez pas encore commencé.", litteral));
            Assert.AreEqual("déjà {servi} ainsi", ForensicScreenController.ReposerLesEmphases("déjà {servi} ainsi", litteral), "un texte servi qui a ses accolades est laissé tel quel");
            Assert.AreEqual("a different text", ForensicScreenController.ReposerLesEmphases("a different text", litteral), "un fragment introuvable (autre langue) n'est pas forcé");
            Assert.AreEqual("a {b} c {d}", ForensicScreenController.ReposerLesEmphases("a b c d", "a {b} c {d}"), "plusieurs fragments");
            Assert.IsNull(ForensicScreenController.ReposerLesEmphases(null, litteral));
        }

        // ═══ 4. Q1 — le NOM de l'avocat sur la ligne de l'acteur (GET /v1/me/legal, MESURÉ le 08/10) ═══════════════════════════

        /// <summary>Le corps RÉEL de `GET /v1/me/legal` (compte joueur, 08/10 12:59, `mesures/me_legal.json` du juge-données de ㊴), octet pour octet
        /// sur `payload`. Les deux témoins qui font la jointure : `lawyerId` ici = `actorRef` de `actors_plein.json`.</summary>
        private const string CorpsLegalReel =
            "{\"payload\":{\"data\":{\"activeCases\":[],\"lawyerRoster\":[{\"lawyerId\":\"7abe1833-237a-4817-a247-dda968ae569d\",\"lawyerLabel\":\"Maître Norwan\"," +
            "\"lawyerNameI18n\":{\"key\":\"game.fiction.lawyer.name\",\"params\":{\"nom\":\"Maître Norwan\"}},\"lawyerLabelI18n\":{\"key\":\"game.legal.lawyer_tier.boutique\",\"params\":{}}," +
            "\"tier\":\"boutique\",\"retainer\":false,\"activeCaseCount\":0}]}}}";
        private const string RefAvocatReel = "7abe1833-237a-4817-a247-dda968ae569d";

        private static Dictionary<string, string> NomsDuCorps(string corps) =>
            DossierCalculs.NomsDesAvocats(JsonUtility.FromJson<GetLegalEnvelope>(corps)?.payload?.data?.lawyerRoster);

        private string ReferenceDeLaLigne(int i) => Texte($"Elast/Contenu/Acteurs/Acteur{i}/Identite/Reference");

        /// <summary>Q1 : le corps RÉEL se lit (`params` est un mot réservé C# : `@params` doit sérialiser « params »), et la jointure par l'id rend « Maître Norwan ».</summary>
        [Test]
        [Category("ScreenB7")]
        public void ScreenB7Q1a_LeCorpsReel_DonneLeNomDeLAvocat_ParSonId()
        {
            Dictionary<string, string> noms = NomsDuCorps(CorpsLegalReel);
            Assert.AreEqual(1, noms.Count);
            Assert.AreEqual("Maître Norwan", noms[RefAvocatReel], "le NOM de la personne, pas le tier (`lawyerLabelI18n`)");
            Assert.AreEqual("Maître Norwan", DossierCalculs.NomOuRef(Acteur("lawyer", "steady", RefAvocatReel), noms));
            // contrôle négatif : un autre id ne reçoit PAS ce nom (une jointure qui ignore l'id rougit ici)
            Assert.AreEqual("ia.actor.0000", DossierCalculs.NomOuRef(Acteur("lawyer", "steady", "00000000-aaaa"), noms));
            // un clerk n'a aucune route qui le nomme, même si son id était au dictionnaire
            Assert.AreEqual("ia.actor.7abe", DossierCalculs.NomOuRef(Acteur("clerk", "steady", RefAvocatReel), noms));
            Assert.AreEqual("ia.actor.7abe", DossierCalculs.NomOuRef(Acteur("lawyer", "steady", RefAvocatReel), null), "route en erreur ⇒ la référence");
        }

        /// <summary>Q1 : la SENTINELLE du back (`unknown_lawyer`, colonne nulle) et un nom vide ne sont pas des noms.</summary>
        [Test]
        [Category("ScreenB7")]
        public void ScreenB7Q1b_LaSentinelleEtLeNomVide_NeSontPasDesNoms()
        {
            string sentinelle = CorpsLegalReel.Replace("\"nom\":\"Maître Norwan\"", "\"nom\":\"unknown_lawyer\"");
            string vide = CorpsLegalReel.Replace("\"nom\":\"Maître Norwan\"", "\"nom\":\"\"");
            Assert.AreNotEqual(CorpsLegalReel, sentinelle, "le remplacement a bien eu lieu (anti-vacuité)");
            Assert.AreEqual(0, NomsDuCorps(sentinelle).Count);
            Assert.AreEqual(0, NomsDuCorps(vide).Count);
            Assert.AreEqual(0, DossierCalculs.NomsDesAvocats(null).Count);
        }

        /// <summary>Q1, RENDU : la ligne de l'avocat porte son nom (sans « ia.actor. »), celle du greffier garde sa référence ; et sans noms servis, les références.</summary>
        [UnityTest]
        [Category("ScreenB7")]
        public IEnumerator ScreenB7Q1c_LaLigneDeLAvocat_PorteSonNom_LeGreffierSaReference()
        {
            ForensicScreenController ecran = MonterEcran();
            ActeurDto[] roster = { Acteur("lawyer", "steady", RefAvocatReel), Acteur("clerk", "nervous", "9c07bbbb") };
            ecran.RendrePourTest(Bandes("clean", "visible", "quiet"), roster, NomsDuCorps(CorpsLegalReel));
            yield return null;
            ecran.Basculer();
            yield return null; yield return null;
            Assert.AreEqual("Maître Norwan", ReferenceDeLaLigne(0));
            StringAssert.DoesNotContain("ia.actor.", ReferenceDeLaLigne(0));
            Assert.AreEqual("ia.actor.9c07", ReferenceDeLaLigne(1), "un greffier : aucune route ne le nomme");

            ecran.RendrePourTest(Bandes("clean", "visible", "quiet"), roster, null);   // la route des noms en erreur
            yield return null; yield return null;
            Assert.AreEqual("ia.actor.7abe", ReferenceDeLaLigne(0), "sans noms servis, la référence d'avant");
            Assert.IsFalse(ecran.NomsIndisponibles && ecran.DerniereErreur != null, "l'erreur des noms ne pose pas de bandeau d'erreur");
        }

        /// <summary>Q1, EFFET (pas le paramètre) : le nom le plus long qu'on puisse servir reste DANS la colonne d'identité, sur une ligne, et ne déplace ni le
        /// mot de statut ni la hauteur de la ligne — mesuré en rects, contre le rendu du nom COURT.</summary>
        [UnityTest]
        [Category("ScreenB7")]
        public IEnumerator ScreenB7Q1d_UnNomTresLong_RestePEnColonne_SansDeplacerLeStatut()
        {
            ForensicScreenController ecran = MonterEcran();
            ActeurDto[] roster = { Acteur("lawyer", "steady", RefAvocatReel) };
            ecran.RendrePourTest(Bandes("clean", "visible", "quiet"), roster, new Dictionary<string, string> { [RefAvocatReel] = "Maître Norwan" });
            yield return null; ecran.Basculer(); yield return null; yield return null;
            Canvas.ForceUpdateCanvases();
            var court = (RectTransform)Sous("Elast/Contenu/Acteurs/Acteur0/Statut");
            Vector2 posCourt = court.anchoredPosition; float largCourt = court.rect.width;
            float hautCourt = ((RectTransform)Sous("Elast/Contenu/Acteurs/Acteur0")).rect.height;

            string tresLong = "Maître Montgomery-Vanderbilt-Ferrand de la Haute-Garenne";
            ecran.RendrePourTest(Bandes("clean", "visible", "quiet"), roster, new Dictionary<string, string> { [RefAvocatReel] = tresLong });
            yield return null; yield return null;
            Canvas.ForceUpdateCanvases();
            var ligne = (RectTransform)Sous("Elast/Contenu/Acteurs/Acteur0");
            var statut = (RectTransform)Sous("Elast/Contenu/Acteurs/Acteur0/Statut");
            var identite = (RectTransform)Sous("Elast/Contenu/Acteurs/Acteur0/Identite");
            var reference = (RectTransform)Sous("Elast/Contenu/Acteurs/Acteur0/Identite/Reference");
            Assert.AreEqual(tresLong, Texte("Elast/Contenu/Acteurs/Acteur0/Identite/Reference"), "le nom est rendu en entier dans le texte (la coupe est visuelle)");
            Assert.LessOrEqual(reference.rect.width, identite.rect.width + 0.5f, "la référence ne déborde pas la colonne d'identité");
            Assert.AreEqual(largCourt, statut.rect.width, 0.5f, "le mot de statut garde sa largeur");
            Assert.AreEqual(hautCourt, ligne.rect.height, 0.5f, "une seule ligne : la hauteur de la rangée ne bouge pas");
            Assert.LessOrEqual(Mathf.Abs(statut.anchoredPosition.x - posCourt.x), ligne.rect.width * 0.5f, "(anti-vacuité : le statut est bien mesuré)");
            TMPro.TextMeshProUGUI t = reference.GetComponent<TMPro.TextMeshProUGUI>();
            Assert.IsFalse(t.enableWordWrapping, "une ligne");
            Assert.AreEqual(TMPro.TextOverflowModes.Ellipsis, t.overflowMode);
            Assert.IsTrue(t.isTextTruncated, "le nom très long est coupé par « … » (sinon la garde ne voit rien)");
        }

        /// <summary>Q1, COMPTE : la route des noms n'est demandée QU'avec un avocat au roster (le compteur de requêtes de l'écran) — ici sur l'aiguillage pur.</summary>
        [Test]
        [Category("ScreenB7")]
        public void ScreenB7Q1e_LesNomsNeSeDemandentQuAvecUnAvocat()
        {
            Assert.IsTrue(DossierCalculs.AUnAvocat(new[] { Acteur("clerk", "steady", "a"), Acteur("lawyer", "steady", "b") }));
            Assert.IsFalse(DossierCalculs.AUnAvocat(new[] { Acteur("clerk", "steady", "a") }));
            Assert.IsFalse(DossierCalculs.AUnAvocat(new ActeurDto[0]));
            Assert.IsFalse(DossierCalculs.AUnAvocat(null));
        }

        // MÉTIER ICI — ajouter ici les tests de PARCOURS (signup → session/open → la route) et
        // les tests d'état (AppliquerEtat sur un corps fabriqué via RendrePourTest), patron ㊲
        // §§ 1/3/5 de ReputationScreenPlayModeTests.
    }
}
