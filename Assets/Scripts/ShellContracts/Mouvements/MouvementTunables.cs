namespace MafiaCleanCity.Mouvements
{
    // CLIENT-3 / E1 (design-couche-mouvement.md v4.3 §4) — les constantes de la couche de mouvement.
    //
    // R2.3 (tunables jamais inline) au niveau que ce dépôt supporte : UNE classe nommée, voisine de
    // `UiTimingTunables` (même assembly), que tout consommateur référence. Aucune de ces valeurs n'est un
    // identifiant `T.ui.*` du canon : ce sont des constantes DU CLIENT (la seule valeur du canon que la couche
    // consomme, `T.ui.anim_max_block_ms`, est lue dans `UiTimingTunables.AnimMaxBlockMs`, jamais recopiée ici).
    public static class MouvementTunables
    {
        // ---- plafonds (§4) -------------------------------------------------------------------------------
        /// <summary>Pistes vivantes, tous genres confondus.</summary>
        public const int PistesMax = 48;
        /// <summary>Quota réservé aux `Ambiance`.</summary>
        public const int QuotaAmbiance = 32;
        /// <summary>Quota réservé aux `Alerte` / `Retour` / `Transition`.</summary>
        public const int QuotaAlerteRetourTransition = 16;
        /// <summary>E0 (créneau du 08/10, décision f2) : au plus 8 pistes vivantes portant un canal `Melange` dans tout le client.
        /// Mesuré : animer `Graphic.color` reconstruit les lots du canvas, ≈ 100 fois le coût de mise à jour d'un
        /// `CanvasGroup.alpha` (125 µs contre 1,3 µs pour 48 cibles). L'`Alpha` d'abord ; le `Melange` reste pour ce que l'`Alpha`
        /// ne sait pas faire (éclaircir, changer de teinte). Au-delà : refus COMPTÉ (`Regie.RefusMelange`).</summary>
        public const int PistesMelangeMax = 8;
        /// <summary>G4 : budget d'un écran résolu, en PISTES (une piste = une cible animée), pas en instances.</summary>
        public const int PistesParEcranMax = 16;
        /// <summary>Couples (cible, propriété) simultanés : 48 pistes × au plus 4 canaux en pratique.</summary>
        public const int CouplesMax = 192;
        /// <summary>Canaux d'un même mouvement (le plus riche du catalogue en porte 3).</summary>
        public const int CanauxParPisteMax = 6;

        // ---- cadence et hors champ (§3, §4) --------------------------------------------------------------
        /// <summary>`Ambiance` ≤ 30 Hz.</summary>
        public const float CadenceAmbianceHz = 30f;
        public const float CadenceAmbianceMinDtS = 1f / CadenceAmbianceHz;
        /// <summary>Gigue admise sur l'intervalle de cadence : sans elle, 1/30 s accumulé en flottants tombe
        /// parfois à 0,03333 et l'`Ambiance` sauterait un tour sur deux (15 Hz réels).</summary>
        public const float CadenceToleranceS = 0.001f;
        /// <summary>Une piste dont la cible reste inactive plus longtemps (horloge de la RÉGIE) est libérée.</summary>
        public const float HorsChampLibereS = 30f;

        // ---- délestage relatif à la cadence mesurée (§4) -------------------------------------------------
        /// <summary>Taille de la fenêtre dont la médiane de `dt` donne la cadence `cible`.</summary>
        public const int DelestageFenetreImages = 120;
        public const float DelestageEma = 0.2f;
        /// <summary>EMA(dt) > 1,5 × cible pendant 1 s ⇒ `Ambiance` à demi-cadence.</summary>
        public const float DelestageDemiSeuil = 1.5f;
        public const float DelestageDemiDureeS = 1f;
        /// <summary>EMA(dt) > 2,5 × cible pendant 1 s ⇒ `Ambiance` figée à `PoseDeReposS`.</summary>
        public const float DelestageFigeSeuil = 2.5f;
        public const float DelestageFigeDureeS = 1f;
        /// <summary>Retour à la normale : EMA(dt) sous 1,25 × cible pendant 2 s.</summary>
        public const float DelestageRetourSeuil = 1.25f;
        public const float DelestageRetourDureeS = 2f;
        /// <summary>Un `dt` au-delà (mise en pause de l'application, chargement) n'est pas une mesure de charge.</summary>
        public const float DelestageDtMaxMesureS = 0.5f;

        // ---- epsilons d'écriture et de détection (§3) ----------------------------------------------------
        public const float EpsAlpha = 1f / 512f;
        public const float EpsEchelle = 1f / 512f;
        public const float EpsTranslationPx = 0.05f;
        public const float EpsRotationDeg = 0.01f;
        public const float EpsMelange = 1f / 512f;
        public const float EpsEclat = 1f / 512f;
        public const float EpsRemplissage = 1f / 512f;
        public const float EpsHueDeg = 0.5f;
        /// <summary>Le design ne donne pas d'epsilon au puits `Parametre` : même ordre que les autres valeurs normalisées.</summary>
        public const float EpsParametre = 1f / 512f;

        // ---- gardes (§5, §6.2, §10) ----------------------------------------------------------------------
        /// <summary>G5 : au plus 3 extrema par seconde (période ≥ 0,667 s pour un aller-retour).</summary>
        public const float ExtremaParSecondeMax = 3f;
        /// <summary>G13 : variation de couleur rendue perceptible, ≥ 3/255.</summary>
        public const float SeuilCouleurRendue = 3f / 255f;
        /// <summary>G13 : déplacement à l'écran du point le plus éloigné, ≥ 0,5 px.</summary>
        public const float SeuilDeplacementPx = 0.5f;
        /// <summary>G3 : écart minimal à l'état de repos pour qu'une pose compte comme « riche ».</summary>
        public const float SeuilPoseRiche = 1e-3f;

        /// <summary>L'epsilon d'écriture / de détection d'une propriété, dans SON unité (degrés pour `Rotation` et `Hue`).</summary>
        public static float Epsilon(Propriete p)
        {
            switch (p)
            {
                case Propriete.Alpha: return EpsAlpha;
                case Propriete.Melange: return EpsMelange;
                case Propriete.Hue: return EpsHueDeg;
                case Propriete.Eclat: return EpsEclat;
                case Propriete.TranslationX:
                case Propriete.TranslationY: return EpsTranslationPx;
                case Propriete.Rotation: return EpsRotationDeg;
                case Propriete.Echelle:
                case Propriete.EchelleX:
                case Propriete.EchelleY: return EpsEchelle;
                case Propriete.Remplissage: return EpsRemplissage;
                default: return EpsParametre;
            }
        }
    }
}
