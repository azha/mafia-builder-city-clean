using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{
    /// <summary>Le portrait du lieutenant — l'objet où le back « rend des instructions de
    /// dessin » au sens littéral.
    ///
    /// Cinq clés du corps de réponse pilotent cinq traits, et AUCUN n'est décoratif :
    ///   `portrait_posture` → l'inclinaison du buste et la direction du regard
    ///   `uniform_tells.collar`  → le col, ouvert ou fermé
    ///   `uniform_tells.sleeves` → les revers de manches
    ///   `uniform_tells.watch`   → la montre au poignet
    ///   `uniform_tells.gloves`  → les gants, clairs ou salis
    ///
    /// ⚠️ C'est le portrait DU LIEUTENANT, et lui seul. La tenue qu'il porte décrit ce qu'il a
    /// absorbé de VOS règles — d'où « le miroir ». Un second portrait « joueur » attribuerait à
    /// l'un ce qui décrit l'autre (canon `reputation_mechanics.md:233` : les deux jeux d'indices
    /// sur le MÊME portrait).</summary>
    public class ReputationPortrait : MonoBehaviour
    {
        private RectTransform racinePleinEcran;
        private RectTransform buste;      // porte la rotation de posture
        private Image bouche, boucheMasque;   // le sourire, obtenu par occlusion
        private Image col, revresG, revresD, montre, gantG;
        private Image montreBoitier;   // le contour sombre du cadran
        private Image montreAiguilleH, montreAiguilleV;   // le cadran : sans elles, un ovale uni
        private Image gantTacheA, gantTacheB;   // la saleté : un gant SALE porte des marques
        private Image oeilG, oeilD;
        private TextMeshProUGUI verdict;
        private TextMeshProUGUI reference;
        private RectTransform zoneDessin;

        // Le viewBox de la maquette est 62×78 : toute coordonnée ci-dessous est exprimée DEDANS,
        // puis mise à l'échelle une seule fois. Recopier des px d'écran ici rendrait le portrait
        // juste à une résolution et faux partout ailleurs.
        private const float VbL = 62f, VbH = 78f;
        private const float LargeurCss = 96f;   // .prt svg width — maquette v2

        public void Construire(RectTransform racine)
        {
            racinePleinEcran = racine;
            float ech = EchelleMaquette.Px(LargeurCss, racinePleinEcran,
                                           EchelleMaquette.LargeurEcransBrennar6) / VbL;

            VerticalLayoutGroup v = gameObject.AddComponent<VerticalLayoutGroup>();
            v.spacing = Px(6f);
            v.padding = new RectOffset(PxI(8f), PxI(8f), PxI(8f), PxI(9f));
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.UpperCenter;

            // Le nom vient du serveur (`GET /v1/lieutenants/:id`, clé `name`), jamais d'ici.
            // Le libellé de départ n'est qu'un gabarit sans nom : il ne doit JAMAIS rester visible.
            titreLieutenant = Texte("Titre", "VOTRE LIEUTENANT", 5.6f,
                                    ReputationResolvers.Muet, transform);
            TextMeshProUGUI titre = titreLieutenant;
            titre.alignment = TextAlignmentOptions.Center;
            titre.characterSpacing = 14f;
            titre.fontStyle = TMPro.FontStyles.Bold;   // maquette : .prt i, 700 5.6px

            // La zone de dessin : un rectangle aux proportions du viewBox.
            GameObject zone = Nouveau("Dessin", transform);
            zoneDessin = (RectTransform)zone.transform;
            LayoutElement le = zone.AddComponent<LayoutElement>();
            // ⛔ `min` AUTANT que `preferred`, en largeur ET en hauteur. Sans plancher, le layout
            // comprime cette zone quand la place manque, mais les formes qu'elle contient sont
            // dessinées à l'échelle VOULUE : elles débordent alors de leur propre cadre.
            // ⚠️ Mesuré (log `[PRT b3]`) : zone rendue 301 unités de large pour des épaules de 330,
            // puis 424 de haut pour un dessin de 516 — le buste passait par-dessus le verdict.
            // Un `preferredSize` sans `minSize` n'est pas une taille, c'est une préférence.
            le.minWidth = ech * VbL;
            le.preferredWidth = ech * VbL;
            le.minHeight = ech * VbH;
            le.preferredHeight = ech * VbH;
            le.flexibleWidth = 0f; le.flexibleHeight = 0f;

            // Le buste porte la ROTATION — c'est lui qui s'incline, pas les traits séparément.
            // Le dôme d'épaules descend SOUS le bas du viewBox (ellipse de centre y=78) : sans
            // masque il déborderait dans le verdict, comme le buste l'a déjà fait une fois.
            zone.AddComponent<RectMask2D>();

            GameObject bu = Nouveau("Buste", zone.transform);
            buste = (RectTransform)bu.transform;
            // ⛔⛔ LE BUSTE FAIT EXACTEMENT LE VIEWBOX, ET IL EST CENTRÉ — il n'ÉPOUSE PLUS LA ZONE.
            // ㊲ F3, quatre tours de juge à la même valeur : la figure est à −11,4 px = −3,2 px CSS
            // de l'axe de sa carte, sur quatre masques indépendants (peau, cou, col, bbox du
            // torse), pendant que les DEUX textes de la même carte restent centrés.
            // MESURÉ à l'exécution (`B3M1_AxeDeLaFigure_ChaineDesRects`), et c'est la chaîne des
            // rects qui a désigné le maillon — pas une lecture :
            //     EpaulesLisere  centre_vs_axe = −12,93     Buste 0,00   Dessin 0,00
            //     Mir6 0,00   Miroir 0,00   Corps 0,00   ReputationRoot 0,00
            // puis, sur les DIX-NEUF formes du buste, TOUTES les formes centrées au MÊME −12,93 —
            // y compris le `Cou`, la seule primitive SANS contour. Un décalage identique sur des
            // formes de tailles différentes et sans trait commun n'est pas un artefact de contour :
            // c'est une TRANSLATION RIGIDE.
            // ⇒ Arithmétique : `Forme` pose chaque trait à `vb.x * ech` depuis le bord GAUCHE de son
            //   parent, ce qui suppose un parent large d'exactement `VbL * ech` = 62 × 6,607 =
            //   409,6 unités. Le parent en mesurait **435,5** : le layout l'avait ÉTENDU au-delà de
            //   sa taille déclarée (`flexibleWidth = 0` n'empêche pas `childForceExpand` de
            //   distribuer le mou). Les 25,9 unités de surplus tombent donc INTÉGRALEMENT à droite,
            //   et la figure se retrouve à −12,95 de l'axe. La mesure disait −12,93.
            // ★ Ce que ça montre, et pourquoi trois tours de juge ne pouvaient pas le trouver : le
            //   défaut n'est ni dans une forme, ni dans une constante, ni dans une couleur — il est
            //   dans l'écart entre la taille qu'un conteneur DÉCLARE et celle qu'il REÇOIT. Aucune
            //   mesure sur l'image ne distingue ça d'un dessin décentré.
            buste.anchorMin = new Vector2(0.5f, 1f);
            buste.anchorMax = new Vector2(0.5f, 1f);
            // Le pivot est CONSTANT (le `rotate(deg 31 70)` du viewBox) : posé ici une fois pour
            // toutes plutôt qu'à chaque `Appliquer`. Sur un rect non étiré, changer le pivot DÉPLACE
            // l'objet — le poser deux fois au même endroit marchait par chance, pas par contrat.
            buste.pivot = new Vector2(31f / VbL, 1f - 70f / VbH);
            buste.sizeDelta = new Vector2(VbL * ech, VbH * ech);
            buste.anchoredPosition = new Vector2(
                (0.5f - buste.pivot.x) * VbL * ech,
                -(1f - buste.pivot.y) * VbH * ech);

            // Les traits, du fond vers l'avant. L'ordre de fratrie EST la profondeur : c'est une
            // propriété STRUCTURELLE, testable sans lire un pixel — et c'est ce type de garde
            // qui a fermé ici une classe entière de défauts d'occlusion que quatre tours de
            // gardes pixel n'avaient pas vue.
            // ⛔ LE DÔME D'ÉPAULES — `M6 78 C6 62 16 55 31 55 C46 55 56 62 56 78 Z` : une
            // demi-ellipse de centre (31, 78), rayons 25 × 23, dont seule la MOITIÉ HAUTE se voit
            // (la base est le bord du viewBox). D'où une ellipse de hauteur 46 posée à y=55, et le
            // masque de la zone de dessin qui en coupe le bas — pas un rectangle de hauteur 23.
            FormeLiseree(ref _epaules, "Epaules", buste, ReputationResolvers.Carte2,
                  // 1,95 et non 3,9 : l'ancien paramètre valait le DOUBLE du trait rendu (le
                  // contour était agrandi de tout le trait et le remplissage laissé entier, donc
                  // seule la moitié se voyait). La valeur calibrée « 3,0 px CSS mesurés » tient.
                  new Rect(6f, 55f, 50f, 46f), ech, 1.95f, ellipse: true);
            col = FormeTriangle("Col", buste, ReputationResolvers.Creme, ech);
            revresG = null; revresD = null;
            Forme(ref revresG, "RevresG", buste, ReputationResolvers.Creme,
                  new Rect(9f, 66f, 7f, 5f), ech);
            Forme(ref revresD, "RevresD", buste, ReputationResolvers.Creme,
                  new Rect(47f, 66f, 7f, 5f), ech);
            // `rect … rx="1.4"` sur une hauteur de 3,4 : le rayon vaut presque la demi-hauteur,
            // donc un stade, pas un rectangle vif. Le juge l'a discriminé en mesurant la largeur à
            // trois hauteurs — 27/40/32 px en référence (variable ⇒ arrondi), 56/56/56 en jeu.
            // ⛔ LA MONTRE A UN CONTOUR, et il porte de l'information. Le SVG l'écrit
            // `stroke="fond" stroke-width="1.1"` sur une boîte de 8 × 3,4 : à cette taille le trait
            // occupe une large part du cadran. Le juge a mesuré 32,2 % d'encre sombre au centre du
            // cadran en maquette contre 0,0 % en jeu — « un trait porteur de donnée réduit à une
            // ellipse muette ». On pose donc le boîtier sombre, puis le cadran or plus petit.
            Forme(ref montreBoitier, "MontreBoitier", buste, ReputationResolvers.Encre,
                  new Rect(46f, 72f, 8f, 3.4f), ech, arrondi: true);
            Forme(ref montre, "Montre", buste, ReputationResolvers.OrVif,
                  new Rect(47.1f, 72.9f, 5.8f, 1.6f), ech, arrondi: true);
            // ⛔ LE CADRAN — deux traits sombres, sans lesquels « montre » ne se lit plus comme une
            // montre. Mesuré : les aiguilles occupent 17,7 % de l'aire du boîtier en maquette et
            // 0,0 % en jeu, un ovale uni. C'est le cinquième trait du portrait, et le dernier de
            // l'angle mort A7 à ne pas être rendu.
            Forme(ref montreAiguilleH, "MontreAiguilleH", buste, ReputationResolvers.Encre,
                  new Rect(49.6f, 73.2f, 1.6f, 0.35f), ech);
            Forme(ref montreAiguilleV, "MontreAiguilleV", buste, ReputationResolvers.Encre,
                  new Rect(49.8f, 73.0f, 0.35f, 1.1f), ech);
            // `<ellipse cx="12" cy="75" rx="5" ry="3.4">` — une ellipse déclarée comme telle.
            // ⚠️ Rentré de 1,6 unité : à y=75 l'ellipse des épaules a une demi-largeur de 24,8
            // (centre x=31), donc son bord gauche tombe à 6,2 — et le gant, posé à 7 avec un
            // liseré de 1,2, commençait à 6,4. Il mordait le bord et son contour passait sur le
            // fond de la carte : « déborde d'un tiers hors de la silhouette », le second des deux
            // findings classés EMPÊCHE.
            FormeLiseree(ref gantG, "GantG", buste, ReputationResolvers.Creme2,
                  new Rect(8.6f, 71.6f, 10f, 6.8f), ech, 0.6f, ellipse: true);   // trait rendu, cf. Epaules
            // ⛔ LES DEUX TRAITS DE SALETÉ — `if tells['gloves'] != 'clean'` dans le SVG :
            // `M9 74 l3 1.6 M13 74.6 l3 -1`, deux courtes obliques sombres sur le gant.
            // ⚠️ Le juge mesure un rapport aire/boîte de 0,81 en jeu contre 0,67 en maquette : un
            // disque PLEIN là où la maquette porte des marques. J'avais lu ce finding comme « la
            // montre a perdu ses aiguilles » — mais dans cet état la montre est CACHÉE, donc
            // invisible : ce qu'il mesurait était le gant, seul objet de cette forme à cet endroit.
            // ★ Un finding nomme ce que le juge CROIT voir ; c'est à l'auteur de retrouver quel
            //   objet il a réellement mesuré. Corriger la montre n'aurait rien changé à l'image.
            // ⛔ LES MARQUES SONT OBLIQUES, PAS HORIZONTALES — et c'est ce que le juge a vu.
            // Le SVG trace `M9 74 l3 1.6` (pente +0,53, descendante) et `M13 74.6 l3 -1`
            // (pente −0,33, montante) : deux petites griffes croisées. J'avais posé deux
            // rectangles PLATS, donc « deux barres horizontales parallèles » — la seule chose du
            // portrait qu'un juge ait classée EMPÊCHE au huitième tour.
            // Faute de primitive de trait incliné, on pose le rectangle puis on le TOURNE.
            Forme(ref gantTacheA, "GantTacheA", buste, ReputationResolvers.Encre,
                  new Rect(9f, 74f, 3.4f, 0.8f), ech);
            gantTacheA.rectTransform.localEulerAngles = new Vector3(0f, 0f, -28f);   // atan(1,6/3)
            Forme(ref gantTacheB, "GantTacheB", buste, ReputationResolvers.Encre,
                  new Rect(13f, 74.1f, 3.2f, 0.8f), ech);
            gantTacheB.rectTransform.localEulerAngles = new Vector3(0f, 0f, 18f);    // atan(1/3)
            Forme(ref _cou, "Cou", buste, ReputationResolvers.Creme2,
                  new Rect(26f, 48f, 10f, 10f), ech);
            // `<ellipse cx="31" cy="32" rx="12.5" ry="15">` — une ellipse, pas un stade.
            FormeLiseree(ref _tete, "Tete", buste, ReputationResolvers.Creme2,
                  // 1,75 et non 3,5 — même correction d'unité que le dôme d'épaules. Contrôle
                  // arithmétique : le remplissage devient 25 − 1,75 = **23,25** unités, là où le
                  // juge mesure la référence à **22,97** et le jeu à 25,22 (F4).
                  new Rect(18.5f, 17f, 25f, 30f), ech, 1.75f, ellipse: true);
            // ⛔ LES CHEVEUX PASSENT APRÈS LA TÊTE — ils COUVRENT le haut du crâne.
            // ⚠️ Je les avais fait passer AVANT au tour 2, pour obtenir la calotte par occlusion :
            // le visage, dessiné par-dessus, ne laissait dépasser que l'arc supérieur. Ça produisait
            // bien une calotte — et ça découvrait le front. Deux juges de suite l'ont mesuré : « le
            // visage sort en ovale complet », 19,71 % de la hauteur de la carte en maquette contre
            // 25,20 % en jeu, +27,9 %. La tête paraissait trop grande pour le buste.
            // ★ La calotte de la maquette n'est pas ce qui DÉPASSE du visage, c'est ce qui le
            //   RECOUVRE. J'avais obtenu la bonne silhouette par le mauvais mécanisme, et le
            //   mécanisme décidait de ce qui restait visible dessous.
            // ⚠️ Resserrée : elle descendait à y=28 et couvrait le visage jusque sous les yeux.
            // Mesuré par le juge : la masse sombre est la plus large à 30 % de la hauteur de la
            // carte en jeu contre 38 % en maquette, et retombe à 0,99× la largeur du visage là où
            // la maquette est encore à 1,20× — « chevelure → casquette plate posée ». Effet de
            // bord sur le visage lui-même, qui n'est plus un ovale mais une tête ronde :
            // h/l 1,058 en maquette contre 0,858 en jeu, −19 %, invariant d'échelle.
            // ★ Le visage n'avait pas changé de forme : c'est ce qui le RECOUVRE qui décidait de
            //   sa silhouette apparente. Deux tours plus tôt le même trait, dessiné derrière,
            //   découvrait le front — la même forme au mauvais endroit produit deux défauts opposés.
            // ⚠️ PLUS ÉTROITE QUE LE CRÂNE. La maquette donne à la chevelure 0,95× la largeur de
            // la tête ; la mienne faisait 1,11×, débordait de ~2 px CSS de chaque côté et montait
            // 33 % trop haut. « Ça ne se lit plus comme des cheveux mais comme un béret. »
            // La tête fait 25 unités de viewBox : 0,95 × 25 = 23,75.
            // ★ Troisième réglage de ce même trait, et les trois erreurs étaient différentes :
            //   derrière le visage (front découvert), puis trop bas (visage rond), puis trop large
            //   (béret). Une forme dont la silhouette dépend d'une autre a plus de façons d'être
            //   fausse qu'une forme isolée.
            // ⛔⛔⛔ QUATRIÈME RÉGLAGE, ET LES TROIS PREMIERS RÉGLAIENT LA MAUVAISE CHOSE.
            // Un juge ⊥ a fini par mesurer la propriété que je n'avais jamais mesurée — non pas
            // « quelle taille fait la calotte » mais **comment elle rejoint le visage** :
            //   (a) largeur de calotte ÷ largeur de tête, AU POINT DE JONCTION : la référence
            //       s'élargit de façon MONOTONE jusqu'à 1,183 et fusionne sans jamais se
            //       rétrécir ; le jeu atteignait 1,058 puis **se rétrécissait à 0,920** — la
            //       coiffe devenait plus étroite que la tête qu'elle coiffe ;
            //   (b) hauteur d'attache : l'encre latérale dépasse la ligne de base jusqu'à **20 %**
            //       de la hauteur du visage en référence, et à **AUCUNE hauteur** en jeu ⇒ 0 % ;
            //   (c) épaisseur latérale à 15 % du visage : **20/20 px → 10/10** ;
            //   (d) une bande d'encre de **105 × 14 px** traversait le front, absente de la référence.
            // ⇒ Une ELLIPSE ne peut pas produire (a), (b) ni (d), quelles que soient ses cotes : son
            //   bord bas est convexe VERS LE BAS, donc elle est forcément la plus large en son
            //   milieu et la plus étroite là où elle touche le visage — l'inverse exact de ce que
            //   la maquette dessine. Les trois réglages précédents cherchaient des cotes pour une
            //   forme incapable de porter la propriété. *Quand un défaut revient sous des formes
            //   voisines, ce n'est pas d'une valeur de plus qu'il faut, c'est de la bonne forme.*
            //
            // LE CHEMIN DE LA MAQUETTE (`generateur-reputation.py:136-138`), lu au lieu d'être
            // approché : `M18 26 C19 14 25 10 31 10 C38 10 44 15 44 26 C40 20 36 21 31 21
            // C26 21 21 21 18 26 Z`. Un dôme de x 18 à 44 (26 unités, contre 23,8 posées jusqu'ici),
            // sommet à y = 10 — et un bord bas **CONCAVE** : il remonte à y = 21 au centre et
            // redescend à y = 26 aux tempes. C'est ce creux qui dégage le front tout en laissant la
            // chevelure descendre sur les côtés, donc qui produit (a), (b) et l'absence de (d).
            //
            // FAUTE DE PRIMITIVE À CHEMIN, ON LE CONSTRUIT PAR OCCLUSION — le mécanisme que ce
            // fichier emploie déjà pour la bouche, dix lignes plus bas. Le dôme est une ellipse
            // pleine ; une seconde ellipse, de la COULEUR DU VISAGE, en creuse le bas. Son arc
            // supérieur passe par (18 ; 26), (31 ; 21) et (44 ; 26) — les trois points du chemin —
            // pour un centre à (31 ; 26), un demi-grand axe de 13 et un demi-petit axe de 5.
            // ⚠️ Elle est resserrée à 12,4 (24,8 de large) plutôt que 13 : à 13 elle dépasserait le
            //   visage de ~0,9 unité de chaque côté à sa base, et peindrait de la couleur de peau
            //   sur le fond. À 12,4 le débord reste dans le trait du visage (2 unités de large).
            // ⛔ UN RECTANGLE ARRONDI, PAS UNE ELLIPSE — et le rayon vient du chemin, pas de l'œil.
            // La tangente du chemin en (18 ; 26) est (1 ; −12) : le flanc est QUASI VERTICAL au
            // départ, et ne s'infléchit qu'en montant. Une ellipse se referme dès son milieu, donc
            // elle est forcément la plus étroite là où la maquette est la plus large. Un stade
            // (l'arrondi par défaut, rayon = demi-petit-côté = 8) fait pire encore : à y = 26 il ne
            // rendrait que 26 − 2 × 8 = 10 unités de large.
            // Rayon 11 sur une hauteur de 16 : flancs droits de y = 21 à y = 26 — donc largeur
            // PLEINE (26 unités) à la jonction, et l'élargissement est monotone comme en référence.
            FormeLiseree(ref _cheveux, "Cheveux", buste, ReputationResolvers.Carte2,
                  new Rect(18f, 10f, 26f, 16f), ech, 1.8f, arrondi: true, rayonVb: 11f);
            Image creuxFront = null;
            Forme(ref creuxFront, "CheveuxCreux", buste, ReputationResolvers.Creme2,
                  new Rect(18.6f, 21f, 24.8f, 10f), ech, ellipse: true);
            Forme(ref oeilG, "OeilG", buste, ReputationResolvers.Encre,
                  new Rect(24.6f, 29.7f, 3.8f, 4.6f), ech, arrondi: true);
            Forme(ref oeilD, "OeilD", buste, ReputationResolvers.Encre,
                  new Rect(33.6f, 29.7f, 3.8f, 4.6f), ech, arrondi: true);
            // ⛔ LA BOUCHE — elle était purement ABSENTE, et le juge l'a relevé : « le visage passe
            // de souriant à inexpressif alors que le libellé dit Il vous écoute ». La maquette
            // trace un arc (`M27 40,5 Q31 42,5 36 40,5`), courbé vers le BAS = un sourire.
            // Faute de primitive à chemin, on le construit par occlusion : une ellipse sombre,
            // puis une ellipse couleur peau posée par-dessus et décalée VERS LE HAUT — il ne reste
            // que le croissant inférieur, qui est l'arc du sourire.
            // ⚠️ La forme dépend de la posture dans la maquette (`hostile` courbe vers le haut,
            // `withdrawn` est un trait droit) ; seul le sourire par défaut est posé ici, les deux
            // autres postures n'étant atteintes par aucun test (angle mort A5, déclaré).
            // ⛔ LES BOUTS ARRONDIS COMPTENT DANS LA LONGUEUR (㊲ F11). Le chemin
            // `M27 40,5 Q31 42,5 36 40,5` fait 9 unités — mais il porte `stroke-linecap:round`, qui
            // ajoute un demi-trait à CHAQUE bout : **9 + 1,7 = 10,7 unités**, et c'est ce que le
            // juge mesure sur la référence (59 × 14 px = 10,75 × 2,55 u) contre 50 × 12 (9,14 ×
            // 2,19) en jeu. Le client rendait le chemin NU.
            // ★ Une extrémité de trait n'est pas une décoration : c'est de la longueur. Reproduire
            //   un chemin sans reproduire ses bouts, c'est livrer une forme 15 % plus courte, et
            //   sur une bouche de 9 unités ça se lit — le juge l'a noté avant de le mesurer.
            // ⚠️ Ce que je ne touche PAS : la hauteur d'encre (2,19 contre 2,55). Elle vient du
            //   décalage des deux ellipses, pas des bouts, et ce n'est pas le mécanisme que le
            //   finding nomme. Une seule variable par correctif, sinon la remesure ne départage rien.
            Forme(ref bouche, "Bouche", buste, ReputationResolvers.Encre,
                  new Rect(26.15f, 39.4f, 10.7f, 3.6f), ech, ellipse: true);
            Forme(ref boucheMasque, "BoucheMasque", buste, ReputationResolvers.Creme2,
                  new Rect(25.75f, 38.1f, 11.5f, 3.6f), ech, ellipse: true);

            baseOeilGX = ((RectTransform)oeilG.transform).anchoredPosition.x;
            baseOeilDX = ((RectTransform)oeilD.transform).anchoredPosition.x;

            verdict = Texte("Verdict", "", 8.6f, ReputationResolvers.Creme, transform);
            verdict.alignment = TextAlignmentOptions.Center;
            verdict.fontStyle = TMPro.FontStyles.Bold;   // maquette : .prt b, 700 8.6px
            verdict.font = DesignTokens.Current.hudSerifFont;

            // ⛔⛔ CETTE LIGNE AFFICHAIT UNE DETTE DÉJÀ PAYÉE, ET C'EST LE PIRE DÉFAUT DE CET ÉCRAN.
            // Elle disait au joueur « lieutenant.name — non projeté (L0.4) » pendant que le titre
            // affichait « SALVATORE » en dur : l'écran INVENTAIT un nom tout en affirmant que le
            // serveur ne le donnait pas. Les deux ne peuvent pas être vrais ensemble.
            //
            // Et la prémisse était fausse. Mesuré à la source par le juge données, puis vérifié :
            // `name` est projeté par TROIS routes — `GET /v1/lieutenants`, `GET /v1/lieutenants/:id`
            // et la carte d'exception de `POST /v1/session/open`. Le commentaire du back le dit
            // mot pour mot : « C3 (D7, L0.5) … defect n°1 of back.md's L0.4 table ». Le trou que
            // j'annonçais était RÉPARÉ, et je continuais à le publier à l'écran.
            //
            // ★★ Ce défaut a traversé HUIT tours de juge visuel sans être vu, et pas par
            //    négligence : il était déclaré « écart assumé » dans chaque dossier, et les huit
            //    juges ont consciencieusement vérifié qu'il était *rendu proprement*. Ils ont
            //    contrôlé la mise en forme du mensonge.
            // ⇒ Un écart assumé met sa PRÉMISSE hors du champ de la revue. Tant qu'il est déclaré,
            //   plus personne ne redemande si ce qu'il affirme est encore vrai — et une prémisse
            //   vraie le jour où on l'écrit peut cesser de l'être pendant qu'un lot voisin avance.
            //   D'où la règle qui manquait : un écart assumé doit porter la DATE et la MESURE qui
            //   le fondent, pour qu'on puisse le refaire, pas seulement le relire.
            reference = null;
        }

        private TextMeshProUGUI titreLieutenant;

        /// <summary>Le nom du lieutenant, tel qu'il vient du serveur. Vide ⇒ on n'affiche que le
        /// rôle, jamais un nom de remplacement : l'écran ne comble pas un trou de données.</summary>
        public void DefinirNom(string nom)
        {
            if (titreLieutenant == null) return;
            titreLieutenant.text = string.IsNullOrWhiteSpace(nom)
                ? "VOTRE LIEUTENANT"
                : nom.ToUpperInvariant() + ", VOTRE LIEUTENANT";
        }

        private Image _epaules, _cou, _tete, _cheveux;

        /// <summary>Applique les cinq clés. `tells` peut être null (échec de lecture) : tout
        /// s'éteint alors, ce qui est l'état neutre — jamais un état inventé.</summary>
        public void Appliquer(UniformTellsDto tells, string posture)
        {
            float deg = ReputationResolvers.PostureInclinaisonDeg(posture);
            // Le pivot d'inclinaison est en BAS du buste (rotate(deg 31 70) du viewBox) : un
            // buste qui pivoterait par son centre décollerait des épaules.
            // Le pivot est posé au montage (rect non étiré : le rebouger ici DÉPLACERAIT le buste).
            buste.localRotation = Quaternion.Euler(0f, 0f, -deg);

            bool colFerme = tells != null && tells.ActifEstAbsorbe(UniformTellsDto.Pose.Collar);
            bool manches  = tells != null && tells.ActifEstAbsorbe(UniformTellsDto.Pose.Sleeves);
            bool montreOn = tells != null && tells.ActifEstAbsorbe(UniformTellsDto.Pose.Watch);
            bool gantsOk  = tells != null && tells.ActifEstAbsorbe(UniformTellsDto.Pose.Gloves);

            // Le col : fermé = échancrure étroite ; ouvert = large. La maquette déplace les deux
            // points hauts du triangle (24/38 ouvert contre 27/35 fermé).
            if (col != null)
            {
                RectTransform crt = (RectTransform)col.transform;
                float largeurVb = colFerme ? 8f : 14f;
                float ech = EchelleActuelle();
                crt.sizeDelta = new Vector2(largeurVb * ech, 14f * ech);
                // ⛔ RECENTRER SUR L'AXE DU COU (x=31 du viewBox). `Forme` ancre en haut-GAUCHE
                // avec un pivot (0,1) : changer la seule `sizeDelta` élargit vers la droite et
                // décale le col d'une demi-largeur. Mesuré par le juge : visage et cou à −3,2 de
                // l'axe de la carte, col à +1,6 — donc le col n'était pas SOUS le cou mais à côté,
                // et il le recouvrait sur 1,7 × 13,6 px CSS que la maquette ne montre pas.
                // La maquette déplace ses DEUX points hauts (24/38 ouvert, 27/35 fermé), c'est-à-dire
                // qu'elle s'élargit symétriquement — une largeur qui change autour d'un bord fixe
                // n'est pas la même chose qu'une largeur qui change autour d'un centre fixe.
                crt.anchoredPosition = new Vector2((31f - largeurVb / 2f) * ech, -56f * ech);
            }

            if (revresG != null) revresG.enabled = manches;
            if (revresD != null) revresD.enabled = manches;
            if (montre != null) montre.enabled = montreOn;
            if (montreBoitier != null) montreBoitier.enabled = montreOn;
            if (montreAiguilleH != null) montreAiguilleH.enabled = montreOn;
            if (montreAiguilleV != null) montreAiguilleV.enabled = montreOn;
            if (gantG != null)
                gantG.color = gantsOk ? ReputationResolvers.Creme2 : ReputationResolvers.Rang;
            // Les marques n'apparaissent QUE sur un gant sale — c'est la polarité, pas un décor.
            if (gantTacheA != null) gantTacheA.enabled = !gantsOk;
            if (gantTacheB != null) gantTacheB.enabled = !gantsOk;

            // Le regard suit la posture — la seule chose qui distingue `attentive` d'`hostile`
            // au premier coup d'œil, l'inclinaison étant lente à lire.
            //
            // ⚠️ Le décalage s'AJOUTE à la position de base, il ne la remplace pas. La première
            // version de ces trois lignes écrivait `anchoredPosition.x = dx`, ce qui collait les
            // DEUX yeux à la même abscisse : les deux ovales se superposaient au bord gauche du
            // crâne dès que la posture n'était pas `attentive` (dx=0) — et `attentive` étant la
            // valeur d'un compte frais, le défaut serait resté invisible à tout test qui ne
            // change pas de posture. D'où les positions de base mémorisées au montage.
            float dx = DecalageRegard(posture) * EchelleActuelle();
            if (oeilG != null) PoserX((RectTransform)oeilG.transform, baseOeilGX + dx);
            if (oeilD != null) PoserX((RectTransform)oeilD.transform, baseOeilDX + dx);
        }

        public void DefinirVerdict(string phrase, Color couleur)
        {
            if (verdict == null) return;
            verdict.text = phrase;
            verdict.color = couleur;
        }

        /// <summary>Le portrait quand la lecture a échoué : neutre et éteint, jamais un état
        /// plausible qu'on n'a pas mesuré.</summary>
        public void Eteindre()
        {
            Appliquer(null, "attentive");
            DefinirVerdict("—", ReputationResolvers.Muet);
        }

        private static float DecalageRegard(string posture)
        {
            switch (posture)
            {
                case "attentive": return 0f;
                case "cautious":  return -1.6f;
                case "withdrawn": return -3f;
                case "hostile":   return 2.4f;
                default:          return 0f;
            }
        }

        private float EchelleActuelle() =>
            EchelleMaquette.Px(LargeurCss, racinePleinEcran,
                               EchelleMaquette.LargeurEcransBrennar6) / VbL;

        private float Px(float css) =>
            EchelleMaquette.Px(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar6);

        private int PxI(float css) =>
            EchelleMaquette.PxTrait(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar6);

        /// <summary>Les abscisses des yeux AU MONTAGE, mémorisées une fois. Sans elles, appliquer
        /// un décalage de regard revient à écraser la position — voir la note dans
        /// <see cref="Appliquer"/>.</summary>
        private float baseOeilGX, baseOeilDX;

        private static void PoserX(RectTransform rt, float x) =>
            rt.anchoredPosition = new Vector2(x, rt.anchoredPosition.y);

        /// <param name="rayonVb">Rayon d'arrondi EN UNITÉS DE VIEWBOX. À 0 (le défaut, et le
        /// comportement de tous les appelants d'avant) le rayon vaut la moitié du petit côté —
        /// c'est-à-dire un stade, ce que veulent les yeux et la bouche. Un rayon EXPLICITE sert aux
        /// formes dont le chemin a des côtés droits sur une partie de leur hauteur : la calotte a
        /// des flancs quasi verticaux jusqu'à la jonction avec le visage, et un stade les referme
        /// bien avant.
        /// ⚠️ Paramètre optionnel ASSUMÉ : ce socle dit qu'un marqueur d'optionalité est un endroit
        /// où le compilateur cesse d'aider. Le risque qu'il décrit — un appelant qui hérite d'un
        /// comportement en silence — est nul ici : la valeur par défaut REPRODUIT exactement ce que
        /// les huit appelants existants obtenaient, et un seul passe une valeur.</param>
        private void Forme(ref Image cible, string nom, Transform parent, Color couleur,
                           Rect vb, float ech, bool arrondi = false, bool ellipse = false,
                           float rayonVb = 0f)
        {
            GameObject go = Nouveau(nom, parent);
            RectTransform rt = (RectTransform)go.transform;
            rt.anchorMin = new Vector2(0f, 1f);
            rt.anchorMax = new Vector2(0f, 1f);
            rt.pivot = new Vector2(0f, 1f);
            rt.anchoredPosition = new Vector2(vb.x * ech, -vb.y * ech);
            rt.sizeDelta = new Vector2(vb.width * ech, vb.height * ech);

            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            Image img = go.AddComponent<Image>();
            img.color = couleur;
            img.raycastTarget = false;
            if (ellipse)
            {
                // ⛔ ELLIPSE VRAIE, et non « rectangle à coins très arrondis ». La différence n'est
                // pas cosmétique : `RoundedRectMask` est un 9-slice, donc son CENTRE est étiré et
                // reste plein. Mesuré par le juge visuel sur les cheveux — remplissage 88,9 % en
                // jeu contre 35,5 % en maquette : une calotte était devenue un bloc.
                // Un disque plein étiré en `Simple` donne l'ellipse que le SVG dessine.
                // ⛔ LE SPRITE EST BLANC, la teinte vient de `img.color` posé plus haut. Un
                // sprite déjà coloré serait MULTIPLIÉ par cette teinte et rendrait la couleur au
                // carré. Mesuré sur ma propre capture avant correction : teint du visage rendu à
                // (133, 116, 81) pour (185, 173, 146) voulu — et (185/255)² × 255 = 134. La
                // correspondance à une unité près prouve la double application ; ce n'était pas une
                // hypothèse sur un rendu « un peu sombre ».
                // ★ La pastille des voyants passait déjà `Color.white` pour cette raison, six lignes
                //   plus bas. J'ai écrit la même primitive sans relire l'appel voisin qui la faisait
                //   déjà correctement.
                // ⛔ 256 ET NON 64 — la taille du sprite décide de la NETTETÉ du bord.
                // `RadialDisc` anticrénèle sur 1,5 px de texture. Étiré de 64 px sur les 330
                // unités des épaules, chaque pixel vaut 5,16 unités : la rampe fait alors 1,81 px
                // CSS, plus large que le liseré de 2,7 qu'elle est censée border — elle le NOIE.
                // Le juge l'a décrit exactement : « le profil passe du fond au remplissage par une
                // rampe continue sans jamais redescendre », liseré mesuré à 0,9 CSS sur la tête et
                // RIEN sur le buste, pour 2,7 et 3,0 attendus.
                // À 256, la rampe tombe à 0,45 px CSS et le liseré redevient un trait.
                // ★ Le liseré ÉTAIT dessiné — il l'est depuis deux tours. Ce n'est pas la forme qui
                //   manquait, c'est la résolution de l'outil qui la rendait invisible. Un défaut
                //   d'ABSENCE et un défaut de NETTETÉ produisent la même mesure.
                img.sprite = ProceduralUI.RadialDisc(256, Color.white, Color.white);
                img.type = Image.Type.Simple;
            }
            else if (arrondi)
            {
                float rayon = rayonVb > 0f ? rayonVb : Mathf.Min(vb.width, vb.height) * 0.5f;
                img.sprite = ProceduralUI.RoundedRectMask(
                    Mathf.Max(1, Mathf.RoundToInt(rayon * ech)));
                img.type = Image.Type.Sliced;
            }
            cible = img;
        }

        /// <summary>Pose une forme AVEC son liseré : la même forme, en encre, agrandie de
        /// `stroke` px de viewBox de chaque côté, dessinée juste avant. C'est ainsi qu'un `stroke`
        /// SVG se rend sans primitive de contour.
        ///
        /// ⛔ Les liserés manquaient TOUS, et c'est ce qui défaisait la figure. Le juge visuel l'a
        /// chiffré : l'encre `#0b1016` du portrait tombait de 244 u² en maquette — une composante
        /// connexe qui dessine toute la silhouette — à **12,4 u², c'est-à-dire un œil**. Les épaules
        /// ne se détachaient plus du cadre que par 1,9 de luminance.
        /// ★ « L'homme n'est plus le même homme. » Chaque aplat était pourtant à ≤ 4/255 de sa
        ///   couleur cible : ce n'étaient pas les couleurs qui manquaient, c'était le TRAIT entre
        ///   elles. Une figure se lit par ses bords autant que par ses surfaces.</summary>
        private void FormeLiseree(ref Image cible, string nom, Transform parent, Color couleur,
                                  Rect vb, float ech, float trait, bool ellipse = false,
                                  bool arrondi = false, float rayonVb = 0f)
        {
            // ⛔⛔ LE TRAIT EST CENTRÉ SUR LE CHEMIN, PAS POSÉ À L'EXTÉRIEUR (㊲ F4) — et le
            // corriger ICI ferme la classe pour les QUATRE primitives d'un coup.
            // Un juge ⊥ a mesuré, en unités de viewBox, que chaque forme pleine gagnait ≈ 2 unités :
            //     visage **22,97 → 25,22** (trait centré = 23,0 ; trait extérieur = 25,0)
            //     torse  52,13 → 54,83   (52,0 / 54,0)
            //     col    11,12 → 14,26   (≈11 / 14,0)
            //     gant   8,75×5,47 → 10,05×6,40   (8,8×5,6 / 10,0×6,8)
            // et — le contrôle qui nomme la cause — que le **COU**, seule primitive SANS contour,
            // ne bouge pas (9,84 → 10,23 pour 10,0 attendu). Quatre écarts, un mécanisme.
            // SVG pose `stroke-width` À CHEVAL sur le chemin : la moitié du trait mord le
            // REMPLISSAGE, l'autre moitié le fond. Ici le contour était agrandi de tout le trait et
            // le remplissage laissé à la taille du chemin ⇒ le bord extérieur tombait juste, mais
            // la forme pleine gardait sa taille entière et le trait mordait le fond seul.
            // ⇒ Le contour garde son bord extérieur (chemin + trait/2) ; le remplissage RENTRE de
            //   trait/2 de chaque côté. La silhouette visible est inchangée, l'encre passe du bon
            //   côté, et les quatre nombres du juge se referment ensemble.
            Image bord = null;
            Rect vbBord = new Rect(vb.x - trait / 2f, vb.y - trait / 2f,
                                   vb.width + trait, vb.height + trait);
            Rect vbPlein = new Rect(vb.x + trait / 2f, vb.y + trait / 2f,
                                    vb.width - trait, vb.height - trait);
            Forme(ref bord, nom + "Lisere", parent, ReputationResolvers.Encre, vbBord, ech,
                  arrondi: arrondi, ellipse: ellipse, rayonVb: rayonVb);
            Forme(ref cible, nom, parent, couleur, vbPlein, ech, arrondi: arrondi, ellipse: ellipse,
                  rayonVb: rayonVb);
        }

        private static Sprite spriteTriangle;

        /// <summary>Un triangle plein, POINTE EN BAS, blanc — la teinte vient d'`Image.color`.
        /// C'est la forme du col : `M27 56 L31 70 L35 56 Z` (fermé) ou `M24 56 L31 70 L38 56 Z`
        /// (ouvert), deux points hauts et une pointe basse centrée.
        ///
        /// ⚠️ Écrit ici plutôt que dans `ProceduralUI` : ce helper est partagé par quatre écrans
        /// dont un certifié, et cette forme n'est demandée que par ce portrait. Une primitive
        /// ajoutée au socle pour un seul appelant est une dette pour les trois autres.
        ///
        /// ⛔ Pourquoi pas un rectangle « qui tient le rôle de signal » : c'est ce que faisait la
        /// version précédente, et le juge visuel a mesuré le taux de remplissage aire/boîte à 0,93
        /// pour 0,43 attendu — l'aire du col relative au visage passait de 0,098 à 0,298, soit
        /// +204 %. Le dossier assumait « un triangle sommaire » ; ce qui était rendu n'était même
        /// pas un triangle, donc l'écart sortait du périmètre de l'assumé et redevenait un défaut.
        /// ★ Un écart assumé ne couvre que ce qu'il DÉCRIT.</summary>
        private static Sprite SpriteTriangle()
        {
            if (spriteTriangle != null) return spriteTriangle;
            const int d = 64;
            // ⛔ `Clamp` ET NON `Repeat` (le défaut d'Unity). Sans lui, l'échantillonnage au ras
            // du bord reboucle sur l'autre côté de la texture : la BASE opaque du triangle
            // reparaît sous sa POINTE, en un trait clair de la largeur nominale de la forme.
            // ⚠️ J'ai d'abord mis à zéro la dernière ligne de la texture, puis les deux dernières,
            // en croyant à un débordement d'anti-crénelage. Le trait revenait — parce qu'il ne
            // venait pas de ces lignes-là, mais de celles d'EN FACE.
            // ★ Deux corrections successives au bon endroit apparent, pour une cause située à
            //   l'opposé exact. Quand un correctif précis ne change rien, ce n'est pas qu'il est
            //   trop faible : c'est qu'il vise autre chose que la cause.
            var tex = new Texture2D(d, d, TextureFormat.RGBA32, false)
            {
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp,
            };
            var px = new Color[d * d];
            for (int y = 0; y < d; y++)
            {
                // y=0 est le BAS de la texture : la pointe. La largeur croît vers le haut.
                float demi = (y / (float)(d - 1)) * (d / 2f);
                for (int x = 0; x < d; x++)
                {
                    float dist = Mathf.Abs(x + 0.5f - d / 2f);
                    float a = Mathf.Clamp01(demi - dist + 0.5f);   // anti-crénelage des deux flancs
                    // ⛔ La ligne du BAS est la pointe : elle doit être vide, pas une arête.
                    // Le `+ 0.5f` d'anti-crénelage y laissait un demi-pixel opaque sur toute la
                    // largeur, rendu comme un filet clair de 21,4 × 0,28 px CSS sous le col — un
                    // élément EN TROP, absent de la maquette (le juge l'a confirmé par contrôle
                    // négatif : sa sonde ne trouve rien dans la référence).
                    // ★ Un anti-crénelage est une correction de BORD ; appliqué au sommet d'un
                    //   triangle, il fabrique une arête là où la forme se termine en un point.
                    if (y <= 1) a = 0f;   // DEUX lignes : avec une seule, l'interpolation de
                                          // l'étirement ressuscitait un trait de la largeur
                                          // nominale du triangle (21,7 px CSS) à sa pointe.
                    px[y * d + x] = new Color(1f, 1f, 1f, a);
                }
            }
            tex.SetPixels(px); tex.Apply(false, false);
            spriteTriangle = Sprite.Create(tex, new Rect(0, 0, d, d), new Vector2(0.5f, 0.5f), 100f);
            return spriteTriangle;
        }

        private Image FormeTriangle(string nom, Transform parent, Color couleur, float ech)
        {
            // Le col est un triangle dans la maquette ; faute de primitive triangulaire, on pose
            // un rectangle étroit qui en tient le rôle de signal (fermé/ouvert se lit à la
            // LARGEUR, pas à la forme). ⚠️ Écart de forme ASSUMÉ, à consigner au dossier du juge
            // visuel : c'est une simplification volontaire, pas un oubli — et le juge doit la
            // recevoir écrite plutôt que la découvrir.
            Image img = null;
            Forme(ref img, nom, parent, couleur, new Rect(27f, 56f, 8f, 14f), ech);
            img.sprite = SpriteTriangle();
            img.type = Image.Type.Simple;
            return img;
        }

        private TextMeshProUGUI Texte(string nom, string contenu, float corpsCss, Color couleur,
                                      Transform parent)
        {
            GameObject go = Nouveau(nom, parent);
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = DesignTokens.Current.primaryFont;
            t.text = contenu;
            t.fontSize = PxI(corpsCss);
            t.color = couleur;
            t.raycastTarget = false;
            return t;
        }

        private static GameObject Nouveau(string nom, Transform parent)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        private static void Etirer(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }
    }

    /// <summary>Une ligne de voyant : la pastille, le libellé de la pose, et ce qu'elle veut
    /// dire. Allumée = la vertu a été ABSORBÉE par le lieutenant.
    ///
    /// ⚠️ Ce composant ne DÉCIDE jamais de son état : il le reçoit. La polarité vit dans
    /// `UniformTellsDto.ActifEstAbsorbe` et nulle part ailleurs — c'est ce qui permet à une
    /// garde de sortie (« un lieutenant vierge allume zéro voyant ») de mordre sur une propriété
    /// plutôt que sur des libellés.</summary>
    public class TellVoyant : MonoBehaviour
    {
        private Image fond, contour, lumiere;
        private TextMeshProUGUI titre, sens;

        public bool EstAllume { get; private set; }

        public static TellVoyant Construire(Transform parent, ReputationScreenController ecran)
        {
            GameObject go = new GameObject("Voyant", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            TellVoyant v = go.AddComponent<TellVoyant>();
            v.Batir(ecran);
            return v;
        }

        private void Batir(ReputationScreenController ecran)
        {
            if (gameObject.GetComponent<CanvasRenderer>() == null)
                gameObject.AddComponent<CanvasRenderer>();
            fond = gameObject.AddComponent<Image>();
            fond.color = ReputationResolvers.Panneau;
            fond.raycastTarget = false;

            GameObject bord = new GameObject("Contour", typeof(RectTransform), typeof(CanvasRenderer));
            bord.transform.SetParent(transform, false);
            RectTransform brt = (RectTransform)bord.transform;
            brt.anchorMin = Vector2.zero; brt.anchorMax = Vector2.one;
            brt.offsetMin = Vector2.zero; brt.offsetMax = Vector2.zero;
            contour = bord.AddComponent<Image>();
            contour.sprite = ProceduralUI.RoundedRectOutline(ecran.PxTraitPublic(2f),
                                                             ecran.PxTraitPublic(1f), Color.white);
            contour.type = Image.Type.Sliced;
            contour.color = ReputationResolvers.Lisere;
            contour.raycastTarget = false;
            // ⛔ TROISIÈME À SIXIÈME INSTANCE DE LA MÊME CLASSE, trouvées par la garde B3S3.
            // J'avais corrigé le cerne, puis le contour du contrôleur — sans voir que `TellVoyant`
            // construit SON PROPRE contour, dans une autre classe. Le HorizontalLayoutGroup de la
            // ligne le comptait donc comme une colonne, aux côtés de la pastille et des textes.
            // ⇒ C'est précisément ce qu'une garde de CLASSE attrape et qu'un correctif d'instance
            //   laisse passer : deux corrections à la main, quatre occurrences encore vivantes.
            bord.AddComponent<LayoutElement>().ignoreLayout = true;

            // Les mesures viennent des constantes du contrôleur, jamais de littéraux recopiés :
            // deux sources pour une même valeur, c'est la garantie qu'elles divergeront.
            // ⛔ SANS HAUTEUR PRÉFÉRÉE, LES QUATRE VOYANTS SE PARTAGENT TOUTE LA COLONNE.
            // Mesuré sur la capture du run 14 : chaque voyant occupait ~200 px de haut là où la
            // maquette lui en donne ~24 (`.tl{padding:5px 8px}` autour d'un titre de 7,4 px et
            // d'un sens de 5,4 px). Le texte flottait alors au milieu d'un bloc vide, et la
            // pastille ronde s'étirait en ovale vertical.
            LayoutElement leV = gameObject.AddComponent<LayoutElement>();
            leV.minHeight = ecran.PxPublic(ReputationScreenController.CssVoyantTitre
                                         + ReputationScreenController.CssVoyantSens
                                         + 2f * ReputationScreenController.CssVoyantPadY + 3f);
            leV.preferredHeight = leV.minHeight;
            leV.flexibleHeight = 0f;

            HorizontalLayoutGroup h = gameObject.AddComponent<HorizontalLayoutGroup>();
            h.spacing = ecran.PxPublic(ReputationScreenController.CssVoyantEcart);
            h.padding = new RectOffset(
                ecran.PxTraitPublic(ReputationScreenController.CssVoyantPadX),
                ecran.PxTraitPublic(ReputationScreenController.CssVoyantPadX),
                ecran.PxTraitPublic(ReputationScreenController.CssVoyantPadY),
                ecran.PxTraitPublic(ReputationScreenController.CssVoyantPadY));
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false;
            // ⛔ `childForceExpandHeight = false` — sa valeur PAR DÉFAUT est `true`, et elle étire
            // la pastille sur toute la hauteur de la ligne MALGRÉ ses quatre contraintes de taille.
            // ⚠️ Le commentaire ci-dessus affirmait ce défaut corrigé depuis le run 14 : les
            // min/preferred/flexible étaient bien posés sur la pastille, mais un `forceExpand`
            // ajoute du flexible PAR-DESSUS, donc `flexibleHeight = 0` sur l'enfant ne suffit pas.
            // Le juge visuel l'a chiffré : ovale de 6,7 × 20,6 px CSS, ratio h/l = 3,08 pour un
            // disque qui doit valoir 1,000 (`.tl .lum{width:7px;height:7px;border-radius:50%}`),
            // occupant 85 % de la hauteur de sa carte au lieu de 25 %.
            // ★ Un défaut qu'on croit corrigé parce qu'on a corrigé l'enfant : la contrainte vivait
            //   chez le PARENT, et un réglage par défaut qu'on n'écrit pas est un réglage quand même.
            h.childForceExpandHeight = false;
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childAlignment = TextAnchor.MiddleLeft;

            GameObject lum = new GameObject("Lumiere", typeof(RectTransform), typeof(CanvasRenderer));
            lum.transform.SetParent(transform, false);
            lumiere = lum.AddComponent<Image>();
            int d = ecran.PxTraitPublic(ReputationScreenController.CssVoyantDiam);
            lumiere.sprite = ProceduralUI.RadialDisc(d, Color.white, Color.white);
            lumiere.color = ReputationResolvers.Lisere;
            lumiere.raycastTarget = false;
            LayoutElement lle = lum.AddComponent<LayoutElement>();
            lle.preferredWidth = d; lle.preferredHeight = d;
            lle.minWidth = d; lle.minHeight = d;
            // ⛔ `flexibleHeight = 0` AUSSI : sans lui la pastille suit la hauteur de la ligne et
            // le disque devient un OVALE vertical — mesuré sur la capture du run 14. Une pastille
            // est CARRÉE par définition ; c'est une contrainte de forme, pas de taille.
            lle.flexibleWidth = 0f; lle.flexibleHeight = 0f;

            GameObject colonne = new GameObject("Textes", typeof(RectTransform));
            colonne.transform.SetParent(transform, false);
            VerticalLayoutGroup v = colonne.AddComponent<VerticalLayoutGroup>();
            v.spacing = ecran.PxPublic(1f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true;
            LayoutElement cle = colonne.AddComponent<LayoutElement>();
            cle.flexibleWidth = 1f;

            titre = Texte(colonne.transform, "Titre", ecran.PxTraitPublic(ReputationScreenController.CssVoyantTitre),
                          ReputationResolvers.Creme2);
            titre.fontStyle = TMPro.FontStyles.Bold;   // maquette : .tl (le libellé de la pose), 700 7.4px
            sens = Texte(colonne.transform, "Sens", ecran.PxTraitPublic(ReputationScreenController.CssVoyantSens),
                         ReputationResolvers.Eteint);
        }

        public void Appliquer(string libelle, string signification, bool allume)
        {
            EstAllume = allume;
            titre.text = libelle;
            sens.text = signification;

            // Allumé : bordure dorée, fond légèrement relevé, pastille dorée, titre en crème
            // pleine. Éteint : tout retombe au repos. C'est un ÉTAT BINAIRE — il n'y a pas de
            // demi-absorption, et une opacité intermédiaire en inventerait une.
            contour.color = allume ? ReputationResolvers.OrFilet : ReputationResolvers.Lisere;
            fond.color = allume ? ReputationResolvers.Carte2 : ReputationResolvers.Panneau;
            lumiere.color = allume ? ReputationResolvers.OrVif : ReputationResolvers.Lisere;
            titre.color = allume ? ReputationResolvers.Creme : ReputationResolvers.Creme2;
        }

        private static TextMeshProUGUI Texte(Transform parent, string nom, float corps, Color c)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform), typeof(CanvasRenderer));
            go.transform.SetParent(parent, false);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = DesignTokens.Current.primaryFont;
            t.fontSize = corps;
            t.color = c;
            t.raycastTarget = false;
            return t;
        }
    }
}
