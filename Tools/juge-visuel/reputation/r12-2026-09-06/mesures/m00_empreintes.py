import sys, hashlib, os; sys.path.insert(0,'.')
from PIL import Image
print("=== m00 : empreintes et tailles des fichiers reellement lus ===")
for f in sorted(os.listdir('..')):
    if f.endswith('.png'):
        p='../'+f
        im=Image.open(p)
        h=hashlib.sha256(open(p,'rb').read()).hexdigest()
        print(f"  {f:42s} {str(im.size):14s} {im.mode}  sha256 {h[:32]}")
