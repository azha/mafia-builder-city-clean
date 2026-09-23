using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Account.Profile;
using MafiaCleanCity.Account.Settings;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Onboarding;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // ⑲ LES RÉGLAGES (23/09, inventaire de l'atelier 35 `d9b57e55`) — trois éléments SERVIS et DESSINÉS par la porte ratifiée (le Profil,
    // série 6, cadres 95-97), branchés :
    //   S1  « On vous explique encore » : la MÊME bascule que ㉕ (`BasculeTutoriels`), test de VALEUR sur les DEUX états
    //   S2  « Dire mes prix au marché » : `meta_market_visibility_enabled`, les DEUX états, et la valeur envoyée au toucher
    //   S3  « Fermer le coffre » est VIVANT (plus « Se déconnecter — pas encore ») ; « Fermer partout » et « Tout effacer » restent
    //       éteints (L11, L10 : le back ne les sert pas) ; « La langue de la maison » (D14)
    //   S4  forme G : `meta_market_visibility_enabled`, `visibilityEnabled` et `signed_out` sont DÉCLARÉS (JsonUtility les lit)
    [Category("Reglages")]
    public class ReglagesPlayModeTests
    {
        private readonly List<GameObject> montes = new List<GameObject>();

        [TearDown]
        public void TearDown()
        {
            I18nCatalog.Oublier();
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
        }

        private SettingsScreenController Ecran(bool optOut, bool marche)
        {
            var go = new GameObject("Reglages", typeof(RectTransform));
            montes.Add(go);
            var e = go.AddComponent<SettingsScreenController>();
            e.RendrePourTest(new ProfilData { locale = "fr", meta_market_visibility_enabled = marche },
                             new TutorielData { tutorials_opt_out = optOut });
            return e;
        }

        private static Button Ligne(Component e, string nom) =>
            e.GetComponentsInChildren<Transform>(true).First(t => t.name == nom).GetComponent<Button>();

        private static string[] Textes(Component c) =>
            c.GetComponentsInChildren<TextMeshProUGUI>(true).Select(t => t.text).ToArray();

        [Test]
        public void S1_LaBasculeDesTutoriels_LaMemeQueCelleDe25_LesDeuxEtats()
        {
            foreach (bool optOut in new[] { false, true })
            {
                SettingsScreenController e = Ecran(optOut, true);
                Assert.AreEqual(MafiaCleanCity.Shell.BasculeTutoriels.Allumee(optOut), e.BasculeTutorielsAffichee,
                    "la même inversion que ㉕, par le même lieu");
                Assert.AreEqual(!optOut, e.BasculeTutorielsAffichee, $"opt-out {optOut} : bascule {(optOut ? "éteinte" : "allumée")}");
                CollectionAssert.Contains(Textes(e), "On vous explique encore");
                Ligne(e, "Bascule_Tutoriels").onClick.Invoke();
                Assert.AreEqual(!optOut, e.DernierOptOutDemande, $"opt-out {optOut} : le toucher envoie tutorials_opt_out = {!optOut}");
            }
        }

        [Test]
        public void S2_DireMesPrixAuMarche_LesDeuxEtats()
        {
            foreach (bool visible in new[] { true, false })
            {
                SettingsScreenController e = Ecran(false, visible);
                Assert.AreEqual(visible, e.BasculeMarcheAffichee, $"meta_market_visibility_enabled {visible} : bascule {visible}");
                CollectionAssert.Contains(Textes(e), "Dire mes prix au marché");
                Ligne(e, "Bascule_Marche").onClick.Invoke();
                Assert.AreEqual(!visible, e.DerniereVisibiliteDemandee, $"visible {visible} : le toucher envoie enabled = {!visible}");
            }
        }

        [Test]
        public void S3_FermerLeCoffreEstVivant_LesGestesNonServisRestentEteints()
        {
            SettingsScreenController e = Ecran(false, true);
            string[] t = Textes(e);
            CollectionAssert.Contains(t, "Fermer le coffre", "le mot RATIFIÉ (cadres 95-96)");
            CollectionAssert.Contains(t, "cette session seulement");
            Assert.IsFalse(t.Any(x => x.Contains("Se déconnecter") || x.Contains("la session se ferme avec l'appareil")),
                "« Se déconnecter — pas encore » était FAUX : `POST /v1/auth/signout` existe");
            Assert.IsFalse(t.Any(x => x.Contains("Les autres préférences")), "les deux préférences servies sont branchées");
            CollectionAssert.Contains(t, "Fermer partout", "L11 : dessiné, NON servi — éteint, dit vrai");
            CollectionAssert.Contains(t, "Tout effacer", "L10 : dessiné, NON servi — éteint, dit vrai");
            CollectionAssert.Contains(t, "La langue de la maison", "D14 : le mot ratifié, plus « LA LANGUE »");
            Assert.IsFalse(t.Contains("LA LANGUE"));

            Ligne(e, "FermerLeCoffre").onClick.Invoke();
            Assert.IsTrue(e.DeconnexionDemandee, "le geste part");
            Assert.IsFalse(e.CoffreFerme, "sans réponse `signed_out: true`, le coffre n'est PAS dit fermé (garde de valeur)");
        }

        [Test]
        public void S4_FormeG_LesChampsServisSontDeclares()
        {
            ProfilData vrai = JsonUtility.FromJson<ProfilEnvelope>(
                "{\"payload\":{\"data\":{\"locale\":\"fr\",\"meta_market_visibility_enabled\":true}}}").payload.data;
            ProfilData faux = JsonUtility.FromJson<ProfilEnvelope>(
                "{\"payload\":{\"data\":{\"locale\":\"fr\",\"meta_market_visibility_enabled\":false}}}").payload.data;
            Assert.IsTrue(vrai.meta_market_visibility_enabled, "servi VRAI ⇒ lu VRAI (déclaré : JsonUtility ne le jette plus)");
            Assert.IsFalse(faux.meta_market_visibility_enabled);
            Assert.IsTrue(JsonUtility.FromJson<VisibiliteEnvelope>("{\"payload\":{\"data\":{\"visibilityEnabled\":true}}}").payload.data.visibilityEnabled);
            Assert.IsTrue(JsonUtility.FromJson<SortieEnvelope>("{\"payload\":{\"data\":{\"signed_out\":true}}}").payload.data.signed_out);
            Assert.IsFalse(JsonUtility.FromJson<SortieEnvelope>("{\"payload\":{\"data\":{}}}").payload.data.signed_out,
                "un corps sans `signed_out` n'est pas une sortie : la garde de valeur du client le refuse");
        }
    }
}
