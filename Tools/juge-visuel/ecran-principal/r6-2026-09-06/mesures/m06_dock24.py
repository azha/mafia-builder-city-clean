from lib import *
c=load(CAP24); d=load(DIS24)
def find_dock_y(im):
    best=None
    for y in range(2100,2380):
        row=[lum(im.getpixel((x,y))) for x in range(180,340)]
        v=max(row)-min(row)
        if best is None or v>best[1]: best=(y,v)
    return best
for im,nm in [(c,'fiche 2400'),(d,'district 2400')]:
    print(nm, 'ligne de plus fort contraste bande 2100-2380 :', find_dock_y(im))
# profil au y suppose (centre des ronds) : 812.9 CSS -> 2240 px
for im,nm in [(c,'fiche 2400'),(d,'district 2400')]:
    print(f"--- {nm} profil y=2240 (={2240/S_CAP:.1f} CSS) ---")
    line=[]
    for x in range(180,340):
        line.append(f"{x/S_CAP:6.1f}:{lum(im.getpixel((x,2240))):5.1f}")
    for i in range(0,len(line),8): print('   '+' '.join(line[i:i+8]))
    break
