from PIL import Image
def lum(p): return .2126*p[0]+.7152*p[1]+.0722*p[2]
def lignes(im,x0,y0,x1,y1,seuil=28):
    px=im.load(); vals=[lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1)]
    fond=sorted(vals)[len(vals)//2]; out=[];s=None
    for y in range(y0,y1):
        e=any(lum(px[x,y])-fond>seuil for x in range(x0,x1))
        if e and s is None: s=y
        elif not e and s is not None: out.append((s,y-1)); s=None
    if s is not None: out.append((s,y1-1))
    r=[]
    for a,b in out:
        xs=[x for x in range(x0,x1) for y in range(a,b+1) if lum(px[x,y])-fond>seuil]
        r.append((a,b,b-a+1,min(xs),max(xs)))
    return r,round(fond,1)
BL={'REF':[('enseigne',60,382,840,550),('compteurs',40,585,300,678),('compt3',600,585,860,678),
           ('prt_haut',75,735,418,830),('prt_bas',75,1175,418,1265),('verdict',450,730,845,835),
           ('tuile1',515,838,845,918),('pann',70,1375,845,1595),('cta',70,1630,845,1700)],
    'CAP':[('enseigne',60,22,1020,220),('compteurs',40,262,360,375),('compt3',720,262,1035,375),
           ('prt_haut',80,440,490,520),('prt_bas',80,975,490,1080),('verdict',525,432,1015,540),
           ('tuile1',600,534,1010,627),('pann',70,1405,1020,1665),('cta',70,1705,1020,1785)]}
P={'REF':('/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r3-2026-08-31/reference/m-120.png',3.0),
   'CAP':('/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',3.6)}
for k,(p,sc) in P.items():
    im=Image.open(p).convert('RGB'); print('='*70); print(k,p.split('/')[-1],im.size)
    for nom,*r in BL[k]:
        ls,f=lignes(im,*r)
        print(' %-10s fond=%-6s' % (nom,f), [(a,b,'h=%.1fCSS'%(h/sc),'x=%d..%d'%(x0,x1)) for a,b,h,x0,x1 in ls])
