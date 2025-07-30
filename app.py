# app.py
import json
import os
from datetime import datetime, timedelta
from docxtpl import DocxTemplate
from flask import Flask, request, jsonify, send_file, render_template
import io
import copy

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limitar tamaño de carga a 16MB

# Funciones auxiliares (adaptadas de GDsesionAprendizaje.py)
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

# Función de validación de JSON de Sesión
def validate_session_json(data):
    """
    Valida la estructura del JSON de sesión contra la plantilla.
    Retorna una tupla (es_valido, mensaje_de_error).
    """
    if not isinstance(data, dict):
        return False, "El JSON raíz debe ser un objeto."
    
    # Campos obligatorios de primer nivel (CORREGIDO)
    # Se elimina 'talleres' de la lista de campos requeridos de primer nivel
    required_fields = ['nombreproyecto', 'periodo', 'preplanificacion', 'propositosaprendizaje', 
                       'enfoquestransversales', 'sesiones']
    
    for field in required_fields:
        if field not in data:
            return False, f"Campo obligatorio '{field}' no encontrado."
    
    # Validaciones específicas para secciones
    
    # preplanificacion
    preplanificacion = data.get('preplanificacion', {})
    if not isinstance(preplanificacion, dict):
        return False, "preplanificacion debe ser un objeto."
    
    preplanificacion_fields = ['quequierohacer', 'paraqueloquierohacer', 'comoloquierohacer']
    for field in preplanificacion_fields:
        if field not in preplanificacion or not isinstance(preplanificacion[field], str):
            return False, f"preplanificacion.{field} debe ser una cadena de texto."
    
    # propositosaprendizaje
    propositos = data.get('propositosaprendizaje', [])
    if not isinstance(propositos, list):
        return False, "propositosaprendizaje debe ser una lista de objetos."
    
    if len(propositos) == 0:
        return False, "propositosaprendizaje no puede estar vacío."
    
    for i, item in enumerate(propositos):
        if not isinstance(item, dict):
            return False, f"propositosaprendizaje[{i}] debe ser un objeto."
        # Puedes agregar validaciones más específicas para cada campo aquí si es necesario
    
    # enfoquestransversales (CORREGIDO)
    # Según la plantilla, enfoquestransversales es un objeto, no una lista
    enfoques = data.get('enfoquestransversales', {})
    if not isinstance(enfoques, dict):
        return False, "enfoquestransversales debe ser un objeto."
    # Puedes agregar validaciones para 'enfoque' y 'valores' aquí si es necesario
    
    # sesiones (verificar que existan los días)
    sesiones = data.get('sesiones', {})
    if not isinstance(sesiones, dict):
        return False, "sesiones debe ser un objeto con días como claves."
    
    dias_requeridos = ['dia_lunes', 'dia_martes', 'dia_miercoles', 'dia_jueves', 'dia_viernes']
    for dia in dias_requeridos:
        if dia not in sesiones:
            return False, f"sesiones.{dia} no encontrado."
        if not isinstance(sesiones[dia], dict):
            return False, f"sesiones.{dia} debe ser un objeto."
        # Puedes agregar validaciones más específicas para cada campo de sesión aquí si es necesario
    
    # La sección 'talleres' ya no se valida aquí como campo raíz requerido
    # porque no existe en la plantilla proporcionada
        
    return True, "JSON válido."

@app.route('/')
def index():
    """Sirve la página principal del frontend."""
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_document():
    """Endpoint para generar el documento .docx."""
    try:
        # Obtener archivos y datos del request
        template_file = request.files.get('template')
        session_json_file = request.files.get('session_json')
        class_json_file = request.files.get('class_json')
        
        # Opción alternativa: datos JSON pegados
        session_json_text = request.form.get('session_json_text')
        class_json_text = request.form.get('class_json_text')
        
        start_date_str = request.form.get('start_date')
        
        if not start_date_str:
            return jsonify({"error": "Fecha de inicio no proporcionada"}), 400
            
        if not template_file:
            return jsonify({"error": "Plantilla .docx no proporcionada"}), 400
            
        # Cargar datos de sesión
        session_data = None
        if session_json_file:
            session_data = json.load(session_json_file.stream)
        elif session_json_text:
            session_data = json.loads(session_json_text)
        else:
            return jsonify({"error": "Datos de sesión no proporcionados"}), 400
            
        # Validar estructura del JSON de sesión (CORREGIDO)
        is_valid, validation_message = validate_session_json(session_data)
        if not is_valid:
            return jsonify({"error": f"JSON de sesión inválido: {validation_message}"}), 400
            
        # Cargar datos de clase
        class_data = None
        if class_json_file:
            class_data = json.load(class_json_file.stream)
        elif class_json_text:
            class_data = json.loads(class_json_text)
        else:
            return jsonify({"error": "Datos de clase no proporcionados"}), 400

        # Formatear periodo
        period_str = format_period(start_date_str)
        session_data['Periodo'] = period_str

        # Calcular edades de alumnos
        if 'alumnos' in class_data and isinstance(class_data['alumnos'], list):
            class_data['alumnos'] = [
                {**alumno, 'meses_alumno': calculate_age(alumno.get('fechaNacimiento', ''))}
                for alumno in class_data['alumnos']
                if 'fechaNacimiento' in alumno
            ]

        # Preparar contexto
        context = {
            'sesion': session_data,
            'clase': class_data,
        }

        # Generar documento
        template_stream = io.BytesIO(template_file.read())
        doc = DocxTemplate(template_stream)
        doc.render(context)
        
        # Guardar en memoria
        output_stream = io.BytesIO()
        doc.save(output_stream)
        output_stream.seek(0)
        
        # Generar nombre de archivo con el formato correcto
        nombre_proyecto = session_data.get('nombreproyecto', 'Proyecto')
        # Limpiar nombre del proyecto para el nombre de archivo
        nombre_limpio = nombre_proyecto[:50].replace(' ', '_').replace('/', '_').replace('\\', '_')
        periodo_limpio = session_data['Periodo'].replace(' ', '_').replace('del_', 'Del_').replace('al_', 'al_').replace('de_', 'de_')
        
        filename = f"sesion_{nombre_limpio}_{periodo_limpio}.docx"
        
        return send_file(
            output_stream,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
    except Exception as e:
        print(f"Error generando documento: {e}")
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500

# Eliminamos la ruta /validate_json antigua ya que la validación se hace en /generate

if __name__ == '__main__':
    app.run(debug=True)
