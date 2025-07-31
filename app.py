import json
from datetime import datetime, timedelta
from docxtpl import DocxTemplate
from flask import Flask, request, jsonify, send_file, render_template
import io

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limitar tamaño de carga a 16MB


def calculate_age(birth_date_str):
    """Calcula la edad a partir de una fecha de nacimiento (dd/mm/yyyy) en meses."""
    try:
        birth_date = datetime.strptime(birth_date_str, "%d/%m/%Y").date()
        today = datetime.now().date()
        delta_days = (today - birth_date).days
        age_months = round(delta_days / 30.44)
        return f"{age_months} meses"
    except ValueError:
        return "Edad desconocida"


def find_next_friday(start_date):
    """Encuentra la fecha del próximo viernes a partir de una fecha dada."""
    days_until_friday = (4 - start_date.weekday() + 7) % 7
    if days_until_friday == 0:
        days_until_friday = 7
    return start_date + timedelta(days=days_until_friday)


def format_period(start_date_str):
    """Formatea el periodo basado en la fecha de inicio."""
    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date = find_next_friday(start_date)
        month_map = {
            1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
            5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
            9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
        }
        month_name_spanish = month_map.get(end_date.month, '')
        period_str = f"Del {start_date.day} al {end_date.day} de {month_name_spanish}"
        return period_str
    except Exception as e:
        print(f"Error formateando periodo: {e}")
        return "Periodo no disponible"


def validate_session_json(data):
    """
    Valida la estructura del JSON de sesión contra la plantilla.
    Retorna una tupla (es_valido, mensaje_de_error).
    """
    if not isinstance(data, dict):
        return False, "El JSON raíz debe ser un objeto."

    required_fields = [
        'nombreproyecto', 'periodo', 'preplanificacion',
        'propositosaprendizaje', 'enfoquestransversales', 'sesiones'
    ]
    for field in required_fields:
        if field not in data:
            return False, f"Campo obligatorio '{field}' no encontrado."

    # Validaciones específicas para secciones
    preplanificacion = data.get('preplanificacion', {})
    if not isinstance(preplanificacion, dict):
        return False, "preplanificacion debe ser un objeto."

    preplanificacion_fields = ['quequierohacer', 'paraqueloquierohacer', 'comoloquierohacer']
    for field in preplanificacion_fields:
        if field not in preplanificacion or not isinstance(preplanificacion[field], str):
            return False, f"preplanificacion.{field} debe ser una cadena de texto."

    propositos = data.get('propositosaprendizaje', [])
    if not isinstance(propositos, list):
        return False, "propositosaprendizaje debe ser una lista de objetos."
    if len(propositos) == 0:
        return False, "propositosaprendizaje no puede estar vacío."
    for i, item in enumerate(propositos):
        if not isinstance(item, dict):
            return False, f"propositosaprendizaje[{i}] debe ser un objeto."

    enfoques = data.get('enfoquestransversales', [])
    if not isinstance(enfoques, list):
        return False, "enfoquestransversales debe ser una lista de objetos."
    for i, item in enumerate(enfoques):
        if not isinstance(item, dict):
            return False, f"enfoquestransversales[{i}] debe ser un objeto."

    sesiones = data.get('sesiones', {})
    if not isinstance(sesiones, dict):
        return False, "sesiones debe ser un objeto con días como claves."
    dias_requeridos = ['dia_lunes', 'dia_martes', 'dia_miercoles', 'dia_jueves', 'dia_viernes']
    for dia in dias_requeridos:
        if dia not in sesiones:
            return False, f"sesiones.{dia} no encontrado."
        if not isinstance(sesiones[dia], dict):
            return False, f"sesiones.{dia} debe ser un objeto."

    return True, "JSON válido."


@app.route('/')
def index():
    """Sirve la página principal del frontend."""
    return render_template('index.html')


@app.route('/generate', methods=['POST'])
def generate_document():
    """Genera un documento .docx a partir de los datos y plantilla proporcionados."""
    try:
        template_file = request.files.get('template')
        session_json_file = request.files.get('session_json')
        class_json_file = request.files.get('class_json')
        session_json_text = request.form.get('session_json_text')
        class_json_text = request.form.get('class_json_text')
        start_date_str = request.form.get('start_date')

        if not start_date_str:
            return jsonify({"error": "Fecha de inicio no proporcionada"}), 400
        if not template_file:
            return jsonify({"error": "Plantilla .docx no proporcionada"}), 400
        if not session_json_file and not session_json_text:
            return jsonify({"error": "Datos de sesión no proporcionados (archivo o texto JSON requerido)"}), 400
        if not class_json_file and not class_json_text:
            return jsonify({"error": "Datos de clase no proporcionados (archivo o texto JSON requerido)"}), 400

        session_data = None
        if session_json_file:
            session_data = json.load(session_json_file.stream)
        elif session_json_text:
            session_data = json.loads(session_json_text)

        is_valid, validation_message = validate_session_json(session_data)
        if not is_valid:
            return jsonify({"error": f"JSON de sesión inválido: {validation_message}"}), 400

        class_data = None
        if class_json_file:
            class_data = json.load(class_json_file.stream)
        elif class_json_text:
            class_data = json.loads(class_json_text)

        period_str = format_period(start_date_str)
        session_data['Periodo'] = period_str

        if 'alumnos' in class_data and isinstance(class_data['alumnos'], list):
            class_data['alumnos'] = [
                {**alumno, 'meses_alumno': calculate_age(alumno.get('fechaNacimiento', ''))}
                for alumno in class_data['alumnos']
                if 'fechaNacimiento' in alumno
            ]

        context = {
            'sesion': session_data,
            'clase': class_data,
        }

        template_stream = io.BytesIO(template_file.read())
        doc = DocxTemplate(template_stream)
        doc.render(context)

        output_stream = io.BytesIO()
        doc.save(output_stream)
        output_stream.seek(0)

        nombre_proyecto = session_data.get('nombreproyecto', 'Proyecto')
        nombre_limpio = nombre_proyecto[:50].replace(' ', '_').replace('/', '_').replace('\\', '_')
        periodo_limpio = session_data['Periodo'].replace(' ', '_').replace('del_', 'Del_').replace('al_', 'al_').replace('de_', 'de_')
        filename = f"sesion_{nombre_limpio}_{periodo_limpio}.docx"

        return send_file(
            output_stream,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

    except json.JSONDecodeError as e:
        return jsonify({"error": f"Error en formato JSON: {str(e)}"}), 400
    except Exception as e:
        print(f"Error generando documento: {e}")
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500


@app.route('/edit_class', methods=['POST'])
def edit_class():
    """Guarda el JSON de clase editado desde el editor de alumnos."""
    try:
        class_data = request.json
        if not class_data or 'alumnos' not in class_data:
            return jsonify({"error": "JSON de clase inválido: debe contener 'alumnos'"}), 400
        for alumno in class_data['alumnos']:
            required_fields = ['nombre', 'fechaNacimiento', 'necesidadesEspeciales', 'notas']
            if not all(key in alumno for key in required_fields):
                return jsonify({"error": "Estructura de alumno inválida: faltan campos requeridos"}), 400
        return jsonify({"message": "JSON de clase guardado", "data": class_data}), 200
    except json.JSONDecodeError:
        return jsonify({"error": "Formato JSON inválido"}), 400
    except Exception as e:
        print(f"Error al guardar JSON de clase: {e}")
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True)
