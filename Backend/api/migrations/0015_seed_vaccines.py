from django.db import migrations

# Vigencia en días = intervalo habitual hasta la próxima aplicación.
# species None = sirve para perros y gatos.
INITIAL_VACCINES = [
    # Vacunas para perros
    {"name": "Séxtuple", "laboratory": "Canigen (Virbac)", "type": "VACCINE", "species": "DOG", "validityDays": 365},
    {"name": "Quíntuple", "laboratory": "Vanguard Plus 5 (Zoetis)", "type": "VACCINE", "species": "DOG", "validityDays": 365},
    {"name": "Leptospirosis", "laboratory": "Nobivac L4 (MSD)", "type": "VACCINE", "species": "DOG", "validityDays": 365},
    {"name": "Tos de las perreras", "laboratory": "Nobivac KC (MSD)", "type": "VACCINE", "species": "DOG", "validityDays": 365},

    # Vacunas para gatos
    {"name": "Triple Felina", "laboratory": "Nobivac Tricat (MSD)", "type": "VACCINE", "species": "CAT", "validityDays": 365},
    {"name": "Leucemia Felina", "laboratory": "Purevax FeLV (Boehringer)", "type": "VACCINE", "species": "CAT", "validityDays": 365},

    # Vacunas para ambas especies
    {"name": "Antirrábica", "laboratory": "Rabisin (Boehringer)", "type": "VACCINE", "species": None, "validityDays": 365},

    # Antiparasitarios externos (pipetas, collares, comprimidos antipulgas)
    {"name": "Frontline Plus", "laboratory": "Boehringer", "type": "EXTERNAL_ANTIPARASITIC", "species": None, "validityDays": 30},
    {"name": "Advocate", "laboratory": "Elanco", "type": "EXTERNAL_ANTIPARASITIC", "species": None, "validityDays": 30},
    {"name": "Revolution", "laboratory": "Zoetis", "type": "EXTERNAL_ANTIPARASITIC", "species": None, "validityDays": 30},
    {"name": "NexGard", "laboratory": "Boehringer", "type": "EXTERNAL_ANTIPARASITIC", "species": "DOG", "validityDays": 30},
    {"name": "Simparica", "laboratory": "Zoetis", "type": "EXTERNAL_ANTIPARASITIC", "species": "DOG", "validityDays": 30},
    {"name": "Bravecto", "laboratory": "MSD", "type": "EXTERNAL_ANTIPARASITIC", "species": None, "validityDays": 90},
    {"name": "Seresto (collar)", "laboratory": "Elanco", "type": "EXTERNAL_ANTIPARASITIC", "species": None, "validityDays": 240},

    # Antiparasitarios internos (desparasitación)
    {"name": "Drontal Plus", "laboratory": "Elanco", "type": "INTERNAL_ANTIPARASITIC", "species": "DOG", "validityDays": 90},
    {"name": "Total Full", "laboratory": "Holliday", "type": "INTERNAL_ANTIPARASITIC", "species": None, "validityDays": 90},
    {"name": "Milbemax", "laboratory": "Elanco", "type": "INTERNAL_ANTIPARASITIC", "species": None, "validityDays": 90},

    # Comodines
    {"name": "Otra vacuna", "laboratory": "", "type": "VACCINE", "species": None, "validityDays": 365},
    {"name": "Otro antiparasitario", "laboratory": "", "type": "EXTERNAL_ANTIPARASITIC", "species": None, "validityDays": 30},
]


def seed_vaccines(apps, schema_editor):
    Vaccine = apps.get_model("api", "Vaccine")
    for item in INITIAL_VACCINES:
        Vaccine.objects.get_or_create(
            name=item["name"],
            laboratory=item["laboratory"],
            defaults={
                "type": item["type"],
                "species": item["species"],
                "validityDays": item["validityDays"],
                "isDeleted": False,
            },
        )


def unseed_vaccines(apps, schema_editor):
    Vaccine = apps.get_model("api", "Vaccine")
    for item in INITIAL_VACCINES:
        Vaccine.objects.filter(name=item["name"], laboratory=item["laboratory"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0014_vaccine"),
    ]

    operations = [
        migrations.RunPython(seed_vaccines, reverse_code=unseed_vaccines),
    ]
