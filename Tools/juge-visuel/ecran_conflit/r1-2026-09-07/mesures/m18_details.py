# m18 — trois details assertes dans les annexes, mesures pour ne pas les laisser "a l'oeil" :
#  (a) le medaillon de la serviette (.ordre .av) : couleur et rect
#  (b) le filet .prise de la serviette : y et couleur (jeton CSS #cbbfa4 = 203,191,164)
#  (c) l'ecart entre le dernier glyphe de la valeur ARGENT et l'anneau du medaillon (capture)
# Controle positif (b) : le jeton #cbbfa4 doit etre retrouve a moins de 6/255.
# Controle negatif (c) : la meme sonde a gauche de "ARGENT" (x<180) ne doit trouver aucun anneau.
from PIL import Image
ref=Image.open('reference-1080x2102.png').convert('RGB'); print('ref',ref.size)
cap=Image.open('capture-1080x2400.png').convert('RGB'); print('cap',cap.size)
p=ref.load(); q=cap.load()

print("\n(a) .ordre .av — balayage horizontal a y=770 (milieu du rond), x 80..260")
seq=[(x,p[x,770]) for x in range(80,265,6)]
print("   ",seq)
print("   mediane interieure (x 130..200, y 750..790) :", end=" ")
R=[];G=[];B=[]
for y in range(750,790):
    for x in range(130,200): c=p[x,y];R.append(c[0]);G.append(c[1]);B.append(c[2])
R.sort();G.sort();B.sort();n=len(R)//2;print((R[n],G[n],B[n]))

print("\n(b) filet .prise — colonne x=700, y 855..875")
print("   ",[(y,p[700,y]) for y in range(855,876)])
print("   jeton CSS #cbbfa4 =",(0xcb,0xbf,0xa4))

print("\n(c) ARGENT vs anneau du medaillon (capture, ligne y=118 = milieu des glyphes de la valeur)")
# dernier pixel d'encre or de la valeur
last=None
for x in range(150,470):
    c=q[x,118]
    if c[0]>150 and c[1]>110 and c[2]<160 and c[0]-c[2]>60: last=x
print("   dernier pixel 'or' de la valeur a x =",last)
first=None
for x in range((last or 400)+1,600):
    c=q[x,118]
    if c[0]>120 and c[0]-c[2]>50: first=x; break
print("   premier pixel 'braise' de l'anneau a x =",first)
print("   ecart =", (first-last) if (first and last) else None, "px")
print("   CONTROLE NEGATIF : anneau cherche a gauche de x=180 ->", [x for x in range(20,180) if q[x,118][0]>120 and q[x,118][0]-q[x,118][2]>50])

print("\n(c bis) ARGENT vs anneau — sur la BANDE des glyphes (y 60..105), pas sur la barre de ratio")
lastx=0; firstring=None
for y in range(60,106):
    for x in range(150,470):
        c=q[x,y]
        if c[0]>150 and c[1]>120 and c[0]-c[2]>55: lastx=max(lastx,x)
for y in range(60,106):
    for x in range(lastx+1,640):
        c=q[x,y]
        if c[0]>120 and c[0]-c[2]>50:
            firstring=x if firstring is None else min(firstring,x); break
print("   dernier pixel d'encre or de la valeur : x =",lastx)
print("   premier pixel de l'anneau braise      : x =",firstring)
print("   ecart mesure                          :",(firstring-lastx) if firstring else None,"px =",
      round((firstring-lastx)/3.6,1) if firstring else None,"CSS-contenu /",
      round((firstring-lastx)/2.755,1) if firstring else None,"CSS-HUD")
print("\n(d) barre de ratio sous ARGENT : etendue")
xs=[x for x in range(100,600) if q[x,120][0]>150 and q[x,120][0]-q[x,120][2]>60]
print("   y=120, x de",min(xs) if xs else None,"a",max(xs) if xs else None)

print("\n(e) bbox de l'anneau braise du medaillon (capture), hors filet du bandeau (y<138)")
xs=[];ys=[]
for y in range(0,138):
    for x in range(350,740):
        c=q[x,y]
        if c[0]>140 and c[0]-c[2]>55 and c[1]<140: xs.append(x); ys.append(y)
print("   bbox =",(min(xs),min(ys),max(xs),max(ys)),"  soit",max(xs)-min(xs)+1,"x",max(ys)-min(ys)+1,"px")
print("   centre =",((min(xs)+max(xs))//2,(min(ys)+max(ys))//2))
print("   diametre attendu : 64 CSS-HUD x 2,755 =",round(64*2.755,1),"px")
