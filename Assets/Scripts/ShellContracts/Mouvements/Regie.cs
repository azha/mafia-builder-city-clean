using System;
using System.Collections.Generic;
using UnityEngine;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.Mouvements
{
    /// <summary>
    /// CLIENT-3 / E1 (design-couche-mouvement.md v4.3 §3-§5) — UNE régie : le seul endroit qui écrit un mouvement.
    /// Créée et publiée par `AppShell` en E2 (`RegieMouvement.Publier`) ; un test crée la sienne (`RegieMouvement.PourTest`).
    ///
    /// Ordre dans `Tick` : (1) cible nulle ⇒ libérée ; (2) idempotence (`t == dernierT` ⇒ retour) ; (3) cadence ;
    /// (4) visibilité ; (5) évaluation ; (6) composition ; (7) écriture. Les `quandFini` partent APRÈS l'écriture.
    ///
    /// Régime : 0 octet alloué par `Tick` — tableaux préalloués (48 pistes, 192 couples), aucune requête de collection, aucune closure, aucun boxing ;
    /// seuls `Attacher`/`Transitionner`/`Detacher` (événements, pas régime) peuvent allouer (un `CanvasGroup` à poser).
    /// </summary>
    public sealed class Regie : MonoBehaviour
    {
        // ------------------------------------------------------------------------------ état
        private readonly Piste[] pistes = CreerPistes();
        private readonly Couple[] couples = CreerCouples();
        private readonly Dictionary<string, Entree> admises = CatalogueInitial();
        private readonly int[] finis = new int[MouvementTunables.PistesMax];
        private readonly int[] finisGen = new int[MouvementTunables.PistesMax];
        private readonly int[] remplaces = new int[MouvementTunables.CanauxParPisteMax];
        private int nFinis, nAmbiance, nAutres, nCouples, nMelange;

        private bool aTicke;
        private float dernierT;

        // délestage (§4)
        private readonly float[] fenetre = new float[MouvementTunables.DelestageFenetreImages];
        private readonly float[] brouillon = new float[MouvementTunables.DelestageFenetreImages];
        private int posFenetre, nFenetre, depuisMediane;
        private float cadenceCible, ema, tLent, tTresLent, tCalme;
        private bool emaInit;
        private EtatDelestage delestage;

        private static Piste[] CreerPistes()
        {
            var a = new Piste[MouvementTunables.PistesMax];
            for (int i = 0; i < a.Length; i++) a[i] = new Piste();
            return a;
        }

        private static Couple[] CreerCouples()
        {
            var a = new Couple[MouvementTunables.CouplesMax];
            for (int i = 0; i < a.Length; i++) a[i] = new Couple();
            return a;
        }

        private static Dictionary<string, Entree> CatalogueInitial()
        {
            var d = new Dictionary<string, Entree>();
            IReadOnlyList<Entree> hud = CatalogueHud.Entrees;
            for (int i = 0; i < hud.Count; i++) d[hud[i].Id] = hud[i];
            return d;
        }

        // ------------------------------------------------------------------------------ réglages et compteurs
        /// <summary>`IHorloge` de la régie (§3). Les 30 s « hors champ » se mesurent SUR ELLE.</summary>
        public IHorloge Horloge { get; set; } = HorlogeReelle.Instance;

        /// <summary>Le niveau de mouvement (§5). Les sources (PlayerPrefs, Android) sont E2 : ici, seulement le setter.</summary>
        public PolitiqueMouvement Politique { get; set; } = PolitiqueMouvement.Plein;

        public int PistesVivantes => nAmbiance + nAutres;
        public int Refus { get; private set; }
        /// <summary>Refus dus au quota `Melange` (E0) ou à un `Melange` sur une `Ambiance` ; déjà comptés aussi dans `Refus`.</summary>
        public int RefusMelange { get; private set; }
        /// <summary>Pistes vivantes portant un canal `Melange` (≤ `MouvementTunables.PistesMelangeMax`).</summary>
        public int PistesMelange => nMelange;
        /// <summary>Les `Attacher` faits sans régie (hôte nu) : le compteur est statique, `Courante` étant nul alors.</summary>
        public int SansRegie => RegieMouvement.SansRegie;
        public EtatDelestage Delestage => delestage;
        /// <summary>Pistes évaluées / valeurs écrites depuis la création (preuve de cadence, d'epsilon).</summary>
        public int Evaluations { get; private set; }
        public int Ecritures { get; private set; }

        /// <summary>Ajoute une entrée au catalogue admis (G1 : `Attacher` d'une entrée hors catalogue lève).</summary>
        public void Admettre(Entree e)
        {
            if (e == null) throw new ArgumentNullException(nameof(e));
            if (admises.TryGetValue(e.Id, out Entree deja) && !ReferenceEquals(deja, e))
                throw new ArgumentException("Id déjà admis pour une autre entrée : " + e.Id);
            admises[e.Id] = e;
        }

        public bool EstVivant(Handle h)
        {
            return h.Gen != 0 && h.Slot >= 0 && h.Slot < pistes.Length && pistes[h.Slot].vivante && pistes[h.Slot].gen == h.Gen;
        }

        // ------------------------------------------------------------------------------ API (§3)
        /// <summary>Attache le mouvement de `e` à `cible`. Lève si `e` est hors catalogue (G1) ; rend un handle nul, compté
        /// dans `Refus`, si l'entrée est refusée (quota, G8, G12, hôte, composant manquant).</summary>
        public Handle Attacher(Entree e, RectTransform cible, Reglage r, Action<Handle> quandFini = null)
        {
            VerifierAdmise(e);
            return Creer(e, cible, r, false, 0f, 0f, quandFini);
        }

        /// <summary>Un passage d'une valeur du propriétaire à une autre, sur UN canal `Absolu` dont les images clés sont la
        /// courbe de progrès 0 → 1 : `valeur = de + (vers − de) × courbe`. La piste TIENT `vers` à la fin (comme un
        /// `transition` CSS) jusqu'à `Detacher` ou remplacement par une autre `Transitionner`.</summary>
        public Handle Transitionner(Entree e, RectTransform cible, float de, float vers, Action<Handle> quandFini = null)
        {
            VerifierAdmise(e);
            Canal[] cs = e.Mouvement.Canaux;
            if (cs.Length != 1 || cs[0].M != Mode.Absolu)
                throw new ArgumentException("Transitionner exige UN canal Absolu : " + e.Id);
            return Creer(e, cible, Reglage.Defaut, true, de, vers, quandFini);
        }

        /// <summary>Le PROPRIÉTAIRE vient de réécrire `p` sur `cible` : la base devient la valeur courante.</summary>
        public void Rebaser(RectTransform cible, Propriete p)
        {
            for (int k = 0; k < couples.Length; k++)
            {
                Couple c = couples[k];
                if (c.utilise && c.p == p && ReferenceEquals(c.rt, cible)) c.Rebaser();
            }
        }

        /// <summary>Restitue (transform → base ; `CanvasGroup` posé → 1 ; `Melange`/`Hue` → `CouleurA` ; `Eclat` → 0) PUIS libère.
        /// Sans effet sur un handle nul ou périmé.</summary>
        public void Detacher(Handle h)
        {
            if (EstVivant(h)) LibererPiste(h.Slot, true);
        }

        public void DetacherSous(Transform racine)
        {
            if (racine == null) return;
            for (int i = 0; i < pistes.Length; i++)
            {
                Piste p = pistes[i];
                if (p.vivante && p.cible != null && p.cible.IsChildOf(racine)) LibererPiste(i, true);
            }
        }

        // ------------------------------------------------------------------------------ boucle
        private void Update()
        {
            Tick(Horloge != null ? Horloge.Maintenant : Time.unscaledTime);
        }

        private void OnDestroy()
        {
            RegieMouvement.Retirer(this);
        }

        /// <summary>Appelé par `Update` ET par la planche — le même chemin, aucun contournement. IDEMPOTENT pour un même `t`.</summary>
        public void Tick(float t)
        {
            LibererCiblesNulles();                                   // (1)
            if (aTicke && t == dernierT) return;                     // (2)
            float dt = aTicke ? Mathf.Max(0f, t - dernierT) : 0f;
            aTicke = true;
            dernierT = t;
            MesurerDelestage(dt);
            float maintenant = Horloge != null ? Horloge.Maintenant : t;

            nFinis = 0;
            for (int i = 0; i < pistes.Length; i++)
            {
                if (pistes[i].vivante) EvaluerPiste(i, pistes[i], t, maintenant);   // (3)(4)(5)
            }
            Composer();                                              // (6)
            EcrireTout();                                            // (7)
            NotifierFins();
        }

        private void LibererCiblesNulles()
        {
            for (int i = 0; i < pistes.Length; i++)
            {
                Piste p = pistes[i];
                if (p.vivante && p.cible == null) LibererPiste(i, false);
            }
        }

        // (3) cadence, (4) visibilité, (5) évaluation
        private void EvaluerPiste(int i, Piste p, float t, float maintenant)
        {
            // (3) `Ambiance` ≤ 30 Hz (15 Hz sous délestage « demi-cadence »)
            if (p.ambiance && p.aEvalue && !p.fini)
            {
                float minDt = MouvementTunables.CadenceAmbianceMinDtS * (delestage == EtatDelestage.DemiCadence ? 2f : 1f);
                if (t - p.tRef < minDt - MouvementTunables.CadenceToleranceS) return;
            }

            // (4) visibilité : une cible inactive n'est pas évaluée, son emplacement est gardé 30 s d'horloge de RÉGIE
            if (!p.cible.gameObject.activeInHierarchy)
            {
                if (float.IsNaN(p.horsChampDepuis)) p.horsChampDepuis = maintenant;
                else if (maintenant - p.horsChampDepuis > MouvementTunables.HorsChampLibereS)
                {
                    Journaliser("piste libérée, cible inactive plus de " + MouvementTunables.HorsChampLibereS + " s (horloge de la régie) : " + p.entree.Id);
                    LibererPiste(i, true);
                }
                return;
            }
            if (!float.IsNaN(p.horsChampDepuis))
            {
                p.horsChampDepuis = float.NaN;
                p.tRef = t;   // le temps n'a pas coulé pendant l'absence
            }
            if (p.fini) return;   // elle TIENT sa valeur finale

            // (5) évaluation
            MouvementDefini def = p.def;
            bool tousGeles = true;
            for (int ci = 0; ci < p.n; ci++)
            {
                Canal c = def.Canaux[ci];
                bool g = GelDeMouvement.Gele(Politique, def, c) || GelDeMouvement.GeleParDelestage(delestage, p.entree.Genre);
                p.gele[ci] = g;
                if (!g) tousGeles = false;
            }
            if (!tousGeles && p.aEvalue)
            {
                float d = t - p.tRef;
                if (d > 0f) p.age += d;
            }
            p.tRef = t;
            p.aEvalue = true;
            Evaluations++;

            float phase = 0f;
            bool fini = false;
            if (!tousGeles)
            {
                if (def.Iteration.Infini)
                {
                    // phase repliée par piste : le cycle se rejoue, l'âge ne grossit pas (précision flottante après des heures)
                    float debut = p.age - p.reg.PhaseS;
                    if (debut > 2f * p.cycleLen) p.age -= Mathf.Floor(debut / p.cycleLen) * p.cycleLen;
                }
                phase = Courbes.Phase(def, p.periodeEff, p.age - p.reg.PhaseS, out fini);
            }
            float phasePose = Courbes.PhaseDePose(def);
            bool auRepos = !def.PoseDefinie && p.entree.Genre == Genre.Retour && !p.transitionner;
            for (int ci = 0; ci < p.n; ci++)
            {
                Canal c = def.Canaux[ci];
                if (p.gele[ci] && auRepos) p.val[ci] = Courbes.Repos(c.P, c.M);   // un Retour sans pose est FIGÉ au repos (« sans échelle », §5 i), pas sauté à sa fin
                else p.val[ci] = ValeurCanal(p, c, p.gele[ci] ? phasePose : phase);
            }

            if (!def.Iteration.Infini && (fini || tousGeles))
            {
                p.fini = true;
                finis[nFinis] = i;
                finisGen[nFinis] = p.gen;
                nFinis++;
            }
        }

        private static float ValeurCanal(Piste p, Canal c, float phase)
        {
            float v = Courbes.EvaluerCanal(c, phase);
            if (p.transitionner) return p.de + (p.vers - p.de) * v;
            switch (c.M)
            {
                case Mode.Additif:
                    v *= p.reg.KAmp;
                    if (c.EstTranslation) v *= p.reg.KDepl;
                    return v;
                case Mode.Multiplicatif:
                    return 1f + (v - 1f) * p.reg.KAmp;
                default:
                    return v;
            }
        }

        // (6) composition par couple (cible, propriété) : base ⊕ pistes
        private void Composer()
        {
            for (int k = 0; k < couples.Length; k++)
            {
                Couple c = couples[k];
                if (!c.utilise) continue;
                c.add = 0f; c.mul = 1f; c.absVal = 0f; c.hasAbs = false;
            }
            for (int i = 0; i < pistes.Length; i++)
            {
                Piste p = pistes[i];
                if (!p.vivante) continue;
                for (int ci = 0; ci < p.n; ci++)
                {
                    Couple c = couples[p.couple[ci]];
                    float v = p.val[ci];
                    switch (p.def.Canaux[ci].M)
                    {
                        case Mode.Additif: c.add += v; break;
                        case Mode.Multiplicatif: c.mul *= v; break;
                        default: c.hasAbs = true; c.absVal = v; break;
                    }
                }
            }
        }

        // (7) détection d'une réécriture du propriétaire, puis écriture au-delà de l'epsilon
        private void EcrireTout()
        {
            for (int k = 0; k < couples.Length; k++)
            {
                Couple c = couples[k];
                if (!c.utilise) continue;
                if (c.rt == null || !c.rt.gameObject.activeInHierarchy) continue;   // hors champ : rien n'est écrit
                c.Detecter();
                if (c.Appliquer()) Ecritures++;
            }
        }

        private void NotifierFins()
        {
            for (int k = 0; k < nFinis; k++)
            {
                Piste p = pistes[finis[k]];
                if (!p.vivante || p.gen != finisGen[k] || p.notifie) continue;
                p.notifie = true;
                Action<Handle> cb = p.quandFini;
                int gen = p.gen;
                if (cb != null) cb(new Handle(finis[k], gen));
                // ⛔ LIBÉRATION D'UNE PISTE FINIE QUI A REJOINT LA BASE (CLIENT-3, relecture d'E1).
                //    Une piste finie qui TIENT sa valeur garde son emplacement : 16 transitions d'écran jamais
                //    détachées rempliraient le quota non-Ambiance (§4) et la 17ᵉ serait refusée. Règle : si la
                //    valeur finale de CHAQUE canal égale la base du propriétaire (identité d'un Additif/Multiplicatif,
                //    Melange/Hue à 0, Absolu = la valeur posée par le propriétaire, à l'epsilon du §3), la piste est
                //    libérée — la restitution n'écrit alors rien de différent. Sinon elle tient : c'est le cas des
                //    virages du chrome, dont le propriétaire n'écrit plus la couleur (§3, `UpdateAlarmState`).
                if (p.vivante && p.gen == gen && FinRejointLaBase(p)) LibererPiste(finis[k], true);
            }
            nFinis = 0;
        }

        private bool FinRejointLaBase(Piste p)
        {
            for (int ci = 0; ci < p.n; ci++)
            {
                Canal c = p.def.Canaux[ci];
                float v = p.val[ci];
                float eps = MouvementTunables.Epsilon(c.P);
                switch (c.M)
                {
                    case Mode.Additif:
                        if (Mathf.Abs(v) > eps) return false;
                        break;
                    case Mode.Multiplicatif:
                        if (Mathf.Abs(v - 1f) > eps) return false;
                        break;
                    default:
                        if (c.P == Propriete.Melange) { if (Mathf.Abs(v) > eps) return false; break; }
                        if (c.P == Propriete.Hue) { if (Mathf.Abs(Mathf.DeltaAngle(0f, v)) > eps) return false; break; }
                        float b = couples[p.couple[ci]].baseF;
                        if (c.P == Propriete.Rotation) { if (Mathf.Abs(Mathf.DeltaAngle(b, v)) > eps) return false; break; }
                        if (Mathf.Abs(v - b) > eps) return false;
                        break;
                }
            }
            return true;
        }

        // ------------------------------------------------------------------------------ délestage (§4)
        private void MesurerDelestage(float dt)
        {
            if (dt <= 0f || dt > MouvementTunables.DelestageDtMaxMesureS) return;

            fenetre[posFenetre] = dt;
            posFenetre = (posFenetre + 1) % fenetre.Length;
            if (nFenetre < fenetre.Length) nFenetre++;
            depuisMediane++;
            if (nFenetre == fenetre.Length && delestage == EtatDelestage.Normal && (cadenceCible <= 0f || depuisMediane >= fenetre.Length))
            {
                cadenceCible = Mediane();
                depuisMediane = 0;
            }

            if (!emaInit) { ema = dt; emaInit = true; }
            else ema += MouvementTunables.DelestageEma * (dt - ema);
            if (cadenceCible <= 0f) return;

            tLent = ema > MouvementTunables.DelestageDemiSeuil * cadenceCible ? tLent + dt : 0f;
            tTresLent = ema > MouvementTunables.DelestageFigeSeuil * cadenceCible ? tTresLent + dt : 0f;
            tCalme = ema < MouvementTunables.DelestageRetourSeuil * cadenceCible ? tCalme + dt : 0f;

            if (tTresLent >= MouvementTunables.DelestageFigeDureeS) delestage = EtatDelestage.Fige;
            else if (tLent >= MouvementTunables.DelestageDemiDureeS && delestage == EtatDelestage.Normal) delestage = EtatDelestage.DemiCadence;

            if (delestage != EtatDelestage.Normal && tCalme >= MouvementTunables.DelestageRetourDureeS)
            {
                delestage = EtatDelestage.Normal;
                tLent = tTresLent = 0f;
            }
        }

        /// <summary>Médiane de la fenêtre : tri par insertion d'un brouillon préalloué (aucune allocation).</summary>
        private float Mediane()
        {
            int n = fenetre.Length;
            for (int i = 0; i < n; i++)
            {
                float x = fenetre[i];
                int j = i - 1;
                while (j >= 0 && brouillon[j] > x) { brouillon[j + 1] = brouillon[j]; j--; }
                brouillon[j + 1] = x;
            }
            return brouillon[n / 2];
        }

        // ------------------------------------------------------------------------------ création / libération
        private void VerifierAdmise(Entree e)
        {
            if (e == null) throw new ArgumentNullException(nameof(e));
            if (!admises.TryGetValue(e.Id, out Entree admise) || !ReferenceEquals(admise, e))
                throw new ArgumentException("Entree hors catalogue (G1) : " + e.Id);
        }

        private Handle Refuser(Entree e, string raison)
        {
            Refus++;
            Journaliser("refus de " + e.Id + " : " + raison);
            return Handle.Nul;
        }

        private static void Journaliser(string message)
        {
            Debug.LogWarning("[Regie] " + message);
        }

        private Couple Trouver(RectTransform cible, Canal c)
        {
            int idx = c.P == Propriete.Parametre ? c.Index : 0;
            for (int k = 0; k < couples.Length; k++)
            {
                Couple q = couples[k];
                if (q.utilise && q.p == c.P && q.idx == idx && ReferenceEquals(q.rt, cible)) return q;
            }
            return null;
        }

        private Handle Creer(Entree e, RectTransform cible, Reglage r, bool transition, float de, float vers, Action<Handle> quandFini)
        {
            if (cible == null) throw new ArgumentNullException(nameof(cible));
            MouvementDefini m = e.Mouvement;
            if (r.KDuree <= 0f) r = Reglage.AvecPhase(r.PhaseS);   // `default(Reglage)` : pas de réglage

            if (e.EstSansHote) return Refuser(e, "SansHote : " + e.RaisonSansHote);

            // G8 : une entrée bloquante plus longue que `T.ui.anim_max_block_ms` est refusée à l'attachement.
            if (e.Bloquante && m.DureeTotaleS * r.KDuree * 1000f > UiTimingTunables.AnimMaxBlockMs)
                return Refuser(e, "G8 : bloquante et plus longue que " + UiTimingTunables.AnimMaxBlockMs + " ms");

            // §4 quotas réservés : 32 Ambiance / 16 Alerte-Retour-Transition
            bool amb = e.Genre == Genre.Ambiance;
            if (amb ? nAmbiance >= MouvementTunables.QuotaAmbiance : nAutres >= MouvementTunables.QuotaAlerteRetourTransition)
                return Refuser(e, "quota " + (amb ? "Ambiance" : "Alerte/Retour/Transition") + " atteint");

            // E0 (décision f2, 08/10) : `Melange` interdit aux `Ambiance`, et au plus 8 pistes `Melange` vivantes à la fois.
            bool melange = false;
            for (int ci = 0; ci < m.Canaux.Length; ci++) if (m.Canaux[ci].P == Propriete.Melange) melange = true;
            if (melange && amb) { RefusMelange++; return Refuser(e, "Melange interdit aux Ambiance (E0 : l'Alpha d'abord)"); }
            if (melange && nMelange >= MouvementTunables.PistesMelangeMax)
            {
                RefusMelange++;
                return Refuser(e, "quota Melange atteint (" + MouvementTunables.PistesMelangeMax + " pistes vivantes, E0)");
            }

            int slot = -1;
            for (int i = 0; i < pistes.Length; i++) if (!pistes[i].vivante) { slot = i; break; }
            if (slot < 0) return Refuser(e, "48 pistes vivantes");

            // faisabilité, G12 (deux Absolu sur un couple) et besoin en couples — SANS effet de bord
            int besoin = 0, nRemplaces = 0;
            for (int ci = 0; ci < m.Canaux.Length; ci++)
            {
                Canal c = m.Canaux[ci];
                if (!Couple.Realisable(cible, c)) return Refuser(e, "la cible ne porte pas ce que " + c.P + " écrit");
                Couple q = Trouver(cible, c);
                if (q == null) { besoin++; continue; }
                if (c.M == Mode.Absolu && q.occupant >= 0)
                {
                    // dette 4 : un occupant issu de `Transitionner` est REMPLACÉ (la dernière gagne) ; issu d'`Attacher`, il fait
                    // REFUSER un second `Absolu` (G12).
                    if (!q.occupantTransition) return Refuser(e, "G12 : deux Absolu sur (" + cible.name + ", " + c.P + ")");
                    bool deja = false;
                    for (int j = 0; j < nRemplaces; j++) if (remplaces[j] == q.occupant) deja = true;
                    if (!deja) remplaces[nRemplaces++] = q.occupant;
                }
            }
            if (nCouples + besoin > couples.Length) return Refuser(e, "couples (cible, propriété) épuisés");

            // ---- acquisition
            Piste p = pistes[slot];
            p.gen++;
            p.vivante = true;
            p.entree = e; p.def = m; p.cible = cible; p.reg = r;
            p.periodeEff = m.PeriodeS * r.KDuree;
            p.cycleLen = p.periodeEff * (m.Alterne ? 2f : 1f);
            p.transitionner = transition; p.de = de; p.vers = vers; p.quandFini = quandFini;
            p.ambiance = amb;
            p.melange = melange;
            if (melange) nMelange++;
            p.age = 0f; p.tRef = 0f; p.aEvalue = false; p.fini = false; p.notifie = false; p.horsChampDepuis = float.NaN;
            p.n = m.Canaux.Length;
            for (int ci = 0; ci < p.n; ci++)
            {
                Canal c = m.Canaux[ci];
                Couple q = Trouver(cible, c);
                int k;
                if (q == null)
                {
                    k = CouplesLibre();
                    q = couples[k];
                    q.Init(cible, c, m);
                    nCouples++;
                }
                else k = IndexDe(q);
                q.refs++;
                if (c.M == Mode.Absolu) { q.occupant = slot; q.occupantTransition = transition; }
                if (c.P == Propriete.Melange || c.P == Propriete.Hue)
                {
                    q.cA = m.CouleurA; q.cB = m.CouleurB;   // la dernière piste attachée fixe la paire de couleurs
                }
                p.couple[ci] = k;
                p.val[ci] = Courbes.Repos(c.P, c.M);
            }
            if (amb) nAmbiance++; else nAutres++;

            // la dernière gagne : les transitions remplacées s'en vont (leurs couples partagés restent, tenus par la nouvelle)
            for (int j = 0; j < nRemplaces; j++) LibererPiste(remplaces[j], true);

            return new Handle(slot, p.gen);
        }

        private int CouplesLibre()
        {
            for (int k = 0; k < couples.Length; k++) if (!couples[k].utilise) return k;
            return -1;   // exclu : `besoin` a été vérifié avant l'acquisition
        }

        private int IndexDe(Couple q)
        {
            for (int k = 0; k < couples.Length; k++) if (ReferenceEquals(couples[k], q)) return k;
            return -1;
        }

        /// <summary>Libère l'emplacement ; `restituer` rend d'abord à chaque couple ORPHELIN sa base (design §3, « Fin de piste »).</summary>
        private void LibererPiste(int i, bool restituer)
        {
            Piste p = pistes[i];
            if (!p.vivante) return;
            for (int ci = 0; ci < p.n; ci++)
            {
                Couple c = couples[p.couple[ci]];
                c.refs--;
                if (c.occupant == i) { c.occupant = -1; c.occupantTransition = false; }
                if (c.refs <= 0)
                {
                    if (restituer) c.Restituer();
                    c.Vider();
                    nCouples--;
                }
            }
            if (p.ambiance) nAmbiance--; else nAutres--;
            if (p.melange) nMelange--;
            p.Vider();
            p.gen++;   // les jetons en circulation deviennent périmés
        }
    }
}
