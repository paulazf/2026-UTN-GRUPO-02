import api.models.medical_test
import django.db.models.deletion
from django.db import migrations, models


def copy_files(apps, schema_editor):
    """Pasa el archivo único de cada estudio a la tabla nueva."""
    MedicalTest = apps.get_model("api", "MedicalTest")
    MedicalTestFile = apps.get_model("api", "MedicalTestFile")
    for test in MedicalTest.objects.exclude(file="").exclude(file__isnull=True):
        MedicalTestFile.objects.create(
            medicalTest=test,
            file=test.file.name,
            name=test.file.name.rsplit("/", 1)[-1],
        )


def restore_files(apps, schema_editor):
    """Vuelta atrás: el estudio se queda con su primer archivo."""
    MedicalTest = apps.get_model("api", "MedicalTest")
    MedicalTestFile = apps.get_model("api", "MedicalTestFile")
    for test in MedicalTest.objects.all():
        first = MedicalTestFile.objects.filter(medicalTest=test).order_by("idMedicalTestFile").first()
        if first:
            test.file = first.file.name
            test.save(update_fields=["file"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0008_medical_test"),
    ]

    operations = [
        migrations.CreateModel(
            name="MedicalTestFile",
            fields=[
                (
                    "idMedicalTestFile",
                    models.AutoField(
                        db_column="idMedicalTestFile", primary_key=True, serialize=False
                    ),
                ),
                (
                    "file",
                    models.FileField(
                        max_length=255,
                        upload_to=api.models.medical_test.medical_test_file_upload_path,
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                (
                    "medicalTest",
                    models.ForeignKey(
                        db_column="idMedicalTest",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="files",
                        to="api.medicaltest",
                    ),
                ),
            ],
            options={
                "db_table": "medical_test_file",
                "ordering": ["idMedicalTestFile"],
            },
        ),
        migrations.RunPython(copy_files, restore_files),
        migrations.RemoveField(
            model_name="medicaltest",
            name="file",
        ),
    ]
