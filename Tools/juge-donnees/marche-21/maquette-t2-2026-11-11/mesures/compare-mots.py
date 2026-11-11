# Compare OCTET A OCTET les textes dessines (maquette e364496) aux valeurs du string_table (163402f1).
import re, os, sys, html as H
BASE=os.path.dirname(os.path.abspath(__file__))
st=open(os.path.join(BASE,'string_table-163402f1.ts'),encoding='utf-8').read().split('\n')
def table(lo,hi):
    d={}
    for i in range(lo-1,hi):
        m=re.match(r"\s*'(marche\.[a-z0-9_.]+)':\s*'(.*)',\s*$", st[i])
        if m: d[m.group(1)]=m.group(2).replace("\\'","'")
    return d
EN=table(333,363); FR=table(3303,3333)
print(f'clés FR lues (lignes 3303-3333) : {len(FR)} · clés EN lues (lignes 333-363) : {len(EN)}')
def inner(frag, sel):
    m=re.search(sel, frag, re.S)
    return m.group(1) if m else None
def plat(h):
    if h is None: return None
    h=re.sub(r'</?(u|em|b|i|small|span)>','',h)
    return H.unescape(h).strip()
def cad(i): return open(os.path.join(BASE,'cadre-%d.html'%i),encoding='utf-8').read()
ok=0; ko=0
def cmpr(nom, obtenu, attendu, cle):
    global ok,ko
    v = (obtenu==attendu)
    if v: ok+=1
    else: ko+=1
    print(('  OK   ' if v else '  ECART')+f' {nom} ({cle})')
    print(f'        dessiné  = {obtenu!r}')
    print(f'        attendu  = {attendu!r}')
    if not v:
        a=obtenu or ''; b=attendu or ''
        for j in range(max(len(a),len(b))):
            if j>=len(a) or j>=len(b) or a[j]!=b[j]:
                print(f'        1re divergence à l\'index {j} : dessiné={a[j:j+12]!r} attendu={b[j:j+12]!r}')
                break
print('\n=== 1. enseigne / sous-titre / compteurs / colonne / substances / formes (cadre 101) ===')
c101=cad(101)
cmpr('101 enseigne b', plat(inner(c101, r'<div class="enseigne"><b>(.*?)</b>')), FR['marche.titre.le_marche'], 'marche.titre.le_marche')
cmpr('101 enseigne i', plat(inner(c101, r'<div class="enseigne">.*?<i>(.*?)</i>')), FR['marche.sous_titre.tableau_du_verge_d_or'], 'marche.sous_titre.tableau_du_verge_d_or')
fens=re.findall(r'<div class="fen"><b>(.*?)</b><span>(.*?)</span></div>', c101, re.S)
print(f'  compteurs trouvés : {len(fens)}')
for val,lib in fens: print(f'        <b>={plat(val)!r}  <span>={plat(lib)!r}')
for lib,cle in ((plat(fens[0][1]),'marche.compteur.lignes_connues'),(plat(fens[1][1]),'marche.compteur.sures'),(plat(fens[2][1]),'marche.compteur.quartiers_noirs')):
    cmpr('101 libellé compteur', lib, FR[cle], cle)
ent=re.findall(r'<span(?: style="[^"]*")?>(?:<svg.*?</svg>)?([^<]*)</span>', inner(c101, r'<div class="entete">(.*?)</div>\s*<div class="grid">'), re.S)
print(f'  en-têtes de colonne trouvés : {len(ent)} -> {[e.strip() for e in ent]}')
for e,cle in zip([x.strip() for x in ent], ['marche.colonne.quartier','marche.substance.brindle','marche.substance.crick','marche.substance.hush','marche.substance.ash']):
    cmpr('101 en-tête', e, FR[cle], cle)
ogs=re.findall(r'<b style="color:#[0-9a-f]{6}">([^<]*)</b>\s*<small>([^<]*)</small>', c101)
print(f'  onglets trouvés : {len(ogs)} -> {ogs}')
for (s_,f_),(cs,cf) in zip(ogs, [('marche.substance.brindle','marche.forme.briques'),('marche.substance.crick','marche.forme.cristaux'),('marche.substance.hush','marche.forme.plaque'),('marche.substance.ash','marche.forme.prismes')]):
    cmpr('101 onglet substance', s_, FR[cs], cs); cmpr('101 onglet forme', f_, FR[cf], cf)
print('\n=== 2. P3 — phrase du bas, cadre 101 (ICU marche.phrase.bilan_lignes, n=3 total=72) ===')
bulle=plat(inner(c101, r'<div class="bulle">.*?<p>(.*?)</p>'))
icu=FR['marche.phrase.bilan_lignes']
m=re.search(r'other \{(.*?)\}\}$', icu)
rendu=m.group(1).replace('#','3').replace('{total}','72')
cmpr('101 phrase du bas', bulle, rendu, 'marche.phrase.bilan_lignes (branche other, n=3)')
print(f'        ICU brut = {icu!r}')
print('\n=== 3. P2 — cadre 146 : titre + phrase(s) de la case ash ===')
c146=cad(146)
pt=inner(c146, r'<div class="pt">(.*?)</div>')
print(f'  contenu brut de .pt = {pt!r}')
print(f'  nb <small> dans .pt = {len(re.findall(r"<small>", pt))} · nb <b> = {len(re.findall(r"<b", pt))} · nb <i> = {len(re.findall(r"<i>", pt))}')
cmpr('146 titre (après «LE VERRE · »)', plat(inner(c146, r'<div class="pt">.*?<b[^>]*>(.*?)</b>')).split(' · ',1)[1], FR['marche.titre.hors_du_tableau'], 'marche.titre.hors_du_tableau')
cmpr('146 ligne substance·origine', plat(inner(c146, r'<div class="pt"><i>(.*?)</i>')), FR['marche.substance.ash']+' · '+FR['marche.origine.lys_de_verre'], 'marche.substance.ash + marche.origine.lys_de_verre')
cmpr('146 phrase ash', plat(inner(c146, r'<div class="pt">.*?<small>(.*?)</small>')), FR['marche.phrase.case_ash'], 'marche.phrase.case_ash')
print('\n=== 4. cadres 102 / 103 : titres composés + phrases ===')
for idx,(cle_t,cle_p,orig) in ((102,('marche.confiance.recoupe','marche.phrase.bande_moderate','marche.origine.extrait_de_racine')),(103,('marche.titre.voyant_eteint','marche.phrase.case_sans_ligne','marche.origine.resine_de_lull'))):
    c=cad(idx)
    titre=plat(inner(c, r'<div class="pt">.*?<b[^>]*>(.*?)</b>'))
    print(f'  cadre {idx} titre dessiné = {titre!r} (quartier en capitales + « · » + libellé)')
    cmpr(f'{idx} 2e membre du titre', titre.split(' · ',1)[1], FR[cle_t].upper(), cle_t+' (.upper())')
    cmpr(f'{idx} phrase', plat(inner(c, r'<div class="pt">.*?<small>(.*?)</small>')), FR[cle_p], cle_p)
    cmpr(f'{idx} ligne substance·origine', plat(inner(c, r'<div class="pt"><i>(.*?)</i>')), FR['marche.substance.'+('crick' if idx==102 else 'hush')]+' · '+FR[orig], 'substance + '+orig)
print(f'\n=== BILAN : {ok} conformes · {ko} écarts ===')
sys.exit(1 if ko else 0)
