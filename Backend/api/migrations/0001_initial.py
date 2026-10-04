import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Breed',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50)),
                ('species', models.CharField(choices=[('DOG', 'Dog'), ('CAT', 'Cat')], max_length=10)),
            ],
            options={
                'db_table': 'breed',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Pet',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('birthDate', models.DateField()),
                ('neutered', models.BooleanField(default=False)),
                ('weight', models.DecimalField(decimal_places=2, max_digits=5)),
                ('photo', models.URLField(blank=True, null=True)),
                ('idOwner', models.PositiveIntegerField(help_text='ID del dueño asignado por el módulo Owner')),
                ('isDeleted', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('breed', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='pets', to='api.breed')),
            ],
            options={
                'db_table': 'pet',
                'ordering': ['-id'],
                'constraints': [models.UniqueConstraint(condition=models.Q(('isDeleted', False)), fields=('idOwner', 'name', 'breed', 'birthDate'), name='unique_active_pet_per_owner')],
            },
        ),
    ]
