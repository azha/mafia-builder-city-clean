# La zone basse est-elle VRAIMENT vide ? Seuil TRES bas (+-2/255) pour ne pas conclure
# "rien" avec une fenetre plus large que l effet (piege du zero au-dela d une distance).
# Controle positif : la meme sonde sur la bande du paragraphe (y 1216..1280) doit trouver de l encre.
# Controle negatif : deux lignes voisines de fond pur doivent rendre 0.
from PIL import Image
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture',cap.size)
px=cap.load()
def compte(y0,y1,d=2):
    n=0; ext=set()
    for y in range(y0,y1):
        for x in range(0,1080):
            c=px[x,y]
            if max(abs(c[0]-13),abs(c[1]-13),abs(c[2]-13))>d: n+=1; ext.add(c)
    return n,len(ext)
print('CONTROLE POSITIF y 1216..1280 :', compte(1216,1280))
print('CONTROLE NEGATIF y 1600..1602 :', compte(1600,1602))
print()
for a,b in [(1451,1500),(1500,1600),(1600,1700),(1700,1800),(1800,1900),(1900,2000),(2000,2100),(2100,2179)]:
    n,e=compte(a,b)
    print('  y %4d..%4d : %6d pixels hors fond (+-2), %d teintes distinctes'%(a,b,n,e))
print()
print('Balayage fin, seuil +-1 :')
for a,b in [(1451,1800),(1800,2100),(2100,2179)]:
    n,e=compte(a,b,d=1); print('  y %4d..%4d : %d pixels, %d teintes'%(a,b,n,e))
