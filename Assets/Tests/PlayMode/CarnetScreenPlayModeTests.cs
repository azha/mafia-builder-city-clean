using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using System.Linq;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.CityMap;   // AuthClient y vit — mesuré, pas supposé
using MafiaCleanCity.Operational;
using MafiaCleanCity.Tests;   // SeederSupport.SafeCallsign
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>screen_c3 « Carnet » — squelette de suite généré par Tools/nouvel-ecran.py.
    ///
    /// ⛔ CE QUE CE SQUELETTE COUVRE : le montage structurel (CanvasRenderer, MaskableGraphic) et
    /// la capture pour le juge visuel. ⛔ CE QU'IL NE COUVRE PAS, et c'est // MÉTIER ICI partout
    /// où il manque : le PARCOURS joueur qui atteint cet écran (doctrine 4-couches, `CLAUDE.md`
    /// § « quatre couches ») — signup → `session/open` → la route, jamais un seed SQL sans le
    /// dire dans le nom du test. Le patron complet est `ReputationScreenPlayModeTests` (㊲,
    /// `pilote-B`) : `OuvrirJoueurFrais()` (signup + `session/close` défensif + lecture d'un
    /// lieutenant du kit de départ) — à adapter ici selon ce que `GetAmbientFeed` exige
    /// réellement comme précondition.</summary>
    [Category("ScreenC3")]
    public class CarnetScreenPlayModeTests
    {
        private GameObject hostGo;
        private GameObject shellGo;
        private AppShell shell;
        private int seq;

        [TearDown]
        public void TearDown()
        {
            GameObject reste = GameObject.Find("CarnetRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("CarnetRoot"); }
            if (hostGo != null) Object.Destroy(hostGo);
            hostGo = null;
        }

        /// <summary>La racine RÉELLE de l'écran n'est PAS `hostGo` : hors shell, le contrôleur
        /// découvre un Canvas et bâtit dessous (patron ㊲, ligne pour ligne). Chercher
        /// `hostGo.GetComponentsInChildren` rendrait ZÉRO en silence.</summary>
        private GameObject RacineEcran()
        {
            GameObject r = GameObject.Find("CarnetRoot");
            Assert.IsNotNull(r, "CarnetRoot introuvable : le contrôleur n'a pas construit sa " +
                                "mise en page (ni sous mountParent, ni sous un Canvas découvert)");
            return r;
        }

        private CarnetScreenController MonterEcran()
        {
            hostGo = new GameObject("CarnetScreen", typeof(RectTransform));
            var ecran = hostGo.AddComponent<CarnetScreenController>();
            return ecran;
        }

        // ═══ 1. GARDE STRUCTURELLE — ne lit aucun pixel, ne dépend d'aucune résolution ═══════

        /// <summary>⛔ TOUT `Graphic` PORTE SON `CanvasRenderer`, et TOUT Graphic sous ce fond
        /// est `MaskableGraphic` (donc masquable par un futur `Mask` parent) — patron ㊲, garde
        /// structurelle AVANT toute garde de valeur (c'est celle qui a fermé la classe
        /// "occlusion par fratrie" en 12 lignes là où 4 tours de gardes pixel n'y voyaient rien).
        ///
        /// ⚠️ Anti-vacuité : `AddComponent<CarnetScreenController>()` seul construit déjà le
        /// fond de `BuildLayout()` (appelé depuis `Awake()`), donc CETTE garde mord même sur le
        /// squelette non rempli — au moins 1 Graphic (le fond). Une fois le MÉTIER ICI de
        /// `BuildLayout()` rempli, relever le plancher `Assert.Greater(comptes, 1, ...)` vers une
        /// valeur qui reflète le contenu réel (㊲ l'a posé à 10).</summary>
        [UnityTest]
        public IEnumerator ScreenC3S1_ToutGraphic_PorteSonCanvasRenderer()
        {
            MonterEcran();
            yield return null;   // laisser Awake()/BuildLayout() s'exécuter

            var sansRenderer = new List<string>();
            var nonMaskable = new List<string>();
            int comptes = 0;
            foreach (Graphic g in RacineEcran().GetComponentsInChildren<Graphic>(true))
            {
                comptes++;
                if (g.GetComponent<CanvasRenderer>() == null) sansRenderer.Add(g.name);
                if (!(g is MaskableGraphic)) nonMaskable.Add(g.name);
            }

            Assert.Greater(comptes, 0,
                "0 Graphic dans l'arbre — l'écran n'a pas été construit, la garde suivante " +
                "serait vraie À VIDE");
            Assert.IsEmpty(sansRenderer,
                "des Graphic sans CanvasRenderer ne dessinent RIEN, en silence : " +
                string.Join(", ", sansRenderer));
            Assert.IsEmpty(nonMaskable,
                "des Graphic non-MaskableGraphic ignoreraient tout Mask parent (un `Graphic` nu " +
                "dérivé sur mesure, jamais `UnityEngine.UI.Image`/`TextMeshProUGUI`) : " +
                string.Join(", ", nonMaskable));
        }

        /// <summary>⛔ LE VIDE ET LE PLEIN PARTAGENT UNE SEULE COLONNE.
        ///
        /// ⛔⛔ POURQUOI CETTE GARDE EXISTE, et ce qu'elle dit de celle d'au-dessus. Le
        /// 2026-09-03, `ScreenC3` est sorti **VERT 2/2** et l'écran était fautif : « — rien — »
        /// était centré (`TextAlignmentOptions.Center`) dans un corps `flexibleWidth = 1`, donc
        /// posé à ~500 px de son propre numéro de rang, alors qu'un créneau REMPLI pose son titre
        /// à gauche. La colonne SAUTAIT selon que le créneau était plein ou vide. Rien ne l'a vu
        /// parce que mes deux seules gardes comptaient des `Graphic` et photographiaient.
        /// ⇒ *Une garde anti-vacuité certifie qu'il Y A du texte, jamais qu'il est À SA PLACE.*
        ///   Compter est une mesure de PRÉSENCE ; l'alignement est une mesure de POSITION. Un
        ///   écran peut être plein et illisible : les deux familles ne se remplacent pas.
        ///
        /// ⚠️ Elle n'assène pas `alignment == Left` — ce serait relire le setter qu'on vient
        /// d'écrire, une garde tautologique qui resterait verte si la colonne sautait pour une
        /// AUTRE raison (padding, pivot, largeur de rang). Elle compare deux bords GAUCHES
        /// mesurés après mise en page : le seul fait qui intéresse le lecteur de l'écran.</summary>
        [UnityTest]
        public IEnumerator ScreenC3S2_CreneauVideEtCreneauPlein_PartagentLaMemeColonne()
        {
            MonterEcran();
            yield return null;
            yield return null;   // laisser le VerticalLayoutGroup se résoudre

            GameObject racine = RacineEcran();
            var rien = new List<RectTransform>();
            var titres = new List<RectTransform>();
            // ⛔ SÉLECTIONNER PAR STRUCTURE, PAS PAR NOM SEUL. Première version : tout
            // `TextMeshProUGUI` nommé « Rien » ou « Titre » dans l'écran — elle a rendu 8 vides
            // + 2 pleins sur un carnet qui n'a que 8 créneaux, parce que « Titre » est un nom
            // générique porté aussi par des textes HORS liste. Le plancher `AreEqual(8, ...)` a
            // attrapé la faute et le run est sorti ROUGE : *une garde trop large ne se trompe pas
            // seulement de population, elle accuse l'écran d'un défaut qui est le sien.*
            // ⇒ Un créneau se reconnaît à sa STRUCTURE : son texte est enfant direct d'un
            //   « Corps », lui-même enfant de la ligne de créneau. Aucun autre texte de l'écran
            //   n'a ce parent.
            foreach (TextMeshProUGUI t in racine.GetComponentsInChildren<TextMeshProUGUI>(true))
            {
                if (t.transform.parent == null || t.transform.parent.name != "Corps") continue;
                if (t.name == "Rien") rien.Add((RectTransform)t.transform);
                else if (t.name == "Titre") titres.Add((RectTransform)t.transform);
            }

            // ⚠️ PLANCHER — sans lui, un écran qui ne dessinerait AUCUN créneau rendrait les deux
            // listes vides et la comparaison serait vraie à vide, le mode d'échec de ce dépôt.
            Assert.AreEqual(8, rien.Count + titres.Count,
                "les 8 créneaux doivent TOUJOURS être dessinés (vides compris) — obtenu " +
                rien.Count + " vide(s) + " + titres.Count + " plein(s)");
            Assert.IsNotEmpty(rien, "aucun créneau vide : cette garde serait vraie À VIDE");

            var coins = new Vector3[4];
            float gauche = float.NaN;
            foreach (RectTransform rt in rien)
            {
                rt.GetWorldCorners(coins);
                if (float.IsNaN(gauche)) gauche = coins[0].x;
                Assert.AreEqual(gauche, coins[0].x, 0.5f,
                    "deux « — rien — » ne commencent pas à la même abscisse");
            }

            // Le corps qui PORTE le texte donne la colonne attendue : le texte doit commencer au
            // bord gauche de son corps, pas flotter en son milieu.
            Transform corps = rien[0].parent;
            ((RectTransform)corps).GetWorldCorners(coins);
            Assert.AreEqual(coins[0].x, gauche, 1.0f,
                "« — rien — » ne commence pas au bord gauche de son créneau : il flotte au " +
                "milieu, loin de son numéro de rang, et la colonne saute entre vide et plein");
        }

        // ═══ 2. CAPTURE pour le juge visuel ⊥ — deux résolutions ══════════════════════════════

        /// <summary>Patron ㊲ (`CapturerA`) : bascule le Canvas en `ScreenSpaceCamera` sur une
        /// `RenderTexture` de la taille CIBLE (le batchmode reste bloqué à 640 de large — capturer
        /// une résolution qu'on n'a pas passe par la caméra, pas par `-screen-width`), reconstruit
        /// le layout APRÈS la bascule (sinon on photographie une géométrie calculée pour 640), et
        /// cadre l'ortho sur le rect RÉEL du canvas (pas sur la résolution demandée : le
        /// CanvasScaler change les unités).
        ///
        /// ⚠️ `Canvas.scaleFactor` lu la frame de la création rend 1,0 — plausible et faux, d'où
        /// les `yield return null` avant tout rendu.</summary>
        // ⛔⛔ LA CATÉGORIE GÉNÉRIQUE DES CAPTURES ÉTAIT CODÉE EN DUR ICI, et ce gabarit produit les 46
        /// écrans restants. Deux défauts d'un coup, à chaque écran généré :
        /// (a) la capture n'était adressable QUE par `Capture`, donc pas isolable de ses soeurs ;
        /// (b) `Capture` fait SIGSEGV dans le pilote Mesa (mesuré dans ce dépôt), donc la seule
        ///     demande qui l'atteignait est aussi celle qui tue le run.
        /// ⇒ Une capture livrée par ce gabarit était **armée et injoignable** — exactement le
        ///   défaut que le chantier joignabilité ferme côté ÉCRANS, ici côté TESTS.
        /// ⚠️ Et le préfixe est `Photo`, pas `Capture` : le filtre d'Unity matche par PRÉFIXE, donc
        ///   `Capture<Ecran>` serait emporté par une demande de `Capture` — le piège qui a mordu
        ///   trois sessions le 2026-09-02 (`["HUD"]`→`HUDv31`, `["CaptureDetail"]`→
        ///   `CaptureDetailMutant`, et ma propre série de noms, refusée par ma propre garde).
        [UnityTest, Category("PhotoScreenC3")]
        public IEnumerator ScreenC3C1_CapturerPourLeJugeVisuel_DeuxResolutions()
        {
            MonterEcran();
            yield return null;

            yield return CapturerA(1080, 1920, "Assets/Screenshots/screen_c3_1080x1920.png");
            yield return CapturerA(1080, 2400, "Assets/Screenshots/screen_c3_1080x2400.png");
        }

        /// <summary>⛔ ㉞ SOUS LE CHROME RÉEL, atteint par le CHEMIN DU JOUEUR — l'entrée nommée
        /// du menu Plus, cliquée par un clic de production, jamais un montage direct.
        ///
        /// ⛔⛔ POURQUOI CETTE CAPTURE EN PLUS DE L'AUTRE, et ce que l'autre ne peut pas voir.
        /// `ScreenC3C1` monte l'écran SEUL : hors shell, `ShellChrome.TopInsetPx` vaut ZÉRO, donc
        /// une garde d'inset y serait vraie sans rien mesurer, et l'écran peut parfaitement
        /// passer sous la barre du haut sans que rien ne l'attrape. Deux écrans de ce dépôt ont
        /// été livrés ainsi. *Un écran isolé est photographié dans un monde où le chrome n'existe
        /// pas — ce n'est pas une version plus simple du vrai, c'est un autre écran.*
        ///
        /// ⚠️ PLANCHER D'INSETS OBLIGATOIRE (`Assert.Greater(TopInsetPx, 0f)`) AVANT toute garde
        /// de zone sûre : sans lui, la garde « le contenu commence sous l'inset » est satisfaite
        /// par un inset nul, et certifie l'écran hors shell au lieu de le refuser. Troisième
        /// variante de la garde décorative : vraie À VIDE.
        ///
        /// ⚠️ ATTENTE SUR `RenduTermine`, JAMAIS sur N frames : un compte de frames est une durée
        /// déguisée en état, vert sur une machine rapide et rouge sur une lente, et il photographie
        /// un écran à moitié rempli sans jamais le dire.</summary>
        [UnityTest, Category("PhotoScreenC3SousChrome")]
        public IEnumerator ScreenC3C2_CapturerSousLeChromeReel_ParLeCheminDuJoueur()
        {
            // ⛔⛔ AUCUN `SignUp`, AUCUN `SetIdentity` — ET C'EST LE CORRECTIF.
            // Cette capture ouvrait un compte FRAIS et l'imposait au shell. Elle photographiait
            // donc un monde vide : pas d'ordres, pas de suites, rien à montrer. Mesuré le
            // 2026-09-04 sur 17 suites de capture — 12 sont dans ce cas, dont quatre des miennes.
            // ★ ET L'IDENTITÉ PAR DÉFAUT DU SHELL ÉTAIT DÉJÀ LA BONNE :
            //   `demoIdentifier = "operational_demo@example.test"`, le compte SERVI. J'avais donc
            //   *fabriqué* un monde vide en écrasant un défaut qui était juste.
            //   *Un test qui pose son propre monde ne mesure plus que ce qu'il a posé* — et un
            //   compte neuf est le monde le plus pauvre qu'on puisse lui donner.
            // ⇒ On laisse le shell signer avec SON défaut : la capture montre alors ce que le
            //   joueur de démo voit réellement, et une garde de contenu y devient interprétable.
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("CarnetShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return null;

            float t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 30f)
                yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token),
                "le shell doit avoir acquis sa session avant qu'on ouvre le menu");

            // ⛔ L'ENTRÉE EST DÉSIGNÉE PAR SON NOM, jamais par son RANG dans la liste : un
            // `boutons[7]` resterait vert en photographiant l'écran du voisin le jour où une
            // entrée est insérée avant. *Le nom est une donnée stable, l'indice est un accident
            // d'ordre.*
            const string NOM = "MenuPlus_LES ORDRES DU SOIR";
            shell.ActivateTab(AppShell.Tab.More);
            yield return null;
            Button entree = Object.FindObjectsByType<Button>(FindObjectsSortMode.None)
                .FirstOrDefault(b => b.gameObject.name == NOM);
            Assert.IsNotNull(entree,
                "l'entrée « " + NOM + " » est introuvable dans le menu Plus — l'écran n'a pas de " +
                "porte, et une capture prise en le montant à la main mentirait sur son accessibilité");
            Assert.IsTrue(ProductionClickSupport.Click(entree),
                "l'entrée refuse le clic de production (inactive ou non interactive) : un doigt " +
                "ne pourrait pas l'actionner, la destination est une porte peinte sur un mur");
            yield return null;

            var ecran = Object.FindFirstObjectByType<CarnetScreenController>();
            Assert.IsNotNull(ecran, "le clic n'a monté aucun CarnetScreenController");

            t0 = Time.realtimeSinceStartup;
            while (!ecran.RenduTermine && Time.realtimeSinceStartup - t0 < 30f) yield return null;
            Assert.IsTrue(ecran.RenduTermine,
                "l'écran n'a jamais déclaré son rendu terminé en 30 s — photographier ici " +
                "donnerait un carnet à moitié écrit, et la capture ne le dirait pas");

            // ⛔ PLANCHER — avant toute garde de zone sûre. Hors shell ces deux valeurs sont
            // NULLES, et la garde qui suit serait vraie sans rien mesurer.
            Assert.Greater(ShellChrome.TopInsetPx, 0f,
                "l'inset HAUT est nul : on n'est pas sous le chrome, toute garde de zone sûre " +
                "serait vraie À VIDE et certifierait l'écran hors shell");
            Assert.Greater(ShellChrome.BottomInsetPx, 0f, "l'inset BAS est nul — même défaut");

            // ⛔ ANTI-VACUITÉ — une capture d'écran vide passerait toutes les gardes ci-dessus.
            int textes = 0;
            foreach (TextMeshProUGUI t in RacineEcran().GetComponentsInChildren<TextMeshProUGUI>(true))
                if (!string.IsNullOrWhiteSpace(t.text)) textes++;
            Assert.GreaterOrEqual(textes, 8,
                "seulement " + textes + " texte(s) non vides sous CarnetRoot : les 8 créneaux " +
                "doivent au minimum être écrits, sinon on photographie une page blanche");

            yield return CapturerA(1080, 2400,
                "Assets/Screenshots/screen_c3_sous_chrome_1080x2400.png");
        }

        private IEnumerator CapturerA(int largeur, int hauteur, string chemin)
        {
            // Même garde que les captures de ①/③ : le bandeau est alimenté par trois arrivées
            // asynchrones et la capture partait sans en attendre aucune (mesuré le 2026-09-06 :
            // à l'entrée de cette méthode, montant, jour et chaleur sont tous VIDES). Elle se
            // déclare hors sujet si `shell` est nul — les six autres écrans capturent hors shell.
            var echecsChrome = new System.Collections.Generic.List<string>();
            yield return MafiaCleanCity.Shell.Tests.CaptureSousShell.ChromeAlimenteOuEchoue(
                shell, chemin, echecsChrome);
            if (echecsChrome.Count > 0) Assert.Fail(string.Join("\n", echecsChrome));

            GameObject racine = RacineEcran();
            Canvas canvas = racine.GetComponentInParent<Canvas>();
            Assert.IsNotNull(canvas, "CarnetRoot n'est sous aucun Canvas : rien ne peut être rendu");

            RenderMode modeAvant = canvas.renderMode;
            Camera cameraAvant = canvas.worldCamera;
            float planAvant = canvas.planeDistance;

            var rt = new RenderTexture(largeur, hauteur, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("CaptureCamScreenC3");
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

            LayoutRebuilder.ForceRebuildLayoutImmediate((RectTransform)racine.transform);
            Canvas.ForceUpdateCanvases();
            yield return null;
            yield return null;

            RectTransform crt = (RectTransform)canvas.transform;
            cam.orthographicSize = crt.rect.height / 2f;
            cam.aspect = crt.rect.width / crt.rect.height;

            cam.Render();
            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rt;
            var tex = new Texture2D(largeur, hauteur, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, largeur, hauteur), 0, 0);
            tex.Apply();
            RenderTexture.active = prev;
            System.IO.File.WriteAllBytes(chemin, tex.EncodeToPNG());

            // Anti-vacuité de FORME (patron ㊲) : une capture ratée est UNIFORME, peu importe sa
            // couleur — on compte les pixels qui diffèrent du fond dominant, pas les pixels
            // "clairs" (le fond lui-même peut être clair).
            Color[] pixels = tex.GetPixels();
            var histo = new Dictionary<int, int>();
            foreach (Color c in pixels)
            {
                int k = (Mathf.RoundToInt(c.r * 31) << 10) | (Mathf.RoundToInt(c.g * 31) << 5) | Mathf.RoundToInt(c.b * 31);
                histo.TryGetValue(k, out int n); histo[k] = n + 1;
            }
            int dominant = 0;
            foreach (var kv in histo) if (kv.Value > dominant) dominant = kv.Value;
            int horsFond = pixels.Length - dominant;
            // ⛔ TD-554 : ce plancher était `horsFond > 0` — il n'exigeait QUE que l'image ne
            // soit pas d'une seule couleur, donc un écran VIDE le franchissait. Il venait du
            // gabarit de `Tools/nouvel-ecran.py`, avec son excuse « plancher volontairement bas,
            // à durcir une fois BuildLayout() rempli » : aucun écran n'est jamais revenu le
            // durcir. *Une dette écrite dans un gabarit n'est pas une dette, c'est une politique.*
            // La PROPORTION de pixels hors dominante est de toute façon la mauvaise grandeur —
            // l'anticrénelage d'un titre en produit autant qu'une mise en page. Le NOMBRE DE
            // TEINTES tranche. Seuils repris de `CaptureSousShell`.
            // ⛔ AVERTISSEMENT, PAS ASSERTION (2026-09-04) : cet écran est capturé SEUL, sur un
            // compte souvent frais. Son état vide rend légitimement 8 à 9 teintes, et asserter
            // ici ferait rougir un écran CORRECT — mesuré sur ㉜ et ㉝, à qui je l'ai failli.
            // *Une garde chromatique ne distingue pas « cassé » de « correctement vide ».*
            if (histo.Count <= 12)
                Debug.LogWarning($"[CAPTURE] {largeur}x{hauteur} — {histo.Count} teintes : un FOND " +
                    "avec un titre. Vérifier QUEL COMPTE la suite ouvre avant de conclure.");
            Assert.IsTrue(largeur >= 200 && hauteur >= 200,
                $"capture {largeur}x{hauteur} : une dimension sous 200 px — un RectTransform resté " +
                "à sa taille par défaut (100x100) ne leve AUCUNE erreur console et rend une image plausible");

            canvas.renderMode = modeAvant;
            canvas.worldCamera = cameraAvant;
            canvas.planeDistance = planAvant;
            Object.Destroy(camGo);
            rt.Release();
            yield return null;
        }

        // MÉTIER ICI — ajouter ici les tests de PARCOURS (signup → session/open → la route) et
        // les tests d'état (AppliquerEtat sur un corps fabriqué via RendrePourTest), patron ㊲
        // §§ 1/3/5 de ReputationScreenPlayModeTests.
    
}
}