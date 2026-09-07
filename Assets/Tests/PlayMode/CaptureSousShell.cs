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
        /// <summary>La hauteur de capitale d'« ARGENT » dans le bandeau, lue sur la texture qu'on
        /// vient d'écrire. 19 px sur les cinquante planches sous chrome du dépôt, bande y 27..45.
        ///
        /// ⚠️ PAS de `.gamma` : `ReadPixels` d'une RenderTexture ARGB32 vers une Texture2D RGB24 ne
        /// convertit rien, donc `GetPixel` rend les MÊMES octets que le PNG — et c'est ce PNG que
        /// l'instrument hors ligne a lu pour fixer le 19. Convertir une seconde fois éclaircit tout
        /// et la bande d'encre ne se referme jamais (mesuré : 60 sur 60).
        /// ⚠️ Fenêtre bornée à 60 px de haut : ouverte à 220, elle mordait dans le ciel de l'art,
        /// clair sur toute la largeur juste sous la barre. Et elle commence à x = 40 pour laisser
        /// dehors la flèche retour (x 29..38), présente sur certains écrans seulement — sans ça la
        /// garde comparerait deux bandes différentes selon l'écran.
        /// ⚠️ Un écran sans chrome n'a pas d'« ARGENT » : la garde se DÉCLARE hors sujet plutôt que
        /// d'accuser, sinon elle rendrait un nombre de bruit sur les planches hors shell (mesuré :
        /// 3, 4 et 7 px sur les neuf planches sans bandeau du dépôt).</summary>
        private static void EchelleDuChromeOuEchoue(Texture2D tex, int largeur, int hauteur,
                                                    string nom, List<string> echecs)
        {
            int debut = -1, fin = -1;
            for (int d = 0; d < 60; d++)
            {
                int y = hauteur - 1 - d;
                int n = 0;
                for (int x = 40; x < 340 && x < largeur; x++)
                {
                    Color c = tex.GetPixel(x, y);
                    if (c.r + c.g + c.b > 3f * 0.372f) n++;
                }
                if (n > 3) { if (debut < 0) debut = d; fin = d; }
                else if (debut >= 0 && d - fin > 2) break;
            }
            if (debut < 0 || fin - debut + 1 >= 59)
            {
                Debug.Log($"[CHROME-CAPITALE] {nom} : pas de bandeau lisible dans la fenêtre " +
                          $"(bande {debut}..{fin}) — garde HORS SUJET, aucun verdict rendu");
                return;
            }
            int capitale = fin - debut + 1;
            Debug.Log($"[CHROME-CAPITALE] {nom} {largeur}x{hauteur} capitale={capitale} px " +
                      $"bande y={debut}..{fin} (attendu 19, bande 27..45)");
            if (Mathf.Abs(capitale - 19) > 2)
                echecs.Add($"{nom} : le chrome est rendu à {capitale / 19f:F3}× — capitale " +
                           $"d'« ARGENT » à {capitale} px (bande y {debut}..{fin}) au lieu de 19 " +
                           "(bande 27..45). C'est le défaut parti chez le juge de ① le 2026-09-06, " +
                           "que rien ne voyait parce qu'aucune garde ne lisait l'échelle SUR l'image.");
        }

        /// <summary>⛔⛔ UN SEUL NOM POUR DEUX USAGES REND TOUTE SUITE COMPLÈTE STRUCTURELLEMENT
        /// PARTIELLE — mesuré le 2026-09-07, des DEUX côtés dans le même run :
        /// <code>
        ///   suite complète AVEC la paire  →  14 rouges : « recruit failed (404): building … is not
        ///                                    a player-owned operational building » — le compte GELÉ
        ///                                    n'a pas ce que les tests FONCTIONNELS exigent
        ///   suite complète SANS la paire  →   3 rouges : « capture refusée » — les CAPTURES, elles,
        ///                                    l'exigent
        /// </code>
        /// ⇒ Le compte n'a pas un « bon » réglage : il en a DEUX, et aucune invocation ne pouvait
        /// satisfaire les deux familles. **Et le compteur ne le dit jamais** : chaque run est vert sur
        /// sa moitié et rouge sur l'autre, et on lit ça comme des défauts au lieu d'un régime.
        /// *Un run qui rend un compte plausible pour n'avoir mesuré que la moitié du dépôt est pire
        /// qu'un run qui échoue* — un échec s'investigue, un compte plausible se cite.
        ///
        /// ⇒ D'où `MAFIA_CAPTURE_IDENTIFIER`/`MAFIA_CAPTURE_PASSWORD` : un nom PROPRE aux captures.
        /// Exporter cette paire-là et laisser `MAFIA_DEMO_*` non posée fait enfin tourner les deux
        /// familles dans le même processus — les captures signent avec le compte gelé, les tests
        /// fonctionnels avec le compte par défaut.
        /// ⚠️ ADDITIF STRICT : `MAFIA_DEMO_*` reste acceptée en REPLI, donc toute invocation
        /// existante (et les cinq documentées dans les notes de charpente) continue de marcher à
        /// l'identique. Aucune ligne de commande n'est cassée par ce lot.
        /// ⚠️ ET LE RÉGIME EST DÉCLARÉ, jamais supposé : sans ça, une capture signée sous le repli
        /// ressemble trait pour trait à une capture signée sous la paire propre. *Une planche ne dit
        /// pas d'elle-même QUI elle photographie.*
        ///
        /// ⚠️ PORTÉE, écrite à côté du compte parce qu'un correctif sans sa portée se lit plus large
        /// qu'il n'est : ceci couvre les captures qui signent EXPLICITEMENT avec le couple rendu ici
        /// (㊲ `screen_b3`, ㊳ `screen_c1`, ㊵ `screen_c2`). La famille `planche_*` passe, elle, par la
        /// résolution du CLIENT (`DemoIdentityResolver`, qui lit `MAFIA_DEMO_*`) — elle n'est pas
        /// couverte, et elle n'est pas non plus dans le filtre du run complet (`PhotoPlanche`,
        /// `PhotoChantierC`, `PhotoManquants`, `PhotoEditeurRegles` : 538 découverts, 421 déclarés).
        /// Elle attend TD-682 de toute façon, qui bloque tout ce qui monte la scène de démarrage.</summary>
        public const string CaptureIdentifierEnvVar = "MAFIA_CAPTURE_IDENTIFIER";
        public const string CapturePasswordEnvVar = "MAFIA_CAPTURE_PASSWORD";
        public const string DemoIdentifierEnvVar = "MAFIA_DEMO_IDENTIFIER";
        public const string DemoPasswordEnvVar = "MAFIA_DEMO_PASSWORD";

        /// <summary>La résolution PURE, sans environnement : essayable sur des entrées fabriquées,
        /// donc sans la porte Unity et sans toucher aux vraies variables. Rend le couple ET le nom du
        /// régime — `null` en identifiant quand aucune paire n'est COMPLÈTE.
        /// ⚠️ Une paire à moitié posée (identifiant sans mot de passe) ne compte PAS : c'est la
        /// seconde direction que la garde d'origine ne couvrait pas, nommée dans `DemoIdentityResolver`
        /// (« `MAFIA_DEMO_PASSWORD` posé SEUL, identifiant absent »).</summary>
        public static (string identifiant, string motDePasse, string regime) ResoudreIdentiteDeCapture(
            string idCapture, string mdpCapture, string idDemo, string mdpDemo)
        {
            bool captureComplete = !string.IsNullOrWhiteSpace(idCapture) && !string.IsNullOrWhiteSpace(mdpCapture);
            if (captureComplete) return (idCapture, mdpCapture, "MAFIA_CAPTURE_*");
            bool demoComplete = !string.IsNullOrWhiteSpace(idDemo) && !string.IsNullOrWhiteSpace(mdpDemo);
            if (demoComplete) return (idDemo, mdpDemo, "MAFIA_DEMO_* (repli)");
            return (null, null, "AUCUNE");
        }

        public static (string identifiant, string motDePasse) IdentiteDeCaptureOuEchoue(string quoi)
        {
            var (id, mdp, regime) = ResoudreIdentiteDeCapture(
                System.Environment.GetEnvironmentVariable(CaptureIdentifierEnvVar),
                System.Environment.GetEnvironmentVariable(CapturePasswordEnvVar),
                System.Environment.GetEnvironmentVariable(DemoIdentifierEnvVar),
                System.Environment.GetEnvironmentVariable(DemoPasswordEnvVar));
            Assert.IsNotNull(id,
                $"capture refusée ({quoi}) : ni `{CaptureIdentifierEnvVar}`/`{CapturePasswordEnvVar}` " +
                $"ni `{DemoIdentifierEnvVar}`/`{DemoPasswordEnvVar}` n'est exportée COMPLÈTE (les deux " +
                "moitiés d'une même paire). Sans elle le client retombe sur son identité par défaut et " +
                "la planche photographierait UN AUTRE COMPTE, sans que rien dans l'image ne le dise — " +
                "c'est arrivé trois fois le 2026-09-06. Exporter la paire du compte de capture, ou ne " +
                "pas lancer les catégories de capture.");
            Debug.Log($"[IDENTITE-CAPTURE] {quoi} : régime {regime} — la capture signera avec « {id} »");
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
            // Le plancher d'encre — 4 planches du dépôt étaient vides avec des tests verts.
            PlancherDEncreOuEchoue(tex, chemin, echecs);

            // ⛔⛔ L'ÉCHELLE DU CHROME, LUE SUR LE PNG — la garde qui manquait, posée au SEUL endroit
            // qui la rend vraie pour toutes les planches sous shell.
            // Le 2026-09-06, un juge a reçu une planche de ① dont le chrome rendait ×1,21 : capitale
            // d'« ARGENT » à 23 px là où les cinquante autres planches sous chrome du dépôt rendent
            // 19. La planche du dossier et celle du commit portaient les MÊMES octets (sha256
            // `c31837119129`) — donc pas une erreur de transport — et régénérée depuis le même code
            // elle rend 19 : le défaut vit dans l'ÉTAT d'un run, pas dans l'arbre. Deux BLOQUANT et
            // huit MAJEUR ont été écrits dessus.
            // ⇒ Rien ne pouvait l'attraper : toutes les gardes de capture lisent l'ARBRE (locataire
            //   monté, encre présente, ordre de fratrie), aucune ne lisait l'IMAGE. Celle-ci lit
            //   l'image, sur l'unique grandeur qui suit le facteur à 100 %.
            // Contrôle positif exécuté en injectant ×1,21 sur `TopBarEchelle` : capitale **23 px,
            // rapport 1,211** — le chiffre du juge, reproduit à la troisième décimale.
            EchelleDuChromeOuEchoue(tex, largeur, hauteur, nom, echecs);

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
        /// <summary>⛔⛔ LE CHROME EST-IL ALIMENTÉ, ET SA PHASE EST-ELLE COHÉRENTE AVEC L'ÉCRAN ?
        /// La garde qui manquait — mesurée le 2026-09-06 sur QUATRE runs de la MÊME commande
        /// (`MAFIA_CI_CATEGORIES=CaptureCarte`, même compte gelé, arbre inchangé, aucun commit
        /// entre eux). Elles ont rendu TROIS états différents du bandeau de ③ :
        ///
        ///   run | ARGENT           | JOUR | cadran CHALEUR
        ///   ----|------------------|------|-------------------------
        ///   A   | 9 627 820,00 €   |  50  | Brûlant, anneau braise
        ///   B   | —                |  —   | vide, aiguille neutre, anneau or
        ///   C   | 9 627 820,00 €   |  50  | vide, aiguille neutre, anneau or
        ///   D   | 9 627 820,00 €   |  50  | Brûlant, anneau braise
        ///
        /// ⇒ Le bandeau est alimenté par DEUX arrivées asynchrones INDÉPENDANTES — le montant et
        ///   le jour d'un côté (`session/open`), le bucket de chaleur de l'autre
        ///   (`SetCitywideHeatBucket`). B montre les deux absentes, **C montre la première arrivée
        ///   et pas la seconde** : c'est C qui prouve qu'elles sont séparées, et donc qu'attendre
        ///   l'une ne donne pas l'autre.
        ///
        /// ⚠️ MA PREMIÈRE VERSION DE CETTE GARDE A ÉTÉ VERTE SUR UNE PLANCHE FAUSSE, TROIS FOIS.
        ///   Elle attendait le montant, le jour et la phase — et la phase n'est PAS ce que le
        ///   cadran affiche. Le mot en serif au centre est le bucket de CHALEUR (« CHALEUR » est
        ///   écrit dessous) ; la phase du jour vit dans l'aile droite, sous « JOUR N », et son
        ///   « — » hors district est l'état CORRECT que §6.3 exige. Le journal disait donc
        ///   `phase=«—»` — juste — pendant que l'image montrait un cadran vide, et la garde
        ///   passait. *J'ai attendu la mauvaise des trois arrivées, et la seule façon de le voir a
        ///   été de REGARDER la planche que la garde venait de déclarer bonne.*
        ///
        /// ★ Ce que ça a coûté avant d'être vu : un juge ⊥ a mesuré « un jour d'écart entre les
        ///   deux planches du même écran », un autre « la phase est alimentée sur ① et pas sur ③ »
        ///   — deux findings d'ÉCRAN pour une course de CAPTURE. *Une planche non gardée fait
        ///   juger l'aléa d'un run comme une propriété de l'écran.*
        ///
        /// ⇒ CE QU'ELLE ASSERTE. (1) alimentation, ATTENDUE : montant ≠ placeholder, jour > 0, ET
        ///   bucket de chaleur non vide — les trois, parce que chacune est une arrivée distincte ;
        ///   (2) cohérence de la phase, NON attendue (ce n'est pas une arrivée mais une valeur qui
        ///   peut être périmée) : hors district la phase DOIT valoir « — ».
        /// ⚠️ Elle se déclare HORS SUJET sur une planche sans chrome (`shell.TopBar == null`) —
        ///   sinon elle accuserait les planches hors shell, exactement comme la garde d'échelle.
        /// ⚠️ Elle n'asserte RIEN sur la valeur du montant : le compte gelé n'est pas son sujet,
        ///   c'est celui de la paire d'identité et de TD-640.</summary>
        /// <summary>⛔⛔ UN TEXTE POSÉ SUR L'ART A-T-IL VRAIMENT UN FOND ? La garde d'EFFET qui
        /// remplace trois gardes de PARAMÈTRE.
        ///
        /// LE DÉFAUT DE CLASSE. Le voile du dock et les plaques du district sont posés par
        /// `AlphaVoileSurFondQuelconque` — un alpha ajusté, déclaré, avec son résidu. C'est
        /// honnête et c'est **une garantie d'OPACITÉ, jamais de CONTRASTE** : le code le dit
        /// lui-même (« le dock flotte sur l'ART ⇒ fond inconnu »). Sur un mur sombre le libellé
        /// rend 8:1 ; sur l'eau claire d'un port, 3,5:1. Aucune des trois valeurs n'a bougé depuis
        /// le 25 août — vérifié par `git log` sur le bloc, sur la fonction et sur le jeton — et
        /// pourtant deux juges ⊥ ont mesuré 4,91:1 puis 3,54:1. *Ce n'est pas une régression :
        /// c'est un alpha fixe sur un art variable, et il n'existe aucune valeur qui tienne
        /// partout.*
        ///
        /// ⇒ LA GRANDEUR EST DONC LE CONTRASTE RENDU, et il ne se lit que sur l'image. Méthode
        ///   reprise de l'instrument du juge (`m45`, `m47`), pour que nos deux mesures soient
        ///   comparables plutôt que concurrentes :
        ///   · l'ENCRE = les pixels proches de la couleur que le composant déclare porter ;
        ///   · le FOND = la MÉDIANE des pixels situés à plus de `BandeMorteCss` de toute encre —
        ///     **la bande morte est le cœur de la méthode**, pas un détail : trois sondes de ce
        ///     dépôt ont déjà rendu « 100 % sous le seuil » en mesurant, à chaque fois, la frange
        ///     d'anti-crénelage qui entoure chaque glyphe. Tout ce qui interroge « le voisin » la
        ///     rencontre d'abord.
        ///   · et on rapporte AUSSI le fond le plus CLAIR (95ᵉ centile) : c'est lui qui décide du
        ///     pire cas, et c'est le seul chiffre qui ait un sens sur un art qui défile.
        /// ⚠️ Elle asserte sur le fond MÉDIAN et publie le pire cas sans l'asserter : un art peut
        ///   légitimement porter un éclat ponctuel. Ce qui doit rougir, c'est un texte dont le fond
        ///   TYPIQUE ne tient pas — pas un texte malchanceux sur trois pixels.
        /// ⚠️ Elle se déclare HORS SUJET si elle ne trouve pas d'encre : un libellé absent est le
        ///   sujet d'une autre garde, et accuser ici rendrait un contraste de bruit.
        /// ⚠️⚠️ LIMITE CONNUE, ÉCRITE PLUTÔT QUE TUE : la boîte est dérivée des coins MONDE du
        ///   rect, donc un texte TOURNÉ (les libellés de quartier de ③ suivent la trame de leur
        ///   quartier) rend une hauteur NÉGATIVE et sort en « hors sujet ». Mesuré : 3 des 18 noms
        ///   de ③ y échappent. Ce n'est pas une garde qui ment — elle le DIT, avec ses dimensions —
        ///   mais sa couverture est de 15/18 sur cet écran, et le chiffre doit voyager avec elle.
        ///   *Un dénominateur non publié se lit comme une couverture totale.* La forme qui fermera
        ///   ce reste est une boîte alignée sur l'axe du texte, pas un élargissement du rect.</summary>
        /// <summary>Les cibles de la garde ci-dessus, RAMASSÉES plutôt que nommées : tous les
        /// textes du slot de contenu et du dock. Nommer deux libellés fermerait deux instances ;
        /// c'est la CLASSE « un texte posé sur l'art » qu'il faut couvrir, et un texte neuf doit y
        /// entrer sans que personne s'en souvienne.
        /// ⚠️ Sur-ramasser est SANS DANGER ici, et c'est ce qui rend le geste possible : la garde
        /// se déclare hors sujet dès qu'elle ne trouve pas d'encre à la couleur déclarée, ou pas
        /// assez de fond hors bande morte. Un texte sur un aplat opaque en sort donc tout seul,
        /// sans liste d'exceptions à tenir à jour — *une allowlist est une liste qui vieillit.*
        /// La couleur d'encre vient du composant lui-même (`text.color`), jamais d'un jeton
        /// recopié : c'est la seule source qui ne peut pas diverger de ce qui est dessiné.</summary>
        public static List<(RectTransform, Color, string)> TextesPosesSurLArt(AppShell shell)
        {
            var cibles = new List<(RectTransform, Color, string)>();
            if (shell == null) return cibles;
            foreach (Transform racine in new[] { (Transform)shell.ContentSlot, (Transform)shell.TabBarRoot })
            {
                if (racine == null) continue;
                foreach (TMPro.TextMeshProUGUI txt in racine.GetComponentsInChildren<TMPro.TextMeshProUGUI>(false))
                {
                    if (txt == null || string.IsNullOrWhiteSpace(txt.text)) continue;
                    cibles.Add(((RectTransform)txt.transform, txt.color,
                        $"{racine.name}/{txt.name} «{(txt.text.Length > 22 ? txt.text.Substring(0, 22) + "…" : txt.text)}»"));
                }
            }
            return cibles;
        }

        public static void ContrasteSurArtOuEchoue(Texture2D tex, Canvas canvas, string nom,
            List<(RectTransform zone, Color encre, string libelle)> cibles, List<string> echecs)
        {
            const float SeuilContraste = 4.5f;   // plancher de lisibilité, celui des juges
            const float BandeMorteCss = 4f;      // ≥ celle de `m47` — la frange vit en deçà
            const float Tolerance = 30f;         // par canal, autour de la couleur déclarée

            if (cibles == null || cibles.Count == 0) return;
            RectTransform crt = (RectTransform)canvas.transform;
            float uxMin = crt.rect.xMin, uyMin = crt.rect.yMin;
            float parU = tex.width / crt.rect.width;             // px de texture par unité canvas
            int bandeMorte = Mathf.Max(2, Mathf.RoundToInt(BandeMorteCss * parU * (1280f / 392f) / (1280f / 392f)));

            foreach ((RectTransform zone, Color encre, string libelle) in cibles)
            {
                if (zone == null) continue;
                var coins = new Vector3[4];
                zone.GetWorldCorners(coins);
                // monde → local canvas → pixels de texture (l'axe Y de la texture monte, comme le canvas)
                int x0 = Mathf.Clamp(Mathf.FloorToInt((canvas.transform.InverseTransformPoint(coins[0]).x - uxMin) * parU), 0, tex.width - 1);
                int x1 = Mathf.Clamp(Mathf.CeilToInt((canvas.transform.InverseTransformPoint(coins[2]).x - uxMin) * parU), 0, tex.width - 1);
                int y0 = Mathf.Clamp(Mathf.FloorToInt((canvas.transform.InverseTransformPoint(coins[0]).y - uyMin) * parU), 0, tex.height - 1);
                int y1 = Mathf.Clamp(Mathf.CeilToInt((canvas.transform.InverseTransformPoint(coins[2]).y - uyMin) * parU), 0, tex.height - 1);
                if (x1 - x0 < 3 || y1 - y0 < 3)
                {
                    Debug.Log($"[CONTRASTE-ART] {nom} · {libelle} : HORS SUJET — zone de {x1 - x0}x{y1 - y0} px");
                    continue;
                }

                var estEncre = new System.Func<Color, bool>(c =>
                    Mathf.Abs(c.r - encre.r) * 255f < Tolerance &&
                    Mathf.Abs(c.g - encre.g) * 255f < Tolerance &&
                    Mathf.Abs(c.b - encre.b) * 255f < Tolerance);

                var encres = new List<Color>();
                for (int y = y0; y <= y1; y++)
                    for (int x = x0; x <= x1; x++)
                    { Color c = tex.GetPixel(x, y); if (estEncre(c)) encres.Add(c); }
                if (encres.Count < 20)
                {
                    Debug.Log($"[CONTRASTE-ART] {nom} · {libelle} : HORS SUJET — {encres.Count} px d'encre "
                              + "trouvés, trop peu pour une médiane (le libellé est absent, ou d'une autre teinte)");
                    continue;
                }

                // FOND : au-delà de la bande morte, dans une fenêtre élargie du même montant.
                var fonds = new List<Color>();
                int e0 = Mathf.Max(0, x0 - bandeMorte), e1 = Mathf.Min(tex.width - 1, x1 + bandeMorte);
                int f0 = Mathf.Max(0, y0 - bandeMorte), f1 = Mathf.Min(tex.height - 1, y1 + bandeMorte);
                for (int y = f0; y <= f1; y++)
                    for (int x = e0; x <= e1; x++)
                    {
                        bool encrePres = false;
                        for (int dy = -bandeMorte; dy <= bandeMorte && !encrePres; dy += 2)
                            for (int dx = -bandeMorte; dx <= bandeMorte && !encrePres; dx += 2)
                            {
                                int ax = Mathf.Clamp(x + dx, 0, tex.width - 1), ay = Mathf.Clamp(y + dy, 0, tex.height - 1);
                                if (estEncre(tex.GetPixel(ax, ay))) encrePres = true;
                            }
                        if (!encrePres) fonds.Add(tex.GetPixel(x, y));
                    }
                if (fonds.Count < 20)
                {
                    Debug.Log($"[CONTRASTE-ART] {nom} · {libelle} : HORS SUJET — {fonds.Count} px de fond "
                              + "hors bande morte (la zone est saturée d'encre)");
                    continue;
                }

                // ⛔⛔ L'ANNEAU PROCHE — la grandeur que le contraste glyphe↔fond NE VOIT PAS.
                // Un halo ou un contour ne change pas la couleur du glyphe : il INTERCALE une
                // bande sombre. La mesure ci-dessus saute délibérément cette bande (c'est la
                // bande morte, et sans elle trois sondes de ce dépôt ont mesuré la frange
                // d'anti-crénelage et rendu « 100 % sous le seuil »). ⇒ Un texte à 1,70:1 peut
                // donc porter un halo parfaitement actif, et un texte sans halo rendre le même
                // nombre : **le ratio glyphe↔art ne dit rien de l'existence du halo.**
                // Cet anneau le dit : si un dispositif intercale, sa luminance est SOUS celle de
                // l'art alentour. Rapporté, jamais asserté — l'assertion porte sur le contraste,
                // ce chiffre sert à savoir QUOI corriger.
                var anneau = new List<Color>();
                for (int y = Mathf.Max(0, y0 - 2); y <= Mathf.Min(tex.height - 1, y1 + 2); y++)
                    for (int x = Mathf.Max(0, x0 - 2); x <= Mathf.Min(tex.width - 1, x1 + 2); x++)
                    {
                        if (estEncre(tex.GetPixel(x, y))) continue;
                        bool colle = false;
                        for (int dy = -2; dy <= 2 && !colle; dy++)
                            for (int dx = -2; dx <= 2 && !colle; dx++)
                            {
                                int ax = Mathf.Clamp(x + dx, 0, tex.width - 1), ay = Mathf.Clamp(y + dy, 0, tex.height - 1);
                                if (estEncre(tex.GetPixel(ax, ay))) colle = true;
                            }
                        if (colle) anneau.Add(tex.GetPixel(x, y));
                    }

                Color encreMed = Mediane(encres);
                fonds.Sort((a, b) => Luminance(a).CompareTo(Luminance(b)));
                Color fondMed = fonds[fonds.Count / 2];
                Color fondClair = fonds[Mathf.Min(fonds.Count - 1, (int)(0.95f * fonds.Count))];
                float ratio = Contraste(encreMed, fondMed);
                float ratioPire = Contraste(encreMed, fondClair);
                string diagAnneau = "anneau: n/d";
                if (anneau.Count >= 20)
                {
                    anneau.Sort((a, b) => Luminance(a).CompareTo(Luminance(b)));
                    Color anMed = anneau[anneau.Count / 2];
                    float dL = Luminance(anMed) - Luminance(fondMed);
                    diagAnneau = $"anneau proche={Hex(anMed)} ΔL={dL * 255f:+0.0;-0.0} vs fond "
                               + (dL < -0.02f ? "⇒ un dispositif INTERCALE" : "⇒ RIEN n'est intercalé");
                }
                Debug.Log($"[CONTRASTE-ART] {nom} · {libelle} : encre={Hex(encreMed)} ({encres.Count} px) "
                          + $"fond médian={Hex(fondMed)} ⇒ **{ratio:F2}:1** · fond le plus clair (p95)="
                          + $"{Hex(fondClair)} ⇒ {ratioPire:F2}:1 · {diagAnneau} · bande morte {bandeMorte} px · seuil {SeuilContraste:F1}");
                if (ratio < SeuilContraste)
                    echecs.Add($"{nom} · {libelle} : {ratio:F2}:1 sur son fond médian, sous le plancher de "
                               + $"{SeuilContraste:F1}:1 (pire cas mesuré {ratioPire:F2}:1). Un texte posé sur l'art "
                               + "n'a pas de fond garanti par un alpha : il en faut un mesuré. Ne PAS remonter "
                               + "l'alpha jusqu'à ce que ça passe — ce serait régler sur le seuil, sur CET art, "
                               + "et faux sur le suivant.");
            }
        }

        private static Color Mediane(List<Color> v)
        {
            var r = new List<float>(); var g = new List<float>(); var b = new List<float>();
            foreach (Color c in v) { r.Add(c.r); g.Add(c.g); b.Add(c.b); }
            r.Sort(); g.Sort(); b.Sort();
            return new Color(r[r.Count / 2], g[g.Count / 2], b[b.Count / 2]);
        }

        private static float Luminance(Color c) => 0.2126f * c.r + 0.7152f * c.g + 0.0722f * c.b;

        /// <summary>WCAG : luminance RELATIVE, donc canaux LINÉARISÉS. Les linéariser est le point —
        /// une version sur les octets bruts rend des ratios plausibles et faux, et c'est la façon
        /// naturelle de l'écrire.</summary>
        private static float Contraste(Color a, Color b)
        {
            float la = LumRelative(a), lb = LumRelative(b);
            if (la < lb) { float t = la; la = lb; lb = t; }
            return (la + 0.05f) / (lb + 0.05f);
        }

        private static float LumRelative(Color c)
            => 0.2126f * Lin(c.r) + 0.7152f * Lin(c.g) + 0.0722f * Lin(c.b);

        private static float Lin(float u)
            => u <= 0.04045f ? u / 12.92f : Mathf.Pow((u + 0.055f) / 1.055f, 2.4f);

        private static string Hex(Color c)
            => $"#{Mathf.RoundToInt(c.r * 255):x2}{Mathf.RoundToInt(c.g * 255):x2}{Mathf.RoundToInt(c.b * 255):x2}";

        /// <summary>⛔⛔ LA PLANCHE A-T-ELLE DE L'ENCRE ? Le plancher qui manquait — et il manquait
        /// parce que la garde voisine porte sur la VARIÉTÉ, pas sur l'existence d'un dessin.
        ///
        /// Mesuré le 2026-09-06 : `ecran_demolition_1080x1920` et `_2400` rendent **0 pixel** dont
        /// un canal dépasse 110, canal maximum **64** — un dégradé sombre et rien d'autre — et
        /// leurs deux tests sont VERTS. Le balayage de la CLASSE en a trouvé **deux autres du même
        /// coup** : `ecran_delegation_1080x1920` et `_2400`, également à zéro. **4 planches vides
        /// sur les 52 qu'écrivent les suites de capture**, et aucune garde ne les voyait.
        /// ⇒ *« L'image n'est pas uniforme » et « l'écran a dessiné quelque chose » sont deux
        ///   propriétés distinctes.* Un dégradé porte plusieurs valeurs : il satisfait la première
        ///   sans rien dire de la seconde. C'est la garde de variété qui certifiait le vide.
        ///
        /// ⇒ LE SEUIL EST DÉRIVÉ, PAS CHOISI, et sa population est écrite. Sur les **52 planches
        ///   écrites par une suite de capture** (la population que ce site voit, pas les 122 PNG du
        ///   dépôt — les dioramas et les fonds d'art ne passent pas par ici), la plus PAUVRE des
        ///   non vides rend **0,518 %** (`screen_2a_fiche_1080x2400`, un écran de fiche sur art
        ///   sombre). Le plancher est posé **cinq fois plus bas — 0,10 %** : marge nommée, pour
        ///   qu'il n'attrape que le vide et jamais un écran légitimement sobre.
        /// ⚠️ Ce qu'il ne fait PAS : juger la richesse d'un écran. Un état vide légitime (« personne
        ///   au comptoir ce matin ») rend 1,4 % et passe très largement. Il répond à une seule
        ///   question — *y a-t-il un dessin ?* — et c'est la seule à laquelle un seuil global peut
        ///   répondre honnêtement.</summary>
        public static void PlancherDEncre(Texture2D tex, string nom)
        {
            var echecs = new List<string>();
            PlancherDEncreOuEchoue(tex, nom, echecs);
            if (echecs.Count > 0) Assert.Fail(string.Join("\n", echecs));
        }

        public static void PlancherDEncreOuEchoue(Texture2D tex, string nom, List<string> echecs)
        {
            const float PartMinimale = 0.10f;   // %, soit 1/5 de la plus pauvre des 52 (0,518 %)
            const int SeuilCanal = 110;

            Color32[] px = tex.GetPixels32();
            int encre = 0, maxCanal = 0;
            for (int i = 0; i < px.Length; i++)
            {
                int m = px[i].r; if (px[i].g > m) m = px[i].g; if (px[i].b > m) m = px[i].b;
                if (m > maxCanal) maxCanal = m;
                if (m > SeuilCanal) encre++;
            }
            float part = px.Length > 0 ? 100f * encre / px.Length : 0f;
            Debug.Log($"[PLANCHER-ENCRE] {nom} {tex.width}x{tex.height} encre={part:F3} % "
                      + $"({encre} px > {SeuilCanal}) · canal max={maxCanal} · plancher {PartMinimale:F2} %");
            if (part < PartMinimale)
                echecs.Add($"{nom} : {part:F3} % d'encre (canal max {maxCanal}) sous le plancher de "
                           + $"{PartMinimale:F2} % — cette planche ne montre aucun dessin. Le seuil est "
                           + "dérivé des 52 planches de capture du dépôt (la plus pauvre des non vides "
                           + "rend 0,518 %), divisé par 5. Trois causes donnent cette image et appellent "
                           + "trois correctifs : l'écran ne monte pas, il rend un vide légitime sur le "
                           + "compte photographié, ou le cadrage vise à côté — compter les nœuds de sa "
                           + "racine avant de conclure.");
        }

        public static IEnumerator ChromeAlimenteOuEchoue(AppShell shell, string nom, List<string> echecs)
        {
            if (shell == null || shell.TopBar == null)
            {
                Debug.Log($"[CHROME-ALIMENTE] {nom} : HORS SUJET — pas de bandeau sur cette planche");
                yield break;
            }

            const float Delai = 20f;
            float attente = 0f;
            while (attente < Delai
                   && (string.IsNullOrEmpty(shell.TopBar.RenderedCashText)
                       || shell.TopBar.RenderedCashText == PlaceholderVide
                       || shell.TopBar.OpenedGameDay <= 0
                       || string.IsNullOrEmpty(shell.TopBar.CitywideHeatBucket)))
            {
                attente += Time.deltaTime;
                yield return null;
            }

            string montant = shell.TopBar.RenderedCashText;
            int jour = shell.TopBar.OpenedGameDay;
            string phase = shell.TopBar.DayPhaseText;
            string chaleur = shell.TopBar.CitywideHeatBucket;
            bool enDistrict = shell.CityTabDistrictId >= 0;
            Debug.Log($"[CHROME-ALIMENTE] {nom} montant=«{montant}» jour={jour} "
                      + $"chaleur=«{chaleur}» phase=«{phase}» "
                      + $"district={(enDistrict ? shell.CityTabDistrictId.ToString() : "aucun")} "
                      + $"attendu {attente:F2}s");

            if (string.IsNullOrEmpty(montant) || montant == PlaceholderVide || jour <= 0
                || string.IsNullOrEmpty(chaleur))
                echecs.Add($"{nom} : le bandeau n'a pas été alimenté en {Delai:F0} s "
                           + $"(montant=«{montant}» jour={jour} chaleur=«{chaleur}») — la planche "
                           + "montrerait un shell vide et un juge l'attribuerait à l'écran");

            if (!enDistrict && phase != PlaceholderVide)
                echecs.Add($"{nom} : phase «{phase}» hors district — §6.3 exige l'état nommé "
                           + $"«{PlaceholderVide}» partout sauf en district ; cette valeur est le "
                           + "reste d'un écran quitté, arrivé après le reset de `ActivateTab`");
            if (enDistrict && phase == PlaceholderVide)
                echecs.Add($"{nom} : en district {shell.CityTabDistrictId} et phase «{phase}» — "
                           + "le manomètre doit porter la `day_phase` du DTO déjà récupéré");
        }

        /// <summary>L'état nommé du bandeau quand une valeur manque. RECOPIÉ de
        /// `TopBarController` (cadratin), jamais reformulé — deux littéraux qui divergent
        /// rendraient la garde ci-dessus verte pour la mauvaise raison.</summary>
        private const string PlaceholderVide = "—";

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
