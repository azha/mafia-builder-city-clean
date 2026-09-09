# m07 — couche globale : profil de fond, palette quantifiee, densite d'encre, contrastes
# Controle positif : le contraste REF titre #f2c96b sur #0c121c doit valoir la formule WCAG (recalcul direct)
# Controle negatif : contraste d'une couleur avec elle-meme = 1,00
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/r1-2026-09-06/"
ref=Image.open(D+"reference-1080x2102.png").convert("RGB"); pr=ref.load(); print("REF",ref.size)
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); pc=cap.load(); print("CAP",cap.size)
def rl(c):
    c=c/255.0
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def Y(p): return 0.2126*rl(p[0])+0.7152*rl(p[1])+0.0722*rl(p[2])
def ratio(a,b):
    ya,yb=Y(a),Y(b)
    if ya<yb: ya,yb=yb,ya
    return (ya+0.05)/(yb+0.05)
def med(px,x,y,w=11,h=7):
    vs=[[],[],[]]
    for dx in range(-w//2,w//2+1):
        for dy in range(-h//2,h//2+1):
            p=px[x+dx,y+dy]
            for i in range(3): vs[i].append(p[i])
    return tuple(sorted(v)[len(v)//2] for v in vs)
def hx(c): return "#%02x%02x%02x"%c

print("\n### PROFIL DU FOND DE PAGE (mediane a x=540, dans les inter-boites / le vide)")
print(" REF (bln6, hors boites) :")
for y in (445,470,666,810,1615,1885,2010,2065,2090): print("   y=%4d %s"%(y,hx(med(pr,540,y))))
print(" CAP (fond de page) :")
for y in (160,250,440,700,1000,1400,1700,2140,2380): print("   y=%4d %s"%(y,hx(med(pc,540,y))))

print("\n### PALETTE (quantifiee 16 couleurs, zone CONTENU seulement)")
def palette(im,box,tag):
    z=im.crop(box); n=z.size[0]*z.size[1]
    q=z.quantize(colors=10,method=Image.MEDIANCUT).convert("RGB")
    cnt=q.getcolors(200000)
    cnt.sort(reverse=True)
    print("  %s  zone=%s  aire=%d px"%(tag,box,n))
    for c,col in cnt[:8]: print("     %6.2f%%  %s"%(100.0*c/n,hx(col)))
palette(ref,(3,434,1077,2096),"REFERENCE (bln6)")
palette(cap,(0,143,1080,2160),"CAPTURE (entre bandeau et dock)")

print("\n### DENSITE D'ENCRE (part de l'aire dont la luminance depasse le fond+8)")
def densite(px,box,fond,tag):
    x0,y0,x1,y1=box; n=0; tot=0
    for y in range(y0,y1,2):
        for x in range(x0,x1,2):
            tot+=1
            p=px[x,y]
            if max(abs(p[i]-fond[i]) for i in range(3))>8: n+=1
    print("  %-34s %6.2f%%  (%d/%d, pas de 2)"%(tag,100.0*n/tot,n,tot))
densite(pr,(3,434,1077,2096),(19,24,32),"REFERENCE (bln6) vs fond moyen")
densite(pc,(0,143,1080,2160),(13,13,13),"CAPTURE (contenu) vs fond noir")

print("\n### CONTRASTES")
def ctr(px,tag,tx,ty,fx,fy,seuil):
    # couleur du texte = pixel le plus lumineux ; fond = mediane
    best=None;bl=-1
    for x in range(tx[0],tx[1]):
        for y in range(ty[0],ty[1]):
            p=px[x,y]; l=0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
            if l>bl: bl=l;best=p
    f=med(px,fx,fy)
    r=ratio(best,f)
    print("  %-34s texte %s sur fond %s = %5.2f:1  (seuil %s) %s"%(tag,hx(best),hx(f),r,seuil,"OK" if r>=seuil else "SOUS LE SEUIL"))
    return r
r1=ctr(pr,"REF titre",(326,740),(505,565),150,530,3.0)
ctr(pc,"CAP titre",(344,735),(296,342),150,300,3.0)
ctr(pr,"REF sous-titre",(283,787),(583,612),150,600,4.5)
ctr(pc,"CAP sous-titre",(302,779),(369,398),150,383,4.5)
ctr(pr,"REF libelle compteur",(157,251),(755,777),100,765,4.5)
ctr(pc,"CAP libelle compteur",(127,229),(543,565),80,553,4.5)
ctr(pr,"REF pann corps",(430,1000),(1795,1825),150,1810,4.5)
ctr(pc,"CAP pann corps",(80,1000),(1930,1990),150,1960,4.5)
print("\n### CONTROLES")
print("  CTRL+ recalcul WCAG #f2c96b sur #0c121c = %.2f (doit egaler la ligne 'REF titre' %.2f)"%(ratio((242,201,107),(12,18,28)),r1))
print("  CTRL- ratio d'une couleur avec elle-meme = %.2f (doit valoir 1,00)"%ratio((242,201,107),(242,201,107)))
