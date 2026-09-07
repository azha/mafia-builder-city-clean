# Aperçu : vignette de la capture pour lecture humaine. N'ASSERTE RIEN.
from PIL import Image
import sys
SRC='../capture-nuit-1080x1920.png'
im = Image.open(SRC)
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
for w in (540, 810):
    h = round(im.height * w / im.width)
    im.resize((w,h), Image.LANCZOS).save(f'apercu-{w}.png')
    print(f'ecrit apercu-{w}.png {w}x{h}')
