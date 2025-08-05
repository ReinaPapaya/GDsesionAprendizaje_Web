import json
import os
from datetime import datetime, timedelta
from docxtpl import DocxTemplate
from flask import Flask, request, send_file, render_template
import io
import logging
import urllib.parse
from unidecode import unidecode

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limitar tamaño de carga a 16MB
app.config['JSON_AS_ASCII'] = False  # Permitir caracteres no ASCII en JSON

# Configurar logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Log de versión y cambios
logger.info("app.py - Versión: 1.5 | Cambios: Descarga directa del .docx con nombre correcto.")

# Funciones auxiliares
def calculate_age(birth_date_str):
    """Calcula la edad a partir de una fecha de nacimiento (dd/mm/yyyy) en meses."""
    try:
        birth_date = datetime.strptime(birth_date_str, "%d/%m/%Y").date()
        today = datetime.now().date()
        delta_days = (today - birth_date).days
        age_months = round(delta_days / 30.44)
        return f"{age_months} meses"
    except ValueError as e:
        logger.error(f"Error calculando edad: {e}")
        return "Edad desconocida"

def find_next_friday(start_date):
    """Encuentra la fecha del próximo viernes a partir de una fecha dada."""
    days_until_friday = (4 - start_date.weekday() + 7) % 7
    if days_until_friday == 0:
        days_until_friday = 7
    return start_date + timedelta(days=days_until_friday)  # ✅ Corregido

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
        return 'Periodo no disponible'

def remove_accents(text):
    """Elimina acentos usando la librería unidecode."""
    return unidecode(text).replace(' ', '_').replace('/', '_').replace('\\', '_')

# Validación JSON de Sesión
def validate_session_json(data):
    if not isinstance(data, dict):
        return False, "El JSON raíz debe ser un objeto."
    required_fields = ['nombreproyecto', 'periodo', 'preplanificacion', 'propositosaprendizaje', 
                       'enfoquestransversales', 'evaluacion', 'sesiones']
    for field in required_fields:
        if field not in data:
            return False, f"Campo obligatorio '{field}' no encontrado."
    if not isinstance(data['nombreproyecto'], str):
        return False, "nombreproyecto debe ser una cadena de texto."
    if not isinstance(data['periodo'], str):
        return False, "periodo debe ser una cadena de texto."
    preplanificacion = data.get('preplanificacion', {})
    if not isinstance(preplanificacion, dict):
        return False, "preplanificacion debe ser un objeto."
    for field in ['quequierohacer', 'paraqueloquierohacer', 'comoloquierohacer']:
        if field not in preplanificacion or not isinstance(preplanificacion[field], str):
            return False, f"preplanificacion.{field} debe ser una cadena de texto."
    propositos = data.get('propositosaprendizaje', [])
    if not isinstance(propositos, list) or len(propositos) != 4:
        return False, "propositosaprendizaje debe ser una lista de exactamente 4 objetos."
    for i, item in enumerate(propositos):
        if not isinstance(item, dict):
            return False, f"propositosaprendizaje[{i}] debe ser un objeto."
        for field in ['area', 'competenciacapacidades', 'estandar', 'desempenos']:
            if field not in item or not isinstance(item[field], str):
                return False, f"propositosaprendizaje[{i}].{field} debe ser una cadena de texto."
    enfoques = data.get('enfoquestransversales', {})
    if not isinstance(enfoques, dict):
        return False, "enfoquestransversales debe ser un objeto."
    for field in ['enfoque', 'valores']:
        if field not in enfoques or not isinstance(enfoques[field], str):
            return False, f"enfoquestransversales.{field} debe ser una cadena de texto."
    evaluacion = data.get('evaluacion', {})
    if not isinstance(evaluacion, dict):
        return False, "evaluacion debe ser un objeto."
    if 'criterios' not in evaluacion or not isinstance(evaluacion['criterios'], str):
        return False, "evaluacion.criterios debe ser una cadena de texto."
    sesiones = data.get('sesiones', {})
    if not isinstance(sesiones, dict):
        return False, "sesiones debe ser un objeto con días como claves."
    dias_requeridos = ['dia_lunes', 'dia_martes', 'dia_miercoles', 'dia_jueves', 'dia_viernes']
    for dia in dias_requeridos:
        if dia not in sesiones or not isinstance(sesiones[dia], dict):
            return False, f"sesiones.{dia} debe ser un objeto."
        if 'fecha' not in sesiones[dia] or not isinstance(sesiones[dia]['fecha'], str):
            return False, f"sesiones.{dia}.fecha debe ser una cadena de texto."
        for section in ['sesionprincipal', 'taller']:
            if section not in sesiones[dia] or not isinstance(sesiones[dia][section], dict):
                return False, f"sesiones.{dia}.{section} debe ser un objeto."
            if section == 'sesionprincipal':
                sesion = sesiones[dia][section]
                for field in ['nombre', 'proposito', 'area', 'competencia', 'capacidad', 'desempeno', 'evidencia', 'criterioevaluacion', 'estandard', 'recursos', 'listacotejo']:
                    if field not in sesion or not isinstance(sesion[field], str):
                        return False, f"sesiones.{dia}.sesionprincipal.{field} debe ser una cadena de texto."
                momentos = sesion.get('momentos_procesos_didacticos', {})
                if not isinstance(momentos, dict):
                    return False, f"sesiones.{dia}.sesionprincipal.momentos_procesos_didacticos debe ser un objeto."
                for momento in ['inicio', 'desarrollo', 'cierre']:
                    if momento not in momentos or not isinstance(momentos[momento], dict):
                        return False, f"sesiones.{dia}.sesionprincipal.momentos_procesos_didacticos.{momento} debe ser un objeto."
                    if 'descripcion' not in momentos[momento] or not isinstance(momentos[momento]['descripcion'], str):
                        return False, f"sesiones.{dia}.sesionprincipal.momentos_procesos_didacticos.{momento}.descripcion debe ser una cadena."
                    if 'tiempo' not in momentos[momento] or not isinstance(momentos[momento]['tiempo'], str):
                        return False, f"sesiones.{dia}.sesionprincipal.momentos_procesos_didacticos.{momento}.tiempo debe ser una cadena."
            else:
                taller = sesiones[dia][section]
                for field in ['nombre', 'fecha', 'area', 'competencia', 'criterioevaluacion', 'proposito', 'materiales', 'evaluacion', 'listacotejo']:
                    if field not in taller or not isinstance(taller[field], str):
                        return False, f"sesiones.{dia}.taller.{field} debe ser una cadena de texto."
                momentos = taller.get('momentos_procesos_didacticos', {})
                if not isinstance(momentos, dict):
                    return False, f"sesiones.{dia}.taller.momentos_procesos_didacticos debe ser un objeto."
                for momento in ['inicio', 'desarrollo', 'cierre']:
                    if momento not in momentos or not isinstance(momentos[momento], dict):
                        return False, f"sesiones.{dia}.taller.momentos_procesos_didacticos.{momento} debe ser un objeto."
                    if 'descripcion' not in momentos[momento] or not isinstance(momentos[momento]['descripcion'], str):
                        return False, f"sesiones.{dia}.taller.momentos_procesos_didacticos.{momento}.descripcion debe ser una cadena."
                    if 'tiempo' not in momentos[momento] or not isinstance(momentos[momento]['tiempo'], str):
                        return False, f"sesiones.{dia}.taller.momentos_procesos_didacticos.{momento}.tiempo debe ser una cadena."
    return True, "JSON válido."

# Validación JSON de Clase
def validate_class_json(data):
    if not isinstance(data, dict):
        return False, "El JSON raíz debe ser un objeto."
    if 'alumnos' not in data or not isinstance(data['alumnos'], list):
        return False, "alumnos debe ser una lista."
    for i, alumno in enumerate(data['alumnos']):
        if not isinstance(alumno, dict):
            return False, f"alumnos[{i}] debe ser un objeto."
        if 'nombre' not in alumno or not isinstance(alumno['nombre'], str):
            return False, f"alumnos[{i}].nombre debe ser una cadena de texto."
        if 'fechaNacimiento' in alumno and not isinstance(alumno['fechaNacimiento'], str):
            return False, f"alumnos[{i}].fechaNacimiento debe ser una cadena de texto."
    return True, "JSON válido."

@app.route('/')
def index():
    """Sirve la página principal del frontend."""
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_document():
    """Endpoint para generar el documento .docx."""
    logger.debug("Iniciando generación de documento.")
    """Endpoint para generar y devolver directamente el documento .docx."""
    try:
        template_file = request.files.get('template')
        session_json_file = request.files.get('session_json')
        class_json_file = request.files.get('class_json')
        session_json_text = request.form.get('session_json_text')
        class_json_text = request.form.get('class_json_text')
        start_date_str = request.form.get('start_date')

        if not start_date_str:
            return "Fecha de inicio no proporcionada", 400
        if not template_file:
            return "Plantilla .docx no proporcionada", 400

        # Cargar datos de sesión
        session_data = None
        if session_json_file:
            try:
                session_data = json.load(session_json_file.stream)
            except json.JSONDecodeError as e:
                return f"Error al parsear JSON de sesión: {str(e)}", 400
        elif session_json_text:
            try:
                session_data = json.loads(session_json_text)
            except json.JSONDecodeError as e:
                return f"Error al parsear JSON de sesión: {str(e)}", 400
        else:
            return "Datos de sesión no proporcionados", 400

        is_valid, validation_message = validate_session_json(session_data)
        if not is_valid:
            return f"JSON de sesión inválido: {validation_message}", 400

        # Cargar datos de clase
        class_data = None
        if class_json_file:
            try:
                class_data = json.load(class_json_file.stream)
            except json.JSONDecodeError as e:
                return f"Error al parsear JSON de clase: {str(e)}", 400
        elif class_json_text:
            try:
                class_data = json.loads(class_json_text)
            except json.JSONDecodeError as e:
                return f"Error al parsear JSON de clase: {str(e)}", 400
        else:
            return "Datos de clase no proporcionados", 400

        is_valid, validation_message = validate_class_json(class_data)
        if not is_valid:
            return f"JSON de clase inválido: {validation_message}", 400

        # Formatear periodo
        period_str = format_period(start_date_str)
        session_data['Periodo'] = period_str

        # Calcular edades
        if 'alumnos' in class_data and isinstance(class_data['alumnos'], list):
            for alumno in class_data['alumnos']:
                if 'fechaNacimiento' in alumno:
                    alumno['meses_alumno'] = calculate_age(alumno['fechaNacimiento'])

        # Preparar contexto
        context = {
            'sesion': session_data,
            'clase': class_data,
        }

        # Generar documento
        template_stream = io.BytesIO(template_file.read())
        doc = DocxTemplate(template_stream)
        try:
            doc.render(context)
        except Exception as e:
            return f"Error al renderizar la plantilla: {str(e)}", 400

        # Guardar en memoria
        output_stream = io.BytesIO()
        doc.save(output_stream)
        output_stream.seek(0)

        # Nombre de archivo con espacios, no guiones bajos
        nombre_proyecto = session_data.get('nombreproyecto', 'Proyecto')
        nombre_limpio = remove_accents(nombre_proyecto[:50]).replace('_', ' ')
        periodo_limpio = remove_accents(session_data['Periodo']).replace('_', ' ')
        filename = f"sesion {nombre_limpio} {periodo_limpio}.docx"

        # Enviar como descarga directa
        return send_file(
            output_stream,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

    except Exception as e:
        logger.error(f"Error generando documento: {str(e)}", exc_info=True)
        return f"Error interno: {str(e)}", 500

if __name__ == '__main__':
    app.run(debug=True)