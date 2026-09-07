from PIL import Image
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
print('colonne x=539, y=895..1000 (G9) : ou la facade rencontre-t-elle le trottoir ?')
for y in range(895,1001,2):
    r,g,b=px[539,y]; L=(r*299+g*587+b*114)//1000
    print(f'  y={y:4d} rgb=({r:3d},{g:3d},{b:3d}) L={L:3d}')
