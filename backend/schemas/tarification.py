from pydantic import BaseModel, Field
from typing import Literal

Gouvernorats = Literal[
    "ARIANA", "BEJA", "BEN AROUS", "BIZERTE", "GABES", "GAFSA", 
    "JENDOUBA", "KAIROUAN", "KASSERINE", "KEBILI", "KEF", "MAHDIA", 
    "MANOUBA", "MEDENINE", "MONASTIR", "NABEUL", "SFAX", "SIDI BOUZID", 
    "SILIANA", "SOUSSE", "TATAOUINE", "TOZEUR", "TUNIS", "ZAGHOUAN", 
    "INCONNU"
]

class TarificationInput(BaseModel):
    driver_age: int = Field(..., ge=16, le=100, description="Age du conducteur (16-100)")
    vehicle_age: int = Field(..., ge=0, le=40, description="Age du véhicule (0-40)")
    puissance_fiscale: int = Field(..., alias="Puissance fiscale", description="Puissance fiscale (CV)")
    valeur_venale: float = Field(..., alias="Valeur venale", description="Valeur vénale du véhicule en TND")
    classe_bm: int = Field(..., ge=1, le=11, alias="Classe BM", description="Classe Bonus Malus (1-11)")
    usage: Literal["Promenade et affaire", "Utilitaire I"] = Field(..., alias="Usage", description="Usage du véhicule")
    cli_sex: Literal["M", "F", "Inconnu"] = Field(..., alias="CLI_SEX", description="Sexe du conducteur")
    region: Gouvernorats = Field(..., alias="Region", description="Région / Gouvernorat")
    energie: Literal["Diesel", "Electrique", "Essence", "Gaz", "HYBRIDE"] = Field(..., alias="Energie", description="Energie du véhicule")

    class Config:
        populate_by_name = True
