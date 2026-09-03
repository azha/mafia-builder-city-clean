using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using MafiaCleanCity.CityMap;   // REUSE AuthClient (signup) — patron ㊲ OuvrirJoueurFrais
using MafiaCleanCity.Tests;     // SeederSupport.SafeCallsign
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>ecran_appro « La chaîne d'appro » — suite du chantier de métier du 2026-09-03.
    ///
    /// COUVERT : le montage structurel (CanvasRenderer, MaskableGraphic), la capture pour le juge
    /// visuel (armée, jamais exécutée cette passe — éditeur non lancé), un PARCOURS joueur réel
    /// (§P, signup → découverte du bâtiment → la route, patron `ReputationScreenPlayModeTests`
    /// (㊲) `OuvrirJoueurFrais`), les trois états pilotés par la donnée (§E, via `RendrePourTest`)
    /// et les résolveurs du seul domaine fermé confirmé (§R). NON EXÉCUTÉ cette passe (aucun test
    /// n'a tourné, seule la COMPILATION est prouvée — voir implementation-notes.md).
    /// NON COUVERT : le geste « EN COMMANDER » de bout en bout contre le vrai back (P1 s'arrête
    /// au chargement de la fiche, il ne passe pas de commande — `PasserCommandeEtRecharger()` est
    /// exposée pour un futur test qui le ferait), et l'état « livrée » (aucune maquette, copie
    /// inventée — voir implementation-notes.md § Deviations).</summary>
    [Category("EcranAppro")]
    public class ChaineDApproScreenPlayModeTests
    {
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            GameObject reste = GameObject.Find("ChaineDApproRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("ChaineDApproRoot"); }
            if (hostGo != null) Object.Destroy(hostGo);
            hostGo = null;
        }

        /// <summary>La racine RÉELLE de l'écran n'est PAS `hostGo` : hors shell, le contrôleur
        /// découvre un Canvas et bâtit dessous (patron ㊲, ligne pour ligne). Chercher
        /// `hostGo.GetComponentsInChildren` rendrait ZÉRO en silence.</summary>
        private GameObject RacineEcran()
        {
            GameObject r = GameObject.Find("ChaineDApproRoot");
            Assert.IsNotNull(r, "ChaineDApproRoot introuvable : le contrôleur n'a pas construit sa " +
                                "mise en page (ni sous mountParent, ni sous un Canvas découvert)");
            return r;
        }

        private ChaineDApproScreenController MonterEcran()
        {
            hostGo = new GameObject("ChaineDApproScreen", typeof(RectTransform));
            var ecran = hostGo.AddComponent<ChaineDApproScreenController>();
            return ecran;
        }

        // ═══ 1. GARDE STRUCTURELLE — ne lit aucun pixel, ne dépend d'aucune résolution ═══════

        /// <summary>⛔ TOUT `Graphic` PORTE SON `CanvasRenderer`, et TOUT Graphic sous ce fond
        /// est `MaskableGraphic` (donc masquable par un futur `Mask` parent) — patron ㊲, garde
        /// structurelle AVANT toute garde de valeur (c'est celle qui a fermé la classe
        /// "occlusion par fratrie" en 12 lignes là où 4 tours de gardes pixel n'y voyaient rien).
        ///
        /// ⚠️ Anti-vacuité : `AddComponent<ChaineDApproScreenController>()` seul construit déjà le
        /// fond de `BuildLayout()` (appelé depuis `Awake()`), donc CETTE garde mord même sur le
        /// squelette non rempli — au moins 1 Graphic (le fond). Une fois le MÉTIER ICI de
        /// `BuildLayout()` rempli, relever le plancher `Assert.Greater(comptes, 1, ...)` vers une
        /// valeur qui reflète le contenu réel (㊲ l'a posé à 10).</summary>
        [UnityTest]
        public IEnumerator EcranApproS1_ToutGraphic_PorteSonCanvasRenderer()
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

            // ⛔ PLANCHER RELEVÉ (patron ㊲, note du squelette : « une fois BuildLayout() rempli,
            // relever le plancher vers une valeur qui reflète le contenu réel »). `BuildLayout()`
            // construit désormais, SANS aucune donnée (`MonterEcran()` seul, pas de `Charger()`) :
            // le fond (1) + le titre (1) + le sous-titre (1) — au moins 3, TOUJOURS, même à vide.
            // Valeur non vérifiée en éditeur (consigne : ne pas lancer Unity) — voir
            // implementation-notes.md § Deviations.
            Assert.Greater(comptes, 2,
                "moins de 3 Graphic dans l'arbre — le squelette (fond+titre+sous-titre) construit " +
                "par BuildLayout() n'est pas au complet, la garde suivante serait sous-scopée");
            Assert.IsEmpty(sansRenderer,
                "des Graphic sans CanvasRenderer ne dessinent RIEN, en silence : " +
                string.Join(", ", sansRenderer));
            Assert.IsEmpty(nonMaskable,
                "des Graphic non-MaskableGraphic ignoreraient tout Mask parent (un `Graphic` nu " +
                "dérivé sur mesure, jamais `UnityEngine.UI.Image`/`TextMeshProUGUI`) : " +
                string.Join(", ", nonMaskable));
        }

        // ═══ 2. LA CAPTURE HORS SHELL A ÉTÉ RETIRÉE — mesurée VIDE, et sa garde la certifiait ═
        //
        // ⛔⛔ Ce que le gabarit posait ici photographiait un écran NON MONTÉ et NON CHARGÉ :
        // `MonterEcran()` fait un `AddComponent` nu — pas de shell, pas de `SetMountParent`, pas
        // de jeton, pas d'appel à `Charger()` — puis la capture partait UNE frame plus tard.
        // Mesuré le 2026-09-03 sur les PNG produits, en comptant les teintes distinctes quantifiées
        // à 5 bits par canal, exactement comme la garde de variété du dépôt :
        //     ecran_appro_1080x1920.png                 →   2 teintes
        //     ecran_appro_1080x2400.png                 →   2 teintes
        //     planche_la_chaine_d_appro_1080x2400.png   → 563 teintes   (sous le chrome réel)
        //     planche_la_distribution_1080x2400.png     → 573 teintes   (sous le chrome réel)
        // Deux teintes, c'est un fond et un titre. Une session voisine a fait le même constat sur
        // ㉘ et a retiré la catégorie du filtre plutôt que de commiter l'image.
        //
        // ★ ET LA GARDE ANTI-VACUITÉ DU GABARIT CERTIFIAIT CE VIDE. Elle assertait
        // `horsFond > 0` — « l'image n'est pas parfaitement uniforme » — avec un plancher que son
        // propre commentaire déclarait « volontairement bas, à durcir une fois BuildLayout()
        // rempli ». Un écran qui rend son fond ET son titre la satisfait. *Une garde qui mesure la
        // mauvaise propriété est pire que pas de garde : elle certifie le défaut.* Et le
        // durcissement différé n'est jamais venu — un différé sans détecteur n'est pas un différé,
        // c'est un trou.
        //
        // ⇒ La capture de cet écran vit dans `PlancheChantierCCapturePlayModeTests`, qui le monte
        // SOUS LE CHROME RÉEL par `CaptureSousShell`, attend un chargement abouti, et mesure le
        // rect du locataire — pas l'encre de toute l'image. Deux résolutions sont par ailleurs hors
        // du régime de la semaine (une capture par écran).
        // ⚠️ Le patron retiré ici existe encore dans 5 autres suites du dépôt, dont 3 montent
        // aussi hors shell : ce lot ferme l'instance, pas la classe.

        // ═══ Fixture parcours : un joueur à soi, patron ㊲ `OuvrirJoueurFrais` ═══════════════════

        private const string BaseUrl = "http://localhost";
        private static int callsignSeq;
        private string token;

        private IEnumerator OuvrirJoueurFrais()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("appro", ref callsignSeq);
            string err = null;
            token = null;
            yield return auth.SignUp(callsign, "screen-appro-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup a échoué : {err}");
            Assert.IsNotNull(token, "signup n'a pas rendu de jeton");

            // ⛔ Le régime, RÉTABLI et non supposé (patron ㊲) : on ferme toute session qu'un
            // voisin — ou ce signup lui-même — aurait pu laisser ouverte.
            yield return FermerSession();
        }

        private IEnumerator FermerSession()
        {
            using (var req = new UnityEngine.Networking.UnityWebRequest(
                       BaseUrl + "/v1/session/close", "POST"))
            {
                req.uploadHandler = new UnityEngine.Networking.UploadHandlerRaw(
                    System.Text.Encoding.UTF8.GetBytes("{}"));
                req.downloadHandler = new UnityEngine.Networking.DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                req.SetRequestHeader("Authorization", "Bearer " + token);
                req.SetRequestHeader("Idempotency-Key", System.Guid.NewGuid().ToString());
                yield return req.SendWebRequest();
                // Un 404/409 est normal si aucune session n'est ouverte : on ferme, on n'exige pas.
            }
        }

        // ═══ P — PARCOURS joueur réel (doctrine 4-couches, CLAUDE.md § « quatre couches ») ═══════
        //
        // signup → découverte du bâtiment (§4/§5 du brief, districts+interior, JAMAIS un seed
        // SQL) → `GET .../precursors`. C'est le SEUL test qui ferme les six formes de chaîne
        // morte pour cet écran : un vert ici prouve qu'un joueur qui vient de naître peut
        // atteindre sa fiche, pas seulement que le moteur calcule juste.
        [UnityTest]
        public IEnumerator EcranApproP1_ParcoursJoueurReel_DecouvreSonBatimentEtChargeLaFiche()
        {
            yield return OuvrirJoueurFrais();

            var ecran = MonterEcran();
            ecran.SetToken(token);
            yield return ecran.Charger();

            Assert.IsNotNull(ecran.BuildingIdDecouvert,
                "aucun bâtiment découvert — la prémisse de cet écran (un district PLAYER_HELD " +
                "possédant au moins un bâtiment sur un compte fraîchement signé) ne tient pas, " +
                "et ce n'est pas un défaut de CET écran mais du kit de départ");
            Assert.IsNull(ecran.DerniereErreur, $"Charger() a levé une erreur : {ecran.DerniereErreur}");
            Assert.IsNotNull(ecran.DernierChargement,
                "GET /v1/operational/precursors n'a rien rendu pour le bâtiment découvert");

            // Épingle sur l'ENSEMBLE DE CLÉS consommé (précédent maison :
            // tutorial_overlay_session_open_non_regression.spec.ts) — les 9 clés mesurées le
            // 2026-09-03, pas un sous-ensemble choisi après coup.
            GetOperationalPrecursorsResponseDto dto = ecran.DernierChargement;
            Assert.IsNotNull(dto.building, "clé absente : building");
            Assert.IsNotNull(dto.precursor_type, "clé absente : precursor_type");
            Assert.IsNotNull(dto.stock_band, "clé absente : stock_band");
            Assert.IsNotNull(dto.stock_liters_label, "clé absente : stock_liters_label");
            Assert.IsNotNull(dto.price_trend_bucket, "clé absente : price_trend_bucket");
            Assert.IsNotNull(dto.supplier_pressure_bucket, "clé absente : supplier_pressure_bucket");
            // has_pending_order / has_arrived_order / scarcity_active sont des bool — toujours
            // présents côté C# (pas de forme "absente" possible pour un champ non-nullable).

            Assert.Greater(ecran.RenderedTexts.Count, 0, "aucun texte rendu — la fiche est vide");
        }

        // ═══ E — États pilotés par la donnée (RendrePourTest, patron ㊲ §5) ═════════════════════
        //
        // ⛔ Ne prouvent jamais que le back émet ces corps — seulement ce que l'écran EN FAIT.
        // La preuve du corps RÉEL est P1 ci-dessus.

        private static GetOperationalPrecursorsResponseDto CorpsFabrique(
            bool enCours = false, bool arrivee = false, string stockBand = "NONE",
            string prixBucket = "UP", string pressionBucket = "STRAINED", bool penurie = true)
        {
            return new GetOperationalPrecursorsResponseDto
            {
                building = "00000000-0000-4000-8000-000000000000",
                precursor_type = "PYRALIN",
                stock_band = stockBand,
                has_pending_order = enCours,
                has_arrived_order = arrivee,
                stock_liters_label = "0 L",
                price_trend_bucket = prixBucket,
                scarcity_active = penurie,
                supplier_pressure_bucket = pressionBucket,
            };
        }

        [UnityTest]
        public IEnumerator EcranApproE1_EtatRepos_ConstruitLaFicheEtLeBoutonActif()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(CorpsFabrique());
            yield return null;

            // Les quatre valeurs de la fiche (m-48), le bouton, et la pénurie (scarcity_active).
            CollectionAssert.Contains(ecran.RenderedTexts, "il n'y a plus rien · 0 L",
                "ligne CE QU'IL EN RESTE absente ou mal composée");
            CollectionAssert.Contains(ecran.RenderedTexts, "le prix monte", "résolveur prix (UP) muet");
            CollectionAssert.Contains(ecran.RenderedTexts, "il vous fait attendre exprès",
                "résolveur fournisseur (STRAINED) muet");
            CollectionAssert.Contains(ecran.RenderedTexts, "EN COMMANDER",
                "le bouton n'est pas construit en état repos");
            CollectionAssert.Contains(ecran.RenderedTexts, "Il y a une pénurie en ville",
                "scarcity_active=true ne produit pas la bannière");
        }

        [UnityTest]
        public IEnumerator EcranApproE2_EtatCommandeEnCours_AfficheLaLigneCommandeSansBouton()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(CorpsFabrique(enCours: true, penurie: false));
            yield return null;

            CollectionAssert.Contains(ecran.RenderedTexts, "est en route",
                "la 5e ligne LA COMMANDE n'apparaît pas quand has_pending_order=true");
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, "EN COMMANDER",
                "le bouton EN COMMANDER ne doit PAS être construit pendant une commande en cours " +
                "(m-49 : aucun bouton actif, seulement une note système)");
        }

        [UnityTest]
        public IEnumerator EcranApproE3_ChaineVide_AfficheUnMessageHonnetePasUneListeFabriquee()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTestChaine(new GetSupplyChainGraphResponseDto
            {
                nodes = new SupplyChainNodeDto[0],
                legs = new SupplyChainLegDto[0],
                routes = new SupplyChainRouteDto[0],
            });
            yield return null;

            CollectionAssert.Contains(ecran.RenderedTexts,
                "Rien à remonter pour l'instant — la chaîne ne connaît aucun maillon sur ce compte.",
                "l'état vide de la section chaîne n'affiche pas le message honnête attendu");
            // Anti-fabrication : aucun des libellés de crans de la maquette (m-50/51/52, jamais
            // sourcés) ne doit apparaître.
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, "Le labo de Spine-B",
                "un cran de la maquette d'enquête a été fabriqué alors qu'aucune donnée ne le porte");
        }

        // ═══ R — Résolveurs : domaine FERMÉ annoncé, contrôle positif ET négatif ═══════════════
        //
        // `supplier_pressure_bucket` est le SEUL des trois domaines de ㉚ confirmé fermé (message
        // d'erreur mesuré 2026-09-03 : FRESH|USED|STRAINED) — c'est pourquoi lui seul porte un
        // `default: throw`. Contrôle positif (les 3 valeurs connues résolvent) ET négatif (une 4e
        // valeur est BRUYANTE, pas absorbée en silence) — sans le second, le premier ne prouve pas
        // que le repli existe, seulement que les cas heureux marchent.
        [Test]
        public void EcranApproR1_ResolveurPression_CouvreLesTroisValeursAnnoncees()
        {
            Assert.AreEqual("il vous prend encore au sérieux",
                ChaineDApproResolvers.TextePressionFournisseur("FRESH"));
            Assert.AreEqual("il commence à traîner",
                ChaineDApproResolvers.TextePressionFournisseur("USED"));
            Assert.AreEqual("il vous fait attendre exprès",
                ChaineDApproResolvers.TextePressionFournisseur("STRAINED"));
        }

        [Test]
        public void EcranApproR2_ResolveurPression_RejetteUneValeurHorsDomaineAnnonce()
        {
            Assert.Throws<System.ArgumentOutOfRangeException>(
                () => ChaineDApproResolvers.TextePressionFournisseur("BOGUS_5E_VALEUR"),
                "une valeur hors du domaine annoncé (FRESH|USED|STRAINED) doit être BRUYANTE, " +
                "jamais absorbée en silence par un repli connu");
        }
    }
}
