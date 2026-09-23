#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""49 — ㊳ le journal & la rue : les mots sans clé servie de ses cadres série 6 (125-130, 145 ; balayage `34-…`), même format que 37-48
(commande f2 du 23/09). Classes : servie · servie · D14 · proposée · note. D12-D18 ; gestes avec ou sans route. ㊳ ratifié par délégation.
Données servies (back `e7d18465`, lu ; corps réels `carnet`, `screen_c1`) :
  `GET /v1/news/feed` (brèves à clés), `GET /v1/ambient/feed` → `events[{descriptor_i18n_key, district, recency_band ∈ fresh|settling|fading}]`,
  `GET /v1/random-world/active` → `events[{template_i18n_key, district, severity_band ∈ faint|noticeable|heavy, phase_band ∈ onset|unfolding|receding|
      lingering|permanent, recency_band}]`, `GET /v1/random-world/known-couplings` → `couplings[]` ; `POST /v1/ambient/attend/:id` (y prêter attention) ;
  au catalogue : `journal.bloc.*` — dont les 5 PHASES (ça commence · ça se déploie · ça retombe · ça traîne · ça ne partira pas).
Familles neuves : `journal.fraicheur.*` (recency_band), `journal.gravite.*` (severity_band). Les titres d'événements et de brèves sont des
EXEMPLES (le texte vient des clés servies `random_world.template.*`, `ambient.micro_event.*`, `news_beat.*`) ; les identifiants bruts du témoin (145) aussi.
Sortie : `49-journal-mots-2026-09-23.tsv` (+ `somme-table.py`). Usage : python3 Tools/atelier-2026-09-22/generer-49-journal-mots.py"""
import collections, os, re, subprocess, sys, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__)); NB = ' '; NNB = ' '
def slug(s):
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')
S, A, P, N = 'servie', 'servie · D14', 'proposée', 'note'
def b(fr, en, note=''): return (P, 'journal.bloc.' + slug(fr), fr, en, note)
EX = 'titre d’EXEMPLE : le texte vient de la clé servie de l’événement (`random_world.template.*`, `ambient.micro_event.*`, `news_beat.*`) — pas un libellé'
BRUT = 'identifiant brut montré EXPRÈS (clé et quartier) — pas un libellé'
DA = 'explication de DA dans le téléphone — pas un libellé'
LOT = 'panneau des lots (130) — pas un libellé'
COUP = 'couplage d’EXEMPLE : le texte vient de `random_world.coupling.pair.*` (servi) — pas un libellé'
T = {
 'LE CLAIRON DE BRENNAR': (N, '', '', '', 'nom de journal d’EXEMPLE : les titres servis sont `press.outlet.*`'),
 'ce matin': (P, 'journal.fraicheur.fresh', 'ce matin', 'this morning', '`recency_band` = fresh (ratifié 125, 145) ; prose, pas la phase de la barre (D16 hors champ)'),
 'Un corps repêché sous le pont de Stack': (N, '', '', '', EX), 'news.beat.body_found · Dépôt-Est': (N, '', '', '', BRUT),
 'fait divers': (N, '', '', '', 'catégorie d’EXEMPLE d’une brève (le rubriquage servi est dans `news_beat.*`) — à vérifier'),
 'Une file devant la pharmacie de La Lisière': (N, '', '', '', EX), 'ambient.queue_pharmacy · La Lisière': (N, '', '', '', BRUT),
 'Deux camions la nuit derrière l’entrepôt': (N, '', '', '', EX), 'ambient.night_trucks · Les Entrepôts': (N, '', '', '', BRUT),
 'Le curé de Marne-Basse a fermé sa porte': (N, '', '', '', EX), 'ambient.church_closed · Marne-Basse': (N, '', '', '', BRUT),
 'hier': (P, 'journal.fraicheur.settling', 'hier', 'yesterday', '`recency_band` = settling (ratifié)'),
 'Y PRÊTER ATTENTION': b('Y prêter attention', 'Pay attention to it', 'geste À ROUTE (`POST /v1/ambient/attend/:id`)'),
 'on peut': b('on peut assister à ce qui se passe — c’est le seul geste que la rue accepte', 'you can witness what’s happening — it’s the only move the street accepts', 'une phrase en trois nœuds'),
 'assister': (P, 'journal.bloc.on_peut_assister_a_ce_qui_se_passe_c_est_le_seul_geste_que_la_rue_accepte', '', '', 'même phrase'),
 'à ce qui se passe — c’est le seul geste que la rue accepte': (P, 'journal.bloc.on_peut_assister_a_ce_qui_se_passe_c_est_le_seul_geste_que_la_rue_accepte', '', '', 'même phrase'),
 'ce qui arrive à la ville': b('ce qui arrive à la ville', 'what’s happening to the city', 'sous-titre (126) : `random-world/active`'),
 'définitif': (N, '', '', '', 'doublon de la phase servie `permanent` (« ÇA NE PARTIRA PAS », `journal.bloc.ca_ne_partira_pas`) : une bande = un mot (D8) — garder le servi'),
 'compris': b('compris', 'understood', 'la marque d’un événement dont le couplage est découvert (`known-couplings`)'),
 'Le port est bloqué': (N, '', '', '', EX), 'rw.template.port_strike · Les Bassins': (N, '', '', '', BRUT),
 'ça pèse': (P, 'journal.gravite.heavy', 'ça pèse', 'it weighs', '`severity_band` = heavy (ratifié)'),
 'La rivière a débordé': (N, '', '', '', EX), 'rw.template.flood · Orsel': (N, '', '', '', BRUT),
 'on en parle': (P, 'journal.gravite.noticeable', 'on en parle', 'people talk', '= noticeable (ratifié)'),
 'Un vieux s’est éteint': (N, '', '', '', EX), 'rw.template.hollow_death · La Lisière': (N, '', '', '', BRUT),
 'à peine': (P, 'journal.gravite.faint', 'à peine', 'barely', '= faint (ratifié)'),
 'les phases': (N, '', '', '', DA + ' (126)'), 'Quatre passent, une seule reste': (N, '', '', '', DA), 'un événement commence, se déploie, retombe, ou': (N, '', '', '', DA),
 'traîne': (N, '', '', '', DA), '. La cinquième phase ne dit pas « longtemps » : elle dit': (N, '', '', '', DA),
 'ce qui ne partira pas': b('ce qui ne partira pas', 'what won’t go away', 'sous-titre (127) ; même sens que la phase servie `permanent`'),
 'La rivière ne se retirera pas': (N, '', '', '', EX),
 'les autres événements ont une phase qui les emmène vers la sortie. Celui-ci n’en a pas.': (N, '', '', '', DA + ' (127)'),
 'Le quartier a changé': b('Le quartier a changé, et il faudra faire avec — ce n’est plus une nouvelle, c’est une donnée.',
   'The district has changed, and you’ll have to live with it — it isn’t news any more, it’s a given.', 'une phrase en deux nœuds (permanent)'),
 ', et il faudra faire avec — ce n’est plus une nouvelle, c’est une donnée.': (P, 'journal.bloc.le_quartier_a_change_et_il_faudra_faire_avec_ce_n_est_plus_une_nouvelle_c_est_une_donnee', '', '', 'même phrase'),
 'RIEN À FAIRE — C’EST ACQUIS': b('Rien à faire — c’est acquis', 'Nothing to do — it’s settled', 'le geste éteint d’un événement `permanent`'),
 'ce que vous avez compris': b('ce que vous avez compris', 'what you’ve understood', 'sous-titre (128) : `known-couplings`'),
 'couplages compris': b('couplages compris', 'links understood', 'le compte de `couplings[]`'),
 'le prix du pyralin': (N, '', '', '', COUP), 'le port bloqué': (N, '', '', '', COUP), 'les patrouilles de nuit': (N, '', '', '', COUP),
 'la marge des dealers': (N, '', '', '', COUP),
 'et tout ce que vous n’avez pas encore compris —': b('et tout ce que vous n’avez pas encore compris — la maison ne dit pas combien il en reste',
   'and everything you haven’t understood yet — the house doesn’t say how much is left', 'une phrase en deux nœuds'),
 'la maison ne dit pas combien il en reste': (P, 'journal.bloc.et_tout_ce_que_vous_n_avez_pas_encore_compris_la_maison_ne_dit_pas_combien_il_en_reste', '', '', 'même phrase'),
 'La ville a des causes, et vous les apprenez': b('La ville a des causes, et vous les apprenez', 'The city has causes, and you learn them', ''),
 'le serveur garde ce que vous avez': (N, '', '', '', DA + ' (« le serveur »)'), 'découvert': (N, '', '', '', DA),
 ': que telle chose en pousse une autre, et': (N, '', '', '', DA), 'dans quel sens': (N, '', '', '', DA), '. Ça se remplit en jouant, jamais en achetant.': (N, '', '', '', DA),
 'L1': (N, '', '', '', LOT), 'Écrire les titres et les brèves': (N, '', '', '', LOT),
 'tout est en clés : titre, journal, angle, descripteur, gabarit — cinquième écran à buter dessus': (N, '', '', '', LOT),
 'L2': (N, '', '', '', LOT), 'Les titres sont des gabarits à trous': (N, '', '', '', LOT),
 '`headline_params` est un objet libre ; sans le texte on ignore même combien de trous': (N, '', '', '', LOT),
 'L3': (N, '', '', '', LOT), 'Aller à un enterrement': (N, '', '', '', LOT + ' (le geste existe : `…/attend-funeral`, cf. 46)'),
 'la route existe et c’est le seul geste non économique du domaine ; rien ne le relie à un événement affiché': (N, '', '', '', LOT),
 'L4': (N, '', '', '', LOT), 'Le détail d’un article': (N, '', '', '', LOT), 'une route rend le détail d’une brève de presse ; aucun écran ne l’ouvre': (N, '', '', '', LOT),
 'les onze crans, tous': (N, '', '', '', 'sous-titre du cadre TÉMOIN (145)'), 'groupes': (N, '', '', '', 'compteur du témoin'), 'crans': (N, '', '', '', 'compteur du témoin'),
 'moyennés': (N, '', '', '', 'compteur du témoin'),
 'la fraîcheur': b('la fraîcheur', 'freshness', 'la ligne de `recency_band`'), 'fresh': (N, '', '', '', BRUT), 'settling': (N, '', '', '', BRUT), 'fading': (N, '', '', '', BRUT),
 'la semaine passée': (P, 'journal.fraicheur.fading', 'la semaine passée', 'last week', '`recency_band` = fading (ratifié)'),
 'la gravité': b('la gravité', 'weight', 'la ligne de `severity_band`'), 'faint': (N, '', '', '', BRUT), 'noticeable': (N, '', '', '', BRUT), 'heavy': (N, '', '', '', BRUT),
 'la phase': b('la phase', 'phase', 'la ligne de `phase_band`'), 'onset': (N, '', '', '', BRUT), 'unfolding': (N, '', '', '', BRUT), 'receding': (N, '', '', '', BRUT),
 'lingering': (N, '', '', '', BRUT), 'permanent': (N, '', '', '', BRUT),
 'pourquoi tous les crans': (N, '', '', '', DA), 'Un témoin qui suit l’état du monde n’est pas un témoin': (N, '', '', '', DA),
 'ces cadres montrent des états ; celui-ci montre l’': (N, '', '', '', DA), 'énumération': (N, '', '', '', DA),
 '. Le monde changera de valeur et ce dessin restera vrai — c’est ce qui évite au client d’inventer une forme pour une valeur jamais dessinée.': (N, '', '', '', DA),
}
COMPLEMENTS = []

def main():
    tsv = open(os.path.join(ICI, '34-balayage-mots-serie6-2026-09-23.tsv'), encoding='utf-8').read().split('\n')[1:]
    mots = collections.OrderedDict()
    for l in tsv:
        c = l.split('\t')
        if len(c) > 4 and c[2] == '㊳' and c[4] == 'sans source': mots.setdefault(c[3], []).append(c[1])
    st = subprocess.run(['git', '-C', os.path.expanduser('~/project/mafia-back-suite'), 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'],
                        capture_output=True, text=True).stdout
    d0 = st.index('export const FR_MESSAGES')
    FRV = {m.group(1): m.group(2).replace("\\'", "'") for m in re.finditer(r"^\s*'([^'\s]+)':\s*\n?\s*'((?:[^'\\]|\\.)*)'", st[d0:st.index('\n};', d0)], re.M)}
    d, out, comptes = [], ['\t'.join(['mot', 'cadres', 'classe', 'clé', 'fr', 'en', 'note'])], collections.Counter()
    if set(mots) != set(T): d.append(f'non couverts : {sorted(set(mots) - set(T))} · en trop : {sorted(set(T) - set(mots))}')
    for m, cadres in mots.items():
        cl, cle, fr, en, note = T[m]; comptes[cl] += 1
        if cl in (S, A) and cle not in FRV: d.append(f'{m} : {cle} annoncée servie, absente')
        if cl == P and fr and cle in FRV and FRV[cle] != fr: d.append(f'{m} : {cle} servie avec d’autres mots')
        if "'" in fr + en: d.append(f'{m} : apostrophe droite')
        if re.search(r' [:;!?»]|« ', fr): d.append(f'{m} : D17')
        out.append('\t'.join([m, ','.join(sorted(set(cadres), key=int)), cl, cle, fr, en, note]))
    open(os.path.join(ICI, '49-journal-mots-2026-09-23.tsv'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print(f'{len(mots)} mots de ㊳ · ' + ' · '.join(f'{c} {comptes[c]}' for c in (S, A, P, N)))
    [print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)

if __name__ == '__main__':
    main()
