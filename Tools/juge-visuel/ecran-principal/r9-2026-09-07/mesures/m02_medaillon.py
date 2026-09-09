# m02 — medaillon : centre, diametre nominal, profil radial du cerclage (halo), teinte
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m02 medaillon : cerclage, diametre, halo ===')

def analyse(path, nom, sc, cx_hint, cy_hint, cible, rmax=140):
    im = ouvrir(path, nom); px = im.load(); W,H = im.size
    # 1) centroide des pixels proches de la couleur cible du cerclage
    best=[]
    for y in range(0, min(H,300)):
        for x in range(max(0,cx_hint-200), min(W,cx_hint+200)):
            c = px[x,y]
            if dist_rgb(c, cible) <= 26:
                best.append((x,y))
    if not best:
        print('   !! aucun pixel de cerclage trouve pres de', cible); return None
    cx = sum(p[0] for p in best)/len(best); cy = sum(p[1] for p in best)/len(best)
    print('   pixels de cerclage (dist<=26 de %s) : %d ; centroide (%.2f, %.2f) px = (%.2f, %.2f) CSS'
          % (str(cible), len(best), cx, cy, cx/sc, cy/sc))
    # 2) profil radial : mediane de (R-B) sur 720 rayons, pas 0,25 px
    prof = {}
    N=720
    rs = [i*0.25 for i in range(int(rmax/0.25))]
    for r in rs:
        vals=[]
        for k in range(N):
            a = 2*math.pi*k/N
            x = cx + r*math.cos(a); y = cy + r*math.sin(a)
            xi, yi = int(round(x)), int(round(y))
            if 0<=xi<W and 0<=yi<H:
                c = px[xi,yi]
                vals.append(c[0]-c[2])
        if vals: prof[r]=med(vals)
    return im, px, cx, cy, prof

print('\n-- CANON (cerclage laiton (176,141,62)) --')
rc = analyse(CANON, 'canon', SC_CANON, 588, 117, TOK['laiton'], rmax=150)
print('\n-- JEU district 2400 (cerclage braise (224,102,74)) --')
rj = analyse(DIST, 'district', SC_CAPT, 540, 110, TOK['braise'], rmax=140)
print('\n-- JEU fiche 1920 --')
rj2 = analyse(F1920, 'fiche1920', SC_CAPT, 540, 110, TOK['braise'], rmax=140)

def rapport(res, sc, nom):
    im, px, cx, cy, prof = res
    rs = sorted(prof)
    pic = max(prof.items(), key=lambda kv: kv[1])
    print('\n   [%s] profil (R-B) : maximum %.1f a r=%.2f px = %.2f CSS' % (nom, pic[1], pic[0], pic[0]/sc))
    # largeur a mi-hauteur, et retour a 10%
    top = pic[1]
    def croise(seuil, sens):
        # sens -1 : cote interieur ; +1 : exterieur
        r0 = pic[0]; last=None
        seq = [r for r in rs if (r<=r0 if sens<0 else r>=r0)]
        if sens<0: seq = seq[::-1]
        for r in seq:
            if prof[r] < seuil: return r
        return None
    for f,lab in [(0.5,'mi-hauteur'),(0.1,'10%')]:
        a = croise(top*f,-1); b = croise(top*f,+1)
        if a and b:
            print('      %s : r %.2f..%.2f px = %.2f..%.2f CSS ; epaisseur %.2f CSS ; Dnominal %.2f CSS'
                  % (lab, a,b, a/sc, b/sc, (b-a)/sc, 2*b/sc))
    # coeur/nominal comme au r8 : plateau
    print('      echantillon du profil (CSS, R-B) :', ', '.join('%.2f:%.0f'%(r/sc,prof[r]) for r in rs if r/sc>=(pic[0]/sc-4) and r/sc<=(pic[0]/sc+8) and abs((r/sc*4)%1)<1e-6))

rapport(rc, SC_CANON, 'canon')
rapport(rj, SC_CAPT, 'district2400')
rapport(rj2, SC_CAPT, 'fiche1920')
