# Carte ASCII du medaillon : . fond, o or/moyeu, T teal, B braise, # creme(aiguille/texte)
from common import *
import math
def cls(c):
    r,g,b=c
    if r>150 and 100<g<175 and b<95 and r>g>b: return 'o'
    if b>g>r and g>70 and b-r>25: return 'T'
    if r>140 and r-g>50 and r-b>50: return 'B'
    if r>195 and g>185 and b>160: return '#'
    return '.'
def carte(im,box,pas,label):
    px=im.load(); print(f'  {label} box={box} pas={pas}')
    for y in range(box[1],box[3],pas):
        ln=''
        for x in range(box[0],box[2],pas):
            ln+=cls(px[x,y])
        print('    '+ln)
r=op(REF); carte(r,(485,15,695,225),3,'REF medaillon (x 485..695, y 15..225)')
