using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Mouvements;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.Tests
{
    /// <summary>Une ligne du relevé de population (design retour d'appui v5 §4, GP) : UN bouton monté, UN relevé, UN verdict.</summary>
    public struct LigneGp
    {
        public string Ecran, Etat, Chemin;
        /// <summary>Actif dans la hiérarchie ET `interactable` : seul un bouton pressable est appuyé et jugé sur l'effet. Un non-pressable est
        /// relevé et compté ; ses champs de mesure restent à leur valeur « non mesuré ».</summary>
        public bool Pressable;
        /// <summary>Le cas retenu par le dernier appui (`RetourAppui.Cas`) ; sans `RetourAppui`, celui que `Retour.Decider` dit.</summary>
        public CasRetour Cas;
        /// <summary>La cible de la piste créée (le `Graphic` du `Melange`, le GameObject du `CanvasGroup` du voile) ; sans piste, celle que
        /// `Retour.Decider` désignait, ou « aucune ».</summary>
        public string NomCible;
        /// <summary>L'`Id` de la piste créée (`retour.appui` / `retour.appui-voile`) ; nul si aucune, `a+b` si deux.</summary>
        public string Id;
        public bool HandleNul;
        /// <summary>Pixels de la cible qui diffèrent de ≥ 3/255 entre le repos et le doigt, pixels instables exclus ; -1 si non mesuré.</summary>
        public int Pixels;
        public bool BasculeSousPlancher, BasculeAuPlafond;
        /// <summary>Le prédicat a dit cas 1-2 (un `Melange` tenu), les pixels disent non : la dette chiffrée de §3.1, 0 attendu au gate.</summary>
        public bool EcartPredicatPixels;
        /// <summary>Nul = vert ; sinon le message du tableau §4.</summary>
        public string Verdict;
        /// <summary>Le site qui a créé ce bouton, posé par le compilateur (`RetourAppui.SiteMembre` / `SiteLigne`) ; ligne 0 = inconnu (bouton sans
        /// `RetourAppui`). Un site n'est « couvert » que par un bouton PRESSABLE jugé : un site non exercé n'est pas prouvé.</summary>
        public string SiteMembre;
        public int SiteLigne;
        /// <summary>Le `Graphic` étranger (raycastTarget, dessiné AU-DESSUS) qui recouvre le CENTRE du bouton ; nul = atteignable. Un bouton actif que
        /// personne ne peut toucher est un défaut (ruling f2 11/11) : rouge, jamais neutre.</summary>
        public string Recouvert;
    }

    /// <summary>
    /// Design retour d'appui v5 §4 — GP, le RELEVÉ de population. Pour chaque `Button` d'un écran monté : un `PointerDown` simulé, la piste que
    /// la régie vient de créer, puis le COMPTE DE PIXELS de la cible de cette piste (`RetourReleveHelper`). Un seul relevé, un seul verdict par
    /// bouton : 0 attachement, 2 attachements, handle nul, effet sous le plancher, cible hors cadre — tous rouges, avec le chemin.
    /// Le relevé ne pose AUCUN composant et ne répare rien : il observe la population dans l'état où la production la laisse.
    ///
    /// Les pixels INSTABLES (un pixel qui bouge entre deux photos de repos du même état : animation ambiante) ne comptent pas comme effet
    /// (« prouver la stabilité d'abord »). Les photos de repos sont prises UNE fois par état tant que la régie est vierge à l'entrée ; si des
    /// pistes y vivent déjà (ambiance de l'écran), chaque bouton reprend son repos et son témoin de stabilité, car ces pistes avancent avec
    /// les `Tick` du relevé.
    ///
    /// L'horloge du relevé (`horloge`) est PROPRE à cette classe, strictement croissante ; ne pas la mêler à `RetourReleveHelper.MesurerAppui`
    /// sur la même régie (deux horloges se croiseraient, la régie ne vieillit pas une piste quand le temps recule).
    /// </summary>
    public static class RetourGpReleve
    {
        private static readonly float Pas = RetourReleveHelper.DureeAppuiS;
        private static float horloge;

        /// <summary>Un `Tick` d'une durée d'appui : deux d'affilée font vieillir une piste neuve de cette durée (le premier l'évalue à 0).</summary>
        private static void Avancer(Regie regie)
        {
            horloge += Pas;
            regie.Tick(horloge);
        }

        private struct PisteVue
        {
            public bool Vivante;
            public Entree Entree;
            public RectTransform Cible;
        }

        private struct Repos
        {
            public Color32[] Photo;
            public bool[] Instable;
        }

        // ------------------------------------------------------------------------------ le relevé
        /// <summary>Relève chaque `Button` de `racine` (inactifs compris). `regie` doit être la régie courante (`RegieMouvement.PourTest()`),
        /// celle que `RetourAppui` consulte. Les photos sont `largeur` × `hauteur` : les vrais écrans se rendent à 1080 × 1920.</summary>
        public static List<LigneGp> Relever(string ecran, string etat, GameObject racine, Canvas canvas, Regie regie, int largeur, int hauteur)
        {
            if (racine == null) throw new System.ArgumentNullException(nameof(racine));
            if (canvas == null) throw new System.ArgumentNullException(nameof(canvas));
            if (regie == null) throw new System.ArgumentNullException(nameof(regie));
            if (!ReferenceEquals(regie, RegieMouvement.Courante))
                throw new System.InvalidOperationException("la régie du relevé n'est pas la régie courante : RetourAppui ne la consulterait pas");

            var lignes = new List<LigneGp>();
            int pistesAEntree = regie.PistesVivantes;
            bool ambiance = pistesAEntree > 0;
            bool reposPris = false;
            Repos repos = default;

            foreach (Button b in racine.GetComponentsInChildren<Button>(true))
            {
                string chemin = RetourReleveHelper.Chemin(b.transform);
                string statique = GardesStatiquesGp.Statique(ecran, chemin, b);   // la configuration du bouton : jugée pressable ou non
                if (!(b.gameObject.activeInHierarchy && b.IsInteractable()))
                {
                    RetourAppui inerte = b.GetComponent<RetourAppui>();
                    lignes.Add(new LigneGp { Ecran = ecran, Etat = etat, Chemin = chemin, Pressable = false, Cas = CasRetour.Aucun,
                                             NomCible = "", Id = null, Pixels = -1, Verdict = statique,
                                             SiteMembre = inerte != null ? inerte.SiteMembre : "", SiteLigne = inerte != null ? inerte.SiteLigne : 0 });
                    continue;
                }
                // la feuille qui défile : le joueur ferait défiler jusqu'au bouton (ruling f2 11/11) ; le défilement change l'image, le repos partagé
                // n'est plus celui de l'état où l'on appuie. Un bouton déjà entièrement visible ne déclenche rien.
                if (RetourReleveHelper.AmenerDansLeCadre(b, canvas, largeur, hauteur)) reposPris = false;
                if (ambiance || !reposPris)
                {
                    repos = PhotographierRepos(canvas, largeur, hauteur, regie);
                    reposPris = true;
                }
                LigneGp lg = Appuyer(ecran, etat, chemin, b, canvas, regie, largeur, hauteur, repos);
                string couvreur = RetourReleveHelper.DansLeCadre(canvas, largeur, hauteur, () => Atteignabilite.QuiRecouvreLeCentre(b));   // la géométrie de la PHOTO, pas celle de l'écran du banc
                if (couvreur != null)
                {
                    lg.Recouvert = couvreur;
                    lg.Verdict = "GP-RECOUVERT : " + ecran + "/" + chemin + " — le centre du bouton est recouvert par « " + couvreur
                                 + " » (raycastTarget, dessiné au-dessus) : un bouton actif que personne ne peut toucher ni voir";
                }
                if (statique != null) lg.Verdict = lg.Verdict == null ? statique : lg.Verdict + " | " + statique;
                lignes.Add(lg);
                if (regie.PistesVivantes != pistesAEntree) ambiance = true;   // le bouton a laissé la régie autrement : le repos partagé n'est plus sûr
            }
            return lignes;
        }

        /// <summary>Deux photos de repos du même état, séparées de deux `Tick` (la durée du relevé d'un appui) : la seconde est LE repos, les
        /// pixels qui diffèrent d'une photo à l'autre sont l'instabilité de l'écran.</summary>
        private static Repos PhotographierRepos(Canvas canvas, int largeur, int hauteur, Regie regie)
        {
            Color32[] a = RetourReleveHelper.Photographier(canvas, largeur, hauteur);
            Avancer(regie);
            Avancer(regie);
            Color32[] b = RetourReleveHelper.Photographier(canvas, largeur, hauteur);
            var instable = new bool[b.Length];
            for (int i = 0; i < b.Length; i++) instable[i] = EcartMax(a[i], b[i]) >= RetourReleveHelper.SeuilOctets;
            return new Repos { Photo = b, Instable = instable };
        }

        private static int EcartMax(Color32 p, Color32 q)
        {
            return Mathf.Max(Mathf.Abs(p.r - q.r), Mathf.Max(Mathf.Abs(p.g - q.g), Mathf.Abs(p.b - q.b)));
        }

        private static PisteVue[] Instantane(Regie regie)
        {
            var vue = new PisteVue[MouvementTunables.PistesMax];
            for (int r = 0; r < vue.Length; r++)
            {
                vue[r].Vivante = regie.Inspecter(r, out Entree e, out RectTransform c);
                vue[r].Entree = e;
                vue[r].Cible = c;
            }
            return vue;
        }

        private static bool EstUnePisteDAppui(Entree e)
        {
            return e != null && (e.Id == CatalogueHud.IdRetourAppui || e.Id == CatalogueHud.IdRetourAppuiVoile);
        }

        private static string NomDeLaDecision(DecisionRetour d)
        {
            if (d.Melange != null) return d.Melange.name;
            if (d.CibleVoile != null) return d.CibleVoile.name;
            return "aucune";
        }

        /// <summary>L'appui d'UN bouton pressable : repos → PointerDown → pistes neuves → Tick → photo → mesure → relâchement. Un verdict.</summary>
        private static LigneGp Appuyer(string ecran, string etat, string chemin, Button b, Canvas canvas, Regie regie,
            int largeur, int hauteur, Repos repos)
        {
            RetourAppui ra = b.GetComponent<RetourAppui>();
            DecisionRetour decision = Retour.Decider(b, ra != null ? ra.Surface : null);   // lecture seule : ne sert qu'à nommer ce qui manque

            PisteVue[] avant = Instantane(regie);
            RetourReleveHelper.Appuyer(b.gameObject);
            PisteVue[] apres = Instantane(regie);
            Handle handle = ra != null ? ra.Handle : Handle.Nul;

            // les pistes NEUVES : un rang vivant qui ne l'était pas, ou dont l'entrée / la cible a changé
            var neuves = new List<int>();
            var appui = new List<int>();
            for (int r = 0; r < apres.Length; r++)
            {
                if (!apres[r].Vivante) continue;
                if (avant[r].Vivante && ReferenceEquals(avant[r].Entree, apres[r].Entree) && avant[r].Cible == apres[r].Cible) continue;
                neuves.Add(r);
                if (EstUnePisteDAppui(apres[r].Entree)) appui.Add(r);
            }

            var ligne = new LigneGp
            {
                Ecran = ecran, Etat = etat, Chemin = chemin, Pressable = true,
                Cas = ra != null ? ra.Cas : decision.Cas,
                NomCible = NomDeLaDecision(decision),
                HandleNul = handle.EstNul,
                Pixels = -1,
                BasculeSousPlancher = ra != null && ra.BasculeSousPlancher,
                BasculeAuPlafond = ra != null && ra.BasculeAuPlafond,
                SiteMembre = ra != null ? ra.SiteMembre : "", SiteLigne = ra != null ? ra.SiteLigne : 0,
            };

            // pour le journal du détail des rouges : la cible (celle de la piste créée, à défaut celle que `Decider` désignait) et la zone mesurée
            Transform cibleVue = decision.Melange != null ? decision.Melange.transform : (decision.CibleVoile != null ? (Transform)decision.CibleVoile : null);
            RectInt zoneVue = default;
            bool zoneMesuree = false;

            if (appui.Count == 1)
            {
                Entree entree = apres[appui[0]].Entree;
                RectTransform cible = apres[appui[0]].Cible;
                ligne.Id = entree.Id;
                ligne.NomCible = cible != null ? cible.name : "<détruite>";
                Avancer(regie);
                Avancer(regie);
                Color32[] sousLeDoigt = RetourReleveHelper.Photographier(canvas, largeur, hauteur);
                RectInt zone = cible != null ? RetourReleveHelper.RectPixels(cible, canvas, largeur, hauteur) : default;
                if (cible != null) cibleVue = cible;
                zoneVue = zone;
                zoneMesuree = true;
                if (cible == null || zone.width <= 0 || zone.height <= 0)
                {
                    ligne.Pixels = 0;
                    ligne.Verdict = JugerHorsCadre(ecran, chemin, ligne.NomCible, zone);
                }
                else
                {
                    ligne.Pixels = CompterEffet(repos.Photo, sousLeDoigt, repos.Instable, largeur, zone);
                    ligne.Verdict = ligne.HandleNul ? JugerHandleNul(ecran, chemin, ligne.Id) : JugerEffet(ecran, chemin, ligne.Id, ligne.Pixels);
                }
                ligne.EcartPredicatPixels = (ligne.Cas == CasRetour.Surface || ligne.Cas == CasRetour.GraphicDuBouton)
                                            && !ligne.BasculeAuPlafond && !ligne.HandleNul && ligne.Pixels < Retour.PlancherPixels;
            }
            else
            {
                Avancer(regie);
                Avancer(regie);
                if (appui.Count == 0)
                {
                    ligne.Verdict = JugerZeroAttachement(ecran, chemin, ligne.Cas, ligne.NomCible);
                }
                else
                {
                    var ids = new StringBuilder();
                    for (int k = 0; k < appui.Count; k++) ids.Append(k > 0 ? "+" : "").Append(apres[appui[k]].Entree.Id);
                    ligne.Id = ids.ToString();
                    ligne.Verdict = JugerDeuxAttachements(ecran, chemin, appui.Count, ligne.Id);
                }
            }

            // le détail d'un rouge, pris SOUS LE DOIGT (couleurs écrites par la piste comprises) : aucun changement de comportement
            if (ligne.Verdict != null) JournaliserDetail(ligne, b, cibleVue, zoneMesuree, zoneVue);

            // Detacher (Relacher) + Tick APRÈS chaque bouton : sans quoi les premiers cas 1-2 remplissent le plafond `Melange` (design §4)
            RetourReleveHelper.Relacher(b.gameObject);
            if (!handle.EstNul) regie.Detacher(handle);
            for (int k = 0; k < neuves.Count; k++)
            {
                // une piste neuve encore vivante n'avait pas de handle tenu par le bouton (2 attachements, piste étrangère) : on la libère
                if (regie.Inspecter(neuves[k], out Entree e, out RectTransform c) && ReferenceEquals(e, apres[neuves[k]].Entree) && c == apres[neuves[k]].Cible)
                    regie.DetacherSous(c);
            }
            Avancer(regie);
            return ligne;
        }

        // ------------------------------------------------------------------------------ le détail d'un rouge
        private const int DetailGraphicsMax = 30;

        /// <summary>Produit des `CanvasGroup.alpha` de `t` et de ses ancêtres, en s'arrêtant au groupe qui pose `ignoreParentGroups` (le même calcul
        /// que `Retour.AlphaCumule`, privé : recalculé ici, jamais appelé).</summary>
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

        /// <summary>`[GP-DETAIL]` : une ligne pour un rouge — le cas, la cible, les pixels, la zone, et chaque `Graphic` du bouton puis de la cible
        /// (nom, type, couleur, activé, taille du rect, alpha cumulé des groupes, `RendSurface`). Un `Graphic` déjà listé n'est pas répété.</summary>
        private static void JournaliserDetail(LigneGp ligne, Button b, Transform cible, bool zoneMesuree, RectInt zone)
        {
            var sb = new StringBuilder();
            sb.Append("[GP-DETAIL] ").Append(ligne.Chemin).Append(" cas=").Append((int)ligne.Cas).Append('(').Append(ligne.Cas).Append(") cible=")
              .Append(ligne.NomCible).Append(" id=").Append(ligne.Id ?? "-").Append(" handleNul=").Append(ligne.HandleNul)
              .Append(" pixels=").Append(ligne.Pixels)
              .Append(" zone=").Append(zoneMesuree ? zone.width + "x" + zone.height + "@" + zone.x + "," + zone.y : "non mesurée")
              .Append(" peint(bouton)=").Append(Retour.Peint(b.transform))
              .Append(" peint(cible)=").Append(cible != null ? Retour.Peint(cible).ToString() : "-");
            var vus = new List<Graphic>();
            AjouterGraphics(sb, " | bouton", b.transform, vus);
            if (cible != null) AjouterGraphics(sb, " | cible", cible, vus);
            Debug.Log(sb.ToString());
        }

        private static void AjouterGraphics(StringBuilder sb, string etiquette, Transform racine, List<Graphic> vus)
        {
            Graphic[] gs = racine.GetComponentsInChildren<Graphic>(true);
            sb.Append(etiquette).Append(" [").Append(gs.Length).Append(" graphic]");
            int ecrits = 0;
            for (int i = 0; i < gs.Length; i++)
            {
                if (vus.Contains(gs[i])) continue;
                vus.Add(gs[i]);
                if (ecrits++ >= DetailGraphicsMax) { sb.Append(" …"); break; }
                Rect rc = gs[i].rectTransform.rect;
                sb.Append(" {").Append(gs[i].name).Append('<').Append(gs[i].GetType().Name).Append("> col=#").Append(ColorUtility.ToHtmlStringRGBA(gs[i].color))
                  .Append(" actif=").Append(gs[i].enabled && gs[i].gameObject.activeInHierarchy)
                  .Append(" rect=").Append(Mathf.RoundToInt(rc.width)).Append('x').Append(Mathf.RoundToInt(rc.height))
                  .Append(" alphaGroupes=").Append(AlphaCumule(gs[i].transform).ToString("0.###", System.Globalization.CultureInfo.InvariantCulture))
                  .Append(" rendSurface=").Append(Retour.RendSurface(gs[i])).Append('}');
            }
        }

        private static int CompterEffet(Color32[] repos, Color32[] sousLeDoigt, bool[] instable, int largeur, RectInt zone)
        {
            int hauteur = repos.Length / largeur;
            int n = 0;
            for (int y = Mathf.Max(0, zone.yMin); y < Mathf.Min(hauteur, zone.yMax); y++)
                for (int x = Mathf.Max(0, zone.xMin); x < Mathf.Min(largeur, zone.xMax); x++)
                {
                    int i = y * largeur + x;
                    if (instable[i]) continue;
                    if (EcartMax(repos[i], sousLeDoigt[i]) >= RetourReleveHelper.SeuilOctets) n++;
                }
            return n;
        }

        // ------------------------------------------------------------------------------ les juges PURS (messages du tableau §4)
        /// <summary>(a) 0 attachement, ou handle nul : le retour d'appui est perdu en silence. Un `Aucun` (cas 0) passe ici et nomme le bouton.</summary>
        public static string JugerZeroAttachement(string ecran, string chemin, CasRetour cas, string nomCible)
        {
            return "GP : " + ecran + "/" + chemin + " — 0 attachement (cas " + (int)cas + ", cible " + nomCible
                   + ") : le retour d'appui est perdu en silence";
        }

        /// <summary>(b) un attachement, mais l'effet ne franchit pas le plancher : un retour invisible est un retour refusé.</summary>
        public static string JugerEffet(string ecran, string chemin, string id, int pixels)
        {
            if (pixels >= Retour.PlancherPixels) return null;
            return "GP : " + ecran + "/" + chemin + " — attachement " + id + " à effet NUL (" + pixels + " px ≥ " + RetourReleveHelper.SeuilOctets
                   + "/255, plancher " + Retour.PlancherPixels + ") : un retour invisible est un retour refusé";
        }

        public static string JugerDeuxAttachements(string ecran, string chemin, int n, string ids)
        {
            return "GP : " + ecran + "/" + chemin + " — " + n + " attachements (" + ids + ") : exactement un attendu";
        }

        public static string JugerHandleNul(string ecran, string chemin, string id)
        {
            return "GP : " + ecran + "/" + chemin + " — handle nul alors que la piste " + id + " est vivante : l'appui n'est pas tenu";
        }

        public static string JugerHorsCadre(string ecran, string chemin, string nomCible, RectInt zone)
        {
            return "GP : " + ecran + "/" + chemin + " — hors cadre (cible " + nomCible + ", zone " + zone.width + "x" + zone.height
                   + " dans l'image) : le retour d'appui ne peut pas être mesuré";
        }

        // ------------------------------------------------------------------------------ lectures
        public static List<string> Rouges(IReadOnlyList<LigneGp> lignes)
        {
            var res = new List<string>();
            for (int i = 0; i < lignes.Count; i++) if (lignes[i].Verdict != null) res.Add(lignes[i].Verdict);
            return res;
        }

        public static int Pressables(IReadOnlyList<LigneGp> lignes)
        {
            int n = 0;
            for (int i = 0; i < lignes.Count; i++) if (lignes[i].Pressable) n++;
            return n;
        }
    }

    /// <summary>Gardes STATIQUES d'un bouton du guichet (revue ⊥ du lot, 11/11), jugées sur sa configuration, pressable ou non : (1) AUCUN `ColorTint` (ni aucune
    /// transition d'Unity) : le retour d'appui est le retour, la teinte par défaut se cumulerait à lui (design §1.6) ; (2) le `targetGraphic` vit dans le
    /// SOUS-ARBRE du bouton (la contrainte du guichet, §5 B1 : un cas 2 sur un Graphic extérieur rendrait un handle non nul sur 0 pixel). Nul = vert.</summary>
    public static class GardesStatiquesGp
    {
        public static string Statique(string ecran, string chemin, Button b)
        {
            string v = null;
            if (b.transition != Selectable.Transition.None)
                v = "GP-COLORTINT : " + ecran + "/" + chemin + " — le bouton du guichet garde Transition." + b.transition
                    + " : la teinte d'Unity se cumule au retour d'appui (jamais deux retours)";
            if (b.targetGraphic != null && !b.targetGraphic.transform.IsChildOf(b.transform))
            {
                string t = "GP-TARGETGRAPHIC : " + ecran + "/" + chemin + " — le targetGraphic « " + b.targetGraphic.name
                           + " » est HORS du sous-arbre du bouton : la bascule du cas 2 pourrait être attachée sans pixel";
                v = v == null ? t : v + " | " + t;
            }
            return v;
        }
    }

    /// <summary>L'ATTEIGNABILITÉ d'un bouton (ruling f2 11/11) : le centre de son rect est-il recouvert par un `Graphic` ÉTRANGER à raycastTarget,
    /// dessiné AU-DESSUS (même canvas : plus tard dans la hiérarchie ; autre canvas : `sortingOrder` plus grand) ? Calcul de géométrie, pas de
    /// rendu, sans `EventSystem`. Étranger = ni dans le sous-arbre du bouton ni un ancêtre. Un `CanvasGroup` qui ne bloque pas les raycasts
    /// (ou un `Graphic` inactif / désactivé) ne recouvre rien.</summary>
    public static class Atteignabilite
    {
        public static string QuiRecouvreLeCentre(Button b)
        {
            var rt = b.transform as RectTransform;
            if (rt == null) return null;
            Vector3 monde = rt.TransformPoint(rt.rect.center);
            Canvas racine = b.GetComponentInParent<Canvas>();
            if (racine == null) return null;
            racine = racine.rootCanvas;
            Graphic[] tous = racine.GetComponentsInChildren<Graphic>(false);
            int rangDuBouton = IndexDuDernierDuSousArbre(tous, b.transform);
            if (rangDuBouton < 0) return null;
            int ordreBouton = b.GetComponentInParent<Canvas>().sortingOrder;
            string couvreur = null;
            for (int i = 0; i < tous.Length; i++)
            {
                Graphic g = tous[i];
                if (g == null || !g.raycastTarget || !g.enabled || !g.gameObject.activeInHierarchy) continue;
                Transform t = g.transform;
                if (t.IsChildOf(b.transform) || b.transform.IsChildOf(t)) continue;   // son propre sous-arbre, ses ancêtres
                if (!BloqueLesRaycasts(t)) continue;
                int ordre = g.canvas != null ? g.canvas.sortingOrder : 0;
                bool audessus = ordre > ordreBouton || (ordre == ordreBouton && i > rangDuBouton);
                if (!audessus) continue;
                Vector3 local = g.rectTransform.InverseTransformPoint(monde);
                if (!g.rectTransform.rect.Contains(new Vector2(local.x, local.y))) continue;
                Rect rc = g.rectTransform.rect;
                couvreur = (g.transform.parent != null ? g.transform.parent.name + "/" + g.name : g.name)
                           + " [" + g.GetType().Name + " " + Mathf.RoundToInt(rc.width) + "x" + Mathf.RoundToInt(rc.height) + " couleur " + ColorUtility.ToHtmlStringRGBA(g.color) + "]";   // le DERNIER (le plus haut) gagne
            }
            return couvreur;
        }

        private static int IndexDuDernierDuSousArbre(Graphic[] tous, Transform racine)
        {
            int dernier = -1;
            for (int i = 0; i < tous.Length; i++) if (tous[i] != null && tous[i].transform.IsChildOf(racine)) dernier = i;
            if (dernier >= 0) return dernier;
            // un bouton sans Graphic dans son sous-arbre : sa place est celle du premier Graphic qui le SUIT dans la hiérarchie
            for (int i = 0; i < tous.Length; i++)
                if (tous[i] != null && tous[i].transform.IsChildOf(racine.parent != null ? racine.parent : racine)) return i;
            return tous.Length > 0 ? 0 : -1;
        }

        private static bool BloqueLesRaycasts(Transform t)
        {
            for (Transform x = t; x != null; x = x.parent)
            {
                if (!x.TryGetComponent(out CanvasGroup cg)) continue;
                if (!cg.blocksRaycasts) return false;
                if (cg.ignoreParentGroups) break;
            }
            return true;
        }
    }

    /// <summary>La publication du relevé : un journal par écran / état, lisible dans le journal batchmode. `Debug.Log`, JAMAIS
    /// `TestContext.Progress` (il n'atteint pas ce journal).</summary>
    public static class PublicationGp
    {
        private static readonly List<KeyValuePair<string, int>> siteVus = new List<KeyValuePair<string, int>>();

        /// <summary>Remet à zéro le cumul des sites vus (début d'un run complet).</summary>
        public static void OublierLesSites() { siteVus.Clear(); }

        /// <summary>Tête, puis une ligne de comptes par (écran, état), puis une `[GP-LIGNE]` par bouton.</summary>
        public static void Publier(IReadOnlyList<LigneGp> lignes)
        {
            // la ligne de tête (f2 11/11) : couverture = sites couverts / N, avec la liste NOMMÉE des non-couverts. CUMULÉE sur le run : chaque
            // scénario ajoute ses boutons pressables jugés ; le dernier journal du run porte la couverture de tous. Un (membre, ligne) qui ne se
            // résout pas à UN site de la source est un rouge nommé, jamais un site couvert.
            for (int i = 0; i < lignes.Count; i++)
                if (lignes[i].Pressable && lignes[i].SiteLigne > 0)
                {
                    var site = new KeyValuePair<string, int>(lignes[i].SiteMembre, lignes[i].SiteLigne);
                    if (!siteVus.Contains(site)) siteVus.Add(site);
                }
            Debug.Log(RetourSites.LigneDeCouverture(RetourSites.Inventaire(), siteVus, out List<string> nonCouverts, out List<string> sitesRouges));
            for (int i = 0; i < sitesRouges.Count; i++) Debug.Log("[GP] ROUGE " + sitesRouges[i]);
            var vus = new List<string>();
            for (int i = 0; i < lignes.Count; i++)
            {
                string cle = lignes[i].Ecran + "/" + lignes[i].Etat;
                if (vus.Contains(cle)) continue;
                vus.Add(cle);
                int montes = 0, pressables = 0, nonPressables = 0, sous = 0, plafond = 0, ecarts = 0, rouges = 0, recouverts = 0;
                for (int k = 0; k < lignes.Count; k++)
                {
                    LigneGp l = lignes[k];
                    if (l.Ecran + "/" + l.Etat != cle) continue;
                    montes++;
                    if (l.Pressable) pressables++; else nonPressables++;
                    if (l.BasculeSousPlancher) sous++;
                    if (l.BasculeAuPlafond) plafond++;
                    if (l.EcartPredicatPixels) ecarts++;
                    if (l.Recouvert != null) recouverts++;
                    if (l.Verdict != null) rouges++;
                }
                Debug.Log("[GP] " + cle + " : montés " + montes + " · pressables " + pressables + " · non pressables " + nonPressables
                          + " · basculés (sous plancher) " + sous + " · basculés au plafond " + plafond
                          + " · écarts prédicat↔pixels " + ecarts + " · recouverts " + recouverts + " · rouges " + rouges);
            }
            for (int i = 0; i < lignes.Count; i++)
            {
                LigneGp l = lignes[i];
                Debug.Log("[GP-LIGNE] " + l.Ecran + "|" + l.Etat + "|" + l.Chemin + "|" + (l.Pressable ? ((int)l.Cas).ToString() : "-") + "|"
                          + (l.Id ?? "-") + "|" + (l.Pixels >= 0 ? l.Pixels.ToString() : "-") + "|" + (l.Verdict ?? ""));
            }
        }
    }
}
