# m14 — qu est-ce qui recouvre le bouton "Choose A" ? (rect mesure en m10 : y209..245)
# CONTROLE : le bouton "Choose B" (y284..320), homologue non recouvert, sert de temoin.
from PIL import Image
cap=Image.open('../capture-1080x2400.png').convert('RGB'); px=cap.load()
print('OUVERT capture',cap.size)
BTN=(42,46,56)
def analyse(y0,y1,label):
    etr=[]; dore=[]
    for y in range(y0,y1):
        for x in range(312,768):
            p=px[x,y]
            d=max(abs(p[i]-BTN[i]) for i in range(3))
            if d>25:
                etr.append((x,y,p))
                if p[0]>140 and p[0]-p[2]>60: dore.append((x,y,p))
    xs=[e[0] for e in etr]; ys=[e[1] for e in etr]
    print('  %s : %d px hors couleur de bouton, bbox x %d..%d y %d..%d'%(label,len(etr),min(xs),max(xs),min(ys),max(ys)))
    if dore:
        dx=[d[0] for d in dore]; dy=[d[1] for d in dore]
        print('     dont %d px dores/orange, bbox x %d..%d y %d..%d  (ex: %s)'%(len(dore),min(dx),max(dx),min(dy),max(dy),str(dore[len(dore)//2])))
analyse(209,246,'bouton A (y209..245)')
analyse(284,321,'bouton B (y284..320)  TEMOIN')
print()
print('--- forme dorée qui recouvre A : segments par ligne ---')
for y in range(200,260,4):
    seg=[x for x in range(400,700) if px[x,y][0]>140 and px[x,y][0]-px[x,y][2]>60]
    if seg: print('   y=%4d  x %d..%d (largeur %d)'%(y,min(seg),max(seg),max(seg)-min(seg)+1))
