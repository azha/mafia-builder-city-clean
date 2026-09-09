# Sonde: couleurs dans la bande de libelle sous le badge "Laboratoire" (539.5,552.5)
from PIL import Image
from collections import Counter
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
c=Counter()
for y in range(562,584):
    for x in range(480,600):
        c[px[x,y]]+=1
print('20 couleurs les plus frequentes dans (480..600, 562..584) :')
for col,n in c.most_common(20): print('   ',col,n)
print('--- pixels les plus clairs ---')
best=sorted(c.items(), key=lambda kv:-(kv[0][0]+kv[0][1]+kv[0][2]))[:10]
for col,n in best: print('   ',col,n)
