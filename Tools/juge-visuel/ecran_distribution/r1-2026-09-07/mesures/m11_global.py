#!/usr/bin/env python3
# m11 — couche GLOBALE : palette dominante, luminance, densite d'encre, contrastes,
#       forme du medaillon d'avatar, dock, et interlettrage des petites capitales.
# Controle positif : sur la REFERENCE le medaillon .av est un CERCLE de 34 CSS
#       (=122 px) -> le test de rondeur doit le declarer ROND ; sur un rectangle
#       connu (une rangee de la capture) il doit le declarer CARRE.
from PIL import Image
import os, math
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = Image.open(os.path.join(D,"reference-1080x2102.png")).convert('RGB')
CAP = Image.open(os.path.join(D,"capture-1080x2400.png")).convert('RGB')
print("OUVERT reference =", REF.size, " capture =", CAP.size)
def L(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def lin(v):
    v/=255.0
    return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
def Lrel(c): return 0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2])
def contraste(a,b):
    la,lb=Lrel(a),Lrel(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)

print("\n--- PALETTE DOMINANTE de la zone de CONTENU (quantification 32 niveaux) ---")
def palette(im, y0,y1, nom, n=6):
    px=im.load(); W,_=im.size; h={}
    tot=0
    for y in range(y0,y1,2):
        for x in range(2,W-2,2):
            c=px[x,y]; k=(c[0]//32,c[1]//32,c[2]//32)
            h[k]=h.get(k,0)+1; tot+=1
    print(f"  {nom} (n={tot}) :")
    for k,v in sorted(h.items(), key=lambda t:-t[1])[:n]:
        print(f"    {'#%02x%02x%02x'%(k[0]*32+16,k[1]*32+16,k[2]*32+16)}  {100*v/tot:5.1f} %")
palette(REF, 434,2102, "REFERENCE contenu (434..2102)")
palette(CAP, 143,2126, "CAPTURE   contenu (143..2126)")

print("\n--- LUMINANCE MOYENNE et DENSITE d'encre ---")
def stats(im,y0,y1,nom,seuil_encre=60):
    px=im.load(); W,_=im.size; v=[]
    for y in range(y0,y1,2):
        for x in range(2,W-2,2): v.append(L(px[x,y]))
    m=sum(v)/len(v)
    enc=sum(1 for t in v if t>=seuil_encre)/len(v)
    print(f"  {nom} : L moyenne = {m:6.2f} ; part de pixels L>=60 (\"encre/matiere\") = {100*enc:5.1f} %")
stats(REF,434,2102,"REFERENCE contenu")
stats(CAP,143,2126,"CAPTURE   contenu")

print("\n--- CONTRASTES des textes principaux (mesures sur l'image, pas un gris choisi) ---")
def ctr(im,tx,ty,fx,fy,nom):
    px=im.load(); t=px[tx,ty]; f=px[fx,fy]
    print(f"  {nom:44s} encre={t} #%02x%02x%02x  fond={f} #%02x%02x%02x  contraste={contraste(t,f):5.2f}:1"%(t+f))
ctr(REF, 60,495, 400,470, "REF titre #f0dfc4 sur #20180f")
ctr(CAP, 66,320, 400,250, "CAP titre sur fond de contenu")
ctr(REF, 57,552, 400,530, "REF sous-titre #9a8a6a sur #20180f")
ctr(CAP, 66,415, 400,380, "CAP sous-titre sur fond de contenu")
ctr(REF, 60,1483, 400,1450, "REF .lecture u #9a8a6a sur #1a1108")
ctr(CAP, 66,992, 400,955, "CAP .lecture u sur fond")
ctr(REF, 97,1988, 400,1990, "REF .geste texte or sur #241c11")
ctr(CAP,121,1970, 400,1970, "CAP CTA texte sombre sur or")
ctr(CAP,800,1130, 400,1130, "CAP 'tient' (vert) sur fond")
ctr(REF,1010,1613, 400,1613, "REF ligne 3 valeur sur #1a1108")

print("\n--- MEDAILLON DU LIEUTENANT : rond ou carre ? ---")
def rondeur(im, x0,y0,x1,y1, fond, nom):
    """part des px de la boite qui appartiennent a la forme ; un disque inscrit = 78,5 %"""
    px=im.load(); n=0; tot=0; xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]; tot+=1
            if abs(c[0]-fond[0])+abs(c[1]-fond[1])+abs(c[2]-fond[2])>10:
                n+=1; xs.append(x); ys.append(y)
    if not xs: print(f"  {nom} : rien"); return
    bb=(min(xs),min(ys),max(xs),max(ys)); w=bb[2]-bb[0]+1; h=bb[3]-bb[1]+1
    taux=n/(w*h)
    forme = "ROND (disque ~0,785)" if taux<0.86 else "CARRE (~1,00)"
    print(f"  {nom} : bbox={bb} {w}x{h} px = {w/3.6:.1f}x{h/3.6:.1f} CSS ; remplissage de la bbox = {taux:.3f} -> {forme}")
rondeur(REF, 130,1700, 270,1840, (20,26,33), "REF .av (attendu ROND, 34 CSS)")
rondeur(CAP,  40,1700, 180,1840, (13,13,13), "CAP medaillon du lieutenant")
rondeur(CAP,  50,1250, 200,1345, (13,13,13), "CTRL- CAP rangee courrier (attendu CARRE)")

print("\n--- INTERLETTRAGE des petites capitales (.lecture u, letter-spacing .9px CSS attendu) ---")
def lettres(im,x0,y0,x1,y1,seuil,nom):
    """colonnes d'encre -> largeur de chaque lettre et des blancs"""
    px=im.load(); col=[]
    for x in range(x0,x1):
        n=sum(1 for y in range(y0,y1) if L(px[x,y])>=seuil)
        col.append((x,n>0))
    runs=[]; cur=None
    for x,on in col:
        if cur is None or cur[2]!=on: 
            if cur: runs.append(tuple(cur))
            cur=[x,x,on]
        else: cur[1]=x
    if cur: runs.append(tuple(cur))
    lettres=[(a,b) for a,b,on in runs if on]
    blancs=[(a,b) for a,b,on in runs if not on][1:-1] if len(runs)>2 else []
    print(f"  {nom} : {len(lettres)} traits ; largeurs={[b-a+1 for a,b in lettres]}")
    print(f"      blancs entre traits = {[b-a+1 for a,b in blancs]}")
lettres(REF, 45,1475,215,1495, 90, "REF 'LE CHEMIN'")
lettres(CAP, 45, 983,215,1005, 90, "CAP 'LE CHEMIN'")

print("\n--- DOCK : ou commence-t-il ? (4 ronds attendus) ---")
def ronds(im, y):
    px=im.load(); on=[x for x in range(40,1040) if px[x,y][2]>px[x,y][0]+5 and px[x,y][2]>26]
    if not on: return 0,[]
    grp=[[on[0]]]
    for x in on[1:]:
        if x-grp[-1][-1]<=6: grp[-1].append(x)
        else: grp.append([x])
    return len(grp), [(g[0],g[-1]) for g in grp]
for y in (2100,2130,2160,2200,2240,2280,2320):
    n,g = ronds(CAP,y)
    print(f"    y={y} : {n} groupe(s) bleutes {g[:6]}")
