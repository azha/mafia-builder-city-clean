from PIL import Image
def lum(c):
    def f(v):
        v/=255.0
        return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])
def K(a,b):
    la,lb=lum(a),lum(b); hi,lo=max(la,lb),min(la,lb); return (hi+0.05)/(lo+0.05)
cap=Image.open('../capture-1080x2400.png').convert('RGB'); pxc=cap.load()
ref=Image.open('../reference-1080x2102.png').convert('RGB'); pr=ref.load()
print('OUVERT capture',cap.size,' reference',ref.size)
def encre(px,x0,y0,x1,y1):
    b=(-1,None)
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            if sum(p)>b[0]: b=(sum(p),p)
    return b[1]
def hauteur(px,x0,y0,x1,y1,fond,seuil,label):
    ys=[]
    for y in range(y0,y1):
        if any(max(abs(px[x,y][i]-fond[i]) for i in range(3))>seuil for x in range(x0,x1)): ys.append(y)
    if not ys: print('   %-34s AUCUNE ENCRE'%label); return
    print('   %-34s encre y %d..%d  h=%d px'%(label,min(ys),max(ys),max(ys)-min(ys)+1))
print('\n--- CAPTURE : boutons d option (rects mesures en m10) ---')
hauteur(pxc,700,209,766,246,(42,46,56),25,'"Choose A" partie hors manometre')
hauteur(pxc,470,284,700,321,(42,46,56),25,'"Choose B" (bouton entier)')
eA=encre(pxc,690,215,766,242); eB=encre(pxc,470,290,700,316)
print('   encre "Choose A"(droite du mot) =',eA,'  contraste /bouton(42,46,56) = %.2f:1'%K(eA,(42,46,56)))
print('   encre "Choose B"                =',eB,'  contraste /bouton(42,46,56) = %.2f:1'%K(eB,(42,46,56)))
print('\n--- CAPTURE : titre et sous-titre SOUS le bandeau ---')
t=encre(pxc,300,40,700,66); print('   encre titre     =',t,' contraste /bandeau(14,17,28) = %.2f:1'%K(t,(14,17,28)))
s=encre(pxc,300,82,560,100); print('   encre sous-titre=',s,' contraste /fond(17,23,31)    = %.2f:1'%K(s,(17,23,31)))
o=encre(pxc,700,82,830,100); print('   encre "Oldest.."=',o,' contraste /fond(17,23,31)    = %.2f:1'%K(o,(17,23,31)))
print('\n--- REFERENCE : homologues sur le LCD (fond 17,31,12) ---')
hauteur(pr,405,375,625,415,(17,31,12),16,'"MESSAGES 2"')
hauteur(pr,145,500,335,540,(17,31,12),16,'"LT. KANE"')
hauteur(pr,110,560,880,600,(17,31,12),16,'ligne de rapport 1')
hauteur(pr,820,495,975,525,(17,31,12),16,'"CE CYCLE"')
k=encre(pr,145,500,335,540); print('   encre "LT. KANE" =',k,' contraste /LCD(17,31,12) = %.2f:1'%K(k,(17,31,12)))
m=encre(pr,110,560,880,600); print('   encre rapport 1  =',m,' contraste /LCD(17,31,12) = %.2f:1'%K(m,(17,31,12)))
