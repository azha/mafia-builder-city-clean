using System;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.Operational.Lieutenant;
using MafiaCleanCity.Operational.Selling;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // « LA SUITE » (cadre 4 de ④, table 72 de l'atelier, 26/09) — la DÉCISION par état, hors réseau. Les mots attendus sont RECOPIÉS de
    // la table 72 (colonne fr), jamais relus du code (anti-tautologie).
    //   S1  A1 : labo au repos, sans stock, rien en route ⇒ « Le labo attend du Pyralin » · COMMANDER
    //   S2  A2 : une commande en route, pas arrivée ⇒ « Le Pyralin est en route », sans geste
    //   S3  A3 : du stock, labo au repos ⇒ « Le Pyralin est là » · CUIRE ; A3 l'emporte sur A2 (le geste avant l'attente)
    //   S4  B : aucun dealer au travail (et aucun dealer) ⇒ « Personne ne vend encore » · VOIR LA VENTE ; un dealer WORKING l'éteint
    //   S5  C : une caisse à ramasser REMPLACE B, la plus pleine d'abord, son prénom servi
    //   S6  D : tous les lieutenants sans règle (et au moins un) ⇒ « Vos lieutenants attendent une consigne » · ÉCRIRE UNE RÈGLE
    //   S7  le bloc : ordre A · B|C · D, au plus 3 ; disparaît avec une carte de tête, au palier 2, palier inconnu, rien de vrai
    //   S8  une lecture manquée n'affirme rien ; un précurseur hors domaine ne s'écrit jamais brut
    //   S9  les gestes ouvrent PAR LE SHELL : ㉚, ② (avec le labo), ㉟, ⑧
    //   S10 le panneau : premier geste doré, A2 sans bouton, rien de vrai ⇒ rien de rendu et `Rendue(false)`
    //   S12 UNE seule définition du rang de charge (`ChargeDePlanque.Rang`) dans Assets/Scripts ; LaSuite et ㊵ y délèguent ;
    //       contrôle positif : une copie fabriquée est vue
    //   S11 table 76, ligne E : planque LOW à HIGH ⇒ « De l'argent attend » ; FULL ⇒ « La planque est pleine » ET la ligne C se retire
    //       (épinglé sur la valeur servie) ; EMPTY, hors domaine, non lue ⇒ rien ; ordre A · B|C · E · D, au plus 3 ; geste ㊵
    [Category("LaSuite")]
    public class LaSuitePlayModeTests
    {
        [SetUp] public void SetUp() => MafiaCleanCity.I18n.I18nCatalog.Oublier();
        [TearDown] public void TearDown() => MafiaCleanCity.I18n.I18nCatalog.Oublier();

        private static EtatDeLaSuite Neuf() => new EtatDeLaSuite
        {
            Palier = 1, LaboId = "labo-1", Cuisson = "IDLE", PrecurseurType = "PYRALIN", Stock = "NONE",
            Dealers = new DealerDto[0],
            Lieutenants = new[] { new RosterRow { lieutenant_id = "lt-1", name = "Lt. Tull", rule_count_band = "NONE" } },
        };

        private static List<string> Ids(EtatDeLaSuite e) => LaSuite.Lignes(e).Select(l => l.Id).ToList();

        [Test]
        public void S1_A1_LeLaboAttendDuPyralin_Commander()
        {
            LigneDeLaSuite a = LaSuite.Lignes(Neuf()).First();
            Assert.AreEqual("A1", a.Id);
            Assert.AreEqual("Le labo attend du Pyralin", a.Titre);
            Assert.AreEqual("Sans lui, rien ne cuit.", a.Phrase);
            Assert.AreEqual(GesteDeLaSuite.Commander, a.Geste);
            Assert.AreEqual("Commander", a.MotDuGeste);
        }

        [Test]
        public void S2_A2_EnRoute_SansGeste()
        {
            EtatDeLaSuite e = Neuf(); e.CommandeEnRoute = true;
            LigneDeLaSuite a = LaSuite.Lignes(e).First();
            Assert.AreEqual("A2", a.Id);
            Assert.AreEqual("Le Pyralin est en route", a.Titre);
            Assert.AreEqual("À son arrivée, lancez la cuisson.", a.Phrase);
            Assert.AreEqual(GesteDeLaSuite.Aucun, a.Geste, "rien à faire qu'attendre");
            e.CommandeArrivee = true;
            Assert.IsFalse(Ids(e).Any(i => i.StartsWith("A")), "arrivée mais pas encore en stock : ni A1 (commande passée), ni A2");
        }

        [Test]
        public void S3_A3_LePyralinEstLa_Cuire_EtLEmporteSurA2()
        {
            EtatDeLaSuite e = Neuf(); e.Stock = "LOW";
            LigneDeLaSuite a = LaSuite.Lignes(e).First();
            Assert.AreEqual("A3", a.Id);
            Assert.AreEqual("Le Pyralin est là", a.Titre);
            Assert.AreEqual("Lancez la cuisson.", a.Phrase);
            Assert.AreEqual(GesteDeLaSuite.Cuire, a.Geste);
            Assert.AreEqual("Cuire", a.MotDuGeste);
            e.CommandeEnRoute = true;
            Assert.AreEqual("A3", LaSuite.Lignes(e).First().Id, "du stock ET une commande en route : le geste possible d'abord");
            e.Cuisson = "MID";
            Assert.IsFalse(Ids(e).Any(i => i == "A3" || i == "A1"), "une cuisson en cours éteint A1 et A3");
        }

        [Test]
        public void S4_B_PersonneNeVend_UnDealerAuTravailLEteint()
        {
            LigneDeLaSuite b = LaSuite.Lignes(Neuf()).Single(l => l.Id == "B");
            Assert.AreEqual("Personne ne vend encore", b.Titre);
            Assert.AreEqual("Un dealer sur un coin de vente, et la marchandise part.", b.Phrase);
            Assert.AreEqual(GesteDeLaSuite.VoirLaVente, b.Geste);
            Assert.AreEqual("Voir la vente", b.MotDuGeste);

            EtatDeLaSuite e = Neuf();
            e.Dealers = new[] { new DealerDto { dealer = "d1", activity_band = "IDLE", cash_band = "NONE" } };
            Assert.Contains("B", Ids(e), "un dealer au repos : personne ne vend encore");
            e.Dealers = new[] { new DealerDto { dealer = "d1", activity_band = "WORKING", cash_band = "LOW" } };
            Assert.IsFalse(Ids(e).Contains("B"), "un dealer au travail éteint B");
        }

        [Test]
        public void S5_C_LaCaisseLaPlusPleine_RemplaceB()
        {
            EtatDeLaSuite e = Neuf();
            e.Dealers = new[]
            {
                new DealerDto { dealer = "d1", name_i18n = "Mirko", activity_band = "WORKING", cash_band = "MODERATE" },
                new DealerDto { dealer = "d2", name_i18n = "Sacha", activity_band = "IDLE", cash_band = "FULL" },
            };
            List<LigneDeLaSuite> l = LaSuite.Lignes(e);
            Assert.IsFalse(l.Any(x => x.Id == "B"), "C remplace B");
            LigneDeLaSuite c = l.Single(x => x.Id == "C");
            Assert.AreEqual("La caisse de Sacha se remplit", c.Titre, "la plus pleine d'abord");
            Assert.AreEqual("Ramassez-la : elle rejoint la planque.", c.Phrase, "espace insécable de la table, à l'octet");
            Assert.AreEqual(GesteDeLaSuite.Ramasser, c.Geste);
            Assert.AreEqual("Ramasser", c.MotDuGeste);
            e.Dealers[1].cash_band = "LOW";
            Assert.AreEqual("La caisse de Mirko se remplit", LaSuite.Lignes(e).Single(x => x.Id == "C").Titre);
        }

        [Test]
        public void S6_D_TousSansRegle_EtAuMoinsUn()
        {
            LigneDeLaSuite d = LaSuite.Lignes(Neuf()).Single(l => l.Id == "D");
            Assert.AreEqual("Vos lieutenants attendent une consigne", d.Titre);
            Assert.AreEqual("Une première règle, et ils tiennent sans vous.", d.Phrase);
            Assert.AreEqual(GesteDeLaSuite.EcrireUneRegle, d.Geste);
            Assert.AreEqual("Écrire une règle", d.MotDuGeste);

            EtatDeLaSuite e = Neuf();
            e.Lieutenants = new[] { e.Lieutenants[0], new RosterRow { lieutenant_id = "lt-2", rule_count_band = "FEW" } };
            Assert.IsFalse(Ids(e).Contains("D"), "un lieutenant qui a une règle éteint D");
            e.Lieutenants = new RosterRow[0];
            Assert.IsFalse(Ids(e).Contains("D"), "sans lieutenant, personne n'attend de consigne");
        }

        [Test]
        public void S7_LeBloc_Ordre_AuPlusTrois_EtSesDisparitions()
        {
            CollectionAssert.AreEqual(new[] { "A1", "B", "D" }, Ids(Neuf()), "le joueur neuf de ux_vide_2609 : A1, B, D, dans l'ordre");
            Assert.LessOrEqual(Ids(Neuf()).Count, LaSuite.LignesAuPlus);

            EtatDeLaSuite carte = Neuf(); carte.CarteDeTete = true;
            Assert.IsEmpty(Ids(carte), "jamais au-dessus (ni à la place) d'une carte à fort levier");
            EtatDeLaSuite palier2 = Neuf(); palier2.Palier = 2;
            Assert.IsEmpty(Ids(palier2), "disparaît au palier 2");
            EtatDeLaSuite inconnu = Neuf(); inconnu.Palier = null;
            Assert.IsEmpty(Ids(inconnu), "palier non lu : rien");
            var rien = new EtatDeLaSuite
            {
                Palier = 1, LaboId = "labo-1", Cuisson = "MID", PrecurseurType = "PYRALIN", Stock = "LOW",
                Dealers = new[] { new DealerDto { dealer = "d1", activity_band = "WORKING", cash_band = "LOW" } },
                Lieutenants = new[] { new RosterRow { lieutenant_id = "lt-1", rule_count_band = "MANY" } },
            };
            Assert.IsEmpty(Ids(rien), "rien de vrai : le bloc disparaît");
            Assert.IsEmpty(LaSuite.Lignes(null));
        }

        [Test]
        public void S8_UneLectureManquee_NAffirmeRien_UnPrecurseurInconnuNonPlus()
        {
            var e = new EtatDeLaSuite { Palier = 1 };
            Assert.IsEmpty(Ids(e), "ni labo, ni dealers, ni lieutenants lus : aucune ligne (pas de « personne ne vend » sur une panne)");
            EtatDeLaSuite x = Neuf(); x.PrecurseurType = "UNOBTANIUM";
            Assert.IsFalse(Ids(x).Any(i => i.StartsWith("A")), "précurseur hors domaine : la ligne du labo se tait (jamais la valeur brute)");
            EtatDeLaSuite servi = Neuf();
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
            {
                { "building.precursor.pyralin", "§Pyr" }, { "accueil.suite.le_labo_attend_du_precurseur", "L:{precurseur}" },
            });
            Assert.AreEqual("L:§Pyr", LaSuite.Lignes(servi).First().Titre, "la clé servie de la table 72, et le nom servi du précurseur");
        }

        private sealed class NavigateurTemoin : IShellNavigator
        {
            public readonly List<Type> Montes = new List<Type>();
            public T MonterLocataireEnSurimpression<T>() where T : MonoBehaviour, IShellTenant { Montes.Add(typeof(T)); return null; }
        }

        [Test]
        public void S9_LesGestes_OuvrentParLeShell()
        {
            var nav = new NavigateurTemoin();
            LaSuitePanelController.OuvrirPar(nav, GesteDeLaSuite.Commander, "labo-1");
            LaSuitePanelController.OuvrirPar(nav, GesteDeLaSuite.Cuire, "labo-1");
            LaSuitePanelController.OuvrirPar(nav, GesteDeLaSuite.VoirLaVente, "labo-1");
            LaSuitePanelController.OuvrirPar(nav, GesteDeLaSuite.Ramasser, "labo-1");
            LaSuitePanelController.OuvrirPar(nav, GesteDeLaSuite.EcrireUneRegle, "labo-1");
            LaSuitePanelController.OuvrirPar(nav, GesteDeLaSuite.Blanchir, "labo-1");
            LaSuitePanelController.OuvrirPar(nav, GesteDeLaSuite.Cuire, null);
            LaSuitePanelController.OuvrirPar(nav, GesteDeLaSuite.Aucun, "labo-1");
            CollectionAssert.AreEqual(new[]
            {
                typeof(MafiaCleanCity.Operational.ChaineDApproScreenController),
                typeof(MafiaCleanCity.Operational.BuildingCardController),
                typeof(SellingScreenController), typeof(SellingScreenController),
                typeof(LieutenantScreenController),
                typeof(MafiaCleanCity.Operational.FiliereScreenController),
            }, nav.Montes, "㉚ · ② (avec son labo, jamais sans) · ㉟ · ㉟ · ⑧ · ㊵ — et rien pour « aucun »");
        }

        [Test]
        public void S11_LaPlanque_E_EtLaCaisseQuiSeRetireQuandElleEstPleine()
        {
            EtatDeLaSuite e = Neuf(); e.ChargePlanque = "NOMINAL";
            LigneDeLaSuite planque = LaSuite.Lignes(e).Single(l => l.Id == "E");
            Assert.AreEqual("De l’argent attend dans la planque", planque.Titre);
            Assert.AreEqual("Blanchissez-le\u00a0: il ne rapporte rien tant qu’il dort.", planque.Phrase, "insécable et apostrophe de la table 76, à l'octet");
            Assert.AreEqual(GesteDeLaSuite.Blanchir, planque.Geste);
            Assert.AreEqual("Blanchir", planque.MotDuGeste);
            CollectionAssert.AreEqual(new[] { "A1", "B", "E" }, Ids(e), "ordre A · B|C · E · D, au plus 3 : D tombe");

            // FULL : la variante, ET la caisse (C) se retire — « Ramassez-la » pousserait vers un refus.
            EtatDeLaSuite plein = Neuf();
            plein.Dealers = new[] { new DealerDto { dealer = "d1", name_i18n = "Sacha", activity_band = "WORKING", cash_band = "FULL" } };
            Assert.Contains("C", Ids(plein), "précondition : une caisse à ramasser, planque non lue");
            plein.ChargePlanque = "FULL";
            List<LigneDeLaSuite> l = LaSuite.Lignes(plein);
            Assert.IsFalse(l.Any(x => x.Id == "C"), "planque FULL (valeur servie) : la ligne C n'est pas montrée");
            LigneDeLaSuite pleine = l.Single(x => x.Id == "E-pleine");
            Assert.AreEqual("La planque est pleine", pleine.Titre);
            Assert.AreEqual("Blanchissez\u00a0: sinon, la caisse des dealers ne peut plus s’y vider.", pleine.Phrase);
            CollectionAssert.AreEqual(new[] { "A1", "E-pleine", "D" }, l.Select(x => x.Id).ToList());
            plein.ChargePlanque = "HIGH";
            Assert.Contains("C", Ids(plein), "HIGH n'est pas FULL : la caisse se ramasse encore");

            foreach (string rien in new[] { "EMPTY", "ZZZ", null })
            {
                EtatDeLaSuite x = Neuf(); x.ChargePlanque = rien;
                Assert.IsFalse(Ids(x).Any(i => i.StartsWith("E")), $"planque « {rien ?? "non lue"} » : aucune ligne E");
            }
            Assert.AreEqual(4, LaSuite.RangDeCharge("FULL"));
            Assert.AreEqual(-1, LaSuite.RangDeCharge("ZZZ"));
        }

        /// <summary>Le motif d'une DÉFINITION du rang : un aiguillage qui rend un entier pour « NOMINAL ».</summary>
        private static readonly System.Text.RegularExpressions.Regex DefinitionDuRang =
            new System.Text.RegularExpressions.Regex(@"case\s+""NOMINAL""\s*:\s*return\s+\d");

        [Test]
        public void S12_UneSeuleDefinitionDuRangDeCharge()
        {
            Assert.IsTrue(DefinitionDuRang.IsMatch("switch (c) { case \"NOMINAL\": return 2; }"), "contrôle positif : une copie fabriquée est vue");
            string racine = System.IO.Path.Combine(Application.dataPath, "Scripts");
            var sites = System.IO.Directory.GetFiles(racine, "*.cs", System.IO.SearchOption.AllDirectories)
                .Where(f => DefinitionDuRang.IsMatch(System.IO.File.ReadAllText(f)))
                .Select(System.IO.Path.GetFileName).ToList();
            CollectionAssert.AreEqual(new[] { "ChargeDePlanque.cs" }, sites,
                "la règle « planque la plus chargée » n'a qu'UNE définition ; les autres sites délèguent à ChargeDePlanque.Rang");
            foreach (string v in new[] { "EMPTY", "LOW", "NOMINAL", "HIGH", "FULL", "ZZZ", null })
                Assert.AreEqual(ChargeDePlanque.Rang(v), LaSuite.RangDeCharge(v), $"LaSuite délègue ({v ?? "null"})");
        }

        [Test]
        public void S10_LePanneau_PremierGesteDore_A2SansBouton_RienDeVraiRienDeRendu()
        {
            var hote = new GameObject("LaSuite", typeof(RectTransform));
            try
            {
                LaSuitePanelController p = hote.AddComponent<LaSuitePanelController>();
                var vus = new List<bool>();
                p.Rendue += v => vus.Add(v);

                EtatDeLaSuite e = Neuf(); e.CommandeEnRoute = true;   // A2 (sans geste), B, D
                p.Rendre(e);
                CollectionAssert.AreEqual(new[] { "A2", "B", "D" }, p.LignesRendues.Select(l => l.Id).ToList());
                Transform[] tout = hote.GetComponentsInChildren<Transform>(true);
                Assert.IsFalse(tout.Any(t => t.name.StartsWith("Geste_") && t.parent.name == "Ligne_A2"), "A2 : aucun bouton");
                Transform vente = tout.Single(t => t.name == "Geste_VoirLaVente");
                Transform regle = tout.Single(t => t.name == "Geste_EcrireUneRegle");
                Assert.AreEqual(MafiaCleanCity.Theme.DesignTokens.Current.ficheCtaOrBas, vente.GetComponent<UnityEngine.UI.Image>().color,
                    "le PREMIER geste montré est doré (A2 n'en a pas : c'est B)");
                Assert.AreNotEqual(MafiaCleanCity.Theme.DesignTokens.Current.ficheCtaOrBas, regle.GetComponent<UnityEngine.UI.Image>().color,
                    "les suivants ne le sont pas");
                var textes = hote.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true).Select(t => t.text).ToList();
                Assert.Contains("LA SUITE", textes, "l'intitulé du bloc, en capitales");
                Assert.IsEmpty(textes.Where(AccueilCanonPlayModeTests.TexteDeDeveloppeur).ToList(), "aucun texte de développeur");

                EtatDeLaSuite palier2 = Neuf(); palier2.Palier = 2;
                p.Rendre(palier2);
                Assert.IsFalse(p.Visible);
                CollectionAssert.AreEqual(new[] { true, false }, vus, "le shell apprend chaque rendu : montré, puis éteint");
            }
            finally { Object.DestroyImmediate(hote); }
        }
    }
}
