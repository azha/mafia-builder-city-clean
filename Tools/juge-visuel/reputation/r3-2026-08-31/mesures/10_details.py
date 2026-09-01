# -*- coding: utf-8 -*-
"""10 — DÉTAILS : (a) le trait clair sous le col dans la capture, (b) le reflet (.elast::after),
(c) le halo des chiffres (text-shadow 0 0 8px cyan99), (d) le rehaut haut de l'enseigne
(inset 0 1px 0 #ffffff0f) et le halo externe du cerne (0 0 12px or_filet26).
Contrôle positif : (b) la position du reflet est déclarée ASSUMÉE à 34,7 % d'une course
-6 -> 190 px CSS, soit 62,0 px CSS sous le haut de .elast ; on vérifie ce chiffre.
Contrôle négatif : (c) dans la RÉFÉRENCE le halo doit DÉCROÎTRE avec la distance ; s'il sortait
plat des deux côtés, la sonde ne mesurerait pas un halo."""
from PIL import Image
def med(im,x0,y0,x1,y1):
    px=im.load(); ps=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]
    return tuple(sorted(p[i] for p in ps)[len(ps)//2] for i in range(3))
def lum(p): return round(.2126*p[0]+.7152*p[1]+.0722*p[2],1)
REFp='/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r3-2026-08-31/reference/m-120.png'
CAPp='/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png'
REF=Image.open(REFp).convert('RGB'); CAP=Image.open(CAPp).convert('RGB')
print(REFp.split('/')[-1],REF.size,'|',CAPp.split('/')[-1],CAP.size)
rp,cp=REF.load(),CAP.load()

print('\n(a) TRAIT CLAIR SOUS LE COL (capture) — apex du col a y=922')
xs=[x for x in range(150,440) if lum(cp[x,922])-lum(cp[x,919])>8]
print('   CAP : y=922 seul ; x=%d..%d = %.1f px CSS = %.1f u SVG ; couleur %s (creme a ~35%% sur le buste)'
      %(min(xs),max(xs),(max(xs)-min(xs)+1)/3.6,(max(xs)-min(xs)+1)/5.5742,cp[min(xs)+4,922]))
print('   epaisseur = %d px = %.2f px CSS'%(1,1/3.6))
ry=815+int(70*4.6452)
xs2=[x for x in range(120,390) if lum(rp[x,ry+2])-lum(rp[x,ry-1])>8]
print('   REF au meme endroit (y=%d) : %d px clair -> %s'%(ry,len(xs2),'ABSENT' if not xs2 else xs2[:8]))

print('\n(b) REFLET (.elast::after)')
for nom,im,px,eh,sc,xs_,xe_ in (('REF',REF,rp,708,3.0,60,880),('CAP',CAP,cp,410,3.6,60,1050)):
    xp = 700 if nom=='REF' else 840
    base=lum(px[xp,eh+250])
    ys=[y for y in range(eh+5,eh+330) if lum(px[xp,y])-base>3]
    print('   %s : bande y=%d..%d -> haut a %.1f px CSS sous .elast | epaisseur %.1f CSS  (ASSUME : 62,0)'
          %(nom,min(ys),max(ys),(min(ys)-eh)/sc,(max(ys)-min(ys)+1)/sc))
    ym=(min(ys)+max(ys))//2
    print('     profil horizontal (x en %% de .elast ; lum) :',
          [(round(100*(x-xs_)/(xe_-xs_)), lum(px[x,ym])) for x in range(xs_,xe_,(xe_-xs_)//9)])

print('\n(c) HALO DES CHIFFRES (text-shadow 0 0 8px cyan99), lum au-dessus du haut d encre')
for nom,im,x,y0,sc in (('REF',REF,171,603,3.0),('CAP',CAP,222,284,3.6)):
    print('   %s :'%nom, [(round(d/sc,1), lum(med(im,x-18,y0-d-3,x+18,y0-d))) for d in (3,6,10,16,24,34)])

print('\n(d) REHAUT ET HALO')
print('   enseigne — 1re ligne interieure vs 6 px CSS plus bas (inset 0 1px 0 #ffffff0f) :')
print('     REF', med(REF,300,401,600,404), med(REF,300,412,600,418))
print('     CAP', med(CAP,300, 49,600, 53), med(CAP,300, 62,600, 69))
print('   halo externe du cerne (0 0 12px or_filet26) — a 2..5 px et a 12..16 px du bord :')
print('     REF', med(REF,12,700,16,900), med(REF,2,700,6,900))
print('     CAP', med(CAP,12,700,16,900), med(CAP,2,700,6,900))
