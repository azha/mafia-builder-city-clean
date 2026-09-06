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
    "districtId":  (["home_district_id", "district_id", "district"], ["session/open", "city/district/{districtId}/interior"]),
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


def slug(route, method):
    s = re.sub(r"[{}?=&/:]+", "_", route.replace("/v1/", "")).strip("_")
    return f"{method}_{s}.json"


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
    out = {}
    for chemin in fichiers:
        src = open(chemin, encoding="utf-8").read()
        # (a) la DÉCLARATION en docstring « GET /v1/… » — c'est la liste des routes et leur méthode, pas la donnée
        for m in re.finditer(r"///.*?\b(GET|POST|PUT|DELETE|PATCH)\s+(/v1/[A-Za-z0-9_/{}:.?=&-]+)", src):
            route = re.sub(r":([A-Za-z]+)", r"{\1}", m.group(2).rstrip(".?&"))
            route = re.sub(r"(\?[a-z_]+=)[^&]*$", r"\1", route)   # `?lieutenant_id=<valeur>` → paramètre à résoudre
            route = route.rstrip("-")                                # tiret de coupure de ligne d'un docstring
            out.setdefault(route, m.group(1))
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
            out.setdefault(route, methode)
    for route in list(out):
        if any(o != route and o.startswith(route + "?") for o in out):
            out.pop(route)
    # (c) règle des verbes d'ACTION : une route qui se termine par un verbe est une mutation, quel que
    #     soit ce que la proximité a lu ; `auth/*` idem (jamais un GET)
    for route in list(out):
        if re.search(r"/(validate|dismiss|commit|skip|order|dispatch|purchase|adopt|recall|graduation|attend|batch-confirm|open|collect|report|hire|fire|sign|resolve|confirm)(/|$)", route) or route.startswith("/v1/auth/"):
            out[route] = "POST" if out[route] == "GET" else out[route]
        if route == "/v1/city/district/":            # préfixe nu dans le code : la route réelle est l'intérieur
            out.pop(route); out.setdefault("/v1/city/district/{districtId}/interior", "GET")
    return sorted(out.items())


class Pile:
    def __init__(self):
        self.token = None; self.corps = {}; self.entetes = {}

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
        self.corps[route.replace("/v1/", "")] = b
        return st, b, h


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
#    2026-09-06) : `city_epoch.game_minute` est GLOBALE (une ligne, valait 1500) ;
#    `city_sim_clock.game_minute` est PAR JOUEUR (compte de démo : 71908). C'est la seconde
#    qu'une provenance doit porter — une empreinte prise sur la globale ne dirait rien du compte
#    capturé. ⚠️ Le piège concret : `GET /v1/_test/citysim/…` rend un champ nommé `game_minute`
#    qui est le GLOBAL. Une route qui rend le BON NOM et la MAUVAISE GRANDEUR ; elle répondrait
#    200 et on l'inscrirait dans 240 manifestes.
# ⛔ Et ne PAS dériver l'une de l'autre : `opened_game_day` valait 37 quand l'horloge joueur en
#    indiquait 49,9 — douze jours d'écart, origine non mesurée. Les deux s'inscrivent telles
#    qu'elles sont lues, jamais converties.
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
            home = d; pile.corps["interior"] = b; pile.corps["session/open"]["payload"]["data"]["home_district_id"] = d
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
    total = {"appelées": 0, "sans instance": 0, "mutations": 0, "erreurs": 0}
    lignes = ["| dossier | sym | routes | appelées | sans instance | mutations non appelées | erreurs HTTP |", "|---|---|---|---|---|---|---|"]
    for r in cd.TABLE + cd.HORS_APPSHELL:
        d = os.path.join(cd.JV, r["dossier"], "corps-reels"); os.makedirs(d, exist_ok=True)
        routes = routes_avec_methode(r["ctl"]) if not r["ctl"].startswith(("AppShell", "CueStack", "Recruitment", "Market")) else []
        if r["sym"] in ("③", "⑨", "⑤", "④", "⑯") and "/v1/session/open" not in dict(routes):
            routes.append(("/v1/session/open", "POST"))
        idx = []; c = {"appelées": 0, "sans instance": 0, "mutations": 0, "erreurs": 0}
        for route, methode in routes:
            fichier = os.path.join(d, slug(route, methode))
            # `jour_de_jeu` : la seule horloge que ce compte expose à cet outil. C'est un JOUR,
            # pas la minute que lit l'empreinte du back — l'écrire quand même, daté et nommé,
            # vaut mieux qu'une base de preuve sans aucune horloge.
            prov = {"date": date, "back_main": back_sha, "game_back": image, "compte": IDENT,
                    "jour_de_jeu": jour_de_jeu,
                    "horloge_game_minute": minute_de_jeu,
                    "horloge_source": source_horloge,
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
            idx.append({"fichier": os.path.basename(fichier), "route": route, "methode": methode, "statut": doc.get("statut"), "etat": "appelée" if doc.get("corps") is not None and (doc.get("statut") or 0) < 400 else ("mutation" if "non_appelee" in doc else ("sans instance" if "sans_instance" in doc else "erreur"))})
            if not controle:
                json.dump(doc, open(fichier, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        if not controle:
            partage = sum(1 for x in cd.TABLE + cd.HORS_APPSHELL if x["dossier"] == r["dossier"]) > 1
            nom_index = f"_index-{r['sym']}.json" if partage else "_index.json"
            json.dump({"dossier": r["dossier"], "symbole": r["sym"], "controleur": r["ctl"], "date": date, "back_main": back_sha, "compte": IDENT,
                       "note": "routes = celles du DOSSIER de code du contrôleur et de ses classes *Client (parfois plus larges que l'écran) ; le juge-donnees filtre",
                       "comptes": c, "routes": idx}, open(os.path.join(d, nom_index), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        for k in total: total[k] += c[k]
        lignes.append(f"| `{r['dossier']}` | {r['sym']} | {len(routes)} | {c['appelées']} | {c['sans instance']} | {c['mutations']} | {c['erreurs']} |")
    print("\n".join(lignes)); print("TOTAL", total)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
