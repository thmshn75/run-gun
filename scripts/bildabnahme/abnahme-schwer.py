#!/usr/bin/env python3
"""Abnahmepruefung Block 2. Aufruf: python3 abnahme-check.py f g
Alle Grenzwerte sind an den ABGENOMMENEN Saetzen die Vorlagen enemy-heavy-e/g/i kalibriert:
diese beiden bestehen die Pruefung, die bisherigen Fehlversuche fallen durch.
Aufruf mit e/i moeglich, um das nachzuvollziehen."""
import sys, colorsys
from statistics import median
from collections import deque
from PIL import Image

LIM = {"e": dict(px=(4700,7100), top=(6,4), bot=(103,2)),
       "g": dict(px=(3800,5750), top=(7,4), bot=(102,2)),
       "i": dict(px=(3680,5520), top=(6,4), bot=(102,2))}
FRAY_MAX   = 0.70   # Ausgefranste Einzelpunkte. Referenz: e 0.56, i 0.37
HALO_MAX   = 3.50   # Heller Saum am Rand.      Referenz: e 3.14, i 0.74
PINK_MAX   = 0.05   # Pink/Magenta im Koerper.  Referenz: e 0.00, i 0.00
MAG_MAX    = 2.00
SOLID_MIN  = 60.0
DIST_MAX   = 32.0   # Farbabstand zur Vorlage.  Referenz: e 15.5, i 28.0
HIST_VORL  = 0.60   # Farbverteilung wie Vorlage. Referenz: e 0.68, i 0.70
HIST_INTRA = 0.80   # Bilder untereinander.     Referenz: e 0.85, i 0.90
SIZE_SPAN  = 1.30   # groesstes/kleinstes Bild. Referenz: e 1.12, i 1.19
D17_MIN, NB_MIN = 35.0, 4.0

def lum(r,g,b): return 0.299*r+0.587*g+0.114*b
def is_pink(r,g,b):
    h,s,v = colorsys.rgb_to_hsv(r/255,g/255,b/255)
    return 0.78<=h<=0.95 and s>=0.25 and v>=0.20
def hist(op):
    h={}
    for r,g,b in op: 
        k=(r>>5,g>>5,b>>5); h[k]=h.get(k,0)+1
    return {k:v/len(op) for k,v in h.items()}
def inter(a,b): return sum(min(v,b.get(k,0)) for k,v in a.items())
def avg(op): n=len(op); return tuple(sum(p[i] for p in op)/n for i in range(3))

def measure(path):
    im=Image.open(path).convert("RGBA"); p=im.load(); w,h=im.size
    op=[(x,y) for y in range(h) for x in range(w) if p[x,y][3]>=128]
    cols=[p[x,y][:3] for x,y in op]
    med=median([lum(*c) for c in cols])
    fray=edge=halo=mag=solid=pink=0
    for x,y in op:
        r,g,b,a=p[x,y]
        if a>=250: solid+=1
        if is_pink(r,g,b): pink+=1
        n=sum(1 for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1))
              if 0<=nx<w and 0<=ny<h and p[nx,ny][3]>=128)
        if n<=1: fray+=1
        if n<4:
            edge+=1
            if lum(r,g,b)>med+60: halo+=1
            if r>90 and b>90 and g<=min(r,b)-30: mag+=1
    seen=set(); parts=0
    for s in op:
        if s in seen: continue
        q=deque([s]); seen.add(s); size=0
        while q:
            x,y=q.popleft(); size+=1
            for c in ((x-1,y),(x+1,y),(x,y-1),(x,y+1),(x-1,y-1),(x+1,y-1),(x-1,y+1),(x+1,y+1)):
                if c not in seen and 0<=c[0]<w and 0<=c[1]<h and p[c[0],c[1]][3]>=128:
                    seen.add(c); q.append(c)
        if size>10: parts+=1
    return dict(size=im.size, n=len(op), top=min(y for _,y in op), bot=max(y for _,y in op),
                fray=100*fray/len(op), halo=100*halo/max(edge,1), mag=100*mag/max(edge,1),
                pink=100*pink/len(op), solid=100*solid/len(op), parts=parts,
                hist=hist(cols), avg=avg(cols), mask=frozenset(op))

def diff(a,b): return 100*len(a^b)/max(len(a|b),1)

ok_all=True
for k in sys.argv[1:]:
    lim=LIM[k]
    vo=[p[:3] for p in Image.open(f"src/assets/enemy-heavy-{k}.png").convert("RGBA").getdata() if p[3]>=128]
    vh, va = hist(vo), avg(vo)
    ms=[measure(f"src/assets/enemy-heavy-{k}-move-{i}.png") for i in range(1,13)]
    print(f"\n=== light-{k} ===")
    for i,m in enumerate(ms,1):
        dist=sum((a-b)**2 for a,b in zip(va,m["avg"]))**0.5
        hv=inter(vh,m["hist"])
        bad=[]
        if m["size"]!=(84,104): bad.append(f"Groesse {m['size']}")
        if not lim["px"][0]<=m["n"]<=lim["px"][1]: bad.append(f"opak {m['n']}")
        if abs(m["top"]-lim["top"][0])>lim["top"][1]: bad.append(f"oben {m['top']}")
        if abs(m["bot"]-lim["bot"][0])>lim["bot"][1]: bad.append(f"unten {m['bot']}")
        if m["parts"]!=1: bad.append(f"Teile {m['parts']}")
        if m["solid"]<SOLID_MIN: bad.append(f"deckend {m['solid']:.1f}%")
        if m["fray"]>FRAY_MAX: bad.append(f"EINZELPUNKTE {m['fray']:.2f}>{FRAY_MAX}")
        if m["halo"]>HALO_MAX: bad.append(f"HELLER SAUM {m['halo']:.2f}>{HALO_MAX}")
        if m["pink"]>PINK_MAX: bad.append(f"PINK/MAGENTA {m['pink']:.2f}>{PINK_MAX}")
        if m["mag"]>MAG_MAX: bad.append(f"magenta Rand {m['mag']:.2f}")
        if dist>DIST_MAX: bad.append(f"FIGUR ANDERS: Farbabstand {dist:.1f}>{DIST_MAX}")
        if hv<HIST_VORL: bad.append(f"FIGUR ANDERS: Farbverteilung {hv:.2f}<{HIST_VORL}")
        print(f"  Bild {i:2d}: opak {m['n']:4d} | Punkte {m['fray']:5.2f} | Saum {m['halo']:5.2f} | "
              f"pink {m['pink']:4.2f} | Abstand {dist:5.1f} | Verteilung {hv:.2f} | "
              + ("OK" if not bad else "FEHLER: "+", ".join(bad)))
        if bad: ok_all=False
    span=max(m["n"] for m in ms)/min(m["n"] for m in ms)
    intra=min(inter(ms[i]["hist"],ms[j]["hist"]) for i in range(12) for j in range(i+1,12))
    d17=diff(ms[0]["mask"],ms[6]["mask"])
    nb=min(diff(ms[i]["mask"],ms[(i+1)%12]["mask"]) for i in range(12))
    line=[]
    if span>SIZE_SPAN: line.append(f"GROESSENSPANNE {span:.2f}>{SIZE_SPAN}"); 
    if intra<HIST_INTRA: line.append(f"SATZ UNEINHEITLICH {intra:.2f}<{HIST_INTRA}")
    if d17<D17_MIN: line.append(f"Bild 1 zu 7 nur {d17:.1f}%")
    if nb<NB_MIN: line.append(f"Nachbarabstand nur {nb:.1f}%")
    print(f"  Satz: Groessenspanne {span:.2f} (<={SIZE_SPAN}) | untereinander {intra:.2f} (>={HIST_INTRA}) | "
          f"Bild 1 zu 7 {d17:.1f}% (>=35) | kleinster Nachbarabstand {nb:.1f}% (>=4)"
          + ("" if not line else "\n  FEHLER: "+", ".join(line)))
    if line: ok_all=False
print("\n"+("ALLES BESTANDEN" if ok_all else "NICHT BESTANDEN"))
sys.exit(0 if ok_all else 1)
