using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using MafiaCleanCity.Operational.Exceptions;

namespace MafiaCleanCity.Operational.Exceptions.Tests
{
    /// <summary>⑨/⑩ — les deux bandes qualitatives : couverture du domaine RÉEL, et refus du
    /// domaine MORT.
    ///
    /// ⛔⛔ CE QUE CES GARDES EXISTENT POUR ATTRAPER, et ce n'est pas ce qui les a fait écrire.
    /// Un juge ⊥ a signalé cinq libellés ANGLAIS sur ⑨ (`Severe · Critical`, `Moderate · Critical`,
    /// `Severe · Urgent`, la ligne méta de la bulle, le bouton d'action). En cherchant leur source
    /// on a trouvé bien pire : **cinq correspondances gravité → apparence, dans trois fichiers,
    /// commutaient sur `HIGH | MEDIUM | LOW`** — un domaine que le back n'émet JAMAIS. Elles
    /// tombaient toutes dans leur branche par défaut, à chaque carte, depuis toujours : glyphe
    /// `[?]` partout, teinte neutre partout, et un libellé qui recrachait la valeur brute.
    /// ⇒ *Une correspondance qui rend toujours son défaut ne lève aucune erreur et se relit comme
    ///   si elle marchait.* Le libellé anglais était le symptôme visible d'un codage par couleur
    ///   entièrement mort — et seul le symptôme était dans le rapport.
    ///
    /// ⇒ LA GARDE QUI MORD N'EST DONC PAS « les libellés sont français ». C'est **le domaine mort
    /// doit être REFUSÉ** : `RangGravite("HIGH")` == −1. C'est la seule assertion qui rougit si
    /// quelqu'un « élargit » la table pour accepter l'ancien domaine — ce qui la rendrait
    /// silencieuse à nouveau, exactement comme avant, et sans rien casser.</summary>
    [Category("EcranExceptions")]
    public class ExceptionBandesTests
    {
        // Le domaine MORT, celui que trois fichiers interrogeaient. Il est écrit ICI, dans le test,
        // et nulle part dans le code de production — c'est la seule copie qui doit survivre.
        private static readonly string[] DomaineMort = { "HIGH", "MEDIUM", "LOW" };

        // Les mots anglais qui atteignaient l'écran, plus ceux que les anciens replis produisaient.
        private static readonly string[] MotsAnglais =
        {
            "High", "Medium", "Low", "Unknown", "Severe", "Moderate", "Mild",
            "Critical", "Urgent", "Silent", "Watching",
        };

        [Test]
        public void LeDomaineReel_EstCeluiQueLeBackDeclare_EtIlNEstPasVide()
        {
            // PLANCHER ANTI-VACUITÉ : un domaine vide rendrait toutes les boucles ci-dessous
            // triviales, donc VERTES pour toujours. Les comptes sont ceux de
            // `exceptions.projection.service.ts:13` et `:79`, relus à la source.
            Assert.AreEqual(3, ExceptionBandes.DomaineGravite.Length,
                "la gravité a TROIS bandes au back (MILD|MODERATE|SEVERE)");
            Assert.AreEqual(4, ExceptionBandes.DomainePriorite.Length,
                "la priorité a QUATRE bandes au back (silent|watching|urgent|critical)");
        }

        [Test]
        public void ChaqueValeurDuDomaine_ARendUnLibelleFrancais_EtAucuneNEstUnMotAnglais()
        {
            var rendus = new List<string>();

            foreach (string b in ExceptionBandes.DomaineGravite)
            {
                string l = ExceptionBandes.Gravite(b);
                Assert.AreNotEqual(ExceptionBandes.Inconnue, l,
                    $"gravité « {b} » : valeur du domaine RÉEL non couverte — l'écran afficherait un "
                    + "tiret sur une carte parfaitement valide");
                rendus.Add(l);
            }
            foreach (string b in ExceptionBandes.DomainePriorite)
            {
                string l = ExceptionBandes.Priorite(b);
                Assert.AreNotEqual(ExceptionBandes.Inconnue, l, $"priorité « {b} » non couverte");
                rendus.Add(l);
            }

            foreach (string l in rendus)
                CollectionAssert.DoesNotContain(MotsAnglais, l,
                    $"« {l} » est un repli anglais, et la doctrine de l'écran n'en tolère aucun");

            // Une table qui rendrait le MÊME mot partout satisferait tout ce qui précède.
            Assert.AreEqual(rendus.Count, rendus.Distinct().Count(),
                "deux bandes rendent le même libellé : la correspondance ne discrimine plus, et "
                + "c'est le monde dégénéré que les assertions ci-dessus laissent passer");
        }

        [Test]
        public void LeDomaineMort_EstREFUSE_CestLaGardeQuiMordVraiment()
        {
            foreach (string b in DomaineMort)
            {
                Assert.AreEqual(-1, ExceptionBandes.RangGravite(b),
                    $"« {b} » appartient au domaine que le back n'émet PAS. L'accepter rendrait la "
                    + "correspondance silencieuse exactement comme elle l'était : elle aurait l'air "
                    + "de marcher et ne verrait jamais une seule carte réelle");
                Assert.AreEqual(ExceptionBandes.Inconnue, ExceptionBandes.Gravite(b),
                    $"« {b} » ne doit produire aucun libellé : un trou se montre");
            }
        }

        [Test]
        public void LeRang_DiscrimineLesTroisCrans_EtLeGlypheAvecLui()
        {
            var rangs = ExceptionBandes.DomaineGravite.Select(ExceptionBandes.RangGravite).ToList();
            CollectionAssert.AllItemsAreUnique(rangs,
                "deux gravités de même rang : la teinte et le glyphe ne peuvent plus les séparer");
            CollectionAssert.DoesNotContain(rangs, -1, "une valeur du domaine réel classée hors domaine");

            var glyphes = ExceptionBandes.DomaineGravite.Select(ExceptionBandes.Glyphe).ToList();
            CollectionAssert.AllItemsAreUnique(glyphes,
                "deux gravités partagent un glyphe — c'est le défaut mesuré, où les trois rendaient "
                + "`[?]`, et il serait invisible sur une capture d'une seule carte");
            CollectionAssert.DoesNotContain(glyphes, ExceptionBandes.Glyphe("HIGH"),
                "un cran réel rend le même glyphe que le domaine mort : le glyphe d'inconnu ne "
                + "signale plus rien");
        }

        [Test]
        public void LaCasse_NeDecidePas_LesDeuxBandesNOntPasLaMeme()
        {
            // Le back envoie la gravité en MAJUSCULES et la priorité en minuscules. S'aligner sur
            // la casse observée sur une capture serait un piège de plus.
            Assert.AreEqual(ExceptionBandes.Gravite("SEVERE"), ExceptionBandes.Gravite("severe"));
            Assert.AreEqual(ExceptionBandes.Priorite("critical"), ExceptionBandes.Priorite("CRITICAL"));
            Assert.AreEqual(ExceptionBandes.Gravite("SEVERE"), ExceptionBandes.Gravite(" SEVERE "),
                "un espace parasite dans une valeur serveur ne doit pas vider la pastille");
        }

        [Test]
        public void UneBandeAbsente_RendUnTiret_JamaisUnMot()
        {
            foreach (string vide in new[] { null, "", "   " })
            {
                Assert.AreEqual(ExceptionBandes.Inconnue, ExceptionBandes.Gravite(vide));
                Assert.AreEqual(ExceptionBandes.Inconnue, ExceptionBandes.Priorite(vide));
            }
            Assert.AreEqual(ExceptionBandes.Inconnue, ExceptionBandes.Gravite("bande_inventee"),
                "une valeur hors domaine ne doit pas retomber sur le cran le plus proche : "
                + "montrer le trou vaut mieux que le combler au jugé");
        }

        [Test]
        public void LaLigne_EstComposeeUneSeuleFois_AvecLeSeparateurDeLaMaquette()
        {
            Assert.AreEqual($"{ExceptionBandes.Gravite("SEVERE")} · {ExceptionBandes.Priorite("critical")}",
                            ExceptionBandes.Ligne("SEVERE", "critical"),
                            "les deux appelants de ⑨ écrivaient le séparateur chacun de leur côté ; "
                            + "une correspondance en deux exemplaires en fait diverger une");
        }
    }
}
