using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.Shell.Tests
{
    // Retour user (2026-08-21, mot pour mot) : « Es-tu sûr que ça fonctionne sur tout type d'écran ? »
    // — MESURÉ : 0 occurrence de `SetResolution`/`GameViewSize` dans tout `Assets/Tests/PlayMode/`
    // avant ce lot — les 250 falsifiables existantes certifiaient EXCLUSIVEMENT 1280×720 PAYSAGE.
    // `ProjectSettings/ProjectSettings.asset:11` porte `defaultScreenOrientation: 0` (PORTRAIT) et
    // SEUL `allowedAutorotateToPortrait: 1` — l'app ne tournera JAMAIS en paysage sur téléphone.
    // Le HUD a donc été certifié au pixel dans une orientation qui n'existera JAMAIS en production.
    //
    // MÉTHODE — analytique, pas un re-rendu Play Mode par résolution. Redimensionner le Game View
    // depuis le code passe par `UnityEditor.GameViewSizes`, une API INTERNE non publique/non garantie
    // stable entre versions Unity (vérifiée manuellement pour les 4 captures de preuve de ce lot —
    // voir `Assets/Screenshots/hud_multires_*.png` — mais délibérément PAS commitée ici comme
    // mécanisme de test permanent : un test qui dépend d'une API interne peut casser au moindre
    // upgrade Unity pour une raison SANS RAPPORT avec une régression produit).
    //
    // `CanvasScaler.uiScaleMode = ScaleWithScreenSize` avec `matchWidthOrHeight = 0` — vérifié par
    // `execute_code` sur un `CanvasScaler` fraîchement construit (défaut Unity, 0) ; AUCUN site
    // d'appel de ce dépôt (`AppShell.cs`, `TopBarController.cs`, `ManometreOraclePlayModeTests.cs`)
    // ne le change. Sous ce régime, la largeur LOCALE du canvas vaut TOUJOURS
    // `referenceResolution.x` (1280), quel que soit le ratio d'aspect réel de l'appareil — seule la
    // HAUTEUR locale varie (`1280 * device.height / device.width`). Les positions X des 3 zones du
    // TopBar et des 5 boutons de la TabBar (constantes en unités locales) sont donc INVARIANTES à
    // l'aspect ratio — ce que ce fichier PROUVE algébriquement pour le jeu de résolutions ci-dessous,
    // plutôt que de le supposer (mesuré EN LIVE, Play Mode réel, pour les 4 mêmes résolutions : voir
    // les captures + `Tools/hud-v31-topbar-multires-implementation-notes.md`).
    //
    // Les constantes utilisées ici sont LUES PAR RÉFLEXION depuis `TopBarController`/`AppShell` —
    // JAMAIS recopiées : un recopiage dérive silencieusement du code réel (précédent maison DA3/DA4,
    // TopBarDoctrineV31PlayModeTests.cs).
    [Category("HUDv31")]
    public class ChromeMultiResolutionPlayModeTests
    {
        // ── Le jeu de résolutions — justifié (voir implementation-notes.md § Multi-résolution) ──
        // 1280×720 (16:9 paysage) : baseline HISTORIQUE — seule résolution jamais certifiée avant ce
        //   lot ; DOIT continuer de tenir (non-régression).
        // 1080×2280 (19:9 portrait) : téléphone portrait COURANT — Pixel 4a/5, Galaxy A52/A53,
        //   segment Android le plus vendu sur cette fourchette d'aspect.
        // 1080×2400 (20:9 EXACT, portrait ALLONGÉ) : demandé explicitement par le contrôleur —
        //   Galaxy S21-S23, Redmi Note (haut/milieu de gamme récent).
        // 1200×1920 (16:10 portrait) : TABLETTE Android 10" typique, tenue en portrait — le format
        //   le plus large du jeu, donc celui qui teste le mieux la marge de la TabBar (5 boutons).
        private static readonly (int w, int h, string label)[] TargetResolutions =
        {
            (1280, 720, "1280x720 landscape (historique)"),
            (1080, 2280, "1080x2280 portrait courant (19:9)"),
            (1080, 2400, "1080x2400 portrait allongé (20:9)"),
            (1200, 1920, "1200x1920 tablette portrait (16:10)"),
        };

        // Résolution DÉGÉNÉRÉE pour les contrôles positifs (socle CLAUDE.md — "mondes dégénérés" :
        // un test qui passerait parce que tout est minuscule, ou parce qu'aucune résolution réelle
        // n'est exercée). JAMAIS un appareil réel — un viewport absurdement étroit, choisi pour PROUVER
        // que le détecteur algébrique peut rougir, pas pour représenter un écran plausible.
        private const float DegenerateReferenceWidth = 200f; // << 1280 — un canvas local minuscule

        private const float ReferenceWidth = 1280f; // AppShell.cs — CanvasScaler.referenceResolution.x

        private static float GetPrivateConstFloat(Type t, string name)
        {
            FieldInfo f = t.GetField(name, BindingFlags.NonPublic | BindingFlags.Static);
            Assert.IsNotNull(f, $"constante '{name}' introuvable sur {t.Name} — le nom a dérivé du code réel, " +
                "ce test doit être ré-accordé");
            return (float)f.GetValue(null);
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // (a) — TopBar : MoneyCluster / Manometre / ClockCluster ne se chevauchent JAMAIS, et
        // aucun ne déborde du canvas local, pour CHAQUE résolution cible.
        // ══════════════════════════════════════════════════════════════════════════════════════

        private static List<string> TopBarOverlapOffenders(float localWidth, string label,
            float barPaddingX, float moneyClusterWidth, float clockClusterWidth, float manometreDiameter)
        {
            var offenders = new List<string>();
            float moneyRight = barPaddingX + moneyClusterWidth;
            float manoLeft = localWidth / 2f - manometreDiameter / 2f;
            float manoRight = localWidth / 2f + manometreDiameter / 2f;
            float clockLeft = localWidth - barPaddingX - clockClusterWidth;

            if (moneyRight >= manoLeft)
                offenders.Add($"{label}: MoneyCluster (jusqu'à {moneyRight:F1}) chevauche le médaillon (dès {manoLeft:F1})");
            if (manoRight >= clockLeft)
                offenders.Add($"{label}: le médaillon (jusqu'à {manoRight:F1}) chevauche ClockCluster (dès {clockLeft:F1})");
            if (moneyRight >= localWidth)
                offenders.Add($"{label}: MoneyCluster déborde du canvas local (largeur {localWidth:F1})");
            if (clockLeft <= 0f)
                offenders.Add($"{label}: ClockCluster déborde du canvas local (largeur {localWidth:F1})");
            return offenders;
        }

        [Test]
        public void MultiRes_TopBarClusters_NeverOverlapOrOverflow_AcrossTargetResolutions()
        {
            Type t = typeof(TopBarController);
            float barPaddingX = GetPrivateConstFloat(t, "BarPaddingX");
            float moneyClusterWidth = GetPrivateConstFloat(t, "MoneyClusterWidth");
            float clockClusterWidth = GetPrivateConstFloat(t, "ClockClusterWidth");
            float manometreDiameter = GetPrivateConstFloat(t, "ManometreDiameter");

            var offenders = new List<string>();
            foreach (var (w, h, label) in TargetResolutions)
            {
                // matchWidthOrHeight=0 ⇒ largeur locale TOUJOURS ReferenceWidth, indépendante de
                // w/h — cette boucle documente explicitement, pour CHAQUE cible nommée, que la
                // propriété tient (jamais un paramètre `w`/`h` mort/silencieusement inutilisé : voir
                // le test (c) ci-dessous, qui exerce spécifiquement l'axe où w/h COMPTENT — la
                // hauteur).
                offenders.AddRange(TopBarOverlapOffenders(ReferenceWidth, label,
                    barPaddingX, moneyClusterWidth, clockClusterWidth, manometreDiameter));
            }
            Assert.IsEmpty(offenders, "chevauchement/débordement TopBar prédit :\n" + string.Join("\n", offenders));
        }

        [Test]
        public void MultiRes_TopBarClusters_PositiveControl_DegenerateWidth_IsDetected()
        {
            Type t = typeof(TopBarController);
            float barPaddingX = GetPrivateConstFloat(t, "BarPaddingX");
            float moneyClusterWidth = GetPrivateConstFloat(t, "MoneyClusterWidth");
            float clockClusterWidth = GetPrivateConstFloat(t, "ClockClusterWidth");
            float manometreDiameter = GetPrivateConstFloat(t, "ManometreDiameter");

            List<string> offenders = TopBarOverlapOffenders(DegenerateReferenceWidth, "canvas dégénéré",
                barPaddingX, moneyClusterWidth, clockClusterWidth, manometreDiameter);
            Assert.IsNotEmpty(offenders,
                "CONTRÔLE POSITIF : un canvas local de 200 unités (<< 1280) DOIT produire un chevauchement " +
                "détecté — sinon le 0 ci-dessus ne prouve rien (le détecteur pourrait être aveugle)");
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // (b) — TabBar : les 5 boutons (HorizontalLayoutGroup, padding+spacing lus par réflexion)
        // ont TOUS une largeur STRICTEMENT positive, pour chaque résolution cible.
        // ══════════════════════════════════════════════════════════════════════════════════════

        private static float ComputeTabButtonWidth(float localWidth, float padding, float spacing, int buttonCount)
        {
            float available = localWidth - 2f * padding - spacing * (buttonCount - 1);
            return available / buttonCount;
        }

        [Test]
        public void MultiRes_TabBarButtons_AllPositiveWidth_AcrossTargetResolutions()
        {
            Type t = typeof(AppShell);
            // AppShell.BuildTabBar câble `hlg.padding = new RectOffset(8,8,6,6)` / `hlg.spacing = 4`
            // en LITTÉRAL sur le HorizontalLayoutGroup — pas de constante nommée à lire par réflexion
            // pour CES deux valeurs (elles vivent sur le composant Unity, pas un champ C#). Recopiées
            // ici avec le renvoi EXACT au site d'appel — si elles dérivent, ce commentaire dérive AVEC
            // elles (à ré-accorder manuellement, contrairement aux `private const` ci-dessus).
            const float tabBarPadding = 8f; // AppShell.BuildTabBar — hlg.padding = new RectOffset(8,8,6,6)
            const float tabBarSpacing = 4f; // AppShell.BuildTabBar — hlg.spacing = 4
            const int tabCount = 5;

            var offenders = new List<string>();
            foreach (var (w, h, label) in TargetResolutions)
            {
                float buttonWidth = ComputeTabButtonWidth(ReferenceWidth, tabBarPadding, tabBarSpacing, tabCount);
                if (buttonWidth <= 0f) offenders.Add($"{label}: largeur de bouton d'onglet <= 0 ({buttonWidth:F1})");
            }
            Assert.IsEmpty(offenders, "largeur de bouton d'onglet non-positive prédite :\n" + string.Join("\n", offenders));
        }

        [Test]
        public void MultiRes_TabBarButtons_PositiveControl_DegenerateWidth_IsDetected()
        {
            const float tabBarPadding = 8f;
            const float tabBarSpacing = 4f;
            const int tabCount = 5;
            float buttonWidth = ComputeTabButtonWidth(DegenerateReferenceWidth, tabBarPadding, tabBarSpacing, tabCount);
            // Le canvas dégénéré (200) reste positif ici (les boutons rétrécissent mais ne s'inversent
            // pas) — pour un VRAI zéro/négatif il faut descendre sous padding*2+spacing*4 = 32 unités.
            const float trulyDegenerateWidth = 20f;
            float negativeButtonWidth = ComputeTabButtonWidth(trulyDegenerateWidth, tabBarPadding, tabBarSpacing, tabCount);
            Assert.LessOrEqual(negativeButtonWidth, 0f,
                "CONTRÔLE POSITIF : un canvas de 20 unités DOIT produire une largeur de bouton <= 0 — sinon " +
                "le test précédent ne prouve rien");
        }

        // ══════════════════════════════════════════════════════════════════════════════════════
        // (c) — l'axe où w/h COMPTENT réellement sous match-width : la HAUTEUR locale. Vérifie que
        // ContentSlot (l'espace entre TopBar+débordement médaillon et TabBar) reste POSITIF pour
        // chaque résolution cible — l'inverse (chevauchement TopBar/TabBar) est le seul mode de
        // rupture qui dépend vraiment de l'aspect ratio réel sous ce régime de scaling.
        // ══════════════════════════════════════════════════════════════════════════════════════

        [Test]
        public void MultiRes_ContentSlot_NeverCollapses_AcrossTargetResolutions()
        {
            Type topBarType = typeof(TopBarController);
            float manometreVerticalOffset = Mathf.Abs(GetPrivateConstFloat(topBarType, "ManometreVerticalOffsetPx"));
            float manometreDiameter = GetPrivateConstFloat(topBarType, "ManometreDiameter");
            const float topBarSlotHeight = 56f;  // AppShell.BuildLayout — TopBarSlot.sizeDelta
            const float tabBarRootHeight = 64f;  // AppShell.BuildTabBar — TabBarRoot.sizeDelta

            // Débordement bas MESURÉ du médaillon sous la barre (même formule que
            // `TopBarController.EffectiveBottomOverhangPx`, en unités locales) : centre du médaillon =
            // (topBarSlotHeight/2) - offset ; bord bas = centre - rayon ; débordement = max(0, -bordBas).
            float manoCenterY = topBarSlotHeight / 2f - manometreVerticalOffset;
            float manoBottomY = manoCenterY - manometreDiameter / 2f;
            float bottomOverhang = Mathf.Max(0f, -manoBottomY);

            var offenders = new List<string>();
            foreach (var (w, h, label) in TargetResolutions)
            {
                float localHeight = ReferenceWidth * (h / (float)w);
                float reservedTop = topBarSlotHeight + bottomOverhang;
                float remaining = localHeight - reservedTop - tabBarRootHeight;
                if (remaining <= 0f)
                    offenders.Add($"{label}: ContentSlot collabe ou s'inverse (hauteur locale {localHeight:F1}, " +
                        $"réservé haut+bas {reservedTop + tabBarRootHeight:F1}, restant {remaining:F1})");
            }
            Assert.IsEmpty(offenders, "collapse de ContentSlot prédit :\n" + string.Join("\n", offenders));
        }

        [Test]
        public void MultiRes_ContentSlot_PositiveControl_DegenerateAspect_IsDetected()
        {
            Type topBarType = typeof(TopBarController);
            float manometreVerticalOffset = Mathf.Abs(GetPrivateConstFloat(topBarType, "ManometreVerticalOffsetPx"));
            float manometreDiameter = GetPrivateConstFloat(topBarType, "ManometreDiameter");
            const float topBarSlotHeight = 56f;
            const float tabBarRootHeight = 64f;
            float manoCenterY = topBarSlotHeight / 2f - manometreVerticalOffset;
            float manoBottomY = manoCenterY - manometreDiameter / 2f;
            float bottomOverhang = Mathf.Max(0f, -manoBottomY);

            // Un ratio h/w ABSURDEMENT bas (écran quasiment plat, jamais un appareil réel) — prouve
            // que le détecteur peut voir un ContentSlot qui s'effondre.
            const float degenerateHRatio = 0.01f; // ex. 1280x12.8 en unités réelles équivalentes
            float degenerateLocalHeight = ReferenceWidth * degenerateHRatio;
            float remaining = degenerateLocalHeight - (topBarSlotHeight + bottomOverhang) - tabBarRootHeight;

            Assert.LessOrEqual(remaining, 0f,
                "CONTRÔLE POSITIF : un ratio hauteur/largeur dégénéré (0.01) DOIT produire un ContentSlot " +
                "effondré (<= 0) — sinon le test précédent ne prouve rien");
        }
    }
}
