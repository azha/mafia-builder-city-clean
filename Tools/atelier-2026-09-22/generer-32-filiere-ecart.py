#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""32 — les 5 clés neuves de ㊵ (cadre 138 « La filière s’écarte de son profil »), client cumul `a7b6b920` : l'EN de l'atelier, et un signal.
Le FR est celui du client (mot pour mot de la série 6, atelier `f67ca63`, l.6342/6344), vérifié ici contre la page. La clé = `domaine.rôle.` + slug(fr)
(`Libelle.Slug` recopié). Vocabulaire EN : celui déjà servi pour ㊵ (`filiere.bloc.la_filiere` « The pipeline », `filiere.bloc.ecarts`
« DEVIATIONS », `filiere.bloc.etape` « STAGE »).
⚠️ La clé 4 recopie une NOTE de la maquette (« le serveur », « du domaine ») : le panneau du cadre 137 était une note du même genre
(« le serveur ne rend aucun scalaire brut… la règle R2.2 du canon »), et le back l'a servie À LA VOIX DU JOUEUR
(`filiere.bloc.on_ne_vous_dira_que_si_c_est_propre_…` « on ne vous dira que si c’est propre… »). Ligne 4b = la même phrase à la voix du joueur, RECOMMANDÉE.
Sortie : `32-filiere-ecart-2026-09-23.tsv` (clé · fr · en · source · état). Usage : python3 Tools/atelier-2026-09-22/generer-32-filiere-ecart.py"""
import html, os, re, subprocess, sys, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__))
def slug(s):
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')
page = subprocess.run(['git', '-C', os.path.expanduser('~/project/atelier3d-mafia'), 'show', 'f67ca63:ecrans-brennar-6.html'],
                      capture_output=True, text=True).stdout.split('\n')
texte = lambda n: html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', page[n - 1])))
L = [  # (domaine.rôle, fr, en, ligne de la page, état)
 ('filiere.sous_titre', 'la filière s’écarte de son profil', 'the pipeline is drifting from its profile', 6344, 'client a7b6b920'),
 ('filiere.bloc', 'La filière s’écarte de son profil', 'The pipeline is drifting from its profile', 6344, 'client a7b6b920'),
 ('filiere.bloc', 'un seul voyant', 'a single warning light', 6344, 'client a7b6b920'),
 ('filiere.bloc', 'le serveur dit oui ou non, jamais de combien ni pourquoi. C’est le seul signal d’alerte du domaine — et il ne se mesure pas.',
  'the server says yes or no, never by how much or why. It’s the only warning signal in the domain — and it can’t be measured.', 6344,
  'client a7b6b920 — ⚠️ NOTE de maquette (« le serveur », « domaine ») : remplacer par 4b'),
 ('filiere.bloc', 'on vous dit oui ou non : jamais de combien, ni pourquoi. C’est le seul signal d’alerte de la filière — et il ne se mesure pas.',
  'you’re told yes or no: never by how much, or why. It’s the pipeline’s only warning signal — and it can’t be measured.', None,
  'PROPOSÉ (4b, recommandé) : la note de 138 à la voix du joueur, comme 137 l’a été'),
 ('filiere.bloc', 'écart', 'deviation', 6344, 'client a7b6b920'),
]
d, out = [], ['\t'.join(['clé', 'fr', 'en', 'source', 'état'])]
for dom, fr, en, n, etat in L:
    if n and fr.replace(' oui ou non,', ' oui ou non ,') not in texte(n) and fr not in texte(n):
        d.append(f'« {fr[:50]} » absent de la l.{n}')
    if "'" in fr or "'" in en: d.append(f'{fr[:30]} : apostrophe droite')
    out.append('\t'.join([f'{dom}.{slug(fr)}', fr, en, f'ecrans-brennar-6.html l.{n} (atelier f67ca63)' if n else '—', etat]))
open(os.path.join(ICI, '32-filiere-ecart-2026-09-23.tsv'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
cles = [l.split('\t')[0] for l in out[1:]]
if len(set(cles)) != len(cles): d.append('deux lignes, une clé')
print(f'{len(cles)} clés'); [print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)
