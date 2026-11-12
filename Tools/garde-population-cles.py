#!/usr/bin/env python3
"""GARDE STATIQUE DE POPULATION — toute clé i18n que le client PEUT afficher est SERVIE, en DETTE DATÉE ou en REPLI VOULU.

    python3 Tools/garde-population-cles.py                 # la garde (rc 0 vert · 1 rouge · 2 instrument en panne)
    python3 Tools/garde-population-cles.py --rafraichir    # RAFRAÎCHIT l'instantané « servi » (f2, à chaque gate back)
    python3 Tools/garde-population-cles.py --rafraichir gate/cumul-2026-11-15     # …sur un ref nommé

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


def ref_cumul_back_recent():
    """(ref, sha complet) du dernier `gate/cumul-*` du back (date de commit la plus récente), ou None."""
    try:
        out = subprocess.run(['git', '-C', str(BACK), 'for-each-ref', '--sort=-committerdate',
                              '--format=%(refname:short) %(objectname)', 'refs/heads/gate/cumul-*'],
                             capture_output=True, text=True, check=True).stdout.split('\n')[0].split()
        return (out[0], out[1]) if len(out) == 2 else None
    except (subprocess.CalledProcessError, FileNotFoundError, IndexError):
        return None


def ecrire_instantane(ref):
    if ref is None:
        r = ref_cumul_back_recent()
        if r is None:
            print(f"⛔ aucun gate/cumul-* lisible dans {BACK} (MAFIA_BACK) — rien rafraîchi.", file=sys.stderr)
            return 2
        ref = r[0]
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
    """Imprime l'âge et le SHA à CHAQUE lancement ; renvoie True s'il y a un avertissement nommé de péremption."""
    try:
        age = (datetime.date.today() - datetime.date.fromisoformat(date)).days
    except ValueError:
        age = None
    print(f"instantané « servi » : back {sha[:8]} ({ref}), du {date}, âge {age if age is not None else '?'} j")
    recent = ref_cumul_back_recent()
    if recent is None:
        print(f"⚠️ INSTANTANÉ : dernier cumul back gaté ILLISIBLE (MAFIA_BACK={BACK}) — fraîcheur NON vérifiée, ce n'est pas « à jour ».")
        return True
    rref, rsha = recent
    if rsha == sha:
        print(f"   à jour : c'est la tête de {rref}.")
        return False
    try:
        devant = subprocess.run(['git', '-C', str(BACK), 'rev-list', '--count', f'{sha}..{rsha}'], capture_output=True, text=True, check=True).stdout.strip()
        retard = f"{devant} commit(s) de retard"
    except subprocess.CalledProcessError:
        retard = "SHA de l'instantané inconnu du back (autre histoire)"
    print(f"⚠️ INSTANTANÉ PÉRIMÉ : le dernier cumul back est {rref} @ {rsha[:8]} — {retard}. Rafraîchir : "
          f"`python3 Tools/garde-population-cles.py --rafraichir` (f2, à chaque gate back).")
    return True


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
    # l'appelant
    if appelant_present("rien à voir") or not appelant_present("rc |= garde_population()  # Tools/garde-population-cles.py"):
        e.append("contrôle rouge : la détection de l'appelant se trompe sur du texte fabriqué")
    return e


def appelant_present(texte_typecheck: str) -> bool:
    return 'garde-population-cles.py' in texte_typecheck


def verifier_appelants() -> list:
    rouges = []
    if not TYPECHECK.exists() or not appelant_present(TYPECHECK.read_text(encoding='utf-8')):
        rouges.append(f"APPELANT DISPARU : {TYPECHECK} (`--tout`) n'appelle plus garde-population-cles.py — la garde ne tourne plus nulle part")
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
    if table is None:
        print(f"⛔ table des sites non littéraux absente ou illisible : {TABLE_SITES}", file=sys.stderr)
        return 2
    if not K_dict:
        print("⛔ K_client VIDE — rien regardé.", file=sys.stderr)
        return 2

    perime = avertissement_age(sha, date, ref)
    domaines = {k.split('.')[0] for k in set(servies) | dette | repli | set(K_dict)}
    enum_src = cles_des_fichiers_classes(table, ex, domaines)
    enumerees = set(enum_src)
    K = set(K_dict) | enumerees
    nl = sum(d[3] for d in detail_fichier.values())
    print(f"K_client : {len(K_dict)} clés lues + {len(enumerees)} énumérées = {len(K)} · servies {len(servies)} · dette {len(dette)} · repli voulu {len(repli)} · "
          f"appels Gabarit non littéraux {nl} (classés : {sum(t[0] for t in table.values())}) · ParValeur non listés (clé née d'une valeur servie)")

    rouges = []
    for nom, ks in verdict(K, servies, dette, repli).items():
        if ks:
            rouges.append((nom, ks))
    sites = verifier_sites(detail_fichier, table)
    appelants = verifier_appelants()
    for nom, ks in rouges:
        print(f"⛔ {nom} : {len(ks)}")
        for k in ks:
            print(f"     {k}\t{K_dict.get(k, '') or ('énumérée par ' + enum_src[k] if k in enum_src else '')}")
    for s in sites + appelants:
        print('⛔ ' + s)
    if not (rouges or sites or appelants):
        print(f"✅ K_client ⊆ SERVIE ∪ DetteDatee ∪ RepliVoulu : « hors des trois : 0 » (K_client {len(K)} > 0, trois ensembles non vides).")
    if perime and '--strict-instantane' in a:
        print("⛔ --strict-instantane : instantané périmé ou fraîcheur non vérifiée.")
        return 1
    return 1 if (rouges or sites or appelants) else 0


if __name__ == '__main__':
    raise SystemExit(main())
