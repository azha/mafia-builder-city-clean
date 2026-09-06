# Grandeurs DUES par le dossier :
#   - rayon MEDIAN de l'arc / R   - epaisseur radiale de l'arc / R
#   - longueur de l'AIGUILLE / R  - rayon de la POINTE / R et sa position par rapport a l'arc
# R = rayon EXTERIEUR de l'anneau du boitier, convention NOMINALE (bord a mi-amplitude).
# Controle positif : sur la REFERENCE, R doit valoir 32,00 CSS (mesure-canon .medaillon 64).
from common import *
import math
def classe(c):
    r,g,b=c
    if g>r+12 and g>b+4 and g>60: return 'teal'
    if r>g+35 and r>b+35 and r>90: return 'braise'
    if r>190 and g>180 and b>160: return 'aiguille'   # creme (234,224,200)
    return None
def radial(im,cx,cy,R,scale,label,angs=range(-100,101,2)):
    px=im.load(); out={}
    for a in angs:
        A=math.radians(a); prof=[]
        r=0.0
        while r<R*1.02:
            x=int(round(cx+r*math.sin(A))); y=int(round(cy-r*math.cos(A)))
            if 0<=x<im.width and 0<=y<im.height: prof.append((r,classe(px[x,y]),px[x,y]))
            r+=0.5
        out[a]=prof
    return out
def resume(out,R,scale,label):
    print(f'  {label}  R={R:.1f} px = {R/scale:.2f} CSS')
    for cls in ('teal','braise'):
        rs=[]; ep=[]
        for a,prof in out.items():
            hit=[r for r,c,_ in prof if c==cls]
            if len(hit)>=3: rs.append((a,(min(hit)+max(hit))/2,max(hit)-min(hit)))
        if not rs: print(f'    {cls}: absent'); continue
        angs=[a for a,_,_ in rs]
        mid=sorted(m for _,m,_ in rs)[len(rs)//2]
        th=sorted(t for _,_,t in rs)[len(rs)//2]
        print(f'    {cls}: {len(rs)} rayons touchés, angles {min(angs)}..{max(angs)} deg ; rayon MEDIAN {mid:.1f} px = {mid/scale:.2f} CSS = {mid/R:.4f} R ; epaisseur radiale med {th:.1f} px = {th/scale:.2f} CSS = {th/R:.4f} R')
def aiguille(im,cx,cy,R,scale,label,box):
    px=im.load(); x0,y0,x1,y1=box; pts=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if classe(px[x,y])=='aiguille':
                d=math.hypot(x-cx,y-cy)
                if d<R*0.98: pts.append((x,y,d))
    if not pts: print(f'  {label}: aucune aiguille'); return
    pts.sort(key=lambda p:-p[2])
    tip=pts[0]
    ang=math.degrees(math.atan2(tip[0]-cx,cy-tip[1]))
    print(f'  {label}: {len(pts)} px creme ; POINTE a ({tip[0]},{tip[1]}) r={tip[2]:.1f} px = {tip[2]/scale:.2f} CSS = {tip[2]/R:.4f} R ; angle {ang:+.1f} deg (0=haut, + = droite)')
    return tip[2],ang
print('===== REFERENCE =====')
r=op(REF); RCX,RCY,RR=587.5,116.5,95.5
print(f'  CONTROLE POSITIF : R ref = {RR/REF_S:.2f} CSS (attendu 32,00) ecart {RR/REF_S-32:.2f}')
o=radial(r,RCX,RCY,RR,REF_S,'REF'); resume(o,RR,REF_S,'REF arc')
aiguille(r,RCX,RCY,RR,REF_S,'REF aiguille',(int(RCX-RR),int(RCY-RR),int(RCX+RR),int(RCY+RR)))
print('===== CAPTURE 2400 district =====')
c=op(C24); CCX,CCY,CR=539.5,130.0,110.5
print(f'  R capture = {CR/CAP_S:.2f} CSS')
o2=radial(c,CCX,CCY,CR,CAP_S,'CAP'); resume(o2,CR,CAP_S,'CAP arc')
aiguille(c,CCX,CCY,CR,CAP_S,'CAP aiguille',(int(CCX-CR),int(CCY-CR),int(CCX+CR),int(CCY)))
print('===== TEMOIN famille =====')
t=op(T24); TCX,TCY,TR=539.5,105.0,93.5
o3=radial(t,TCX,TCY,TR,CAP_S,'TEM'); resume(o3,TR,CAP_S,'TEMOIN arc')
