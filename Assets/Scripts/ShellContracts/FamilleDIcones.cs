using System.Collections.Generic;
using UnityEngine;

namespace MafiaCleanCity.Shell
{
    /// <summary>Une famille d'icônes montée sous un dossier `Resources`, adressée par la CLÉ DU BACK.
    ///
    /// ⛔ POURQUOI CE TYPE EXISTE PLUTÔT QU'UNE COPIE. Le seam des glyphes de bâtiment a été écrit
    /// le 2026-09-07 ; la famille des archétypes est arrivée deux heures plus tard et voulait
    /// exactement le même mécanisme — cache paresseux, chemin calculé, `null` légitime. Recopier
    /// aurait donné deux producteurs qui s'accordent aujourd'hui : *deux producteurs qui s'accordent
    /// ne rougissent jamais, donc la duplication est invisible en revue — elle ne coûte qu'au jour
    /// où l'une des deux copies bouge, et c'est alors l'AUTRE qu'on cherche.* Ce dépôt l'a déjà payé
    /// sur les libellés d'archétype (deux producteurs, neuf valeurs contre sept).
    ///
    /// ⛔ LE CHEMIN EST CALCULÉ DEPUIS LA CLÉ DU BACK, jamais écrit en dur : aucun nom d'asset ne
    /// vit dans le C#, et couvrir un type neuf = DÉPOSER UN FICHIER. C'est le seam éprouvé des
    /// bustes de lieutenant, pas un mécanisme inventé.
    ///
    /// ⚠️ `null` EST UNE RÉPONSE LÉGITIME, ET LE CONTRAT DE L'APPELANT EST DE MASQUER. Un repli
    /// PARTAGÉ remettrait deux clés sous la même image — exactement le défaut que les libellés
    /// existent pour réparer. Un glyphe faux est pire qu'un glyphe absent.</summary>
    public sealed class FamilleDIcones
    {
        private readonly string chemin;   // "<dossier sous Resources>/<préfixe de fichier>"
        private readonly string suffixe;
        // ⛔ JAMAIS un initialiseur de champ statique : `Resources.Load` JETTE en contexte de
        //    constructeur, et ce dépôt a mesuré la conséquence (65 champs `static readonly Color`
        //    verts en suite complète, rouges en run scopé à froid — un voisin chauffait le cache).
        private readonly Dictionary<string, Sprite> cache = new Dictionary<string, Sprite>();

        public FamilleDIcones(string dossierSousResources, string prefixeDeFichier, string suffixeDeFichier)
        {
            chemin = dossierSousResources + "/" + prefixeDeFichier;
            suffixe = suffixeDeFichier;
        }

        /// <summary>Le glyphe d'une clé de domaine, ou `null` si l'atelier n'en a pas produit.</summary>
        public Sprite Pour(string cle)
        {
            if (string.IsNullOrEmpty(cle)) return null;
            if (cache.TryGetValue(cle, out var connu)) return connu;
            var s = Resources.Load<Sprite>(chemin + cle + suffixe);
            cache[cle] = s;   // le null est mémorisé AUSSI — sinon une clé sans icône repaie un
                              // Resources.Load à chaque rendu de chaque ligne.
            return s;
        }

        /// <summary>Pour les détecteurs : combien de clés d'un domaine ont réellement un glyphe.
        /// ⛔ Ne PAS mémoriser ce compte : il doit se recalculer, sinon il gèle la couverture du jour
        /// où on l'a écrit et devient une prose datée avec un `int` devant.</summary>
        public int CompteCouverts(IEnumerable<string> cles)
        {
            int n = 0;
            foreach (var c in cles) if (Pour(c) != null) n++;
            return n;
        }
    }
}
