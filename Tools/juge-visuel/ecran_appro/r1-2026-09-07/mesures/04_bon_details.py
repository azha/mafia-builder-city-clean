# -*- coding: utf-8 -*-
"""Le BON DE COMMANDE : bbox exacte, filets pointilles inter-lignes, bande perforee du bas.
CONTROLE POSITIF : sur la REFERENCE la sonde DOIT trouver 4 filets pointilles et 1 bande perforee
                   (la CSS les declare : .bon .l{border-top:1px dotted #c3b79e} x4 ; .bon::after height:5px).
CONTROLE NEGATIF : la meme sonde, lancee sur une bande de papier NUE (y 660..690 ref), DOIT rendre 0 filet."""
from PIL import Image
def med(v): v=sorted(v); return v[len(v)//2]

def bbox_papier(path):
    im=Image.open(path).convert("RGB"); W,H=im.size
    print("OUVERT %s taille=%dx%d"%(path,W,H)); px=im.load()
    def pap(p): return p[0]>170 and p[1]>160 and p[2]>135
    ys=[y for y in range(H) if sum(1 for x in range(0,W,3) if pap(px[x,y]))>W//6]
    y0,y1=min(ys),max(ys)
    ym=(y0+y1)//2
    xs=[x for x in range(W) if pap(px[x,ym])]
    return im,px,W,H,min(xs),y0,max(xs),y1

def filets(px,x0,x1,y0,y1,fondref):
    """une ligne est un FILET si sa mediane sur [x0..x1] s'ecarte du papier de >12/255 sur >=1 canal
       ET si le motif est POINTILLE (alternance horizontale) ou PLEIN."""
    out=[]
    for y in range(y0,y1+1):
        row=[px[x,y] for x in range(x0,x1+1)]
        m=(med([p[0] for p in row]),med([p[1] for p in row]),med([p[2] for p in row]))
        d=max(abs(m[i]-fondref[i]) for i in range(3))
        # part de pixels "sombres" (encre) sur la ligne
        sombre=sum(1 for p in row if p[0]<fondref[0]-25)/len(row)
        if d>=12 or sombre>0.35:
            # compte des transitions clair/sombre -> pointille si beaucoup
            seuil=fondref[0]-18; s=[1 if p[0]<seuil else 0 for p in row]
            tr=sum(1 for i in range(1,len(s)) if s[i]!=s[i-1])
            out.append((y,m,round(sombre,3),tr))
    return out

for path,fond in (("../reference-1080x2102.png",(239,231,214)),("../capture-1080x2400.png",(234,224,200))):
    im,px,W,H,X0,Y0,X1,Y1=bbox_papier(path)
    print("  BON bbox = x %d..%d (larg %d)  y %d..%d (haut %d)"%(X0,X1,X1-X0+1,Y0,Y1,Y1-Y0+1))
    print("  marges laterales : gauche=%d droite=%d"%(X0, W-1-X1))
    # zone interieure hors 20px de bord
    f=filets(px,X0+30,X1-30,Y0+2,Y1-2,fond)
    # regrouper en bandes contigues
    bandes=[];cur=None
    for y,m,s,tr in f:
        if cur and y==cur[1]+1: cur=(cur[0],y,cur[2]+[(m,s,tr)])
        else:
            if cur: bandes.append(cur)
            cur=(y,y,[(m,s,tr)])
    if cur: bandes.append(cur)
    print("  bandes non-papier DANS le bon (y0,y1,h) + transitions moy :")
    for b in bandes:
        tr=sum(t[2] for t in b[2])/len(b[2]); sm=sum(t[1] for t in b[2])/len(b[2])
        print("    y=%4d..%4d h=%2d  encre=%.2f  transitions=%.0f  med=%s"%(b[0],b[1],b[1]-b[0]+1,sm,tr,b[2][len(b[2])//2][0]))
    print()

print("CONTROLE NEGATIF (bande de papier nue, ref y 660..690, x 200..800) :")
im=Image.open("../reference-1080x2102.png").convert("RGB"); px=im.load()
print("  ",filets(px,200,800,660,690,(239,231,214)) or "AUCUN filet -> la sonde ne fabrique pas de faux positif")
