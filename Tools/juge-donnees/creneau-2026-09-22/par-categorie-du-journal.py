#!/usr/bin/env python3
"""Verdicts du JOURNAL MafiaCI ventilés par catégorie du filtre : chaque résultat `MafiaCI: PASSED|FAIL|SKIPPED <nom complet>`
est rattaché à sa (classe, méthode), dont les catégories (classe ∪ méthode) sont lues dans les sources par l'analyseur calibré
de `Tools/compter-par-categorie.py` ; une entrée du filtre prend un test si l'une de ses catégories COMMENCE par elle (règle
Unity). Usage : par-categorie-du-journal.py <journal> Cat1,Cat2,…"""
import importlib.util, re, sys, collections
spec = importlib.util.spec_from_file_location('cpc', 'Tools/compter-par-categorie.py')
cpc = importlib.util.module_from_spec(spec); spec.loader.exec_module(cpc)
journal, filtre = sys.argv[1], [c for c in sys.argv[2].split(',') if c]
cats, par_classe = {}, {}
for _, texte in cpc.fichiers(None):
    for classe, meth, cc, cm, n, ign in cpc.feuilles(texte):
        cats.setdefault((classe, meth), set()).update(cc + cm)
        par_classe.setdefault(classe, set()).update(cc + cm)
res = []
for l in open(journal, encoding='utf-8', errors='replace'):
    m = re.search(r'MafiaCI: (PASSED|PASS|FAILED|FAIL|SKIPPED|SKIP|INCONCLUSIVE)\s+(\S+(?: \([^)]*\))?[^\n—]*?)(?:\s+—|\s*$)', l)
    if not m: continue
    nom = m.group(2).strip(); base = re.split(r'[ (]', nom, 1)[0].split('.')
    res.append((nom, m.group(1)[:4], (base[-2], base[-1])))
par = collections.OrderedDict((c, collections.Counter()) for c in filtre)
orphelins, par_nom_perso = [], []
for nom, v, cle in res:
    cs = cats.get(cle)
    if cs is None:
        cs = par_classe.get(cle[0])      # cas de test à NOM PERSONNALISÉ (`TestName`) : rattaché par sa classe
        if cs is None: orphelins.append(nom); continue
        par_nom_perso.append(nom)
    for c in filtre:
        if any(x.startswith(c) for x in cs): par[c][v] += 1
tot = collections.Counter(v for _, v, _ in res)
print(f"résultats lus : {len(res)} · PASS {tot['PASS']} · FAIL {tot['FAIL']} · SKIP {tot['SKIP']} · non rattachés aux sources : {len(orphelins)}")
print("| catégorie | exécutés | verts | rouges | ignorés |\n|---|---|---|---|---|")
for c, k in par.items():
    print(f"| {c} | {sum(k.values())} | {k['PASS']} | {k['FAIL']} | {k['SKIP']} |")
for o in orphelins: print("non rattaché :", o)
if par_nom_perso: print(f"rattachés par leur CLASSE (nom de cas personnalisé) : {len(par_nom_perso)}")
