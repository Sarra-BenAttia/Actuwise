"""
SinistrIA — Script d'entraînement du CNN de classification d'accident.

À runner UNE FOIS pour produire models/cnn_accident.pth.
Ensuite, ton app n'a plus besoin de ce script : elle importe juste
classification_accident.charger_modele() pour l'inférence.

Usage :
    python train_classification.py
"""

import os
import random
import numpy as np
from PIL import Image, ImageDraw
import torch
import torchvision.transforms as transforms
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split as tts

from classification_accident import TYPES_ACCIDENT, entrainer_modele

torch.manual_seed(42)
np.random.seed(42)
random.seed(42)

os.makedirs('data_croquis', exist_ok=True)
os.makedirs('models', exist_ok=True)

N_PAR_CLASSE = 200  # 200 images par classe -> 1200 au total


# ── Génération des croquis synthétiques ──────────────────────────────────────
def dessiner_vehicule(draw, x, y, angle_deg, couleur, label, taille=40):
    """Dessine un véhicule (rectangle orienté) avec sa direction (flèche)."""
    angle = np.radians(angle_deg)
    dx, dy = np.cos(angle), np.sin(angle)
    pts = np.array([
        [x - taille*dx/2 + taille*dy/4, y - taille*dy/2 - taille*dx/4],
        [x + taille*dx/2 + taille*dy/4, y + taille*dy/2 - taille*dx/4],
        [x + taille*dx/2 - taille*dy/4, y + taille*dy/2 + taille*dx/4],
        [x - taille*dx/2 - taille*dy/4, y - taille*dy/2 + taille*dx/4],
    ], dtype=np.int32)
    draw.polygon([tuple(p) for p in pts], fill=couleur, outline='black')
    ax, ay = int(x + dx*taille*0.6), int(y + dy*taille*0.6)
    draw.line([(int(x), int(y)), (ax, ay)], fill='black', width=3)
    draw.ellipse([(ax-4, ay-4), (ax+4, ay+4)], fill='black')
    draw.text((int(x)-8, int(y)-8), label, fill='white')


def generer_croquis(type_accident, idx, noise=True):
    """Génère un croquis d'accident synthétique pour le type donné."""
    W, H = 224, 224
    if noise:
        bg_color = tuple(np.random.randint(220, 255, 3).tolist())
        img = Image.new('RGB', (W, H), color=bg_color)
    else:
        img = Image.new('RGB', (W, H), color=(240, 240, 240))
    draw = ImageDraw.Draw(img)

    jx = np.random.randint(-10, 10) if noise else 0
    jy = np.random.randint(-10, 10) if noise else 0
    cx, cy = W//2 + jx, H//2 + jy

    if type_accident == 'CHOC_ARRIERE':
        draw.rectangle([(cx-25, 10), (cx+25, H-10)], fill=(200, 200, 200), outline='gray')
        draw.line([(cx, 10), (cx, H-10)], fill='white', width=2)
        dessiner_vehicule(draw, cx, cy+25, 270, '#3498db', 'A')
        dessiner_vehicule(draw, cx, cy-30, 270, '#e74c3c', 'B')
        draw.ellipse([(cx-8, cy-8), (cx+8, cy+8)], fill='orange', outline='red')
        draw.text((cx+12, cy-5), 'IMPACT', fill='red')

    elif type_accident == 'CHOC_LATERAL':
        draw.rectangle([(cx-25, 10), (cx+25, H-10)], fill=(200, 200, 200), outline='gray')
        draw.line([(cx, 10), (cx, H-10)], fill='white', width=2)
        dessiner_vehicule(draw, cx-15, cy, 290, '#3498db', 'A')
        dessiner_vehicule(draw, cx+15, cy, 270, '#e74c3c', 'B')
        draw.ellipse([(cx-6, cy-6), (cx+6, cy+6)], fill='orange', outline='red')

    elif type_accident == 'CARREFOUR':
        draw.rectangle([(cx-25, 10), (cx+25, H-10)], fill=(200, 200, 200))
        draw.rectangle([(10, cy-25), (W-10, cy+25)], fill=(200, 200, 200))
        draw.line([(cx, 10), (cx, H-10)], fill='white', width=2)
        draw.line([(10, cy), (W-10, cy)], fill='white', width=2)
        dessiner_vehicule(draw, cx, cy+40, 270, '#3498db', 'A')
        dessiner_vehicule(draw, cx-40, cy, 0, '#e74c3c', 'B')
        draw.ellipse([(cx-8, cy-8), (cx+8, cy+8)], fill='orange', outline='red')

    elif type_accident == 'DEPASSEMENT':
        draw.rectangle([(cx-40, 10), (cx+40, H-10)], fill=(200, 200, 200))
        draw.line([(cx, 10), (cx, H-10)], fill='white', width=2)
        dessiner_vehicule(draw, cx-15, cy+20, 270, '#3498db', 'A')
        dessiner_vehicule(draw, cx+15, cy-10, 280, '#e74c3c', 'B')
        draw.ellipse([(cx-6, cy-6), (cx+6, cy+6)], fill='orange', outline='red')
        draw.text((cx-30, cy-50), 'DÉPASSE', fill='red')

    elif type_accident == 'STATIONNEMENT':
        draw.rectangle([(cx-25, 10), (cx+25, H-10)], fill=(200, 200, 200))
        draw.rectangle([(cx+30, cy-20), (cx+70, cy+20)], fill='#3498db', outline='black')
        draw.text((cx+38, cy-8), 'A', fill='white')
        draw.text((cx+25, cy-35), 'GARÉ', fill='#3498db')
        dessiner_vehicule(draw, cx, cy, 0, '#e74c3c', 'B')
        draw.ellipse([(cx+22, cy-6), (cx+38, cy+6)], fill='orange', outline='red')

    elif type_accident == 'TETE_A_QUEUE':
        draw.rectangle([(cx-25, 10), (cx+25, H-10)], fill=(200, 200, 200))
        draw.line([(cx, 10), (cx, H-10)], fill='yellow', width=3)
        dessiner_vehicule(draw, cx-5, cy+35, 270, '#3498db', 'A')
        dessiner_vehicule(draw, cx+5, cy-35, 90, '#e74c3c', 'B')
        draw.ellipse([(cx-8, cy-8), (cx+8, cy+8)], fill='orange', outline='red')
        draw.text((cx+12, cy-5), 'FRONTAL', fill='red')

    draw.text((5, H-20), type_accident.replace('_', ' '), fill='black')
    return img


# ── Dataset PyTorch ───────────────────────────────────────────────────────────
class CroquisDataset(Dataset):
    def __init__(self, images, labels, transform=None):
        self.images = images
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        img = self.images[idx].convert('RGB')
        label = self.labels[idx]
        if self.transform:
            img = self.transform(img)
        return img, label


def main():
    # 1) Génération du dataset synthétique
    print(f'Génération de {N_PAR_CLASSE * len(TYPES_ACCIDENT)} croquis...')
    all_images, all_labels = [], []
    for label_id, type_acc in TYPES_ACCIDENT.items():
        classe_dir = f'data_croquis/{type_acc}'
        os.makedirs(classe_dir, exist_ok=True)
        for i in range(N_PAR_CLASSE):
            img = generer_croquis(type_acc, i, noise=True)
            img.save(f'{classe_dir}/{type_acc}_{i:04d}.png')
            all_images.append(img)
            all_labels.append(label_id)
        print(f'  {type_acc} : {N_PAR_CLASSE} croquis')

    # 2) Transforms + split train/val
    transform_train = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.3),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    transform_val = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    idx_train, idx_val = tts(range(len(all_images)), test_size=0.2,
                              stratify=all_labels, random_state=42)

    train_imgs = [all_images[i] for i in idx_train]
    train_labels = [all_labels[i] for i in idx_train]
    val_imgs = [all_images[i] for i in idx_val]
    val_labels = [all_labels[i] for i in idx_val]

    train_ds = CroquisDataset(train_imgs, train_labels, transform_train)
    val_ds = CroquisDataset(val_imgs, val_labels, transform_val)

    train_loader = DataLoader(train_ds, batch_size=32, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_ds, batch_size=32, shuffle=False, num_workers=2)

    print(f'Train : {len(train_ds)} | Val : {len(val_ds)}')

    # 3) Entraînement (utilise classification_accident.entrainer_modele)
    model, history, best_acc = entrainer_modele(
        train_loader, val_loader, n_epochs=15,
        chemin_sauvegarde='models/cnn_accident.pth'
    )
    print(f'\nEntraînement terminé — meilleure accuracy val : {best_acc:.3f}')
    print('Modèle sauvegardé : models/cnn_accident.pth')


if __name__ == '__main__':
    main()
