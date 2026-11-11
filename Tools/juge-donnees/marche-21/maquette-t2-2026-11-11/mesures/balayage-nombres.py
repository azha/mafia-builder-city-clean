# P3 : tout nombre ECRIT EN LETTRES dans les cadres de ㉑ (101,102,103,106,146 = perimetre ; 104,105 hors lot pour memoire)
import re, os, sys, html as H
BASE=os.path.dirname(os.path.abspath(__file__))
MOTS=r'\b(z[ée]ro|une?|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante|soixante-douze|cent|mille|dix-huit|dix-sept|premi[èe]re?|second[e]?)\b'
st=open(os.path.join(BASE,'string_table-163402f1.ts'),encoding='utf-8').read().split('\n')
FR={}
for i in range(3302,3333):
    m=re.match(r"\s*'(marche\.[a-z0-9_.]+)':\s*'(.*)',\s*$", st[i])
    if m: FR[m.group(1)]=m.group(2).replace("\\'","'")
valeurs_fr=set(FR.values())
tot=0
for idx in (101,102,103,106,146,104,105):
    s=open(os.path.join(BASE,'cadre-%d.html'%idx),encoding='utf-8').read()
    s=re.sub(r'<svg.*?</svg>','',s,flags=re.S)
    # etiquette = legende du cadre (hors div.tel) ; le reste = contenu d'ecran
    et=re.search(r'<div class="etiquette">(.*?)</div>\s*<div class="tel">', s, re.S)
    etq=H.unescape(re.sub(r'<[^>]+>','',et.group(1))) if et else ''
    ecran=H.unescape(re.sub(r'<[^>]+>',' ', s[s.find('<div class="tel">'):]))
    perim = 'PERIMETRE' if idx in (101,102,103,106,146) else 'HORS LOT'
    for zone,txt in (('ETIQUETTE (legende du cadre, hors div.tel)',etq),('ECRAN (dans div.tel)',ecran)):
        for m in re.finditer(MOTS, txt, re.I):
            frag=txt[max(0,m.start()-45):m.start()+45].replace('\n',' ')
            frag=re.sub(r'\s+',' ',frag).strip()
            # le mot est-il DANS une valeur ratifiee servie par une cle ?
            dans_cle=[k for k,v in FR.items() if m.group(0).lower() in v.lower() and frag.split()[0][:6] in v or False]
            couvert=any(re.search(MOTS, v, re.I) and m.group(0).lower() in v.lower() for v in valeurs_fr)
            tot+=1
            print(f'{perim} cadre {idx} · {zone} · mot={m.group(0)!r} · dans une valeur de clé FR ratifiée ? {"OUI" if couvert else "NON"}')
            print(f'    …{frag}…')
print(f'\nTOTAL occurrences de nombre-en-lettres : {tot}')
