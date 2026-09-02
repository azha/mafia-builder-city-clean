using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
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
    [Category("ScreenB7")]
    public class ForensicScreenPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
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
        /// les `yield return null` avant tout rendu.</summary>
        [UnityTest, Category("Capture")]
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
        /// ⇒ CONDITION DE LEVÉE, mesurée et non supposée : `AppShell.ActivateTab` ne monte
        ///   aujourd'hui que ㊲ sous `Tab.More` — ㊴ n'est atteignable par AUCUN chemin joueur sur
        ///   cette branche. Le jour où il l'est, écrire ici la capture SOUS CHROME et ses deux
        ///   gardes d'inset, sur le patron de ⑨/②/㊱. Tant que ce jour n'est pas venu, les insets
        ///   de ㊴ sont une SUPPOSITION, et c'est écrit plutôt que passé sous silence.</summary>
        [UnityTest, Category("Capture"), Category("CaptureForensic")]
        public IEnumerator ScreenB7C2_CapturerParLeReseau()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string token = null, err = null;
            yield return auth.SignIn("operational_demo@example.test", "operational-demo-pw",
                                     t => token = t, e => err = e);
            Assert.IsNull(err, $"connexion au compte de démo échouée : {err}");

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
        public void ScreenB7_UneBandeInconnueNEstJamaisRabattueSurCalme()
        {
            Assert.AreEqual(ForensicResolvers.Gravite.Calme,     ForensicResolvers.NiveauDe("quiet"));
            Assert.AreEqual(ForensicResolvers.Gravite.Surveille, ForensicResolvers.NiveauDe("watched"));
            Assert.AreEqual(ForensicResolvers.Gravite.Criant,    ForensicResolvers.NiveauDe("glaring"));

            Assert.AreEqual(ForensicResolvers.Gravite.Inconnu, ForensicResolvers.NiveauDe("smouldering"),
                "un mot que le serveur inventerait doit rester INCONNU, pas devenir « calme »");
            Assert.AreEqual(ForensicResolvers.Gravite.Inconnu, ForensicResolvers.NiveauDe(""));
            Assert.AreEqual(ForensicResolvers.Gravite.Inconnu, ForensicResolvers.NiveauDe(null));

            // et la phrase montre le mot du serveur plutôt qu'une paraphrase rassurante
            Assert.AreEqual("smouldering", ForensicResolvers.Phrase("smouldering"));
            Assert.AreEqual("—", ForensicResolvers.Phrase(null));
        }

        private IEnumerator CapturerA(int largeur, int hauteur, string chemin)
        {
            GameObject racine = RacineEcran();
            Canvas canvas = racine.GetComponentInParent<Canvas>();
            yield return MafiaCleanCity.Tests.CaptureSupport.CapturerCanvas(
                canvas, (RectTransform)racine.transform, largeur, hauteur, chemin);
            MafiaCleanCity.Tests.CaptureSupport.GarderLaCapture(chemin);
        }

        // MÉTIER ICI — ajouter ici les tests de PARCOURS (signup → session/open → la route) et
        // les tests d'état (AppliquerEtat sur un corps fabriqué via RendrePourTest), patron ㊲
        // §§ 1/3/5 de ReputationScreenPlayModeTests.
    }
}
