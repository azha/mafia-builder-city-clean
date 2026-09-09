# Carte de STRUCTURE : energie de gradient (Sobel simplifie) sur la luminance, moyennee par bloc 4x4.
# Sert a distinguer les surfaces PLATES (sol, eau, ciel, toit lisse) des surfaces STRUCTUREES (facades a fenetres).
# Controles imprimes : points connus (facade eclairee / asphalte / eau / ciel / toit).
from PIL import Image
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC).convert('RGB'); W,H=im.size; px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
L=[[0]*W for _ in range(H)]
for y in range(H):
    Ly=L[y]
    for x in range(W):
        r,g,b=px[x,y]; Ly[x]=(r*299+g*587+b*114)//1000
G=[[0]*W for _ in range(H)]
for y in range(1,H-1):
    for x in range(1,W-1):
        gx=abs(L[y][x+1]-L[y][x-1]); gy=abs(L[y+1][x]-L[y-1][x])
        G[y][x]=gx+gy
BS=4
bw,bh=W//BS,H//BS
E=[[0]*bw for _ in range(bh)]
for by in range(bh):
    for bx in range(bw):
        s=0
        for y in range(by*BS,by*BS+BS):
            row=G[y]
            for x in range(bx*BS,bx*BS+BS): s+=row[x]
        E[by][bx]=s//(BS*BS)
mx=max(max(r) for r in E)
print('energie max par bloc =', mx)
out=Image.new('L',(bw,bh))
op=out.load()
for by in range(bh):
    for bx in range(bw): op[bx,by]=min(255,E[by][bx]*4)
out.resize((bw*2,bh*2),Image.NEAREST).save('carte-structure.png')
print('ecrit carte-structure.png', (bw*2,bh*2))
CTRL={'facade eclairee (Cache) (760,600)':(760,600),'asphalte rue (420,700)':(420,700),
      'eau (300,1500)':(300,1500),'ciel (100,300)':(100,300),
      'toit plat Verge d Or (500,780)':(500,780),'toit ardoise vert (140,930)':(140,930),
      'quai beton (400,1300)':(400,1300),'trottoir devant Verge (540,960)':(540,960)}
print('--- controles : energie de structure au bloc contenant le point ---')
for nom,(x,y) in CTRL.items():
    print(f'   {nom:38s} E={E[y//BS][x//BS]:4d}   rgb={px[x,y]}')
