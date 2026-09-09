# Chrome, mesure propre. Controle positif : sur la CAPTURE le filet doit sortir a y=141..143
# en braise (224,102,74) -- valeur ECRITE par .tel.chaud .barre::after (hud-brennar.html l.31).
# Controle negatif : sur le CANON (etat calme) le meme filet doit sortir LAITON (#d9ab4e-ish),
# donc l instrument doit rendre DEUX couleurs differentes, pas la meme.
from PIL import Image
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
can=Image.open('../hud-canon-1176.png').convert('RGB'); print('canon  ',can.size)
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture',cap.size)
def filet(im,nom,s,xs):
    px=im.load()
    print(' %s : lignes ou une colonne loin du texte devient saturee' % nom)
    for x in xs:
        for y in range(20,260):
            c=px[x,y]
            if max(c)>90 and max(c)-min(c)>40:
                print('   x=%4d y=%3d (%.1f CSS) couleur=%s'%(x,y,y/s,c)); break
filet(can,'canon  ',1176/392.0,[900,1000,1100])
filet(cap,'capture',1080/392.0,[900,1000,1050])
print()
# medaillon : diametre reel = plus longue plage saturee sur la ligne passant par son centre
def medaillon(im,nom,s):
    px=im.load(); w,h=im.size
    best=None
    for y in range(10,300):
        run=0;runs=[]
        for x in range(int(w*0.30),int(w*0.70)):
            c=px[x,y]
            sat = max(c)>80 and max(c)-min(c)>40
            if sat: run+=1
            else:
                if run: runs.append((run,x-run,x-1)); run=0
        if run: runs.append((run,int(w*0.70)-run,int(w*0.70)-1))
        # anneau : deux courtes plages symetriques -> on prend l ecart entre la 1re et la derniere
        if runs and len(runs)>=2:
            g=runs[0][1]; d=runs[-1][2]
            if best is None or (d-g)>best[1]-best[0]: best=(g,d,y,len(runs))
    if best:
        g,d,y,n=best
        print(' %s medaillon : ligne y=%d, bord gauche x=%d bord droit x=%d -> diametre %d px = %.1f CSS ; centre %.1f CSS ; %d plages'
              %(nom,y,g,d,d-g+1,(d-g+1)/s,(g+d)/2/s,n))
medaillon(can,'canon  ',1176/392.0)
medaillon(cap,'capture',1080/392.0)
print()
# collision ARGENT / medaillon sur la CAPTURE : dernier x d encre claire de la valeur, vs bord du medaillon
px=cap.load()
xs=[x for y in range(45,105) for x in range(0,540) if lum(px[x,y])>90]
print(' capture : valeur ARGENT, dernier x d encre = %d (%.1f CSS)'%(max(xs),max(xs)/(1080/392.0)))
# bord gauche du disque du medaillon sur la capture (ligne y=95, le disque est sombre sur fond sombre :
# on cherche l anneau braise)
for y in [60,80,95,110]:
    row=[x for x in range(300,560) if max(px[x,y])>80 and max(px[x,y])-min(px[x,y])>40]
    print('   y=%3d : premier x sature du medaillon = %s' % (y, min(row) if row else None))
