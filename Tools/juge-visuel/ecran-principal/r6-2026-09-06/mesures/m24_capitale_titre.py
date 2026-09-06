# m24 — capitale du TITRE de fiche : extrema d'encre par colonne, pour isoler des lettres
#   SANS accent ni descendante (chiffres, capitales droites).
from lib import *
def cols(im,x0,x1,y0,y1,s,label):
    vals=[lum(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    srt=sorted(vals); bg=srt[len(srt)//6]; pk=srt[-max(1,len(srt)//200)]
    thr=bg+0.5*(pk-bg)
    out=[]
    for x in range(x0,x1):
        ys=[y for y in range(y0,y1) if lum(im.getpixel((x,y)))>=thr]
        out.append((x,min(ys) if ys else None,max(ys) if ys else None,len(ys)))
    # regrouper en glyphes
    glyphs=[];cur=None
    for x,a,b,n in out:
        if n>0:
            if cur is None: cur=[x,x,a,b]
            else: cur[1]=x; cur[2]=min(cur[2],a); cur[3]=max(cur[3],b)
        else:
            if cur is not None: glyphs.append(cur); cur=None
    if cur: glyphs.append(cur)
    print(f"    {label} — {len(glyphs)} groupes d'encre ; seuil {thr:.1f}")
    for g in glyphs:
        print(f"       x {g[0]/s:7.2f}..{g[1]/s:7.2f}  y {g[2]/s:7.2f}..{g[3]/s:7.2f}  h={(g[3]-g[2]+1)/s:5.2f} CSS")
    return glyphs
print("== m24 ==")
r=load(REF)
print("  REFERENCE titre 'LE VERGE D\\'OR' (y 446.33..457.33 CSS)")
cols(r,360,810,1336,1376,S_REF,'ref')
c=load(CAP19)
print("\n  JEU titre (y 445.36..457.70 CSS)")
cols(c,86,994,1224,1264,S_CAP,'jeu')
