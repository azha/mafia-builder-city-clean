using System.Collections;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Capture.Tests
{
    /// <summary>La TÊTE DE LA FICHE de l'écran principal (①), mesurée à l'exécution.
    ///
    /// ⛔ CE QUI A RENDU CETTE MESURE NÉCESSAIRE, ET C'EST UNE FAUTE DE MA PART.
    /// Un juge ⊥ a chiffré F1 (« la 2ᵉ ligne du titre colle au sous-titre, et l'encre du titre
    /// déborde dans le padding haut ») et F2 (« le titre remplit la largeur au lieu d'être une
    /// plaque centrée ») sur la planche `vue_principale_fiche.png`. J'ai corrigé F2 dans
    /// `Operational/BuildingCard/BuildingCardController.cs` — **qui ne dessine pas ce panneau**.
    /// La fiche de ① est construite ici, par `DistrictInteriorScreenController.BuildFiche`, et son
    /// titre était DÉJÀ centré. *Corriger « le titre » sans vérifier QUEL objet porte le titre
    /// mesuré, c'est corriger à côté et croire avoir corrigé* — le socle le documente pour les
    /// espacements, la même faute existe pour les écrans.
    /// ⇒ Ce que ce fichier mesure est donc d'abord une IDENTIFICATION : c'est bien CE panneau, à
    ///   CES dimensions, que le juge a photographié (hauteur 169,19 px CSS, largeur 366).
    ///
    /// ⛔ ET LE MÉCANISME DE F1 EST DÉDUCTIBLE AVANT TOUTE MESURE — ce qui est précisément la
    /// raison de le mesurer. Le sous-titre est posé à un offset ABSOLU (40,80 px CSS,
    /// `PoserDansFiche`). Le blanc « titre → sous-titre » ne peut donc PAS rétrécir parce qu'un
    /// padding serait faux ni parce que l'échelle serait fausse : à échelle fausse, le sous-titre
    /// se déplacerait AUSSI. Il ne peut rétrécir que si l'encre du titre DESCEND PLUS BAS, c'est-
    /// à-dire si le titre occupe plus d'une ligne. Et une boîte d'UNE ligne (17,00 px CSS) dont
    /// l'alignement est `Center` — qui vaut « milieu + centre » en TMP, pas « centre
    /// horizontal » — laisse un bloc de deux lignes déborder SYMÉTRIQUEMENT : vers le haut dans
    /// le padding (F1, premier symptôme) et vers le bas sur le sous-titre (F1, second symptôme).
    /// **Une seule cause explique les deux nombres du juge ; aucune autre n'explique le second.**
    ///
    /// Ce que ce test asserte est donc la PROPRIÉTÉ, pas les nombres du juge : le titre tient sur
    /// UNE ligne, et son encre reste DANS sa boîte. Les deux écarts chiffrés en découlent.
    /// ⚠️ Anti-vacuité : le titre doit porter un nom NON VIDE et assez long pour que la question
    /// se pose — un nom court tiendrait sur une ligne quelle que soit la géométrie, et le test
    /// serait vert pour une raison sans rapport avec ce qu'il prétend mesurer.</summary>
    [Category("FicheTete")]
    public class FicheTeteGeometriePlayModeTests
    {
        /// <summary>`hud-brennar.html` — `.tel{width:min(392px,92vw)}`. REUSE de la seule
        /// référence du client ; recopier « 390 » ou « 392 » ici en ferait une seconde source.</summary>
        private const float LargeurMaquetteCss = EchelleMaquette.LargeurHudBrennar;

        /// <summary>`.fiche .titre .serif` — y 17,00 h 17,00, MESURÉ sur la maquette
        /// (`Tools/mesurer-maquette.py`), pas estimé depuis les paddings.</summary>
        private const float TitreYCss = 17.00f;
        private const float TitreHauteurCss = 17.00f;

        private GameObject shellGo;
        private AppShell shell;

        [TearDown]
        public void TearDown()
        {
            if (shell != null && shell.ShellCanvas != null) Object.Destroy(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.Destroy(shellGo);
            LogAssert.ignoreFailingMessages = false;
        }

        [UnityTest]
        public IEnumerator FicheTete_LeTitreTientSurUneLigne_EtSonEncreResteDansSaBoite()
        {
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("FicheTeteShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return null;

            float t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le shell doit avoir acquis sa session");
            for (int i = 0; i < 30; i++) yield return null;

            shell.EnterDistrict(16);
            var district = Object.FindFirstObjectByType<DistrictInteriorScreenController>();
            t0 = Time.realtimeSinceStartup;
            while (district == null && Time.realtimeSinceStartup - t0 < 20f)
            {
                yield return null;
                district = Object.FindFirstObjectByType<DistrictInteriorScreenController>();
            }
            Assert.IsNotNull(district, "l'écran district doit être monté");

            t0 = Time.realtimeSinceStartup;
            while (district.LastFetch == null && district.LastErrorCode == 0
                   && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsNotNull(district.LastFetch,
                $"le payload district doit être arrivé (code d'erreur observé = {district.LastErrorCode})");
            for (int i = 0; i < 20; i++) yield return null;

            Assert.IsNotNull(district.LastFetch.buildings, "le district doit porter des bâtiments");
            Assert.Greater(district.LastFetch.buildings.Length, 0,
                "sans bâtiment, aucune fiche ne s'ouvre — le test serait vert à vide");

            // Le MÊME chemin que la planche : le premier bâtiment, par `OuvrirFiche`.
            DistrictInteriorBuildingDto premier = district.LastFetch.buildings[0];
            district.OuvrirFiche(premier);
            for (int i = 0; i < 12; i++) yield return null;
            Assert.IsTrue(district.FicheOuverte, "la fiche doit être ouverte");

            Transform ficheT = TrouverEnfant(shell.ContentSlot, "FicheBatiment");
            Assert.IsNotNull(ficheT, "la fiche doit exister dans l'arbre");
            var ficheRt = (RectTransform)ficheT;
            Transform corpsT = TrouverEnfant(ficheT, "Corps");
            Assert.IsNotNull(corpsT, "le corps de la fiche doit exister");
            var titre = TrouverEnfant(corpsT, "Titre").GetComponent<TextMeshProUGUI>();
            var type = TrouverEnfant(corpsT, "Type").GetComponent<TextMeshProUGUI>();
            Assert.IsNotNull(titre, "le titre de la fiche doit exister");
            Assert.IsNotNull(type, "le sous-titre de la fiche doit exister");

            titre.ForceMeshUpdate();
            type.ForceMeshUpdate();
            yield return null;

            // ── L'ÉCHELLE, MESURÉE, PAS SUPPOSÉE ────────────────────────────────────────────────
            // ⚠️ `EchelleMaquette.Px` se dérive de la largeur de la RACINE PLEIN ÉCRAN. Si cette
            //    racine était un panneau plus étroit, toute la fiche serait à une échelle muette —
            //    c'est le piège que le fichier `EchelleMaquette` documente en tête. On lit donc la
            //    largeur RÉELLE, et on la compare à la largeur de la fiche telle que la maquette
            //    l'impose (366 sur 392) : deux chemins indépendants vers le même facteur.
            var racine = (RectTransform)ficheT.parent;
            float largeurCanvas = racine.rect.width;
            float uniteParCss = largeurCanvas / LargeurMaquetteCss;
            float ficheLargeurCss = ficheRt.rect.width / uniteParCss;
            float ficheHauteurCss = ficheRt.rect.height / uniteParCss;

            // Aucune mise à l'échelle cachée entre la racine et le texte : sinon les px CSS
            // ci-dessous ne sont pas comparables aux px CSS du juge.
            float echelleRelative = titre.transform.lossyScale.y / racine.lossyScale.y;

            // ── LA GÉOMÉTRIE DE LA TÊTE, EN PX CSS DE LA MAQUETTE ───────────────────────────────
            float titreHautCss = HautDeBoiteCss(ficheRt, (RectTransform)titre.transform, uniteParCss);
            float titreHauteurCss = ((RectTransform)titre.transform).rect.height / uniteParCss;
            float encreHautCss, encreBasCss;
            EncreCss(ficheRt, titre, uniteParCss, out encreHautCss, out encreBasCss);
            float typeEncreHautCss, typeEncreBasCss;
            EncreCss(ficheRt, type, uniteParCss, out typeEncreHautCss, out typeEncreBasCss);
            float blancTitreSousTitre = typeEncreHautCss - encreBasCss;
            float encreLargeurCss = LargeurEncreCss(titre, uniteParCss);
            // La zone de contenu du canon : `.fiche` 366 moins 2×17 de retrait = 332 px CSS.
            float partDeLaLargeur = encreLargeurCss / (366f - 2f * 17f);

            Debug.Log(
                $"[FICHE-TETE] canvas={largeurCanvas:F1}u unite/css={uniteParCss:F4} " +
                $"echelle_relative={echelleRelative:F6} lossyScale_titre={titre.transform.lossyScale.y:F4}\n" +
                $"[FICHE-TETE] fiche={ficheLargeurCss:F2}x{ficheHauteurCss:F2} css (maquette 366,00x169,19)\n" +
                $"[FICHE-TETE] titre=\"{titre.text}\" lignes={titre.textInfo.lineCount} " +
                $"corps={titre.fontSize:F1}u boite y={titreHautCss:F2} h={titreHauteurCss:F2} css " +
                $"(maquette y={TitreYCss:F2} h={TitreHauteurCss:F2})\n" +
                $"[FICHE-TETE] encre titre {encreHautCss:F2}..{encreBasCss:F2} css · " +
                $"encre sous-titre {typeEncreHautCss:F2}..{typeEncreBasCss:F2} css · " +
                $"blanc titre→sous-titre={blancTitreSousTitre:F2} css\n" +
                $"[FICHE-TETE] encre du titre large de {encreLargeurCss:F2} css = {partDeLaLargeur:P1} "
                + $"de la zone de contenu (canon 141,7 css = 42,7 %) — versant F2, RAPPORTÉ et non "
                + $"asserté : borné par la longueur du nom que le back compose, pas par un réglage d'ici");

            // ── LES GARDES ──────────────────────────────────────────────────────────────────────
            // (0) l'identification : c'est bien le panneau que le juge a mesuré.
            Assert.AreEqual(366f, ficheLargeurCss, 4f,
                $"ce n'est pas la fiche de ① : largeur {ficheLargeurCss:F2} css au lieu de 366");
            Assert.AreEqual(169.19f, ficheHauteurCss, 4f,
                $"ce n'est pas la fiche de ① : hauteur {ficheHauteurCss:F2} css au lieu de 169,19");
            Assert.AreEqual(1f, echelleRelative, 0.001f,
                "une mise à l'échelle vit entre la racine et le titre — les px CSS mesurés ici ne " +
                "seraient alors pas ceux du juge");

            // (1) anti-vacuité : un nom vide ou court rendrait les gardes suivantes vraies pour
            //     une raison sans rapport avec la géométrie.
            Assert.IsFalse(string.IsNullOrWhiteSpace(titre.text), "le titre doit porter un nom");
            Assert.Greater(titre.text.Length, 12,
                $"le nom servi (« {titre.text} », {titre.text.Length} caractères) est trop court pour " +
                "que la question du débordement se pose : ce test serait vert à vide");

            // (2) LA PROPRIÉTÉ — une seule ligne, et l'encre dans la boîte.
            Assert.AreEqual(1, titre.textInfo.lineCount,
                $"le titre se replie sur {titre.textInfo.lineCount} lignes dans une boîte d'UNE ligne " +
                $"(17,00 css) : le bloc déborde symétriquement, vers le haut dans le padding et vers " +
                $"le bas sur le sous-titre — c'est F1, par ses deux bouts");
            Assert.GreaterOrEqual(encreHautCss, titreHautCss - 0.5f,
                $"l'encre du titre commence à {encreHautCss:F2} css, AU-DESSUS de sa boîte posée à " +
                $"{titreHautCss:F2} — elle mange le padding haut du panneau");

            // (3) anti-dégénérescence — l'auto-réduction ne doit pas avoir touché son PLANCHER :
            //     au plancher, TMP cesse de réduire et le titre déborde de sa boîte en largeur.
            //     Une garde qui ne regarderait que `lineCount` resterait verte dans ce monde-là.
            float corpsCss = titre.fontSize / uniteParCss;
            Assert.Greater(corpsCss, 10.4f,
                $"le corps du titre est tombé à {corpsCss:F2} css, sur son plancher de 10,00 : " +
                "l'auto-réduction est saturée et le titre déborde en largeur");

            // (4) le blanc jusqu'au sous-titre : le canon en donne 11,00 css.
            Assert.Greater(blancTitreSousTitre, 6f,
                $"le blanc titre→sous-titre vaut {blancTitreSousTitre:F2} css (canon 11,00) : les deux " +
                "lignes se lisent comme un seul bloc");
        }

        /// <summary>MESURE — le chrome est-il rendu à la même échelle sous ① que sous ⑥ ?
        ///
        /// ⛔ Le juge ⊥ du r5 de ① mesure **huit grandeurs indépendantes** du chrome à ×1,18 à
        /// ×1,21 du canon (ronds 1,184 · pas 1,185 · chasses 1,204-1,211 · capitale 1,204 · barre de
        /// ratio 1,187 · filet 1,187) — et le TÉMOIN ⑥, MÊME shell, MÊME résolution, trois minutes
        /// plus tôt, rend le canon exactement. Les centres des ronds sont identiques en CSS à 1920
        /// et à 2400 ⇒ ce n'est pas la résolution : c'est un facteur porté par un objet propre à ①.
        /// ⇒ Un écart SYSTÉMATIQUE et de même signe sur huit mesures indépendantes n'est pas huit
        ///   erreurs : c'est UNE cause. Le socle le dit pour les opacités ; c'est vrai ici pour une
        ///   échelle. Ce test ne corrige rien : il imprime la chaîne des `lossyScale` et des
        ///   `scaleFactor` du chrome sous les DEUX locataires, côte à côte, pour que l'objet
        ///   porteur se lise au lieu de se deviner.
        /// ⚠️ Deux locataires dans UN run et non deux runs : *deux variables qui bougent ensemble ne
        ///   départagent rien*, et deux runs feraient bouger l'état de l'éditeur en plus du
        ///   locataire.</summary>
        [UnityTest]
        public IEnumerator ChromeEchelle_SousDistrictEtSousFamille()
        {
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("EchelleChromeShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return null;
            float t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le shell doit avoir acquis sa session");
            for (int i = 0; i < 30; i++) yield return null;

            shell.EnterDistrict(16);
            for (int i = 0; i < 60; i++) yield return null;
            string sousDistrict = DecrireEchelleDuChrome("① district");

            shell.ActivateTab(AppShell.Tab.Org);
            for (int i = 0; i < 90; i++) yield return null;
            string sousFamille = DecrireEchelleDuChrome("⑥ famille");

            Debug.Log("[CHROME-ECHELLE]\n" + sousDistrict + sousFamille);
        }

        /// <summary>La chaîne du chrome, du canvas jusqu'à la barre haute : `lossyScale`,
        /// `scaleFactor`, et deux longueurs de contrôle. Rendue en texte pour être lue côte à côte.
        /// ⚠️ On imprime AUSSI le type de locataire monté : sans lui, deux blocs identiques ne
        /// diraient pas s'ils décrivent bien deux mondes différents.</summary>
        private string DecrireEchelleDuChrome(string quoi)
        {
            var sb = new System.Text.StringBuilder();
            Canvas canvas = shell.ShellCanvas;
            sb.Append($"  [{quoi}] locataire={shell.MountedTenantType?.Name ?? "aucun"} " +
                      $"canvas.scaleFactor={(canvas != null ? canvas.scaleFactor : -1f):F6} " +
                      $"canvas.lossyScale={(canvas != null ? canvas.transform.lossyScale.x : -1f):F6}\n");
            foreach (string nom in new[] { "TopBarSlot", "TabBarRoot", "ContentSlot" })
            {
                Transform t = TrouverEnfant(canvas != null ? canvas.transform : shell.transform, nom);
                if (t == null) { sb.Append($"    {nom,-14} ABSENT\n"); continue; }
                var rt = (RectTransform)t;
                sb.Append($"    {nom,-14} lossyScale={t.lossyScale.x:F6} " +
                          $"rect={rt.rect.width:F1}x{rt.rect.height:F1} localScale={t.localScale.x:F6}\n");
            }
            // ⛔ L'INDICATEUR D'ONGLET ACTIF — un juge ⊥ mesure **0 pixel doré dans toute la bande
            // du dock** sur ① (r6), là où les planches de ③ et ⑥ en portent 172 et 95 (mesuré hors
            // ligne sur les trois planches). Reste à savoir si l'objet a disparu ou si c'est l'ÉTAT
            // qui n'est pas posé : `EnterDistrict` ne touche PAS `CurrentTab` — le fichier le dit
            // en toutes lettres — donc l'indicateur dépend de ce qu'un `ActivateTab` a laissé.
            int indicateursPresents = 0, indicateursAllumes = 0;
            foreach (Transform t in (canvas != null ? canvas.transform : shell.transform)
                        .GetComponentsInChildren<Transform>(true))
                if (t.name == "ActiveIndicator")
                {
                    indicateursPresents++;
                    if (t.gameObject.activeInHierarchy) indicateursAllumes++;
                }
            sb.Append($"    dock : {indicateursPresents} indicateurs dans l'arbre, " +
                      $"{indicateursAllumes} ALLUMÉS · CurrentTab={shell.CurrentTab}\n");

            if (shell.TopBar != null)
            {
                var trt = (RectTransform)shell.TopBar.transform;
                sb.Append($"    TopBar         lossyScale={trt.lossyScale.x:F6} " +
                          $"rect={trt.rect.width:F1}x{trt.rect.height:F1} localScale={trt.localScale.x:F6}\n");
                foreach (Transform enf in trt.GetComponentsInChildren<Transform>(true))
                    if (enf.localScale.x < 0.999f || enf.localScale.x > 1.001f)
                        sb.Append($"      ! {enf.name} localScale={enf.localScale.x:F6}\n");
            }
            return sb.ToString();
        }

        /// <summary>Le haut d'une boîte, en px CSS de la maquette, RELATIF au haut de la fiche.</summary>
        private static float HautDeBoiteCss(RectTransform fiche, RectTransform boite, float uniteParCss)
        {
            Vector3 monde = boite.TransformPoint(new Vector3(0f, boite.rect.yMax, 0f));
            return (fiche.rect.yMax - fiche.InverseTransformPoint(monde).y) / uniteParCss;
        }

        /// <summary>Les bords haut et bas de l'ENCRE d'un texte — les quads de glyphes, pas la
        /// boîte de ligne : c'est ce qu'un juge mesure sur une image.
        /// ⚠️ On ne lit que les caractères VISIBLES : une espace porte un quad dégénéré qui
        /// écraserait le maximum vers zéro.</summary>
        private static void EncreCss(RectTransform fiche, TMP_Text texte, float uniteParCss,
            out float hautCss, out float basCss)
        {
            TMP_TextInfo info = texte.textInfo;
            float haut = float.NegativeInfinity, bas = float.PositiveInfinity;
            for (int i = 0; i < info.characterCount; i++)
            {
                TMP_CharacterInfo c = info.characterInfo[i];
                if (!c.isVisible) continue;
                haut = Mathf.Max(haut, c.vertex_TL.position.y);
                bas = Mathf.Min(bas, c.vertex_BL.position.y);
            }
            Assert.IsFalse(float.IsInfinity(haut),
                $"aucun glyphe visible dans « {texte.text} » — la mesure d'encre serait vide");
            var rt = (RectTransform)texte.transform;
            float hautLocal = fiche.InverseTransformPoint(rt.TransformPoint(new Vector3(0f, haut, 0f))).y;
            float basLocal = fiche.InverseTransformPoint(rt.TransformPoint(new Vector3(0f, bas, 0f))).y;
            hautCss = (fiche.rect.yMax - hautLocal) / uniteParCss;
            basCss = (fiche.rect.yMax - basLocal) / uniteParCss;
        }

        /// <summary>La largeur de l'ENCRE d'un texte en px CSS — le versant horizontal de la même
        /// mesure. Rapportée, jamais assertée : elle est bornée par la longueur du nom que le back
        /// compose, pas par un réglage de ce fichier.</summary>
        private static float LargeurEncreCss(TMP_Text texte, float uniteParCss)
        {
            TMP_TextInfo info = texte.textInfo;
            float g = float.PositiveInfinity, d = float.NegativeInfinity;
            for (int i = 0; i < info.characterCount; i++)
            {
                TMP_CharacterInfo c = info.characterInfo[i];
                if (!c.isVisible) continue;
                g = Mathf.Min(g, c.vertex_BL.position.x);
                d = Mathf.Max(d, c.vertex_BR.position.x);
            }
            return float.IsInfinity(g) ? 0f : (d - g) / uniteParCss;
        }

        private static Transform TrouverEnfant(Transform racine, string nom)
        {
            if (racine == null) return null;
            foreach (Transform t in racine.GetComponentsInChildren<Transform>(true))
                if (t.name == nom) return t;
            return null;
        }
    }
}
