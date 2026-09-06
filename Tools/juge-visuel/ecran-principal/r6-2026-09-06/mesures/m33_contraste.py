# m33 — contrastes : nom de district, libelles du dock, textes de la fiche, textes du bandeau
from lib import *
def find_text(im,x0,y0,x1,y1,s,label):
    ls=[lum(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    srt=sorted(ls); bg=srt[len(srt)//2]; pk=srt[-max(1,len(srt)//200)]
    thr=bg+0.6*(pk-bg)
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if lum(im.getpixel((x,y)))>=thr]
    if not pts: print(f"    {label}: RIEN"); return None
    X0,X1,Y0,Y1=min(p[0] for p in pts),max(p[0] for p in pts),min(p[1] for p in pts),max(p[1] for p in pts)
    # encre = mediane des 20% les plus clairs ; fond = mediane hors boite elargie
    inks=sorted(pts,key=lambda p:-lum(im.getpixel(p)))[:max(6,len(pts)//5)]
    ink=tuple(int(median([im.getpixel(p)[k] for p in inks])) for k in range(3))
    outs=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if not(X0-3<=x<=X1+3 and Y0-3<=y<=Y1+3)]
    bgc=tuple(int(median([im.getpixel(p)[k] for p in outs])) for k in range(3)) if outs else None
    # contour le plus sombre dans la boite
    darks=sorted([(x,y) for y in range(Y0,Y1+1) for x in range(X0,X1+1)],key=lambda p:lum(im.getpixel(p)))[:max(4,len(pts)//10)]
    dk=tuple(int(median([im.getpixel(p)[k] for p in darks])) for k in range(3))
    print(f"    {label}: boite CSS x {X0/s:.2f}..{X1/s:.2f} y {Y0/s:.2f}..{Y1/s:.2f} (capitale~{(Y1-Y0+1)/s:.2f})")
    print(f"       encre {ink}  fond {bgc}  contour {dk}")
    print(f"       CONTRASTE encre/fond = {contrast(ink,bgc):.2f}:1   encre/contour = {contrast(ink,dk):.2f}:1   contour/fond = {contrast(dk,bgc):.2f}:1")
    return ink,bgc,dk
print("== m33 contrastes ==")
d=load(DIS24); c=load(CAP19); c24=load(CAP24); r=load(REF)
print("  nom de district")
find_text(d,20,240,340,290,S_CAP,'JEU district 2400 « La Lisiere »')
find_text(c,20,240,340,300,S_CAP,'JEU fiche 1920 « La Lisiere »')
print("  libelles du dock (creme sur voile)")
find_text(c,200,1836,320,1872,S_CAP,'JEU 1920 EMPIRE')
find_text(c24,200,2316,320,2352,S_CAP,'JEU 2400 EMPIRE')
find_text(r,215,2004,320,2040,S_REF,'REF EMPIRE')
print("  bandeau")
find_text(c,930,20,1040,52,S_CAP,'JEU 1920 JOUR 50')
find_text(c,175,24,290,50,S_CAP,'JEU 1920 ARGENT')
print("  fiche")
find_text(c,86,1224,994,1264,S_CAP,'JEU 1920 titre de fiche')
find_text(c,86,1288,994,1320,S_CAP,'JEU 1920 sous-titre OPERATIONNEL')
