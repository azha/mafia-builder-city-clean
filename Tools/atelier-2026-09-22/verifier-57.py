#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vérifie `57-hl-consequences-2026-09-26.tsv` (commande f2 du 24/09, `commande-hl-consequences-2026-09-24.md` ; design HL v7.6 §14,
`mafia-clean-city` e418ff65) :
- colonnes `clé · fr · en · statut` exactement, 16 lignes, statut PROPOSÉ ;
- l'ensemble de clés == les 16 de la commande == les 16 de l'annexe §14 du design, à la forme `hl.option.<f>.<o>.projected_consequence` ;
- chaque option a son libellé servi dans les DEUX registres (EN_MESSAGES et FR_MESSAGES, lus PAR LEUR NOM) et aucune conséquence n'est déjà servie ;
- fr : D10 (aucune apostrophe droite), D17 (U+00A0 avant « : », U+202F avant « ; ? ! », jamais une espace ordinaire ni rien) ;
- fr et en : qualitatif (aucun chiffre, ni `#`, ni `{`/`}`, ni `€`/`$`) ; en ≠ fr ; en sans insécable ;
- classes de la commande : les 3 « agir » qui prélèvent disent le coût sans montant (« tant que l’argent suit ») ; les 3 « laisser » en face disent
  « Rien n’est payé » ; les 4 navigations disent qu'elles ne font rien (« rien n’ ») ; la ligne 15 ne promet ni traitement, ni résolution, ni reprise.
Contrôle de mutation (`--mutation`) : 6 fautes semées, chacune doit être vue (⛔), sinon code 2.
Ce que ce contrôle NE voit PAS : la justesse au singulier comme au pluriel et l'épicène (lus à la main, §2 du rapport) ; la mise en page."""
import csv, io, os, re, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__))
TSV = os.path.join(ICI, '57-hl-consequences-2026-09-26.tsv')
COMMANDE = os.path.join(ICI, 'commande-hl-consequences-2026-09-24.md')
BACK, BREV = os.path.expanduser('~/project/mafia-clean-city'), 'e418ff65'
DESIGN = 'docs/superpowers/specs/2026-09-23-hl-card-agit-design.md'
TABLE = 'services/game-back/src/i18n/string_table.ts'
NB, FI = ' ', ' '
sh = lambda *a: subprocess.run(['git', '-C', BACK, *a], capture_output=True, text=True, check=True).stdout

AGIR_PAYANT = {'damaged_building.repair_via_queue', 'severed_route.reroute_now', 'mycelial_stressed_leg.maintain_now'}
LAISSER_EN_FACE = {'damaged_building.leave_damaged', 'severed_route.leave_severed', 'mycelial_stressed_leg.leave_stressed'}
NAVIGATION = {'backpressure_critical_trace.trace_now', 'autonomy_reports.review_now', 'cue_cascade_fallout.review_now',
              'escalation_backlog.review_now'}
L15_INTERDIT_FR = re.compile(r'trait|règl|résou|répar|repren|reprise|en main', re.I)
L15_INTERDIT_EN = re.compile(r'handl|resolv|settl|fix|repair|take back|taken back|back in hand', re.I)

def registre(st, nom):
    d = st.index(f'export const {nom}'); f = st.index('\n};', d)
    return dict(re.findall(r"^\s*'([a-z0-9_.]+)':\s*(?:\n\s*)?'((?:[^'\\]|\\.)*)'", st[d:f], re.M))

def lire_sources():
    cmd = open(COMMANDE, encoding='utf-8').read()
    commande = re.findall(r'^\| \d+ \| ([a-z_]+\.[a-z_]+) \|', cmd, re.M)
    design = sh('show', f'{BREV}:{DESIGN}')
    sec = design[design.index('## 14. Annexe'):]
    annexe = re.findall(r'^\| \d+ \| `([a-z_]+\.[a-z_]+)` \|', sec, re.M)
    st = sh('show', f'{BREV}:{TABLE}')
    return commande, annexe, registre(st, 'EN_MESSAGES'), registre(st, 'FR_MESSAGES')

def lire_tsv(texte):
    r = list(csv.reader(io.StringIO(texte), delimiter='\t', quoting=csv.QUOTE_NONE))
    return r[0], r[1:]

def verifier(entete, lignes, commande, annexe, en_reg, fr_reg):
    D = []
    if entete != ['clé', 'fr', 'en', 'statut']: D.append(f'en-tête {entete}')
    cles = {}
    for l in lignes:
        if len(l) != 4: D.append(f'ligne à {len(l)} colonnes : {l[:1]}'); continue
        k, fr, en, statut = l
        m = re.fullmatch(r'hl\.option\.([a-z_]+\.[a-z_]+)\.projected_consequence', k)
        if not m: D.append(f'{k} : forme de clé'); continue
        o = m.group(1)
        if o in cles: D.append(f'{k} : en double')
        cles[o] = (fr, en)
        if statut != 'PROPOSÉ': D.append(f'{k} : statut {statut!r}')
        for reg, nom in ((en_reg, 'EN'), (fr_reg, 'FR')):
            if f'hl.option.{o}' not in reg: D.append(f'{k} : libellé hl.option.{o} non servi en {nom} à {BREV}')
            if k in reg: D.append(f'{k} : déjà servie en {nom} à {BREV}')
        if "'" in fr: D.append(f'{k} : apostrophe droite dans le fr (D10)')
        for i, c in enumerate(fr):
            if c == ':' and (i == 0 or fr[i - 1] != NB): D.append(f'{k} : « : » sans U+00A0 devant (D17)')
            if c in ';?!' and (i == 0 or fr[i - 1] != FI): D.append(f'{k} : « {c} » sans U+202F devant (D17)')
        for t, lang in ((fr, 'fr'), (en, 'en')):
            if re.search(r'[0-9#{}€$]', t): D.append(f'{k} : chiffre ou signe non qualitatif dans le {lang}')
            if not t.strip() or t != t.strip(): D.append(f'{k} : {lang} vide ou à espace de bord')
        if NB in en or FI in en: D.append(f'{k} : insécable dans le en')
        if fr == en: D.append(f'{k} : en == fr (à classer dans _en-egal-fr-classement.txt)')
        if o in AGIR_PAYANT and ('tant que l’argent suit' not in fr or 'as long as the money holds out' not in en):
            D.append(f'{k} : « agir » payant sans le coût dit')
        if o in LAISSER_EN_FACE and not (fr.startswith('Rien n’est payé') and en.startswith('Nothing is paid')):
            D.append(f'{k} : « laisser » sans « Rien n’est payé »')
        if o in NAVIGATION and ('rien n’' not in fr or 'nothing' not in en):
            D.append(f'{k} : navigation sans « rien n’ » / « nothing »')
        if o == 'escalation_backlog.review_now' and (L15_INTERDIT_FR.search(fr) or L15_INTERDIT_EN.search(en)):
            D.append(f'{k} : la ligne 15 promet un traitement')
    for nom, src in (('commande', commande), ('annexe §14', annexe)):
        if len(src) != 16 or len(set(src)) != 16: D.append(f'{nom} : {len(src)} options lues, 16 attendues')
        if set(cles) != set(src): D.append(f'{nom} : en trop {sorted(set(cles) - set(src))} ; manquantes {sorted(set(src) - set(cles))}')
    return D

def main():
    commande, annexe, en_reg, fr_reg = lire_sources()
    entete, lignes = lire_tsv(open(TSV, encoding='utf-8').read())
    assert len(en_reg) > 1000 and len(fr_reg) > 1000, 'registres mal lus'
    assert fr_reg['hl.option.legal_case.accept_plea_deal'] == "Accepter l\\'arrangement", 'contrôle positif : FR lu PAR SON NOM'
    assert en_reg['hl.option.legal_case.accept_plea_deal'] == 'Take the deal', 'contrôle positif : EN lu PAR SON NOM'
    if '--mutation' in sys.argv:
        def mute(i, col, f):
            l2 = [list(x) for x in lignes]; l2[i][col] = f(l2[i][col]); return l2
        semees = {
            'apostrophe droite': mute(0, 1, lambda s: s.replace('’', "'", 1)),
            'espace ordinaire avant « : »': mute(3, 1, lambda s: s.replace(NB + ':', ' :')),
            'chiffre': mute(1, 2, lambda s: s + ' 3'),
            'navigation qui agit': mute(8, 1, lambda s: s.replace('rien n’y est touché, rien n’est payé', 'le point est dégagé')),
            'ligne 15 qui promet': mute(14, 2, lambda s: s.replace('You go and read', 'You handle')),
            'clé manquante': [list(x) for x in lignes[:-1]],
        }
        rate = 0
        for nom, l2 in semees.items():
            d = verifier(entete, l2, commande, annexe, en_reg, fr_reg)
            print(f'  mutation « {nom} » → {len(d)} ⛔' + ('' if d else '  ← NON VUE'))
            rate += not d
        print(f'{len(semees) - rate}/{len(semees)} mutations vues'); return 2 if rate else 0
    D = verifier(entete, lignes, commande, annexe, en_reg, fr_reg)
    print(f'commande {len(commande)} options ; annexe §14 ({BREV}) {len(annexe)} ; TSV {len(lignes)} lignes ; '
          f'registres EN {len(en_reg)} / FR {len(fr_reg)} clés')
    for x in D: print('  ⛔', x)
    print(f'{len(D)} défaut(s)'); return 1 if D else 0

if __name__ == '__main__':
    sys.exit(main())
