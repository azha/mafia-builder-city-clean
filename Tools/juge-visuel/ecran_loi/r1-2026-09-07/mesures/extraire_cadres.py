# Extrait les cadres #67..#72 de la source atelier, en texte lisible.
# Controle positif : le cadre #67 doit porter l'etiquette annoncee par le dossier
# ("Ils ont arrete un de vos coursiers") ; controle negatif : #68 doit en porter une AUTRE.
import re, html, sys
SRC = '/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html'
raw = open(SRC, encoding='utf-8').read()
print('source:', SRC, 'octets:', len(raw))
parts = raw.split('<div class="cadre">')
print('cadres trouves (0-based max index):', len(parts)-2)
for i in (67,68,69,70,71,72):
    seg = parts[i+1]
    et = re.search(r'<div class="etiquette">(.*?)</div>', seg)
    print('#%d etiquette: %s' % (i, html.unescape(et.group(1)) if et else 'AUCUNE'))
# dump lisible
out = {}
for i in (67,68,69,70,71,72):
    seg = parts[i+1]
    # couper au prochain cadre
    txt = seg
    txt = re.sub(r'<svg.*?</svg>', '[SVG]', txt, flags=re.S)
    txt = re.sub(r'>\s*<', '>\n<', txt)
    open('cadre_%d.txt' % i, 'w', encoding='utf-8').write(txt)
    out[i] = len(txt)
print('dumps ecrits:', out)
