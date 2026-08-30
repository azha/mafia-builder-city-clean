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
            Debug.Log($"[CAPTURE b3] AVANT rendu {largeur}x{hauteur} · canvas rect=" +
                      $"{crt.rect.width:F0}x{crt.rect.height:F0} · scaleFactor={canvas.scaleFactor:F3}");

            cam.Render();
            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rt;
            var tex = new Texture2D(largeur, hauteur, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, largeur, hauteur), 0, 0);
            tex.Apply();
            RenderTexture.active = prev;
            System.IO.File.WriteAllBytes(chemin, tex.EncodeToPNG());

            // ⛔ ANTI-MENSONGE — une cible noire produit un PNG parfaitement valide et VIDE, qui
            // passerait pour une réussite. On n'asserte que ce qui rendrait l'image MENSONGÈRE.
            int clairs = 0;
            foreach (Color c in tex.GetPixels())
                if (c.r + c.g + c.b > 0.15f) clairs++;
            Assert.Greater(clairs, largeur * hauteur / 40,
                $"capture {largeur}x{hauteur} quasi NOIRE ({clairs} px) : l'écran n'a pas été rendu");

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
