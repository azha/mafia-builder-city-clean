# Sonde: échantillonne les couleurs autour du badge "Laboratoire" pour caractériser l'anneau doré.
from PIL import Image
SRC='../capture-nuit-1080x1920.png'
im = Image.open(SRC); px = im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
cx, cy = 540, 552
print('--- profil horizontal y=552, x=528..554 ---')
for x in range(528, 555):
    r,g,b = px[x,cy]
    print(f'  x={x:4d} rgb=({r:3d},{g:3d},{b:3d})')
print('--- profil vertical x=540, y=540..566 ---')
for y in range(540, 567):
    r,g,b = px[cx,y]
    print(f'  y={y:4d} rgb=({r:3d},{g:3d},{b:3d})')
