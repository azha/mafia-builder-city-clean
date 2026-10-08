using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Mouvements.Tests
{
    // CLIENT-3 / E2a (design-couche-mouvement.md §10) — les gardes qui lisent le CODE ou un arbre MONTÉ, dans l'assembly de tests
    // (celle qui voit TextMeshPro et `Assets/Scripts`), chacune avec ses CONTRÔLES NÉGATIFS (X9 : une donnée fautive qui DOIT rougir) :
    //   G6   aucun canal ≠ `Alpha` sur un `TMP_Text` — un texte se fond (`CanvasGroup`), il ne tourne ni ne se teint ; garde de TEST,
    //        pas un refus runtime (`ShellContracts` ne référence pas TextMeshPro, §1)
    //   G10  aucun `Update`/`LateUpdate`/coroutine visuel hors `Mouvements/` et hors la liste FERMÉE du design, par fichier:méthode
    //   AmbientPulseLoop supprimé (dette 8 : le type, son .meta)
    [Category("Mouvement")]
    public class MouvementsGardesE2PlayModeTests
    {
        private readonly List<Object> montes = new List<Object>();

        [TearDown]
        public void TearDown()
        {
            RegieMouvement.Oublier();
            foreach (Object o in montes) if (o != null) Object.DestroyImmediate(o);
            montes.Clear();
        }

        // ------------------------------------------------------------------------------------------ G10

        /// <summary>LA LISTE FERMÉE du design §10 — les `Update`/`LateUpdate` qui restent hors de `Mouvements/`, par fichier:méthode
        /// (chemins relatifs à `Assets/Scripts`). 12 mesurés avant E2a (revue de code E2a, B1 : le design disait 10, compté à la main) : 3 migrés
        /// (`TopBarController.Update`, `Gyrophare.Update`, `AmbientPulseLoop.Update`), 9 nommés ici. `ListeDefilante.LateUpdate` écrit l'alpha du
        /// fondu et la position de l'ascenseur : ils sont fonction de la POSITION de défilement, jamais du temps (mise en page, comme
        /// `LaSuitePanelController`) — consigné en dette 25. `LaSuitePanelController.LateUpdate` écrit une échelle (`Ajuster` → `localScale`) :
        /// de la mise en page (ajustement à la bande), pas du mouvement. Elle ne fait que RÉTRÉCIR : un ajout est une décision nommée.</summary>
        internal static readonly string[] UpdateAdmis =
        {
            "CityMap/DistrictMapNavigation.cs:Update",                       // pan/zoom au doigt
            "Operational/Carnet/AppuiLong.cs:Update",                        // minuterie, aucune écriture visuelle
            "Operational/Exceptions/ExceptionQueueController.cs:LateUpdate", // `CalerLeZinc`, mise en page
            "Operational/Reputation/ReputationScreenController.cs:LateUpdate", // visibilité de l'ascenseur
            "Shell/AppShell.cs:Update",                                      // la touche retour
            "Shell/LaSuitePanelController.cs:LateUpdate",                    // `Ajuster` → `localScale` d'ajustement à la bande
            "ShellContracts/LongPressButton.cs:Update",                      // minuterie, aucune écriture visuelle
            "ShellContracts/ListeDefilante.cs:LateUpdate",                   // fondu et ascenseur d'une liste : fonction de la position, pas du temps
            "ShellContracts/SuiviDuCadre.cs:LateUpdate",                     // suit le cadre : ancres de mise en page
        };

        /// <summary>Les coroutines admises à ÉCRIRE du visuel : AUCUNE. La minuterie du bandeau reste une coroutine (l'attente n'est pas une
        /// animation), mais son fondu est une piste de la régie.</summary>
        internal static readonly string[] CoroutinesVisuellesAdmises = new string[0];

        private const string DossierDuMecanisme = "ShellContracts/Mouvements/";

        private static string Racine => Path.Combine(Application.dataPath, "Scripts");

        private static List<(string rel, string source)> LesSources()
        {
            var res = new List<(string, string)>();
            foreach (string f in Directory.GetFiles(Racine, "*.cs", SearchOption.AllDirectories).OrderBy(x => x, StringComparer.Ordinal))
                res.Add((f.Substring(Racine.Length + 1).Replace('\\', '/'), File.ReadAllText(f)));
            return res;
        }

        /// <summary>G10 : les violations (vide = vert). Hors `Mouvements/` : (1) l'inventaire des `Update`/`LateUpdate`/`FixedUpdate` EST la liste
        /// fermée, dans les deux sens ; (2) aucune coroutine, hors liste, n'écrit couleur, alpha, rotation, échelle ou position.</summary>
        internal static List<string> G10(IEnumerable<(string rel, string source)> sources, IEnumerable<string> admis, IEnumerable<string> coroutinesAdmises)
        {
            var v = new List<string>();
            var vus = new List<string>();
            var cor = new HashSet<string>(coroutinesAdmises);
            foreach ((string rel, string source) in sources)
            {
                if (rel.StartsWith(DossierDuMecanisme, StringComparison.Ordinal)) continue;
                foreach (ScannerMouvement.Methode m in ScannerMouvement.Methodes(source))
                {
                    string cle = rel + ":" + m.Nom;
                    if (!m.Coroutine) { vus.Add(cle); continue; }
                    List<string> ecritures = ScannerMouvement.EcrituresVisuelles(m.Corps);
                    if (ecritures.Count > 0 && !cor.Contains(cle))
                        v.Add("G10 " + cle + " : une coroutine écrit du visuel (" + string.Join(", ", ecritures.Distinct()) + ") — l'animation passe par la régie");
                }
            }
            var attendus = new HashSet<string>(admis);
            foreach (string cle in vus.Distinct().Where(c => !attendus.Contains(c)))
                v.Add("G10 " + cle + " : un Update/LateUpdate hors de la liste fermée du design §10 — l'animation passe par la régie");
            foreach (string cle in attendus.Where(c => !vus.Contains(c)))
                v.Add("G10 " + cle + " : nommé dans la liste fermée mais absent du code — la liste ne fait que rétrécir, la retirer");
            return v;
        }

        [Test]
        public void G10_LaListeFermee_DesUpdateEtDesCoroutinesVisuelles_Tient()
        {
            List<(string rel, string source)> sources = LesSources();
            List<string> v = G10(sources, UpdateAdmis, CoroutinesVisuellesAdmises);
            Assert.IsEmpty(v, string.Join("\n", v));

            // anti-vacuité : le lecteur a lu l'arbre ET trouvé ce qu'il doit trouver
            Assert.Greater(sources.Count, 150, "le balayage a lu les sources de Assets/Scripts");
            int coroutines = sources.Where(s => !s.rel.StartsWith(DossierDuMecanisme, StringComparison.Ordinal))
                .Sum(s => ScannerMouvement.Methodes(s.source).Count(m => m.Coroutine));
            Assert.Greater(coroutines, 100, "les coroutines des écrans sont VUES (362 mesurées) : « aucune n'écrit du visuel » n'est pas vrai par aveuglement");
            // …et l'exclusion de `Mouvements/` est une décision, pas un angle mort : la régie y a bien son `Update`
            string regie = sources.First(s => s.rel == DossierDuMecanisme + "Regie.cs").source;
            Assert.IsTrue(ScannerMouvement.Methodes(regie).Any(m => !m.Coroutine && m.Nom == "Update"), "`Regie.Update` : le SEUL Update du mécanisme");
        }

        [Test]
        public void G10_ControlesNegatifs_UnUpdateNeuf_UneCoroutineVisuelle_UneListeMorte()
        {
            const string utile = "using System.Collections;\nnamespace X { class C {\n";
            string[] aucuneCoroutine = new string[0];

            // un Update neuf qui écrit une couleur, dans un fichier hors liste : rouge
            var fautif = new[] { ("Shell/Neuf.cs", utile + "private void Update() { image.color = c; }\n} }") };
            List<string> v = G10(fautif, new string[0], aucuneCoroutine);
            Assert.AreEqual(1, v.Count, string.Join("\n", v));
            StringAssert.Contains("Shell/Neuf.cs:Update", v[0]);

            // le même Update, dans un fichier NOMMÉ par la liste : admis
            Assert.IsEmpty(G10(new[] { ("Shell/AppShell.cs", utile + "private void Update() { image.color = c; }\n} }") }, new[] { "Shell/AppShell.cs:Update" }, aucuneCoroutine));

            // un LateUpdate à corps-expression, un FixedUpdate : vus
            Assert.AreEqual(2, G10(new[] { ("A.cs", utile + "void LateUpdate() => Caler();\nvoid FixedUpdate() { }\n} }") }, new string[0], aucuneCoroutine).Count);

            // une liste fermée qui nomme un Update disparu : rouge (elle ne fait que rétrécir)
            List<string> morte = G10(new[] { ("A.cs", utile + "void Autre() { }\n} }") }, new[] { "Shell/Disparu.cs:Update" }, aucuneCoroutine);
            Assert.AreEqual(1, morte.Count);
            StringAssert.Contains("absent du code", morte[0]);

            // une coroutine qui écrit alpha, rotation, échelle, position : rouge ; une coroutine réseau : verte
            foreach (string ecriture in new[] { "groupe.alpha = 1f - t;", "r.localEulerAngles = Vector3.zero;", "r.localScale *= 2f;", "r.anchoredPosition = p;", "img.color = Color.red;", "r.Rotate(0, 0, 1);" })
            {
                List<string> c = G10(new[] { ("Shell/Fondu.cs", utile + "IEnumerator Fondu() { yield return null; " + ecriture + " }\n} }") }, new string[0], aucuneCoroutine);
                Assert.AreEqual(1, c.Count, ecriture + " : " + string.Join("\n", c));
            }
            Assert.IsEmpty(G10(new[] { ("Shell/Reseau.cs", utile + "IEnumerator Charger() { yield return client.Lire(x => Donnees = x); Etat = 3; Debug.Log(\"color = rouge\"); if (a == b) { } }\n} }") }, new string[0], aucuneCoroutine),
                "une coroutine sans écriture visuelle (la chaîne ne compte pas, le `==` non plus)");
            // …et une coroutine NOMMÉE par la liste des admises est admise
            Assert.IsEmpty(G10(new[] { ("Shell/Fondu.cs", utile + "IEnumerator Fondu() { groupe.alpha = 0f; yield return null; }\n} }") }, new string[0], new[] { "Shell/Fondu.cs:Fondu" }));

            // ce qui n'est pas une méthode du moteur : un commentaire, une chaîne, une surcharge à paramètre, un appel, une déclaration sans corps
            const string leurre = "// void Update() { a.color = b; }\nstring s = \"void Update() { }\"; char ouvrante = '{'; void Update(float dt) { }\n"
                                  + "interface I { IEnumerator Plus(); }\nvoid M() { Update(); }\n";
            Assert.IsEmpty(G10(new[] { ("B.cs", utile + leurre + "} }") }, new string[0], aucuneCoroutine), "rien de tout cela n'est un Update ni une coroutine à corps");
            // le littéral de caractère `'}'` ne ferme pas le corps trop tôt : l'écriture qui le SUIT, dans la même coroutine, est vue
            List<string> apres = G10(new[] { ("C.cs", utile + "IEnumerator F() { char c = '}'; x.alpha = 0f; yield break; }\n} }") }, new string[0], aucuneCoroutine);
            Assert.AreEqual(1, apres.Count, "le `'}'` n'a pas fermé le corps trop tôt : " + string.Join("\n", apres));
            // une écriture dans le TEXTE d'une chaîne n'en est pas une
            Assert.IsEmpty(G10(new[] { ("D.cs", utile + "IEnumerator F() { Debug.Log(\"x.alpha = 0f; r.color = c\"); yield break; }\n} }") }, new string[0], aucuneCoroutine));
        }

        [Test]
        public void G10_LaMinuterieDuBandeau_ResteUneCoroutine_QuiNEcritPlusRien()
        {
            // §9/§10 — la minuterie du bandeau est conservée (l'attente n'est pas une animation) ; son fondu est la piste `bandeau.sortie`
            string source = File.ReadAllText(Path.Combine(Racine, "Shell", "BandeauEphemere.cs"));
            ScannerMouvement.Methode minuterie = ScannerMouvement.Methodes(source).First(m => m.Coroutine && m.Nom == "Effacement");
            Assert.IsEmpty(ScannerMouvement.EcrituresVisuelles(minuterie.Corps), "la minuterie n'écrit plus d'alpha");
            StringAssert.Contains("CatalogueHud.BandeauSortie", minuterie.Corps, "le fondu est une `Transitionner` du catalogue");
            // contrôle négatif : l'ancien corps (le fondu à la main) est vu
            const string ancien = "IEnumerator Effacement(float d) { yield return new WaitForSecondsRealtime(d); for (float t = 0f; t < FonduS; t += Time.unscaledDeltaTime) { groupe.alpha = 1f - t / FonduS; yield return null; } }";
            Assert.IsNotEmpty(ScannerMouvement.EcrituresVisuelles(ScannerMouvement.Methodes("class C {\n" + ancien + "\n}")[0].Corps));
        }

        [Test]
        public void AmbientPulseLoop_EstSupprime_LeTypeEtSonMeta()
        {
            // dette 8 / §9 : le type est SUPPRIMÉ (et son .meta) ; aucune assembly ne le porte plus
            Assert.IsFalse(File.Exists(Path.Combine(Racine, "CityMap", "AmbientPulseLoop.cs")));
            Assert.IsFalse(File.Exists(Path.Combine(Racine, "CityMap", "AmbientPulseLoop.cs.meta")));
            var types = AppDomain.CurrentDomain.GetAssemblies().SelectMany(a =>
            {
                try { return a.GetTypes(); }
                catch (System.Reflection.ReflectionTypeLoadException e) { return e.Types.Where(t => t != null); }
            });
            Assert.IsFalse(types.Any(t => t.Name == "AmbientPulseLoop"), "plus aucun type de ce nom");
            Assert.IsTrue(types.Any(t => t.Name == "Gyrophare"), "anti-vacuité : le balayage voit les types de CityMap");
        }

        // ------------------------------------------------------------------------------------------ G6

        /// <summary>G6 : la violation d'une piste (entrée, cible), ou null. Un `TMP_Text` ne porte que de l'`Alpha` (un `CanvasGroup`
        /// le fond) ; une rotation, un mélange de couleur, une échelle, un éclat sur un texte sont refusés.</summary>
        internal static string G6(Entree e, RectTransform cible)
        {
            if (e == null || cible == null || cible.GetComponent<TMP_Text>() == null) return null;
            foreach (Canal c in e.Mouvement.Canaux)
                if (c.P != Propriete.Alpha) return "G6 " + e.Id + " : un canal " + c.P + " sur un texte (" + cible.name + ") — seul l'Alpha convient à un TMP_Text";
            return null;
        }

        /// <summary>G6 sur toutes les pistes vivantes de la régie.</summary>
        internal static List<string> G6(Regie regie, out int pistes)
        {
            var v = new List<string>();
            pistes = 0;
            for (int i = 0; i < MouvementTunables.PistesMax; i++)
            {
                if (!regie.Inspecter(i, out Entree e, out RectTransform cible)) continue;
                pistes++;
                string f = G6(e, cible);
                if (f != null) v.Add(f);
            }
            return v;
        }

        private RectTransform Texte(string nom)
        {
            var go = new GameObject(nom, typeof(RectTransform), typeof(TextMeshProUGUI));
            montes.Add(go);
            return (RectTransform)go.transform;
        }

        [Test]
        public void G6_UnCanalAutreQueAlpha_SurUnTexte_Rouge_ControleNegatif()
        {
            Regie regie = RegieMouvement.PourTest();
            RectTransform titre = Texte("titre"), legende = Texte("legende"), mot = Texte("mot");
            var image = new GameObject("image", typeof(RectTransform), typeof(Image));
            montes.Add(image);

            // la régie ACCEPTE ces attachements (c'est la garde de test qui les refuse : ShellContracts ne voit pas TextMeshPro)
            Assert.IsFalse(regie.Attacher(CatalogueHud.Pouls, titre, Reglage.Defaut).EstNul, "Alpha sur un texte : admis, et conforme");
            Assert.IsFalse(regie.Attacher(CatalogueHud.Tremble, legende, Reglage.Defaut).EstNul, "Rotation sur un texte : la régie le laisse faire…");
            Assert.IsFalse(regie.Transitionner(CatalogueHud.FiletVirage, mot, 0f, 1f).EstNul, "Melange sur un texte : …et celui-là aussi");
            Assert.IsFalse(regie.Attacher(CatalogueHud.Tremble, (RectTransform)image.transform, Reglage.Defaut).EstNul);

            List<string> v = G6(regie, out int pistes);
            Assert.AreEqual(4, pistes);
            Assert.AreEqual(2, v.Count, string.Join("\n", v));
            Assert.IsTrue(v.Exists(x => x.Contains("chrome.tremble") && x.Contains("legende")), "la rotation sur un texte");
            Assert.IsTrue(v.Exists(x => x.Contains("chrome.filet.virage") && x.Contains("mot")), "le mélange sur un texte");
            Assert.IsFalse(v.Exists(x => x.Contains("titre")), "contrôle positif : l'Alpha sur un texte passe");
            Assert.IsFalse(v.Exists(x => x.Contains("image")), "…et une rotation sur une image aussi : seuls les TEXTES sont gardés");
            Assert.IsNull(G6(null, null));
        }

        [Test]
        public void G6_LesSurfacesDeE2a_PortentSeulementDeLAlphaSurUnTexte()
        {
            // les consommateurs réels d'E2a, montés sur une régie de test : le chrome en descente dans une ville qui brûle (pouls ×2,
            // tremble, virages du filet et de l'anneau), le gyrophare, les boucles ambiantes du ①
            Regie regie = RegieMouvement.PourTest();
            var barreGo = new GameObject("TopBar", typeof(RectTransform));
            montes.Add(barreGo);
            var barre = barreGo.AddComponent<TopBarController>();
            barre.SetCitywideHeatBucket("BURNING");
            barre.SetDescente(true);
            Assert.AreEqual(5, regie.PistesVivantes, "pouls ×2, tremble, virage du filet, virage de l'anneau");

            var scene = new GameObject("Scene", typeof(RectTransform));
            montes.Add(scene);
            var fond = new GameObject("Fond", typeof(RectTransform));
            fond.transform.SetParent(scene.transform, false);
            var art = new Texture2D(1080, 1920) { name = "VERGE_D_NUIT_FINAL" };
            montes.Add(art);
            Assert.IsNotNull(Gyrophare.Poser((RectTransform)scene.transform, (RectTransform)fond.transform, art, 2f));
            Assert.AreEqual(6, regie.PistesVivantes, "+ la lueur du gyrophare");

            var host = new GameObject("DistrictHost", typeof(RectTransform));
            montes.Add(host);
            var diorama = host.AddComponent<DistrictInteriorScreenController>();
            var immeuble = new DistrictInteriorBuildingDto
            {
                building = "b-0", block_id = 0, operational_type = "lab", conversion_band = "OPERATIONAL", shell_state = "STANDING",
                condition_band = "SOUND", revenue_band = "EARNING", revenue_chain = "WIRED", activity_band = "ACTIVE",
                lapse_phase_bucket = "CRITICAL", maintenance_in_progress = false,
            };
            diorama.Render(new DistrictInteriorDto
            {
                district = "district-1", district_id = 1, profile = "lattice", name_canonical = "Test", bank_side = "north",
                grid = new DistrictInteriorGridDto { width = 1, height = 1 },
                blocks = new[] { new DistrictInteriorBlockDto { block_id = 0, x = 0, y = 0 } },
                buildings = new[] { immeuble }, day_phase = "NIGHT",
            });
            if (diorama.ScreenRoot != null) montes.Add(diorama.ScreenRoot.gameObject);
            Assert.AreEqual(3, diorama.ActiveAmbientLoopCount, "néon, fumée, scintillement");
            Assert.AreEqual(9, regie.PistesVivantes, "+ les trois boucles ambiantes");

            List<string> v = G6(regie, out int pistes);
            Assert.AreEqual(regie.PistesVivantes, pistes, "G6 a lu TOUTES les pistes vivantes");
            Assert.IsEmpty(v, string.Join("\n", v));
        }
    }
}
