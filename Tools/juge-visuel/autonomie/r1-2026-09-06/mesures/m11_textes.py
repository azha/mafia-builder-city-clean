# m11 — hauteurs de capitale + contraste des textes de la CAPTURE, et homologues de la REFERENCE.
# Hauteur de capitale = etendue verticale de l encre d une lettre majuscule isolee.
from PIL import Image
def lum(c):
    def f(v):
        v/=255.0
        return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])
def contraste(a,b):
    la,lb=lum(a),lum(b); hi,lo=max(la,lb),min(la,lb)
    return (hi+0.05)/(lo+0.05)
def med(im,x0,y0,x1,y1):
    p=list(im.crop((x0,y0,x1,y1)).getdata()); n=len(p)
    return tuple(sorted(q[c] for q in p)[n//2] for c in range(3))
def caph(im,x0,y0,x1,y1,fond,seuil=28,label=''):
    px=im.load(); ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if max(abs(px[x,y][i]-fond[i]) for i in range(3))>seuil: ys.append(y); break
    if not ys: print('   %-32s AUCUNE ENCRE'%label); return None
    print('   %-32s hauteur d encre = %d px (y %d..%d)'%(label,max(ys)-min(ys)+1,min(ys),max(ys)))
    return max(ys)-min(ys)+1

cap=Image.open('../capture-1080x2400.png').convert('RGB')
ref=Image.open('../reference-1080x2102.png').convert('RGB')
print('OUVERT capture',cap.size,' reference',ref.size)

print('\n--- CAPTURE : hauteurs d encre (fond de carte 28,28,34 / conteneur 22,22,28) ---')
caph(cap,312,155,420,180,(28,28,34),label='"COOK" (titre de carte)')
caph(cap,312,182,560,200,(28,28,34),label='"autonomy.cook.now" (cle brute)')
caph(cap,312,200,470,215,(28,28,34),label='"[~] Minimal"')
caph(cap,580,218,700,240,(42,46,56),label='"Choose A" (encre du bouton)')
caph(cap,580,292,700,315,(42,46,56),label='"Choose B" (encre du bouton)')

print('\n--- CAPTURE : contrastes (encre vs fond immediat) ---')
paires=[
 ('"COOK" blanc sur carte',        (238,241,242), med(cap,320,168,330,176)),
 ('cle brute grise sur carte',     (138,151,156), (28,28,34)),
 ('"Choose A" or sur bouton',      None,          (42,46,56)),
]
# encre reelle du bouton : pixel le plus sature-or
pxc=cap.load()
best=(0,None)
for y in range(218,242):
    for x in range(570,712):
        r,g,b=pxc[x,y]
        if r-b>best[0]: best=(r-b,(r,g,b))
print('   encre la plus doree de "Choose A" =',best[1],' (R-B=%d)'%best[0])
enc=best[1]
print('   contraste "COOK"    blanc(238,241,242) / carte(28,28,34)  = %.2f:1'%contraste((238,241,242),(28,28,34)))
print('   contraste cle brute gris(138,151,156)  / carte(28,28,34)  = %.2f:1'%contraste((138,151,156),(28,28,34)))
print('   contraste "Choose A" %s / bouton(42,46,56) = %.2f:1'%(str(enc),contraste(enc,(42,46,56))))
# titre RAPPORTS sous le bandeau
b2=(0,None)
for y in range(40,66):
    for x in range(300,700):
        p=pxc[x,y]
        if sum(p)>b2[0]: b2=(sum(p),p)
print('   encre la plus claire du titre "RAPPORTS D AUT..." =',b2[1])
print('   contraste titre %s / bandeau(14,17,28) = %.2f:1'%(str(b2[1]),contraste(b2[1],(14,17,28))))
# sous-titre Lt. UUID
b3=(0,None)
for y in range(82,100):
    for x in range(300,560):
        p=pxc[x,y]
        if sum(p)>b3[0]: b3=(sum(p),p)
print('   encre la plus claire du sous-titre "Lt. <uuid>" =',b3[1])
print('   contraste sous-titre %s / fond(17,23,31) = %.2f:1'%(str(b3[1]),contraste(b3[1],(17,23,31))))

print('\n--- REFERENCE : homologues (encre verte sur fond LCD 17,31,12) ---')
caph(ref,405,378,625,412,(17,31,12),seuil=18,label='"MESSAGES 2" (titre LCD)')
caph(ref,145,505,335,535,(17,31,12),seuil=18,label='"LT. KANE" (nom)')
caph(ref,110,565,880,595,(17,31,12),seuil=18,label='ligne de rapport 1')
pr=ref.load(); b=(0,None)
for y in range(505,535):
    for x in range(145,335):
        p=pr[x,y]
        if sum(p)>b[0]: b=(sum(p),p)
print('   encre la plus claire de "LT. KANE" =',b[1])
print('   contraste %s / fond LCD(17,31,12) = %.2f:1'%(str(b[1]),contraste(b[1],(17,31,12))))
