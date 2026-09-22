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

Usage : python3 orphelines.py <bundle-fr.json> <bundle-en.json> <commit-de-base> <commit-de-fin> [--json sortie.json]
"""
import json, re, subprocess, sys, unicodedata, difflib, collections

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

def git(*a):
    r = subprocess.run(['git', *a], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None

def main():
    fr = json.load(open(sys.argv[1]))['payload']['data']['messages']
    en = json.load(open(sys.argv[2]))['payload']['data']['messages']
    base, fin = sys.argv[3], sys.argv[4]
    sortie_json = sys.argv[sys.argv.index('--json') + 1] if '--json' in sys.argv else None
    par_slug = collections.defaultdict(list)
    for k in fr:
        p = k.split('.', 2)
        if len(p) == 3: par_slug[p[2]].append(k)
    commits = git('rev-list', '--reverse', f'{base}..{fin}').split()
    lignes, non_apparies = [], []
    for c in commits:
        sujet = git('log', '-1', '--format=%s', c).strip()
        for f in git('diff', '--name-only', f'{c}~1', c, '--', 'Assets/Scripts').split():
            if not f.endswith('.cs'): continue
            A = git('show', f'{c}~1:{f}') or ''; B = git('show', f'{c}:{f}') or ''
            domaines = set(re.findall(r'Libelle\.De\(\s*"([a-z_]+)"', A + B))
            if not domaines: continue
            eA, eB = expressions(A), expressions(B)
            tA, tB = collections.Counter(x[2] for x in eA), collections.Counter(x[2] for x in eB)
            retires = [x for x in eA if x[2] not in tB]; apparus = [x for x in eB if x[2] not in tA]
            ops = difflib.SequenceMatcher(None, A.split('\n'), B.split('\n'), autojunk=False).get_opcodes()
            for tag, i1, i2, j1, j2 in ops:
                if tag == 'equal': continue
                r = [x for x in retires if x[0] < max(i2, i1 + 1) and x[1] >= i1]
                a = [x for x in apparus if x[0] < max(j2, j1 + 1) and x[1] >= j1]
                servis = []
                for x in r:
                    cles = [k for k in par_slug.get(slug(x[2]), []) if k.split('.', 1)[0] in domaines]
                    if cles: servis.append((x, cles))
                if not servis: continue
                if len(r) != len(a):
                    non_apparies.append((c, f, i1 + 1, [x[2][:60] for x in r], [x[2][:60] for x in a]))
                for x, cles in servis:
                    idx = r.index(x); nouveau = a[idx][2] if idx < len(a) and len(r) == len(a) else None
                    for k in cles:
                        dom, role, _ = k.split('.', 2)
                        lignes.append(dict(commit=c[:8], sujet=sujet, fichier=f, ligne=x[0] + 1, ancienne=k,
                                           ancien_texte=x[2], servie_fr=fr[k], servie_en=en.get(k),
                                           nouvelle=(f'{dom}.{role}.{slug(nouveau)}' if nouveau is not None else None),
                                           texte_fr=nouveau, nouvelle_deja_servie=(nouveau is not None and f'{dom}.{role}.{slug(nouveau)}' in fr)))
    if sortie_json:
        json.dump(dict(lignes=lignes, non_apparies=non_apparies), open(sortie_json, 'w'), ensure_ascii=False, indent=1)
    for l in lignes:
        print(f"{l['commit']}\t{l['fichier'].split('/')[-1]}:{l['ligne']}\t{l['ancienne']}\t→\t{l['nouvelle']}")
    for n in non_apparies:
        print("⛔ NON APPARIÉ", n, file=sys.stderr)
    print(f"{len(lignes)} orpheline(s) · {len(non_apparies)} bloc(s) non apparié(s)", file=sys.stderr)

if __name__ == '__main__':
    main()
