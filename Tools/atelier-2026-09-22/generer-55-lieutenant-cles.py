#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""55 — ⑦ la fiche du lieutenant : les 22 clés que le code de CLIENT-1 demande et que le back ne sert pas (message CLIENT-1 du 23/09,
bundle fr de la pile `e7f52351`, 1659 clés ; 14 des 22 vues en repli au run). La table fait foi : CLIENT-1 réaligne son code sur ses octets.

Pour chaque clé : le fr demandé par le client, sa présence dans la maquette (`ecrans-brennar-7-lieutenant.html`, texte visible, apostrophes
normalisées) ou dans les notes 12 / 26, puis NOTRE fr et l'en. Règles appliquées :
  - D13 (tranché le 23/09, après la question du « il » de 26 §4.3) : aucune forme accordée à la personne dans une valeur servie ; ⑦ est
    une MAQUETTE À RATIFIER, rien de ratifié ne protège un « il » (même décision f2 que pour ㉙). Deux mots portent un « il » qui reprend le
    lieutenant (n° 13 et 17) : forme épicène proposée, la clé suit le nouveau fr (dérivation `domaine.rôle.slug(fr)`, ou clé NOMMÉE
    quand la valeur porte un paramètre). « ce qu’il reste » est un « il » IMPERSONNEL (« il reste ») : gardé. « son » / « sa » sont épicènes.
  - D17 : U+00A0 avant « : », U+202F avant « ? ». D10 : apostrophe typographique.
  - Clé dérivée : `Libelle.De(domaine, rôle, fr)` = `domaine.rôle.` + slug(fr) — le slug sans la ponctuation finale.
Contrôles (exit 1) : clé = dérivation du fr (sauf clé nommée déclarée) ; aucune des 22 clés d'origine n'est servie au back HEAD (FR_MESSAGES
et EN_MESSAGES, lus par leur nom) — sinon on le dit ; aucun « il » personnel dans nos fr ; D17 ; D10 ; somme-table code 0.
Usage : python3 Tools/atelier-2026-09-22/generer-55-lieutenant-cles.py"""
import html, os, re, subprocess, sys, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__))
BACK = os.path.expanduser('~/project/mafia-back-suite')
PAGE = os.path.expanduser('~/project/atelier3d-mafia/ecrans-brennar-7-lieutenant.html')
NB, NNB = ' ', ' '

def slug(s):
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')

# (n°, clé demandée, fr demandé, cadre, domaine.rôle, notre fr, en, clé nommée ou None, note)
L = [
 (1, 'famille.ecran.signal', 'Signal', '0', 'famille.ecran', 'Signal', 'Signal', None, 'titre de ligne ; 26 §3'),
 (2, 'famille.ecran.ordre_permanent', 'Ordre permanent', '0', 'famille.ecran', 'Ordre permanent', 'Standing order', None, 'titre de ligne'),
 (3, 'famille.signal.a_l_ecoute', 'à l’écoute', '0', 'famille.signal', 'à l’écoute', 'listening', None, '`drift_phase` DIRECT_ALIGNED ; 26 §3'),
 (4, 'famille.signal.derive', 'dérive', '1', 'famille.signal', 'dérive', 'drifting', None, 'DRIFTING ; 26 §3'),
 (5, 'famille.signal.n_ecoute_que_le_terrain', 'n’écoute que le terrain', '—', 'famille.signal', 'n’écoute que le terrain', 'hears only the ground', None, 'INCIDENTAL_LOCKED ; ABSENT de la page — 12 l.86, 26 §3 ; sujet sous-entendu, aucun accord'),
 (6, 'famille.signal.se_recale', 'se recale', '—', 'famille.signal', 'se recale', 'resetting', None, 'RESETTING ; ABSENT de la page — 12 l.86, 26 §3'),
 (7, 'famille.ordre.aucun_ordre', 'aucun ordre', '0, 2', 'famille.ordre', 'aucun ordre', 'no order', None, '`freshness` NONE'),
 (8, 'famille.ordre.expire_bientot', 'expire bientôt', '2', 'famille.ordre', 'expire bientôt', 'expires soon', None, 'EXPIRES_SOON'),
 (9, 'famille.repere.l_etat_du_terrain', 'l’état du terrain', '1', 'famille.repere', 'l’état du terrain', 'the state of the ground', None, 'TERRITORY_STATE'),
 (10, 'famille.repere.ce_qu_il_reste', 'ce qu’il reste', '1', 'famille.repere', 'ce qu’il reste', 'what is left', None, 'RESOURCE_AVAILABILITY ; « il » IMPERSONNEL (il reste) : épicène'),
 (11, 'famille.repere.l_heure', 'l’heure', '1', 'famille.repere', 'l’heure', 'the hour', None, 'TIME_SLOT'),
 (12, 'famille.repere.ce_que_font_les_autres', 'ce que font les autres', '1', 'famille.repere', 'ce que font les autres', 'what the others do', None, 'PEER_BEHAVIOR'),
 (13, 'famille.ecran.il_ecoute_autre_chose_que_vos_ordres', 'Il écoute autre chose que vos ordres', '1', 'famille.ecran',
  '{nom} écoute autre chose que vos ordres', '{nom} is listening to something other than your orders', 'famille.ecran.nom_ecoute_autre_chose_que_vos_ordres',
  'D13 : le « Il » reprenait le lieutenant (26 §4.3) → le NOM servi, comme le bandeau servi « {nom} attend vos ordres » ; clé NOMMÉE (paramètre)'),
 (14, 'famille.ecran.rappeler_l_ordre_direct', 'Rappeler l’ordre direct', '1', 'famille.ecran', 'Rappeler l’ordre direct', 'Restore the direct order', None, 'geste (DIRECT_ORDER)'),
 (15, 'famille.ecran.remettre_l_ecoute_a_zero', 'Remettre l’écoute à zéro', '1', 'famille.ecran', 'Remettre l’écoute à zéro', 'Reset the listening', None, 'geste (RESET)'),
 (16, 'famille.ecran.brouiller_un_repere', 'Brouiller un repère', '1', 'famille.ecran', 'Brouiller un repère', 'Blur a cue', None, 'geste (BLUR)'),
 (17, 'famille.ecran.ce_qu_il_ecoute_a_la_place', 'ce qu’il écoute à la place :', '1', 'famille.ecran',
  f'ce qui est écouté à la place{NB}:', 'what is heard instead:', None,
  'D13 : le « il » reprenait le lieutenant → tournure sans pronom ; D17 : U+00A0 avant « : » (la page et le code portaient une espace ordinaire)'),
 (18, 'famille.question.en_faire_la_regle', 'En faire la règle ?', '2', 'famille.question', f'En faire la règle{NNB}?', 'Make it the rule?', None,
  'rôle « question », même slug que le n° 20, clé distincte voulue ; D17 : U+202F avant « ? »'),
 (19, 'famille.ecran.son_ordre_du_moment_a_tenu_vous_pouvez_le_renouveler_le_retirer_ou_en_faire_sa_regle_par_defaut',
  'Son ordre du moment a tenu. Vous pouvez le renouveler, le retirer, ou en faire sa règle par défaut.', '2', 'famille.ecran',
  'Son ordre du moment a tenu. Vous pouvez le renouveler, le retirer, ou en faire sa règle par défaut.',
  'The current order held. You can renew it, withdraw it, or make it the default rule.', None, '« son » / « sa » : possessifs épicènes (accord avec l’objet) ; « le » = l’ordre'),
 (20, 'famille.ecran.en_faire_la_regle', 'En faire la règle', '2', 'famille.ecran', 'En faire la règle', 'Make it the rule', None, 'bouton (PROMOTE_TO_DEFAULT)'),
 (21, 'famille.ecran.renouveler', 'Renouveler', '2', 'famille.ecran', 'Renouveler', 'Renew', None, 'bouton (RENEW)'),
 (22, 'famille.ecran.retirer', 'Retirer', '2', 'famille.ecran', 'Retirer', 'Withdraw', None, 'bouton (REVOKE)'),
]

def texte_page():
    s = open(PAGE, encoding='utf-8').read()
    s = re.sub(r'<(script|style)\b.*?</\1>', ' ', s, flags=re.S)
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s))
    return re.sub(r'\s+', ' ', s.replace('’', "'").replace(NB, ' ').replace(NNB, ' '))

def main():
    st = subprocess.run(['git', '-C', BACK, 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'], capture_output=True, text=True, check=True).stdout
    def registre(nom):
        d = st.index(f'export const {nom}'); return set(re.findall(r"^\s*'([^'\s]+)':", st[d:st.index('\n};', d)], re.M))
    EN, FR = registre('EN_MESSAGES'), registre('FR_MESSAGES')
    sha = subprocess.run(['git', '-C', BACK, 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
    page = texte_page().lower()
    d, lignes, servies, absentes = [], [], [], []
    for n, cle0, fr0, cadre, dom, fr, en, nommee, note in L:
        if cle0 in FR or cle0 in EN: servies.append(cle0)
        if f'{dom}.{slug(fr0)}' != cle0: d.append(f'n° {n} : la clé demandée {cle0} ≠ dérivation de son fr ({dom}.{slug(fr0)})')
        cle = nommee or f'{dom}.{slug(fr)}'
        if not nommee and cle != f'{dom}.{slug(fr)}': d.append(f'n° {n} : clé non dérivée')
        dans_page = fr0.replace('’', "'").rstrip(' :?').lower() in page
        if not dans_page: absentes.append(n)
        if re.search(r'\b[Ii]ls?\b', fr) and n != 10: d.append(f'n° {n} : « il » personnel dans notre fr (D13)')
        if re.search(r'[^ ]:', fr) or re.search(r'[^ ][?!;]', fr): d.append(f'n° {n} : D17')
        if "'" in fr: d.append(f'n° {n} : apostrophe droite (D10)')
        if sorted(re.findall(r'\{\w+\}', fr)) != sorted(re.findall(r'\{\w+\}', en)): d.append(f'n° {n} : paramètres fr ≠ en')
        change = [] if (fr == fr0 and cle == cle0) else [x for x, c in (('valeur', fr != fr0), ('clé', cle != cle0)) if c]
        lignes.append([fr0, f'⑦ cadre {cadre}', 'proposée', cle, fr, en,
                       note + (f' ; DEMANDÉ : `{cle0}` « {fr0} » — change : {", ".join(change)}' if change else '')
                       + ('' if dans_page else ' ; absent du texte de la page (vient des notes 12 / 26)')])
    if servies: d.append(f'déjà servies au back {sha} : {servies} (CLIENT-1 les disait non servies à e7f52351)')
    out = os.path.join(ICI, '55-lieutenant-cles-2026-09-23.tsv')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('\t'.join(['mot', 'cadres', 'classe', 'clé', 'fr', 'en', 'note']) + '\n')
        for l in lignes: f.write('\t'.join(l) + '\n')
    changees = [l for l in lignes if 'DEMANDÉ' in l[6]]
    print(f'55 : somme = {len(lignes)} lignes = {len(lignes)} mots + 0 compléments · back {sha} : 0 des 22 servies attendu, {len(servies)} trouvées · '
          f'absents de la page : {absentes} · changés par rapport à la demande : {len(changees)} ({", ".join(l[3] for l in changees)})')
    rc = subprocess.run([sys.executable, os.path.join(ICI, 'somme-table.py'), out]).returncode
    if rc: d.append(f'somme-table code {rc}')
    for x in d: print('⛔', x)
    return 1 if d else 0

if __name__ == '__main__':
    sys.exit(main())
