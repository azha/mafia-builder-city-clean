using System;
using UnityEngine;

namespace MafiaCleanCity.Mouvements
{
    /// <summary>
    /// Design §3 (« Accès à la régie ») — le registre statique de la régie, sur le précédent de
    /// `ShellChrome.PublierInsets` : `AppShell` crée la régie et la PUBLIE (E2) ; les contrôleurs passent par les
    /// façades ci-dessous. Un hôte nu (tests de contrôleur sans shell) obtient `Courante == null` : `Attacher` rend alors
    /// un handle nul COMPTÉ dans `SansRegie` ; un test qui veut des pistes crée sa régie par `PourTest()`.
    /// </summary>
    public static class RegieMouvement
    {
        /// <summary>La régie du shell, ou nul. Écrite par `Publier` UNIQUEMENT ; les contrôleurs lisent.</summary>
        public static Regie Courante { get; private set; }

        /// <summary>Les `Attacher`/`Transitionner` demandés alors qu'aucune régie n'était publiée.</summary>
        public static int SansRegie { get; private set; }

        /// <summary>Le niveau de mouvement voulu (§5). Les sources (PlayerPrefs, Android : `MouvementReduit`) ne passent que par ici.</summary>
        public static PolitiqueMouvement PolitiqueGlobale { get; private set; } = PolitiqueMouvement.Plein;

        private static Regie pourTest;

        public static void Publier(Regie r)
        {
            Courante = r;
            if (r != null) r.Politique = PolitiqueGlobale;
        }

        /// <summary>Retire la régie du registre si c'est elle (appelé par `Regie.OnDestroy`).</summary>
        internal static void Retirer(Regie r)
        {
            if (ReferenceEquals(Courante, r)) Courante = null;
            if (ReferenceEquals(pourTest, r)) pourTest = null;
        }

        /// <summary>Le setter de la politique : mémorise le niveau et le pose sur la régie courante, si elle existe.</summary>
        public static void PoserPolitique(PolitiqueMouvement p)
        {
            PolitiqueGlobale = p;
            if (Courante != null) Courante.Politique = p;
        }

        /// <summary>Une régie de test, PUBLIÉE comme `Courante`, à horloge `Figee(0)` : son `Update` est inerte, les `Tick`
        /// sont posés à la main. Le test la détruit par `Oublier()` (TearDown).</summary>
        public static Regie PourTest()
        {
            Oublier();
            var go = new GameObject("RegieMouvementPourTest");
            go.hideFlags = HideFlags.HideAndDontSave;
            Regie r = go.AddComponent<Regie>();
            r.Horloge = new HorlogeFigee(0f);
            pourTest = r;
            Publier(r);
            return r;
        }

        /// <summary>Détruit la régie de test, vide le registre, remet les compteurs statiques et la politique à zéro.</summary>
        public static void Oublier()
        {
            if (pourTest != null) UnityEngine.Object.DestroyImmediate(pourTest.gameObject);
            pourTest = null;
            Courante = null;
            SansRegie = 0;
            PolitiqueGlobale = PolitiqueMouvement.Plein;
        }

        // ---- façades null-sûres : le contrôleur ne teste jamais `Courante`
        public static Handle Attacher(Entree e, RectTransform cible, Reglage r, Action<Handle> quandFini = null)
        {
            Regie rg = Courante;
            if (rg == null)
            {
                SansRegie++;
                return Handle.Nul;
            }
            return rg.Attacher(e, cible, r, quandFini);
        }

        public static Handle Transitionner(Entree e, RectTransform cible, float de, float vers, Action<Handle> quandFini = null)
        {
            Regie rg = Courante;
            if (rg == null)
            {
                SansRegie++;
                return Handle.Nul;
            }
            return rg.Transitionner(e, cible, de, vers, quandFini);
        }

        public static void Detacher(Handle h)
        {
            if (Courante != null) Courante.Detacher(h);
        }

        public static void Rebaser(RectTransform cible, Propriete p)
        {
            if (Courante != null) Courante.Rebaser(cible, p);
        }

        public static void DetacherSous(Transform racine)
        {
            if (Courante != null) Courante.DetacherSous(racine);
        }
    }
}
