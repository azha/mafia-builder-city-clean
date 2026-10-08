using System;
using UnityEngine;
using UnityEngine.UI;

namespace MafiaCleanCity.Mouvements
{
    /// <summary>Design §3 — le jeton d'une piste. Une structure : l'emplacement est recyclé, la génération invalide les
    /// jetons périmés (un `Detacher` tardif ne détache jamais la piste d'un autre). `Nul` = refus, ou hôte nu.</summary>
    public readonly struct Handle
    {
        internal readonly int Slot;
        internal readonly int Gen;

        internal Handle(int slot, int gen)
        {
            Slot = slot; Gen = gen;
        }

        public bool EstNul => Gen == 0;
        public static readonly Handle Nul = default;
    }

    /// <summary>Une piste = UNE cible animée (design §4) : tous ses canaux comptent pour 1. Préallouée, recyclée.</summary>
    internal sealed class Piste
    {
        public bool vivante;
        public int gen;
        public Entree entree;
        public MouvementDefini def;
        public RectTransform cible;
        public Reglage reg;
        public float periodeEff, cycleLen;
        public bool transitionner;
        public float de, vers;
        public Action<Handle> quandFini;
        public bool ambiance;
        public bool melange;   // la piste porte un canal `Melange` (quota E0)

        public float age, tRef;
        public bool aEvalue, fini, notifie;
        public float horsChampDepuis = float.NaN;

        public int n;
        public readonly int[] couple = new int[MouvementTunables.CanauxParPisteMax];
        public readonly float[] val = new float[MouvementTunables.CanauxParPisteMax];
        public readonly bool[] gele = new bool[MouvementTunables.CanauxParPisteMax];

        public void Vider()
        {
            entree = null; def = null; cible = null; quandFini = null;
            vivante = false; n = 0; melange = false;
        }
    }

    /// <summary>
    /// Le COUPLE (cible, propriété) : l'endroit où les pistes se composent (design §3). `valeur = (base ⊕ additifs) × facteurs`,
    /// un `Absolu` REMPLAÇANT la base. La base est la propriété du PROPRIÉTAIRE, relue par `Rebaser` (explicite) ou par la
    /// détection par epsilons (filet). Tout y est préalloué.
    /// </summary>
    internal sealed class Couple
    {
        public bool utilise;
        public int refs;
        public RectTransform rt;
        public Propriete p;
        public int idx;

        public CanvasGroup cg;
        public bool cgPose;
        public Graphic gr;
        public Image img;
        public Graphic eclat;
        public IParametreAnime param;

        public float baseF, baseF2;
        public Color baseRgb;
        public CouleurSpec cA, cB;

        public float ecrit, ecrit2;
        public Color ecritRgb;
        public bool ecritValide;

        public int occupant = -1;
        public bool occupantTransition;

        public float add, mul, absVal;
        public bool hasAbs;
        public bool actif;

        public static Graphic TrouverEclat(RectTransform rt)
        {
            Transform t = rt.Find("Eclat");
            return t != null ? t.GetComponent<Graphic>() : null;
        }

        /// <summary>Faisabilité, SANS effet de bord : un `Melange` sans `Graphic` n'écrit rien de visible (§17).</summary>
        public static bool Realisable(RectTransform rt, Canal c)
        {
            switch (c.P)
            {
                case Propriete.Melange:
                case Propriete.Hue: return rt.GetComponent<Graphic>() != null;
                case Propriete.Eclat: return TrouverEclat(rt) != null;
                case Propriete.Remplissage: return rt.GetComponent<Image>() != null;
                case Propriete.Parametre: return rt.GetComponent<IParametreAnime>() != null;
                default: return true;
            }
        }

        public void Init(RectTransform cible, Canal c, MouvementDefini m)
        {
            utilise = true; refs = 0; rt = cible; p = c.P; idx = c.P == Propriete.Parametre ? c.Index : 0;
            cg = null; cgPose = false; gr = null; img = null; eclat = null; param = null;
            baseF = baseF2 = 0f; ecrit = ecrit2 = 0f; baseRgb = Color.white; ecritRgb = Color.white;
            cA = default; cB = default; occupant = -1; occupantTransition = false; ecritValide = true;
            switch (p)
            {
                case Propriete.Alpha:
                    cg = rt.GetComponent<CanvasGroup>();
                    if (cg == null) { cg = rt.gameObject.AddComponent<CanvasGroup>(); cgPose = true; }
                    baseF = cg.alpha; ecrit = baseF;
                    break;
                case Propriete.Melange:
                    gr = rt.GetComponent<Graphic>();
                    baseRgb = gr.color; ecritRgb = baseRgb; cA = m.CouleurA; cB = m.CouleurB;
                    ecrit = 0f;
                    // Un `A` nommé n'est pas ce que la cible porte aujourd'hui : la première écriture est forcée.
                    ecritValide = cA.EstCible;
                    break;
                case Propriete.Hue:
                    gr = rt.GetComponent<Graphic>();
                    baseRgb = gr.color; cA = m.CouleurA; cB = m.CouleurB;
                    ecrit = 0f; ecritValide = false;
                    break;
                case Propriete.Eclat:
                    eclat = TrouverEclat(rt);
                    baseF = eclat.color.a; ecrit = baseF;
                    break;
                case Propriete.Remplissage:
                    img = rt.GetComponent<Image>();
                    baseF = img.fillAmount; ecrit = baseF;
                    break;
                case Propriete.Parametre:
                    param = rt.GetComponent<IParametreAnime>();
                    baseF = 0f; ecrit = 0f; ecritValide = false;
                    break;
                default:
                    LireBase();   // transforms : la base est la propriété du propriétaire, lue maintenant
                    break;
            }
        }

        /// <summary>(Re)lit la base dans la propriété du propriétaire, et aligne `ecrit` dessus.</summary>
        private void LireBase()
        {
            if (rt == null) return;
            switch (p)
            {
                case Propriete.TranslationX: baseF = rt.anchoredPosition.x; ecrit = baseF; break;
                case Propriete.TranslationY: baseF = rt.anchoredPosition.y; ecrit = baseF; break;
                case Propriete.Rotation: baseF = Mathf.DeltaAngle(0f, rt.localEulerAngles.z); ecrit = baseF; break;
                case Propriete.Echelle: { Vector3 s = rt.localScale; baseF = s.x; baseF2 = s.y; ecrit = s.x; ecrit2 = s.y; break; }
                case Propriete.EchelleX: baseF = rt.localScale.x; ecrit = baseF; break;
                case Propriete.EchelleY: baseF = rt.localScale.y; ecrit = baseF; break;
            }
        }

        /// <summary>`Rebaser` : le propriétaire vient de réécrire cette propriété — la base devient la valeur courante, et la
        /// prochaine écriture est forcée (elle recompose par-dessus).</summary>
        public void Rebaser()
        {
            if (rt == null) return;
            switch (p)
            {
                case Propriete.Alpha: if (cg != null) baseF = cg.alpha; break;
                case Propriete.Melange: if (gr != null) baseRgb = gr.color; break;
                case Propriete.Eclat: if (eclat != null) baseF = eclat.color.a; break;
                case Propriete.Remplissage: if (img != null) baseF = img.fillAmount; break;
                case Propriete.Hue:
                case Propriete.Parametre: break;
                default: LireBase(); break;
            }
            ecritValide = false;
        }

        /// <summary>La détection (filet d'un propriétaire oublié, §3) : la valeur courante s'écarte de ce que la régie a écrit
        /// de plus que l'epsilon de la propriété ⇒ le propriétaire a réécrit ⇒ la base devient la valeur courante.
        /// `Rotation` se compare par `DeltaAngle` (jamais en brut : `localEulerAngles` est normalisé dans [0,360)).</summary>
        public bool Detecter()
        {
            if (!ecritValide || rt == null) return false;
            bool ecart = false;
            switch (p)
            {
                case Propriete.Alpha:
                    ecart = Mathf.Abs(cg.alpha - ecrit) > MouvementTunables.EpsAlpha;
                    break;
                case Propriete.Melange:
                {
                    Color c = gr.color;
                    ecart = Mathf.Abs(c.r - ecritRgb.r) > MouvementTunables.EpsMelange || Mathf.Abs(c.g - ecritRgb.g) > MouvementTunables.EpsMelange
                            || Mathf.Abs(c.b - ecritRgb.b) > MouvementTunables.EpsMelange;
                    break;
                }
                case Propriete.Eclat:
                    ecart = Mathf.Abs(eclat.color.a - ecrit) > MouvementTunables.EpsEclat;
                    break;
                case Propriete.Remplissage:
                    ecart = Mathf.Abs(img.fillAmount - ecrit) > MouvementTunables.EpsRemplissage;
                    break;
                case Propriete.TranslationX:
                    ecart = Mathf.Abs(rt.anchoredPosition.x - ecrit) > MouvementTunables.EpsTranslationPx;
                    break;
                case Propriete.TranslationY:
                    ecart = Mathf.Abs(rt.anchoredPosition.y - ecrit) > MouvementTunables.EpsTranslationPx;
                    break;
                case Propriete.Rotation:
                    ecart = Mathf.Abs(Mathf.DeltaAngle(ecrit, rt.localEulerAngles.z)) > MouvementTunables.EpsRotationDeg;
                    break;
                case Propriete.Echelle:
                {
                    Vector3 s = rt.localScale;
                    ecart = Mathf.Abs(s.x - ecrit) > MouvementTunables.EpsEchelle || Mathf.Abs(s.y - ecrit2) > MouvementTunables.EpsEchelle;
                    break;
                }
                case Propriete.EchelleX:
                    ecart = Mathf.Abs(rt.localScale.x - ecrit) > MouvementTunables.EpsEchelle;
                    break;
                case Propriete.EchelleY:
                    ecart = Mathf.Abs(rt.localScale.y - ecrit) > MouvementTunables.EpsEchelle;
                    break;
            }
            if (ecart) Rebaser();
            return ecart;
        }

        /// <summary>Compose et écrit — seulement si la valeur a changé de plus de l'epsilon de la propriété. Vrai si écrit.</summary>
        public bool Appliquer()
        {
            float b = hasAbs ? absVal : baseF;
            float v = (b + add) * mul;
            switch (p)
            {
                case Propriete.Alpha:
                {
                    v = Mathf.Clamp01(v);
                    if (ecritValide && Mathf.Abs(v - ecrit) <= MouvementTunables.EpsAlpha) return false;
                    cg.alpha = v; ecrit = v; ecritValide = true;
                    return true;
                }
                case Propriete.TranslationX:
                {
                    if (ecritValide && Mathf.Abs(v - ecrit) <= MouvementTunables.EpsTranslationPx) return false;
                    Vector2 ap = rt.anchoredPosition; ap.x = v; rt.anchoredPosition = ap;
                    ecrit = v; ecritValide = true;
                    return true;
                }
                case Propriete.TranslationY:
                {
                    if (ecritValide && Mathf.Abs(v - ecrit) <= MouvementTunables.EpsTranslationPx) return false;
                    Vector2 ap = rt.anchoredPosition; ap.y = v; rt.anchoredPosition = ap;
                    ecrit = v; ecritValide = true;
                    return true;
                }
                case Propriete.Rotation:
                {
                    if (ecritValide && Mathf.Abs(Mathf.DeltaAngle(ecrit, v)) <= MouvementTunables.EpsRotationDeg) return false;
                    Vector3 e = rt.localEulerAngles; e.z = v; rt.localEulerAngles = e;
                    ecrit = v; ecritValide = true;
                    return true;
                }
                case Propriete.Echelle:
                {
                    float b2 = hasAbs ? absVal : baseF2;
                    float v2 = (b2 + add) * mul;
                    if (ecritValide && Mathf.Abs(v - ecrit) <= MouvementTunables.EpsEchelle && Mathf.Abs(v2 - ecrit2) <= MouvementTunables.EpsEchelle) return false;
                    Vector3 s = rt.localScale; s.x = v; s.y = v2; rt.localScale = s;
                    ecrit = v; ecrit2 = v2; ecritValide = true;
                    return true;
                }
                case Propriete.EchelleX:
                {
                    if (ecritValide && Mathf.Abs(v - ecrit) <= MouvementTunables.EpsEchelle) return false;
                    Vector3 s = rt.localScale; s.x = v; rt.localScale = s;
                    ecrit = v; ecritValide = true;
                    return true;
                }
                case Propriete.EchelleY:
                {
                    if (ecritValide && Mathf.Abs(v - ecrit) <= MouvementTunables.EpsEchelle) return false;
                    Vector3 s = rt.localScale; s.y = v; rt.localScale = s;
                    ecrit = v; ecritValide = true;
                    return true;
                }
                case Propriete.Melange:
                {
                    float m = Mathf.Clamp01(v);
                    if (ecritValide && Mathf.Abs(m - ecrit) <= MouvementTunables.EpsMelange) return false;
                    Color a = cA.Resoudre(baseRgb);
                    Color bb = cB.Quoi == CouleurSpec.Sorte.Aucune ? a : cB.Resoudre(baseRgb);
                    Color rgb = Color.Lerp(a, bb, m);
                    rgb.a = gr.color.a;
                    gr.color = rgb;
                    ecritRgb = rgb; ecrit = m; ecritValide = true;
                    return true;
                }
                case Propriete.Hue:
                {
                    if (ecritValide && Mathf.Abs(Mathf.DeltaAngle(ecrit, v)) <= MouvementTunables.EpsHueDeg) return false;
                    Color rgb = Couleurs.HueRotate(cA.Resoudre(baseRgb), v);
                    rgb.a = gr.color.a;
                    gr.color = rgb;
                    ecrit = v; ecritValide = true;
                    return true;
                }
                case Propriete.Eclat:
                {
                    v = Mathf.Clamp01(v);
                    if (ecritValide && Mathf.Abs(v - ecrit) <= MouvementTunables.EpsEclat) return false;
                    Color c = eclat.color; c.a = v; eclat.color = c;
                    ecrit = v; ecritValide = true;
                    return true;
                }
                case Propriete.Remplissage:
                {
                    v = Mathf.Clamp01(v);
                    if (ecritValide && Mathf.Abs(v - ecrit) <= MouvementTunables.EpsRemplissage) return false;
                    img.fillAmount = v; ecrit = v; ecritValide = true;
                    return true;
                }
                case Propriete.Parametre:
                {
                    if (ecritValide && Mathf.Abs(v - ecrit) <= MouvementTunables.EpsParametre) return false;
                    param.PoserParametre(idx, v); ecrit = v; ecritValide = true;
                    return true;
                }
            }
            return false;
        }

        /// <summary>`Detacher` (design §3, « Fin de piste ») : transform → base ; `CanvasGroup` posé par la régie → 1 (ou la
        /// valeur d'avant s'il préexistait) ; `Melange`/`Hue` → `CouleurA` (la couleur de la cible, si `Cible`) ; `Eclat` → 0.</summary>
        public void Restituer()
        {
            if (rt == null) return;
            switch (p)
            {
                case Propriete.Alpha: if (cg != null) cg.alpha = cgPose ? 1f : baseF; break;
                case Propriete.TranslationX: { Vector2 ap = rt.anchoredPosition; ap.x = baseF; rt.anchoredPosition = ap; break; }
                case Propriete.TranslationY: { Vector2 ap = rt.anchoredPosition; ap.y = baseF; rt.anchoredPosition = ap; break; }
                case Propriete.Rotation: { Vector3 e = rt.localEulerAngles; e.z = baseF; rt.localEulerAngles = e; break; }
                case Propriete.Echelle: { Vector3 s = rt.localScale; s.x = baseF; s.y = baseF2; rt.localScale = s; break; }
                case Propriete.EchelleX: { Vector3 s = rt.localScale; s.x = baseF; rt.localScale = s; break; }
                case Propriete.EchelleY: { Vector3 s = rt.localScale; s.y = baseF; rt.localScale = s; break; }
                case Propriete.Melange:
                case Propriete.Hue:
                    if (gr != null)
                    {
                        Color a = cA.Resoudre(baseRgb);
                        a.a = gr.color.a;
                        gr.color = a;
                    }
                    break;
                case Propriete.Eclat: if (eclat != null) { Color c = eclat.color; c.a = 0f; eclat.color = c; } break;
                case Propriete.Remplissage: if (img != null) img.fillAmount = baseF; break;
                case Propriete.Parametre: if (param != null) param.PoserParametre(idx, baseF); break;
            }
        }

        public void Vider()
        {
            utilise = false; refs = 0; rt = null; cg = null; gr = null; img = null; eclat = null; param = null;
            occupant = -1; occupantTransition = false;
        }
    }
}
