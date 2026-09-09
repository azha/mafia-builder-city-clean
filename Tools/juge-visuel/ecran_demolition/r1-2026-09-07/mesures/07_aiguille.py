# -*- coding: utf-8 -*-
"""Aiguille et spans angulaires des arcs, rayons bornes a 0.30..0.72 R (hors anneau, hors libelles).
Controle POSITIF : le canon (37 %, cadran froid a gauche) doit rendre une aiguille a GAUCHE du vertical.
Controle NEGATIF : si les deux rendent le meme signe, l'instrument ne discrimine pas."""
from PIL import Image
import math
C={"HUD":("hud-canon-1176.png",609.5,155.5,152.0),
   "CAP":("capture-1080x2400.png",539.5,109.5,90.5)}
teal =lambda p: p[1]>p[0]+18 and p[2]>p[0]+18 and p[1]>60
chaud=lambda p: p[0]>p[1]+28 and p[0]>p[2]+28 and p[0]>90
creme=lambda p: p[0]>190 and p[1]>185 and p[2]>160 and (p[0]-p[2])<70 and min(p)>150
for lab,(path,cx,cy,R) in C.items():
    im=Image.open(path).convert('RGB'); px=im.load(); print("OUVERT %s %s  centre=(%.1f,%.1f) R=%.1f"%(path,im.size,cx,cy,R))
    for nom,t in [("teal",teal),("chaud",chaud),("creme(aiguille)",creme)]:
        pts=[]
        for k in range(30,73):
            r=R*k/100.0
            for a in range(-100,101):
                th=math.radians(a)
                x=int(round(cx+r*math.sin(th))); y=int(round(cy-r*math.cos(th)))
                if y<cy+2 and t(px[x,y]): pts.append((a,r))
        if not pts: print("   %-16s : 0 px"%nom); continue
        angs=[a for a,r in pts]; rs=[r/R for a,r in pts]
        rs_s=sorted(rs)
        # angle du barycentre pondere par le rayon (pour l'aiguille : la pointe)
        loin=max(pts,key=lambda t2:t2[1])
        print("   %-16s : n=%4d  angles %+d..%+d  (median %+d)  r/R %.2f..%.2f  | pixel le + loin: angle %+d a r/R=%.2f"
              %(nom,len(pts),min(angs),max(angs),sorted(angs)[len(angs)//2],rs_s[int(.05*len(rs_s))],rs_s[int(.95*len(rs_s))],loin[0],loin[1]/R))
    print()
