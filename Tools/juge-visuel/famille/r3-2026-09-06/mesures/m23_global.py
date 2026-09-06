# m23 — couche GLOBALE : palette dominante, luminance moyenne, densite d'encre (bornees au MEME
# contenu : haut de feuille -> bas de la boite Recruter), et GOUTTIERE (chrome haut / feuille / dock).
# Controle positif : le fond de feuille doit sortir 1re couleur des deux cotes.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
CX0,CY0,FC=13,232,1053/560.0; FR=2.0
def PX(v,o,f): return int(round(o+v*f))
def lum(p): return .2126*p[0]+.7152*p[1]+.0722*p[2]

def couche(nom,im,ox,oy,f,ybas):
    box=im.crop((PX(0,ox,f),PX(0,oy,f),PX(560,ox,f),PX(ybas,oy,f)))
    W,H=box.size; px=box.load()
    tot=W*H; s=0.0; enc=0
    q={} 
    for y in range(H):
        for x in range(W):
            p=px[x,y]; L=lum(p); s+=L
            if L>45: enc+=1
            k=(p[0]//8,p[1]//8,p[2]//8)
            q[k]=q.get(k,0)+1
    top=sorted(q.items(),key=lambda kv:-kv[1])[:5]
    print("  %s  taille %dx%d  luminance moyenne %.2f/255  densite d'encre (L>45) %.2f%%"%(nom,W,H,s/tot,100.*enc/tot))
    for k,n in top:
        print("      %5.1f%%  ~(%d,%d,%d)"%(100.*n/tot,k[0]*8+4,k[1]*8+4,k[2]*8+4))

print("\n== couche globale, bornee au meme contenu ==")
couche("REFERENCE (0..906 CSS)",ref,0,0,FR,906)
couche("JEU       (0..929 CSS)",cap,CX0,CY0,FC,929)

print("\n== GOUTTIERE (capture, px absolus) ==")
c=cap.load()
def derniere_ligne_encre(y0,y1,seuil=45):
    out=[]
    for y in range(y0,y1):
        n=sum(1 for x in range(0,1080) if lum(c[x,y])>seuil)
        if n>0: out.append((y,n))
    return out
h=derniere_ligne_encre(150,250)
print("  chrome haut : dernieres lignes avec de l'encre (L>45) avant la feuille :",
      [(y,n) for y,n in h if y>=200][:12])
b=derniere_ligne_encre(2140,2260)
print("  dock : premieres lignes avec de l'encre apres la feuille :", [(y,n) for y,n in b if y>=2150][:12])
print("  feuille (fond plat) : y 232..2151 (mesure m2)")
# la feuille recouvre-t-elle le chrome ?
print("  fond a y=228..234 (transition) :", [ (y,c[540,y]) for y in range(226,238) ])
print("  fond a y=2146..2158 :", [ (y,c[540,y]) for y in range(2144,2158) ])
