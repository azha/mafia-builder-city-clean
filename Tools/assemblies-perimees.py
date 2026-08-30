#!/usr/bin/env python3
"""Détecte les assemblies Unity PÉRIMÉES — et seulement celles-là.

⛔ L'OOPS QUE CE SCRIPT EXISTE POUR EMPÊCHER (mesuré 2026-08-31) : comparer l'âge
d'une dll à celui d'une AUTRE dll ne prouve rien. Une assembly dont les sources n'ont
pas bougé DOIT être vieille — c'est le comportement correct d'Unity, qui ne recompile
que ce qui a changé. Une session voisine a diagnostiqué `Theme.dll` « SIX JOURS de
retard » sur ce dépôt : mesurée contre SES PROPRES sources, elle leur est postérieure
de 1 min 47 s, et porte les 74 champs de la source. Elle n'était pas périmée.

⇒ Le seul oracle valable : mtime(dll) vs mtime(la plus récente de SES sources).
   Adopter « les vieilles dll sont suspectes » produit un faux positif permanent sur
   toute assembly stable, et noie les vraies.

Usage : python3 Tools/assemblies-perimees.py [racine-projet]
Sortie : code 1 si au moins une assembly est périmée (utilisable en garde de pré-run).
"""
import os, sys, json, datetime as dt

root = sys.argv[1] if len(sys.argv) > 1 else '.'
scripts = os.path.join(root, 'Assets')
built = os.path.join(root, 'Library', 'ScriptAssemblies')

if not os.path.isdir(built):
    print(f"⛔ {built} absent — le projet n'a jamais été compilé ?")
    sys.exit(2)

asmdefs = {}
for dp, _, fn in os.walk(scripts):
    for f in fn:
        if f.endswith('.asmdef'):
            p = os.path.join(dp, f)
            try:
                asmdefs[json.load(open(p, encoding='utf-8'))['name']] = dp
            except Exception as e:
                print(f"  ⚠️  {p} illisible : {e}")

fmt = lambda t: dt.datetime.fromtimestamp(t).strftime('%m-%d %H:%M:%S')
stale = []
print(f"  {'assembly':30} {'dll':19} {'source la + récente':19} verdict")
print("  " + "-" * 88)
for name, src_root in sorted(asmdefs.items()):
    dll = os.path.join(built, name + '.dll')
    if not os.path.exists(dll):
        print(f"  {name:30} {'—':19} {'—':19} ⚠️  dll absente")
        continue
    srcs = [os.path.join(d, x) for d, _, fs in os.walk(src_root)
            for x in fs if x.endswith('.cs')]
    if not srcs:
        continue
    newest = max(srcs, key=os.path.getmtime)
    dm, sm = os.path.getmtime(dll), os.path.getmtime(newest)
    if sm > dm:
        stale.append((name, os.path.basename(newest)))
        verdict = f"⛔ PÉRIMÉE ({os.path.basename(newest)})"
    else:
        verdict = "✅ postérieure à ses sources"
    print(f"  {name:30} {fmt(dm):19} {fmt(sm):19} {verdict}")

print()
if stale:
    print(f"  ⇒ {len(stale)} assembly(ies) PÉRIMÉE(S) : {', '.join(n for n, _ in stale)}")
    print("  ⇒ un run lancé maintenant s'exécute contre du code qui n'est pas celui du disque.")
    sys.exit(1)
print("  ⇒ aucune assembly périmée.")
sys.exit(0)
