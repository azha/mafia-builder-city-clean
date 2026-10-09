#!/usr/bin/env python3
# Juge donnees r2 — D OU VIENT CHAQUE MOT que le front pose sur la carte de tete.
# Le front appelle Lib("carte", <litteral>) = Libelle.De("accueil","carte",<litteral>)
#   -> cle = "accueil.carte." + Slug(litteral)   (Libelle.cs:160-161)
# On reproduit le Slug, puis on cherche la cle dans le bundle fr MESURE.
# Une cle absente du bundle => le mot affiche est le LITTERAL C# (en dur dans le .cs), pas une valeur servie.
import json, re, unicodedata

BUNDLE = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/04-accueil/r2-2026-10-09/mesures/04-i18n-bundle-fr.json'
msg = json.load(open(BUNDLE, encoding='utf-8'))['payload']['data']['messages']


def slug(litteral):
    """Libelle.Slug : minuscules, accents plies, le reste en '_' (Libelle.cs:163+)."""
    s = unicodedata.normalize('NFD', litteral)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = s.lower()
    s = re.sub(r'[^a-z0-9]+', '_', s)
    return s.strip('_')


# Chaque litteral passe a Lib("carte", ...) dans HighestLeverageCardController.cs, avec sa ligne.
SITES = [
    ('Rien à signaler', 260, 'titre, etat NoCard'),
    ('Aucune décision en attente', 263, 'sous, etat NoCard'),
    ('Limite de structure atteinte', 271, 'sous, etat CapBlocked'),
    ('Lire maintenant', 283, 'geste, repli carte des rapports'),
    ('Ce qu’on peut faire', 328, 'surtitre .sur'),
    ('prendre acte n’agit pas à votre place', 331, 'note .csq4 sous le geste'),
    ('Prendre acte', 340, 'libelle du geste (RendreLesOptions)'),
    ('Prendre acte', 449, 'libelle du geste (BuildLayout)'),
    ('Portée', 432, 'libelle des niveaux'),
    ('Urgence', 432, 'libelle des niveaux'),
]

print('=== mots passes par Lib("carte", ...) : cle derivee -> servie ou NON ===')
servis, en_dur = [], []
for litteral, ligne, role in SITES:
    cle = 'accueil.carte.' + slug(litteral)
    v = msg.get(cle)
    if v is None:
        en_dur.append((litteral, ligne, cle))
        print(f'  [EN DUR ] HighestLeverageCardController.cs:{ligne}  {role}')
        print(f'            litteral  = {litteral!r}')
        print(f'            cle       = {cle}  -> ABSENTE du bundle fr')
    else:
        servis.append((litteral, ligne, cle, v))
        egal = v == litteral
        print(f'  [SERVIE ] HighestLeverageCardController.cs:{ligne}  {role}')
        print(f'            cle       = {cle}')
        print(f'            servi     = {v!r}   (identique au litteral: {egal})')

print()
print(f'|servies| = {len(servis)} ; |en dur (repli C#)| = {len(en_dur)} ; total sites = {len(SITES)}')

print()
print('=== autres cles citees par le front ===')
for cle in ['chrome.bandeau.rapport', 'accueil.carte.tapez_mot',
            'accueil.carte.la_decision_n_a_pas_ete_prise',
            'decision.portee.moderee', 'decision.urgence.faible']:
    print(f'  {cle:48} -> {msg.get(cle)!r}')

print()
print('=== CONTROLE POSITIF du Slug (une cle accueil.carte.* reellement servie) ===')
acc = sorted(k for k in msg if k.startswith('accueil.carte.'))
print(f'  |accueil.carte.*| servies = {len(acc)}')
for k in acc:
    print(f'    {k:56} = {msg[k]!r}')
