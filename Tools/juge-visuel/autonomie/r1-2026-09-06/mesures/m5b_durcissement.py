# m5b — DURCISSEMENT de m5 : un zero sur un motif est suspect. On rebalaie la capture
# ENTIERE, a plusieurs seuils, et on imprime les pixels les plus "verts" trouves.
from PIL import Image
cap=Image.open('../capture-1080x2400.png').convert('RGB'); px=cap.load()
print('OUVERT capture', cap.size, '(image ENTIERE, aucune exclusion)')
best=[]
for seuil in (2,4,8,16,32):
    n=0
    for y in range(cap.height):
        for x in range(cap.width):
            r,g,b=px[x,y]
            if g>r+seuil and g>b+seuil: n+=1
    print('  seuil=%2d : %d px  (%.4f %%)'%(seuil,n,100.0*n/(cap.width*cap.height)))
# quel est le pixel le plus vert de toute l image ?
mx=(-999,None)
for y in range(cap.height):
    for x in range(cap.width):
        r,g,b=px[x,y]
        v=min(g-r,g-b)
        if v>mx[0]: mx=(v,(x,y,(r,g,b)))
print('  pixel le PLUS vert de la capture: marge=%d en %s'%(mx[0],str(mx[1])))
# controle positif du meme detecteur sur la reference entiere
ref=Image.open('../reference-1080x2102.png').convert('RGB'); rp=ref.load()
mx2=(-999,None)
for y in range(0,ref.height,3):
    for x in range(0,ref.width,3):
        r,g,b=rp[x,y]
        v=min(g-r,g-b)
        if v>mx2[0]: mx2=(v,(x,y,(r,g,b)))
print('  CONTROLE POSITIF pixel le plus vert de la reference: marge=%d en %s'%(mx2[0],str(mx2[1])))
