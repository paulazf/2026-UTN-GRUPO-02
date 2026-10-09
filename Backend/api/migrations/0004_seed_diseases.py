from django.db import migrations

INITIAL_DISEASES = [
    {"name": "Parvovirus"},
    {"name": "Moquillo (Distemper)"},
    {"name": "Rabia"},
    {"name": "Leishmaniasis"},
    {"name": "Leptospirosis"},
    {"name": "Giardiasis"},
    {"name": "Panleucopenia Felina"},
    {"name": "Rinotraqueítis Felina"},
    {"name": "Calicivirus Felino"},
    {"name": "Leucemia Felina (FeLV)"},
    {"name": "Inmunodeficiencia Felina (FIV)"},
    {"name": "Tos de las Perreras (Traqueobronquitis)"},
    {"name": "Hepatitis Infecciosa Canina"},
    {"name": "Sarna Demodécica"},
    {"name": "Sarna Sarcóptica"},
    {"name": "Otitis Externa"},
    {"name": "Dermatitis Alérgica"},
    {"name": "Insuficiencia Renal Crónica"},
    {"name": "Diabetes Mellitus"},
    {"name": "Anaplasmosis"},
    {"name": "Erliquiosis (Ehrlichiosis)"},
    {"name": "Toxoplasmosis"},
    {"name": "Peritonitis Infecciosa Felina (PIF)"},
    {"name": "Gusano del Corazón (Dirofilariasis)"},
    {"name": "Otra"},
]


def seed_diseases(apps, schema_editor):
    Disease = apps.get_model('api', 'Disease')
    for item in INITIAL_DISEASES:
        Disease.objects.get_or_create(
            name=item["name"],
            defaults={"isDeleted": False},
        )


def unseed_diseases(apps, schema_editor):
    Disease = apps.get_model('api', 'Disease')
    for item in INITIAL_DISEASES:
        Disease.objects.filter(name=item["name"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_disease'),
    ]

    operations = [
        migrations.RunPython(seed_diseases, reverse_code=unseed_diseases),
    ]
