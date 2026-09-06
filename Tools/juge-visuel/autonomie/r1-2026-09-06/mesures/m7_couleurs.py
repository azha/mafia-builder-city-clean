# m7 — echantillons de couleur (mediane de fenetre, >=3 px de tout bord) des deux cotes.
from PIL import Image
ref=Image.open('../reference-1080x2102.png').convert('RGB')
cap=Image.open('../capture-1080x2400.png').convert('RGB')
print('OUVERT reference',ref.size,' capture',cap.size)
def med(im,x0,y0,x1,y1):
    p=list(im.crop((x0,y0,x1,y1)).getdata()); n=len(p)
    return tuple(sorted(q[c] for q in p)[n//2] for c in range(3))
def mx(im,x0,y0,x1,y1):  # pixel le plus clair de la fenetre (pour l encre d un texte)
    p=list(im.crop((x0,y0,x1,y1)).getdata())
    return max(p,key=lambda q:sum(q))
def d(a,b): return tuple(a[i]-b[i] for i in range(3))
print('\n--- CHROME (assume hors echelle, sert de CONTROLE POSITIF de couleur) ---')
paires=[
 ('or du solde (encre la plus claire)', mx(ref,50,80,240,120), mx(cap,180,60,420,100)),
 ('libelle ARGENT (encre)',             mx(ref,50,40,190,65),  mx(cap,175,25,290,50)),
 ('fond du bandeau (aplat gauche)',     med(ref,10,10,40,35),  med(cap,10,10,40,35)),
 ('libelle JOUR (encre)',               mx(ref,880,40,1020,65),mx(cap,940,25,1060,50)),
]
for lab,a,b in paires:
    print('  %-38s ref=%-16s jeu=%-16s delta=%s'%(lab,a,b,d(b,a)))
print('\n--- FOND de la zone de contenu ---')
print('  reference chassis telephone (x20..60,y1600..1660) =', med(ref,20,1600,60,1660))
print('  reference fond LCD          (x500..600,y1150..1250)=', med(ref,500,1150,600,1250))
print('  capture   fond page         (x40..200,y900..1000)  =', med(cap,40,200,200,400))
print('  capture   fond du panneau   (x320..380,y700..800)  =', med(cap,320,700,380,800))
print('  capture   fond de carte     (x300..350,y200..240)  =', med(cap,300,200,350,240))
print('  capture   fond bouton ChooseA(x350..420,y215..240) =', med(cap,350,215,420,240))
print('  capture   encre Choose A    (max, x580..700,y222..240)=', mx(cap,580,222,700,240))
print('  capture   encre COOK        (max, x320..400,y160..180)=', mx(cap,320,160,400,180))
print('  capture   encre autonomy.*  (max, x320..560,y185..200)=', mx(cap,320,185,560,200))
