#!/usr/bin/env python3
"""Quelle image a été écrite par quel test, et ce test a-t-il rougi ?

⛔ LE DÉFAUT QU'IL FERME, mesuré le 2026-09-04. `Capture_EditeurDeRegles_1080x2400` a ÉCHOUÉ et
   **son PNG a quand même été écrit** : une capture écrit son image avant, ou indépendamment de,
   l'assertion qui la juge. Rien dans le harnais n'empêche un artefact MENTEUR d'exister, et une
   fois dans `Assets/Screenshots/` il a exactement la même tête que les autres. Un `git add -A`
   distrait l'embarque, et personne ne redemande ensuite de quel run il vient.
   ★ Ce qui rend le cas traître : le fichier était UNTRACKED, donc « nouveau », donc il ressemblait
     à un livrable. *L'absence d'un artefact est un résultat lisible ; un artefact faux ne l'est
     pas.* Quand un test refuse de produire une image, l'écran n'a pas de planche — c'est la bonne
     réponse, à consigner en dette, jamais à combler avec ce qui traîne.

USAGE :  python3 Tools/attribuer-images-aux-tests.py <log-unity>
   Le log doit avoir été PRÉSERVÉ (`LOG_FILE=…` au lancement du harnais) : sans lui, `mktemp`+`rm`
   le détruisent et il ne reste rien pour attribuer quoi que ce soit.

MÉTHODE : ordre d'apparition dans le log, entre deux lignes `MafiaCI: RUN …`. Un horodatage de
   fichier NE SUFFIT PAS — deux tests écrivent dans la même seconde (mesuré : trois images à
   11:14:02-03).
"""
import re, sys, pathlib

def main(chemin):
    lignes = pathlib.Path(chemin).read_text(errors='replace').split('\n')
    courant, ecrit, verdict = None, {}, {}
    for l in lignes:
        l = l.strip()
        m = re.match(r'MafiaCI: RUN .*?\.(\w+)$', l)
        if m:
            courant = m.group(1); continue
        m2 = re.match(r'MafiaCI: (PASSED|FAIL) \S*?\.(\w+)(?:\s|$)', l)
        if m2:
            verdict[m2.group(2)] = m2.group(1); continue
        # ⚠️ Avant le premier `RUN`, les chemins d'images qui apparaissent sont des MENTIONS
        #    (sources, préambule) et non des écritures. Les compter donnait 7 faux « ne pas
        #    commiter » au premier jet — un contrôle qui accuse au hasard finit ignoré.
        if courant is None: continue
        for f in re.findall(r'Assets/Screenshots/([\w.]+\.png)', l):
            ecrit.setdefault(f, courant)

    # ⛔ PLANCHER ANTI-VACUITÉ : « aucune image à ne pas commiter » est trivialement vrai sur un log
    #    vide, un mauvais fichier, ou un run qui n'a rien exécuté. Sans ça, l'outil bénit tout.
    if not ecrit:
        print("⛔ aucune image attribuée — mauvais log, ou run sans capture, ou `LOG_FILE=` oublié.",
              file=sys.stderr)
        return 2

    rouges = 0
    for f, t in sorted(ecrit.items()):
        v = verdict.get(t, 'INCONNU')       # INCONNU = le test n'a pas fini : à traiter comme rouge
        ok = v == 'PASSED'
        rouges += 0 if ok else 1
        print(('  À COMMITER   ' if ok else '  ⛔ NE PAS    ') + f + '  <- ' + t + '  ' + v)
    print(f"\n{len(ecrit)} image(s) écrite(s) · {len(ecrit)-rouges} commitable(s) · {rouges} à jeter")
    return 1 if rouges else 0

if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    sys.exit(main(sys.argv[1]))
