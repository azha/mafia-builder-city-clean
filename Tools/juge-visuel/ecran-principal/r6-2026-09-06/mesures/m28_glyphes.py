from lib import *
def glyphs(im,x0,y0,x1,y1,s,label):
    ls=[lum(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    srt=sorted(ls); bg=srt[len(srt)//6]; pk=srt[-max(1,len(srt)//80)]
    thr=bg+0.5*(pk-bg)
    out=[]
    for x in range(x0,x1):
        ys=[y for y in range(y0,y1) if lum(im.getpixel((x,y)))>=thr]
        out.append((x,ys))
    g=[];cur=None
    for x,ys in out:
        if ys:
            if cur is None: cur=[x,x,min(ys),max(ys)]
            else: cur[1]=x; cur[2]=min(cur[2],min(ys)); cur[3]=max(cur[3],max(ys))
        else:
            if cur: g.append(cur); cur=None
    if cur: g.append(cur)
    print(f"    {label} (seuil {thr:.1f}) — {len(g)} glyphes")
    for q in g:
        print(f"       x {q[0]/s:7.2f}..{q[1]/s:7.2f}  y {q[2]/s:6.2f}..{q[3]/s:6.2f}  h={(q[3]-q[2]+1)/s:5.2f}")
    return g
print("== m28 glyphes des ailes ==")
r=load(REF)
print("  REFERENCE montant"); glyphs(r,45,55,240,110,S_REF,'ref $ 24 850')
print("  REFERENCE aile droite lib"); glyphs(r,1000,25,1130,60,S_REF,'ref JOUR 12 SOIREE')
print("  REFERENCE aile droite val"); glyphs(r,1000,58,1130,112,S_REF,'ref 21:40')
c=load(CAP19)
print("\n  JEU montant"); glyphs(c,175,58,470,120,S_CAP,'jeu montant')
print("  JEU aile droite lib"); glyphs(c,935,20,1040,55,S_CAP,'jeu JOUR 50')
print("  JEU aile droite val"); glyphs(c,930,60,1040,105,S_CAP,'jeu Aube')
