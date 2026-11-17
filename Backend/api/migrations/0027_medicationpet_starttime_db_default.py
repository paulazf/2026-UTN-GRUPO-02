import datetime

from django.db import migrations, models


class Migration(migrations.Migration):
    """Valor por defecto en la base para startTime.

    Sin esto, el código que no conoce el campo (por ejemplo, main antes de mergear
    TDD-0047) no puede crear tratamientos: la columna es NOT NULL sin default en Postgres.
    """

    dependencies = [
        ('api', '0026_medicationpet_starttime'),
    ]

    operations = [
        migrations.AlterField(
            model_name='medicationpet',
            name='startTime',
            field=models.TimeField(
                db_column='startTime',
                db_default=datetime.time(9, 0),
                default=datetime.time(9, 0),
            ),
        ),
    ]
