# m27 — TABLE FINALE des 18 noms : consolide m13 (15 noms), m14/m14b (SARNES, PONT-GRIS, LA CHANCELLERIE)
#       et la remesure serree de LA LISIERE. Toutes les valeurs viennent des scripts ; rien n'est saisi a la main
#       sauf les 4 lignes remesurees, dont la fenetre est ecrite dans le script d'origine.
# CONVENTION D'ANGLE : 0 deg = horizontale de l'image ; POSITIF = HORAIRE a l'ecran.
import json, os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); M=os.path.join(D,"mesures")
v4=json.load(open(os.path.join(M,"noms_v4.json")))
T={r["nom"]:{"src":r["src"],"ra":r["ref"]["ang"],"ca":r["cap"]["ang"],"rh":r["ref"]["hcap"],"ch":r["cap"]["hcap"],
             "rl":r["ref"]["larg"],"cl":r["cap"]["larg"],"rt":r["ref"]["trou"],"ct":r["cap"]["trou"]} for r in v4}
# remesures (fenetres declarees dans m14 / m14b / le controle LA LISIERE)
T["SARNES"]={"src":-10,"ra":-10.00,"ca":-9.47,"rh":20,"ch":19,"rl":116,"cl":95,"rt":6.0,"ct":3.0}
T["PONT-GRIS"]={"src":-7,"ra":-7.02,"ca":-7.21,"rh":19,"ch":28,"rl":185,"cl":150,"rt":6.5,"ct":4.0}
T["LA CHANCELLERIE"]={"src":18,"ra":18.16,"ca":18.25,"rh":33,"ch":24,"rl":262,"cl":215,"rt":6.0,"ct":3.0}
T["LA LISIERE"]={"src":-7,"ra":None,"ca":-5.63,"rh":None,"ch":None,"rl":None,"cl":157,"rt":None,"ct":3.0}
ORD=["LES BASSINS","QUAI-NORD","SARNES","LA COLONNE","HAUTES-MARCHES","VERRIER","SAINT-BRAND",
     "LES ENTREPOTS","DEPOT-EST","LE TREILLIS","MARNE-BASSE","LE VERRE","ORSEL","PLACE DES COMPTES",
     "LA LISIERE","LA CHANCELLERIE","LES FRICHES","PONT-GRIS"]
print(f"{'nom':19s}{'source':>7}{'REF':>8}{'CAP':>8}{'CAP-src':>9}{'CAP-REF':>9}")
dc=[];da=[]
for n in ORD:
    t=T[n]
    ra="  —  " if t["ra"] is None else f"{t['ra']:+8.2f}"
    dsrc=f"{t['ca']-t['src']:+9.2f}"
    dref="      —  " if t["ra"] is None else f"{t['ca']-t['ra']:+9.2f}"
    dc.append(t["ca"]-t["src"])
    if t["ra"] is not None: da.append(t["ca"]-t["ra"])
    print(f"{n:19s}{t['src']:>+7}{ra:>8}{t['ca']:>+8.2f}{dsrc}{dref}")
print(f"\n18/18 mesures en jeu. CAP - source : mediane {statistics.median(dc):+.2f} deg, max |{max(abs(v) for v in dc):.2f}| ({ORD[max(range(18),key=lambda i:abs(dc[i]))]})")
print(f"CAP - REF (17 comparables) : mediane {statistics.median(da):+.2f} deg, max |{max(abs(v) for v in da):.2f}|")
print(f"amplitude en jeu : {min(T[n]['ca'] for n in ORD):+.2f} .. {max(T[n]['ca'] for n in ORD):+.2f} = {max(T[n]['ca'] for n in ORD)-min(T[n]['ca'] for n in ORD):.2f} deg")
print(f"amplitude de la SOURCE : {min(T[n]['src'] for n in ORD)} .. {max(T[n]['src'] for n in ORD)} = {max(T[n]['src'] for n in ORD)-min(T[n]['src'] for n in ORD)} deg")
prof=sorted(set(T[n]['src'] for n in ORD))
print(f"profils de trame distincts dans la source : {prof} ({len(prof)} valeurs)")
for p in prof:
    g=[n for n in ORD if T[n]['src']==p]
    print(f"   rot {p:+3d} : {len(g)} quartiers, angles en jeu {[round(T[n]['ca'],2) for n in g]}")
print("\nHAUTEUR DE CAPITALE et LARGEUR (mots ou les deux cotes sont propres) :")
ok=[n for n in ORD if T[n]['rh'] and 14<=T[n]['rh']<=22 and T[n]['ch'] and 14<=T[n]['ch']<=22]
print(f"{'nom':19s}{'hcap REF':>9}{'hcap CAP':>9}{'x':>7}{'larg REF':>10}{'larg CAP':>10}{'x':>7}{'trou REF':>10}{'trou CAP':>10}")
for n in ok:
    t=T[n]
    print(f"{n:19s}{t['rh']:>9}{t['ch']:>9}{t['ch']/t['rh']:>7.2f}{t['rl']:>10}{t['cl']:>10}{t['cl']/t['rl']:>7.3f}{t['rt']:>10.1f}{t['ct']:>10.1f}")
print(f"n={len(ok)} | hcap rapport med {statistics.median(T[n]['ch']/T[n]['rh'] for n in ok):.3f}"
      f" | largeur rapport med {statistics.median(T[n]['cl']/T[n]['rl'] for n in ok):.3f}"
      f" | trou REF med {statistics.median(T[n]['rt'] for n in ok):.1f} px, CAP med {statistics.median(T[n]['ct'] for n in ok):.1f} px")
