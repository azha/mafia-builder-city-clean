from PIL import Image
im=Image.open('../capture-1080x1920.png').convert('RGB'); W,H=im.size; px=im.load()
print('taille',im.size)
uni=[]
for y in range(H):
    c0=px[0,y]; u=all(px[x,y]==c0 for x in range(0,W,3)); uni.append(u)
y=0
while y<H:
    if uni[y]:
        y0=y
        while y<H and uni[y]: y+=1
        print(f'lignes UNIFORMES {y0}..{y-1} couleur={px[0,y0]}')
    else: y+=1
# recherche de la couleur letterbox (28,28,34)
cnt=sum(1 for y in range(H) for x in range(0,W,9) if px[x,y]==(28,28,34))
print('pixels exactement (28,28,34) echantillonnes:',cnt)
# colonne temoin x=5 : profil
for y in range(0,H,1):
    pass
print('profil colonne x=3 (y:couleur) tous les 20 px, y=0..300')
for y in range(0,320,10): print('  ',y,px[3,y])
print('profil colonne x=3, y=1600..1919')
for y in range(1600,1920,10): print('  ',y,px[3,y])
