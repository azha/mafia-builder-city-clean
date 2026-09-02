using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;   // REUSE AuthClient (signup)
using MafiaCleanCity.Tests;     // SeederSupport
using MafiaCleanCity.Operational;
using MafiaCleanCity.Theme;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>㊲ La réputation (`screen_b3`) — la suite d'écran.
    ///
    /// ⛔ CE QUI EST DÉLIBÉRÉMENT ABSENT : le shell. On monte le locataire SEUL. Entrer en Play
    /// Mode avec `AppShell` ferait signer le compte de démo partagé (`operational_demo@…`) —
    /// celui-là même qui a produit l'incident du 21 août : 59 tests passés de 59/59 à 0/59 sans
    /// qu'une ligne de code change, parce qu'un voisin avait laissé une session ouverte sur le
    /// MÊME compte. Ce fichier crée son propre joueur, à chaque fixture.
    ///
    /// ⛔ ET CHAQUE FIXTURE RÉTABLIT SON PROPRE RÉGIME : `session/close` juste après le signin,
    /// jamais supposé hérité. Le reset de l'incident d'août visait `player_progression_state`
    /// (le COMPTEUR) alors que la session vit dans `gameplay_sessions` (une AUTRE table) — un
    /// reset qui vise le compteur et non son déclencheur ne réinitialise rien.
    ///
    /// ORDRE DES GARDES — structurelles AVANT les gardes de valeur. Sur le chantier précédent,
    /// quatre tours de gardes pixel n'avaient pas vu la classe « occlusion par fratrie » ; une
    /// garde d'ORDRE l'a fermée en douze lignes. Une propriété structurelle ne dépend d'aucune
    /// valeur de pixel, donc d'aucune résolution.</summary>
    [Category("ScreenB3")]
    public class ReputationScreenPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private static int callsignSeq;
        private GameObject hostGo;
        private string token;
        private string lieutenantId;


        /// <summary>⛔ LA RACINE RÉELLE DE L'ÉCRAN N'EST PAS `hostGo`, et c'est le patron maison.
        ///
        /// Hors shell, personne n'appelle `SetMountParent` : le contrôleur découvre alors un
        /// `Canvas` et bâtit dessous (`ReputationScreenController:356`). C'est exactement ce que
        /// font les 9 autres écrans du dépôt — `AutonomyInbox`, `ExceptionQueue`,
        /// `BuildingCard`… découvrent tous leur Canvas de la même façon. Le composant vit sur
        /// `hostGo`, sa mise en page vit ailleurs.
        ///
        /// ⇒ Interroger `RacineEcran().GetComponentsInChildren` rend donc ZÉRO, et mes gardes
        /// anti-vacuité l'ont attrapé au premier run réel : « seulement 0 Graphic dans l'arbre —
        /// l'écran n'a pas été construit ». C'était un défaut de MES TESTS, pas du contrôleur :
        /// sans le plancher anti-vacuité, `Assert.IsEmpty(sansRenderer)` aurait été VERT sur un
        /// arbre vide et j'aurais livré un écran jamais vérifié.</summary>
        private GameObject RacineEcran()
        {
            GameObject r = GameObject.Find("ReputationRoot");
            Assert.IsNotNull(r, "ReputationRoot introuvable : le contrôleur n'a pas construit sa " +
                                "mise en page (ni sous le mountParent, ni sous un Canvas découvert)");
            return r;
        }

        [TearDown]
        public void TearDown()
        {
            // ⚠️ La mise en page vit sous le Canvas, PAS sous hostGo : la détruire séparément.
            // Sans ça, deux « ReputationRoot » coexistent au test suivant et `GameObject.Find`
            // en rend un au hasard — une contamination qui rendrait les verdicts non
            // reproductibles sans jamais lever d'erreur.
            GameObject reste = GameObject.Find("ReputationRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("ReputationRoot"); }
            if (hostGo != null) Object.Destroy(hostGo);
            hostGo = null;
        }

        // ═══ Fixture : un joueur à soi, et son régime rétabli ════════════════════════════════

        private IEnumerator OuvrirJoueurFrais()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("b3", ref callsignSeq);
            string err = null;
            token = null;
            yield return auth.SignUp(callsign, "screen-b3-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup a échoué : {err}");
            Assert.IsNotNull(token, "signup n'a pas rendu de jeton");

            // ⛔ Le régime, RÉTABLI et non supposé : on ferme toute session que le signup aurait
            // pu ouvrir, pour que ce test ne dépende pas de ce qu'un voisin a laissé derrière lui.
            yield return FermerSession();

            // Un compte frais possède DÉJÀ des lieutenants (kit de départ) — mesuré par le
            // juge-données ⊥ : 2 lieutenants COOK sur `GET /v1/lieutenants`, aucune route de
            // recrutement n'est nécessaire. C'est ce qui rend `lieutenant_id` obtenable par un
            // CHEMIN JOUEUR, et donc cet écran atteignable sans seed SQL.
            yield return LirePremierLieutenant();
            Assert.IsNotNull(lieutenantId,
                "aucun lieutenant sur un compte frais — la prémisse de cet écran tombe, " +
                "et ce n'est pas un défaut d'écran mais de kit de départ");
        }

        private IEnumerator FermerSession()
        {
            using (var req = new UnityEngine.Networking.UnityWebRequest(
                       BaseUrl + "/v1/session/close", "POST"))
            {
                req.uploadHandler = new UnityEngine.Networking.UploadHandlerRaw(
                    System.Text.Encoding.UTF8.GetBytes("{}"));
                req.downloadHandler = new UnityEngine.Networking.DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                req.SetRequestHeader("Authorization", "Bearer " + token);
                req.SetRequestHeader("Idempotency-Key", System.Guid.NewGuid().ToString());
                yield return req.SendWebRequest();
                // Un 404/409 est normal si aucune session n'est ouverte : on ferme, on n'exige pas.
            }
        }

        private IEnumerator LirePremierLieutenant()
        {
            lieutenantId = null;
            using (var req = UnityEngine.Networking.UnityWebRequest.Get(BaseUrl + "/v1/lieutenants"))
            {
                req.SetRequestHeader("Authorization", "Bearer " + token);
                yield return req.SendWebRequest();
                if (req.result != UnityEngine.Networking.UnityWebRequest.Result.Success) yield break;
                var m = System.Text.RegularExpressions.Regex.Match(
                    req.downloadHandler.text, "\"lieutenant_id\"\\s*:\\s*\"([^\"]+)\"");
                if (m.Success) lieutenantId = m.Groups[1].Value;
            }
        }

        private ReputationScreenController MonterEcran()
        {
            hostGo = new GameObject("ReputationScreen", typeof(RectTransform));
            var ecran = hostGo.AddComponent<ReputationScreenController>();
            ecran.SetToken(token);
            return ecran;
        }

        // ═══ 1. GARDES STRUCTURELLES — elles ne lisent aucun pixel ═══════════════════════════

        /// <summary>⛔ TOUT `Graphic` PORTE SON `CanvasRenderer`.
        ///
        /// `AddComponent&lt;T&gt;()` à l'exécution n'honore PAS le `[RequireComponent(CanvasRenderer)]`
        /// d'une classe de base, et sans lui un `Graphic` ne dessine RIEN — sans la moindre erreur
        /// console. Mesuré sur ce dépôt : des panneaux et leur fond rendaient la même couleur des
        /// deux côtés ; la plaque n'avait jamais existé, seul le trait de bordure la simulait.
        /// Le piège était documenté en tête du fichier du composant, et un site d'appel neuf l'a
        /// violé quand même — *écrire l'avertissement ne protège pas le prochain appelant, seul
        /// un test le protège.*
        ///
        /// La garde est STRUCTURELLE : elle ne dépend d'aucune couleur, d'aucune résolution, et
        /// couvre la classe entière plutôt que les instances qu'on a pensé à citer.</summary>
        [UnityTest]
        public IEnumerator B3S1_ToutGraphic_PorteSonCanvasRenderer()
        {
            yield return OuvrirJoueurFrais();
            var ecran = MonterEcran();
            yield return ecran.Charger(lieutenantId);

            var sansRenderer = new List<string>();
            int comptes = 0;
            foreach (Graphic g in RacineEcran().GetComponentsInChildren<Graphic>(true))
            {
                comptes++;
                if (g.GetComponent<CanvasRenderer>() == null)
                    sansRenderer.Add(CheminDe(g.transform));
            }

            // Garde ANTI-VACUITÉ : une assertion « zéro manquant » est trivialement vraie sur un
            // arbre vide. Sans ce plancher, un écran qui ne construirait RIEN passerait le test.
            Assert.Greater(comptes, 10,
                $"seulement {comptes} Graphic dans l'arbre — l'écran n'a pas été construit, " +
                "et l'assertion de la ligne suivante serait vraie À VIDE");
            Assert.IsEmpty(sansRenderer,
                "des Graphic sans CanvasRenderer ne dessinent RIEN, en silence : " +
                string.Join(", ", sansRenderer));
        }

        /// <summary>L'ORDRE DE FRATRIE EST LA PROFONDEUR, et il se teste sans lire un pixel.
        ///
        /// ⚠️ CE QUE CETTE GARDE VÉRIFIE EXACTEMENT, ET CE QU'ELLE NE VÉRIFIE PAS — parce
        /// qu'une garde qui promet plus qu'elle ne mesure est pire qu'une garde absente : elle
        /// CERTIFIE. Elle vérifie une CONVENTION DE CONSTRUCTION : chaque `Contour` est le
        /// premier enfant de la boîte qu'il borde, donc dessiné juste après le fond de cette
        /// boîte et avant son contenu — c'est ce qui garantit que le contenu reste lisible
        /// par-dessus le trait, et que le trait reste visible par-dessus le fond.
        ///
        /// Elle NE prouve PAS l'absence d'occlusion en général : un frère postérieur opaque et
        /// plein cadre recouvrirait le contour sans faire rougir ce test. Cette classe-là
        /// n'est pas fermée ici, et la nommer vaut mieux que de la croire couverte — c'est le
        /// juge visuel ⊥ qui la voit, à deux résolutions.</summary>
        [UnityTest]
        public IEnumerator B3S2_ConventionDeFratrie_ChaqueContourEstPremierEnfant()
        {
            yield return OuvrirJoueurFrais();
            var ecran = MonterEcran();
            yield return ecran.Charger(lieutenantId);

            int contours = 0;
            foreach (Transform t in RacineEcran().GetComponentsInChildren<Transform>(true))
            {
                if (t.name != "Contour") continue;
                contours++;
                Transform parent = t.parent;
                Assert.IsNotNull(parent, "un Contour sans parent");
                // Le fond de la boîte vit sur le PARENT (une seule Image par GameObject) et se
                // dessine avant ses enfants ; le contour, premier enfant, passe donc par-dessus
                // le fond et sous le contenu. C'est la convention, et c'est elle qu'on épingle.
                Assert.AreEqual(0, t.GetSiblingIndex(),
                    $"le Contour de {parent.name} n'est pas le premier enfant : la convention de " +
                    "construction est rompue, et le contenu de la boîte passerait SOUS le trait");
            }
            Assert.Greater(contours, 0,
                "aucun Contour trouvé — la garde serait vraie À VIDE (contrôle anti-vacuité)");
        }

        /// <summary>⛔ LES TROIS ÉTATS QUE LE BACK NE SAIT PAS PRODUIRE SONT QUAND MÊME RENDUS.
        ///
        /// Ferme la moitié RENDU de l'angle mort A5. `drifting`, `hostile` et `wary` ont du code
        /// écrit depuis le premier jour et jamais exécuté : aucune route ne les produit par un
        /// chemin joueur, donc aucun test ne les traversait et aucun juge visuel n'a jamais pu en
        /// voir une image. Un code jamais exécuté n'est pas « probablement bon » — il est inconnu.
        ///
        /// ⚠️ CE QUE CETTE GARDE NE PROUVE PAS, et il faut le lire avant de la croire : le corps
        /// est FABRIQUÉ ici. Elle ne dit rien de ce que le serveur émet, ni qu'il émettra ces
        /// valeurs sous cette forme. Elle vérifie ce que l'écran FAIT d'un corps supposé.
        /// ⇒ La dette de CONTRAT reste entière et déclarée ; seule la dette de RENDU se ferme.
        ///
        /// Elle vise trois propriétés qu'un état muet perdrait séparément — le verdict change de
        /// texte, il change de couleur, et le panneau change de titre. Un état qui n'écrirait que
        /// le texte passerait une garde qui ne regarderait que lui.</summary>
        [UnityTest]
        [Category("ScreenB3")]
        public IEnumerator B3S5_LesTroisEtatsNonProduitsParLeBack_SontRendusEtDistincts()
        {
            yield return OuvrirJoueurFrais();
            var ecran = MonterEcran();

            var vus = new List<string>();
            var couleurs = new List<Color>();
            var titres = new List<string>();

            foreach (string cue in new[] { "indeterminate", "drifting", "aligned" })
            {
                ecran.RendrePourTest(new ReputationSurfaceDto
                {
                    boss_mirror = new BossMirrorDto
                    {
                        consistency_cue = cue,
                        declared_rules = new DeclaredRuleDto[0],
                        portrait_posture = "attentive",
                    },
                });
                yield return null;

                string v = ecran.VerdictAffiche;
                Assert.IsFalse(string.IsNullOrEmpty(v),
                    $"état « {cue} » : le verdict est VIDE — la colonne de lecture n'a pas de titre");
                vus.Add(v);
                titres.Add(ecran.PanneauSurTitreAffiche);
                foreach (TMPro.TextMeshProUGUI t in RacineEcran().GetComponentsInChildren<TMPro.TextMeshProUGUI>(true))
                    if (t.text == v) { couleurs.Add(t.color); break; }
            }

            // Les trois verdicts diffèrent DEUX À DEUX : un état qui retomberait sur le libellé
            // d'un autre serait invisible pour un test qui ne compterait que « non vide ».
            CollectionAssert.AllItemsAreUnique(vus,
                "les trois états doivent écrire trois verdicts DIFFÉRENTS — " +
                $"obtenu : {string.Join(" · ", vus)}");
            CollectionAssert.AllItemsAreUnique(titres,
                "les trois états doivent écrire trois sur-titres de panneau DIFFÉRENTS — " +
                $"obtenu : {string.Join(" · ", titres)}");
            Assert.AreEqual(3, couleurs.Count, "une couleur de verdict n'a pas été relevée");
            Assert.AreNotEqual(couleurs[0], couleurs[1],
                "« indéterminé » et « dérive » doivent se distinguer aussi par la COULEUR : " +
                "un joueur lit la teinte avant le libellé");
            Assert.AreNotEqual(couleurs[1], couleurs[2],
                "« dérive » et « aligné » doivent se distinguer par la couleur");
            yield return null;
        }

        /// <summary>⛔ LE BLOC ÉLASTIQUE S'ÉTIRE, ET LE CONTENU NE LAISSE PAS UN TIERS DE VIDE.
        ///
        /// Cette garde ferme l'angle mort A3 — « l'effet des espacements n'est pas vérifié » — que
        /// j'avais déclaré moi-même et qui a mordu TROIS fois : d'abord un conteneur sans aucun
        /// empilement, puis des hauteurs converties à moitié d'échelle, puis le bloc miroir qui ne
        /// s'étirait pas. Les deux premières ont coûté un tour de juge chacune ; la troisième a
        /// coûté un REFUS. Un angle mort qu'on sait nommer, on peut le fermer soi-même.
        ///
        /// Ce que le juge a mesuré et que rien n'attrapait : la bande de contenu du 1080×2400 était
        /// identique AU PIXEL PRÈS à celle du 1080×1920 — les 480 px supplémentaires tombaient tous
        /// dans un vide sous le bouton, 35,5 % du panneau à la résolution cible téléphone.
        ///
        /// ⚠️ La garde est DIMENSIONNÉE : elle compare deux hauteurs de canvas qui diffèrent de
        /// 25 %. Avec deux tailles proches, un bloc figé et un bloc élastique rendraient des
        /// mesures presque égales et la garde serait verte pour la mauvaise raison.
        ///
        /// ⚠️ Elle vise une PROPRIÉTÉ, pas une valeur : « le miroir absorbe l'essentiel de la
        /// hauteur ajoutée ». Un seuil sur sa hauteur absolue casserait au premier changement de
        /// maquette ; celui-ci ne casse que si l'élasticité disparaît.</summary>
        [UnityTest]
        [Category("ScreenB3")]
        public IEnumerator B3S4_LeMiroirEstElastique_EtLeContenuNeLaissePasUnTiersDeVide()
        {
            yield return OuvrirJoueurFrais();
            var ecran = MonterEcran();
            yield return ecran.Charger(lieutenantId);

            GameObject racine = RacineEcran();
            Canvas canvas = racine.GetComponentInParent<Canvas>();
            Assert.IsNotNull(canvas, "ReputationRoot n'est sous aucun Canvas");

            RenderMode modeAvant = canvas.renderMode;
            Camera camAvant = canvas.worldCamera;

            (float bloc, float contenu) MesurerMiroir(int h)
            {
                var rt = new RenderTexture(1080, h, 24, RenderTextureFormat.ARGB32);
                var camGo = new GameObject("MesureCamB3S4");
                var cam = camGo.AddComponent<Camera>();
                cam.targetTexture = rt; cam.orthographic = true;
                canvas.renderMode = RenderMode.ScreenSpaceCamera;
                canvas.worldCamera = cam;
                Canvas.ForceUpdateCanvases();
                LayoutRebuilder.ForceRebuildLayoutImmediate((RectTransform)canvas.transform);

                float haut = -1f, dedans = -1f;
                foreach (RectTransform t in racine.GetComponentsInChildren<RectTransform>(true))
                {
                    if (t.name == "Miroir") haut = t.rect.height;
                    if (t.name == "Mir6")   dedans = t.rect.height;
                }

                canvas.worldCamera = null;
                Object.DestroyImmediate(camGo);
                rt.Release(); Object.DestroyImmediate(rt);
                return (haut, dedans);
            }

            var c = MesurerMiroir(1920);
            var g = MesurerMiroir(2400);
            float court = c.bloc, haute = g.bloc;

            canvas.renderMode = modeAvant;
            canvas.worldCamera = camAvant;
            Canvas.ForceUpdateCanvases();

            // Contrôle de prémisse : sans cette mesure, un « Miroir » introuvable rendrait -1 des
            // deux côtés et l'égalité passerait pour une élasticité absente plutôt que pour un
            // test qui n'a rien trouvé.
            Assert.Greater(court, 0f, "bloc « Miroir » introuvable : la garde ne mesure rien");
            Assert.Greater(haute, 0f, "bloc « Miroir » introuvable à 2400 : la garde ne mesure rien");

            // ⛔ CE QUE CETTE GARDE VÉRIFIE A CHANGÉ, ET L'ANCIENNE VERSION ÉTAIT FAUSSE.
            // Elle exigeait que le bloc miroir GRANDISSE avec le canvas. C'était ma lecture, pas
            // celle de la maquette : `reputation(cadre, H=462)` donne au cadre une HAUTEUR FIXE,
            // et c'est le chrome qui occupe le reste de la page. Une garde bâtie sur une
            // supposition a donc « validé » un écran faux pendant deux tours, puis refusé le vrai
            // correctif quand il est arrivé.
            // ★ Une garde ne vaut que sa lecture de la source. Verte, elle ne dit pas « c'est
            //   juste » — elle dit « c'est conforme à ce que j'ai compris ».
            //
            // Ce qu'elle vérifie maintenant est ce qu'un joueur voit, et ce que le juge a mesuré :
            // le VIDE sous le contenu du miroir reste petit, AUX DEUX RÉSOLUTIONS. La maquette en
            // laisse 21,0 px CSS ; l'écran en avait 85,0 en 16:9 et 218,3 en 20:9 — 54,7 % du
            // panneau, un trou noir dans lequel tombaient les 480 px ajoutés.
            float videCourt = c.bloc - c.contenu;
            float videHaut  = g.bloc - g.contenu;
            float plafond   = 60f * (1280f / 300f);   // 60 px CSS : large, mais loin des 218 mesurés

            Assert.Less(videCourt, plafond,
                $"1080x1920 : {videCourt:F0} unités de vide sous le contenu du miroir " +
                $"({videCourt / (1280f / 300f):F0} px CSS) — la maquette en laisse 21");
            Assert.Less(videHaut, plafond,
                $"1080x2400 : {videHaut:F0} unités de vide sous le contenu du miroir " +
                $"({videHaut / (1280f / 300f):F0} px CSS). C'est la résolution CIBLE, et c'est là " +
                "que le défaut se voit : sur un écran qui dit « il n'y a rien à lire encore », un " +
                "vide de cette taille se met à dire « ça n'a pas fini de charger ».");

            // ⛔ ET LE CONTENU, LUI, NE BOUGE PAS. C'est la moitié qui manquait, et son absence a
            // laissé cette garde VERTE sur un écran faux pendant un tour entier : le bloc absorbait
            // bien la hauteur ajoutée, mais par le mauvais enfant — la carte du portrait s'étirait
            // et devenait une colonne vide bordée d'or (mesuré par le juge : 60 % de vide à la
            // résolution cible, pour le bloc qui porte le PROPOS de l'écran).
            // ★ Une garde qui mesure un TOTAL ne dit rien de sa RÉPARTITION. « Le bloc a bien
            //   absorbé les 480 px » et « les 480 px sont allés au bon endroit » sont deux
            //   propriétés distinctes, et seule la seconde décrit ce qu'un joueur voit.
            Assert.Greater(c.contenu, 0f, "bloc « Mir6 » introuvable : la garde ne mesure rien");
            Assert.Greater(g.contenu, 0f, "bloc « Mir6 » introuvable à 2400 : la garde ne mesure rien");
            Assert.AreEqual(c.contenu, g.contenu, 1.0f,
                $"le CONTENU du miroir doit garder la même hauteur aux deux résolutions " +
                $"({c.contenu:F0} → {g.contenu:F0} unités) : la maquette lui donne la hauteur de ce " +
                "qu'il contient (`.mir6` n'a pas de flex-grow) et laisse le mou SOUS lui, dans le " +
                "bloc élastique. S'il grandit, c'est la carte du portrait qui se vide.");
            yield return null;
        }

        /// <summary>⛔⛔ AUCUN ÉLÉMENT DÉCORATIF N'EST ENFANT DIRECT D'UN GROUPE DE LAYOUT.
        ///
        /// Cette garde ferme une CLASSE, pas deux instances. Le défaut est apparu DEUX FOIS le
        /// même soir, à deux endroits différents :
        ///   · le `Cerne` (le liseré qui encadre l'écran) comptait comme un bloc empilé par le
        ///     `VerticalLayoutGroup` de `corps` ;
        ///   · un `Contour` comptait comme une COLONNE par le `HorizontalLayoutGroup` du miroir —
        ///     et cela se voyait à l'écran : une colonne vide large comme un tiers du bloc.
        /// J'ai corrigé le premier sans repasser la classe sur la population, et le second est
        /// apparu une heure plus tard. Deux occurrences ⇒ ce n'est plus un accident, c'est une
        /// propriété de cette hiérarchie.
        ///
        /// ⇒ La règle : un cadre se SUPERPOSE, il ne s'empile pas. Tout enfant décoratif d'un
        /// groupe de layout doit porter `ignoreLayout`.
        /// ⚠️ Garde STRUCTURELLE : elle ne lit aucun pixel, donc elle vaut à toute résolution et
        /// ne peut pas être satisfaite par hasard. Ce sont les seules qui ont fermé des classes
        /// dans ce dépôt — quatre tours de gardes de valeur n'avaient pas vu l'occlusion par
        /// fratrie, une garde d'ordre l'a fermée en douze lignes.</summary>
        [UnityTest]
        public IEnumerator B3S3_AucunDecoratif_EnfantDirectDUnLayoutGroup()
        {
            yield return OuvrirJoueurFrais();
            var ecran = MonterEcran();
            yield return ecran.Charger(lieutenantId);

            // Les noms des éléments purement décoratifs de cet écran : ils dessinent un cadre ou
            // un filet, ils ne participent jamais au flux.
            var decoratifs = new HashSet<string> { "Cerne", "Contour", "FiletBas" };
            var fautifs = new List<string>();
            int examines = 0;

            foreach (Transform t in RacineEcran().GetComponentsInChildren<Transform>(true))
            {
                if (!decoratifs.Contains(t.name)) continue;
                Transform parent = t.parent;
                if (parent == null || parent.GetComponent<LayoutGroup>() == null) continue;
                examines++;   // enfant décoratif SOUS un layout : le seul cas qui nous intéresse
                LayoutElement le = t.GetComponent<LayoutElement>();
                if (le == null || !le.ignoreLayout)
                    fautifs.Add($"{t.name} sous {parent.name} ({parent.GetComponent<LayoutGroup>().GetType().Name})");
            }

            // ⛔ Plancher anti-vacuité, et il compte les CAS EXAMINÉS, pas les fichiers : sans lui,
            // « 0 fautif » serait vrai sur un écran qui ne contient aucun décoratif — donc vrai
            // pour la mauvaise raison.
            Assert.Greater(examines, 0,
                "aucun élément décoratif sous un LayoutGroup n'a été examiné : la garde serait " +
                "verte À VIDE. Soit la hiérarchie a changé, soit les noms surveillés sont périmés.");
            Assert.IsEmpty(fautifs,
                $"éléments décoratifs comptés comme des blocs par leur layout parent (sur {examines} " +
                $"examinés) : {string.Join(", ", fautifs)}. Un cadre se superpose, il ne s'empile pas.");
        }

        // ═══ 2. LA POLARITÉ — la garde qui compte, avec son contrôle positif ════════════════

        /// <summary>⛔⛔ UN LIEUTENANT VIERGE ALLUME ZÉRO VOYANT — et le contrôle positif est ce
        /// qui rend cette assertion probante.
        ///
        /// La première maquette dorait « col ouvert » et « gants sales » comme l'état
        /// remarquable. Or ce sont les valeurs NEUTRES du back (flag = false) : sur un lieutenant
        /// qui n'a rien absorbé, elle allumait DEUX bandes sur quatre. La garde ci-dessous ferme
        /// cette classe.
        ///
        /// ⚠️ Mais une garde qui asserte un ZÉRO est la plus facile à rendre vraie À VIDE : un
        /// écran qui n'allumerait JAMAIS rien la satisferait parfaitement — elle CERTIFIERAIT le
        /// défaut inverse. D'où la seconde moitié, obligatoire : on force les quatre flags à
        /// l'état absorbé et on exige QUATRE voyants. Sans elle, l'assertion ne distingue pas
        /// « la polarité est juste » de « le rendu est mort ».
        ///
        /// Le test porte sur la SORTIE (le compte de voyants allumés), pas sur les libellés :
        /// il reste vrai si quelqu'un réécrit les textes, et rouge s'il réinverse le sens.</summary>
        [UnityTest]
        public IEnumerator B3P1_PolariteDesTells_VierteZero_EtControlePositifQuatre()
        {
            yield return OuvrirJoueurFrais();
            var ecran = MonterEcran();

            // (a) l'état NEUTRE, tel que le back le rend sur un lieutenant vierge — mesuré :
            //     open / down / hidden / dirty.
            var vierge = new UniformTellsDto
            {
                collar = "open", sleeves = "down", watch = "hidden", gloves = "dirty",
            };
            Assert.AreEqual(0, vierge.CompteAbsorbe(),
                "un lieutenant vierge ne doit allumer AUCUN voyant : " +
                "open/down/hidden/dirty sont les valeurs NEUTRES du back, pas des états remarquables");

            // (b) CONTRÔLE POSITIF — sans lui, (a) serait satisfait par un rendu mort.
            var absorbe = new UniformTellsDto
            {
                collar = "buttoned", sleeves = "rolled", watch = "visible", gloves = "clean",
            };
            Assert.AreEqual(4, absorbe.CompteAbsorbe(),
                "les quatre valeurs ACTIVES doivent allumer quatre voyants — " +
                "si ce compte est nul, la garde (a) est vraie pour la mauvaise raison");

            // (c) et pose par pose, pour qu'un échec DÉSIGNE la pose fautive au lieu d'un total.
            foreach (UniformTellsDto.Pose pose in ReputationResolvers.PosesDansLOrdre())
            {
                Assert.IsFalse(vierge.ActifEstAbsorbe(pose), $"{pose} : neutre lu comme absorbé");
                Assert.IsTrue(absorbe.ActifEstAbsorbe(pose), $"{pose} : absorbé lu comme neutre");
            }
            yield return null;
        }

        // ═══ 3. LES TROUS DÉCLARÉS — l'écran ne doit pas les combler ════════════════════════

        /// <summary>⛔ LE COMPTEUR « ENFREINTES » N'AFFICHE JAMAIS « 00 ».
        /// Aucune clé du corps ne porte ce compte : la donnée est en base
        /// (`boss_mirror_violation_ring.violation_slots[]`) et jamais projetée — forme F. Un
        /// « 00 » dirait « aucune enfreinte » là où la vérité est « le serveur ne le dit pas ».
        /// ⇒ La garde vise la VALEUR AFFICHÉE, pas l'absence d'une clé : c'est ce qui la rendra
        /// ROUGE le jour où le lot back projettera le compte et où l'écran devra changer.</summary>
        [UnityTest]
        public IEnumerator B3T1_CompteurEnfreintes_NAfficheJamaisUnZero()
        {
            yield return OuvrirJoueurFrais();
            var ecran = MonterEcran();
            yield return ecran.Charger(lieutenantId);

            TMPro.TextMeshProUGUI cible = null;
            foreach (TMPro.TextMeshProUGUI t in RacineEcran().GetComponentsInChildren<TMPro.TextMeshProUGUI>(true))
                if (t.text == "ENFREINTES" && t.transform.parent != null)
                    cible = t.transform.parent.Find("Nombre")?.GetComponent<TMPro.TextMeshProUGUI>();

            Assert.IsNotNull(cible, "compteur ENFREINTES introuvable — garde vraie à vide sinon");
            StringAssert.DoesNotContain("0", cible.text,
                "le compteur d'enfreintes affiche un chiffre alors qu'AUCUNE clé du corps ne le " +
                "porte — un zéro inventé est un mensonge d'écran, pas un état vide");
        }

        /// <summary>⛔ LES `rule_id` DÉCLARÉS SONT AFFICHÉS EN CLAIR, ET AUTANT QU'IL Y EN A.
        ///
        /// Le brief du lot est explicite : aucun libellé de règle n'existe (bundle i18n mesuré :
        /// 67 clés, zéro pour ce domaine), l'identifiant se montre tel quel, on ne masque pas le
        /// trou. La garde vise donc DEUX propriétés que l'on peut perdre séparément :
        ///   · le COMPTE affiché égale le compte reçu — c'est le détecteur de « disponible et
        ///     pourtant non affiché », la classe de défaut que le juge données traque ;
        ///   · le TEXTE contient l'identifiant réel — c'est le détecteur de la table de libellés
        ///     qu'un futur contributeur aura envie d'écrire pour faire joli, et qui remplacerait
        ///     un identifiant vrai par un libellé inventé.
        ///
        /// ⚠️ Le scénario est DIMENSIONNÉ : on déclare deux règles, pas une. Avec une seule, un
        /// rendu qui n'afficherait jamais que la première serait vert — la garde passerait à
        /// travers le défaut qu'elle existe pour voir.</summary>
        [UnityTest]
        public IEnumerator B3T3_LesRuleIdSontAffichesEnClair_EtTousAffiches()
        {
            yield return OuvrirJoueurFrais();
            var ecran = MonterEcran();

            string r1 = "rule.no_families_" + System.Guid.NewGuid().ToString("N").Substring(0, 6);
            string r2 = "rule.no_sunday_"   + System.Guid.NewGuid().ToString("N").Substring(0, 6);
            yield return ecran.DeclarerRegle(r1);
            yield return ecran.DeclarerRegle(r2);
            yield return ecran.Charger(lieutenantId);

            Assert.IsNotNull(ecran.DernierChargement, "corps non chargé");
            int recues = ecran.DernierChargement.boss_mirror.declared_rules.Length;
            Assert.GreaterOrEqual(recues, 2,
                "le serveur devrait porter au moins les 2 règles déclarées — sinon la garde " +
                "suivante serait vraie pour la mauvaise raison (scénario sous-dimensionné)");
            Assert.AreEqual(recues, ecran.ReglesAffichees,
                $"le corps porte {recues} règles et l'écran en dessine {ecran.ReglesAffichees} : " +
                "« disponible, dessiné nulle part » est un DÉFAUT, pas un choix de mise en page");

            // Le texte réel, pas seulement le compte : un libellé inventé passerait le test ci-dessus.
            var textes = new List<string>();
            foreach (TMPro.TextMeshProUGUI t in RacineEcran().GetComponentsInChildren<TMPro.TextMeshProUGUI>(true))
                textes.Add(t.text);
            CollectionAssert.Contains(textes, r1,
                $"l'identifiant « {r1} » n'apparaît nulle part : il a été masqué ou remplacé par " +
                "un libellé fabriqué côté client — or aucun libellé n'existe pour ce domaine");
            CollectionAssert.Contains(textes, r2, $"l'identifiant « {r2} » n'apparaît nulle part");
        }

        /// <summary>`restraint` est OMISE du corps sans `counterparty_id` — et le discriminant
        /// doit le voir. ⚠️ Un `!= null` ne suffirait pas : `JsonUtility` peut fabriquer l'objet.
        /// La garde porte donc sur la PRÉSENCE D'UNE VALEUR.</summary>
        [UnityTest]
        public IEnumerator B3T2_RestraintOmise_EstDetectee_SansCounterparty()
        {
            yield return OuvrirJoueurFrais();
            var ecran = MonterEcran();
            yield return ecran.Charger(lieutenantId); // aucun counterparty_id

            Assert.IsNotNull(ecran.DernierChargement, "corps non chargé");
            Assert.IsFalse(ecran.DernierChargement.RestraintEstPresente,
                "sans counterparty_id la section restraint est OMISE : la lire comme présente " +
                "ferait dessiner « standard / zéro règlement », un état que le serveur n'a jamais dit");

            // Contrôle positif du discriminant lui-même : un objet PORTEUR doit être vu présent.
            var porteur = new ReputationSurfaceDto
            {
                restraint = new RestraintDto { offer_posture = "wary", marginalia = new string[0] },
            };
            Assert.IsTrue(porteur.RestraintEstPresente,
                "le discriminant ne voit pas une section réellement présente — " +
                "il rendrait « absent » pour tout le monde, donc toujours vrai pour la mauvaise raison");
        }

        // ═══ 4. Le chemin d'échec — un état NOMMÉ, jamais une exception ═════════════════════

        /// <summary>Mesuré sur un autre écran de ce dépôt : `Render(null)` levait une
        /// NullReferenceException à la première ligne qui lisait le payload, et l'écran plantait
        /// dès que le réseau toussait. Un échec doit donner un ÉTAT, pas une pile d'appels.</summary>
        [UnityTest]
        public IEnumerator B3E1_EchecDeLecture_DonneUnEtatNomme_PasUneException()
        {
            yield return OuvrirJoueurFrais();
            var ecran = MonterEcran();

            // Un lieutenant qui n'appartient pas à ce joueur : la route rend 404 (propriété
            // validée dans le contrôleur back, jamais déléguée).
            yield return ecran.Charger(System.Guid.NewGuid().ToString());

            Assert.IsTrue(ecran.AAfficheEtatVide,
                "un 404 doit produire l'état indisponible NOMMÉ");
            Assert.AreEqual(0, ecran.VoyantsAllumes,
                "aucun voyant ne doit rester allumé sur un échec — ce serait afficher l'état " +
                "d'un AUTRE lieutenant, celui d'avant");
        }

        // ═══ 5. LES CAPTURES POUR LE JUGE VISUEL ⊥ ══════════════════════════════════════════

        /// <summary>Produit les captures que le juge visuel ⊥ recevra — à DEUX résolutions, et
        /// c'est une obligation, pas un confort : le trou trouvé le 2026-08-21 était que zéro
        /// test du dépôt ne fixait de résolution, tout étant certifié en 1280×720 paysage alors
        /// que le projet est configuré en PORTRAIT.
        ///
        /// ⛔ SANS SHELL, et c'est structurel ici : monter `AppShell` ferait signer le compte de
        /// démo partagé avec les fixtures d'autres sessions. Le locataire est donc capturé seul,
        /// sur un canvas que ce test possède — ce qui est exactement le contrat `IShellTenant`
        /// hors shell (personne n'appelle `SetMountParent`, le locataire découvre son canvas et
        /// remplit tout). ⚠️ Écart ASSUMÉ à écrire au dossier du juge : les captures ne portent
        /// donc NI le bandeau du haut NI le dock, que la maquette montre. Le juge doit le
        /// recevoir écrit, sinon il classera leur absence en défaut.
        ///
        /// ⚠️ `Canvas.scaleFactor` lu la frame de la création rend 1,0 — une valeur PLAUSIBLE et
        /// fausse. D'où les `yield return null` avant tout rendu : sans eux la capture mesure une
        /// mise en page qui n'a jamais eu lieu.</summary>
        [UnityTest, Category("Capture")]
        public IEnumerator B3C1_CapturerPourLeJugeVisuel_DeuxResolutions()
        {
            yield return OuvrirJoueurFrais();
            var ecran = MonterEcran();
            yield return ecran.Charger(lieutenantId);

            yield return CapturerA(1080, 1920, "Assets/Screenshots/screen_b3_reputation_1080x1920.png");
            yield return CapturerA(1080, 2400, "Assets/Screenshots/screen_b3_reputation_1080x2400.png");

            // ⛔⛔ LA PAIRE T / T+1 s — EXIGÉE PAR LA DOCTRINE, PAS UN SUPPLÉMENT.
            // Ruling user 2026-08-27 : AUCUNE animation sur un écran neuf. Le juge visuel le
            // vérifie en comparant deux captures du MÊME état à une seconde d'intervalle et en
            // exigeant 0 pixel différent. Sans cette paire, il ne peut pas trancher et classera
            // la question en « non vérifié ».
            // ⚠️ La maquette, elle, ANIME : `.veille6` fait pulser une luminosité et
            // `.elast::after` fait descendre une ligne de scan toutes les 7,5 s. Ne pas les
            // porter est donc une DÉCISION conforme au ruling, pas un oubli — et cette paire est
            // ce qui le prouve au lieu de l'affirmer.
            yield return new WaitForSeconds(1f);
            yield return CapturerA(1080, 1920,
                "Assets/Screenshots/screen_b3_reputation_1080x1920_t1s.png");
        }

        private IEnumerator CapturerA(int largeur, int hauteur, string chemin)
        {
            // ⛔ LE CANVAS DE *CET* ÉCRAN, pas le premier venu. `FindFirstObjectByType` en rend
            // un au hasard quand plusieurs coexistent (un test voisin peut en avoir laissé un) —
            // on capturerait alors un canvas vide et l'image serait noire sans que rien ne dise
            // pourquoi. On remonte donc depuis la racine RÉELLE de l'écran.
            GameObject racine = RacineEcran();
            Canvas canvas = racine.GetComponentInParent<Canvas>();
            Assert.IsNotNull(canvas, "ReputationRoot n'est sous aucun Canvas : rien ne peut être rendu");

            RenderMode modeAvant = canvas.renderMode;
            Camera cameraAvant = canvas.worldCamera;
            float planAvant = canvas.planeDistance;

            var rt = new RenderTexture(largeur, hauteur, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("CaptureCamB3");
            var cam = camGo.AddComponent<Camera>();
            cam.targetTexture = rt;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Color.black;
            cam.orthographic = true;

            // `-screen-width` est IGNORÉ en batchmode (Screen.width reste bloqué à 640) : la
            // bascule en ScreenSpaceCamera sur une RenderTexture de la taille cible est ce qui
            // permet de capturer une résolution qu'on n'a pas.
            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = cam;
            canvas.planeDistance = 10f;
            Canvas.ForceUpdateCanvases();
            yield return null;

            // ⛔ RECONSTRUIRE LA MISE EN PAGE APRÈS LA BASCULE, sinon on photographie une
            // géométrie calculée pour une AUTRE taille. Toute la mise à l'échelle de cet écran
            // dérive de `racinePleinEcran.rect.width`, lue à la construction — donc à la taille
            // de la fenêtre de batchmode (640), pas à celle de la RenderTexture (1080).
            // Sans ce rebuild, le contenu reste dimensionné pour 640 dans une cible de 1080 :
            // c'est le défaut mesuré ailleurs dans ce dépôt, où un juge a relevé l'art « à 972 px
            // sur 1080 » — soit exactement le rapport de deux scaleFactor, pris pour un cadrage.
            LayoutRebuilder.ForceRebuildLayoutImmediate((RectTransform)racine.transform);
            Canvas.ForceUpdateCanvases();
            yield return null;
            yield return null;   // la passe de layout différée d'Unity

            // Garde de PRÉMISSE : la cible doit avoir la taille demandée avant qu'on y rende.
            // Un canvas resté à 640 produirait une image « valide » et fausse.
            RectTransform crt = (RectTransform)canvas.transform;
            // ⛔ DIAGNOSTIC DE PRÉMISSE — on ne devine pas pourquoi une image est noire, on
            // demande à la scène ce qu'elle contient. Chaque grandeur ici a tué une hypothèse
            // lors du débogage : la taille du canvas (bonne), le nombre de Graphic (l'écran
            // est-il là ?), leur visibilité effective, et la géométrie de la caméra (le canvas
            // est-il DANS le champ ?).
            int nbGraphic = 0, nbActifs = 0;
            foreach (Graphic g in canvas.GetComponentsInChildren<Graphic>(true))
            {
                nbGraphic++;
                if (g.isActiveAndEnabled && g.canvasRenderer != null && g.canvasRenderer.GetAlpha() > 0f) nbActifs++;
            }
            Debug.Log($"[CAPTURE b3] AVANT rendu {largeur}x{hauteur} · canvas rect=" +
                      $"{crt.rect.width:F0}x{crt.rect.height:F0} · scaleFactor={canvas.scaleFactor:F3} · " +
                      $"graphics={nbGraphic} actifs={nbActifs} · canvasPos={crt.position} · " +
                      $"camPos={cam.transform.position} orthoSize={cam.orthographicSize:F1} " +
                      $"cull={cam.cullingMask} · racineActive={racine.activeInHierarchy}");

            // ⚠️ Les HAUTEURS RÉELLEMENT RENDUES, bloc par bloc, ramenées en px CSS de la maquette.
            // Ajouté après avoir tenté de les déduire de l'image capturée : j'y lisais un facteur 2
            // uniforme et j'ai bâti deux hypothèses successives dessus (racine trop étroite, repli
            // d'échelle) — toutes deux fausses, parce qu'un contour, un padding et un liseré
            // déplacent les frontières que l'œil prend pour les bords d'un bloc. La scène sait sa
            // géométrie ; la lui demander coûte trois lignes et ne se trompe pas.
            Transform corps = null;
            foreach (RectTransform t in racine.GetComponentsInChildren<RectTransform>(true))
                if (t.name == "Corps") { corps = t; break; }
            if (corps != null)
            {
                float uParCss = crt.rect.width / 300f;   // 300 = la largeur CSS DÉCLARÉE de cette maquette
                var sb = new System.Text.StringBuilder("[GEOM b3] uParCss=" + uParCss.ToString("F2"));
                foreach (RectTransform b in corps.GetComponentsInChildren<RectTransform>(false))
                {
                    if (b.parent != corps) continue;
                    LayoutElement el = b.GetComponent<LayoutElement>();
                    if (el != null && el.ignoreLayout) continue;
                    sb.Append($" · {b.name}={(b.rect.height / uParCss):F0}css");
                    if (el != null && el.preferredHeight > 0f)
                        sb.Append($"(voulu {(el.preferredHeight / uParCss):F0})");
                }
                Debug.Log(sb.ToString());

                // Le PORTRAIT, en unités canvas : qui déborde de qui. Une forme qui sort de son
                // cadre ne se voit dans aucun compteur — seulement à l'œil, ou ici.
                var sp = new System.Text.StringBuilder("[PRT b3]");
                foreach (RectTransform t in racine.GetComponentsInChildren<RectTransform>(true))
                    if (t.name == "Miroir" || t.name == "Mir6" || t.name == "Portrait" || t.name == "Dessin" || t.name == "Buste"
                        || t.name == "Epaules" || t.name == "Tete")
                    {
                        sp.Append($" · {t.name} {t.rect.width:F0}x{t.rect.height:F0}"
                                  + $"@{t.anchoredPosition.x:F0},{t.anchoredPosition.y:F0}"
                                  + $" rot={t.localEulerAngles.z:F0} piv={t.pivot.x:F2},{t.pivot.y:F2}");
                    }
                Debug.Log(sp.ToString());
            }

            // ⛔⛔ LA CAUSE DE L'IMAGE NOIRE, TROUVÉE PAR LE DIAGNOSTIC CI-DESSUS ET NON DEVINÉE.
            // Il disait : « graphics=68 actifs=65 » (l'écran EST construit et visible),
            // « canvas rect=1280x2276 » … et « orthoSize=5.0 ». Une caméra orthographique voit
            // 2 × orthographicSize unités de haut, soit DIX unités — pour un canvas qui en fait
            // 2276. Elle cadrait donc 0,4 % de l'écran, dans une zone vide.
            // ⇒ Le frustum doit couvrir le canvas : demi-hauteur = rect.height / 2.
            // ⚠️ Et c'est mesuré sur le rect RÉEL après rebuild, jamais calculé depuis la
            // résolution demandée : le canvas porte un CanvasScaler, donc ses unités ne sont pas
            // les pixels de la cible (ici 1280 unités pour 1080 px, scaleFactor 0,844).
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

            // ⛔⛔ CETTE GARDE A ÉTÉ REFAITE, ET L'ANCIENNE ÉTAIT DÉCORATIVE.
            // Elle comptait les pixels dont la somme RGB dépasse 0,15 et exigeait 2,5 % de la
            // cible. Or le FOND de cet écran (`--encre` #0b1016) a une somme de **0,192** : il
            // franchit le seuil tout seul. Mesuré sur la capture réelle : `clairs=2073600` sur
            // 2073600, soit 100 % — la garde comptait le fond nu comme du contenu.
            // ⇒ Une image ne contenant QUE le fond l'aurait satisfaite ENTIÈREMENT. Elle
            //   prétendait détecter une capture vide et validait exactement ce cas : c'est une
            //   garde qui CERTIFIE le défaut qu'elle existe pour attraper.
            //
            // ⇒ LA PROPRIÉTÉ QUI DÉGÉNÈRE N'EST PAS LA LUMINOSITÉ, C'EST LA VARIÉTÉ. Une capture
            //   ratée est UNIFORME — peu importe sa couleur. On compte donc les pixels qui
            //   DIFFÈRENT du fond dominant, ce qui reste juste si le fond change demain.
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

            Assert.Greater(horsFond, pixels.Length / 100,
                $"capture {largeur}x{hauteur} quasi UNIFORME : {horsFond} px seulement diffèrent " +
                $"de la couleur dominante (sur {pixels.Length}). L'écran n'a pas été rendu — et " +
                "un fond nu ne compte pas comme du contenu.");
            // ⛔⛔ LE RECT DU LOCATAIRE — la garde qui manquait, et la seule qui distingue « l'écran
            //    est là » de « quelque chose a rendu ». Mesuré par une session voisine sur un AUTRE
            //    écran : la capture montrait la carte, l'autonomie, les exceptions et le dock
            //    empilés, et le locataire visé occupait **100×100** — la taille par défaut d'un
            //    `RectTransform` neuf, c'est-à-dire un écran monté mais jamais dimensionné.
            //    ⇒ Toutes les gardes de PIXELS passaient : elles comptent l'encre de TOUTE l'image,
            //    donc elles sont satisfaites par les VOISINS de l'écran absent. *Une garde qui
            //    mesure la surface entière certifie l'absence de ce qu'elle doit prouver.*
            //    Celle-ci ne regarde pas la couleur : elle regarde si le locataire a une TAILLE.
            // ⚠️ `racine`, pas `screen` : `pilote-B` a remplacé la variable locale par `RacineEcran()`
            //    pendant que `tests/garde-rect-capture` écrivait cette garde contre l'ancien nom.
            //    Les deux branches étaient JUSTES séparément et ne compilaient plus ensemble — git
            //    a fusionné les deux textes sans conflit parce qu'ils ne se touchent pas d'une
            //    ligne. *Un merge sans conflit n'est pas un merge qui compile.*
            RectTransform rectLocataire = racine != null ? racine.transform as RectTransform : null;
            Assert.IsNotNull(rectLocataire, "aucun locataire à mesurer — la capture ne prouverait rien");
            Vector2 taille = rectLocataire.rect.size;
            Assert.IsFalse(Mathf.Approximately(taille.x, 100f) && Mathf.Approximately(taille.y, 100f),
                $"le locataire mesure {taille.x}x{taille.y} — c'est la taille PAR DÉFAUT d'un " +
                "`RectTransform` neuf : il est monté mais jamais dimensionné, et tout ce que la " +
                "capture montre appartient à ses voisins.");
            Assert.Greater(taille.x * taille.y, 100f * 100f,
                $"le locataire n'occupe que {taille.x}x{taille.y} : trop peu pour l'écran capturé");

            // Contrôle de FORME, secondaire et DÉCLARÉ tel : une image réellement rendue porte
            // plusieurs dizaines de teintes. ⚠️ Il compte les teintes de TOUTE l'image, donc il ne
            // discrimine PAS l'écran visé — il reste utile contre un rendu totalement raté, et c'est
            // tout ce qu'on lui demande depuis que le rect est asserté au-dessus.
            Assert.Greater(histo.Count, 8,
                $"capture {largeur}x{hauteur} : seulement {histo.Count} teintes distinctes — " +
                "trop peu pour un écran qui porte du texte, de l'or et quatre voyants");
            int clairs = horsFond;

            // ⛔ Et une seconde garde, sur une autre PROPRIÉTÉ : des pixels clairs prouvent qu'on
            // a rendu QUELQUE CHOSE, pas qu'on a rendu CET écran. Les voyants sont le contenu que
            // seul cet écran produit.
            Assert.Greater(ecranVoyants(), 0,
                "aucun voyant construit : l'image montre autre chose que l'écran de réputation");

            // Le RECT IMPRIMÉ va au dossier du juge — un nombre revendiqué voyage avec sa capture.
            RectTransform rrt = (RectTransform)canvas.transform;
            Debug.Log($"[CAPTURE b3] {largeur}x{hauteur} · scaleFactor={canvas.scaleFactor:F4} · " +
                      $"rect={rrt.rect.width:F1}x{rrt.rect.height:F1} · clairs={clairs} · {chemin}");

            canvas.renderMode = modeAvant;
            canvas.worldCamera = cameraAvant;
            canvas.planeDistance = planAvant;
            Object.Destroy(camGo);
            rt.Release();
            yield return null;
        }

        private int ecranVoyants()
        {
            int n = 0;
            foreach (TellVoyant v in RacineEcran().GetComponentsInChildren<TellVoyant>(true)) { n++; }
            return n;
        }

        // ═══ Utilitaire ══════════════════════════════════════════════════════════════════════

        private static string CheminDe(Transform t)
        {
            var pile = new Stack<string>();
            while (t != null) { pile.Push(t.name); t = t.parent; }
            return string.Join("/", pile);
        }
    }
}
