using System.Collections.Generic;
using UnityEngine;

namespace MafiaCleanCity.Mouvements
{
    /// <summary>
    /// CLIENT-3 / E1 puis E2a (design-couche-mouvement.md v4.3 §9, catalogue-mouvements.md §I.4) — le catalogue du HUD : les
    /// entrées du CHROME, et les trois boucles ambiantes du ① (néon, fumée, scintillement de dette : `AmbientPulseLoop`, supprimé
    /// en E2a). Les 46 entrées d'écran du catalogue viendront après sa revue ⊥ (E2+). DONNÉE PURE : aucune référence vers les
    /// assemblies d'écran.
    ///
    /// Valeurs recopiées, avec leur source :
    ///  · `pouls` — `oracle-css-hud.json` : 1,1 s, `opacity` 1 → 0,45 → 1, `ease` à CHAQUE image clé (`easing_cles`, jamais
    ///    `easing` de l'effet) ; les ex-constantes de `TopBarController` `PoulsPeriodeS` / `PoulsCreux`, retirées en E2a (l'ancien `SmoothStep` s'écartait de l'`ease`
    ///    CSS : à p = 0,125 il rendait 0,914 pour 0,775 mesuré).
    ///  · `tremble` — 0,14 s, CSS `52° → 56° → 52°` ⇒ REPÈRE UNITY `0 → −4° → 0` (`Rotation Unity = − rotation CSS`, §2) ;
    ///    signe épinglé (« vers le chaud », `DistrictDescentePlayModeTests.T2_LePouls_EtLeTremblement`) ; ex-`TremblePeriodeS` / `TrembleAmplitudeDeg` de `TopBarController` (retirées en E2a).
    ///  · `gyroflip` — 0,9 s, `hue-rotate` 0 → −140° → 0, `ease` ; teinte `#ff5a3c` (`Gyrophare.Teinte`). Une teinte (Hue) n'est
    ///    pas un repère : le signe ne change pas.
    ///  · virages B6/B7 (`transition: background .6s` / `border-color .6s`) et balayage B10 (`style="transition:transform .7s"`) :
    ///    aucun `transition-timing-function` dans `hud-brennar.html` ⇒ le défaut CSS, `ease`.
    ///  · `bandeau.sortie` — 0,4 s LINÉAIRE (l'ancien `FonduS` de `BandeauEphemere`).
    ///  · `diorama.neon` / `diorama.fumee` / `diorama.scintillement` — la boucle `AmbientPulseLoop` (W3.U2 C10) : `sin(1,6 rad/s)`
    ///    d'amplitude ±0,12 sur l'alpha du `Graphic`, période 2π / 1,6 = 3,927 s. La régie ne règle que le `CanvasGroup` (un
    ///    `CanvasGroup` ne dépasse pas l'alpha du `Graphic` : la crête est la base) ; les facteurs sont MESURÉS sur les bases de
    ///    `DesignTokens.asset` (design §9) : néon et scintillement (base 1) [0,88 .. 1], fumée (base 0,35) [0,31 .. 1] — même
    ///    amplitude 0,24 qu'avant, crête = base. L'`ease-in-out` approche le sinus.
    /// Les Transitionner portent une courbe de PROGRÈS 0 → 1 (la valeur est `de + (vers − de) × courbe`, §3).
    /// </summary>
    public static class CatalogueHud
    {
        // ---- pouls / tremble / gyrophare : les constantes de TopBarController et de Gyrophare, nommées une fois ici
        private const float PoulsPeriodeS = 1.1f, PoulsCreux = 0.45f;
        // Décision f2 (08/10, dette 17) : sous « Mouvement réduit », on retire le MOUVEMENT, pas le signal. Le cerclage
        // se fige à α ≈ 0,72, « en alerte » sans être éteint. Ni le creux 0,45 (éteint, immobile = « rien ne se passe »),
        // ni la crête 1 (c'est le repos : G3). Valeur sur la courbe `ease` du premier demi-cycle : t = 0,1638 s ⇒ α = 0,7200.
        private const float PoulsPoseReduitS = 0.1638f;
        private const float TremblePeriodeS = 0.14f, TrembleAmplitudeDeg = -4f;   // repère Unity : vers le chaud = −
        private const float GyroPeriodeS = 0.9f, GyroRotationDeg = -140f;
        private const int GyroTeinte = 0xff5a3c;
        // Les extrémités des virages sont les JETONS du chrome (`hudHairlineGold` = --laiton, `hudGaugeArcHot` = --braise) ;
        // une donnée `static readonly` ne peut pas lire l'asset de tokens, elle porte donc leurs valeurs (un test les compare).
        private const int Laiton = 0xb08d3e, Braise = 0xe0664a;
        private const float VirageDureeS = 0.6f, BalayageDureeS = 0.7f, BandeauSortieDureeS = 0.4f;
        // Les boucles ambiantes du ① : l'ancienne `Speed = 1.6` rad/s ⇒ 2π / 1,6 s ; facteurs de crête à creux (design §9).
        private const float AmbiancePeriodeS = 3.927f;
        private const float AmbianceCreuxNeon = 0.88f, AmbianceCreuxFumee = 0.31f, AmbianceCreuxScintillement = 0.88f;

        private static readonly string[] TousLesEcrans = { Entree.Tous };
        private static readonly string[] EcranDiorama = { "①" };

        public static readonly Entree Pouls = new Entree(
            "chrome.pouls", TousLesEcrans, "hud-brennar-canon: pouls (B1)",
            "Un district est en descente : le cerclage du médaillon et le filet de la barre pulsent comme le voyant d'alarme d'un boîtier de manomètre, tant que la descente dure.",
            Genre.Alerte,
            new MouvementDefini("pouls", Genre.Alerte, PoulsPeriodeS,
                new[]
                {
                    new Canal(Propriete.Alpha, Mode.Multiplicatif, new[]
                    {
                        new ImageCle(0f, 1f, Aisance.Ease),
                        new ImageCle(0.5f, PoulsCreux, Aisance.Ease),
                        new ImageCle(1f, 1f, Aisance.Ease),
                    }),
                },
                Iteration.InfiniFois, alterne: false, poseDeReposS: PoulsPoseReduitS),
            pistes: 2, bloquante: false, hote: Entree.HoteClient);

        public static readonly Entree Tremble = new Entree(
            "chrome.tremble", TousLesEcrans, "hud-brennar-canon: tremble (B2)",
            "L'aiguille du manomètre tremble vers le chaud pendant une descente : le cadran encaisse une ville qui chauffe sous la pression de la police.",
            Genre.Alerte,
            new MouvementDefini("tremble", Genre.Alerte, TremblePeriodeS,
                new[]
                {
                    new Canal(Propriete.Rotation, Mode.Additif, new[]
                    {
                        new ImageCle(0f, 0f, Aisance.Ease),
                        new ImageCle(0.5f, TrembleAmplitudeDeg, Aisance.Ease),
                        new ImageCle(1f, 0f, Aisance.Ease),
                    }),
                },
                Iteration.InfiniFois, alterne: false, poseDeReposS: TremblePeriodeS * 0.5f),
            pistes: 1, bloquante: false, hote: Entree.HoteClient);

        public static readonly Entree Gyrophare = new Entree(
            "chrome.gyrophare", TousLesEcrans, "hud-brennar-canon: gyroflip (B3)",
            "La voiture de police en planque allume son gyrophare : sa lueur vire du rouge au bleu tant que le district est en descente, de nuit.",
            Genre.Alerte,
            new MouvementDefini("gyroflip", Genre.Alerte, GyroPeriodeS,
                new[]
                {
                    new Canal(Propriete.Hue, Mode.Absolu, new[]
                    {
                        new ImageCle(0f, 0f, Aisance.Ease),
                        new ImageCle(0.5f, GyroRotationDeg, Aisance.Ease),
                        new ImageCle(1f, 0f, Aisance.Ease),
                    }),
                },
                Iteration.InfiniFois, alterne: false, poseDeReposS: GyroPeriodeS * 0.5f,
                couleurA: CouleurSpec.Nommee("gyrophare #ff5a3c", Couleurs.Rvb(GyroTeinte))),
            pistes: 1, bloquante: false, hote: Entree.HoteClient);

        public static readonly Entree FiletVirage = Virage(
            "chrome.filet.virage", "hud-brennar-canon: transition de .barre::after (B6)",
            "Quand la ville se met à brûler, le filet de laiton de la barre chauffe jusqu'à la braise au lieu de changer d'un coup, et refroidit de même au retour.");

        public static readonly Entree AnneauVirage = Virage(
            "chrome.anneau.virage", "hud-brennar-canon: transition de .medaillon .boitier (B7)",
            "Quand la ville se met à brûler, l'anneau du médaillon chauffe du laiton à la braise comme un métal qu'on porte au feu, et refroidit de même au retour.");

        public static readonly Entree AiguilleBalayage = new Entree(
            "chrome.aiguille.balayage", TousLesEcrans, "hud-brennar-canon: transition de #aiguille (B10)",
            "Une aiguille ne saute pas d'une graduation à l'autre : elle balaie le cadran, et c'est le balayage qui dit que la chaleur de la ville a changé de bande.",
            Genre.Transition,
            new MouvementDefini("aiguille.balayage", Genre.Transition, BalayageDureeS,
                new[] { new Canal(Propriete.Rotation, Mode.Absolu, Progres(Aisance.Ease)) },
                Iteration.Fois(1)),
            pistes: 1, bloquante: false, hote: Entree.HoteClient);

        public static readonly Entree BandeauSortie = new Entree(
            "bandeau.sortie", TousLesEcrans, "PROPOSE: fondu de sortie du bandeau (ex-FonduS de BandeauEphemere)",
            "Le bandeau d'annonce ne disparaît pas d'un coup : comme un papier qu'on retire de la lumière, il s'efface en quatre dixièmes de seconde.",
            Genre.Transition,
            new MouvementDefini("bandeau.sortie", Genre.Transition, BandeauSortieDureeS,
                new[] { new Canal(Propriete.Alpha, Mode.Absolu, Progres(Aisance.Lineaire)) },
                Iteration.Fois(1)),
            pistes: 1, bloquante: false, hote: Entree.HoteClient);

        // `Pistes` : le budget d'ambiance du ① est `DistrictInteriorScreenController.MaxAmbientLoops` = 4, PARTAGÉ entre les trois
        // (G4 somme les `Pistes` des entrées d'un écran) : 2 + 1 + 1 = 4, la répartition est conventionnelle, le plafond est tenu par
        // `TryStartAmbientLoop`.
        public static readonly Entree Neon = Boucle(
            "diorama.neon", "PROPOSE: migration d'AmbientPulseLoop (DistrictInteriorScreenController.BuildRevenueSign, W3.U2 C10)",
            "L'enseigne au néon d'un commerce qui rapporte respire sur la façade : le courant passe, la caisse tourne, et la lumière tremble à peine avec le secteur.",
            AmbianceCreuxNeon, pistes: 2);

        public static readonly Entree Fumee = Boucle(
            "diorama.fumee", "PROPOSE: migration d'AmbientPulseLoop (DistrictInteriorScreenController.BuildActivitySmoke, W3.U2 C10)",
            "La fumée d'une opération en cours monte et retombe au-dessus du toit : un bâtiment qui travaille ne s'éteint pas tout à fait.",
            AmbianceCreuxFumee, pistes: 1);

        public static readonly Entree Scintillement = Boucle(
            "diorama.scintillement", "PROPOSE: migration d'AmbientPulseLoop (DistrictInteriorScreenController.BuildMaintenanceFlicker, W3.U2 C10)",
            "L'enseigne d'un bâtiment dont l'entretien est en retard grésille : le tube fatigue, la tension flanche, et personne n'est encore venu le réparer.",
            AmbianceCreuxScintillement, pistes: 1);

        // ---- le retour d'appui (design retour d'appui v5, E-R2) : DEUX entrées, SANS champ public à leur nom. Elles ne se prennent
        // que par `Id` — la régie les pose elle-même (`AttacherRetourAppui` / `AttacherVoileDAppui`, E-R3), aucun site d'écran ne les
        // nomme (G14) ; un champ public inviterait un `Attacher(CatalogueHud.RetourAppui, …)` qui contourne la règle de classement.
        // Les amplitudes sont des décisions DU CLIENT (aucun oracle CSS : « aucune animation d'appui écrite », inventaire-animations.md:81).
        // L'appui MONTE en 90 ms puis TIENT ; le relâchement est la restitution de `Detacher` (immédiate, dette 32), donc pas de retour animé.
        public const string IdRetourAppui = "retour.appui";
        public const string IdRetourAppuiVoile = "retour.appui-voile";
        private const float RetourAppuiDureeS = 0.09f, RetourAppuiK = 0.85f, RetourAppuiVoileAlpha = 0.80f;

        private static readonly Entree RetourAppui = new Entree(
            IdRetourAppui, TousLesEcrans, "PROPOSE: retour d'appui v5 (design-retour-appui-v5.md §2, P4)",
            "Un bouton pressé s'assombrit sous le doigt, comme une touche qu'on enfonce : la surface qui le peint passe à 85 % de sa teinte en quatre-vingt-dix millisecondes et y reste tant que le doigt reste.",
            Genre.Retour,
            new MouvementDefini("appui", Genre.Retour, RetourAppuiDureeS,
                new[] { new Canal(Propriete.Melange, Mode.Absolu, Progres(Aisance.EaseOut)) },
                Iteration.Fois(1),
                couleurA: CouleurSpec.Cible, couleurB: CouleurSpec.CibleFois(RetourAppuiK)),
            pistes: 1, bloquante: false, hote: Entree.HoteClient);

        private static readonly Entree RetourAppuiVoile = new Entree(
            IdRetourAppuiVoile, TousLesEcrans, "PROPOSE: retour d'appui v5 (design-retour-appui-v5.md §3.1, cas 3-4)",
            "Un bouton dont la matière ne se laisse pas assombrir s'estompe à 80 % sous le doigt : même geste, par la transparence, tant que le doigt reste.",
            Genre.Retour,
            new MouvementDefini("appui.voile", Genre.Retour, RetourAppuiDureeS,
                new[]
                {
                    new Canal(Propriete.Alpha, Mode.Multiplicatif, new[]
                    {
                        new ImageCle(0f, 1f, Aisance.EaseOut),
                        new ImageCle(1f, RetourAppuiVoileAlpha, Aisance.Lineaire),
                    }),
                },
                Iteration.Fois(1)),   // PAS de `PoseDeReposS` (GD1) : sous `Reduit` un voile gelé à mi-course ne serait pas rendu
            pistes: 1, bloquante: false, hote: Entree.HoteClient);

        // ---- L1 (11/11, design Tools/anim-l1/design-l1.md, ratifié f2) : les trois entrées de PASSAGE. Hôtes existants, 0 Melange, 0 masque.
        private const float ShellEntreeDureeS = 0.16f, BandeauEntreeDureeS = 0.20f, BasculeCourseDureeS = 0.14f;
        /// <summary>Le bandeau part 10 UNITÉS au-dessus de son repos (le canal écrit la valeur telle quelle dans `anchoredPosition`, sous `TopBarEchelle` ×≈3,265 :
        /// 10 × 3,265 × 0,84375 ≈ 27,6 px ÉCRAN — les « 27,6 px » du catalogue ne sont pas l'unité du canal, revue ⊥ B3). Repère Unity : au-dessus = +.</summary>
        public const float BandeauEntreeDecalageU = 10f;

        /// <summary>L'écran d'un onglet qu'on vient d'ouvrir se découvre (fondu 160 ms, une fois) au lieu de remplacer l'ancien d'un coup. Cible : `ContentSlot`
        /// (le locataire n'a pas encore de racine : son UI naît au `Start()` suivant). Montages d'ONGLET seulement : une surimpression ne détruit pas l'écran dessous.</summary>
        public static readonly Entree ShellEntree = new Entree(
            "shell.entree", TousLesEcrans, "PROPOSE: entrée d'un écran d'onglet (catalogue l.360, amendé 11/11 : cible ContentSlot, onglets seuls)",
            "On ne se téléporte pas d'une pièce à l'autre : on pousse une porte, et ce qu'il y a derrière se découvre le temps du geste.",
            Genre.Transition,
            new MouvementDefini("shell.entree", Genre.Transition, ShellEntreeDureeS,
                new[]
                {
                    new Canal(Propriete.Alpha, Mode.Multiplicatif, new[]
                    {
                        new ImageCle(0f, 0f, Aisance.EaseOut),
                        new ImageCle(1f, 1f, Aisance.Lineaire),
                    }),
                },
                Iteration.Fois(1)),
            pistes: 1, bloquante: false, hote: Entree.HoteClient);

        public static readonly Entree BandeauEntree = new Entree(
            "bandeau.entree", TousLesEcrans, "PROPOSE: entrée du bandeau d'annonce (catalogue l.361, amendé 11/11 : canal à 10 unités)",
            "Une annonce descend de la barre comme un billet qu'on vous passe par-dessus le comptoir : elle arrive, elle n'était pas là.",
            Genre.Transition,
            new MouvementDefini("bandeau.entree", Genre.Transition, BandeauEntreeDureeS,
                new[]
                {
                    new Canal(Propriete.TranslationY, Mode.Additif, new[]
                    {
                        new ImageCle(0f, BandeauEntreeDecalageU, Aisance.EaseOut),
                        new ImageCle(1f, 0f, Aisance.Lineaire),
                    }),
                    new Canal(Propriete.Alpha, Mode.Multiplicatif, new[]
                    {
                        new ImageCle(0f, 0f, Aisance.EaseOut),
                        new ImageCle(1f, 1f, Aisance.Lineaire),
                    }),
                },
                Iteration.Fois(1)),
            pistes: 1, bloquante: false, hote: Entree.HoteClient);

        /// <summary>Un interrupteur a une course : le curseur passe d'un bout de la piste à l'autre sous le pouce. Une `Transitionner` `Absolu` de → vers
        /// (catalogue l.365 amendé 11/11 : `Reglage.Dx` n'est pas appliqué par la régie) ; le contrôleur donne les deux positions d'`anchoredPosition.x`.</summary>
        public static readonly Entree BasculeCourse = new Entree(
            "bascule.course", new[] { "⑲", "㉕" }, "PROPOSE: course du curseur d'une bascule (catalogue l.365, amendé 11/11 : Absolu de/vers)",
            "Un interrupteur a une course : le curseur passe d'un bout de la piste à l'autre sous le pouce, et le laiton de la piste s'allume quand il arrive au bout.",
            Genre.Transition,
            new MouvementDefini("bascule.course", Genre.Transition, BasculeCourseDureeS,
                new[] { new Canal(Propriete.TranslationX, Mode.Absolu, Progres(Aisance.EaseOut)) },
                Iteration.Fois(1)),
            pistes: 1, bloquante: false, hote: Entree.HoteClient);

        /// <summary>Les entrées du HUD, dans l'ordre de déclaration : le chrome, les boucles ambiantes du ①, les deux retours d'appui, puis (L1) les trois passages.</summary>
        public static readonly IReadOnlyList<Entree> Entrees = new List<Entree>
        {
            Pouls, Tremble, Gyrophare, FiletVirage, AnneauVirage, AiguilleBalayage, BandeauSortie, Neon, Fumee, Scintillement,
            RetourAppui, RetourAppuiVoile,
            ShellEntree, BandeauEntree, BasculeCourse,
        }.AsReadOnly();

        /// <summary>La courbe de progrès d'une `Transitionner` : 0 → 1, l'aisance sur le segment.</summary>
        private static ImageCle[] Progres(Aisance e)
        {
            return new[] { new ImageCle(0f, 0f, e), new ImageCle(1f, 1f, Aisance.Lineaire) };
        }

        /// <summary>Une `Ambiance` d'alpha : 1 → creux → 1 sur `AmbiancePeriodeS`, `ease-in-out` ; sous `Reduit` figée à MI-DESCENTE (p = 0,25,
        /// facteur (1 + creux) / 2 : néon 0,94, fumée 0,655), ni au creux (la fumée serait trois fois plus pâle, 0,109 au lieu de 0,35 —
        /// revue de code E2a, M4) ni à la crête (le repos, G3). Même raisonnement que `PoulsPoseReduitS` ; décision à ratifier par f2.</summary>
        private static Entree Boucle(string id, string source, string cause, float creux, int pistes)
        {
            return new Entree(
                id, EcranDiorama, source, cause, Genre.Ambiance,
                new MouvementDefini(id, Genre.Ambiance, AmbiancePeriodeS,
                    new[]
                    {
                        new Canal(Propriete.Alpha, Mode.Multiplicatif, new[]
                        {
                            new ImageCle(0f, 1f, Aisance.EaseInOut),
                            new ImageCle(0.5f, creux, Aisance.EaseInOut),
                            new ImageCle(1f, 1f, Aisance.EaseInOut),
                        }),
                    },
                    Iteration.InfiniFois, alterne: false, poseDeReposS: AmbiancePeriodeS * 0.25f),
                pistes: pistes, bloquante: false, hote: Entree.HoteClient);
        }

        private static Entree Virage(string id, string source, string cause)
        {
            return new Entree(
                id, TousLesEcrans, source, cause, Genre.Transition,
                new MouvementDefini("virage", Genre.Transition, VirageDureeS,
                    new[] { new Canal(Propriete.Melange, Mode.Absolu, Progres(Aisance.Ease)) },
                    Iteration.Fois(1),
                    couleurA: CouleurSpec.Nommee("laiton #b08d3e", Couleurs.Rvb(Laiton)),
                    couleurB: CouleurSpec.Nommee("braise #e0664a", Couleurs.Rvb(Braise))),
                pistes: 1, bloquante: false, hote: Entree.HoteClient);
        }
    }
}
