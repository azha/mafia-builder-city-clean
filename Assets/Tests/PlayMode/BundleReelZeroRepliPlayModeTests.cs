using System.Collections;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational.Lieutenant;
using MafiaCleanCity.Tests;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>§F-3 (4) — ⑧ monté avec le BUNDLE RÉEL demande-t-il des clés que le back sert ?
    ///
    /// ⛔ POURQUOI CETTE GARDE NE PEUT PAS ÊTRE UNE CAPTURE. Le contrat de `Libelle.De` est de
    /// rendre le LITTÉRAL quand la clé manque. Un écran dont aucune clé n'est servie et un écran
    /// dont toutes le sont affichent donc EXACTEMENT le même texte français, le même nombre de
    /// pixels valides, le même vert. *Un défaut sans symptôme ne se photographie pas — il se
    /// compte.* D'où les compteurs de `Libelle` et cette garde, qui exige ZÉRO repli.
    ///
    /// ⛔⛔ ET LE DÉFAUT QU'ELLE A TROUVÉ EN NAISSANT : ⑧ employait `Libelle` sans jamais AMORCER
    /// le dictionnaire. Ses 71 clés retombaient donc toutes sur leur littéral, quoi que le back
    /// serve — la conversion de §F-2 était exacte et sans le moindre effet. *Convertir et amorcer
    /// sont deux gestes ; le premier seul coche l'audit et laisse l'écran où il était.*</summary>
    [Category("BundleReel")]
    public class BundleReelZeroRepliPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private static int seq;
        private GameObject hote;

        [SetUp]
        public void SetUp()
        {
            // ⛔ L'ÉTAT STATIQUE SE REND AVANT ET APRÈS. Les suites PlayMode de ce dépôt tournent
            // SÉRIELLES dans UN processus : sans remise à zéro, cet écran compterait les replis de
            // son voisin, et le verdict dépendrait de l'ordre des tests — un rouge ou un vert
            // fabriqué par la co-tenance, exactement ce que ce dépôt a déjà payé.
            Libelle.RemettreLesCompteurs();
            I18nCatalog.Oublier();
        }

        [TearDown]
        public void TearDown()
        {
            Libelle.RemettreLesCompteurs();
            I18nCatalog.Oublier();
            if (hote != null) Object.Destroy(hote);
            hote = null;
        }

        /// <summary>⚠️ CE `SignUp` EST DÉLIBÉRÉ, et il n'écrase l'identité de personne — précision
        /// à écrire, parce que la session B vient de mesurer que quatre suites voisines écrasaient
        /// l'identité par défaut du shell (`operational_demo@example.test`) en signant un compte
        /// frais, et que leur correctif était une SUPPRESSION.
        /// ⇒ La différence est structurelle : cette suite ne monte PAS sous le shell. Elle
        ///   instancie l'écran seul et lui donne un jeton, parce qu'elle mesure les REPLIS de
        ///   `Libelle`, une propriété indépendante du compte (les clés sont les mêmes pour tous).
        ///   Il n'y a donc aucune identité juste à préserver ici — il n'y a pas de shell.
        /// ⇒ *La même ligne est un défaut dans une suite de capture et une nécessité dans une
        ///   suite de mesure : ce qui les sépare, c'est de savoir s'il existe un shell dont on
        ///   écrase le choix.*</summary>
        private IEnumerator MonterAvecBundleReel(System.Action<LieutenantScreenController> apres)
        {
            var auth = new MafiaCleanCity.CityMap.AuthClient { BaseUrl = BaseUrl };
            string jeton = null, err = null;
            yield return auth.SignUp(SeederSupport.SafeCallsign("f3", ref seq), "bundle-reel-pw",
                                     t => jeton = t, e => err = e);
            Assert.IsNull(err, $"signup a échoué : {err}");
            Assert.IsNotNull(jeton, "signup n'a pas rendu de jeton");

            // ⛔⛔ LE DICTIONNAIRE AVANT LA CONSTRUCTION, ET LES COMPTEURS À ZÉRO ENTRE LES DEUX (23/09).
            // L'hôte était ACTIF : `Start` → `BuildLayout` partait pendant que le bundle se chargeait, et les
            // compteurs n'étaient remis à zéro qu'APRÈS — tout libellé bâti à la construction (les boutons, les
            // titres de section : 41 sites / 35 clés de ⑥, mesurés) échappait donc à la garde, qui ne voyait que
            // les ~60 appels rejoués par `RendreTousLesLibelles`. Trou nommé en posant les gestes de ㉔ : leurs
            // trois clés n'étaient demandées par AUCUNE garde de catalogue.
            // ⇒ Hôte INACTIF jusqu'au bundle chargé (c'est l'ordre du jeu : le shell amorce le catalogue avant de
            //   monter un locataire — `CatalogueAvantMontagePlayModeTests`), compteurs à zéro, PUIS activation.
            //   Rien ne change dans le code de l'écran ni dans son rendu en jeu : seul l'ordre de CE montage change.
            hote = new GameObject("EcranSignerLOrdre", typeof(RectTransform));
            hote.SetActive(false);
            var ecran = hote.AddComponent<LieutenantScreenController>();
            ecran.SetToken(jeton);
            yield return ecran.AmorcerLeDictionnaire();

            // Le dictionnaire DOIT être chargé — sinon « 0 repli » serait faux pour la raison
            // inverse (aucune clé demandée), et la garde certifierait le vide.
            Assert.IsTrue(I18nCatalog.Charge, "le bundle n'a pas été chargé — la mesure qui suit ne vaut rien");
            Assert.Greater(I18nCatalog.NbClesServies, 400,
                $"le bundle ne sert que {I18nCatalog.NbClesServies} clés ; la pile dev n'a pas l'image à jour");
            Libelle.RemettreLesCompteurs();
            hote.SetActive(true);   // Start → BuildLayout (+ Boot : dictionnaire, roster) — COMPTÉS contre le bundle chargé
            for (int i = 0; i < 10; i++) yield return null;
            apres(ecran);
        }

        [UnityTest]
        public IEnumerator BundleReel_EcranSignerLOrdre_ZeroRepli()
        {
            LieutenantScreenController ecran = null;
            yield return MonterAvecBundleReel(e => ecran = e);

            // ⛔ LA CONSTRUCTION DOIT AVOIR ÉTÉ COMPTÉE — sinon la garde redevient celle d'avant (le rejeu seul), en
            //    silence. Mesuré AVANT le rejeu : si `BuildLayout` avait tourné avant la remise à zéro, ce serait ~0.
            int appelsConstruction = Libelle.NbAppels;
            Assert.Greater(appelsConstruction, 30,
                $"seulement {appelsConstruction} clés demandées par la CONSTRUCTION de l'écran — elle a tourné hors " +
                "de la mesure, et les libellés bâtis (boutons, titres) échappent de nouveau à la garde");

            ecran.RendreTousLesLibelles();   // rejoue chaque résolveur de l'écran — S'AJOUTE à la construction
            yield return null;

            // ⛔ PLANCHER ANTI-VACUITÉ D'ABORD. « 0 repli » est trivialement vrai sur un écran qui
            // n'a demandé AUCUNE clé — c'est l'état d'un écran qui ne s'est pas construit. La
            // garde de zéro ne vaut que couplée à un plancher d'APPELS.
            Assert.Greater(Libelle.NbAppels - appelsConstruction, 30,
                $"seulement {Libelle.NbAppels - appelsConstruction} clés demandées par le REJEU — l'écran n'a pas rejoué ses résolveurs, " +
                "et l'assertion de zéro qui suit serait vraie À VIDE");

            // ⛔ ZÉRO repli HORS DE LA DETTE DATÉE — la MÊME que `ZeroRepliDesLocatairesPlayModeTests.DetteDatee` (une seule source) :
            //    les clés de ⑦ encore non servies (mesurées contre e7f52351, 23/09) y sont inscrites et datées ; toute AUTRE clé en
            //    repli rougit, nommée. Avant ⑦, cet écran ne demandait que des clés servies, d'où le zéro strict d'origine.
            var horsDette = Libelle.ClesEnRepli.Where(k => !ZeroRepliDesLocatairesPlayModeTests.DetteDatee.Contains(k)).OrderBy(k => k).ToList();
            Assert.IsEmpty(horsDette,
                $"{horsDette.Count} clé(s) hors de la dette datée sont retombées sur leur littéral (sur {Libelle.NbAppels} demandées) : " +
                string.Join(" · ", horsDette) + ". Le back ne les sert pas, et l'écran l'affiche en français sans que rien ne rougisse.");
        }

        /// <summary>⛔ SANS CE TEST, LE PRÉCÉDENT NE PROUVE RIEN. Une assertion « zéro repli » est
        /// satisfaite par un compteur qui ne s'incrémente jamais, par un `Connait` qui répondrait
        /// toujours vrai, ou par un dictionnaire qui contiendrait tout. Un contrôle positif est le
        /// seul moyen de distinguer « la garde est verte » de « la garde ne sait pas rougir ».</summary>
        [UnityTest]
        public IEnumerator BundleReel_ControlePositif_UneCleAbsenteEstComptee()
        {
            LieutenantScreenController ecran = null;
            yield return MonterAvecBundleReel(e => ecran = e);

            Libelle.RemettreLesCompteurs();
            string rendu = Libelle.De("famille", "ecran", "Cette clé n'existe pas et ne doit jamais exister");
            Assert.AreEqual(1, Libelle.NbAppels, "l'appel n'a pas été compté");
            Assert.AreEqual(1, Libelle.NbReplis, "une clé ABSENTE n'a pas été comptée comme repli");
            Assert.AreEqual("Cette clé n'existe pas et ne doit jamais exister", rendu,
                "le repli doit rendre le littéral — c'est le contrat de `Libelle`");
            Assert.IsNotNull(Libelle.DernierRepli, "le rouge doit NOMMER la clé, pas seulement les compter");
            Assert.IsFalse(ZeroRepliDesLocatairesPlayModeTests.DetteDatee.Contains(Libelle.DernierRepli),
                "la clé inventée n'est pas dans la dette : la garde « hors dette » la verrait rougir");
            yield return null;
        }
    }
}
