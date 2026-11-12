#!/usr/bin/env python3
"""GARDE STATIQUE DE POPULATION — toute clé i18n que le client PEUT afficher est SERVIE, en DETTE DATÉE ou en REPLI VOULU.

    python3 Tools/garde-population-cles.py                 # la garde (rc 0 vert · 1 rouge · 2 instrument en panne)
    python3 Tools/garde-population-cles.py --rafraichir    # RAFRAÎCHIT l'instantané « servi » au back DÉPLOYÉ (X-Server-Build de /v1/health) — f2, à chaque DÉPLOIEMENT
    python3 Tools/garde-population-cles.py --rafraichir 8d0184a4                   # …ou à un SHA / ref nommé du back

⛔ POURQUOI. `ZeroRepliDesLocatairesPlayModeTests` ne voit que les états d'ARRIVÉE des écrans : une clé non servie affichée dans un état
non atteint n'est ni en dette ni vue (« 17 clés invisibles », revue de ㉔). C'est une CLASSE. Ici, sans rendu et sans porte :
    K_client ⊆ SERVIE ∪ DetteDatee ∪ RepliVoulu      et      DetteDatee ∩ RepliVoulu = ∅ = DetteDatee ∩ SERVIE = RepliVoulu ∩ SERVIE
- K_client = la population de `Tools/cles-i18n-du-client.py` (IMPORTÉ : une seule `slug`), + les clés ÉNUMÉRÉES de la table des sites
  non littéraux.
- SERVIE = l'instantané commité `Tools/juge-donnees/i18n/cles-servies-<sha>.txt` : clés des DEUX locales (FR ET EN, registre ∪
  `ERROR_TEXT_RATIFIED`, définition de `sert()` dans la spec §F-3 du back) du `string_table.ts` d'un cumul back NOMMÉ en en-tête.
- DetteDatee / RepliVoulu = lus dans la SOURCE de `ZeroRepliDesLocatairesPlayModeTests.cs` (commentaires retirés).
- Une clé en `….` (préfixe composé : `decision.type.`) est valide si le registre sert au moins une clé SOUS ce préfixe.

⚠️ CE QUE LA GARDE NE VOIT PAS (déclaré, compté, jamais deviné) : `Libelle.ParValeur` (clé née d'une valeur servie : comptés) et les
appels `Libelle.Gabarit` à 1er argument non littéral : chacun est CLASSÉ dans `sites-non-litteraux.tsv` ; le nombre d'appels par
fichier y est ÉPINGLÉ (cliquet : un site neuf non classé rougit).

⛔ UN VERT N'EST LU QU'AVEC SES CONTRÔLES : à chaque lancement, sur données FABRIQUÉES, une clé inventée DOIT rougir en étant nommée, une
dette périmée DOIT rougir, un repli voulu servi DOIT rougir, un instantané vide ou un ensemble vide DOIT être rc 2. Et la garde rougit
si son APPELANT disparaît (`typecheck-hors-porte.py --tout` l'appelle ; `GardePopulationAppeleePlayModeTests` le vérifie à son tour).
"""
import datetime
import importlib.util
import os
import re
import subprocess
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
os.chdir(RACINE)
DOSSIER_INSTANTANES = Path('Tools/juge-donnees/i18n')
TABLE_SITES = Path('Tools/garde-population-cles/sites-non-litteraux.tsv')
TABLE_TEXTES = Path('Tools/garde-population-cles/sites-de-texte-non-litteraux.tsv')
SOURCE_ZERO_REPLI = Path('Assets/Tests/PlayMode/ZeroRepliDesLocatairesPlayModeTests.cs')
TYPECHECK = Path('Tools/typecheck-hors-porte.py')
TEST_APPELANT = Path('Assets/Tests/PlayMode/GardePopulationAppeleePlayModeTests.cs')
MAFIA_CI = Path('Assets/Editor/MafiaCI.cs')
CATEGORIE_APPELANT = 'GardePopulation'
STRING_TABLE_BACK = 'services/game-back/src/i18n/string_table.ts'
BACK = Path(os.environ.get('MAFIA_BACK', str(Path.home() / 'project/mafia-clean-city')))
CLASSES = ('SERVI_PAR_LE_BACK', 'ENUMEREE', 'PREFIXE')


def charger_extracteur():
    spec = importlib.util.spec_from_file_location('cles_i18n_du_client', RACINE / 'Tools/cles-i18n-du-client.py')
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


# ───────────────────────── lecture des ensembles C# ─────────────────────────
def bloc_apres(src: str, ancre: str):
    """Texte entre l'accolade ouvrante qui suit `ancre` et sa fermante (chaînes respectées). None si l'ancre est absente."""
    i = src.find(ancre)
    if i < 0:
        return None
    j = src.find('{', i)
    prof, k, n = 0, j, len(src)
    while k < n:
        c = src[k]
        if c == '"':
            k += 1
            while k < n and src[k] != '"':
                k += 2 if src[k] == '\\' else 1
        elif c == '{':
            prof += 1
        elif c == '}':
            prof -= 1
            if prof == 0:
                return src[j + 1:k]
        k += 1
    return None


LITTERAL = re.compile(r'"((?:[^"\\]|\\.)*)"')


def lire_ensembles(src_cs: str, sans_commentaires):
    """(DetteDatee, RepliVoulu) lus dans la source. Ancre introuvable ou ensemble vide ⇒ None : « rien regardé », jamais un vert."""
    src = sans_commentaires(src_cs)
    d = bloc_apres(src, 'DetteDatee = new HashSet<string>')
    r = bloc_apres(src, 'RepliVoulu = new Dictionary<string, string>')
    if d is None or r is None:
        return None
    dette = {m for m in LITTERAL.findall(d) if '.' in m and ' ' not in m}
    repli = set(re.findall(r'\{\s*"([^"\\]+)"\s*,\s*"', r))
    return dette, repli


# ───────────────────────── instantané « servi » ─────────────────────────
def servies_depuis_ts(ts: str):
    """Clés servies dans les DEUX locales, d'un string_table.ts. Rend (servies, comptes) ou None si une section est introuvable.
    Lecture à l'INDENTATION (registres : 2 espaces ; `ERROR_TEXT_RATIFIED` : 4 sous `  en: {` / `  fr: {`) — le compte est imprimé."""
    L = ts.split('\n')

    def borne(debut):
        for i, l in enumerate(L):
            if l.startswith(debut):
                for j in range(i + 1, len(L)):
                    if L[j] == '};':
                        return i, j
        return None
    cle = re.compile(r"^( +)(['\"`])((?:[^'\"`\\]|\\.)+)\2\s*:")
    def cles(a, b, ind):
        out = set()
        for l in L[a:b]:
            m = cle.match(l)
            if m and len(m.group(1)) == ind:
                out.add(m.group(3))
        return out
    be, bf, br = borne('export const EN_MESSAGES'), borne('export const FR_MESSAGES'), borne('export const ERROR_TEXT_RATIFIED')
    if not (be and bf and br):
        return None
    en, fr = cles(*be, 2), cles(*bf, 2)
    a, b = br
    sous = {}
    cur = None
    for i in range(a + 1, b):
        m = re.match(r'^  (en|fr): \{', L[i])
        if m:
            cur, deb = m.group(1), i
        elif cur and L[i] == '  },':
            sous[cur] = cles(deb, i, 4)
            cur = None
    if set(sous) != {'en', 'fr'}:
        return None
    servies = (en | sous['en']) & (fr | sous['fr'])
    return servies, {'EN': len(en), 'FR': len(fr), 'ERR_EN': len(sous['en']), 'ERR_FR': len(sous['fr']), 'servies_FR_ET_EN': len(servies)}


HEALTH_URL = os.environ.get('MAFIA_HEALTH_URL', 'http://localhost/v1/health')


def build_deploye():
    """SHA du back DÉPLOYÉ sur la pile de dev (en-tête `X-Server-Build` de /v1/health), ou None. Ruling f2 12/11 : c'est LUI qui fait foi,
    la même vérité que la règle (2) de ZeroRepli — une dette ne se lève que quand le joueur reçoit la clé."""
    import urllib.request, urllib.error
    try:
        req = urllib.request.Request(HEALTH_URL, method='GET')
        try:
            with urllib.request.urlopen(req, timeout=3) as r:
                return (r.headers.get('X-Server-Build') or '').strip() or None
        except urllib.error.HTTPError as e:      # un 404 porte quand même l'en-tête (mesuré : /v1/health → 404 + X-Server-Build)
            return (e.headers.get('X-Server-Build') or '').strip() or None
    except Exception:
        return None


def ecrire_instantane(ref):
    if ref is None:
        ref = build_deploye()
        if ref is None:
            print(f"⛔ aucun SHA donné et {HEALTH_URL} illisible (X-Server-Build) — rien rafraîchi : `--rafraichir <sha>`.", file=sys.stderr)
            return 2
        print(f"SHA lu sur {HEALTH_URL} : {ref}")
    try:
        sha = subprocess.run(['git', '-C', str(BACK), 'rev-parse', ref], capture_output=True, text=True, check=True).stdout.strip()
        date = subprocess.run(['git', '-C', str(BACK), 'log', '-1', '--format=%cs', sha], capture_output=True, text=True, check=True).stdout.strip()
        ts = subprocess.run(['git', '-C', str(BACK), 'show', f'{sha}:{STRING_TABLE_BACK}'], capture_output=True, text=True, check=True).stdout
    except subprocess.CalledProcessError as e:
        print(f"⛔ lecture du back impossible ({e}) — rien rafraîchi.", file=sys.stderr)
        return 2
    res = servies_depuis_ts(ts)
    if res is None or not res[0]:
        print("⛔ string_table.ts illisible (section introuvable ou vide) — rien rafraîchi.", file=sys.stderr)
        return 2
    servies, comptes = res
    chemin = DOSSIER_INSTANTANES / f'cles-servies-{sha[:8]}.txt'
    entete = [f'# back-ref: {ref}', f'# back-sha: {sha}', f'# date: {date}', f'# source: {STRING_TABLE_BACK} (registre FR ET EN, + ERROR_TEXT_RATIFIED par locale)',
              f"# comptes: {' '.join(f'{k}={v}' for k, v in comptes.items())}", f'# compte: {len(servies)}',
              f'# régénéré par : python3 Tools/garde-population-cles.py --rafraichir {ref}']
    chemin.write_text('\n'.join(entete + sorted(servies)) + '\n', encoding='utf-8')
    for ancien in DOSSIER_INSTANTANES.glob('cles-servies-*.txt'):
        if ancien != chemin:
            ancien.unlink()
            print(f"  retiré (périmé) : {ancien}")
    print(f"instantané écrit : {chemin} — {len(servies)} clés servies FR ET EN ({comptes}) @ {sha[:8]} ({ref}, {date})")
    print("⇒ commit : `git add` ce fichier (et retirer l'ancien), puis relancer la garde : une dette désormais servie rougira « périmée ».")
    return 0


def lire_instantane():
    """(chemin, sha, date, ref, servies) ou None si aucun instantané / compte déclaré ≠ compte lu."""
    fichiers = sorted(DOSSIER_INSTANTANES.glob('cles-servies-*.txt'))
    if not fichiers:
        return None
    if len(fichiers) > 1:
        print(f"⚠️ {len(fichiers)} instantanés présents ({', '.join(f.name for f in fichiers)}) : un seul doit rester — le plus récent par date est lu.")
    def date_de(f):
        m = re.search(r'^# date: (\S+)', f.read_text(encoding='utf-8'), re.M)
        return m.group(1) if m else ''
    f = max(fichiers, key=date_de)
    t = f.read_text(encoding='utf-8').split('\n')
    ent = {m.group(1): m.group(2) for l in t if (m := re.match(r'^# ([\w-]+): (.*)$', l))}
    cles = {l.strip() for l in t if l.strip() and not l.startswith('#')}
    try:
        declare = int(ent['compte'])
    except (KeyError, ValueError):
        declare = -1
    if declare != len(cles):
        print(f"⛔ instantané {f} : compte déclaré {declare} ≠ compte lu {len(cles)} (en-tête recopié faux ou fichier tronqué).", file=sys.stderr)
        return None
    return f, ent.get('back-sha', ''), ent.get('date', ''), ent.get('back-ref', ''), cles


def avertissement_age(sha, date, ref):
    """Imprime l'âge et le SHA à CHAQUE lancement. Rend 'ok' (à jour), 'perime' (le back déployé est AUTRE : rouge nommé) ou 'inconnu'
    (/health illisible : avertissement nommé, la fraîcheur n'est pas vérifiée — ce n'est pas « à jour »)."""
    try:
        age = (datetime.date.today() - datetime.date.fromisoformat(date)).days
    except ValueError:
        age = None
    print(f"instantané « servi » : back {sha[:8]} ({ref}), du {date}, âge {age if age is not None else '?'} j")
    deploye = build_deploye()
    if deploye is None:
        print(f"⚠️ INSTANTANÉ : le back DÉPLOYÉ est ILLISIBLE ({HEALTH_URL}) — fraîcheur NON vérifiée, ce n'est pas « à jour ».")
        return 'inconnu'
    if sha.startswith(deploye) or deploye.startswith(sha[:len(deploye)]):
        print(f"   à jour : c'est le back déployé ({deploye}).")
        return 'ok'
    print(f"⛔ INSTANTANÉ PÉRIMÉ : le back déployé est {deploye}, l'instantané est à {sha[:8]}. Rafraîchir (f2, à chaque DÉPLOIEMENT) : "
          f"`python3 Tools/garde-population-cles.py --rafraichir` puis `git add` du fichier.")
    return 'perime'


# ───────────────────────── table des sites non littéraux ─────────────────────────
def lire_table_sites():
    """{fichier: (nb_appels, classes, cles_enumerees)} ou None si illisible."""
    if not TABLE_SITES.exists():
        return None
    out = {}
    for l in TABLE_SITES.read_text(encoding='utf-8').split('\n'):
        if not l.strip() or l.startswith('#'):
            continue
        c = l.split('\t')
        if len(c) < 3:
            return None
        classes = tuple(x.strip() for x in c[2].split(','))
        if not set(classes) <= set(CLASSES):
            return None
        enum = tuple(x.strip() for x in (c[3] if len(c) > 3 else '').split(',') if x.strip())
        out[c[0]] = (int(c[1]), classes, enum)
    return out


def verifier_sites(detail_fichier, table):
    """Cliquet : le nombre d'appels non littéraux par fichier == l'épingle ; un fichier absent de la table avec ≥1 appel rougit."""
    rouges = []
    reel = {str(Path(f)): d[3] for f, d in detail_fichier.items() if d[3]}
    for f, n in sorted(reel.items()):
        rel = f.replace('Assets/Scripts/', '')
        if rel not in table:
            rouges.append(f"site non littéral NON CLASSÉ : {rel} ({n} appel(s)) — l'ajouter à {TABLE_SITES} avec sa classe")
        elif table[rel][0] != n:
            rouges.append(f"{rel} : {n} appel(s) non littéral(aux) lu(s), {table[rel][0]} épinglé(s) — reclasser (cliquet)")
    for rel in sorted(set(table) - {f.replace('Assets/Scripts/', '') for f in reel}):
        rouges.append(f"{rel} : épinglé dans la table mais plus aucun appel non littéral — retirer la ligne")
    return rouges


# ───────────────────────── B1 : les appels de TEXTE (`Libelle.De`, helpers, `ParValeur`) à argument non littéral ─────────────────────────
# L'extracteur ne lit que `De("d","r","littéral")`. Un appel dont le 3ᵉ argument est une variable, un paramètre, un champ, un appel de méthode,
# n'était NI compté NI épinglé (revue ⊥ tour 1, B1) : ses clés n'entraient pas dans K, donc une clé non servie affichée par là passait.
# Ici : (1) un argument purement littéral (ternaire de littéraux inclus) est LU ; (2) un identifiant est RÉSOLU — paramètre d'une méthode ⇒ les
# arguments des appelants du fichier ; variable locale ⇒ ses affectations dans la méthode ; (3) ce qui reste (champ d'une table, appel de
# méthode, valeur servie) est COMPTÉ par fichier, ÉPINGLÉ dans `sites-de-texte-non-litteraux.tsv`, et sa classe dit pourquoi : SERVI_PAR_LE_BACK
# (la clé ou la valeur vient du serveur) ou ENUMEREE (clés écrites à la main dans le tsv, chacune sous TÉMOIN DE SOURCE — jamais une liste de foi).
LITS = re.compile(r'\$?"((?:[^"\\]|\\.)*)"')
ENT = re.compile(r'([\w<>\[\],.?]+)\s+(\w+)\s*\(([^()]*)\)\s*(?:\{|=>)')
MOTS_C = {'if', 'while', 'for', 'foreach', 'switch', 'return', 'new', 'else', 'using', 'lock', 'catch', 'nameof', 'typeof', 'await', 'throw', 'yield', 'when', 'fixed'}


def entetes(src, debut=0, fin=None):
    return [m for m in ENT.finditer(src, debut, len(src) if fin is None else fin) if m.group(1) not in MOTS_C and m.group(2) not in MOTS_C]


def args_at(src, i):
    """Arguments (texte brut) de l'appel dont la parenthèse ouvrante précède `i` ; chaînes et imbrication respectées."""
    prof, a, cur, k, n = 0, [], i, i, len(src)
    while k < n:
        c = src[k]
        if c == '"':
            k += 1
            while k < n and src[k] != '"':
                k += 2 if src[k] == '\\' else 1
        elif c in '([{':
            prof += 1
        elif c in ')]}':
            if prof == 0:
                a.append(src[cur:k].strip())
                return a
            prof -= 1
        elif c == ',' and prof == 0:
            a.append(src[cur:k].strip())
            cur = k + 1
        k += 1
    return a


def branches_ternaire(e):
    """[vrai, faux] d'une expression `cond ? vrai : faux` de plus haut niveau (chaînes et imbrication respectées), sinon None."""
    prof, k, n, q = 0, 0, len(e), None
    while k < n:
        ch = e[k]
        if ch == '"':
            k += 1
            while k < n and e[k] != '"':
                k += 2 if e[k] == '\\' else 1
        elif ch in '([{':
            prof += 1
        elif ch in ')]}':
            prof -= 1
        elif ch == '?' and prof == 0 and q is None and not e.startswith('??', k) and not e.startswith('?.', k) and not (k > 0 and e[k - 1] == '?'):
            q = k
        elif ch == ':' and prof == 0 and q is not None:
            return [e[q + 1:k].strip(), e[k + 1:].strip()]
        k += 1
    return None


def purement_litteral(expr):
    return re.sub(r'\bnull\b|[?:()\s+]', '', LITS.sub('', expr)) == ''


def resoudre(src, pos, expr, vus=None):
    """(littéraux, complet) : tout ce que `expr` (placée en `pos`) peut valoir, tant que cela vient de littéraux de CE fichier."""
    vus = vus or set()
    e = expr.strip()
    if purement_litteral(e):
        return set(LITS.findall(e)), True
    br = branches_ternaire(e)
    if br is not None:      # `cond ? a : b` : seules les BRANCHES produisent du texte (la condition n'en produit pas)
        out, complet = set(), True
        for b_ in br:
            l, c = resoudre(src, pos, b_, vus)
            out |= l
            complet &= c
        return out, complet
    if not re.fullmatch(r'\w+', e):
        return set(), False
    if (e, pos) in vus:
        return set(), False
    vus = vus | {(e, pos)}
    for m in reversed(entetes(src, 0, pos)):
        params = [x.strip() for x in m.group(3).split(',')]
        idx = [i for i, x in enumerate(params) if re.search(r'\b' + e + r'(\s*=.*)?$', x)]
        if not idx:
            continue
        i, out, complet, n = idx[0], set(), True, 0
        for c in re.finditer(r'(?<![\w.])' + re.escape(m.group(2)) + r'\(', src):
            if c.start() == m.start(2) or re.search(r'\b(string|void|bool|int|float|IEnumerator|static|public|private|internal)\s+$', src[max(0, c.start() - 20):c.start()]):
                continue
            a = args_at(src, c.end())
            n += 1
            if len(a) <= i or re.match(r'\w+\s*:', a[i]):
                complet = False
                continue
            l, cc = resoudre(src, c.start(), a[i], vus)
            out |= l
            complet &= cc
        return out, complet and n > 0
    av, ap = entetes(src, 0, pos), entetes(src, pos + 1)
    d, f = (av[-1].start() if av else 0), (ap[0].start() if ap else len(src))
    out, complet, n = set(), True, 0
    for m in re.finditer(r'(?<![\w.])' + e + r'\s*=\s*([^;]+);', src[d:f]):
        n += 1
        l, cc = resoudre(src, d + m.start(), m.group(1), vus)
        out |= l
        complet &= cc
    return out, complet and n > 0


def sites_de_texte(src, ex):
    """[{ligne, dom, role, expr, cles:{clé: texte affiché}, complet}] pour chaque appel de TEXTE à argument non littéral (De, helpers à 1 ou 2
    arguments, ParValeur). Les CORPS de helpers (3ᵉ argument = paramètre du helper) sont exclus : ce sont leurs appelants qui comptent."""
    out = []
    decl = list(ex.HELPER.finditer(src)) + list(ex.HELPER2.finditer(src))
    spans = [(m.start(), m.end()) for m in decl]
    ligne = lambda p: src.count('\n', 0, p) + 1
    litt = lambda x: (LITS.fullmatch(x).group(1) if LITS.fullmatch(x) else None)

    def ajouter(pos, dom, role, expr, repli=None):
        lits, ok = resoudre(src, pos, expr)
        cles = {f"{dom}.{role}.{ex.slug(ex.decode(l))}": ex.decode(repli if repli is not None else l) for l in lits if ex.slug(ex.decode(l))}
        out.append({'ligne': ligne(pos), 'dom': dom, 'role': role, 'expr': expr[:50], 'cles': cles, 'complet': ok})
    for m in re.finditer(r'Libelle\.De\(', src):
        if any(a <= m.start() < b for a, b in spans):
            continue
        a = args_at(src, m.end())
        if len(a) >= 3 and not LITS.fullmatch(a[2]):
            d, r = litt(a[0]), litt(a[1])
            if d is None or r is None:
                out.append({'ligne': ligne(m.start()), 'dom': '?', 'role': '?', 'expr': a[2][:50], 'cles': {}, 'complet': False})
            else:
                ajouter(m.start(), d, r, a[2])
    for h in ex.HELPER.finditer(src):
        for m in re.finditer(r'(?<![\w.])' + re.escape(h.group(1)) + r'\(', src):
            if re.search(r'string\s+$', src[max(0, m.start() - 12):m.start()]):
                continue
            a = args_at(src, m.end())
            if a and not LITS.fullmatch(a[0]):
                ajouter(m.start(), h.group(2), h.group(3), a[0])
    for h in ex.HELPER2.finditer(src):
        for m in re.finditer(r'(?<![\w.])' + re.escape(h.group(1)) + r'\(', src):
            if re.search(r'string\s+$', src[max(0, m.start() - 12):m.start()]):
                continue
            a = args_at(src, m.end())
            if len(a) >= 2 and litt(a[0]) is not None and not LITS.fullmatch(a[1]):
                ajouter(m.start(), h.group(2), litt(a[0]), a[1])
    for m in re.finditer(r'Libelle\.ParValeur\(', src):
        a = args_at(src, m.end())
        if len(a) < 4:
            continue
        d, r = litt(a[0]), litt(a[1])
        if d is not None and r is not None:
            ajouter(m.start(), d, r, a[2], repli=(litt(a[3]) or None))
        else:
            out.append({'ligne': ligne(m.start()), 'dom': '?', 'role': '?', 'expr': a[2][:50], 'cles': {}, 'complet': False})
    return out


def lire_table_textes():
    """{fichier: (nb_non_resolus, classes, cles_explicites, fichiers_temoins, cles_ecartees)} ou None si illisible."""
    if not TABLE_TEXTES.exists():
        return None
    out = {}
    for l in TABLE_TEXTES.read_text(encoding='utf-8').split('\n'):
        if not l.strip() or l.startswith('#'):
            continue
        c = l.split('\n')[0].split('\t')
        if len(c) < 3:
            return None
        classes = tuple(x.strip() for x in c[2].split(','))
        if not set(classes) <= {'SERVI_PAR_LE_BACK', 'ENUMEREE'}:
            return None
        cles = tuple(x.strip() for x in (c[3] if len(c) > 3 else '').split(',') if x.strip())
        temoins = tuple(x.strip() for x in (c[4] if len(c) > 4 else '').split(',') if x.strip())
        ecartees = tuple(x.strip() for x in (c[5] if len(c) > 5 else '').split(',') if x.strip())
        out[c[0]] = (int(c[1]), classes, cles, temoins, ecartees)
    return out


def temoin_de_source(cle, litteraux, slug):
    """Une clé écrite à la main dans le tsv doit se LIRE dans la source : `dom.role.slug(L)` pour un littéral L, ou un préfixe littéral + un
    suffixe littéral (`"appro.consequence." + suffixe`)."""
    p = cle.split('.', 2)
    if len(p) == 3 and any(slug(l) == p[2] for l in litteraux):
        return True
    if any(cle.startswith(a) and cle[len(a):] in litteraux for a in litteraux if a.endswith('.')):
        return True
    # clé COMPOSÉE de deux littéraux : « préfixe » + « . » + « suffixe » (`Moment.Dire("decision.moment.vide", …)` + « dawn »)
    return any(cle[:i] in litteraux and cle[i + 1:] in litteraux for i in range(len(cle)) if cle[i] == '.')


def analyser_textes(ex, table):
    """(cles {clé: (texte, fichier)}, rouges, nb_resolus, nb_non_resolus)."""
    cles, rouges, nres, nnon = {}, [], 0, 0
    reel = {}
    for f in sorted(Path('Assets/Scripts').rglob('*.cs')):
        brut = f.read_text(encoding='utf-8')
        if 'Libelle' not in brut:
            continue
        src = ex.recoller(ex.sans_commentaires(brut))
        rel = str(f).replace('Assets/Scripts/', '')
        sites = sites_de_texte(src, ex)
        for st in sites:
            for k, t in st['cles'].items():
                cles.setdefault(k, (t, rel))
        non = [st for st in sites if not st['complet']]
        nres += len(sites) - len(non)
        nnon += len(non)
        if non:
            reel[rel] = non
    for rel, non in sorted(reel.items()):
        if rel not in table:
            rouges.append(f"appel de texte NON RÉSOLU et NON CLASSÉ : {rel} ({len(non)} : " + ' ; '.join(f"l.{st['ligne']} {st['dom']}.{st['role']}←{st['expr']}" for st in non) + f") — l'ajouter à {TABLE_TEXTES}")
        elif table[rel][0] != len(non):
            rouges.append(f"{rel} : {len(non)} appel(s) de texte non résolu(s) lu(s), {table[rel][0]} épinglé(s) — reclasser (cliquet) : " + ' ; '.join(f"l.{st['ligne']} {st['dom']}.{st['role']}←{st['expr']}" for st in non))
    for rel in sorted(set(table) - set(reel)):
        rouges.append(f"{rel} : épinglé dans {TABLE_TEXTES.name} mais plus aucun appel de texte non résolu — retirer la ligne")
    for rel, (_, classes, explicites, temoins, ecartees) in table.items():
        for k in ecartees:      # sur-approximation du flux, écartée À LA MAIN : elle doit EXISTER (sinon la ligne ment) et rester nommée
            if k not in cles:
                rouges.append(f"{rel} : clé écartée « {k} » que le flux ne produit pas (retirer de la colonne « écartées »)")
            cles.pop(k, None)
        if not explicites:
            continue
        lits = set()
        for fich in (rel,) + temoins:
            fp = Path('Assets/Scripts') / fich
            if not fp.exists():
                rouges.append(f"{rel} : fichier témoin absent : {fich}")
                continue
            lits |= {ex.decode(x) for x in LITS.findall(ex.recoller(ex.sans_commentaires(fp.read_text(encoding='utf-8'))))}
        for k in explicites:
            if not temoin_de_source(k, lits, ex.slug):
                rouges.append(f"{rel} : clé explicite SANS TÉMOIN de source (aucun littéral de {rel}{''.join(' / ' + t for t in temoins)} ne la fait naître) : {k}")
            else:
                cles.setdefault(k, ('', rel))
    return cles, rouges, nres, nnon


FORME_CLE = re.compile(r'^[a-z][a-z0-9_]*(\.[a-z0-9_]+){2,}$')
FORME_PREFIXE = re.compile(r'^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+\.$')


def cles_des_fichiers_classes(table, ex, domaines):
    """Clés ajoutées à K_client par les sites non littéraux classés : (a) ENUMEREE → littéraux du fichier ayant la FORME d'une clé et un
    domaine connu du registre/de la dette/de la population ; (b) PREFIXE → littéraux terminés par un point ; (c) la colonne « clés énumérées ».
    Sur-approximation assumée : un littéral qui a l'air d'une clé et n'en est pas rougira nommé — on le classe alors, on ne le tait pas."""
    out = {}
    for rel, (_, classes, explicites) in table.items():
        for k in explicites:
            out[k] = rel
        f = Path('Assets/Scripts') / rel
        if not f.exists():
            continue
        src = ex.recoller(ex.sans_commentaires(f.read_text(encoding='utf-8')))
        src = re.sub(r'Moment\.Dire\(\s*"[^"]*"', 'Moment.Dire(', src)   # un PRÉFIXE de moment n'est pas une clé : ses clés sont dans la colonne explicite
        for lit in LITTERAL.findall(src):
            if 'ENUMEREE' in classes and FORME_CLE.match(lit) and lit.split('.')[0] in domaines:
                out.setdefault(lit, rel)
            if 'PREFIXE' in classes and FORME_PREFIXE.match(lit) and lit.split('.')[0] in domaines:
                out.setdefault(lit, rel)
    return out


# ───────────────────────── le verdict (pur : les contrôles l'exécutent sur du fabriqué) ─────────────────────────
def verdict(K, servies, dette, repli):
    """Rend {nom: [clés fautives]}. Pur, sans E/S."""
    def sert_prefixe(k):
        return k.endswith('.') and any(s.startswith(k) for s in servies)
    hors = sorted(k for k in K if k not in servies and k not in dette and k not in repli and not sert_prefixe(k))
    return {
        'HORS_DES_TROIS': hors,
        'DETTE_PERIMEE (servie)': sorted(dette & servies),
        'REPLI_VOULU_SERVI (raison caduque)': sorted(repli & servies),
        'DETTE_ET_REPLI': sorted(dette & repli),
        'DETTE_NON_DEMANDEE (ni dans le code, ni servie)': sorted(k for k in dette if k not in K and k not in servies),
        'REPLI_NON_DEMANDE': sorted(k for k in repli if k not in K and k not in servies),
    }


SEUIL_VERSEMENT_EN_BLOC = 10


def delta_de_dette(dette, extracteur):
    """I2 (revue ⊥ tour 1) : « pas de versement en bloc ». Compare la DetteDatee de l'arbre de travail à celle de HEAD (git, jamais un état caché) : rend
    (ajoutées, retirées), ou None si HEAD est illisible. `main` les imprime et AVERTIT quand SEUIL_VERSEMENT_EN_BLOC entrées ou plus sont versées d'un coup."""
    try:
        src = subprocess.run(['git', 'show', f'HEAD:{SOURCE_ZERO_REPLI}'], capture_output=True, text=True, check=True).stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    lu = lire_ensembles(src, extracteur.sans_commentaires)
    if lu is None:
        return None
    return sorted(dette - lu[0]), sorted(lu[0] - dette)


def controles(extracteur) -> list:
    """Contrôles sur sources/ensembles FABRIQUÉS (inertes). Rend la liste des échecs."""
    e = []
    K = {'sonde.bloc.inventee', 'sonde.bloc.servie', 'sonde.bloc.due', 'sonde.bloc.voulue', 'sonde.pref.'}
    S = {'sonde.bloc.servie', 'sonde.pref.x'}
    v = verdict(K, S, {'sonde.bloc.due'}, {'sonde.bloc.voulue'})
    if v['HORS_DES_TROIS'] != ['sonde.bloc.inventee']:
        e.append(f"contrôle POSITIF rouge : la clé inventée n'est pas désignée seule (lu {v['HORS_DES_TROIS']})")
    if any(v[k] for k in v if k != 'HORS_DES_TROIS'):
        e.append("contrôle NÉGATIF rouge : une population saine produit des fautes de classes annexes")
    if verdict(K, S | {'sonde.bloc.due'}, {'sonde.bloc.due'}, {'sonde.bloc.voulue'})['DETTE_PERIMEE (servie)'] != ['sonde.bloc.due']:
        e.append("contrôle rouge : une dette servie n'est pas déclarée périmée")
    if verdict(K, S | {'sonde.bloc.voulue'}, {'sonde.bloc.due'}, {'sonde.bloc.voulue'})['REPLI_VOULU_SERVI (raison caduque)'] != ['sonde.bloc.voulue']:
        e.append("contrôle rouge : un repli voulu servi n'est pas relevé")
    if 'sonde.pref.' not in verdict(K, set(), {'sonde.bloc.due'}, {'sonde.bloc.voulue'})['HORS_DES_TROIS']:
        e.append("contrôle rouge : un préfixe sans clé servie dessous passe")
    # lecture des ensembles C# sur une source fabriquée (commentaire ignoré)
    cs = ('// DetteDatee = new HashSet<string> { "x.y.z" }\n'
          'internal static readonly HashSet<string> DetteDatee = new HashSet<string>\n{\n  "a.b.c", // "c.d.e"\n  "f.g.h",\n};\n'
          'internal static readonly Dictionary<string, string> RepliVoulu = new Dictionary<string, string>\n{\n  { "r.s.t", "raison, avec { accolade" },\n};\n')
    lu = lire_ensembles(cs, extracteur.sans_commentaires)
    if lu != ({'a.b.c', 'f.g.h'}, {'r.s.t'}):
        e.append(f"contrôle rouge : lecture des ensembles C# sur source fabriquée = {lu}")
    if lire_ensembles('class X {}', extracteur.sans_commentaires) is not None:
        e.append("contrôle rouge : une source sans les ensembles rend autre chose que None (rc 2)")
    # string_table fabriqué
    ts = ("export const EN_MESSAGES: R = {\n  'a.b': 'x',\n  'a.c': 'y',\n};\nexport const FR_MESSAGES: R = {\n  'a.b': 'x',\n};\n"
          "export const ERROR_TEXT_RATIFIED: R = {\n  en: {\n    'error.e': 'x',\n  },\n  fr: {\n    'error.e': 'x',\n  },\n};\n")
    r = servies_depuis_ts(ts)
    if r is None or r[0] != {'a.b', 'error.e'}:
        e.append(f"contrôle rouge : lecture d'un string_table fabriqué (attendu a.b + error.e, FR ET EN) = {r}")
    # l'appelant (AST) : le sain passe ; le nom dans un print, ou le `rc |=` retiré, ou la fonction sans rc rendu : refusés
    if not appelant_present(FAUX_TYPECHECK_SAIN):
        e.append("contrôle rouge : un typecheck sain fabriqué n'est pas reconnu comme appelant")
    for nom, faux in (("rc |= retiré", FAUX_TYPECHECK_SAIN.replace("rc |= appeler_garde()", "appeler_garde()")),
                      ("nom dans un print", FAUX_TYPECHECK_SAIN.replace("    rc |= appeler_garde()\n", "    print('Tools/garde-population-cles.py')\n")),
                      ("rc non rendu", FAUX_TYPECHECK_SAIN.replace("    return rg\n", "    pass\n"))):
        if appelant_present(faux):
            e.append(f"contrôle rouge : un typecheck neutralisé ({nom}) est pris pour un appelant")
    # `population()` EXERCÉE sur un arbre fabriqué (revue ⊥ I4) : une clé `Libelle.De` y est lue, une en commentaire non
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        (Path(td) / 'X.cs').write_text('class X { string a = Libelle.De("sonde", "bloc", "Lue par population"); // Libelle.De("sonde", "bloc", "Cachée")\n}', encoding='utf-8')
        K, pf, _, _ = extracteur.population(Path(td))
        if 'sonde.bloc.lue_par_population' not in K or 'sonde.bloc.cachee' in K or len(pf) != 1:
            e.append(f"contrôle rouge : population() sur arbre fabriqué = {sorted(K)}")
    # B1 : le résolveur de flux, sur une source FABRIQUÉE — un paramètre de wrapper se résout par les arguments des appelants, une variable locale par ses
    # affectations, un champ ou un appel de méthode reste NON résolu (compté), un ParValeur à littéraux donne sa clé ; un corps de helper n'est pas un site.
    fab = ('class X {\n'
           '  static string Lib(string t) => Libelle.De("sonde", "aide", t);\n'
           '  void Poser(string titre) { var a = Libelle.De("sonde", "param", titre); }\n'
           '  void Appel() { Poser("Premier mot"); Poser(ok ? "Second mot" : "Troisieme mot"); }\n'
           '  void Local() { string l; if (c) l = "Valeur locale"; else l = "Autre locale"; var b = Libelle.De("sonde", "local", l); }\n'
           '  void Champ(Spec spec) { var c = Libelle.De("sonde", "champ", spec.Repli); var d = Lib(Methode()); var e = Lib("Litteral direct"); }\n'
           '  void Valeur(string v) { var f = Libelle.ParValeur("sonde", "enum", "active", "Ouverte"); var g = Libelle.ParValeur("sonde", "enum", v, "x"); }\n'
           '}\n')
    st = sites_de_texte(extracteur.recoller(extracteur.sans_commentaires(fab)), extracteur)
    cles_fab = {k for x in st if x['complet'] for k in x['cles']}
    attendu = {'sonde.param.premier_mot', 'sonde.param.second_mot', 'sonde.param.troisieme_mot', 'sonde.local.valeur_locale', 'sonde.local.autre_locale', 'sonde.enum.active'}
    if not attendu <= cles_fab:
        e.append(f"contrôle POSITIF rouge : le flux ne résout pas {sorted(attendu - cles_fab)} (lu {sorted(cles_fab)})")
    non = sorted((x['dom'] + '.' + x['role']) for x in st if not x['complet'])
    if non != ['sonde.aide', 'sonde.champ', 'sonde.enum']:
        e.append(f"contrôle POSITIF rouge : les sites non résolus attendus (champ, appel de méthode, ParValeur sur valeur servie) sont {non}")
    if any(x['dom'] == 'sonde' and x['role'] == 'aide' and x['complet'] for x in st) and any('litteral_direct' in k for k in cles_fab):
        e.append("contrôle NÉGATIF rouge : un littéral direct d'un helper à 1 argument est pris pour un site non littéral")
    if not temoin_de_source('sonde.bloc.un_mot', {'Un mot'}, extracteur.slug) or temoin_de_source('sonde.bloc.autre', {'Un mot'}, extracteur.slug):
        e.append("contrôle rouge : le témoin de source d'une clé explicite (présente / absente) se trompe")
    return e


def appelant_present(texte_typecheck: str) -> bool:
    """AST, pas une chaîne : `main` contient `rc |= appeler_garde(...)` ET `appeler_garde` lance ce script par `subprocess.run` et REND son rc.
    Un `print`/un commentaire qui nomme le script, ou un `rc |= rg` retiré, ne passent plus (revue ⊥ B2)."""
    import ast
    try:
        arbre = ast.parse(texte_typecheck)
    except SyntaxError:
        return False
    fonctions = {n.name: n for n in ast.walk(arbre) if isinstance(n, ast.FunctionDef)}
    main, garde = fonctions.get('main'), fonctions.get('appeler_garde')
    if main is None or garde is None:
        return False
    appelle = any(isinstance(n, ast.AugAssign) and isinstance(n.op, ast.BitOr) and isinstance(n.target, ast.Name) and n.target.id == 'rc'
                  and isinstance(n.value, ast.Call) and isinstance(n.value.func, ast.Name) and n.value.func.id == 'appeler_garde'
                  for n in ast.walk(main))
    lance = any(isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == 'run' for n in ast.walk(garde)) \
        and 'garde-population-cles.py' in ast.get_source_segment(texte_typecheck, garde) \
        and any(isinstance(n, ast.Return) for n in ast.walk(garde))
    return appelle and lance


FAUX_TYPECHECK_SAIN = (
    "import subprocess, sys\n"
    "def appeler_garde(commande=None):\n"
    "    rg = subprocess.run(commande or [sys.executable, 'Tools/garde-population-cles.py']).returncode\n"
    "    return rg\n"
    "def main():\n    rc = 0\n    rc |= appeler_garde()\n    sys.exit(rc)\n")


def verifier_appelants() -> list:
    rouges = []
    if not TYPECHECK.exists() or not appelant_present(TYPECHECK.read_text(encoding='utf-8')):
        rouges.append(f"APPELANT DISPARU : {TYPECHECK} (`--tout`) n'appelle plus garde-population-cles.py par `rc |= appeler_garde()` — la garde ne tourne plus nulle part")
    if not TEST_APPELANT.exists():
        rouges.append(f"APPELANT DISPARU : {TEST_APPELANT} (le second guetteur, rouge si le typecheck n'appelle plus la garde) n'existe plus")
    if not MAFIA_CI.exists() or f'"{CATEGORIE_APPELANT}"' not in MAFIA_CI.read_text(encoding='utf-8'):
        rouges.append(f"APPELANT DISPARU : la catégorie {CATEGORIE_APPELANT} n'est plus inscrite dans {MAFIA_CI} (I1)")
    return rouges


def main() -> int:
    a = sys.argv[1:]
    if '--rafraichir' in a:
        i = a.index('--rafraichir')
        return ecrire_instantane(a[i + 1] if i + 1 < len(a) else None)
    ex = charger_extracteur()
    echecs = controles(ex)
    if echecs:
        for x in echecs:
            print('⛔ ' + x, file=sys.stderr)
        return 2
    print("contrôles : positif (clé inventée désignée) · négatifs · dette périmée · repli voulu servi · lecture C# · lecture string_table · appelant : OK")

    K_dict, par_fichier, detail_fichier, _ = ex.population(Path('Assets/Scripts'))
    ens = lire_ensembles(SOURCE_ZERO_REPLI.read_text(encoding='utf-8'), ex.sans_commentaires) if SOURCE_ZERO_REPLI.exists() else None
    if ens is None or not ens[0] or not ens[1]:
        print(f"⛔ DetteDatee / RepliVoulu illisibles ou VIDES dans {SOURCE_ZERO_REPLI} — je n'ai rien regardé, ce n'est pas un vert.", file=sys.stderr)
        return 2
    dette, repli = ens
    inst = lire_instantane()
    if inst is None or not inst[4]:
        print(f"⛔ aucun instantané « servi » exploitable sous {DOSSIER_INSTANTANES} — `--rafraichir`. Rien regardé : pas un vert.", file=sys.stderr)
        return 2
    chemin, sha, date, ref, servies = inst
    table = lire_table_sites()
    table_t = lire_table_textes()
    if table_t is None:
        print(f"⛔ table des appels de texte non résolus absente ou illisible : {TABLE_TEXTES}", file=sys.stderr)
        return 2
    if table is None:
        print(f"⛔ table des sites non littéraux absente ou illisible : {TABLE_SITES}", file=sys.stderr)
        return 2
    if not K_dict:
        print("⛔ K_client VIDE — rien regardé.", file=sys.stderr)
        return 2

    fraicheur = avertissement_age(sha, date, ref)
    delta = delta_de_dette(dette, ex)
    if delta is None:
        print("⚠️ DELTA DE DETTE : la DetteDatee de HEAD est illisible — versement en bloc NON vérifié.")
    else:
        aj, re_ = delta
        print(f"delta de dette vs HEAD : +{len(aj)} −{len(re_)} (dette {len(dette)})" + (f" · versées : {', '.join(aj[:6])}{' …' if len(aj) > 6 else ''}" if aj else '') + (f" · levées : {', '.join(re_[:6])}{' …' if len(re_) > 6 else ''}" if re_ else ''))
        if len(aj) >= SEUIL_VERSEMENT_EN_BLOC:
            print(f"⚠️ VERSEMENT EN BLOC : {len(aj)} entrées versées en dette d'un coup (seuil {SEUIL_VERSEMENT_EN_BLOC}) — chaque entrée doit avoir son texte réel, son propriétaire et sa levée (ruling f2).")
    nb_parvaleur = sum(len(re.findall(r'Libelle\.ParValeur\(', ex.sans_commentaires(f.read_text(encoding='utf-8')))) for f in Path('Assets/Scripts').rglob('*.cs'))
    domaines = {k.split('.')[0] for k in set(servies) | dette | repli | set(K_dict)}
    enum_src = cles_des_fichiers_classes(table, ex, domaines)
    enumerees = set(enum_src)
    cles_t, rouges_t, n_res, n_non = analyser_textes(ex, table_t)
    # clés explicites de la table des `Gabarit` non littéraux : TÉMOIN de source dans le POOL de tous les littéraux du client (minuscules : une clé
    # composée `préfixe + "." + phase.ToLowerInvariant()` a son préfixe chez l'appelant et son suffixe dans `"DAWN"`) — plus faible que le témoin par
    # fichier de la table des appels de texte, mais jamais une liste de foi : une clé qui ne naît d'aucun littéral rougit.
    pool = set()
    for fp in Path('Assets/Scripts').rglob('*.cs'):
        pool |= {ex.decode(x).lower() for x in LITTERAL.findall(ex.recoller(ex.sans_commentaires(fp.read_text(encoding='utf-8'))))}
    for rel, (_, _, explicites) in table.items():
        for k in explicites:
            if not (k in pool or temoin_de_source(k, pool, ex.slug)):
                rouges_t.append(f"{rel} : clé explicite SANS TÉMOIN de source (aucun littéral du client ne la fait naître) : {k}")
    nouvelles_t = {k: v for k, v in cles_t.items() if k not in K_dict}
    K = set(K_dict) | enumerees | set(nouvelles_t)
    nl = sum(d[3] for d in detail_fichier.values())
    print(f"K_client : {len(K_dict)} clés lues + {len(enumerees)} énumérées = {len(K)} · servies {len(servies)} · dette {len(dette)} · repli voulu {len(repli)} · "
          f"appels Gabarit non littéraux {nl} (classés : {sum(t[0] for t in table.values())}) · appels de texte (De, helpers, ParValeur) à argument non littéral : {n_res} RÉSOLUS (+{len(nouvelles_t)} clés), {n_non} non résolus (épinglés : {sum(t[0] for t in table_t.values())}) · `Libelle.ParValeur` : {nb_parvaleur} appel(s) au total")

    rouges = []
    for nom, ks in verdict(K, servies, dette, repli).items():
        if ks:
            rouges.append((nom, ks))
    sites = verifier_sites(detail_fichier, table)
    appelants = verifier_appelants()
    for nom, ks in rouges:
        print(f"⛔ {nom} : {len(ks)}")
        for k in ks:
            print(f"     {k}\t{K_dict.get(k, '') or ('énumérée par ' + enum_src[k] if k in enum_src else (nouvelles_t[k][0] + ' [flux, ' + nouvelles_t[k][1] + ']' if k in nouvelles_t else ''))}")
    for s in sites + appelants + rouges_t:
        print('⛔ ' + s)
    if not (rouges or sites or appelants or rouges_t):
        print(f"✅ K_client ⊆ SERVIE ∪ DetteDatee ∪ RepliVoulu : « hors des trois : 0 » (K_client {len(K)} > 0, trois ensembles non vides).")
    if fraicheur == 'inconnu' and '--strict-instantane' in a:
        print("⛔ --strict-instantane : fraîcheur non vérifiée.")
        return 1
    return 1 if (rouges or sites or appelants or rouges_t or fraicheur == 'perime') else 0


if __name__ == '__main__':
    raise SystemExit(main())
