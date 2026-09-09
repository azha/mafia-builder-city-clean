# m42 — couche globale RESTREINTE au CHROME (bandeau) et a la FICHE (dossier : palette globale non
#   comparable, reference de NUIT vs capture de JOUR)
from lib import *
def palette(im,x0,y0,x1,y1,s,label,n=6):
    im2=im.crop((x0,y0,x1,y1))
    q=im2.quantize(colors=12,method=2).convert('RGB')
    cols=q.getcolors(4096); cols.sort(reverse=True)
    tot=sum(c for c,_ in cols)
    Ls=[lum(im.getpixel((x,y))) for y in range(y0,y1,2) for x in range(x0,x1,2)]
    print(f"    {label}: aire {(x1-x0)}x{(y1-y0)} px ; L moyenne={sum(Ls)/len(Ls):.1f} ; mediane={median(Ls):.1f}")
    for c,col in cols[:n]:
        print(f"       {col}  {100*c/tot:5.1f} %  L={lum(col):5.1f}")
    return sum(Ls)/len(Ls)
print("== m42 couche globale — bandeau et fiche ==")
r=load(REF); c=load(CAP19); d=load(DIS24)
print("  BANDEAU (y 0..51 CSS, x 0..392)")
palette(r,0,0,1176,153,S_REF,'REFERENCE bandeau')
palette(c,0,0,1080,138,S_CAP,'JEU 1920 bandeau')
palette(d,0,0,1080,138,S_CAP,'JEU district 2400 bandeau')
print("\n  FICHE (panneau entier)")
palette(r,39,1280,1137,1788,S_REF,'REFERENCE fiche')
palette(c,32,1172,1046,1637,S_CAP,'JEU 1920 fiche')
print("\n  DOCK (bande, y 605..696 CSS)")
palette(r,0,1817,1176,2088,S_REF,'REFERENCE dock')
palette(c,0,1668,1080,1920,S_CAP,'JEU 1920 dock')
palette(d,0,2148,1080,2400,S_CAP,'JEU district 2400 dock')
