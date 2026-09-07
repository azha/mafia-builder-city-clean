using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{
    /// <summary>screen_c1 « Journal » — squelette généré par Tools/nouvel-ecran.py.
    ///
    /// Patron : `ReputationScreenController` (㊲, `pilote-B` — le seul écran construit ET jugé
    /// par juge-visuel ET juge-données). Ce squelette pose le contrat `IShellTenant`, un fond
    /// CanvasRenderer-safe et un résolveur exhaustif d'exemple ; il NE POSE PAS la géométrie de
    /// la maquette — ça, c'est `// MÉTIER ICI`, une fois la maquette lue.
    ///
    /// GÉOMÉTRIE — deux règles héritées, non négociables (mesurées ailleurs dans ce dépôt) :
    ///  · aucune valeur dérivée de `Screen.*` ni d'un `rect` lu au montage — passer par
    ///    `EchelleMaquette.Px(...)` avec la largeur DÉCLARÉE de LA maquette de cet écran
    ///    (`EchelleMaquette.LargeurEcransBrennar` = 300 par défaut pour les écrans de la famille
    ///    `ecrans-brennar.html` — // MÉTIER ICI : vérifier laquelle des 3 maquettes est la
    ///    source, ou ajouter une constante `Largeur<Nom>` si c'en est une quatrième).
    ///  · `Canvas.scaleFactor` lu la frame de la création rend 1,0 — plausible et faux. Toute
    ///    lecture de géométrie attend `yield return null` après la construction.</summary>
    public class JournalScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- points d'injection du shell (IShellTenant) -----------------------------------
        private Transform mountParent;
        /// <summary>⛔ CE POINT D'INJECTION CONSTRUIT — ET C'EST LE CORRECTIF (mesuré 2026-09-02).
        /// Le gabarit appelait <c>EnsureInitialized()</c> depuis <c>Awake()</c>. Or <c>Awake</c>
        /// s'exécute SYNCHRONEMENT DANS <c>AddComponent&lt;T&gt;()</c>, donc AVANT que l'appelant
        /// ait pu poser le parent : la racine n'a pas encore de largeur, et <c>BuildLayout()</c>
        /// mesure zéro. Symptôme observé sur un écran réel : textes empilés au centre, ce qui
        /// ressemble à un défaut de mise en page alors que c'est un défaut d'ORDRE.
        /// ⇒ *Le shell, lui, fait déjà le bon ordre à ses trois sites de montage (parent, puis
        /// géométrie, puis <c>AddComponent</c> en DERNIER) — le défaut n'était pas chez lui, il
        /// était dans ce gabarit, donc dans les 46 écrans qu'il reste à générer.*
        /// La construction se déclenche donc quand le parent est CONNU, pas quand l'objet naît.</summary>
        public void SetMountParent(Transform parent)
        {
            mountParent = parent;

            // ⛔ L'HÔTE SE PARENTE, SE DIMENSIONNE ET PASSE EN DERNIER — correctif de gabarit
            // mesuré par la session F sur SEPT locataires (2026-09-03). Le gabarit bâtissait sa
            // racine sous `mountParent`, ce qui en faisait un FRÈRE de l'hôte au lieu d'un enfant :
            // l'écran se retrouvait hors de la sous-arborescence que le shell croit contrôler, et
            // n'importe quel frère posé après lui le recouvrait.
            // ⚠️ Les quatre gestes vont ENSEMBLE, aucun ne suffit seul :
            //   1. un `RectTransform` EXPLICITE sur l'hôte — `ConstruireLocataire` crée un
            //      GameObject NU, et un `(RectTransform)transform` jetterait ;
            //   2. l'hôte ÉTIRÉ — sans quoi il a une taille nulle et tout ce qu'il contient
            //      mesure zéro, ce qui ressemble à un défaut de mise en page ;
            //   3. `SetAsLastSibling()` ICI **et** dans `Start()` — le montage et la frame
            //      suivante sont deux moments où un frère peut passer devant ;
            //   4. la racine sous `transform` (voir `BuildLayout`), pas sous `mountParent`.
            // ⚠️ ALIGNÉ MOT POUR MOT sur `Tools/nouvel-ecran.py:393-405` — un producteur, N
            // citations. Ma première version appelait en plus `SetParent(parent)` : inutile, car
            // `ConstruireLocataire` a DÉJÀ parenté l'hôte sous `ContentSlot` avant d'appeler
            // ceci. Un geste redondant dans une copie manuelle est le début d'une divergence.
            // ⛔ ET C'EST BIEN AU CONTRÔLEUR DE LE FAIRE — mesuré sur `main` (68f6851) :
            // `AppShell.cs` ne contient AUCUN `AddComponent<RectTransform>`, et
            // `ConstruireLocataire` crée `new GameObject($"Tenant_{T}")`, un objet NU. L'hôte
            // n'a donc ni `RectTransform` ni taille tant que le locataire ne se les donne pas.
            RectTransform rtHote = transform as RectTransform;
            if (rtHote == null) rtHote = gameObject.AddComponent<RectTransform>();
            rtHote.anchorMin = Vector2.zero;
            rtHote.anchorMax = Vector2.one;
            rtHote.offsetMin = Vector2.zero;
            rtHote.offsetMax = Vector2.zero;
            transform.SetAsLastSibling();

            EnsureInitialized();
        }

        private string token;
        public void SetToken(string t) => token = t;

        // ---- crochets de test ---------------------------------------------------------------
        public GetNewsFeedResponseDto DernierChargement { get; private set; }
        /// <summary>Les deux flux SECONDAIRES. `null` y est un ÉTAT NORMAL — leur échec n'est pas
        /// fatal (voir `Charger`), et le confondre avec une anomalie ferait rougir un écran qui
        /// se comporte comme prévu.</summary>
        public GetAmbientFeedResponseDto DernierAmbient { get; private set; }
        public GetRandomWorldActiveResponseDto DernierMonde { get; private set; }
        public string DerniereErreur { get; private set; }
        public long DernierCodeErreur { get; private set; }

        /// <summary>Vrai dès que l'écran a FINI de se rendre — succès ou repli.
        ///
        /// ⛔ POURQUOI CE DRAPEAU EXISTE. `Charger()` enchaîne TROIS requêtes ; la première
        /// renseigne `DernierChargement` et les deux autres sont encore en vol. Un appelant qui
        /// attend « `DernierChargement` non nul » croit donc l'écran prêt alors qu'il n'a pas
        /// encore appelé `AppliquerEtat` — mesuré le 2026-09-03 : la capture sous chrome
        /// photographiait « EN ATTENTE DU MATIN » avec un chargement déjà non nul.
        /// ★ C'est la leçon que j'avais écrite LA VEILLE sur ⑨ — « attendre le drapeau, pas un
        ///   nombre de frames » — et que j'ai répétée en écrivant un test neuf. Une leçon écrite
        ///   ne protège pas le code qu'on écrit après elle : il faut le DRAPEAU, pas la phrase.
        /// ⚠️ « Chargé » ici veut dire « rendu », pas « rendu avec des données » : le repli
        /// d'erreur le lève aussi, parce qu'un écran qui affiche « pas de réponse » a fini de
        /// faire ce qu'il avait à faire.</summary>
        public bool RenduTermine { get; private set; }

        private RectTransform racinePleinEcran;
        private JournalClient client;
        private bool initialise;

        private float Px(float css) =>
            EchelleMaquette.Px(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar);
        private int PxTrait(float css) =>
            EchelleMaquette.PxTrait(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar);

        // ⚠️ PAS d'appel depuis `Awake()` : il court dans `AddComponent`, avant tout parentage.
        // `Start()` est le filet — il s'exécute après que l'appelant a eu sa frame pour injecter le
        // parent, et `EnsureInitialized` est idempotent, donc le premier des deux qui arrive gagne
        // sans que le second ne reconstruise. Sans ce filet, un écran monté sans `SetMountParent`
        // ni `Charger()` ne se construirait JAMAIS — un vert par absence, pas une économie.
        private void Start()
        {
            EnsureInitialized();
            // ⛔ SECOND `SetAsLastSibling` — non redondant. Celui de `SetMountParent` s'applique au
            // montage ; celui-ci à la frame suivante, quand tous les frères de ce parent ont eu le
            // temps d'être posés. Un seul des deux laisse une fenêtre où l'écran passe dessous.
            if (mountParent != null) transform.SetAsLastSibling();
            amorce = StartCoroutine(Amorcer());
        }

        /// <summary>Charger dès le montage — sans quoi l'écran reste un squelette. ㊴ portait ce
        /// défaut : `Charger()` existait et n'était appelé par personne, et l'image ne pouvait pas
        /// le dire (un écran non chargé et un compte vide donnent la même photo).</summary>
        private IEnumerator Amorcer()
        {
            if (string.IsNullOrEmpty(token)) yield break;   // hors session : état vide NOMMÉ
            if (corpsImposeParUnTest) yield break;          // un test tient l'écran
            yield return Charger();
        }

        private void EnsureInitialized()
        {
            if (initialise) return;
            initialise = true;
            client = new JournalClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        /// <summary>Charge la surface. // MÉTIER ICI si `GetNewsFeed` a des paramètres
        /// de chemin (id, etc.) — ajouter les arguments correspondants ici et les faire
        /// remonter depuis l'appelant (le shell, ou un `RendrePourTest`).</summary>
        public IEnumerator Charger()
        {
            EnsureInitialized();
            DerniereErreur = null;
            DernierCodeErreur = 0;

            // ⛔ SANS CETTE LIGNE, LA CONVERSION i18n EST INERTE. `Libelle.De` rend son LITTÉRAL
            // tant que `I18nCatalog` est vide, donc un écran « converti » qui n'amorce jamais le
            // dictionnaire affiche exactement ce qu'il affichait avant — et ses captures sont
            // belles, françaises, et ne prouvent rien.
            // ★ *Convertir et amorcer sont deux gestes.* Le premier est visible dans le diff, le
            //   second ne l'est nulle part : rien ne rougit quand il manque, puisque le repli est
            //   byte-identique au texte d'origine. C'est la même famille que « deux populations
            //   disjointes » — la garantie qui rendait la conversion sûre est ce qui a caché
            //   qu'elle ne servait à rien. Mesuré le 2026-09-04 : AUCUN de mes 7 écrans convertis
            //   n'amorçait, sur les 6 du dépôt qui le font.
            yield return MafiaCleanCity.I18n.I18nCatalog.Amorcer(
                new MafiaCleanCity.I18n.I18nClient { BaseUrl = baseUrl }, token);
            // ⚠️ ABAISSÉ AU DÉBUT : un drapeau qui reste levé d'un chargement à l'autre ferait
            // croire prêt un écran qui recharge. Il dit « ce rendu-ci est fini », pas « un
            // rendu a eu lieu un jour ».
            RenduTermine = false;

            // ⛔ TROIS FLUX, PAS UN. Les trois compteurs de la maquette comptent trois listes
            // DIFFÉRENTES — « à la une » (news), « dans la rue » (ambient), « en cours »
            // (random-world) — et ne charger que la première rendrait deux compteurs à zéro
            // qui ressembleraient à un monde calme.
            // ⚠️ Seul le premier flux est FATAL : les deux autres, en échec, laissent leur
            // compteur à zéro et leur liste vide, ce que l'écran sait dire. Un écran noir parce
            // que la troisième route tousse serait pire que trois lignes manquantes.
            yield return client.GetNewsFeed(token,
                dto => DernierChargement = dto,
                (code, msg) => { DernierCodeErreur = code; DerniereErreur = msg; });

            yield return client.GetAmbientFeed(token,
                dto => DernierAmbient = dto, (code, msg) => DernierAmbient = null);

            yield return client.GetRandomWorldActive(token,
                dto => DernierMonde = dto, (code, msg) => DernierMonde = null);

            // La frame de création rend des rects non résolus : on attend le layout AVANT de
            // rendre quoi que ce soit qui lise une géométrie.
            yield return null;

            if (DernierChargement == null) { RendreEtatIndisponible(); RenduTermine = true; yield break; }
            AppliquerEtat(DernierChargement);
            RenduTermine = true;
        }

        /// <summary>Rend un corps FABRIQUÉ, sans réseau — réservé aux tests (patron ㊲,
        /// `RendrePourTest`). Ne prouve jamais que le back émet ce corps, seulement ce que
        /// l'écran EN FAIT.</summary>
        /// <summary>⛔ FERME LA COURSE ENTRE `Start()` ET LE RENDU DE TEST. Une suite qui pose un
        /// VRAI jeton puis appelle `RendrePourTest` laisse `Amorcer()` partir en parallèle :
        /// l'auto-chargement va chercher les données réelles et ÉCRASE le corps fabriqué, à une
        /// frame près. *Un test qui perd cette course lit une vérité — celle d'un autre monde que
        /// le sien*, et son rouge accuse alors le résolveur au lieu de l'ordonnancement.
        /// ⚠️ Le garde-fou `IsNullOrEmpty(token)` NE COUVRE PAS ce cas : il protège l'écran monté
        /// hors session, pas celui à qui un test donne une identité PUIS impose un corps.
        /// ⚠️ Relu APRÈS CHAQUE `yield`, jamais seulement à l'entrée : la coroutine peut être déjà
        /// partie quand le test pose le drapeau. Mesuré sur ⑨ (patron `2efdf2e`).</summary>
        private bool corpsImposeParUnTest;
        private Coroutine amorce;

        public void RendrePourTest(GetNewsFeedResponseDto dto)
        {
            corpsImposeParUnTest = true;
            // ⛔ ON ARRÊTE L'AUTO-CHARGEMENT, on ne se contente pas de le décourager. Le drapeau
            // seul ne ferme que le cas facile (le test rend AVANT que la coroutine ne parte) :
            // si elle est déjà dans son appel réseau, elle rendra son résultat PAR-DESSUS le corps
            // du test quelques frames plus tard, et `Charger()` applique son état dans plusieurs
            // branches — y semer des gardes serait fragile et incomplet.
            // ★ *Fermer une course en demandant poliment à l'autre de renoncer suppose qu'il
            //   repasse par un point où on peut le lui dire.* `StopCoroutine` ne le suppose pas.
            if (amorce != null) { StopCoroutine(amorce); amorce = null; }
            EnsureInitialized();
            AppliquerEtat(dto);
        }

        /// <summary>// MÉTIER ICI — TOUT le rendu métier de cet écran part d'ici. Vide à
        /// dessein : remplir depuis la maquette RATIFIÉE et le corps RÉEL mesuré, jamais depuis
        /// une supposition sur ce que l'interface TypeScript back "devrait" rendre.</summary>
        private void AppliquerEtat(GetNewsFeedResponseDto dto)
        {
            NewsBeatDto[] breves = dto != null && dto.beats != null ? dto.beats : new NewsBeatDto[0];
            AmbientEventDto[] rue = DernierAmbient != null && DernierAmbient.events != null
                ? DernierAmbient.events : new AmbientEventDto[0];
            RandomWorldEventDto[] monde = DernierMonde != null && DernierMonde.events != null
                ? DernierMonde.events : new RandomWorldEventDto[0];

            Breves = breves; Rue = rue; Monde = monde;

            bool rienNeBouge = breves.Length == 0 && rue.Length == 0 && monde.Length == 0;

            // ⛔ LE SOUS-TITRE PORTE LE MODE — cadre 125 « ce qui se dit ce matin », cadre 129
            // « rien ne bouge ». Les six cadres ratifiés ne diffèrent que par lui.
            sousTitre.text = rienNeBouge ? Lib("RIEN NE BOUGE") : Lib("CE QUI SE DIT CE MATIN");

            MajCompteur(0, breves.Length, Lib("À LA UNE"));
            MajCompteur(1, rue.Length,    Lib("DANS LA RUE"));
            MajCompteur(2, monde.Length,  Lib("EN COURS"));

            RendreListe(breves, rue, monde, rienNeBouge);

            if (rienNeBouge)
            {
                // ⛔ CE QUE LE CADRE 129 DIT, ET QUI N'EST PAS « TOUT VA BIEN » : ces trois listes
                // se remplissent avec ce que LA VILLE fait, pas avec ce que le joueur fait. Un
                // journal vide n'est donc pas un reproche au joueur — et le dire évite qu'il
                // cherche ce qu'il a mal fait.
                MajPanneau(Lib("POURQUOI C'EST VIDE"),
                    Lib("Le journal suit le monde, pas vous"),
                    Lib("ces trois listes se remplissent avec ce que la ville fait. Aucune ne "
                        + "dépend de vos gestes."));
            }
            else
            {
                // ⛔ LE PANNEAU DIT LE TROU PLUTÔT QUE DE LE MASQUER — et ici le trou est mesuré,
                // pas supposé : les titres servis sont des CLÉS (`news_beat.digest.…`), et le
                // dictionnaire ne les porte pas. C'est le maillon L1 que la maquette déclare
                // elle-même au cadre 130, confirmé par le corps réel.
                MajPanneau(Lib("CE QUE LE SERVEUR ENVOIE VRAIMENT"),
                    Lib("Aucune de ces brèves n'a de texte"),
                    Lib("le serveur rend des clés et un gabarit à trous ; les titres restent à "
                        + "écrire. Voilà le journal tel qu'il s'afficherait aujourd'hui."));
            }
        }

        /// <summary>L'état AVANT tout chargement — le troisième, et celui qu'on oublie.
        ///
        /// ⛔ MESURÉ sur la première capture de ㊳ (2026-09-03) : montée sans jeton, la coquille
        /// se dessinait NUE — enseigne sans sous-titre, trois « 00 » sans libellé, panneau vide —
        /// et le test PASSAIT. C'est exactement ce que ㊴ m'a montré ce matin, à ceci près que
        /// ㊴ ne chargeait jamais, tandis qu'ici l'écran n'a simplement pas ENCORE chargé.
        /// ★ TROIS états donnent trois compteurs à zéro, et rien ne les distingue à l'image :
        ///     « pas encore chargé »  ← ICI, l'écran ne sait pas encore
        ///     « rien ne bouge »        chargé, et la ville a été calme (cadre 129)
        ///     « pas de réponse »       la route a échoué
        ///   Les confondre, c'est faire passer une panne pour une nuit tranquille. Chacun a donc
        ///   son texte, et aucun ne laisse l'écran muet.
        /// ⇒ Un écran monté sans session n'est plus une coquille : il DIT qu'il attend.</summary>
        private void RendreEtatInitial()
        {
            sousTitre.text = Lib("EN ATTENTE DU MATIN");
            MajCompteur(0, 0, Lib("À LA UNE"));
            MajCompteur(1, 0, Lib("DANS LA RUE"));
            MajCompteur(2, 0, Lib("EN COURS"));
            MajPanneau(Lib("CE QUE CET ÉCRAN SAIT POUR L'INSTANT"),
                Lib("Le journal n'a pas encore été ouvert"),
                Lib("les trois listes n'ont pas été demandées — ce n'est ni « rien ne bouge » ni "
                    + "« pas de réponse », c'est « pas encore »."));
        }

        private void MajCompteur(int i, int valeur, string libelle)
        {
            if (compteurNombre[i] == null) return;
            // Deux chiffres comme la maquette : « 01 », « 04 ». Un compteur qui passe de « 9 » à
            // « 10 » ferait bouger toute la ligne.
            compteurNombre[i].text = valeur < 100 ? valeur.ToString("00") : valeur.ToString();
            compteurLibelle[i].text = libelle;
        }

        private void MajPanneau(string sur, string titre, string texte)
        {
            if (pannSur == null) return;
            pannSur.text = sur; pannTitre.text = titre; pannTexte.text = texte;
        }

        /// <summary>Les trois listes, dans l'ordre du cadre 125 : la une, puis la rue, puis ce
        /// qui arrive à la ville.
        /// ⚠️ CHAQUE LIGNE MONTRE SA CLÉ SOUS SON TITRE — c'est ce que la maquette dessine
        /// (`news.beat.body_found · Stack-2`), et ce n'est pas un débogage laissé traîner : tant
        /// que les textes ne sont pas écrits, la clé est la seule chose vraie à afficher.</summary>
        private void RendreListe(NewsBeatDto[] breves, AmbientEventDto[] rue,
                                 RandomWorldEventDto[] monde, bool rienNeBouge)
        {
            for (int i = listeRoot.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(listeRoot.GetChild(i).gameObject);

            if (rienNeBouge)
            {
                TextMeshProUGUI vide = NouveauTexte(listeRoot, "RienCeMatin",
                    Lib("Rien ce matin.\nLa ville a passé une nuit tranquille."),
                    Px(10f), TexteFaible, DesignTokens.Current.hudSerifFont);
                vide.alignment = TextAlignmentOptions.Center;
                return;
            }

            foreach (NewsBeatDto b in breves)
            {
                if (b == null) continue;
                Ligne(b.outlet_i18n_key, b.headline_i18n_key, b.district, b.recency_band, false);
            }
            foreach (AmbientEventDto a in rue)
            {
                if (a == null) continue;
                Ligne(null, a.descriptor_i18n_key, a.district, a.recency_band, false);
            }
            foreach (RandomWorldEventDto m in monde)
            {
                if (m == null) continue;
                // ⛔ `permanent` A SON CADRE (127) : c'est le seul cran qui ne s'en va pas, et
                // c'est toute la thèse de ce bloc. Il se signale ici par son contour, jamais par
                // la couleur seule (a11y) — la phase est aussi écrite en toutes lettres.
                bool acquis = m.phase_band == "permanent";
                Ligne(PhaseEnMots(m.phase_band), m.template_i18n_key, m.district,
                      m.recency_band, acquis);
            }
        }

        /// <summary>Une ligne : le titre (une CLÉ), et sous lui la clé technique + le quartier.</summary>
        private void Ligne(string sur, string cle, string quartier, string fraicheur, bool acquis)
        {
            GameObject go = NouveauUI("Ligne", listeRoot);
            AjouterFond(go, FondBloc);
            // ⛔ HAUTEUR PLANCHER, PAS FIGÉE — TROISIÈME fois aujourd'hui que ce défaut se
            // présente (le panneau de ㊴ ce matin, puis celui-ci deux fois). Un titre qui passe
            // sur deux lignes dans un cadre de hauteur fixe CHEVAUCHE la ligne du dessous.
            // ★ Ici les titres sont des CLÉS, donc longues par nature
            //   (`news_beat.digest.ambient_micro.free_weekly.headline`) : la hauteur variable
            //   n'est pas un cas limite, c'est le cas NORMAL de cet écran.
            var leLigne = go.AddComponent<LayoutElement>();
            leLigne.minHeight = Px(CssHBreve);
            leLigne.preferredHeight = -1f;
            leLigne.flexibleHeight = 0f;
            if (acquis) Contour(go, AccentVif);

            var v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)Px(9f), (int)Px(9f), (int)Px(7f), (int)Px(7f));
            v.spacing = Px(2f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            if (!string.IsNullOrEmpty(sur))
                NouveauTexte(go.transform, "Sur", sur, Px(7f),
                    acquis ? AccentVif : AccentOr, DesignTokens.Current.primaryFont);

            NouveauTexte(go.transform, "Titre", cle ?? "(sans clé)", Px(11f), TexteFort,
                DesignTokens.Current.hudSerifFont);

            string dessous = quartier ?? "";
            if (!string.IsNullOrEmpty(fraicheur))
                dessous = string.IsNullOrEmpty(dessous) ? fraicheur : dessous + " · " + fraicheur;
            NouveauTexte(go.transform, "Cle", dessous, Px(7f), TexteFaible,
                DesignTokens.Current.primaryFont);
        }

        /// <summary>La phase, en mots — cadre 126 : « quatre passent, une seule reste ».
        /// ⛔ Une phase INCONNUE s'affiche TELLE QUELLE. Le seul cran qui compte vraiment est
        /// celui qui ne s'en va pas ; rabattre l'inconnu sur « ça traîne » effacerait la seule
        /// distinction que cet écran existe pour montrer — même règle que la bande de ㊴.</summary>
        private static string PhaseEnMots(string bande)
        {
            switch (bande)
            {
                case "starting":  return Lib("ÇA COMMENCE");
                case "unfolding": return Lib("ÇA SE DÉPLOIE");
                case "settling":  return Lib("ÇA RETOMBE");
                case "lingering": return Lib("ÇA TRAÎNE");
                case "permanent": return Lib("ÇA NE PARTIRA PAS");
                default: return string.IsNullOrEmpty(bande) ? Lib("PHASE INCONNUE") : bande;
            }
        }

        /// <summary>Les listes du dernier chargement — crochets de test.</summary>
        public NewsBeatDto[] Breves { get; private set; } = new NewsBeatDto[0];
        public AmbientEventDto[] Rue { get; private set; } = new AmbientEventDto[0];
        public RandomWorldEventDto[] Monde { get; private set; } = new RandomWorldEventDto[0];

        /// <summary>Repli NOMMÉ sur échec réseau — jamais une exception, jamais un écran noir
        /// (patron ㊲ : `Render(null)` a fait planter un autre écran de ce dépôt à la première
        /// ligne qui lisait le payload).</summary>
        private void RendreEtatIndisponible()
        {
            // ⛔ VIDER D'ABORD. Laisser les brèves du chargement précédent afficherait un journal
            // PÉRIMÉ sous un message d'erreur — et un journal périmé se lit exactement comme un
            // journal frais. ㊲ a payé ce défaut sur sa liste de règles.
            Breves = new NewsBeatDto[0];
            Rue = new AmbientEventDto[0];
            Monde = new RandomWorldEventDto[0];

            for (int i = listeRoot.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(listeRoot.GetChild(i).gameObject);

            sousTitre.text = Lib("LE JOURNAL N'EST PAS ARRIVÉ");
            MajCompteur(0, 0, Lib("À LA UNE"));
            MajCompteur(1, 0, Lib("DANS LA RUE"));
            MajCompteur(2, 0, Lib("EN COURS"));

            // ⚠️ « Pas de réponse » N'EST PAS « rien ne bouge » — et c'est toute la différence
            // que ce repli existe pour dire. Les compteurs à zéro sont identiques dans les deux
            // cas ; seul ce texte les sépare. Sans lui, une panne de route se lirait comme une
            // nuit tranquille.
            MajPanneau(Lib("CE QUE LE SERVEUR ENVOIE VRAIMENT"),
                Lib("Pas de réponse"),
                Lib("la route n'a rien rendu. Ce n'est pas « la ville est calme » : c'est « on "
                    + "ne sait pas ce qu'elle a fait cette nuit »."));
        }

        // ═══ Géométrie — conventions du châssis de la série 6, PAS une maquette mesurée au pixel
        // ⚠️ Les six cadres ratifiés (m-125..130) fixent la COMPOSITION — enseigne, trois
        // compteurs, liste, panneau — pas des cotes. Les hauteurs ci-dessous reprennent celles
        // du châssis déjà en place sur ㊴/㊲ ; elles sont assumées comme conventions, et c'est
        // dit ici plutôt que présenté comme une mesure. ⇒ Ce qui EST opposable à la maquette :
        // l'ordre des blocs, les trois compteurs, les libellés, et le fait que les clés i18n
        // s'affichent SOUS les titres.
        private const float CssMargeX    = 13f;
        private const float CssMargeY    = 10f;
        private const float CssEcart     =  9f;
        private const float CssHEnseigne = 51f;
        private const float CssHCompteur = 44f;
        private const float CssHBreve    = 52f;
        private const float CssHPanneau  = 92f;

        private static Color FondBloc    => DesignTokens.Current.surfaceCard;
        private static Color TexteFort   => DesignTokens.Current.hudCreme;
        private static Color TexteFaible => DesignTokens.Current.hudCremeSecondary;
        private static Color AccentOr    => DesignTokens.Current.accentGold;
        private static Color AccentVif   => HeatBucketResolver.SeverityColor(
                                                HeatBucketResolver.Severity.Severe);

        private RectTransform listeRoot;
        private TextMeshProUGUI sousTitre;
        private readonly TextMeshProUGUI[] compteurNombre = new TextMeshProUGUI[3];
        private readonly TextMeshProUGUI[] compteurLibelle = new TextMeshProUGUI[3];
        private TextMeshProUGUI pannSur, pannTitre, pannTexte;

        /// <summary>L'enseigne : « Le journal » et, dessous, CE QUE CE CADRE MONTRE. Les six
        /// cadres ratifiés ne diffèrent que par ce sous-titre — « ce qui se dit ce matin »,
        /// « ce qui arrive à la ville », « ce qui ne partira pas »… C'est donc lui qui porte le
        /// MODE de lecture, et il n'est pas décoratif.</summary>
        private void ConstruireEnseigne(Transform parent)
        {
            GameObject go = NouveauUI("Enseigne", parent);
            AjouterFond(go, FondBloc);
            AjouterHauteur(go, Px(CssHEnseigne));
            var v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)Px(8f), (int)Px(8f), (int)Px(7f), (int)Px(7f));
            v.spacing = Px(2f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            TextMeshProUGUI titre = NouveauTexte(go.transform, "Titre", Lib("Le journal"),
                Px(19f), AccentOr, DesignTokens.Current.hudSerifFont);
            titre.alignment = TextAlignmentOptions.Center;
            titre.characterSpacing = 14f;

            sousTitre = NouveauTexte(go.transform, "SousTitre", "", Px(7.5f), TexteFaible,
                DesignTokens.Current.primaryFont);
            sousTitre.alignment = TextAlignmentOptions.Center;
            sousTitre.characterSpacing = 18f;
        }

        /// <summary>Les TROIS compteurs. Chacun compte une LISTE différente — c'est pour ça que
        /// l'écran charge trois flux et pas un.
        /// ⚠️ Les nombres sont posés à deux chiffres (« 01 », « 04 ») comme la maquette : un
        /// compteur qui saute de « 9 » à « 10 » fait bouger toute la ligne.</summary>
        private void ConstruireCompteurs(Transform parent)
        {
            GameObject bande = NouveauUI("Compteurs", parent);
            AjouterHauteur(bande, Px(CssHCompteur));
            var h = bande.AddComponent<HorizontalLayoutGroup>();
            h.spacing = Px(6f);
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = true; h.childForceExpandHeight = true;

            for (int i = 0; i < 3; i++)
            {
                GameObject c = NouveauUI("Compteur" + i, bande.transform);
                AjouterFond(c, FondBloc);
                var v = c.AddComponent<VerticalLayoutGroup>();
                v.padding = new RectOffset((int)Px(4f), (int)Px(4f), (int)Px(5f), (int)Px(5f));
                v.childControlWidth = true; v.childControlHeight = true;
                v.childForceExpandWidth = true; v.childForceExpandHeight = false;

                compteurNombre[i] = NouveauTexte(c.transform, "Nombre", "00", Px(15f),
                    DesignTokens.Current.hudGaugeArcCold, DesignTokens.Current.hudSerifFont);
                compteurNombre[i].alignment = TextAlignmentOptions.Center;

                compteurLibelle[i] = NouveauTexte(c.transform, "Libelle", "", Px(6.5f),
                    TexteFaible, DesignTokens.Current.primaryFont);
                compteurLibelle[i].alignment = TextAlignmentOptions.Center;
                compteurLibelle[i].characterSpacing = 16f;
            }
        }

        /// <summary>Le cadre de la liste — un CADRE borné, et dedans un CONTENU libre d'être haut.
        ///
        /// ⛔ MESURÉ le 2026-09-03, et les deux symptômes n'avaient QU'UNE cause. Ma première
        /// version mettait le `VerticalLayoutGroup` directement sur le cadre : sa hauteur
        /// MINIMALE devenait alors la somme des vingt lignes. Le parent ne pouvant pas descendre
        /// sous ce minimum, tout retombait aux hauteurs minimales — d'où les titres écrasés sur
        /// leur ligne de quartier — et le cadre lui-même débordait sous le dock, ce qui rendait
        /// le masque inutile puisqu'il découpait un rectangle déjà trop grand.
        /// ★ J'ai d'abord corrigé les DEUX symptômes séparément (hauteur des lignes, puis masque)
        ///   et l'image est revenue IDENTIQUE. Deux correctifs qui ne changent rien disent qu'on
        ///   n'a pas trouvé la cause — pas qu'il en faut un troisième.
        /// ⇒ CADRE : `minHeight = 0`, aucun layout group, un `RectMask2D`. Il prend l'espace qui
        ///   reste et ne peut jamais le dépasser.
        ///   CONTENU : ancré en haut, sa propre pile, libre de mesurer ce qu'il veut — il déborde
        ///   du cadre, et c'est le masque qui décide de ce qui se voit.
        /// ⚠️ Ce n'est PAS un défilement : les brèves du bas ne sont pas atteignables. C'est un
        /// manque ASSUMÉ — la maquette ne dessine aucune barre, et son propre cadre des manques
        /// (130) n'en parle pas. Un masque qui cache proprement vaut mieux qu'un débordement qui
        /// recouvre le dock ; les deux valent mieux qu'une barre qui ne défilerait pas.</summary>
        private RectTransform ConstruireListe(Transform parent)
        {
            GameObject cadre = NouveauUI("Liste", parent);
            var le = cadre.AddComponent<LayoutElement>();
            le.minHeight = 0f;          // ⇐ LA ligne qui manquait
            le.preferredHeight = 0f;
            le.flexibleHeight = 1f;     // prend ce qui reste, jamais plus
            cadre.AddComponent<RectMask2D>();

            GameObject contenu = NouveauUI("Contenu", cadre.transform);
            var rt = (RectTransform)contenu.transform;
            rt.anchorMin = new Vector2(0f, 1f);
            rt.anchorMax = new Vector2(1f, 1f);
            rt.pivot = new Vector2(0.5f, 1f);
            rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;

            var v = contenu.AddComponent<VerticalLayoutGroup>();
            v.spacing = Px(5f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.UpperCenter;
            var fit = contenu.AddComponent<ContentSizeFitter>();
            fit.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            return rt;
        }

        /// <summary>Le panneau bas — ce que l'écran ne peut pas dire. Hauteur PLANCHER, pas
        /// figée : ㊴ a montré hier qu'un cadre de hauteur fixe recevant une PHRASE fait
        /// chevaucher son titre et déborder son corps.</summary>
        private void ConstruirePanneau(Transform parent)
        {
            GameObject go = NouveauUI("Panneau", parent);
            AjouterFond(go, FondBloc);
            var le = go.GetComponent<LayoutElement>() ?? go.AddComponent<LayoutElement>();
            le.minHeight = Px(CssHPanneau);
            le.preferredHeight = -1f;
            le.flexibleHeight = 0f;

            var v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(9f), (int)Px(9f));
            v.spacing = Px(3f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            pannSur = NouveauTexte(go.transform, "SurTitre", "", Px(7.5f), TexteFaible,
                DesignTokens.Current.primaryFont);
            pannTitre = NouveauTexte(go.transform, "Titre", "", Px(13f), AccentOr,
                DesignTokens.Current.hudSerifFont);
            pannTexte = NouveauTexte(go.transform, "Texte", "", Px(9f), TexteFaible,
                DesignTokens.Current.primaryFont);
        }

        /// <summary>Un contour, en QUATRE BANDES d'un pixel — jamais un enfant plein rect.
        ///
        /// ⛔ MESURÉ sur ㊱ le 2026-09-02 : un enfant qui couvre tout le rect de son parent est
        /// dessiné APRÈS le graphique du parent, donc il le RECOUVRE — 82,5 % de l'écran était
        /// passé en doré. `SetAsFirstSibling` n'y change rien : il ordonne les FRÈRES, pas un
        /// enfant vis-à-vis de son parent.
        /// ⇒ Quatre bandes de bord, qui ne couvrent que ce qu'elles doivent peindre.
        /// ⚠️ `ignoreLayout` sur chacune : sans lui, le `VerticalLayoutGroup` du parent les
        /// empilerait comme du contenu et pousserait le vrai contenu hors du cadre.</summary>
        private void Contour(GameObject cible, Color couleur)
        {
            float e = PxTrait(1f);
            var bords = new (Vector2 min, Vector2 max, Vector2 oMin, Vector2 oMax)[]
            {
                (new Vector2(0f, 1f), Vector2.one,        new Vector2(0f, -e),  Vector2.zero),   // haut
                (Vector2.zero,        new Vector2(1f, 0f), Vector2.zero,        new Vector2(0f, e)), // bas
                (Vector2.zero,        new Vector2(0f, 1f), Vector2.zero,        new Vector2(e, 0f)), // gauche
                (new Vector2(1f, 0f), Vector2.one,        new Vector2(-e, 0f),  Vector2.zero),   // droite
            };
            foreach (var b in bords)
            {
                GameObject bord = NouveauUI("Bord", cible.transform);
                AjouterFond(bord, couleur);
                var le = bord.AddComponent<LayoutElement>();
                le.ignoreLayout = true;
                var rt = (RectTransform)bord.transform;
                rt.anchorMin = b.min; rt.anchorMax = b.max;
                rt.offsetMin = b.oMin; rt.offsetMax = b.oMax;
            }
        }

        private static void AjouterHauteur(GameObject go, float hauteur)
        {
            var le = go.GetComponent<LayoutElement>() ?? go.AddComponent<LayoutElement>();
            le.minHeight = hauteur; le.preferredHeight = hauteur; le.flexibleHeight = 0f;
        }

        /// <summary>Item 0.6 — les littéraux STATIQUES de ㊳ passent par `journal.bloc.<slug>`,
        /// repli sur le littéral.
        /// ⛔ N'Y PASSENT PAS : les CLÉS servies par le serveur (`headline_i18n_key`,
        /// `descriptor_i18n_key`, `template_i18n_key`). Elles s'affichent TELLES QUELLES —
        /// c'est ce que la maquette dessine, et c'est le maillon L1 que le cadre 130 déclare :
        /// « écrire les titres et les brèves ». Les faire passer par un traducteur qui ne les
        /// connaît pas rendrait la même chaîne en prétendant l'avoir traduite.</summary>
        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("journal", "bloc", litteral);

        // ═══ Construction de la mise en page ═════════════════════════════════════════════════

        private void BuildLayout()
        {
            Canvas canvas = FindFirstObjectByType<Canvas>();
            if (canvas == null)
            {
                GameObject go = new GameObject("Canvas",
                    typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
                canvas = go.GetComponent<Canvas>();
                canvas.renderMode = RenderMode.ScreenSpaceOverlay;
                CanvasScaler sc = go.GetComponent<CanvasScaler>();
                sc.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
                sc.referenceResolution = new Vector2(1280, 720);
            }
            // ⛔ LA RACINE SOUS `transform`, PAS SOUS `mountParent` — 4e geste du correctif de
            // gabarit (voir `SetMountParent`). Sous `mountParent`, `JournalRoot` naîtrait FRÈRE
            // de l'hôte : le shell croirait contrôler une sous-arborescence qui ne contient pas
            // l'écran. Hors shell (`mountParent == null`), on retombe sur le canvas comme avant.
            Transform root = mountParent != null ? transform : canvas.transform;

            // La racine PLEIN ÉCRAN — jamais un panneau intermédiaire : c'est elle qui sert de
            // référence d'échelle à `Px()`/`PxTrait()` (un conteneur plus étroit fausserait
            // TOUTE la mise à l'échelle par un facteur muet).
            GameObject racine = NouveauUI("JournalRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            AjouterFond(racine, DesignTokens.Current.surfaceBase);

            // ⛔ LE CHROME MANGE SA PART, EN HAUT ET EN BAS — posé AVANT toute capture sous
            // chrome. Quatre écrans sur quatre portaient ce défaut le même jour (⑨ et ② en bas,
            // ㊱ aux deux bouts, ㊴ non mesuré jusqu'à hier). Hors shell les insets valent 0 et
            // l'écran remplit tout, ce qui est le comportement voulu.
            VerticalLayoutGroup pile = racine.AddComponent<VerticalLayoutGroup>();
            pile.padding = new RectOffset(
                (int)Px(CssMargeX), (int)Px(CssMargeX),
                (int)(Px(CssMargeY) + MafiaCleanCity.Shell.ShellChrome.TopInsetPx),
                (int)(Px(CssMargeY) + MafiaCleanCity.Shell.ShellChrome.BottomInsetPx));
            pile.spacing = Px(CssEcart);
            pile.childControlWidth = true; pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;

            ConstruireEnseigne(racine.transform);
            ConstruireCompteurs(racine.transform);
            listeRoot = ConstruireListe(racine.transform);
            ConstruirePanneau(racine.transform);
            RendreEtatInitial();
        }

        // ═══ Primitives — dupliquées par convention (aucun fichier du dépôt ne les partage,
        // mesuré sur `main` le 2026-09-02) ═════════════════════════════════════════════════════

        private static GameObject NouveauUI(string nom, Transform parent)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        /// <summary>⛔ TOUTE Image passe par ici. `AddComponent&lt;T&gt;()` à l'exécution
        /// n'honore PAS le `[RequireComponent(CanvasRenderer)]` d'une classe de base — sans
        /// `CanvasRenderer`, un `Graphic` ne dessine RIEN, sans la moindre erreur console
        /// (mesuré sur ce dépôt : `VerticalGradientImage`, deux panneaux jamais visibles).
        /// Et un `Image` standard `UnityEngine.UI.Image` (utilisée ici) EST déjà `MaskableGraphic`
        /// — elle passe donc sous un `Mask` parent sans rien de plus à faire ; seul un `Graphic`
        /// personnalisé dérivé directement de `Graphic` (pas `MaskableGraphic`) aurait besoin
        /// d'un correctif de base en plus de ce `CanvasRenderer` explicite.</summary>
        private static Image AjouterImage(GameObject go)
        {
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            return go.AddComponent<Image>();
        }

        private static Image AjouterFond(GameObject go, Color couleur)
        {
            Image img = AjouterImage(go);
            img.color = couleur;
            img.raycastTarget = false;
            return img;
        }

        private static TextMeshProUGUI NouveauTexte(Transform parent, string nom, string texte,
                                                     float corpsPx, Color couleur, TMP_FontAsset police)
        {
            GameObject go = NouveauUI(nom, parent);
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = police;
            t.text = texte;
            t.fontSize = corpsPx;   // un corps de texte à 0 est un défaut de rendu
            t.color = couleur;
            t.raycastTarget = false;
            return t;
        }

        private static void Etirer(RectTransform rt, float marge = 0f)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(marge, marge);
            rt.offsetMax = new Vector2(-marge, -marge);
        }
    }

    /// <summary>screen_c1 — les correspondances « valeur du domaine → apparence », chacune en
    /// FONCTION NOMMÉE prenant la valeur du domaine (patron `HeatBucketResolver.SeverityColor` —
    /// jamais un tableau positionnel ni une chaîne de ternaires : mesuré sur ce dépôt, un
    /// balayage anti-régression écrit pour traquer ces correspondances rend ZÉRO sur un fichier
    /// qui les porte par l'ordre d'un tableau — la garde ne peut voir sa cible qu'APRÈS ce
    /// passage en fonction nommée).
    ///
    /// // MÉTIER ICI — `EtatDomaine` est un PLACEHOLDER : remplacer par l'enum réel du domaine
    /// (ex. `Severity`, `Posture`…) une fois le corps back mesuré, PUIS écrire le switch
    /// EXHAUSTIF sans `default` silencieux (un `default: throw` rend une 5ᵉ valeur BRUYANTE
    /// plutôt que collisionner avec un repli connu — patron `HeatBucketResolver`, note M2 :
    /// un `switch` STATEMENT C# sans `default` est une erreur de compilation CS0161, donc
    /// "exhaustif sans default" n'existe PAS ici — le détecteur d'un membre neuf est un TEST sur
    /// `Enum.GetValues(typeof(EtatDomaine))`, jamais le compilateur).</summary>
    public static class JournalResolvers
    {
        public enum EtatDomaine
        {
            // MÉTIER ICI — remplacer par les valeurs RÉELLES du domaine.
            Inconnu = 0,
        }

        public static Color CouleurPour(EtatDomaine etat)
        {
            switch (etat)
            {
                case EtatDomaine.Inconnu: return DesignTokens.Current.onSurfaceMuted;
                default: throw new System.ArgumentOutOfRangeException(nameof(etat), etat,
                    "JournalResolvers.CouleurPour : membre de EtatDomaine non résolu.");
            }
        }
    }
}
