import sys
from PIL import Image
S='/tmp/claude-1000/-home-erutheone-project-mafia-unity-F/2d7b0615-a2ca-4752-8f32-06da876e1c7c/scratchpad/'
CAP='/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-mots/'
REF4='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/decision-du-jour/reference-1080x2102.png'
def feut(p):  return p[1]>p[0]+18 and p[1]>p[2]+12 and p[1]>45
def cream(p): return p[0]>190 and p[1]>170 and p[2]>130 and p[0]-p[2]>25 and p[0]-p[2]<80
def rouge(p): return p[0]>140 and p[1]<80 and p[2]<70
def run(path):
    im=Image.open(path).convert('RGB'); w,h=im.size; px=im.load()
    print('IMAGE',path.split('/')[-1],f'{w}x{h}')
    fr=[y for y in range(h) if sum(feut(px[x,y]) for x in range(0,w,6))>0.5*(w//6)]
    cr=[(x,y) for y in range(0,h,3) for x in range(0,w,3) if cream(px[x,y])]
    # cartes: crème au-dessus de la plaque du tampon -> prendre le plus haut bloc crème
    ys=sorted(set(y for _,y in cr))
    print(' feutre (lignes >50% vertes): y',fr[0] if fr else None,'..',fr[-1] if fr else None)
    # blocs crème contigus
    blocs=[];s=None;prev=None
    for y in ys:
        if s is None: s=y
        elif y-prev>12: blocs.append((s,prev)); s=y
        prev=y
    if s is not None: blocs.append((s,prev))
    for b in blocs:
        xs=[x for x,y in cr if b[0]<=y<=b[1]]
        print('  bloc crème y',b,'x',min(xs),max(xs),'-> %dx%d  aspect L/H=%.2f'%(max(xs)-min(xs),b[1]-b[0],(max(xs)-min(xs))/max(1,b[1]-b[0])))
    # trou vert: plus long intervalle sans encre (hors vert fond) dans la zone feutre
    if fr:
        y0,y1=fr[0],fr[-1]; bg=[]
        for y in range(y0,y1):
            n=sum(1 for x in range(0,w,4) if not feut(px[x,y]) and not (px[x,y][1]<px[x,y][0]+10 and sum(px[x,y])<60))
            bg.append((y,n/(w//4)))
        best=0;cur=0;cs=0;bs=0
        for y,f in bg:
            if f<0.015:
                if cur==0: cs=y
                cur+=1
                if cur>best: best=cur;bs=cs
            else: cur=0
        print(' feutre vide (encre<1,5%%): %d px de %d (%.1f%%) depuis y=%d'%(best,y1-y0,100*best/(y1-y0),bs))
    # cachet de cire (rouge sature) : pixels rouge vif > seuil dans la moitié haute de la carte
    rc=sum(1 for y in range(0,h,3) for x in range(0,w,3) if px[x,y][0]>170 and px[x,y][1]<70 and px[x,y][2]<60)
    print(' px rouge vif (cachet candidat) pas-3:',rc)
for p in [CAP+'E11_DecisionDetail_1080x2400.png',CAP+'E11_DecisionDetail_1080x1920.png',S+'s6-idx4.png',REF4]: run(p)
