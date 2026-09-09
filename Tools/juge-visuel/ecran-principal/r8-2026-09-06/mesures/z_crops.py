import sys; sys.path.insert(0,'.')
from commun import *
from PIL import Image

def crop_css(cle, x0,y0,x1,y1, out, zoom=1.0):
    im, f = ouvrir(cle)
    b = (int(x0*f), int(y0*f), int(x1*f), int(y1*f))
    c = im.crop(b)
    # ramene tout a une echelle CSS commune x3 * zoom
    w = int((x1-x0)*3.0*zoom); h = int((y1-y0)*3.0*zoom)
    c = c.resize((w,h), Image.LANCZOS)
    c.save(out)
    print("  %-28s <- %-6s css(%.0f,%.0f)-(%.0f,%.0f) px%s -> %dx%d" % (out, cle, x0,y0,x1,y1, b, w,h))

# bandeau complet
crop_css('canon', 0,0,392,60, 'z_bandeau_canon.png')
crop_css('j1920', 0,0,392,60, 'z_bandeau_j1920.png')
crop_css('j2400', 0,0,392,60, 'z_bandeau_j2400.png')
# medaillon zoom x3
crop_css('canon', 158,2,234,78, 'z_medaillon_canon.png', 3.0)
crop_css('j1920', 158,2,234,78, 'z_medaillon_j1920.png', 3.0)
crop_css('j2400', 158,2,234,78, 'z_medaillon_j2400.png', 3.0)
