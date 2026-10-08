from PIL import Image
S='/tmp/claude-1000/-home-erutheone-project-mafia-unity-F/2d7b0615-a2ca-4752-8f32-06da876e1c7c/scratchpad/'
CAP='/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-mots/'
REF4='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/decision-du-jour/reference-1080x2102.png'
def cream(p): return p[0]>195 and p[1]>175 and p[2]>130 and 25<p[0]-p[2]<85
def card(path,ylo,yhi):
    im=Image.open(path).convert('RGB'); w,h=im.size; px=im.load()
    rows=[y for y in range(ylo,yhi) if sum(cream(px[x,y]) for x in range(120,640,4))>0.45*130]
    cols=[x for x in range(0,w//1,3) if sum(cream(px[x,y]) for y in range(rows[0],rows[-1],6))>0.4*((rows[-1]-rows[0])//6)]
    print(path.split('/')[-1],f'{w}x{h}','carte: y',rows[0],rows[-1],'H=',rows[-1]-rows[0],' x',cols[0],cols[-1],'L=',cols[-1]-cols[0],' L/H=%.2f'%((cols[-1]-cols[0])/(rows[-1]-rows[0])))
card(REF4,700,1560); card(S+'s6-idx4.png',780,1680)
card(CAP+'E11_DecisionDetail_1080x2400.png',1400,1900); card(CAP+'E11_DecisionDetail_1080x1920.png',950,1420)
