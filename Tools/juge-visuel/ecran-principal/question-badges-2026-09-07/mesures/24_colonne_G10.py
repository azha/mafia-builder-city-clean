from PIL import Image
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
print('colonne x=155, y=1325..1420 (G10) : rgb, luminance, indice teal B-R')
for y in range(1325,1421,3):
    r,g,b=px[155,y]; L=(r*299+g*587+b*114)//1000
    print(f'  y={y:5d} rgb=({r:3d},{g:3d},{b:3d}) L={L:3d} B-R={b-r:+4d}')
print('\ncolonne x=155, y=1290..1330 (au dessus, le quai) :')
for y in range(1290,1331,3):
    r,g,b=px[155,y]; L=(r*299+g*587+b*114)//1000
    print(f'  y={y:5d} rgb=({r:3d},{g:3d},{b:3d}) L={L:3d} B-R={b-r:+4d}')
