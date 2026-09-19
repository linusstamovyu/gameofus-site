# Cut Codex regen walk rows (one PNG per facing, 3 figures) into 9-cell site walk sheets. Hero lab only.
# python3 tools/cut_regen_walk_rows.py   (run from gameofus-site/; writes public/lab/kai_walk_new*.webp)
# Cut Codex's new Kai rows (one PNG per facing, 3 figures) into the site's 9-cell walk sheets, for the hero preview.
from PIL import Image
import numpy as np
from scipy import ndimage
OUT='source/regen-2026-09/out/'
def figures(path):
    a=np.array(Image.open(path).convert('RGBA'))
    mask=a[...,3]>40
    lab,n=ndimage.label(mask, structure=np.ones((3,3)))
    sizes=ndimage.sum(mask,lab,range(1,n+1))
    boxes=ndimage.find_objects(lab)
    big=[i for i in range(n) if sizes[i]>=0.02*sizes.max()]
    big.sort(key=lambda i: boxes[i][1].start)
    groups=[]
    for i in big:
        sx=boxes[i][1]
        if groups and sx.start<=max(boxes[j][1].stop for j in groups[-1])+6: groups[-1].append(i)
        else: groups.append([i])
    assert len(groups)==3,(path,len(groups))
    out=[]
    for g in groups:
        main=max(g,key=lambda i:sizes[i]); my=boxes[main][0]
        # keep only pieces that touch the main body vertically (drops stray heads from a neighbouring row)
        keep=[i for i in g if boxes[i][0].start<=my.stop+8 and boxes[i][0].stop>=my.start-8]
        m=np.isin(lab,[i+1 for i in keep]); b=a.copy(); b[~m,3]=0
        ys,xs=np.nonzero(m)
        out.append(Image.fromarray(b).crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1)))
    return out
def build(rows, cell_w, cell_h, fig_h, foot):
    sheet=Image.new('RGBA',(cell_w*9,cell_h),(0,0,0,0))
    for r,row in enumerate(rows):
        s=fig_h/row[0].height
        for c,f in enumerate(row):
            w,h=f.width*s,f.height*s
            k=min(1,cell_w/w,(foot-1)/h)
            g=f.resize((max(1,round(w*k)),max(1,round(h*k))),Image.LANCZOS); w,h=g.size
            sheet.alpha_composite(g,((r*3+c)*cell_w+(cell_w-w)//2, foot-h))
    return sheet
rows=lambda p:[figures(f'{p}_{d}.png') for d in ('down','up','left')]
build(rows(OUT+'05-kai-walk/kai_walk_beach'),64,128,106,125).save('public/lab/kai_walk_new.webp','WEBP',quality=92)
for w in ['mars','neon','jungle','ski','fairy']:
    build(rows(OUT+f'07-world-outfits/kai_walk_{w}'),128,256,212,250).save(f'public/lab/kai_walk_new_{ {"mars":"space"}.get(w,w) }.webp','WEBP',quality=92)
