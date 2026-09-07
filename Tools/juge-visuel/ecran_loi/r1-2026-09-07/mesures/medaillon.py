# Medaillon : diametre de l anneau, mesure sur la ligne du CENTRE VERTICAL du medaillon
# (pas sur la ligne du filet). Methode : pour chaque ligne, plus longue plage CONTINUE de
# pixels du disque (sombre bleute) bornee par l anneau ; on prend la ligne ou elle est max.
# Controle positif : sur le CANON l anneau est laiton (max>150, R>B) ; sur la CAPTURE il est
#   braise (R>>G,B). L instrument doit donc rendre DEUX teintes differentes.
# Controle negatif : la meme sonde a y=400 (hors medaillon) doit rendre une plage nulle.
from PIL import Image
def anneau(im,nom,s,ymax):
    px=im.load(); w,h=im.size
    res=[]
    for y in range(5,ymax):
        xs=[x for x in range(int(w*0.33),int(w*0.67))
            if (lambda c: max(c)>75 and (c[0]-c[2])>25)(px[x,y])]
        if len(xs)>=2:
            res.append((max(xs)-min(xs), y, min(xs), max(xs)))
    res.sort(reverse=True)
    if res:
        d,y,g,dr=res[0]
        print(' %-8s ligne y=%3d : anneau x %d..%d -> %d px = %.1f CSS ; couleur bord gauche=%s'
              %(nom,y,g,dr,dr-g+1,(dr-g+1)/s,px[g,y]))
    return res
can=Image.open('../hud-canon-1176.png').convert('RGB'); print('canon  ',can.size)
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture',cap.size)
anneau(can,'canon',1176/392.0,230)
anneau(cap,'capture',1080/392.0,215)
print()
print('CONTROLE NEGATIF (y=400..430, hors medaillon) :')
for nom,im in [('canon',can),('capture',cap)]:
    px=im.load(); w,h=im.size
    n=sum(1 for y in range(400,430) for x in range(int(w*0.33),int(w*0.67))
          if max(px[x,y])>75 and (px[x,y][0]-px[x,y][2])>25)
    print('   %-8s pixels satures chauds = %d'%(nom,n))
print()
# collision : bord gauche de l anneau vs dernier x de l encre claire de la valeur ARGENT
px=cap.load()
print('CAPTURE, ligne par ligne dans la bande de la valeur ARGENT :')
for y in range(60,105,5):
    enc=[x for x in range(120,600) if 0.2126*px[x,y][0]+0.7152*px[x,y][1]+0.0722*px[x,y][2]>85]
    anx=[x for x in range(380,600) if max(px[x,y])>75 and (px[x,y][0]-px[x,y][2])>40]
    print('  y=%3d  encre claire x %s..%s   anneau braise a partir de x=%s'
          %(y, min(enc) if enc else None, max(enc) if enc else None, min(anx) if anx else None))
