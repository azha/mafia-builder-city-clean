using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.Theme.Tests
{
    /// <summary>TD-612 — LA GARDE QUI MANQUAIT : un littéral de couleur qui RECOPIE la valeur d'un
    /// token nommé est invisible à toute garde qui balaie les ACCÈS au token.
    ///
    /// ⛔⛔ POURQUOI CETTE GARDE EXISTE, ET POURQUOI LE DÉFAUT A SURVÉCU À DEUX INSTRUMENTS.
    /// Mesuré le 2026-09-06 sur `Assets/Scripts` par `Tools/apparier-litteraux-aux-tokens.py
    /// --bilan`, APRÈS la correction de ⑯ et avec les quatre motifs : **97 littéraux de couleur
    /// actifs dans 18 fichiers, dont 43 à moins de 4 d'un token nommé, dans 11 fichiers**.
    /// `hudCreme` est recopié dans 11 fichiers, `hudMoneyUnderlineGold` dans 11,
    /// `hudCremeSecondary` dans 10, `hudGaugeArcHot` dans 5.
    ///
    /// ⚠️ CES CHIFFRES NE SE COMPARENT PAS TERME À TERME AUX PREMIERS (92 / 47 / 12), et la
    ///    réconciliation est faite plutôt que passée sous silence — trois variables ont bougé :
    ///      · ⑯ a été corrigé : −8 recopies, et il sort de la population des fichiers (12 → 11) ;
    ///      · `accentCalm` est entré dans la palette, ce qui a fait d'un littéral existant une
    ///        recopie qui n'en était pas une la veille : +1. *Une garde de recopie dépend de la
    ///        palette autant que du code — élargir l'une déplace le compte de l'autre.*
    ///      · les deux motifs neufs (ci-dessous) ajoutent 13 littéraux, dont 3 recopies : +3.
    ///    Contrôlé : les motifs d'origine appliqués à l'arbre d'aujourd'hui rendent 84 littéraux et
    ///    40 recopies — et 84 + 8 = 92, le compte d'origine, à l'unité près.
    ///
    /// ★★ LA CLASSE : *valeur juste, chemin faux.* Les deux instruments du dépôt sont aveugles au
    ///    MÊME endroit, et pour deux raisons différentes qui se renforcent :
    ///      · les allowlists de population (`ChromeTabAccentAllowlistPlayModeTests`,
    ///        `HudPlayModeTests.F2_SeverityTokenAccesses…`) comptent `DesignTokens.Current.*` —
    ///        un littéral n'est pas un accès, donc il ne les fait jamais rougir ;
    ///      · un juge visuel compare des pixels et rend « conforme » TANT QUE la valeur coïncide.
    ///    L'écran ne se trahit donc que le jour où le dessin demande une AUTRE couleur — et ce
    ///    jour-là le défaut a déjà douze ans d'ancienneté et douze porteurs.
    ///
    /// ⇒ LE CHIFFRE QUI A DÉCIDÉ QUE C'ÉTAIT UN LOT ET NON UN CORRECTIF : croisés avec les deux
    ///   allowlists, **11 des 12 fichiers porteurs étaient hors des DEUX**. Le douzième,
    ///   `Shell/DailyReviewScreenController.cs`, y figurait — mais comme entrée SANS PORTEUR (0 accès
    ///   au token), ce qui l'a fait passer pour une entrée orpheline à nettoyer au lieu d'un écran
    ///   qui échappe à la garde. *Les gardes de population ne sont pas fausses : elles mesurent une
    ///   population qui exclut les écrans porteurs du défaut.*
    ///
    /// ⛔⛔⛔ RÉTRACTATION — LA PREMIÈRE VERSION DE CETTE DOCSTRING PORTAIT UNE MESURE QUE PERSONNE
    ///   N'A PRISE. Elle attribuait à « le juge ⊥ de ⑯ » deux couleurs relevées sur le titre et sur
    ///   la référence, et en concluait que l'écran peignait son titre avec la teinte des légendes.
    ///   Vérifié : **il n'existe aucun rapport de juge pour ⑯** — son propre mandat le dit en
    ///   toutes lettres (« aucune capture prise pour ce mandat ; aucun rapport précédent lu »), et
    ///   la valeur citée pour le rendu est en fait une ligne d'un tableau HUD v3.1 sans rapport,
    ///   où elle est marquée conforme. L'autre valeur n'existe nulle part dans l'arbre.
    ///   ⇒ MESURE RÉELLE, prise sur les deux images : dans la bande du titre de
    ///     `revue-du-jour/reference-1080x2102.png` la couleur claire dominante est (242,201,107)
    ///     sur 672 pixels — soit `hudMoneyGold` à distance **0,0** ; dans la capture en jeu
    ///     `Assets/Screenshots/revue_du_jour_seuil-force-0.1_1080x2400.png`, même bande, (242,201,106)
    ///     sur 471 pixels. **Le titre était déjà juste.** Il n'y avait pas de couleur à corriger.
    ///   ★ Ce qui rend la faute instructive : une prescription (« passer le titre en `hudMoneyGold` »)
    ///     était EXACTE, et la mesure qui la justifiait était INVENTÉE. Un correctif juste ne
    ///     valide pas la mesure qui l'a motivé — et l'appariement par la valeur, lui, désignait un
    ///     autre token que le bon (4,4 contre 11,0) parce qu'il partait de la cible fabriquée.
    ///     *Une mesure fausse peut désigner le bon geste et le mauvais objet dans la même phrase.*
    ///
    /// ⇒ CE QUE ⑯ A RÉELLEMENT PRODUIT, ET C'EST ASSEZ : neuf recopies dans un seul fichier — huit
    ///   champs de couleur et une balise de texte riche — toutes à distance 0,00 de leur token.
    ///
    /// ⚠️ LE GABARIT EST INNOCENT, et c'est une information, pas un détail. `Tools/nouvel-ecran.py`
    ///   porte ZÉRO de ces littéraux (vérifié) — contrairement à TD-554, il n'y a donc **pas de
    ///   source à corriger**. Cette garde est la SEULE fermeture possible : sans elle, le treizième
    ///   arrive au prochain écran, par recopie d'écran à écran.
    ///
    /// ⚠️ ELLE ROUGIT SUR SON DÉNOMINATEUR MESURÉ LE JOUR OÙ ELLE ENTRE, ET C'EST VOULU. Elle rougit sur le
    ///   dénominateur MESURÉ, et chaque fichier repassé aux tokens nommés la fait descendre. Une
    ///   garde posée APRÈS les douze corrections n'aurait rien eu à prouver — et n'aurait donc
    ///   jamais montré qu'elle sait rougir.</summary>
    [Category("Palette")]
    public class LitterauxDeCouleurPlayModeTests
    {
        /// <summary>Le seuil, en unités 0-255 sur les trois canaux. 4 est au-dessus de l'arrondi
        /// d'un aller-retour hex→float→hex (au plus 1) et très en dessous du plus petit écart
        /// entre deux tokens voisins de la palette — c'est la marge, pas une tolérance de goût.</summary>
        private const double SeuilDistance = 4.0;

        private readonly struct Littoral
        {
            public readonly string Fichier;
            public readonly int Ligne;
            public readonly Color32 Valeur;
            public readonly string Source;
            public Littoral(string f, int l, Color32 v, string s) { Fichier = f; Ligne = l; Valeur = v; Source = s; }
        }

        // ⛔⛔ QUATRE FORMES, ET LES DEUX DERNIÈRES ONT ÉTÉ AJOUTÉES APRÈS COUP — par la garde
        // appliquée À ELLE-MÊME (2026-09-06, en corrigeant ⑯). La v1 en connaissait deux et se
        // croyait complète ; elle ratait :
        //   · `"#rrggbbaa"` — le motif exigeait le guillemet fermant après SIX chiffres, donc toute
        //     couleur écrite avec son alpha lui était invisible. **13 sites, dont 3 recopies
        //     exactes** de `hudMoneyUnderlineGold` (`#d9ab4e40`, `#d9ab4e55`) dans ⑤ et la boutique.
        //   · `<color=#rrggbb>` — une couleur DANS une chaîne de texte riche, sans guillemet collé
        //     au dièse. **1 site, et c'était une recopie**, dans ⑯ même.
        // ⇒ *Deux formulations du même faux demandent deux motifs*, et le corollaire qui manquait :
        //   un motif qui rend le résultat espéré est le moment de le DURCIR, pas de conclure. La v1
        //   rendait « 92 littéraux » — un chiffre assez gros pour avoir l'air exhaustif.
        // ⚠️ ET LE MÊME JEU DE MOTIFS VIT DANS `Tools/apparier-litteraux-aux-tokens.py`, qui sert à
        //   CORRIGER les fichiers. Les deux doivent balayer la même population : un instrument plus
        //   étroit que la garde fait déclarer « corrigé » un fichier que la garde verra rouge — ce
        //   qui est exactement arrivé sur ⑯ au premier passage.
        private static readonly Regex FormeHex = new Regex("\"#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?\"", RegexOptions.Compiled);
        private static readonly Regex FormeTexteRiche = new Regex("<color=#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?>", RegexOptions.Compiled);
        private static readonly Regex FormeNewColor = new Regex(
            @"new\s+Color\(\s*([0-9]*\.?[0-9]+)f?\s*,\s*([0-9]*\.?[0-9]+)f?\s*,\s*([0-9]*\.?[0-9]+)f?\s*[,)]",
            RegexOptions.Compiled);
        private static readonly Regex LigneCommentaire = new Regex(@"^\s*(///|//|\*|/\*)", RegexOptions.Compiled);

        /// <summary>UNE SEULE implémentation de balayage, employée par la mesure réelle ET par les
        /// contrôles — jamais deux chemins de calcul qui pourraient diverger entre eux (discipline
        /// de `ChromeTabAccentAllowlistPlayModeTests.ScanDirectory`, précédent maison).</summary>
        private static List<Littoral> Balayer(string racine)
        {
            var trouves = new List<Littoral>();
            if (!Directory.Exists(racine)) return trouves;

            foreach (string chemin in Directory.GetFiles(racine, "*.cs", SearchOption.AllDirectories))
            {
                string rel = chemin.Substring(racine.Length)
                    .TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
                    .Replace('\\', '/');
                string[] lignes = File.ReadAllLines(chemin);
                for (int i = 0; i < lignes.Length; i++)
                {
                    string l = lignes[i];
                    // Les commentaires sont EXCLUS, et ce n'est pas une commodité : un fichier qui
                    // DOCUMENTE la valeur d'un token (« --vert #7db36a ») ne la peint pas. Compter
                    // la mention comme le défaut pousserait à ne plus l'expliquer — on achèterait
                    // le zéro contre la mémoire de la raison.
                    if (LigneCommentaire.IsMatch(l)) continue;

                    foreach (Regex forme in new[] { FormeHex, FormeTexteRiche })
                    {
                        foreach (Match m in forme.Matches(l))
                        {
                            // Seuls les trois premiers octets sont comparés : l'alpha n'entre pas
                            // dans la distance. Une couleur recopiée PUIS rendue translucide reste
                            // une recopie — c'est la teinte qui doit suivre la palette, pas
                            // l'opacité, qui est un choix de composition propre au site.
                            string h = m.Groups[1].Value;
                            trouves.Add(new Littoral(rel, i + 1, new Color32(
                                byte.Parse(h.Substring(0, 2), NumberStyles.HexNumber),
                                byte.Parse(h.Substring(2, 2), NumberStyles.HexNumber),
                                byte.Parse(h.Substring(4, 2), NumberStyles.HexNumber), 255), m.Value));
                        }
                    }
                    foreach (Match m in FormeNewColor.Matches(l))
                    {
                        float r = float.Parse(m.Groups[1].Value, CultureInfo.InvariantCulture);
                        float g = float.Parse(m.Groups[2].Value, CultureInfo.InvariantCulture);
                        float b = float.Parse(m.Groups[3].Value, CultureInfo.InvariantCulture);
                        if (r > 1f || g > 1f || b > 1f) continue;   // pas une couleur normalisée
                        trouves.Add(new Littoral(rel, i + 1, new Color32(
                            (byte)Mathf.RoundToInt(r * 255f),
                            (byte)Mathf.RoundToInt(g * 255f),
                            (byte)Mathf.RoundToInt(b * 255f), 255), m.Value));
                    }
                }
            }
            return trouves;
        }

        /// <summary>Les tokens, lus sur l'asset RÉEL par réflexion — jamais une liste tenue à la
        /// main, qui testerait ma liste et non la palette. ⚠️ Lu DANS le test et non dans un
        /// initialiseur statique : `DesignTokens.Current` fait un `Resources.Load`, qui jette en
        /// contexte de constructeur — mesuré ici, 65 champs verts en run complet et rouges en run
        /// scopé à froid.</summary>
        private static Dictionary<string, Color32> Tokens()
        {
            DesignTokens t = DesignTokens.Current;
            Assert.IsNotNull(t, "DesignTokens.Current est null — la garde n'aurait aucune référence " +
                                "et son « 0 littéral fautif » ne vaudrait rien.");
            var d = new Dictionary<string, Color32>();
            foreach (FieldInfo f in typeof(DesignTokens).GetFields(BindingFlags.Public | BindingFlags.Instance))
            {
                if (f.FieldType != typeof(Color)) continue;
                d[f.Name] = (Color32)(Color)f.GetValue(t);
            }
            return d;
        }

        private static double Distance(Color32 a, Color32 b)
        {
            double dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
            return Math.Sqrt(dr * dr + dg * dg + db * db);
        }

        private static string PlusProche(Dictionary<string, Color32> tokens, Color32 c, out double d)
        {
            string nom = null; d = double.MaxValue;
            foreach (KeyValuePair<string, Color32> kv in tokens)
            {
                double x = Distance(c, kv.Value);
                if (x < d) { d = x; nom = kv.Key; }
            }
            return nom;
        }

        // ══ CONTRÔLES — exécutés comme des tests à part entière, pas comme des commentaires ══════
        // Le socle : un instrument qui rend « 0 » peut le rendre pour la mauvaise raison. Ces trois
        // cas fixent ce que la garde DOIT voir et ce qu'elle NE DOIT PAS voir, sur des fixtures
        // INERTES — jamais sur une ligne de production, qui disparaîtrait le jour où le lot réussit
        // et rendrait alors l'instrument aveugle au moment précis où le code va bien.

        [Test]
        public void Controle_Positif_UnLitteralQuiRecopieUnTokenEstVu()
        {
            Dictionary<string, Color32> tokens = Tokens();
            Assert.IsNotEmpty(tokens, "aucun token lu — anti-vacuité : la garde serait vraie à vide.");

            // La fixture est le cas RÉEL de ⑯, recopié ici comme donnée morte.
            var creme = new Color32(0xEA, 0xE0, 0xC8, 255);   // #eae0c8
            string nom = PlusProche(tokens, creme, out double d);
            Assert.Less(d, SeuilDistance,
                $"le littéral de ⑯ aurait dû être reconnu comme un token recopié ; plus proche = " +
                $"{nom} à {d:F1}. Si ce contrôle échoue, la garde ci-dessous rendrait « 0 » pour la " +
                "mauvaise raison.");
            Assert.AreEqual("hudCreme", nom, "et c'est hudCreme qu'il recopie, pas un voisin.");
        }

        [TestCase(255, 255, 255, TestName = "Contrôle négatif — le blanc pur n'est aucun token")]
        [TestCase(0x7A, 0x5A, 0x14, TestName = "Contrôle négatif — #7a5a14 est hors palette")]
        public void Controle_Negatif_UneCouleurHorsPaletteNEstPasComptee(int r, int g, int b)
        {
            Dictionary<string, Color32> tokens = Tokens();
            PlusProche(tokens, new Color32((byte)r, (byte)g, (byte)b, 255), out double d);
            Assert.GreaterOrEqual(d, SeuilDistance,
                $"rgb({r},{g},{b}) tombe à {d:F1} d'un token : le seuil accuserait une couleur " +
                "légitime, et la garde deviendrait un bruit qu'on finirait par désarmer.");
        }

        [Test]
        public void Controle_LeBalayage_VoitLesQuatreFormes()
        {
            string dir = Path.Combine(Path.GetTempPath(), $"td612_{Guid.NewGuid():N}");
            Directory.CreateDirectory(dir);
            try
            {
                File.WriteAllText(Path.Combine(dir, "Quatre.cs"),
                    "private static readonly Color A = Hex(\"#eae0c8\");\n" +
                    "img.color = new Color(0.918f, 0.878f, 0.784f);\n" +
                    "Color B = Hex(\"#d9ab4e40\");\n" +
                    "txt.text = \"a<color=#b9ad92> — b</color>\";\n" +
                    "// commentaire : Hex(\"#eae0c8\") documenté, NE DOIT PAS compter\n");
                List<Littoral> vus = Balayer(dir);
                // ⚠️ LE CONTRÔLE PORTE SUR CHAQUE FORME, PAS SUR LE TOTAL. Un `AreEqual(4, …)` nu
                //    resterait VERT si un motif ratait sa forme pendant qu'un autre en comptait une
                //    de trop — le compte juste pour la mauvaise raison. On nomme donc les quatre.
                Assert.AreEqual(4, vus.Count,
                    "le balayage doit voir les QUATRE formes et IGNORER la ligne de commentaire. Vu : " +
                    string.Join(" · ", vus.Select(v => $"{v.Ligne}:{v.Source}")));
                var sources = vus.Select(v => v.Source).ToList();
                Assert.IsTrue(sources.Any(s => s == "\"#eae0c8\""), "forme 1 (hex 6) non vue : " + string.Join(" · ", sources));
                Assert.IsTrue(sources.Any(s => s.StartsWith("new Color(")), "forme 2 (new Color) non vue : " + string.Join(" · ", sources));
                Assert.IsTrue(sources.Any(s => s == "\"#d9ab4e40\""), "forme 3 (hex 8, avec alpha) non vue — c'est le trou qui a laissé passer 3 recopies : " + string.Join(" · ", sources));
                Assert.IsTrue(sources.Any(s => s == "<color=#b9ad92>"), "forme 4 (texte riche) non vue — c'est le trou qui a laissé passer la 9e recopie de ⑯ : " + string.Join(" · ", sources));
                // Et la CLASSIFICATION, pas seulement la détection : un `#rrggbbaa` doit être
                // apparié sur ses trois premiers octets, sinon il serait vu ET jugé hors palette.
                Dictionary<string, Color32> tokens = Tokens();
                Littoral avecAlpha = vus.First(v => v.Source == "\"#d9ab4e40\"");
                string nomAlpha = PlusProche(tokens, avecAlpha.Valeur, out double dAlpha);
                Assert.Less(dAlpha, SeuilDistance,
                    $"`#d9ab4e40` doit être reconnu comme une recopie de son token (trouvé {nomAlpha} " +
                    $"à {dAlpha:F1}) : le voir sans le classer ne ferait que déplacer l'angle mort.");
            }
            finally { Directory.Delete(dir, recursive: true); }
        }

        // ══ LA MESURE RÉELLE ════════════════════════════════════════════════════════════════════

        [Test]
        public void AucunLitteralDeCouleurNeRecopieUnTokenNomme()
        {
            Dictionary<string, Color32> tokens = Tokens();
            Assert.IsNotEmpty(tokens, "anti-vacuité : aucun token lu.");

            string racine = Path.Combine(Application.dataPath, "Scripts");
            Assert.IsTrue(Directory.Exists(racine), $"Assets/Scripts introuvable à {racine}");

            List<Littoral> tous = Balayer(racine);
            // ⚠️ ANTI-VACUITÉ SUR LE BALAYAGE LUI-MÊME : « aucun fautif » et « rien balayé » ont la
            // même sortie sinon, et c'est le zéro le plus crédible qui soit.
            Assert.Greater(tous.Count, 0,
                "0 littéral de couleur dans tout Assets/Scripts : le balayage n'a rien lu, son " +
                "verdict ne vaut rien.");

            var fautifs = new List<string>();
            var fichiers = new HashSet<string>();
            foreach (Littoral l in tous)
            {
                string nom = PlusProche(tokens, l.Valeur, out double d);
                if (d >= SeuilDistance) continue;
                fautifs.Add($"{l.Fichier}:{l.Ligne}  {l.Source}  == {nom} (d={d:F1})");
                fichiers.Add(l.Fichier);
            }

            Assert.IsEmpty(fautifs,
                $"TD-612 — {fautifs.Count} littéral(aux) de couleur recopient la valeur d'un token " +
                $"nommé, dans {fichiers.Count} fichier(s), sur {tous.Count} littéraux balayés.\n" +
                "Valeur juste, chemin faux : aucune garde d'allowlist ne les voit (elles comptent " +
                "les ACCÈS au token), et aucun juge de pixels ne les voit tant que la valeur " +
                "coïncide. Repasser par le token NOMMÉ — et si la couleur voulue change, la changer " +
                "APRÈS, sinon on ajoute un littéral de plus et la garde reste aveugle.\n    " +
                string.Join("\n    ", fautifs));
        }
    }
}
