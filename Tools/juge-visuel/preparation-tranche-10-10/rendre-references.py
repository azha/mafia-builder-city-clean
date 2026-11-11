#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Re-rend DEPUIS L'ATELIER MASTER les cadres de référence de la tranche 10/10 (jamais un PNG recopié : piège A01).
Index appairé à son étiquette AVANT tout rendu ; taille relue ; SHA de l'atelier imprimé. Contrôle : une étiquette
attendue fausse doit rougir (`--controle`)."""
import os, re, struct, subprocess, sys
AT = os.path.expanduser('~/project/atelier3d-mafia')
RENDRE = os.path.expanduser('~/project/mafia-builder-city-clean/Tools/rendre-tel.py')
ICI = os.path.dirname(os.path.abspath(__file__))
T = [  # (page, index, préfixe d'étiquette, sortie)
 ('ecrans-brennar-accueil.html', 1, '④ L’ouverture — une carte de tête · état cible, HL chunk 3', '04-accueil/reference/cadre-1-carte-de-tete-etat-cible.png'),
 ('ecrans-brennar-accueil.html', 5, '④ L’ouverture — une carte de tête AU-DESSUS', '04-accueil/reference/cadre-5-tete-sur-ligne-haute.png'),
 ('ecrans-brennar-6.html', 131, 'Le dossier — trois pistes qui ne se mélangent pas', 'dossier-39/reference/cadre-131-pistes.png'),
 ('ecrans-brennar-6.html', 150, '㊴ · les pistes', 'dossier-39/reference/cadre-150-pistes.png'),
 ('ecrans-brennar-6.html', 151, '㊴ · les acteurs', 'dossier-39/reference/cadre-151-acteurs.png'),
]
def etq(p):
    t = open(os.path.join(AT, p), encoding='utf8').read()
    return [re.sub(r'<[^>]+>', '', x) for x in re.findall(r'<div class="etiquette">(.*?)</div>', t)]
def main():
    ctrl = '--controle' in sys.argv
    sha = subprocess.run(['git', '-C', AT, 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
    sale = subprocess.run(['git', '-C', AT, 'status', '--porcelain'], capture_output=True, text=True).stdout.strip()
    print('atelier HEAD', sha, '| arbre', 'SALE' if sale else 'propre')
    cache = {}; ko = 0
    for page, i, pref, sortie in T:
        e = cache.setdefault(page, etq(page))
        att = pref + ('X' if ctrl and i == 131 else '')
        ok = i < len(e) and e[i].startswith(att)
        print(' %-28s %3d %s %s' % (page, i, 'OK' if ok else 'KO', e[i][:70] if i < len(e) else '—'))
        ko += not ok
    if ko: print('EXIT=1 (%d KO)' % ko); sys.exit(1)
    for page, i, pref, sortie in T:
        d = os.path.join(ICI, sortie); os.makedirs(os.path.dirname(d), exist_ok=True)
        subprocess.run([sys.executable, RENDRE, os.path.join(AT, page), str(i), d, '3.6'], check=True, capture_output=True)
        w, h = struct.unpack('>II', open(d, 'rb').read(24)[16:24])
        print('  ->', sortie, w, h, 'OK' if (w, h) == (1080, 2102) else 'TAILLE INATTENDUE')
        if (w, h) != (1080, 2102): sys.exit(1)
if __name__ == '__main__': main()
