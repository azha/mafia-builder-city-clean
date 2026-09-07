# m31 : contrastes, tuiles, CTA, marges, bords non coupes, couche globale.
import sys; sys.path.insert(0,'.')
from lib import *
IMS={n:ouvrir(n) for n in ('reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png')}
PX={n:IMS[n].load() for n in IMS}
R,A,B='reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png'

print("\n== A. contrastes texte/fond (coeur du trait vs mediane du fond a >=6 px) ==")
def contraste_texte(px,xs,ys,fx,fy):
    best=None
    for y in ys:
        for x in xs:
            c=px[x,y]
            if best is None or lum(c)>lum(best): best=c
    fond=mediane_fenetre(px,fx,fy,4)
    return best,fond,contraste(best,fond)
CT=[("titre 'Le miroir'", {R:(range(320,760),range(510,565),120,495), A:(range(320,760),range(542,596),120,525), B:(range(320,760),range(310,364),120,292)}),
    ("sous-titre",         {R:(range(140,940),range(586,610),120,495), A:(range(130,950),range(620,648),120,525), B:(range(130,950),range(388,416),120,292)}),
    ("titre du panneau bas",{R:(range(85,900),range(1720,1762),900,1680), A:(range(80,900),range(1655,1697),900,1615), B:(range(80,900),range(1422,1465),900,1382)}),
    ("libelle du CTA",     {R:(range(225,860),range(1982,2012),120,2000), A:(range(190,880),range(1910,1940),120,1927)}),
    ("chiffre du compteur",{R:(range(165,245),range(720,766),320,760), A:(range(168,240),range(744,790),320,780), B:(range(168,240),range(512,558),320,548)}),
    ("libelle du compteur",{R:(range(80,330),range(778,800),320,760), A:(range(70,320),range(804,828),320,780), B:(range(70,320),range(570,596),320,548)}),
    ("titre de tuile",     {R:(range(615,1000),range(1022,1048),950,1005), A:(range(610,1000),range(1016,1042),950,1000), B:(range(610,990),range(784,810),950,768)}),
    ("sous-libelle tuile", {R:(range(615,1000),range(1056,1078),950,1005), A:(range(610,1000),range(1048,1074),950,1000), B:(range(610,990),range(816,842),950,768)}),
   ]
for lab,z in CT:
    out=[]
    for tag,f in (('ref',R),('2400',A),('1920',B)):
        if f not in z: out.append("%s=—"%tag); continue
        xs,ys,fx,fy=z[f]
        c,fo,k=contraste_texte(PX[f],xs,ys,fx,fy)
        out.append("%s=%.2f:1 (%s sur %s)"%(tag,k,c,fo))
    print("   %-22s %s" % (lab," | ".join(out)))

print("\n== B. tuiles : hauteur, pas, marges ==")
def tuiles(px, ya,yb, xs=1020):
    col=[(y,lum(px[xs,y])) for y in range(ya,yb)]
    f=mediane([v for _,v in col])
    m=[y for y,v in col if v-f>1.5]
    g=[]
    for y in m:
        if g and y-g[-1][-1]<=3: g[-1].append(y)
        else: g.append([y])
    return [(a[0],a[-1]) for a in g]
print("   ref  (x=990) :", tuiles(PX[R],1000,1400,990))
print("   2400 (x=990) :", tuiles(PX[A],995,1400,990))
print("   1920 (x=990) :", tuiles(PX[B],763,1200,990))

print("\n== C. marges d'ecran et hors-tout du cadre ==")
for tag,f,rail in (('ref',R,(21,1058)),('2400',A,(18,1061)),('1920',B,(18,1061))):
    print("   %-5s rails du cadre x=%d..%d ; marge gauche=%d px ; marge droite=%d px ; hors-tout=%d px"
          % (tag,rail[0],rail[1],rail[0],1079-rail[1],rail[1]-rail[0]+1))

print("\n== D. rien de coupe : encre sur les 4 rangees/colonnes de bord ==")
for tag,f in (('ref',R),('2400',A),('1920',B)):
    im=IMS[f]; px=PX[f]; W,H=im.size
    def encre_bord(pixels):
        m=mediane([lum(c) for c in pixels])
        return sum(1 for c in pixels if abs(lum(c)-m)>10)
    haut=[px[x,0] for x in range(W)]; bas=[px[x,H-1] for x in range(W)]
    gau=[px[0,y] for y in range(H)]; dro=[px[W-1,y] for y in range(H)]
    print("   %-5s haut=%d  bas=%d  gauche=%d  droite=%d  (px s'ecartant de la mediane du bord)" % (tag,encre_bord(haut),encre_bord(bas),encre_bord(gau),encre_bord(dro)))

print("\n== E. couche globale du CADRE (luminance moyenne, densite d'encre, palette) ==")
from collections import Counter
for tag,f,box in (('ref',R,(24,455,1056,2075)),('2400',A,(21,486,1058,2105)),('1920',B,(21,254,1058,1625))):
    px=PX[f]; x0,y0,x1,y1=box
    vals=[]; cnt=Counter()
    for y in range(y0,y1,3):
        for x in range(x0,x1,3):
            c=px[x,y]; vals.append(lum(c)); cnt[(c[0]//24,c[1]//24,c[2]//24)]+=1
    moy=sum(vals)/len(vals)
    fond=mediane(vals)
    dens=100.0*sum(1 for v in vals if v>fond+12)/len(vals)
    top=cnt.most_common(5)
    print("   %-5s L moyenne=%.2f  densite d'encre=%.2f %%  palette dominante=%s"
          % (tag,moy,dens, [("(%d,%d,%d)"%(k[0]*24+12,k[1]*24+12,k[2]*24+12), "%.1f%%"%(100.0*v/len(vals))) for k,v in top]))
