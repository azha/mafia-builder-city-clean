using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Mouvements.Tests
{
    // CLIENT-3 / E1 — les aides des tests de la couche de mouvement (aucun test ici). Des entrées et des cibles FABRIQUÉES :
    // la régie réelle, un arbre d'uGUI réel, aucun double de la régie (no-mock).
    internal static class AidesMouvement
    {
        public static readonly string[] Partout = { Entree.Tous };
        public const string CauseDeTest = "cause de test assez longue pour passer la garde G1";

        public static ImageCle K(float t, float v) => new ImageCle(t, v, Aisance.Lineaire);
        public static ImageCle K(float t, float v, Aisance e) => new ImageCle(t, v, e);

        public static Entree Faire(string id, MouvementDefini m, int pistes = 1, bool bloquante = false, string hote = Entree.HoteClient)
        {
            return new Entree(id, Partout, "test", CauseDeTest, m.G, m, pistes, bloquante, hote);
        }

        /// <summary>`v` à toute phase (deux clés égales) : un canal qui ne fait que COMPOSER.</summary>
        public static MouvementDefini Constant(string id, Genre g, Propriete p, Mode mode, float v, float periodeS = 1f)
        {
            return new MouvementDefini(id, g, periodeS, new[] { new Canal(p, mode, new[] { K(0f, v), K(1f, v) }) },
                Iteration.InfiniFois, poseDeReposS: 0f);
        }

        /// <summary>Une rampe `de` → `vers` sur `periodeS`, répétée ou non.</summary>
        public static MouvementDefini Rampe(string id, Genre g, Propriete p, Mode mode, float de, float vers, float periodeS, Iteration it,
            float poseDeReposS = MouvementDefini.PoseALaFin)
        {
            return new MouvementDefini(id, g, periodeS, new[] { new Canal(p, mode, new[] { K(0f, de), K(1f, vers) }) }, it,
                poseDeReposS: poseDeReposS);
        }

        /// <summary>La « lampe » du catalogue (§0.5) : 0,82 → 1,00 → 0,82 sur 4,6 s, ease-in-out ; pose au creux.</summary>
        public static MouvementDefini Lampe(string id)
        {
            return new MouvementDefini(id, Genre.Ambiance, 4.6f,
                new[]
                {
                    new Canal(Propriete.Alpha, Mode.Multiplicatif, new[]
                    {
                        K(0f, 0.82f, Aisance.EaseInOut), K(0.5f, 1f, Aisance.EaseInOut), K(1f, 0.82f, Aisance.EaseInOut),
                    }),
                },
                Iteration.InfiniFois, poseDeReposS: 0f);
        }

        public static RectTransform Rect(List<Object> montes, string nom, Transform parent = null)
        {
            var go = new GameObject(nom, typeof(RectTransform));
            if (parent != null) go.transform.SetParent(parent, false);
            else montes.Add(go);
            return (RectTransform)go.transform;
        }

        public static Image Img(List<Object> montes, string nom, Color couleur, Transform parent = null)
        {
            var go = new GameObject(nom, typeof(RectTransform), typeof(Image));
            if (parent != null) go.transform.SetParent(parent, false);
            else montes.Add(go);
            var img = go.GetComponent<Image>();
            img.color = couleur;
            return img;
        }

        public static void Oublier(List<Object> montes)
        {
            foreach (Object o in montes) if (o != null) Object.DestroyImmediate(o);
            montes.Clear();
        }
    }
}
