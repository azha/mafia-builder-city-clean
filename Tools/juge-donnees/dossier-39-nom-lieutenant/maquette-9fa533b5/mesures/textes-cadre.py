#!/usr/bin/env python3
"""Inventaire des TEXTES d'un cadre + confrontation à la table i18n FR du back.

Sortie : un texte par ligne, avec SERVI (clé trouvée, valeur FR identique au placeholder près) ou ABSENT.
Les balises vides (<br>, <u> inline…) sont traitées : on prend les nœuds de texte et on recolle les
enfants inline d'un même parent (piège mesuré : html.parser perd un enfant direct sinon)."""
import re, sys, pathlib, unicodedata
from html.parser import HTMLParser

cadre = pathlib.Path(sys.argv[1])
table = pathlib.Path(sys.argv[2])


class Textes(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        self.pile = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        self.pile.append((tag, d.get('class', '')))

    def handle_endtag(self, tag):
        if self.pile:
            self.pile.pop()

    def handle_data(self, data):
        t = re.sub(r'\s+', ' ', data).strip()
        if t:
            chemin = '/'.join('%s.%s' % (a, b) if b else a for a, b in self.pile[-3:])
            self.out.append((chemin, t))


p = Textes()
p.feed(cadre.read_text(encoding='utf-8'))

# table FR : du marqueur de locale 'fr' jusqu'à la fin — on prend TOUTES les valeurs du fichier et on
# compare par valeur (une valeur peut exister en fr et en en ; on cherche l'existence d'une clé).
src = table.read_text(encoding='utf-8')
paires = re.findall(r"^\s*'([a-z0-9_.]+)':\s*(?:\n\s*)?'((?:[^'\\]|\\.)*)'", src, re.M)


def plie(s):
    s = unicodedata.normalize('NFC', s)
    s = s.replace('’', "'").replace('{', '').replace('}', '')
    s = re.sub(r'\s+', ' ', s).strip().lower()
    return s


index = {}
for k, v in paires:
    index.setdefault(plie(v), []).append(k)

print('%-34s | %-58s | %s' % ('chemin', 'texte dessiné', 'clé i18n (table du back)'))
print('-' * 150)
vus = set()
for chemin, t in p.out:
    if (chemin, t) in vus:
        continue
    vus.add((chemin, t))
    cles = index.get(plie(t), [])
    print('%-34s | %-58s | %s' % (chemin[:34], t[:58], ('SERVI ' + ', '.join(cles[:2])) if cles else 'ABSENT'))
