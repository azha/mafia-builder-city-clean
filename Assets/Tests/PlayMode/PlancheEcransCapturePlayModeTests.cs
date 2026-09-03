using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Economy.Shop;
using MafiaCleanCity.CoreLoops.Compression;
using MafiaCleanCity.CitySim.Inspection;
using MafiaCleanCity.CitySim.Precinct;
using MafiaCleanCity.Account.Profile;
using MafiaCleanCity.Onboarding;
using MafiaCleanCity.Operational.Selling;
using MafiaCleanCity.Account.Settings;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Lieutenant;

namespace MafiaCleanCity.Shell.Tests
{
    // PLANCHE DE CAPTURES — les HUIT écrans du chantier F en UN SEUL run d'éditeur.
    //
    // ⛔⛔ POURQUOI GROUPER, ET C'EST UNE MESURE, PAS UN CONFORT. Le rechargement de domaine de
    // cet éditeur coûte **674 à 677 secondes MESURÉES** (`Finished resetting the current domain,
    // in 676.994 seconds`), et il est payé UNE FOIS PAR LANCEMENT, avant toute compilation.
    // Huit tests séparés = sept rechargements = **~80 min de porte Unity**. Un seul test qui monte
    // les huit à la suite = un rechargement = **~13 min**. Sur une machine où quatre sessions se
    // partagent un éditeur unique par un système de file, ce n'est pas une optimisation : c'est la
    // différence entre bloquer les autres une heure et les bloquer un quart d'heure.
    //
    // ⚠️ CE QUE CE TEST PROUVE ET CE QU'IL NE PROUVE PAS. Il prouve que chaque écran REND — monté,
    // dimensionné, au premier plan, avec de l'encre. Il ne prouve PAS qu'un joueur peut y arriver :
    // AUCUN de ces huit écrans n'a d'entrée de navigation, les quatre onglets étant pris. Ce sont
    // deux propriétés distinctes, et c'est la seconde qui manque au chantier. Le test les monte
    // donc directement en surimpression, et le dit ici plutôt que de laisser la capture le taire.
    // ⚠️ RÉSERVE MESURÉE SUR ⑰ LE COMMISSARIAT, à porter avec la capture — sinon l'image ment
    // par omission. Le compte que le shell monte (`operational_demo`, dit « riche ») a ses cartes
    // de suspicion SATURÉES : **6 precincts sur 6 en HUNTING**, une seule bande distincte, pics
    // 235-255 pour un seuil à 180 (mesuré par la session qui provisionne, 2026-09-02).
    // ⇒ La capture de ⑰ prouvera donc que l'écran REND, et pas qu'il sait DISTINGUER — ce qui est
    // pourtant tout son sujet, puisqu'il ne montre que deux paliers. *Six fiches identiques ne
    // valident pas une correspondance palier → apparence : elles n'en exercent qu'un point.*
    // ⇒ Le contraste existe sur `demo_precincts@example.test` (HUNTING · SUSPICIOUS · HUNTING ·
    // HUNTING · WATCHFUL · HUNTING, 3 bandes sur 4), mais il coûte un SECOND run d'éditeur, donc
    // ~13 min de porte partagée entre quatre sessions. Arbitrage assumé : on prend le plat
    // maintenant, et le contraste fait l'objet d'un passage dédié SI l'user veut juger la
    // correspondance des paliers. ⚠️ Ce compte-là est une FENÊTRE : ses tuiles montent de façon
    // monotone et il se saturera comme le riche — le capturer tard revient à ne rien capturer.
    // TD-490 — SANS catégorie, ce fichier était invisible à TOUT filtre : ni le juge ni
    // personne ne pouvait le demander. Onze fichiers, 29 tests dans ce cas au 2026-09-02.
    // *Un test qui n'a jamais tourné et un test qui passe rendent la même absence d'erreur.*
    // ⚠️ Pas de préfixe `Capture` : cette catégorie EXISTE, le filtre d'Unity matche par
    // PRÉFIXE, et la demander emporterait celle-ci — or `Capture` fait SIGSEGV (Mesa).
    [Category("PhotoPlanche")]
    public class PlancheEcransCapturePlayModeTests
    {
        private Scene sceneDeDemarrage;

        private IEnumerator ChargerLaSceneDeDemarrageDuBuild()
        {
            LogAssert.ignoreFailingMessages = true;
            Assert.GreaterOrEqual(SceneManager.sceneCountInBuildSettings, 1,
                "Build Settings vides : aucune scène de démarrage ⇒ un build ne montrerait AUCUN écran.");
            string chemin = SceneUtility.GetScenePathByBuildIndex(0);
            Assert.IsNotEmpty(chemin, "la scène d'index de build 0 n'a pas de chemin");
            AsyncOperation chargement = SceneManager.LoadSceneAsync(chemin, LoadSceneMode.Single);
            while (chargement != null && !chargement.isDone) yield return null;
            yield return null;
            sceneDeDemarrage = SceneManager.GetActiveScene();
        }

        private static AppShell SondeShellDansLaScene(Scene scene)
        {
            if (!scene.IsValid() || !scene.isLoaded) return null;
            foreach (GameObject racine in scene.GetRootGameObjects())
            {
                AppShell trouve = racine.GetComponentInChildren<AppShell>(true);
                if (trouve != null) return trouve;
            }
            return null;
        }

        [UnityTest]
        public IEnumerator Capture_PlancheDesHuitEcrans_1080x2400()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();
            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell, "aucun AppShell dans la scène de démarrage du build");

            // ⛔ Les deux attentes (acquisition de session RÉSOLUE, puis nombre d'enfants du slot
            // STABLE) vivent dans `CaptureSousShell.AttendreUnShellCalme` — c'est là qu'est écrit
            // POURQUOI chacune existe, et c'est ce qui empêche cette planche et la suivante de
            // diverger sur la même course.
            var echecs = new List<string>();
            // ⚠️ On n'arrête PAS au premier échec : un rouge en masque un autre, et sur huit écrans
            // ça coûterait huit rechargements de domaine pour les découvrir un par un. On collecte,
            // puis on rend le verdict complet.
            yield return CaptureSousShell.AttendreUnShellCalme(shell, echecs);
            Assert.IsEmpty(echecs, "shell non capturable :\n  · " + string.Join("\n  · ", echecs));

            // ⛔⛔ LES PRÉDICATS ATTENDENT LE RENDU, PLUS UN CHAMP. Guetter l'arrivée d'un champ
            // est satisfait AU MILIEU de la coroutine : ㉓ enchaîne trois requêtes et j'attendais
            // la première — la capture partait deux requêtes trop tôt, image vide, test VERT.
            // ⑰ battait entre 23 et 3 éléments d'un run à l'autre pour la même raison.
            // ⇒ `RendusEffectues` monte à la fin de `Rendre()`. Propriété STRUCTURELLE : elle ne
            // dépend ni du nombre de requêtes ni de leur ordre, et elle reste juste le jour où
            // un écran en ajoute une. *Un proxy qui marche sur sept écrans sur huit ne marche pas.*
            yield return Capturer<CompressionScreenController>(shell, "la_semaine", (e, _) => e.RendusEffectues > 0, echecs);
            yield return Capturer<InspectionScreenController>(shell, "les_inspections", (e, _) => e.RendusEffectues > 0, echecs);
            yield return Capturer<PrecinctScreenController>(shell, "le_commissariat", (e, _) => e.RendusEffectues > 0, echecs);
            yield return Capturer<ProfileScreenController>(shell, "le_coffre", (e, _) => e.RendusEffectues > 0, echecs);
            yield return Capturer<TutorialScreenController>(shell, "la_premiere_fois", (e, _) => e.RendusEffectues > 0, echecs);
            yield return Capturer<SellingScreenController>(shell, "la_vente", (e, _) => e.RendusEffectues > 0, echecs);
            // ⑲ a rejoint la liste APRÈS avoir été déclaré bloqué ce matin : son écrivain de
            // `locale` a été livré dans la journée. *Un « bloqué » est une mesure datée.*
            yield return Capturer<SettingsScreenController>(shell, "les_reglages", (e, _) => e.RendusEffectues > 0, echecs);
            // ⛔⛔ ㉓ EST CAPTURÉE EN DERNIER, ET CE N'EST PAS UN CONFORT : elle a échoué
            // QUATRE runs de suite en première position, toujours « frère 6 sur 11 », et j'ai
            // corrigé trois fois le mauvais objet avant que la garde ne NOMME les occultants :
            //   [7] AccueilHlCard  [8] AccueilExceptionQueue  [9] AccueilOrgVitals  [10] AccueilHomeChrome
            // Ce sont les quatre blocs de l'onglet Accueil, que le shell REMONTE quand son
            // acquisition de session aboutit — la course décrite dans l'en-tête de ce fichier.
            // Le premier écran monté est donc le seul à se faire recouvrir ; les suivants
            // arrivent après la course et sont derniers sans rien faire.
            // ⇒ Changer l'ordre ne CORRIGE pas la course : elle reste un défaut de PRODUCTION
            // (un joueur qui ouvre un écran pendant l'acquisition se le fait recouvrir), et
            // elle est signalée comme telle à la session qui tient le shell. Ce test n'a pas
            // à la reproduire pour prouver que les huit écrans RENDENT — c'est une autre
            // propriété, et la confondre ferait passer un défaut de shell pour un défaut d'écran.
            yield return Capturer<ShopScreenController>(shell, "la_vitrine", (e, _) => e.RendusEffectues > 0, echecs);
            // ㉜ — le tableau de service (chantier F, 2026-09-03). Même prédicat structurel que les
            // autres : `RendusEffectues` ne monte qu'après le DERNIER `Construire…`, jamais à
            // l'arrivée d'un champ.
            // ⚠️ PAS de `nomFeuille` ici, et c'est une propriété, pas un oubli : ㉜ bâtit sa racine
            // SOUS son hôte (l'hôte est rendu `RectTransform` au montage, cf. `SetMountParent`),
            // donc le sous-arbre que les gardes mesurent est le bon. C'est le côté « les huit de la
            // planche 1 » de la frontière que ce harnais nomme, pas le côté « les sept qui
            // dessinent dans un frère ».
            // ⚠️ Sur un compte neuf l'écran est dans son état le plus PLAT — les quatre charges
            // tenues par le joueur, aucune confiée, aucun aperçu de reprise. C'est l'état m-73 de
            // la planche, et c'est ce qu'un joueur voit au premier jour : la capture n'est donc pas
            // un cas dégénéré, mais elle n'exerce ni m-75 ni m-76, qui exigent une délégation
            // réelle — laquelle exige `ELIGIBLE`, qu'aucun compte frais n'atteint. TD-531.
            yield return Capturer<DelegationScreenController>(shell, "ce_que_vous_avez_confie", (e, _) => e.RendusEffectues > 0, echecs);
            // ㉝ — raser un site. Même prédicat structurel, même côté de la frontière que ㉜ :
            // l'écran bâtit sous son hôte, donc pas de `nomFeuille`.
            // ⚠️ Cet écran BALAIE les districts avant de pouvoir rendre quoi que ce soit d'utile
            // (aucune route ne liste les bâtiments d'un joueur — TD-534) : mesuré, 16 requêtes
            // avant d'en trouver un. `RendusEffectues` ne monte qu'après ce balayage, ce qui rend
            // l'attente de 20 s du harnais NÉCESSAIRE ici, pas confortable.
            yield return Capturer<DemolitionScreenController>(shell, "raser_un_site", (e, _) => e.RendusEffectues > 0, echecs);
            // ⑧ « Signer l'ordre » — l'éditeur de règles, section du même écran que le roster.
            // ⛔⛔ LE PRÉDICAT OUVRE UN LIEUTENANT, ET C'EST TOUT LE POINT. `BuilderSection` a été
            // mesurée à 100×100 sur une capture précédente (TD-575) et lue comme un défaut de mise
            // en page. Ce n'en est pas un : `MajVisibiliteDetail()` pose `ignoreLayout = true` sur
            // les sections de détail tant qu'aucun lieutenant n'est ouvert, et un enfant en
            // `ignoreLayout` garde EXACTEMENT sa taille par défaut. Le 100×100 était la trace du
            // détail replié, pas d'un layout cassé.
            // ⇒ Une capture qui ne l'ouvre pas photographie le roster et rien d'autre — image
            //   parfaitement valide, et sans rapport avec l'écran qu'on prétend montrer.
            // ⇒ Le prédicat ouvre donc le premier lieutenant du roster PUIS exige que l'éditeur ait
            //   une hauteur RÉELLE. Il ne teste pas « la section existe » (elle a toujours existé) :
            //   il teste qu'elle est DÉPLIÉE, la seule grandeur qui distingue les deux mondes.
            // ⚠️ ET `nomFeuille` EST OBLIGATOIRE ICI — mesuré au premier essai, qui a échoué avec
            //   « Tenant_LieutenantScreenController n'est pas un RectTransform (c'est un
            //   Transform) ». ⑧ est du côté « dessine dans un FRÈRE de son hôte » de la frontière
            //   que ce harnais nomme : son hôte ne reçoit aucun `Graphic`, donc Unity ne le
            //   convertit jamais. Sa feuille est `LieutenantSheet`, PAS `LieutenantBackdrop` : cet
            //   écran pose DEUX objets en enfants directs de `ContentSlot`, le fond puis la
            //   feuille. J'ai d'abord nommé le FOND — le nom qu'une garde d'un autre test cite,
            //   donc celui que j'avais sous la main — et la garde a répondu « frère 21 sur 23,
            //   LieutenantSheet (168 graphics) se dessine par dessus ». Elle avait raison : un
            //   fond est derrière par construction. *Le nom qu'on connaît n'est pas forcément
            //   celui qu'on cherche*, et c'est encore la garde d'ordre de fratrie qui a tranché.
            //   ⇒ Deux causes indépendantes rendaient donc cette capture impossible — le détail
            //     replié ET la feuille non désignée. Corriger la première seule aurait rendu un
            //     échec DIFFÉRENT, et fait croire que le diagnostic était faux.
            yield return Capturer<LieutenantScreenController>(shell, "signer_l_ordre", (e, _) =>
            {
                if (string.IsNullOrEmpty(e.LastRecruitedId)
                    && e.CurrentRoster != null && e.CurrentRoster.Length > 0)
                    e.OpenLieutenant(e.CurrentRoster[0].lieutenant_id);
                if (e.HauteurEditeurDeRegles <= 100f) return false;
                // ⛔ DÉPLIÉ N'EST PAS VISIBLE. Le prédicat précédent s'arrêtait ici et sortait
                // VERT sur une image qui montrait l'organigramme : l'éditeur était déplié, mis en
                // page, et à mille pixels sous la ligne de flottaison. Sur un écran défilant,
                // « rendu » et « dans le cadre » sont DEUX mesures — la capture ne photographie
                // que la seconde. On amène donc la vue au bas du contenu, et on n'accepte que si
                // le geste a réellement eu une vue à faire défiler.
                return e.FaireDefilerVersEditeur();
            }, echecs, nomFeuille: "LieutenantSheet");

            Assert.IsEmpty(echecs, "écrans en défaut :\n  · " + string.Join("\n  · ", echecs));
        }

        /// <summary>Délègue à `CaptureSousShell.CapturerLocataire` — les trois gardes (ordre de
        /// fratrie, taille, variété) et l'attente de chargement vivent désormais LÀ-BAS, partagées
        /// avec les autres planches. Ce qui reste ici est la seule chose propre à cette planche :
        /// la sonde de géométrie de ㉓ la vitrine.
        /// ⛔ Elles ont été extraites parce qu'une seconde planche allait en faire une QUATRIÈME
        /// copie — et `CaptureSupport` porte déjà la leçon en tête de son fichier : *une garde
        /// recopiée n'est pas une garde partagée.*</summary>
        /// <param name="nomFeuille">La feuille où l'écran dessine RÉELLEMENT, quand ce n'est pas
        /// son hôte. ⛔ Ce paramètre manquait, et son absence a coûté un run : `CapturerLocataire`
        /// l'accepte depuis toujours, ce passe-plat ne le transmettait pas — donc ⑧ ne pouvait pas
        /// nommer sa feuille et échouait sur « n'est pas un RectTransform ». *Un passe-plat qui
        /// laisse tomber un paramètre rend une capacité INVISIBLE à ses appelants* : l'API la
        /// portait, ce fichier ne la publiait pas.</param>
        private IEnumerator Capturer<T>(AppShell shell, string nom,
                                        System.Func<T, RectTransform, bool> charge,
                                        List<string> echecs,
                                        string nomFeuille = null) where T : MonoBehaviour, IShellTenant
        {
            System.Action<T> sonde = null;
            if (nom == "la_vitrine") sonde = e => SonderLaVitrine(e);
            yield return CaptureSousShell.CapturerLocataire<T>(shell, nom, charge, echecs,
                                                               monter: true, sonde: sonde,
                                                               nomFeuille: nomFeuille);
        }

        /// <summary>⛔ MESURE, PAS DÉDUCTION. ㉓ dessine tous les textes d'une rangée au même
        /// endroit. J'ai émis TROIS hypothèses (hauteur des textes, hauteur du bloc de tête,
        /// imbrication) et posé un correctif sur la deuxième : l'image est revenue IDENTIQUE. Et
        /// le regard la réfute — le COMPTOIR superpose aussi ses deux textes, alors qu'il ne
        /// contient aucun bloc imbriqué. *Trois hypothèses plausibles valent moins qu'une mesure.*
        /// ⚠️ La LARGEUR aussi : le défaut résiduel est un débordement HORIZONTAL, et une sonde
        /// qui ne mesure que la hauteur ne peut pas le voir.</summary>
        private static void SonderLaVitrine(MonoBehaviour ecran)
        {
            Transform etageres = null;
            foreach (var rt2 in ecran.GetComponentsInChildren<RectTransform>(true))
                if (rt2.name == "Etageres") { etageres = rt2; break; }
            if (etageres == null || etageres.childCount == 0)
            {
                Debug.Log("[GEOM] Etageres introuvable ou vide");
                return;
            }
            Transform rang = etageres.GetChild(0);
            var vlg = rang.GetComponent<VerticalLayoutGroup>();
            var vueRt = etageres.parent as RectTransform;
            var listeRt = (RectTransform)etageres;
            Debug.Log($"[GEOM] vue w={(vueRt == null ? -1f : vueRt.rect.width):F1} "
                      + $"· liste w={listeRt.rect.width:F1} x={listeRt.anchoredPosition.x:F1} "
                      + $"pivot={listeRt.pivot.x:F2} ancres=[{listeRt.anchorMin.x:F1},{listeRt.anchorMax.x:F1}]");
            Debug.Log($"[GEOM] rangée '{rang.name}' rect={((RectTransform)rang).rect.height:F1} "
                      + $"vlg={(vlg == null ? "ABSENT" : $"ctrlH={vlg.childControlHeight} expH={vlg.childForceExpandHeight} spacing={vlg.spacing:F1}")}");
            for (int k = 0; k < rang.childCount; k++)
            {
                var e = (RectTransform)rang.GetChild(k);
                var le2 = e.GetComponent<LayoutElement>();
                Debug.Log($"[GEOM]   [{k}] {e.name,-10} y={e.anchoredPosition.y,8:F1} h={e.rect.height,7:F1} "
                          + $"prefH={(le2 == null ? -1f : le2.preferredHeight),7:F1} ignore={(le2 != null && le2.ignoreLayout)}");
            }
        }
    }
}
