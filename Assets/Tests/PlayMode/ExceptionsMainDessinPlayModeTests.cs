using System.Collections.Generic;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Operational.Exceptions;
using Object = UnityEngine.Object;
using MafiaCleanCity.Tests;

namespace MafiaCleanCity.Operational.Tests
{
    // ⑩-1c — les cartes au dessin du cadre 15 (écart D05 : glyphes et coins arrondis manquaient). Garde de STRUCTURE :
    //   R20  l'éventail porté par la FACE (le créneau reste à la mise en page) : ♠ risquée tournée à −5° CSS (z > 0 en Unity) et
    //        descendue, ♦ suggérée droite et LEVÉE, ♣ apprendre à +5° (z < 0) et descendue ; face masquée (coins de 9), bord et
    //        filet intérieur ; encre bordeaux sur la claire, braise sur les sombres ; les cartes du talon déplié sans glyphe
    //        ⑩-1e : le tampon de ⑨ — papier plein, appui long seul, sous-titre entier pour une réparation, moitié sinon
    //   R21  celui qui parle, au dessin de ⑨ (écart D03) : ⑩ ouvert depuis ⑨ porte le MÊME arbre de bulle (`ParleurAuComptoir`),
    //        le nom servi, « · Cuisinier · au bâtiment touché » (le rôle PASSÉ par ⑨), trois pastilles dont « Il est sûr », et
    //        « Je fais quoi ? » en italique dans les guillemets — ni pour la ville, ni pour un identifiant nu
    [Category("EcranFile")]
    public class ExceptionsMainDessinPlayModeTests
    {
        // ⛔ TD-576, CLASSE « CATALOGUE » (2026-09-23) — cette classe monte ⑨ (`ExceptionQueueController`, qui amorce le
        // catalogue i18n) et ne le rendait pas : entrée au cumul par le merge de b909fbae, vue par catalogue-sortie.py. Rendu à
        // chaque test ; la garde de sortie de MafiaCI nomme toute classe qui le laisserait encore chargé.
        [TearDown] public void OublierLeCatalogue() => MafiaCleanCity.I18n.I18nCatalog.Oublier();

        private readonly List<GameObject> montes = new List<GameObject>();

        [TearDown]
        public void TearDown()
        {
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
        }

        private static CandidateActionDto A(string id, string method, string dsl = null) =>
            new CandidateActionDto { id = id, label = id, method = method, add_rule_dsl = dsl };

        private static ExceptionCardDto Raid() => new ExceptionCardDto
        {
            exception_id = "raid", lieutenant_id = "lt-kane", lieutenant = new ExceptionLieutenantDto { id = "lt-kane", name = "Lt. Kane" },
            event_descriptor = "They turned the building over last night.",
            severity_band = "SEVERE", priority_band = "critical", confidence_band = "confident",
            candidate_actions = new[]
            {
                A("bribe", "BRIBE"),
                // un bâtiment visé ⇒ « au bâtiment touché » dans le contexte (R21)
                new CandidateActionDto { id = "repair", label = "repair", method = "REPAIR",
                                         effect = new ExceptionEffectDto { type = "REPAIR", target_building_id = "b-1" } },
                A("teach", "ONE_TIME", "WHEN raid THEN repair"), A("lay_low", "LAY_LOW"),
            },
            suggested_action = A("repair", "REPAIR"),
        };

        private static string[] Enfants(Transform t)
        {
            var n = new string[t.childCount];
            for (int i = 0; i < t.childCount; i++) n[i] = t.GetChild(i).name;
            return n;
        }

        private static Transform Trouver(Transform racine, string nom)
        {
            foreach (Transform t in racine.GetComponentsInChildren<Transform>(true))
                if (t.name == nom) return t;
            return null;
        }

        [Test]
        public void R21_CeluiQuiParle_LeDessinDeNeuf()
        {
            var hote = new GameObject("ExceptionQueue", typeof(RectTransform));
            montes.Add(hote);
            var ecran = hote.AddComponent<ExceptionQueueController>();
            ecran.RendrePourTest(new[] { Raid() });
            montes.Add(ecran.Decor.transform.parent.gameObject);   // la racine de ⑨ vit sous le Canvas
            ecran.PoserRosterPourTest(new[] { new MafiaCleanCity.Operational.Lieutenant.RosterRow { lieutenant_id = "lt-kane", archetype = "COOK" } });

            ecran.OpenDetail(ecran.Cards[0]);
            ExceptionDetailController d = ecran.LastDetail;
            Assert.IsNotNull(d);
            if (ecran.LastNavGameObject != null) montes.Add(ecran.LastNavGameObject);

            Transform feuille = d.FeuillePourTest.transform;
            Transform medDix = Trouver(feuille, "MedaillonParleur");
            Assert.IsNotNull(medDix, "le médaillon de celui qui parle, sur ⑩");
            Transform rangeeDix = medDix.parent;
            Transform rangeeNeuf = ecran.ParlePourTest.transform;
            CollectionAssert.AreEqual(new[] { "MedaillonParleur", "QueueBulle", "Bulle" }, Enfants(rangeeDix),
                "le même arbre que ⑨ : médaillon, queue, bulle");
            Assert.AreEqual("Parle", rangeeDix.name);
            Assert.AreEqual("Parle", rangeeNeuf.name);

            Transform bulle = rangeeDix.Find("Bulle");
            Assert.AreEqual("Lt. Kane", bulle.Find("QuiNom").GetComponent<TextMeshProUGUI>().text);
            Assert.AreEqual("· Cuisinier · au bâtiment touché", bulle.Find("QuiContexte").GetComponent<TextMeshProUGUI>().text,
                "le rôle PASSÉ par ⑨ (sa jointure), le lieu de la carte");
            Transform p = bulle.Find("Pastilles");
            Assert.AreEqual("Grave", p.Find("Gravite/Lib").GetComponent<TextMeshProUGUI>().text);
            Assert.AreEqual("Critique", p.Find("Priorite/Lib").GetComponent<TextMeshProUGUI>().text);
            Assert.AreEqual("Il est sûr", p.Find("Confiance/Lib").GetComponent<TextMeshProUGUI>().text, "`.chip.conf` (⑨-5)");
            StringAssert.EndsWith(" <i>Je fais quoi ?</i> »", bulle.Find("Replique").GetComponent<TextMeshProUGUI>().text);
            StringAssert.StartsWith("« Patron — they turned", bulle.Find("Replique").GetComponent<TextMeshProUGUI>().text);

            var ville = Raid(); ville.lieutenant_id = ""; ville.lieutenant = new ExceptionLieutenantDto();
            ville.event_descriptor = "Citywide heat is high — your operations are under pressure.";
            Assert.AreEqual("Citywide heat is high — your operations are under pressure.", ExceptionDetailController.RepliqueMain(ville),
                "la ville ne pose pas de question");
            var nu = Raid(); nu.event_descriptor = "exc_demo_raid_style";
            Assert.AreEqual("exc_demo_raid_style", ExceptionDetailController.RepliqueMain(nu), "un identifiant nu non plus");
        }

        private static Transform Face(ExceptionDetailController d, string id)
        {
            foreach (var c in d.CartesPourTest)
                if (!c.Escalade && c.Action != null && c.Action.id == id) return c.Bouton.transform.Find("Face");
            return null;
        }

        [Test]
        public void R20_LEventail_LesGlyphes_LesCoins()
        {
            var go = new GameObject("Nav_ExceptionDetail");
            montes.Add(go);
            var d = go.AddComponent<ExceptionDetailController>();
            d.Init(Raid(), "t", null, onBack: () => { });

            Transform risquee = Face(d, "bribe"), suggeree = Face(d, "repair"), apprendre = Face(d, "teach");
            Assert.IsNotNull(risquee); Assert.IsNotNull(suggeree); Assert.IsNotNull(apprendre);

            Assert.AreEqual("♠", risquee.Find("Glyphe").GetComponent<TextMeshProUGUI>().text);
            Assert.AreEqual("♦", suggeree.Find("Glyphe").GetComponent<TextMeshProUGUI>().text);
            Assert.AreEqual("♣", apprendre.Find("Glyphe").GetComponent<TextMeshProUGUI>().text);

            Assert.Greater(Mathf.DeltaAngle(0f, risquee.localEulerAngles.z), 0f, "`rotate(-5deg)` : à gauche, z > 0 en Unity");
            Assert.AreEqual(0f, Mathf.DeltaAngle(0f, suggeree.localEulerAngles.z), 1e-3f, "la suggérée est droite");
            Assert.Less(Mathf.DeltaAngle(0f, apprendre.localEulerAngles.z), 0f, "`rotate(5deg)` : à droite, z < 0");
            Assert.Greater(((RectTransform)suggeree).anchoredPosition.y, 0f, "`translateY(-8px)` : levée");
            Assert.Less(((RectTransform)risquee).anchoredPosition.y, 0f, "`translateY(6px)` : descendue");
            Assert.Less(((RectTransform)apprendre).anchoredPosition.y, 0f);

            foreach (Transform f in new[] { risquee, suggeree, apprendre })
            {
                Assert.IsNotNull(f.GetComponent<Mask>(), $"{f.parent.name} : coins arrondis (masque)");
                Assert.IsNotNull(f.Find("Bord"));
                Assert.IsNotNull(f.Find("FiletInterieur"));
                Assert.IsTrue(f.Find("Glyphe").GetComponent<LayoutElement>().ignoreLayout, "`.s{position:absolute}`");
            }
            Color braise = MafiaCleanCity.Theme.DesignTokens.Current.hudGaugeArcHot;
            Assert.AreEqual(braise, risquee.Find("Role").GetComponent<TextMeshProUGUI>().color, "`.carte.sombre .l{color:var(--braise)}`");
            Color bordeaux; ColorUtility.TryParseHtmlString("#93402c", out bordeaux);
            Assert.AreEqual(bordeaux, suggeree.Find("Role").GetComponent<TextMeshProUGUI>().color, "`.carte .l{color:#93402c}`");

            // ⑩-1e — le tampon de ⑨ (D08) : papier plein, appui long seul, sous-titre de la maquette pour une réparation.
            Assert.AreEqual("REPAIR", d.TamponLibelleTexte, "le choix (la suggérée), en capitales");
            Assert.AreEqual(ValeurAttendue.De("exception_detail", "bloc", "appui long — la carte se ferme ; le bâtiment, lui, se répare avec le temps"), d.TamponSousTexte,
                "cadre 15, la phrase entière pour une réparation");
            Assert.IsNotNull(d.TamponAppuiPourTest, "l'appui long résout");
            Assert.IsNull(d.TamponAppuiPourTest.GetComponent<Button>(), "pas de tap : on choisit sur les cartes, on signe au tampon");
            Color papier = d.TamponAppuiPourTest.GetComponent<Image>().color;
            Color attendu; ColorUtility.TryParseHtmlString("#d9cca9", out attendu);
            Assert.AreEqual(attendu, papier, "papier PLEIN #d9cca9 (famille du tampon de ⑯ et de ⑨)");
            foreach (var c in d.CartesPourTest)
                if (!c.Escalade && c.Action.id == "bribe") { c.Bouton.onClick.Invoke(); break; }
            Assert.AreEqual("appui long — la carte se ferme", d.TamponSousTexte, "une autre issue : la première moitié seulement");

            Assert.IsNotNull(d.TalonPourTest);
            d.TalonPourTest.onClick.Invoke();
            Transform auTalon = Face(d, "lay_low");
            Assert.IsNotNull(auTalon, "`lay_low` au talon déplié");
            Assert.IsNull(auTalon.Find("Glyphe"), "le talon déplié ne porte pas de glyphe (la maquette n'en dessine pas)");
            Assert.AreEqual(0f, Mathf.DeltaAngle(0f, auTalon.localEulerAngles.z), 1e-3f, "ni tournée");
        }
    }
}
