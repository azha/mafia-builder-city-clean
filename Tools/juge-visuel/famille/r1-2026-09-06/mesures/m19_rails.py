# m19 — les rails de l'arbre : rail principal (.arbre::before), rails d'equipe (.equipe::before),
# et les ergots horizontaux (.rang::before). Position, largeur, extension verticale, couleur.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
laiton=lambda p: p[0]>40 and p[0]-p[2]>10
def vrail(im,x0,x1,y0,y1,label,S,OX,OY):
    px=im.load()
    # pour chaque colonne, compter les pixels laiton
    best=[]
    for x in range(x0,x1):
        ys=[y for y in range(y0,y1) if laiton(px[x,y])]
        if len(ys)>30: best.append((x,min(ys),max(ys),len(ys)))
    if not best: print('  %s : AUCUN rail'%label); return
    xs=[b[0] for b in best]
    ymin=min(b[1] for b in best); ymax=max(b[2] for b in best)
    print('  %-28s x=%d..%d (CSS %.1f..%.1f, l=%.2f) y=%d..%d (CSS %.1f..%.1f, h=%.1f)'%(
        label,min(xs),max(xs),(min(xs)-OX)/S,(max(xs)-OX)/S,(max(xs)-min(xs)+1)/S,
        ymin,ymax,(ymin-OY)/S,(ymax-OY)/S,(ymax-ymin+1)/S))
    # couleur au sommet et au pied
    xm=xs[len(xs)//2]
    print('       couleur haut %s  bas %s'%(px[xm,ymin+8],px[xm,ymax-8]))
SR,OXR,OYR=2.0,0,0
SC,OXC,OYC=1.88036,13,232
print('\nREFERENCE')
vrail(ref,55,80,460,1700,'rail principal (.arbre)',SR,OXR,OYR)
vrail(ref,135,165,700,900,'rail equipe #1',SR,OXR,OYR)
vrail(ref,135,165,1100,1250,'rail equipe #2',SR,OXR,OYR)
vrail(ref,135,165,1450,1650,'rail equipe #3',SR,OXR,OYR)
print('\nCAPTURE')
vrail(cap,60,90,690,1900,'rail principal (.arbre)',SC,OXC,OYC)
vrail(cap,140,170,910,1100,'rail equipe #1',SC,OXC,OYC)
vrail(cap,140,170,1290,1480,'rail equipe #2',SC,OXC,OYC)
vrail(cap,140,170,1670,1860,'rail equipe #3',SC,OXC,OYC)
print('\n--- ergots horizontaux .rang::before (au milieu de chaque rang) ---')
def hspur(im,y0,y1,x0,x1,label,S,OX,OY):
    px=im.load()
    rows=[]
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if laiton(px[x,y])]
        if len(xs)>8: rows.append((y,min(xs),max(xs),len(xs)))
    if not rows: print('  %s : AUCUN ergot'%label); return
    ymin=rows[0][0]; ymax=rows[-1][0]
    xa=min(r[1] for r in rows); xb=max(r[2] for r in rows)
    print('  %-28s y=%d..%d (h=%.2f CSS) x=%d..%d CSS %.1f..%.1f (l=%.1f)'%(
        label,ymin,ymax,(ymax-ymin+1)/S,xa,xb,(xa-OX)/S,(xb-OX)/S,(xb-xa+1)/S))
hspur(ref,580,640,60,120,'REF ergot rang1',SR,OXR,OYR)
hspur(ref,980,1040,60,120,'REF ergot rang2',SR,OXR,OYR)
hspur(cap,800,860,65,125,'CAP ergot rang1',SC,OXC,OYC)
hspur(cap,1180,1240,65,125,'CAP ergot rang2',SC,OXC,OYC)
