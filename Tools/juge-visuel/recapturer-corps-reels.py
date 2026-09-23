#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""La re-capture des corps réels (§DA-4) au prochain tour de pile — UNE commande, à lancer au tour que donne f2, jamais avant.

Ce qu'elle enchaîne — et ce que la passe du 22/09 (`atelier-2026-09-22/06-corps-reels-2026-09-22.md`) a dû faire à la main :
  0. les préalables, sans toucher la pile : la paire `MAFIA_CAPTURE_*` posée (on imprime les NOMS, jamais les valeurs),
     `MAFIA_DEMO_*` absente (posée = FAUTE), aucun gate (`mcc-e2e-*`), la porte Unity LIBRE ;
  1. FIGER les ensembles de clés PROFONDS des corps actuels (`payload.data.…`, tableaux repliés en `[]`, `response_meta` exclue)
     AVANT la capture : la capture écrase les corps, la ligne de base disparaît au moment précis où elle devient utile ;
  2. la fenêtre synchrone : `passe-synchrone.py --compte-env --player-id-me` (le `player_id` DÉRIVÉ par `GET /v1/me` avec la paire,
     aucun `session/open` ; puis empreinte → capture → empreinte → comparaison ; il refuse `MAFIA_DEMO_*` et le gate). Décisions f2 du
     23/09 : aucun paramètre manuel (il viserait le mauvais compte), identifiant et `player_id` imprimés par leur EMPREINTE (`masquer`) ;
  3. les RESTES : un corps dont la `provenance.date` précède le début de la passe n'a pas été réécrit (route renommée par le lecteur
     de routes, ou sortie du dossier) — LISTÉS, jamais effacés (le 22/09 : 71 fichiers ; deux fichiers pour une route à deux dates,
     c'est un juge qui compare au mauvais) ;
  4. le DIFF d'ensembles, apparié par (dossier, méthode, route normalisée), rangé en trois natures :
     A la FORME a changé (clé apparue ou disparue hors d'un tableau qui s'est vidé ou rempli) ;
     B l'ÉTAT a changé, pas la forme (le chemin est sous un tableau vide d'un côté, rempli de l'autre ; ou le statut a changé :
       200 → « sans instance », un fait du compte) ;
     C route présente d'un seul côté (le code du client a changé, ou l'outil a renommé le fichier) ;
  5. `verifier-fraicheur-corps.py` ;
  6. `construire-dossiers.py --sans-rendu` (INDEX, colonne `corps` ; aucun rendu) puis le paragraphe « ⚠️ Ces corps ont été pris
     sur un back daté » réinséré s'il a sauté (le 22/09 : à la main).
Le rapport (`corps-reels-diff-<date>.md`) est un BROUILLON : attribuer une clé A à un commit du back reste un travail de lecture.

⛔ Ce script ne sème rien, ne prend aucune planche, ne rend rien, n'appelle aucune mutation (le capteur ne les appelle pas).
L'identifiant n'apparaît en clair nulle part : ni sur une ligne de commande (`--compte-env`), ni au journal, ni dans les corps écrits
(`capturer-corps-reels.py`, `masquer()`). Contrôle : `--controle-masque` (run à blanc sur une pile injoignable, grep des valeurs ⇒ 0).

Contrôle statique (2026-09-23) : `--figer` sur les corps de `d0824c8c^` (06/09) puis `--diff` sur ceux de `d0824c8c` (22/09) retrouve
le constat de `06-…` : A = `harvest_band`/`relance_band` (intérieur, tous les dossiers), `friction/state` (2 clés), dealers (4 clés), bundle
i18n ; B = `slots[]`, `beats[]`, `lawyerRoster[]`, `news/beats/{}` (statut). Les comptes diffèrent (222 routes appariées ici, 234 le 22/09) :
l'appariement d'ici inclut le dossier.
Usage : recapturer-corps-reels.py                      --plan (défaut) : les préalables, rien lancé
        recapturer-corps-reels.py --lancer
        recapturer-corps-reels.py --controle-masque          run à blanc, pile INJOIGNABLE (127.0.0.1:9) : aucune capture possible
        recapturer-corps-reels.py --figer <sortie.json> [--racine <dossier>]      statique
        recapturer-corps-reels.py --diff <base.json> [--racine <dossier>] [--rapport <sortie.md>]   statique
Env    : MAFIA_CAPTURE_IDENTIFIER, MAFIA_CAPTURE_PASSWORD — exportées par l'user dans le shell du juge, jamais écrites."""
import collections, datetime, glob, json, os, re, subprocess, sys

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.abspath(os.path.join(ICI, '..', '..'))
CRENEAU = os.path.expanduser('~/project/mafia-clean-city/scripts/creneau-unity.sh')
PARAGRAPHE = '⚠️ Ces corps ont été pris sur un back'
heure = lambda: datetime.datetime.now().strftime('%H:%M:%S')


def arg(nom, defaut=None):
    return sys.argv[sys.argv.index(nom) + 1] if nom in sys.argv and sys.argv.index(nom) + 1 < len(sys.argv) else defaut


# ── préalables (aucun appel à la pile) ───────────────────────────────────────────────────────────────────────────────────────────────
def prealables():
    """Rend la liste des empêchements ; chaque ligne dit un NOM de variable, jamais une valeur."""
    non = []
    for v in ('MAFIA_CAPTURE_IDENTIFIER', 'MAFIA_CAPTURE_PASSWORD'):
        print(f'  {v:26} {"posée" if os.environ.get(v, "").strip() else "ABSENTE"}')
        if not os.environ.get(v, '').strip(): non.append(f'{v} absente (l’user l’exporte dans le shell du juge)')
    for v in ('MAFIA_DEMO_IDENTIFIER', 'MAFIA_DEMO_PASSWORD'):
        if os.environ.get(v): non.append(f'FAUTE : {v} posée — `unset` avant la passe')
    d = subprocess.run(['docker', 'ps', '--format', '{{.Names}}'], capture_output=True, text=True)
    if d.returncode: non.append('docker illisible — impossible d’affirmer que la machine est libre')
    elif any(n.startswith('mcc-e2e') for n in d.stdout.split()): non.append('un gate E2E tourne (mcc-e2e-*)')
    if os.path.exists(CRENEAU):
        t = (subprocess.run([CRENEAU, 'status'], capture_output=True, text=True).stdout.strip().splitlines() or [''])[0]
        print(f'  porte Unity                {t}')
        if t != 'LIBRE': non.append('porte Unity : ' + t)
    return non


# ── ensembles de clés profonds ───────────────────────────────────────────────────────────────────────────────────────────────────────
def chemins(x, pref, out, vides):
    """Les chemins pointés ; un tableau se replie en `[]` ; `vides` reçoit les préfixes de tableaux VIDES (l'état, pas la forme)."""
    if isinstance(x, dict):
        for k, v in x.items(): chemins(v, f'{pref}.{k}' if pref else k, out, vides)
    elif isinstance(x, list):
        p = pref + '[]'; out.add(p)
        if not x: vides.add(p)
        for e in x: chemins(e, p, out, vides)
    else:
        out.add(pref)


def route_norm(r):
    return re.sub(r'=[^&]*', '=', re.sub(r'\{[^}]*\}|/\d+(?=/|$|\?)', '/{}', r or '').replace('//{}', '/{}'))


def figer(racine):
    base = {}
    for f in sorted(glob.glob(os.path.join(racine, '*', 'corps-reels', '*.json'))):
        if os.path.basename(f).startswith('_index'): continue
        d = json.load(open(f, encoding='utf-8'))
        dossier = os.path.relpath(f, racine).split(os.sep)[0]
        cle = f"{dossier} {d.get('methode')} {route_norm(d.get('route'))}"
        out, vides = set(), set()
        c = d.get('corps')
        if isinstance(c, dict):
            chemins({k: v for k, v in c.items() if k != 'response_meta'}, '', out, vides)
        base[cle] = {'fichier': os.path.relpath(f, racine), 'statut': d.get('statut'), 'chemins': sorted(out), 'vides': sorted(vides),
                     'date': (d.get('provenance') or {}).get('date')}
    return base


def comparer(avant, apres):
    A, B, C, inchangees = [], [], [], 0
    for cle in sorted(set(avant) | set(apres)):
        if cle not in apres: C.append((cle, 'sortie')); continue
        if cle not in avant: C.append((cle, 'neuve')); continue
        a, b = avant[cle], apres[cle]
        pa, pb = set(a['chemins']), set(b['chemins'])
        if pa == pb: inchangees += 1; continue
        if a['statut'] != b['statut']:     # 200 → « sans instance » (ou l'inverse) : un fait du compte, pas une forme
            B.append((cle, [f"statut {a['statut']} → {b['statut']}"], len(pa ^ pb))); continue
        bascules = (set(a['vides']) ^ set(b['vides'])) | {t for t in (set(a['vides']) | set(b['vides'])) if t not in pa or t not in pb}
        etat = lambda p: any(p.startswith(t) and p != t for t in bascules)
        forme = sorted(p for p in (pa ^ pb) if not etat(p))
        if forme: A.append((cle, sorted(p for p in forme if p in pb), sorted(p for p in forme if p in pa)))
        rest = sorted(p for p in (pa ^ pb) if etat(p))
        if rest: B.append((cle, sorted(t for t in bascules if any(p.startswith(t) for p in rest)), len(rest)))
    return A, B, C, inchangees


def rapport(A, B, C, inchangees, n, dest):
    L = [f'# Corps réels — diff d’ensembles de clés (brouillon, {datetime.date.today().isoformat()})', '',
         f'`recapturer-corps-reels.py` : **{n} routes comparées · {inchangees} inchangées** · A {len(A)} · B {len(B)} · C {len(C)}.',
         'Appariement (dossier, méthode, route normalisée) ; `response_meta` exclue ; tableaux repliés en `[]`.', '',
         '## A — la FORME a changé (chaque clé apparue est une forme G potentielle ; commit du back à attribuer)', '',
         '| route | apparues | disparues |', '|---|---|---|']
    L += [f'| `{c}` | {", ".join(f"`{p}`" for p in ap) or "—"} | {", ".join(f"`{p}`" for p in di) or "—"} |' for c, ap, di in A]
    L += ['', '## B — l’ÉTAT a changé, pas la forme (un tableau vide d’un côté, rempli de l’autre)', '', '| route | tableaux (ou statut) | chemins |', '|---|---|---|']
    L += [f'| `{c}` | {", ".join(f"`{t}`" for t in ts)} | {k} |' for c, ts, k in B]
    L += ['', '## C — routes d’un seul côté', ''] + [f'- `{c}` — {s}' for c, s in C]
    open(dest, 'w', encoding='utf-8').write('\n'.join(L) + '\n')


def diff_et_rapport(base_json, racine, dest):
    avant = json.load(open(base_json, encoding='utf-8')); apres = figer(racine)
    A, B, C, inch = comparer(avant, apres)
    n = len(set(avant) & set(apres))
    print(f'  {n} routes comparées · {inch} inchangées · A forme {len(A)} · B état {len(B)} · C un seul côté {len(C)}')
    if dest: rapport(A, B, C, inch, n, dest); print(f'  rapport : {dest}')
    return A, B, C


def restes(racine, debut):
    """Les corps que la passe n'a pas réécrits : leur date de provenance précède le début."""
    r = []
    for f in sorted(glob.glob(os.path.join(racine, '*', 'corps-reels', '*.json'))):
        if os.path.basename(f).startswith('_index'): continue
        dt = ((json.load(open(f, encoding='utf-8')).get('provenance') or {}).get('date')) or ''
        if dt < debut: r.append((os.path.relpath(f, racine), dt))
    return r


def etape(nom, cmd):
    t0 = datetime.datetime.now(); print(f'\n── {nom} ({heure()})')
    r = subprocess.run(cmd, cwd=RACINE)
    print(f'   {nom} : code {r.returncode}, {(datetime.datetime.now() - t0).total_seconds():.0f} s')
    return r.returncode


def lancer():
    non = prealables()
    if non: [print('⛔', x) for x in non]; sys.exit('⛔ préalables non tenus : rien lancé')
    jour = datetime.date.today().isoformat(); debut = datetime.datetime.now().isoformat(timespec='seconds')
    base = os.path.join(ICI, f'base-cles-profondes-avant-recapture-{jour}.json')
    json.dump(figer(ICI), open(base, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(f'DÉBUT {heure()} · ligne de base figée : {os.path.relpath(base, RACINE)}')
    index = os.path.join(ICI, 'INDEX.md')
    para = next((l for l in open(index, encoding='utf-8').read().split('\n') if l.startswith(PARAGRAPHE)), None)
    code = etape('fenêtre synchrone', [sys.executable, os.path.join(ICI, 'passe-synchrone.py'), '--compte-env', '--player-id-me'])
    print(f'FIN DE LA PILE {heure()}')
    if code:
        print('⛔ la fenêtre synchrone a échoué (ou le compte a bougé) : pas de diff sur des corps douteux. Lire son log.'); sys.exit(code)
    rs = restes(ICI, debut)
    print(f'\n── restes : {len(rs)} corps non réécrits par cette passe (à retirer après lecture, `git rm`) :')
    [print(f'   {f}  ({dt or "sans date"})') for f, dt in rs]
    print('\n── diff d’ensembles de clés')
    diff_et_rapport(base, ICI, os.path.join(RACINE, 'Tools', 'atelier-2026-09-22', f'corps-reels-diff-{jour}.md'))
    etape('fraîcheur', [sys.executable, os.path.join(ICI, 'verifier-fraicheur-corps.py')])
    etape('INDEX (sans rendu)', [sys.executable, os.path.join(ICI, 'construire-dossiers.py'), '--sans-rendu'])
    t = open(index, encoding='utf-8').read()
    if para and PARAGRAPHE not in t:
        l = t.split('\n'); l.insert(min(6, len(l)), para); open(index, 'w', encoding='utf-8').write('\n'.join(l))
        print('   INDEX : paragraphe « back daté » réinséré')
    print(f'\nFIN {heure()} — rien commité : lire le diff, les restes, puis commiter.')


def controle_masque():
    """Le run à blanc de la décision f2 du 23/09 : une paire FACTICE, la pile INJOIGNABLE (`STACK_BASE_URL=http://127.0.0.1:9`, rien n'y
    écoute) — le capteur et la fenêtre synchrone vont jusqu'à leur premier appel réseau et s'arrêtent. On grep les deux valeurs dans le
    journal : 0 attendu. Aucune capture n'est possible (aucune pile), aucun fichier n'est écrit (les deux échouent avant)."""
    import secrets
    ident, mdp = f'controle-{secrets.token_hex(6)}@masque.invalid', secrets.token_hex(12)
    env = {k: v for k, v in os.environ.items() if not k.startswith(('MAFIA_DEMO_', 'MAFIA_CAPTURE_'))}
    env.update({'MAFIA_CAPTURE_IDENTIFIER': ident, 'MAFIA_CAPTURE_PASSWORD': mdp, 'STACK_BASE_URL': 'http://127.0.0.1:9',
                'PYTHONDONTWRITEBYTECODE': '1'})     # les .pyc de `__pycache__/` sont suivis par git : le run à blanc ne les réécrit pas
    runs = [('capteur', [sys.executable, os.path.join(ICI, 'capturer-corps-reels.py'), '--compte-env']),
            ('fenêtre synchrone', [sys.executable, os.path.join(ICI, 'passe-synchrone.py'), '--compte-env', '--player-id-me'])]
    avant = subprocess.run(['git', 'status', '--porcelain'], cwd=RACINE, capture_output=True, text=True).stdout
    defauts = 0
    for nom, cmd in runs:
        r = subprocess.run(cmd, cwd=RACINE, env=env, capture_output=True, text=True, timeout=120)
        journal = r.stdout + r.stderr
        n = journal.count(ident) + journal.count(mdp)
        vu = 'empreinte sha256:' in journal
        print(f'  {nom:18} code {r.returncode} · valeurs en clair dans le journal : {n} · empreinte imprimée : {"oui" if vu else "NON"}')
        print('     ' + ' | '.join(l.strip()[:110] for l in journal.strip().splitlines()[-3:]))
        defauts += (n != 0) + (not vu)
    if subprocess.run(['git', 'status', '--porcelain'], cwd=RACINE, capture_output=True, text=True).stdout != avant:
        print('  ⛔ le run à blanc a écrit dans le dépôt'); defauts += 1
    print(f'{defauts} défaut(s)'); sys.exit(1 if defauts else 0)


def main():
    if '--figer' in sys.argv:
        dest = arg('--figer'); json.dump(figer(arg('--racine', ICI)), open(dest, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
        print(f'figé : {dest}'); return
    if '--diff' in sys.argv:
        diff_et_rapport(arg('--diff'), arg('--racine', ICI), arg('--rapport')); return
    if '--lancer' in sys.argv:
        lancer(); return
    if '--controle-masque' in sys.argv:
        controle_masque(); return
    print('PLAN — rien lancé. Préalables :')
    non = prealables()
    print(f'  corps actuels : {len(figer(ICI))} routes')
    [print('  ⛔', x) for x in non]
    print('prêt' if not non else f'{len(non)} empêchement(s) — la passe ne partira pas')
    sys.exit(1 if non else 0)


if __name__ == '__main__':
    main()
