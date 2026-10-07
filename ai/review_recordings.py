"""Import historical TSVs as RAW sensor values and plot candidate annotations.
These records are not four-zone calibrated mmHg training data.
Usage: python ai/review_recordings.py /path/to/text/files --out review
"""
import argparse, json
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

NOTES=[('4 miles',15,16,'Cramping reported around 15 min'),('strap adjustment',20,21,'Strap adjustment reported around 20 min'),('cramp at 22',22,23,'Cramp reported at 22–23 min'),('empty stomach',55,56,'Reported event around 55 min')]
def main():
 ap=argparse.ArgumentParser();ap.add_argument('folder');ap.add_argument('--out',default='review');a=ap.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
 summary=[];annotations=[]
 for idx,p in enumerate(sorted(Path(a.folder).glob('*.txt'))):
  d=pd.read_csv(p,sep='\t')
  if 'Offset' not in d: continue
  cols=[c for c in d if c.startswith('Sensor ')]
  t=pd.to_numeric(d.Offset,errors='raise')
  if t.isna().any() or (t.diff().dropna()<0).any(): raise ValueError('Invalid offsets: '+p.name)
  elapsed=(t-t.iloc[0])/1000
  raw=d[cols].apply(pd.to_numeric,errors='raise')
  if not np.isfinite(raw.to_numpy()).all(): raise ValueError('Invalid sensor data')
  # Median within one second; missing seconds stay missing (no interpolated events).
  seconds=elapsed.astype(int)
  b=raw.groupby(seconds).median().reindex(range(int(seconds.iloc[-1])+1))
  b.index.name='elapsed_seconds'; b.to_csv(out/f'recording-{idx+1}.csv')
  event=next((n for n in NOTES if n[0] in p.name),None)
  fig,axes=plt.subplots(len(cols),1,figsize=(11,2.2*len(cols)),sharex=True,squeeze=False)
  fig.patch.set_facecolor('#0b1728')
  for k,c in enumerate(cols):
   ax=axes[k,0];ax.set_facecolor('#0b1728');ax.plot(b.index/60,b[c],color=['#63d5ea','#a997ff','#49d4a3'][k],lw=.65,alpha=.5,label='1-second median')
   ax.plot(b.index/60,b[c].rolling(60,min_periods=45).median(),color='#ffffff',lw=1.1,label='60-second median')
   if event: ax.axvspan(event[1],event[2],color='#ffbf69',alpha=.2)
   ax.set_ylabel(c+'\nraw units',color='#bfd0e0');ax.tick_params(colors='#bfd0e0',labelsize=9);ax.grid(alpha=.12,color='#bfd0e0')
   for spine in ax.spines.values():spine.set_color('#29455f')
  axes[-1,0].set_xlabel('Minutes since recording start',color='#bfd0e0')
  title=f'Recording {idx+1} · '+(event[3] if event else 'Drift / cool-down reported; exact timing unconfirmed')
  fig.suptitle(title+'\nShading = filename annotation, not algorithm-confirmed event',color='white',fontsize=12)
  fig.tight_layout(rect=[0,0,1,.91]);fig.savefig(out/f'recording-{idx+1}.png',dpi=140,facecolor=fig.get_facecolor());plt.close(fig)
  summary.append({'recording':idx+1,'source':p.name,'rows':len(d),'minutes':round(float(elapsed.iloc[-1])/60,2),'channels':cols,'median_sample_ms':float(t.diff().median()),'maximum_gap_ms':float(t.diff().max()),'missing_1s_bins':int(b.isna().any(axis=1).sum()),'units':'raw/unconfirmed','calibration':'not provided'})
  annotations.append({'recording':idx+1,'start_seconds':event[1]*60 if event else None,'end_seconds':event[2]*60 if event else None,'reported_event':event[3] if event else 'Drift and cool-down reported; exact timing unconfirmed','model_label':None,'confirmed':False,'subject_id':None})
 (out/'summary.json').write_text(json.dumps(summary,indent=2));(out/'annotations.json').write_text(json.dumps(annotations,indent=2))
 html='<html><meta name="viewport" content="width=device-width"><title>Recording review</title><body style="background:#0b1728;color:#eff8ff;font:16px system-ui;max-width:1100px;margin:40px auto;padding:20px"><h1>Pressure recording review</h1><p>Raw values from legacy two- and three-channel recordings. Filename notes are unconfirmed annotations. No adverse-event diagnosis or pressure threshold is applied.</p>'
 for s in summary: html+=f'<h2>Recording {s["recording"]}</h2><p>{s["source"]}</p><p>{s["minutes"]} minutes · {len(s["channels"])} channels · {s["rows"]:,} samples · raw units</p><img style="width:100%" src="recording-{s["recording"]}.png">'
 (out/'index.html').write_text(html+'</body></html>')
 print(json.dumps(summary,indent=2))
if __name__=='__main__': main()
