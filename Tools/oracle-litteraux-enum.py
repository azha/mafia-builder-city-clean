#!/usr/bin/env python3
"""Confronte les litteraux d'enumeration compares par les ecrans au corpus du back.

CE QUE CET ORACLE ATTRAPE, ET CE QU'IL NE PEUT PAS ATTRAPER — ecrit ici parce
qu'un instrument dont on ne borne pas la population accuse au hasard, et rassure
a tort sur le reste.

ATTRAPE : un litteral compare par un ecran qui n'existe NULLE PART dans le back.
  Trouve le 2026-09-02 : tenure_bucket == "new" alors que le producteur ne rend
  que FRESH | ACCLIMATED | SEASONED | SENIOR | ENTRENCHED — un badge mort, muet,
  qui ressemblait a un badge dont la condition n'est pas remplie.

N'ATTRAPE PAS, et c'est le plus important :
  1. L'HOMONYME. PriorityBucket existe DEUX FOIS dans ce back, aux valeurs
     disjointes (silent|watching|urgent|critical dans exceptions, LOW|MEDIUM|
     HIGH|CRITICAL dans citysim/inspection). Les deux jeux existent dans le
     corpus, donc les deux passent — et pourtant l'un rendait la moitie d'un
     ecran muette. Seule la lecture du CORPS du producteur tranche.
  2. Le litteral valide dans un AUTRE domaine : SEVERE compte 20 occurrences
     dans le back et zero dans StressBucket, ou la comparaison etait morte.
  3. Les segments de chemin de cle i18n : .reason vit 30 fois dans le corpus mais
     jamais entre guillemets => faux positif de cet oracle, mesure le meme jour.

=> Un OK ici veut dire "ce litteral existe quelque part", jamais "ce litteral est
celui de cette route". C'est un filet a grosses mailles, utile a ce titre seul.
"""
import re, os, sys, glob

CLES = set()

CLIENT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACK = '/home/erutheone/project/mafia-clean-city/services/game-back/src'

def litteraux():
    out = {}
    fichiers = glob.glob(f'{CLIENT}/Assets/Scripts/**/*ScreenController.cs', recursive=True) \
             + glob.glob(f'{CLIENT}/Assets/Scripts/**/*Client.cs', recursive=True)
    for f in fichiers:
        s = open(f, encoding='utf-8', errors='replace').read()
        s = re.sub(r'//[^\n]*', '', s)          # la prose ne compte pas
        for m in re.finditer(r'==\s*"([A-Za-z_]{2,30})"', s):
            out.setdefault(m.group(1), set()).add(os.path.basename(f))
        for m in re.finditer(r'"([A-Za-z_]{2,30})"\s*==', s):
            out.setdefault(m.group(1), set()).add(os.path.basename(f))
    return out

def corpus():
    parts = []
    for root, _, fs in os.walk(BACK):
        for x in fs:
            if x.endswith('.ts'):
                parts.append(open(os.path.join(root, x), errors='replace').read())
    return '\n'.join(parts)

def cles_i18n(c):
    """Les chaines du back qui ont la FORME d'une cle i18n — minuscules, underscores,
    au moins un point. Population volontairement etroite : une chaine qui n'a pas
    cette forme n'est pas une cle, et la compter rendrait l'oracle aveugle."""
    return {m.group(1) for m in re.finditer(r"['\"`]([a-z0-9_]+(?:\.[a-z0-9_]+)+)['\"`]", c)}

def main():
    lits, c = litteraux(), corpus()
    global CLES
    CLES = cles_i18n(c)
    if len(c) < 1_000_000:
        print(f"REFUS : corpus back de {len(c)} caracteres — trop petit, le chemin doit etre faux")
        return 2
    if c.count("'FRESH'") == 0:
        print("REFUS : controle positif en echec — 'FRESH' introuvable, le motif ne mord pas")
        return 2
    absents = []
    for l in sorted(lits):
        # Trois formes d'existence, pas une. La 3e a ete ajoutee parce que le motif
        # « entre guillemets » accusait .reason a tort : ce segment vit dans des CLES
        # i18n et jamais comme litteral cite.
        # ATTENTION : la premiere version de cette 3e forme cherchait \.<lit> dans TOUT
        # le corpus — elle matchait donc les acces de propriete TypeScript (foo.new) et
        # a TUE LA GARDE : defaut rearme, oracle vert. Mesure, pas suppose.
        # => On ne cherche le segment QUE dans les chaines qui ont la FORME d'une cle
        # i18n (minuscules, underscores, au moins un point). Durcir un critere sans
        # recompter ce qui passe encore, c'est couper le signal en croyant filtrer.
        n = (c.count("'" + l + "'")
             + c.count('"' + l + '"')
             + sum(1 for k in CLES if k == l or k.endswith('.' + l) or ('.' + l + '.') in k))
        if n == 0:
            absents.append((l, sorted(lits[l])))
        print(f"  {'ok' if n else 'KO'} {l:<24} {n:>4}   <- {', '.join(sorted(lits[l]))[:50]}")
    print(f"\n  {len(lits)} litteraux compares  ·  {len(absents)} introuvables dans le back")
    for l, fs in absents:
        print(f"     KO {l}  ({', '.join(fs)})")
    return 1 if absents else 0

if __name__ == '__main__':
    sys.exit(main())
