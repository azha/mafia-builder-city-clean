using System;
using System.Collections.Generic;
using System.Text;
using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
using MafiaCleanCity.Mouvements;

namespace MafiaCleanCity.Shell
{
    /// <summary>Le cas que `Retour.Decider` retient à un appui (design retour d'appui v5 §3.1). Il n'y a PAS de cinquième cas : un bouton
    /// dont rien ne peint est un ROUGE (`Aucun`), jamais une issue silencieuse (D3).</summary>
    public enum CasRetour
    {
        /// <summary>Rien ne franchit le plancher, ni la matière ni le voile : défaut d'écran, à lever en nommant une `surface` au site.</summary>
        Aucun = 0,
        /// <summary>La `surface` nommée au site de création rend : `retour.appui` (`Melange`) sur elle.</summary>
        Surface = 1,
        /// <summary>`targetGraphic` du bouton, à défaut le premier `Graphic` de son GameObject, rend : `retour.appui` sur lui.</summary>
        GraphicDuBouton = 2,
        /// <summary>Le GameObject du bouton peint (texte compris) : `retour.appui-voile` sur lui.</summary>
        VoileDuBouton = 3,
        /// <summary>Le parent direct du bouton peint, et son aire ≤ 2 × celle du bouton : `retour.appui-voile` sur lui.</summary>
        VoileDuParent = 4,
    }

    /// <summary>Le verdict de `Retour.Decider` : le cas, la matière du `Melange` (cas 1-2) ou la cible du voile (cas 3-4).</summary>
    public readonly struct DecisionRetour
    {
        public readonly CasRetour Cas;
        /// <summary>Le `Graphic` que `retour.appui` assombrit (cas 1-2) ; nul sinon.</summary>
        public readonly Graphic Melange;
        /// <summary>Le `RectTransform` qui porte le `CanvasGroup` du voile (cas 3-4) ; nul sinon.</summary>
        public readonly RectTransform CibleVoile;
        /// <summary>Marche 2 de la règle de classement (§3.1) : une matière `Melange` candidate existait, mais son effet est sous le plancher ;
        /// le bouton est passé sur le voile (cas 3-4) au lieu d'accepter un `Melange` que personne ne voit.</summary>
        public readonly bool SousPlancher;

        public DecisionRetour(CasRetour cas, Graphic melange, RectTransform cibleVoile, bool sousPlancher)
        {
            Cas = cas; Melange = melange; CibleVoile = cibleVoile; SousPlancher = sousPlancher;
        }
    }

    /// <summary>
    /// Design retour d'appui v5 (E-R4) — le GUICHET UNIQUE de création d'un `Button` du client (D1) et les prédicats qui décident de la cible
    /// de l'effet. Un bouton neuf passe par `NouveauBouton` ; le scan de source `ScanCreationsDeBouton` (GS1) rougit tout `Button` créé ailleurs.
    ///
    /// `RendSurface` / `Peint` sont du code NEUF (§3.2) : ce ne sont aucune des deux branches de `Gardes.FranchitLeSeuil`. Ils travaillent sur
    /// une arithmétique de `Color` (un MAJORANT : Unity compose en linéaire, la mesure de pixels de GP a raison et calibre le prédicat) ; leur
    /// plancher est UN critère à deux facteurs, le même pour le prédicat et pour la garde : magnitude ≥ `SeuilCouleurRendue` ET étendue ≥
    /// `PlancherPixels`. Les amplitudes (`× 0,85`, `1 → 0,80`) sont LUES dans le catalogue, jamais recopiées ici.
    /// </summary>
    public static class Retour
    {
        /// <summary>Étendue minimale d'un effet (pixels d'écran) : le plancher d'anti-vacuité du design §6.3. Une seule définition, pour le
        /// prédicat (aire du rect × `scaleFactor`²) ET pour la garde GE1/GE2 (compte réel de pixels).</summary>
        public const int PlancherPixels = 12;
        /// <summary>Cas 4 : le parent direct n'est retenu que si son aire ≤ ce rapport × celle du bouton (§3.1).</summary>
        public const float RapportAireVoileParent = 2f;

        // lues dans le catalogue au premier usage : la source de vérité des amplitudes reste `CatalogueHud`
        private static readonly CouleurSpec couleurAppui = Chercher(CatalogueHud.IdRetourAppui).Mouvement.CouleurB;
        private static readonly float attenuationVoile = AttenuationDuVoile(Chercher(CatalogueHud.IdRetourAppuiVoile));

        private static readonly List<Graphic> tampon = new List<Graphic>();

        private static Entree Chercher(string id)
        {
            IReadOnlyList<Entree> hud = CatalogueHud.Entrees;
            for (int i = 0; i < hud.Count; i++) if (hud[i].Id == id) return hud[i];
            throw new InvalidOperationException("Entree absente du catalogue : " + id);
        }

        /// <summary>1 − la plus basse valeur du canal `Alpha` du voile (1 → 0,80 ⇒ 0,20).</summary>
        private static float AttenuationDuVoile(Entree voile)
        {
            ImageCle[] cles = voile.Mouvement.Canaux[0].Cles;
            float mini = 1f;
            for (int k = 0; k < cles.Length; k++) mini = Mathf.Min(mini, cles[k].V);
            return 1f - mini;
        }

        // ------------------------------------------------------------------------------ le guichet
        /// <summary>Crée le `Button` de `hote` ET y pose le composant `RetourAppui` (§3.4). `surface` : la matière que le `Melange` assombrit
        /// quand le `targetGraphic` du bouton ne peint pas ; elle vit DANS le sous-arbre de `hote` (sinon la bascule du cas 0 poserait le voile
        /// sur un sous-arbre qui ne peint rien) — une surface hors sous-arbre est un ROUGE (`LogError`) et n'est pas retenue.
        /// `membre` et `ligne` sont posés par le COMPILATEUR (nom du membre appelant, numéro de ligne : deux constantes, aucun chemin de fichier
        /// ni de machine dans le binaire livré) et mémorisés dans `RetourAppui` : la garde de population (GP) en tire le SITE qui a créé le bouton.</summary>
        public static Button NouveauBouton(GameObject hote, Graphic surface = null,
            [CallerMemberName] string membre = "", [CallerLineNumber] int ligne = 0)
        {
            if (hote == null) throw new ArgumentNullException(nameof(hote));
            if (surface != null && !surface.transform.IsChildOf(hote.transform))
            {
                Debug.LogError("[Retour] surface hors du sous-arbre du bouton (" + hote.name + " / " + surface.name + ") : non retenue");
                surface = null;
            }
            Button b = hote.AddComponent<Button>();
            b.transition = Selectable.Transition.None;   // le retour d'appui EST le retour : jamais la teinte `ColorTint` d'Unity en plus (design §1.6 ; revue ⊥ du lot, 11/11)
            RetourAppui ra = hote.GetComponent<RetourAppui>();
            if (ra == null) ra = hote.AddComponent<RetourAppui>();
            ra.Init(b, surface, membre, ligne);
            return b;
        }

        // ------------------------------------------------------------------------------ les prédicats (§3.2)
        /// <summary>`g` est un `Graphic` non texte, actif, hors `Mask` invisible, et l'écart RENDU de `Cible` à `Cible × k` (plus grand canal
        /// RGB × `color.a` × alpha cumulé des `CanvasGroup` de `g` et de ses ancêtres) franchit le plancher (magnitude ET étendue).</summary>
        public static bool RendSurface(Graphic g)
        {
            if (g == null || EstTexte(g) || !g.enabled || !g.gameObject.activeInHierarchy || MasqueInvisible(g)) return false;
            Color c = g.color;
            float ecart = Couleurs.EcartRvb(c, couleurAppui.Resoudre(c)) * c.a * AlphaCumule(g.transform);
            return ecart >= MouvementTunables.SeuilCouleurRendue && AirePixels(g.rectTransform) >= PlancherPixels;
        }

        /// <summary>La sous-arborescence de `t` (lui compris) porte au moins un `Graphic` — texte compris, non vide — actif, hors `Mask`
        /// invisible, dont l'écart rendu du voile (atténuation × plus grand canal RGB × `color.a` × alphas cumulés) franchit la magnitude,
        /// et l'aire du rect de `t` franchit l'étendue.</summary>
        public static bool Peint(Transform t)
        {
            if (t == null) return false;
            bool encre = false;
            t.GetComponentsInChildren(false, tampon);
            for (int i = 0; i < tampon.Count && !encre; i++)
            {
                Graphic g = tampon[i];
                if (g == null || !g.enabled || !g.gameObject.activeInHierarchy) continue;
                if (EstTexte(g) && TexteVide(g)) continue;
                if (MasqueInvisible(g)) continue;
                Color c = g.color;
                float ecart = attenuationVoile * Mathf.Max(c.r, Mathf.Max(c.g, c.b)) * c.a * AlphaCumule(g.transform);
                if (ecart >= MouvementTunables.SeuilCouleurRendue) encre = true;
            }
            tampon.Clear();
            RectTransform rt = t as RectTransform;
            return encre && (rt == null || AirePixels(rt) >= PlancherPixels);
        }

        private static bool EstTexte(Graphic g) { return g is TMP_Text || g is Text; }

        private static bool TexteVide(Graphic g)
        {
            if (g is TMP_Text tmp) return string.IsNullOrWhiteSpace(tmp.text);
            if (g is Text txt) return string.IsNullOrWhiteSpace(txt.text);
            return false;
        }

        private static bool MasqueInvisible(Graphic g)
        {
            return g.TryGetComponent(out Mask m) && m.enabled && !m.showMaskGraphic;
        }

        /// <summary>Produit des `CanvasGroup.alpha` de `t` et de ses ancêtres, en s'arrêtant au groupe qui pose `ignoreParentGroups`.</summary>
        private static float AlphaCumule(Transform t)
        {
            float a = 1f;
            for (Transform x = t; x != null; x = x.parent)
            {
                if (!x.TryGetComponent(out CanvasGroup cg)) continue;
                a *= cg.alpha;
                if (cg.ignoreParentGroups) break;
            }
            return a;
        }

        /// <summary>L'aire du rect en pixels d'écran (`scaleFactor` du `Canvas` racine) : un calcul de rect, pas un rendu. MAJORANT (un rect
        /// de 400 px peut ne porter que 6 px d'encre).</summary>
        private static float AirePixels(RectTransform r)
        {
            Canvas cv = r.GetComponentInParent<Canvas>();
            float s = cv != null ? cv.rootCanvas.scaleFactor : 1f;
            Rect rc = r.rect;
            return rc.width * s * rc.height * s;
        }

        private static float Aire(RectTransform r) { Rect rc = r.rect; return rc.width * rc.height; }

        // ------------------------------------------------------------------------------ la décision (§3.1)
        /// <summary>Les cas 1 → 4 dans l'ordre, jugés MAINTENANT (l'état qui décide est mutable : jamais figé à la pose). Marche 1 : le cas
        /// 1-2 n'est retenu que si son effet franchit le plancher ; marche 2 : sinon le voile (3 puis 4) ; marche 3 : si le voile non plus,
        /// `Aucun` (rouge). Le plancher et les amplitudes ne baissent jamais.</summary>
        public static DecisionRetour Decider(Button b, Graphic surface)
        {
            if (b == null) throw new ArgumentNullException(nameof(b));
            if (RendSurface(surface)) return new DecisionRetour(CasRetour.Surface, surface, null, false);

            Graphic g = b.targetGraphic != null ? b.targetGraphic : b.GetComponent<Graphic>();
            if (g != null && !ReferenceEquals(g, surface) && RendSurface(g)) return new DecisionRetour(CasRetour.GraphicDuBouton, g, null, false);

            // une matière `Melange` candidate (non texte) a été écartée par le plancher ⇒ bascule comptée côté appelant
            bool sousPlancher = (surface != null && !EstTexte(surface)) || (g != null && !EstTexte(g));

            RectTransform rb = b.transform as RectTransform;
            if (rb == null) return new DecisionRetour(CasRetour.Aucun, null, null, sousPlancher);
            if (Peint(rb)) return new DecisionRetour(CasRetour.VoileDuBouton, null, rb, sousPlancher);

            RectTransform q = b.transform.parent as RectTransform;
            if (q != null && Peint(q) && Aire(q) <= RapportAireVoileParent * Aire(rb))
                return new DecisionRetour(CasRetour.VoileDuParent, null, q, sousPlancher);
            return new DecisionRetour(CasRetour.Aucun, null, null, sousPlancher);
        }

        // ------------------------------------------------------------------------------ GS1 : le scan de source (fonction PURE)
        private static readonly Regex MotifBouton = new Regex(
            @"AddComponent\s*<\s*(?:UnityEngine\s*\.\s*UI\s*\.\s*)?Button\s*>", RegexOptions.CultureInvariant);

        /// <summary>GS1 (design §4) — les créations de `Button` d'un fichier source, hors `Retour.cs` : fonction PURE de (chemin, contenu), donc
        /// contrôlable par un contenu synthétique. Commentaires et littéraux de chaîne sont ignorés (ils ne créent rien) ; les numéros de
        /// ligne sont ceux du fichier. Une ligne par occurrence : `GS1 : <chemin>:<ligne> crée un Button hors Retour.NouveauBouton`.</summary>
        public static List<string> ScanCreationsDeBouton(string chemin, string contenu)
        {
            var res = new List<string>();
            if (string.IsNullOrEmpty(contenu)) return res;
            string p = (chemin ?? string.Empty).Replace('\\', '/');
            if (p.EndsWith("ShellContracts/Retour.cs", StringComparison.Ordinal)) return res;
            string nu = SansCommentairesNiChaines(contenu);
            foreach (Match m in MotifBouton.Matches(nu))
            {
                int ligne = 1;
                for (int i = 0; i < m.Index; i++) if (nu[i] == '\n') ligne++;
                res.Add("GS1 : " + chemin + ":" + ligne + " crée un Button hors Retour.NouveauBouton");
            }
            return res;
        }

        // ------------------------------------------------------------------------------ l'inventaire des SITES (GP, couverture)
        /// <summary>Un appel à `Retour.NouveauBouton` relevé dans une source : sa ligne (celle du jeton `NouveauBouton`, comme le compilateur la
        /// numérote) et le membre qui le porte (déclaration la plus proche au-dessus).</summary>
        public readonly struct SiteBouton
        {
            public readonly int Ligne;
            public readonly string Membre;
            public SiteBouton(int ligne, string membre) { Ligne = ligne; Membre = membre; }
        }

        private static readonly Regex MotifSite = new Regex(@"\bRetour\s*\.\s*(NouveauBouton)\s*\(", RegexOptions.CultureInvariant);
        // une déclaration de membre : [modificateurs] type nom( … sans `=`, sans `.` avant le nom, ne finissant pas par `;`
        // ⛔ `\s+` ENTRE les mots du type, jamais `\s*` : avec `(?:\s*[\w…]+)*` une ligne de mots sans `(` se découpe de 2^n façons (retour
        // arrière catastrophique : l'éditeur gèle, run 5 du 11/11, GP_BuildingCard puis GP_CityMap_Carte). Le délai fait LEVER, jamais geler.
        private static readonly Regex MotifMembre = new Regex(
            @"^\s*(?:(?:public|private|internal|protected|static|override|virtual|sealed|async|unsafe|new|extern|abstract)\s+)*[\w<>\[\],?]+(?:\s+[\w<>\[\],?]+)*\s+(\w+)\s*\(",
            RegexOptions.CultureInvariant, TimeSpan.FromSeconds(5));
        private static readonly string[] MotsDeControle = { "if", "for", "foreach", "while", "switch", "return", "using", "lock", "catch", "else", "new", "await", "throw", "yield", "fixed" };

        /// <summary>Les appels à `Retour.NouveauBouton` d'un fichier source : fonction PURE du contenu (commentaires et littéraux ignorés). Sert à
        /// résoudre (membre, ligne) posés par le compilateur vers un site de source, sans aucun chemin de fichier dans le binaire.</summary>
        public static List<SiteBouton> ScanSitesDeNouveauBouton(string contenu)
        {
            var res = new List<SiteBouton>();
            if (string.IsNullOrEmpty(contenu)) return res;
            string nu = SansCommentairesNiChaines(contenu);
            string[] lignes = nu.Split('\n');
            foreach (Match m in MotifSite.Matches(nu))
            {
                Group g = m.Groups[1];
                int ligne = 1;
                for (int i = 0; i < g.Index; i++) if (nu[i] == '\n') ligne++;
                string membre = "";
                for (int k = ligne - 1; k >= 0 && membre.Length == 0; k--)
                {
                    string l = lignes[k];
                    if (l.TrimEnd().EndsWith(";", StringComparison.Ordinal) || l.IndexOf('=') >= 0 && l.IndexOf('=') < l.IndexOf('(')) continue;
                    string premier = l.TrimStart();
                    // une ligne de CONTINUATION (`? a(x)` / `: b(y)` d'un ternaire) n'est jamais une déclaration : `?` est dans la classe des types, donc
                    // `? TexteDuCuisinierAuRepos(row)` se lisait « type ? nom( » et volait le membre de LieutenantScreenController:2847 (GP, 11/11)
                    if (premier.StartsWith("?", StringComparison.Ordinal) || premier.StartsWith(":", StringComparison.Ordinal)) continue;
                    Match d = MotifMembre.Match(l);
                    if (!d.Success) continue;
                    bool controle = false;
                    for (int c = 0; c < MotsDeControle.Length && !controle; c++)
                        controle = premier.StartsWith(MotsDeControle[c] + " ", StringComparison.Ordinal) || premier.StartsWith(MotsDeControle[c] + "(", StringComparison.Ordinal);
                    if (!controle && l.Substring(0, d.Groups[1].Index).IndexOf('.') < 0) membre = d.Groups[1].Value;
                }
                res.Add(new SiteBouton(ligne, membre));
            }
            return res;
        }

        /// <summary>Le texte avec commentaires (`//`, `/* */`) et littéraux (`"…"`, `@"…"`, `'x'`) blanchis ; les sauts de ligne sont gardés.</summary>
        private static string SansCommentairesNiChaines(string s)
        {
            var sb = new StringBuilder(s.Length);
            int n = s.Length, i = 0;
            while (i < n)
            {
                char c = s[i];
                char d = i + 1 < n ? s[i + 1] : '\0';
                if (c == '/' && d == '/')
                {
                    while (i < n && s[i] != '\n') { sb.Append(' '); i++; }
                }
                else if (c == '/' && d == '*')
                {
                    sb.Append("  "); i += 2;
                    while (i < n && !(s[i] == '*' && i + 1 < n && s[i + 1] == '/')) { sb.Append(s[i] == '\n' ? '\n' : ' '); i++; }
                    if (i < n) { sb.Append("  "); i += 2; }
                }
                else if (c == '"')
                {
                    bool verbatim = i > 0 && (s[i - 1] == '@' || (s[i - 1] == '$' && i > 1 && s[i - 2] == '@'));
                    sb.Append(' '); i++;
                    while (i < n)
                    {
                        if (verbatim)
                        {
                            if (s[i] == '"' && i + 1 < n && s[i + 1] == '"') { sb.Append("  "); i += 2; continue; }
                            if (s[i] == '"') { sb.Append(' '); i++; break; }
                        }
                        else
                        {
                            if (s[i] == '\\' && i + 1 < n) { sb.Append(' '); sb.Append(s[i + 1] == '\n' ? '\n' : ' '); i += 2; continue; }
                            if (s[i] == '"') { sb.Append(' '); i++; break; }
                            if (s[i] == '\n') break;   // littéral non terminé : on ne mange pas le reste du fichier
                        }
                        sb.Append(s[i] == '\n' ? '\n' : ' '); i++;
                    }
                }
                else if (c == '\'' && d == '\\')
                {
                    sb.Append("  "); i += 2;
                    while (i < n && s[i] != '\'' && s[i] != '\n') { sb.Append(' '); i++; }
                    if (i < n && s[i] == '\'') { sb.Append(' '); i++; }
                }
                else if (c == '\'' && i + 2 < n && s[i + 2] == '\'')
                {
                    sb.Append("   "); i += 3;
                }
                else
                {
                    sb.Append(c); i++;
                }
            }
            return sb.ToString();
        }
    }

    /// <summary>
    /// Design retour d'appui v5 §3.4 — le composant que `Retour.NouveauBouton` pose à côté du `Button` (D1 : co-localisé, comme
    /// `LongPressButton`). AUCUN `Update` / `LateUpdate` (G10, liste fermée) : tout se passe aux événements. À CHAQUE `PointerDown` il
    /// décide le cas (`Retour.Decider`) et attache par la régie (`AttacherRetourAppui` pour les cas 1-2, `AttacherVoileDAppui` pour les cas
    /// 3-4) ; au `PointerUp` / `PointerExit` / `OnDisable` il `Detacher` — la restitution est immédiate (D2). Un doigt, un handle : le handle
    /// précédent est détaché avant d'en attacher un autre.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class RetourAppui : MonoBehaviour, IPointerDownHandler, IPointerUpHandler, IPointerExitHandler
    {
        private Button bouton;
        private Graphic surface;
        private Handle handle = Handle.Nul;
        private Regie regieDuHandle;

        /// <summary>La matière nommée au site de création (dans le sous-arbre du bouton), ou nul.</summary>
        public Graphic Surface => surface;
        /// <summary>Le handle tenu pendant l'appui ; nul au repos, ou si la régie a refusé.</summary>
        public Handle Handle => handle;
        /// <summary>Le cas retenu au DERNIER appui (`Aucun` : rouge, ou bouton non pressable, ou pas de régie).</summary>
        public CasRetour Cas { get; private set; }
        /// <summary>Marche 2 au dernier appui : le `Melange` candidat était sous le plancher, le voile a pris le relais.</summary>
        public bool BasculeSousPlancher { get; private set; }
        /// <summary>Cas 0 au dernier appui : plafond `Melange` plein, la régie a basculé l'appui sur le voile (compté par `Regie.BasculesVoile`).</summary>
        public bool BasculeAuPlafond { get; private set; }

        /// <summary>Le membre qui a créé ce bouton, tel que le compilateur l'a posé (« BuildFiche »).</summary>
        public string SiteMembre { get; private set; } = "";
        /// <summary>La ligne de l'appel à `Retour.NouveauBouton`, posée par le compilateur ; 0 si inconnue.</summary>
        public int SiteLigne { get; private set; }

        /// <summary>Posé par `Retour.NouveauBouton` seulement.</summary>
        public void Init(Button b, Graphic surfaceNommee, string membre = "", int ligne = 0)
        {
            bouton = b; surface = surfaceNommee;
            SiteMembre = membre ?? ""; SiteLigne = ligne;
        }

        public void OnPointerDown(PointerEventData eventData)
        {
            Lacher();
            Cas = CasRetour.Aucun; BasculeSousPlancher = false; BasculeAuPlafond = false;
            if (eventData != null && eventData.button != PointerEventData.InputButton.Left) return;   // comme `Button`
            Button b = bouton != null ? bouton : GetComponent<Button>();
            if (b == null || !b.IsInteractable()) return;                                              // non pressable : jamais jugé
            Regie regie = RegieMouvement.Courante;
            if (regie == null) return;                                                                 // hôte nu : pas de régie, pas de retour

            DecisionRetour d = Retour.Decider(b, surface);
            Cas = d.Cas;
            BasculeSousPlancher = d.SousPlancher && d.Cas != CasRetour.Surface && d.Cas != CasRetour.GraphicDuBouton;
            switch (d.Cas)
            {
                case CasRetour.Surface:
                case CasRetour.GraphicDuBouton:
                {
                    int avant = regie.BasculesVoile;
                    handle = regie.AttacherRetourAppui(d.Melange.rectTransform, (RectTransform)b.transform);
                    BasculeAuPlafond = regie.BasculesVoile > avant;
                    break;
                }
                case CasRetour.VoileDuBouton:
                case CasRetour.VoileDuParent:
                    handle = regie.AttacherVoileDAppui(d.CibleVoile);
                    break;
                default:
                    // D3 : le cas 5 n'est plus une issue, c'est un ROUGE ; la garde de population (GP) le relève, ceci le rend audible
                    Debug.LogWarning("[Retour] aucun retour d'appui possible sur " + b.name + " : nommer une surface au site de création");
                    return;
            }
            if (!handle.EstNul) regieDuHandle = regie;
        }

        public void OnPointerUp(PointerEventData eventData) { Lacher(); }

        public void OnPointerExit(PointerEventData eventData) { Lacher(); }

        private void OnDisable() { Lacher(); }

        /// <summary>Détache le handle tenu (restitution immédiate, D2) auprès de la régie qui l'a rendu, jamais de la courante (un handle
        /// périmé d'une autre régie pourrait en détacher une piste).</summary>
        private void Lacher()
        {
            if (!handle.EstNul && regieDuHandle != null) regieDuHandle.Detacher(handle);
            handle = Handle.Nul;
            regieDuHandle = null;
        }
    }
}
