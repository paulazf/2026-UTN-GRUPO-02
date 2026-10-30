from django.db import migrations


def sync_owner_names(apps, schema_editor):
    Owner = apps.get_model('api', 'Owner')
    for owner in Owner.objects.select_related('user').all():
        if owner.user:
            user = owner.user
            user.first_name = (owner.firstName or '').strip()[:150]
            user.last_name = (owner.lastName or '').strip()[:150]
            user.save(update_fields=['first_name', 'last_name'])


def reverse_sync(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0022_alter_feeding_frequency_alter_feeding_portion'),
    ]

    operations = [
        migrations.RunPython(sync_owner_names, reverse_code=reverse_sync),
    ]
