# m10 — etendue du conteneur de contenu (aplat 22,22,28) et de la carte (28,28,34).
from PIL import Image
cap=Image.open('../capture-1080x2400.png').convert('RGB'); px=cap.load()
print('OUVERT capture',cap.size)
def near(p,c,t=4): return all(abs(p[i]-c[i])<=t for i in range(3))
CONT=(22,22,28); CARTE=(28,28,34)
for nom,c,xtest in [('conteneur',CONT,292),('carte',CARTE,400)]:
    ys=[y for y in range(0,900) if near(px[xtest,y],c)]
    if ys:
        # segments
        seg=[];cur=ys[0];prev=ys[0]
        for y in ys[1:]:
            if y-prev>3: seg.append((cur,prev)); cur=y
            prev=y
        seg.append((cur,prev))
        print('  %-10s a x=%d : y %d..%d ; segments=%s'%(nom,xtest,min(ys),max(ys),seg))
    else: print('  %s: aucun'%nom)
print()
print('--- profil vertical de la colonne x=400 (dans la carte), y 140..600 ---')
prev=None
for y in range(140,600):
    c=px[400,y]
    if prev is None or max(abs(c[i]-prev[i]) for i in range(3))>5:
        print('   y=%4d %s'%(y,str(c)))
    prev=c
