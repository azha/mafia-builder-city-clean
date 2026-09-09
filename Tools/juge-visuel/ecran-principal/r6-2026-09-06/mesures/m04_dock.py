# m04 — DOCK : ronds (diametre + centres + pas), libelles (chasse, capitale)
# Convention de bord DECLAREE : le rond est un disque plus SOMBRE que son voisinage ;
#   bord = mi-amplitude entre le plateau interieur et le fond local (bord a mi-alpha).
from lib import *

def scan_row(im,y,x0,x1):
    return [lum(im.getpixel((x,y))) for x in range(x0,x1)]

def disks(im,y,x0,x1,s,label,dark=True):
    """detecte les disques sur une ligne horizontale : segments dont L s'ecarte du fond."""
    prof=scan_row(im,y,x0,x1)
    srt=sorted(prof)
    bgv=median(prof[:20]+prof[-20:])
    # amplitude
    ext = min(prof) if dark else max(prof)
    half = (bgv+ext)/2.0
    segs=[];cur=None
    for i,v in enumerate(prof):
        inside = v<=half if dark else v>=half
        if inside and cur is None: cur=i
        if not inside and cur is not None:
            segs.append((cur,i)); cur=None
    if cur is not None: segs.append((cur,len(prof)))
    segs=[sg for sg in segs if sg[1]-sg[0]>20]
    out=[]
    for a,b in segs:
        # bords sous-pixel
        def edge(i0,i1):
            v0,v1=prof[i0],prof[i1]
            if v1==v0: return i0
            return i0+(half-v0)/(v1-v0)
        ea = edge(a-1,a) if a>0 else a
        eb = edge(b,b-1) if b<len(prof) else b
        out.append(((x0+ea)/s,(x0+eb)/s))
    print(f"    {label} (y={y}, fond L={bgv:.1f}, extremum L={ext:.1f}, seuil {half:.1f})")
    for i,(a,b) in enumerate(out):
        print(f"       disque {i+1}: x {a:7.2f}..{b:7.2f} CSS  diam={b-a:6.2f}  centre={(a+b)/2:7.2f}")
    if len(out)>1:
        pas=[ (out[i+1][0]+out[i+1][1])/2 - (out[i][0]+out[i][1])/2 for i in range(len(out)-1)]
        print(f"       pas : {' · '.join(f'{p:.2f}' for p in pas)}   moyen={sum(pas)/len(pas):.2f}")
        print(f"       diam moyen = {sum(b-a for a,b in out)/len(out):.2f}")
    return out

print("== m04 DOCK ==")
r=load(REF)
print("  REFERENCE — canon .rond 46.00 a (71,615.70) => centre y 638.70 CSS = 1916 px")
disks(r,1916,20,1176,S_REF,'ronds du dock (ref)',dark=False)

for p,nm,ydock in [(CAP19,'1080x1920',1760),(CAP24,'1080x2400',None),(DIS24,'district 2400',None)]:
    im=load(p)
    if ydock is None:
        # trouver la ligne des ronds : ligne ou la variance horizontale est max dans la bande basse
        best=None
        for y in range(int(im.size[1]*0.86),im.size[1]-8):
            pr=scan_row(im,y,30,1050)
            v=max(pr)-min(pr)
            if best is None or v>best[1]: best=(y,v)
        ydock=best[0]
    print(f"  {nm} — ligne de scan y={ydock} px = {ydock/S_CAP:.2f} CSS")
    disks(im,ydock,20,1080,S_CAP,'ronds du dock (jeu)',dark=True)
