from django.db import migrations

INITIAL_BREEDS = [
    {"name": "Mestizo", "species": "DOG"},
    {"name": "Caniche", "species": "DOG"},
    {"name": "Bulldog Francés", "species": "DOG"},
    {"name": "Bulldog Inglés", "species": "DOG"},
    {"name": "Dogo Argentino", "species": "DOG"},
    {"name": "Pomerania", "species": "DOG"},
    {"name": "Pastor Alemán", "species": "DOG"},
    {"name": "Labrador Retriever", "species": "DOG"},
    {"name": "Golden Retriever", "species": "DOG"},
    {"name": "Salchicha (Dachshund)", "species": "DOG"},
    {"name": "Boxer", "species": "DOG"},
    {"name": "Beagle", "species": "DOG"},
    {"name": "Pitbull", "species": "DOG"},
    {"name": "Yorkshire Terrier", "species": "DOG"},
    {"name": "Border Collie", "species": "DOG"},
    {"name": "Schnauzer", "species": "DOG"},
    {"name": "Cocker Spaniel", "species": "DOG"},
    {"name": "Husky Siberiano", "species": "DOG"},
    {"name": "Rottweiler", "species": "DOG"},
    {"name": "Pug", "species": "DOG"},
    {"name": "Chihuahua", "species": "DOG"},
    {"name": "Galgo", "species": "DOG"},
    {"name": "Jack Russell Terrier", "species": "DOG"},
    {"name": "Maltés", "species": "DOG"},
    {"name": "Doberman", "species": "DOG"},
    {"name": "San Bernardo", "species": "DOG"},
    {"name": "Weimaraner", "species": "DOG"},
    {"name": "Bull Terrier", "species": "DOG"},
    {"name": "Fox Terrier", "species": "DOG"},
    {"name": "Pinscher", "species": "DOG"},
    {"name": "Basset Hound", "species": "DOG"},
    {"name": "Boyero de Berna", "species": "DOG"},
    {"name": "Shih Tzu", "species": "DOG"},
    {"name": "Gran Danés", "species": "DOG"},
    {"name": "Akita Inu", "species": "DOG"},
    {"name": "Chow Chow", "species": "DOG"},
    {"name": "Dálmata", "species": "DOG"},
    {"name": "Shar Pei", "species": "DOG"},
    {"name": "Terranova", "species": "DOG"},
    {"name": "Pastor Belga", "species": "DOG"},
    {"name": "Samoyedo", "species": "DOG"},
    {"name": "Collie", "species": "DOG"},
    {"name": "Setter Irlandés", "species": "DOG"},
    {"name": "Boston Terrier", "species": "DOG"},
    {"name": "Mastín Napolitano", "species": "DOG"},
    {"name": "Dogo de Burdeos", "species": "DOG"},
    {"name": "Braco Alemán", "species": "DOG"},
    {"name": "Cane Corso", "species": "DOG"},
    {"name": "Bullmastiff", "species": "DOG"},
    {"name": "Bichón Frisé", "species": "DOG"},
    {"name": "Pequinés", "species": "DOG"},
    {"name": "Borzoi", "species": "DOG"},
    {"name": "Otro", "species": "DOG"},

    {"name": "Mestizo", "species": "CAT"},
    {"name": "Común Europeo", "species": "CAT"},
    {"name": "Siamés", "species": "CAT"},
    {"name": "Persa", "species": "CAT"},
    {"name": "Bengalí", "species": "CAT"},
    {"name": "Maine Coon", "species": "CAT"},
    {"name": "Ragdoll", "species": "CAT"},
    {"name": "Angora", "species": "CAT"},
    {"name": "Británico de Pelo Corto", "species": "CAT"},
    {"name": "Sphynx (Sin pelo)", "species": "CAT"},
    {"name": "Azul Ruso", "species": "CAT"},
    {"name": "Sagrado de Birmania", "species": "CAT"},
    {"name": "Scottish Fold", "species": "CAT"},
    {"name": "Himalayo", "species": "CAT"},
    {"name": "Siberiano", "species": "CAT"},
    {"name": "Bombay", "species": "CAT"},
    {"name": "Bosque de Noruega", "species": "CAT"},
    {"name": "Abisinio", "species": "CAT"},
    {"name": "Oriental", "species": "CAT"},
    {"name": "Americano de Pelo Corto", "species": "CAT"},
    {"name": "Carey", "species": "CAT"},
    {"name": "Van Turco", "species": "CAT"},
    {"name": "Somalí", "species": "CAT"},
    {"name": "Cartujo", "species": "CAT"},
    {"name": "Cornish Rex", "species": "CAT"},
    {"name": "Devon Rex", "species": "CAT"},
    {"name": "Otro", "species": "CAT"},
]


def seed_breeds(apps, schema_editor):
    Breed = apps.get_model('api', 'Breed')
    for item in INITIAL_BREEDS:
        Breed.objects.get_or_create(
            name=item["name"],
            species=item["species"],
        )


def unseed_breeds(apps, schema_editor):
    Breed = apps.get_model('api', 'Breed')
    for item in INITIAL_BREEDS:
        Breed.objects.filter(name=item["name"], species=item["species"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_breeds, reverse_code=unseed_breeds),
    ]
