#!/usr/bin/env python3
"""Vérification EXHAUSTIVE de Tools/juge-visuel/INDEX.md contre ses SOURCES, ligne par ligne (2026-09-07, demande f2).

Trois attributions fausses en une nuit, trois mécanismes (planche à deux écrans · planche d'un autre écran · cadres croisés) :
chaque garde posée attrapait le mécanisme précédent. Ici on confronte chaque ligne à ce que la SOURCE dit, par le CONTENU :

  nominal  — le cadre nominal (mandat pré-rempli) parle-t-il de CET écran ?  Critère : les ROUTES citées dans le cadre de
             l'atelier ∩ les routes du contrôleur (corps-reels/_index-<sym>.json), puis, à défaut, les mots du titre de
             l'écran dans le texte du cadre. Un cadre dont les routes désignent un AUTRE contrôleur = FAUX (avec le bon cadre
             quand le groupe en porte un qui matche).
  planche  — le fichier `planche` de la ligne est-il écrit par une suite qui monte CE contrôleur ?  Critère : les appels
             `CapturerLocataire<T>(shell, "nom", …)` (⇒ `planche_{nom}`) et, pour les autres noms, le `<XController>` le plus
             proche du littéral du fichier dans la suite qui le cite.

Sortie : CONFIRMÉ · FAUX (avec le bon cadre / le contrôleur réellement monté) · NON ÉTABLI. Contrôle positif intégré : les deux
croisements connus (⑮ ↔ #31, ⑰ ↔ #32) DOIVENT sortir FAUX — sinon l'instrument ne voit pas la classe. Exit 1 si un FAUX.
"""
import re, json, pathlib, glob, sys, unicodedata

RACINE = pathlib.Path(__file__).resolve().parents[2]
JV = RACINE / 'Tools/juge-visuel'
ATELIER = pathlib.Path('/home/erutheone/project/atelier3d-mafia')
TESTS = RACINE / 'Assets/Tests'

def norm(s): return unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()

# ── INDEX ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
lignes = []
for l in (JV / 'INDEX.md').read_text(encoding='utf-8').splitlines():
    if not l.startswith('| ') or l.startswith('| sym') or l.startswith('|---'): continue
    c = [x.strip() for x in l.strip('|').split('|')]
    if len(c) < 7: continue
    cadres = [(m.group(1), [int(x) for x in re.findall(r'\d+', m.group(2))]) for m in re.finditer(r'`([^`]+\.html)`\s*([\d,\s]+)', c[4])]
    lignes.append(dict(sym=c[0], nom=c[1], ctrl=c[2].strip('`'), dossier=c[3].strip('`'), cadres=cadres,
                       etat=c[7] if len(c) > 7 else '', planche=(re.findall(r'`([^`]+\.png)`', c[6]) or [None])[0]))

# ── nominal par mandat ───────────────────────────────────────────────────────────────────────────────────────────────
def nominal(dossier, sym):
    cands = [JV / dossier / f'mandat-{sym}.md', JV / dossier / 'mandat.md']
    for m in cands:
        if m.exists():
            g = re.search(r'cadre nominal `([^`]+)` #(\d+) rendu', m.read_text(encoding='utf-8'))
            if g: return g.group(1), int(g.group(2))
    return None

# ── cadres de l'atelier ─────────────────────────────────────────────────────────────────────────────────────────────
PAGES = {}
def page(nomp):
    """Segments par cadre. ⚠️ L'annotation `<!-- N : … -->` qui DÉCRIT un cadre précède son <div> : découpé naïvement, elle tombe
    dans le segment du cadre PRÉCÉDENT (c'est ce qui a fait sortir ⑮ CONFIRMÉ sur #31 au premier essai : le commentaire de #32,
    « 18 × GET /v1/city/district/:id/inspection », vivait dans le segment de #31). Les commentaires de fin de segment sont donc
    rattachés au cadre suivant."""
    if nomp not in PAGES:
        h = (ATELIER / nomp).read_text(encoding='utf-8', errors='replace')
        idx = [m.start() for m in re.finditer(r'<div class="cadre"', h)] + [len(h)]
        segs = [h[idx[i]:idx[i + 1]] for i in range(len(idx) - 1)]
        for i in range(len(segs) - 1):
            # `<!--(?:(?!-->).)*-->` : un commentaire ne peut pas enjamber un `-->` (avec `.*?` + DOTALL, le premier `<!--` du
            # segment avalait tout jusqu'au dernier `-->` de fin ⇒ segments VIDES, scores 0 uniformes — vu au contrôle positif).
            m = re.search(r'(?:\s*<!--(?:(?!-->).)*-->\s*)+$', segs[i], flags=re.S)
            if m:
                segs[i + 1] = m.group(0) + segs[i + 1]; segs[i] = segs[i][:m.start()]
        PAGES[nomp] = segs
    return PAGES[nomp]
ROUTE_RX = re.compile(r'(?:/v1/|\b(?:GET|POST|PUT|PATCH|DELETE)\s+/?(?:v1/)?)([a-z_]+(?:/[:{}a-z_0-9]+)+)')
def cadre_info(nomp, i):
    segs = page(nomp)
    if i >= len(segs): return None
    seg = segs[i]
    txt = norm(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', seg)))
    routes = {re.sub(r'\{[^}]*\}|:[a-z_]+', ':id', r).strip('/') for r in ROUTE_RX.findall(seg)}
    return dict(txt=txt, routes=routes)

# ── routes des contrôleurs (corps-reels) ─────────────────────────────────────────────────────────────────────────────
CTRL_ROUTES = {}
for f in glob.glob(str(JV / '*/corps-reels/_index*.json')):
    d = json.load(open(f, encoding='utf-8'))
    rs = {re.sub(r'\{[^}]*\}', ':id', r['route']).replace('/v1/', '').strip('/') for r in d.get('routes', [])}
    CTRL_ROUTES[d['controleur']] = rs

# ── planche → contrôleur monté (suites) ──────────────────────────────────────────────────────────────────────────────
PLANCHE_NOM = {}   # nom interpolé → contrôleur
FICHIER_CTRL = {}  # littéral de fichier → contrôleur le plus proche dans la suite
for cs in TESTS.rglob('*.cs'):
    src = cs.read_text(encoding='utf-8', errors='replace'); L = src.splitlines()
    for m in re.finditer(r'(?:CapturerLocataire|Capturer)<([\w.]+)>\(\s*shell\s*,\s*"([a-z_]+)"', src, flags=re.S):
        PLANCHE_NOM.setdefault(m.group(2), set()).add((m.group(1).split('.')[-1], cs.name))
    for n, line in enumerate(L):
        for lit in re.findall(r'"([A-Za-z0-9_./-]+\.png)"|"([A-Za-z0-9_./-]+)_\{', line):
            lit = [x for x in lit if x][0]
            fen = '\n'.join(L[max(0, n - 60):n + 6])
            g = re.findall(r'<([\w.]*?(\w+Controller))>', fen)
            if g: FICHIER_CTRL[pathlib.Path(lit).name] = (g[-1][1], cs.name)

# ── vérification ──────────────────────────────────────────────────────────────────────────────────────────────────────
STOP = {'screen', 'menu', 'more', 'view', 'card', 'detail', 'queue', 'board', 'week', 'home', 'first', 'time', 'player', 'shop', 'daily', 'review',
        'city', 'ecran', 'jour', 'vous', 'avez', 'dans', 'pour', 'avec', 'sans', 'les', 'des', 'une', 'canon', 'aucune', 'maquette', 'serie'}
def mots_ecran(l):
    # mots FRANÇAIS de l'écran : les « … » de la colonne état de front.md + le nom du dossier ; le nom canon (anglais) ne sert qu'en repli
    base = ' '.join(re.findall(r'«([^»]+)»', l['etat'])) + ' ' + l['dossier'].replace('_', ' ').replace('-', ' ') + ' ' + re.sub(r'`[^`]*`', ' ', l['nom'])
    return {w for w in re.findall(r'[a-z]{4,}', norm(base)) if w not in STOP}

GENERIQUE = {'city', 'me', 'id', 'district', 'v1', 'state', 'list', 'get', 'post'}
# un mot de route présent dans ≥ 15 cadres de la page ne discrimine rien (« heat » est dans 146 cadres, « order » matche « border »
# en sous-chaîne) : filtre par fréquence, comptage à FRONTIÈRE DE MOT.
def freq_page(nomp):
    segs = page(nomp); return lambda w: sum(1 for sg in segs if re.search(r'\b' + re.escape(w) + r'\b', norm(re.sub(r'<[^>]+>', ' ', sg))))
FREQ = {}
def segs_ctrl(c, nomp):
    if nomp not in FREQ: FREQ[nomp] = freq_page(nomp)
    return {w for r in CTRL_ROUTES.get(c, ()) for w in r.split('/')
            if len(w) >= 4 and w not in GENERIQUE and not w.startswith(':') and FREQ[nomp](w) < 15}
def score(ci, c, nomp):
    return 3 * len(ci['routes'] & CTRL_ROUTES.get(c, set())) + sum(len(re.findall(r'\b' + re.escape(w) + r'\b', ci['txt'])) for w in segs_ctrl(c, nomp))

res = []
for l in lignes:
    sym, ctrl = l['sym'], l['ctrl']
    nom = nominal(l['dossier'], sym)
    if not l['cadres'] or not nom:
        vn, dn = 'NON ÉTABLI', 'aucune maquette de série 4/6 ou aucun nominal dans le mandat'
    else:
        p, i = nom
        ci = cadre_info(p, i)
        if ci is None: vn, dn = 'NON ÉTABLI', f'cadre #{i} hors de la page {p}'
        else:
            sc = {c: score(ci, c, p) for c in CTRL_ROUTES}
            mien = sc.get(ctrl, 0); best = max(sc, key=sc.get); bs = sc[best]
            mots = mots_ecran(l); hits = {w for w in mots if w in ci['txt']}
            if mien > 0 and mien >= bs:
                vn, dn = 'CONFIRMÉ', f'#{i} : score {mien} pour {ctrl} (routes ∩ {sorted(ci["routes"] & CTRL_ROUTES[ctrl])}, mots {sorted(w for w in segs_ctrl(ctrl, p) if re.search(r"\\b" + w + r"\\b", ci["txt"]))})'
            elif bs >= 3 and bs >= mien + 2:
                bon = sorted(((score(cadre_info(l['cadres'][0][0], j), ctrl, l['cadres'][0][0]), j) for j in l['cadres'][0][1] if cadre_info(l['cadres'][0][0], j)), reverse=True)
                porte = sorted(w for w in segs_ctrl(best, p) if re.search(r'\\b' + re.escape(w) + r'\\b', ci['txt'])) + sorted(ci['routes'] & CTRL_ROUTES.get(best, set()))
                if bon and bon[0][0] > 0: vn, dn = 'FAUX', f'#{i} désigne {best} (score {bs} contre {mien}, porté par {porte}) ; bon cadre pour {ctrl} : #{bon[0][1]} (score {bon[0][0]})'
                else: vn, dn = 'NON ÉTABLI', f'#{i} : le cadre parle de {best} (score {bs}) et aucun cadre du groupe ne parle de {ctrl}'
            elif hits:
                vn, dn = 'CONFIRMÉ (titre)', f'#{i} : aucune route ni mot de route discriminant ; mots du titre présents {sorted(hits)}'
            else:
                vn, dn = 'NON ÉTABLI', f'#{i} : ni route, ni mot de route, ni mot du titre (meilleur score {best}={bs})'
    pl = l['planche']
    if not pl: vp, dp = 'NON ÉTABLI', 'aucune planche'
    else:
        m = re.match(r'planche_([a-z_]+)_1080x', pl)
        monte = None; via = None
        if m and m.group(1) in PLANCHE_NOM:
            paires = PLANCHE_NOM[m.group(1)]; monte = sorted({c for c, _ in paires}); via = ', '.join(sorted({f for _, f in paires}))
            monte = monte[0] if len(monte) == 1 else '/'.join(monte)
        elif pl in FICHIER_CTRL: monte, via = FICHIER_CTRL[pl]
        if monte is None: vp, dp = 'NON ÉTABLI', f'{pl} : aucune suite ne nomme ce fichier ni ce nom'
        elif monte == ctrl or ctrl.startswith(monte.split('Controller')[0]): vp, dp = 'CONFIRMÉ', f'{pl} ← {monte} ({via})'
        else: vp, dp = 'FAUX', f'{pl} est écrite en montant {monte} ({via}), pas {ctrl}'
    res.append((sym, ctrl, vn, dn, vp, dp))

# contrôle positif : les deux croisements connus doivent sortir FAUX côté nominal
cp = {r[0]: r[2] for r in res}
assert cp.get('⑮') == 'FAUX' and cp.get('⑰') == 'FAUX', f'contrôle positif RATÉ : ⑮={cp.get("⑮")} ⑰={cp.get("⑰")}'

W = max(len(r[1]) for r in res)
print(f"{'sym':3} {'contrôleur':{W}} | NOMINAL          | détail")
for r in res: print(f"{r[0]:3} {r[1]:{W}} | {r[2]:16} | {r[3]}")
print(); print(f"{'sym':3} {'contrôleur':{W}} | PLANCHE          | détail")
for r in res: print(f"{r[0]:3} {r[1]:{W}} | {r[4]:16} | {r[5]}")
from collections import Counter
cn, cpl = Counter(r[2].split(' ')[0] for r in res), Counter(r[4] for r in res)
print(f"\n{len(res)} lignes · nominal : {dict(cn)} · planche : {dict(cpl)} · contrôle positif (⑮/⑰ FAUX) OK")
sys.exit(1 if 'FAUX' in cn or 'FAUX' in cpl else 0)
