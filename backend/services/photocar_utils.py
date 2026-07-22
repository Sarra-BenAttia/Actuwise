"""
photocar_utils.py

Pipeline pour l'estimation des coûts de réparation à partir d'une photo de véhicule.
1. Détection des dommages (YOLO)
2. Extraction des features
3. Prédiction du coût (XGBoost)
"""
import io
import numpy as np
import pandas as pd
from PIL import Image

# Table de coûts métier de référence
COUT_BASE = {
    'scratch':       (200,  800),
    'dent':          (400, 1500),
    'crack':         (800, 3000),
    'glass_shatter': (600, 2000),
    'lamp_broken':   (300, 1200),
    'tire_flat':     (150,  500),
}

def extract_features(results, model):
    """Extrait les features YOLO pour le modèle de coût"""
    class_names = list(model.names.values())
    feats = {
        'num_damages': 0,
        'max_confidence': 0.0,
        'mean_confidence': 0.0,
        'total_bbox_area': 0.0,
        'max_bbox_area': 0.0,
        'num_damage_types': 0,
        'has_crack': 0,
        'has_glass': 0,
        'has_structural': 0,
    }
    for name in class_names:
        feats[f'count_{name}'] = 0

    boxes = results[0].boxes
    if boxes is None or len(boxes) == 0:
        return feats

    classes_seen = set()
    confs = []
    # results[0].orig_shape is (h, w)
    img_h = results[0].orig_shape[0]
    img_w = results[0].orig_shape[1]
    img_area = img_w * img_h

    for box in boxes:
        cls = int(box.cls)
        conf = float(box.conf)
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        area = ((x2-x1) * (y2-y1)) / img_area  # normalisé

        name = model.names[cls]
        feats[f'count_{name}'] = feats.get(f'count_{name}', 0) + 1
        classes_seen.add(cls)
        confs.append(conf)
        feats['total_bbox_area'] += area
        feats['max_bbox_area'] = max(feats['max_bbox_area'], area)

        if name == 'crack':         feats['has_crack'] = 1
        if name == 'glass_shatter': feats['has_glass'] = 1
        if name in ['crack', 'glass_shatter']: feats['has_structural'] = 1

    feats['num_damages'] = len(boxes)
    feats['max_confidence'] = max(confs)
    feats['mean_confidence'] = float(np.mean(confs))
    feats['num_damage_types'] = len(classes_seen)
    return feats


import base64
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import shap
from fpdf import FPDF
from datetime import datetime
from PIL import ImageDraw

def draw_boxes(img, boxes):
    img_draw = img.copy()
    draw = ImageDraw.Draw(img_draw)
    for box in boxes:
        x1, y1, x2, y2 = box["bbox"]
        label = f"{box['label']} {int(box['confidence']*100)}%"
        draw.rectangle([x1, y1, x2, y2], outline="red", width=3)
        draw.text((x1, max(0, y1-15)), label, fill="red")
    return img_draw

def generate_shap_base64(cost_model, X_input):
    try:
        explainer = shap.TreeExplainer(cost_model)
        shap_values = explainer(X_input)
        
        plt.figure(figsize=(6, 4))
        shap.plots.waterfall(shap_values[0], show=False, max_display=6)
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
        plt.close()
        buf.seek(0)
        return base64.b64encode(buf.getvalue()).decode('utf-8')
    except Exception as e:
        print(f"Erreur SHAP: {e}")
        return ""

def generate_pdf_report(img_with_boxes, cost, features, boxes, shap_base64):
    pdf = FPDF()
    pdf.add_page()
    
    # Header
    pdf.set_font("helvetica", "B", 18)
    pdf.set_text_color(16, 185, 129) # Emerald 500
    pdf.cell(0, 10, "Rapport d'Expertise IA - PhotoCar", ln=True, align="C")
    
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(107, 114, 128)
    date_str = datetime.now().strftime("%d/%m/%Y %H:%M")
    pdf.cell(0, 10, f"Edite le : {date_str}  |  Modele : YOLOv8 + XGBoost", ln=True, align="C")
    pdf.ln(5)
    
    # Photo analysée
    img_buf = io.BytesIO()
    img_with_boxes.save(img_buf, format="JPEG")
    img_buf.seek(0)
    pdf.image(img_buf, x=30, w=150)
    pdf.ln(5)
    
    # Résultats
    pdf.set_font("helvetica", "B", 14)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 10, "Resultats de l'Analyse", ln=True)
    
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 8, f"Cout de reparation estime : {cost:,.3f} TND", ln=True)
    pdf.cell(0, 8, f"Nombre total de dommages detectes : {features.get('num_damages', 0)}", ln=True)
    pdf.cell(0, 8, f"Nombre de types de dommages : {features.get('num_damage_types', 0)}", ln=True)
    pdf.ln(5)
    
    # Détails dommages
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 8, "Details des dommages :", ln=True)
    pdf.set_font("helvetica", "", 11)
    for box in boxes:
        pdf.cell(0, 6, f"- {box['label']} (Confiance: {int(box['confidence']*100)}%)", ln=True)
    
    # SHAP si dispo
    if shap_base64:
        pdf.add_page()
        pdf.set_font("helvetica", "B", 14)
        pdf.cell(0, 10, "Explicabilite de l'IA (Impact sur le cout)", ln=True)
        pdf.set_font("helvetica", "", 10)
        pdf.cell(0, 6, "Ce graphique montre comment chaque dommage a influence l'estimation.", ln=True)
        
        shap_buf = io.BytesIO(base64.b64decode(shap_base64))
        pdf.image(shap_buf, x=20, w=170)
        
    out_buf = io.BytesIO()
    pdf.output(out_buf)
    out_buf.seek(0)
    return base64.b64encode(out_buf.getvalue()).decode('utf-8')


def process_image(image_bytes: bytes, models: dict) -> dict:
    """
    Traite une image téléchargée et retourne les prédictions et features.
    models contient : photocar_yolo, photocar_cost_xgb, photocar_features
    """
    yolo_model = models.get("photocar_yolo")
    cost_model = models.get("photocar_cost_xgb")
    feature_cols = models.get("photocar_features")

    if not yolo_model or not cost_model or not feature_cols:
        raise ValueError("Modèles PhotoCar non chargés")

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    
    # 1. Inférence YOLO
    results = yolo_model.predict(img, conf=0.25, verbose=False)
    
    # 2. Extraction des boîtes
    boxes_out = []
    boxes = results[0].boxes
    if boxes is not None:
        for box in boxes:
            cls = int(box.cls)
            conf = float(box.conf)
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            name = yolo_model.names[cls]
            boxes_out.append({
                "label": name,
                "confidence": conf,
                "bbox": [x1, y1, x2, y2]
            })

    # 3. Extraction features XGBoost
    feats = extract_features(results, yolo_model)
    
    # 4. Inférence Coût
    df_input = pd.DataFrame([feats])
    for col in feature_cols:
        if col not in df_input.columns:
            df_input[col] = 0
    X_input = df_input[feature_cols]

    if feats['num_damages'] > 0:
        cout_estime = float(cost_model.predict(X_input)[0])
        cout_estime = max(0.0, cout_estime)
    else:
        cout_estime = 0.0

    # 5. Explicabilité SHAP
    shap_b64 = ""
    if feats['num_damages'] > 0:
        shap_b64 = generate_shap_base64(cost_model, X_input)

    # 6. Rapport PDF
    img_drawn = draw_boxes(img, boxes_out)
    pdf_b64 = generate_pdf_report(img_drawn, cout_estime, feats, boxes_out, shap_b64)

    return {
        "cost": cout_estime,
        "features": feats,
        "boxes": boxes_out,
        "shap_base64": shap_b64,
        "pdf_base64": pdf_b64
    }
