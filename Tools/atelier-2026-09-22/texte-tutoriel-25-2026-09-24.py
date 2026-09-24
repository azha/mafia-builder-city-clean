#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""㉕ — la maquette `ecrans-brennar-25-tutoriel.html` alignée pour la ratification (f2, 24/09 : « ce que l'user ratifie = ce que le jeu dira ») :
D17 sur les deux textes SERVIS de tutoriel qu'elle montre — U+00A0 avant « : » (`tutorial.exception_card.onboarding_preseed` cadre 0,
`tutorial.queue_runs_dry` cadre 1). Le back sert encore une espace ordinaire (et une apostrophe droite dans `queue_runs_dry`) : défaut du servi,
signalé ; la maquette montre le texte juste. Le reste de la page est déjà aligné (audit du 24/09 : 0 D10, 0 D13, 0 D18 ; mots proposés à la 36).
Comptes attendus, idempotent, zones protégées. Aucun rendu ici.
Usage : texte-tutoriel-25-2026-09-24.py [--controle | --ecrire]"""
import os, re, sys
PAGE = os.path.expanduser('~/project/atelier3d-mafia/ecrans-brennar-25-tutoriel.html')
NB = ' '
F = [(0, 'cuisson du soir bloquée : plus de solvant', f'cuisson du soir bloquée{NB}: plus de solvant'),
     (1, 'Rien n’attend votre décision : la ville tourne sans vous', f'Rien n’attend votre décision{NB}: la ville tourne sans vous')]
PROTEGE = re.compile(r'(<script\b.*?</script>|<style\b.*?</style>|<!--.*?-->|<aside>.*?</aside>)', re.S)

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--controle'
    s = open(PAGE, encoding='utf-8').read(); C = [m.start() for m in re.finditer(r'<div class="cadre">', s)] + [len(s)]
    parts = [s[:C[0]]]; compte = []
    for i in range(len(C) - 1):
        t = s[C[i]:C[i + 1]]
        for j, a, b in F:
            if j == i:
                m = PROTEGE.split(t); n = 0
                for k in range(0, len(m), 2): n += m[k].count(a); m[k] = m[k].replace(a, b)
                t = ''.join(m); compte.append(n)
        parts.append(t)
    if compte == [0, 0]: print('déjà passée (0 remplacement)'); return 0
    if compte != [1, 1]: print(f'⛔ comptes {compte} ≠ [1, 1]'); return 1
    print('2 remplacements' + (' écrits' if mode == '--ecrire' else ' à écrire'))
    if mode == '--ecrire': open(PAGE, 'w', encoding='utf-8').write(''.join(parts))
    return 0

if __name__ == '__main__':
    sys.exit(main())
