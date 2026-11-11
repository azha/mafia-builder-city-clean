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
                if (!(b.gameObject.activeInHierarchy && b.IsInteractable()))
                {
                    RetourAppui inerte = b.GetComponent<RetourAppui>();
                    lignes.Add(new LigneGp { Ecran = ecran, Etat = etat, Chemin = chemin, Pressable = false, Cas = CasRetour.Aucun,
                                             NomCible = "", Id = null, Pixels = -1,
                                             SiteMembre = inerte != null ? inerte.SiteMembre : "", SiteLigne = inerte != null ? inerte.SiteLigne : 0 });
                    continue;
                }
                if (ambiance || !reposPris)
                {
                    repos = PhotographierRepos(canvas, largeur, hauteur, regie);
                    reposPris = true;
                }
                lignes.Add(Appuyer(ecran, etat, chemin, b, canvas, regie, largeur, hauteur, repos));
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
                int montes = 0, pressables = 0, nonPressables = 0, sous = 0, plafond = 0, ecarts = 0, rouges = 0;
                for (int k = 0; k < lignes.Count; k++)
                {
                    LigneGp l = lignes[k];
                    if (l.Ecran + "/" + l.Etat != cle) continue;
                    montes++;
                    if (l.Pressable) pressables++; else nonPressables++;
                    if (l.BasculeSousPlancher) sous++;
                    if (l.BasculeAuPlafond) plafond++;
                    if (l.EcartPredicatPixels) ecarts++;
                    if (l.Verdict != null) rouges++;
                }
                Debug.Log("[GP] " + cle + " : montés " + montes + " · pressables " + pressables + " · non pressables " + nonPressables
                          + " · basculés (sous plancher) " + sous + " · basculés au plafond " + plafond
                          + " · écarts prédicat↔pixels " + ecarts + " · rouges " + rouges);
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
