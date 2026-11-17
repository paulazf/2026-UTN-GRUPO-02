import datetime

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0025_alter_pet_photo_max_length'),
    ]

    operations = [
        migrations.AddField(
            model_name='medicationpet',
            name='startTime',
            field=models.TimeField(db_column='startTime', default=datetime.time(9, 0)),
        ),
    ]
