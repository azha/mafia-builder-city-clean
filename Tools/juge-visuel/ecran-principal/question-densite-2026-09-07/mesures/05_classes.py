#!/usr/bin/env python3
"""05 - AIRES PAR CLASSE, par tiers, luminance par zone.
Frontieres du chrome : MESUREES par 04 (bandeau y<142 ; dock y>=1684).
EAU : regle de couleur, avec controle positif ET negatifs.
BATI / SOL NU : blocs 24x24 sur l'amplitude locale, seuil pris DANS l'ecart
mesure par 03 (positifs >=0.735, negatifs <=0.470) ; sensibilite imprimee."""
from PIL import Image, ImageFilter, ImageChops
import os
D = os.path.dirname(__file__)
im = Image.open(os.path.join(D,'..','capture-nuit-1080x1920.png')).convert('RGB')
W,H = im.size; p = im.load()
print("taille source : %d x %d = %d px" % (W,H,W*H))

Y_BANDEAU, Y_DOCK = 142, 1684
print("frontieres (mesurees par 04) : bandeau [0,%d)  scene [%d,%d)  dock [%d,%d)"
      % (Y_BANDEAU, Y_BANDEAU, Y_DOCK, Y_DOCK, H))
SCENE_N = W*(Y_DOCK-Y_BANDEAU)
print("aire scene = %d px (%.1f%% de l'image) ; bandeau %.1f%% ; dock %.1f%%"
      % (SCENE_N, 100*SCENE_N/(W*H), 100*W*Y_BANDEAU/(W*H), 100*W*(H-Y_DOCK)/(W*H)))

# ---------- amplitude locale ----------
L = im.convert('L')
amp = ImageChops.subtract(L.filter(ImageFilter.MaxFilter(9)), L.filter(ImageFilter.MinFilter(9)))
pa = amp.load()

# ---------- regle EAU + controles ----------
def is_eau(r,g,b): return (g-r) >= 30 and (b-r) >= 45
print("\n== CONTROLE DE LA REGLE 'EAU' (g-r>=30 et b-r>=45) ==")
ctrl = {
  "POSITIF eau plein":        ((150,1600,700,1690), True),
  "POSITIF eau pres du quai": ((700,1520,900,1600), True),
  "NEGATIF sol nu haut":      ((100, 300,400, 420), False),
  "NEGATIF quai dalle":       ((820,1360,1030,1450),False),
  "NEGATIF toit ardoise":     ((420, 430,560, 470), False),
  "NEGATIF facade eclairee":  ((470, 780,620, 860), False),
  "NEGATIF lointain sombre":  (( 60, 150,300, 220), False),
}
ok = True
for k,((x0,y0,x1,y1),att) in ctrl.items():
    n = (x1-x0)*(y1-y0)
    f = sum(1 for x in range(x0,x1) for y in range(y0,y1) if is_eau(*p[x,y]))/n
    verdict = "OK" if ((f>0.9) == att) else "ECHEC"
    print("  %-26s frac_eau=%.3f  attendu=%s  %s" % (k,f,"EAU" if att else "PAS EAU",verdict))
    ok = ok and ((f>0.9)==att)
print("  -> regle EAU %s" % ("VALIDEE" if ok else "REJETEE"))

# ---------- blocs bati / sol nu ----------
B = 24
def classe_blocs(seuil):
    bat = set()
    for by in range(Y_BANDEAU, Y_DOCK, B):
        for bx in range(0, W, B):
            n=0; h=0; eau=0
            for x in range(bx, min(bx+B,W)):
                for y in range(by, min(by+B,Y_DOCK)):
                    n+=1
                    if pa[x,y]>=12: h+=1
                    if is_eau(*p[x,y]): eau+=1
            if n and eau/n < 0.5 and h/n >= seuil: bat.add((bx,by))
    return bat

print("\n== CONTROLE DU CLASSIFIEUR DE BLOCS (seuil 0.60, pris dans l'ecart 0.470/0.735 de 03) ==")
bat = classe_blocs(0.60)
def frac_zone(x0,y0,x1,y1):
    tot=0; b=0
    for by in range(Y_BANDEAU, Y_DOCK, B):
        for bx in range(0, W, B):
            if bx>=x0 and bx+B<=x1 and by>=y0 and by+B<=y1:
                tot+=1
                if (bx,by) in bat: b+=1
    return (b/tot if tot else float('nan')), tot
for k,(z,att) in {
  "POSITIF tour gauche":     ((230,470,350,640), True),
  "POSITIF immeuble central":((400,420,580,610), True),
  "POSITIF usine":           ((470,1180,790,1300),True),
  "NEGATIF sol nu haut":     ((100,300,400,420), False),
  "NEGATIF bord d'ombre":    ((700,200,1000,290),False),
  "NEGATIF eau":             ((150,1600,700,1684),False),
  "NEGATIF quai dalle":      ((820,1360,1030,1450),False),
}.items():
    f,t = frac_zone(*z)
    v = "OK" if ((f>0.5)==att) else "ECHEC"
    print("  %-26s frac_bati=%.3f (n=%d blocs) attendu=%s %s" % (k,f,t,"BATI" if att else "NON BATI",v))

# ---------- comptage global ----------
print("\n== AIRES (scene = %d px) ==" % SCENE_N)
res = {'eau':0,'bati':0,'sol_nu':0,'overlay_chrome':0}
def overlay(x,y):
    if 228 <= y <= 266: return True                     # bandeau de lieu (mesure 04 : y=230)
    if (x-540)**2 + (y-97)**2 <= 92*92: return True     # medaillon
    if abs(x-540)<12 and 214<=y<=232: return True       # losange
    return False
for y in range(Y_BANDEAU, Y_DOCK):
    for x in range(W):
        if overlay(x,y): res['overlay_chrome']+=1; continue
        r,g,b = p[x,y]
        if is_eau(r,g,b): res['eau']+=1
        elif ((x//B)*B, ((y-Y_BANDEAU)//B)*B+Y_BANDEAU) in bat: res['bati']+=1
        else: res['sol_nu']+=1
for k in ('bati','sol_nu','eau','overlay_chrome'):
    print("  %-16s %9d px  %5.1f%% de la scene  %5.1f%% de l'ecran" % (k,res[k],100*res[k]/SCENE_N,100*res[k]/(W*H)))

# ---------- sensibilite au seuil ----------
print("\n== SENSIBILITE : part BATIE de la scene selon le seuil de bloc ==")
for s in (0.50,0.55,0.60,0.65,0.70):
    bb = classe_blocs(s)
    n = sum(1 for y in range(Y_BANDEAU,Y_DOCK,2) for x in range(0,W,2)
            if not overlay(x,y) and not is_eau(*p[x,y]) and ((x//B)*B,((y-Y_BANDEAU)//B)*B+Y_BANDEAU) in bb)
    print("  seuil=%.2f -> bati = %5.1f%% de la scene" % (s, 100*n*4/SCENE_N))

# ---------- par tiers de l'ECRAN ----------
print("\n== REPARTITION PAR TIERS DE L'ECRAN (640 px chacun) ==")
for i in range(3):
    y0,y1 = i*640,(i+1)*640
    c = {'bandeau':0,'dock':0,'eau':0,'bati':0,'sol_nu':0,'overlay_chrome':0}
    for y in range(y0,y1):
        for x in range(W):
            if y < Y_BANDEAU: c['bandeau']+=1
            elif y >= Y_DOCK: c['dock']+=1
            elif overlay(x,y): c['overlay_chrome']+=1
            elif is_eau(*p[x,y]): c['eau']+=1
            elif ((x//B)*B,((y-Y_BANDEAU)//B)*B+Y_BANDEAU) in bat: c['bati']+=1
            else: c['sol_nu']+=1
    tot = W*640
    print("  tiers %d (y %4d-%4d) : " % (i+1,y0,y1-1) +
          "  ".join("%s=%4.1f%%" % (k,100*v/tot) for k,v in c.items() if v))

# ---------- luminance et 'vie' (pixels chauds) par bande de 160 px ----------
print("\n== LUMINANCE ET PIXELS CHAUDS (r-b>=8 : lumiere artificielle) PAR BANDE DE 160 px ==")
print("  (le fond de nuit est bleu : un pixel ou R depasse B est eclaire par une lampe/fenetre)")
for y0 in range(0,H,160):
    y1=min(y0+160,H); s=0; n=0; chaud=0
    for y in range(y0,y1):
        for x in range(0,W,2):
            r,g,b=p[x,y]; s += 0.2126*r+0.7152*g+0.0722*b; n+=1
            if r-b >= 8: chaud+=1
    zone = "bandeau" if y1<=Y_BANDEAU else ("dock" if y0>=Y_DOCK else "scene")
    print("  y %4d-%4d [%-7s] L_moy=%6.1f   pixels chauds=%5.2f%%" % (y0,y1-1,zone,s/n,100*chaud/n))
