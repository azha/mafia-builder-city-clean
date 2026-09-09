# Bords GAUCHE/DROIT des boites (item de la reference, carte de la capture) sur une ligne
# traversant leur aplat : on cherche la transition fond-de-panneau -> fond-de-boite.
# Controle positif : la reference doit rendre une boite dont le bord est #303a44 (48,58,68)
#   et l'aplat #1e242b (30,36,43) -- valeurs ECRITES dans la CSS .parl6 .pl-item.
# Controle negatif : la meme sonde sur une ligne SANS boite (y=1500 capture) ne doit rien trouver.
from PIL import Image
def scan(im,y,x0=0,x1=None,pas=1):
    px=im.load(); w,h=im.size; x1=w if x1 is None else x1
    out=[]; prev=None
    for x in range(x0,x1,pas):
        c=px[x,y]
        if prev is None or max(abs(c[i]-prev[i]) for i in range(3))>4:
            out.append((x,c)); prev=c
    return out
ref=Image.open('../reference-1080x2102.png').convert('RGB'); print('reference',ref.size)
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture  ',cap.size)
print('--- REFERENCE : ligne y=1000 (dans l item 1, hors texte : x 0..200) ---')
for x,c in scan(ref,1000,0,200): print('   x=%4d %s'%(x,c))
print('--- REFERENCE : ligne y=1000, cote droit x 900..1080 ---')
for x,c in scan(ref,1000,900,1080): print('   x=%4d %s'%(x,c))
print('--- CAPTURE : ligne y=700 (carte 1, hors texte : x 0..80) ---')
for x,c in scan(cap,700,0,90): print('   x=%4d %s'%(x,c))
print('--- CAPTURE : ligne y=700, cote droit x 960..1080 ---')
for x,c in scan(cap,700,960,1080): print('   x=%4d %s'%(x,c))
print('--- CONTROLE NEGATIF : capture y=1500 (zone vide) x 0..200 ---')
for x,c in scan(cap,1500,0,200): print('   x=%4d %s'%(x,c))
