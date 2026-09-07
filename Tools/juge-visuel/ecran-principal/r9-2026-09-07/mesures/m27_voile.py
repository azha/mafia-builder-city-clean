# m27 — VOILE DU BANDEAU : le meme art est visible NU a 2400 (decale de +240 px) et VOILE a 1920.
# On regresse mesure = (1-a)*dessous + a*V, en sRGB et en LINEAIRE, et on compare a la CSS du canon.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m27 voile du bandeau : alpha et couleur effectifs ===')
i19=ouvrir(F1920,'fiche 1920 (bandeau SUR l art)'); p19=i19.load()
i24=ouvrir(F2400,'fiche 2400 (meme art, nu, +240 px)'); p24=i24.load()

# 1) PREMISSE : l'art est-il le meme, decale de 240 ?
same=0; tot=0
for y in range(400, 1500, 7):
    for x in range(0, 1080, 11):
        tot+=1
        if dist_rgb(p19[x,y], p24[x,y+240])<=2: same+=1
print('   premisse : art identique a +240 px sur %d echantillons hors bandeau -> %.2f %% a <=2/255' % (tot, 100.0*same/tot))

# 2) paires (dessous, voile) dans la zone du bandeau, colonnes sans texte ni medaillon
paires=[]
for y in range(27, 140):
    for x in range(640, 900):
        paires.append((p24[x,y+240], p19[x,y]))
print('   %d paires collectees (x 640..899 px, y 27..139 px)' % len(paires))
print('   dessous : min/med/max luminance = %.4f / %.4f / %.4f' %
      (min(lum(a) for a,_ in paires), med([lum(a) for a,_ in paires]), max(lum(a) for a,_ in paires)))

def regress(pairs, espace):
    out=[]
    for k in range(3):
        if espace=='srgb':
            X=[a[k] for a,b in pairs]; Y=[b[k] for a,b in pairs]
        else:
            X=[srgb_vers_lin(a[k]) for a,b in pairs]; Y=[srgb_vers_lin(b[k]) for a,b in pairs]
        n=len(X); mx=sum(X)/n; my=sum(Y)/n
        sxy=sum((X[i]-mx)*(Y[i]-my) for i in range(n)); sxx=sum((X[i]-mx)**2 for i in range(n))
        p=sxy/sxx if sxx>0 else 0
        q=my-p*mx
        a=1-p; V=(q/a) if a>1e-6 else float('nan')
        resid=med([abs(Y[i]-(p*X[i]+q)) for i in range(n)])
        out.append((a,V,resid))
    return out

for espace in ('srgb','lineaire'):
    r=regress(paires, espace)
    if espace=='srgb':
        print('   REGRESSION sRGB      : alpha = %.3f / %.3f / %.3f ; couleur du voile = (%.1f, %.1f, %.1f) ; residu med %.2f/%.2f/%.2f (0..255)'
              % (r[0][0],r[1][0],r[2][0], r[0][1],r[1][1],r[2][1], r[0][2],r[1][2],r[2][2]))
    else:
        print('   REGRESSION LINEAIRE  : alpha = %.3f / %.3f / %.3f ; couleur du voile = (%.1f, %.1f, %.1f) sRGB ; residu med %.4f/%.4f/%.4f (0..1 lin)'
              % (r[0][0],r[1][0],r[2][0], lin_vers_srgb(r[0][1]),lin_vers_srgb(r[1][1]),lin_vers_srgb(r[2][1]),
                 r[0][2],r[1][2],r[2][2]))

# 3) comparaison au CANON : que produirait la CSS (#0b111be8 -> #0d131ed8) sur le MEME art ?
def veil_css(y):
    t=(y+0.5)/143.0
    c0=hexa('#0b111b'); a0=0xe8/255.0
    c1=hexa('#0d131e'); a1=0xd8/255.0
    return tuple(c0[i]+(c1[i]-c0[i])*t for i in range(3)), a0+(a1-a0)*t
ecarts_s=[]; ecarts_l=[]; ecarts_mes=[]
for y in range(27,140):
    V,a = veil_css(y)
    for x in range(640,900,3):
        u=p24[x,y+240]; m=p19[x,y]
        ps=melange_srgb(V,a,u); pl=melange_lineaire(V,a,u)
        ecarts_s.append(max(abs(ps[i]-m[i]) for i in range(3)))
        ecarts_l.append(max(abs(pl[i]-m[i]) for i in range(3)))
        ecarts_mes.append((lum(m)-lum(ps)))
print('   CONTRE LA CSS DU CANON (meme art) : ecart median |mesure - prediction sRGB|      = %.1f /255' % med(ecarts_s))
print('                                        ecart median |mesure - prediction LINEAIRE| = %.1f /255' % med(ecarts_l))
# clarte
Lm=[]; Ls=[]; Ll=[]
for y in range(27,140,2):
    V,a=veil_css(y)
    for x in range(640,900,5):
        u=p24[x,y+240]; m=p19[x,y]
        Lm.append(L(m)); Ls.append(L(melange_srgb(V,a,u))); Ll.append(L(melange_lineaire(V,a,u)))
print('   clarte L* : mesure %.1f ; prediction sRGB (canon) %.1f ; prediction lineaire %.1f  -> ecart mesure-sRGB %+.1f L*'
      % (med(Lm), med(Ls), med(Ll), med(Lm)-med(Ls)))
