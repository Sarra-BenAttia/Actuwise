"""
SinistrIA — Module OCR Documents Tunisiens
Extraction et parsing de permis, carte grise et constat à l'amiable tunisiens.

Usage :
    from ocr_tunisien import pipeline_document_reel, constituer_dossier

    json_permis  = pipeline_document_reel('permis.jpg', 'permis')
    json_cg      = pipeline_document_reel('carte_grise.jpg', 'carte_grise')
    json_constat = pipeline_document_reel('constat.pdf', 'constat')
    dossier      = constituer_dossier(json_permis, json_cg, json_constat)
"""

import cv2
import easyocr
import numpy as np
import json
import re
import os
from pdf2image import convert_from_path
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

os.makedirs('resultats', exist_ok=True)

# Chargé une seule fois au niveau module (coûteux à instancier)
_reader = None


def get_reader():
    """Charge EasyOCR (FR + EN) au premier appel, puis réutilise l'instance."""
    global _reader
    if _reader is None:
        _reader = easyocr.Reader(['fr', 'en'], gpu=True)
    return _reader


# ── Prétraitement ────────────────────────────────────────────────────────────
def preprocess_document(image_path):
    """
    Prétraitement adapté aux documents tunisiens :
    redressement (deskew), débruitage, contraste CLAHE, binarisation adaptative.
    Retourne (image_originale, image_contrastée, image_binarisée).
    """
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    coords = np.column_stack(np.where(gray < 200))
    if len(coords) > 100:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = 90 + angle
        if abs(angle) > 0.5:
            (h, w) = gray.shape
            M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
            gray = cv2.warpAffine(gray, M, (w, h),
                                   flags=cv2.INTER_CUBIC,
                                   borderMode=cv2.BORDER_REPLICATE)

    denoised = cv2.fastNlMeansDenoising(gray, h=10)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)
    binary = cv2.adaptiveThreshold(
        enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 13, 3
    )
    return img, enhanced, binary


def ocr_document(image_path, seuil_confiance=0.3):
    """Extrait le texte avec EasyOCR. Retourne (texte_brut_majuscule, résultats_bruts)."""
    _, enhanced, _ = preprocess_document(image_path)
    results = get_reader().readtext(enhanced)
    texte_brut = ' '.join([t for _, t, c in results if c > seuil_confiance])
    return texte_brut.upper(), results


# ── Fonctions utilitaires de parsing ─────────────────────────────────────────
def chercher(texte, mots_cles, longueur=40, defaut='Non détecté'):
    """Cherche la valeur qui suit un mot-clé dans le texte."""
    for kw in mots_cles:
        pat = re.escape(kw) + r'[\s:/]*([A-Z0-9\s\.\-/\(\)\+]{2,' + str(longueur) + '})'
        m = re.search(pat, texte, re.IGNORECASE)
        if m:
            return m.group(1).strip()[:longueur]
    return defaut


def chercher_date_tn(texte, mots_cles=None):
    """Cherche une date au format tunisien : DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD."""
    patterns = [
        r'\b(\d{2}[/-]\d{2}[/-]\d{4})\b',
        r'\b(\d{4}[/-]\d{2}[/-]\d{2})\b',
        r'\b(\d{2}-\d{2}-\d{4})\b',
    ]
    if mots_cles:
        for kw in mots_cles:
            idx = texte.upper().find(kw.upper())
            if idx >= 0:
                zone = texte[idx:idx + 60]
                for p in patterns:
                    m = re.search(p, zone)
                    if m:
                        return m.group(1)
    for p in patterns:
        m = re.search(p, texte)
        if m:
            return m.group(1)
    return 'Non détecté'


def chercher_immat_tn(texte):
    """Immatriculation tunisienne : '257 TU 4891' ou VIN carte grise."""
    m = re.search(r'\b(\d{1,4}\s*TU\s*\d{1,4})\b', texte)
    if m:
        return m.group(1).strip()
    m = re.search(r'\b([A-Z0-9]{8,17})\b', texte)
    if m:
        return m.group(1)
    return 'Non détecté'


def chercher_permis_tn(texte):
    """Numéro de permis tunisien : 'TN-12-2010-456789', '01/270167', '07254153'."""
    patterns = [
        r'\b(TN-\d{2}-\d{4}-\d{6})\b',
        r'\b(\d{2}\s*/\s*\d{6})\b',
        r'\b(\d{8})\b',
    ]
    for p in patterns:
        m = re.search(p, texte)
        if m:
            return m.group(1).strip()
    return 'Non détecté'


def chercher_tel_tn(texte):
    """Numéro tunisien : (+216) XX XXX XXX ou 2X/5X/7X + 7 chiffres."""
    patterns = [
        r'(\(\+216\)\s*\d{2}\s*\d{3}\s*\d{3})',
        r'\b(\+216\s*\d{8})\b',
        r'\b([2579]\d{7})\b',
    ]
    for p in patterns:
        m = re.search(p, texte)
        if m:
            return m.group(1).strip()
    return 'Non détecté'


# ── Parsers spécifiques par type de document ─────────────────────────────────
def parser_permis_tn(texte):
    """Parser adapté au vrai format permis tunisien (champs 1→9)."""
    return {
        'document_type': 'PERMIS_CONDUIRE_TN',
        'pays': 'TUNISIE',
        'nom': chercher(texte, ['1.', '1 .', 'BEN'], longueur=30),
        'prenom': chercher(texte, ['2.', '2 .', 'FOULEN'], longueur=30),
        'lieu_naissance': chercher(texte, ['3.', 'BATAN'], longueur=20),
        'date_naissance': chercher_date_tn(texte, ['3.', 'BATAN', 'NAISSANCE']),
        'date_delivrance': chercher_date_tn(texte, ['4A', '4 A', 'DELIVRE']),
        'date_expiration': chercher_date_tn(texte, ['4B', '4 B', 'EXPIRE']),
        'autorite': chercher(texte, ['4C', 'A.T.T.T', 'AUTORITE'], longueur=40),
        'code_autorite': chercher(texte, ['4D', '4 D'], longueur=15),
        'numero_permis': chercher_permis_tn(texte),
        'categories': chercher(texte, ['9.', '9 .', 'CATEGORIE', 'A AA B'], longueur=30),
    }


def parser_carte_grise_tn(texte):
    """Parser adapté au vrai format carte grise tunisienne."""
    return {
        'document_type': 'CARTE_GRISE_TN',
        'pays': 'TUNISIE',
        'immatriculation': chercher_immat_tn(texte),
        'date_mise_en_circ': chercher_date_tn(texte, ['B.', 'MISE EN CIRC', '1ERE']),
        'proprietaire': chercher(texte, ['C.1', 'C 1', 'NOM ET PRENOM', 'BEN'], longueur=35),
        'adresse': chercher(texte, ['C.3', 'C 3', 'ADRESSE'], longueur=50),
        'marque': chercher(texte, ['D.1', 'D 1', 'MARQUE', 'HTA'], longueur=20),
        'type_vehicule': chercher(texte, ['D.2', 'D 2', 'TYPE', 'VCX'], longueur=20),
        'denomination': chercher(texte, ['D.3', 'D 3', 'DENOMINATION', 'PISTA'], longueur=25),
        'vin': chercher(texte, ['E.', 'VIN', 'DIN', 'SERIE'], longueur=25),
        'carburant': chercher(texte, ['J.', 'CARBURANT', 'DIESEL', 'ESSENCE'], longueur=15),
        'cylindree_cm3': chercher(texte, ['P.1', 'P 1', 'CYLINDREE'], longueur=10),
        'puissance_fiscale_cv': chercher(texte, ['Q.', 'Q .', 'PUISSANCE FISCALE', 'JIBAIIA'], longueur=5),
        'nb_places': chercher(texte, ['S.1', 'S 1', 'PLACES', 'SIEGES'], longueur=5),
    }


def parser_constat_tn(texte):
    """Parser adapté au vrai format constat tunisien CGA."""
    mi = len(texte) // 2
    txt_a, txt_b = texte[:mi], texte[mi:]

    def parse_vehicule(t):
        return {
            'assure': chercher(t, ['ASSURE', 'MOUMON', 'BEN', 'TRAB'], longueur=30),
            'adresse': chercher(t, ['ADRESSE', 'AANOUN'], longueur=40),
            'telephone': chercher_tel_tn(t),
            'immatriculation': chercher_immat_tn(t),
            'marque': chercher(t, ['MARQUE', 'AALAMA', 'VOLKSWAGEN', 'PEUGEOT'], longueur=20),
            'assureur': chercher(t, ['ASSUREUR', 'MOUMIN', 'STAR', 'GAT'], longueur=25),
            'numero_police': chercher(t, ['POLICE', 'AUTO-', 'WATHIQA'], longueur=25),
            'conducteur': chercher(t, ['CONDUCTEUR', 'SAIQ'], longueur=30),
            'numero_permis': chercher_permis_tn(t),
        }

    heure_match = re.search(r'\b(\d{1,2}H\d{2})\b', texte) or re.search(r'(\d{1,2}:\d{2})', texte)
    blesses_zone = texte[texte.upper().find('BLESS'):texte.upper().find('BLESS') + 30] if 'BLESS' in texte.upper() else ''

    return {
        'document_type': 'CONSTAT_AMIABLE_TN',
        'pays': 'TUNISIE',
        'date_accident': chercher_date_tn(texte, ['DATE', 'TARIKH']),
        'heure_accident': heure_match.group(1) if heure_match else 'Non détecté',
        'lieu': chercher(texte, ['LIEU', 'MAKAN', 'AV.', 'RUE', 'AVENUE'], longueur=60),
        'blesses': 'OUI' if re.search(r'\bOUI\b', blesses_zone) else 'NON',
        'vehicule_A': parse_vehicule(txt_a),
        'vehicule_B': parse_vehicule(txt_b),
        'observations': chercher(texte, ['OBSERVATIONS', 'VEHICULE A'], longueur=80),
    }


# ── Pipeline complet ──────────────────────────────────────────────────────────
def pipeline_document_reel(chemin_fichier, type_document):
    """
    Pipeline universel pour un document tunisien réel (.jpg, .png, .pdf scanné).
    type_document : 'permis' | 'carte_grise' | 'constat'
    """
    if chemin_fichier.lower().endswith('.pdf'):
        pages = convert_from_path(chemin_fichier, dpi=300)
        img_path = chemin_fichier.replace('.pdf', '_page1.png')
        pages[0].save(img_path)
        chemin_fichier = img_path

    if not os.path.exists(chemin_fichier):
        raise FileNotFoundError(f'Fichier non trouvé : {chemin_fichier}')

    texte, results = ocr_document(chemin_fichier)

    parsers = {
        'permis': parser_permis_tn,
        'carte_grise': parser_carte_grise_tn,
        'constat': parser_constat_tn,
    }
    if type_document not in parsers:
        raise ValueError(f'Type inconnu. Choisir parmi : {list(parsers.keys())}')

    result = parsers[type_document](texte)
    result['fichier_source'] = chemin_fichier
    result['date_traitement'] = datetime.now().strftime('%d/%m/%Y %H:%M:%S')

    out_path = f'resultats/{type_document}_reel.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    return result


def constituer_dossier(json_permis, json_cg, json_constat):
    """Fusionne les 3 documents OCR en un dossier sinistre unique."""
    dossier = {
        'sinistria_dossier_id': f'SIN-TN-{datetime.now().strftime("%Y%m%d-%H%M%S")}',
        'date_creation': datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
        'pays': 'TUNISIE',
        'statut': 'EN_ATTENTE_VERIFICATION',
        'accident': {
            'date': json_constat.get('date_accident'),
            'heure': json_constat.get('heure_accident'),
            'lieu': json_constat.get('lieu'),
            'blesses': json_constat.get('blesses'),
        },
        'conducteur_A': {
            'identite': json_permis,
            'vehicule': json_cg,
            'constat': json_constat.get('vehicule_A'),
        },
        'conducteur_B': {
            'constat': json_constat.get('vehicule_B'),
        },
        'documents_recus': {
            'permis_conduire': True,
            'carte_grise': True,
            'constat_amiable': True,
            'photos_degats': False,
        },
        'evaluation_degats': None,
        'score_fraude': None,
        'prochaine_etape': 'ANALYSE_DEGATS_YOLO',
    }

    path = 'resultats/dossier_sinistre_tn.json'
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(dossier, f, ensure_ascii=False, indent=2)

    return dossier
