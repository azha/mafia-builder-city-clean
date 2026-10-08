from PIL import Image
C='/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-mots/'
def near(px,box,col,tol):
    x0,y0,x1,y1=box; n=0;t=0
    for y in range(y0,y1,2):
        for x in range(x0,x1,2):
            t+=1; p=px[x,y]
            if all(abs(p[i]-col[i])<=tol for i in range(3)): n+=1
    return n,t
im=Image.open(C+'E04_Distribution_1080x2400.png').convert('RGB'); px=im.load()
print('E04 1080x2400')
print(' plaque Entete attendue #20180f=(32,24,15) dans bande y504..760 :',near(px,(0,504,1080,760),(32,24,15),6),'(0 = plaque absente a l ecran)')
print(' temoin positif : bande basse (20,26,33) y1860..2000 :',near(px,(0,1860,1080,2000),px[540,1900],4))
print(' kraft dans bande y504..760 :',near(px,(0,504,1080,760),px[540,600],12))
for nom in ['E03_Chanedappro','E05_Loi','E04_Distribution']:
    im=Image.open(C+nom+'_1080x2400.png').convert('RGB'); px=im.load()
    ink=0;t=0
    for y in range(504,760,2):
        for x in range(0,1080,2):
            t+=1; r,g,b=px[x,y]
            if (r+g+b)/3>150: ink+=1
    print(nom,'pixels clairs (encre de titre) y504..760 :',ink,'/',t)
