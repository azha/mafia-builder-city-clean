#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Clés i18n ORPHELINES produites par une réécriture de littéral — mesurées, pas devinées.

`Libelle.De(domaine, role, litteral)` dérive sa clé du LITTÉRAL (`domaine.role.slug`). Réécrire le
littéral change donc la clé : l'ancienne, si le bundle la servait, devient ORPHELINE (servie, jamais
plus demandée) et la nouvelle MANQUE (l'écran se replie sur le littéral, `Libelle.NbReplis` monte).

⛔ POURQUOI PAR LA MESURE ET PAS PAR LE CODE. Beaucoup d'écrans passent leurs libellés par des aides
(`Manque(…)`, `RenderBar(…)`, `Lib(role, …)`) qui dérivent la clé sans appel `Libelle.De` visible au
site : lire le code ne dit pas quel littéral est keyé. Ce script le décide par l'EFFET : un littéral
retiré dont la clé dérivée (dans un domaine que le fichier emploie) est SERVIE par le bundle mesuré.
Un littéral keyé dont l'ancienne clé n'était pas servie ne produit pas d'orpheline : il n'est pas ici.

MÉTHODE : pour chaque commit de la plage, chaque fichier Assets/Scripts touché est lu EN ENTIER aux deux
versions, commentaires retirés, et ses expressions littérales reconstituées (`"…" + "…"` sur plusieurs
lignes compris — un littéral coupé a UNE clé, celle du texte entier). Les expressions disparues et
apparues sont appariées par bloc de diff, dans l'ordre. Les littéraux interpolés (`$"…"`) sont exclus.

Usage : python3 orphelines.py <bundle-fr.json> <bundle-en.json> <commit-de-base> <commit-de-fin>
        [--json sortie.json] [--md table.md --lots "C=a..b,D t1=c..d,…"]
La table Markdown est PRODUITE par ce script (source unique du français pour le back) : ne pas l'éditer à la main.
"""
import pathlib, json, re, subprocess, sys, unicodedata, difflib, collections

def slug(s):
    out = []
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): out.append(c.lower())
        elif out and out[-1] != '_': out.append('_')
    return ''.join(out).strip('_')

def sans_commentaires(t):
    """Remplace commentaires par des espaces (sauts de ligne gardés) ; respecte "…", @"…", '…'."""
    o, i, n = [], 0, len(t)
    while i < n:
        c = t[i]; d = t[i + 1] if i + 1 < n else ''
        if c == '/' and d == '/':
            while i < n and t[i] != '\n': o.append(' '); i += 1
        elif c == '/' and d == '*':
            while i < n and not (t[i] == '*' and i + 1 < n and t[i + 1] == '/'):
                o.append('\n' if t[i] == '\n' else ' '); i += 1
            o.append('  '); i += 2
        elif c == '@' and d == '"':
            o.append('@"'); i += 2
            while i < n:
                if t[i] == '"' and i + 1 < n and t[i + 1] == '"': o.append('""'); i += 2; continue
                o.append(t[i]); i += 1
                if t[i - 1] == '"': break
        elif c == '"':
            o.append(c); i += 1
            while i < n and t[i] != '"' and t[i] != '\n':
                if t[i] == '\\': o.append(t[i:i + 2]); i += 2; continue
                o.append(t[i]); i += 1
            if i < n: o.append(t[i]); i += 1
        elif c == "'":
            o.append(c); i += 1
            while i < n and t[i] != "'" and t[i] != '\n':
                if t[i] == '\\': o.append(t[i:i + 2]); i += 2; continue
                o.append(t[i]); i += 1
            if i < n: o.append(t[i]); i += 1
        else:
            o.append(c); i += 1
    return ''.join(o)

LIT = re.compile(r'"(?:[^"\\\n]|\\.)*"')
ESC = {'\\"': '"', '\\\\': '\\', '\\n': '\n', '\\t': '\t', "\\'": "'", '\\0': '\0'}

def dechappe(s):
    return re.sub(r'\\u([0-9a-fA-F]{4})|\\.', lambda m: chr(int(m.group(1), 16)) if m.group(1) else ESC.get(m.group(0), m.group(0)), s)

def expressions(texte):
    """[(ligne_debut, ligne_fin, texte_complet)] — 0-based ; littéraux joints par `+` = une expression."""
    t = sans_commentaires(texte)
    toks = []
    for m in LIT.finditer(t):
        avant = t[max(0, m.start() - 2):m.start()]
        if avant.endswith('$') or avant.endswith('@') or avant.endswith('$@') or avant.endswith('@$'): continue
        toks.append(m)
    out, k = [], 0
    while k < len(toks):
        debut = toks[k]; morceaux = [dechappe(debut.group(0)[1:-1])]; fin = debut
        while k + 1 < len(toks) and re.fullmatch(r'\s*\+\s*', t[fin.end():toks[k + 1].start()]):
            k += 1; fin = toks[k]; morceaux.append(dechappe(fin.group(0)[1:-1]))
        out.append((t.count('\n', 0, debut.start()), t.count('\n', 0, fin.end()), ''.join(morceaux)))
        k += 1
    return out

BANDE = re.compile(r'Bande\("([a-z_]+)", "([^"]+)", "((?:[^"\\]|\\.)*)"\)')
PARVALEUR = re.compile(r'Libelle\.ParValeur\("([a-z_]+)", "([a-z_]+)", "([^"]+)", "((?:[^"\\]|\\.)*)"\)')

def par_valeur(texte, fichier):
    """clé → repli, pour les sites keyés par la VALEUR servie (`Libelle.ParValeur`, `Bande` de ② = domaine building)."""
    out = {}
    if fichier.endswith('BuildingCardController.cs'):
        for role, val, repli in BANDE.findall(texte): out[f'building.{role}.{slug(val)}'] = dechappe(repli)
    for dom, role, val, repli in PARVALEUR.findall(texte): out[f'{dom}.{role}.{slug(val)}'] = dechappe(repli)
    return out

# ⛔ FAMILLE — « cette clé, qui la DEMANDE ? ». Une clé servie que plus personne ne demande ne se voit pas dans un bundle : elle
#    ressemble trait pour trait à une clé vivante. Demandé par f7 le 2026-09-22 sur `district.type_batiment.*`, où le back porte
#    DEUX familles (slug français et slug anglais) dont il n'émet aucune. On compte les SITES du couple (domaine, rôle) dans
#    `Assets`, littéraux ET à argument variable : un site à argument variable pourrait demander n'importe quelle clé de la famille,
#    donc sa présence interdit de conclure « demandée nulle part ».
def sites_de_famille(domaine, role, racine=None):
    # racine ABSOLUE (même défaut que `git()` : le répertoire courant n'a rien à voir avec le dépôt).
    racine = racine or pathlib.Path(__file__).resolve().parents[3] / 'Assets'
    tous = re.compile(r'Libelle\.(?:De|CleDe|ParValeur)\(\s*"' + domaine + r'"\s*,\s*"' + role + r'"\s*,')
    litt = re.compile(r'Libelle\.(?:De|CleDe|ParValeur)\(\s*"' + domaine + r'"\s*,\s*"' + role + r'"\s*,\s*"((?:[^"\\]|\\.)*)"')
    demandes, variables = {}, []
    for f in sorted(racine.rglob('*.cs')):
        t = sans_commentaires(f.read_text(encoding='utf-8', errors='replace'))
        for m in litt.finditer(t):
            cle = f'{domaine}.{role}.{slug(dechappe(m.group(1)))}'
            demandes.setdefault(cle, []).append(f"{f.name}:{t.count(chr(10), 0, m.start()) + 1}")
        n = len(tous.findall(t)) - len(litt.findall(t))
        if n > 0: variables.append(f"{f.name} ({n})")
    return demandes, variables


def git(*a):
    # ⛔ DEPUIS LA RACINE DU DÉPÔT, quel que soit le répertoire courant : le filtre `-- Assets/Scripts` est un chemin RELATIF
    #    au répertoire courant. Lancé depuis `Tools/juge-donnees/i18n` (là où sont les bundles), il ne voyait AUCUN fichier et
    #    la table sortait vide sans erreur — mesuré le 22/09 en ajoutant `--anterieure`, dont le garde « non trouvée » a mordu.
    r = subprocess.run(['git', *a], capture_output=True, text=True,
                       cwd=pathlib.Path(__file__).resolve().parents[3])
    return r.stdout if r.returncode == 0 else None

ECRANS = {'Carnet': '㉞ les ordres du soir', 'Conflit': '㉙ le conflit', 'Filiere': '㊵ la filière', 'Forensic': '㊴ le dossier',
          'Horizon': "㊱ l'horizon", 'Journal': '㊳ le journal', 'Loi': '㉛ la loi', 'Distribution': '㉘ la distribution',
          'AutonomyInbox': '㉔ les télégrammes', 'BuildingCard': '② la fiche du bâtiment'}

def unique(lignes, lots):
    uniq = collections.OrderedDict()
    for l in lignes:
        k = l['ancienne']; site = f"{l['fichier'].split('/')[-1]}:{l['ligne']}"
        if k in uniq:
            if uniq[k]['nouvelle'] != l['nouvelle']:
                uniq[k].setdefault('conflits', []).append(f"{site} → {l['nouvelle']} ({l['commit']})"); continue
            uniq[k]['sites'].append(site); continue
        base = l['fichier'].split('/')[-1].replace('ScreenController.cs', '').replace('Controller.cs', '')
        uniq[k] = dict(ecran=ECRANS.get(base, base), fichier=l['fichier'], sites=[site], ancienne=k,
                       servie_fr=l['servie_fr'], servie_en=l['servie_en'], nouvelle=l['nouvelle'], texte_fr=l['texte_fr'],
                       nouvelle_deja_servie=l['nouvelle_deja_servie'], nouvelle_derivee_a_la_fin=l.get('nouvelle_derivee_a_la_fin'),
                       commit=l['commit'], lot=lot_de(git('rev-parse', l['commit']).strip(), lots))
    return list(uniq.values())

def lot_de(commit, lots):
    for nom, plage in lots:
        if commit in (git('rev-list', plage) or '').split(): return nom
    return '—'

def section_famille(spec, fr):
    domaine, role = spec.split('.', 1)
    servies = {k: v for k, v in fr.items() if k.startswith(spec + '.')}
    demandes, variables = sites_de_famille(domaine, role)
    md = lambda t: (t or '∅').replace('|', '\\|').replace('\n', ' ')
    zero = [k for k in servies if k not in demandes]
    absentes = [k for k in demandes if k not in servies]
    if not demandes and not variables:
        # ⛔ Un couple (domaine, rôle) sans AUCUN site n'est pas une mesure : c'est un scan qui n'a rien lu — le premier essai du
        #    22/09 rendait « 0 demandée » sur 26 servies parce que la racine était relative au répertoire courant.
        print(f"⛔ famille {spec} : AUCUN site trouvé dans Assets — scan vide, pas une mesure", file=sys.stderr)
        sys.exit(2)
    L = ["", f"## Famille `{spec}` — servie contre DEMANDÉE", "",
         f"**{len(servies)} clé(s) servie(s)** sous ce préfixe · **{len(demandes)} demandée(s)** par le client "
         f"({sum(len(v) for v in demandes.values())} site(s), tous à argument littéral) · sites à argument VARIABLE : "
         + (', '.join(variables) if variables else "**aucun** — une clé sans site est donc demandée NULLE PART, pas « peut-être »") + ".", "",
         f"⇒ **{len(zero)} servie(s) et demandée(s) nulle part** · **{len(absentes)} demandée(s) et non servie(s)**.", "",
         "| clé | valeur servie (fr) | demandée par | verdict |", "|---|---|---|---|"]
    for k in sorted(set(servies) | set(demandes)):
        sites = demandes.get(k)
        verdict = ("demandée" if sites and k in servies
                   else "⛔ SERVIE, DEMANDÉE NULLE PART" if not sites
                   else "⚠️ DEMANDÉE, NON SERVIE (repli du littéral à l'écran)")
        L.append(f"| `{k}` | {md(servies.get(k))} | {', '.join(sites) if sites else '—'} | {verdict} |")
    return L


def ecrire_md(chemin, lignes, meme_cle, non_apparies, lots, meta, fr, base, fin, familles=(), fr_famille=None):
    rows = unique(lignes, lots)
    perimees = [r for r in rows if not r.get('nouvelle_derivee_a_la_fin')]
    par_lot = collections.Counter(r['lot'] for r in rows)
    en_eq = sum(1 for r in rows if r['servie_en'] == r['servie_fr'])
    ref = meta.get('server_build_ref', {})
    md = lambda t: (t or '∅').replace('|', '\\|').replace('\n', ' ')
    L = [f"# Clés i18n orphelines — produites par `orphelines.py` sur `{base}..{fin}`", "",
         f"**{len(rows)} clés uniques** ({', '.join(f'{n} : {c}' for n, c in par_lot.items())}), {len(lignes)} sites. "
         "Une ligne = une clé que le bundle SERT et que plus aucun littéral ne demande (orpheline), et la clé que le littéral "
         "réécrit dérive désormais (manquante : l'écran se replie sur le littéral français, `Libelle.NbReplis` monte). "
         "⛔ Table PRODUITE par le script — ne pas l'éditer à la main, le rejouer.", "",
         "## Provenance",
         f"- Bundle : `GET /v1/i18n/bundle?locale=fr|en`, compte `operational_demo`, 2026-09-22, X-Request-Id (fr) "
         f"`{meta.get('request_id_echo')}`, `server_build_ref` `{str(ref.get('git_sha', ''))[:8]}` (built_at {ref.get('built_at')}), "
         f"**{len(fr)} clés par locale** — l'image de la pile dev, pas `string_table.ts` du cumul back. Corps joints : "
         "`bundle-fr-2026-09-22.json`, `bundle-en-2026-09-22.json`.",
         f"- Client : `{base}..{fin}` sur `gate/cumul-client-2026-09-22`. Lots : " + ' · '.join(f'{n} = `{p}`' for n, p in lots) + ".",
         "- Méthode : un littéral retiré n'est listé que si sa clé dérivée, dans un domaine que le fichier emploie, est SERVIE, "
         "et si le fichier d'arrivée ne la demande plus (même texte sur une ligne qui nomme son rôle ⇒ encore demandée). Fichiers "
         "entiers aux deux versions de chaque commit, `\"…\" + \"…\"` reconstitués, `$\"…\"` exclus, appariement ancien → nouveau "
         f"par différence locale à chaque bloc de diff : **{len(non_apparies)} bloc non apparié**.",
         f"- ⚠️ Anglais : pour {len(rows) - en_eq}/{len(rows)} clés la valeur `en` servie est une vraie traduction ; un joueur en `en` "
         "voit désormais le littéral français par repli. L'ancienne valeur `en` est dans le JSON (`servie_en`), à réécrire.", "",
         "## Pour f7 — la falsifiable d'égalité d'ensembles",
         f"Après application sur `string_table.ts` puis rebuild : (1) les {len(rows)} clés « nouvelle » ⊂ clés servies `fr`, chacune avec "
         f"exactement le « texte FR » de la table ; (2) les {len(rows)} clés « ancienne » ∩ clés servies = ∅ (ou gardées, dit) ; "
         f"(3) les {len(meme_cle)} clé(s) de la section « même clé » servent le texte FR de la table. Contrôle client : "
         "`Libelle.NbReplis` sur ces écrans montés avec le bundle réel (patron `BundleReel`).", "",
         "## Orphelines", "",
         f"Nouvelle clé encore dérivée à `{fin}` (texte FR = celui de `{fin}`) : **{len(rows) - len(perimees)}/{len(rows)}**"
         + ("" if not perimees else f" — ⛔ {len(perimees)} à revoir : " + ', '.join(f"`{r['ancienne']}`" for r in perimees)), "",
         "| # | écran · site(s) | ancienne clé servie (orpheline) | valeur servie aujourd'hui (fr) | nouvelle clé dérivée attendue | texte FR exact du littéral | commit · lot |",
         "|---|---|---|---|---|---|---|"]
    for i, r in enumerate(rows, 1):
        conflit = f" ⛔ conflit : {'; '.join(r['conflits'])}" if r.get('conflits') else ''
        L.append(f"| {i} | {r['ecran']} · {', '.join(r['sites'])}{conflit} | `{r['ancienne']}` | {md(r['servie_fr'])} | `{r['nouvelle']}`"
                 f"{' (déjà servie !)' if r['nouvelle_deja_servie'] else ''} | {md(r['texte_fr'])} | `{r['commit']}` · {r['lot']} |")
    L += ["", "## Même clé — la valeur SERVIE est périmée", "",
          "Le littéral a changé mais son slug non (`Libelle.Slug` ne garde que lettres et chiffres, sans accents) : la clé est "
          "toujours demandée ET servie, donc c'est la valeur du bundle qui s'affiche, pas le littéral. Tant qu'elle n'est pas "
          "corrigée au back, l'écran garde l'ancien texte.", ""]
    if meme_cle:
        L += ["| clé | valeur servie (fr) | valeur servie (en) | texte FR attendu | site · commit |", "|---|---|---|---|---|"]
        for m in meme_cle:
            L.append(f"| `{m['cle']}` | {md(m['servie_fr'])} | {md(m['servie_en'])} | {md(m['texte_fr'])} | "
                     f"{m['fichier'].split('/')[-1]}:{m['ligne']} · `{m['commit']}` |")
    else:
        L.append("(aucune)")
    for spec in familles:
        L += section_famille(spec, fr_famille if fr_famille is not None else fr)
    L += ["", "## Ce que la table ne contient pas",
          "- Les littéraux réécrits dont l'ancienne clé n'était PAS servie : aucune orpheline (leur nouvelle clé manque aussi, mais "
          "l'ancienne manquait déjà ; une clé jamais servie ne se voit pas dans le bundle).",
          "- Les phrases composées (`Or(…)` au milieu, ㊲ :558/:572) : pas un littéral, pas une clé."]
    open(chemin, 'w', encoding='utf-8').write('\n'.join(L) + '\n')

def main():
    fr = json.load(open(sys.argv[1]))['payload']['data']['messages']
    en = json.load(open(sys.argv[2]))['payload']['data']['messages']
    base, fin = sys.argv[3], sys.argv[4]
    sortie_json = sys.argv[sys.argv.index('--json') + 1] if '--json' in sys.argv else None
    sortie_md = sys.argv[sys.argv.index('--md') + 1] if '--md' in sys.argv else None
    lots = [tuple(x.split('=', 1)) for x in sys.argv[sys.argv.index('--lots') + 1].split(',')] if '--lots' in sys.argv else []
    # ⛔ `--anterieure COMMIT:CLÉ[,…]` — une orpheline NÉE HORS DE LA PLAGE, ajoutée à la demande (22/09 : la cohésion du chrome,
    #    a4b2afa6 du 07/09, trouvée par la mesure des replis du créneau 558289a0). Le commit passe par la MÊME mécanique que la
    #    plage, mais on n'en garde QUE la clé nommée : les autres réécritures de ce commit ne sont pas demandées, et les ajouter
    #    en silence changerait le périmètre de la table. Clé introuvable dans ce commit ⇒ échec, jamais une ligne inventée.
    anterieures = [tuple(x.split(':', 1)) for x in sys.argv[sys.argv.index('--anterieure') + 1].split(',')] \
        if '--anterieure' in sys.argv else []
    # `--famille <domaine>.<role>[,…]` + `--famille-bundle <fichier>` : la section « qui demande quoi », mesurée contre le bundle
    # SERVI AUJOURD'HUI (la pile reconstruite), pas contre celui de la plage — les deux questions n'ont pas la même date.
    familles = [x for x in sys.argv[sys.argv.index('--famille') + 1].split(',') if x] if '--famille' in sys.argv else []
    fr_famille = json.load(open(sys.argv[sys.argv.index('--famille-bundle') + 1]))['payload']['data']['messages'] \
        if '--famille-bundle' in sys.argv else None
    for c, _ in anterieures:
        lots.append((f'antérieure {c[:8]}', f'{c}~1..{c}'))
    gardees = {git('rev-parse', c).strip(): k for c, k in anterieures}
    trouvees = set()
    meta = json.load(open(sys.argv[1])).get('response_meta', {})
    par_slug = collections.defaultdict(list)
    for k in fr:
        p = k.split('.', 2)
        if len(p) == 3: par_slug[p[2]].append(k)
    commits = list(gardees) + git('rev-list', '--reverse', f'{base}..{fin}').split()
    lignes, non_apparies, meme_cle = [], [], []
    for c in commits:
        sujet = git('log', '-1', '--format=%s', c).strip()
        for f in git('diff', '--name-only', f'{c}~1', c, '--', 'Assets/Scripts').split():
            if not f.endswith('.cs'): continue
            A = git('show', f'{c}~1:{f}') or ''; B = git('show', f'{c}:{f}') or ''
            domaines = set(re.findall(r'Libelle\.De\(\s*"([a-z_]+)"', A + B))
            if not domaines: continue
            eA, eB = expressions(A), expressions(B)
            valeurB = par_valeur(B, f)
            ops = difflib.SequenceMatcher(None, A.split('\n'), B.split('\n'), autojunk=False).get_opcodes()
            for tag, i1, i2, j1, j2 in ops:
                if tag == 'equal': continue
                # différence LOCALE au bloc (multiensemble) : un texte qui survit AILLEURS dans le fichier
                # (« Operational » garde un site dans `Cle("setup", …)`) reste un retrait ICI.
                r0 = [x for x in eA if x[0] < max(i2, i1 + 1) and x[1] >= i1]
                a0 = [x for x in eB if x[0] < max(j2, j1 + 1) and x[1] >= j1]
                communs = collections.Counter(x[2] for x in r0) & collections.Counter(x[2] for x in a0)
                c1, c2 = communs.copy(), communs.copy(); r, a = [], []
                for x in r0:
                    if c1[x[2]] > 0: c1[x[2]] -= 1
                    else: r.append(x)
                for x in a0:
                    if c2[x[2]] > 0: c2[x[2]] -= 1
                    else: a.append(x)
                servis = []
                for x in r:
                    cles = [k for k in par_slug.get(slug(x[2]), []) if k.split('.', 1)[0] in domaines]
                    if cles: servis.append((x, cles))
                if not servis: continue
                avant_bloc = len(lignes)
                for x, cles in servis:
                    idx = r.index(x); nouveau = a[idx][2] if idx < len(a) and len(r) == len(a) else None
                    if nouveau is not None and not slug(nouveau):
                        # le remplaçant n'a ni lettre ni chiffre (« ‹ », « — ») : il ne peut dériver aucune clé, donc
                        # le littéral retiré n'était pas le site keyé (même slug par coïncidence : « < Crop » / « Crop »).
                        continue
                    for k in cles:
                        dom, role, _ = k.split('.', 2)
                        # ENCORE DEMANDÉE ? Même texte, dans la version d'arrivée, sur une ligne qui nomme le rôle
                        # (`Cle("setup", "Operational")`) : la clé n'est pas orpheline, seul un autre rôle l'est.
                        lignesB = B.split('\n')
                        if any(y[2] == x[2] and f'"{role}"' in ' '.join(lignesB[y[0]:y[1] + 1]) for y in eB):
                            continue
                        if k in valeurB:
                            # encore demandée, par sa VALEUR (lot E : `Cle(role, "Idle")` → `Bande(role, "IDLE", repli)`) :
                            # même clé, et c'est la valeur servie qui s'affiche — à corriger au back si elle diffère du repli.
                            if fr[k] != valeurB[k]:
                                meme_cle.append(dict(commit=c[:8], fichier=f, ligne=x[0] + 1, cle=k, servie_fr=fr[k],
                                                     servie_en=en.get(k), texte_fr=valeurB[k], par_valeur=True))
                            continue
                        if nouveau is not None and f'{dom}.{role}.{slug(nouveau)}' == k:
                            # MÊME clé (le slug n'a pas changé : « Temperature » / « Température ») : pas une
                            # orpheline — mais la valeur SERVIE continue de s'afficher, et c'est elle qu'il faut corriger.
                            meme_cle.append(dict(commit=c[:8], fichier=f, ligne=x[0] + 1, cle=k, servie_fr=fr[k],
                                                 servie_en=en.get(k), texte_fr=nouveau))
                            continue
                        if c in gardees:
                            if k != gardees[c]: continue
                            trouvees.add(c)
                        lignes.append(dict(commit=c[:8], sujet=sujet, fichier=f, ligne=x[0] + 1, ancienne=k,
                                           ancien_texte=x[2], servie_fr=fr[k], servie_en=en.get(k),
                                           nouvelle=(f'{dom}.{role}.{slug(nouveau)}' if nouveau is not None else None),
                                           texte_fr=nouveau, nouvelle_deja_servie=(nouveau is not None and f'{dom}.{role}.{slug(nouveau)}' in fr)))
                if len(lignes) > avant_bloc and len(r) != len(a):
                    # un bloc NON APPARIÉ ne compte que s'il a produit une orpheline : sinon ses correspondances de slug
                    # étaient des clés encore demandées sous leur rôle (lot E : « Standard » ≠ `building.cover.standard`).
                    non_apparies.append((c, f, i1 + 1, [x[2][:60] for x in r], [x[2][:60] for x in a]))
    manquees = [f'{c[:8]}:{k}' for c, k in gardees.items() if c not in trouvees]
    if manquees:
        print(f"⛔ --anterieure : orpheline(s) NON TROUVÉE(S) dans leur commit : {', '.join(manquees)}", file=sys.stderr)
        sys.exit(2)
    # ⛔ LE TEXTE À SERVIR EST CELUI DE LA FIN DE PLAGE, pas celui du commit qui a produit l'orpheline : un littéral
    #    réécrit une seconde fois sans changer de slug (㉔ : glyphes retirés en tranche 2) garde sa clé, et c'est la
    #    DERNIÈRE version que le back doit servir — sinon l'ancien texte revient à l'écran par le bundle.
    cache = {}
    for l in lignes + meme_cle:
        f = l['fichier']
        if f not in cache: cache[f] = expressions(git('show', f'{fin}:{f}') or '')
        cle = l.get('nouvelle') or l.get('cle')
        if cle is None: continue
        if l.get('par_valeur'):
            v = par_valeur(git('show', f'{fin}:{f}') or '', f)
            l['nouvelle_derivee_a_la_fin'] = cle in v
            if cle in v: l['texte_fr'] = v[cle]
            continue
        dom, role, _ = cle.split('.', 2)
        textes = sorted({x[2] for x in cache[f] if f'{dom}.{role}.{slug(x[2])}' == cle})
        if len(textes) == 1: l['texte_fr'] = textes[0]; l['nouvelle_derivee_a_la_fin'] = True
        else: l['nouvelle_derivee_a_la_fin'] = False; l['textes_candidats'] = textes
    if sortie_json:
        json.dump(dict(provenance=dict(bundle_request_id_fr=json.load(open(sys.argv[1]))['response_meta']['request_id_echo'],
                                       server_build_ref=json.load(open(sys.argv[1]))['response_meta']['server_build_ref'],
                                       cles_servies_fr=len(fr), client_plage=f'{base}..{fin}', lots=dict(lots),
                                       generateur='python3 Tools/juge-donnees/i18n/orphelines.py <bundle-fr> <bundle-en> '
                                                  f'{base} {fin} --json … --md … --lots …'),
                       cles=unique(lignes, lots), meme_cle=meme_cle, non_apparies=non_apparies),
                  open(sortie_json, 'w'), ensure_ascii=False, indent=1)
    for l in lignes:
        print(f"{l['commit']}\t{l['fichier'].split('/')[-1]}:{l['ligne']}\t{l['ancienne']}\t→\t{l['nouvelle']}")
    for n in non_apparies:
        print("⛔ NON APPARIÉ", n, file=sys.stderr)
    if sortie_md:
        ecrire_md(sortie_md, lignes, meme_cle, non_apparies, lots, meta, fr, base, fin, familles, fr_famille)
    for m in meme_cle:
        print(f"MÊME CLÉ, valeur servie à corriger : {m['cle']} fr={m['servie_fr']!r} → littéral {m['texte_fr']!r}", file=sys.stderr)
    print(f"{len(lignes)} orpheline(s) · {len(meme_cle)} même(s) clé(s) à valeur servie périmée · "
          f"{len(non_apparies)} bloc(s) non apparié(s)", file=sys.stderr)

if __name__ == '__main__':
    main()
