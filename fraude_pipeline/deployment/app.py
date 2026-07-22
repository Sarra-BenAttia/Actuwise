"""
app.py — Application Flask de scoring d'un nouveau dossier sinistre.

Usage :
    cd deployment
    pip install flask --break-system-packages   # si besoin
    python app.py
    -> ouvrir http://127.0.0.1:5000

Le formulaire utilise des listes déroulantes pour les champs à modalités
fixes (extraites des données réelles, voir form_choices.json généré à
partir du dataset final) et des champs libres pour le reste (montants,
dates, matricule...).

En sortie : score de suspicion, détail des règles déclenchées, statut
DBSCAN (anomalie ou non). Les erreurs de saisie (dates mal formées,
champs numériques invalides) sont affichées clairement, sans plantage.
"""

import json
from pathlib import Path

from flask import Flask, render_template, request

from predict_utils import score_dossier

app = Flask(__name__)

CHOICES_PATH = Path(__file__).resolve().parent / "form_choices.json"
with open(CHOICES_PATH, encoding="utf-8") as f:
    FORM_CHOICES = json.load(f)


@app.route("/", methods=["GET", "POST"])
def index():
    result = None
    form_values = {}
    if request.method == "POST":
        form_values = request.form.to_dict()
        result = score_dossier(form_values)
    return render_template(
        "form.html",
        choices=FORM_CHOICES,
        result=result,
        form_values=form_values,
    )


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
