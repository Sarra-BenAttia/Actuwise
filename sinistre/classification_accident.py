"""
SinistrIA — Module Classification d'Accident
Croquis + circonstances cochées -> type d'accident + barème de responsabilité tunisien.

Usage en production (modèle déjà entraîné) :
    from classification_accident import charger_modele, classifier_accident_complet

    model_cnn, transform_val = charger_modele('models/cnn_accident.pth')
    resultat = classifier_accident_complet(image_croquis_pil, circonstances_list,
                                            model_cnn, transform_val)
    # resultat['type_accident'], resultat['responsabilite_A_pct'], ...

Pour ré-entraîner le CNN, voir entrainer_modele() en bas de fichier — nécessite
les images de croquis annotées (générées par le notebook d'origine ou vos propres
données).
"""

import torch
import torch.nn as nn
import torch.optim as optim
import torchvision.transforms as transforms
import torchvision.models as models
import numpy as np
from datetime import datetime

DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'

# ── Types d'accidents (6 classes) ────────────────────────────────────────────
TYPES_ACCIDENT = {
    0: 'CHOC_ARRIERE',
    1: 'CHOC_LATERAL',
    2: 'CARREFOUR',
    3: 'DEPASSEMENT',
    4: 'STATIONNEMENT',
    5: 'TETE_A_QUEUE',
}

# ── Barème de responsabilité tunisien (CGA) ──────────────────────────────────
BAREME_TUNISIEN = {
    'CHOC_ARRIERE': {
        'resp_A': 0, 'resp_B': 100,
        'justification': "Le véhicule B a percuté l'arrière du véhicule A. "
                          "Responsabilité totale du véhicule suiveur (art. 48 Code Routier TN).",
        'circonstance': "Heurtait à l'arrière",
    },
    'CHOC_LATERAL': {
        'resp_A': 50, 'resp_B': 50,
        'justification': "Choc latéral — responsabilité partagée en l'absence "
                          "d'éléments permettant de déterminer la priorité.",
        'circonstance': 'Changeait de file',
    },
    'CARREFOUR': {
        'resp_A': 0, 'resp_B': 100,
        'justification': "Le véhicule B n'a pas respecté la priorité à droite "
                          "(art. 36 Code Routier TN).",
        'circonstance': 'Venait de droite (carrefour)',
    },
    'DEPASSEMENT': {
        'resp_A': 0, 'resp_B': 100,
        'justification': "Le véhicule B effectuait un dépassement non conforme "
                          "(art. 52 Code Routier TN).",
        'circonstance': 'Doublait',
    },
    'STATIONNEMENT': {
        'resp_A': 0, 'resp_B': 100,
        'justification': "Le véhicule A était en stationnement régulier. "
                          "Responsabilité totale du véhicule en mouvement.",
        'circonstance': 'En stationnement',
    },
    'TETE_A_QUEUE': {
        'resp_A': 50, 'resp_B': 50,
        'justification': 'Collision frontale — responsabilité partagée '
                          'en l\'absence de franchissement de ligne centrale prouvé.',
        'circonstance': 'Franchissait ligne continue',
    },
}

# ── Circonstances du constat → type d'accident ───────────────────────────────
CIRCONSTANCES_MAPPING = {
    "heurtait à l'arrière": 'CHOC_ARRIERE',
    "heurté à l'arrière": 'CHOC_ARRIERE',
    'choc arriere': 'CHOC_ARRIERE',
    'changeait de file': 'CHOC_LATERAL',
    'choc lateral': 'CHOC_LATERAL',
    'venait de droite': 'CARREFOUR',
    'carrefour': 'CARREFOUR',
    "n'avait pas observé signal": 'CARREFOUR',
    'doublait': 'DEPASSEMENT',
    'dépassement': 'DEPASSEMENT',
    'en stationnement': 'STATIONNEMENT',
    'stationnement': 'STATIONNEMENT',
    'quittait stationnement': 'STATIONNEMENT',
    'tête-à-queue': 'TETE_A_QUEUE',
    'tete a queue': 'TETE_A_QUEUE',
    'tournait à gauche': 'CHOC_LATERAL',
    'tournait à droite': 'CHOC_LATERAL',
}

TRANSFORM_VAL = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


# ── Modèle ────────────────────────────────────────────────────────────────────
def build_model(num_classes=6):
    """ResNet18 pré-entraîné ImageNet, tête fine-tunée pour les 6 classes d'accident."""
    model = models.resnet18(pretrained=True)
    for name, param in model.named_parameters():
        if 'layer4' not in name and 'fc' not in name:
            param.requires_grad = False
    in_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.4),
        nn.Linear(in_features, 256),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(256, num_classes)
    )
    return model.to(DEVICE)


def charger_modele(chemin_poids='models/cnn_accident.pth', num_classes=6):
    """
    Charge le CNN entraîné pour l'inférence en production.
    Retourne (model, transform) prêts pour classifier_croquis_cnn / classifier_accident_complet.
    """
    model = build_model(num_classes=num_classes)
    model.load_state_dict(torch.load(chemin_poids, map_location=DEVICE))
    model.eval()
    return model, TRANSFORM_VAL


# ── Classification par circonstances (règles) ────────────────────────────────
def classifier_par_circonstances(circonstances_list):
    """
    Classifie le type d'accident à partir des circonstances cochées sur le constat.
    Retourne (type_detecte, confiance, scores_par_type).
    """
    scores = {t: 0 for t in TYPES_ACCIDENT.values()}
    for circ in circonstances_list:
        circ_lower = circ.lower().strip()
        for keyword, type_acc in CIRCONSTANCES_MAPPING.items():
            if keyword in circ_lower:
                scores[type_acc] += 1

    if max(scores.values()) == 0:
        return 'INDETERMINE', 0.0, scores

    type_detecte = max(scores, key=scores.get)
    total_matches = sum(scores.values())
    confiance = scores[type_detecte] / total_matches if total_matches > 0 else 0
    return type_detecte, confiance, scores


# ── Classification par croquis (CNN) ─────────────────────────────────────────
def classifier_croquis_cnn(image_pil, model, transform):
    """
    Classifie le type d'accident à partir d'une image de croquis.
    Retourne (type_predit, confiance, probabilites_par_classe).
    """
    model.eval()
    img_t = transform(image_pil.convert('RGB')).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        logits = model(img_t)
        probs = torch.softmax(logits, dim=1).squeeze().cpu().numpy()

    idx_pred = int(np.argmax(probs))
    type_predit = TYPES_ACCIDENT[idx_pred]
    confiance = float(probs[idx_pred])

    return type_predit, confiance, {
        TYPES_ACCIDENT[i]: round(float(probs[i]), 4)
        for i in range(len(TYPES_ACCIDENT))
    }


# ── Fusion CNN + circonstances → décision finale ─────────────────────────────
def classifier_accident_complet(image_croquis_pil, circonstances_list,
                                 model, transform,
                                 poids_cnn=0.6, poids_circ=0.4):
    """
    Classification finale combinant CNN sur le croquis (60%) et règles sur les
    circonstances cochées (40%). Retourne type d'accident + barème + justification,
    prêt à être injecté dans le dossier sinistre JSON.
    """
    type_cnn, conf_cnn, probs_cnn = classifier_croquis_cnn(image_croquis_pil, model, transform)
    type_circ, conf_circ, _ = classifier_par_circonstances(circonstances_list)

    scores_fusion = {t: 0.0 for t in TYPES_ACCIDENT.values()}
    for t, p in probs_cnn.items():
        scores_fusion[t] += poids_cnn * p
    if type_circ != 'INDETERMINE':
        scores_fusion[type_circ] += poids_circ * conf_circ

    type_final = max(scores_fusion, key=scores_fusion.get)
    conf_finale = scores_fusion[type_final]

    bareme = BAREME_TUNISIEN.get(type_final, {
        'resp_A': 50, 'resp_B': 50,
        'justification': 'Type indéterminé — responsabilité partagée par défaut.'
    })

    return {
        'type_accident': type_final,
        'confiance_finale': round(conf_finale, 4),
        'source_cnn': {'type': type_cnn, 'confiance': round(conf_cnn, 4)},
        'source_circonstances': {'type': type_circ, 'confiance': round(conf_circ, 4)},
        'responsabilite_A_pct': bareme['resp_A'],
        'responsabilite_B_pct': bareme['resp_B'],
        'justification_bareme': bareme['justification'],
        'date_analyse': datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
    }


# ── Entraînement (à part — pas nécessaire en production) ────────────────────
def entrainer_modele(train_loader, val_loader, n_epochs=15,
                      chemin_sauvegarde='models/cnn_accident.pth'):
    """
    Entraîne le CNN depuis zéro. À lancer une seule fois (ou pour réentraîner),
    pas à chaque appel de l'app. Nécessite train_loader/val_loader construits à
    partir de CroquisDataset (voir le notebook d'origine pour la génération des
    croquis synthétiques et le split train/val).

    NB : cette fonction reconstitue la boucle d'entraînement — la cellule
    correspondante dans le notebook source était tronquée/corrompue lors de
    l'export, vérifie les hyperparamètres (lr, epochs) contre ta version avant
    de relancer un entraînement long.
    """
    model = build_model(num_classes=len(TYPES_ACCIDENT))
    optimizer = optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=1e-3, weight_decay=1e-4
    )
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.5)
    criterion = nn.CrossEntropyLoss()

    best_acc = 0
    history = {'train_loss': [], 'val_loss': [], 'train_acc': [], 'val_acc': []}

    for epoch in range(n_epochs):
        model.train()
        total_loss, correct, total = 0, 0, 0
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * imgs.size(0)
            correct += (outputs.argmax(1) == labels).sum().item()
            total += imgs.size(0)
        train_loss, train_acc = total_loss / total, correct / total

        model.eval()
        total_loss, correct, total = 0, 0, 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
                outputs = model(imgs)
                loss = criterion(outputs, labels)
                total_loss += loss.item() * imgs.size(0)
                correct += (outputs.argmax(1) == labels).sum().item()
                total += imgs.size(0)
        val_loss, val_acc = total_loss / total, correct / total

        scheduler.step()
        history['train_loss'].append(train_loss)
        history['val_loss'].append(val_loss)
        history['train_acc'].append(train_acc)
        history['val_acc'].append(val_acc)

        if val_acc > best_acc:
            best_acc = val_acc
            torch.save(model.state_dict(), chemin_sauvegarde)

        print(f'Epoch {epoch+1}/{n_epochs} — train_acc={train_acc:.3f} val_acc={val_acc:.3f}')

    return model, history, best_acc
