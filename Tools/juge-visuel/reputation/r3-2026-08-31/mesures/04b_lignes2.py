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
    return r
Z={'REF':[('sous-titre l1',60,485,840,512),('fen1 chiffres',50,592,290,640),('fen1 libelle',50,645,290,672),
          ('fen2 chiffres',330,592,570,640),('fen3 chiffres/tiret',610,592,850,640),('fen3 libelle',610,645,850,672),
          ('verdict b',450,735,645,830),('verdict span',655,735,845,830),
          ('tuile1 b',515,845,840,882),('tuile1 small',515,882,840,912),
          ('tuile1 lum(pastille)',470,860,505,895)],
   'CAP':[('sous-titre l1',60,152,1020,178),('fen1 chiffres',50,272,350,330),('fen1 libelle',50,335,350,368),
          ('fen2 chiffres',390,272,690,330),('fen3 chiffres/tiret',730,272,1030,330),('fen3 libelle',730,335,1030,368),
          ('verdict b',525,438,780,528),('verdict span',790,438,1015,528),
          ('tuile1 b',600,548,1010,590),('tuile1 small',600,588,1010,618),
          ('tuile1 lum(pastille)',550,565,600,600)]}
P={'REF':('/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r3-2026-08-31/reference/m-120.png',3.0),
   'CAP':('/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',3.6)}
for k,(p,sc) in P.items():
    im=Image.open(p).convert('RGB'); print('='*70); print(k,p.split('/')[-1],im.size)
    for nom,*r in Z[k]:
        print(' %-22s'%nom, [(a,b,'h=%.1f'%(h/sc),'w=%.1f'%((x1-x0+1)/sc),'x0=%.1f'%(x0/sc)) for a,b,h,x0,x1 in lignes(im,*r)])
