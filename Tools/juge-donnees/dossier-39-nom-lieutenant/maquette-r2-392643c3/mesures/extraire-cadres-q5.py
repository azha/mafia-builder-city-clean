#!/usr/bin/env python3
"""Inventaire M — extrait les deux cadres ㊴ Q5 d'une version EPINGLEE de ecrans-brennar-6.html.

Usage : python3 -I extraire-cadres-q5.py <fichier.html> <etiquette-de-sortie>

Sort, pour chaque cadre (index 0-based du litteral exact `<div class="cadre">`, convention de
Tools/juge-visuel/verifier-indices-cadres.py) : l'etiquette, puis chaque element PORTEUR
D'INFORMATION de l'ecran (texte feuille, classe, style inline), dans l'ordre du DOM.

Piege traite (lecon 08/10) : les balises vides (<br>, <u/> des crans) ne doivent pas faire
disparaitre un enfant direct -> on ne referme pas sur une balise vide connue.
"""
import html as _html
import re
import sys
from html.parser import HTMLParser

VIDES = {'br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'path', 'circle', 'line', 'rect'}


class Cadres(HTMLParser):
    """Decoupe la page en cadres et, dans chaque cadre, enregistre les elements avec du texte."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.pile = []          # [(tag, attrs_dict, profondeur)]
        self.cadres = []        # [{'etiquette':…, 'elements':[…]}]
        self.courant = None
        self.prof_cadre = None
        self.buf = []

    def _classe(self, attrs):
        d = dict(attrs)
        return d.get('class', ''), d.get('style', '')

    def handle_starttag(self, tag, attrs):
        cls, style = self._classe(attrs)
        if tag == 'div' and cls == 'cadre':
            self.courant = {'etiquette': None, 'elements': []}
            self.cadres.append(self.courant)
            self.prof_cadre = len(self.pile)
        self._vider_texte()
        if tag not in VIDES:
            self.pile.append((tag, cls, style))
        elif self.courant is not None and tag in ('u', 'i', 'b'):
            self.pile.append((tag, cls, style))

    def handle_endtag(self, tag):
        self._vider_texte()
        for k in range(len(self.pile) - 1, -1, -1):
            if self.pile[k][0] == tag:
                del self.pile[k:]
                break
        if self.courant is not None and self.prof_cadre is not None and len(self.pile) <= self.prof_cadre:
            self.courant = None
            self.prof_cadre = None

    def handle_data(self, data):
        self.buf.append(data)

    def _vider_texte(self):
        txt = ''.join(self.buf).strip()
        self.buf = []
        if not txt or self.courant is None or not self.pile:
            return
        tag, cls, style = self.pile[-1]
        chemin = '>'.join(c or t for t, c, s in self.pile[-4:])
        if cls == 'etiquette' or (len(self.pile) >= 1 and self.pile[-1][1] == 'etiquette'):
            self.courant['etiquette'] = (self.courant['etiquette'] or '') + txt
            return
        self.courant['elements'].append({'tag': tag, 'classe': cls, 'style': style,
                                         'chemin': chemin, 'texte': txt})


def crans(fragment):
    """Les <u> des .crans portent une COULEUR et pas de texte : on les compte a part."""
    out = []
    for bloc in re.finditer(r'<div class="crans">(.*?)</div>', fragment, re.S):
        couleurs = re.findall(r'<u style="background:(#[0-9a-fA-F]{3,8})"></u>', bloc.group(1))
        out.append(couleurs)
    return out


def main():
    chemin, etiq = sys.argv[1], sys.argv[2]
    src = open(chemin, encoding='utf-8').read()
    p = Cadres()
    p.feed(src)
    # Les deux cadres Q5 = ceux dont l'etiquette commence par le marqueur ㊴
    cibles = [(i, c) for i, c in enumerate(p.cadres)
              if c['etiquette'] and c['etiquette'].lstrip().startswith('㊴')]
    # fragments bruts pour les crans
    frags = re.split(r'(?=<div class="cadre">)', src)
    frags = [f for f in frags if f.startswith('<div class="cadre">')]

    print('# Inventaire M — %s' % etiq)
    print('# fichier : %s' % chemin)
    print('# cadres totaux (litteral <div class="cadre">) : %d' % len(p.cadres))
    print('# cadres ㊴ Q5 trouves : %d -> index 0-based %s'
          % (len(cibles), [i for i, _ in cibles]))
    for idx, c in cibles:
        print('\n' + '=' * 100)
        print('CADRE %d (index 0-based)' % idx)
        print('ETIQUETTE : %s' % c['etiquette'])
        print('-' * 100)
        cs = crans(frags[idx]) if idx < len(frags) else []
        print('CRANS (couleurs, dans l\'ordre des pistes) :')
        for j, couleurs in enumerate(cs):
            allumes = [x for x in couleurs if x.lower() != '#2a3648']
            print('   piste %d : %d crans, %d allume(s) -> %s' % (j, len(couleurs), len(allumes), couleurs))
        print('ELEMENTS PORTEURS DE TEXTE (%d) :' % len(c['elements']))
        for e in c['elements']:
            print('   [%-9s] %-26s | %s' % (e['tag'], e['classe'] or e['chemin'], e['texte']))


if __name__ == '__main__':
    main()
