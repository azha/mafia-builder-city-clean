using System;
using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational.Exceptions;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Shell
{
    /// <summary>①-3 (2026-09-23, écart ① `e2bd7681` M8/D4, r9 M13) — CE QUE DIT le bandeau éphémère, et LEQUEL passe quand
    /// plusieurs ont de quoi dire. Mots de l'atelier (`22-…` §7.1 C, `c59ed038`), priorité proposée par lui et prise telle
    /// quelle : **descente > la ville chauffe > la 1ʳᵉ carte de la file > un rapport**. Un seul bandeau à la fois.
    /// Aucun chiffre (R2.2), aucune heure (point 16), aucun glyphe (point 15 : « j'aime pas les icônes » ; le canon posait
    /// ✉ ⚠ 🚨, l'atelier proposait `[!]` — ni l'un ni l'autre).
    /// ⚠️ La descente est celle du DISTRICT (`heat.escalated` = `isDistrictEscalated(joueur, district)` côté back) : seul ①
    /// la connaît. Hors district, le shell ne sonde qu'un district arbitraire (`HeatProbeDistrictId`) — son `escalated`
    /// ne dirait rien au joueur, il n'est pas lu.
    /// Le rapport (lot F du back, `69b34a78`) : le 1ᵉʳ rapport OUVERT de `GET /v1/autonomy-reports` (la route ne sert que les
    /// ouverts), lu une fois par session ; « {nom} a un rapport pour vous » est vrai tant qu'il est ouvert. Aucun « non lu »
    /// n'existe au back (classe A) : ce n'est pas ce que dit le bandeau.</summary>
    public sealed class AnnonceDuBandeau
    {
        /// <summary>Dans l'ordre de priorité.</summary>
        public enum Etat { Descente, VilleChaude, Carte, Rapport }

        public Etat Quoi { get; private set; }
        /// <summary>La phrase telle qu'on la lit, sans balise (gardes, captures).</summary>
        public string Phrase { get; private set; }
        /// <summary>La même, le nom en or (canon : `.bandeau-alerte b{color:var(--or-vif)}`).</summary>
        public string PhraseRiche { get; private set; }
        /// <summary>« trancher » / « lire », en or après la phrase ; null quand le bandeau n'invite à rien.</summary>
        public string MotAction { get; private set; }
        /// <summary>Ce qui a déjà été annoncé ne se rannonce pas : une carte par son id, la descente par son district,
        /// la ville par sa bande.</summary>
        public string Signature { get; private set; }

        // Le nom passe par un JETON, puis se remplace : `Libelle.Gabarit` n'est appelé qu'UNE fois par phrase (son repli
        // se compte ; l'appeler deux fois, pour la forme nue et la forme riche, compterait deux replis pour un mot).
        private const string JetonNom = "\u0001";

        /// <summary>Ce qui a le plus à dire, ou null. = `ParPriorite(…)[0]`.</summary>
        public static AnnonceDuBandeau Choisir(bool descente, string ouDescente, string citywideBucket,
                                                ExceptionCardDto premiereCarte, string nomRapport, string idRapport = null)
        {
            List<AnnonceDuBandeau> toutes = ParPriorite(descente, ouDescente, citywideBucket, premiereCarte, nomRapport, idRapport);
            return toutes.Count > 0 ? toutes[0] : null;
        }

        /// <summary>TOUT ce qui a de quoi dire, dans l'ordre de l'atelier. Le shell n'en montre qu'un (`Suivante`) : le plus
        /// prioritaire qui n'a pas encore été dit — sans cette liste, une carte déjà annoncée masquerait pour toute la session
        /// un rapport qui arrive derrière elle.</summary>
        public static List<AnnonceDuBandeau> ParPriorite(bool descente, string ouDescente, string citywideBucket,
                                                         ExceptionCardDto premiereCarte, string nomRapport, string idRapport = null)
        {
            var toutes = new List<AnnonceDuBandeau>();
            if (descente)
                toutes.Add(Simple(Etat.Descente, Libelle.Gabarit("chrome.bandeau.brigade_quadrille",
                    "La brigade quadrille le quartier — planquez la caisse"), "descente:" + ouDescente));

            HeatBucketResolver.Rank rang = HeatBucketResolver.ResolveRank(citywideBucket);
            if (rang == HeatBucketResolver.Rank.Hot || rang == HeatBucketResolver.Rank.Burning)
                toutes.Add(Simple(Etat.VilleChaude, Libelle.Gabarit("chrome.bandeau.les_indics_parlent",
                    "Les indics parlent : la brigade s’agite"), "ville:" + citywideBucket));

            if (premiereCarte != null && !string.IsNullOrEmpty(premiereCarte.exception_id))
            {
                string trancher = Libelle.De("chrome", "bandeau", "trancher");
                if (!ExceptionBandes.ParleUnLieutenant(premiereCarte))
                    toutes.Add(new AnnonceDuBandeau(Etat.Carte, Libelle.Gabarit("chrome.bandeau.la_ville_attend_vos_ordres",
                        "La ville attend vos ordres"), null, trancher, "carte:" + premiereCarte.exception_id));
                else
                    toutes.Add(new AnnonceDuBandeau(Etat.Carte, Libelle.Gabarit("chrome.bandeau.attend_vos_ordres",
                            "{nom} attend vos ordres", new Dictionary<string, string> { { "nom", JetonNom } }),
                        ExceptionBandes.Locuteur(premiereCarte), trancher, "carte:" + premiereCarte.exception_id));
            }

            if (!string.IsNullOrWhiteSpace(nomRapport))
                toutes.Add(new AnnonceDuBandeau(Etat.Rapport, Libelle.Gabarit("chrome.bandeau.rapport",
                        "{nom} a un rapport pour vous", new Dictionary<string, string> { { "nom", JetonNom } }),
                    nomRapport.Trim(), Libelle.De("chrome", "bandeau", "lire"),
                    "rapport:" + (string.IsNullOrEmpty(idRapport) ? nomRapport.Trim() : idRapport)));

            return toutes;
        }

        /// <summary>Ce que le bandeau dit MAINTENANT : la première annonce pas encore dite, et jamais une annonce MOINS
        /// prioritaire que celle qui est à l'écran (elle attendra le prochain appel ; elle n'est pas marquée comme dite).</summary>
        public static AnnonceDuBandeau Suivante(IEnumerable<AnnonceDuBandeau> parPriorite, Func<string, bool> dejaDite,
                                                AnnonceDuBandeau affichee)
        {
            foreach (AnnonceDuBandeau a in parPriorite)
            {
                if (dejaDite != null && dejaDite(a.Signature)) continue;
                if (affichee != null && a.Quoi >= affichee.Quoi) return null;
                return a;
            }
            return null;
        }

        /// <summary>Le nom du 1ᵉʳ rapport OUVERT (lot F), ou null. GARDE DE VALEUR, pas de présence : JsonUtility rend une
        /// instance VIDE quand `lieutenant` manque ; un nom blanc, ou égal à un identifiant (le nom qui ne serait qu'un id
        /// recopié), ne s'annonce pas.</summary>
        public static string NomDuPremierRapport(MafiaCleanCity.Operational.Autonomy.AutonomyReportDto[] rapports,
                                                 out string idRapport)
        {
            idRapport = null;
            if (rapports == null || rapports.Length == 0 || rapports[0] == null) return null;
            var r = rapports[0];
            string nom = r.lieutenant != null ? r.lieutenant.name : null;
            if (string.IsNullOrWhiteSpace(nom)) return null;
            nom = nom.Trim();
            if (nom == r.lieutenant_id || (r.lieutenant != null && nom == r.lieutenant.id) || nom == r.report_id) return null;
            idRapport = r.report_id;
            return nom;
        }

        private static AnnonceDuBandeau Simple(Etat quoi, string phrase, string signature) =>
            new AnnonceDuBandeau(quoi, phrase, null, null, signature);

        private AnnonceDuBandeau(Etat quoi, string gabarit, string nom, string motAction, string signature)
        {
            Quoi = quoi;
            MotAction = motAction;
            Signature = signature;
            string g = gabarit ?? string.Empty;
            string n = nom ?? string.Empty;
            Phrase = g.Replace(JetonNom, n);
            PhraseRiche = g.Replace(JetonNom, EnOr(n));
            if (!string.IsNullOrEmpty(motAction))
            {
                Phrase += " — " + motAction;
                PhraseRiche += " — " + EnOr(motAction);
            }
        }

        /// <summary>`<b>` du canon : or-vif, graisse 600. Le texte est SERVI (un nom de lieutenant) : `noparse`, pour qu'un
        /// chevron dans un nom ne devienne jamais une balise.</summary>
        private static string EnOr(string s)
        {
            if (string.IsNullOrEmpty(s)) return s;
            string or = ColorUtility.ToHtmlStringRGB(DesignTokens.Current.hudMoneyGold);
            return "<color=#" + or + "><b><noparse>" + s + "</noparse></b></color>";
        }
    }

    /// <summary>①-3 — LE BANDEAU ÉPHÉMÈRE du chrome (`hud-brennar.html`, bloc 4) : il remplace tout badge permanent
    /// (annotation 4 du canon : « les événements arrivent en bandeaux éphémères […] et s'effacent »).
    /// La source, recopiée :
    ///   `.bandeau-alerte{position:absolute;left:0;right:0;top:78px;display:flex;justify-content:center}`
    ///   `.bandeau-alerte div{background:linear-gradient(90deg,transparent,#0c1220ee 12%,#0c1220ee 88%,transparent);
    ///    color:var(--creme);font-size:11.5px;letter-spacing:.06em;padding:7px 34px;border-top:1px solid #ffffff14;
    ///    border-bottom:1px solid #ffffff14}` · `.bandeau-alerte b{color:var(--or-vif);font-weight:600}`
    /// Monté par `TopBarController` (additif), en coordonnées CSS de la barre : `top:78px` se lit depuis le haut de la barre.
    /// DURÉE : le canon n'en donne aucune ; l'atelier propose **5 s, ou jusqu'au toucher** — prise telle quelle, à ratifier au
    /// rendu. Le toucher fait ce que dit le mot en or (« trancher » ouvre la file), puis efface ; sans mot, il efface.
    /// ⚠️ Deux écarts DÉCLARÉS :
    ///   · le fond : `#0c1220` n'est pas un jeton ; `hudBarGlassBottom` (#0d131e, le verre de la barre) en est à 1-2/255,
    ///     à l'alpha du canon (`ee`). Un jeton de plus déplacerait `ExpectedTokenCount` pour un écart invisible ;
    ///   · la descente : le canon met en or « La brigade quadrille le Verge » ; la phrase servie est UNE clé, sans découpe,
    ///     et la couper au tiret serait régler sur une langue. Elle reste en crème.</summary>
    public sealed class BandeauEphemere : MonoBehaviour
    {
        public const float DureeParDefautS = 5f;
        private const float FonduS = 0.4f;
        private const float HautCss = 78f, MargeXCss = 34f, MargeYCss = 7f, CorpsCss = 11.5f;
        private const float LargeurRepliCss = 392f;   // la largeur du téléphone du canon, si la barre n'est pas encore posée
        private const float FonduLateral = 0.12f;     // `transparent … 12% … 88% … transparent`
        private const float AlphaFond = 0xee / 255f;
        private const float AlphaFilet = 0x14 / 255f;

        public bool Visible { get; private set; }
        public AnnonceDuBandeau Courante { get; private set; }
        /// <summary>Le texte affiché, sans balise ; null quand rien n'est affiché.</summary>
        public string TexteAffiche => Visible && Courante != null ? Courante.Phrase : null;
        public TextMeshProUGUI Texte { get; private set; }
        /// <summary>L'opacité RÉELLE du bandeau : 1 affiché, 0 absent, entre les deux pendant le fondu. Pour la garde d'une
        /// planche : elle doit asserter l'état qu'elle a CHOISI (1 ou 0), sinon une prise en plein fondu passerait.</summary>
        public float Opacite => Visible && groupe != null ? groupe.alpha : 0f;
        /// <summary>Levé à chaque apparition et à chaque effacement — ① y cède la place de son titre (r9 M11).</summary>
        public event Action<bool> VisibiliteChangee;

        private readonly HashSet<string> dejaAnnoncees = new HashSet<string>();
        private RectTransform rt;
        private CanvasGroup groupe;
        private Action surToucher;
        private Coroutine minuterie;

        public static BandeauEphemere Construire(Transform parent)
        {
            var go = new GameObject("BandeauEphemere", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var b = go.AddComponent<BandeauEphemere>();
            b.Batir();
            go.SetActive(false);
            return b;
        }

        private void Batir()
        {
            rt = (RectTransform)transform;
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 1f);
            rt.pivot = new Vector2(0.5f, 1f);
            rt.anchoredPosition = new Vector2(0f, -HautCss);
            groupe = gameObject.AddComponent<CanvasGroup>();

            var fondGo = new GameObject("Fond", typeof(RectTransform));
            fondGo.transform.SetParent(transform, false);
            Etirer((RectTransform)fondGo.transform, Vector2.zero, Vector2.zero);
            var fond = fondGo.AddComponent<Image>();
            // Le fond est l'ART, inconnu : un masque d'alpha teint par un jeton (la forme opaque de `HorizontalFade` peint un
            // fond connu, ce n'est pas le cas ici).
            fond.sprite = ProceduralUI.HorizontalFade(256, FonduLateral, 0f);
            fond.type = Image.Type.Simple;
            Color verre = DesignTokens.Current.hudBarGlassBottom;
            verre.a = AlphaFond;
            fond.color = verre;

            foreach (bool haut in new[] { true, false })
            {
                var f = new GameObject(haut ? "FiletHaut" : "FiletBas", typeof(RectTransform));
                f.transform.SetParent(transform, false);
                var frt = (RectTransform)f.transform;
                frt.anchorMin = new Vector2(0f, haut ? 1f : 0f);
                frt.anchorMax = new Vector2(1f, haut ? 1f : 0f);
                frt.pivot = new Vector2(0.5f, haut ? 1f : 0f);
                frt.sizeDelta = new Vector2(0f, 1f);
                frt.anchoredPosition = Vector2.zero;
                var img = f.AddComponent<Image>();
                Color blanc = Color.white;
                blanc.a = AlphaFilet;
                img.color = blanc;
                img.raycastTarget = false;
            }

            var texteGo = new GameObject("Texte", typeof(RectTransform));
            texteGo.transform.SetParent(transform, false);
            Etirer((RectTransform)texteGo.transform, new Vector2(MargeXCss, MargeYCss), new Vector2(-MargeXCss, -MargeYCss));
            Texte = texteGo.AddComponent<TextMeshProUGUI>();
            Texte.font = DesignTokens.Current.primaryFont;
            Texte.fontSize = CorpsCss;
            Texte.characterSpacing = 6f;                 // `.06em`
            Texte.color = DesignTokens.Current.hudCreme;
            Texte.alignment = TextAlignmentOptions.Center;
            Texte.richText = true;
            Texte.enableWordWrapping = true;
            Texte.raycastTarget = false;

            var bouton = gameObject.AddComponent<Button>();
            bouton.targetGraphic = fond;
            bouton.transition = Selectable.Transition.None;
            bouton.onClick.AddListener(Toucher);
        }

        /// <summary>Cette annonce a-t-elle déjà été dite dans la session ?</summary>
        public bool DejaAnnoncee(string signature) => signature != null && dejaAnnoncees.Contains(signature);

        /// <summary>Montre `a`, sauf s'il a déjà été annoncé dans cette session. Rend vrai s'il s'affiche.</summary>
        public bool Annoncer(AnnonceDuBandeau a, Action quandTouche, float dureeS = DureeParDefautS)
        {
            if (a == null || !dejaAnnoncees.Add(a.Signature)) return false;
            Courante = a;
            surToucher = quandTouche;
            Texte.text = a.PhraseRiche;
            Dimensionner();
            gameObject.SetActive(true);
            groupe.alpha = 1f;
            if (minuterie != null) StopCoroutine(minuterie);
            // Une barre inactive (un écran sans chrome) ne lance pas de coroutine : le bandeau attend alors le toucher.
            minuterie = gameObject.activeInHierarchy ? StartCoroutine(Effacement(dureeS)) : null;
            ChangerVisibilite(true);
            return true;
        }

        public void Effacer()
        {
            if (minuterie != null) { StopCoroutine(minuterie); minuterie = null; }
            surToucher = null;
            gameObject.SetActive(false);
            ChangerVisibilite(false);
        }

        /// <summary>Le toucher (`Button.onClick`) — public pour les gardes.</summary>
        public void Toucher()
        {
            Action a = surToucher;
            Effacer();
            a?.Invoke();
        }

        private IEnumerator Effacement(float dureeS)
        {
            yield return new WaitForSecondsRealtime(Mathf.Max(0f, dureeS));
            for (float t = 0f; t < FonduS; t += Time.unscaledDeltaTime)
            {
                groupe.alpha = 1f - t / FonduS;
                yield return null;
            }
            minuterie = null;
            Effacer();
        }

        private void ChangerVisibilite(bool v)
        {
            if (Visible == v) return;
            Visible = v;
            VisibiliteChangee?.Invoke(v);
        }

        /// <summary>Le `div` du canon prend la largeur de son texte (`display:flex;justify-content:center`) : marges 34 de
        /// part et d'autre, 7 dessus et dessous. Plus large que la barre, il prend la barre et passe à la ligne.</summary>
        private void Dimensionner()
        {
            var parent = transform.parent as RectTransform;
            float largeurMax = parent != null && parent.rect.width > 0f ? parent.rect.width : LargeurRepliCss;
            float texteMax = largeurMax - 2f * MargeXCss;
            Vector2 libre = Texte.GetPreferredValues(Texte.text, float.PositiveInfinity, float.PositiveInfinity);
            float largeurTexte = Mathf.Min(libre.x, texteMax);
            float hauteurTexte = Texte.GetPreferredValues(Texte.text, largeurTexte, float.PositiveInfinity).y;
            rt.sizeDelta = new Vector2(largeurTexte + 2f * MargeXCss, hauteurTexte + 2f * MargeYCss);
        }

        private static void Etirer(RectTransform r, Vector2 offMin, Vector2 offMax)
        {
            r.anchorMin = Vector2.zero;
            r.anchorMax = Vector2.one;
            r.offsetMin = offMin;
            r.offsetMax = offMax;
        }
    }
}
