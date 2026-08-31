import sys
from PIL import Image
p,x0,y0,x1,y1,s,out = sys.argv[1],*map(int,sys.argv[2:7]),sys.argv[7]
im=Image.open(p); print(p.split('/')[-1], im.size)
c=im.crop((x0,y0,x1,y1)); c=c.resize((c.width*s,c.height*s), Image.NEAREST); c.save(out)
print('->',out,c.size)
