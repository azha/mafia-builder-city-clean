# -*- coding: utf-8 -*-
"""m37 - amplitude de la LUNETTE en RGB (et non en L*, qui exagere les ecarts sur fond sombre)
et PISTE NEUTRE dans l'interstice. Profil radial median sur 720 rayons, moitie HAUTE seulement
(la moitie basse porte les deux libelles)."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
ANC=json.load(open('ancres.json'))
def ech(im,f,x,y):
    px=im.load(); W,H=im.size
    X,Y=x*f,y*f; x0,y0=int(X),int(Y); dx,dy=X-x0,Y-y0
    def g(a,b):
        a=min(max(a,0),W-1); b=min(max(b,0),H-1); return px[a,b]
    c00,c10,c01,c11=g(x0,y0),g(x0+1,y0),g(x0,y0+1),g(x0+1,y0+1)
    return tuple((1-dx)*(1-dy)*c00[k]+dx*(1-dy)*c10[k]+(1-dx)*dy*c01[k]+dx*dy*c11[k] for k in range(3))
print("=== m37 ===\n-- LUNETTE : profil radial RGB (moitie haute, 360 rayons de 10 a 170 deg)")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle); a=ANC[cle]; R=a['r_nom_ext']
    pr=[]
    for k in range(int(0.62*R*20), int(0.99*R*20)+1):
        r=k/20.0; V=[]
        for j in range(360):
            th=math.radians(10+160.0*j/360)
            V.append(ech(im,f,a['cx']+r*math.cos(th), a['cy']-r*math.sin(th)))
        pr.append((r/R, tuple(mediane([v[i] for v in V]) for i in range(3))))
    print("   %-6s : %s"%(cle," ".join("%.3f:(%.0f,%.0f,%.0f)"%(u,c[0],c[1],c[2]) for u,c in pr[::6])))
    zone=[(u,c) for u,c in pr if 0.70<=u<=0.92]
    i=max(range(len(zone)),key=lambda k:sum(zone[k][1]))
    creux_av=min(range(0,max(1,i)),key=lambda k:sum(zone[k][1])) if i>0 else i
    creux_ap=min(range(i+1,len(zone)),key=lambda k:sum(zone[k][1])) if i+1<len(zone) else i
    pic=zone[i][1]; av=zone[creux_av][1]; ap=zone[creux_ap][1]
    amp=tuple(pic[k]-max(av[k],ap[k]) for k in range(3))
    print("            max local a u=%.3f : %s ; creux avant %s (u=%.3f) apres %s (u=%.3f) ; AMPLITUDE RGB %s"
          %(zone[i][0],tuple(round(v) for v in pic),tuple(round(v) for v in av),zone[creux_av][0],
            tuple(round(v) for v in ap),zone[creux_ap][0],tuple(round(v,1) for v in amp)))
print("\n-- PISTE NEUTRE dans l'interstice (bissectrice du vide, rayon de la bande des arcs)")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle,taire=True); a=ANC[cle]
    bis={'canon':(48.5+88.5)/2,'j1920':(57.5+91.5)/2,'j2400':(58.0+91.5)/2}[cle]
    # rayon de la bande des arcs, mesure a 30 deg (braise) et 130 deg (teal)
    for nom,ang in [('bissectrice',bis),('sur le braise (30 deg)',30.0),('sur le teal (130 deg)',130.0)]:
        pr=[(r/10.0, ech(im,f,a['cx']+r/10.0*math.cos(math.radians(ang)), a['cy']-r/10.0*math.sin(math.radians(ang)))) for r in range(80,230)]
        Ls=[(r,L(c)) for r,c in pr]
        base=mediane([v for r,v in Ls if 8<=r<=10])
        mx=max(Ls[20:],key=lambda t:t[1])
        print("   %-6s %-22s : L fond(r 8..10)=%.1f ; MAX=%.1f a r=%.1f => bosse %+.1f L"%(cle,nom,base,mx[1],mx[0],mx[1]-base))
