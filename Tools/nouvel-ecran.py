#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Génère le squelette d'un écran Unity de ce projet — Client/Dtos/ScreenController/tests —
pour qu'une session parte d'une maquette RATIFIÉE avec un écran qui COMPILE, pas d'une page
blanche.

⛔ CE QUE CET OUTIL NE FAIT PAS. Il ne dessine rien : il pose les CONVENTIONS déjà mesurées sur
les 16 contrôleurs existants (IShellTenant, l'idiome enveloppe/payload/data des 13 Clients, le
patron CanvasRenderer-safe, les résolveurs nommés `Severity(x)→Color` de `HeatBucketResolver`)
et laisse des ancres `// MÉTIER ICI` partout où seule une lecture de la maquette et du corps
RÉEL mesuré peut trancher. Une fois posé, le squelette NE COMPILE PAS tel quel tant que ces
ancres n'ont pas été remplies — c'est voulu : un squelette qui compile en l'état masquerait le
travail qui reste, exactement le défaut qu'une garde décorative certifierait.

⛔ POURQUOI CHAQUE CONTRÔLEUR RÉPÈTE SES PROPRES PRIMITIVES UI (NouveauUI/AjouterFond/…) AU LIEU
D'HÉRITER D'UNE BASE COMMUNE. Mesuré sur ce dépôt (`main`, 2026-09-02) : AUCUN fichier ne définit
`NouveauUI`/`AjouterFond`/`NouveauTexte` comme méthode `static` partagée — chaque contrôleur les
redéclare `private`. C'est la convention RÉELLE, pas un oubli à corriger : introduire une base
partagée ici serait une décision d'architecture qui dépasse le mandat d'un outil de scaffold.
Ce générateur REPRODUIT donc la duplication existante plutôt que de la centraliser.

⛔ POURQUOI LE NAMESPACE EST `MafiaCleanCity.Operational` (PLAT) ET NON `.Operational.<Pascal>`.
Mesuré : le dépôt est split à peu près à égalité entre les deux conventions (BuildingCard/
Dashboard/Laundering en plat, Autonomy/Exceptions/Lieutenant en imbriqué). La référence ㊲ (le
SEUL écran construit ET jugé par deux juges, `ReputationScreenController` sur `pilote-B`) est en
PLAT — c'est le désaccord qu'on tranche en sa faveur, et ça évite d'avoir à ajouter une ligne
`using` dans `AppShell.cs` (`using MafiaCleanCity.Operational;` y est déjà, ligne 8).

Usage :
    nouvel-ecran.py --id screen_b3 --nom "La réputation" --tab More \\
        --routes "GET /v1/me/reputation,POST /v1/me/house-rules" \\
        --maquette Tools/juge-visuel/reputation/maquette.png

Refuse et NE TOUCHE RIEN si un seul des fichiers cibles existe déjà (vérifié pour TOUS les
fichiers avant d'en écrire UN SEUL — jamais d'écriture partielle).
"""
import argparse
import os
import re
import sys
import unicodedata
import uuid

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

HTTP_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE"}

ARTICLES = ("le ", "la ", "les ", "l'", "l’", "un ", "une ", "des ")


# ═══ Dérivation de noms — MESURÉE contre la référence ㊲, pas inventée ══════════════════════
#
# "La réputation" → "Reputation" (article retiré, accent retiré, un seul mot PascalCase) :
# c'est le SEUL exemple concret donné par la commande d'origine, donc la règle canonique.

def strip_accents(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def nom_to_pascal(nom):
    n = nom.strip().lower()
    for art in ARTICLES:
        if n.startswith(art):
            n = n[len(art):]
            break
    n = strip_accents(n)
    mots = re.split(r"[^a-zA-Z0-9]+", n)
    mots = [m for m in mots if m]
    if not mots:
        raise ValueError(f"--nom '{nom}' ne contient aucun caractère alphanumérique exploitable")
    return "".join(m[:1].upper() + m[1:] for m in mots)


def id_to_category(ecran_id):
    """screen_b3 -> ScreenB3 — patron mesuré sur `[Category("ScreenB3")]` de la référence ㊲."""
    parties = [p for p in re.split(r"[^a-zA-Z0-9]+", ecran_id) if p]
    if not parties:
        raise ValueError(f"--id '{ecran_id}' ne contient aucun caractère alphanumérique exploitable")
    return "".join(p[:1].upper() + p[1:] for p in parties)


def pascal_segment(seg):
    """'house-rules' -> 'HouseRules' ; ':id'/'{id}' -> None (c'est un paramètre, pas un mot)."""
    if seg.startswith(":") or (seg.startswith("{") and seg.endswith("}")):
        return None
    mots = re.split(r"[^a-zA-Z0-9]+", seg)
    mots = [m for m in mots if m]
    return "".join(m[:1].upper() + m[1:] for m in mots)


def param_name(seg):
    if seg.startswith(":"):
        return seg[1:]
    if seg.startswith("{") and seg.endswith("}"):
        return seg[1:-1]
    return None


# ═══ Routes ══════════════════════════════════════════════════════════════════════════════════

class Route:
    def __init__(self, method, path):
        self.method = method
        self.path = path
        segs = [s for s in path.strip("/").split("/") if s]
        # "v1" est toujours le premier segment de ce dépôt (mesuré : 100% des routes citées dans
        # les Clients existants) ; "me" marque un scope joueur-courant, ni l'un ni l'autre ne
        # porte de sens de RESSOURCE pour un nom de méthode.
        segs = [s for s in segs if s.lower() not in ("v1", "me")]
        self.segments = segs
        self.param_segments = [s for s in segs if param_name(s) is not None]
        self.params = [param_name(s) for s in self.param_segments]
        mots_pascal = [pascal_segment(s) for s in segs]
        mots_pascal = [m for m in mots_pascal if m]
        self.resource_pascal = "".join(mots_pascal) if mots_pascal else "Racine"
        verbe = {"GET": "Get", "POST": "Post", "PUT": "Put", "PATCH": "Patch", "DELETE": "Delete"}[method]
        self.ident = verbe + self.resource_pascal
        self.a_corps = method in ("POST", "PUT", "PATCH")

    def url_expr(self):
        """Une expression C# qui construit l'URL, EscapeURL sur chaque paramètre — construite
        par atomes (littéral / code) plutôt que par concaténation-puis-nettoyage, pour ne jamais
        laisser de `+ "" +` mort quand un paramètre est en bordure de chemin."""
        atomes = ["BaseUrl.TrimEnd('/')"]
        segs = self.path.strip("/").split("/")
        litteral = "/"
        for i, seg in enumerate(segs):
            p = param_name(seg)
            if p is not None:
                atomes.append(f'"{litteral}"')
                litteral = ""
                atomes.append(f"UnityWebRequest.EscapeURL({p})")
            else:
                litteral += seg
            if i < len(segs) - 1:
                litteral += "/"
        if litteral:
            atomes.append(f'"{litteral}"')
        return " + ".join(atomes)


def parse_routes(routes_str):
    routes = []
    for morceau in routes_str.split(","):
        morceau = morceau.strip()
        if not morceau:
            continue
        m = re.match(r"^([A-Za-z]+)\s+(\S+)$", morceau)
        if not m:
            raise ValueError(f"route illisible : '{morceau}' — attendu 'METHOD /chemin'")
        method, path = m.group(1).upper(), m.group(2)
        if method not in HTTP_METHODS:
            raise ValueError(f"méthode inconnue '{method}' dans '{morceau}' — attendu {sorted(HTTP_METHODS)}")
        if not path.startswith("/"):
            raise ValueError(f"chemin '{path}' devrait commencer par '/' (route '{morceau}')")
        routes.append(Route(method, path))
    if not routes:
        raise ValueError("--routes n'a produit aucune route exploitable")
    return routes


# ═══ AppShell.cs — LECTURE SEULE, jamais d'écriture (une autre session le tient) ═══════════════

def lire_tabs_appshell(appshell_path):
    """Retourne (liste des membres de `enum Tab`, dict tab -> controller déjà monté par
    `ActivateTab`). Mesuré à l'exécution, jamais recopié à la main — un enum qui bouge ne doit
    pas faire mentir cet outil."""
    src = open(appshell_path, encoding="utf-8").read()
    m = re.search(r"public enum Tab\s*\{([^}]*)\}", src)
    if not m:
        raise RuntimeError(f"'public enum Tab {{...}}' introuvable dans {appshell_path} — "
                            "AppShell.cs a-t-il changé de forme ?")
    membres = [t.strip() for t in m.group(1).split(",") if t.strip()]

    montages = {}
    for tm in re.finditer(r"case Tab\.(\w+):\s*\n((?:.*\n)*?)\s*break;", src):
        tab, corps = tm.group(1), tm.group(2)
        cm = re.search(r"MountTenant<(\w+)>\(\)", corps)
        montages[tab] = cm.group(1) if cm else "(destination vide)"
    return membres, montages


# ═══ Squelette des fichiers générés ═════════════════════════════════════════════════════════

def guid():
    return uuid.uuid4().hex


META_TEMPLATE = "fileFormatVersion: 2\nguid: {guid}\n"


def render_client(pascal, ecran_id, nom, routes):
    methodes = []
    for r in routes:
        params_sig = ", ".join(f"string {p}" for p in r.params)
        params_sig = (", " + params_sig) if params_sig else ""
        if r.a_corps:
            corps_type = f"{r.ident}Body"
            methodes.append(f"""
        /// <summary>`{r.method} {r.path}` → TODO(MÉTIER ICI) : corps de réponse réel non mesuré.
        /// Idempotency-Key posée par défaut (l'`IdempotencyInterceptor` global du back l'honore,
        /// qu'un `@Idempotent` explicite soit présent ou non côté contrôleur — patron
        /// `DailyReviewClient`) : à RETIRER si la route back ne le supporte pas.</summary>
        public IEnumerator {r.ident}(string bearer{params_sig}, {corps_type} corps,
                                     Action<{r.ident}ResponseDto> onOk, Action<long, string> onErr)
        {{
            string json = corps != null ? JsonUtility.ToJson(corps) : "{{}}";
            using (var req = new UnityWebRequest({r.url_expr()}, "{r.method}"))
            {{
                req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(json));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                req.SetRequestHeader("Idempotency-Key", Guid.NewGuid().ToString());
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                req.timeout = TimeoutSeconds;
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {{
                    {r.ident}ResponseDto dto =
                        JsonUtility.FromJson<{r.ident}Envelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) {{ onErr?.Invoke(0, "corps vide ({r.ident})"); yield break; }}
                    onOk?.Invoke(dto);
                }}
                else
                {{
                    string corpsErr = req.downloadHandler != null ? req.downloadHandler.text : null;
                    onErr?.Invoke(req.responseCode,
                                  $"{r.method} {r.path} a échoué ({{req.responseCode}}) {{req.error}} {{corpsErr}}");
                }}
            }}
        }}""")
        else:
            methodes.append(f"""
        /// <summary>`{r.method} {r.path}` → TODO(MÉTIER ICI) : corps de réponse réel non mesuré —
        /// dériver `{r.ident}ResponseDto` du CORPS RÉEL (juge-données), jamais de l'interface
        /// TypeScript back lue seule.</summary>
        public IEnumerator {r.ident}(string bearer{params_sig},
                                     Action<{r.ident}ResponseDto> onOk, Action<long, string> onErr)
        {{
            using (UnityWebRequest req = UnityWebRequest.Get({r.url_expr()}))
            {{
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {{
                    {r.ident}ResponseDto dto =
                        JsonUtility.FromJson<{r.ident}Envelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) {{ onErr?.Invoke(0, "corps vide ({r.ident})"); yield break; }}
                    onOk?.Invoke(dto);
                }}
                else onErr?.Invoke(req.responseCode,
                                   $"{r.method} {r.path} a échoué ({{req.responseCode}}) {{req.error}}");
            }}
        }}""")

    liste_routes = "\n".join(f"    // {r.method} {r.path}" for r in routes)

    return f"""using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational
{{
    // {ecran_id} « {nom} » — squelette généré par Tools/nouvel-ecran.py, MÉTIER ICI partout où
    // le corps RÉEL n'a pas encore été mesuré. Idiome enveloppe/payload/data + Idempotency-Key
    // sur les mutations, patron `DailyReviewClient`/`ReputationClient` (㊲, la référence à deux
    // juges). Routes couvertes :
{liste_routes}
    public class {pascal}Client
    {{
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;
{"".join(methodes)}
    }}
}}
"""


def render_dtos(pascal, ecran_id, nom, routes):
    classes = []
    for r in routes:
        classes.append(f"""
    /// <summary>`{r.method} {r.path}` — réponse. // MÉTIER ICI : lister les champs depuis le
    /// CORPS RÉEL mesuré (juge-données ⊥), jamais de l'interface TypeScript back lue seule.
    /// R2.2 — si un champ est une PROJECTION P5 (bande/liste), ne JAMAIS le réduire à un
    /// scalaire ici (ex. `declared_rules[]`, pas un compte).</summary>
    [Serializable]
    public class {r.ident}ResponseDto
    {{
        // MÉTIER ICI
    }}

    [Serializable] public class {r.ident}Payload {{ public {r.ident}ResponseDto data; }}
    [Serializable] public class {r.ident}Envelope {{ public {r.ident}Payload payload; }}""")
        if r.a_corps:
            classes.append(f"""
    /// <summary>Corps envoyé à `{r.method} {r.path}`. // MÉTIER ICI : lister les champs attendus
    /// par la route back (`*.controller.ts`) — jamais deviner un nom de clé.</summary>
    [Serializable]
    public class {r.ident}Body
    {{
        // MÉTIER ICI
    }}""")

    return f"""using System;

namespace MafiaCleanCity.Operational
{{
    // {ecran_id} « {nom} » — DTO générés par Tools/nouvel-ecran.py. Un warning de compilation
    // "field never assigned" est ATTENDU tant que les champs MÉTIER ICI ne sont pas remplis :
    // c'est le signal que ce fichier n'est pas encore fini, pas une erreur de l'outil.
{"".join(classes)}
}}
"""


def render_controller(pascal, ecran_id, nom, tab, routes, category):
    get_routes = [r for r in routes if r.method == "GET" and not r.a_corps]
    premiere_get = get_routes[0] if get_routes else routes[0]

    return f"""using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{{
    /// <summary>{ecran_id} « {nom} » — squelette généré par Tools/nouvel-ecran.py.
    ///
    /// Patron : `ReputationScreenController` (㊲, `pilote-B` — le seul écran construit ET jugé
    /// par juge-visuel ET juge-données). Ce squelette pose le contrat `IShellTenant`, un fond
    /// CanvasRenderer-safe et un résolveur exhaustif d'exemple ; il NE POSE PAS la géométrie de
    /// la maquette — ça, c'est `// MÉTIER ICI`, une fois la maquette lue.
    ///
    /// GÉOMÉTRIE — deux règles héritées, non négociables (mesurées ailleurs dans ce dépôt) :
    ///  · aucune valeur dérivée de `Screen.*` ni d'un `rect` lu au montage — passer par
    ///    `EchelleMaquette.Px(...)` avec la largeur DÉCLARÉE de LA maquette de cet écran
    ///    (`EchelleMaquette.LargeurEcransBrennar` = 300 par défaut pour les écrans de la famille
    ///    `ecrans-brennar.html` — // MÉTIER ICI : vérifier laquelle des 3 maquettes est la
    ///    source, ou ajouter une constante `Largeur<Nom>` si c'en est une quatrième).
    ///  · `Canvas.scaleFactor` lu la frame de la création rend 1,0 — plausible et faux. Toute
    ///    lecture de géométrie attend `yield return null` après la construction.</summary>
    public class {pascal}ScreenController : MonoBehaviour, IShellTenant
    {{
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- points d'injection du shell (IShellTenant) -----------------------------------
        private Transform mountParent;
        public void SetMountParent(Transform parent) => mountParent = parent;

        private string token;
        public void SetToken(string t) => token = t;

        // ---- crochets de test ---------------------------------------------------------------
        public {premiere_get.ident}ResponseDto DernierChargement {{ get; private set; }}
        public string DerniereErreur {{ get; private set; }}
        public long DernierCodeErreur {{ get; private set; }}

        private RectTransform racinePleinEcran;
        private {pascal}Client client;
        private bool initialise;

        private float Px(float css) =>
            EchelleMaquette.Px(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar);
        private int PxTrait(float css) =>
            EchelleMaquette.PxTrait(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar);

        private void Awake() => EnsureInitialized();

        private void EnsureInitialized()
        {{
            if (initialise) return;
            initialise = true;
            client = new {pascal}Client {{ BaseUrl = baseUrl }};
            BuildLayout();
        }}

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        /// <summary>Charge la surface. // MÉTIER ICI si `{premiere_get.ident}` a des paramètres
        /// de chemin (id, etc.) — ajouter les arguments correspondants ici et les faire
        /// remonter depuis l'appelant (le shell, ou un `RendrePourTest`).</summary>
        public IEnumerator Charger()
        {{
            EnsureInitialized();
            DerniereErreur = null;
            DernierCodeErreur = 0;

            yield return client.{premiere_get.ident}(token,
                dto => DernierChargement = dto,
                (code, msg) => {{ DernierCodeErreur = code; DerniereErreur = msg; }});

            // La frame de création rend des rects non résolus : on attend le layout AVANT de
            // rendre quoi que ce soit qui lise une géométrie.
            yield return null;

            if (DernierChargement == null) {{ RendreEtatIndisponible(); yield break; }}
            AppliquerEtat(DernierChargement);
        }}

        /// <summary>Rend un corps FABRIQUÉ, sans réseau — réservé aux tests (patron ㊲,
        /// `RendrePourTest`). Ne prouve jamais que le back émet ce corps, seulement ce que
        /// l'écran EN FAIT.</summary>
        public void RendrePourTest({premiere_get.ident}ResponseDto dto)
        {{
            EnsureInitialized();
            AppliquerEtat(dto);
        }}

        /// <summary>// MÉTIER ICI — TOUT le rendu métier de cet écran part d'ici. Vide à
        /// dessein : remplir depuis la maquette RATIFIÉE et le corps RÉEL mesuré, jamais depuis
        /// une supposition sur ce que l'interface TypeScript back "devrait" rendre.</summary>
        private void AppliquerEtat({premiere_get.ident}ResponseDto dto)
        {{
            // MÉTIER ICI
        }}

        /// <summary>Repli NOMMÉ sur échec réseau — jamais une exception, jamais un écran noir
        /// (patron ㊲ : `Render(null)` a fait planter un autre écran de ce dépôt à la première
        /// ligne qui lisait le payload).</summary>
        private void RendreEtatIndisponible()
        {{
            // MÉTIER ICI — au minimum, un texte d'état ; ne PAS laisser le rendu du chargement
            // précédent affiché (même défaut qu'une liste non vidée : ㊲ l'a payé).
        }}

        // ═══ Construction de la mise en page ═════════════════════════════════════════════════

        private void BuildLayout()
        {{
            Canvas canvas = FindFirstObjectByType<Canvas>();
            if (canvas == null)
            {{
                GameObject go = new GameObject("Canvas",
                    typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
                canvas = go.GetComponent<Canvas>();
                canvas.renderMode = RenderMode.ScreenSpaceOverlay;
                CanvasScaler sc = go.GetComponent<CanvasScaler>();
                sc.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
                sc.referenceResolution = new Vector2(1280, 720);
            }}
            Transform root = mountParent != null ? mountParent : canvas.transform;

            // La racine PLEIN ÉCRAN — jamais un panneau intermédiaire : c'est elle qui sert de
            // référence d'échelle à `Px()`/`PxTrait()` (un conteneur plus étroit fausserait
            // TOUTE la mise à l'échelle par un facteur muet).
            GameObject racine = NouveauUI("{pascal}Root", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            AjouterFond(racine, DesignTokens.Current.surfaceBase);

            // MÉTIER ICI — le reste de la mise en page (enseigne, blocs, listes…) se construit
            // ici, depuis la maquette. `ConstruireCerne`/`ConstruireEnseigne`/… de ㊲ montrent le
            // patron : un bloc = une méthode `Construire<Nom>(Transform parent)`.
        }}

        // ═══ Primitives — dupliquées par convention (aucun fichier du dépôt ne les partage,
        // mesuré sur `main` le 2026-09-02) ═════════════════════════════════════════════════════

        private static GameObject NouveauUI(string nom, Transform parent)
        {{
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }}

        /// <summary>⛔ TOUTE Image passe par ici. `AddComponent&lt;T&gt;()` à l'exécution
        /// n'honore PAS le `[RequireComponent(CanvasRenderer)]` d'une classe de base — sans
        /// `CanvasRenderer`, un `Graphic` ne dessine RIEN, sans la moindre erreur console
        /// (mesuré sur ce dépôt : `VerticalGradientImage`, deux panneaux jamais visibles).
        /// Et un `Image` standard `UnityEngine.UI.Image` (utilisée ici) EST déjà `MaskableGraphic`
        /// — elle passe donc sous un `Mask` parent sans rien de plus à faire ; seul un `Graphic`
        /// personnalisé dérivé directement de `Graphic` (pas `MaskableGraphic`) aurait besoin
        /// d'un correctif de base en plus de ce `CanvasRenderer` explicite.</summary>
        private static Image AjouterImage(GameObject go)
        {{
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            return go.AddComponent<Image>();
        }}

        private static Image AjouterFond(GameObject go, Color couleur)
        {{
            Image img = AjouterImage(go);
            img.color = couleur;
            img.raycastTarget = false;
            return img;
        }}

        private static TextMeshProUGUI NouveauTexte(Transform parent, string nom, string texte,
                                                     float corpsPx, Color couleur, TMP_FontAsset police)
        {{
            GameObject go = NouveauUI(nom, parent);
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = police;
            t.text = texte;
            t.fontSize = corpsPx;   // un corps de texte à 0 est un défaut de rendu
            t.color = couleur;
            t.raycastTarget = false;
            return t;
        }}

        private static void Etirer(RectTransform rt, float marge = 0f)
        {{
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(marge, marge);
            rt.offsetMax = new Vector2(-marge, -marge);
        }}
    }}

    /// <summary>{ecran_id} — les correspondances « valeur du domaine → apparence », chacune en
    /// FONCTION NOMMÉE prenant la valeur du domaine (patron `HeatBucketResolver.SeverityColor` —
    /// jamais un tableau positionnel ni une chaîne de ternaires : mesuré sur ce dépôt, un
    /// balayage anti-régression écrit pour traquer ces correspondances rend ZÉRO sur un fichier
    /// qui les porte par l'ordre d'un tableau — la garde ne peut voir sa cible qu'APRÈS ce
    /// passage en fonction nommée).
    ///
    /// // MÉTIER ICI — `EtatDomaine` est un PLACEHOLDER : remplacer par l'enum réel du domaine
    /// (ex. `Severity`, `Posture`…) une fois le corps back mesuré, PUIS écrire le switch
    /// EXHAUSTIF sans `default` silencieux (un `default: throw` rend une 5ᵉ valeur BRUYANTE
    /// plutôt que collisionner avec un repli connu — patron `HeatBucketResolver`, note M2 :
    /// un `switch` STATEMENT C# sans `default` est une erreur de compilation CS0161, donc
    /// "exhaustif sans default" n'existe PAS ici — le détecteur d'un membre neuf est un TEST sur
    /// `Enum.GetValues(typeof(EtatDomaine))`, jamais le compilateur).</summary>
    public static class {pascal}Resolvers
    {{
        public enum EtatDomaine
        {{
            // MÉTIER ICI — remplacer par les valeurs RÉELLES du domaine.
            Inconnu = 0,
        }}

        public static Color CouleurPour(EtatDomaine etat)
        {{
            switch (etat)
            {{
                case EtatDomaine.Inconnu: return DesignTokens.Current.onSurfaceMuted;
                default: throw new System.ArgumentOutOfRangeException(nameof(etat), etat,
                    "{pascal}Resolvers.CouleurPour : membre de EtatDomaine non résolu.");
            }}
        }}
    }}
}}
"""


def render_tests(pascal, ecran_id, nom, category, routes):
    premiere_get = next((r for r in routes if r.method == "GET" and not r.a_corps), routes[0])
    return f"""using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{{
    /// <summary>{ecran_id} « {nom} » — squelette de suite généré par Tools/nouvel-ecran.py.
    ///
    /// ⛔ CE QUE CE SQUELETTE COUVRE : le montage structurel (CanvasRenderer, MaskableGraphic) et
    /// la capture pour le juge visuel. ⛔ CE QU'IL NE COUVRE PAS, et c'est // MÉTIER ICI partout
    /// où il manque : le PARCOURS joueur qui atteint cet écran (doctrine 4-couches, `CLAUDE.md`
    /// § « quatre couches ») — signup → `session/open` → la route, jamais un seed SQL sans le
    /// dire dans le nom du test. Le patron complet est `ReputationScreenPlayModeTests` (㊲,
    /// `pilote-B`) : `OuvrirJoueurFrais()` (signup + `session/close` défensif + lecture d'un
    /// lieutenant du kit de départ) — à adapter ici selon ce que `{premiere_get.ident}` exige
    /// réellement comme précondition.</summary>
    [Category("{category}")]
    public class {pascal}ScreenPlayModeTests
    {{
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {{
            GameObject reste = GameObject.Find("{pascal}Root");
            while (reste != null) {{ Object.DestroyImmediate(reste); reste = GameObject.Find("{pascal}Root"); }}
            if (hostGo != null) Object.Destroy(hostGo);
            hostGo = null;
        }}

        /// <summary>La racine RÉELLE de l'écran n'est PAS `hostGo` : hors shell, le contrôleur
        /// découvre un Canvas et bâtit dessous (patron ㊲, ligne pour ligne). Chercher
        /// `hostGo.GetComponentsInChildren` rendrait ZÉRO en silence.</summary>
        private GameObject RacineEcran()
        {{
            GameObject r = GameObject.Find("{pascal}Root");
            Assert.IsNotNull(r, "{pascal}Root introuvable : le contrôleur n'a pas construit sa " +
                                "mise en page (ni sous mountParent, ni sous un Canvas découvert)");
            return r;
        }}

        private {pascal}ScreenController MonterEcran()
        {{
            hostGo = new GameObject("{pascal}Screen", typeof(RectTransform));
            var ecran = hostGo.AddComponent<{pascal}ScreenController>();
            return ecran;
        }}

        // ═══ 1. GARDE STRUCTURELLE — ne lit aucun pixel, ne dépend d'aucune résolution ═══════

        /// <summary>⛔ TOUT `Graphic` PORTE SON `CanvasRenderer`, et TOUT Graphic sous ce fond
        /// est `MaskableGraphic` (donc masquable par un futur `Mask` parent) — patron ㊲, garde
        /// structurelle AVANT toute garde de valeur (c'est celle qui a fermé la classe
        /// "occlusion par fratrie" en 12 lignes là où 4 tours de gardes pixel n'y voyaient rien).
        ///
        /// ⚠️ Anti-vacuité : `AddComponent<{pascal}ScreenController>()` seul construit déjà le
        /// fond de `BuildLayout()` (appelé depuis `Awake()`), donc CETTE garde mord même sur le
        /// squelette non rempli — au moins 1 Graphic (le fond). Une fois le MÉTIER ICI de
        /// `BuildLayout()` rempli, relever le plancher `Assert.Greater(comptes, 1, ...)` vers une
        /// valeur qui reflète le contenu réel (㊲ l'a posé à 10).</summary>
        [UnityTest]
        public IEnumerator {category}S1_ToutGraphic_PorteSonCanvasRenderer()
        {{
            MonterEcran();
            yield return null;   // laisser Awake()/BuildLayout() s'exécuter

            var sansRenderer = new List<string>();
            var nonMaskable = new List<string>();
            int comptes = 0;
            foreach (Graphic g in RacineEcran().GetComponentsInChildren<Graphic>(true))
            {{
                comptes++;
                if (g.GetComponent<CanvasRenderer>() == null) sansRenderer.Add(g.name);
                if (!(g is MaskableGraphic)) nonMaskable.Add(g.name);
            }}

            Assert.Greater(comptes, 0,
                "0 Graphic dans l'arbre — l'écran n'a pas été construit, la garde suivante " +
                "serait vraie À VIDE");
            Assert.IsEmpty(sansRenderer,
                "des Graphic sans CanvasRenderer ne dessinent RIEN, en silence : " +
                string.Join(", ", sansRenderer));
            Assert.IsEmpty(nonMaskable,
                "des Graphic non-MaskableGraphic ignoreraient tout Mask parent (un `Graphic` nu " +
                "dérivé sur mesure, jamais `UnityEngine.UI.Image`/`TextMeshProUGUI`) : " +
                string.Join(", ", nonMaskable));
        }}

        // ═══ 2. CAPTURE pour le juge visuel ⊥ — deux résolutions ══════════════════════════════

        /// <summary>Patron ㊲ (`CapturerA`) : bascule le Canvas en `ScreenSpaceCamera` sur une
        /// `RenderTexture` de la taille CIBLE (le batchmode reste bloqué à 640 de large — capturer
        /// une résolution qu'on n'a pas passe par la caméra, pas par `-screen-width`), reconstruit
        /// le layout APRÈS la bascule (sinon on photographie une géométrie calculée pour 640), et
        /// cadre l'ortho sur le rect RÉEL du canvas (pas sur la résolution demandée : le
        /// CanvasScaler change les unités).
        ///
        /// ⚠️ `Canvas.scaleFactor` lu la frame de la création rend 1,0 — plausible et faux, d'où
        /// les `yield return null` avant tout rendu.</summary>
        [UnityTest, Category("Capture")]
        public IEnumerator {category}C1_CapturerPourLeJugeVisuel_DeuxResolutions()
        {{
            MonterEcran();
            yield return null;

            yield return CapturerA(1080, 1920, "Assets/Screenshots/{ecran_id}_1080x1920.png");
            yield return CapturerA(1080, 2400, "Assets/Screenshots/{ecran_id}_1080x2400.png");
        }}

        private IEnumerator CapturerA(int largeur, int hauteur, string chemin)
        {{
            GameObject racine = RacineEcran();
            Canvas canvas = racine.GetComponentInParent<Canvas>();
            Assert.IsNotNull(canvas, "{pascal}Root n'est sous aucun Canvas : rien ne peut être rendu");

            RenderMode modeAvant = canvas.renderMode;
            Camera cameraAvant = canvas.worldCamera;
            float planAvant = canvas.planeDistance;

            var rt = new RenderTexture(largeur, hauteur, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("CaptureCam{category}");
            var cam = camGo.AddComponent<Camera>();
            cam.targetTexture = rt;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Color.black;
            cam.orthographic = true;

            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = cam;
            canvas.planeDistance = 10f;
            Canvas.ForceUpdateCanvases();
            yield return null;

            LayoutRebuilder.ForceRebuildLayoutImmediate((RectTransform)racine.transform);
            Canvas.ForceUpdateCanvases();
            yield return null;
            yield return null;

            RectTransform crt = (RectTransform)canvas.transform;
            cam.orthographicSize = crt.rect.height / 2f;
            cam.aspect = crt.rect.width / crt.rect.height;

            cam.Render();
            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rt;
            var tex = new Texture2D(largeur, hauteur, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, largeur, hauteur), 0, 0);
            tex.Apply();
            RenderTexture.active = prev;
            System.IO.File.WriteAllBytes(chemin, tex.EncodeToPNG());

            // Anti-vacuité de FORME (patron ㊲) : une capture ratée est UNIFORME, peu importe sa
            // couleur — on compte les pixels qui diffèrent du fond dominant, pas les pixels
            // "clairs" (le fond lui-même peut être clair).
            Color[] pixels = tex.GetPixels();
            var histo = new Dictionary<int, int>();
            foreach (Color c in pixels)
            {{
                int k = (Mathf.RoundToInt(c.r * 31) << 10) | (Mathf.RoundToInt(c.g * 31) << 5) | Mathf.RoundToInt(c.b * 31);
                histo.TryGetValue(k, out int n); histo[k] = n + 1;
            }}
            int dominant = 0;
            foreach (var kv in histo) if (kv.Value > dominant) dominant = kv.Value;
            int horsFond = pixels.Length - dominant;
            Assert.Greater(horsFond, 0,
                $"capture {{largeur}}x{{hauteur}} entièrement UNIFORME — l'écran n'a rien rendu " +
                "hors de son propre fond (plancher volontairement bas : le squelette n'a pas " +
                "encore de contenu MÉTIER ICI ; le durcir une fois BuildLayout() rempli)");

            canvas.renderMode = modeAvant;
            canvas.worldCamera = cameraAvant;
            canvas.planeDistance = planAvant;
            Object.Destroy(camGo);
            rt.Release();
            yield return null;
        }}

        // MÉTIER ICI — ajouter ici les tests de PARCOURS (signup → session/open → la route) et
        // les tests d'état (AppliquerEtat sur un corps fabriqué via RendrePourTest), patron ㊲
        // §§ 1/3/5 de ReputationScreenPlayModeTests.
    }}
}}
"""


def render_dossier(ecran_id, nom, tab, routes, maquette, category):
    routes_lignes = "\n".join(f"  - `{r.method} {r.path}`" for r in routes)
    maquette_ligne = maquette if maquette else "<non fourni au générateur — à compléter>"
    return f"""# Dossier du juge visuel — {ecran_id} — r1 — <AAAA-MM-JJ>

> Généré depuis `.claude/skills/juge-visuel/dossier-gabarit.md` (dépôt back) par
> `Tools/nouvel-ecran.py`. Tout ce qui est entre chevrons se remplace ; tout ce qui ne peut pas
> être rempli se dit « non fourni » avec la raison — jamais supprimé.

## L'écran

- **Nom** : {nom} (`{ecran_id}`)
- **Ce qu'on vient y faire** : <une phrase de produit, pas de code — MÉTIER ICI>
- **Chemin joueur pour y arriver** : onglet `{tab}` (AppShell.Tab.{tab})
- **États capturés** : <ex. jour et nuit · vide et plein · sélection 1> — et pourquoi ceux-là.
- **Routes du domaine** :
{routes_lignes}

## Référence (fait autorité : l'IMAGE)

| fichier | rôle | taille px | facteur de rendu | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `{maquette_ligne}` | rendu ratifié | <W×H> | <ex. ×2> | <ex. 300 CSS = 1280 u (canvas)> |
| `<…-reference-source.html>` | source HTML/CSS (aide de lecture, ne prime jamais sur l'image) | — | — | — |

- **Script de rendu** : `<Tools/…-reference-render.sh>` — <date du rendu> ; assertion de largeur : <ok>.
- **Polices — ce qui a RÉELLEMENT rendu** (`fc-match` sur la machine du rendu) :

      <famille CSS 1>  →  <fc-match>
      <famille CSS 2>  →  <fc-match>

  Le client embarque : DejaVu Sans / DejaVu Serif (à confirmer sur cet écran).
  ⇒ Un écart de FAMILLE de police est un ARBITRAGE, pas un défaut.

## Captures en jeu (Play Mode réel, locataire réel)

| fichier | résolution | rect imprimé par le test | état | test |
|---|---|---|---|---|
| `Assets/Screenshots/{ecran_id}_1080x1920.png` | 1080×1920 | <ligne du log> | <jour> | `{category}C1_CapturerPourLeJugeVisuel_DeuxResolutions` |
| `Assets/Screenshots/{ecran_id}_1080x2400.png` | 1080×2400 | <ligne du log> | <jour> | `{category}C1_CapturerPourLeJugeVisuel_DeuxResolutions` |

- Garde anti-vide du test : pixels hors du fond dominant > 0 (plancher bas — squelette non rempli).
- Commit du client au moment des captures : `<sha>` (une capture est une mesure DATÉE, pas une
  propriété du commit — la prendre APRÈS le dernier correctif).

## Échelle — OBLIGATOIRE, jamais déduite par le juge

Trois nombres, toujours les trois :

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE | <…> | <…> | **<…>** |
| CAPTURE   | <…> | <…> | **<…>** |
| | | **rapport capture ÷ référence** | **<…>** |

- Dire explicitement que ce rapport est **NORMAL**, et que **toute mesure se ramène en px CSS**
  avant de conclure à un écart.
- Dire aussi ce que la normalisation NE couvre pas : les rapports INTERNES restent des défauts
  réels même après normalisation.

## Règles de doctrine applicables

- gouttière : le contenu d'écran reste dans le rect du fond ; seul le chrome traverse
- contraste : ≥ 3:1 grands textes, ≥ 4,5:1 petits (sur l'art réel, pas un gris choisi)
- langue affichée : français, via résolveurs nommés (aucun enum brut à l'écran)
- safe area / portrait : le projet est configuré portrait seul
- **animation : AUCUNE sur un nouvel écran** (ruling user 2026-08-27) : fournir deux captures du
  même état à T et T+1 s ; le juge exige 0 pixel différent

## Écarts ASSUMÉS (à inventorier, à classer ASSUMÉ, à vérifier « rendu proprement »)

| écart | raison mesurée | source |
|---|---|---|
| <à remplir> | <…> | <…> |

## Format du RAPPORT — imposé

Un finding par ligne, dans UNE table :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \\| `MAJEUR` \\| `MINEUR` | `DÉJÀ APPLIQUÉ` \\| `NOUVEAU` | <l'écart> | <les nombres> | <ou vide> |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation du chantier ;
- les rapports des juges précédents (`Tools/juge-visuel/{ecran_id}/r<k>/`, k < 1) — aucun ici, r1.
- toute capture « avant » — sauf si listée ci-dessus avec la preuve qu'UNE seule variable change.
"""


# ═══ Orchestration ══════════════════════════════════════════════════════════════════════════

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--id", required=True, help="ex. screen_b3")
    ap.add_argument("--nom", required=True, help="ex. 'La réputation'")
    ap.add_argument("--tab", required=True, help="membre de AppShell.Tab (mesuré à l'exécution)")
    ap.add_argument("--routes", required=True, help="'GET /v1/me/x,POST /v1/me/y'")
    ap.add_argument("--maquette", default=None, help="chemin de l'image de référence (PNG)")
    ap.add_argument("--repo-root", default=REPO_ROOT, help="racine du dépôt Unity (par défaut : ce worktree)")
    args = ap.parse_args()

    root = os.path.abspath(args.repo_root)
    appshell_path = os.path.join(root, "Assets/Scripts/Shell/AppShell.cs")
    if not os.path.isfile(appshell_path):
        print(f"ERREUR : {appshell_path} introuvable — --repo-root pointe-t-il vers le bon worktree ?",
              file=sys.stderr)
        return 1

    try:
        pascal = nom_to_pascal(args.nom)
        category = id_to_category(args.id)
        routes = parse_routes(args.routes)
        tabs, montages = lire_tabs_appshell(appshell_path)
    except (ValueError, RuntimeError) as e:
        print(f"ERREUR : {e}", file=sys.stderr)
        return 1

    if args.tab not in tabs:
        print(f"ERREUR : --tab '{args.tab}' n'est pas un membre de AppShell.Tab (mesuré : {tabs})",
              file=sys.stderr)
        return 1

    op_dir = os.path.join(root, "Assets/Scripts/Operational", pascal)
    test_path = os.path.join(root, f"Assets/Tests/PlayMode/{pascal}ScreenPlayModeTests.cs")
    dossier_path = os.path.join(root, f"Tools/juge-visuel/{args.id}/dossier.md")

    cibles = {
        "client": os.path.join(op_dir, f"{pascal}Client.cs"),
        "client_meta": os.path.join(op_dir, f"{pascal}Client.cs.meta"),
        "dtos": os.path.join(op_dir, f"{pascal}Dtos.cs"),
        "dtos_meta": os.path.join(op_dir, f"{pascal}Dtos.cs.meta"),
        "controller": os.path.join(op_dir, f"{pascal}ScreenController.cs"),
        "controller_meta": os.path.join(op_dir, f"{pascal}ScreenController.cs.meta"),
        "tests": test_path,
        "tests_meta": test_path + ".meta",
        "dossier": dossier_path,
    }

    # ⛔ REFUSE ET NE TOUCHE RIEN si UN SEUL fichier existe déjà — vérifié pour TOUS avant
    # d'écrire UN SEUL (jamais d'écriture partielle qui laisserait un écran à moitié généré).
    existants = [p for p in cibles.values() if os.path.exists(p)]
    if existants:
        print("ERREUR : refus d'écraser — ces fichiers existent déjà :", file=sys.stderr)
        for p in existants:
            print(f"  - {os.path.relpath(p, root)}", file=sys.stderr)
        print("Rien n'a été écrit.", file=sys.stderr)
        return 1

    os.makedirs(op_dir, exist_ok=True)
    os.makedirs(os.path.dirname(test_path), exist_ok=True)
    os.makedirs(os.path.dirname(dossier_path), exist_ok=True)

    def ecrire(chemin, contenu):
        with open(chemin, "w", encoding="utf-8", newline="\n") as f:
            f.write(contenu)

    ecrire(cibles["client"], render_client(pascal, args.id, args.nom, routes))
    ecrire(cibles["client_meta"], META_TEMPLATE.format(guid=guid()))
    ecrire(cibles["dtos"], render_dtos(pascal, args.id, args.nom, routes))
    ecrire(cibles["dtos_meta"], META_TEMPLATE.format(guid=guid()))
    ecrire(cibles["controller"], render_controller(pascal, args.id, args.nom, args.tab, routes, category))
    ecrire(cibles["controller_meta"], META_TEMPLATE.format(guid=guid()))
    ecrire(cibles["tests"], render_tests(pascal, args.id, args.nom, category, routes))
    ecrire(cibles["tests_meta"], META_TEMPLATE.format(guid=guid()))
    ecrire(cibles["dossier"], render_dossier(args.id, args.nom, args.tab, routes, args.maquette, category))

    print("Fichiers créés :")
    for cle, p in cibles.items():
        print(f"  - {os.path.relpath(p, root)}")

    # ── Bloc AppShell à COLLER — jamais écrit automatiquement (une autre session tient ce fichier) ──
    controleur_actuel = montages.get(args.tab, "(destination vide)")
    print(f"\n{'=' * 78}")
    print(f"AppShell.cs — NE PAS ÉDITER AUTOMATIQUEMENT. Bloc à coller dans `ActivateTab`,")
    print(f"dans le `switch (tab)` (méthode publique `ActivateTab(Tab tab)`) :")
    print(f"{'=' * 78}")
    if controleur_actuel != "(destination vide)":
        print(f"⚠️  Tab.{args.tab} monte DÉJÀ {controleur_actuel} (mesuré dans AppShell.cs). Coller "
              f"le bloc suivant REMPLACERAIT cet écran — coordonner avec la session qui tient "
              f"AppShell.cs avant de coller.")
    else:
        print(f"Tab.{args.tab} est actuellement une « destination vide » (rien à monter) —")
        print(f"REMPLACER le bloc `case Tab.{args.tab}:` existant par celui-ci :")
    print(f"""
                case Tab.{args.tab}:
                    MountTenant<{pascal}ScreenController>();
                    break;
""")
    print("(namespace `MafiaCleanCity.Operational` — déjà `using` en tête d'AppShell.cs, ligne 8 : "
          "aucune ligne `using` à ajouter.)")

    # ── Ligne front.md à coller ──────────────────────────────────────────────────────────────
    print(f"\n{'=' * 78}")
    print("front.md — ligne d'état à coller (racine du dépôt back) :")
    print(f"{'=' * 78}")
    print(f"- **État** : `[x]` **maquetté** (assumé — non vérifié par cet outil, `--maquette` "
          f"fourni : {args.maquette or 'NON'}) · juge-données ? · ratification ? · "
          f"`[~]` **construit** (squelette généré par `Tools/nouvel-ecran.py` — MÉTIER ICI à "
          f"compléter, `<sha>`) · `[ ]` **jugé** · `[ ]` **monté** (bloc AppShell ci-dessus à "
          f"coller, `<sha>`)")

    print(f"\nDossier juge-visuel : Tools/juge-visuel/{args.id}/dossier.md (à compléter — chemins "
          f"pré-remplis, mesures ⟨…⟩ restantes).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
