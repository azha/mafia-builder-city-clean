#!/usr/bin/env python3
"""La TABLE « valeur nommée → littéral hors Libelle » (décision f2 du 23/09) : chaque site où un résolveur de texte rend un
LITTÉRAL à lettres pour une valeur NOMMÉE, avec la clé que `Libelle.De(domaine, rôle, fr)` DÉRIVERA quand le site y passera,
et le fr recopié À L'OCTET depuis le code (sauf l'apostrophe : `’`, règle D10). L'atelier n'écrit que l'EN (et le FR des littéraux anglais) ; le back sert.
    python3 Tools/juge-donnees/i18n-litteraux-nommes.py [--back <sha>] > table.tsv
Formes lues : `case "v": return "lit";` (cases empilés compris) et les ternaires `x == "v" ? "lit"`. Hors table, déclaré :
les glyphes « [..] », `MotDuType` (repli de `building.type.*` déjà servi, par ParValeur), les endonymes de Settings."""
import os, re, subprocess, sys, unicodedata
BACK = '/home/erutheone/project/mafia-back-suite'
REV = sys.argv[sys.argv.index('--back') + 1] if '--back' in sys.argv else 'HEAD'
REV = subprocess.run(['git', '-C', BACK, 'rev-parse', '--short', REV], capture_output=True, text=True).stdout.strip() or REV
def slug(s):                                             # `Libelle.Slug`, recopié (Libelle.cs)
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')
st = subprocess.run(['git', '-C', BACK, 'show', f'{REV}:services/game-back/src/i18n/string_table.ts'], capture_output=True, text=True).stdout
def registre(nom):
    d = st.index(nom); t = st[d:st.index('\n};', d)]
    return {m.group(1): ''.join(re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(2))).replace("\\'", "'")
            for m in re.finditer(r"^\s*'([^'\s]+)':\s*\n?\s*((?:'(?:[^'\\]|\\.)*'\s*\+?\s*)+),", t, re.M)}
FR, EN = registre('export const FR_MESSAGES'), registre('export const EN_MESSAGES')
# fichier → (domaine, rôle) : le domaine que le fichier emploie DÉJÀ dans `Libelle.De`, rôle « bloc » (patron du 29) ; sinon proposé.
ESPACE = {
 'ChaineDApproScreenController.cs': ('appro', 'bloc'), 'ConflitScreenController.cs': ('conflit', 'bloc'),
 'DemolitionScreenController.cs': ('demolition', 'ecran'), 'DistributionScreenController.cs': ('distribution', 'bloc'),
 'LoiScreenController.cs': ('loi', 'bloc'), 'CityMapController.cs': ('carte', 'bloc'), 'TissuDeDistrict.cs': ('carte', 'tissu'),
 'DayPhaseResolver.cs': ('chrome', 'phase'), 'SellingScreenController.cs': ('vente', 'bloc'),
 'PrecinctScreenController.cs': ('commissariat', 'bloc'), 'RuleModel.cs': ('famille', 'regle'),
 'LieutenantScreenController.cs': ('famille', 'regle'),
}
ROLE_PAR_RESOLVEUR = {'Anciennete': ('famille', 'anciennete'), 'Portee': ('decision', 'portee'), 'Urgence': ('decision', 'urgence'),
                      'ReserveLibelle': ('revue', 'reserve')}
EXCLUS_FN = {'MotDuType'}
ANGLAIS = {'run the default behavior', 'pause operations', 'Run default', 'Pause ops', 'in my building', 'in my zone'}
sig = re.compile(r'\bstatic\s+string\s+(\w+)\s*\(')
casel = re.compile(r'case\s+"([^"]*)"\s*:\s*(?:case\s+"[^"]*"\s*:\s*)*return\s+"((?:[^"\\]|\\.)*)"\s*;')
tern = re.compile(r'==\s*"([A-Za-z_]+)"\s*\?\s*"((?:[^"\\]|\\.)*)"')
lignes = []
for d, _, fs in os.walk('Assets/Scripts'):
    for f in sorted(fs):
        if not f.endswith('.cs'): continue
        p = os.path.join(d, f); L = open(p, encoding='utf-8').read().split('\n'); fn = None
        for i, l in enumerate(L):
            m = sig.search(l)
            if m: fn = m.group(1)
            if l.strip().startswith('//') or f == 'SettingsScreenController.cs' or fn in EXCLUS_FN: continue
            for rx in (casel, tern):
                for m in rx.finditer(l):
                    v, lit = m.group(1), m.group(2)
                    if not re.search(r'[A-Za-zÀ-ÿ]', lit) or re.fullmatch(r'\[[^\]]*\]', lit): continue
                    if rx is tern and (v in ('true', 'false') or lit in ('true', 'false', 'same_building')): continue
                    dom, role = ROLE_PAR_RESOLVEUR.get(fn) or ESPACE.get(f, ('?', '?'))
                    en_lit = lit in ANGLAIS
                    cle = f'{dom}.{role}.{slug(lit)}' if not en_lit else f'{dom}.{role}.<à dériver du fr de l’atelier>'
                    # Règle D10 : l'apostrophe servie est `’`. Le fr de la table la prend déjà (le code passera au `’` dans le lot) ; la
                    # clé ne change pas (`Slug` fait de l'une et de l'autre un séparateur).
                    lit_fr = lit.replace("'", "’")
                    servi = FR.get(cle)
                    etat = ('SERVIE, fr identique' if servi == lit_fr else f'SERVIE, fr DIFFÉRENT « {servi} »') if servi is not None else 'non servie'
                    if not en_lit and lit_fr != lit: etat += ' · ’ (D10) au lieu du \' du code'
                    lignes.append((f'{p}:{i + 1}', fn or '?', v, cle, '' if en_lit else lit_fr, lit if en_lit else '', etat))
print('site\trésolveur\tvaleur servie\tclé dérivée\tfr (octet)\ten\tétat au back ' + REV)
for r in lignes: print('\t'.join(r))
cles = {}
for r in lignes: cles.setdefault(r[3], set()).add(r[4])
coll = {k: v for k, v in cles.items() if len(v) > 1}
print(f'# {len(lignes)} sites · {len(set(r[1] for r in lignes))} résolveurs · {len(cles)} clés · collisions de clé à fr différents : {len(coll)} {coll or ""}', file=sys.stderr)
