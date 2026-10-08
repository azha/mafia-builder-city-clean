#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""34 — le BALAYAGE COMPLET des mots des maquettes de série 6 contre le catalogue servi (commande f2 du 23/09).
Question : quelles maquettes montrent des libellés SANS SOURCE ? (ARBITRAGES 07/09 points 2 et 19 : jamais un libellé sans source.)

Pages : `ecrans-brennar-6.html` (la série), et les trois pages neuves à sa grammaire (⑦ `-7-lieutenant`, ④ `-accueil`, ㉕ `-25-tutoriel`).
Unité : un NŒUD DE TEXTE visible DANS le téléphone (`.ecran`), hors du chrome (`.barre`, ratifié à part) et du dock (`.dock9`) ; hors de
l'étiquette du cadre et de tout ce qui est hors du téléphone (les notes de DA). Écran d'un cadre : la table de `construire-dossiers.py`.
Classes, dans cet ordre (la première qui tient) :
  ponctuation         rien qu'un signe (›, —, ·, ▓…)
  nombre              un chiffre, une somme, une date (« 24 850 € », « 03 », « /6 », « 12H ») — une donnée, pas un libellé
  servi               égal à une valeur de FR_MESSAGES (casse, ’/' et point final ignorés ; un `{param}` du servi accepte tout)
  nom de fiction      un nom servi par le back en données (districts `fiction/vocabulaire-servi.json`, lieutenants, dealers,
                      avocats, enseignes : les pools du back)
  fragment servi      un morceau (≥ 10 caractères, deux mots) d'une valeur servie : la maquette coupe une phrase en plusieurs nœuds ;
                      un nœud qui JOINT des valeurs par « · », « — » ou « | » est servi si chaque morceau l'est
  proposé             marqué `class="prop"`, ou égal à une valeur des brouillons du back (`docs/content/i18n-staging/*.fr.json`) ou d'une
                      table de l'atelier (`30-…-v2`, `32-…`) non servie
  identifiant brut    `snake_case` / `SNAKE` / `a.b.c` : une valeur d'enum montrée telle quelle (voulu dans les cadres « ce que le back sert »)
  sans source         tout le reste
Contrôles : POSITIF — 25 valeurs servies tirées du catalogue, posées dans un faux cadre, doivent TOUTES sortir « servi » ; un vrai mot
servi de la série (« écarts », cadre 137 = `filiere.bloc.ecarts`) doit sortir « servi » ; NÉGATIF — 5 chaînes inventées doivent sortir
« sans source ». Le script s'arrête si un contrôle échoue.
Sorties : `34-balayage-mots-serie6-2026-09-23.tsv` (page · cadre · écran · mot · classe · clé ou source) et le résumé imprimé.
Usage : python3 Tools/atelier-2026-09-22/balayage-mots-serie6-2026-09-23.py"""
import collections, glob, html, importlib.util, json, os, random, re, subprocess, sys, unicodedata
from html.parser import HTMLParser

ICI = os.path.dirname(os.path.abspath(__file__)); RACINE = os.path.abspath(os.path.join(ICI, '..', '..'))
ATELIER = os.path.expanduser('~/project/atelier3d-mafia'); BACK = os.path.expanduser('~/project/mafia-back-suite')
PAGES = {'ecrans-brennar-6.html': None, 'ecrans-brennar-7-lieutenant.html': '⑦', 'ecrans-brennar-accueil.html': '④',
         'ecrans-brennar-25-tutoriel.html': '㉕'}

# ── le catalogue servi, par son nom ──────────────────────────────────────────────────────────────────────────────────────────────
st = subprocess.run(['git', '-C', BACK, 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'], capture_output=True, text=True).stdout
SHA_BACK = subprocess.run(['git', '-C', BACK, 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
def registre(nom):
    d = st.index(nom); t = st[d:st.index('\n};', d)]
    out = {}
    for m in re.finditer(r"^\s*'([^'\s]+)':\s*\n?\s*(?:'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\")", t, re.M):
        v = m.group(2) if m.group(2) is not None else m.group(3)
        out[m.group(1)] = v.replace("\\'", "'").replace('\\"', '"').replace('\\n', ' ')
    return out
FR = registre('export const FR_MESSAGES')

def norm(s):
    s = unicodedata.normalize('NFC', html.unescape(s)).replace('’', "'").replace(' ', ' ').replace('\xa0', ' ')
    s = re.sub(r'\s+', ' ', s).strip().lower()
    return s.rstrip('.:;,!?… ').strip()

EXACT = collections.defaultdict(list); MOTIFS = []
for k, v in FR.items():
    n = norm(v)
    if not n: continue
    if '{' in n:
        # un motif dont il ne reste presque rien hors des `{param}` (« {nom} », « {a} · {b} ») accepterait tout : exclu (payé : le
        # contrôle négatif l'a vu — cinq chaînes inventées sortaient « servi »)
        if len(re.sub(r'[^a-zà-ÿœ]', '', re.sub(r'\{[^}]*\}', '', n))) < 4: continue
        MOTIFS.append((re.compile('^' + re.sub(r'\\\{[^}]*\\\}', '.+', re.escape(n)) + '$'), k))
    else:
        EXACT[n].append(k)
CORPUS = [norm(v) for v in FR.values()]

# ── les noms de fiction servis en données ────────────────────────────────────────────────────────────────────────────────────────
FICTION = set()
try:
    voc = json.load(open(os.path.join(ATELIER, 'fiction', 'vocabulaire-servi.json'), encoding='utf-8'))
    def _cueillir(x):
        if isinstance(x, str): FICTION.add(norm(x))
        elif isinstance(x, dict): [_cueillir(v) for v in x.values()]
        elif isinstance(x, list): [_cueillir(v) for v in x]
    _cueillir(voc)
except Exception:
    pass
for f in ('common/building-signs.ts', 'common/dealer-names.ts', 'operational/lieutenant/lieutenant-name-pool.ts', 'operational/legal/lawyer-name-pool.ts'):
    t = subprocess.run(['git', '-C', BACK, 'show', f'HEAD:services/game-back/src/{f}'], capture_output=True, text=True).stdout
    t = re.sub(r'//[^\n]*|/\*[\s\S]*?\*/', '', t)
    for s in re.findall(r"'([^'\n]{2,40})'", t):
        FICTION.add(norm(s)); FICTION.add(norm('Lt. ' + s))
FICTION.discard('')

# ── les proposés : brouillons du back, tables de l'atelier ───────────────────────────────────────────────────────────────────────
PROPOSES = {}
for f in glob.glob(os.path.join(BACK, 'docs/content/i18n-staging/*.fr.json')):
    try:
        d = json.load(open(f, encoding='utf-8'))
    except Exception:
        continue
    for k, v in (d.items() if isinstance(d, dict) else []):
        if isinstance(v, str) and norm(v) not in EXACT: PROPOSES[norm(v)] = f'brouillon back {os.path.basename(f)} : {k}'
for f in ('30-litteraux-nommes-v2-2026-09-23.tsv', '32-filiere-ecart-2026-09-23.tsv'):
    p = os.path.join(ICI, f)
    if not os.path.exists(p): continue
    for l in open(p, encoding='utf-8').read().split('\n')[1:]:
        c = l.split('\t')
        if len(c) > 4 and norm(c[4] if f.startswith('30') else c[1]) not in EXACT:
            PROPOSES[norm(c[4] if f.startswith('30') else c[1])] = f'atelier {f} : {c[3] if f.startswith("30") else c[0]}'

PONCT = re.compile(r'^[\W_]+$')
NOMBRE = re.compile(r'^[\d\s.,:/%×x+−\-€$h()]*\d[\d\s.,:/%×x+−\-€$hHjJ()]*$|^(?:jour|j)\s*\d+$', re.I)
IDENT = re.compile(r'^(?:[a-z0-9]+(?:[_.][a-z0-9]+)+|[A-Z0-9]+(?:_[A-Z0-9]+)+)$')

def classer(brut, prop=False, composer=True):
    t = norm(brut)
    if not t or PONCT.match(t): return 'ponctuation', ''
    if NOMBRE.match(t): return 'nombre', ''
    if t in EXACT: return 'servi', ' '.join(EXACT[t][:3])
    for rx, k in MOTIFS:
        if rx.match(t): return 'servi', k
    if prop: return 'proposé', 'class="prop"'
    if t in FICTION: return 'nom de fiction', ''
    # un nœud qui JOINT plusieurs valeurs (« Cuisinier · Exécutant · Délégué ») : chaque morceau est classé ; servi si tous le sont
    parts = [x for x in re.split(r'\s+[·—|]\s+', brut.strip()) if x.strip()]
    if composer and len(parts) > 1:
        cl = [classer(x, composer=False) for x in parts]
        if all(c in ('servi', 'nombre', 'nom de fiction', 'ponctuation') for c, _ in cl):
            return 'servi', 'composé : ' + ' + '.join(k or c for c, k in cl)
    # un morceau de phrase servie (la maquette coupe une phrase en nœuds) : au moins 10 caractères et deux mots, sinon « rendre » tiendrait partout
    if len(t) >= 10 and ' ' in t:
        for v in CORPUS:
            if t in v: return 'fragment servi', ''
    if t in PROPOSES: return 'proposé', PROPOSES[t]
    if IDENT.match(brut.strip()): return 'identifiant brut', ''
    return 'sans source', ''

# ── la lecture des pages ─────────────────────────────────────────────────────────────────────────────────────────────────────────
VIDES = {'br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr', 'col', 'area', 'base', 'embed', 'param', 'track'}
class Lecteur(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.pile = []; self.cadre = -1; self.noeuds = []
    def handle_starttag(self, tag, attrs):
        cls = dict(attrs).get('class') or ''
        if tag == 'div' and cls == 'cadre': self.cadre += 1
        if tag in VIDES: return
        self.pile.append((tag, set(cls.split())))
    def handle_startendtag(self, tag, attrs): pass
    def handle_endtag(self, tag):
        if tag in VIDES: return
        for i in range(len(self.pile) - 1, -1, -1):
            if self.pile[i][0] == tag: del self.pile[i:]; break
    def handle_data(self, data):
        if not data.strip() or self.cadre < 0: return
        classes = set().union(*[c for _, c in self.pile]) if self.pile else set()
        tags = {t for t, _ in self.pile}
        if 'ecran' not in classes or classes & {'barre', 'dock9', 'etiquette'} or tags & {'style', 'script'}: return
        self.noeuds.append((self.cadre, data, 'prop' in classes))

def ecran_de_cadre():
    sp = importlib.util.spec_from_file_location('cd', os.path.join(RACINE, 'Tools/juge-visuel/construire-dossiers.py'))
    cd = importlib.util.module_from_spec(sp); sp.loader.exec_module(cd)
    m = collections.defaultdict(list)
    for r in cd.TABLE + cd.HORS_APPSHELL:
        for page, nums in r.get('cadres') or []:
            if os.path.basename(str(page)) == 'ecrans-brennar-6.html':
                for n in nums: m[n].append(r['sym'])
    return m

def controles():
    tirage = random.Random(23).sample(sorted(v for v in FR.values() if '{' not in v and len(norm(v)) > 2), 25)
    faux = '<div class="cadre"><div class="tel"><div class="ecran">' + ''.join(f'<span>{html.escape(v)}</span>' for v in tirage) + \
           ''.join(f'<i>{x}</i>' for x in ('Zorblax du quai', 'la caisse tourne à l’envers', 'Tampon vermillon', 'Kwertz', 'un mot que personne n’a écrit')) + \
           '</div></div></div>'
    L = Lecteur(); L.feed(faux); cl = [classer(d)[0] for _, d, _ in L.noeuds]
    ok_pos = cl[:25] == ['servi'] * 25; ok_neg = cl[25:] == ['sans source'] * 5
    ok_reel = classer('écarts')[0] == 'servi' and 'filiere.bloc.ecarts' in classer('écarts')[1]
    print(f'contrôle positif (25 servis tirés du catalogue) : {"OK" if ok_pos else "ÉCHEC " + str(cl[:25])}')
    print(f'contrôle négatif (5 chaînes inventées) : {"OK" if ok_neg else "ÉCHEC " + str(cl[25:])}')
    print(f'contrôle réel (« écarts », cadre 137 → filiere.bloc.ecarts) : {"OK" if ok_reel else "ÉCHEC"}')
    if not (ok_pos and ok_neg and ok_reel): sys.exit('⛔ contrôle en échec : balayage non écrit')

def main():
    print(f'catalogue FR : {len(FR)} valeurs (back {SHA_BACK}) · noms de fiction : {len(FICTION)} · proposés connus : {len(PROPOSES)}')
    controles()
    ecrans = ecran_de_cadre(); lignes = ['\t'.join(['page', 'cadre', 'écran', 'mot', 'classe', 'clé ou source'])]
    total = collections.Counter(); par_ecran = collections.defaultdict(collections.Counter); sans = collections.defaultdict(collections.Counter)
    for page, sym in PAGES.items():
        L = Lecteur(); L.feed(open(os.path.join(ATELIER, page), encoding='utf-8').read())
        for n, d, prop in L.noeuds:
            c, k = classer(d, prop)
            if c == 'ponctuation': continue
            e = sym or ('·'.join(ecrans.get(n, [])) or '(aucun écran)')
            mot = re.sub(r'\s+', ' ', d).strip()
            lignes.append('\t'.join([page, str(n), e, mot, c, k]))
            total[c] += 1; par_ecran[e][c] += 1
            if c == 'sans source': sans[e][mot] += 1
    open(os.path.join(ICI, '34-balayage-mots-serie6-2026-09-23.tsv'), 'w', encoding='utf-8').write('\n'.join(lignes) + '\n')
    print(f'\n{len(lignes) - 1} mots (ponctuation exclue) — ' + ' · '.join(f'{c} {n}' for c, n in total.most_common()))
    print('\npar écran (classé par « sans source » distincts) :')
    for e, c in sorted(par_ecran.items(), key=lambda x: -len(sans[x[0]])):
        print(f'  {e:14} sans source {len(sans[e]):4} distincts ({c["sans source"]:4}) · servi {c["servi"]:4} · fragment {c["fragment servi"]:3} · '
              f'fiction {c["nom de fiction"]:3} · proposé {c["proposé"]:3} · brut {c["identifiant brut"]:3} · nombre {c["nombre"]:4}')
    return par_ecran, sans

if __name__ == '__main__':
    main()
