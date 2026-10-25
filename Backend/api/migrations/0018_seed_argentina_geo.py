from django.db import migrations

ARGENTINA_GEO = {
    "Ciudad Autónoma de Buenos Aires": [
        "Agronomía", "Almagro", "Balvanera", "Barracas", "Belgrano", "Caballito",
        "Colegiales", "Flores", "Floresta", "La Boca", "Liniers", "Mataderos",
        "Monserrat", "Nueva Pompeya", "Núñez", "Palermo", "Parque Chacabuco",
        "Parque Patricios", "Recoleta", "Retiro", "Saavedra", "San Cristóbal",
        "San Nicolás", "San Telmo", "Villa Crespo", "Villa Devoto", "Villa Lugano",
        "Villa Luro", "Villa Pueyrredón", "Villa Urquiza"
    ],
    "Buenos Aires": [
        "La Plata", "Mar del Plata", "Bahía Blanca", "Tandil", "San Nicolás de los Arroyos",
        "Olavarría", "Pergamino", "Junín", "Necochea", "Zárate", "Campana", "Luján",
        "Mercedes", "Chivilcoy", "Azul", "Quilmes", "Lanús", "Avellaneda", "Morón",
        "San Isidro", "Vicente López", "Tigre", "Pilar", "San Martín", "Lomas de Zamora",
        "Almirante Brown", "Tres de Febrero", "San Miguel", "Moreno", "Merlo"
    ],
    "Catamarca": [
        "San Fernando del Valle de Catamarca", "Valle Viejo", "Andalgalá", "Belén",
        "Santa María", "Tinogasta", "Recreo", "Fiambalá"
    ],
    "Chaco": [
        "Resistencia", "Presidencia Roque Sáenz Peña", "Villa Ángela", "General San Martín",
        "Juan José Castelli", "Charata", "Barranqueras", "Fontana"
    ],
    "Chubut": [
        "Rawson", "Comodoro Rivadavia", "Trelew", "Puerto Madryn", "Esquel",
        "Sarmiento", "Gaiman", "Rada Tilly"
    ],
    "Córdoba": [
        "Córdoba", "Villa Carlos Paz", "Río Cuarto", "Villa María", "San Francisco",
        "Alta Gracia", "Río Tercero", "Bell Ville", "La Falda", "Jesús María",
        "Villa Allende", "Marcos Juárez", "Cosquín"
    ],
    "Corrientes": [
        "Corrientes", "Goya", "Paso de los Libres", "Curuzú Cuatiá", "Mercedes",
        "Bella Vista", "Monte Caseros", "Santo Tomé", "Esquina", "Ituzaingó"
    ],
    "Entre Ríos": [
        "Paraná", "Concordia", "Gualeguaychú", "Concepción del Uruguay", "Gualeguay",
        "Villaguay", "Chajarí", "Victoria", "La Paz", "Colón"
    ],
    "Formosa": [
        "Formosa", "Clorinda", "Pirané", "El Colorado", "Las Lomitas", "Ingeniero Juárez"
    ],
    "Jujuy": [
        "San Salvador de Jujuy", "San Pedro de Jujuy", "Palpalá", "Libertador General San Martín",
        "Perico", "Humahuaca", "Tilcara", "La Quiaca"
    ],
    "La Pampa": [
        "Santa Rosa", "General Pico", "General Acha", "Toay", "Eduardo Castex",
        "25 de Mayo", "Realicó", "Intendente Alvear"
    ],
    "La Rioja": [
        "La Rioja", "Chilecito", "Aimogasta", "Chamical", "Chepes", "Villa Unión"
    ],
    "Mendoza": [
        "Mendoza", "San Rafael", "Godoy Cruz", "Las Heras", "Guaymallén", "Luján de Cuyo",
        "Maipú", "Rivadavia", "San Martín", "Tunuyán", "Tupungato", "Malargüe"
    ],
    "Misiones": [
        "Posadas", "Oberá", "Eldorado", "Puerto Iguazú", "Apóstoles", "Leandro N. Alem",
        "San Vicente", "Montecarlo", "Puerto Rico"
    ],
    "Neuquén": [
        "Neuquén", "San Martín de los Andes", "Cutral Có", "Plaza Huincul", "Centenario",
        "Plottier", "Zapala", "Villa La Angostura", "Chos Malal", "Junín de los Andes"
    ],
    "Río Negro": [
        "Viedma", "San Carlos de Bariloche", "General Roca", "Cipolletti", "Villa Regina",
        "Allen", "Cinco Saltos", "San Antonio Oeste", "El Bolsón", "Catriel"
    ],
    "Salta": [
        "Salta", "San Ramón de la Nueva Orán", "Tartagal", "General Güemes", "San José de Metán",
        "Rosario de la Frontera", "Cafayate", "Joaquín V. González"
    ],
    "San Juan": [
        "San Juan", "Rawson", "Rivadavia", "Chimbas", "Santa Lucía", "Pocito",
        "Caucete", "Jáchal", "Albardón"
    ],
    "San Luis": [
        "San Luis", "Villa Mercedes", "Merlo", "La Punta", "Juana Koslay", "Justo Daract"
    ],
    "Santa Cruz": [
        "Río Gallegos", "Caleta Olivia", "El Calafate", "Pico Truncado", "Las Heras",
        "Puerto Deseado", "San Julián", "Río Turbio"
    ],
    "Santa Fe": [
        "Santa Fe", "Rosario", "Rafaela", "Venado Tuerto", "Reconquista", "Santo Tomé",
        "Villa Gobernador Gálvez", "Esperanza", "Granadero Baigorria", "Casilda",
        "San Lorenzo", "Cañada de Gómez"
    ],
    "Santiago del Estero": [
        "Santiago del Estero", "La Banda", "Termas de Río Hondo", "Frías", "Añatuya",
        "Fernández", "Monte Quemado", "Quimilí"
    ],
    "Tierra del Fuego, Antártida e Islas del Atlántico Sur": [
        "Ushuaia", "Río Grande", "Tolhuin"
    ],
    "Tucumán": [
        "San Miguel de Tucumán", "Banda del Río Salí", "Yerba Buena", "Villa Mariano Moreno",
        "Concepción", "Tafí Viejo", "Aguilares", "Monteros", "Famaillá", "Tafí del Valle"
    ],
}


def seed_argentina_geo(apps, schema_editor):
    Province = apps.get_model("api", "Province")
    City = apps.get_model("api", "City")

    for prov_name, cities in ARGENTINA_GEO.items():
        province, _ = Province.objects.get_or_create(name=prov_name)
        for city_name in cities:
            City.objects.get_or_create(
                province=province,
                name=city_name,
            )


def reverse_seed_argentina_geo(apps, schema_editor):
    Province = apps.get_model("api", "Province")
    City = apps.get_model("api", "City")
    City.objects.all().delete()
    Province.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0017_appointment_address_geo"),
    ]

    operations = [
        migrations.RunPython(seed_argentina_geo, reverse_code=reverse_seed_argentina_geo),
    ]

