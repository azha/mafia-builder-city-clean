# Ou la facade du "Verge d'Or" rencontre-t-elle le trottoir, sur des colonnes NON occultees
# par le badge (disque x 533..546, libelle x 526..554) ?
from PIL import Image
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
for X in (515,520,560,565):
    print(f'--- colonne x={X} ---')
    prev=None
    for y in range(915,965):
        r,g,b=px[X,y]; L=(r*299+g*587+b*114)//1000
        print(f'  y={y:4d} rgb=({r:3d},{g:3d},{b:3d}) L={L:3d}')
