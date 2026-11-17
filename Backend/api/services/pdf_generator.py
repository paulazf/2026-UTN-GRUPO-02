import io
from datetime import date
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)


class NumberedCanvas(canvas.Canvas):
    """
    Canvas de dos pasadas para calcular dinámicamente el total de páginas
    y estampar el pie de página 'Página X de Y' y aviso de PetLife.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_footer(num_pages)
            super().showPage()
        super().save()

    def draw_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#718096"))

        # Línea separadora de pie
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(1.5 * cm, 1.2 * cm, A4[0] - 1.5 * cm, 1.2 * cm)

        # Texto del pie
        left_text = "PetLife · Historia Clínica y Libreta Sanitaria Oficial"
        right_text = f"Página {self._pageNumber} de {page_count}"

        self.drawString(1.5 * cm, 0.8 * cm, left_text)
        self.drawRightString(A4[0] - 1.5 * cm, 0.8 * cm, right_text)
        self.restoreState()


def format_date(d):
    if not d:
        return "-"
    if isinstance(d, str):
        return d
    return d.strftime("%d/%m/%Y")


def generate_medical_history_pdf(pet, owner=None) -> io.BytesIO:
    """
    Genera el archivo PDF de la historia clínica completa de la mascota.
    Respeta el diseño de marca PetLife (#DE6B80) y los criterios de aceptación
    del TDD-0048.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.8 * cm,
    )

    printable_width = A4[0] - 3.0 * cm  # ~509.5 pt

    # Estilos
    styles = getSampleStyleSheet()

    color_primary = colors.HexColor("#DE6B80")
    color_primary_dark = colors.HexColor("#C85469")
    color_text_dark = colors.HexColor("#2B1D1D")
    color_gray = colors.HexColor("#718096")
    color_light_bg = colors.HexColor("#FAF6F3")
    color_banner_bg = colors.HexColor("#FFF5F7")
    color_border = colors.HexColor("#E2E8F0")

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=color_primary,
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=color_gray,
    )

    header_meta_style = ParagraphStyle(
        "HeaderMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        alignment=2,  # Right aligned
        textColor=color_text_dark,
    )

    section_heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=color_primary_dark,
    )

    sin_registros_style = ParagraphStyle(
        "SinRegistros",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=9,
        leading=13,
        textColor=color_gray,
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=colors.white,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=color_text_dark,
    )

    pet_label_style = ParagraphStyle(
        "PetLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=12,
        textColor=color_gray,
    )

    pet_val_style = ParagraphStyle(
        "PetVal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=color_text_dark,
    )

    pet_name_style = ParagraphStyle(
        "PetNameVal",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14,
        textColor=color_primary_dark,
    )

    story = []

    # 1. Cabecera Institucional
    today_str = date.today().strftime("%d/%m/%Y")
    owner_name = owner.full_name if (owner and hasattr(owner, "full_name")) else "-"
    owner_email = owner.email if (owner and hasattr(owner, "email")) else ""

    header_table_data = [
        [
            Paragraph("<b>PetLife</b>", title_style),
            Paragraph(
                f"<b>Fecha de emisión:</b> {today_str}<br/><b>Tutor:</b> {owner_name}<br/>{owner_email}",
                header_meta_style,
            ),
        ],
        [
            Paragraph("Libreta Sanitaria e Historia Clínica", subtitle_style),
            Paragraph("", subtitle_style),
        ],
    ]

    header_table = Table(
        header_table_data,
        colWidths=[printable_width * 0.6, printable_width * 0.4],
    )
    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(header_table)
    story.append(Spacer(1, 10))

    # Línea decorativa
    story.append(
        HRFlowable(
            width="100%",
            thickness=1.5,
            color=color_primary,
            spaceBefore=0,
            spaceAfter=12,
        )
    )

    # 2. Ficha de la Mascota
    breed_name = pet.breed.name if pet.breed else "-"
    species_name = (
        pet.breed.get_species_display()
        if (pet.breed and hasattr(pet.breed, "get_species_display"))
        else (pet.breed.species if pet.breed else "-")
    )
    if species_name == "DOG":
        species_name = "Perro"
    elif species_name == "CAT":
        species_name = "Gato"

    age_str = f"{pet.age} {'años' if pet.age != 1 else 'año'}" if pet.age is not None else "-"
    weight_str = f"{pet.weight} kg" if pet.weight is not None else "-"
    neutered_str = "Sí" if pet.neutered else "No"
    birth_date_str = format_date(pet.birthDate)

    pet_info_data = [
        [
            Paragraph("Nombre", pet_label_style),
            Paragraph(f"<b>{pet.name}</b>", pet_name_style),
            Paragraph("", pet_label_style),
            Paragraph("", pet_val_style),
        ],
        [
            Paragraph("Especie", pet_label_style),
            Paragraph(species_name, pet_val_style),
            Paragraph("Raza", pet_label_style),
            Paragraph(breed_name, pet_val_style),
        ],
        [
            Paragraph("Nacimiento", pet_label_style),
            Paragraph(birth_date_str, pet_val_style),
            Paragraph("Edad", pet_label_style),
            Paragraph(age_str, pet_val_style),
        ],
        [
            Paragraph("Peso", pet_label_style),
            Paragraph(weight_str, pet_val_style),
            Paragraph("Castrado/a", pet_label_style),
            Paragraph(neutered_str, pet_val_style),
        ],
    ]

    col_w_label = printable_width * 0.18
    col_w_val = printable_width * 0.32
    pet_info_table = Table(
        pet_info_data,
        colWidths=[col_w_label, col_w_val, col_w_label, col_w_val],
    )
    pet_info_table.setStyle(
        TableStyle(
            [
                ("SPAN", (1, 0), (3, 0)),
                ("BACKGROUND", (0, 0), (-1, -1), color_banner_bg),
                ("BOX", (0, 0), (-1, -1), 1, color_primary),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, color_border),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )

    story.append(pet_info_table)
    story.append(Spacer(1, 14))

    # Helper para renderizar secciones
    def build_section(title, columns, col_widths, rows_data):
        section_elements = []
        section_elements.append(Paragraph(title, section_heading_style))
        section_elements.append(Spacer(1, 4))

        if not rows_data:
            section_elements.append(Paragraph("Sin registros", sin_registros_style))
            section_elements.append(Spacer(1, 10))
            return section_elements

        # Construir tabla
        table_rows = []
        # Header
        header_cells = [Paragraph(col, table_header_style) for col in columns]
        table_rows.append(header_cells)

        for row_idx, row in enumerate(rows_data):
            row_cells = [Paragraph(str(val if val is not None else "-"), table_cell_style) for val in row]
            table_rows.append(row_cells)

        table = Table(table_rows, colWidths=col_widths, repeatRows=1)
        t_style = [
            ("BACKGROUND", (0, 0), (-1, 0), color_primary),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("GRID", (0, 0), (-1, -1), 0.5, color_border),
        ]
        # Filas alternas
        for i in range(1, len(table_rows)):
            if i % 2 == 0:
                t_style.append(("BACKGROUND", (0, i), (-1, i), color_light_bg))
        table.setStyle(TableStyle(t_style))

        section_elements.append(table)
        section_elements.append(Spacer(1, 12))
        return section_elements

    # 3. Sección 1: Vacunación y Antiparasitarios
    vaccines_qs = (
        pet.vaccinePets.filter(isDeleted=False)
        .select_related("vaccine")
        .order_by("-applicationDate", "-idVaccinePet")
    )
    vaccine_rows = []
    for vp in vaccines_qs:
        v_name = vp.vaccine.name if vp.vaccine else "-"
        v_type = vp.vaccine.get_type_display() if (vp.vaccine and hasattr(vp.vaccine, "get_type_display")) else "-"
        v_dose = f"Dosis {vp.doseNumber}" if vp.doseNumber else "-"
        v_app = format_date(vp.applicationDate)
        v_exp = format_date(vp.expirationDate)
        vaccine_rows.append([v_name, v_type, v_dose, v_app, v_exp])

    v_cols = ["Producto / Vacuna", "Tipo", "Dosis", "Aplicación", "Vencimiento"]
    v_widths = [
        printable_width * 0.28,
        printable_width * 0.22,
        printable_width * 0.14,
        printable_width * 0.18,
        printable_width * 0.18,
    ]
    story.extend(build_section("1. Vacunación y Antiparasitarios", v_cols, v_widths, vaccine_rows))

    # 4. Sección 2: Estudios Médicos
    tests_qs = pet.medicalTests.filter(isDeleted=False).order_by("-date", "-idMedicalTest")
    test_rows = []
    for mt in tests_qs:
        t_name = mt.name
        t_type = mt.get_type_display() if hasattr(mt, "get_type_display") else mt.type
        t_date = format_date(mt.date)
        t_vet = mt.veterinarian or "-"
        status_disp = mt.get_status_display() if hasattr(mt, "get_status_display") else mt.status
        t_res = f"{status_disp} ({mt.resultSummary})" if mt.resultSummary else status_disp
        test_rows.append([t_name, t_type, t_date, t_vet, t_res])

    t_cols = ["Estudio", "Tipo", "Fecha", "Veterinario", "Resultado"]
    t_widths = [
        printable_width * 0.24,
        printable_width * 0.16,
        printable_width * 0.16,
        printable_width * 0.20,
        printable_width * 0.24,
    ]
    story.extend(build_section("2. Estudios Médicos", t_cols, t_widths, test_rows))

    # 5. Sección 3: Tratamientos y Medicación
    meds_qs = (
        pet.medications.filter(isDeleted=False)
        .select_related("medication")
        .order_by("-startDate", "-id")
    )
    med_rows = []
    for mp in meds_qs:
        m_name = (
            f"{mp.medication.name} ({mp.medication.dose})"
            if (mp.medication and mp.medication.dose)
            else (mp.medication.name if mp.medication else "-")
        )
        m_freq = f"C/{mp.frequencyHours}hs ({mp.quantityDose} dosis)"
        m_start = format_date(mp.startDate)
        m_end = format_date(mp.endDate) if mp.endDate else "-"
        m_notes = mp.notes or "-"
        med_rows.append([m_name, m_freq, m_start, m_end, m_notes])

    m_cols = ["Medicamento", "Frecuencia", "Inicio", "Fin", "Indicaciones"]
    m_widths = [
        printable_width * 0.25,
        printable_width * 0.22,
        printable_width * 0.15,
        printable_width * 0.15,
        printable_width * 0.23,
    ]
    story.extend(build_section("3. Tratamientos y Medicación", m_cols, m_widths, med_rows))

    # 6. Sección 4: Diagnósticos y Enfermedades
    diseases_qs = (
        pet.diseases.filter(isDeleted=False)
        .select_related("disease")
        .order_by("-startDate", "-id")
    )
    disease_rows = []
    for pd in diseases_qs:
        d_name = pd.disease.name if pd.disease else "-"
        d_start = format_date(pd.startDate)
        d_end = format_date(pd.endDate) if pd.endDate else "En curso"
        d_notes = pd.notes or "-"
        disease_rows.append([d_name, d_start, d_end, d_notes])

    d_cols = ["Condición / Enfermedad", "Inicio", "Fin / Estado", "Observaciones"]
    d_widths = [
        printable_width * 0.28,
        printable_width * 0.17,
        printable_width * 0.18,
        printable_width * 0.37,
    ]
    story.extend(build_section("4. Diagnósticos y Enfermedades", d_cols, d_widths, disease_rows))

    # 7. Sección 5: Pautas de Alimentación
    feedings_qs = pet.feedings.filter(isDeleted=False).order_by("-sinceDate", "-idFeeding")
    feed_rows = []
    for f in feedings_qs:
        f_food = f.food
        f_type = f.get_type_display() if hasattr(f, "get_type_display") else f.type
        f_portion = f.portion or "-"
        f_freq = f.frequency or "-"
        f_since = format_date(f.sinceDate)
        feed_rows.append([f_food, f_type, f_portion, f_freq, f_since])

    f_cols = ["Alimento / Marca", "Tipo", "Porción", "Frecuencia", "Desde"]
    f_widths = [
        printable_width * 0.26,
        printable_width * 0.20,
        printable_width * 0.18,
        printable_width * 0.20,
        printable_width * 0.16,
    ]
    story.extend(build_section("5. Pautas de Alimentación", f_cols, f_widths, feed_rows))

    # Construir documento
    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer
