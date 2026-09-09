from lib import *
import math, json
C=json.load(open('centres.json'))
r=load(REF); d=load(DIS24)
print("  sondes de couleur du pivot")
for im,nm,pts in [(r,'REF',[(588,131),(587,130),(589,132)]),(d,'JEU',[(539,95),(540,96),(538,94),(539,90),(539,100)])]:
    for p in pts: print(f"    {nm} {p} -> {im.getpixel(p)}")
