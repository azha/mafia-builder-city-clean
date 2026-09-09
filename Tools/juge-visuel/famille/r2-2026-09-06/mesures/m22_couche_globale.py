# m22 — COUCHE GLOBALE : palette quantifiee, luminance moyenne, densite d'encre, contrastes.
# Chaque cote est borne du HAUT DE FEUILLE au BAS DE LA BOITE "Recruter" (meme contenu, hauteur reelle).
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
from PIL import Image
R,C=charger()
ZONE={'REF':(0.0,906.0),'JEU':(0.0,943.0)}
for S in (R,C):
    y0,y1=ZONE[S['nom']]
    a=P(S,0,y0); b=P(S,560,y1)
    sub=S['im'].crop((int(a[0]),int(a[1]),int(b[0]),int(b[1])))
    px=sub.load(); W,H=sub.size
    tot=0.0; n=0; encre=0
    fond=(22,25,27) if S['nom']=='REF' else (22,22,28)
    for y in range(0,H,2):
        for x in range(0,W,2):
            c=px[x,y]; tot+=lum(c); n+=1
            if abs(c[0]-fond[0])+abs(c[1]-fond[1])+abs(c[2]-fond[2])>40: encre+=1
    print(f'\n===== {S["nom"]} — zone {W}x{H} px ({560:.0f}x{y1-y0:.0f} CSS) =====')
    print(f'  luminance moyenne {tot/n:.2f}/255 · densite d\'encre (L1>40 du fond) {100*encre/n:.2f} %')
    q=sub.quantize(colors=6, method=Image.MEDIANCUT).convert('RGB')
    cols=sorted(q.getcolors(20000), reverse=True)
    for cnt,col in cols[:6]:
        print(f'    {100*cnt/(W*H):5.2f} %  {col}')
print('\n===== CONTRASTES (texte / fond local) =====')
def txt(S,x0,y0,x1,y1,test,fx0,fy0,fx1,fy1,nom):
    im=S['im'].load(); a=P(S,x0,y0); b=P(S,x1,y1); vals=[]
    for y in range(int(a[1]),int(b[1])):
        for x in range(int(a[0]),int(b[0])):
            c=im[x,y]
            if test(c): vals.append(c)
    vals.sort(key=lambda c:-sum(c)); v=vals[len(vals)//8]   # coeur du trait
    f=mediane(S,fx0,fy0,fx1,fy1)
    print(f'  {S["nom"]} {nom:26s} encre {v} fond {f} -> {contraste(v,f):.2f}:1')
    return contraste(v,f)
orvif=lambda c: c[0]>170 and c[0]-c[2]>60
creme=lambda c: c[0]>170 and c[1]>160 and c[2]>130
cyan =lambda c: c[2]>140 and c[2]-c[0]>40
cr2  =lambda c: 130<c[0]<225 and c[1]>115 and 10<c[0]-c[2]<70
for S,off in ((R,0.0),(C,0.0)):
    d = 0.0 if S['nom']=='REF' else 0.0
    T = {'REF':dict(titre=(38,57),sous=(79,91),nom=(656.5,674),puce=(687,701),etatv=(661.5,678),etatl=(685,699),vide=(395,416)),
         'JEU':dict(titre=(33.5,51.6),sous=(72.9,85.6),nom=(289.8,306.9),puce=(323.3,338.8),etatv=(297.3,317),etatl=(315.9,333.5),vide=(405.8,427))}[S['nom']]
    txt(S,95,T['titre'][0],320,T['titre'][1],orvif,320,T['titre'][0],420,T['titre'][1],'titre "LA FAMILLE"')
    txt(S,95,T['sous'][0],270,T['sous'][1],cr2,320,T['sous'][0],420,T['sous'][1],'sous-titre')
    txt(S,150,T['nom'][0],290,T['nom'][1],creme,300,T['nom'][0],380,T['nom'][1],'nom de rang')
    txt(S,160,T['puce'][0],245,T['puce'][1],cyan,300,T['puce'][0],380,T['puce'][1],'texte de puce (cyan)')
    txt(S,400,T['etatv'][0],530,T['etatv'][1],creme,330,T['etatv'][0],390,T['etatv'][1],'valeur d\'etat')
    txt(S,470,T['etatl'][0],525,T['etatl'][1],cr2,330,T['etatl'][0],390,T['etatl'][1],'libelle d\'etat')
    txt(S,190,T['vide'][0],450,T['vide'][1],cr2,120,T['vide'][0],170,T['vide'][1],'texte de boite vide')
    print()
