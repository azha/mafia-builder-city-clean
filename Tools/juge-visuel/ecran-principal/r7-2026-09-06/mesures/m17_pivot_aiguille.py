# -- m17 : (a) diametre du pivot a mi-alpha ; (b) AIGUILLE : angle, longueur, epaisseur.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
C = {'ref':(195.840,38.837),'c19':(195.817,39.820)}
RH= {'ref':31.16,'c19':32.50}
PIV={'ref':(196.00,43.67),'c19':(196.00,45.19)}

def bil(im,s,xc,yc):
    x=xc*s; y=yc*s; x0=int(math.floor(x)); y0=int(math.floor(y)); fx=x-x0; fy=y-y0
    d=im.load(); W,H=im.size
    def g(a,b):
        a=min(max(a,0),W-1); b=min(max(b,0),H-1); return d[a,b]
    p00=g(x0,y0);p10=g(x0+1,y0);p01=g(x0,y0+1);p11=g(x0+1,y0+1)
    return tuple((p00[c]*(1-fx)*(1-fy)+p10[c]*fx*(1-fy)+p01[c]*(1-fx)*fy+p11[c]*fx*fy) for c in range(3))

print("=== PIVOT : coupes a mi-alpha (metrique R-B, base = fond du cadran) ===")
for key in ['ref','c19']:
    s=sc(key); im=img(key); px_,py_=PIV[key]
    for lbl,dx,dy in [("horizontale",1,0),("verticale",0,1)]:
        vals=[]; t=-5.0
        while t<=5.0:
            p=bil(im,s,px_+dx*t,py_+dy*t); vals.append((t,p[0]-p[2])); t+=0.02
        pk=max(vals,key=lambda v:v[1]); base=min(v for _,v in vals); half=(pk[1]+base)/2
        i=vals.index(pk); a=i
        while a>0 and vals[a-1][1]>=half: a-=1
        b=i
        while b<len(vals)-1 and vals[b+1][1]>=half: b+=1
        print("  %-4s %-11s : %.2f CSS (pic R−B=%.0f, base %.0f)"%(key,lbl,vals[b][0]-vals[a][0],pk[1],base))

print()
print("=== AIGUILLE : masque creme (234,224,200) sature, hors texte ===")
def aiguille(key, box):
    s=sc(key); im=img(key); d=im.load(); px_,py_=PIV[key]
    pts=[]
    for yp in range(int(box[1]*s),int(box[3]*s)):
        for xp in range(int(box[0]*s),int(box[2]*s)):
            p=d[xp,yp]
            if p[0]>190 and p[1]>185 and p[2]>160 and abs(p[0]-p[1])<25 and p[0]-p[2]<60:
                x=xp/s; y=yp/s
                r=math.hypot(x-px_,y-py_)
                if 1.5<r<26: pts.append((x,y,r,math.degrees(math.atan2(py_-y,x-px_))%360))
    return pts
for key,box in [('ref',(176,20,216,44)),('c19',(176,26,216,45))]:
    pts=aiguille(key,box)
    if not pts: print("  %s : aucun pixel"%key); continue
    pts.sort(key=lambda t:-t[2])
    far=pts[:12]
    ang=sorted(p[3] for p in far); 
    print("  %-4s n=%4d  ; 12 px les plus loin : r max %.2f CSS  angle median %.1f deg  (min %.1f max %.1f)"
          %(key,len(pts),far[0][2],ang[len(ang)//2],ang[0],ang[-1]))
    print("        longueur/R_boitier = %.3f"%(far[0][2]/RH[key]))
