#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""40 v3.1 — addendum : les valeurs SERVIES des domaines de ㉙ (`conflit.*`) balayées pour la classe de D13 (commande f2 du 23/09, relevé de
CLIENT-1 : le sous-titre servi `conflit.sous_titre.ce_que_vos_hommes_rapportent_…` dit « vos hommes »). La 40 ne listait que le NON-servi.
㉙ n'est pas ratifiée (décision f2) : D13 s'applique à tout son texte ; une clé servie garde son slug (contrat additif), seule la VALEUR change.
Méthode : TOUTES les valeurs `conflit.*` de FR_MESSAGES (lues par leur nom au back HEAD) passent par un motif de DÉTECTION large (hommes, il/ils,
eux, lui, participes accordables, noms de personnes au masculin générique). Chaque valeur détectée DOIT avoir une décision écrite ici
(`DECISIONS`), sinon exit 1 — une valeur servie plus tard sera donc attrapée. Classes de décision :
  - `net`     : une forme accordée à une personne → forme ÉPICÈNE proposée (ligne « proposée ») ;
  - `limite`  : un cas que D13 ne tranche pas nettement (un groupe, pas une personne) → proposition EN NOTE, à trancher par f2 ;
  - `non`     : le mot détecté ne renvoie pas à une personne (l'ordre, « ce », un pronom sans accord visible) → note de preuve.
Sortie : `40-addendum-v3-1-servies-2026-09-23.tsv` (format des tables de mots). Contrôles : D17, D10, paramètres fr = en, somme-table code 0.
Usage : python3 Tools/atelier-2026-09-22/generer-40-addendum-v3-1-servies.py"""
import os, re, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__))
BACK = os.path.expanduser('~/project/mafia-back-suite')
NB = ' '
DETECTE = re.compile(r"\b(hommes?|il|ils|eux|lui|partie?s?|rentrée?s?|allée?s?|croisée?s?|envoyée?s?|ferrailleurs|un autre)\b", re.I)
# tournures détectées mais ÉPICÈNES, acceptées dans une forme proposée (chacune justifiée) — le contrôle les retire avant de re-détecter
ACCEPTES = [(r'\bIl vous en manque\b', '« il » impersonnel'), (r'\blui dire\b', '« lui » datif : même forme au féminin')]
# clé → (classe, fr proposé, en proposé, note)
DECISIONS = {
 'conflit.sous_titre.ce_que_vos_hommes_rapportent_des_familles_rivales_et_qui_vous_reste_pour_y_retourner':
   ('net', 'Ce que vos envois rapportent des familles rivales, et qui vous reste pour y retourner.',
    'What your runs bring back from the rival families, and who you have left to go back.',
    '« vos hommes » présume le genre (D13) → « vos envois », le mot de la 40 v3 ; l’en « your men » suit ; clé SERVIE gardée (relevé de CLIENT-1)'),
 'conflit.bloc.les_ferrailleurs_de_spine':
   ('limite', 'la ferraille, à Spine', 'scrap, in Spine',
    'LIMITE : un nom de personnes au masculin générique (« les ferrailleurs »), mais il désigne une FAMILLE rivale, pas une personne — '
    'proposition : le métier plutôt que ceux qui le font ; les 3 autres familles sont déjà dites par un lieu (« le port… », « les docks… », « la ligne de sel… »)'),
 'conflit.bloc.la_derniere_fois_chez_eux':
   ('limite', f'La dernière fois là-bas{NB}:', 'Last time at theirs:',
    'LIMITE : « eux » est le pronom masculin d’un GROUPE (la famille visée), pas d’une personne — proposition : « là-bas » ; l’en « theirs » est neutre'),
 'conflit.bloc.derniere_fois_chez_eux':
   ('limite', f'La dernière fois là-bas{NB}: {{issue}}, et la ville a chauffé {{chaleur}}.', 'Last time at their place: {issue}, and the city heated up {chaleur}.',
    'LIMITE : même cas (addendum 40) — proposition « là-bas » ; l’en est neutre'),
 'conflit.bloc.c_est_lui_qui_part_la_nuit_il_vous_en_manque_un_ce_n_est_pas_casse_vous_n_en_avez_tout_simplement_pas_encore':
   ('net', 'C’est le gros bras qui part la nuit. Il vous en manque un — ce n’est pas cassé, vous n’en avez tout simplement pas encore.',
    'That’s the muscle who goes out at night. You’re missing one — nothing is broken, you simply don’t have one yet.',
    'servie depuis la 40 v3 (état vide : aucun gros bras) — « C’est lui » reprend une personne (D13) → le NOM du rôle, « le gros bras » (servi : `famille.archetype.gros_bras`) ; '
    '« Il vous en manque un » : « il » impersonnel, « un » s’accorde avec « gros bras » (nom), gardés ; D10 : apostrophes droites du servi → ’ ; clé SERVIE gardée'),
 'conflit.bloc.vous_avez_l_homme_personne_pour_lui_dire_ou_frapper_on_ne_sait_pas_encore_ou_ils_sont':
   ('net', 'Le gros bras est là. Personne pour lui dire où frapper — on ne sait pas encore où les trouver.',
    'Your muscle is here. No one to tell them where to strike — we don’t know where to find them yet.',
    'servie depuis la 40 v3 (état : un gros bras, aucune famille connue) — « l’homme » présume le genre (D13) ; « ils » (les familles, cas LIMITE) évité par « où les trouver » ; '
    '« lui » (datif) est épicène ; l’en « the man / him » suit (« them ») ; D10 : apostrophes droites du servi → ’ ; clé SERVIE gardée'),
 'conflit.bloc.nom_tient_les_comptes_il_ne_cogne_pas_et_famille_on_ne_l_a_jamais_croisee_je_ne_saurais_pas_ou_frapper':
   ('non', '', '', 'valeur déjà épicène (40 v3) ; « croisée » s’accorde avec la FAMILLE (un nom), pas une personne ; « il » n’est plus que dans le slug'),
 'conflit.bloc.on_ne_les_a_pas_croises': ('non', '', '', 'valeur déjà épicène (40 v3) : « on n’a jamais croisé leur route » — avoir + COD après : aucun accord'),
 'conflit.bloc.ce_qui_est_rentre': ('non', '', '', '« rentré » s’accorde avec « ce » (neutre), pas avec une personne'),
 'conflit.bloc.les_hommes_qu_on_a_envoyes_et_qui_ne_sont_pas_encore_rentres': ('non', '', '', 'valeur déjà épicène (40 v3) : « Ce qu’on a envoyé… rentré » s’accorde avec « ce » ; « hommes » n’est que dans le slug (clé gardée, contrat additif)'),
 'conflit.refus.l_ordre_n_est_pas_parti_il_etait_mal_forme_reessayez': ('non', '', '', '« parti », « il » : l’ORDRE, une chose'),
 'conflit.refus.la_ligne_a_coupe_on_ne_sait_pas_si_l_ordre_est_parti_reessayez_il_ne_partira_pas_deux_fois': ('non', '', '', '« parti », « il » : l’ORDRE, une chose'),
 'conflit.bloc.on_ne_les_rappelle_pas_on_saura_demain_matin': ('non', '', '', 'détecté par erreur si « les » était lu ; « les » n’a aucun accord visible — épicène à l’écrit'),
}

def main():
    st = subprocess.run(['git', '-C', BACK, 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'], capture_output=True, text=True, check=True).stdout
    sha = subprocess.run(['git', '-C', BACK, 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
    def registre(nom):
        d = st.index(f'export const {nom}'); t = st[d:st.index('\n};', d)]
        return {m.group(1): m.group(3).replace("\\'", "'") for m in re.finditer(r"^\s*'([^'\s]+)':\s*\n?\s*(['\"])((?:[^'\"\\]|\\.)*)\2", t, re.M)}
    FR, EN = registre('FR_MESSAGES'), registre('EN_MESSAGES')
    conflit = {k: v for k, v in FR.items() if k.startswith('conflit.')}
    detectes = {k: v for k, v in conflit.items() if DETECTE.search(v)}
    d = []
    sans = sorted(set(detectes) - set(DECISIONS))
    if sans: d.append(f'valeurs détectées SANS décision : {sans}')
    perdues = sorted(k for k in DECISIONS if k not in conflit)
    if perdues: d.append(f'décisions sur des clés non servies : {perdues}')
    lignes, par = [], {}
    for k in sorted(DECISIONS, key=lambda k: ('net', 'limite', 'non').index(DECISIONS[k][0])):
        cl, fr, en, note = DECISIONS[k]; par[cl] = par.get(cl, 0) + 1
        v = conflit.get(k, '?')
        if cl == 'net':
            if re.search(r'[^ ]:|[^ ][;!?]', fr) or "'" in fr + en: d.append(f'{k} : D17 / D10')
            if sorted(re.findall(r'\{\w+\}', fr)) != sorted(re.findall(r'\{\w+\}', en)): d.append(f'{k} : paramètres')
            reste = fr
            for motif, _ in ACCEPTES: reste = re.sub(motif, '', reste)
            if DETECTE.search(reste): d.append(f'{k} : la forme proposée est encore détectée ({DETECTE.search(reste).group(0)})')
            lignes.append([v, '㉙', 'proposée', k, fr, en, note + f' ; servi en « {EN.get(k, "?")} »'])
        elif cl == 'limite':
            lignes.append([v, '㉙', 'note', '', '', '', f'`{k}` — {note} ; PROPOSÉ : « {fr} » / « {en} » — À TRANCHER PAR f2'])
        else:
            lignes.append([v, '㉙', 'note', '', '', '', f'`{k}` — non : {note}'])
    out = os.path.join(ICI, '40-addendum-v3-1-servies-2026-09-23.tsv')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('\t'.join(['mot', 'cadres', 'classe', 'clé', 'fr', 'en', 'note']) + '\n')
        for l in lignes: f.write('\t'.join(l) + '\n')
    print(f'40 v3.1 : back {sha} · valeurs servies conflit.* : {len(conflit)} · détectées : {len(detectes)} · décisions : net {par.get("net", 0)}, '
          f'limite {par.get("limite", 0)}, non {par.get("non", 0)} · somme = {len(lignes)} lignes = {len(lignes)} mots + 0 compléments')
    rc = subprocess.run([sys.executable, os.path.join(ICI, 'somme-table.py'), out]).returncode
    if rc: d.append(f'somme-table code {rc}')
    for x in d: print('⛔', x)
    return 1 if d else 0

if __name__ == '__main__':
    sys.exit(main())
