# m24 — halo du medaillon du Don : profil long a gauche de l anneau + controle NEGATIF sur un
# medaillon de lieutenant (qui n'a pas de halo).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def prof(im,y,xring,S,label,sens=-1,n=26):
    px=im.load()
    vals=[(d,px[xring+sens*d,y]) for d in range(1,n)]
    far=vals[-1][1]
    print(' %s  (far-field a %d px = %.1f CSS : %s)'%(label,n-1,(n-1)/S,str(far)))
    print('   d(CSS)  R  G  B   |  exces R sur far-field')
    for d,p in vals:
        if d in (1,2,3,4,6,8,10,12,16,20,25):
            print('    %5.1f  %3d %3d %3d   %+4d'%(d/S,p[0],p[1],p[2],p[0]-far[0]))
    # integrale de l exces R
    s=sum(max(0,p[0]-far[0]) for _,p in vals)
    print('   integrale exces R = %d  -> %.1f par px CSS'%(s,s/S))
print('\nDON (avec halo attendu)')
prof(ref,372,84,2.0,'REF don, vers la gauche')
prof(cap,606,90,1.88036,'CAP don, vers la gauche')
print('\nCONTROLE NEGATIF — LIEUTENANT (aucun halo attendu)')
prof(ref,606,131,2.0,'REF rang1, vers la gauche')
prof(cap,824,136,1.88036,'CAP rang1, vers la gauche')
