# Recense les couleurs EXACTES les plus fréquentes, et compte celles de l'anneau/point du badge.
from PIL import Image
from collections import Counter
SRC='../capture-nuit-1080x1920.png'
im = Image.open(SRC)
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
cnt = Counter(im.getdata())
print('total pixels', im.width*im.height, '| couleurs distinctes', len(cnt))
for c in [(176,141,62),(255,183,38)]:
    print(f'  exact {c} : {cnt.get(c,0)} px')
print('--- 25 couleurs les plus frequentes ---')
for c,n in cnt.most_common(25):
    print(f'  {c} : {n}')
