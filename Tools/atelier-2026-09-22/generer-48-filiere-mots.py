#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""48 — ㊵ la filière : les mots sans clé servie de ses cadres série 6 (137-142 ; balayage `34-…`), même format que 37/40/43/44/46/47
(commande f2 du 23/09). Classes : servie · servie · D14 · proposée · note. D12-D18 ; gestes avec ou sans route. ㊵ ratifié (et porte la filière, D6).
Données servies (back `f90cb2c0`, lu ; corps réels `screen_c2`) :
  `GET /v1/operational/laundering` → `nodes[{node, stage_index, cleanliness_band ∈ DIRTY|PARTIAL|MOSTLY_CLEAN|CLEAN, terminal, has_cash}]` ;
  `GET …/laundering/:nodeId` → `{node, cleanliness_band, deviation_active}` (la tête seule : 32, CLIENT-1) ; `GET …/:nodeId/pipeline` → `stages[]` ;
  `POST …/laundering/inject` (injecter), `POST …/laundering/stage` (accrocher une étape) (`laundering.controller.ts:79-203`).
  ⚠️ PASSÉ À CÔTÉ (client) : `cleanliness_band` est servi par étape et le client ne le lit pas (il ne montre que `has_cash`) — la maquette
     ratifiée le dessine (sale · à moitié · presque propre · propre) : famille neuve `filiere.proprete.*`.
  Les nœuds n'ont AUCUN nom servi (des références nues, 142) : « La blanchisserie », « Le garage », « Le notaire » sont des EXEMPLES.
Clés : `filiere.<rôle>.<slug>` (le client : `Libelle.De("filiere", "bloc"|"sous_titre", …)`).
Sortie : `48-filiere-mots-2026-09-23.tsv` (+ `somme-table.py`). Usage : python3 Tools/atelier-2026-09-22/generer-48-filiere-mots.py"""
import collections, os, re, subprocess, sys, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__)); NB = ' '
def slug(s):
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')
S, A, P, N = 'servie', 'servie · D14', 'proposée', 'note'
def b(fr, en, note='', role='bloc'): return (P, f'filiere.{role}.' + slug(fr), fr, en, note)
NOEUD = 'nom de nœud d’EXEMPLE : aucun nom servi (références nues, 142) — dette « nommer les nœuds »'
BRUT = 'identifiant brut montré EXPRÈS (le nœud et sa bande) — pas un libellé'
DA = 'note de DA dans le téléphone — le servi le dit déjà à la voix du joueur (`filiere.bloc.on_ne_vous_dira_que_si_c_est_propre_…`, 32 4b)'
LOT = 'panneau des maillons / lots (139, 142) — pas un libellé'
T = {
 'où en est chaque étape': b('où en est chaque étape', 'where each stage stands', 'sous-titre (137)', 'sous_titre'),
 'propres': b('propres', 'clean', 'le compte des étapes `CLEAN` (le servi voisin : « PROPRE AU BOUT »)'),
 'node · dirty': (N, '', '', '', BRUT), 'node · partial': (N, '', '', '', BRUT), 'node · mostly_clean': (N, '', '', '', BRUT), 'node · clean': (N, '', '', '', BRUT),
 'La blanchisserie': (N, '', '', '', NOEUD), 'Le garage': (N, '', '', '', NOEUD), 'Le notaire': (N, '', '', '', NOEUD),
 'à moitié': (P, 'filiere.proprete.partial', 'à moitié', 'half', '`cleanliness_band` = PARTIAL (ratifié) ; §compléments'),
 'et c’est voulu': (N, '', '', '', DA), 'La propreté, jamais le montant': (N, '', '', '', DA), 'le serveur ne rend': (N, '', '', '', DA),
 'aucun scalaire brut': (N, '', '', '', DA), ': ni montant, ni durée, ni frais — il dit seulement si de l’argent est là. C’est la règle R2.2 du canon, pas un manque à combler.': (N, '', '', '', DA),
 'INJECTER': b('Injecter', 'Inject', 'geste À ROUTE (`POST /v1/operational/laundering/inject`)'),
 'depuis votre comptoir, vers une planque à vous': b('depuis votre comptoir, vers une planque à vous', 'from your counter, to a safehouse of yours', ''),
 'le serveur dit': (N, '', '', '', DA + ' — 138 : servi en 4b (32)'), 'oui ou non': (N, '', '', '', DA + ' (138)'),
 ', jamais de combien ni pourquoi. C’est le seul signal d’alerte du domaine — et il ne se mesure pas.': (N, '', '', '', DA + ' (138)'),
 'ce qui est tenu, ce qui reste flou': (N, '', '', '', LOT), 'maillons': (N, '', '', '', LOT), 'tenus': (N, '', '', '', LOT), 'non re-mesurés': (N, '', '', '', LOT),
 'Une planque à vous': (N, '', '', '', LOT), 'le welcome grant en pose une — écrivain de production compté': (N, '', '', '', LOT), 'safehouses': (N, '', '', '', LOT),
 'Injecter l’argent': (N, '', '', '', LOT), 'la porte qui la bloquait est levée ; l’aboutissement n’est pas re-mesuré': (N, '', '', '', LOT),
 'laundering/inject': (N, '', '', '', LOT), 'Le profil de la filière': (N, '', '', '', LOT), 'écrit par l’injection — non re-mesuré depuis': (N, '', '', '', LOT),
 'L’épingle de contrôle': (N, '', '', '', LOT), 'posée sur un bâtiment promu — non re-mesuré depuis': (N, '', '', '', LOT), 'la chaîne': (N, '', '', '', LOT),
 'Le premier maillon tient depuis le 31 août': (N, '', '', '', LOT),
 'il n’avait pas d’écrivain, il en a un — et l’écran le disait encore après. Les trois suivants ne sont': (N, '', '', '', LOT),
 'pas re-mesurés': (N, '', '', '', LOT), ': ni tenus, ni cassés. On dit ce qu’on sait.': (N, '', '', '', LOT),
 'vous n’en avez pas encore': b('vous n’en avez pas encore', 'you don’t have one yet', 'sous-titre de l’état « aucune filière, une planque » (140)', 'sous_titre'),
 'Votre planque est prête.': b('Votre planque est prête.', 'Your safehouse is ready.', '« prête » s’accorde à la planque'),
 'La filière, elle, reste à monter.': b('La filière, elle, reste à monter.', 'The pipeline still has to be built.', ''),
 'par où ça commence': b('par où ça commence', 'where it starts', ''),
 'Injecter, puis accrocher une étape': b('Injecter, puis accrocher une étape', 'Inject, then hook on a stage', 'les deux gestes À ROUTE (`inject`, `stage`)'),
 'la planque vous est donnée': b('la planque vous est donnée\u202f; le reste se construit. Une première injection ouvre la filière, chaque étape suivante s’accroche à la précédente.',
   'the safehouse is given to you; the rest gets built. A first injection opens the pipeline, each next stage hooks onto the one before.', 'une phrase en deux nœuds'),
 '; le reste se construit. Une première injection ouvre la filière, chaque étape suivante s’accroche à la précédente.':
   (P, 'filiere.bloc.la_planque_vous_est_donnee_le_reste_se_construit_une_premiere_injection_ouvre_la_filiere_chaque_etape_suivante_s_accroche_a_la_precedente', '', '', 'même phrase'),
 'aucune filière': b('aucune filière', 'no pipeline', 'sous-titre (141)', 'sous_titre'),
 'Aucune filière montée.': b('Aucune filière montée.', 'No pipeline built.', 'titre (141)'),
 'Une filière se construit étape par étape.': b('Une filière se construit étape par étape.', 'A pipeline is built stage by stage.', ''),
 'comment ça se monte': b('comment ça se monte', 'how it’s built', ''),
 'Une étape s’accroche à la précédente': b('Une étape s’accroche à la précédente', 'A stage hooks onto the one before', ''),
 'chaque étape se pose': b('chaque étape se pose à partir d’un nœud existant et d’un bâtiment à vous. La première a besoin d’une injection — donc d’une planque.',
   'each stage is set from an existing node and a building of yours. The first one needs an injection — so a safehouse.', 'une phrase en trois nœuds ; `POST …/laundering/stage`'),
 'à partir d’un nœud existant': (P, 'filiere.bloc.' + slug('chaque étape se pose à partir d’un nœud existant et d’un bâtiment à vous. La première a besoin d’une injection — donc d’une planque.'), '', '', 'même phrase'),
 'et d’un bâtiment à vous. La première a besoin d’une injection — donc d’une planque.': (P, 'filiere.bloc.' + slug('chaque étape se pose à partir d’un nœud existant et d’un bâtiment à vous. La première a besoin d’une injection — donc d’une planque.'), '', '', 'même phrase'),
 'manque': (N, '', '', '', LOT), 'livré': (N, '', '', '', LOT), 'au canon': (N, '', '', '', LOT), 'LIVRÉ': (N, '', '', '', LOT),
 'La planque est donnée à l’arrivée': (N, '', '', '', LOT),
 'le premier maillon avait zéro écrivain ; le welcome grant en pose une depuis le 31 août — c’est ce qui a rendu cette planche fausse': (N, '', '', '', LOT),
 'MANQUE': (N, '', '', '', LOT), 'Nommer les nœuds et les bâtiments': (N, '', '', '', LOT),
 'ce sont des références nues : zéro libellé servi, mesuré — septième écran à buter sur les noms': (N, '', '', '', LOT),
 'CANON': (N, '', '', '', LOT), 'Le montant n’a pas à ressortir': (N, '', '', '', LOT),
 'aucun scalaire brut ne traverse la projection — R2.2. Le réclamer serait un lot contre la règle, pas un lot manquant': (N, '', '', '', LOT),
 'L’écart est un voyant, pas une mesure': (N, '', '', '', LOT),
 'le serveur dit qu’il y a écart, jamais de combien ni pourquoi — même règle, et l’écran le pose comme un voyant': (N, '', '', '', LOT),
}
COMPLEMENTS = [
 ('filiere.proprete.dirty', 'sale', 'dirty', 'ratifié (137) ; le mot est servi ailleurs'),
 ('filiere.proprete.mostly_clean', 'presque propre', 'nearly clean', 'ratifié (137)'),
 ('filiere.proprete.clean', 'propre', 'clean', 'ratifié (137)'),
]

def main():
    tsv = open(os.path.join(ICI, '34-balayage-mots-serie6-2026-09-23.tsv'), encoding='utf-8').read().split('\n')[1:]
    mots = collections.OrderedDict()
    for l in tsv:
        c = l.split('\t')
        if len(c) > 4 and c[2] == '㊵' and c[4] == 'sans source': mots.setdefault(c[3], []).append(c[1])
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
    for cle, fr, en, note in COMPLEMENTS:
        if cle in FRV and FRV[cle] != fr: d.append(f'{cle} : complément servi avec d’autres mots')
        out.append('\t'.join(['(complément de famille)', '', P, cle, fr, en, note]))
    open(os.path.join(ICI, '48-filiere-mots-2026-09-23.tsv'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print(f'{len(mots)} mots de ㊵ · ' + ' · '.join(f'{c} {comptes[c]}' for c in (S, A, P, N)) + f' · + {len(COMPLEMENTS)} compléments')
    [print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)

if __name__ == '__main__':
    main()
