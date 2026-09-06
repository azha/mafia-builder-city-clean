using System.Collections.Generic;
using UnityEngine;

namespace MafiaCleanCity.CityMap
{
    /// <summary>Le glyphe de type de bâtiment — le PREMIER consommateur des icônes produites par
    /// l'atelier. REUSE du seam éprouvé `Resources.Load` à CHEMIN CALCULÉ, celui des bustes de
    /// lieutenant (`LieutenantScreenController:2278`, `"Lieutenant/" + buste`) : le nom du fichier
    /// est dérivé de la clé du back, donc aucun nom d'asset ne vit en dur dans le C#, et un type
    /// neuf se couvre en DÉPOSANT UN FICHIER — zéro C# touché.
    ///
    /// ⛔⛔ POURQUOI CE FICHIER EXISTE — mesuré le 2026-09-07, oracle indépendant sur les 576 PNG
    /// livrés comme assets de jeu (Screenshots exclus : ce sont des SORTIES de capture, les mettre
    /// dans la population ferait accuser au hasard) :
    ///     524  ORPHELIN                        aucun GUID cité, aucun chemin C#
    ///      48  GUID cité dans un asset sérialisé
    ///       4  sous Resources/, chargé par chemin calculé
    /// Les 44 `icon_building_*` en faisaient partie : produits, importés en Sprite, conformes à la
    /// palette — et JAMAIS branchés. C'est la forme A appliquée à l'art (l'asset existe, zéro
    /// consommateur), et elle est invisible à toute garde : rien ne compile en rouge quand un PNG
    /// n'a pas de lecteur.
    ///
    /// ⚠️ LES DEUX MAILLONS QUI MANQUAIENT, et il n'y en avait que deux — le reste de la chaîne
    /// était déjà fait (fichier sous `Assets/`, `.meta` présent, importer `textureType: 8`
    /// `spriteMode: 1` `alphaIsTransparency: 1`, identique au buste qui, lui, s'affiche) :
    ///   1. JOIGNABLE AU RUNTIME — un PNG sous `Assets/Art/` n'entre dans le build que si un asset
    ///      sérialisé cite son GUID. D'où le déplacement sous un dossier `Resources`.
    ///   2. UN CONSOMMATEUR — ce fichier.
    /// ⇒ Le dossier est `Assets/Art/Icons/Resources/BuildingIcons/` et PAS `Assets/Resources/…` :
    ///   `W4P4aArtImportPostprocessor` est scopé au préfixe `Assets/Art/` et force
    ///   `textureType = Sprite`. Sortir de `Assets/Art/` aurait sorti ces fichiers de la discipline
    ///   d'import — invisible aujourd'hui (les réglages sont déjà dans le `.meta`, et le `.meta` a
    ///   suivi le fichier : GUID vérifiés identiques avant/après), fatal au premier ré-import.
    ///
    /// ⚠️ COUVERTURE 12/12 depuis le 2026-09-07 au soir — et le chemin par lequel elle y est
    /// arrivée vaut plus que le nombre. Le lot a été livré à **11/12** (`specialized_lab` n'avait
    /// pas d'icône), avec le 11 ASSERTÉ dans `CarteIconesPlayModeTests` plutôt que journalisé.
    /// L'atelier a livré le douzième dans l'heure ; l'épingle a rougi ; on l'a montée à 12 dans le
    /// même commit que le fichier. *C'est une épingle sur une DONNÉE : elle voit l'événement qu'un
    /// résolveur exhaustif ne verrait jamais* — ajouter un PNG n'est pas un changement de type, et
    /// une couverture écrite en prose serait restée « 11/12 » pour toujours.
    ///
    /// ⛔ LE CONTRAT RESTE `null` ⇒ MASQUER, et il ne change pas parce que la couverture est pleine
    /// aujourd'hui : le jour où le back ajoute un 13ᵉ `operational_type`, `Pour` rendra `null` et
    /// la cellule ne portera aucun glyphe. Jamais un repli partagé — il remettrait deux types sous
    /// la même image, c'est-à-dire exactement le défaut que le libellé de type existe pour réparer.
    /// Le libellé, lui, reste toujours : le libellé NOMME, le glyphe fait RECONNAÎTRE (2 glyphes
    /// sur 12 seulement parlent d'eux-mêmes), donc jamais de glyphe seul, et un glyphe manquant
    /// n'enlève rien à ce qui est lisible.</summary>
    public static class BuildingIcons
    {
        /// <summary>Racine sous `Resources/`. Le `_48` est la taille RASTÉRISÉE embarquée : les 4
        /// tailles produites (16/24/32/48) vivent dans l'atelier, une seule est livrée — tout ce qui
        /// est sous un `Resources` entre dans le build SANS élagage, donc embarquer les 4 coûterait
        /// 4× pour 3 jamais lues. 48 est la seule qui ne s'AGRANDIT jamais (bande de libellé la plus
        /// haute mesurée bien en deçà).</summary>
        private const string Prefixe = "BuildingIcons/icon_building_";
        private const string Suffixe = "_48";

        // ⛔ JAMAIS un initialiseur de champ statique : `Resources.Load` JETTE en contexte de
        //    constructeur, et ce dépôt a mesuré la conséquence (65 champs `static readonly Color`
        //    verts en suite complète, rouges en run scopé à froid — le voisin chauffait le cache).
        //    Le cache se remplit donc à l'appel, jamais au chargement du type.
        private static readonly Dictionary<string, Sprite> Cache = new Dictionary<string, Sprite>();

        /// <summary>Le glyphe d'un `operational_type`, ou `null` si l'atelier n'en a pas produit.
        /// `null` est une réponse LÉGITIME et le consommateur doit la traiter en masquant : un repli
        /// partagé remettrait 6 types sous la même image, c'est-à-dire exactement le défaut que le
        /// libellé de type existe pour réparer.</summary>
        public static Sprite Pour(string operationalType)
        {
            if (string.IsNullOrEmpty(operationalType)) return null;
            if (Cache.TryGetValue(operationalType, out var connu)) return connu;
            var s = Resources.Load<Sprite>(Prefixe + operationalType + Suffixe);
            Cache[operationalType] = s;   // le null est mémorisé AUSSI — sinon un type sans icône
                                          // repaie un Resources.Load par cellule et par rendu.
            return s;
        }

        /// <summary>Pour les détecteurs : combien de types de l'enum ont réellement un glyphe.
        /// ⛔ Ne PAS mémoriser ce compte dans un champ — il doit se recalculer, sinon il gèle la
        /// couverture du jour où on l'a écrit et devient une prose datée avec un `int` devant.</summary>
        public static int CompteCouverts(IEnumerable<string> types)
        {
            int n = 0;
            foreach (var t in types) if (Pour(t) != null) n++;
            return n;
        }
    }
}
