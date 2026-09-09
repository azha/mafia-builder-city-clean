from common import *
c=op(C19); px=c.load()
def texte(pred,box,label):
    pts=[(x,y) for y in range(box[1],box[3]) for x in range(box[0],box[2]) if pred(px[x,y])]
    if not pts: print(f'  {label}: 0 px'); return
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    print(f'  {label}: {len(pts)} px ; x {min(xs)}..{max(xs)} = {min(xs)/CAP_S:.2f}..{(max(xs)+1)/CAP_S:.2f} CSS ; y {min(ys)/CAP_S:.2f}..{(max(ys)+1)/CAP_S:.2f} CSS ; bord droit atteint : {"OUI" if max(xs)>=1078 else "non"}')
cre=lambda c2: abs(c2[0]-234)<16 and abs(c2[1]-224)<16 and abs(c2[2]-200)<20
cr2=lambda c2: abs(c2[0]-185)<16 and abs(c2[1]-173)<16 and abs(c2[2]-146)<20
texte(cr2,(900,25,1080,65),'CAP1920 libelle JOUR (creme-2)')
texte(cre,(900,70,1080,130),'CAP1920 valeur du quart (creme)')
print()
print('  ronds du dock a 1920 : recherche du bord clair sur plusieurs y')
for y in range(1690,1790,10):
    vals=[lum(px[x,y]) for x in range(100,1000)]
    b=sorted(vals)[len(vals)//2]
    hits=[x for x in range(100,1000) if lum(px[x,y])-b>5]
    segs=[];cur=None
    for x in hits:
        if cur is None: cur=[x,x]
        elif x-cur[1]<=4: cur[1]=x
        else: segs.append(tuple(cur)); cur=[x,x]
    if cur: segs.append(tuple(cur))
    if len(segs)==8:
        d=[(segs[i+1][1]-segs[i][0]+1)/CAP_S for i in range(0,8,2)]
        ce=[(segs[i][0]+segs[i+1][1])/2/CAP_S for i in range(0,8,2)]
        print(f'    y={y} ({y/CAP_S:.1f} CSS) diam {[round(v,2) for v in d]} centres {[round(v,2) for v in ce]}')

# --- ajout : ronds du dock a 1920, mesures par les INTERVALLES clairs entre les ronds ---
print()
print('  ronds du dock a 1920, par les intervalles clairs (les ronds sont plus SOMBRES que l art) :')
for y in (1755,1762,1770):
    vals=[lum(px[x,y]) for x in range(100,1000)]
    b=sorted(vals)[len(vals)//2]
    hits=[x for x in range(100,1000) if lum(px[x,y])-b>4]
    segs=[];cur=None
    for x in hits:
        if cur is None: cur=[x,x]
        elif x-cur[1]<=4: cur[1]=x
        else: segs.append(tuple(cur)); cur=[x,x]
    if cur: segs.append(tuple(cur))
    if len(segs)==5:
        ronds=[(segs[i][1]+1,segs[i+1][0]-1) for i in range(4)]
        print(f'    y={y} ({y/CAP_S:.1f} CSS) centres '
              + str([round((a+b2)/2/CAP_S,2) for a,b2 in ronds])
              + '  (2400 : 74.95, 155.53, 236.11, 316.69 -> IDENTIQUES)')
