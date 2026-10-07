"""Research training/export pipeline, not a released medical model.
Input NPZ: pressures [N,64,4] calibrated mmHg at 1 Hz; labels [N] integers
0 stable, 1 positional transient, 2 sustained change, 3 uncertain;
patient_ids [N] deidentified IDs; split [N] train/validation/test.
Windows must not overlap across splits. All windows for one patient stay together.
"""
import argparse
import json
from pathlib import Path
import numpy as np

def features(p):
    delta = np.diff(p, axis=1, prepend=p[:, :1, :])
    return np.concatenate([p / 100., delta / 100.], axis=-1).astype(np.float32)

def load(path):
    d = np.load(path, allow_pickle=False)
    p, y, ids, split = (d[k] for k in ('pressures','labels','patient_ids','split'))
    if p.ndim != 3 or p.shape[1:] != (64,4) or len(p)<3: raise ValueError('Expected [N,64,4] pressures')
    if y.shape != (len(p),) or ids.shape != y.shape or split.shape != y.shape: raise ValueError('Metadata shape mismatch')
    if not np.isfinite(p).all() or (p<0).any() or (p>200).any(): raise ValueError('Invalid calibrated pressure')
    if not np.issubdtype(y.dtype,np.integer) or not np.isin(y,[0,1,2,3]).all(): raise ValueError('Invalid labels')
    if not np.isin(split,['train','validation','test']).all(): raise ValueError('Invalid split')
    groups=[set(ids[split==s].tolist()) for s in ('train','validation','test')]
    if any(not g for g in groups) or any(groups[i]&groups[j] for i,j in ((0,1),(0,2),(1,2))): raise ValueError('Empty split or patient leakage')
    for s in ('train','validation','test'):
        if set(y[split==s].tolist()) != {0,1,2,3}: raise ValueError('Every split must contain all four classes')
    return features(p), y, split

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('data'); parser.add_argument('--out',default='export'); parser.add_argument('--epochs',type=int,default=40); args=parser.parse_args()
    x,y,split=load(args.data)
    import tensorflow as tf
    tf.keras.utils.set_random_seed(42)
    train=split=='train'; val=split=='validation'; test=split=='test'
    model=tf.keras.Sequential([tf.keras.layers.Input(shape=(64,8)),tf.keras.layers.Flatten(),tf.keras.layers.Dense(24,activation='relu'),tf.keras.layers.Dense(12,activation='relu'),tf.keras.layers.Dense(4,activation='softmax')])
    model.compile(optimizer='adam',loss='sparse_categorical_crossentropy',metrics=['accuracy'])
    model.fit(x[train],y[train],validation_data=(x[val],y[val]),epochs=args.epochs,batch_size=32,callbacks=[tf.keras.callbacks.EarlyStopping(patience=5,restore_best_weights=True)])
    out=Path(args.out); out.mkdir(parents=True,exist_ok=True); model.save(out/'pressure_artifact.keras')
    converter=tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations=[tf.lite.Optimize.DEFAULT]
    def representative():
        for sample in x[train][:500]: yield [sample[None]]
    converter.representative_dataset=representative
    converter.target_spec.supported_ops=[tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
    converter.inference_input_type=tf.int8; converter.inference_output_type=tf.int8
    data=converter.convert(); (out/'pressure_artifact.int8.tflite').write_bytes(data)
    interpreter=tf.lite.Interpreter(model_content=data); interpreter.allocate_tensors()
    inp=interpreter.get_input_details()[0]; output=interpreter.get_output_details()[0]
    scale,zero=inp['quantization']; oscale,ozero=output['quantization']
    if scale<=0 or oscale<=0: raise ValueError('Invalid quantization metadata')
    probs=[]
    for sample in x[test]:
        q=np.clip(np.rint(sample[None]/scale+zero),-128,127).astype(np.int8)
        interpreter.set_tensor(inp['index'],q); interpreter.invoke()
        probs.append((interpreter.get_tensor(output['index'])[0].astype(float)-ozero)*oscale)
    probs=np.array(probs); pred=probs.argmax(axis=1); actual=y[test]
    matrix=np.zeros((4,4),dtype=int)
    for a,b in zip(actual,pred): matrix[a,b]+=1
    # Header intended for a firmware developer; tensor arena sizing must be measured.
    byte_text=','.join(str(b) for b in data)
    (out/'pressure_model.h').write_text('#pragma once\n#include <cstddef>\nalignas(16) const unsigned char pressure_model[] = {'+byte_text+'};\nconst size_t pressure_model_len = sizeof(pressure_model);\n')
    manifest={'validated':False,'purpose':'research shadow inference','labels':['stable','positional','sustained','uncertain'],'input_shape':[1,64,8],'sample_period_ms':1000,'pressure_scale':100,'confidence_gate':0.85,'input_quantization':[float(scale),int(zero)],'output_quantization':[float(oscale),int(ozero)],'test_confusion_matrix':matrix.tolist(),'quantized_test_accuracy':float((actual==pred).mean()),'quantized_sustained_recall':float(matrix[2,2]/matrix[2].sum()),'model_bytes':len(data),'tensorflow_version':tf.__version__}
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2))
    print(json.dumps(manifest,indent=2))
if __name__=='__main__': main()
