"""
SinistrIA — Router FastAPI
Endpoints:
  POST /api/sinistria/analyser       → OCR + CNN + provisionnement + QR code + PDF
  GET  /api/sinistria/dossier/{id}   → Page HTML publique du dossier (scannée par QR)
  GET  /api/sinistria/constat/{id}   → Téléchargement PDF du constat officiel
"""

from fastapi import APIRouter, File, Form, UploadFile, Request
from fastapi.responses import JSONResponse, HTMLResponse, Response
import os, shutil, tempfile, json, base64, io, uuid, textwrap
from datetime import datetime
from PIL import Image

from services.sinistria.ocr_tunisien import pipeline_document_reel, constituer_dossier
from services.sinistria.classification_accident import classifier_accident_complet

router = APIRouter(prefix="/api/sinistria", tags=["SinistrIA"])

# ── Stockage mémoire des dossiers (persistant le temps du processus) ─────────
_DOSSIERS: dict = {}   # {dossier_id: payload_complet}

# ── Table de coûts moyens heuristiques (TND) ─────────────────────────────────
COUTS_MOYENS_TND = {
    "CHOC_ARRIERE":  2200,
    "CHOC_LATERAL":  3100,
    "CARREFOUR":     3800,
    "DEPASSEMENT":   2900,
    "STATIONNEMENT": 1200,
    "TETE_A_QUEUE":  5500,
}
MULTIPLICATEUR_CORPOREL = 3.5


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS INTERNES
# ═══════════════════════════════════════════════════════════════════════════════

def _calculer_provisionnement(type_accident, resp_a, resp_b, blesses):
    cout_base  = COUTS_MOYENS_TND.get(type_accident, 2500)
    blesses_oui = str(blesses).strip().upper() in ("OUI", "YES", "1", "TRUE")
    mult       = MULTIPLICATEUR_CORPOREL if blesses_oui else 1.0
    cout_total = round(cout_base * mult, 2)
    return {
        "cout_total_tnd":       cout_total,
        "cout_base_type_tnd":   cout_base,
        "sinistre_corporel":    blesses_oui,
        "multiplicateur_applique": mult,
        "repartition_A_tnd":    round(cout_total * resp_a / 100, 2),
        "repartition_B_tnd":    round(cout_total * resp_b / 100, 2),
        "responsabilite_A_pct": resp_a,
        "responsabilite_B_pct": resp_b,
    }


def _generer_qrcode_url(url: str) -> str:
    """QR code encodant une URL (page HTML du dossier). Retourne base64 PNG."""
    import qrcode
    qr = qrcode.QRCode(version=3, box_size=8, border=3)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#065f46", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _generer_pdf_constat(payload: dict) -> bytes:
    """
    Génère un PDF récapitulatif officiel du constat SinistrIA.
    Utilise reportlab.pdfgen.canvas pour reproduire le design exact (Jaune/Vert) du constat FTUSA.
    """
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from io import BytesIO

    acc   = payload.get("accident_analyse", {})
    prov  = payload.get("provisionnement", {})
    ocr   = payload.get("dossier_ocr", {})
    pid   = payload.get("permis_affichage", {})
    cg    = payload.get("cg_affichage", {})
    acc_d = ocr.get("accident", {})
    dossier_id = ocr.get("sinistria_dossier_id", "—")
    date_str   = acc_d.get("date", "—")
    lieu_str   = acc_d.get("lieu", "—")
    blesses    = acc_d.get("blesses", "NON")

    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    def nd(v):
        return str(v) if v and v != "Non détecté" else ""

    # --- Couleurs ---
    YELLOW_BG = colors.HexColor("#FEF08A")
    GREEN_BG  = colors.HexColor("#A7F3D0")
    DARK_BLUE = colors.HexColor("#1E3A8A")
    BLACK     = colors.black

    # --- Header ---
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(DARK_BLUE)
    c.drawString(40, height - 40, "CONSTAT AMIABLE D'ACCIDENT AUTOMOBILE")
    c.setFont("Helvetica", 8)
    c.drawString(40, height - 52, f"Généré par SinistrIA - ID: {dossier_id}")

    # Top boxes (Date, Lieu, Blesses, Degats)
    c.setLineWidth(1)
    c.setStrokeColor(DARK_BLUE)
    
    # 1. Date
    c.rect(40, height - 85, 100, 25)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(45, height - 70, "1. Date de l'accident")
    c.setFont("Helvetica", 9)
    c.setFillColor(BLACK)
    c.drawString(45, height - 80, date_str)

    # 2. Lieu
    c.setFillColor(DARK_BLUE)
    c.rect(140, height - 85, 200, 25)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(145, height - 70, "2. Lieu")
    c.setFont("Helvetica", 9)
    c.setFillColor(BLACK)
    c.drawString(145, height - 80, lieu_str)

    # 3. Blessés
    c.setFillColor(DARK_BLUE)
    c.rect(340, height - 85, 100, 25)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(345, height - 70, "3. Blessés")
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.red if str(blesses).upper() in ["OUI", "1"] else BLACK)
    c.drawString(345, height - 80, str(blesses).upper())

    # 4. Dégâts matériels
    c.setFillColor(DARK_BLUE)
    c.rect(440, height - 85, 115, 25)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(445, height - 70, "4. Dégâts matériels")
    c.setFont("Helvetica", 9)
    c.setFillColor(BLACK)
    c.drawString(445, height - 80, "OUI" if len(acc.get("type_accident", "")) > 0 else "NON")

    # --- Main Columns Setup ---
    col_y_start = height - 120
    col_height = 420

    # COL A (YELLOW)
    c.setFillColor(YELLOW_BG)
    c.rect(40, col_y_start - col_height, 165, col_height, fill=1, stroke=1)
    # COL B (GREEN)
    c.setFillColor(GREEN_BG)
    c.rect(390, col_y_start - col_height, 165, col_height, fill=1, stroke=1)

    # Header Col A & B
    c.setFillColor(DARK_BLUE)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(75, col_y_start - 15, "VÉHICULE A")
    c.drawString(425, col_y_start - 15, "VÉHICULE B")

    def draw_vehicule_block(x, y, bg_color, is_A=True):
        c.setFillColor(BLACK)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x+5, y, "6. Preneur d'assurance / Assuré")
        c.setFont("Helvetica", 8)
        c.drawString(x+5, y-12, "Nom:")
        c.drawString(x+5, y-24, "Prénom:")
        c.drawString(x+5, y-36, "Adresse:")
        if is_A:
            c.setFont("Helvetica-Bold", 8)
            c.drawString(x+40, y-12, nd(pid.get("nom")))
            c.drawString(x+40, y-24, nd(pid.get("prenom")))
        
        y -= 55
        c.line(x, y, x+165, y)
        y -= 12
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x+5, y, "7. Véhicule")
        c.setFont("Helvetica", 8)
        c.drawString(x+5, y-15, "Marque:")
        c.drawString(x+5, y-27, "N° Immatriculation:")
        if is_A:
            c.setFont("Helvetica-Bold", 8)
            c.drawString(x+45, y-15, nd(cg.get("marque")))
            c.drawString(x+90, y-27, nd(cg.get("immatriculation")))

        y -= 45
        c.line(x, y, x+165, y)
        y -= 12
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x+5, y, "8. Conducteur")
        c.setFont("Helvetica", 8)
        c.drawString(x+5, y-15, "Nom:")
        c.drawString(x+5, y-27, "Prénom:")
        c.drawString(x+5, y-39, "N° de permis:")
        c.drawString(x+5, y-51, "Catégories:")
        if is_A:
            c.setFont("Helvetica-Bold", 8)
            c.drawString(x+40, y-15, nd(pid.get("nom")))
            c.drawString(x+40, y-27, nd(pid.get("prenom")))
            c.drawString(x+65, y-39, nd(pid.get("numero_permis")))
            c.drawString(x+55, y-51, nd(pid.get("categories")))

        y -= 65
        c.line(x, y, x+165, y)
        y -= 12
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x+5, y, "10. Indiquer par une flèche")
        c.drawString(x+5, y-10, "le point de choc initial")
        
        y -= 50
        c.line(x, y, x+165, y)
        y -= 12
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x+5, y, "11. Dégâts apparents")
        if is_A:
            c.setFont("Helvetica", 8)
            c.drawString(x+5, y-15, "Estimation:")
            c.drawString(x+5, y-27, f"{prov.get('repartition_A_tnd', 0):,.0f} TND")

    draw_vehicule_block(40, col_y_start - 35, YELLOW_BG, True)
    draw_vehicule_block(390, col_y_start - 35, GREEN_BG, False)

    # CIRCONSTANCES (Middle Col)
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(240, col_y_start - 15, "12. CIRCONSTANCES")
    
    c.setFont("Helvetica", 7)
    c.drawString(215, col_y_start - 25, "Classification IA : " + str(acc.get("type_accident", "")))
    
    circs = [
        "En stationnement",
        "Quittait un stationnement",
        "Prenait un stationnement",
        "Sortait d'un parking / lieu privé",
        "S'engageait dans un parking",
        "Arrêt de circulation",
        "Frottement sans chgm de file",
        "Heurtait à l'arrière",
        "Roulait dans le même sens",
        "Changeait de file",
        "Doublait",
        "Virait à droite",
        "Virait à gauche",
        "Reculait",
        "Empiétait sur la voie inverse",
        "Venait de droite",
        "N'a pas observé le signal"
    ]
    
    cy = col_y_start - 45
    c.setFont("Helvetica", 8)
    for i, circ in enumerate(circs):
        c.rect(210, cy-2, 8, 8) # Box A
        c.rect(377, cy-2, 8, 8) # Box B
        c.drawCentredString(297, cy, circ)
        cy -= 20

    # CROQUIS
    croquis_y = col_y_start - col_height - 180
    c.setFillColor(BLACK)
    c.rect(40, croquis_y, 515, 170, stroke=1, fill=0)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(45, croquis_y + 155, "13. Croquis de l'accident")
    c.setFont("Helvetica", 8)
    c.drawString(45, croquis_y + 143, "Préciser : tracé des voies, flèches de direction, position des véhicules A et B, panneaux.")
    
    # Grid for croquis
    c.setStrokeColor(colors.lightgrey)
    for i in range(10, 170, 15):
        c.line(40, croquis_y + i, 555, croquis_y + i)
    for i in range(10, 515, 15):
        c.line(40 + i, croquis_y, 40 + i, croquis_y + 170)
    c.setStrokeColor(BLACK)

    # OBSERVATIONS
    obs_y = croquis_y - 60
    c.setFillColor(YELLOW_BG)
    c.rect(40, obs_y, 250, 50, fill=1, stroke=1)
    c.setFillColor(GREEN_BG)
    c.rect(305, obs_y, 250, 50, fill=1, stroke=1)
    
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(45, obs_y + 35, "14. Observations (A)")
    c.drawString(310, obs_y + 35, "14. Observations (B)")

    c.setFont("Helvetica-Oblique", 8)
    c.drawString(45, obs_y + 20, f"Resp. A: {acc.get('responsabilite_A_pct', '—')} %")
    c.drawString(310, obs_y + 20, f"Resp. B: {acc.get('responsabilite_B_pct', '—')} %")

    # SIGNATURES
    sig_y = obs_y - 45
    c.setFont("Helvetica-Bold", 10)
    c.drawString(200, sig_y + 20, "15. Signatures des conducteurs")
    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, sig_y, "A")
    c.drawString(400, sig_y, "B")

    c.setFont("Helvetica", 7)
    c.setFillColor(colors.HexColor("#dc2626"))
    c.drawString(40, 20, "ATTENTION: Document généré automatiquement par IA (SinistrIA) - Estimation indicative non contractuelle.")

    c.save()
    return buf.getvalue()



# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════


@router.post("/analyser")
async def analyser_dossier(
    request: Request,
    permis:        UploadFile = File(...),
    carte_grise:   UploadFile = File(...),
    constat:       UploadFile = File(...),
    croquis:       UploadFile = File(...),
    circonstances: str = Form(""),
):
    """Pipeline complet SinistrIA : OCR + CNN + provisionnement + QR + PDF."""
    models    = request.app.state.models
    temp_dir  = tempfile.mkdtemp()
    host_url  = str(request.base_url).rstrip("/")

    paths = {}
    for name, file_obj in [("permis", permis), ("carte_grise", carte_grise),
                            ("constat", constat), ("croquis", croquis)]:
        ext      = os.path.splitext(file_obj.filename)[1] or ".jpg"
        filepath = os.path.join(temp_dir, f"{name}{ext}")
        with open(filepath, "wb") as buf:
            shutil.copyfileobj(file_obj.file, buf)
        paths[name] = filepath

    try:
        # 1. OCR
        json_permis  = pipeline_document_reel(paths["permis"],      "permis")
        json_cg      = pipeline_document_reel(paths["carte_grise"], "carte_grise")
        json_constat = pipeline_document_reel(paths["constat"],     "constat")
        dossier_ocr  = constituer_dossier(json_permis, json_cg, json_constat)

        # 2. Classification
        circ_list   = [c.strip() for c in circonstances.split(",") if c.strip()]
        croquis_pil = Image.open(paths["croquis"])
        sinistria_cnn = models.get("sinistria_cnn")
        if not sinistria_cnn:
            raise Exception("Modèle CNN SinistrIA non chargé.")
        resultat_accident = classifier_accident_complet(
            croquis_pil, circ_list,
            sinistria_cnn["model"], sinistria_cnn["transform"],
        )

        type_acc = resultat_accident["type_accident"]
        resp_a   = resultat_accident["responsabilite_A_pct"]
        resp_b   = resultat_accident["responsabilite_B_pct"]
        blesses  = dossier_ocr.get("accident", {}).get("blesses", "Non détecté")

        # 3. Provisionnement
        prov = _calculer_provisionnement(type_acc, resp_a, resp_b, blesses)

        # 4. Champs OCR structurés
        identite = dossier_ocr.get("conducteur_A", {}).get("identite", {})
        vehicule = dossier_ocr.get("conducteur_A", {}).get("vehicule",  {})
        permis_affichage = {
            "nom":             identite.get("nom",             "Non détecté"),
            "prenom":          identite.get("prenom",          "Non détecté"),
            "numero_permis":   identite.get("numero_permis",   "Non détecté"),
            "date_delivrance": identite.get("date_delivrance",  "Non détecté"),
            "date_expiration": identite.get("date_expiration",  "Non détecté"),
            "categories":      identite.get("categories",       "Non détecté"),
        }
        cg_affichage = {
            "immatriculation":       vehicule.get("immatriculation",          "Non détecté"),
            "marque":                vehicule.get("marque",                   "Non détecté"),
            "type_vehicule":         vehicule.get("type_vehicule",            "Non détecté"),
            "date_mise_circulation": vehicule.get("date_mise_en_circulation", "Non détecté"),
            "carburant":             vehicule.get("carburant",                "Non détecté"),
            "proprietaire":          vehicule.get("proprietaire",             "Non détecté"),
        }

        # 5. Sauvegarder en mémoire + générer QR pointant vers la page HTML
        dossier_id = dossier_ocr.get("sinistria_dossier_id",
                                      f"SIN-{uuid.uuid4().hex[:8].upper()}")
        date_str   = dossier_ocr.get("date_creation", datetime.now().strftime("%d/%m/%Y %H:%M"))

        payload = {
            "dossier_id":       dossier_id,
            "date":             date_str,
            "dossier_ocr":      dossier_ocr,
            "accident_analyse": resultat_accident,
            "provisionnement":  prov,
            "permis_affichage": permis_affichage,
            "cg_affichage":     cg_affichage,
        }
        _DOSSIERS[dossier_id] = payload

        # Trouver l'IP réseau local (ex: 192.168.1.x) pour que le téléphone puisse l'ouvrir
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
        except Exception:
            local_ip = "127.0.0.1"
        finally:
            s.close()
            
        # URL publique de la page du dossier (accessible par QR code depuis le téléphone)
        port = request.url.port or 8000
        dossier_url = f"http://{local_ip}:{port}/api/sinistria/dossier/{dossier_id}"
        qr_base64   = _generer_qrcode_url(dossier_url)

        return {
            **payload,
            "qr_base64":    qr_base64,
            "dossier_url":  dossier_url,
        }

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@router.get("/dossier/{dossier_id}", response_class=HTMLResponse)
async def page_dossier(dossier_id: str):
    """
    Page HTML publique du dossier — accessible en scannant le QR code.
    """
    d = _DOSSIERS.get(dossier_id)
    if not d:
        return HTMLResponse(
            "<h2 style='font-family:sans-serif;color:#dc2626;text-align:center;margin-top:80px'>"
            "Dossier introuvable ou expiré.</h2>",
            status_code=404,
        )

    acc  = d["accident_analyse"]
    prov = d["provisionnement"]
    pid  = d["permis_affichage"]
    cg   = d["cg_affichage"]
    acc_d = d["dossier_ocr"].get("accident", {})

    def fval(v):
        if not v or v == "Non détecté":
            return f'<span style="color:#cbd5e1;font-style:italic">Non détecté</span>'
        return f'<strong>{v}</strong>'

    def row(label, v):
        return (f'<tr><td style="color:#64748b;padding:6px 12px 6px 0;font-size:13px">{label}</td>'
                f'<td style="font-size:13px;padding:6px 0">{fval(v)}</td></tr>')

    html = f"""<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dossier SinistrIA — {dossier_id}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:'Inter',sans-serif;background:#f1f5f9;color:#1e293b;padding:20px}}
  .header{{background:linear-gradient(135deg,#065f46,#10b981);color:#fff;border-radius:20px;padding:28px 32px;margin-bottom:24px}}
  .header h1{{font-size:22px;font-weight:900;margin-bottom:4px}}
  .header p{{font-size:13px;opacity:0.85}}
  .badge{{display:inline-block;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);border-radius:20px;padding:4px 14px;font-size:11px;font-weight:700;margin-top:10px}}
  .grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:16px}}
  .card{{background:#fff;border-radius:16px;padding:22px;box-shadow:0 2px 8px rgba(0,0,0,0.07)}}
  .card h2{{font-size:14px;font-weight:700;color:#065f46;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #d1fae5}}
  table{{width:100%;border-collapse:collapse}}
  .hero-stat{{background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#fff;border-radius:16px;padding:22px;text-align:center}}
  .hero-stat .label{{font-size:11px;opacity:0.8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}}
  .hero-stat .value{{font-size:28px;font-weight:900}}
  .resp{{display:flex;justify-content:center;gap:32px;margin-top:14px}}
  .resp-item .pct{{font-size:22px;font-weight:900}}
  .resp-item .lbl{{font-size:11px;opacity:0.8}}
  .prov{{background:linear-gradient(135deg,#b45309,#f59e0b);color:#fff;border-radius:14px;padding:18px;text-align:center}}
  .warn{{background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px;font-size:11px;color:#92400e;margin-top:12px;line-height:1.5}}
  .btn{{display:inline-block;background:#065f46;color:#fff;padding:12px 28px;border-radius:30px;font-weight:700;font-size:13px;text-decoration:none;margin-top:16px}}
  .footer{{text-align:center;margin-top:24px;font-size:11px;color:#94a3b8}}
</style></head><body>

<div class="header">
  <h1>🛡️ Dossier Sinistre SinistrIA</h1>
  <p>Analyse automatique par IA — OCR + Computer Vision</p>
  <div class="badge">ID : {dossier_id}</div>
  <div class="badge" style="margin-left:8px">📅 {d['date']}</div>
</div>

<div class="grid">
  <div class="card">
    <div class="hero-stat">
      <div class="label">Type d'accident détecté</div>
      <div class="value">{acc.get('type_accident','—')}</div>
      <div class="resp">
        <div class="resp-item"><div class="pct">{acc.get('responsabilite_A_pct','—')}%</div><div class="lbl">Resp. A</div></div>
        <div style="width:1px;background:rgba(255,255,255,.3)"></div>
        <div class="resp-item"><div class="pct">{acc.get('responsabilite_B_pct','—')}%</div><div class="lbl">Resp. B</div></div>
      </div>
    </div>
    <div style="margin-top:14px;background:#f8fafc;border-radius:10px;padding:12px;font-size:13px;color:#334155">
      <strong>Justification CGA :</strong><br>{acc.get('justification_bareme','—')}
    </div>
  </div>

  <div class="card">
    <h2>🪪 Permis de conduire</h2>
    <table>
      {row('Nom',          pid.get('nom'))}
      {row('Prénom',       pid.get('prenom'))}
      {row('N° Permis',    pid.get('numero_permis'))}
      {row('Délivrance',   pid.get('date_delivrance'))}
      {row('Expiration',   pid.get('date_expiration'))}
      {row('Catégories',   pid.get('categories'))}
    </table>
  </div>

  <div class="card">
    <h2>🚗 Carte Grise</h2>
    <table>
      {row('Immatriculation',     cg.get('immatriculation'))}
      {row('Marque',              cg.get('marque'))}
      {row('Type véhicule',       cg.get('type_vehicule'))}
      {row('Mise en circulation', cg.get('date_mise_circulation'))}
      {row('Carburant',           cg.get('carburant'))}
      {row('Propriétaire',        cg.get('proprietaire'))}
    </table>
  </div>

  <div class="card">
    <h2>⚡ Circonstances</h2>
    <table>
      {row('Date accident',  acc_d.get('date'))}
      {row('Heure',          acc_d.get('heure'))}
      {row('Lieu',           acc_d.get('lieu'))}
      {row('Blessés',        acc_d.get('blesses'))}
    </table>
  </div>
</div>

<div class="grid">
  <div class="card">
    <h2>💰 Provisionnement estimé</h2>
    <div class="prov">
      <div style="font-size:11px;opacity:.85;text-transform:uppercase;letter-spacing:.08em">Coût total estimé</div>
      <div style="font-size:30px;font-weight:900">{prov.get('cout_total_tnd',0):,.0f} TND</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:10px;color:#92400e;font-weight:700">Part A</div>
        <div style="font-size:16px;font-weight:800;color:#b45309">{prov.get('repartition_A_tnd',0):,.0f} TND</div>
      </div>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:10px;color:#92400e;font-weight:700">Part B</div>
        <div style="font-size:16px;font-weight:800;color:#b45309">{prov.get('repartition_B_tnd',0):,.0f} TND</div>
      </div>
    </div>
    <div class="warn">⚠️ <strong>Estimation indicative</strong> — non calibrée sur historique réel. Référez-vous au Module 3 pour un provisionnement actuariel précis.</div>
  </div>

  <div class="card" style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center">
    <h2 style="width:100%">📥 Télécharger le constat PDF</h2>
    <p style="font-size:13px;color:#64748b;margin:12px 0 18px">Générez le document officiel PDF du dossier, prêt à être imprimé et signé.</p>
    <a class="btn" href="/api/sinistria/constat/{dossier_id}">⬇️ Télécharger le constat PDF</a>
  </div>
</div>

<div class="footer">
  Document généré par SinistrIA · ACTUWISE — Assurance Automobile Tunisienne<br>
  Ce dossier n'a pas de valeur légale — à des fins d'analyse IA uniquement.
</div>
</body></html>"""
    return HTMLResponse(html)


@router.get("/constat/{dossier_id}")
async def telecharger_constat(dossier_id: str):
    """Génère et télécharge le PDF officiel du constat."""
    d = _DOSSIERS.get(dossier_id)
    if not d:
        return JSONResponse({"error": "Dossier introuvable"}, status_code=404)

    pdf_bytes = _generer_pdf_constat(d)
    filename  = f"Constat_SinistrIA_{dossier_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
