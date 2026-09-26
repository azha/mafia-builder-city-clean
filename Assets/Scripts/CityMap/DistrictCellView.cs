using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace MafiaCleanCity.CityMap
{
    // One district tile on the City Map. The background colour encodes the
    // control_state (the qualitative overlay); the label shows identity + size;
    // the optional heat badge shows the System Heat projection band.
    public class DistrictCellView : MonoBehaviour
    {
        public DistrictDto Model { get; private set; }
        public ControlState State { get; private set; }
        public BankSide Bank { get; private set; }
        public Image Background { get; private set; }
        public TextMeshProUGUI Label { get; private set; }

        // Heat overlay (set up by the controller; populated once heat is fetched).
        public GameObject HeatBadge { get; private set; }
        public Image HeatBadgeBg { get; private set; }
        public TextMeshProUGUI HeatBadgeLabel { get; private set; }
        public HeatBucket Heat { get; private set; }

        public void Bind(DistrictDto dto, Image background, TextMeshProUGUI label, bool compact = false)
        {
            Model = dto;
            Background = background;
            Label = label;
            State = CityMapEnums.ParseControlState(dto.control_state);
            Bank = CityMapEnums.ParseBankSide(dto.bank_side);

            background.color = CityMapEnums.ColorFor(State);
            // JUGE-D5 (audit visuel, 2026-08-21, balayage étendu à CityMap.cs/DistrictCellView.cs,
            // même périmètre CityMap/) — "blocks" traduit en "blocs" (terme déjà établi dans ce
            // dépôt, ex. DistrictInteriorScreenController.cs : "unité = le bloc").
                // ⛔ RÉCONCILIATION DU MERGE 2026-09-03 — les deux branches avaient raison sur des
                // choses DIFFÉRENTES, et prendre l'une aurait effacé l'autre en silence.
                //   · chantier C (2026-09-02) : la tuile affichait `name_canonical` (le nom de CODE,
                //     ex. « Verge-A ») alors que le back sert un nom de FICTION en français
                //     (`name`, ex. « La Lisière »). D'où `CityMapEnums.DisplayName`, qui choisit
                //     `name` avec repli EXPLICITE sur `name_canonical`.
                //   · lot « ville peinte » (2026-09-03) : le marqueur posé sur la ville a besoin du
                //     nom SEUL — profil et blocs vivent dans le panneau de détail. D'où `compact`.
                // Le lot peint, parti d'avant le merge de C, a rétabli `name_canonical` sans le
                // vouloir : ce n'était pas une décision, c'était son point de départ.
                // ⇒ On garde la FORME de l'un (`compact`) et la DONNÉE de l'autre (`DisplayName`).
                // ⚠️ Et ce n'est pas un arbitrage de goût : `CityMapRenderPlayModeTests:74` asserte
                // `StringAssert.Contains(CityMapEnums.DisplayName(cell.Model), cell.Label.text)` —
                // garder `name_canonical` ici ferait rougir le rendu dès qu'un district a un nom de
                // fiction. Le texte reste la donnée servie telle quelle ; les capitales du lettrage
                // de la maquette sont un STYLE (`FontStyles.UpperCase`, posé par `BuildMarqueur`),
                // jamais une réécriture de la donnée — `.ToUpperInvariant()` ici l'a fait rougir.
                label.text = compact
                    ? CityMapEnums.DisplayName(dto)
                    : $"{CityMapEnums.DisplayName(dto)}    ·    {TissuDeDistrict.EnLigne(dto.profile)}    ·    {dto.block_count} blocs";
        }

        /// <summary>Wire the heat badge UI (built by the controller). Hidden until heat is set.</summary>
        public void AttachHeatBadge(GameObject badge, Image badgeBg, TextMeshProUGUI badgeLabel)
        {
            HeatBadge = badge;
            HeatBadgeBg = badgeBg;
            HeatBadgeLabel = badgeLabel;
            Heat = HeatBucket.Unknown;
            HeatBadge.SetActive(false);
        }

        /// <summary>Apply a fetched heat band to this cell's badge (small colour swatch + text
        /// label). Retour user relayé par le contrôleur (2026-08-21) : « signalé sans pastille
        /// pleine » — `HeatBadgeBg` n'est plus le fond d'un pavé 80×24, c'est un petit carré-témoin
        /// de 14px (voir `CityMapController.BuildCell`) ; le texte reste NEUTRE (blanc, comme tout
        /// le reste de cet écran — `ReadableTextColor` n'a plus lieu d'être ici : il compensait le
        /// contraste contre un fond coloré qui n'existe plus. Fonction laissée définie, INCHANGÉE,
        /// dans `WorldDtos.cs` — jamais retirée pour un seul appelant qui cesse de l'utiliser).</summary>
        public void SetHeat(HeatBucket bucket)
        {
            Heat = bucket;
            Color c = CityMapEnums.HeatColorFor(bucket);
            if (HeatBadgeBg != null) HeatBadgeBg.color = c;
            if (HeatBadgeLabel != null)
            {
                HeatBadgeLabel.text = CityMapEnums.HeatLabel(bucket);
            }
        }

        /// <summary>Show or hide the heat badge (the overlay toggle).</summary>
        public void ShowHeat(bool visible)
        {
            if (HeatBadge != null) HeatBadge.SetActive(visible && Heat != HeatBucket.Unknown);
        }

        // ③ LA PRÉSENCE DU JOUEUR (ruling user du 24/09, ARBITRAGES D21 ; maquette PROPOSÉE `ecrans-brennar-3-presence.html`, atelier
        // 8616acc ; table 58). Un district où le joueur a des bâtiments porte l'état RATIFIÉ `mien` de la série 6 — nom en or, plus
        // grand (`.q.mien .nomq` : #f2c96b, 7,4 au lieu de 6,6), sol chaud — et, sous le nom, le NOMBRE en mots (`carte.presence.
        // batiments`, ICU). Sans icône : le pin « VOUS ÊTES ICI · ⌂ » de la maquette n'a jamais existé côté client.
        // ⚠️ Le sol du district est CUIT dans la texture : le « sol chaud » est un voile or SÉPARÉ (`SolMien`), sous le halo — le
        //    halo porte l'état de contrôle et le garde (Décidé (reco, 26/09)).

        /// <summary>Le nombre de bâtiments du joueur dans ce district (compté par le client sur `GET /v1/me/buildings`) ; 0 = pas à lui.</summary>
        public int BatimentsPossedes { get; private set; }
        public bool Mien => BatimentsPossedes > 0;
        public Image SolMien { get; private set; }
        public TextMeshProUGUI LignePresence { get; private set; }
        public const float EchelleNomMien = 7.4f / 6.6f;   // `.q.mien .nomq{font-size:7.4px}` contre `.nomq{font-size:6.6px}`
        private Color couleurNomRepos;
        private float tailleNomRepos;
        private bool nomAuReposMemorise;

        /// <summary>Branche les deux objets de la présence (bâtis par le contrôleur), cachés jusqu'à `PoserPresence`.</summary>
        public void AttachPresence(Image solMien, TextMeshProUGUI lignePresence)
        {
            SolMien = solMien;
            LignePresence = lignePresence;
            if (SolMien != null) SolMien.gameObject.SetActive(false);
            if (LignePresence != null) LignePresence.gameObject.SetActive(false);
        }

        /// <summary>Pose (n &gt; 0) ou retire (0) l'état `mien`. `ligne` null (clé non servie) ⇒ l'état `mien` SANS le nombre — le
        /// repli ordonné par l'orchestrateur, jamais un nombre composé par le client.</summary>
        public void PoserPresence(int n, string ligne)
        {
            BatimentsPossedes = n > 0 ? n : 0;
            if (Label != null)
            {
                if (!nomAuReposMemorise) { couleurNomRepos = Label.color; tailleNomRepos = Label.fontSize; nomAuReposMemorise = true; }
                Label.color = Mien ? MafiaCleanCity.Theme.DesignTokens.Current.hudMoneyGold : couleurNomRepos;
                Label.fontSize = Mien ? tailleNomRepos * EchelleNomMien : tailleNomRepos;
            }
            if (SolMien != null) SolMien.gameObject.SetActive(Mien);
            bool nombre = Mien && !string.IsNullOrEmpty(ligne);
            if (LignePresence != null)
            {
                LignePresence.text = nombre ? ligne : string.Empty;
                LignePresence.gameObject.SetActive(nombre);
            }
            // Le badge de chaleur descend sous la ligne du nombre quand elle est là (sinon ils se chevauchent).
            if (HeatBadge != null && LignePresence != null)   // le marqueur peint seulement : la tuile en colonnes a sa propre mise en page
            {
                var rt = (RectTransform)HeatBadge.transform;
                rt.anchoredPosition = new Vector2(rt.anchoredPosition.x, nombre ? -4f - LignePresenceHauteur : -4f);
            }
        }

        public const float LignePresenceHauteur = 18f;
    }
}
