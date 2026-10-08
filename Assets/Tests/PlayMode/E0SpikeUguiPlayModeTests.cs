using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text;
using MafiaCleanCity.Mouvements;
using NUnit.Framework;
using Unity.Profiling;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;

namespace MafiaCleanCity.Tests
{
    /// <summary>E0 — le spike des inconnues d'uGUI (design §4, tableau « coût borné », ligne « inconnues d'uGUI → E0 »).
    ///
    /// Il MESURE, il ne juge pas : chaque scénario anime 48 cibles par la VRAIE régie (E1) et relève, image par image,
    /// les compteurs de rendu (batches, SetPass, draw calls), l'allocation par image et le temps de reconstruction des
    /// canvas. Les quatre questions du design :
    ///   (a) batches / draw calls avec une cible animée par `CanvasGroup.alpha` ;
    ///   (b) coût de `Graphic.color` animé (le `Melange`) ;
    ///   (c) 48 cibles avec / sans Canvas imbriqué ;
    ///   (d) le `RectMask2D` découpe-t-il une cible posée dans un Canvas imbriqué ?
    /// Sortie : lignes `[E0]` dans le journal ET un TSV (`E0_SORTIE`, sinon `persistentDataPath/e0-spike.tsv`).
    ///
    /// ⛔ ANTI-VACUITÉ : un compteur de rendu à 0 sur le scénario statique veut dire « rien n'a été rendu » (batchmode
    ///    -nographics, recorder invalide) : la mesure est VIDE et le test ROUGIT au lieu de rendre des zéros plausibles.
    ///    La décision (Canvas imbriqué oui/non, plafond sous masque) se prend APRÈS, sur le TSV, pas dans ce test.
    /// </summary>
    public class E0SpikeUguiPlayModeTests
    {
        private const int Cibles = 48, Images = 90, Chauffe = 15;
        private const int Largeur = 540, Hauteur = 960;
        private readonly List<Object> montes = new List<Object>();
        private readonly StringBuilder tsv = new StringBuilder("scenario\tmesure\tvaleur\n");
        private Regie regie;
        private Camera cam;
        private RenderTexture rt;
        private float t;

        [TearDown]
        public void TearDown()
        {
            RegieMouvement.Oublier();
            foreach (Object o in montes) if (o != null) Object.DestroyImmediate(o);
            montes.Clear();
            if (rt != null) { rt.Release(); Object.DestroyImmediate(rt); rt = null; }
        }

        private static readonly ImageCle[] CourbeAlpha =
            { new ImageCle(0f, 1f, Aisance.Lineaire), new ImageCle(0.5f, 0.4f, Aisance.Lineaire), new ImageCle(1f, 1f, Aisance.Lineaire) };
        private static readonly ImageCle[] CourbeMelange =
            { new ImageCle(0f, 0f, Aisance.Lineaire), new ImageCle(0.5f, 1f, Aisance.Lineaire), new ImageCle(1f, 0f, Aisance.Lineaire) };

        // 48 cibles = 32 Ambiance + 16 Alerte : les quotas du §4 (32 / 16) sont ceux de la régie réelle.
        private static Entree Faire(string id, Genre g, Propriete p, Mode m, ImageCle[] cles)
        {
            var def = new MouvementDefini(id, g, 1.0f, new[] { new Canal(p, m, cles) }, Iteration.InfiniFois,
                poseDeReposS: 0.5f,
                couleurA: p == Propriete.Melange ? CouleurSpec.Cible : default,
                couleurB: p == Propriete.Melange ? CouleurSpec.CibleFois(0.5f) : default);
            return new Entree(id, new[] { Entree.Tous }, "E0 spike", "mesure du coût uGUI, aucune cause de fiction : ne vit que dans ce test",
                g, def, 1, false, Entree.HoteClient);
        }

        private RectTransform Monter(bool masque, bool imbrique, out List<RectTransform> cibles, out RectTransform zoneMasque)
        {
            rt = new RenderTexture(Largeur, Hauteur, 24);
            var camGo = new GameObject("E0Camera"); montes.Add(camGo);
            cam = camGo.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = Color.black;
            cam.targetTexture = rt; cam.orthographic = true;

            var canvasGo = new GameObject("E0Canvas", typeof(RectTransform)); montes.Add(canvasGo);
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceCamera; canvas.worldCamera = cam; canvas.planeDistance = 10f;
            RectTransform racine = (RectTransform)canvasGo.transform;

            zoneMasque = racine;
            Transform parent = racine;
            if (masque)
            {
                var m = new GameObject("Masque", typeof(RectTransform));
                m.transform.SetParent(racine, false);
                zoneMasque = (RectTransform)m.transform;
                zoneMasque.sizeDelta = new Vector2(200f, 200f);
                m.AddComponent<RectMask2D>();
                parent = m.transform;
            }

            cibles = new List<RectTransform>(Cibles);
            for (int i = 0; i < Cibles; i++)
            {
                Transform hote = parent;
                if (imbrique)
                {
                    var w = new GameObject("Imbrique" + i, typeof(RectTransform));
                    w.transform.SetParent(parent, false);
                    w.AddComponent<Canvas>();          // overrideSorting = false : le Canvas imbriqué hérite du tri
                    ((RectTransform)w.transform).sizeDelta = new Vector2(200f, 200f);
                    hote = w.transform;
                }
                var go = new GameObject("Cible" + i, typeof(RectTransform));
                go.transform.SetParent(hote, false);
                var img = go.AddComponent<Image>();
                img.color = new Color(0.85f, 0.67f, 0.31f, 1f);
                var r = (RectTransform)go.transform;
                r.sizeDelta = new Vector2(20f, 20f);
                r.anchoredPosition = new Vector2(-84f + (i % 8) * 24f, -60f + (i / 8) * 24f);
                cibles.Add(r);
            }
            return racine;
        }

        private IEnumerator Mesurer(string scenario, bool masque, bool imbrique, Propriete? anime, int combien)
        {
            regie = RegieMouvement.PourTest();
            List<RectTransform> cibles;
            RectTransform zone;
            Monter(masque, imbrique, out cibles, out zone);
            if (anime.HasValue)
            {
                Mode mode = anime.Value == Propriete.Alpha ? Mode.Multiplicatif : Mode.Absolu;
                ImageCle[] cles = anime.Value == Propriete.Alpha ? CourbeAlpha : CourbeMelange;
                Entree amb = Faire("e0." + scenario + ".amb", Genre.Ambiance, anime.Value, mode, cles);
                Entree ale = Faire("e0." + scenario + ".ale", Genre.Alerte, anime.Value, mode, cles);
                regie.Admettre(amb); regie.Admettre(ale);
                for (int i = 0; i < combien; i++)
                    regie.Attacher(i < 32 ? amb : ale, cibles[i], Reglage.Defaut);
            }

            using (var batches = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Batches Count"))
            using (var setpass = ProfilerRecorder.StartNew(ProfilerCategory.Render, "SetPass Calls Count"))
            using (var draws = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Draw Calls Count"))
            using (var gc = ProfilerRecorder.StartNew(ProfilerCategory.Memory, "GC Allocated In Frame"))
            using (var build = ProfilerRecorder.StartNew(ProfilerCategory.Gui, "Canvas.BuildBatch"))
            using (var willRender = ProfilerRecorder.StartNew(ProfilerCategory.Gui, "Canvas.SendWillRenderCanvases"))
            {
                double sB = 0, sS = 0, sD = 0, sG = 0, sBuild = 0, sWill = 0; long maxG = 0; int n = 0;
                for (int k = 0; k < Chauffe + Images; k++)
                {
                    t += 1f / 60f;
                    regie.Tick(t);
                    cam.Render();
                    yield return null;
                    if (k < Chauffe) continue;
                    n++;
                    sB += batches.LastValue; sS += setpass.LastValue; sD += draws.LastValue;
                    sG += gc.LastValue; if (gc.LastValue > maxG) maxG = gc.LastValue;
                    sBuild += build.LastValue; sWill += willRender.LastValue;
                }
                Ecrire(scenario, "recorder_batches_valide", batches.Valid ? 1 : 0);
                Ecrire(scenario, "recorder_canvas_valide", build.Valid ? 1 : 0);
                Ecrire(scenario, "batches_moy", sB / n);
                Ecrire(scenario, "setpass_moy", sS / n);
                Ecrire(scenario, "drawcalls_moy", sD / n);
                Ecrire(scenario, "gc_octets_moy", sG / n);
                Ecrire(scenario, "gc_octets_max", maxG);
                Ecrire(scenario, "canvas_buildbatch_ns_moy", sBuild / n);
                Ecrire(scenario, "canvas_willrender_ns_moy", sWill / n);
                Ecrire(scenario, "pistes_vivantes", regie.PistesVivantes);
                Ecrire(scenario, "refus", regie.Refus);
                Ecrire(scenario, "ecritures_cumulees", regie.Ecritures);
                if (scenario == "statique")
                    Assert.Greater(sD / n, 0.0, "E0 VIDE : aucun draw call relevé sur le scénario statique — rien n'a été rendu " +
                        "(batchmode -nographics ? recorder invalide ?). La mesure ne vaut rien : relancer AVEC rendu.");
            }
            foreach (Object o in montes) if (o != null) Object.DestroyImmediate(o);
            montes.Clear();
            RegieMouvement.Oublier();
            if (rt != null) { rt.Release(); Object.DestroyImmediate(rt); rt = null; }
        }

        private void Ecrire(string scenario, string mesure, double valeur)
        {
            string v = valeur.ToString("0.###", System.Globalization.CultureInfo.InvariantCulture);
            tsv.Append(scenario).Append('\t').Append(mesure).Append('\t').Append(v).Append('\n');
            Debug.Log("[E0]\t" + scenario + "\t" + mesure + "\t" + v);
        }

        private void Deposer()
        {
            string chemin = System.Environment.GetEnvironmentVariable("E0_SORTIE");
            if (string.IsNullOrEmpty(chemin)) chemin = Path.Combine(Application.persistentDataPath, "e0-spike.tsv");
            File.WriteAllText(chemin, tsv.ToString());
            Debug.Log("[E0] TSV écrit : " + chemin);
        }

        [UnityTest]
        public IEnumerator E0_Mesure_AlphaCouleurImbricationMasque()
        {
            // design §4 (a)(b)(c) : coût de rendu et de reconstruction, 48 cibles, par scénario
            yield return Mesurer("statique", false, false, null, 0);
            yield return Mesurer("alpha_1", false, false, Propriete.Alpha, 1);
            yield return Mesurer("alpha_48", false, false, Propriete.Alpha, Cibles);
            yield return Mesurer("melange_48", false, false, Propriete.Melange, Cibles);
            yield return Mesurer("alpha_48_imbrique", false, true, Propriete.Alpha, Cibles);
            yield return Mesurer("melange_48_imbrique", false, true, Propriete.Melange, Cibles);
            yield return Mesurer("alpha_48_masque", true, false, Propriete.Alpha, Cibles);
            yield return Mesurer("alpha_48_masque_imbrique", true, true, Propriete.Alpha, Cibles);
            Deposer();
        }

        [UnityTest]
        public IEnumerator E0_Masque_DecoupeUnCanvasImbrique()
        {
            // design §4 (d) : une image à cheval sur le bord du RectMask2D ; le pixel HORS du masque doit être le fond.
            // Contrôle : sans Canvas imbriqué (le cas que tout le dépôt utilise), puis avec.
            foreach (bool imbrique in new[] { false, true })
            {
                List<RectTransform> cibles; RectTransform zone;
                Monter(true, imbrique, out cibles, out zone);
                RectTransform img = cibles[0];
                img.sizeDelta = new Vector2(120f, 120f);
                img.anchoredPosition = new Vector2(100f, 0f);   // le masque fait 200 × 200 : l'image déborde de 60 à droite
                for (int i = 1; i < cibles.Count; i++) cibles[i].gameObject.SetActive(false);
                yield return null;
                cam.Render();
                var tex = new Texture2D(Largeur, Hauteur, TextureFormat.RGBA32, false);
                RenderTexture avant = RenderTexture.active;
                RenderTexture.active = rt;
                tex.ReadPixels(new Rect(0, 0, Largeur, Hauteur), 0, 0);
                tex.Apply();
                RenderTexture.active = avant;
                Color dedans = tex.GetPixel(Largeur / 2 + 70, Hauteur / 2);     // dans le masque ET dans l'image
                Color dehors = tex.GetPixel(Largeur / 2 + 130, Hauteur / 2);    // dans l'image, HORS du masque
                Object.DestroyImmediate(tex);
                string sc = imbrique ? "decoupe_imbrique" : "decoupe_temoin";
                Ecrire(sc, "luminance_dedans", dedans.grayscale);
                Ecrire(sc, "luminance_dehors", dehors.grayscale);
                Ecrire(sc, "decoupe_ok", dehors.grayscale < 0.1f ? 1 : 0);
                Assert.Greater(dedans.grayscale, 0.3f, sc + " : l'image n'est pas rendue DANS le masque — mesure vide");
                foreach (Object o in montes) if (o != null) Object.DestroyImmediate(o);
                montes.Clear();
                if (rt != null) { rt.Release(); Object.DestroyImmediate(rt); rt = null; }
            }
            Deposer();
        }
    }
}
