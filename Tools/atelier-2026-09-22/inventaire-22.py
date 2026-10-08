#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Les mots de ① (Intérieur de district, avec son chrome) et de ② (Fiche bâtiment), REGISTRE PAR REGISTRE — l'instrument de `22-…`.

Client : l'arbre de CLIENT-2 (`~/project/mafia-unity-F`, `HEAD`) ; back : `~/project/mafia-back-suite` (`HEAD`) — `EN_MESSAGES` et
`FR_MESSAGES` lus PAR LEUR NOM (jamais « la 1re occurrence »). Chaque site est classé :
  - `clé` : le texte passe par une clé (`Libelle.De`, `Cle`, `AddStatusRow` → `Cle("row", …)`, `Bande` → `Libelle.ParValeur`) ;
    la clé est dérivée comme le client la dérive (`Libelle.Slug` recopié) ;
  - `littéral` : le texte est posé tel quel (`NewText(…, "…")`, `return "…"`, `AddActionButton(…, "…")`) — aucune clé, donc le
    même mot dans les deux bundles.
Pour une clé : fr (FR_MESSAGES), en (EN_MESSAGES), et le constat — `ok` (fr et en servis, en ≠ fr) · `en == fr` · `fr absent`
(⚠️ `resolveBundle('fr')` = EN ⊕ FR : le bundle fr sert alors l'ANGLAIS) · `absente` (le client affiche son repli, et la garde
« zéro repli » le compte) ; et si le repli du client ≠ le fr servi (le mot change à l'écran quand la clé arrive).
Pour un littéral : les clés du back dont le fr vaut ce mot (une clé existe, le client ne la demande pas).

Contrôles : positif (`district.type_batiment.laboratoire` est servie, fr « Laboratoire ») ; négatif (un littéral inventé n'a aucune
clé) ; le lecteur de registre relit une valeur connue dans chaque registre.
Usage : python3 Tools/atelier-2026-09-22/inventaire-22.py [--client <sha>] [--back <sha>] [--annexe <fichier.md>] [--controle <annexe.md>]"""
import os, re, subprocess, sys, unicodedata
F, BACK = '/home/erutheone/project/mafia-unity-F', '/home/erutheone/project/mafia-back-suite'
sh = lambda d, *a: subprocess.run(['git', '-C', d, *a], capture_output=True, text=True).stdout.strip()
arg = lambda n, d: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d        # SHA épinglés : l'annexe se rejoue à l'identique
REV_F, REV_B = sh(F, 'rev-parse', '--short', arg('--client', 'HEAD')), sh(BACK, 'rev-parse', '--short', arg('--back', 'HEAD'))

def slug(s):                                            # `Libelle.Slug` (Libelle.cs:100-111)
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')

st = sh(BACK, 'show', f'{REV_B}:services/game-back/src/i18n/string_table.ts')
def registre(nom):
    d = st.index(nom); t = st[d:st.index('\n};', d)]
    return {m.group(1): ''.join(re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(2))).replace("\\'", "'")
            for m in re.finditer(r"^\s*'([^'\s]+)':\s*\n?\s*((?:'(?:[^'\\]|\\.)*'\s*\+?\s*)+),", t, re.M)}
EN, FR = registre('export const EN_MESSAGES'), registre('export const FR_MESSAGES')
par_fr = {}
for k, v in FR.items(): par_fr.setdefault(v.replace('’', "'"), []).append(k)

def source(p):
    t = sh(F, 'show', f'{REV_F}:{p}')
    return [re.sub(r'//.*$', '', l) if '"' not in l.split('//')[0] or l.strip().startswith('//') else l for l in t.split('\n')]
LIT = r'"((?:\\.|[^"\\])*)"'

def sites(p, regles):
    """[(ligne, mode, clé|None, littéral)] — `regles` = [(motif, construire(m) -> (mode, clé, littéral))]."""
    out = []
    for i, l in enumerate(source(p), 1):
        if l.strip().startswith('//') or l.strip().startswith('///'): continue
        for motif, f in regles:
            for m in re.finditer(motif, l): out.append((i,) + f(m))
    return out

def constat(mode, cle, lit):
    if mode == 'littéral':
        k = [x for x in par_fr.get(lit.replace('’', "'"), [])][:2]
        return ('—', '—', 'littéral seul' + (f' ; une clé fr existe : {", ".join(k)}' if k else ''))
    fr, en = FR.get(cle), EN.get(cle)
    if fr is None and en is None: c = 'absente (repli du client)'
    elif fr is None: c = '⚠️ fr absent : le bundle fr sert l’en'
    elif en is None: c = 'en absent'
    elif en == fr: c = 'en == fr'
    else: c = 'ok'
    if fr is not None and lit and fr.replace('’', "'") != lit.replace('’', "'") and not lit.startswith('('):
        c += f' ; repli client ≠ fr servi'
    return (fr if fr is not None else '∅', en if en is not None else '∅', c)

ECRANS = {
    '① fiche (bloc 5) et libellés de type — DistrictInteriorScreenController + LibellesBatiment': [
        ('Assets/Scripts/CityMap/DistrictInteriorScreenController.cs', [
            (r'Libelle\.De\("(\w+)",\s*"(\w+)",\s*' + LIT + r'\)', lambda m: ('clé', f'{m[1]}.{m[2]}.{slug(m[3])}', m[3])),
            (r'BuildFicheBouton\([^,]+,\s*' + LIT + r',\s*' + LIT, lambda m: ('littéral', None, m[2])),
            (r'ficheStatLibelles\[\d\]\.text = ' + LIT, lambda m: ('littéral', None, m[1])),
        ]),
        ('Assets/Scripts/CityMap/LibellesBatiment.cs', [
            (r'return ' + LIT + ';', lambda m: ('littéral', None, m[1])),
        ]),
    ],
    '① chrome — la barre et le médaillon (TopBarController, HeatBucketResolver, DayPhaseResolver), le dock (AppShell)': [
        ('Assets/Scripts/Shell/TopBarController.cs', [
            (r'NewText\("\w+",\s*' + LIT, lambda m: ('littéral', None, m[1])),
            (r'const string LibelleNotif\w* = ' + LIT, lambda m: ('littéral', None, m[1])),
        ]),
        ('Assets/Scripts/ShellContracts/HeatBucketResolver.cs', [
            (r'case "\w+": return ' + LIT + ';', lambda m: ('littéral', None, m[1])),
        ]),
        ('Assets/Scripts/ShellContracts/DayPhaseResolver.cs', [
            (r'case "\w+": return ' + LIT + ';', lambda m: ('littéral', None, m[1])),
        ]),
        ('Assets/Scripts/Shell/AppShell.cs', [
            (r'\(Tab\.\w+,\s*' + LIT + r'\)', lambda m: ('littéral', None, m[1])),
        ]),
    ],
    '② Fiche bâtiment — BuildingCardController': [
        ('Assets/Scripts/Operational/BuildingCard/BuildingCardController.cs', [
            (r'(?<![\w.])Cle\("(\w+)",\s*' + LIT + r'\)', lambda m: ('clé', f'building.{m[1]}.{slug(m[2])}', m[2])),
            (r'AddStatusRow\("\w+",\s*' + LIT, lambda m: ('clé', f'building.row.{slug(m[1])}', m[1])),
            (r'Bande\("(\w+)",\s*"(\w+)",\s*' + LIT + r'\)', lambda m: ('clé', f'building.{m[1]}.{slug(m[2])}', m[3])),
            (r'AddActionButton\([^,]+,\s*"\w+",\s*' + LIT, lambda m: ('littéral', None, m[1])),
            (r'\? ' + LIT + r' : ' + LIT, lambda m: ('littéral', None, m[1] + ' / ' + m[2])),
            (r'repairLabel = [^?]*\? ' + LIT, lambda m: ('littéral', None, m[1])),
        ]),
    ],
}

if '--cles-22' in sys.argv:
    # §7.1 de `22-…` : chaque clé proposée n'est PAS déjà servie ; fr sans apostrophe droite ; mêmes placeholders en fr et en ; aucun
    # chiffre hors placeholder ; les titres dérivés == `Libelle.De("district","fiche", littéral)` ; les familles `ParValeur` couvrent
    # EXACTEMENT les valeurs de l'énum servi (lu dans le code du back au même SHA, jamais recopié).
    doc = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '22-interieur-district-fiche-inventaire.md'), encoding='utf-8').read()
    sec = doc[doc.index('### 7.1 '):doc.index('### 7.2 ')]
    rows = {}
    for l in sec.split('\n'):
        m = re.match(r'\| `([a-z_.]+)` \| ([^|]+) \| ([^|]+) \|', l)
        if m: rows[m[1]] = (m[2].strip(), m[3].strip())
    enum = lambda chemin, nom: re.findall(r"'([A-Z_]+)'", re.search(nom + r"\s*=\s*([^;]+);", sh(BACK, 'show', f'{REV_B}:{chemin}'))[1])
    familles = {'district.harvest': enum('services/game-back/src/operational/capacity/capacity-guard.service.ts', r'export type HarvestBand'),
                'district.revenue': ['IDLE', 'EARNING'], 'heat.bucket': ['COLD', 'WARM', 'HOT', 'BURNING']}
    d = []
    assert familles['district.harvest'] == ['NOTHING', 'AVAILABLE', 'FULL'], f"lecteur d'énum : {familles['district.harvest']}"
    for k, (fr, en) in rows.items():
        # servie depuis (le back a repris la proposition) : conforme si elle sert EXACTEMENT nos mots, défaut sinon
        if (k in FR or k in EN) and (FR.get(k, '').replace("\\'", "'"), EN.get(k, '').replace("\\'", "'")) != (fr, en):
            d.append(f'{k} : servie à {REV_B} avec d\'autres mots — fr {FR.get(k)!r} / en {EN.get(k)!r}')
        if "'" in fr: d.append(f'{k} : apostrophe droite dans le fr')
        ph = lambda t: sorted(re.findall(r'\{(\w+)\}', t))
        if ph(fr) != ph(en): d.append(f'{k} : placeholders {ph(fr)} ≠ {ph(en)}')
        if re.search(r'\d', re.sub(r'\{\w+\}', '', fr + en)): d.append(f'{k} : chiffre hors placeholder')
        if k.startswith('district.fiche.') and not ph(fr) and k != 'district.fiche.' + slug(fr): d.append(f'{k} : ≠ slug du titre ({slug(fr)})')
        if fr == en: d.append(f'{k} : en == fr')
    for fam, vals in familles.items():
        vues = {k.split('.')[-1] for k in rows if k.startswith(fam + '.')}
        if vues != {slug(v) for v in vals}: d.append(f'{fam} : clés {sorted(vues)} ≠ énum {vals}')
    print(f'§7.1 : {len(rows)} clés · back {REV_B}'); [print('  ⛔', x) for x in d]
    print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)

# ── contrôles ──
assert FR.get('district.type_batiment.laboratoire') == 'Laboratoire', 'contrôle positif (FR)'
assert EN.get('game.legal.lawyer_tier.public_defender') == 'Public Defender', 'lecteur EN'
assert constat('littéral', None, 'Mot inventé que personne ne sert')[2] == 'littéral seul', 'contrôle négatif'

lignes, compte = [], {}
for titre, fichiers in ECRANS.items():
    lignes += ['', f'### {titre}', '', '| site | mode | littéral du client | clé | fr (FR_MESSAGES) | en (EN_MESSAGES) | constat |', '|---|---|---|---|---|---|---|']
    vus = set()
    for p, regles in fichiers:
        for ligne, mode, cle, lit in sites(p, regles):
            # un glyphe (« [#...] », « ‹ ») ou un tiret n'est pas un mot : il n'a pas de langue (TD-644)
            if (p, ligne, lit) in vus or not re.search(r'[A-Za-zÀ-ÿ]{2}', lit): continue
            vus.add((p, ligne, lit)); fr, en, c = constat(mode, cle, lit)
            compte.setdefault(titre, {}).setdefault(c.split(' ;')[0], 0); compte[titre][c.split(' ;')[0]] += 1
            lignes.append(f'| `{os.path.basename(p)}:{ligne}` | {mode} | {lit} | {"`" + cle + "`" if cle else "—"} | {fr} | {en} | {c} |')
entete = [f'# Annexe de `22-…` — les mots de ① et ②, site par site, registre par registre',
          '', f'> Généré par `Tools/atelier-2026-09-22/inventaire-22.py` — client `mafia-unity-F` `{REV_F}`, back `mafia-back-suite` `{REV_B}`'
          f' (FR {len(FR)} clés, EN {len(EN)} clés). Ne pas éditer à la main : relancer le script.']
texte = '\n'.join(entete + lignes) + '\n'
if '--controle' in sys.argv:                           # l'annexe versionnée doit être CE que le script produit aux mêmes SHA
    livree = open(sys.argv[sys.argv.index('--controle') + 1], encoding='utf-8').read()
    ok = livree == texte; print('contrôle de l\'annexe :', 'identique ✅' if ok else '⛔ DIFFÉRENTE — relancer avec --annexe')
    if not ok: sys.exit(1)
if '--annexe' in sys.argv:
    open(sys.argv[sys.argv.index('--annexe') + 1], 'w', encoding='utf-8').write(texte)
print(f'client {REV_F} · back {REV_B} · FR {len(FR)} · EN {len(EN)}')
for t, c in compte.items(): print(f'  {t[:60]} : ' + ' · '.join(f'{k} {v}' for k, v in sorted(c.items(), key=lambda x: -x[1])))
