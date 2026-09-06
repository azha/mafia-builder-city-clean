using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Tests
{
    /// <summary>Capture hors shell, pour les écrans qui bâtissent sous LEUR canvas.
    ///
    /// ⛔ POURQUOI CE FICHIER EXISTE plutôt qu'un `CapturerA` de plus par suite. Il en existait
    /// déjà trois, chacun recopié du précédent, et le `CapturerA` de `VuePrincipaleCapture…` lit
    /// `shell.ShellCanvas` — nul pour un écran monté hors shell. Deux écrans (㊱, puis ②) ont
    /// écrit leur capture en l'appelant et ont rendu la même `NullReferenceException` sans pile
    /// utile. Une garde recopiée n'est pas une garde partagée : elle diverge, et le durcissement
    /// posé sur l'une ne protège aucune des autres.
    ///
    /// ⇒ Toute garde ajoutée ICI vaut pour TOUS les écrans capturés hors shell. C'est le point.</summary>
    public static class CaptureSupport
    {
        /// <summary>Rend `canvas` dans une cible `largeur`×`hauteur` et écrit le PNG.
        ///
        /// ⚠️ Cadre l'ortho sur le rect RÉEL du canvas, jamais sur la résolution demandée : le
        /// `CanvasScaler` change les unités, et `Canvas.scaleFactor` lu la frame de la création
        /// rend 1,0 — plausible et faux. D'où les `yield return null` avant tout rendu.</summary>
        public static IEnumerator CapturerCanvas(Canvas canvas, RectTransform racine,
                                                 int largeur, int hauteur, string chemin)
        {
            Assert.IsNotNull(canvas, "aucun Canvas : rien ne peut être rendu");

            RenderMode modeAvant = canvas.renderMode;
            Camera cameraAvant = canvas.worldCamera;
            float planAvant = canvas.planeDistance;

            var rt = new RenderTexture(largeur, hauteur, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("CaptureCamHorsShell");
            var cam = camGo.AddComponent<Camera>();
            cam.targetTexture = rt;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Color.black;
            cam.orthographic = true;

            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = cam;
            canvas.planeDistance = 10f;
            Canvas.ForceUpdateCanvases();
            yield return null;

            if (racine != null) LayoutRebuilder.ForceRebuildLayoutImmediate(racine);
            Canvas.ForceUpdateCanvases();
            yield return null;
            yield return null;

            RectTransform crt = (RectTransform)canvas.transform;
            cam.orthographicSize = crt.rect.height / 2f;
            cam.aspect = crt.rect.width / crt.rect.height;

            // ⛔ LE CANVAS DOIT AVOIR LE FORMAT DE LA CIBLE, sinon la capture est une DÉFORMATION.
            // Un canvas `ScreenSpaceOverlay` prend le format de la vue de jeu, pas celui qu'on
            // demande ici : mesuré 1080×810 en batchmode pendant qu'on écrivait un PNG 1080×2400.
            // L'ortho est alors cadrée sur 810 de haut et étirée sur 2400 — l'image sort pleine,
            // plausible, lisible, et FAUSSE : tout y est ~3× trop haut, et des éléments hors du
            // cadre d'origine réapparaissent dans la cible.
            // ★ Une capture déformée ne ressemble pas à une panne. Elle ressemble à une maquette
            //   qu'on aurait mal respectée — c'est l'écran qu'on accuse, jamais l'instrument.
            float fmtCanvas = crt.rect.width / crt.rect.height;
            float fmtCible = (float)largeur / hauteur;
            Assert.AreEqual(fmtCible, fmtCanvas, 0.01f,
                $"le canvas est {crt.rect.width}×{crt.rect.height} (format {fmtCanvas:0.000}) alors " +
                $"que la capture demandée est {largeur}×{hauteur} (format {fmtCible:0.000}) : " +
                "l'image sortirait étirée. Donne au canvas la taille de la cible (Canvas en " +
                "`WorldSpace` dimensionné explicitement) plutôt que celle de la vue de jeu.");

            cam.Render();
            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rt;
            var tex = new Texture2D(largeur, hauteur, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, largeur, hauteur), 0, 0);
            tex.Apply();
            RenderTexture.active = prev;
            System.IO.File.WriteAllBytes(chemin, tex.EncodeToPNG());
            // Le plancher d'encre — 4 planches du dépôt étaient vides avec des tests verts.
            MafiaCleanCity.Shell.Tests.CaptureSousShell.PlancherDEncre(tex, chemin);

            canvas.renderMode = modeAvant;
            canvas.worldCamera = cameraAvant;
            canvas.planeDistance = planAvant;
            Object.Destroy(camGo);
            Object.DestroyImmediate(tex);
            rt.Release();
            yield return null;
        }

        /// <summary>Les deux gardes qu'une capture doit passer AVANT d'être publiée.
        ///
        /// **1. Anti-vacuité de FORME.** Une capture ratée est UNIFORME, quelle que soit sa
        /// couleur : on compte les pixels qui diffèrent du fond dominant, jamais les pixels
        /// « clairs » (le fond peut être clair). Plancher à 2 % — mesuré 22,7 % hors fond sur un
        /// écran de LISTE VIDE, le cas le plus pauvre qu'on publie ; un écran rempli en fait
        /// davantage. Le plancher précédent était `> 0`, ce qui ne refusait qu'une image d'une
        /// seule couleur exactement.
        ///
        /// **2. Recouvrement.** La teinte qui domine doit être un FOND, pas un accent.
        /// ⛔ Trouvé sur ㊱ : un helper de liseré posait un enfant PLEIN CADRE et l'envoyait en
        /// `SetAsFirstSibling`, en croyant le glisser derrière le fond — mais un enfant est
        /// TOUJOURS rendu après le graphique de son parent, et aucun rang de fratrie n'y change
        /// rien. Résultat : 82,5 % de l'écran en or plein, écran illisible, pendant que les gardes
        /// structurelles voyaient un contour présent, de la bonne couleur, au bon endroit de
        /// l'arbre. ★ Vérifier qu'un élément EXISTE ne dit rien de ce qu'il RECOUVRE.
        ///
        /// ⚠️ **La PART du dominant ne discrimine rien**, et ma première version s'y est trompée
        /// en lisant son seuil sur la capture cassée : or fautif 82,5 %, écran juste 77,3 % — les
        /// deux mondes se touchent, et sur une liste vide le fond domine légitimement. Ce qui
        /// sépare, c'est la NATURE du dominant : canal max 13 pour un fond, 176 pour l'or. Le
        /// seuil est posé dans le vide entre les deux mesures, pas au bord de l'une d'elles.</summary>
        public static void GarderLaCapture(string chemin)
        {
            var tex = new Texture2D(2, 2);
            Assert.IsTrue(tex.LoadImage(System.IO.File.ReadAllBytes(chemin)),
                          $"capture illisible : {chemin}");

            Color32[] px = tex.GetPixels32();
            var comptes = new Dictionary<Color32, int>();
            foreach (Color32 c in px)
            {
                var k = new Color32(c.r, c.g, c.b, 255);
                comptes.TryGetValue(k, out int n); comptes[k] = n + 1;
            }
            KeyValuePair<Color32, int> dom = new KeyValuePair<Color32, int>(default, 0);
            foreach (var kv in comptes) if (kv.Value > dom.Value) dom = kv;

            float part = 100f * dom.Value / px.Length;
            float horsFond = 100f - part;
            int vif = Mathf.Max(dom.Key.r, Mathf.Max(dom.Key.g, dom.Key.b));
            Debug.Log($"[CAPTURE] {System.IO.Path.GetFileName(chemin)} — dominante " +
                      $"rgb({dom.Key.r},{dom.Key.g},{dom.Key.b}) {part:0.0} % · canal max {vif} · " +
                      $"hors fond {horsFond:0.0} % · {comptes.Count} teintes");

            // ⛔⛔ TD-554 — LA GARDE QUI CERTIFIAIT LE VIDE, ET QUI S'AUTO-DÉNONÇAIT.
            // Elle était : `Assert.Greater(horsFond, 2f)`, et son propre message d'échec disait
            // « 22,7 % sur une liste VIDE, le cas le plus pauvre publié ». Le seuil était donc
            // ONZE FOIS SOUS le pire cas connu : un écran entièrement vide le franchissait sans
            // effort. *Une garde dont le message cite un contre-exemple qui la passe est une
            // garde qui documente sa propre inutilité* — et personne ne l'a lue ainsi pendant
            // des semaines, parce qu'elle était VERTE.
            //
            // ⛔ ET LA PROPORTION EST LA MAUVAISE GRANDEUR. `horsFond` mesure quelle FRACTION
            // des pixels s'écarte de la dominante : de l'anticrénelage sur un titre suffit à en
            // produire. Ce qui distingue un écran d'un fond n'est pas combien de pixels diffèrent,
            // c'est COMBIEN DE COULEURS DIFFÉRENTES il porte — un fond, même bruité, en a peu.
            // ⇒ On reprend les deux gardes de `CaptureSousShell`, seule capture de ce dépôt dont
            //   chaque garde a été payée par une image fausse : la TAILLE, puis les TEINTES.
            Assert.IsTrue(tex.width >= 200 && tex.height >= 200,
                $"capture {tex.width}x{tex.height} : une dimension sous le seuil des 200 px — " +
                "un RectTransform resté à sa taille par défaut (100×100) ne lève AUCUNE erreur " +
                "console et rend une image plausible.");
            // ⛔⛔ LE NOMBRE DE TEINTES N'EST PAS ASSERTÉ ICI, ET C'EST UNE DÉCISION MESURÉE.
            // Ma première version l'assertait (`> 12`) et a fait rougir ㉜ Délégation (8 teintes)
            // et ㉝ Démolition (9). Vérification faite APRÈS coup — et elle m'a donné tort :
            // leurs suites ouvrent un compte FRAIS (`SafeCallsign` + `SignUp`), voire aucune
            // session du tout. Ces écrans n'ont donc RIEN à afficher, et leur état vide — titre
            // plus une phrase — est le rendu CORRECT.
            // ★ *Une garde chromatique ne distingue pas « l'écran est cassé » de « l'écran montre
            //   correctement qu'il n'y a rien ».* Elle mesure la RICHESSE VISUELLE et l'appelle
            //   justesse. C'est le même travers que `horsFond` qu'elle remplace : un meilleur
            //   indicateur INDIRECT reste indirect, et je l'aurais fait payer à deux sessions
            //   voisines sous forme d'un défaut inexistant.
            // ⇒ Ici — `CaptureSupport` sert les écrans montés SEULS, dont les données ne sont
            //   jamais garanties — on AVERTIT avec le compte, et on laisse le lecteur juger.
            //   L'assertion dure vit dans `CaptureSousShell`, où la capture suit un parcours
            //   joueur réel et où l'absence de données est, elle, un vrai défaut.
            // ⇒ La TAILLE reste assertée : 100×100 n'est jamais un état légitime.
            if (comptes.Count <= 12)
                Debug.LogWarning(
                    $"[CAPTURE] {System.IO.Path.GetFileName(chemin)} — seulement {comptes.Count} " +
                    "teintes distinctes. C'est un FOND avec un titre. Deux lectures possibles, et " +
                    "cette garde ne peut pas trancher : soit l'écran n'a rien rendu, soit il rend " +
                    "correctement son état vide parce que le compte de ce test est FRAIS. " +
                    "⇒ Vérifier QUEL COMPTE la suite ouvre avant de conclure au défaut : une " +
                    "capture de juge se prend sur un compte SERVI (`operational_demo`), jamais " +
                    "sur un `SignUp` neuf.");
            Assert.Less(vif, 90,
                $"la teinte qui couvre {part:0.0} % de l'écran est rgb({dom.Key.r},{dom.Key.g}," +
                $"{dom.Key.b}), canal max {vif} : c'est un ACCENT, pas un fond — quelque chose " +
                "recouvre la mise en page au lieu de la border.");

            Object.DestroyImmediate(tex);
        }
    }
}
