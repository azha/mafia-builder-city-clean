# m21 — chrome : le bandeau de la CAPTURE face au CANON DU HUD (autorite designee par le dossier).
# Echelles : canon 1176 px = 392 CSS (x3,000) ; capture 1080 px = 392 CSS (x2,755).
from PIL import Image
canon=Image.open('/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png').convert('RGB')
cap=Image.open('../capture-1080x2400.png').convert('RGB')
print('OUVERT canon',canon.size,' capture',cap.size)
SC, SK = 3.000, 1080/392.0
print('facteurs : canon x%.3f  capture x%.3f  (rapport capture/canon = %.4f)'%(SC,SK,SK/SC))
def blocs(im,x0,y0,x1,y1,seuil,label,ech):
    px=im.load(); rows=[]
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if sum(px[x,y])>seuil)
        rows.append((y,n))
    seg=[];cur=None
    for y,n in rows:
        if n>0 and cur is None: cur=y
        elif n==0 and cur is not None: seg.append((cur,y-1)); cur=None
    if cur is not None: seg.append((cur,y1-1))
    print('  %s (x%d..%d) blocs d encre :'%(label,x0,x1))
    for a,b in seg:
        cs=[x for x in range(x0,x1) if any(sum(px[x,y])>seuil for y in range(a,b+1))]
        print('     y %3d..%3d (h=%2d)  x %4d..%4d  |  en CSS : y %.1f..%.1f  x %.1f..%.1f'%(
            a,b,b-a+1,min(cs),max(cs),a/ech,b/ech,min(cs)/ech,max(cs)/ech))
print('\n=== CANON HUD — moitie droite du bandeau ===')
blocs(canon,860,5,1176,150,3*95,'canon',SC)
print('\n=== CAPTURE — moitie droite du bandeau ===')
blocs(cap,800,5,1080,138,3*95,'capture',SK)
print('\n=== CANON HUD — coin gauche (bouton retour ?) ===')
blocs(canon,5,5,140,150,3*95,'canon',SC)
print('\n=== CAPTURE — coin gauche ===')
blocs(cap,5,5,140,138,3*95,'capture',SK)
