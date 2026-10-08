using System;
using System.Collections.Generic;
using UnityEngine;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.Mouvements
{
    /// <summary>Le contexte de rendu d'un G13 : ce que le catalogue ne dit pas de la cible (l'`Entree` ne nomme pas de cible).
    /// Les valeurs par défaut sont celles d'un hôte ordinaire ; un test ou la planche les resserre.</summary>
    public readonly struct ContexteRendu
    {
        /// <summary>L'alpha du `Graphic` sous un `CanvasGroup` : la variation rendue est `Δfacteur × AlphaGraphic`.</summary>
        public readonly float AlphaGraphic;
        /// <summary>Distance, en px écran, du point le plus éloigné au pivot (rotation : rayon × θ ; échelle : rayon × Δk).</summary>
        public readonly float RayonPx;
        /// <summary>Px physiques par unité de canvas (translation : delta × cette valeur).</summary>
        public readonly float PxParUnite;
        /// <summary>Le RGB que la cible porte à l'attachement (pour `Cible` et `Cible × k`).</summary>
        public readonly Color CibleRvb;

        public ContexteRendu(float alphaGraphic, float rayonPx, float pxParUnite, Color cibleRvb)
        {
            AlphaGraphic = alphaGraphic; RayonPx = rayonPx; PxParUnite = pxParUnite; CibleRvb = cibleRvb;
        }

        public static ContexteRendu Defaut => new ContexteRendu(1f, 100f, 1f, new Color(0.5f, 0.5f, 0.5f, 1f));
    }

    /// <summary>
    /// CLIENT-3 / E1 (design §10) — les gardes de DONNÉE exécutables sur le catalogue en mémoire : des fonctions pures qui
    /// rendent la liste des violations (vide = vert). Chacune a son contrôle négatif dans les tests (une donnée fautive
    /// qui DOIT rougir). Les gardes qui lisent un arbre monté (G6, G9, G11) ou le code source de tout `Assets/Scripts`
    /// (G10) sont E2.
    /// </summary>
    public static class Gardes
    {
        public const int CauseMinCar = 20;

        // ---- G1 -----------------------------------------------------------------------------------------------
        /// <summary>G1 : `Cause` (≥ 20 car., ni vide ni « TODO »), `Source`, `Ecrans`, `Id` unique, genre cohérent, `Hote` bien formé.
        /// (`Attacher` hors catalogue LÈVE : c'est la régie, testée à part.)</summary>
        public static List<string> G1(IReadOnlyList<Entree> catalogue)
        {
            var v = new List<string>();
            var vus = new HashSet<string>();
            for (int i = 0; i < catalogue.Count; i++)
            {
                Entree e = catalogue[i];
                string id = e.Id ?? "(sans Id)";
                if (string.IsNullOrWhiteSpace(e.Id)) v.Add("G1 " + id + " : Id vide");
                else if (!vus.Add(e.Id)) v.Add("G1 " + id + " : Id en double");
                string cause = e.Cause == null ? "" : e.Cause.Trim();
                if (cause.Length < CauseMinCar) v.Add("G1 " + id + " : Cause de " + cause.Length + " car. (< " + CauseMinCar + ")");
                else if (cause.IndexOf("TODO", StringComparison.OrdinalIgnoreCase) >= 0) v.Add("G1 " + id + " : Cause « TODO »");
                if (string.IsNullOrWhiteSpace(e.Source)) v.Add("G1 " + id + " : Source vide");
                if (e.Ecrans == null || e.Ecrans.Length == 0) v.Add("G1 " + id + " : Ecrans vide");
                else for (int j = 0; j < e.Ecrans.Length; j++) if (string.IsNullOrWhiteSpace(e.Ecrans[j])) v.Add("G1 " + id + " : un écran sans nom");
                if (e.Mouvement == null) { v.Add("G1 " + id + " : Mouvement nul"); continue; }
                if (e.Mouvement.G != e.Genre) v.Add("G1 " + id + " : Genre " + e.Genre + " ≠ Genre du mouvement " + e.Mouvement.G);
                if (e.Pistes < 1) v.Add("G1 " + id + " : Pistes < 1");
                if (e.Hote != Entree.HoteClient && !(e.EstSansHote && !string.IsNullOrWhiteSpace(e.RaisonSansHote)))
                    v.Add("G1 " + id + " : Hote doit valoir « client » ou « SansHote:<raison> »");
            }
            return v;
        }

        // ---- G3 -----------------------------------------------------------------------------------------------
        /// <summary>G3 : `PoseDeReposS` donne une valeur ≠ repos sur CHAQUE canal (une frame riche). Obligatoire pour une
        /// `Alerte` et une `Ambiance` (elles se figent sous `Reduit`) ; vérifiée dès qu'une pose est déclarée.</summary>
        public static List<string> G3(IReadOnlyList<Entree> catalogue)
        {
            var v = new List<string>();
            for (int i = 0; i < catalogue.Count; i++)
            {
                Entree e = catalogue[i];
                MouvementDefini m = e.Mouvement;
                bool fige = e.Genre == Genre.Alerte || e.Genre == Genre.Ambiance;
                if (fige && !m.PoseDefinie) { v.Add("G3 " + e.Id + " : " + e.Genre + " sans PoseDeReposS"); continue; }
                if (!m.PoseDefinie) continue;
                float phase = Courbes.PhaseDePose(m);
                for (int ci = 0; ci < m.Canaux.Length; ci++)
                {
                    Canal c = m.Canaux[ci];
                    float val = Courbes.EvaluerCanal(c, phase);
                    float repos = Courbes.Repos(c.P, c.M);
                    if (Mathf.Abs(val - repos) <= MouvementTunables.SeuilPoseRiche)
                        v.Add("G3 " + e.Id + " : la pose (" + m.PoseDeReposS + " s) donne " + val + " sur " + c.P + ", c'est le repos");
                }
            }
            return v;
        }

        // ---- G4 -----------------------------------------------------------------------------------------------
        /// <summary>G4 : budget par écran RÉSOLU ≤ 16 pistes. Une `Entree` à plusieurs écrans compte sur CHACUN ; `"*"` compte
        /// sur tous. `ecransExtra` ajoute des écrans qu'aucune entrée ne nomme (les transverses se résolvent sur eux aussi).</summary>
        public static List<string> G4(IReadOnlyList<Entree> catalogue, IReadOnlyList<string> ecransExtra = null)
        {
            var v = new List<string>();
            var ecrans = new List<string>();
            for (int i = 0; i < catalogue.Count; i++)
            {
                string[] es = catalogue[i].Ecrans;
                if (es == null) continue;
                for (int j = 0; j < es.Length; j++) if (es[j] != Entree.Tous && !ecrans.Contains(es[j])) ecrans.Add(es[j]);
            }
            if (ecransExtra != null) for (int j = 0; j < ecransExtra.Count; j++) if (!ecrans.Contains(ecransExtra[j])) ecrans.Add(ecransExtra[j]);
            if (ecrans.Count == 0) ecrans.Add(Entree.Tous);

            for (int k = 0; k < ecrans.Count; k++)
            {
                int total = 0;
                for (int i = 0; i < catalogue.Count; i++) if (catalogue[i].Concerne(ecrans[k])) total += catalogue[i].Pistes;
                if (total > MouvementTunables.PistesParEcranMax)
                    v.Add("G4 écran " + ecrans[k] + " : " + total + " pistes > " + MouvementTunables.PistesParEcranMax);
            }
            return v;
        }

        // ---- G5 -----------------------------------------------------------------------------------------------
        /// <summary>G5 : au plus 3 extrema par seconde, par piste d'`Alpha`/`Melange`/`Eclat`, APRÈS `Alterne`.</summary>
        public static List<string> G5(IReadOnlyList<Entree> catalogue)
        {
            var v = new List<string>();
            for (int i = 0; i < catalogue.Count; i++)
            {
                MouvementDefini m = catalogue[i].Mouvement;
                for (int ci = 0; ci < m.Canaux.Length; ci++)
                {
                    Canal c = m.Canaux[ci];
                    if (c.P != Propriete.Alpha && c.P != Propriete.Melange && c.P != Propriete.Eclat) continue;
                    float taux = ExtremaParSeconde(m, c);
                    if (taux > MouvementTunables.ExtremaParSecondeMax)
                        v.Add("G5 " + catalogue[i].Id + " : " + taux.ToString("0.00") + " extrema/s sur " + c.P + " (> " + MouvementTunables.ExtremaParSecondeMax + ")");
                }
            }
            return v;
        }

        /// <summary>Les extrema d'un cycle de `c`, rapportés à la durée du cycle (aller-retour compris si `Alterne`).</summary>
        public static float ExtremaParSeconde(MouvementDefini m, Canal c)
        {
            var vals = new List<float>();
            for (int k = 0; k < c.Cles.Length; k++) vals.Add(c.Cles[k].V);
            bool cyclique = m.Iteration.Infini || m.Iteration.N > 1;
            float cycleS = m.PeriodeS;
            if (m.Alterne)
            {
                for (int k = c.Cles.Length - 1; k >= 0; k--) vals.Add(c.Cles[k].V);
                cycleS *= 2f;
                cyclique = true;
            }
            // valeurs consécutives égales fondues en une (un palier n'est pas un extremum)
            var d = new List<float>();
            for (int k = 0; k < vals.Count; k++) if (d.Count == 0 || Mathf.Abs(vals[k] - d[d.Count - 1]) > 1e-5f) d.Add(vals[k]);
            if (cyclique && d.Count > 1 && Mathf.Abs(d[d.Count - 1] - d[0]) <= 1e-5f) d.RemoveAt(d.Count - 1);
            int n = d.Count, compte = 0;
            if (n < 2) return 0f;
            int debut = cyclique ? 0 : 1, fin = cyclique ? n : n - 1;
            for (int k = debut; k < fin; k++)
            {
                float prec = d[(k - 1 + n) % n], cour = d[k], suiv = d[(k + 1) % n];
                if ((cour - prec) * (suiv - cour) < 0f) compte++;
            }
            return compte / cycleS;
        }

        // ---- G8 -----------------------------------------------------------------------------------------------
        /// <summary>G8 : une entrée `Bloquante` ET plus longue que `UiTimingTunables.AnimMaxBlockMs` est refusée ; une entrée non
        /// bloquante peut durer davantage (appui long 1 000 ms, balayage d'aiguille 700 ms) ; les `Retour` d'APPUI
        /// (`retour.appui`, `retour.appui-voile`) ≤ 250 ms. (« Aucun canal n'écrit `blocksRaycasts`/`interactable` » tient par
        /// construction : `Propriete` ne le propose pas — épinglé par un test.)</summary>
        public static List<string> G8(IReadOnlyList<Entree> catalogue)
        {
            var v = new List<string>();
            for (int i = 0; i < catalogue.Count; i++)
            {
                Entree e = catalogue[i];
                float dureeMs = e.Mouvement.DureeTotaleS * 1000f;
                if (e.Bloquante && dureeMs > UiTimingTunables.AnimMaxBlockMs)
                    v.Add("G8 " + e.Id + " : bloquante et " + (float.IsInfinity(dureeMs) ? "infinie" : dureeMs + " ms") + " > " + UiTimingTunables.AnimMaxBlockMs + " ms");
                if ((e.Id == "retour.appui" || e.Id == "retour.appui-voile") && dureeMs > UiTimingTunables.AnimMaxBlockMs)
                    v.Add("G8 " + e.Id + " : un retour d'appui dure " + dureeMs + " ms > " + UiTimingTunables.AnimMaxBlockMs + " ms");
            }
            return v;
        }

        // ---- G12 ----------------------------------------------------------------------------------------------
        /// <summary>G12, côté donnée : un mouvement n'impose pas deux `Absolu` à la même propriété (une piste = une cible, donc
        /// un seul couple). Côté exécution, la régie refuse le second `Absolu` d'un couple et REMPLACE une `Transitionner`
        /// en vol (dette 4 du design) : testé sur la régie.</summary>
        public static List<string> G12(IReadOnlyList<Entree> catalogue)
        {
            var v = new List<string>();
            for (int i = 0; i < catalogue.Count; i++)
            {
                Canal[] cs = catalogue[i].Mouvement.Canaux;
                for (int a = 0; a < cs.Length; a++)
                    for (int b = a + 1; b < cs.Length; b++)
                        if (cs[a].M == Mode.Absolu && cs[b].M == Mode.Absolu && cs[a].P == cs[b].P && cs[a].Index == cs[b].Index)
                            v.Add("G12 " + catalogue[i].Id + " : deux Absolu sur " + cs[a].P);
            }
            return v;
        }

        // ---- G13 ----------------------------------------------------------------------------------------------
        /// <summary>G13 : une `Ambiance` dont AUCUNE propriété ne franchit le seuil de perception de son canal est refusée
        /// (invisible, donc sans cause). Seuils du §6.2 : couleur rendue ≥ 3/255 ; déplacement du point le plus éloigné ≥ 0,5 px
        /// (translation : delta ; rotation : rayon × θ ; échelle : rayon × Δk).</summary>
        public static List<string> G13(IReadOnlyList<Entree> catalogue, ContexteRendu ctx)
        {
            var v = new List<string>();
            for (int i = 0; i < catalogue.Count; i++)
            {
                Entree e = catalogue[i];
                if (e.Genre != Genre.Ambiance) continue;
                bool visible = false;
                for (int ci = 0; ci < e.Mouvement.Canaux.Length && !visible; ci++)
                    visible = FranchitLeSeuil(e.Mouvement, e.Mouvement.Canaux[ci], ctx);
                if (!visible) v.Add("G13 " + e.Id + " : aucune propriété ne franchit son seuil de perception (invisible)");
            }
            return v;
        }

        public static bool FranchitLeSeuil(MouvementDefini m, Canal c, ContexteRendu ctx)
        {
            float mini = float.MaxValue, maxi = float.MinValue;
            for (int k = 0; k < c.Cles.Length; k++)
            {
                mini = Mathf.Min(mini, c.Cles[k].V);
                maxi = Mathf.Max(maxi, c.Cles[k].V);
            }
            float amp = maxi - mini;
            switch (c.P)
            {
                case Propriete.Alpha:
                    return amp * ctx.AlphaGraphic >= MouvementTunables.SeuilCouleurRendue;
                case Propriete.Eclat:
                    return amp >= MouvementTunables.SeuilCouleurRendue;
                case Propriete.Melange:
                {
                    Color a = m.CouleurA.Resoudre(ctx.CibleRvb);
                    Color b = m.CouleurB.Quoi == CouleurSpec.Sorte.Aucune ? a : m.CouleurB.Resoudre(ctx.CibleRvb);
                    return amp * Couleurs.EcartRvb(a, b) >= MouvementTunables.SeuilCouleurRendue;
                }
                case Propriete.Hue:
                {
                    Color a = m.CouleurA.Resoudre(ctx.CibleRvb);
                    return Couleurs.EcartRvb(Couleurs.HueRotate(a, mini), Couleurs.HueRotate(a, maxi)) >= MouvementTunables.SeuilCouleurRendue;
                }
                case Propriete.TranslationX:
                case Propriete.TranslationY:
                    return amp * ctx.PxParUnite >= MouvementTunables.SeuilDeplacementPx;
                case Propriete.Rotation:
                    return ctx.RayonPx * amp * Mathf.Deg2Rad >= MouvementTunables.SeuilDeplacementPx;
                case Propriete.Echelle:
                case Propriete.EchelleX:
                case Propriete.EchelleY:
                    return ctx.RayonPx * amp >= MouvementTunables.SeuilDeplacementPx;
                default:
                    return true;   // `Remplissage` (fonctionnel) et `Parametre` : leur visibilité est celle de l'hôte
            }
        }

        /// <summary>Les gardes de donnée d'un coup (G1, G3, G4, G5, G8, G12, G13).</summary>
        public static List<string> Toutes(IReadOnlyList<Entree> catalogue, ContexteRendu ctx)
        {
            var v = new List<string>();
            v.AddRange(G1(catalogue));
            v.AddRange(G3(catalogue));
            v.AddRange(G4(catalogue));
            v.AddRange(G5(catalogue));
            v.AddRange(G8(catalogue));
            v.AddRange(G12(catalogue));
            v.AddRange(G13(catalogue, ctx));
            v.AddRange(MelangeEtAmbiance(catalogue));
            return v;
        }

        /// <summary>E0 (décision f2, 08/10) : aucune `Ambiance` ne porte un canal `Melange` — la matière qui vit toute seule passe
        /// par l'`Alpha`. (Le plafond de 8 pistes `Melange` vivantes est une affaire de régie, pas de donnée.)</summary>
        public static List<string> MelangeEtAmbiance(IReadOnlyList<Entree> catalogue)
        {
            var v = new List<string>();
            for (int i = 0; i < catalogue.Count; i++)
            {
                Entree e = catalogue[i];
                if (e.Genre != Genre.Ambiance) continue;
                Canal[] cs = e.Mouvement.Canaux;
                for (int k = 0; k < cs.Length; k++)
                    if (cs[k].P == Propriete.Melange) { v.Add("E0 " + e.Id + " : Melange sur une Ambiance (l'Alpha d'abord)"); break; }
            }
            return v;
        }

        // ---- G7 -----------------------------------------------------------------------------------------------
        // Les motifs sont assemblés : leur écriture littérale ferait rougir la garde sur SON PROPRE fichier.
        public static readonly string[] MotifsInterdits =
        {
            "System" + ".Linq",
            "System" + ".Reflection",
            "Activator" + ".CreateInstance",
            "TM" + "Pro",
            "MafiaCleanCity" + ".CityMap",
            "MafiaCleanCity" + ".Operational",
            // E0 (08/10) : le mécanisme ne crée JAMAIS de Canvas (rendu CPU ×2, SetPass 2 → 96 sous masque). `CanvasGroup` reste permis.
            "AddComponent<" + "Canvas>",
            "new " + "Canvas(",
        };

        /// <summary>G7 : motifs interdits dans `Mouvements/` (réflexion, requêtes de collection, texte riche, dépendances vers les assemblies d'écran).
        /// Pure : prend un nom et un texte ; le test l'applique aux vrais fichiers, et à un texte fautif (contrôle négatif).</summary>
        public static List<string> G7(string nomFichier, string source)
        {
            var v = new List<string>();
            for (int k = 0; k < MotifsInterdits.Length; k++)
                if (source.IndexOf(MotifsInterdits[k], StringComparison.Ordinal) >= 0)
                    v.Add("G7 " + nomFichier + " : motif interdit « " + MotifsInterdits[k] + " »");
            return v;
        }
    }
}
