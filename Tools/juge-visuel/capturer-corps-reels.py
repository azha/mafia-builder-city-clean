#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""LES CORPS RÉELS PAR ÉCRAN — ce que le back RENVOIE, dossier par dossier, prêt pour le juge-donnees (§DA-4).

Pour chacun des dossiers de `Tools/juge-visuel/INDEX.md`, `corps-reels/<route>.json` = la réponse
RÉELLE des routes du mandat sur la pile dev — compte de démo (`operational_demo@example.test`, le
compte de `scripts/provision-demo-riche.mjs`), jamais un docblock — avec la date, le SHA du back, la
route, la méthode, les paramètres résolus, le statut HTTP, les en-têtes de trace et le corps.

CE QUE C'EST : le côté « ce que le back renvoie » du `juge-donnees` de clôture, pré-mesuré. CE QUE
CE N'EST PAS : un jugement (aucune comparaison avec la maquette ni avec l'écran ici).

MÉTHODE :
- routes = les chaînes `/v1/…` du DOSSIER du contrôleur (la même lecture que `construire-dossiers.py`) ;
  la MÉTHODE est lue dans le code autour du littéral (`kHttpVerbPOST` / `.Post(` ⇒ POST ; sinon GET) ;
- une route paramétrée (`{districtId}`, `…/nodes/` + id, `?building_id=`) est résolue depuis les corps
  DÉJÀ reçus (session/open, lieutenants, intérieur du district du joueur, listes) — jamais un id inventé ;
  sans instance sur le compte de démo ⇒ fichier « sans instance », qui dit QUEL corps aurait dû la
  fournir (c'est une information pour le juge-donnees, pas un trou) ;
- les MUTATIONS (POST/PUT/DELETE) ne sont PAS appelées : un corps réel obtenu en changeant l'état du
  compte de démo la veille des juges serait un corps réel d'un autre monde ; fichier « mutation non
  appelée », avec la route et la méthode ;
- `session/open` est appelé une fois (il est idempotent par clé et c'est la porte de tout le reste).

Chaque fichier porte `provenance` (date, back `main`, image game-back, X-Request-Id,
X-Server-Processed-At). `_index.json` par dossier récapitule. `INDEX.md` gagne une colonne `corps`
via `construire-dossiers.py --sans-rendu` (lancé à la fin).

Usage :  python3 Tools/juge-visuel/capturer-corps-reels.py [--controle] [--base http://localhost]
Env    :  MAFIA_DEMO_IDENTIFIER / MAFIA_DEMO_PASSWORD (repli : le compte de provision-demo-riche.mjs)
"""
import datetime, importlib.util, json, os, re, subprocess, sys, urllib.request, urllib.error, uuid

ICI = os.path.dirname(os.path.abspath(__file__))
CLIENT = os.path.abspath(os.path.join(ICI, "..", ".."))
BACK = os.path.expanduser("~/project/mafia-clean-city")
spec = importlib.util.spec_from_file_location("cd", os.path.join(ICI, "construire-dossiers.py"))
cd = importlib.util.module_from_spec(spec); spec.loader.exec_module(cd)

BASE = os.environ.get("STACK_BASE_URL", "http://localhost")
IDENT = os.environ.get("MAFIA_DEMO_IDENTIFIER", "operational_demo@example.test")
PASSWD = os.environ.get("MAFIA_DEMO_PASSWORD", "operational-demo-pw")

# paramètre → (clés candidates dans les corps reçus, corps à consulter d'abord)
PARAMS = {
    # ⛔ `home_district_id` N'EST PAS une clé du back : elle était INJECTÉE dans le corps capturé
    #    de `session/open` (retiré le 2026-09-06). La source honnête est `district_id`, une vraie
    #    clé du corps d'`interior`. ⚠️ L'ancienne source `city/district/{districtId}/interior` ne
    #    pouvait DE TOUTE FAÇON jamais matcher : la comparaison est `source in clé`, et la clé
    #    stockée est `city/district/<n>/interior` — le littéral `{districtId}` n'y figure pas.
    #    Une source qui ne matche jamais avait rendu l'injection « nécessaire ».
    "districtId":  (["district_id", "district"], ["interior"]),
    "buildingId":  (["building", "building_id"], ["interior"]),
    "lieutenantId": (["lieutenant_id"], ["lieutenants"]),
    "cardId":      (["card_id"], ["session/open"]),
    "flagId":      (["flag_id", "id"], ["flag-review"]),
    "beatId":      (["beat_id", "id"], ["news/feed", "news/beats"]),
    "caseId":      (["case_id", "id"], ["me/legal"]),
    "lawyerId":    (["lawyer_id", "id"], ["me/legal/lawyers", "me/legal"]),
    "feedId":      (["id", "feed_id", "item_id"], ["meta/horizon-feed"]),
    "hollowId":    (["hollow_id", "id"], ["random-world/active"]),
    "attendId":    (["id", "event_id", "beat_id"], ["ambient/feed"]),
    "optionId":    (["option_id", "id"], ["friction/replacement-options"]),
    "legId":       (["leg_id", "id"], ["supply-chain/graph"]),
    "substance":   (["substance", "substance_type"], ["operational/distribution/projection"]),
    "dealerId":    (["dealer_id", "id"], ["operational/dealers"]),
    # ⛔ TROU FERMÉ LE 2026-09-06 : sans cette entrée, `nodeId` partait avec ZÉRO source (le repli
    #    `([nom], [])` ne consulte aucun corps), donc la route rendait « aucune instance » alors
    #    que le corps frère porte quatre identifiants. La clé servie est `node`, PAS `node_id` —
    #    un repli sur le nom du paramètre ne pouvait pas la trouver.
    "nodeId":      (["node", "node_id", "id"], ["operational/laundering"]),
    "categoryId":  (["category_id", "id"], ["meta/task-categories"]),
    "id":          (["id"], []),
}
# dernier segment d'une route « préfixe + id » → nom de paramètre
SEGMENT_PARAM = {"nodes": "buildingId", "lieutenants": "lieutenantId", "beats": "beatId", "cases": "caseId",
                 "lawyers": "lawyerId", "horizon-feed": "feedId", "hollow": "hollowId", "attend": "attendId",
                 "replacement-options": "optionId", "legs": "legId", "recall-preview": "categoryId",
                 "hl-card": "cardId", "flag-review": "flagId", "district": "districtId", "dealer": "dealerId", "task-categories": "categoryId"}


UUID_OU_NUM = re.compile(r"/(?:[0-9a-fA-F]{8}-[0-9a-fA-F-]{20,}|\d+)(?=/|$)")
# ⛔ ET LES VALEURS DE QUERY SONT DES PARAMÈTRES AUSSI. `UUID_OU_NUM` ne voit un identifiant
#    qu'après une BARRE ; celui de `?building_id=<uuid>` lui échappait, donc l'uuid atterrissait
#    dans le NOM DU FICHIER. Mesuré le 2026-09-06 : chaque re-semis créait une paire de fichiers
#    neufs et laissait les précédents ORPHELINS — 4 accumulés, à côté du fichier correctement
#    nommé. Une base de preuve dont les noms de fichier changent à chaque re-semis n'est pas
#    comparable d'une passe à l'autre : c'est exactement ce que le nommage par `{id}` existe
#    pour éviter, et je l'avais fermé d'un seul côté.
VALEUR_QUERY = re.compile(r"(\?[a-z_]+=)[^&]*")


def slug(route, method):
    s = re.sub(r"[{}?=&/:]+", "_", route.replace("/v1/", "")).strip("_")
    return f"{method}_{s}.json"


def slug_reel(route_declaree, route_appelee, method):
    """Le nom du fichier suit la route RÉELLEMENT APPELÉE, jamais celle déclarée.

    ⛔ PAYÉ LE 2026-09-06. Une sonde a appelé `/v1/lieutenants/` — avec une barre finale — le back
       a résolu `/v1/lieutenants/{id}` et rendu le DÉTAIL d'un lieutenant ; le fichier a été écrit
       sous le nom de la route DÉCLARÉE, donc sous celui du roster. Deux routes, un seul nom : la
       seconde écrase la première, et le dossier annonce un roster en portant un détail.
       C'est la même faute que la clé fabriquée, version NOM DE FICHIER — l'outil dit avoir
       capturé une chose et en a capturé une autre.
    ⇒ On re-généralise la route appelée (les identifiants redeviennent `{id}`) et c'est ELLE qui
      nomme le fichier. Une route non appelée garde son nom déclaré : il n'y a rien d'autre.
    """
    if not route_appelee:
        return slug(route_declaree, method)
    r = VALEUR_QUERY.sub(r"\1", route_appelee)          # `?x=<valeur>` → `?x=` (un paramètre)
    return slug(UUID_OU_NUM.sub("/{id}", r).rstrip("/"), method)


def routes_avec_methode(ctl):
    chemins = subprocess.run(["grep", "-rl", f"class {ctl}\\b", os.path.join(CLIENT, "Assets/Scripts"), "--include=*.cs"],
                             capture_output=True, text=True).stdout.split()
    if not chemins:
        return []
    dossier = os.path.dirname(chemins[0])
    fichiers = [os.path.join(dossier, f) for f in sorted(os.listdir(dossier)) if f.endswith(".cs")]
    # les routes vivent souvent dans une classe `XClient` d'un AUTRE dossier (Shell/, CityMap/…) :
    # on suit les types `*Client` que le contrôleur nomme, partout sous Assets/Scripts
    src_ctl = open(chemins[0], encoding="utf-8").read()
    for cls in sorted(set(re.findall(r"\b([A-Z][A-Za-z]+Client)\b", src_ctl))):
        for ch in subprocess.run(["grep", "-rl", f"class {cls}\\b", os.path.join(CLIENT, "Assets/Scripts"), "--include=*.cs"],
                                 capture_output=True, text=True).stdout.split():
            if ch not in fichiers:
                fichiers.append(ch)
    # ⛔ CLÉ = (route, VERBE), pas la route seule. Mesuré le 2026-09-06 : `/v1/lieutenants` sert
    #    LES DEUX — POST pour recruter, GET pour le roster. Clé par route, le premier verbe
    #    rencontré gagnait, et c'était la mutation : le roster (le seul des deux qui ait un
    #    corps) disparaissait du dossier. Une route à deux verbes est DEUX routes.
    out = {}
    for chemin in fichiers:
        src = open(chemin, encoding="utf-8").read()
        # (a) la DÉCLARATION en docstring « GET /v1/… » — c'est la liste des routes et leur méthode, pas la donnée
        for m in re.finditer(r"///.*?\b(GET|POST|PUT|DELETE|PATCH)\s+(/v1/[A-Za-z0-9_/{}:.?=&-]+)", src):
            route = re.sub(r":([A-Za-z]+)", r"{\1}", m.group(2).rstrip(".?&"))
            route = re.sub(r"(\?[a-z_]+=)[^&]*$", r"\1", route)   # `?lieutenant_id=<valeur>` → paramètre à résoudre
            route = route.rstrip("-")                                # tiret de coupure de ligne d'un docstring
            out.setdefault((route, m.group(1)), m.group(1))
        # (a-bis) LES DÉCLARATIONS EN COMMENTAIRE DE LIGNE — `// GET /v1/…`, deux barres.
        #   Le balayage n'acceptait que les docstrings à TROIS barres et manquait donc 113
        #   déclarations exactes du client. Mesuré le 2026-09-06 : le roster de l'organigramme
        #   (`LieutenantClient`, qui construit ses URL par préfixe et ne porte aucun littéral
        #   `/v1/…`) était invisible, et son absence du dossier `famille` se lisait « pas de
        #   corps » au lieu de « pas vu par la sonde ».
        # ⛔ Une première version tentait de DÉDUIRE la route depuis `Url("<feuille>")`. Elle
        #   fabriquait des routes qui n'existent pas (`/v1/{id}/reassign`, la feuille prise pour
        #   une route entière) et se trompait de VERBE — un verbe faux est pire qu'une route
        #   manquante : il range un GET parmi les mutations, donc il n'est jamais appelé.
        #   Le commentaire, lui, PORTE le verbe et la route ; on le lit au lieu de le deviner.
        for m in re.finditer(r"^\s*//\s*(GET|POST|PUT|DELETE|PATCH)\s+(/v1/[A-Za-z0-9_/{}:.?=&-]+)",
                             src, re.M):
            route = re.sub(r":([A-Za-z]+)", r"{\1}", m.group(2).rstrip(".?&-"))
            route = re.sub(r"(\?[a-z_]+=)[^&]*$", r"\1", route)
            out.setdefault((route, m.group(1)), m.group(1))

        # (b) les littéraux `"/v1/…"` du code, méthode par proximité du verbe HTTP
        for m in re.finditer(r'\$?"(/v1/[^"]+)"', src):
            route = m.group(1)
            autour = src[m.start():m.start() + 400]
            avant = src[max(0, m.start() - 250):m.start()]
            methode = "POST" if re.search(r"kHttpVerbPOST|\.Post\(|UnityWebRequest\.Post|PostJson|\"POST\"", autour + avant) else "GET"
            if re.search(r"kHttpVerbPUT|\.Put\(", autour + avant):
                methode = "PUT"
            if re.search(r"kHttpVerbDELETE|\.Delete\(", autour + avant):
                methode = "DELETE"
            out.setdefault((route, methode), methode)
    # une route nue est absorbée par sa variante à query-string, à VERBE ÉGAL (les clés sont
    # désormais des couples : comparer les routes entre elles, pas les couples).
    for cle in list(out):
        route, verbe = cle
        if any(r != route and r.startswith(route + "?") and v == verbe for r, v in out):
            out.pop(cle)
    # (c) règle des verbes d'ACTION : une route qui se termine par un verbe est une mutation, quel
    #     que soit ce que la proximité a lu ; `auth/*` idem (jamais un GET).
    #     ⛔ `out` est clé par (route, verbe) : on RECONSTRUIT plutôt que de muter en place, sinon
    #        un changement de verbe changerait la clé sous l'itération.
    ACTIONS = re.compile(r"/(validate|dismiss|commit|skip|order|dispatch|purchase|adopt|recall"
                         r"|graduation|attend|batch-confirm|open|collect|report|hire|fire|sign"
                         r"|resolve|confirm)(/|$)")
    corrige = {}
    for route, verbe in out:
        if verbe == "GET" and (ACTIONS.search(route) or route.startswith("/v1/auth/")):
            verbe = "POST"
        corrige[(route, verbe)] = verbe
    out = corrige

    # ⛔ DEUX NOMS DE PARAMÈTRE, UNE SEULE ROUTE. `/v1/x/{districtId}/y` et `/v1/x/{id}/y` sont la
    #    MÊME route : le nom du placeholder est une convention d'écriture, pas une adresse. Les
    #    garder toutes deux produisait deux entrées qui réclamaient le même fichier — ma garde de
    #    collision l'a attrapé au premier rejeu, en refusant d'écrire plutôt qu'en écrasant.
    #    On garde la forme la plus NOMMÉE (`{districtId}` plutôt que `{id}`) : elle porte de
    #    l'information que la résolution de paramètre utilise.
    anonyme = re.compile(r"\{[A-Za-z_]+\}")

    def forme(route):
        """La FORME d'une route : noms de paramètres effacés, et une barre finale EST un
        paramètre — `/v1/x/` désigne `/v1/x/{id}`, c'est ce que le back en fait. Sans cette
        seconde règle, les deux s'écrivaient sous le même nom de fichier (mesuré le 2026-09-06 :
        `reputation` annonçait un roster et portait le détail d'un lieutenant)."""
        # TROIS formes du même paramètre, trouvées une par une par la garde de collision :
        #   `{nomExplicite}` · une barre finale nue · un identifiant LITTÉRAL (`/1`, un uuid)
        # Une déclaration qui donne un exemple concret décrit la même route que sa forme
        # paramétrée — les garder toutes deux réclamait un seul fichier pour deux routes.
        r = UUID_OU_NUM.sub("/{id}", route)
        r = anonyme.sub("{}", r)
        return r[:-1] + "/{}" if r.endswith("/") else r

    par_forme = {}
    # tri : à forme égale on garde la plus EXPLICITE — une route nommée bat `{id}`, et `{id}`
    # bat une barre finale nue (qui ne dit même pas qu'il y a un paramètre).
    # à forme égale, on garde la plus EXPLICITE, dans cet ordre de préférence :
    #   1. elle porte un paramètre NOMMÉ (`{categoryId}`) — c'est ce nom qui sert à le résoudre
    #   2. plutôt que `{id}` générique
    #   3. plutôt qu'un identifiant littéral (`/1`) ou une barre finale nue, qui n'annoncent
    #      même pas qu'il y a un paramètre
    for route, verbe in sorted(out, key=lambda k: (forme(k[0]), k[1],
                                                   "{" not in k[0], k[0].endswith("/"),
                                                   k[0].count("{id}"), k[0])):
        par_forme.setdefault((forme(route), verbe), (route, verbe))
    out = {v: v[1] for v in par_forme.values()}

    # préfixe nu dans le code : la route réelle est l'intérieur du district
    for k in [k for k in list(out) if k[0] == "/v1/city/district/"]:
        out.pop(k)
    # ⛔ N'AJOUTER QUE SI LA FORME N'EST PAS DÉJÀ LÀ. Mesuré le 2026-09-06 : cette ligne ajoutait
    #    `{districtId}` alors que le balayage avait déjà `{id}` — la même route sous deux noms de
    #    paramètre, donc DEUX entrées réclamant UN fichier. C'est cette ligne qui fabriquait la
    #    collision, pas le balayage ; le dédoublonnage au-dessus ne pouvait rien puisqu'il
    #    s'exécute AVANT elle. (Trouvé en instrumentant, pas en relisant : mon raisonnement
    #    portait sur la mauvaise paire et concluait que c'était impossible.)
    if not any(forme(r) == "/v1/city/district/{}/interior" and v == "GET" for r, v in out):
        out[("/v1/city/district/{districtId}/interior", "GET")] = "GET"

    return sorted(out)          # [(route, verbe), …] — une route à deux verbes rend DEUX entrées


class Pile:
    def __init__(self):
        self.token = None; self.corps = {}; self.entetes = {}; self.empreintes = {}

    def appel(self, methode, route, corps=None, cle=None):
        req = urllib.request.Request(BASE + route, method=methode, data=(json.dumps(corps).encode() if corps is not None else None))
        req.add_header("Content-Type", "application/json")
        if self.token:
            req.add_header("Authorization", "Bearer " + self.token)
        if cle:
            req.add_header("Idempotency-Key", cle)
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                statut, texte, h = r.status, r.read().decode("utf-8", "replace"), dict(r.headers)
        except urllib.error.HTTPError as e:
            statut, texte, h = e.code, e.read().decode("utf-8", "replace"), dict(e.headers)
        try:
            body = json.loads(texte)
        except Exception:
            body = {"_brut": texte[:2000]}
        return statut, body, {k: h.get(k) for k in ("X-Request-Id", "X-Server-Processed-At", "X-Api-Version")}

    def connecter(self):
        st, b, _ = self.appel("POST", "/v1/auth/signin", {"identifier": IDENT, "password": PASSWD})
        if st != 200 or "error" in b.get("payload", {}):
            raise SystemExit(f"signin {st} : {b}")
        self.token = b["payload"]["data"]["access_token"]
        st, b, h = self.appel("POST", "/v1/session/open", {"client_version": "da4-corps-reels-" + datetime.date.today().isoformat()}, cle=str(uuid.uuid4()))
        self.corps["session/open"] = b; self.entetes["session/open"] = (st, h)
        return st

    def get(self, route):
        st, b, h = self.appel("GET", route)
        cle = route.replace("/v1/", "")
        self.corps[cle] = b
        self.empreintes[cle] = _cles_du_corps(b)
        return st, b, h

    def verifier_integrite(self):
        """⛔ AUCUN corps capturé ne doit avoir changé depuis sa réception.

        Payé le 2026-09-06 : cet outil INJECTAIT `home_district_id` dans le corps de
        `session/open` pour se simplifier une résolution de paramètre. Le fichier livré portait
        donc 13 clés là où le back en rend 12, et 240 corps « réels » contenaient une donnée que
        le back ne dit pas. Un instrument de preuve qui FABRIQUE la donnée qu'il mesure est pire
        qu'un instrument absent : il est cru.
        ⇒ Cette garde ne surveille pas la clé fautive (elle serait scopée à l'instance) mais la
          PROPRIÉTÉ : un corps reçu est en lecture seule.
        """
        ecarts = []
        for cle, corps in self.corps.items():
            attendu = self.empreintes.get(cle)
            if attendu is None:
                continue                       # posé à la main (ex. alias) : rien à comparer
            vu = _cles_du_corps(corps)
            if vu != attendu:
                ecarts.append("  %s : %s" % (cle, {"ajoutées": sorted(vu - attendu),
                                                   "disparues": sorted(attendu - vu)}))
        return ecarts


def _cles_du_corps(b):
    """L'ensemble des clés de premier niveau du `payload.data` d'une réponse — ce qu'un E2E épingle."""
    if not isinstance(b, dict):
        return frozenset()
    d = (b.get("payload") or {}).get("data")
    return frozenset(d.keys()) if isinstance(d, dict) else frozenset()


def chercher(obj, cles, prof=0):
    """Première valeur scalaire d'une des clés, en profondeur (listes : premier élément)."""
    if isinstance(obj, dict):
        for k in cles:
            if k in obj and isinstance(obj[k], (str, int)) and obj[k] != "":
                return obj[k]
        for v in obj.values():
            r = chercher(v, cles, prof + 1)
            if r is not None:
                return r
    elif isinstance(obj, list):
        for e in obj[:5]:
            r = chercher(e, cles, prof + 1)
            if r is not None:
                return r
    return None


def resoudre(pile, nom, deja):
    """Résout un paramètre depuis les corps reçus ; dit d'où la valeur vient, ou pourquoi il n'y en a pas."""
    cles, sources = PARAMS.get(nom, ([nom], []))
    if nom == "substance":
        return "crick", "constante de démo (substances : ash · brindle · crick · hush)"
    if nom == "locale":
        return "fr", "constante : la fiction est servie en fr (TD-539) ; le compte de démo reste `en` tant que le seeder ne l'a pas basculé — on demande le bundle fr explicitement"
    for src in sources:
        for k, body in pile.corps.items():
            if src in k:
                v = chercher(body.get("payload", {}).get("data", body) if isinstance(body, dict) else body, cles)
                if v is not None:
                    return v, f"lu dans le corps de `{k}` (clé parmi {cles})"
    # ⛔ Deux échecs très différents portaient le même message, donc le trou de `nodeId` s'est lu
    #    pendant deux jours comme une absence de donnée. Un dispositif doit DÉCLARER SON RÉGIME :
    #    « aucune source configurée » est un défaut d'outil, « source lue, rien dedans » est un
    #    fait du compte. Mesuré le 2026-09-06 : sur les 15 paramètres rencontrés dans les corps,
    #    `nodeId` était le seul du premier genre (corrigé) ; `precinctId`, `appointmentId`,
    #    `storageId` et `grow-sessionId` sont du second — aucun corps frère servi ne porte leur
    #    identifiant, donc « aucune instance » est la bonne réponse et non un trou à combler.
    if not sources:
        return None, (f"AUCUNE SOURCE CONFIGURÉE pour `{nom}` (clés {cles}) — c'est un trou de "
                      f"cet outil, pas un fait du compte : ajouter son entrée dans PARAMS")
    return None, f"aucune instance sur le compte de démo — cherchée dans {sources} (clés {cles}), rien trouvé"


def parametrer(route):
    """Route brute du code → (route appelable ou None, params dict, raison)."""
    params = {}
    r = route
    for m in re.findall(r"\{([A-Za-z_]+)\}", r):
        if m == "id":
            seg = r.split("/{id}")[0].split("/")[-1]
            nom = SEGMENT_PARAM.get(seg, seg.rstrip("s") + "Id")
            r = r.replace("/{id}", "/{" + nom + "}", 1); params[nom] = None
        else:
            params[m] = None
    if r.endswith("/"):
        seg = r.rstrip("/").split("/")[-1]
        nom = SEGMENT_PARAM.get(seg, seg.rstrip("s") + "Id")
        params[nom] = None; r = r + "{" + nom + "}"
    if r.endswith("="):  # ?building_id=
        q = r.split("?")[-1].rstrip("="); nom = {"building_id": "buildingId", "lieutenant_id": "lieutenantId"}.get(q, q)
        params[nom] = None; r = r + "{" + nom + "}"
    return r, params


def _lire_drapeaux(argv):
    """⛔ Un drapeau inconnu est FATAL, il n'est pas ignoré.

    Payé le 2026-09-06 sans l'exécuter : `main` ne testait que `--controle`, donc un
    `--compte <autre>` passé de bonne foi aurait été ignoré EN SILENCE et l'outil aurait
    capturé le compte par défaut en annonçant l'autre. Une base de preuve entière aurait
    décrit le mauvais monde, sans un mot dans le log — la famille « l'outil rend un succès
    plausible pour n'avoir rien fait ».
    """
    connus = {"--controle"}
    avec_valeur = {"--compte": "ident", "--motdepasse": "passwd"}
    opts = {"controle": False, "ident": None, "passwd": None}
    i = 1
    while i < len(argv):
        a = argv[i]
        if a in connus:
            opts["controle"] = True; i += 1
        elif a in avec_valeur:
            if i + 1 >= len(argv):
                print(f"⛔ {a} attend une valeur"); sys.exit(2)
            opts[avec_valeur[a]] = argv[i + 1]; i += 2
        elif a.startswith("--") and "=" in a and a.split("=")[0] in avec_valeur:
            k, v = a.split("=", 1); opts[avec_valeur[k]] = v; i += 1
        else:
            print(f"⛔ drapeau inconnu : {a}")
            print(f"   connus : --controle · --compte <email> · --motdepasse <mdp>")
            print("   (ignorer un drapeau ferait capturer le mauvais compte en silence)")
            sys.exit(2)
    return opts


# ⛔⛔ DEUX HORLOGES DANS CE DÉPÔT, ET ELLES NE SE RESSEMBLENT PAS (mesuré par mafia-back,
#    2026-09-06) : `city_epoch.game_minute` est GLOBALE (une seule ligne) ;
#    `city_sim_clock.game_minute` est PAR JOUEUR. C'est la seconde qu'une provenance doit porter
#    — une empreinte prise sur la globale ne dirait rien du compte capturé.
#    ⚠️ Le piège concret : `GET /v1/_test/citysim/…` rend un champ nommé `game_minute` qui est le
#    GLOBAL. Une route qui rend le BON NOM et la MAUVAISE GRANDEUR ; elle répondrait 200 et on
#    l'inscrirait dans 240 manifestes sans qu'un contrôle bronche.
# ⛔ Ne PAS dériver l'une de l'autre. ORDRES DE GRANDEUR OBSERVÉS — mesures DATÉES ET SOURCÉES,
#    pas des propriétés du dépôt : le 2026-09-06 vers 01h5x UTC, sur le compte `operational_demo`
#    et lues par la session `mafia-back`, la globale était à ~1,5e3 quand l'horloge joueur était à
#    ~7,2e4, soit ~50 jours de jeu — tandis que `opened_game_day` du même compte rendait 37.
#    Douze jours d'écart, origine NON mesurée. ⇒ Ces nombres illustrent que les compteurs ne sont
#    pas deux vues d'une même grandeur ; ils ne valent pour AUCUN autre compte ni aucune autre
#    date, et surtout pas pour `demo_capture`. Relire la valeur au moment de la passe.
#    Les deux compteurs s'inscrivent tels que lus, jamais convertis.
HORLOGE_SQL = "SELECT game_minute FROM city_sim_clock WHERE player_id='%s';"


def lire_minute_de_jeu(player_id):
    """La minute de jeu DU JOUEUR, lue en base. Rend (valeur, source) ou (None, raison)."""
    if not player_id:
        # ⛔ Sans scope, la requête rendrait une ligne quelconque : refuser plutôt que de lire
        #    une grandeur qui n'est pas celle du compte capturé.
        return None, "player_id inconnu — refus de lire une horloge non scopée"
    r = subprocess.run(["docker", "compose", "-p", "mafia-clean-city", "exec", "-T", "pg",
                        "psql", "-U", "mafia", "-d", "mafia_clean_city", "-tAc",
                        HORLOGE_SQL % player_id], capture_output=True, text=True)
    brut = r.stdout.strip()
    # ⛔ `psql -tAc` rend une CHAÎNE VIDE quand la commande échoue : un échec ressemble trait
    #    pour trait à « pas de ligne ». Distinguer les deux, sinon la provenance porte un trou
    #    qui se lit comme un fait.
    if r.returncode != 0:
        return None, "psql a échoué (code %d) : %s" % (r.returncode, (r.stderr or "").strip()[:120])
    if brut == "":
        return None, "aucune ligne `city_sim_clock` pour ce joueur (le monde n'a pas encore tiqué ?)"
    if not brut.isdigit():
        return None, "sortie inattendue : %r" % brut[:60]
    return int(brut), "city_sim_clock.game_minute scopée sur player_id (lecture en base : aucune route joueur ne la projette — forme F)"


def main(argv):
    global IDENT, PASSWD
    opts = _lire_drapeaux(argv)
    controle = opts["controle"]
    if opts["ident"]:
        IDENT = opts["ident"]
    if opts["passwd"]:
        PASSWD = opts["passwd"]
    print(f"COMPTE CAPTURÉ : {IDENT}   (source : "
          f"{'--compte' if opts['ident'] else 'MAFIA_DEMO_IDENTIFIER ou défaut'})")
    date = datetime.datetime.now().isoformat(timespec="seconds")
    back_sha = subprocess.run(["git", "-C", BACK, "rev-parse", "--short", "main"], capture_output=True, text=True).stdout.strip()
    image = subprocess.run(["docker", "inspect", "-f", "{{.Config.Image}} {{.Created}}", "mafia-clean-city-game-back-1"], capture_output=True, text=True).stdout.strip()
    pile = Pile(); st = pile.connecter()
    print(f"session/open : {st} · back main {back_sha} · game-back {image[:60]}")
    # amorces : les corps qui fournissent les ids des routes paramétrées
    for r in ("/v1/lieutenants", "/v1/world/districts", "/v1/flag-review", "/v1/me/legal", "/v1/news/feed", "/v1/meta/horizon-feed",
              "/v1/ambient/feed", "/v1/random-world/active", "/v1/friction/replacement-options", "/v1/supply-chain/graph",
              "/v1/operational/dealers", "/v1/meta/task-categories",
              # ⛔ porte les identifiants de `{nodeId}` : sans amorce, la résolution dépendait
              #    de l'ordre des dossiers — un corps frère absent de la pile rend « aucune
              #    instance » alors que la donnée existe.
              "/v1/operational/laundering"):
        pile.get(r)
    # le district du joueur : celui dont l'intérieur porte ses bâtiments (mesuré, pas supposé)
    home = None
    for d in range(1, 19):
        st, b, _ = pile.get(f"/v1/city/district/{d}/interior")
        if st == 200 and (b.get("payload", {}).get("data", {}) or {}).get("buildings"):
            # ⛔ NE RIEN ÉCRIRE DANS UN CORPS CAPTURÉ. La version d'avant injectait ici
            #    `home_district_id` dans le corps de `session/open` : le back n'en rend rien, et
            #    les corps livrés portaient une clé de plus que ce que la route projette.
            #    Le district mesuré est un FAIT DE L'OUTIL (« le district dont l'intérieur porte
            #    ses bâtiments »), il vit dans la provenance, pas dans le corps du back.
            home = d; pile.corps["interior"] = b
            break
    print(f"district du joueur (bâtiments présents) : {home}")
    jour_de_jeu = ((pile.corps.get("session/open", {}).get("payload", {}) or {})
                   .get("data", {}) or {}).get("opened_game_day")
    print(f"jour de jeu à l'ouverture : {jour_de_jeu}")
    # l'identité vient d'une route JOUEUR ; seule la minute descend en base
    st_me, corps_me, _ = pile.get("/v1/me")
    player_id = chercher(corps_me if st_me == 200 else {}, ["player_id"])
    minute_de_jeu, source_horloge = lire_minute_de_jeu(player_id)
    print(f"player_id : {player_id}")
    print(f"minute de jeu (city_sim_clock, PAR JOUEUR) : {minute_de_jeu}  [{source_horloge}]")
    if minute_de_jeu is None:
        print("⚠️ la provenance portera l'absence et sa raison — jamais une valeur inventée,")
        print("   et surtout jamais l'horloge GLOBALE en remplacement (autre grandeur).")
    # ⛔ La garde a un CONSOMMATEUR, sinon elle serait retirée de bonne foi au prochain
    #    nettoyage. Elle tourne AVANT toute écriture : un corps altéré ne doit pas atteindre le
    #    disque, où il serait cru.
    ecarts = pile.verifier_integrite()
    if ecarts:
        print("⛔ UN CORPS CAPTURÉ A ÉTÉ MODIFIÉ DEPUIS SA RÉCEPTION — rien écrit.")
        print("   Un instrument de preuve qui fabrique la donnée qu'il mesure est cru.")
        print("\n".join(ecarts))
        sys.exit(1)
    print("intégrité des corps : %d vérifiés, aucun modifié ✅" % len(pile.empreintes))

    total = {"appelées": 0, "sans instance": 0, "mutations": 0, "erreurs": 0}
    lignes = ["| dossier | sym | routes | appelées | sans instance | mutations non appelées | erreurs HTTP |", "|---|---|---|---|---|---|---|"]
    for r in cd.TABLE + cd.HORS_APPSHELL:
        d = os.path.join(cd.JV, r["dossier"], "corps-reels"); os.makedirs(d, exist_ok=True)
        routes = routes_avec_methode(r["ctl"]) if not r["ctl"].startswith(("AppShell", "CueStack", "Recruitment", "Market")) else []
        if r["sym"] in ("③", "⑨", "⑤", "④", "⑯") and "/v1/session/open" not in dict(routes):
            routes.append(("/v1/session/open", "POST"))
        idx = []; c = {"appelées": 0, "sans instance": 0, "mutations": 0, "erreurs": 0}
        noms_pris = {}          # nom de fichier → route qui l'a pris (garde de collision)
        for route, methode in routes:
            fichier = os.path.join(d, slug(route, methode))
            # `jour_de_jeu` : la seule horloge que ce compte expose à cet outil. C'est un JOUR,
            # pas la minute que lit l'empreinte du back — l'écrire quand même, daté et nommé,
            # vaut mieux qu'une base de preuve sans aucune horloge.
            prov = {"date": date, "back_main": back_sha, "game_back": image, "compte": IDENT,
                    "jour_de_jeu": jour_de_jeu,
                    "horloge_game_minute": minute_de_jeu,
                    "horloge_source": source_horloge,
                    # fait de l'OUTIL, pas une clé du back : le district dont l'intérieur porte
                    # les bâtiments du joueur. Il vit ici, jamais dans le corps capturé.
                    "district_du_joueur_mesure": home,
                    "dossier": r["dossier"], "symbole": r["sym"], "controleur": r["ctl"]}
            if route == "/v1/session/open":
                st, h = pile.entetes["session/open"]
                doc = {"route": route, "methode": "POST", "statut": st, "params": {"client_version": "da4-corps-reels"}, "provenance": {**prov, **h}, "corps": pile.corps["session/open"]}
                c["appelées"] += 1
            elif methode != "GET":
                doc = {"route": route, "methode": methode, "statut": None, "non_appelee": "mutation — pas de corps réel sans changer l'état du compte de démo la veille des juges", "provenance": prov}
                c["mutations"] += 1
            else:
                appelable, params = parametrer(route); manque = []
                for nom in params:
                    v, raison = resoudre(pile, nom, params)
                    params[nom] = {"valeur": v, "source": raison}
                    if v is None:
                        manque.append(nom)
                    else:
                        appelable = appelable.replace("{" + nom + "}", str(v))
                if manque:
                    doc = {"route": route, "methode": "GET", "statut": None, "sans_instance": {n: params[n]["source"] for n in manque}, "params": params, "provenance": prov}
                    c["sans instance"] += 1
                else:
                    st, b, h = pile.get(appelable)
                    doc = {"route": route, "route_appelee": appelable, "methode": "GET", "statut": st, "params": params, "provenance": {**prov, **h}, "corps": b}
                    c["appelées" if st < 400 else "erreurs"] += 1
                    if st >= 400:
                        err = (b.get("payload", {}) or {}).get("error", {}) if isinstance(b, dict) else {}
                        print(f"   ✗ {r['sym']} {appelable} → {st} {err.get('code', '')} {str(err.get('message', ''))[:90]}")
            # ⛔ LE NOM DU FICHIER SUIT LA ROUTE APPELÉE, décidé APRÈS l'appel — sinon un
            #    `/v1/x/` que le back résout en `/v1/x/{id}` s'écrit sous le nom de `/v1/x`.
            # ⛔ Le REPLI (route non appelée) doit nommer par la forme PARAMÉTRÉE, pas par la
            #    route déclarée : `/v1/x/` déclare une route de détail, mais son slug efface la
            #    barre finale et percute `/v1/x`. Mesuré le 2026-09-06 sur `ecran_demolition`.
            declaree = parametrer(route)[0] or route
            vrai = slug_reel(declaree, doc.get("route_appelee"), methode)
            if vrai != os.path.basename(fichier):
                fichier = os.path.join(d, vrai)
            # ⛔ GARDE DE COLLISION — la classe, pas l'instance. Deux routes qui produiraient le
            #    même nom : la seconde écraserait la première EN SILENCE, et le dossier
            #    annoncerait une route en portant le corps d'une autre. Refuser plutôt qu'écraser.
            if vrai in noms_pris and noms_pris[vrai] != route:
                print(f"⛔ COLLISION de nom dans `{r['dossier']}` : `{vrai}` réclamé par "
                      f"`{noms_pris[vrai]}` ET `{route}`. Rien écrit — deux routes ne peuvent pas "
                      f"partager un fichier, la seconde effacerait la première en silence.")
                sys.exit(1)
            noms_pris[vrai] = route
            idx.append({"fichier": os.path.basename(fichier), "route": route, "methode": methode, "statut": doc.get("statut"), "etat": "appelée" if doc.get("corps") is not None and (doc.get("statut") or 0) < 400 else ("mutation" if "non_appelee" in doc else ("sans instance" if "sans_instance" in doc else "erreur"))})
            if not controle:
                json.dump(doc, open(fichier, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        if not controle:
            partage = sum(1 for x in cd.TABLE + cd.HORS_APPSHELL if x["dossier"] == r["dossier"]) > 1
            nom_index = f"_index-{r['sym']}.json" if partage else "_index.json"
            json.dump({"dossier": r["dossier"], "symbole": r["sym"], "controleur": r["ctl"], "date": date, "back_main": back_sha, "horloge_game_minute": minute_de_jeu, "jour_de_jeu": jour_de_jeu, "compte": IDENT,
                       "note": "routes = celles du DOSSIER de code du contrôleur et de ses classes *Client. DEUX SENS, et le second manquait : elles sont parfois PLUS LARGES que l'écran (le juge-donnees filtre), et parfois PLUS ÉTROITES que le domaine — une route du domaine que le code de l'écran n'appelle pas N'APPARAÎT PAS ICI, par construction et non par échec. Mesuré le 2026-09-06 sur screen_c2 : POST .../laundering/stage existe côté back et le client la référence 0 fois, donc elle est absente de cet index. ⛔ Une absence ici se lit « pas dans la surface de code de l'écran », JAMAIS « pas de corps » ni « pas regardée » — confronter au mandat du dossier pour la trancher.",
                       "comptes": c, "routes": idx}, open(os.path.join(d, nom_index), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        for k in total: total[k] += c[k]
        lignes.append(f"| `{r['dossier']}` | {r['sym']} | {len(routes)} | {c['appelées']} | {c['sans instance']} | {c['mutations']} | {c['erreurs']} |")
    print("\n".join(lignes)); print("TOTAL", total)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
