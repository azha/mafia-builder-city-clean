# m23 — TETE DE FICHE : profil de lignes d'encre dans le bandeau titre + sous-titre
from lib import *
def rows(im,x0,x1,y0,y1,s,label,thr_rel=0.5):
    vals=[lum(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    srt=sorted(vals); bg=srt[len(srt)//6]; pk=srt[-max(1,len(srt)//200)]
    thr=bg+thr_rel*(pk-bg)
    print(f"    {label}: fond L={bg:.1f} pic L={pk:.1f} seuil {thr:.1f}")
    prev=False; runs=[]
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if lum(im.getpixel((x,y)))>=thr)
        cur=n>=2
        if cur and not prev: start=y
        if not cur and prev: runs.append((start,y))
        prev=cur
    if prev: runs.append((start,y1))
    for a,b in runs:
        # etendue x de la bande
        xs=[x for y in range(a,b) for x in range(x0,x1) if lum(im.getpixel((x,y)))>=thr]
        print(f"       bande d'encre y {a/s:7.2f}..{b/s:7.2f} CSS (hauteur {(b-a)/s:5.2f})  x {min(xs)/s:7.2f}..{max(xs)/s:7.2f}")
    return runs
print("== m23 tete de fiche ==")
r=load(REF)
print("  REFERENCE : panneau haut (filet) = 426.67 CSS ; fenetre x 30..362 CSS")
rr=rows(r,95,1080,1286,1480,S_REF,'ref titre+sous-titre')
c=load(CAP19)
print("\n  JEU 1080x1920 : panneau haut (filet) = 425.39 CSS")
rc=rows(c,86,994,1180,1360,S_CAP,'jeu titre+sous-titre')
