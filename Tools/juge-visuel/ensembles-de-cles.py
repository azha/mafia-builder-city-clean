#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fige, puis compare, les ENSEMBLES DE CLÉS par route des corps de §DA-4.

Pourquoi ce fichier existe, et pourquoi MAINTENANT — la resync rejoue les 240 corps sur un compte
neuf qui a le même ÂGE de jeu que l'ancien mais pas la même HISTOIRE. Les valeurs vont donc
différer, et c'est attendu ; ce qui ne doit pas bouger, c'est l'ensemble de clés que chaque route
projette. Or la capture ÉCRASE les corps : la ligne de base disparaît au moment précis où elle
devient utile. Elle se fige AVANT, ou le contrôle n'existe pas.
⇒ C'est le détecteur de la « forme F » du socle (donnée en base, atteignant le compositeur, omise
  par la projection) : un inventaire de routes reste vert à travers l'ajout ou le retrait d'une
  clé ; seul l'ensemble de clés le voit.

La règle de lecture, donnée par f2 et inscrite ici pour qu'elle ne se perde pas :
  **un ensemble qui a bougé est un finding · une valeur qui a bougé ne l'est pas.**

Usage : ensembles-de-cles.py --figer <sortie.json>
        ensembles-de-cles.py --comparer <base.json>
"""
import glob
import json
import os
import sys

ICI = os.path.dirname(os.path.abspath(__file__))


def cles(corps):
    """Les clés de premier niveau de `payload.data`, ou une forme déclarée quand ce n'en est pas un.

    ⛔ Ne pas rendre un ensemble VIDE pour une donnée non-dict : « vide » se confondrait avec
       « la route ne projette rien », et un contrôle qui confond deux régimes accuse au hasard.
    """
    if not isinstance(corps, dict):
        return None
    d = (corps.get("payload") or {}).get("data")
    if isinstance(d, dict):
        return sorted(d.keys())
    if isinstance(d, list):
        return ["<liste>"] + (sorted(d[0].keys()) if d and isinstance(d[0], dict) else [])
    return ["<%s>" % type(d).__name__]


def recolter():
    out = {}
    for p in sorted(glob.glob(os.path.join(ICI, '*', 'corps-reels', '*.json'))):
        if os.path.basename(p).startswith('_index'):
            continue
        j = json.load(open(p, encoding='utf8'))
        c = j.get('corps')
        if c is None:
            continue                       # mutation non appelée / sans instance : rien à épingler
        rel = os.path.relpath(p, ICI)
        out[rel] = {"route": j.get("route"), "methode": j.get("methode"),
                    "statut": j.get("statut"), "cles": cles(c)}
    return out


def main():
    if '--figer' in sys.argv:
        dest = sys.argv[sys.argv.index('--figer') + 1]
        d = recolter()
        if not d:
            print('⛔ aucun corps à figer — rien écrit'); sys.exit(1)
        json.dump(d, open(dest, 'w', encoding='utf8'), ensure_ascii=False, indent=1, sort_keys=True)
        print('figé : %d corps avec un ensemble de clés → %s' % (len(d), dest))
        n = sum(len(v['cles'] or ()) for v in d.values())
        print('       %d clés au total' % n)
        return

    if '--comparer' in sys.argv:
        base = json.load(open(sys.argv[sys.argv.index('--comparer') + 1], encoding='utf8'))
        attendus = base.pop('__attendus__', None)   # retiré AVANT tout parcours de la base
        maint = recolter()
        # ⛔ Il y avait ICI une ligne qui comparait `base[k]['cles']` à LUI-MÊME : toujours
        #    fausse, donc un no-op déguisé en vérification — et elle plantait sur l'entrée des
        #    écarts attendus. Supprimée : un contrôle qui ne peut pas rougir est pire qu'aucun,
        #    il rassure. Le vrai contrôle positif est celui d'en dessous (une clé injectée dans
        #    une copie DOIT être détectée), et lui peut échouer.
        temoin = dict(base)
        if temoin:
            k0 = sorted(temoin)[0]
            faux = json.loads(json.dumps(temoin))
            faux[k0] = dict(faux[k0], cles=(faux[k0]['cles'] or []) + ['__temoin__'])
            vu = [k for k in faux if k in base and faux[k]['cles'] != base[k]['cles']]
            print('contrôle positif (une clé injectée dans la copie) : %s'
                  % ('✅ détectée' if vu else '⛔ MUET — le comparateur ne voit rien'))
            if not vu:
                sys.exit(1)

        # ⛔ Les écarts CONNUS D'AVANCE sortent des findings, avec leur raison. Sans ça, mon
        #    propre correctif (une clé fabriquée retirée de session/open) se lirait à 05h30
        #    comme une régression du back — un faux finding dans une fenêtre courte est pire
        #    qu'un finding manqué, parce qu'il détourne l'attention.
        if attendus:
            a = attendus.get('cles_retirees_par_correctif', {})
            print('\nécart ATTENDU, exclu des findings : %s' % a.get('attendu'))
            print('   raison : %s' % a.get('raison'))
            cle_att, corps_att = a.get('clé'), set(a.get('corps') or ())
        else:
            cle_att, corps_att = None, set()

        partis = sorted(set(base) - set(maint))
        neufs = sorted(set(maint) - set(base))
        bouges = []
        for k in sorted(set(base) & set(maint)):
            a, b = base[k]['cles'], maint[k]['cles']
            if a != b:
                perdues = sorted(set(a or ()) - set(b or ()))
                gagnees = sorted(set(b or ()) - set(a or ()))
                if k in corps_att and perdues == [cle_att] and not gagnees:
                    continue                       # exactement l'écart annoncé : pas un finding
                bouges.append((k, perdues, gagnees))
        print('\nbase %d corps · maintenant %d corps' % (len(base), len(maint)))
        print('\n=== FINDINGS — ensembles de clés qui ont bougé (%d) ===' % len(bouges))
        for k, perdues, gagnees in bouges:
            print('  %s' % k)
            if perdues:
                print('      DISPARUES : %s' % ', '.join(perdues))
            if gagnees:
                print('      APPARUES  : %s' % ', '.join(gagnees))
        print('\n=== corps présents avant et plus maintenant (%d) ===' % len(partis))
        for k in partis[:20]:
            print('  %s  (statut base : %s)' % (k, base[k]['statut']))
        print('\n=== corps neufs (%d) ===' % len(neufs))
        for k in neufs[:20]:
            print('  %s' % k)
        print('\n⚠️ CE QUE CE COMPARATEUR NE SAIT PAS ENCORE, et il faut le lire avant de conclure :')
        print('   sur la base figée, 20 routes capturées dans plusieurs dossiers rendent le MÊME')
        print('   ensemble de clés — mais elles ont été prises sur le MÊME compte au MÊME instant.')
        print('   Cela prouve que la capture est déterministe, PAS que les clés sont indépendantes')
        print('   de l’état. MAIS la question qui compte a, elle, été MESURÉE : une route omet-elle')
        print('   sa clé quand la liste qu’elle porte est vide ? NON — la base figée contient déjà')
        print('   28 listes VIDES (dont `decision-du-jour…/cards`, nourrie par les cartes de')
        print('   levier) et dans les 28 cas la CLÉ EST PRÉSENTE avec `[]`, contre 109 listes')
        print('   pleines. Le back émet la clé, il ne l’omet pas.')
        print('   ⇒ Donc un compte plus pauvre ne devrait PAS faire bouger les ensembles, et une')
        print('     clé réellement disparue est un vrai finding — pas un artefact de monde vide.')
        print('\n⚠️ RÈGLE DE LECTURE : un ENSEMBLE qui a bougé est un finding ; une VALEUR qui a')
        print('   bougé ne l’est pas — le compte rejoué a le même âge de jeu, pas la même histoire.')
        print('   Un corps « parti » peut simplement être une route sans instance sur ce compte :')
        print('   le vérifier avant de l’appeler régression.')
        sys.exit(1 if bouges else 0)

    print(__doc__)
    sys.exit(2)


if __name__ == '__main__':
    main()
