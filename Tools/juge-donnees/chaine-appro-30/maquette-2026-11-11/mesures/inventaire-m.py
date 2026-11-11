import re, json, sys
p='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/chaine-appro-30/maquette-2026-11-11/mesures/cadre30-source.html'
s=open(p,encoding='utf-8').read()
out={}
out['noeuds']=len(re.findall(r'class="noeud gr30-n"', s))
out['pastilles_gr30_pt']=len(re.findall(r'class="gr30-pt" style="background:(#[0-9a-f]{6})', s))
out['couleurs_pastilles']=re.findall(r'class="gr30-pt" style="background:(#[0-9a-f]{6})', s)
out['aservir_total']=len(re.findall(r'class="gr30-aservir"', s))
out['fleches_refoule']=len(re.findall(r'class="gr30-fl"', s))
out['texte_refoule']=sorted(set(re.findall(r'class="gr30-fl">([^<]*)', s)))
out['liaisons_gr30_l']=len(re.findall(r'class="gr30-l(?: gr30-contourne)?"', s))
out['contournees']=len(re.findall(r'gr30-contourne', s))
out['mot_contournee']=re.findall(r'class="gr30-ctn">([^<]+)<', s)
out['fleches_liaison']=len(re.findall(r'class="gr30-fleche">([^<]+)<', s))
out['etats']=re.findall(r'<div class="etat" style="color:(#[0-9a-f]{6})">([^<]+)</div>', s)
out['titrons']=re.findall(r'class="titron[^"]*">([^<]+)<', s)
out['h3']=re.findall(r'<h3>([^<]+)</h3>', s)
out['p_entete']=re.findall(r'<p>([^<]+)</p>', s)
out['barre_lib_val']=re.findall(r'<span class="(lib|val)">([^<]*)</span>', s)
out['svg_paths']=len(re.findall(r'<path ', s))
out['hauteur_panneau']=re.findall(r'class="appr6" style="([^"]+)"', s)
# aucun scalaire chiffre dans le corps du panneau ?
corps = s[s.index('<div class="abody">'):]
out['chiffres_dans_le_corps']=re.findall(r'\d[\d  .,]*\s*(?:%|€|/)?', re.sub(r'<[^>]+>','|',corps))
print(json.dumps(out, ensure_ascii=False, indent=1))
