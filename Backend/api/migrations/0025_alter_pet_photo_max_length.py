from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0024_merge_20261111'),
    ]

    operations = [
        migrations.AlterField(
            model_name='pet',
            name='photo',
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
    ]
