#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""㉙ — la réplique SANS orateur (arbitrage (5) du 23/09, mis en maquette sur décision f2 du 24/09) : « Lt. Kest : » est retiré des répliques
des cadres 59, 60, 61 et 63 de la série 6 (le client dit la réplique sans orateur : le nom est déjà sur la ligne de l'homme) ; les guillemets
prennent U+00A0 à l'intérieur (D17, les octets servis) ; l'étiquette de chaque cadre touché note la correction.
ET le doublon « jamais » (arbitrage (2) du 23/09) : à 0 envoi rentré, le client ne dit QUE « on n’a jamais croisé leur route » ; le `<b>jamais</b>`
de `.hist.jamais` sort des cadres 59, 60 et 61 (relecture de CLIENT-1, f2 du 24/09).
Comptes ATTENDUS par page (un `<div class="dit">` par cadre touché), idempotent, zones protégées. Aucun rendu : au prochain lot (après le gate).
Usage : texte-conflit-orateur-2026-09-24.py [--mesurer | --controle | --ecrire]"""
import os, re, sys
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
PAGES = ['ecrans-brennar-6.html', 'ecrans-brennar-6-sans-pastilles.html']
NB = ' '
CADRES = (59, 60, 61, 63)
JAMAIS = '<div class="hist jamais"><b>jamais</b>'
DIT = re.compile(r'<div class="dit"><b>Lt\. [A-Za-z]+ ?:</b> « (.*?) »</div>', re.S)
ETIQ = re.compile(r'(<div class="etiquette">)([^<]*)(</div>)')
NOTE = ' — réplique sans orateur (arbitrage (5) du 23/09)'
PROTEGE = re.compile(r'(<script\b.*?</script>|<style\b.*?</style>|<!--.*?-->|<aside>.*?</aside>)', re.S)
ATTENDU = {   # --mesurer, atelier 1df243a, 2026-09-24 — 4 orateurs + 6 « jamais » par page
    'ecrans-brennar-6.html': {59: 5, 60: 2, 61: 2, 63: 1},
    'ecrans-brennar-6-sans-pastilles.html': {59: 5, 60: 2, 61: 2, 63: 1},
}

def cadres(s):
    return [m.start() for m in re.finditer(r'<div class="cadre">', s)] + [len(s)]

def appliquer(t):
    morceaux = PROTEGE.split(t); n = 0
    for j in range(0, len(morceaux), 2):
        morceaux[j], k = DIT.subn(lambda m: f'<div class="dit">«{NB}{m.group(1)}{NB}»</div>', morceaux[j]); n += k
        c = morceaux[j].count(JAMAIS); morceaux[j] = morceaux[j].replace(JAMAIS, '<div class="hist jamais">'); n += c; k += c
        if k:
            morceaux[j] = ETIQ.sub(lambda m: m.group(0) if NOTE in m.group(2) else m.group(1) + m.group(2) + NOTE + m.group(3), morceaux[j], count=1)
    return ''.join(morceaux), n

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--controle'
    d = []
    for page in PAGES:
        p = os.path.join(ATELIER, page); s = open(p, encoding='utf-8').read(); C = cadres(s)
        if len(C) - 1 != 146: d.append(f'{page} : {len(C) - 1} cadres'); continue
        parts, compte = [s[:C[0]]], {}
        for i in range(146):
            t = s[C[i]:C[i + 1]]
            if i in CADRES:
                t, n = appliquer(t)
                if n: compte[i] = n
            parts.append(t)
        neuf = ''.join(parts)
        if mode == '--mesurer': print(f'    {page!r}: {compte},'); continue
        if compte and compte != ATTENDU.get(page): d.append(f'{page} : {compte} ≠ attendus {ATTENDU.get(page)}')
        elif mode == '--ecrire' and compte:
            open(p, 'w', encoding='utf-8').write(neuf)
            s2 = open(p, encoding='utf-8').read(); C2 = cadres(s2)
            assert not any(appliquer(s2[C2[i]:C2[i + 1]])[1] for i in CADRES), f'{page} : non idempotent'
            assert not any(re.search(r'<b>Lt\. [A-Za-z]+ ?:</b>', s2[C2[i]:C2[i + 1]]) or JAMAIS in s2[C2[i]:C2[i + 1]] for i in CADRES), f'{page} : reste'
        print(f'  {page:40} {sum(compte.values())}' + (' écrits' if mode == '--ecrire' and compte and not d else ' (déjà passée)' if not compte else ''))
    for x in d: print('  ⛔', x)
    return 1 if d else 0

if __name__ == '__main__':
    sys.exit(main())
