using System.Collections;
using NUnit.Framework;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    /// <summary>Capture d'un locataire monté SOUS le shell — le pendant de `CaptureSupport`
    /// (qui, lui, ne sait capturer que les écrans bâtissant sous LEUR propre canvas).
    ///
    /// ⛔ POURQUOI CE FICHIER EXISTE. Ces ~150 lignes vivaient en privé dans
    /// `PlancheEcransCapturePlayModeTests` et chacune de ses trois gardes a été payée par une
    /// capture fausse : un écran occlus par ses frères (mesuré « frère 6 sur 11 », quatre runs et
    /// quatre hypothèses fausses avant que la garde ne NOMME les occultants), un RectTransform
    /// resté à sa taille par défaut (100×100, aucune erreur console), une image « pas noire »
    /// satisfaite par le chrome du shell alors que l'écran mesuré était vide.
    /// `CaptureSupport` dit déjà la règle pour son propre périmètre : *une garde recopiée n'est
    /// pas une garde partagée — elle diverge, et le durcissement posé sur l'une ne protège aucune
    /// des autres.* Une seconde planche allait en faire une quatrième copie.
    /// ⇒ Toute garde ajoutée ICI vaut pour TOUTE capture prise sous le shell. C'est le point.</summary>
    public static class CaptureSousShell
    {
        /// <summary>LA PAIRE D'IDENTITÉ DE CAPTURE, OU RIEN. Rend `(identifiant, mot de passe)` et
        /// **fait échouer l'appelant** si la paire n'est pas exportée.
        ///
        /// ⛔⛔⛔ POURQUOI UNE GARDE DE PRÉSENCE, ET POURQUOI À UN SEUL SITE. `DemoIdentityResolver`
        /// retombe sur son `[SerializeField]` quand `MAFIA_DEMO_IDENTIFIER`/`_PASSWORD` sont
        /// absentes — un repli LÉGITIME hors campagne, et un piège dans une campagne : la capture
        /// s'exécute, écrit un PNG, passe toutes ses gardes, et photographie **un autre compte**.
        /// Rien dans l'image ne le dit — deux comptes de démo ont la même forme d'écran.
        /// Mesuré : **trois fois le 2026-09-06** un run a produit des planches sur le compte de
        /// repli, dont deux découvertes après coup en comparant des empreintes.
        /// ★★ *Un repli correct dans son contexte, appliqué dans un contexte où il ne l'est pas,
        ///   produit une valeur PLAUSIBLE — et c'est ce qui la rend indétectable.*
        ///
        /// ⇒ CE QU'ELLE VÉRIFIE ET CE QU'ELLE NE VÉRIFIE PAS, et la distinction est le point :
        /// elle asserte la PRÉSENCE de la paire, jamais sa VALEUR. Comparer l'identité rendue par
        /// le back à celle qu'on attendait est une autre garde (TD-640, armée par
        /// `MAFIA_CAPTURE_EXPECT_PLAYER` sur une seule capture des quinze). Celle-ci coûte deux
        /// lignes, tient à UN site pour tous les appelants de ce producteur, et ferme le seul mode
        /// d'échec qui produit une image SANS que personne l'ait demandé.
        /// ⚠️ Elle ne couvre que les captures qui passent PAR ICI. Une suite qui écrit son PNG
        ///    elle-même doit appeler cette méthode explicitement — c'est le cas des cinq suites
        ///    semeuses, et c'est écrit plutôt que supposé couvert.</summary>
        public static (string identifiant, string motDePasse) IdentiteDeCaptureOuEchoue(string quoi)
        {
            string id = System.Environment.GetEnvironmentVariable("MAFIA_DEMO_IDENTIFIER");
            string mdp = System.Environment.GetEnvironmentVariable("MAFIA_DEMO_PASSWORD");
            Assert.IsFalse(string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(mdp),
                $"capture refusée ({quoi}) : la paire `MAFIA_DEMO_IDENTIFIER`/`MAFIA_DEMO_PASSWORD` " +
                "n'est pas exportée. Sans elle le client retombe sur son identité par défaut et la " +
                "planche photographierait UN AUTRE COMPTE, sans que rien dans l'image ne le dise — " +
                "c'est arrivé trois fois le 2026-09-06. Exporter la paire du compte de capture, ou " +
                "ne pas lancer les catégories de capture.");
            return (id, mdp);
        }

        /// <summary>Monte (ou retrouve) un locataire, attend son chargement, le capture, et
        /// vérifie les TROIS propriétés qui rendraient l'image mensongère — dans cet ordre, du
        /// structurel au pixel.
        ///
        /// `monter == false` : le locataire est DÉJÀ à l'écran (le shell le monte lui-même — cas
        /// de `DashboardController`, posé en surimpression à l'ouverture de session). En monter un
        /// second exemplaire capturerait une copie que le joueur ne voit jamais, pendant que
        /// l'original reste dessous : on capture ce que le joueur a, pas ce qu'on sait fabriquer.
        ///
        /// `sonde` : appelée juste après l'écriture du PNG, pour imprimer la géométrie propre à un
        /// écran. *Mesure, pas déduction* — trois hypothèses plausibles valent moins qu'un log.</summary>
        public static IEnumerator CapturerLocataire<T>(AppShell shell, string nom,
                                                       System.Func<T, RectTransform, bool> charge,
                                                       List<string> echecs,
                                                       bool monter = true,
                                                       System.Action<T> sonde = null,
                                                       string nomFeuille = null,
                                                       string[] freresAttendusAuDessus = null,
                                                       System.Action<T> avantRendu = null,
                                                       int largeur = 1080, int hauteur = 2400)
            where T : MonoBehaviour, IShellTenant
        {
            // AVANT TOUT : sans la paire, on n'écrit rien. Placé en tête pour qu'aucun PNG ne
            // parte, pas même celui d'un écran qui se serait monté correctement.
            IdentiteDeCaptureOuEchoue($"planche_{nom}");
            string chemin = $"Assets/Screenshots/planche_{nom}_{largeur}x{hauteur}.png";

            // ⛔⛔ CE QU'UNE CAPTURE PRÉCÉDENTE LAISSE À L'ÉCRAN CONTAMINE LA SUIVANTE — mesuré le
            // 2026-09-03 sur `planche_la_filiere` : la feuille de ㉔, capturée deux appels plus
            // tôt, y est LISIBLE en haut de l'image. Les écrans ne sont jamais démontés entre deux
            // captures (le compte de frères monte 10 → 13 → 16 → 19), et le voile de fond de
            // chaque écran est un SCRIM translucide : il assombrit ce qu'il y a dessous au lieu de
            // le cacher. Les trois gardes ne pouvaient pas le voir — elles regardent ce qui est
            // AU-DESSUS, jamais ce qui transparaît DESSOUS.
            // ⇒ On note ce qui est présent AVANT de monter, et on éteint après l'écriture du PNG
            //   tout ce qui est apparu depuis — par DIFFÉRENCE, jamais par nom deviné.
            var avantMontage = new HashSet<Transform>();
            for (int k = 0; k < shell.ContentSlot.childCount; k++) avantMontage.Add(shell.ContentSlot.GetChild(k));

            if (monter) shell.MonterLocataireEnSurimpression<T>();
            T ecran = null;
            float montage = 0f;
            while (montage < 15f && ecran == null)
            {
                ecran = shell.ContentSlot.GetComponentInChildren<T>(true);
                montage += Time.deltaTime;
                yield return null;
            }
            if (ecran == null)
            {
                echecs.Add(monter
                    ? $"{nom} : non monté sous le shell"
                    : $"{nom} : introuvable sous le shell alors qu'on ne devait PAS le monter — "
                      + "le shell ne l'a pas posé, la capture n'aurait montré que ce qu'il y a dessous");
                yield break;
            }

            // ⛔⛔ LA RACINE VISIBLE N'EST PAS TOUJOURS LE COMPOSANT — et c'est une CLASSE, pas
            // un cas. SEPT des vingt-trois locataires (BuildingCard, ExceptionDetail, Laundering,
            // PipelineOverview, AutonomyInbox, Lieutenant, Dashboard) bâtissent leur `<X>Backdrop`
            // et leur `<X>Sheet` sous `mountParent` — donc en FRÈRES de leur propre hôte, jamais
            // en enfants. Mesuré : `grep -rnE 'NewUI\("[A-Za-z]+(Sheet|Backdrop)"' Assets/Scripts`
            // = 7 contrôleurs.
            // ⇒ Tout ce qui interroge `ecran.GetComponentsInChildren<…>` mesure alors un sous-arbre
            //   VIDE : la garde d'ordre de fratrie regarde un hôte sans un pixel, la garde de
            //   taille lit un rect par défaut, et le compte d'encre rend 0 sur un écran plein.
            //   Payé le 2026-09-03 par quatre échecs d'un seul run, tous de cette cause : ④ et ㉔
            //   « recouverts » par leur PROPRE feuille, ⑪ et ⑫ « chargement non abouti » alors que
            //   leur titre était à l'écran depuis le premier frame.
            // ⇒ L'appelant NOMME la feuille. Pas de repli devinant un nom : si `nomFeuille` est
            //   donné et introuvable, on échoue en le disant — un nom qu'on résout au jugé est
            //   exactement l'endroit où une garde se met à mesurer le voisin.
            // ⛔ LA CONVERSION EN `RectTransform` NE VA PAS DE SOI, et le run r2 l'a payée d'une
            // `InvalidCastException` nue. Le mécanisme, mesuré : `AppShell.ConstruireLocataire`
            // crée l'hôte par `new GameObject($"Tenant_{typeof(T).Name}")` — donc avec un
            // `Transform` NU. Les huit écrans de la planche 1 en ont quand même un `RectTransform`
            // parce qu'ils bâtissent leur UI SUR leur hôte, et poser un `Graphic` fait convertir le
            // Transform par Unity. Les sept qui dessinent dans une feuille voisine n'y posent rien,
            // donc leur hôte reste un `Transform` nu.
            // ⇒ **L'hôte est un `RectTransform` SI ET SEULEMENT SI l'écran dessine dessus** — la
            //   même frontière que celle qui rend `GetComponentsInChildren` vide pour ces sept-là.
            //   Un seul fait explique les deux symptômes.
            // ⇒ On ne suppose plus : `as` gardé, et on ÉCRIT ce qu'on a trouvé. Un cast dur
            //   transforme une hypothèse fausse en trace d'exception sans un mot sur l'objet en
            //   cause ; un `as` gardé la transforme en mesure.
            Transform racineT = ecran.transform;
            if (!string.IsNullOrEmpty(nomFeuille))
            {
                Transform parentHote = ecran.transform.parent;
                Transform feuille = null;
                float rechercheFeuille = 0f;
                while (rechercheFeuille < 10f && feuille == null)
                {
                    if (parentHote != null)
                        for (int k = 0; k < parentHote.childCount; k++)
                            if (parentHote.GetChild(k).name == nomFeuille) { feuille = parentHote.GetChild(k); break; }
                    if (feuille != null) break;
                    rechercheFeuille += Time.deltaTime;
                    yield return null;
                }
                if (feuille == null)
                {
                    var fratrie = new System.Text.StringBuilder();
                    if (parentHote != null)
                        for (int k = 0; k < parentHote.childCount; k++)
                            fratrie.Append($"\n      [{k}] {parentHote.GetChild(k).name}");
                    echecs.Add($"{nom} : feuille « {nomFeuille} » introuvable parmi les frères de "
                               + $"l'hôte — la garde mesurerait un hôte sans pixel. Fratrie :{fratrie}");
                    yield break;
                }
                racineT = feuille;
            }

            RectTransform racine = racineT as RectTransform;
            if (racine == null)
            {
                echecs.Add($"{nom} : « {racineT.name} » n'est pas un RectTransform "
                           + $"(c'est un {racineT.GetType().Name}) — ni la géométrie ni la capture "
                           + "ne peuvent être mesurées dessus. Donne `nomFeuille` pour désigner la "
                           + "feuille où l'écran dessine réellement.");
                yield break;
            }

            float attente = 0f;
            while (attente < 20f && !charge(ecran, racine)) { attente += Time.deltaTime; yield return null; }
            // ⛔⛔ ATTENDRE N'EST PAS AVOIR CHARGÉ. Une capture prise avant la fin du chargement
            // montre un écran VIDE qui a l'air fini — et le compte de teintes est alors satisfait
            // PAR LE CHROME du shell (barre du haut, jauge, dock), qui n'appartient pas à l'écran
            // mesuré. La garde de teintes prouve qu'il y a de l'encre, jamais que c'est CELLE de
            // l'écran ; celle-ci prouve qu'on a attendu, jamais que l'attente a abouti.
            if (!charge(ecran, racine))
            {
                // ⚠️ On dit POURQUOI, pas seulement QUE : un compte nu fait deviner.
                var diag = new System.Text.StringBuilder();
                foreach (var p in typeof(T).GetProperties())
                {
                    if (p.Name != "DerniereErreur" && p.Name != "EtatVide") continue;
                    object val = null;
                    try { val = p.GetValue(ecran); } catch { }
                    diag.Append($" {p.Name}={val ?? "null"}");
                }
                echecs.Add($"{nom} : chargement NON abouti après {attente:F0} s —{diag} · "
                           + $"jetonDuShell={(string.IsNullOrEmpty(shell.Token) ? "VIDE" : "présent")} · "
                           + "la capture montrerait un écran vide qui a l'air fini");
                yield break;
            }

            Canvas.ForceUpdateCanvases();
            yield return null;
            yield return null;

            // (1) ORDRE DE FRATRIE — la propriété la plus structurelle, et celle qui a menti le
            // plus longtemps. Une mesure sur un objet occlus mesure LE VOISIN, et rend un verdict
            // d'autant plus rassurant qu'il est faux. La garde NOMME les occultants : un compte nu
            // dit qu'il y a des frères au-dessus, jamais LESQUELS.
            // ⚠️ « QUELS nœuds », jamais « combien ». Un compte nu dit qu'il y a des frères
            // au-dessus, jamais LESQUELS — j'ai deviné quatre fois au lieu de lire une fois. Et
            // l'appelant doit NOMMER ceux qu'il accepte : un écran légitimement recouvert (④ l'est,
            // par les quatre panneaux de l'Accueil que `AppShell.MonterPanneauxAccueil` monte
            // EXPRÈS une frame plus tard pour qu'ils soient cadets — c'est écrit verbatim dans
            // `AcquireSessionThenActivateHome`) doit le DÉCLARER, pas le subir en silence.
            var attendus = new HashSet<string>(freresAttendusAuDessus ?? new string[0]);
            Transform parent = racine.parent;
            int rang = racine.GetSiblingIndex();
            if (parent != null && rang != parent.childCount - 1)
            {
                var inattendus = new System.Text.StringBuilder();
                int nbInattendus = 0;
                for (int k = rang + 1; k < parent.childCount; k++)
                {
                    Transform f = parent.GetChild(k);
                    int g = f.GetComponentsInChildren<Graphic>(true).Length;
                    if (attendus.Contains(f.name) || g == 0) continue;
                    nbInattendus++;
                    inattendus.Append($"\n      [{k}] {f.name} actif={f.gameObject.activeInHierarchy} graphics={g}");
                }
                if (nbInattendus > 0)
                {
                    echecs.Add($"{nom} : la racine visible « {racine.name} » est frère {rang} sur "
                               + $"{parent.childCount} — {nbInattendus} frère(s) NON DÉCLARÉ(S) se "
                               + $"dessinent par dessus :{inattendus}");
                    yield break;
                }
            }

            // (2) TAILLE — un RectTransform neuf fait 100x100 et ne dessine rien de VISIBLE, sans
            // la moindre erreur console.
            RectTransform rt = racine;

            Canvas canvas = racine.GetComponentInParent<Canvas>();
            if (canvas != null) canvas = canvas.rootCanvas;
            if (canvas == null) { echecs.Add($"{nom} : sous AUCUN canvas"); yield break; }

            // ⛔ Un canvas en Screen Space OVERLAY n'est pas rendu par une caméra : une capture par
            // `targetTexture` rendrait le fond de la caméra. On bascule en Screen Space Camera le
            // temps du rendu, puis on rétablit.
            RenderMode modePrecedent = canvas.renderMode;
            Camera cameraPrecedente = canvas.worldCamera;
            float planPrecedent = canvas.planeDistance;

            GameObject camGo = new GameObject("CapturePlancheCam");
            Camera cam = camGo.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Color.black;
            cam.orthographic = true;
            var rtex = new RenderTexture(largeur, hauteur, 24, RenderTextureFormat.ARGB32);
            cam.targetTexture = rtex;

            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = cam;
            canvas.planeDistance = 10f;
            Canvas.ForceUpdateCanvases();
            yield return null;

            // ⛔⛔⛔ RECUIRE LA GÉOMÉTRIE POUR LA RÉSOLUTION CIBLE — sans quoi la capture montre
            // une géométrie QUE LE JOUEUR N'A JAMAIS EUE, et on corrige alors un écran qui va bien.
            // Le mécanisme est écrit noir sur blanc dans `AppShell` : `PoserBandeAccueil` cuit
            // chaque bande en DÉCALAGE ABSOLU dérivé de `ContentSlot.rect.height` LU AU MONTAGE.
            // En batchmode le montage a lieu à 640×480 (canvas 1280×960) ; brancher ce canvas sur
            // une cible 1080×2400 le fait passer à ~2400 unités de haut, mais les décalages restent
            // cuits pour 960 ⇒ les quatre panneaux de l'Accueil se retrouvent tassés dans le bas.
            // ⇒ Ma première lecture de `planche_l_accueil` accusait la COMPOSITION de l'écran
            //   (« 55 % de vide, panneaux tassés ») : c'était mon instrument. Le dépôt avait déjà
            //   payé exactement ce défaut ailleurs — *le juge photographiait une géométrie que le
            //   joueur n'a jamais eue*.
            // ⚠️ ORDRE OBLIGATOIRE, imposé par le docstring de la seconde : le chrome D'ABORD (il
            // republie `ShellChrome.Top/BottomInsetPx` à sa toute fin), les panneaux ENSUITE — le
            // même ordre qu'au montage initial.
            // ⚠️ LA SONDE MESURE CE QUI DOIT BOUGER, et ma première version ne le faisait pas :
            // elle relevait la hauteur de `ContentSlot` avant et après — or le recuit REPOSITIONNE
            // les panneaux DANS ce slot, il ne change pas le slot. Elle rendait donc « 2844 → 2844 »
            // à chaque écran, un résultat rassurant, stable et incapable de rien prouver.
            // *Nommer la grandeur qui doit bouger vient AVANT d'écrire la sonde.*
            RectTransform temoin = null;
            if (shell.ContentSlot != null)
                for (int k = 0; k < shell.ContentSlot.childCount; k++)
                    if (shell.ContentSlot.GetChild(k).name == "AccueilHlCard")
                    { temoin = (RectTransform)shell.ContentSlot.GetChild(k); break; }
            float basAvant = temoin != null ? temoin.offsetMin.y : float.NaN;
            float hautAvant = temoin != null ? temoin.offsetMax.y : float.NaN;

            shell.RebatirChromePourResolutionCourante();
            shell.RebatirPanneauxAccueilPourResolutionCourante();
            Canvas.ForceUpdateCanvases();
            yield return null;

            if (temoin != null)
                Debug.Log($"[PLANCHE] {nom} — recuit pour la cible {largeur}x{hauteur} : bande "
                          + $"AccueilHlCard y [{basAvant:F0}..{hautAvant:F0}] → "
                          + $"[{temoin.offsetMin.y:F0}..{temoin.offsetMax.y:F0}] "
                          + $"dans un ContentSlot de {shell.ContentSlot.rect.height:F0} unités");
            else
                Debug.Log($"[PLANCHE] {nom} — recuit pour la cible {largeur}x{hauteur} : "
                          + "aucun panneau d'Accueil monté (rien à recuire côté Accueil ; le chrome "
                          + "l'a été)");

            // ⛔⛔ UNE CAPTURE MONTRE UN SEUL ÉCRAN — et mon extinction « par différence » n'y
            // suffisait pas. Signalé par le chantier F sur la capture de ⑧ : la marge gauche porte
            // des fragments de l'Accueil (`AUTONOMY_REPORTS_PENDING`, « Moderate », « Elevated »,
            // « Ready »). Ma différence n'éteint que ce que CET appel a monté ; l'état de DÉMARRAGE
            // du shell — les quatre panneaux d'Accueil et la feuille du Dashboard, posés par
            // l'acquisition de session — reste allumé dessous, et chaque voile de fond est un scrim
            // TRANSLUCIDE : il assombrit au lieu de cacher.
            // ⇒ On éteint donc, le temps du rendu, TOUT ce qui vit dans `ContentSlot` et qui n'est
            //   pas l'écran capturé — puis on rallume. Ce que « l'écran capturé » recouvre est
            //   exactement ce que l'appelant a DÉJÀ déclaré : son hôte, sa racine visible, et les
            //   frères qu'il accepte au-dessus (pour ④, ce sont les panneaux d'Accueil eux-mêmes,
            //   qui font partie de l'écran et restent donc allumés).
            // ★ Aucun nom deviné : la liste des gardés vient des paramètres, pas d'une convention.
            var gardes = new HashSet<Transform> { ecran.transform, racine };
            foreach (string n2 in freresAttendusAuDessus ?? new string[0])
                for (int k = 0; k < shell.ContentSlot.childCount; k++)
                    if (shell.ContentSlot.GetChild(k).name == n2) gardes.Add(shell.ContentSlot.GetChild(k));
            // Le voile de fond de l'écran, s'il en a un : même préfixe que sa feuille.
            if (!string.IsNullOrEmpty(nomFeuille) && nomFeuille.EndsWith("Sheet"))
            {
                string nomVoile = nomFeuille.Substring(0, nomFeuille.Length - 5) + "Backdrop";
                for (int k = 0; k < shell.ContentSlot.childCount; k++)
                    if (shell.ContentSlot.GetChild(k).name == nomVoile) gardes.Add(shell.ContentSlot.GetChild(k));
            }
            var eteintsPourLeRendu = new List<GameObject>();
            for (int k = 0; k < shell.ContentSlot.childCount; k++)
            {
                Transform f = shell.ContentSlot.GetChild(k);
                if (gardes.Contains(f) || !f.gameObject.activeSelf) continue;
                f.gameObject.SetActive(false);
                eteintsPourLeRendu.Add(f.gameObject);
            }
            if (eteintsPourLeRendu.Count > 0)
            {
                Canvas.ForceUpdateCanvases();
                yield return null;
                Debug.Log($"[PLANCHE] {nom} — {eteintsPourLeRendu.Count} voisin(s) éteint(s) le temps "
                          + "du rendu (l'image ne montre qu'un écran)");
            }

            // `avantRendu` : le dernier moment où l'écran peut être MIS DANS L'ÉTAT qu'on veut
            // photographier — après le recuit de géométrie (sinon on positionne dans l'ancienne)
            // et avant le rendu. C'est ce qui permet de capturer une SECTION précise d'un écran
            // qui défile, sans en faire un écran à part.
            if (avantRendu != null)
            {
                avantRendu(ecran);
                Canvas.ForceUpdateCanvases();
                yield return null;
            }

            // ⚠️ La demi-hauteur se mesure sur le rect RÉEL du canvas, jamais depuis la résolution
            // demandée : le canvas porte un CanvasScaler, ses unités ne sont pas les pixels cible.
            // La valeur par défaut d'`orthographicSize` (5) cadrerait 0,4 % de l'écran.
            // ⛔⛔ LA GARDE DE TAILLE EST ICI, PAS AVANT LA BASCULE — et ce n'est pas un
            // rangement, c'est un correctif MESURÉ le 2026-09-03. Elle vivait avant le passage du
            // canvas en caméra, donc elle jugeait la géométrie de la VUE DE JEU de l'éditeur
            // (640×480), pas celle de la CIBLE. Mesuré sur ⑦ : `LieutenantSheet` rend **727 × -1**
            // dans la vue de jeu et **1248 × 2275** à la résolution de capture. La garde d'avant
            // aurait donc refusé une capture parfaitement bonne — et pour les écrans sains elle
            // validait une géométrie que l'image n'utilise pas.
            // ★ C'est le MÊME défaut que le recuit ajouté ce matin, à l'autre bout : *juger l'écran
            //   dans une géométrie que le joueur n'a jamais eue.* Je l'ai reproduit dans la garde
            //   après l'avoir corrigé dans le rendu.
            // ⚠️ Et les DEUX dimensions : elle ne testait que la largeur, donc une hauteur nulle ou
            //   négative passait — un rect dégénéré ne casse rien et ne lève rien.
            if (rt.rect.width < 200f || rt.rect.height < 200f)
            {
                echecs.Add($"{nom} : à la résolution de capture, rect "
                           + $"{rt.rect.width:F0}x{rt.rect.height:F0} — une dimension sous le "
                           + "plancher : l'écran ne dessine rien de mesurable");
                if (camGo != null) Object.Destroy(camGo);
                Object.Destroy(rtex);
                canvas.renderMode = modePrecedent;
                canvas.worldCamera = cameraPrecedente;
                canvas.planeDistance = planPrecedent;
                yield break;
            }

            RectTransform crt = (RectTransform)canvas.transform;
            cam.orthographicSize = crt.rect.height / 2f;
            cam.aspect = crt.rect.width / crt.rect.height;
            cam.Render();

            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rtex;
            var tex = new Texture2D(largeur, hauteur, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, largeur, hauteur), 0, 0);
            tex.Apply();
            RenderTexture.active = prev;
            Rect rectCapture = rt.rect;   // AVANT la restauration — voir le log plus bas
            canvas.renderMode = modePrecedent;
            canvas.worldCamera = cameraPrecedente;
            canvas.planeDistance = planPrecedent;

            System.IO.File.WriteAllBytes(chemin, tex.EncodeToPNG());

            // Rallumer les voisins : ce test n'a pas à changer le monde qu'il a trouvé.
            foreach (GameObject g in eteintsPourLeRendu) if (g != null) g.SetActive(true);

            if (sonde != null) sonde(ecran);

            // (3) VARIÉTÉ — dernière et la plus faible des trois : « pas noire » est satisfait par
            // un gris uniforme, et le compte de teintes de TOUTE l'image est satisfait par les
            // écrans du dessous. Elle ne vaut qu'APRÈS les deux gardes structurelles.
            var teintes = new HashSet<int>();
            foreach (Color c in tex.GetPixels())
                teintes.Add((Mathf.RoundToInt(c.r * 31) << 10) | (Mathf.RoundToInt(c.g * 31) << 5) | Mathf.RoundToInt(c.b * 31));
            // ⚠️ `graphics` seul ne distingue pas « écran vide parce que la donnée est vide » de
            // « écran vide parce que la route a échoué » : le compte de textes non vides le sépare.
            int encre = 0;
            foreach (var t in racine.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true))
                if (!string.IsNullOrWhiteSpace(t.text)) encre++;
            // ⚠️ `rectCapture` est relevé AVANT la restauration du canvas : le `rect` d'après
            // restauration est celui de la vue de jeu, et le publier ferait croire que l'image a
            // été prise dans cette géométrie-là. Toutes les lignes `[PLANCHE]` d'avant le
            // 2026-09-03 rapportaient ce rect restauré.
            Debug.Log($"[PLANCHE] {chemin} — {teintes.Count} teintes · racine={racine.name} "
                      + $"rect={rectCapture.width:F0}x{rectCapture.height:F0} "
                      + $"· frere={rang}/{(parent != null ? parent.childCount : 0)} "
                      + $"· graphics={racine.GetComponentsInChildren<Graphic>(true).Length} · textes={encre}");
            if (teintes.Count <= 12) echecs.Add($"{nom} : {teintes.Count} teintes — c'est un fond, pas un écran");

            if (camGo != null) Object.Destroy(camGo);
            Object.Destroy(rtex);

            // Éteindre ce que CET appel a monté, pour que la capture suivante ne le voie pas au
            // travers de son scrim. `monter: false` n'a rien monté : la différence est vide et
            // l'état de démarrage du shell reste intact — c'est voulu, il n'est à personne.
            int eteints = 0;
            for (int k = 0; k < shell.ContentSlot.childCount; k++)
            {
                Transform f = shell.ContentSlot.GetChild(k);
                if (avantMontage.Contains(f) || !f.gameObject.activeSelf) continue;
                f.gameObject.SetActive(false);
                eteints++;
            }
            if (eteints > 0) Debug.Log($"[PLANCHE] {nom} — {eteints} objet(s) éteint(s) après capture");
            yield return null;
        }

        /// <summary>« Cette racine porte-t-elle du texte ? » — le prédicat de repli pour un écran
        /// dont le chargement ne peut PAS aboutir (une précondition manque côté back). Plus faible
        /// que le drapeau de chargement du contrôleur : il est donc NOMMÉ à l'appel, jamais glissé
        /// derrière un `true`.</summary>
        public static bool PorteDuTexte(RectTransform racine)
        {
            if (racine == null) return false;
            foreach (var t in racine.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true))
                if (!string.IsNullOrWhiteSpace(t.text)) return true;
            return false;
        }

        /// <summary>Charge la scène d'index de build 0, attend que l'acquisition de session du
        /// shell soit RÉSOLUE, puis que le nombre d'enfants du slot soit STABLE.
        ///
        /// ⛔ Les deux attentes sont des mesures, pas de la prudence. (a) L'acquisition rappelle
        /// l'onglet par défaut quand elle aboutit : capturer avant montrerait un autre écran.
        /// (b) Le premier écran monté échouait quatre runs de suite « frère 6 sur 11 », recouvert
        /// par les quatre panneaux de l'Accueil que le shell remonte — j'ai déplacé un écran, et
        /// **celui qui a pris sa place a échoué avec la signature IDENTIQUE**. Le défaut suit donc
        /// la POSITION, pas l'écran. Attendre la stabilité est la seule façon de mesurer les
        /// ÉCRANS au lieu de mesurer la course. ⚠️ Et la course reste un défaut de PRODUCTION —
        /// l'attendre ici ne la corrige pas, ça évite de compter un défaut de SHELL comme un
        /// défaut d'ÉCRAN.</summary>
        public static IEnumerator AttendreUnShellCalme(AppShell shell, List<string> echecs)
        {
            float attente = 0f;
            while (shell.CurrentTab != AppShell.Tab.Empire && attente < 25f)
            {
                attente += Time.deltaTime;
                yield return null;
            }
            if (shell.CurrentTab != AppShell.Tab.Empire)
            {
                echecs.Add("acquisition de session non résolue — toute capture prise ici serait "
                           + "celle d'un autre écran");
                yield break;
            }

            int dernierCompte = -1, framesStables = 0, gardeFou = 0;
            while (framesStables < 30 && gardeFou < 600)
            {
                int c = shell.ContentSlot.childCount;
                framesStables = (c == dernierCompte) ? framesStables + 1 : 0;
                dernierCompte = c;
                gardeFou++;
                yield return null;
            }
            Debug.Log($"[PLANCHE] shell stabilisé : {dernierCompte} enfants après {gardeFou} frames");

            // ⛔ LA GÉOMÉTRIE DU SHELL, IMPRIMÉE — parce que trois captures d'affilée montrent le
            // contenu tassé dans le cinquième supérieur d'un 1080×2400 et que je refuse de
            // l'attribuer au jugé. Une image qui surprend se mesure : canvas, slot de contenu,
            // et le facteur d'échelle qui les relie. *Un défaut de cadrage se lit comme un défaut
            // d'écran, et on corrige alors sept écrans au lieu d'un conteneur.*
            // ⚠️ VERS LE HAUT, pas vers le bas : le shell VIT SOUS le canvas. Ma première version
            // cherchait en `GetComponentInChildren` et a rendu `canvas=ABSENT scaleFactor=-1` —
            // un résultat uniforme et absurde, la signature d'un instrument qui mesure ailleurs.
            // *J'ai failli en tirer une conclusion sur la géométrie du jeu.*
            Canvas cnv = shell.GetComponentInParent<Canvas>();
            if (cnv == null && shell.ContentSlot != null) cnv = shell.ContentSlot.GetComponentInParent<Canvas>();
            if (cnv != null) cnv = cnv.rootCanvas;
            RectTransform cnvRt = cnv != null ? (RectTransform)cnv.transform : null;
            var slot = shell.ContentSlot;
            Debug.Log($"[GEOM-SHELL] ecran={Screen.width}x{Screen.height}"
                      + $" · canvas={(cnvRt == null ? "ABSENT" : $"{cnvRt.rect.width:F0}x{cnvRt.rect.height:F0}")}"
                      + $" scaleFactor={(cnv == null ? -1f : cnv.scaleFactor):F3}"
                      + $" · ContentSlot={(slot == null ? "ABSENT" : $"{slot.rect.width:F0}x{slot.rect.height:F0}")}"
                      + $" ancres=[{(slot == null ? 0f : slot.anchorMin.y):F2}..{(slot == null ? 0f : slot.anchorMax.y):F2}]"
                      + $" offsets=[{(slot == null ? 0f : slot.offsetMin.y):F0},{(slot == null ? 0f : slot.offsetMax.y):F0}]");
            // La chaîne de parenté, rect par rect : c'est elle qui dit OÙ le format se perd.
            var chaine = new System.Text.StringBuilder();
            for (Transform t = slot; t != null; t = t.parent)
            {
                var r = t as RectTransform;
                chaine.Append($"\n      {t.name} = {(r == null ? "(Transform nu)" : $"{r.rect.width:F0}x{r.rect.height:F0}")}"
                              + $" scaleY={t.localScale.y:F3}");
            }
            Debug.Log($"[GEOM-SHELL] chaîne de parenté depuis ContentSlot :{chaine}");
            if (gardeFou >= 600)
                echecs.Add("le shell n'a jamais cessé d'ajouter des enfants — capture non fiable");
        }
    }
}
