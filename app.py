# app.py
import json
import os
from datetime import datetime, timedelta
from docxtpl import DocxTemplate
from flask import Flask, request, jsonify, send_file, render_template
import io

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
        
        # Mapa de meses en español
        month_map = {
            1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
            5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
            9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
        }
        
        # Formatear el periodo correctamente
        month_name_spanish = month_map.get(end_date.month, '')
        period_str = f"Del {start_date.day} al {end_date.day} de {month_name_spanish}"
        return period_str
    except Exception as e:
        print(f"Error formateando periodo: {e}")
        return "Periodo no disponible"


# En la función generate_document, se ha corregido el nombre del archivo:
@app.route('/generate', methods=['POST'])
def generate_document():
    # ... código anterior ...
    
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

@app.route('/validate_json', methods=['POST'])
def validate_json():
    """Endpoint para validar la estructura del JSON."""
    try:
        json_text = request.json.get('json_text')
        reference_structure = request.json.get('reference_structure')
        
        if not json_text or not reference_structure:
            return jsonify({"valid": False, "error": "Datos incompletos para validación"}), 400
            
        data = json.loads(json_text)
        
        # Aquí podrías implementar una validación más completa
        # basada en la estructura de sesion_plantilla.json
        # Por ahora, solo verificamos que sea JSON válido
        is_valid = isinstance(data, (dict, list))
        
        return jsonify({"valid": is_valid})
        
    except json.JSONDecodeError as e:
        return jsonify({"valid": False, "error": f"JSON inválido: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"valid": False, "error": f"Error de validación: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)
