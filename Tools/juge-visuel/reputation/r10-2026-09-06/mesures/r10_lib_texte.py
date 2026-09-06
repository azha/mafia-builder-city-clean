# r10-lib : detection de LIGNES de texte et de leur encre dans une boite.
# encre = luminance > mediane du fond de la boite + seuil. Chaque appel imprime la taille de l'image.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IMG={"REF":(D+"reference-1080x2102.png",21,452),"CAP":(D+"capture-1080x2400.png",18,18)}
_cache={}
def img(k):
    if k not in _cache:
        im=Image.open(IMG[k][0]).convert("RGB"); _cache[k]=(im,im.load(),IMG[k][1],IMG[k][2])
        print(f"[{k}] taille={im.size}")
    return _cache[k]
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def lignes(k,u0,v0,u1,v1,seuil=22,minpix=2):
    im,px,x0,y0=img(k)
    vals=[lum(px[x0+u,y0+v]) for v in range(v0,v1) for u in range(u0,u1,3)]
    bg=sorted(vals)[len(vals)//2]
    rows=[]
    for v in range(v0,v1):
        c=[u for u in range(u0,u1) if lum(px[x0+u,y0+v])>bg+seuil]
        rows.append((v,c))
    grp=[]; cur=[]
    for v,c in rows:
        if len(c)>=minpix: cur.append((v,c))
        else:
            if cur: grp.append(cur); cur=[]
    if cur: grp.append(cur)
    out=[]
    for g in grp:
        vs=[v for v,_ in g]; us=[u for _,c in g for u in c]
        out.append({"v0":vs[0],"v1":vs[-1],"h":vs[-1]-vs[0]+1,
                    "u0":min(us),"u1":max(us),"l":max(us)-min(us)+1,
                    "n":len(us),"cu":sum(us)/len(us)})
    return bg,out
def montre(k,label,u0,v0,u1,v1,seuil=22):
    bg,L=lignes(k,u0,v0,u1,v1,seuil)
    print(f"  {k} {label}: fond L={bg:.1f}  {len(L)} ligne(s)")
    for i,l in enumerate(L,1):
        print(f"     l{i}: v {l['v0']}..{l['v1']} (h={l['h']})  u {l['u0']}..{l['u1']} (l={l['l']})  centre_u={l['cu']:.1f}  n={l['n']}")
    if len(L)>1:
        print("     pas de ligne (v0 a v0) :", [L[i+1]['v0']-L[i]['v0'] for i in range(len(L)-1)])
    return L
