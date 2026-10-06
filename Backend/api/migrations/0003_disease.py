from django.db import migrations, models
import django.db.models.functions.text


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_seed_breeds'),
    ]

    operations = [
        migrations.CreateModel(
            name='Disease',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('isDeleted', models.BooleanField(default=False)),
            ],
            options={
                'db_table': 'disease',
                'ordering': ['name'],
                'constraints': [
                    models.UniqueConstraint(
                        django.db.models.functions.text.Lower('name'),
                        condition=models.Q(('isDeleted', False)),
                        name='unique_active_disease_name_case_insensitive',
                    ),
                ],
            },
        ),
    ]
