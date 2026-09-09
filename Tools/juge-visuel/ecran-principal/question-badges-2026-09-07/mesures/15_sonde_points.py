from PIL import Image
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
PTS={'asphalte pres G5 (372,715)':(372,715),'asphalte (390,700)':(390,700),
 'rue centre (300,760)':(300,760),'rue bas (620,1140)':(620,1140),
 'quai (300,1250)':(300,1250),'quai droite (900,1230)':(900,1230),
 'eau (400,1600)':(400,1600),'ciel (500,300)':(500,300),
 'trottoir Verge (520,975)':(520,975),'trottoir G9 (560,970)':(560,970),
 'toit vert G8 (150,960)':(150,960),'facade G11 (740,1355)':(740,1355),
 'toit Verge (500,800)':(500,800),'facade G4 (160,780)':(160,780),
 'facade G1 (350,585)':(350,585),'facade G2 (545,585)':(545,585),
 'facade G3 (740,585)':(740,585),'kiosque G7 (920,780)':(920,780),
 'quai G10 (160,1330)':(160,1330),'eau sous G10 (150,1370)':(150,1370)}
for n,(x,y) in PTS.items():
    print(f'  {n:32s} rgb={px[x,y]}')
