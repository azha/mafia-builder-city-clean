#!/usr/bin/env python3
# Juge donnees r2 — cadre 5 de la maquette vs bundle i18n SERVI (fr).
# Compte les elements porteurs du verre du cadre 5, puis compare chaque texte
# au bundle fr mesure (04-i18n-bundle-fr.json) : egalite BINAIRE, jamais "ressemble".
import json, re, sys
from html.parser import HTMLParser

MAQ = '/home/erutheone/project/atelier3d-mafia/ecrans-brennar-accueil.html'
BUNDLE = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/04-accueil/r2-2026-10-09/mesures/04-i18n-bundle-fr.json'

src = open(MAQ, encoding='utf-8').read()

# Le cadre 5 = le DERNIER <div class="cadre"> ; son etiquette le nomme.
cadres = [m.start() for m in re.finditer(r'<div class="cadre">', src)]
print(f'cadres trouves (0-based 0..{len(cadres)-1}) = {len(cadres)}')
deb = cadres[5]
bloc = src[deb:]
etq = re.search(r'<div class="etiquette">(.*?)</div>', bloc).group(1)
print(f'cadre 5 etiquette = {etq[:90]}')

verre = re.search(r'<div class="verre">(.*?)</div><div class="suivant">', bloc, re.S).group(1)

class Noeuds(HTMLParser):
    """Texte par element porteur. Les balises VIDES (<br>, <img>...) sont ignorees
    (lecon 08/10 : html.parser les laisse ouvertes et avale un enfant direct)."""
    VIDES = {'br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'path', 'use'}
    def __init__(self):
        super().__init__(); self.pile = []; self.out = []
    def handle_starttag(self, tag, attrs):
        if tag in self.VIDES: return
        self.pile.append([tag, dict(attrs).get('class', ''), []])
    def handle_endtag(self, tag):
        if tag in self.VIDES or not self.pile: return
        n = self.pile.pop()
        self.out.append((n[0], n[1], ''.join(n[2]).strip()))
        if self.pile: self.pile[-1][2].append(''.join(n[2]))
    def handle_data(self, d):
        if self.pile: self.pile[-1][2].append(d)

p = Noeuds(); p.feed(verre)
elems = [(t, c, x) for (t, c, x) in p.out if x]

csq = [x for (t, c, x) in elems if 'csq4' in c and c != 'csq4-rang']
gestes = [x for (t, c, x) in elems if re.fullmatch(r'g( or)?', c)]
titres = [x for (t, c, x) in elems if c == 'titre']
sur = [x for (t, c, x) in elems if c.startswith('sur')]
niveaux_b = re.findall(r'<b>(.*?)</b>', verre)
niveaux_span = re.findall(r'<span>([^<]*)<b>', verre)

print()
print(f'|.csq4| (lignes de consequence)  = {len(csq)}')
print(f'|.g / .g.or| (gestes)            = {len(gestes)}  -> {gestes}')
print(f'|.titre|                         = {len(titres)}  -> {titres}')
print(f'|.sur|                           = {len(sur)}  -> {sur}')
print(f'niveaux libelles                 = {niveaux_span}  valeurs = {niveaux_b}')

msg = json.load(open(BUNDLE, encoding='utf-8'))['payload']['data']['messages']

def norm(s):
    s = s.replace(' ', ' ').replace('’', "'").replace(' ', ' ')
    return re.sub(r'\s+', ' ', s).strip()

print()
print('=== EGALITE BINAIRE texte du cadre 5 <-> valeur SERVIE par le bundle fr ===')
paires = [
    ('geste 1 (.g.or)', gestes[0] if gestes else None, 'hl.option.damaged_building.repair_via_queue'),
    ('geste 2 (.g)',    gestes[1] if len(gestes) > 1 else None, 'hl.option.damaged_building.leave_damaged'),
    ('csq4 #1',         csq[0] if csq else None, 'hl.option.damaged_building.repair_via_queue.projected_consequence'),
    ('csq4 #2',         csq[1] if len(csq) > 1 else None, 'hl.option.damaged_building.leave_damaged.projected_consequence'),
    ('titre',           titres[0] if titres else None, 'decision.type.DAMAGED_BUILDING_REPAIR'),
]
ko = 0
for nom, texte, cle in paires:
    servi = msg.get(cle)
    egal = texte is not None and servi is not None and norm(texte) == norm(servi)
    if not egal: ko += 1
    print(f'  [{"OK " if egal else "KO "}] {nom}')
    print(f'        maquette = {texte!r}')
    print(f'        servi    = {servi!r}   (cle {cle})')

print()
print(f'paires egales = {len(paires)-ko}/{len(paires)}')

# Les mots du FRONT absents de la maquette (cadre 5)
print()
print('=== mots du FRONT cherches dans TOUT le fichier de maquette ===')
for mot in ['Prendre acte', "n’agit pas à votre place", "n'agit pas à votre place",
            'Rien à signaler', 'Lire maintenant', 'Laisser en attente',
            'Ce qu’on peut faire', 'Limite de structure']:
    print(f'  {mot!r:42} present = {mot in src}')
