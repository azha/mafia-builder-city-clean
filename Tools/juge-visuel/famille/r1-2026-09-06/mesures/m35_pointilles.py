# m35 — periode du pointille du cadre .vide (trait haut).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def dashes(im,y,x0,x1,bg,S,label):
    px=im.load()
    on=[1 if px[x,y][0]>bg[0]+10 else 0 for x in range(x0,x1)]
    runs=[];cur=on[0];n=1
    for v in on[1:]:
        if v==cur: n+=1
        else: runs.append((cur,n)); cur=v; n=1
    runs.append((cur,n))
    pleins=[n for v,n in runs if v==1][1:-1]
    vides =[n for v,n in runs if v==0][1:-1]
    if not pleins or not vides: print('  %s : trait continu ou indetectable (runs=%s)'%(label,runs[:8])); return
    mp=sorted(pleins)[len(pleins)//2]; mv=sorted(vides)[len(vides)//2]
    print('  %-28s plein median=%d px (%.2f CSS)  vide median=%d px (%.2f CSS)  periode=%.2f CSS  (n=%d tirets)'%(
        label,mp,mp/S,mv,mv/S,(mp+mv)/S,len(pleins)))
dashes(ref,737,230,1030,(22,25,27),2.0,'REF vide#1 bord haut')
dashes(ref,738,230,1030,(22,25,27),2.0,'REF vide#1 bord haut (2e px)')
dashes(cap,947,230,990,(22,22,28),1.88036,'CAP vide#1 bord haut')
dashes(ref,1670,80,1030,(22,25,27),2.0,'REF Recruter bord haut')
dashes(cap,1873,90,990,(22,22,28),1.88036,'CAP Recruter bord haut')
