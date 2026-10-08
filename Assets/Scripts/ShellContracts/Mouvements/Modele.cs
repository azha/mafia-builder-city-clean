using System;
using UnityEngine;

namespace MafiaCleanCity.Mouvements
{
    // CLIENT-3 / E1 — le modèle de données de la couche de mouvement (design-couche-mouvement.md v4.3 §2).
    // Tout est immuable : le catalogue est un `static readonly`, la régie ne modifie jamais une définition.

    /// <summary>Design §2 — la CAUSE d'un mouvement. L'unité de quota (§4) et de repli (§5) suit le genre.</summary>
    public enum Genre { Alerte, Ambiance, Retour, Transition }

    /// <summary>Design §2 — ce qu'un canal écrit. Aucune n'écrit `blocksRaycasts` ni `interactable` (G8).</summary>
    public enum Propriete
    {
        /// <summary>`CanvasGroup.alpha`, posé sur la cible elle-même.</summary>
        Alpha,
        /// <summary>0..1 entre `CouleurA` et `CouleurB`, écrit RGB dans `Graphic.color` sans toucher l'alpha.</summary>
        Melange,
        /// <summary>Degrés ; base = `CouleurA`, écrit RGB seulement, sans composition avec le propriétaire.</summary>
        Hue,
        /// <summary>Alpha d'un calque de lumière ENFANT nommé `Eclat`.</summary>
        Eclat,
        TranslationX,
        TranslationY,
        Rotation,
        /// <summary>Uniforme : X et Y ensemble.</summary>
        Echelle,
        EchelleX,
        EchelleY,
        /// <summary>`Image.fillAmount` — progression FONCTIONNELLE (l'arc d'appui long de 1 000 ms du canon).</summary>
        Remplissage,
        /// <summary>Puits générique : `IParametreAnime.PoserParametre(canal, v)`.</summary>
        Parametre,
    }

    /// <summary>Design §2 — comment un canal se compose avec la base de sa propriété.</summary>
    public enum Mode
    {
        /// <summary>Delta : translations, rotation du tremblement.</summary>
        Additif,
        /// <summary>Facteur : alpha, échelle.</summary>
        Multiplicatif,
        /// <summary>Valeur imposée : mélange, hue, balayage d'aiguille, remplissage.</summary>
        Absolu,
    }

    /// <summary>Design §2 — une image clé : à `T` (fraction de la période, 0..1) la valeur vaut `V`, et le segment qui
    /// part d'ici est assoupli par `E`.</summary>
    public readonly struct ImageCle
    {
        public readonly float T;
        public readonly float V;
        public readonly Aisance E;

        public ImageCle(float t, float v, Aisance e)
        {
            T = t; V = v; E = e;
        }
    }

    /// <summary>Design §2 — `Canal { P; M; Cles }`. `Index` n'a de sens que pour `Parametre` (le « canal » de
    /// `IParametreAnime.PoserParametre`).</summary>
    public sealed class Canal
    {
        public readonly Propriete P;
        public readonly Mode M;
        public readonly ImageCle[] Cles;
        public readonly int Index;

        public Canal(Propriete p, Mode m, ImageCle[] cles, int index = 0)
        {
            if (cles == null || cles.Length < 2)
                throw new ArgumentException("un canal porte au moins deux images clés", nameof(cles));
            float prec = 0f;
            for (int i = 0; i < cles.Length; i++)
            {
                if (cles[i].T < prec || cles[i].T > 1f)
                    throw new ArgumentException("images clés : T croissant dans [0, 1]", nameof(cles));
                prec = cles[i].T;
            }
            P = p; M = m; Cles = cles; Index = index;
        }

        public bool EstTranslation => P == Propriete.TranslationX || P == Propriete.TranslationY;
    }

    /// <summary>Design §2 — `Infini` ou `Fois n`.</summary>
    public readonly struct Iteration
    {
        public readonly bool Infini;
        public readonly int N;

        private Iteration(bool infini, int n)
        {
            Infini = infini; N = n;
        }

        public static readonly Iteration InfiniFois = new Iteration(true, 0);

        public static Iteration Fois(int n)
        {
            if (n < 1) throw new ArgumentOutOfRangeException(nameof(n));
            return new Iteration(false, n);
        }
    }

    /// <summary>
    /// Design §2 + §16 — une couleur de `Melange` / `Hue`. `CouleurA` : couleur nommée OU `Cible` (le RGB de la cible,
    /// lu à l'attachement, traité comme la base d'un transform). `CouleurB` : couleur nommée OU `Cible × k` (facteur
    /// RGB par canal, borné à [0, 1]). L'alpha n'est JAMAIS porté ici : celui du `Graphic` n'est pas touché.
    /// </summary>
    public readonly struct CouleurSpec
    {
        public enum Sorte { Aucune, Nommee, Cible, CibleFois }

        public readonly Sorte Quoi;
        public readonly string Nom;
        public readonly Color Valeur;
        public readonly float K;

        private CouleurSpec(Sorte quoi, string nom, Color valeur, float k)
        {
            Quoi = quoi; Nom = nom; Valeur = valeur; K = k;
        }

        public static readonly CouleurSpec Aucune = default;
        public static readonly CouleurSpec Cible = new CouleurSpec(Sorte.Cible, "Cible", default, 1f);

        public static CouleurSpec Nommee(string nom, Color valeur) => new CouleurSpec(Sorte.Nommee, nom, valeur, 1f);
        public static CouleurSpec CibleFois(float k) => new CouleurSpec(Sorte.CibleFois, "Cible x k", default, k);

        public bool EstCible => Quoi == Sorte.Cible;

        /// <summary>La couleur RGB résolue, `cibleRgb` étant celle que la cible portait à l'attachement. Alpha = 1.</summary>
        public Color Resoudre(Color cibleRgb)
        {
            switch (Quoi)
            {
                case Sorte.Nommee: return new Color(Valeur.r, Valeur.g, Valeur.b, 1f);
                case Sorte.Cible: return new Color(cibleRgb.r, cibleRgb.g, cibleRgb.b, 1f);
                case Sorte.CibleFois:
                    return new Color(Mathf.Clamp01(cibleRgb.r * K), Mathf.Clamp01(cibleRgb.g * K), Mathf.Clamp01(cibleRgb.b * K), 1f);
                default: return new Color(cibleRgb.r, cibleRgb.g, cibleRgb.b, 1f);
            }
        }
    }

    /// <summary>
    /// Design §2 — la définition immuable d'un mouvement. `PoseDeReposS` est l'instant où le mouvement est FIGÉ sous
    /// `Reduit` et sous délestage (§5, §4) ; l'évaluation du gel se fait à cet instant SANS `PhaseS`.
    /// </summary>
    public sealed class MouvementDefini
    {
        /// <summary>« — » du catalogue (§I.4) : pas de pose déclarée ; un mouvement fini saute à sa FIN (l'état du propriétaire).</summary>
        public const float PoseALaFin = -1f;

        public readonly string Id;
        public readonly Genre G;
        public readonly float PeriodeS;
        public readonly Canal[] Canaux;
        public readonly Iteration Iteration;
        public readonly bool Alterne;
        public readonly float PoseDeReposS;
        public readonly CouleurSpec CouleurA, CouleurB;
        public readonly bool Fonctionnelle;

        public MouvementDefini(string id, Genre g, float periodeS, Canal[] canaux, Iteration iteration, bool alterne = false,
            float poseDeReposS = PoseALaFin, CouleurSpec couleurA = default, CouleurSpec couleurB = default, bool fonctionnelle = false)
        {
            if (string.IsNullOrEmpty(id)) throw new ArgumentException("Id vide", nameof(id));
            if (periodeS <= 0f) throw new ArgumentOutOfRangeException(nameof(periodeS));
            if (canaux == null || canaux.Length == 0 || canaux.Length > MouvementTunables.CanauxParPisteMax)
                throw new ArgumentException("1.." + MouvementTunables.CanauxParPisteMax + " canaux", nameof(canaux));
            Id = id; G = g; PeriodeS = periodeS; Canaux = canaux; Iteration = iteration; Alterne = alterne;
            PoseDeReposS = poseDeReposS; CouleurA = couleurA; CouleurB = couleurB; Fonctionnelle = fonctionnelle;
        }

        public bool PoseDefinie => PoseDeReposS >= 0f;

        /// <summary>Durée d'un aller (ou d'un aller-retour si `Alterne`) × itérations ; +∞ si `Infini`.</summary>
        public float DureeTotaleS => Iteration.Infini ? float.PositiveInfinity : PeriodeS * Iteration.N;
    }

    /// <summary>
    /// Design §2 — le réglage PAR INSTANCE (équivalents CSS de `--own --amp --dur --mo --dx --chute`).
    /// `PhaseS` suit la convention de `animation-delay` : positif = retard (la première image clé est tenue avant),
    /// négatif = avance (la piste démarre `|PhaseS|` secondes dans son cycle). `KAmp` multiplie l'écart à l'identité des
    /// canaux `Additif`/`Multiplicatif`, `KDepl` celui des translations (en plus), `KDuree` la période.
    /// `Dx` et `Chute` sont PORTÉS (le contrôleur ou la planche les lit) mais la régie ne les applique pas en E1 :
    /// ce sont des cibles de déplacement résolues contre le rect de la cible, besoin d'E3/E5.
    /// </summary>
    public readonly struct Reglage
    {
        public readonly float PhaseS, KAmp, KDuree, KDepl, Dx, Chute;

        public Reglage(float phaseS, float kAmp, float kDuree, float kDepl, float dx, float chute)
        {
            PhaseS = phaseS; KAmp = kAmp; KDuree = kDuree; KDepl = kDepl; Dx = dx; Chute = chute;
        }

        public static readonly Reglage Defaut = new Reglage(0f, 1f, 1f, 1f, 0f, 0f);

        public static Reglage AvecPhase(float phaseS) => new Reglage(phaseS, 1f, 1f, 1f, 0f, 0f);
    }

    /// <summary>
    /// Design §2 — une ligne du catalogue. `Ecrans` = les écrans (ou `"*"`) ; `Hote` = `"client"` ou
    /// `"SansHote:<raison>"` (le mouvement existe dans la maquette, pas d'hôte dans le client : compté, jamais passé
    /// sous silence). Une `Entree` à plusieurs écrans compte, pour G4, sur CHACUN des écrans résolus.
    /// </summary>
    public sealed class Entree
    {
        public const string Tous = "*";
        public const string HoteClient = "client";
        public const string PrefixeSansHote = "SansHote:";

        public readonly string Id;
        public readonly string[] Ecrans;
        public readonly string Source;
        public readonly string Cause;
        public readonly Genre Genre;
        public readonly MouvementDefini Mouvement;
        public readonly int Pistes;
        public readonly bool Bloquante;
        public readonly string Hote;

        public Entree(string id, string[] ecrans, string source, string cause, Genre genre, MouvementDefini mouvement,
            int pistes, bool bloquante, string hote)
        {
            Id = id; Ecrans = ecrans; Source = source; Cause = cause; Genre = genre; Mouvement = mouvement;
            Pistes = pistes; Bloquante = bloquante; Hote = hote;
        }

        public bool EstSansHote => Hote != null && Hote.StartsWith(PrefixeSansHote, StringComparison.Ordinal);
        public string RaisonSansHote => EstSansHote ? Hote.Substring(PrefixeSansHote.Length) : null;

        public bool ConcerneTousLesEcrans
        {
            get
            {
                if (Ecrans == null) return false;
                for (int i = 0; i < Ecrans.Length; i++) if (Ecrans[i] == Tous) return true;
                return false;
            }
        }

        /// <summary>Vrai si l'entrée pèse sur cet écran : nommé, ou `"*"`.</summary>
        public bool Concerne(string ecran)
        {
            if (Ecrans == null) return false;
            for (int i = 0; i < Ecrans.Length; i++) if (Ecrans[i] == Tous || Ecrans[i] == ecran) return true;
            return false;
        }
    }
}
