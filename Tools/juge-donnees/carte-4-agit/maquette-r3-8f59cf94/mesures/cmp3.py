# -*- coding: utf-8 -*-
BASE='/tmp/claude-1000/-home-erutheone-project-mafia-builder-city-clean/12bb723c-e30b-4127-8b2d-58b0fa9e44d9/scratchpad/jd/'
VARP='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/carte-4-agit/maquette-r3-8f59cf94/reference/variantes-textes-8f59cf94.txt'
design=open(BASE+'design.md',encoding='utf-8').read().split('\n')
var=[l for l in open(VARP,encoding='utf-8').read().split('\n')]
def cells(l): return [c.strip() for c in l.strip().strip('|').split('|')]
D={}
for n in range(316,322):
    c=cells(design[n]); D[c[0].strip('`')]=(c[2].strip('`'), c[3].strip('`'))
E={}
for n in range(279,282):
    c=cells(design[n]); E[c[4].strip('`')]=(c[5].strip('`'), c[6].strip('`'))
NB=' '
D['hl.after_choice.partial_stop']=(D['hl.after_choice.partial_stop'][0].replace('<U+00A0>',NB), D['hl.after_choice.partial_stop'][1])

def f(i):            # champs de la ligne i (1-based)
    return var[i-1].split(' · ')
def en(i, k=1):      # sous-champ EN
    parts=f(i)
    return parts[-1].split(' | ') if len(f(i))>=5 else None

PAIRS=[
 ('hl.outcome.damaged_building.executed', f(1)[2], f(1)[5].split(' | ')[1]),
 ('hl.outcome.severed_route.executed',    f(2)[2], f(2)[4].split(' | ')[1]),
 ('hl.outcome.legal_case.executed',       f(4)[2], f(4)[4].split(' | ')[1]),
 ('hl.outcome.mycelial_stressed_leg.executed', f(3)[2], f(3)[4].split(' | ')[1]),
 ('hl.after_choice.noted',                f(5)[2], f(5)[4].split(' | ')[1]),
]
print("=== 5 clés attendues IDENTIQUES à l'octet (design vs atelier 8f59cf94) ===")
ok=0
for k,fr_a,en_a in PAIRS:
    fr_d,en_d=D[k]
    rf = fr_d==fr_a; re_=en_d==en_a
    ok += (rf and re_)
    print(f"{k}\n   FR {'IDENTIQUE' if rf else 'DIFFERE'} | EN {'IDENTIQUE' if re_ else 'DIFFERE'}")
    if not rf: print(f"      design={fr_d!r}\n      atelier={fr_a!r}")
    if not re_: print(f"      design={en_d!r}\n      atelier={en_a!r}")
print(f"-> {ok}/5 paires identiques FR+EN\n")

print("=== partial_stop : transformations T1/T2 ===")
fr_d,en_d=D['hl.after_choice.partial_stop']
fr_a=f(6)[2]; en_a=f(6)[4].split(' | ')[1]
print(f"   design FR {fr_d!r}\n   atelier FR {fr_a!r}")
print(f"   prefixe atelier jusqu'au 1er '{{phrase' : {fr_a.split('{phrase')[0]!r}")
print(f"   design EN {en_d!r}\n   atelier EN {en_a!r}")
print(f"   prefixe atelier EN : {en_a.split('{player')[0]!r}")
# T1 seul : remplacer NBSP par espace dans le design
print(f"   design FR avec U+0020 au lieu de NBSP == prefixe atelier ? {fr_d.replace(NB,' ')==fr_a.split('{phrase')[0]}")
print(f"   design EN == prefixe atelier EN ? {en_d==en_a.split('{player')[0]}")

print("\n=== 3 clés d'erreur ===")
tests=[('error.hl_card.not_found', f(11)[2], f(11)[4].split(' | ')[1]),
       ('error.hl_card.nothing_to_act_on', f(12)[2], f(12)[4].split(' | ')[1]),
       ('error.hl_card.already_resolved', f(8)[1], f(8)[4].split(' | ')[0])]
for k,fr_a,en_a in tests:
    fr_d,en_d=E[k]
    print(f"{k}\n   FR design={fr_d!r}\n      atelier={fr_a!r}  -> {'IDENTIQUE' if fr_d==fr_a else ('T3: atelier == design + \" (PROPOSÉ)\" ? '+str(fr_a==fr_d+' (PROPOSÉ)'))}")
    print(f"   EN design={en_d!r} atelier={en_a!r} -> {'IDENTIQUE' if en_d==en_a else 'DIFFERE'}")

print("\n=== cadre 6 : ICU instancié n=2 ===")
icu=D['hl.outcome.damaged_building.executed'][0]
import re
rendu=re.sub(r'\{n, plural, one \{[^}]*\} other \{([^}]*)\}\}', lambda m: m.group(1).replace('#','2'), icu)
cadre6='Les travaux sont lancés et payés pour 2 locaux. L’activité reprend à la fin du chantier.'
print(f"   rendu   {rendu!r}")
print(f"   cadre 6 {cadre6!r}")
print(f"   IDENTIQUE ? {rendu==cadre6}")
