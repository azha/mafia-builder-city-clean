using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.Shell.Tests
{
    // ⛔⛔ CHANTIER JOIGNABILITÉ (2026-09-02) — LA GARDE QUI FERME LA CLASSE, PAS LES INSTANCES.
    //
    // Le défaut mesuré : sur les 22 `IShellTenant` du client, NEUF n'avaient aucun chemin depuis
    // le shell — construits, testés, capturés, et invisibles au joueur. Ils n'étaient pas cassés ;
    // ils n'avaient simplement PAS DE PORTE. Un inventaire de contrôleurs les compte comme livrés,
    // une suite verte les couvre, et personne ne les voit jamais.
    //
    // ⇒ Rattacher les neuf ferme NEUF INSTANCES. Le dixième écran — et il en reste ~26 au canon —
    //   rouvrira le trou exactement pareil, parce que rien dans le dépôt ne dit qu'un locataire
    //   DOIT être atteignable. C'est le motif que ce dépôt paie en boucle : *un correctif scopé au
    //   finding ne ferme jamais la classe.* D'où cette garde, écrite AVANT le rattachement.
    //
    // POURQUOI STRUCTURELLE ET PAS EN PIXELS. Ce dépôt a déjà mesuré que les gardes de VALEUR
    // (couleur, position, contraste) ratent les classes entières — quatre tours de gardes pixel
    // n'avaient pas vu « occlusion par fratrie », qu'un ordre de fratrie a fermé en 12 lignes.
    // « Ce locataire a-t-il un chemin depuis AppShell ? » ne dépend d'aucun pixel, d'aucune
    // résolution, d'aucun back : c'est une propriété du GRAPHE.
    //
    // ⚠️ CE QUE CETTE GARDE NE PROUVE PAS, ET IL FAUT LE DIRE. Elle prouve qu'un chemin EXISTE
    // dans le code, pas qu'un joueur peut le PARCOURIR (un bouton peut être hors écran, sous le
    // chrome, ou derrière une condition jamais vraie). C'est la couche 3 du socle, pas la 4 : la
    // preuve de parcours reste la capture en jeu et le jalon téléphone. Elle ne remplace rien —
    // elle empêche seulement de LIVRER une porte absente, ce qui est arrivé neuf fois.
    [Category("Joignabilite")]
    public class LocataireJoignabilitePlayModeTests
    {
        // Les TROIS formes de montage par le shell, mesurées dans l'arbre (21 + 7 + 21 occurrences)
        // et non choisies de mémoire. `AddComponent<T>` est délibérément ABSENT : c'est le repli
        // HORS shell, donc par définition pas un chemin depuis `AppShell` — l'inclure ferait passer
        // pour joignable un écran que seul un test instancie. *Viser la propriété, pas la syntaxe
        // la plus large.*
        private static readonly string[] FormesDeMontage =
        {
            "MountTenant", "ConstruireLocataire", "MonterLocataireEnSurimpression",
        };

        private const string RacineDuGraphe = "AppShell";

        // ⚠️ ALLOWLIST DES EXCEPTIONS DÉLIBÉRÉES — vide, et elle doit le rester sauf raison écrite.
        // Une entrée ici n'est pas « un écran qu'on n'a pas eu le temps de brancher » : c'est un
        // locataire dont on AFFIRME qu'il ne doit pas avoir de porte, avec le pourquoi. Sans cette
        // discipline l'allowlist devient le tapis sous lequel la classe se re-cache.
        private static readonly HashSet<string> ExceptionsDeclarees = new HashSet<string>();

        // ————— le balayage, UNE seule implémentation —————
        // Employée à la fois par la mesure réelle (Assets/Scripts) et par le contrôle positif (un
        // répertoire temporaire fabriqué). Jamais deux chemins de calcul qui pourraient diverger —
        // même discipline que ChromeTabAccentAllowlistPlayModeTests.

        /// <summary>Les cibles de montage citées par un texte : `MountTenant&lt;X&gt;()` → "X".</summary>
        internal static HashSet<string> CiblesMontees(string texte)
        {
            var cibles = new HashSet<string>();
            if (string.IsNullOrEmpty(texte)) return cibles;
            foreach (string forme in FormesDeMontage)
            {
                // `\s*` entre le nom et le chevron : la forme trouvée dans l'arbre est collée, mais
                // un reformatage la séparerait et le motif rendrait ZÉRO EN SILENCE — le mode
                // d'échec le plus courant de ce dépôt.
                foreach (Match m in Regex.Matches(texte, Regex.Escape(forme) + @"\s*<\s*([A-Za-z_][A-Za-z0-9_]*)\s*>"))
                    cibles.Add(m.Groups[1].Value);
            }
            return cibles;
        }

        /// <summary>Le type déclaré par un fichier (première `class X`), ou null.</summary>
        internal static string TypeDeclare(string texte)
        {
            Match m = Regex.Match(texte ?? "", @"\bclass\s+([A-Za-z_][A-Za-z0-9_]*)");
            return m.Success ? m.Groups[1].Value : null;
        }

        /// <summary>Ferme transitivement le graphe de montage depuis <paramref name="racine"/> et
        /// rend l'ensemble des types ATTEINTS. Un type est atteint s'il est monté par un fichier
        /// lui-même atteint — la racine étant atteinte par construction.</summary>
        internal static HashSet<string> TypesAtteints(Dictionary<string, string> sourcesParType, string racine)
        {
            var atteints = new HashSet<string>();
            var aVisiter = new Queue<string>();
            if (sourcesParType.ContainsKey(racine)) { atteints.Add(racine); aVisiter.Enqueue(racine); }
            while (aVisiter.Count > 0)
            {
                foreach (string cible in CiblesMontees(sourcesParType[aVisiter.Dequeue()]))
                    if (sourcesParType.ContainsKey(cible) && atteints.Add(cible)) aVisiter.Enqueue(cible);
            }
            return atteints;
        }

        private static Dictionary<string, string> LireSources(string racineDossier)
        {
            var parType = new Dictionary<string, string>();
            foreach (string f in Directory.GetFiles(racineDossier, "*.cs", SearchOption.AllDirectories))
            {
                string texte = File.ReadAllText(f);
                string t = TypeDeclare(texte);
                if (t != null && !parType.ContainsKey(t)) parType[t] = texte;
            }
            return parType;
        }

        // ————— la mesure réelle —————

        [Test]
        public void ToutLocataireDuShellAUnCheminDepuisAppShell()
        {
            string racineDossier = Path.Combine(Application.dataPath, "Scripts");
            Assert.IsTrue(Directory.Exists(racineDossier), $"Assets/Scripts introuvable : {racineDossier}");

            // POPULATION PAR RÉFLEXION, jamais une liste écrite à la main : un écran neuf entre
            // AUTOMATIQUEMENT dans le dénominateur. Une liste figée se périmerait au premier ajout
            // — et ce dépôt a déjà payé un balayage dont la population avait grossi sans que la
            // couverture bouge.
            List<Type> locataires = AppDomain.CurrentDomain.GetAssemblies()
                .SelectMany(a => { try { return a.GetTypes(); } catch { return Array.Empty<Type>(); } })
                .Where(t => t.IsClass && !t.IsAbstract && typeof(IShellTenant).IsAssignableFrom(t))
                .ToList();

            // ⚠️ ANTI-VACUITÉ, ET ELLE PORTE SUR LES DEUX CÔTÉS. Sans elle, un balayage qui ne
            // trouve rien (mauvais dossier, réflexion vide) rendrait « 0 orphelin » — VERT, pour
            // n'avoir rien regardé. C'est le vert de non-exécution que ce dépôt connaît par cœur.
            Assert.Greater(locataires.Count, 10,
                $"seulement {locataires.Count} IShellTenant trouvés par réflexion : le balayage ne " +
                "voit pas la population, son « 0 orphelin » ne vaudrait rien.");

            Dictionary<string, string> sources = LireSources(racineDossier);
            Assert.IsTrue(sources.ContainsKey(RacineDuGraphe),
                $"{RacineDuGraphe} introuvable dans Assets/Scripts : la racine du graphe manque, " +
                "tout serait déclaré injoignable pour la mauvaise raison.");

            HashSet<string> atteints = TypesAtteints(sources, RacineDuGraphe);
            Assert.Greater(atteints.Count, 5,
                $"seuls {atteints.Count} types atteints depuis {RacineDuGraphe} : le motif de " +
                "montage ne matche plus rien — instrument cassé, pas dépôt cassé.");

            List<string> orphelins = locataires.Select(t => t.Name)
                .Where(n => !atteints.Contains(n) && !ExceptionsDeclarees.Contains(n))
                .OrderBy(n => n, StringComparer.Ordinal).ToList();

            Assert.IsEmpty(orphelins,
                $"{orphelins.Count} locataire(s) du shell sans AUCUN chemin depuis {RacineDuGraphe} : " +
                $"[{string.Join(", ", orphelins)}].\n" +
                "Un écran sans porte est construit, testé, et invisible au joueur — c'est exactement " +
                "ce que ce chantier a trouvé neuf fois. Le rattacher (entrée du menu Plus, ou parent " +
                "qui détient sa clé d'entrée), ou l'inscrire dans ExceptionsDeclarees AVEC sa raison.\n" +
                $"(population {locataires.Count} locataires · {atteints.Count} types atteints)");
        }

        // ————— les contrôles positifs —————

        [Test]
        public void LeBalayageVoitLesTroisFormesDeMontage()
        {
            // Sans ce contrôle, un motif qui ne connaîtrait qu'UNE forme rendrait « 0 orphelin »
            // pour n'avoir vu qu'un tiers des arêtes — un vert qui CERTIFIE le défaut.
            HashSet<string> vues = CiblesMontees(
                "MountTenant<UnA>(); ConstruireLocataire<UnB>(); MonterLocataireEnSurimpression<UnC>();");
            CollectionAssert.AreEquivalent(new[] { "UnA", "UnB", "UnC" }, vues,
                "le balayage ne reconnaît pas les trois formes de montage mesurées dans l'arbre");

            // Et il ne doit PAS compter le repli hors shell : sinon un écran que seul un test
            // instancie passerait pour joignable.
            CollectionAssert.IsEmpty(CiblesMontees("AddComponent<UnD>();"),
                "AddComponent est le repli HORS shell : le compter rendrait joignable un écran sans porte");
        }

        [Test]
        public void LeBalayageDetecteUnOrphelinFabrique()
        {
            // CIBLE INERTE — une fixture fabriquée, jamais une ligne de production que quelqu'un a
            // le droit de corriger : ce dépôt a déjà vu un contrôle positif s'aveugler parce que le
            // lot avait légitimement réécrit les six lignes qu'il nommait.
            string tmp = Path.Combine(Path.GetTempPath(), "joignabilite_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tmp);
            try
            {
                File.WriteAllText(Path.Combine(tmp, "AppShell.cs"),
                    "class AppShell { void M() { MountTenant<EcranJoignable>(); } }");
                File.WriteAllText(Path.Combine(tmp, "EcranJoignable.cs"), "class EcranJoignable { }");
                File.WriteAllText(Path.Combine(tmp, "EcranOrphelin.cs"), "class EcranOrphelin { }");

                HashSet<string> atteints = TypesAtteints(LireSources(tmp), RacineDuGraphe);
                Assert.IsTrue(atteints.Contains("EcranJoignable"), "l'écran monté doit être atteint");
                Assert.IsFalse(atteints.Contains("EcranOrphelin"),
                    "l'écran sans porte doit rester HORS des atteints — sinon la garde ne peut jamais rougir");
            }
            finally { Directory.Delete(tmp, true); }
        }

        [Test]
        public void LeBalayageSuitLaTRANSITIVITE()
        {
            // Un écran monté par un écran lui-même monté est joignable. Sans transitivité, la garde
            // exigerait que TOUT passe par AppShell et rougirait sur des rattachements légitimes
            // (⑨ pend de ⑪, ⑤ pend de la carte à fort levier) — une garde qu'on ne peut satisfaire
            // qu'en cassant ce qu'elle protège se remplace, elle ne s'assouplit pas.
            string tmp = Path.Combine(Path.GetTempPath(), "transitif_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tmp);
            try
            {
                File.WriteAllText(Path.Combine(tmp, "AppShell.cs"),
                    "class AppShell { void M() { MountTenant<Parent>(); } }");
                File.WriteAllText(Path.Combine(tmp, "Parent.cs"),
                    "class Parent { void M() { MonterLocataireEnSurimpression<Enfant>(); } }");
                File.WriteAllText(Path.Combine(tmp, "Enfant.cs"), "class Enfant { }");
                File.WriteAllText(Path.Combine(tmp, "Cousin.cs"),
                    "class Cousin { void M() { MountTenant<Enfant>(); } }"); // monteur NON atteint

                HashSet<string> atteints = TypesAtteints(LireSources(tmp), RacineDuGraphe);
                Assert.IsTrue(atteints.Contains("Enfant"), "un enfant de parent atteint est atteint");
                Assert.IsFalse(atteints.Contains("Cousin"),
                    "un monteur que rien n'atteint ne doit pas s'atteindre lui-même — sinon tout " +
                    "fichier qui monte quelque chose se déclarerait joignable et la garde serait creuse");
            }
            finally { Directory.Delete(tmp, true); }
        }
    }
}
