using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{
    /// <summary>㉚ « Les deux gestes » — LA FEUILLE (cadres 160-169, `poser-chaine-gestes.py` `feuille()` + `CSS`) : un voile et un panneau, posés en bas de l'écran,
    /// qui proposent les modes d'un geste (trois, ou deux pour reconstruire). Montage uGUI seul : AUCUNE règle de métier ici (l'extinction d'un mode est `ChaineDApproGestes.Actionnable`),
    /// aucun réseau. Le contrôleur l'ouvre (`Ouvrir`), y montre la phrase d'un refus (`MontrerRefus`) et la ferme (`Fermer`).
    ///
    /// ⛔ OÙ ELLE VIT : DIRECTEMENT sous la racine d'écran, HORS de la fenêtre `RectMask2D` de la chaîne, et EN DERNIERS enfants (voile puis panneau) — sinon la feuille est
    /// rognée par la fenêtre, ou recouverte par le pied. Hors mise en page (`ignoreLayout`) : la racine est une pile, la feuille la survole.
    /// ⛔ TOUT `Graphic` naît avec son `CanvasRenderer` (`AjouterImage` / `Texte`) : `AddComponent` à l'exécution n'honore pas `[RequireComponent]`.
    /// Les textes passent TOUS par `Libelle` (clés dérivées non servies — TD-1048 ; REUSE de `accueil.jeton.*`, `appro.bouton.*`, `game.ui_common.cancel_button`).</summary>
    public sealed class ChaineDApproFeuille
    {
        public const string NomVoile = "FeuilleVoile";
        public const string NomPanneau = "FeuillePanneau";
        private const string PrefixeDuMode = "Mode_";

        private readonly RectTransform racine;
        private readonly Func<float, float> px;
        private readonly Func<float, int> pxTrait;
        private readonly Action<ModeDeGeste> surChoix;
        private readonly Action surAnnuler;

        private GameObject voile, panneau, zoneDeRefus;
        private TextMeshProUGUI texteDeRefus;
        private readonly List<string> textes = new List<string>();
        private readonly Dictionary<string, Button> boutons = new Dictionary<string, Button>();

        /// <summary>Les textes RÉELLEMENT rendus par la feuille ouverte, dans l'ordre — crochet de test (patron `RenderedTexts`) : G-D3 y cherche un tick.</summary>
        public IReadOnlyList<string> Textes => textes;
        /// <summary>La phrase de refus MONTRÉE dans la feuille (la phrase SERVIE, `RefusServi`) ; null = aucune. Remise à null à chaque ouverture.</summary>
        public string DernierePhraseMontree { get; private set; }
        public SpecDeGeste SpecOuverte { get; private set; }
        public CibleDeGeste CibleOuverte { get; private set; }
        public bool EstOuverte => panneau != null;
        public RectTransform Voile => voile != null ? (RectTransform)voile.transform : null;
        public RectTransform Panneau => panneau != null ? (RectTransform)panneau.transform : null;
        /// <summary>Le bouton d'un mode (par son `Id` servi) de la feuille ouverte ; null si inconnu. Son `interactable` EST l'extinction.</summary>
        public Button BoutonDuMode(string modeId) => modeId != null && boutons.TryGetValue(modeId, out Button b) ? b : null;

        public ChaineDApproFeuille(RectTransform racine, Func<float, float> px, Func<float, int> pxTrait, Action<ModeDeGeste> surChoix, Action surAnnuler)
        {
            this.racine = racine; this.px = px; this.pxTrait = pxTrait; this.surChoix = surChoix; this.surAnnuler = surAnnuler;
        }

        /// <summary>Ouvre la feuille de `spec` sur `cible`. `couts` : le point d'injection des coûts (absent ⇒ le mode est éteint). `jetonDisponible` : le jeton de structure.</summary>
        public void Ouvrir(SpecDeGeste spec, CibleDeGeste cible, ICoutsParMode couts, bool jetonDisponible)
        {
            Fermer();
            SpecOuverte = spec; CibleOuverte = cible;
            textes.Clear();
            DernierePhraseMontree = null;

            // le VOILE — `#0b1016b3` : la teinte est le jeton `hudGaugeFaceOuter` (à 2/255), l'alpha est l'opacité CSS CONVERTIE pour le mélange LINÉAIRE d'Unity
            // (`1 − (1−a)^2,2`, comme le voile de scène) — recopier 0,70 telle quelle éclaircirait le voile de moitié (CLAUDE.md : Unity compose en linéaire).
            voile = Nouveau(NomVoile, racine);
            HorsMiseEnPage(voile); Etirer((RectTransform)voile.transform);
            Image fondVoile = AjouterImage(voile);
            Color teinteVoile = Teinte.Jeton("hudGaugeFaceOuter", t => t.hudGaugeFaceOuter).Resoudre();
            teinteVoile.a = DashboardController.AlphaLineaireDuVoile(ChaineDApproGestes.AlphaCssDuVoile);
            fondVoile.color = teinteVoile;
            fondVoile.raycastTarget = true;   // il BARRE le clic : rien sous la feuille ne reçoit le geste

            // le PANNEAU — `.gr30-feuille{left:0;right:0;bottom:0;padding:11px 13px 13px;background:#1e1b16;border-top:1px solid #3a352c}`
            panneau = Nouveau(NomPanneau, racine);
            HorsMiseEnPage(panneau);
            RectTransform rt = (RectTransform)panneau.transform;
            rt.anchorMin = Vector2.zero; rt.anchorMax = new Vector2(1f, 0f); rt.pivot = new Vector2(0.5f, 0f);
            // revue ⊥ M1 : le bas de l'écran est mangé par le chrome du shell (zone sûre + barre d'onglets) — le panneau s'ancre AU-DESSUS (précédent `BuildingCardController:1996`), sinon « Annuler » passe
            // derrière la barre et le joueur est enfermé dans la feuille (le voile ne ferme pas). Le voile, lui, reste plein écran : il barre tout le clic.
            rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
            rt.anchoredPosition = new Vector2(0f, ShellChrome.BottomInsetPx);   // pivot en bas : le BAS du panneau est à `BottomInsetPx`
            Image fond = AjouterImage(panneau);
            fond.color = ChaineDApproScreenController.FondEntete;
            fond.raycastTarget = true;
            Filets.Poser(rt, new SpecFilet(Cotes.Haut, 1f, StyleFilet.Plein, Teinte.Hex("#3a352c")));
            VerticalLayoutGroup v = panneau.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(pxTrait(13f), pxTrait(13f), pxTrait(11f), pxTrait(13f));
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            panneau.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            Texte(panneau.transform, "Titre", Libelle.Gabarit(spec.CleTitre, spec.RepliTitre), 12f, ChaineDApproScreenController.EncreTitreChaine, true, true);
            Espace(3f);
            TextMeshProUGUI lieu = Texte(panneau.transform, "Cible", cible.Origine + " → " + cible.Destination, 7f, ChaineDApproScreenController.EncreSousTitreChaine, false);
            lieu.enableWordWrapping = true;
            if (spec.CleCommun != null)
            {
                Espace(5f);
                TextMeshProUGUI commun = Texte(panneau.transform, "Commun", Libelle.Gabarit(spec.CleCommun, spec.RepliCommun), 7f, ChaineDApproScreenController.EncreNomLiaison, false);
                commun.enableWordWrapping = true;
            }
            ConstruireLaZoneDeRefus();
            foreach (ModeDeGeste m in spec.Modes)
            {
                Espace(6f);
                ConstruireUnMode(m, couts, jetonDisponible);
            }
            Espace(6f);
            TextMeshProUGUI legende = Texte(panneau.transform, "Legende", Libelle.De("appro", "bouton", "ça part du compte tout de suite"), 6.5f, ChaineDApproScreenController.EncreSousTitreChaine, false);
            legende.alignment = TextAlignmentOptions.Right;
            Espace(8f);
            ConstruireAnnuler();

            // EN DERNIERS enfants de la racine : au-dessus du pied, de la fenêtre, de tout
            voile.transform.SetAsLastSibling();
            panneau.transform.SetAsLastSibling();
        }

        /// <summary>Montre la phrase d'un refus SERVI dans la feuille (elle reste ouverte). Null ou vide ⇒ rien n'est montré : jamais une phrase du client à la place d'une phrase servie.</summary>
        public void MontrerRefus(string phrase)
        {
            if (zoneDeRefus == null) return;
            if (string.IsNullOrEmpty(phrase))
            {
                zoneDeRefus.SetActive(false);
                DernierePhraseMontree = null;
                return;
            }
            texteDeRefus.text = phrase;
            zoneDeRefus.SetActive(true);
            DernierePhraseMontree = phrase;
            textes.Add(phrase);
        }

        public void Fermer()
        {
            Detruire(ref voile);
            Detruire(ref panneau);
            zoneDeRefus = null; texteDeRefus = null;
            boutons.Clear();
            SpecOuverte = null; CibleOuverte = null;
        }

        private static void Detruire(ref GameObject go)
        {
            if (go == null) return;
            go.SetActive(false);
            go.transform.SetParent(null, false);   // plus un enfant de la racine tout de suite (la destruction n'a lieu qu'en fin d'image)
            UnityEngine.Object.Destroy(go);
            go = null;
        }

        // ── les pièces ─────────────────────────────────────────────────────────────────────

        /// <summary>`.gr30-fref{margin:8px 0 0;padding:6px 8px;border-left:2px solid #8c2f36;background:#2e1b18;font:7px/1.35;color:#e8a89e}` — INACTIVE tant qu'aucun refus servi n'est à dire.</summary>
        private void ConstruireLaZoneDeRefus()
        {
            zoneDeRefus = Nouveau("Refus", panneau.transform);
            VerticalLayoutGroup z = zoneDeRefus.AddComponent<VerticalLayoutGroup>();
            z.padding = new RectOffset(0, 0, pxTrait(8f), 0);   // la marge haute de 8 px
            z.childControlWidth = true; z.childControlHeight = true;
            z.childForceExpandWidth = true; z.childForceExpandHeight = false;

            GameObject boite = Nouveau("Boite", zoneDeRefus.transform);
            AjouterFond(boite, Teinte.Hex("#2e1b18").Resoudre());
            Filets.Poser((RectTransform)boite.transform, new SpecFilet(Cotes.Gauche, 2f, StyleFilet.Plein, Teinte.Hex("#8c2f36")));
            VerticalLayoutGroup v = boite.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(pxTrait(8f), pxTrait(8f), pxTrait(6f), pxTrait(6f));
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            // le texte n'est PAS tracé à la construction : il l'est quand une phrase est montrée (`MontrerRefus`)
            texteDeRefus = TexteSansTrace(boite.transform, "Phrase", "", 7f, Teinte.Hex("#e8a89e").Resoudre(), false);
            texteDeRefus.enableWordWrapping = true;
            zoneDeRefus.SetActive(false);
        }

        /// <summary>`.gr30-fch` : un mode — son nom, son sous-titre, la marque du jeton (structurel ET libre), son coût (ou « on ne sait pas encore combien »). ÉTEINT (`.eteint`) quand
        /// `Actionnable` dit non : coût absent, ou jeton pris pour un mode structurel (le sous-titre dit alors la phrase SERVIE du cap).</summary>
        private void ConstruireUnMode(ModeDeGeste mode, ICoutsParMode couts, bool jetonDisponible)
        {
            string centimes = ChaineDApproGestes.CentimesLisibles(couts, mode.Id);   // illisible = non servi
            string locale = LocaleDArgent();
            bool actionnable = ChaineDApproGestes.Actionnable(mode, centimes, jetonDisponible);
            bool jetonPris = mode.Structurel && !jetonDisponible;

            GameObject ligne = Nouveau(PrefixeDuMode + mode.Id, panneau.transform);
            Image fond = AjouterImage(ligne);
            fond.color = actionnable ? ChaineDApproScreenController.FondMaillon : ChaineDApproScreenController.FondLiaison;
            fond.raycastTarget = true;
            Filets.Poser((RectTransform)ligne.transform, actionnable ? DecorsDeScene.Filets.ChaineDAppro.Noeud : ChaineDApproScreenController.FiletLiaison);
            Button b = ligne.AddComponent<Button>();
            b.targetGraphic = fond;
            b.transition = Selectable.Transition.None;   // la teinte de `disabledColor` éclaircirait/voilerait le fond : l'extinction se dit par les couleurs du cadre
            b.interactable = actionnable;
            b.onClick.AddListener(() => { if (surChoix != null) surChoix(mode); });
            boutons[mode.Id] = b;
            HorizontalLayoutGroup h = ligne.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(pxTrait(9f), pxTrait(9f), pxTrait(7f), pxTrait(7f));
            h.spacing = px(8f);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;

            GameObject n = Nouveau("N", ligne.transform);
            VerticalLayoutGroup vn = n.AddComponent<VerticalLayoutGroup>();
            vn.spacing = px(2f);
            vn.childControlWidth = true; vn.childControlHeight = true;
            vn.childForceExpandWidth = true; vn.childForceExpandHeight = false;
            LayoutElement ln = n.AddComponent<LayoutElement>();
            ln.flexibleWidth = 1f; ln.minWidth = 0f;

            Color encreDuNom = actionnable ? ChaineDApproScreenController.EncreNomMaillon : ChaineDApproScreenController.EncreFleche;
            TextMeshProUGUI nom = Texte(n.transform, "Nom", Libelle.Gabarit(mode.CleLibelle, mode.RepliLibelle), 9f, encreDuNom, true, true);
            nom.enableWordWrapping = true;
            // le sous-titre : la phrase SERVIE du cap quand le jeton est pris (jamais une phrase du client) ; à défaut de phrase servie, la description du mode
            string sous = null;
            if (jetonPris) sous = RefusServi.PhraseDeLaCle(ChaineDApproGestes.CleRefusDuCap);
            if (string.IsNullOrEmpty(sous)) sous = Libelle.Gabarit(mode.CleSousTitre, mode.RepliSousTitre);
            TextMeshProUGUI st = Texte(n.transform, "Sous", sous, 6.6f, ChaineDApproScreenController.EncreFleche, false);
            st.enableWordWrapping = true;
            if (mode.Structurel && ChaineDApproGestes.MarqueDuJeton)
            {
                // `.gr30-fmarque` : le mot du jeton de ④ (`accueil.jeton.votre_grande_decision_du_jour`, servi) — le même mot partout
                GameObject marque = Nouveau("Marque", n.transform);
                HorizontalLayoutGroup vm = marque.AddComponent<HorizontalLayoutGroup>();   // `display:inline-block;margin-top:4px` : la boîte prend la largeur de son mot
                vm.padding = new RectOffset(0, 0, pxTrait(4f), 0);
                vm.childAlignment = TextAnchor.UpperLeft;
                vm.childControlWidth = true; vm.childControlHeight = true;
                vm.childForceExpandWidth = false; vm.childForceExpandHeight = false;
                GameObject cadre = Nouveau("Cadre", marque.transform);
                Filets.Poser((RectTransform)cadre.transform, new SpecFilet(Cotes.Tous, 1f, StyleFilet.Plein, Teinte.Jeton("hudMoneyUnderlineGold", t => t.hudMoneyUnderlineGold), rayon: 2f));
                VerticalLayoutGroup vc = cadre.AddComponent<VerticalLayoutGroup>();
                vc.padding = new RectOffset(pxTrait(4f), pxTrait(4f), pxTrait(2f), pxTrait(2f));
                vc.childControlWidth = true; vc.childControlHeight = true;
                vc.childForceExpandWidth = false; vc.childForceExpandHeight = false;
                TextMeshProUGUI mot = Texte(cadre.transform, "Mot", Libelle.De("accueil", "jeton", "votre grande décision du jour"), 6.2f, DesignTokens.Current.hudMoneyUnderlineGold, true);
                mot.characterSpacing = 0.4f / 6.2f * 100f;   // `letter-spacing:.4px` sur 6,2 px
                mot.enableWordWrapping = false;
            }

            // le coût : le montant SERVI (`Argent`, le seul formateur d'argent du client) ; absent ⇒ « on ne sait pas encore combien » — jamais un montant du poseur
            string cout;
            if (string.IsNullOrEmpty(centimes)) cout = Libelle.Gabarit("appro.cout.on_ne_sait_pas_encore_combien", "on ne sait pas encore combien");
            else cout = Argent.DepuisCentimes(centimes, locale);
            Color encreDuCout = actionnable ? DesignTokens.Current.hudMoneyUnderlineGold : ChaineDApproScreenController.EncreFleche;
            TextMeshProUGUI c = Texte(ligne.transform, "Cout", cout, 8.4f, encreDuCout, true);
            c.enableWordWrapping = false;
            c.alignment = TextAlignmentOptions.Right;
            LayoutElement lc = c.gameObject.AddComponent<LayoutElement>();
            lc.flexibleWidth = 0f;
        }

        /// <summary>`.gr30-fann{margin-top:8px;padding:6px;border:1px solid #3a352c;border-radius:3px;text-align:center;font:700 8px;color:#9a8f78}` — « Annuler » (`game.ui_common.cancel_button`, servi).</summary>
        private void ConstruireAnnuler()
        {
            GameObject go = Nouveau("Annuler", panneau.transform);
            Image fond = AjouterImage(go);
            fond.color = Color.clear;   // un fond transparent qui reste une CIBLE de clic
            fond.raycastTarget = true;
            Filets.Poser((RectTransform)go.transform, new SpecFilet(Cotes.Tous, 1f, StyleFilet.Plein, Teinte.Hex("#3a352c"), rayon: 3f));
            Button b = go.AddComponent<Button>();
            b.targetGraphic = fond;
            b.transition = Selectable.Transition.None;
            b.onClick.AddListener(() => { if (surAnnuler != null) surAnnuler(); });
            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(pxTrait(6f), pxTrait(6f), pxTrait(6f), pxTrait(6f));
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            TextMeshProUGUI t = Texte(go.transform, "Libelle", Libelle.Gabarit("game.ui_common.cancel_button", "Annuler"), 8f, ChaineDApproScreenController.EncreSousTitreChaine, true);
            t.alignment = TextAlignmentOptions.Center;
        }

        // ── primitives (dupliquées par convention : aucun fichier du dépôt ne les partage, voir `ChaineDApproScreenController`) ──

        private static string LocaleDArgent()
        {
            if (I18nCatalog.Locale == "en") return "en";
            return "fr";   // catalogue vide ou « fr » : le français, la langue de la maquette
        }

        private static GameObject Nouveau(string nom, Transform parent)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        private static void HorsMiseEnPage(GameObject go) => go.AddComponent<LayoutElement>().ignoreLayout = true;

        private static void Etirer(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
        }

        /// <summary>⛔ TOUTE Image passe par ici : sans `CanvasRenderer`, un `Graphic` ne dessine RIEN, sans erreur (`AddComponent` n'honore pas `[RequireComponent]`).</summary>
        private static Image AjouterImage(GameObject go)
        {
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            return go.AddComponent<Image>();
        }

        private static Image AjouterFond(GameObject go, Color couleur)
        {
            Image img = AjouterImage(go);
            img.color = couleur;
            img.raycastTarget = false;
            return img;
        }

        /// <summary>Un blanc de `cssPx` entre deux pièces du panneau (les `margin-top` du CSS : la pile n'a qu'un seul espacement).</summary>
        private void Espace(float cssPx)
        {
            GameObject go = Nouveau("Espace", panneau.transform);
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.minHeight = px(cssPx); le.preferredHeight = px(cssPx); le.flexibleHeight = 0f;
        }

        private TextMeshProUGUI Texte(Transform parent, string nom, string texte, float corpsCss, Color couleur, bool gras, bool serif = false)
        {
            TextMeshProUGUI t = TexteSansTrace(parent, nom, texte, corpsCss, couleur, gras);
            if (serif) t.font = DesignTokens.Current.hudSerifFont;
            if (!string.IsNullOrEmpty(texte)) textes.Add(texte);
            return t;
        }

        private TextMeshProUGUI TexteSansTrace(Transform parent, string nom, string texte, float corpsCss, Color couleur, bool gras)
        {
            GameObject go = Nouveau(nom, parent);
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = DesignTokens.Current.primaryFont;
            t.text = texte;
            t.fontSize = px(corpsCss);   // un corps de texte à 0 est un défaut de rendu
            t.color = couleur;
            t.fontStyle = gras ? FontStyles.Bold : FontStyles.Normal;
            t.raycastTarget = false;
            return t;
        }
    }
}
