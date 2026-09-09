# m6 — decoupes cote a cote, normalisees a la MEME echelle CSS (x2), pour la lecture a l'oeil.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M=os.path.join(D,'mesures')
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF',ref.size,'CAP',cap.size)
FR=2.0; FC=1053/560; CX,CY=13,232
def crop(im,f,ox,oy,x0,y0,x1,y1,ech=2.0):
    b=(int(ox+x0*f),int(oy+y0*f),int(ox+x1*f),int(oy+y1*f))
    c=im.crop(b)
    w=int((x1-x0)*ech); h=int((y1-y0)*ech)
    return c.resize((w,h),Image.LANCZOS)
def duo(nom,x0,y0,x1,y1,ech=2.0):
    a=crop(ref,FR,0,0,x0,y0,x1,y1,ech); b=crop(cap,FC,CX,CY,x0,y0,x1,y1,ech)
    W=max(a.width,b.width); H=a.height+b.height+12
    out=Image.new('RGB',(W,H),(255,0,255))
    out.paste(a,(0,0)); out.paste(b,(0,a.height+12))
    p=os.path.join(M,nom); out.save(p); print('ecrit',p,out.size,' (haut=REF, bas=JEU, meme echelle CSS)')
duo('z_tete.png',      0,0,   560,130)
duo('z_donrang.png',   0,130, 560,250)
duo('z_rang1.png',     0,250, 560,370)
duo('z_rang2.png',     0,450, 560,575)
duo('z_etat.png',    380,250, 560,370, 4.0)
duo('z_qui.png',      90,250, 400,370, 4.0)
