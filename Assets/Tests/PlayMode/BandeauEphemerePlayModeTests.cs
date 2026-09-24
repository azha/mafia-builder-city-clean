using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational.Exceptions;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using Object = UnityEngine.Object;
using MafiaCleanCity.Tests;

namespace MafiaCleanCity.CityMap.Tests
{
    // ①-3 (2026-09-23, écart ① `e2bd7681` M8/D4, r9 M13/M11 ; mots de l'atelier `22-…` §7.1 C) — le bandeau éphémère :
    //   B1  UN bandeau, dans l'ordre de l'atelier : descente > la ville chauffe > la 1ʳᵉ carte > un rapport ; rien ⇒ null
    //   B2  les mots de l'atelier, mot pour mot ; le nom en or et jamais interprété ; la clé servie l'emporte
    //   B3  chaque mot du client se compte UNE fois dans les replis (le nom passe par un jeton, pas par un second appel)
    //   B4  il apparaît, ne se répète pas, s'efface seul ; la visibilité est annoncée dans les deux sens
    //   B5  le toucher fait le geste du mot en or, puis efface
    //   B6  la géométrie du canon (`top:78px`, 11,5 px, `.06em`, marges 34/7, filets `#ffffff14`) et AUCUN glyphe
    //   B7  le titre de ① se tait pendant que le bandeau parle, y compris à travers un nouveau rendu ; sa couleur ne bouge pas
    //   B8  lot F : le nom du 1ᵉʳ rapport OUVERT, garde de VALEUR (instance vide, blanc, id recopié ⇒ rien), le 1ᵉʳ seulement
    //   B9  `Suivante` : la première annonce pas encore dite, jamais moins prioritaire que celle à l'écran
    [Category("EcranDistrict")]
    public class BandeauEphemerePlayModeTests
    {
        private readonly List<GameObject> montes = new List<GameObject>();

        [TearDown]
        public void TearDown()
        {
            I18nCatalog.Oublier();
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
        }

        private static ExceptionCardDto CarteDe(string id, string lieutenantId, string nom) => new ExceptionCardDto
        {
            exception_id = id,
            lieutenant_id = lieutenantId,
            lieutenant = new ExceptionLieutenantDto { id = lieutenantId, name = nom },
        };

        private BandeauEphemere NouveauBandeau()
        {
            var racine = new GameObject("Racine", typeof(RectTransform), typeof(Canvas));
            montes.Add(racine);
            var barre = new GameObject("Barre", typeof(RectTransform));
            barre.transform.SetParent(racine.transform, false);
            ((RectTransform)barre.transform).sizeDelta = new Vector2(392f, 52f);
            return BandeauEphemere.Construire(barre.transform);
        }

        [Test]
        public void B1_UnSeulBandeau_DansLOrdreDeLAtelier()
        {
            ExceptionCardDto carte = CarteDe("e-1", "lt-1", "Sal");
            Assert.AreEqual(AnnonceDuBandeau.Etat.Descente,
                AnnonceDuBandeau.Choisir(true, "district-16", "BURNING", carte, "Rook").Quoi, "la descente passe devant tout");
            Assert.AreEqual(AnnonceDuBandeau.Etat.VilleChaude,
                AnnonceDuBandeau.Choisir(false, null, "HOT", carte, "Rook").Quoi, "la ville chaude passe devant la file");
            Assert.AreEqual(AnnonceDuBandeau.Etat.VilleChaude,
                AnnonceDuBandeau.Choisir(false, null, "BURNING", null, null).Quoi);
            Assert.AreEqual(AnnonceDuBandeau.Etat.Carte,
                AnnonceDuBandeau.Choisir(false, null, "WARM", carte, "Rook").Quoi, "tiède : la ville se tait, la carte parle");
            Assert.AreEqual(AnnonceDuBandeau.Etat.Rapport,
                AnnonceDuBandeau.Choisir(false, null, "COLD", null, "Rook").Quoi);
            Assert.IsNull(AnnonceDuBandeau.Choisir(false, null, "COLD", null, null), "rien à dire : aucun bandeau");
            Assert.IsNull(AnnonceDuBandeau.Choisir(false, null, null, new ExceptionCardDto(), " "),
                "une carte sans id (instance vide de JsonUtility) et un nom blanc ne sont rien");
        }

        [Test]
        public void B2_LesMotsDeLAtelier_LeNomEnOr_LaCleServieLEmporte()
        {
            Assert.AreEqual("La brigade quadrille le quartier — planquez la caisse",
                AnnonceDuBandeau.Choisir(true, "district-16", null, null, null).Phrase);
            AnnonceDuBandeau ville = AnnonceDuBandeau.Choisir(false, null, "HOT", null, null);
            Assert.AreEqual(ValeurAttendue.Cle("chrome.bandeau.les_indics_parlent", "Les indics parlent : la brigade s’agite"), ville.Phrase);
            Assert.IsNull(ville.MotAction, "la ville chaude n'invite à aucun geste");
            Assert.AreEqual("Sal attend vos ordres — trancher",
                AnnonceDuBandeau.Choisir(false, null, "COLD", CarteDe("e-1", "lt-1", "Sal"), null).Phrase);
            Assert.AreEqual("La ville attend vos ordres — trancher",
                AnnonceDuBandeau.Choisir(false, null, "COLD", CarteDe("e-2", "", null), null).Phrase,
                "la carte sans lieutenant : c'est la ville qui parle (⑨)");
            Assert.AreEqual("Sal a un rapport pour vous — lire",
                AnnonceDuBandeau.Choisir(false, null, "COLD", null, "Sal").Phrase);

            AnnonceDuBandeau piege = AnnonceDuBandeau.Choisir(false, null, "COLD", CarteDe("e-3", "lt-9", "<b>Kas</b>"), null);
            string or = ColorUtility.ToHtmlStringRGB(DesignTokens.Current.hudMoneyGold);
            StringAssert.Contains("<color=#" + or + "><b><noparse><b>Kas</b></noparse></b></color>", piege.PhraseRiche,
                "le nom SERVI en or (`b{color:var(--or-vif)}`), et jamais lu comme une balise");
            StringAssert.EndsWith("<color=#" + or + "><b><noparse>trancher</noparse></b></color>", piege.PhraseRiche);

            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string>
            {
                { "chrome.bandeau.attend_vos_ordres", "{nom} is waiting for your orders" },
                { "chrome.bandeau.trancher", "decide" },
            });
            Assert.AreEqual("Sal is waiting for your orders — decide",
                AnnonceDuBandeau.Choisir(false, null, "COLD", CarteDe("e-1", "lt-1", "Sal"), null).Phrase);
        }

        [Test]
        public void B3_ChaqueMotSeCompteUneFois()
        {
            Libelle.RemettreLesCompteurs();
            AnnonceDuBandeau.Choisir(false, null, "COLD", CarteDe("e-1", "lt-1", "Sal"), null);
            Assert.AreEqual(2, Libelle.NbReplis, "la phrase et le mot d'action — pas deux replis pour une phrase");
            CollectionAssert.AreEquivalent(new[] { "chrome.bandeau.attend_vos_ordres", "chrome.bandeau.trancher" },
                Libelle.ClesEnRepli.ToArray());
            Libelle.RemettreLesCompteurs();
        }

        [UnityTest]
        public IEnumerator B4_IlApparait_NeSeRepetePas_SEffaceSeul()
        {
            BandeauEphemere bandeau = NouveauBandeau();
            var vus = new List<bool>();
            bandeau.VisibiliteChangee += v => vus.Add(v);
            Assert.IsFalse(bandeau.Visible);
            Assert.IsFalse(bandeau.gameObject.activeSelf, "rien à dire : rien d'affiché");

            AnnonceDuBandeau a = AnnonceDuBandeau.Choisir(false, null, "HOT", null, null);
            Assert.IsTrue(bandeau.Annoncer(a, null, 0.2f));
            Assert.IsTrue(bandeau.Visible);
            Assert.IsTrue(bandeau.gameObject.activeInHierarchy);
            Assert.AreEqual(a.Phrase, bandeau.TexteAffiche);
            Assert.AreEqual(a.PhraseRiche, bandeau.Texte.text);
            Assert.AreEqual(1f, bandeau.Opacite, "affiché : opacité pleine (la garde d'une planche le lit)");
            Assert.IsFalse(bandeau.Annoncer(AnnonceDuBandeau.Choisir(false, null, "HOT", null, null), null, 0.2f),
                "la même annonce ne se répète pas dans la session");

            float fin = Time.realtimeSinceStartup + 3f;
            while (bandeau.Visible && Time.realtimeSinceStartup < fin) yield return null;
            Assert.IsFalse(bandeau.Visible, "il s'efface seul");
            Assert.IsFalse(bandeau.gameObject.activeSelf);
            Assert.IsNull(bandeau.TexteAffiche);
            Assert.AreEqual(0f, bandeau.Opacite, "effacé : zéro");
            CollectionAssert.AreEqual(new[] { true, false }, vus, "apparition puis effacement, annoncés une fois chacun");

            Assert.IsTrue(bandeau.Annoncer(AnnonceDuBandeau.Choisir(false, null, "BURNING", null, null), null, 5f),
                "une AUTRE annonce passe");
        }

        [Test]
        public void B5_LeToucher_FaitLeGeste_PuisEfface()
        {
            BandeauEphemere bandeau = NouveauBandeau();
            int gestes = 0;
            bandeau.Annoncer(AnnonceDuBandeau.Choisir(false, null, "COLD", CarteDe("e-1", "lt-1", "Sal"), null), () => gestes++);
            bandeau.Toucher();
            Assert.AreEqual(1, gestes, "« trancher » : le geste, une fois");
            Assert.IsFalse(bandeau.Visible);
            bandeau.Toucher();
            Assert.AreEqual(1, gestes, "effacé, il ne rejoue rien");
            Assert.IsNotNull(bandeau.GetComponent<Button>(), "le toucher passe par un bouton");
        }

        [Test]
        public void B6_LaGeometrieDuCanon_EtAucunGlyphe()
        {
            BandeauEphemere bandeau = NouveauBandeau();
            AnnonceDuBandeau a = AnnonceDuBandeau.Choisir(true, "district-16", null, null, null);
            bandeau.Annoncer(a, null);
            var rt = (RectTransform)bandeau.transform;
            Assert.AreEqual(new Vector2(0.5f, 1f), rt.anchorMin);
            Assert.AreEqual(new Vector2(0.5f, 1f), rt.pivot);
            Assert.AreEqual(-78f, rt.anchoredPosition.y, 1e-4f, "`top:78px`");
            Assert.LessOrEqual(rt.sizeDelta.x, 392f + 1e-3f, "jamais plus large que la barre");
            Assert.Greater(rt.sizeDelta.x, 68f, "le texte, plus 34 de part et d'autre");
            Assert.AreEqual(11.5f, bandeau.Texte.fontSize, 1e-4f);
            Assert.AreEqual(6f, bandeau.Texte.characterSpacing, 1e-4f, "`.06em`");
            Assert.AreEqual(DesignTokens.Current.hudCreme, bandeau.Texte.color);

            Image fond = bandeau.transform.Find("Fond").GetComponent<Image>();
            Color verre = DesignTokens.Current.hudBarGlassBottom;
            Assert.AreEqual(new Color(verre.r, verre.g, verre.b, 0xee / 255f), fond.color, "le verre, à l'alpha du canon");
            foreach (string f in new[] { "FiletHaut", "FiletBas" })
            {
                Image filet = bandeau.transform.Find(f).GetComponent<Image>();
                Assert.AreEqual(new Color(1f, 1f, 1f, 0x14 / 255f), filet.color, f + " : `#ffffff14`");
                Assert.AreEqual(1f, filet.rectTransform.sizeDelta.y, 1e-4f, f + " : 1px");
            }

            var toutes = new[]
            {
                a, AnnonceDuBandeau.Choisir(false, null, "HOT", null, null),
                AnnonceDuBandeau.Choisir(false, null, "COLD", CarteDe("e-1", "lt-1", "Sal"), null),
                AnnonceDuBandeau.Choisir(false, null, "COLD", CarteDe("e-2", "", null), null),
                AnnonceDuBandeau.Choisir(false, null, "COLD", null, "Sal"),
            };
            foreach (AnnonceDuBandeau x in toutes)
            {
                foreach (string glyphe in new[] { "[!]", "✉", "⚠", "🚨" })
                    StringAssert.DoesNotContain(glyphe, x.Phrase, "point 15 : aucun glyphe");
                Assert.IsFalse(x.Phrase.Any(char.IsDigit), "R2.2 : aucun chiffre — « " + x.Phrase + " »");
            }
        }

        private static MafiaCleanCity.Operational.Autonomy.AutonomyReportDto Rapport(string id, string ltId, string nom) =>
            new MafiaCleanCity.Operational.Autonomy.AutonomyReportDto
            {
                report_id = id, lieutenant_id = ltId,
                lieutenant = new MafiaCleanCity.Operational.Autonomy.AutonomyLieutenantDto { id = ltId, name = nom },
            };

        [Test]
        public void B8_LeNomDuPremierRapport_GardeDeValeur()
        {
            Assert.AreEqual("Sal", AnnonceDuBandeau.NomDuPremierRapport(new[] { Rapport("r-1", "lt-1", " Sal ") }, out string id));
            Assert.AreEqual("r-1", id);
            Assert.IsNull(AnnonceDuBandeau.NomDuPremierRapport(new[]
                {
                    new MafiaCleanCity.Operational.Autonomy.AutonomyReportDto
                        { report_id = "r-1", lieutenant_id = "lt-1", lieutenant = new MafiaCleanCity.Operational.Autonomy.AutonomyLieutenantDto() },
                }, out id), "l'instance VIDE de JsonUtility (champ absent, back d'avant le lot F) : rien");
            Assert.IsNull(id);
            Assert.IsNull(AnnonceDuBandeau.NomDuPremierRapport(new[] { Rapport("r-1", "lt-1", "  ") }, out _), "un nom blanc : rien");
            Assert.IsNull(AnnonceDuBandeau.NomDuPremierRapport(new[] { Rapport("r-1", "lt-1", "lt-1") }, out _),
                "un nom qui n'est que l'id recopié : rien");
            Assert.IsNull(AnnonceDuBandeau.NomDuPremierRapport(new[] { Rapport("r-1", "lt-1", ""), Rapport("r-2", "lt-2", "Rook") }, out _),
                "le 1ᵉʳ rapport, et lui seul : on ne va pas chercher un nom plus loin");
            Assert.IsNull(AnnonceDuBandeau.NomDuPremierRapport(new MafiaCleanCity.Operational.Autonomy.AutonomyReportDto[0], out _));
            Assert.IsNull(AnnonceDuBandeau.NomDuPremierRapport(null, out _));
        }

        [Test]
        public void B9_Suivante_LaPremiereNonDite_JamaisMoinsQueCelleALEcran()
        {
            List<AnnonceDuBandeau> toutes = AnnonceDuBandeau.ParPriorite(false, null, "HOT", CarteDe("e-1", "lt-1", "Sal"), "Rook", "r-9");
            CollectionAssert.AreEqual(new[] { AnnonceDuBandeau.Etat.VilleChaude, AnnonceDuBandeau.Etat.Carte, AnnonceDuBandeau.Etat.Rapport },
                toutes.Select(a => a.Quoi).ToArray(), "l'ordre de l'atelier");
            Assert.AreEqual("rapport:r-9", toutes[2].Signature, "le rapport se reconnaît à son id");
            Assert.AreEqual(toutes[0].Signature,
                AnnonceDuBandeau.Choisir(false, null, "HOT", CarteDe("e-1", "lt-1", "Sal"), "Rook", "r-9").Signature, "Choisir = le premier");

            var dites = new HashSet<string>();
            Assert.AreEqual(AnnonceDuBandeau.Etat.VilleChaude, AnnonceDuBandeau.Suivante(toutes, dites.Contains, null).Quoi);
            dites.Add(toutes[0].Signature);
            Assert.AreEqual(AnnonceDuBandeau.Etat.Carte, AnnonceDuBandeau.Suivante(toutes, dites.Contains, null).Quoi,
                "la ville déjà dite ne masque plus la carte");
            dites.Add(toutes[1].Signature);
            Assert.IsNull(AnnonceDuBandeau.Suivante(toutes, dites.Contains, toutes[1]),
                "la carte est à l'écran : le rapport, moins prioritaire, attend (sans être marqué dit)");
            Assert.AreEqual(AnnonceDuBandeau.Etat.Rapport, AnnonceDuBandeau.Suivante(toutes, dites.Contains, null).Quoi,
                "l'écran libre : le rapport passe");
            List<AnnonceDuBandeau> avecDescente = AnnonceDuBandeau.ParPriorite(true, "district-16", null, null, "Rook", "r-9");
            Assert.AreEqual(AnnonceDuBandeau.Etat.Descente, AnnonceDuBandeau.Suivante(avecDescente, dites.Contains, toutes[2]).Quoi,
                "la descente remplace un rapport à l'écran");
            dites.Add(toutes[2].Signature);
            Assert.IsNull(AnnonceDuBandeau.Suivante(toutes, dites.Contains, null), "tout est dit : rien");
        }

        [Test]
        public void B7_LeTitreDuDistrict_SeTaitPendantQueLeBandeauParle()
        {
            var host = new GameObject("DistrictHost", typeof(RectTransform));
            montes.Add(host);
            var ecran = host.AddComponent<DistrictInteriorScreenController>();
            DistrictInteriorDto dto = new DistrictInteriorDto
            {
                district = "district-1", district_id = 1, profile = "lattice", name = "La Lisière", name_canonical = "Test",
                bank_side = "north", grid = new DistrictInteriorGridDto { width = 1, height = 1 },
                blocks = new[] { new DistrictInteriorBlockDto { block_id = 0, x = 0, y = 0 } },
                buildings = new DistrictInteriorBuildingDto[0], day_phase = "NIGHT",
            };
            ecran.Render(dto);
            if (ecran.ScreenRoot != null) montes.Add(ecran.ScreenRoot.gameObject);
            TextMeshProUGUI titre = ecran.ScreenRoot.GetComponentsInChildren<TextMeshProUGUI>(true)
                .First(t => t.gameObject.name == "DistrictTitle");
            Color couleur = titre.color;
            Assert.IsFalse(ecran.TitreCedeAuBandeau, "aucun bandeau : le titre est là");

            ecran.CederLaPlaceAuBandeau(true);
            Assert.IsTrue(ecran.TitreCedeAuBandeau, "le bandeau parle : le titre se tait (r9 M11)");
            Assert.AreEqual(couleur, titre.color, "par son groupe, jamais par sa couleur");

            ecran.Render(dto);
            if (ecran.ScreenRoot != null) montes.Add(ecran.ScreenRoot.gameObject);
            Assert.IsTrue(ecran.TitreCedeAuBandeau, "un nouveau rendu pendant le bandeau ne rallume pas le titre");

            ecran.CederLaPlaceAuBandeau(false);
            Assert.IsFalse(ecran.TitreCedeAuBandeau, "le bandeau s'efface : le titre revient");
        }
    }
}
