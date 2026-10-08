using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.Tests.PlayMode
{
    /// <summary>D2 / D3 / D6(b) du décor de scène (`Tools/decor-de-scene-2026-10-07/DESIGN.md`, §6) — gardes STATIQUES sur la
    /// source des contrôleurs, posées au fil de la pose écran par écran (étape 4, un propriétaire à la fois) :
    ///   D2  chaque entrée `Pose` du catalogue : son contrôleur appelle `DecorDeScene.Poser(…, DecorsDeScene.&lt;Entrée&gt;)` et
    ///       ne garde AUCUN fond plat sur la racine qu'il passe au décor ;
    ///   D3  aucun chiffre de décor dans un contrôleur posé : ni `"Scenes/…"`, ni `brightness` ;
    ///   D6b chaque recette de filets de l'écran est référencée (`Filets.&lt;Ecran&gt;.&lt;Nom&gt;`), hors `Cerne` (le décor la pose).
    /// Les écrans pas encore posés vivent dans `PoseEnAttente`, les recettes pas encore branchées dans `RecettesEnAttente` :
    /// deux DETTES DATÉES qui ne font que rétrécir (une entrée devenue fausse fait rougir — patron de la garde I1).</summary>
    [Category("DecorDeScene")]
    public class DecorDeScenePosePlayModeTests
    {
        /// <summary>DETTE DATÉE (08/10, CLIENT-2) : les entrées `Pose` dont le contrôleur n'appelle pas encore le décor. Elle
        /// rétrécit d'une entrée à chaque pose, avec le feu vert du propriétaire du contrôleur (CLIENT-1).</summary>
        internal static readonly HashSet<string> PoseEnAttente = new HashSet<string>
        {
            // Posés le 08/10 — avec le feu vert de CLIENT-1 : ㊵ ㊳ ㉜ ㉚ ㉛ ㉝ ㉞ ㉙ ⑤ ㉘ ㉓ ㊲ ⑱ ; attribués à CLIENT-2 par f2 : ㊴ ㉟ ㊱ ⑮ ⑰ ㉒ ㉔ ⑭.
            // ③ : DéjàLivré (amendement du 08/10, la ville peinte), hors de cette dette.
            // ⑱ AppShell.MonterMenuPlus posé le 08/10, EN DERNIER (AppShell rendu par CLIENT-1). La dette est VIDE : les 21 entrées Pose
            // sont posées ; elle reste déclarée pour qu'une entrée Pose NEUVE du catalogue y passe avant sa pose.
        };

        /// <summary>DETTE DATÉE : par écran POSÉ, les recettes de filets pas encore branchées, chacune avec sa raison. Ne fait
        /// que rétrécir.</summary>
        internal static readonly Dictionary<string, string[]> RecettesEnAttente = new Dictionary<string, string[]>
        {
            // ㊵ (08/10) — Elast, Et6, Et6Alerte, Cuve : la boîte, les étapes et leurs cuves sont CERNÉES par `PiedDEcran.Cerner`
            //   (CLIENT-1) ; elles passeront par la délégation Cerner → Filets que CLIENT-1 a acceptée après la fusion (noms
            //   `Cerne/Haut|Bas|Gauche|Droite` gardés). Cta6 : le geste du pied, stylé par `PiedDEcran` (CLIENT-1). Mano, MailFlou,
            //   MailTenu, N, N_2 : éléments de cadres d'état que le contrôleur ne construit pas (cadran, maillons, pastilles) —
            //   à classer au juge (A s'ils manquent au joueur, sinon C).
            { "㊵", new[] { "Cta6", "Cuve", "Elast", "Et6", "Et6Alerte", "MailFlou", "MailTenu", "Mano", "N", "N_2" } },
            // ㊳ (08/10) — Une, Brv, Angle : MÊME recette que `Evt` (1 px #2a3648, 4 côtés), que le contrôleur pose sur chaque Ligne ; le
            //   client n'a qu'une sorte de carte (cadre 125 : une / brève / angle). EvtPerm : la carte `permanent` (servie) garde le
            //   Contour(AccentVif) de CLIENT-1 — la mesure dit accentDanger, écart de teinte à classer au juge. Elast : la boîte de la
            //   Liste (ListeDefilante, CLIENT-1, non touchée). Cta6, Cta6Eteint : le pied (`PiedDEcran`, CLIENT-1). Cpl, CplVide6 (cadre
            //   128), Jrn (cadre 125), Mano (cadran) : éléments que le contrôleur ne construit pas — à classer au juge.
            { "㊳", new[] { "Angle", "Brv", "Cpl", "CplVide6", "Cta6", "Cta6Eteint", "Elast", "EvtPerm", "Jrn", "Mano", "Une" } },
            // ⑱ (08/10) — le bureau posé ; les entrées du menu PLUS (groupes, entrées `.e5`) : blocs de CLIENT-1 — à déléguer à Filets.
            { "⑱", new[] { "Bureau", "Mano", "Picto", "PlaqueBureau", "SousMain", "TagLaiton", "TagLaiton_2" } },
            // ㊲ (08/10, option A) — le support A et le cerne posés par le décor sur le cadre (SuivreLeCadre) ; l'enseigne, les compteurs,
            //   le miroir, le panneau : blocs de CLIENT-1 avec leurs traits propres — à déléguer à Filets.
            { "㊲", new[] { "Cta6", "Cta6Eteint", "Elast", "Enseigne", "Fen", "Mano", "Nm", "Pann", "Pann_2", "Prt", "Rg6", "Tl", "TlOn" } },
            // ㉓ (08/10) — la vitre posée en support ; le comptoir, la vitre défilante, les plaques, le solde, la bande .voix : fonds et
            //   traits de CLIENT-1 — à déléguer à Filets.
            { "㉓", new[] { "Acquis", "Art", "ArtPris", "Av", "Compt", "Etiq", "EtiqHors", "EtiqMagasin", "Mano", "Planche", "PlancheLarge", "Solde", "Voix" } },
            // ㉘ (08/10) — la planche posée ; les zones (.lecture, liège, courriers, bas) : fonds et traits de CLIENT-1 — à déléguer.
            { "㉘", new[] { "Av", "Bas", "CadreB", "Cliche", "Entete", "FicheDroite", "FicheGauche", "Geste", "Iss", "IssOr", "IssRouge", "L", "Lecture", "Mano", "Rien" } },
            // ⑤ (08/10) — le feutre posé ; la carte (BordCarte, FiletCarte), le jeton, les pips, le tampon, le pied : traits propres du
            //   contrôleur (CLIENT-1) — à déléguer à Filets.
            { "⑤", new[] { "Bandes", "CarteOr", "CarteOrTranchee", "Deja", "I", "I_2", "LigneOr", "Mano", "On", "Piece", "Piece_2", "PlaqueLaiton", "TamponDiag", "TapisFeutre" } },
            // ㉙ (08/10) — toutes les recettes de blocs (tableau, sections, coups, pied) : blocs de CLIENT-1 — à déléguer à Filets.
            { "㉙", new[] { "Av", "Av_2", "Bas", "Doss", "Ecu", "Ecu_2", "Entete", "Env", "Fam", "FamVisee", "Geste", "GesteRouge", "L", "Mano", "Rappel", "Res", "Res_2", "Res_3", "Res_4", "Rien", "ViseeTag" } },
            // ⑭ (08/10) — la tôle posée ; les blocs de l'écran (le manomètre de CLIENT-3 à venir, les fiches de la semaine) :
            //   traits propres du contrôleur ou absents — à migrer vers Filets / à classer au juge.
            { "⑭", new[] { "Anneau", "BoutonFer", "BoutonFerSecondaire", "CadranFer", "Ecarter", "Jf", "JfPris", "Mano", "Pf", "PfPersiste", "PfRevele", "PfTraitee", "PlaqueFerTexte", "Regler", "Span", "Tole" } },
            // ㉞ (08/10) — toutes les recettes de blocs (en-tête, carnet, composeur, pied) : blocs de CLIENT-1 — à déléguer à Filets.
            { "㉞", new[] { "CnBas", "CnGeste", "CnGesteMort", "CnGesteRouge", "CnNouvelle", "CnNouvelleVue", "CnPol", "CnPolActif", "CnRien", "CnSeq", "CnSeqVerrou", "CnSlotVide", "CnTete", "Contre", "Mano", "Tag" } },
            // ㉔ (08/10) — le burner posé ; l'écran est une carte fixe (600×640) d'avant la série 6 : l'écran LCD, les bulles, les
            //   messages, les touches de la maquette n'y sont pas construits à l'identique — à classer au juge (structure de contenu).
            { "㉔", new[] { "BatLcd", "BulleLcd", "BulleLcdMoi", "BulleLcdRep", "Burner", "Ch", "D", "F_Bloc", "Hint", "I", "Lcd", "LcdTete", "Mano", "Mi", "MiRet", "MiStruct", "Msg", "MsgVieux", "N", "Ok", "Saisie", "Span" } },
            // ㉒ (08/10) — le coffre posé ; ses objets (plaque d'identité, rivets, leviers, molette, tirettes, interrupteurs, plaques,
            //   cadran) : construits par le contrôleur avec ses propres traits, ou absents — à migrer vers Filets / à classer au juge.
            { "㉒", new[] { "Lev", "LevRouge", "Mano", "Molette", "Pl", "PlaqueId", "Rivets", "Tir", "Tog", "TogOn" } },
            // ㉝ (08/10) — toutes les recettes de blocs (tête, bas, gestes, offres, parcelle, pénal, glob, rien, lignes, tags, cadran) :
            //   blocs de CLIENT-1, bords propres — à déléguer à Filets.
            { "㉝", new[] { "DmBas", "DmGeste", "DmGesteMort", "DmGesteRouge", "DmGlob", "DmOffre", "DmOffreUn", "DmOffreUnClose", "DmParcelle", "DmPenal", "DmRien", "DmTete", "L", "Mano", "Tag", "Tag_2", "Tag_3" } },
            // ⑰ (08/10) — le liège posé ; les recettes de blocs (registre, feuilles, cartes punaisées, gestes) : construites par le
            //   contrôleur avec ses propres traits, ou absentes — à migrer vers Filets / à classer au juge.
            { "⑰", new[] { "CachetR", "Cols", "CompteR", "Corkboard", "DepT", "EnteteCork", "EtatP", "EtatP_2", "EtatP_3", "Mano", "NoteP", "PerfD", "PerfG", "Photo", "PiedL", "TamponDep", "TeteL" } },
            // ⑮ (08/10) — le liège posé ; les recettes de blocs (registre, feuilles, cartes punaisées, gestes) : construites par le
            //   contrôleur avec ses propres traits, ou absentes — à migrer vers Filets / à classer au juge.
            { "⑮", new[] { "CachetR", "Cols", "CompteR", "Corkboard", "DepT", "EnteteCork", "EtatP", "EtatP_2", "EtatP_3", "Mano", "NoteP", "PerfD", "PerfG", "Photo", "PiedL", "TamponDep", "TeteL" } },
            // ㊱ (08/10) — Enseigne, Fen, Elast, Pann posées ; Ct/CtRecule par Etats.Horizon (servi : predicate_regressed). CtPris,
            //   CtPrisRecule, CtHs : `view_status` (adopted, dismissed…) est servi, mais sa correspondance avec `.pris`/`.hs` n'est pas
            //   établie — à trancher au juge ; Recul (filet haut de la mention « ça s'est éloigné »), Cta6 (le pied), Mano (cadran).
            { "㊱", new[] { "CtHs", "CtPris", "CtPrisRecule", "Cta6", "Mano", "Recul" } },
            // ㉛ (08/10) — PlChoix/PlChoixPris/PlChoixRisque POSÉS (états des cartes d'avocat, Filets.Etat).
            //   PlItem/PlItemLache, PlAlerte, PlRien, Tag* : états d'une affaire ACTIVE, non servie (`GET /v1/me/legal` : activeCases: [])
            //   — non construits (CLIENT-1). PlTete, PlBas, PlGeste*, PlVitre, PlAv, Mano : en-tête, pied, vitre, avatar, cadran —
            //   blocs de CLIENT-1, à déléguer à Filets.
            { "㉛", new[] { "Mano", "PlAlerte", "PlAv", "PlBas", "PlGeste", "PlGesteRouge", "PlItem", "PlItemLache", "PlTete", "PlVitre" } },   // PlRien, Tag, Tag_2, Tag_3 RETIRÉES le 08/10 (CLIENT-2, créneau du dossier) : le cumul (5e430bb5, CLIENT-1) les branche — D6b rougissait sur le cumul
            // ㉟ (08/10) — Enseigne et Fen posées. Dl/DlMort/DlPris/DlPrisMort (les rangées de points de vente), Gd, Pann/Pann_2 (le
            //   panneau d'état) : déjà tracés par `ProceduralUI` dans le contrôleur (rangées, pastilles) — à migrer vers Filets ; Elast
            //   (la boîte), Cta6/Cta6Eteint (le pied), Mano (le cadran) : à classer au juge.
            { "㉟", new[] { "Cta6", "Cta6Eteint", "Dl", "DlMort", "DlPris", "DlPrisMort", "Elast", "Gd", "Mano", "Pann", "Pann_2" } },
            // ㉚ (08/10) — L posée (les filets pointillés du bon). Le reste : en-tête (EnteteDEcran), pied (PiedDEcran), chaîne
            //   (nœuds, tuyaux, pics, états, gestes, rien, cadran) — blocs de CLIENT-1, à déléguer à Filets.
            { "㉚", new[] { "Bas", "Entete", "Etat", "Etat_2", "Geste", "GesteMort", "Mano", "Noeud", "NoeudFlou", "NoeudTrouve", "Pic", "Pic_2", "Rien", "Tuyau", "TuyauRefoule" } },
            // ㊴ (08/10, DESIGN v5.2) — la vue pistes/acteurs/vide est construite d'après les cadres 150, 151 et 135 : toutes les recettes de
            //   `.dos6` sont posées SAUF deux. Cta6 : le pied « acheter du renseignement » ALLUMÉ des cadres 131-132, dessin ANCIEN (le pied
            //   qui fait foi est Cta6Eteint, 150 : le prix n'est pas servi). Mano : le cadran des cadres 131-134, que le client ne construit pas.
            { "㊴", new[] { "Cta6", "Mano" } },
            // ㉜ (08/10) — toutes les recettes de blocs (tête, bas, plaques, réserves, jetons, gestes, aperçu, rien, ligne pointillée,
            //   cadran) : blocs de CLIENT-1, tracés par ses propres bords (`Bord`, `FiletG`, `Filet`) — à déléguer à Filets avec Cerner.
            { "㉜", new[] { "L", "Mano", "Rond", "Rond_2", "SvApercu", "SvBas", "SvGeste", "SvGesteMort", "SvJeton", "SvJetonUse", "SvPlaque", "SvPlaqueConfiee", "SvPlaqueGris", "SvPlaqueViser", "SvRien", "SvTete" } },
        };

        /// <summary>Recettes posées par le décor lui-même (le cerne A : `Decor/Cerne`), jamais par le contrôleur.</summary>
        private static readonly HashSet<string> PoseesParLeDecor = new HashSet<string> { "Cerne" };

        // ════════════════════════════════════════════════════════════════════════════ instruments (purs)

        private static readonly Regex Commentaires = new Regex(@"//[^\n]*|/\*.*?\*/", RegexOptions.Singleline | RegexOptions.Compiled);

        internal static string SansCommentaires(string src) => Commentaires.Replace(src, "");

        /// <summary>D2 : les défauts d'une source de contrôleur pour l'entrée `nom`. Vide = posé, sans fond plat. Pure.</summary>
        internal static List<string> DefautsDePose(string source, string nom)
        {
            string s = SansCommentaires(source);
            var d = new List<string>();
            Match m = Regex.Match(s, @"DecorDeScene\.Poser\(\s*(\w+)[^,]*,\s*(?:[\w.]*\.)?DecorsDeScene\.(\w+)\s*\)");
            if (!m.Success) { d.Add("n'appelle pas DecorDeScene.Poser(…, DecorsDeScene." + nom + ")"); return d; }
            if (m.Groups[2].Value != nom) d.Add($"pose DecorsDeScene.{m.Groups[2].Value} au lieu de {nom}");
            string racine = Regex.Escape(m.Groups[1].Value);
            if (Regex.IsMatch(s, @"AjouterFond\(\s*" + racine + @"\s*[,.)]"))
                d.Add($"garde un fond plat sur « {m.Groups[1].Value} », la racine passée au décor");
            if (Regex.IsMatch(s, racine + @"\s*\.\s*AddComponent<Image>"))
                d.Add($"ajoute une Image sur « {m.Groups[1].Value} », la racine passée au décor");
            return d;
        }

        /// <summary>D3 : les chiffres de décor qu'un contrôleur posé ne porte plus. Pure.</summary>
        internal static List<string> ChiffresDeDecor(string source)
        {
            string s = SansCommentaires(source);
            var d = new List<string>();
            if (s.Contains("\"Scenes/")) d.Add("un chemin \"Scenes/…\" (la scène est au catalogue)");
            if (Regex.IsMatch(s, @"\bbrightness\b", RegexOptions.IgnoreCase)) d.Add("une luminosité (au catalogue)");
            return d;
        }

        /// <summary>Les recettes COMPOSÉES (`DecorsDeScene.FiletsComposes.<Nom>`) : champ du catalogue → (composée → générée qu'elle
        /// prolonge). D6e exige qu'aucune composée n'y manque et qu'aucune entrée n'y soit périmée.</summary>
        internal static readonly Dictionary<string, Dictionary<string, string>> Composees = new Dictionary<string, Dictionary<string, string>>
        {
            { "Forensic", new Dictionary<string, string> { { "FenIciOr", "FenIci" } } },
        };

        /// <summary>D6b : les recettes de `ecran` que la source ne référence pas — ni directement (`Filets.&lt;Ecran&gt;.&lt;Nom&gt;`), ni
        /// par un ÉTAT référencé (`Etats.&lt;Ecran&gt;.&lt;État&gt;` dont le bord EST la recette : `parEtat[état]` = ses recettes). Pure.</summary>
        internal static List<string> RecettesOrphelines(string source, string ecran, IEnumerable<string> recettes,
                                                        IDictionary<string, string[]> parEtat = null,
                                                        IDictionary<string, string> composees = null)
        {
            string s = SansCommentaires(source);
            var viaEtats = new HashSet<string>();
            if (parEtat != null)
                foreach (var kv in parEtat)
                    if (Regex.IsMatch(s, @"Etats\." + Regex.Escape(ecran) + @"\." + Regex.Escape(kv.Key) + @"\b"))
                        foreach (string r in kv.Value) viaEtats.Add(r);
            // Une recette COMPOSÉE référencée (`FiletsComposes.<Nom>`) vaut référence à la recette GÉNÉRÉE qu'elle prolonge.
            if (composees != null)
                foreach (var kv in composees)
                    if (Regex.IsMatch(s, @"FiletsComposes\." + Regex.Escape(kv.Key) + @"\b")) viaEtats.Add(kv.Value);
            return recettes.Where(r => !PoseesParLeDecor.Contains(r) && !viaEtats.Contains(r)
                                       && !Regex.IsMatch(s, @"Filets\." + Regex.Escape(ecran) + @"\." + Regex.Escape(r) + @"\b"))
                           .OrderBy(r => r).ToList();
        }

        /// <summary>Pour `DecorsDeScene.Etats.&lt;champ&gt;` (s'il existe) : état → noms des recettes de `Filets.&lt;champ&gt;` qui
        /// SONT son bord (égalité de référence, pas de nom).</summary>
        private static Dictionary<string, string[]> RecettesParEtat(string champ)
        {
            var r = new Dictionary<string, string[]>();
            System.Type etats = typeof(DecorsDeScene.Etats).GetNestedType(champ, BindingFlags.Public | BindingFlags.Static);
            System.Type filets = typeof(DecorsDeScene.Filets).GetNestedType(champ, BindingFlags.Public | BindingFlags.Static);
            if (etats == null || filets == null) return r;
            var recettes = filets.GetFields(BindingFlags.Public | BindingFlags.Static).Where(f => f.FieldType == typeof(SpecFilet[]))
                                 .Select(f => (f.Name, (SpecFilet[])f.GetValue(null))).ToList();
            foreach (FieldInfo e in etats.GetFields(BindingFlags.Public | BindingFlags.Static).Where(f => f.FieldType == typeof(EtatDeBloc)))
            {
                var etat = (EtatDeBloc)e.GetValue(null);
                r[e.Name] = recettes.Where(x => ReferenceEquals(x.Item2, etat.Bord)).Select(x => x.Item1).ToArray();
            }
            return r;
        }

        // ════════════════════════════════════════════════════════════════════════════ sources

        private static string NomDeChamp(SpecDecor s) =>
            typeof(DecorsDeScene).GetFields(BindingFlags.Public | BindingFlags.Static).First(f => f.GetValue(null) == s).Name;

        private static IEnumerable<string> RecettesDe(string champ)
        {
            System.Type t = typeof(DecorsDeScene.Filets).GetNestedType(champ, BindingFlags.Public | BindingFlags.Static);
            Assert.IsNotNull(t, $"DecorsDeScene.Filets.{champ} absent");
            return t.GetFields(BindingFlags.Public | BindingFlags.Static).Where(f => f.FieldType == typeof(SpecFilet[])).Select(f => f.Name);
        }

        /// <summary>La source du contrôleur d'une entrée : le fichier `&lt;Ecran&gt;.cs` sous `Assets/Scripts` ; pour ⑱, le corps
        /// de `AppShell.MonterMenuPlus`.</summary>
        private static string SourceDe(SpecDecor s)
        {
            string scripts = Path.Combine(Application.dataPath, "Scripts");
            if (s.Ecran == "AppShell.MonterMenuPlus")
            {
                string app = File.ReadAllText(Directory.GetFiles(scripts, "AppShell.cs", SearchOption.AllDirectories).Single());
                int i = app.IndexOf("void MonterMenuPlus(", System.StringComparison.Ordinal);
                Assert.GreaterOrEqual(i, 0, "AppShell.MonterMenuPlus introuvable");
                int j = app.IndexOf("\n        }\n", i, System.StringComparison.Ordinal);
                return app.Substring(i, (j > i ? j : app.Length) - i);
            }
            string[] f = Directory.GetFiles(scripts, s.Ecran + ".cs", SearchOption.AllDirectories);
            Assert.AreEqual(1, f.Length, $"{s.Symbole} : {f.Length} fichier(s) {s.Ecran}.cs");
            return File.ReadAllText(f[0]);
        }

        // ════════════════════════════════════════════════════════════════════════════ gardes

        /// <summary>D4o : les appels `ListeDefilante.Indiquer` d'une source, hors commentaires, et combien passent le BAS du bureau
        /// par son nom (`DecorsDeScene.MenuPlus.Support.CouleurDuBas`).</summary>
        private static (int appels, int auBas) FondusDuMenu(string source)
        {
            var lignes = source.Split('\n').Select(l => { int c = l.IndexOf("//", System.StringComparison.Ordinal); return c >= 0 ? l.Substring(0, c) : l; });
            string code = string.Join("\n", lignes);
            int appels = Regex.Matches(code, @"ListeDefilante\.Indiquer\(").Count;
            int auBas = Regex.Matches(code, @"ListeDefilante\.Indiquer\(\s*\w+\s*,\s*DecorsDeScene\.MenuPlus\.Support\.CouleurDuBas\s*\)").Count;
            return (appels, auBas);
        }

        [Test]
        public void D4o_MenuPlus_LeFonduLitLeBasDuBureau_DansLaSource()
        {
            // Le banc D4n (DecorDeScenePlayModeTests) prouve l'EFFET pour `CouleurDuBas` ; ceci lie le banc à AppShell : le menu passe
            // CETTE valeur, par son nom, à son unique fondu. Contrôles : l'ancien argument (surfaceBase) et un appel en commentaire
            // ne comptent pas.
            var (appels, auBas) = FondusDuMenu(SourceDe(DecorsDeScene.MenuPlus));
            Assert.AreEqual(1, appels, "MonterMenuPlus pose UN fondu");
            Assert.AreEqual(1, auBas, "le fondu du menu se fond dans le BAS du bureau (DecorsDeScene.MenuPlus.Support.CouleurDuBas), pas dans un jeton");
            Assert.AreEqual((1, 0), FondusDuMenu("ListeDefilante.Indiquer(defilement, DesignTokens.Current.surfaceBase);"), "contrôle : l'ancien argument est vu");
            Assert.AreEqual((0, 0), FondusDuMenu("// ListeDefilante.Indiquer(d, DecorsDeScene.MenuPlus.Support.CouleurDuBas);"), "contrôle : un commentaire ne compte pas");
        }

        [Test]
        public void D2_D3_D6b_ControlesPositifs()
        {
            const string bon = "var d = DecorDeScene.Poser(racine.transform, DecorsDeScene.Filiere);\nFilets.Poser(c, DecorsDeScene.Filets.Filiere.Fen);";
            Assert.IsEmpty(DefautsDePose(bon, "Filiere"));
            StringAssert.Contains("n'appelle pas", DefautsDePose("// DecorDeScene.Poser(racine.transform, DecorsDeScene.Filiere);", "Filiere")[0],
                "un appel en COMMENTAIRE ne compte pas");
            StringAssert.Contains("au lieu de", DefautsDePose(bon, "Journal")[0], "la mauvaise entrée est vue");
            StringAssert.Contains("fond plat", DefautsDePose(bon + "\nAjouterFond(racine, DesignTokens.Current.surfaceBase);", "Filiere")[0]);
            Assert.IsEmpty(DefautsDePose(bon + "\nAjouterFond(chaine, DesignTokens.Current.surfaceBase);", "Filiere"), "un fond d'un AUTRE bloc est permis");
            Assert.AreEqual(2, ChiffresDeDecor("Resources.Load(\"Scenes/x\"); float brightness = .2f;").Count);
            Assert.IsEmpty(ChiffresDeDecor("// \"Scenes/x\" brightness"), "les commentaires ne comptent pas");
            CollectionAssert.AreEqual(new[] { "Pann" }, RecettesOrphelines(bon, "Filiere", new[] { "Fen", "Pann", "Cerne" }),
                "la recette non référencée est vue ; Cerne (posée par le décor) ne l'est pas");
            var parEtat = new Dictionary<string, string[]> { { "Pris", new[] { "PlChoixPris" } }, { "Risque", new[] { "PlChoixRisque" } } };
            CollectionAssert.AreEqual(new[] { "PlChoixRisque" },
                RecettesOrphelines("return DecorsDeScene.Etats.Loi.Pris;", "Loi", new[] { "PlChoixPris", "PlChoixRisque" }, parEtat),
                "une recette portée par un état RÉFÉRENCÉ compte ; celle d'un état non référencé reste orpheline");
            Assert.IsNotEmpty(RecettesParEtat("Loi")["Pris"], "le bord de Etats.Loi.Pris EST une recette mesurée de ㉛ (référence)");
            // Une recette COMPOSÉE référencée vaut référence à la générée qu'elle prolonge (㊴ : FenIciOr → FenIci) ; en commentaire, non.
            var compo = new Dictionary<string, string> { { "FenIciOr", "FenIci" } };
            CollectionAssert.AreEqual(new[] { "Fen" }, RecettesOrphelines("Filets.Poser(b, DecorsDeScene.FiletsComposes.FenIciOr);", "Forensic",
                new[] { "Fen", "FenIci" }, null, compo), "FenIciOr posée ⇒ FenIci référencée ; Fen reste orpheline");
            CollectionAssert.AreEqual(new[] { "Fen", "FenIci" }, RecettesOrphelines("// DecorsDeScene.FiletsComposes.FenIciOr", "Forensic",
                new[] { "Fen", "FenIci" }, null, compo), "une référence en commentaire ne compte pas");
            var generee = new[] { new SpecFilet(Cotes.Tous, 1f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1f)) };
            var composee = new[] { generee[0], new SpecFilet(Cotes.Bas, 2f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1f), inset: 1f) };
            Assert.IsTrue(PrefixeIdentique(composee, generee), "les premières specs SONT celles de la générée (même référence)");
            Assert.IsFalse(PrefixeIdentique(new[] { new SpecFilet(Cotes.Tous, 1f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1f)), composee[1] }, generee),
                "une COPIE égale en valeur n'est pas la générée : un re-mesure ne la suivrait pas");
            Assert.IsFalse(PrefixeIdentique(generee, generee), "une composée qui n'ajoute rien n'en est pas une");
        }

        /// <summary>Pure : `composee` commence, par RÉFÉRENCE, par toutes les specs de `generee` et en ajoute au moins une.</summary>
        internal static bool PrefixeIdentique(SpecFilet[] composee, SpecFilet[] generee)
        {
            if (composee.Length <= generee.Length) return false;
            for (int k = 0; k < generee.Length; k++) if (!ReferenceEquals(composee[k], generee[k])) return false;
            return true;
        }

        /// <summary>D6e : chaque recette COMPOSÉE du catalogue (`FiletsComposes`) prolonge, par référence, la recette GÉNÉRÉE que
        /// `Composees` lui assigne ; aucune composée sans entrée, aucune entrée sans composée.</summary>
        [Test]
        public void D6e_ChaqueRecetteComposeeProlongeLaGenereeParReference()
        {
            FieldInfo[] champs = typeof(DecorsDeScene.FiletsComposes).GetFields(BindingFlags.Public | BindingFlags.Static)
                                                                      .Where(f => f.FieldType == typeof(SpecFilet[])).ToArray();
            Assert.IsNotEmpty(champs, "anti-vacuité : au moins une recette composée");
            var vues = new HashSet<string>();
            foreach (var ec in Composees)
            {
                System.Type filets = typeof(DecorsDeScene.Filets).GetNestedType(ec.Key, BindingFlags.Public | BindingFlags.Static);
                Assert.IsNotNull(filets, $"DecorsDeScene.Filets.{ec.Key} absent");
                foreach (var kv in ec.Value)
                {
                    FieldInfo composee = champs.FirstOrDefault(f => f.Name == kv.Key);
                    Assert.IsNotNull(composee, $"Composees[{ec.Key}] nomme {kv.Key} : absente de FiletsComposes (entrée périmée)");
                    FieldInfo generee = filets.GetField(kv.Value, BindingFlags.Public | BindingFlags.Static);
                    Assert.IsNotNull(generee, $"Filets.{ec.Key}.{kv.Value} absente (renommée par un re-mesure ?)");
                    Assert.IsTrue(PrefixeIdentique((SpecFilet[])composee.GetValue(null), (SpecFilet[])generee.GetValue(null)),
                        $"FiletsComposes.{kv.Key} ne prolonge pas Filets.{ec.Key}.{kv.Value} par référence");
                    vues.Add(kv.Key);
                }
            }
            CollectionAssert.AreEquivalent(champs.Select(f => f.Name).ToArray(), vues.ToArray(), "toute composée a son entrée dans Composees");
        }

        [Test]
        public void D2_ChaqueEntreePoseeAppelleLeDecor_SansFondPlat_EtLaDetteNeFaitQueRetrecir()
        {
            var echecs = new List<string>();
            var perimees = new List<string>();
            foreach (SpecDecor s in DecorsDeScene.Tous.Where(e => e.Statut == StatutDecor.Pose))
            {
                List<string> d = DefautsDePose(SourceDe(s), NomDeChamp(s));
                if (PoseEnAttente.Contains(s.Symbole)) { if (d.Count == 0) perimees.Add(s.Symbole); continue; }
                foreach (string x in d) echecs.Add($"{s.Symbole} {s.Ecran} : {x}");
            }
            Assert.IsEmpty(echecs, string.Join("\n", echecs));
            Assert.IsEmpty(perimees, $"posé(s), à RETIRER de PoseEnAttente : [{string.Join(", ", perimees)}]");
            Assert.IsTrue(PoseEnAttente.All(p => DecorsDeScene.Tous.Any(e => e.Symbole == p && e.Statut == StatutDecor.Pose)),
                "PoseEnAttente ne nomme que des entrées Pose du catalogue");
        }

        [Test]
        public void D3_AucunChiffreDeDecorDansUnControleurPose()
        {
            var echecs = new List<string>();
            foreach (SpecDecor s in DecorsDeScene.Tous.Where(e => e.Statut == StatutDecor.Pose && !PoseEnAttente.Contains(e.Symbole)))
                foreach (string x in ChiffresDeDecor(SourceDe(s))) echecs.Add($"{s.Symbole} {s.Ecran} : {x}");
            Assert.IsEmpty(echecs, string.Join("\n", echecs));
        }

        [Test]
        public void D6b_ChaqueControleurPoseReferenceChaqueRecetteDeSonEcran()
        {
            var echecs = new List<string>();
            var perimees = new List<string>();
            foreach (SpecDecor s in DecorsDeScene.Tous.Where(e => e.Statut == StatutDecor.Pose && !PoseEnAttente.Contains(e.Symbole)))
            {
                string champ = NomDeChamp(s);
                List<string> orphelines = RecettesOrphelines(SourceDe(s), champ, RecettesDe(champ), RecettesParEtat(champ),
                                                              Composees.TryGetValue(champ, out var compo) ? compo : null);
                RecettesEnAttente.TryGetValue(s.Symbole, out string[] attente);
                attente = attente ?? new string[0];
                foreach (string o in orphelines.Except(attente)) echecs.Add($"{s.Symbole} {champ}.{o} : recette mesurée jamais posée");
                foreach (string a in attente.Except(orphelines)) perimees.Add($"{s.Symbole} {champ}.{a}");
            }
            Assert.IsEmpty(echecs, string.Join("\n", echecs));
            Assert.IsEmpty(perimees, $"branchée(s), à RETIRER de RecettesEnAttente : [{string.Join(", ", perimees)}]");
        }
    }
}
