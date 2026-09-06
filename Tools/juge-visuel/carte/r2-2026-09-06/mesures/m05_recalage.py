# m05 — RECALAGE reference <-> capture, par correlation des profils 1-D (lignes puis colonnes).
# Modele : cap = s * ref + t, un s par axe (je NE suppose PAS l'isotropie : je la MESURE).
# Controle positif : la courbe de cout doit avoir un minimum CONVEXE et net (sinon l'instrument ne discrimine pas).
# Controle negatif : le cout au minimum doit etre nettement inferieur au cout a +-20 px.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref = Image.open(os.path.join(D, "reference-1080x2102.png")).convert("L")
cap = Image.open(os.path.join(D, "capture-1080x2400.png")).convert("L")
print("OUVERT ref", ref.size, "cap", cap.size)
RP = ref.load(); CP = cap.load()

REF_Y0, REF_Y1 = 219, 2084      # contenu de la reference (m04)
CAP_Y0, CAP_Y1 = 232, 2135      # contenu de la capture (m03), hors bande sombre 2136..2151

def rowprof(px, y0, y1, x0, x1, step=3):
    out = {}
    for y in range(y0, y1+1):
        s = 0; n = 0
        for x in range(x0, x1, step):
            s += px[x, y]; n += 1
        out[y] = s/n
    return out
def colprof(px, x0, x1, y0, y1, step=3):
    out = {}
    for x in range(x0, x1+1):
        s = 0; n = 0
        for y in range(y0, y1, step):
            s += px[x, y]; n += 1
        out[x] = s/n
    return out

# profils sur la zone CENTRALE (evite les bords ou le cadrage differe)
rref = rowprof(RP, REF_Y0, REF_Y1, 200, 880)
rcap = rowprof(CP, CAP_Y0, CAP_Y1, 200, 880)
cref = colprof(RP, 20, 1060, 400, 1900)
ccap = colprof(CP, 20, 1060, 420, 1950)

def fit(pr, pc, lo_s, hi_s, ds, lo_t, hi_t, dt, keys):
    best = None; curve = []
    s = lo_s
    while s <= hi_s + 1e-9:
        t = lo_t
        while t <= hi_t + 1e-9:
            tot = 0.0; n = 0
            for k in keys:
                kk = s*k + t
                i = int(kk)
                if i in pc and (i+1) in pc:
                    f = kk - i
                    v = pc[i]*(1-f) + pc[i+1]*f
                    tot += abs(pr[k] - v); n += 1
            if n > 100:
                c = tot/n
                curve.append((s, t, c))
                if best is None or c < best[2]: best = (s, t, c)
            t += dt
        s += ds
    return best, curve

# --- axe Y
keysY = list(range(REF_Y0+20, REF_Y1-20, 2))
b, _ = fit(rref, rcap, 0.98, 1.08, 0.002, -40, 60, 1, keysY)
print(f"Y grossier : s={b[0]:.4f} t={b[1]:.1f} cout={b[2]:.3f}")
b, curveY = fit(rref, rcap, b[0]-0.004, b[0]+0.004, 0.0002, b[1]-3, b[1]+3, 0.2, keysY)
sY, tY, cY = b
print(f"Y fin      : s={sY:.5f} t={tY:.2f} cout={cY:.4f}")
# convexite / controle negatif
for dt in (-20, -10, -4, 0, 4, 10, 20):
    tot=0.0;n=0
    for k in keysY:
        kk = sY*k + tY + dt; i=int(kk)
        if i in rcap and i+1 in rcap:
            f=kk-i; tot += abs(rref[k]-(rcap[i]*(1-f)+rcap[i+1]*f)); n+=1
    print(f"   CTRL Y  t{dt:+3d} px -> cout {tot/n:.4f}")

# --- axe X
keysX = list(range(40, 1041, 2))
b, _ = fit(cref, ccap, 0.98, 1.08, 0.002, -40, 40, 1, keysX)
print(f"X grossier : s={b[0]:.4f} t={b[1]:.1f} cout={b[2]:.3f}")
b, curveX = fit(cref, ccap, b[0]-0.004, b[0]+0.004, 0.0002, b[1]-3, b[1]+3, 0.2, keysX)
sX, tX, cX = b
print(f"X fin      : s={sX:.5f} t={tX:.2f} cout={cX:.4f}")
for dt in (-20, -10, -4, 0, 4, 10, 20):
    tot=0.0;n=0
    for k in keysX:
        kk = sX*k + tX + dt; i=int(kk)
        if i in ccap and i+1 in ccap:
            f=kk-i; tot += abs(cref[k]-(ccap[i]*(1-f)+ccap[i+1]*f)); n+=1
    print(f"   CTRL X  t{dt:+3d} px -> cout {tot/n:.4f}")

print()
print(f"=> RECALAGE : cap_x = {sX:.5f} * ref_x + {tX:.2f}   |   cap_y = {sY:.5f} * ref_y + {tY:.2f}")
print(f"   anisotropie sX/sY = {sX/sY:.5f}")
print(f"   part de la peinture visible en X : ref_x {(0-tX)/sX:.1f} .. {(1079-tX)/sX:.1f}")
print(f"   part de la peinture visible en Y : ref_y {(CAP_Y0-tY)/sY:.1f} .. {(CAP_Y1-tY)/sY:.1f}")
