def L(c):
    f=lambda v:(v/255/12.92 if v/255<=0.04045 else ((v/255+0.055)/1.055)**2.4)
    r,g,b=[f(v) for v in c]; return .2126*r+.7152*g+.0722*b
def cr(a,b):
    la,lb=sorted([L(a),L(b)],reverse=True); return (la+.05)/(lb+.05)
kr=(117,88,46); cream=(216,202,167)
print('--- état actuel (jetons du code sur le kraft médian mesuré du jeu (117,88,46))')
print('DepotTitre Or d9ab4e', round(cr((0xd9,0xab,0x4e),kr),2),' Cible/Effet/Avert Creme2 b9ac92', round(cr((0xb9,0xac,0x92),kr),2))
print('--- proposé : sur PlaqueCreme (216,202,167)')
for n,c in [('EncreDuRegistre 2b2a26',(0x2b,0x2a,0x26)),('EncreFaibleDuRegistre 6b695e',(0x6b,0x69,0x5e)),('RougeDuRegistre 93402c',(0x93,0x40,0x2c))]:
    print(n, round(cr(c,cream),2))
