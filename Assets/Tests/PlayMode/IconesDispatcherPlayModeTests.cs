using System.IO;
using System.Linq;
using MafiaCleanCity.CitySim.Inspection;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.CitySim.Inspection.Tests
{
    /// <summary>Les glyphes de régime de dispatcher — troisième famille sortie de la forme A, et la
    /// première dont la couverture est PLEINE.</summary>
    [Category("IconesDispatcher")]
    public class IconesDispatcherPlayModeTests
    {
        private const string DossierIcones = "Art/Icons/Resources/DispatcherIcons";
        private const string SuffixeLivre = "_48";

        /// <summary>Cible du contrôle NÉGATIF, INERTE PAR CONSTRUCTION — une valeur hors domaine.
        /// ⛔ Viser un régime réellement non couvert serait viser un MANQUE, donc précisément ce que
        /// l'atelier va combler : la garde des glyphes de bâtiment s'est aveuglée ainsi en une heure.
        /// Ici la couverture est pleine, donc il n'existe MÊME PAS de manque à viser — raison de plus
        /// pour que la cible soit hors domaine plutôt que choisie parmi les valeurs vivantes.</summary>
        private const string RegimeHorsDomaine = "REGIME_ABSENT_DU_DOMAINE_CONTROLE_NEGATIF";

        [Test]
        public void Dispatcher_ChaqueFichierEstATTEIGNABLE_EtChaqueGlypheRESOLU_PorteUnDessin()
        {
            string dir = Path.Combine(Application.dataPath, DossierIcones);
            Assert.IsTrue(Directory.Exists(dir),
                $"⛔ dossier livré absent : {dir}. Sans dossier `Resources`, un PNG sous `Assets/Art/` "
                + "n'entre PAS dans le build — il n'est pas « presque monté », il est absent.");

            string[] fichiers = Directory.GetFiles(dir, "*.png")
                .Select(Path.GetFileNameWithoutExtension).OrderBy(x => x).ToArray();
            // ⛔ Plancher AVANT la comparaison d'ensembles : sur un dossier vide, « tout fichier est
            //    atteignable » est trivialement VRAI et le resterait pour toujours.
            Assert.Greater(fichiers.Length, 2,
                $"⛔ seulement {fichiers.Length} fichier(s) — la bijection serait vraie à vide.");

            string[] domaine = DispatcherIcons.RegimesCanoniques;
            string[] resolus = domaine.Where(r => DispatcherIcons.Pour(r) != null).OrderBy(r => r).ToArray();
            string[] depuisFichiers = fichiers
                .Select(f => f.StartsWith("icon_dispatcher_") && f.EndsWith(SuffixeLivre)
                    ? f.Substring("icon_dispatcher_".Length,
                                  f.Length - "icon_dispatcher_".Length - SuffixeLivre.Length).ToUpperInvariant()
                    : "⛔HORS-CONVENTION:" + f)
                .OrderBy(x => x).ToArray();

            Debug.Log($"[IconesDispatcher] {fichiers.Length} fichier(s) · {resolus.Length} glyphe(s) résolu(s) "
                      + $"sur {domaine.Length} régimes du domaine · COUVERTURE {resolus.Length}/{domaine.Length}. "
                      + $"Non couverts : [{string.Join(", ", domaine.Except(resolus))}]");

            var orphelins = depuisFichiers.Except(resolus).ToArray();
            Assert.IsEmpty(orphelins,
                $"⛔ {orphelins.Length} fichier(s) que le résolveur n'atteint PAS : [{string.Join(", ", orphelins)}]. "
                + "Ils pèsent dans le build — tout ce qui est sous un `Resources` y entre sans élagage — "
                + "et ne s'affichent jamais.");
            var fantomes = resolus.Except(depuisFichiers).ToArray();
            Assert.IsEmpty(fantomes,
                $"⛔ {fantomes.Length} glyphe(s) résolu(s) sans fichier : [{string.Join(", ", fantomes)}].");

            Assert.IsNull(DispatcherIcons.Pour(RegimeHorsDomaine),
                "⛔ une clé hors domaine ne doit RIEN rendre — surtout pas un repli partagé, qui "
                + "mettrait deux régimes sous la même image, alors que distinguer le régime est "
                + "précisément ce que cette ligne d'écran existe pour faire.");
            Assert.IsNull(DispatcherIcons.Pour(null), "⛔ une clé nulle ne doit rien rendre");

            // ⛔ ET LE DESSIN DOIT EXISTER, pas seulement l'asset. Ce dépôt a livré une police
            //    PRÉSENTE, RÉFÉRENCÉE et incapable de servir un glyphe, et trois silhouettes
            //    tronquées que `alpha_min/alpha_max` déclaraient bonnes.
            foreach (string r in resolus)
            {
                Sprite sp = DispatcherIcons.Pour(r);
                Assert.IsNotNull(sp.texture, $"⛔ « {r} » : sprite sans texture — rien à dessiner");
                Assert.Greater(sp.rect.width, 0f, $"⛔ « {r} » : rect de largeur nulle");
                Assert.Greater(sp.rect.height, 0f, $"⛔ « {r} » : rect de hauteur nulle");
            }

            // ⚠️ ÉPINGLE SUR UNE DONNÉE — 4/4, la première famille PLEINE. Elle rougira si le back
            //    ajoute un cinquième régime (changement de DONNÉE, invisible au compilateur) OU si
            //    un glyphe disparaît. Une couverture pleine aujourd'hui n'est pas une garantie
            //    demain, et c'est exactement ce qu'une prose ne dirait jamais.
            Assert.AreEqual(4, resolus.Length,
                $"couverture attendue 4/{domaine.Length} au 2026-09-07 — le domaine est déclaré à "
                + "l'ancre `InspectionDtos.cs:55` (`NOMINAL | BACKLOGGED | BUDGET_CUT | SURGE`) et "
                + "l'atelier a dessiné exactement ces quatre-là.");
            Assert.AreEqual(4, domaine.Length,
                "⛔ le domaine lui-même a changé : re-lire `InspectionDtos.cs:55` avant de toucher au "
                + "compte ci-dessus — c'est le back qui décide, pas cette liste.");
        }
    }
}
