from decimal import Decimal
from django.db import migrations

INITIAL_MEDICATIONS = [
    # Antibióticos
    {"name": "Amoxicilina", "dose": Decimal("500.000"), "description": "Antibiótico de amplio espectro."},
    {"name": "Amoxicilina + Ácido Clavulánico", "dose": Decimal("250.000"), "description": "Antibiótico de amplio espectro."},
    {"name": "Cefalexina", "dose": Decimal("500.000"), "description": "Antibiótico para infecciones de piel y tejidos blandos."},
    {"name": "Doxiciclina", "dose": Decimal("100.000"), "description": "Antibiótico (común para enfermedades transmitidas por garrapatas)."},
    {"name": "Enrofloxacina", "dose": Decimal("50.000"), "description": "Antibiótico fluoroquinolona."},
    {"name": "Enrofloxacina", "dose": Decimal("150.000"), "description": "Antibiótico fluoroquinolona (dosis alta)."},
    {"name": "Metronidazol", "dose": Decimal("250.000"), "description": "Antibiótico y antiprotozoario (giardias, infecciones anaeróbicas)."},
    {"name": "Metronidazol", "dose": Decimal("500.000"), "description": "Antibiótico y antiprotozoario (dosis alta)."},

    # Analgésicos y Antiinflamatorios
    {"name": "Meloxicam", "dose": Decimal("1.500"), "description": "Antiinflamatorio no esteroideo (AINE)."},
    {"name": "Meloxicam", "dose": Decimal("2.000"), "description": "Antiinflamatorio no esteroideo (AINE)."},
    {"name": "Tramadol", "dose": Decimal("50.000"), "description": "Analgésico para el dolor moderado a severo."},
    {"name": "Gabapentina", "dose": Decimal("100.000"), "description": "Analgésico para dolor neuropático y anticonvulsivo."},
    {"name": "Gabapentina", "dose": Decimal("300.000"), "description": "Analgésico para dolor neuropático y anticonvulsivo (dosis alta)."},
    {"name": "Prednisona", "dose": Decimal("20.000"), "description": "Corticosteroide antiinflamatorio e inmunosupresor."},

    # Antiparasitarios (Pulgas y Garrapatas)
    {"name": "NexGard (Afoxolaner)", "dose": Decimal("11.300"), "description": "Antiparasitario externo masticable (perros 2-4 kg)."},
    {"name": "NexGard (Afoxolaner)", "dose": Decimal("28.300"), "description": "Antiparasitario externo masticable (perros 4-10 kg)."},
    {"name": "NexGard (Afoxolaner)", "dose": Decimal("68.000"), "description": "Antiparasitario externo masticable (perros 10-25 kg)."},
    {"name": "Bravecto (Fluralaner)", "dose": Decimal("112.500"), "description": "Antiparasitario externo de larga duración (perros pequeños)."},
    {"name": "Bravecto (Fluralaner)", "dose": Decimal("250.000"), "description": "Antiparasitario externo de larga duración (perros medianos)."},
    {"name": "Simparica (Sarolaner)", "dose": Decimal("20.000"), "description": "Antiparasitario externo masticable mensual."},

    # Dermatológicos
    {"name": "Apoquel (Oclacitinib)", "dose": Decimal("3.600"), "description": "Tratamiento para el prurito asociado a dermatitis alérgica."},
    {"name": "Apoquel (Oclacitinib)", "dose": Decimal("5.400"), "description": "Tratamiento para el prurito asociado a dermatitis alérgica."},
    {"name": "Apoquel (Oclacitinib)", "dose": Decimal("16.000"), "description": "Tratamiento para el prurito asociado a dermatitis alérgica."},

    # Gastrointestinales y Antieméticos
    {"name": "Omeprazol", "dose": Decimal("20.000"), "description": "Protector gástrico."},
    {"name": "Ondansetrón", "dose": Decimal("4.000"), "description": "Antiemético (control de náuseas y vómitos)."},
    {"name": "Ondansetrón", "dose": Decimal("8.000"), "description": "Antiemético (control de náuseas y vómitos)."},
    {"name": "Cerenia (Maropitant)", "dose": Decimal("16.000"), "description": "Antiemético de acción central y periférica."},

    # Neurológicos y Endócrinos
    {"name": "Fenobarbital", "dose": Decimal("100.000"), "description": "Anticonvulsivo de primera línea para epilepsia."},
    {"name": "Levotiroxina", "dose": Decimal("0.100"), "description": "Tratamiento para el hipotiroidismo canino."},

    # Fallback
    {"name": "Otro", "dose": Decimal("0.000"), "description": "Medicamento no especificado en el catálogo."},
]

def seed_medications(apps, schema_editor):
    Medication = apps.get_model('api', 'Medication')
    for item in INITIAL_MEDICATIONS:
        Medication.objects.get_or_create(
            name=item["name"],
            dose=item["dose"],
            defaults={
                "description": item["description"],
                "isDeleted": False
            },
        )

def unseed_medications(apps, schema_editor):
    Medication = apps.get_model('api', 'Medication')
    for item in INITIAL_MEDICATIONS:
        Medication.objects.filter(name=item["name"], dose=item["dose"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_medication'), 
    ]

    operations = [
        migrations.RunPython(seed_medications, reverse_code=unseed_medications),
    ]