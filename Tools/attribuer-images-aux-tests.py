#!/usr/bin/env python3
"""Quelles images ce run a-t-il produites, et lesquelles viennent d'un test qui a RÉUSSI ?

⛔ LE DÉFAUT QU'IL FERME, mesuré le 2026-09-04. `Capture_EditeurDeRegles_1080x2400` a ÉCHOUÉ et
   **son PNG a quand même été écrit** : une capture écrit son image avant, ou indépendamment de,
   l'assertion qui la juge. Rien dans le harnais n'empêche un artefact MENTEUR d'exister, et une
   fois dans `Assets/Screenshots/` il a exactement la même tête que les autres.
   ★ Ce qui rend le cas traître : le fichier était UNTRACKED, donc « nouveau », donc il ressemblait
     à un livrable. *L'absence d'un artefact est un résultat lisible ; un artefact faux ne l'est
     pas.* Quand un test refuse de produire une image, l'écran n'a pas de planche — c'est la bonne
     réponse, à consigner en dette, jamais à combler avec ce qui traîne.

⛔⛔ ET LE DÉFAUT DE LA v1 DE CET OUTIL, QUI EST LE PLUS INSTRUCTIF : sa population était « les
   chemins que le LOG nomme ». Sur le run de 12h04 il a listé 7 images et déclaré « 0 à jeter »,
   pendant que `git status` en montrait **15 modifiées**. Les huit manquantes viennent de suites
   qui n'impriment pas leur chemin — donc invisibles, donc bénies en silence.
   ⇒ *Une population définie par ce que l'instrument sait lire n'est pas une population, c'est le
     champ de vision de l'instrument.* La population est ce que le DÉPÔT dit avoir changé.

USAGE :  python3 Tools/attribuer-images-aux-tests.py <log-unity>
   Le log doit avoir été PRÉSERVÉ (`LOG_FILE=…`) : sans lui, `mktemp`+`rm` le détruisent.
   Codes : 0 = tout est commitable · 1 = au moins une image est suspecte · 2 = rien à juger.
   ⚠️ Lire le code SANS pipe : `… | tail` rend celui de `tail`.
"""
import re, sys, subprocess, pathlib

def population_git():
    """Ce que le DÉPÔT dit avoir changé — la seule population qui ne dépende pas de ce que
    l'instrument sait lire. `??` (neuf) autant que ` M` (repris) : une planche d'écran déjà
    capturé revient MODIFIÉE, et un balayage qui ne verrait que le neuf raterait les reprises."""
    try:
        out = subprocess.run(['git', 'status', '--porcelain', '--', 'Assets/Screenshots'],
                             capture_output=True, text=True, check=True).stdout
    except Exception:
        return set()
    return {l[3:].strip().strip('"').split('/')[-1] for l in out.split('\n')
            if l.strip() and l.strip().endswith('.png')}

def main(chemin):
    lignes = pathlib.Path(chemin).read_text(errors='replace').split('\n')
    courant, attrib, verdict = None, {}, {}
    echoues, fin = [], None
    for l in lignes:
        l = l.strip()
        m = re.match(r'MafiaCI: RUN .*?\.(\w+)$', l)
        if m:
            courant = m.group(1); continue
        m2 = re.match(r'MafiaCI: (PASSED|FAIL) \S*?\.(\w+)(?:\s|$)', l)
        if m2:
            verdict[m2.group(2)] = m2.group(1)
            if m2.group(1) == 'FAIL': echoues.append(m2.group(2))
            continue
        m3 = re.search(r'RunPlayModeTests finished — passed=(\d+) failed=(\d+)', l)
        if m3:
            fin = (int(m3.group(1)), int(m3.group(2))); continue
        # Avant le premier RUN, un chemin d'image est une MENTION (source, préambule), pas une
        # écriture. Les compter donnait 7 faux « ne pas commiter » au premier jet.
        if courant is None: continue
        for f in re.findall(r'Assets/Screenshots/([\w.]+\.png)', l):
            attrib.setdefault(f, courant)

    # ⛔ L'ORDRE DE CES DEUX CONTRÔLES COMPTE, et je l'avais faux. Un run TUÉ (`-quit` ferme le
    #    process avant `RunFinished`) sortait « aucune image à juger » : le bon code de retour pour
    #    la MAUVAISE raison, donc un message qui envoie chercher un mauvais log au lieu de dire que
    #    le run n'a jamais fini. *Un diagnostic juste par accident se lit comme un diagnostic.*
    if fin is None:
        print("⛔ le log ne porte pas de ligne `RunPlayModeTests finished` : le run n'a pas fini — "
              "tué, ou `-quit` a fermé le process avant `RunFinished`. On ne juge rien là-dessus.",
              file=sys.stderr)
        return 2
    pop = population_git() | set(attrib)
    if not pop:
        print("⛔ le run a fini mais aucune image n'a bougé — run sans capture, ou arbre déjà "
              "commité.", file=sys.stderr)
        return 2

    passes, echecs = fin
    print(f"run : passed={passes} failed={echecs} · {len(pop)} image(s) touchée(s) dans l'arbre")
    if echecs == 0:
        # ⇒ Aucun test n'a rougi : AUCUNE image ne peut venir d'un test rouge. C'est plus fort que
        #   l'attribution ligne à ligne, et ça ne dépend pas de ce que les suites impriment.
        for f in sorted(pop):
            print(f"  À COMMITER    {f}  <- {attrib.get(f, 'non nommée dans le log')}")
        print(f"\n✅ run sans échec ⇒ les {len(pop)} images sont commitables.")
        return 0

    suspects = 0
    for f in sorted(pop):
        t = attrib.get(f)
        v = verdict.get(t) if t else None
        if v == 'PASSED':
            print(f"  À COMMITER    {f}  <- {t}  PASSED")
        else:
            suspects += 1
            raison = f"{t} {v}" if t else ("NON ATTRIBUÉE — sa suite n'imprime pas son chemin, et "
                                           "le run a des échecs : on ne la distingue pas d'une image "
                                           "menteuse")
            print(f"  ⛔ NE PAS     {f}  <- {raison}")
    print(f"\n{len(pop)} image(s) · {len(pop)-suspects} commitable(s) · {suspects} suspecte(s)"
          f"  · tests en échec : {', '.join(echoues) or '?'}")
    return 1

if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    sys.exit(main(sys.argv[1]))
