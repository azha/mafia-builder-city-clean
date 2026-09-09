# m25 — verification des chiffres cites en annexe qui n avaient pas encore leur mesure propre.
from PIL import Image
cap=Image.open('../capture-1080x2400.png').convert('RGB'); pc=cap.load()
ref=Image.open('../reference-1080x2102.png').convert('RGB'); pr=ref.load()
print('OUVERT capture',cap.size,' reference',ref.size)
def etendue(px,x0,x1,y0,y1,seuil,label):
    ys=[y for y in range(y0,y1) if any(sum(px[x,y])>seuil for x in range(x0,x1))]
    xs=[x for x in range(x0,x1) if any(sum(px[x,y])>seuil for y in range(y0,y1))]
    if not ys: print('   %-40s RIEN'%label); return
    print('   %-40s y %4d..%4d (h=%2d)   x %4d..%4d (w=%3d)'%(label,min(ys),max(ys),max(ys)-min(ys)+1,min(xs),max(xs),max(xs)-min(xs)+1))
print('--- CAPTURE (fenetres LARGES, pour ne pas rogner) ---')
etendue(pc,300,700,25,80,3*45,'titre "RAPPORTS D AU..."')
etendue(pc,282,500,75,110,3*70,'sous-titre "Lt. <uuid>"')
etendue(pc,610,760,75,110,3*45,'"Oldest: 2 cycles"')
etendue(pc,312,560,175,196,3*60,'cle brute "autonomy.cook.now"')
etendue(pc,312,470,196,212,3*60,'"[~] Minimal"')
etendue(pc,312,560,250,272,3*60,'cle brute "autonomy.cook.refine"')
etendue(pc,312,470,270,284,3*60,'"[<>] Arbitrage"')
etendue(pc,312,430,155,180,3*90,'"COOK" titre de carte')
print('--- REFERENCE (fenetres LARGES) ---')
def etendue2(px,x0,x1,y0,y1,fond,seuil,label):
    ys=[y for y in range(y0,y1) if any(max(abs(px[x,y][i]-fond[i]) for i in range(3))>seuil for x in range(x0,x1))]
    xs=[x for x in range(x0,x1) if any(max(abs(px[x,y][i]-fond[i]) for i in range(3))>seuil for y in range(y0,y1))]
    print('   %-40s y %4d..%4d (h=%2d)   x %4d..%4d (w=%3d)'%(label,min(ys),max(ys),max(ys)-min(ys)+1,min(xs),max(xs),max(xs)-min(xs)+1))
L=(17,31,12)
etendue2(pr,400,660,385,435,L,40,'"MESSAGES 2"')
etendue2(pr,140,340,495,545,L,40,'"LT. KANE"')
etendue2(pr,815,980,495,545,L,40,'"CE CYCLE"')
etendue2(pr,600,1060,270,320,(39,46,46),30,'"BRENNAR . GSM" (fond chassis)')
etendue2(pr,70,160,380,430,L,40,'barres de reseau (LCD)')
etendue2(pr,930,1000,380,430,L,40,'batterie (LCD)')
