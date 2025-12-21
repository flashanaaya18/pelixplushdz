import json
import os
from datetime import datetime
import sys
import time
import re
from unidecode import unidecode
from concurrent.futures import ThreadPoolExecutor, as_completed
import random
import copy
import shutil

# --- Verificación de dependencias ---
try:
    import requests
    from bs4 import BeautifulSoup
    import tmdbsimple as tmdb
except ImportError:
    print("Faltan bibliotecas necesarias. Por favor, instálalas ejecutando:")
    print("pip install requests beautifulsoup4 tmdbsimple unidecode")
    sys.exit(1)

class C:
    HEADER = '\033[91m'
    MAGENTA = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ORANGE = '\033[38;5;208m'
    PINK = '\033[95m'
    PURPLE = '\033[95m'
    LIGHT_BLUE = '\033[96m'
    LIGHT_GREEN = '\033[92m'
    GOLD = '\033[93m'
    GREY = '\033[90m'
    WHITE = '\033[97m'
    END = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    BLINK = '\033[5m'

# --- Configuración de TMDb API ---
TMDB_API_KEY = "9869fab7c867e72214c8628c6029ec74"
tmdb.API_KEY = TMDB_API_KEY

# --- Crear módulos auxiliares si no existen ---
def crear_modulos_auxiliares():
    # Crear url.py si no existe
    if not os.path.exists('url.py'):
        with open('url.py', 'w', encoding='utf-8') as f:
            f.write('''import requests
from bs4 import BeautifulSoup

def extract_url_info(url):
    """Extrae información de video desde una URL"""
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Buscar iframes
        iframes = soup.find_all('iframe')
        video_sources = []
        
        for iframe in iframes:
            src = iframe.get('src', '')
            if src and ('youtube' in src or 'vimeo' in src or 'dailymotion' in src or 'embed' in src):
                video_sources.append(src)
        
        # Buscar videos HTML5
        video_tags = soup.find_all('video')
        for video in video_tags:
            source = video.find('source')
            if source and source.get('src'):
                video_sources.append(source['src'])
        
        return {
            'success': True,
            'sources': video_sources,
            'title': soup.title.string if soup.title else 'Sin título'
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def main():
    print("🔗 Extractor de URLs de video")
    url = input("Introduce la URL: ")
    result = extract_url_info(url)
    
    if result['success']:
        print(f"✅ Título: {result['title']}")
        print(f"🔗 Enlaces encontrados: {len(result['sources'])}")
        for i, src in enumerate(result['sources'], 1):
            print(f"  {i}. {src[:100]}...")
    else:
        print(f"❌ Error: {result['error']}")
''')

    # Crear gemini.py si no existe
    if not os.path.exists('gemini.py'):
        with open('gemini.py', 'w', encoding='utf-8') as f:
            f.write('''def obtener_info_pelicula(titulo):
    """Simulación de IA - Devuelve información básica"""
    from datetime import datetime
    return {
        'titulo': titulo,
        'descripcion': f"Descripción automática para {titulo}",
        'año': datetime.now().year,
        'genero': "Acción, Aventura",
        'reparto': ["Actor 1", "Actor 2"],
        'poster': "https://via.placeholder.com/500x750"
    }
''')

# Crear los módulos
crear_modulos_auxiliares()

# Importar módulos auxiliares
try:
    import url as url_extractor
except ImportError:
    print(f"{C.YELLOW}⚠️  No se pudo cargar url.py{C.END}")
    url_extractor = None

try:
    import gemini as asistente_ia
except ImportError:
    print(f"{C.YELLOW}⚠️  No se encontró gemini.py{C.END}")
    asistente_ia = None

# --- Manejo de zona horaria ---
try:
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
    TZ = ZoneInfo("America/Mexico_City")
except (ImportError, ZoneInfoNotFoundError):
    TZ = None

# --- Constantes ---
JS_FILE = 'peliculas/peliculas2.js'
REPORTS_FILE = 'reports.json'
PROXIMAMENTE_FILE = 'proximamente.json'
BASE_DATOS_FILE = 'base_datos.json'
SOLICITUDES_FILE = 'solicitudes.json'
MAINTENANCE_FLAG = 'maintenance.flag'
CAMPAIGN_FILE = 'campaña_proximamente.txt'
PELINOT_JS_FILE = 'pelinot.js'
NOTIFICACIONES_FILE = 'lanzamientos_notificaciones.json'

CONTENT_TYPES = {'1': 'pelicula', '2': 'serie'}
CATEGORIAS_DISPONIBLES = [
    "lanzamientos-recientes", "series", "todo-lo-nuevo-2025", "accion", "drama", 
    "comedia", "aventura", "terror", "anime", "documental", "populares",
    "naruto", "dragon ball", "one piece", "animes-populares"
]
PLATAFORMAS_DISPONIBLES = [
    "netflix", "prime video", "disney+", "max", "apple tv+", "star+", 
    "paramount+", "hulu", "crunchyroll", "vix", "youtube", "cine",
    "pelicula", "documental"
]

# --- Diccionario de géneros TMDb ---
GENEROS_TMDB = {
    28: "Acción", 12: "Aventura", 16: "Animación", 35: "Comedia",
    80: "Crimen", 99: "Documental", 18: "Drama", 10751: "Familia",
    14: "Fantasía", 36: "Historia", 27: "Terror", 10402: "Música",
    9648: "Misterio", 10749: "Romance", 878: "Ciencia Ficción",
    10770: "Película TV", 53: "Suspense", 10752: "Bélica",
    37: "Western", 10759: "Acción & Aventura", 10762: "Niños",
    10763: "Noticias", 10764: "Reality", 10765: "Sci-Fi & Fantasía",
    10766: "Telenovela", 10767: "Talk", 10768: "Guerra & Política"
}

# --- Funciones de Utilidad ---
def limpiar_pantalla():
    os.system('cls' if os.name == 'nt' else 'clear')

def cargar_peliculas_desde_js(file_path):
    """Carga películas desde un archivo .js que contiene un array."""
    if not os.path.exists(file_path):
        print(f"{C.YELLOW}⚠️  Archivo no encontrado: {file_path}{C.END}")
        return []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        # Busca la asignación del array (peliculas, peliculas1, etc.)
        match = re.search(r'=\s*(\[.*\]);', content, re.DOTALL)
        if match:
            json_content = match.group(1)
            # Corregir comillas simples y otros problemas comunes de JSON no estricto
            json_content = re.sub(r"'\s*,\s*'", '","', json_content)
            return json.loads(json_content)
        else:
            print(f"{C.YELLOW}⚠️  No se encontró un array de películas en {file_path}{C.END}")
            return []
    except Exception as e:
        print(f"{C.RED}❌ Error al leer o parsear {file_path}: {e}{C.END}")
        return []

def cargar_catalogo_completo():
    """Carga y combina películas de todos los archivos fuente."""
    print(f"{C.CYAN}🔄 Cargando catálogo completo...{C.END}")
    archivos_fuente = ['peliculas/peliculas2.js']
    catalogo_completo = []
    for archivo in archivos_fuente:
        print(f"  - Cargando desde {archivo}...")
        catalogo_completo.extend(cargar_peliculas_desde_js(archivo))

    # Deduplicar por ID
    vistos = set()
    catalogo_unico = []
    for item in catalogo_completo:
        item_id = item.get('id')
        if item_id and item_id not in vistos:
            catalogo_unico.append(item)
            vistos.add(item_id)
            
    print(f"{C.GREEN}✅ Catálogo cargado con {len(catalogo_unico)} elementos únicos.{C.END}")
    return {p.get('id'): p for p in catalogo_unico if p.get('id')}

def guardar_peliculas(peliculas_dict, crear_backup=True):
    """Guarda las películas en el archivo JS."""
    target_file = 'peliculas/peliculas2.js'
    try:
        if crear_backup and os.path.exists(target_file):
            backup_file = target_file + '.bak'
            shutil.copy2(target_file, backup_file)
        
        # Convertir diccionario a lista y ordenar por título
        peliculas_lista = list(peliculas_dict.values())
        peliculas_lista.sort(key=lambda x: x.get('titulo', '').lower())
        
        json_string = json.dumps(peliculas_lista, ensure_ascii=False, indent=2)
        js_content = f"const peliculas2 = {json_string};"
        
        with open(target_file, 'w', encoding='utf-8') as f:
            f.write(js_content)
        
        print(f"{C.GREEN}✅ Biblioteca guardada exitosamente{C.END}")
        return True
    
    except Exception as e:
        print(f"{C.RED}❌ Error guardando: {e}{C.END}")
        return False, str(e)

def detectar_generos_desde_query(query):
    """Intenta detectar géneros a partir de palabras clave en la query."""
    query_lower = query.lower()
    generos_encontrados = []
    mapa_generos = {
        "accion": "Acción", "aventura": "Aventura", "comedia": "Comedia",
        "terror": "Terror", "horror": "Terror", "drama": "Drama",
        "romance": "Romance", "ciencia ficcion": "Ciencia Ficción", "sci-fi": "Ciencia Ficción",
        "fantasia": "Fantasía", "animacion": "Animación", "anime": "Animación",
        "documental": "Documental", "misterio": "Misterio", "suspense": "Suspense",
        "crimen": "Crimen", "belica": "Bélica", "guerra": "Bélica"
    }
    for keyword, genero in mapa_generos.items():
        if keyword in query_lower and genero not in generos_encontrados:
            generos_encontrados.append(genero)
    return generos_encontrados

def mostrar_resumen_detallado(detalles, tipo_contenido):
    """Muestra un resumen bien formateado de los detalles obtenidos."""
    print(f"\n{C.BOLD}{C.PURPLE}✨ RESUMEN DETALLADO ✨{C.END}")
    mostrar_separador(C.PURPLE)

    titulo = detalles.get('titulo', 'N/A')
    año = detalles.get('año', 'N/A')
    tagline = detalles.get('tagline', '')

    print(f"{C.BOLD}{C.YELLOW}{titulo}{C.END} {C.CYAN}({año}){C.END}")
    if tagline:
        print(f"{C.GREY}  '{tagline}'{C.END}")

    mostrar_separador(C.GREY, 40)

    # Calificación y popularidad
    calificacion = detalles.get('calificacion', 0)
    votos = detalles.get('votos', 0)
    estrellas_num = min(5, max(0, int(calificacion / 2)))
    estrellas = "★" * estrellas_num + "☆" * (5 - estrellas_num)
    print(f"{C.GREEN}⭐ {estrellas} {calificacion:.1f}/10 ({votos:,} votos){C.END}")

    # Géneros
    generos = detalles.get('generos_lista', [])
    if generos:
        print(f"{C.MAGENTA}🎭 Géneros: {', '.join(generos)}{C.END}")

    # Descripción
    descripcion = detalles.get('descripcion', 'Sin descripción.')
    if len(descripcion) > 250:
        descripcion = descripcion[:247] + "..."
    print(f"\n{C.WHITE}{descripcion}{C.END}")

    mostrar_separador(C.GREY, 40)

    # Info específica
    if tipo_contenido == 'pelicula':
        print(f"{C.CYAN}🎬 Director: {detalles.get('director', 'N/A')}{C.END}")
        print(f"{C.CYAN}⏱️  Duración: {detalles.get('duracion', 'N/A')}{C.END}")
    else:
        print(f"{C.CYAN}📺 Creador: {detalles.get('director', 'N/A')}{C.END}")
        print(f"{C.CYAN}📊 Temporadas: {detalles.get('temporadas', 'N/A')}{C.END}")

    # Reparto
    reparto = detalles.get('reparto', [])
    if reparto:
        print(f"{C.CYAN}👥 Reparto: {', '.join(reparto[:4])}...{C.END}")

    # Trailer
    if detalles.get('trailer'):
        print(f"{C.ORANGE}▶️  Trailer disponible{C.END}")

    mostrar_separador(C.PURPLE)

def mostrar_banner():
    limpiar_pantalla()
    print(f"{C.BOLD}{C.PURPLE}╔══════════════════════════════════════════════════════════════════════════════╗{C.END}")
    print(f"{C.BOLD}{C.PURPLE}║{C.GOLD}                          🎬✨ Panel de Administración peliXx ✨📺                         {C.PURPLE}║{C.END}")
    print(f"{C.BOLD}{C.PURPLE}╚══════════════════════════════════════════════════════════════════════════════╝{C.END}")

def mostrar_separador(color=C.PURPLE, longitud=80):
    print(f"{C.BOLD}{color}{'═' * longitud}{C.END}")

def confirmar_accion(mensaje):
    respuesta = input(f"{C.YELLOW}{mensaje} (s/n): {C.END}").strip().lower()
    return respuesta in ['s', 'si', 'y', 'yes']

def buscar_mas_resultados(query, tipo_contenido, pagina=2):
    """Función placeholder para buscar más resultados."""
    print(f"\n{C.YELLOW}⚠️  Funcionalidad 'Buscar más resultados' no implementada aún.{C.END}")
    print(f"   (Página {pagina} para '{query}')")
    time.sleep(2)
    return None

def busqueda_con_filtros(tipo_contenido):
    """Función placeholder para búsqueda con filtros."""
    print(f"\n{C.YELLOW}⚠️  Funcionalidad 'Nueva búsqueda con filtros' no implementada aún.{C.END}")
    time.sleep(2)
    return None

def filtrar_resultados(resultados, tipo_contenido):
    """Función placeholder para filtrar resultados."""
    print(f"\n{C.YELLOW}⚠️  Funcionalidad 'Filtrar resultados' no implementada aún.{C.END}")
    time.sleep(2)
    return None

def procesar_seleccion_resultados(resultados, tipo_contenido):
    """Función placeholder para procesar selección."""
    print(f"\n{C.YELLOW}⚠️  Funcionalidad 'procesar_seleccion_resultados' no implementada aún.{C.END}")
    return None

def buscar_en_tmdb_super_mejorado(query, tipo_contenido='pelicula'):
    """Búsqueda ULTRA MEJORADA en TMDb - MÁS RÁPIDA, INTELIGENTE Y CON MÁS OPCIONES."""
    try:
        print(f"\n{C.CYAN}🚀 BUSCANDO '{query}' en TMDb...{C.END}")
        
        resultados = []
        max_resultados = 12  # Más resultados
        busqueda_exacta = True
        
        # Inteligencia previa: Limpiar y normalizar query
        query_limpia = unidecode(query.lower()).strip()
        query_limpia = re.sub(r'[^\w\s\-]', ' ', query_limpia)
        query_limpia = re.sub(r'\s+', ' ', query_limpia)
        
        print(f"{C.GREY}🔍 Query procesada: '{query_limpia}'{C.END}")
        
        # PRIMERO: Búsqueda principal con múltiples estrategias
        estrategias = [
            ('es-ES', query, 'Búsqueda exacta en español'),
            ('es-ES', query_limpia, 'Búsqueda limpia en español'),
            ('en-US', query, 'Búsqueda en inglés'),
            ('en-US', query_limpia, 'Búsqueda limpia en inglés'),
            ('es-ES', ' '.join(query_limpia.split()[:5]), 'Búsqueda con palabras clave'),
        ]
        
        for idioma, termino, descripcion in estrategias:
            if resultados:
                break
                
            try:
                print(f"{C.GREY}  ➤ Intentando: {descripcion}...{C.END}")
                
                if tipo_contenido == 'pelicula':
                    search = tmdb.Search()
                    response = search.movie(
                        query=termino, 
                        language=idioma, 
                        include_adult=False,
                        page=1
                    )
                else:
                    search = tmdb.Search()
                    response = search.tv(
                        query=termino, 
                        language=idioma, 
                        include_adult=False,
                        page=1
                    )
                
                if search.results:
                    resultados = search.results[:max_resultados]
                    print(f"{C.GREEN}  ✅ Encontrados con estrategia '{descripcion}'{C.END}")
                    break
                time.sleep(0.2)  # Pequeño delay para no saturar
                
            except Exception as e:
                print(f"{C.GREY}  ⚠️  Falló: {descripcion}{C.END}")
                continue
        
        # SEGUNDO: Si no hay resultados, intentar búsquedas alternativas
        if not resultados:
            print(f"{C.YELLOW}⚠️  No hay resultados con búsqueda principal. Intentando métodos alternativos...{C.END}")
            
            alternativas = [
                ('Búsqueda por año', r'(.*)\s+\((\d{4})\)'),  # Extraer año del título
                ('Búsqueda sin artículos', lambda q: re.sub(r'^(el|la|los|las|un|una|unos|unas)\s+', '', q, flags=re.IGNORECASE)),
                ('Búsqueda solo palabras principales', lambda q: ' '.join(q.split()[:3])),
                ('Búsqueda sin signos de puntuación', lambda q: re.sub(r'[^\w\s]', '', q)),
            ]
            
            for desc, transformacion in alternativas:
                try:
                    if callable(transformacion):
                        nuevo_query = transformacion(query_limpia)
                    else:
                        match = re.search(transformacion, query)
                        if match:
                            nuevo_query = match.group(1).strip()
                        else:
                            continue
                    
                    print(f"{C.GREY}  ➤ Probando: {desc} -> '{nuevo_query}'{C.END}")
                    
                    if tipo_contenido == 'pelicula':
                        search = tmdb.Search()
                        response = search.movie(query=nuevo_query, language='es-ES')
                    else:
                        search = tmdb.Search()
                        response = search.tv(query=nuevo_query, language='es-ES')
                    
                    if search.results:
                        resultados = search.results[:max_resultados]
                        print(f"{C.GREEN}  ✅ Éxito con método alternativo: {desc}{C.END}")
                        break
                        
                except Exception as e:
                    continue
        
        # TERCERO: Si aún no hay resultados, buscar en popular/trending
        if not resultados:
            print(f"{C.YELLOW}⚠️  Intentando búsqueda en contenido popular/trending...{C.END}")
            
            try:
                # Buscar en trending de la semana
                if tipo_contenido == 'pelicula':
                    trending = tmdb.Trending()
                    response = trending.week(page=1, language='es-ES')
                else:
                    trending = tmdb.Trending()
                    response = trending.tv_day(page=1, language='es-ES')
                
                if response.get('results'):
                    # Filtrar por similitud en el título
                    resultados_similares = []
                    for item in response['results'][:10]:
                        titulo_item = (item.get('title') or item.get('name') or '').lower()
                        if query_limpia in titulo_item or any(word in titulo_item for word in query_limpia.split()[:2]):
                            resultados_similares.append(item)
                    
                    if resultados_similares:
                        resultados = resultados_similares[:max_resultados]
                        print(f"{C.GREEN}  ✅ Encontrados en trending{C.END}")
                        
            except Exception as e:
                print(f"{C.GREY}  ⚠️  Error en trending: {e}{C.END}")
        
        # CUARTO: Si aún no hay nada, crear datos generados mejorados
        if not resultados:
            print(f"{C.YELLOW}⚠️  No se encontraron resultados exactos en TMDb.{C.END}")
            print(f"{C.CYAN}🤖 Creando datos inteligentes automáticos...{C.END}")
            
            # Analizar query para generar mejores datos
            palabras = query_limpia.split()
            año_match = re.search(r'\((\d{4})\)', query)
            año = int(año_match.group(1)) if año_match else datetime.now().year
            
            # Detectar posibles géneros de la query
            generos_detectados = detectar_generos_desde_query(query)
            
            # Generar descripción inteligente
            if tipo_contenido == 'pelicula':
                descripcion = f"{query} es una película {generos_detectados[0] if generos_detectados else 'dramática'} del año {año}. Con una trama envolvente y actuaciones memorables, esta producción se ha ganado el reconocimiento de la crítica y del público."
            else:
                descripcion = f"{query} es una serie {generos_detectados[0] if generos_detectados else 'dramática'} que se estrenó en {año}. Con temporadas llenas de giros inesperados y personajes carismáticos, se ha convertido en un fenómeno televisivo."
            
            datos_generados = {
                'titulo': query,
                'titulo_original': query,
                'descripcion': descripcion,
                'año': año,
                'genero': ", ".join(generos_detectados[:3]) if generos_detectados else "Drama, Suspense",
                'generos_lista': generos_detectados[:3] if generos_detectados else ["Drama", "Suspense"],
                'calificacion': round(random.uniform(6.5, 8.5), 1),  # Calificación más realista
                'votos': random.randint(50, 1000),
                'popularidad': round(random.uniform(30.0, 70.0), 2),
                'idioma': 'ES',
                'poster': f"https://via.placeholder.com/500x750/1a1a2e/ffffff?text={query.replace(' ', '+')[:15]}",
                'backdrop': f"https://via.placeholder.com/1280x720/16213e/ffffff?text={query.replace(' ', '+')[:20]}",
                'success': True,
                'auto_generado': True,
                'notas': "Datos generados automáticamente - No encontrado en TMDb"
            }
            
            if tipo_contenido == 'pelicula':
                datos_generados.update({
                    'duracion': f"{random.randint(90, 180)} min",
                    'director': random.choice(["Director Principal", "Director Reconocido", "Director Internacional"]),
                    'reparto': ["Actor Principal", "Actriz Principal", "Actor de Reparto", "Actriz de Reparto"][:random.randint(2,4)]
                })
            else:
                datos_generados.update({
                    'temporadas': random.randint(1, 5),
                    'episodios': random.randint(10, 60),
                    'director': random.choice(["Creador Principal", "Productor Ejecutivo", "Showrunner"]),
                    'reparto': ["Protagonista", "Co-protagonista", "Actor Recurrente", "Invitado Especial"][:random.randint(3,5)]
                })
            
            return datos_generados
        
        # MOSTRAR RESULTADOS CON MEJOR FORMATO
        print(f"\n{C.GREEN}✅ Encontrados {len(resultados)} resultados:{C.END}")
        print(f"{C.GREY}{'─' * 100}{C.END}")
        
        # Opciones de visualización
        print(f"{C.CYAN}📋 OPCIONES DE VISUALIZACIÓN:{C.END}")
        print(f"  [D] - Vista detallada (recomendada)")
        print(f"  [R] - Vista rápida")
        print(f"  [I] - Solo información básica")
        
        vista = input(f"{C.GOLD}🎲 Elige tipo de vista (D/R/I) [D]: {C.END}").strip().lower() or 'd'
        
        for i, item in enumerate(resultados, 1):
            titulo = item.get('title') if tipo_contenido == 'pelicula' else item.get('name')
            año = item.get('release_date', '')[:4] if tipo_contenido == 'pelicula' else item.get('first_air_date', '')[:4]
            calificacion = item.get('vote_average', 0)
            votos = item.get('vote_count', 0)
            popularidad = item.get('popularity', 0)
            
            # Calcular estrellas
            estrellas_num = min(5, max(0, int(calificacion / 2)))
            estrellas = "★" * estrellas_num + "☆" * (5 - estrellas_num)
            
            # Vista detallada
            if vista == 'd':
                print(f"\n{C.BOLD}{C.YELLOW}{i}. {titulo}{C.END} {C.CYAN}({año if año else 'N/A'}){C.END}")
                print(f"   {C.GREEN}⭐ {estrellas} {calificacion:.1f}/10 • {votos:,} votos • 📊 Popularidad: {popularidad:.1f}{C.END}")
                
                # Géneros detallados
                if item.get('genre_ids'):
                    generos = [GENEROS_TMDB.get(gid, "") for gid in item.get('genre_ids', [])]
                    generos = [g for g in generos if g]
                    if generos:
                        print(f"   {C.MAGENTA}🎭 Géneros: {', '.join(generos)}{C.END}")
                
                # Descripción
                descripcion = item.get('overview', '')
                if descripcion:
                    if len(descripcion) > 150:
                        descripcion = descripcion[:147] + "..."
                    print(f"   {C.WHITE}{descripcion}{C.END}")
                
                # Información adicional
                if tipo_contenido == 'pelicula':
                    print(f"   {C.CYAN}🎬 Tipo: Película{C.END}")
                else:
                    print(f"   {C.CYAN}📺 Tipo: Serie • Temporadas: {item.get('number_of_seasons', '?')}{C.END}")
                
                print(f"{C.GREY}{'─' * 100}{C.END}")
            
            # Vista rápida
            elif vista == 'r':
                print(f"{C.BOLD}{i}.{C.END} {C.YELLOW}{titulo[:40]:<40}{C.END} {C.CYAN}({año if año else 'N/A'}){C.END} {C.GREEN}⭐ {calificacion:.1f}{C.END}")
            
            # Solo información básica
            else:
                print(f"{i}. {titulo} ({año if año else 'N/A'})")
        
        # OPCIONES AVANZADAS DE SELECCIÓN
        print(f"\n{C.CYAN}🎯 OPCIONES DE SELECCIÓN:{C.END}")
        print(f"  [1-{len(resultados)}] - Seleccionar ese resultado")
        print(f"  [M] - Buscar más resultados (página siguiente)")
        print(f"  [N] - Nueva búsqueda con filtros")
        print(f"  [F] - Filtrar resultados mostrados")
        print(f"  [0] - Cancelar/Volver")
        
        seleccion = input(f"\n{C.GOLD}🎲 Elige opción: {C.END}").strip().lower()
        
        # Opciones avanzadas
        if seleccion == 'm':
            # Implementar paginación
            return buscar_mas_resultados(query, tipo_contenido, pagina=2)
        elif seleccion == 'n':
            # Nueva búsqueda con filtros
            return busqueda_con_filtros(tipo_contenido)
        elif seleccion == 'f':
            # Filtrar resultados actuales
            resultados_filtrados = filtrar_resultados(resultados, tipo_contenido)
            if resultados_filtrados:
                # Volver a mostrar resultados filtrados
                return procesar_seleccion_resultados(resultados_filtrados, tipo_contenido)
            else:
                print(f"{C.YELLOW}⚠️  No hay resultados después del filtrado{C.END}")
                return None
        elif seleccion == '0':
            return None
        
        # Selección normal
        try:
            idx = int(seleccion) - 1
            if 0 <= idx < len(resultados):
                item_seleccionado = resultados[idx]
                print(f"\n{C.CYAN}📥 Obteniendo detalles completos...{C.END}")
                
                detalles = obtener_detalles_tmdb_super_mejorado(item_seleccionado['id'], tipo_contenido)
                
                if detalles:
                    # Mostrar resumen mejorado
                    mostrar_resumen_detallado(detalles, tipo_contenido)
                    
                    # Opciones adicionales después de obtener detalles
                    print(f"\n{C.CYAN}📋 OPCIONES POST-SELECCIÓN:{C.END}")
                    print(f"  [A] - Añadir directamente con estos datos")
                    print(f"  [E] - Editar antes de añadir")
                    print(f"  [V] - Ver más detalles técnicos")
                    print(f"  [S] - Buscar similar")
                    
                    opcion_post = input(f"{C.GOLD}🎲 Opción (Enter para continuar): {C.END}").strip().lower()
                    
                    if opcion_post == 'v':
                        mostrar_detalles_tecnicos(detalles)
                    elif opcion_post == 's':
                        buscar_similar = input(f"{C.CYAN}🔍 Buscar similar a '{detalles.get('titulo')}': {C.END}").strip()
                        if buscar_similar:
                            return buscar_en_tmdb_super_mejorado(buscar_similar, tipo_contenido)
                    
                    return detalles
        except ValueError:
            print(f"{C.RED}❌ Selección inválida{C.END}")
            return None
    
    except Exception as e:
        print(f"{C.RED}❌ Error en búsqueda TMDb: {e}{C.END}")
        print(f"{C.YELLOW}📝 Creando datos básicos mejorados...{C.END}")
        
        # Crear datos básicos como fallback
        año_actual = datetime.now().year
        return {
            'titulo': query,
            'descripcion': f"{query} - {'Película' if tipo_contenido == 'pelicula' else 'Serie'} de alta calidad disponible. Con una trama envolvente y producción profesional.",
            'año': año_actual,
            'genero': "Acción, Aventura, Drama",
            'generos_lista': ["Acción", "Aventura", "Drama"],
            'calificacion': 7.5,
            'poster': f"https://via.placeholder.com/500x750/2d4059/ffffff?text={query.replace(' ', '+')[:12]}",
            'backdrop': f"https://via.placeholder.com/1280x720/1a1a2e/ffffff?text={query.replace(' ', '+')[:18]}",
            'auto_generado': True,
            'success': True,
            'notas': "Generado automáticamente - Búsqueda fallida"
        }

def mostrar_detalles_tecnicos(detalles):
    """Muestra detalles técnicos de un item."""
    print(f"\n{C.YELLOW}⚠️  Funcionalidad 'Ver más detalles técnicos' no implementada aún.{C.END}")
    print(f"   Mostrando datos crudos como fallback:")
    print(detalles)

def obtener_detalles_tmdb_super_mejorado(tmdb_id, tipo_contenido='pelicula'):
    """Obtiene detalles completos desde TMDb con manejo de errores robusto."""
    try:
        if tipo_contenido == 'pelicula':
            movie = tmdb.Movies(tmdb_id)
            
            # Obtener datos con timeout
            try:
                detalles = movie.info(language='es-ES', timeout=10)
            except:
                detalles = movie.info(language='en-US', timeout=10)
            
            try:
                creditos = movie.credits(language='es-ES', timeout=10)
            except:
                creditos = movie.credits(language='en-US', timeout=10)
            
            try:
                videos = movie.videos(language='es-ES', timeout=10)
            except:
                videos = movie.videos(language='en-US', timeout=10)
            
            # Procesar géneros
            generos = [g['name'] for g in detalles.get('genres', [])] if detalles.get('genres') else []
            
            # Director
            director = ""
            if creditos and creditos.get('crew'):
                for persona in creditos.get('crew', []):
                    if persona.get('job') == 'Director':
                        director = persona['name']
                        break
            
            # Reparto principal
            reparto = []
            if creditos and creditos.get('cast'):
                reparto = [{
                    'name': actor.get('name'),
                    'profile_path': f"https://image.tmdb.org/t/p/w185{actor.get('profile_path')}" if actor.get('profile_path') else None
                } for actor in creditos.get('cast', [])[:12]] # Aumentado a 12 para más riqueza visual
            
            # Poster y backdrop
            poster = ""
            backdrop = ""
            if detalles.get('poster_path'):
                poster = f"https://image.tmdb.org/t/p/w500{detalles['poster_path']}"
            if detalles.get('backdrop_path'):
                backdrop = f"https://image.tmdb.org/t/p/w1280{detalles['backdrop_path']}"
            
            # Trailer
            trailer_url = ""
            if videos and videos.get('results'):
                for video in videos.get('results', []):
                    if video.get('type') in ['Trailer', 'Teaser'] and video.get('site') == 'YouTube':
                        trailer_url = f"https://www.youtube.com/watch?v={video.get('key')}"
                        break
            
            return {
                'titulo': detalles.get('title', ''),
                'titulo_original': detalles.get('original_title', ''),
                'descripcion': detalles.get('overview', 'Sin descripción disponible.'),
                'año': int(detalles.get('release_date', '')[:4]) if detalles.get('release_date') else datetime.now().year,
                'genero': ", ".join(generos) if generos else "Desconocido",
                'generos_lista': generos,
                'director': director,
                'reparto': reparto,
                'poster': poster,
                'backdrop': backdrop,
                'calificacion': round(float(detalles.get('vote_average', 0)), 1),
                'votos': detalles.get('vote_count', 0),
                'duracion': f"{detalles.get('runtime', 0)} min" if detalles.get('runtime') else "N/A",
                'idioma': detalles.get('original_language', 'es').upper(),
                'idioma_original': detalles.get('original_language', 'es'),
                'presupuesto': f"${detalles.get('budget', 0):,}" if detalles.get('budget') else "Desconocido",
                'ingresos': f"${detalles.get('revenue', 0):,}" if detalles.get('revenue') else "Desconocido",
                'tagline': detalles.get('tagline', ''),
                'trailer': trailer_url,
                'tmdb_id': tmdb_id,
                'popularidad': round(float(detalles.get('popularity', 0)), 2),
                'estado': detalles.get('status', 'Desconocido'),
                'success': True
            }
        
        else:  # Serie
            tv = tmdb.TV(tmdb_id)
            
            # Obtener datos con timeout
            try:
                detalles = tv.info(language='es-ES', timeout=10)
            except:
                detalles = tv.info(language='en-US', timeout=10)
            
            try:
                creditos = tv.credits(language='es-ES', timeout=10)
            except:
                creditos = tv.credits(language='en-US', timeout=10)
            
            try:
                videos = tv.videos(language='es-ES', timeout=10)
            except:
                videos = tv.videos(language='en-US', timeout=10)
            
            # Procesar géneros
            generos = [g['name'] for g in detalles.get('genres', [])] if detalles.get('genres') else []
            
            # Creador
            creador = ""
            if detalles.get('created_by'):
                creador = detalles['created_by'][0].get('name', '')
            
            # Reparto principal
            reparto = []
            if creditos and creditos.get('cast'):
                reparto = [{
                    'name': actor.get('name'),
                    'profile_path': f"https://image.tmdb.org/t/p/w185{actor.get('profile_path')}" if actor.get('profile_path') else None
                } for actor in creditos.get('cast', [])[:12]] # Aumentado a 12
            
            # Poster y backdrop
            poster = ""
            backdrop = ""
            if detalles.get('poster_path'):
                poster = f"https://image.tmdb.org/t/p/w500{detalles['poster_path']}"
            if detalles.get('backdrop_path'):
                backdrop = f"https://image.tmdb.org/t/p/w1280{detalles['backdrop_path']}"
            
            # Trailer
            trailer_url = ""
            if videos and videos.get('results'):
                for video in videos.get('results', []):
                    if video.get('type') in ['Trailer', 'Teaser'] and video.get('site') == 'YouTube':
                        trailer_url = f"https://www.youtube.com/watch?v={video.get('key')}"
                        break
            
            return {
                'titulo': detalles.get('name', ''),
                'titulo_original': detalles.get('original_name', ''),
                'descripcion': detalles.get('overview', 'Sin descripción disponible.'),
                'año': int(detalles.get('first_air_date', '')[:4]) if detalles.get('first_air_date') else datetime.now().year,
                'genero': ", ".join(generos) if generos else "Desconocido",
                'generos_lista': generos,
                'director': creador,
                'reparto': reparto,
                'poster': poster,
                'backdrop': backdrop,
                'calificacion': round(float(detalles.get('vote_average', 0)), 1),
                'votos': detalles.get('vote_count', 0),
                'duracion': f"{detalles.get('episode_run_time', [0])[0]} min" if detalles.get('episode_run_time') else "N/A",
                'idioma': detalles.get('original_language', 'es').upper(),
                'idioma_original': detalles.get('original_language', 'es'),
                'temporadas': detalles.get('number_of_seasons', 1),
                'episodios': detalles.get('number_of_episodes', 10),
                'trailer': trailer_url,
                'tmdb_id': tmdb_id,
                'popularidad': round(float(detalles.get('popularity', 0)), 2),
                'estado': detalles.get('status', 'Desconocido'),
                'ultima_emision': detalles.get('last_air_date', ''),
                'tipo_serie': detalles.get('type', 'Serie'),
                'success': True
            }
    
    except Exception as e:
        print(f"{C.YELLOW}⚠️  Error obteniendo detalles completos: {e}{C.END}")
        print(f"{C.CYAN}📝 Usando datos básicos...{C.END}")
        
        # Datos básicos como fallback
        año_actual = datetime.now().year
        datos_basicos = {
            'titulo': f"Contenido ID {tmdb_id}",
            'descripcion': f"{'Película' if tipo_contenido == 'pelicula' else 'Serie'} con ID {tmdb_id}",
            'año': año_actual,
            'genero': "General",
            'calificacion': 7.0,
            'poster': "https://via.placeholder.com/500x750",
            'tmdb_id': tmdb_id,
            'success': True,
            'auto_generado': True
        }
        
        if tipo_contenido == 'pelicula':
            datos_basicos['duracion'] = "120 min"
            datos_basicos['director'] = "Director"
        else:
            datos_basicos['temporadas'] = 1
            datos_basicos['episodios'] = 10
            datos_basicos['director'] = "Creador"
        
        return datos_basicos

def scrape_url_avanzado(url):
    """
    Función de scraping avanzada para extraer datos de una URL.
    Devuelve un diccionario con los datos o None si falla.
    """
    try:
        print(f"\n{C.CYAN}🔄 Obteniendo datos desde la URL con el método avanzado...{C.END}")
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # --- Búsqueda inteligente de datos ---
        titulo_tag = soup.find('meta', property='og:title') or soup.find('h1', class_='title') or soup.find('h1')
        titulo = titulo_tag.get('content', titulo_tag.text).strip() if titulo_tag else "Título no encontrado"

        desc_tag = soup.find('meta', property='og:description') or soup.find('div', class_='wp-content')
        descripcion = desc_tag.get('content', desc_tag.text).strip() if desc_tag else "Descripción no encontrada."

        poster_tag = soup.find('meta', property='og:image') or soup.find('div', class_='poster')
        poster = poster_tag.get('content') if poster_tag else (poster_tag.find('img')['src'] if poster_tag and poster_tag.find('img') else "")

        año_tag = soup.find('span', class_='year')
        año = int(año_tag.text) if año_tag and año_tag.text.isdigit() else datetime.now().year

        generos_tags = soup.select('div.genres a')
        genero = ", ".join([tag.text for tag in generos_tags])

        iframe_tag = soup.find('iframe', id='iframe-player') or soup.find('iframe')
        iframe_url = iframe_tag['src'] if iframe_tag and iframe_tag.get('src') else ""

        tipo = 'serie' if '/serie' in url else 'pelicula'

        return {
            "titulo": titulo, "poster": poster, "descripcion": descripcion, 
            "año": año, "genero": genero, "tipo": tipo, "iframe_url": iframe_url,
            "success": True
        }

    except Exception as e:
        print(f"\n{C.RED}💥 Error en scraping avanzado: {e}{C.END}")
        return None

def normalizar_generos(genero_input):
    """Normaliza géneros a lista."""
    if isinstance(genero_input, list):
        return [g.strip().lower() for g in genero_input if g.strip()]
    elif isinstance(genero_input, str):
        return [g.strip().lower() for g in genero_input.split(',') if g.strip()]
    return []

def generar_id_automatico(item):
    """Genera un ID automático basado en título y año."""
    if item.get('id'):
        return item
    
    titulo = item.get('titulo', '')
    año = item.get('año', datetime.now().year)
    
    if not titulo:
        return item
    
    slug = unidecode(titulo).lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug).strip('-')
    item['id'] = f"{slug}-{año}"
    
    return item

def procesar_url_embed(url):
    """Intenta convertir una URL de video a un formato 'embed'."""
    if 'youtube.com/watch?v=' in url:
        video_id = url.split('v=')[1].split('&')[0]
        return f"https://www.youtube.com/embed/{video_id}"
    # Añadir más reglas para otros proveedores si es necesario
    return url

# --- NUEVAS FUNCIONES: BUSCAR Y ELIMINAR ---
def buscar_contenido(peliculas, editados):
    """
    Busca contenido específico y permite editarlo.
    Esta función es independiente y usa la función de edición existente.
    """
    limpiar_pantalla()
    print(f"{C.PURPLE}🔍 BUSCAR CONTENIDO{C.END}\n")
    
    if not peliculas:
        print(f"{C.YELLOW}📭 No hay contenido disponible para buscar{C.END}")
        input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")
        return
    
    # Opciones de búsqueda
    print(f"{C.CYAN}📋 MÉTODOS DE BÚSQUEDA:{C.END}")
    print(f"  1. 🔍 Por título")
    print(f"  2. 📅 Por año")
    print(f"  3. 🎭 Por género")
    print(f"  4. 🎬 Por tipo (película/serie)")
    print(f"  5. 📺 Por plataforma")
    
    metodo = input(f"\n{C.CYAN}🎲 Elige método de búsqueda (1-5): {C.END}").strip()
    
    resultados = []
    criterio = ""
    
    if metodo == '1':  # Por título
        criterio = input(f"{C.CYAN}🔍 Título a buscar: {C.END}").strip().lower()
        if criterio:
            for item in peliculas.values():
                if criterio in item.get('titulo', '').lower():
                    resultados.append(item)
    
    elif metodo == '2':  # Por año
        try:
            año_buscar = input(f"{C.CYAN}📅 Año a buscar: {C.END}").strip()
            if año_buscar:
                criterio = año_buscar
                año_buscar = int(año_buscar)
                for item in peliculas.values():
                    if item.get('año') == año_buscar:
                        resultados.append(item)
        except ValueError:
            print(f"{C.RED}❌ Año inválido{C.END}")
            time.sleep(1)
            return
    
    elif metodo == '3':  # Por género
        criterio = input(f"{C.CYAN}🎭 Género a buscar: {C.END}").strip().lower()
        if criterio:
            for item in peliculas.values():
                generos = item.get('genero', [])
                if isinstance(generos, str):
                    generos = [g.strip().lower() for g in generos.split(',')]
                elif isinstance(generos, list):
                    generos = [g.lower() for g in generos]
                
                if criterio in generos:
                    resultados.append(item)
    
    elif metodo == '4':  # Por tipo
        print(f"\n{C.CYAN}🎬 Tipo:{C.END}")
        print(f"  1. 🎬 Película")
        print(f"  2. 📺 Serie")
        tipo_opcion = input(f"{C.CYAN}🎲 Elige (1/2): {C.END}").strip()
        
        if tipo_opcion == '1':
            criterio = "pelicula"
            for item in peliculas.values():
                if item.get('tipo') == 'pelicula':
                    resultados.append(item)
        elif tipo_opcion == '2':
            criterio = "serie"
            for item in peliculas.values():
                if item.get('tipo') == 'serie':
                    resultados.append(item)
    
    elif metodo == '5':  # Por plataforma
        criterio = input(f"{C.CYAN}📺 Plataforma a buscar: {C.END}").strip().lower()
        if criterio:
            for item in peliculas.values():
                plataforma = item.get('plataforma', '').lower()
                if criterio in plataforma:
                    resultados.append(item)
    
    else:
        print(f"{C.RED}❌ Método no válido{C.END}")
        time.sleep(1)
        return
    
    if not resultados:
        print(f"\n{C.YELLOW}📭 No se encontraron resultados para: {criterio}{C.END}")
        input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")
        return
    
    # Mostrar resultados
    print(f"\n{C.GREEN}✅ Encontrados {len(resultados)} resultados:{C.END}")
    print(f"{C.GREY}{'─' * 80}{C.END}")
    
    for i, item in enumerate(resultados, 1):
        titulo = item.get('titulo', 'Sin título')[:40]
        tipo = "🎬" if item.get('tipo') == 'pelicula' else "📺"
        año = item.get('año', 'N/A')
        genero = item.get('genero', '')
        if isinstance(genero, list):
            genero = ', '.join(genero[:2])
        
        print(f"  {C.GREEN}{i}.{C.END} {tipo} {titulo:<40} {C.GREY}({año}){C.END}")
        if genero:
            print(f"     {C.MAGENTA}🎭 {genero[:50]}{C.END}")
        print(f"{C.GREY}{'─' * 80}{C.END}")
    
    # Opciones para cada resultado
    print(f"\n{C.CYAN}📋 ACCIONES DISPONIBLES:{C.END}")
    print(f"  [Número] - Editar ese elemento")
    print(f"  [V] - Ver detalles completos")
    print(f"  [0] - Volver al menú")
    
    accion = input(f"\n{C.GOLD}🎲 Elige una opción: {C.END}").strip().lower()
    
    if accion == '0':
        return
    elif accion == 'v':
        # Ver detalles completos
        try:
            idx = int(input(f"{C.CYAN}Número del elemento a ver: {C.END}").strip()) - 1
            if 0 <= idx < len(resultados):
                item = resultados[idx]
                mostrar_detalles_completos(item)
        except ValueError:
            print(f"{C.RED}❌ Número inválido{C.END}")
    else:
        try:
            idx = int(accion) - 1
            if 0 <= idx < len(resultados):
                # Usar la función de edición existente
                editar_contenido(peliculas, editados, resultados[idx])
                print(f"{C.GREEN}✅ Cambios guardados (pendientes){C.END}")
            else:
                print(f"{C.RED}❌ Número fuera de rango{C.END}")
        except ValueError:
            print(f"{C.RED}❌ Opción no válida{C.END}")
    
    input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")

def eliminar_contenido_directo(peliculas, eliminados):
    """
    Elimina contenido directamente sin pasar por el menú de selección.
    Permite buscar y eliminar en un solo paso.
    """
    limpiar_pantalla()
    print(f"{C.PURPLE}🗑️  ELIMINAR CONTENIDO{C.END}\n")
    
    if not peliculas:
        print(f"{C.YELLOW}📭 No hay contenido disponible para eliminar{C.END}")
        input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")
        return
    
    # Buscar contenido a eliminar
    criterio = input(f"{C.CYAN}🔍 Título a buscar para eliminar: {C.END}").strip().lower()
    
    if not criterio:
        print(f"{C.RED}❌ Debes ingresar un criterio de búsqueda{C.END}")
        input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")
        return
    
    # Buscar coincidencias
    coincidencias = []
    for item in peliculas.values():
        if criterio in item.get('titulo', '').lower():
            coincidencias.append(item)
    
    if not coincidencias:
        print(f"\n{C.YELLOW}📭 No se encontraron resultados para: {criterio}{C.END}")
        input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")
        return
    
    # Mostrar coincidencias
    print(f"\n{C.YELLOW}⚠️  Encontradas {len(coincidencias)} coincidencias:{C.END}")
    for i, item in enumerate(coincidencias, 1):
        titulo = item.get('titulo', 'Sin título')
        tipo = "🎬" if item.get('tipo') == 'pelicula' else "📺"
        año = item.get('año', 'N/A')
        print(f"  {C.RED}{i}.{C.END} {tipo} {titulo} {C.GREY}({año}){C.END}")
    
    # Opciones de eliminación
    print(f"\n{C.CYAN}📋 OPCIONES DE ELIMINACIÓN:{C.END}")
    print(f"  [Número] - Eliminar ese elemento específico")
    print(f"  [T] - Eliminar TODOS los resultados")
    print(f"  [0] - Cancelar")
    
    accion = input(f"\n{C.GOLD}🎲 Elige una opción: {C.END}").strip().lower()
    
    if accion == '0':
        print(f"{C.YELLOW}🚫 Eliminación cancelada{C.END}")
        return
    
    elementos_eliminados = []
    
    if accion == 't':  # Eliminar todos
        if confirmar_accion(f"¿Estás SEGURO de eliminar TODOS los {len(coincidencias)} elementos?"):
            for item in coincidencias:
                item_id = item.get('id')
                if item_id and item_id in peliculas:
                    del peliculas[item_id]
                    eliminados.append(item)
                    elementos_eliminados.append(item.get('titulo'))
            
            print(f"\n{C.GREEN}✅ Se eliminaron {len(elementos_eliminados)} elementos{C.END}")
            if elementos_eliminados:
                print(f"{C.YELLOW}📋 Elementos eliminados:{C.END}")
                for titulo in elementos_eliminados:
                    print(f"  • {titulo}")
    
    else:  # Eliminar elemento específico
        try:
            idx = int(accion) - 1
            if 0 <= idx < len(coincidencias):
                item = coincidencias[idx]
                print(f"\n{C.RED}⚠️  ATENCIÓN: Estás por eliminar{C.END}")
                print(f"{C.BOLD}Título: {item.get('titulo')}{C.END}")
                print(f"{C.BOLD}Tipo: {item.get('tipo')}{C.END}")
                print(f"{C.BOLD}Año: {item.get('año')}{C.END}")
                
                if confirmar_accion(f"\n¿Estás SEGURO de que quieres eliminar este contenido?"):
                    item_id = item.get('id')
                    if item_id and item_id in peliculas:
                        del peliculas[item_id]
                        eliminados.append(item)
                        print(f"{C.GREEN}✅ Contenido eliminado (pendiente de guardar){C.END}")
                    else:
                        print(f"{C.RED}❌ No se pudo encontrar el ID en la base de datos{C.END}")
                else:
                    print(f"{C.YELLOW}🚫 Eliminación cancelada{C.END}")
            else:
                print(f"{C.RED}❌ Número fuera de rango{C.END}")
        except ValueError:
            print(f"{C.RED}❌ Opción no válida{C.END}")
    
    input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")

def mostrar_detalles_completos(item):
    """Muestra todos los detalles de un elemento."""
    limpiar_pantalla()
    print(f"{C.PURPLE}📄 DETALLES COMPLETOS{C.END}\n")
    
    print(f"{C.BOLD}Título:{C.END} {item.get('titulo', 'N/A')}")
    print(f"{C.BOLD}Tipo:{C.END} {item.get('tipo', 'N/A')}")
    print(f"{C.BOLD}Año:{C.END} {item.get('año', 'N/A')}")
    print(f"{C.BOLD}Género:{C.END} {item.get('genero', 'N/A')}")
    print(f"{C.BOLD}Calificación:{C.END} {item.get('calificacion', 'N/A')}")
    print(f"{C.BOLD}ID:{C.END} {item.get('id', 'N/A')}")
    print(f"{C.BOLD}TMDb ID:{C.END} {item.get('tmdb_id', 'N/A')}")
    print(f"{C.BOLD}Poster:{C.END} {item.get('poster', 'N/A')[:80]}...")
    print(f"{C.BOLD}Descripción:{C.END} {item.get('descripcion', 'N/A')}")
    
    if item.get('tipo') == 'pelicula':
        print(f"{C.BOLD}Duración:{C.END} {item.get('duracion', 'N/A')}")
        print(f"{C.BOLD}Director:{C.END} {item.get('director', 'N/A')}")
        print(f"{C.BOLD}Reparto:{C.END} {', '.join(item.get('reparto', [])) if item.get('reparto') else 'N/A'}")
    else:
        print(f"{C.BOLD}Temporadas:{C.END} {item.get('temporadas', 'N/A')}")
        print(f"{C.BOLD}Episodios:{C.END} {item.get('episodios', 'N/A')}")
    
    print(f"{C.BOLD}Plataforma:{C.END} {item.get('plataforma', 'N/A')}")
    print(f"{C.BOLD}Estado:{C.END} {'💔 ROTO' if item.get('esta_roto') else '✅ OK'}")
    
    input(f"\n{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")

def gestionar_temporadas(serie):
    """Gestiona las temporadas y episodios de una serie."""
    while True:
        limpiar_pantalla()
        print(f"{C.PURPLE}📺 GESTIONANDO TEMPORADAS DE: {serie.get('titulo')}{C.END}\n")

        temporadas = serie.get('temporadas', [])
        if not temporadas:
            print(f"{C.YELLOW}📭 Esta serie no tiene temporadas.{C.END}")
        else:
            print(f"{C.CYAN}TEMPORADAS EXISTENTES:{C.END}")
            for temp in sorted(temporadas, key=lambda t: t.get('temporada', 0)):
                num_episodios = len(temp.get('episodios', []))
                print(f"  - Temporada {temp.get('temporada', '?')}: {temp.get('nombre', '')} ({num_episodios} episodios)")

        print(f"\n{C.PURPLE}📋 OPCIONES:{C.END}")
        print("  1. ➕ Añadir nueva temporada")
        print("  2. ✏️  Editar/Ver temporada existente")
        print("  3. 🗑️  Eliminar temporada")
        print("\n  0. ↩️  Volver al editor principal")

        opcion = input(f"\n{C.GOLD}🎲 Elige: {C.END}").strip()

        if opcion == '0':
            break
        elif opcion == '1':
            # Añadir temporada
            try:
                num_temp = int(input(f"{C.CYAN}🔢 Número de la nueva temporada: {C.END}").strip())
                if any(t.get('temporada') == num_temp for t in temporadas):
                    print(f"{C.RED}❌ La temporada {num_temp} ya existe.{C.END}")
                    time.sleep(2)
                    continue

                nueva_temporada = {
                    'temporada': num_temp,
                    'nombre': input(f"{C.CYAN}📝 Nombre de la temporada (opcional): {C.END}").strip() or f"Temporada {num_temp}",
                    'episodios': []
                }
                temporadas.append(nueva_temporada)
                print(f"{C.GREEN}✅ Temporada {num_temp} añadida. Ahora puedes añadirle episodios.{C.END}")
                gestionar_episodios(nueva_temporada)
            except ValueError:
                print(f"{C.RED}❌ Número de temporada inválido.{C.END}")
                time.sleep(2)

        elif opcion == '2':
            # Editar/Ver temporada
            try:
                num_temp = int(input(f"{C.CYAN}🔢 Número de temporada a editar/ver: {C.END}").strip())
                temporada_a_editar = next((t for t in temporadas if t.get('temporada') == num_temp), None)
                if temporada_a_editar:
                    gestionar_episodios(temporada_a_editar)
                else:
                    print(f"{C.RED}❌ No se encontró la temporada {num_temp}.{C.END}")
                    time.sleep(2)
            except ValueError:
                print(f"{C.RED}❌ Número de temporada inválido.{C.END}")
                time.sleep(2)

        elif opcion == '3':
            # Eliminar temporada
            try:
                num_temp = int(input(f"{C.CYAN}🔢 Número de temporada a eliminar: {C.END}").strip())
                temporada_a_eliminar = next((t for t in temporadas if t.get('temporada') == num_temp), None)
                if temporada_a_eliminar:
                    if confirmar_accion(f"¿Seguro que quieres eliminar la Temporada {num_temp} y todos sus episodios?"):
                        temporadas.remove(temporada_a_eliminar)
                        print(f"{C.GREEN}✅ Temporada {num_temp} eliminada.{C.END}")
                        time.sleep(2)
                else:
                    print(f"{C.RED}❌ No se encontró la temporada {num_temp}.{C.END}")
                    time.sleep(2)
            except ValueError:
                print(f"{C.RED}❌ Número de temporada inválido.{C.END}")
                time.sleep(2)

def gestionar_episodios(temporada):
    """Gestiona los episodios de una temporada específica."""
    while True:
        limpiar_pantalla()
        print(f"{C.PURPLE}🎞️  GESTIONANDO EPISODIOS DE: Temporada {temporada.get('temporada')}{C.END}\n")

        episodios = temporada.get('episodios', [])
        if not episodios:
            print(f"{C.YELLOW}📭 No hay episodios en esta temporada.{C.END}")
        else:
            for ep in sorted(episodios, key=lambda e: e.get('episodio', 0)):
                print(f"  - Ep {ep.get('episodio', '?')}: {ep.get('titulo', 'Sin título')}")

        print("\n1. ➕ Añadir episodio\n2. ✏️  Editar episodio\n3. 🗑️  Eliminar episodio\n0. ↩️  Volver")
        opcion = input(f"\n{C.GOLD}🎲 Elige: {C.END}").strip()

        if opcion == '0':
            break
        elif opcion == '1':
            try:
                num_ep = int(input(f"{C.CYAN}Episodio #{len(episodios) + 1}: {C.END}").strip())
                nuevo_episodio = {
                    'episodio': num_ep,
                    'titulo': input(f"{C.CYAN}Título: {C.END}").strip() or f"Episodio {num_ep}",
                    'url': procesar_url_embed(input(f"{C.CYAN}URL: {C.END}").strip()),
                    'calidad': input(f"{C.CYAN}Calidad [HD]: {C.END}").strip() or "HD",
                    'visto': False
                }
                episodios.append(nuevo_episodio)
            except ValueError:
                print(f"{C.RED}❌ Número de episodio inválido.{C.END}")
        elif opcion == '2':
            # Editar episodio
            if not episodios:
                print(f"{C.YELLOW}No hay episodios para editar.{C.END}")
                time.sleep(2)
                continue
            try:
                num_ep = int(input(f"{C.CYAN}Número del episodio a editar: {C.END}").strip())
                episodio_a_editar = next((ep for ep in episodios if ep.get('episodio') == num_ep), None)

                if episodio_a_editar:
                    print(f"\n{C.YELLOW}✏️  Editando Episodio {num_ep}{C.END}")
                    print(f"{C.GREY}   Título actual: {episodio_a_editar.get('titulo')}{C.END}")
                    nuevo_titulo = input(f"{C.CYAN}   Nuevo título (deja en blanco para no cambiar): {C.END}").strip()
                    if nuevo_titulo:
                        episodio_a_editar['titulo'] = nuevo_titulo

                    print(f"{C.GREY}   URL actual: {episodio_a_editar.get('url')}{C.END}")
                    nueva_url = input(f"{C.CYAN}   Nueva URL (deja en blanco para no cambiar): {C.END}").strip()
                    if nueva_url:
                        episodio_a_editar['url'] = procesar_url_embed(nueva_url)

                    print(f"{C.GREY}   Calidad actual: {episodio_a_editar.get('calidad')}{C.END}")
                    nueva_calidad = input(f"{C.CYAN}   Nueva calidad (deja en blanco para no cambiar): {C.END}").strip()
                    if nueva_calidad:
                        episodio_a_editar['calidad'] = nueva_calidad

                    print(f"\n{C.GREEN}✅ Episodio actualizado.{C.END}")
                    time.sleep(2)
                else:
                    print(f"{C.RED}❌ No se encontró el episodio {num_ep}.{C.END}")
                    time.sleep(2)
            except ValueError:
                print(f"{C.RED}❌ Número de episodio inválido.{C.END}")
                time.sleep(2)

        elif opcion == '3':
            # Eliminar episodio
            if not episodios:
                print(f"{C.YELLOW}No hay episodios para eliminar.{C.END}")
                time.sleep(2)
                continue
            try:
                num_ep = int(input(f"{C.CYAN}Número del episodio a eliminar: {C.END}").strip())
                episodio_a_eliminar = next((ep for ep in episodios if ep.get('episodio') == num_ep), None)

                if episodio_a_eliminar:
                    if confirmar_accion(f"¿Seguro que quieres eliminar el Episodio {num_ep}: '{episodio_a_eliminar.get('titulo')}'?"):
                        episodios.remove(episodio_a_eliminar)
                        print(f"{C.GREEN}✅ Episodio eliminado.{C.END}")
                        time.sleep(2)
                else:
                    print(f"{C.RED}❌ No se encontró el episodio {num_ep}.{C.END}")
                    time.sleep(2)
            except ValueError:
                print(f"{C.RED}❌ Número de episodio inválido.{C.END}")
                time.sleep(2)


# --- Funciones de Menú ---
def mostrar_menu_principal(peliculas, proximamente, cambios_pendientes=False):
    mostrar_banner()
    
    # Estadísticas
    total = len(peliculas)
    num_peliculas = sum(1 for p in peliculas.values() if p.get('tipo') == 'pelicula')
    num_series = total - num_peliculas
    
    print(f"\n{C.CYAN}📊 RESUMEN:{C.END}")
    print(f"  Películas: {C.GOLD}{num_peliculas}{C.END} | Series: {C.GOLD}{num_series}{C.END} | Próximamente: {C.GOLD}{len(proximamente)}{C.END}")
    
    if cambios_pendientes:
        print(f"\n{C.BLINK}{C.YELLOW}⚠️  ¡TIENES CAMBIOS PENDIENTES POR GUARDAR!{C.END}")
    
    mostrar_separador(C.CYAN, 50)
    
    print(f"\n{C.BOLD}{C.PURPLE}📁 GESTIÓN DE CONTENIDO:{C.END}")
    print(f"  1. ➕ Añadir Contenido")
    print(f"  2. ✏️  Editar Contenido")
    print(f"  3. 🗑️  Eliminar Contenido")
    print(f"  4. 🔍 Buscar Contenido (NUEVO)")  # Nueva opción
    print(f"  5. 🗑️  Eliminar Directo (NUEVO)")  # Nueva opción
    print(f"  6. 🔍 Revisar Fuentes")
    print(f"  7. 🚀 Gestionar 'Próximamente'")
    print(f"  8. 📝 Gestionar Borradores")
    
    print(f"\n{C.BOLD}{C.PURPLE}🛠️  HERRAMIENTAS:{C.END}")
    print(f"  9. ⚙️  Control Central")
    print(f"  10. 📊 Ver Reportes")
    print(f"  11. 💔 Marcar Contenido Roto")
    print(f"  12. 📅 Ver Lanzamientos")
    print(f"  13. 📋 Tabla de Contenido")
    print(f"  14. 🛠️  Herramientas Avanzadas")
    print(f"  15. 📢 Enviar Notificación")
    print(f"  16. 🚀 Búsqueda Rápida TMDb")
    
    print(f"\n{C.BOLD}{C.PURPLE}⚡ ACCIONES:{C.END}")
    print(f"  {C.GREEN}S{C.END}. 💾 Guardar Cambios")
    print(f"  {C.RED}X{C.END}. ❌ Salir sin Guardar")
    print(f"  {C.YELLOW}C{C.END}. 🎪 Campaña Próximamente")
    print(f"  {C.ORANGE}M{C.END}. 🔧 Modo Mantenimiento")
    
    mostrar_separador(C.CYAN, 50)
    
    while True:
        opcion = input(f"\n{C.GOLD}🎲 Elige una opción: {C.END}").lower()
        
        if opcion in ['s', 'x', 'c', 'm']:
            return opcion
        
        try:
            opcion_num = int(opcion)
            if 1 <= opcion_num <= 16:
                return opcion_num
        except ValueError:
            pass
        
        print(f"{C.RED}❌ Opción no válida. Intenta de nuevo.{C.END}")

def seleccionar_categoria():
    """Permite seleccionar una o más categorías."""
    print(f"\n{C.PURPLE}📂 CATEGORÍAS DISPONIBLES:{C.END}")
    for i, cat in enumerate(CATEGORIAS_DISPONIBLES, 1):
        print(f"  {i}. {cat.replace('-', ' ').title()}")
    
    print(f"\n{C.YELLOW}💡 Puedes seleccionar múltiples separando con comas (ej: 1,3,5){C.END}")
    
    while True:
        seleccion = input(f"{C.CYAN}🎲 Selecciona categoría(s) (0 para omitir): {C.END}").strip()
        
        if seleccion == '0':
            return []
        
        try:
            indices = [int(i.strip()) - 1 for i in seleccion.split(',')]
            categorias = []
            
            for idx in indices:
                if 0 <= idx < len(CATEGORIAS_DISPONIBLES):
                    categorias.append(CATEGORIAS_DISPONIBLES[idx])
            
            if categorias:
                return categorias
            else:
                print(f"{C.RED}❌ No seleccionaste categorías válidas{C.END}")
        
        except ValueError:
            print(f"{C.RED}❌ Formato incorrecto. Usa números separados por comas.{C.END}")

def seleccionar_contenido(peliculas, accion="seleccionar"):
    """Permite seleccionar contenido con paginación."""
    if not peliculas:
        print(f"{C.YELLOW}📭 No hay contenido disponible{C.END}")
        return None
    
    items = list(peliculas.values())
    items.sort(key=lambda x: x.get('titulo', '').lower())
    
    pagina = 0
    por_pagina = 10
    
    while True:
        limpiar_pantalla()
        print(f"{C.PURPLE}--- {accion.upper()} CONTENIDO ---{C.END}\n")
        
        inicio = pagina * por_pagina
        fin = inicio + por_pagina
        pagina_items = items[inicio:fin]
        
        if not pagina_items:
            print(f"{C.YELLOW}📭 No hay más contenido{C.END}")
            return None
        
        for i, item in enumerate(pagina_items, inicio + 1):
            titulo = item.get('titulo', 'Sin título')[:40]
            tipo = "🎬" if item.get('tipo') == 'pelicula' else "📺"
            año = item.get('año', 'N/A')
            estado = "💔" if item.get('esta_roto') else "✅"
            
            print(f"  {C.GREEN}{i:2}.{C.END} {tipo} {titulo:<40} {C.GREY}({año}){C.END} {estado}")
        
        total_paginas = (len(items) + por_pagina - 1) // por_pagina
        print(f"\n{C.CYAN}Página {pagina + 1} de {total_paginas}{C.END}")
        print(f"{C.YELLOW}[S] Siguiente | [A] Anterior | [Número] Seleccionar | [0] Cancelar{C.END}")
        
        opcion = input(f"\n{C.GOLD}🎲 Elige: {C.END}").lower()
        
        if opcion == 's':
            if (pagina + 1) < total_paginas:
                pagina += 1
        elif opcion == 'a':
            if pagina > 0:
                pagina -= 1
        elif opcion == '0':
            return None
        else:
            try:
                idx = int(opcion) - 1
                if 0 <= idx < len(items):
                    return items[idx]
                else:
                    print(f"{C.RED}❌ Número fuera de rango{C.END}")
                    time.sleep(1)
            except ValueError:
                print(f"{C.RED}❌ Opción no válida{C.END}")
                time.sleep(1)
                
def anadir_contenido(peliculas, proximamente):
    """Añade nuevo contenido con diferentes métodos."""
    limpiar_pantalla()
    print(f"{C.PURPLE}➕ AÑADIR NUEVO CONTENIDO{C.END}\n")
    
    # Seleccionar tipo
    print(f"  1. 🎬 Película")
    print(f"  2. 📺 Serie")
    
    tipo_opcion = input(f"\n{C.CYAN}🎭 Tipo de contenido (1/2): {C.END}").strip()
    tipo = CONTENT_TYPES.get(tipo_opcion, 'pelicula')
    
    # Método de adición
    print(f"\n{C.PURPLE}📋 MÉTODO DE ADICIÓN:{C.END}")
    print(f"  1. 🚀 Búsqueda automática con TMDb (SUPER MEJORADO)")
    print(f"  2. 🌐 Extraer desde URL")
    print(f"  3. ✍️  Añadir manualmente")
    print(f"  4. 🔍 Buscar por ID de TMDb")
    print(f"  5. ⚡ Búsqueda rápida (sin TMDb)")
    
    metodo = input(f"\n{C.CYAN}🎲 Elige método (1-5): {C.END}").strip()
    
    datos_extras = {}
    
    if metodo == '1':
        # Búsqueda SUPER MEJORADA en TMDb
        titulo_busqueda = input(f"\n{C.CYAN}🔍 Título a buscar: {C.END}").strip()
        if titulo_busqueda:
            datos_extras = buscar_en_tmdb_super_mejorado(titulo_busqueda, tipo) or {}
            if datos_extras:
                print(f"\n{C.GREEN}✅ Datos obtenidos exitosamente!{C.END}")
    
    elif metodo == '4':
        # Buscar por ID de TMDb
        tmdb_id = input(f"\n{C.CYAN}🔢 ID de TMDb: {C.END}").strip()
        if tmdb_id and tmdb_id.isdigit():
            datos_extras = obtener_detalles_tmdb_super_mejorado(int(tmdb_id), tipo) or {}
    
    elif metodo == '5':
        # Búsqueda rápida sin TMDb
        print(f"\n{C.CYAN}⚡ BÚSQUEDA RÁPIDA (Sin TMDb){C.END}")
        datos_extras = {
            'titulo': input(f"{C.CYAN}📝 Título: {C.END}").strip(),
            'descripcion': input(f"{C.CYAN}📄 Descripción: {C.END}").strip() or "Sin descripción",
            'año': input(f"{C.CYAN}📅 Año: {C.END}").strip() or str(datetime.now().year),
            'genero': input(f"{C.CYAN}🎭 Géneros (separados por coma): {C.END}").strip() or "General",
            'poster': input(f"{C.CYAN}🖼️  URL del póster: {C.END}").strip() or "https://via.placeholder.com/500x750",
            'auto_generado': True
        }
    
    elif metodo == '2' and url_extractor:
        # Extraer desde URL
        url = input(f"\n{C.CYAN}🔗 URL: {C.END}").strip()
        if url:
            try:
                resultado = url_extractor.extract_url_info(url)
                if resultado.get('success'):
                    datos_extras = {
                        'titulo': resultado.get('title', ''),
                        'iframe_url': resultado.get('sources', [])[0] if resultado.get('sources') else ''
                    }
                resultado = scrape_url_avanzado(url)
                if resultado and resultado.get('success'):
                    datos_extras = resultado
                    print(f"{C.GREEN}✅ ¡Datos extraídos con éxito!{C.END}")
                else:
                    print(f"{C.YELLOW}⚠️  El scraping avanzado falló, se procederá con el método manual.{C.END}")
                    datos_extras = {}
            except Exception as e:
                print(f"{C.RED}❌ Error extrayendo URL: {e}{C.END}")
                datos_extras = {}
    
    # Mostrar resumen si tenemos datos
    if datos_extras and metodo in ['1', '4'] and datos_extras.get('success'):
        print(f"\n{C.GREEN}📋 RESUMEN DE DATOS OBTENIDOS:{C.END}")
        print(f"  {C.BOLD}Título:{C.END} {datos_extras.get('titulo')}")
        print(f"  {C.BOLD}Año:{C.END} {datos_extras.get('año')}")
        print(f"  {C.BOLD}Géneros:{C.END} {datos_extras.get('genero')}")
        print(f"  {C.BOLD}Calificación:{C.END} {datos_extras.get('calificacion', 0)}/10")
        
        if datos_extras.get('auto_generado'):
            print(f"  {C.YELLOW}⚠️  Datos auto-generados (no encontrados en TMDb){C.END}")
        
        continuar = input(f"\n{C.YELLOW}¿Usar estos datos? (s/n): {C.END}").strip().lower()
        if continuar not in ['s', 'si', 'y', 'yes']:
            datos_extras = {}
    
    # Solicitar datos básicos
    print(f"\n{C.PURPLE}📝 INFORMACIÓN BÁSICA:{C.END}")
    
    titulo = input(f"{C.CYAN}📝 Título ({datos_extras.get('titulo', '')}): {C.END}").strip()
    if not titulo:
        titulo = datos_extras.get('titulo', '')
        if not titulo:
            print(f"{C.RED}❌ El título es obligatorio{C.END}")
            return None
    
    # Categorías
    categorias = seleccionar_categoria()
    
    # Plataforma
    print(f"\n{C.PURPLE}🖥️  PLATAFORMA:{C.END}")
    for i, plat in enumerate(PLATAFORMAS_DISPONIBLES, 1):
        print(f"  {i}. {plat.title()}")
    
    plataforma_idx = input(f"\n{C.CYAN}🎲 Plataforma (0 para omitir): {C.END}").strip()
    plataforma = None
    
    try:
        if plataforma_idx != '0':
            idx = int(plataforma_idx) - 1
            if 0 <= idx < len(PLATAFORMAS_DISPONIBLES):
                plataforma = PLATAFORMAS_DISPONIBLES[idx]
    except ValueError:
        pass
    
    # Crear objeto de contenido
    año_valor = datos_extras.get('año', datetime.now().year)
    try:
        año_valor = int(año_valor)
    except:
        año_valor = datetime.now().year
    
    nuevo_contenido = {
        'tipo': tipo,
        'titulo': titulo,
        'titulo_original': datos_extras.get('titulo_original', ''),
        'poster': datos_extras.get('poster', '') or input(f"{C.CYAN}🖼️  URL del póster: {C.END}").strip(),
        'backdrop': datos_extras.get('backdrop', ''),
        'descripcion': datos_extras.get('descripcion', '') or input(f"{C.CYAN}📄 Descripción: {C.END}").strip(),
        'año': año_valor,
        'categoria': categorias,
        'genero': normalizar_generos(datos_extras.get('genero', '') or input(f"{C.CYAN}🎭 Géneros (separados por coma): {C.END}").strip()),
        'generos_lista': datos_extras.get('generos_lista', []),
        'director': datos_extras.get('director', '') or input(f"{C.CYAN}🎬 Director/Creador: {C.END}").strip(),
        'reparto': datos_extras.get('reparto', []) or [a.strip() for a in input(f"{C.CYAN}👥 Reparto (separados por coma): {C.END}").split(',') if a.strip()],
        'calificacion': float(datos_extras.get('calificacion', 0) or input(f"{C.CYAN}⭐ Calificación (0-10): {C.END}").strip() or "0"),
        'votos': datos_extras.get('votos', 0),
        'idioma': input(f"{C.CYAN}🗣️  Idioma: {C.END}").strip() or datos_extras.get('idioma', 'Español'),
        'calidad': input(f"{C.CYAN}📺 Calidad: {C.END}").strip() or "HD",
        'favorito': False,
        'esta_roto': False,
        'addedDate': datetime.now().isoformat(),
        'tmdb_id': datos_extras.get('tmdb_id', ''),
        'popularidad': datos_extras.get('popularidad', 0),
        'tagline': datos_extras.get('tagline', ''),
        'trailer': datos_extras.get('trailer', ''),
        'success': True
    }
    
    # Añadir campos específicos según tipo
    if tipo == 'pelicula':
        nuevo_contenido['duracion'] = datos_extras.get('duracion', '') or input(f"{C.CYAN}⏱️  Duración (min): {C.END}").strip()
        if datos_extras.get('presupuesto'):
            nuevo_contenido['presupuesto'] = datos_extras.get('presupuesto')
        if datos_extras.get('ingresos'):
            nuevo_contenido['ingresos'] = datos_extras.get('ingresos')
    else:
        nuevo_contenido['temporadas'] = datos_extras.get('temporadas', 0)
        nuevo_contenido['episodios'] = datos_extras.get('episodios', 0)
        nuevo_contenido['tipo_serie'] = datos_extras.get('tipo_serie', 'Serie')
        if datos_extras.get('ultima_emision'):
            nuevo_contenido['ultima_emision'] = datos_extras.get('ultima_emision')
    
    if plataforma:
        nuevo_contenido['plataforma'] = plataforma
    
    # Fuentes de video según tipo
    if tipo == 'pelicula':
        nuevo_contenido['fuentes'] = []
        
        if confirmar_accion("¿Añadir fuente de video ahora?"):
            while True:
                print(f"\n{C.CYAN}🎥 AÑADIENDO FUENTE DE VIDEO{C.END}")
                idioma = input(f"{C.CYAN}🗣️  Idioma de la fuente: {C.END}").strip() or "Español"
                url = input(f"{C.CYAN}🔗 URL del video: {C.END}").strip()
                
                if url:
                    calidad = input(f"{C.CYAN}📺 Calidad (HD, 720p, 1080p, 4K): {C.END}").strip() or "HD"
                    tipo_fuente = input(f"{C.CYAN}🎬 Tipo (embed, directa, stream): {C.END}").strip() or "embed"
                    
                    nuevo_contenido['fuentes'].append({
                        'idioma': idioma,
                        'url': procesar_url_embed(url),
                        'calidad': calidad,
                        'tipo': tipo_fuente,
                        'activa': True
                    })
                    print(f"{C.GREEN}✅ Fuente añadida{C.END}")
                
                if not confirmar_accion("¿Añadir otra fuente?"):
                    break
        else:
            # Preguntar si quiere usar el trailer como fuente
            if nuevo_contenido.get('trailer'):
                if confirmar_accion("¿Usar el trailer como fuente de video?"):
                    nuevo_contenido['fuentes'].append({
                        'idioma': 'Original',
                        'url': nuevo_contenido['trailer'],
                        'calidad': 'HD',
                        'tipo': 'trailer',
                        'activa': True
                    })
    
    else:  # Serie
        nuevo_contenido['temporadas'] = []
        
        if confirmar_accion("¿Añadir temporadas ahora?"):
            while True:
                try:
                    print(f"\n{C.CYAN}📺 AÑADIENDO TEMPORADA{C.END}")
                    num_temp = int(input(f"{C.CYAN}🔢 Número de temporada: {C.END}").strip())
                    
                    temporada = {
                        'temporada': num_temp,
                        'nombre': input(f"{C.CYAN}   Nombre de la temporada: {C.END}").strip() or f"Temporada {num_temp}",
                        'episodios': []
                    }
                    
                    # Añadir episodios
                    print(f"{C.YELLOW}   Añadiendo episodios a Temporada {num_temp}{C.END}")
                    while True:
                        try:
                            num_ep = int(input(f"{C.CYAN}   Episodio #{len(temporada['episodios']) + 1}: {C.END}").strip())
                            titulo_ep = input(f"{C.CYAN}   Título del episodio: {C.END}").strip() or f"Episodio {num_ep}"
                            url_ep = input(f"{C.CYAN}   URL del episodio: {C.END}").strip()
                            calidad_ep = input(f"{C.CYAN}   Calidad: {C.END}").strip() or "HD"
                            
                            if url_ep:
                                temporada['episodios'].append({
                                    'episodio': num_ep,
                                    'titulo': titulo_ep,
                                    'url': procesar_url_embed(url_ep),
                                    'calidad': calidad_ep,
                                    'visto': False
                                })
                                print(f"{C.GREEN}   ✅ Episodio {num_ep} añadido{C.END}")
                            
                            if not confirmar_accion("   ¿Añadir otro episodio a esta temporada?"):
                                break
                        
                        except ValueError:
                            print(f"{C.RED}❌ Número inválido{C.END}")
                    
                    if temporada['episodios']:
                        nuevo_contenido['temporadas'].append(temporada)
                        print(f"{C.GREEN}✅ Temporada {num_temp} añadida con {len(temporada['episodios'])} episodios{C.END}")
                    
                    if not confirmar_accion("¿Añadir otra temporada?"):
                        break
                
                except ValueError:
                    print(f"{C.RED}❌ Número inválido{C.END}")
    
    # Generar ID
    nuevo_contenido = generar_id_automatico(nuevo_contenido)
    
    # Verificar si ya existe
    for existente in peliculas.values():
        if existente.get('titulo', '').lower() == titulo.lower():
            print(f"{C.YELLOW}⚠️  Ya existe contenido con este título{C.END}")
            if confirmar_accion("¿Editar el existente en lugar de crear uno nuevo?"):
                return ('EDITAR', existente)
            elif not confirmar_accion("¿Crear uno nuevo de todos modos?"):
                return None
    
    print(f"\n{C.GREEN}✅ Contenido creado exitosamente{C.END}")
    print(f"{C.CYAN}ID generado: {nuevo_contenido.get('id')}{C.END}")
    
    if nuevo_contenido.get('tmdb_id'):
        print(f"{C.CYAN}TMDb ID: {nuevo_contenido.get('tmdb_id')}{C.END}")
    
    if nuevo_contenido.get('auto_generado'):
        print(f"{C.YELLOW}⚠️  Nota: Este contenido usa datos auto-generados{C.END}")
    
    return ('AÑADIR', nuevo_contenido)

def editar_contenido(peliculas, editados, item_a_editar=None):
    """Edita un contenido existente."""
    if not item_a_editar:
        item_a_editar = seleccionar_contenido(peliculas, "editar")
        if not item_a_editar:
            return
    
    copia_original = copy.deepcopy(item_a_editar)
    
    while True:
        limpiar_pantalla()
        print(f"{C.PURPLE}✏️  EDITANDO: {item_a_editar.get('titulo', '')}{C.END}\n")
        
        # Mostrar campos editables
        campos = list(item_a_editar.keys())
        campos.sort()
        
        for i, campo in enumerate(campos, 1):
            valor = item_a_editar[campo]
            
            if isinstance(valor, list):
                if valor:
                    display = f"[{len(valor)} items]"
                else:
                    display = "[]"
            elif isinstance(valor, dict):
                display = "{...}"
            elif isinstance(valor, str) and len(valor) > 30:
                display = valor[:27] + "..."
            else:
                display = str(valor)
            
            print(f"  {C.GREEN}{i:2}.{C.END} {campo:<20}: {display}")
        
        print(f"\n  {C.YELLOW}0. Finalizar edición{C.END}")
        print(f"  {C.CYAN}R. Recargar desde TMDb (si tiene ID){C.END}")
        
        try:
            seleccion = input(f"\n{C.CYAN}🎲 Campo a editar: {C.END}").strip().lower()
            
            if seleccion == '0':
                break
            elif seleccion == 'r' and item_a_editar.get('tmdb_id'):
                # Recargar desde TMDb
                if confirmar_accion("¿Recargar datos desde TMDb? (Esto sobrescribirá los datos actuales)"):
                    tipo = item_a_editar.get('tipo', 'pelicula')
                    nuevos_datos = obtener_detalles_tmdb_super_mejorado(item_a_editar['tmdb_id'], tipo)
                    if nuevos_datos:
                        # Mantener algunos campos locales
                        campos_locales = ['categoria', 'plataforma', 'fuentes', 'temporadas', 'esta_roto', 'favorito']
                        for campo_local in campos_locales:
                            if campo_local in item_a_editar:
                                nuevos_datos[campo_local] = item_a_editar[campo_local]
                        
                        # Actualizar el item
                        item_a_editar.clear()
                        item_a_editar.update(nuevos_datos)
                        print(f"{C.GREEN}✅ Datos recargados desde TMDb{C.END}")
                        time.sleep(2)
                continue
            
            seleccion_num = int(seleccion)
            if 1 <= seleccion_num <= len(campos):
                campo_editar = campos[seleccion_num - 1]
                valor_actual = item_a_editar[campo_editar]

                # --- MANEJO ESPECIAL PARA TEMPORADAS ---
                if campo_editar == 'temporadas' and item_a_editar.get('tipo') == 'serie':
                    gestionar_temporadas(item_a_editar)
                    continue # Volver al menú de edición principal
                # --- FIN MANEJO ESPECIAL ---
                
                print(f"\n{C.YELLOW}Editando '{campo_editar}'{C.END}")
                print(f"{C.GREY}Valor actual: {valor_actual}{C.END}")
                
                nuevo_valor = input(f"{C.CYAN}Nuevo valor: {C.END}").strip()
                
                if nuevo_valor:
                    # Intentar convertir al tipo original
                    if isinstance(valor_actual, int):
                        try:
                            item_a_editar[campo_editar] = int(nuevo_valor)
                        except ValueError:
                            print(f"{C.RED}❌ Debe ser un número entero{C.END}")
                            time.sleep(2)
                            continue
                    elif isinstance(valor_actual, float):
                        try:
                            item_a_editar[campo_editar] = float(nuevo_valor)
                        except ValueError:
                            print(f"{C.RED}❌ Debe ser un número{C.END}")
                            time.sleep(2)
                            continue
                    elif isinstance(valor_actual, list):
                        # Para listas, asumir valores separados por comas
                        item_a_editar[campo_editar] = [v.strip() for v in nuevo_valor.split(',') if v.strip()]
                    elif isinstance(valor_actual, bool):
                        item_a_editar[campo_editar] = nuevo_valor.lower() in ['true', '1', 'si', 's', 'yes', 'y']
                    else:
                        item_a_editar[campo_editar] = nuevo_valor
                    
                    print(f"{C.GREEN}✅ Campo actualizado{C.END}")
                    time.sleep(1)
        
        except ValueError:
            print(f"{C.RED}❌ Selección inválida{C.END}")
            time.sleep(1)
    
    # Verificar si hubo cambios
    if item_a_editar != copia_original:
        if item_a_editar not in editados:
            editados.append(item_a_editar)
        print(f"{C.GREEN}✅ Cambios guardados (pendientes){C.END}")
    else:
        print(f"{C.YELLOW}ℹ️  No hubo cambios{C.END}")
    
    input(f"\n{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")

def eliminar_contenido(peliculas, eliminados):
    """Elimina contenido."""
    item = seleccionar_contenido(peliculas, "eliminar")
    
    if not item:
        return
    
    print(f"\n{C.RED}⚠️  ATENCIÓN: Estás por eliminar{C.END}")
    print(f"{C.BOLD}Título: {item.get('titulo')}{C.END}")
    print(f"{C.BOLD}Tipo: {item.get('tipo')}{C.END}")
    print(f"{C.BOLD}Año: {item.get('año')}{C.END}")
    
    if confirmar_accion(f"\n¿Estás SEGURO de que quieres eliminar este contenido?"):
        item_id = item.get('id')
        if item_id and item_id in peliculas:
            del peliculas[item_id]
            eliminados.append(item)
            print(f"{C.GREEN}✅ Contenido eliminado (pendiente de guardar){C.END}")
        else:
            print(f"{C.RED}❌ No se pudo encontrar el ID en la base de datos{C.END}")
    else:
        print(f"{C.YELLOW}🚫 Eliminación cancelada{C.END}")
    
    input(f"\n{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")

# --- Funciones de gestión ---
def cargar_proximamente():
    if not os.path.exists(PROXIMAMENTE_FILE):
        return []
    
    try:
        with open(PROXIMAMENTE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def guardar_proximamente(proximamente):
    try:
        with open(PROXIMAMENTE_FILE, 'w', encoding='utf-8') as f:
            json.dump(proximamente, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"{C.RED}❌ Error guardando próximamente: {e}{C.END}")
        return False

def cargar_base_datos():
    if not os.path.exists(BASE_DATOS_FILE):
        return []
    
    try:
        with open(BASE_DATOS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def guardar_base_datos(base_datos):
    try:
        with open(BASE_DATOS_FILE, 'w', encoding='utf-8') as f:
            json.dump(base_datos, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"{C.RED}❌ Error guardando base de datos: {e}{C.END}")
        return False

# --- Funciones principales del sistema ---
def mostrar_control_central(peliculas, editados):
    """Panel de control central."""
    while True:
        limpiar_pantalla()
        print(f"{C.PURPLE}⚙️  CONTROL CENTRAL{C.END}\n")
        
        # Estadísticas
        total = len(peliculas)
        pelis = sum(1 for p in peliculas.values() if p.get('tipo') == 'pelicula')
        series = total - pelis
        rotos = sum(1 for p in peliculas.values() if p.get('esta_roto'))
        con_tmdb = sum(1 for p in peliculas.values() if p.get('tmdb_id'))
        
        print(f"{C.CYAN}📊 ESTADÍSTICAS:{C.END}")
        print(f"  Total: {C.GOLD}{total}{C.END}")
        print(f"  Películas: {C.GOLD}{pelis}{C.END}")
        print(f"  Series: {C.GOLD}{series}{C.END}")
        print(f"  Con TMDb ID: {C.CYAN}{con_tmdb}{C.END}")
        print(f"  Contenido roto: {C.RED if rotos > 0 else C.GREEN}{rotos}{C.END}")
        
        # Verificar problemas comunes
        print(f"\n{C.CYAN}🔍 VERIFICACIÓN RÁPIDA:{C.END}")
        
        problemas = []
        for item in peliculas.values():
            if not item.get('poster'):
                problemas.append(f"{item.get('titulo')} - Sin póster")
            if item.get('tipo') == 'pelicula' and not item.get('fuentes'):
                problemas.append(f"{item.get('titulo')} - Sin fuentes de video")
            if item.get('tipo') == 'serie' and not item.get('temporadas'):
                problemas.append(f"{item.get('titulo')} - Sin temporadas")
        
        if problemas:
            print(f"  {C.RED}⚠️  Se encontraron {len(problemas)} problemas{C.END}")
            for p in problemas[:3]:  # Mostrar solo primeros 3
                print(f"    • {p}")
            if len(problemas) > 3:
                print(f"    ... y {len(problemas) - 3} más")
        else:
            print(f"  {C.GREEN}✅ Todo en orden{C.END}")
        
        # Opciones
        print(f"\n{C.PURPLE}🛠️  HERRAMIENTAS:{C.END}")
        print(f"  1. 🔄 Generar IDs faltantes")
        print(f"  2. 🎭 Corregir formatos de géneros")
        print(f"  3. 📊 Ver tabla completa")
        print(f"  4. 🧹 Limpiar datos inválidos")
        print(f"  5. 🔍 Buscar sin TMDb ID")
        print(f"\n  0. ↩️  Volver")
        
        opcion = input(f"\n{C.GOLD}🎲 Elige: {C.END}").strip()
        
        if opcion == '0':
            break
        elif opcion == '1':
            generar_ids_faltantes(peliculas, editados)
        elif opcion == '2':
            corregir_generos(peliculas, editados)
        elif opcion == '3':
            mostrar_tabla_completa(peliculas)
        elif opcion == '4':
            limpiar_datos_invalidos(peliculas, editados)
        elif opcion == '5':
            buscar_sin_tmdb_id(peliculas, editados)
        else:
            print(f"{C.RED}❌ Opción inválida{C.END}")
            time.sleep(1)

def generar_ids_faltantes(peliculas, editados):
    """Genera IDs para contenido que no los tenga."""
    actualizados = 0
    
    for key, item in list(peliculas.items()):
        if not item.get('id'):
            nuevo_item = generar_id_automatico(item)
            if nuevo_item.get('id') != key:
                # Actualizar clave en diccionario
                peliculas[nuevo_item['id']] = nuevo_item
                if key in peliculas:
                    del peliculas[key]
                
                if nuevo_item not in editados:
                    editados.append(nuevo_item)
                
                actualizados += 1
    
    print(f"{C.GREEN}✅ Se actualizaron {actualizados} IDs{C.END}")
    input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")

def corregir_generos(peliculas, editados):
    """Corrige formato de géneros."""
    actualizados = 0
    
    for item in peliculas.values():
        generos = item.get('genero', [])
        
        if isinstance(generos, str):
            item['genero'] = normalizar_generos(generos)
            if item not in editados:
                editados.append(item)
            actualizados += 1
    
    print(f"{C.GREEN}✅ Se corrigieron {actualizados} registros{C.END}")
    input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")

def mostrar_tabla_completa(peliculas):
    """Muestra tabla con todo el contenido."""
    limpiar_pantalla()
    print(f"{C.PURPLE}📊 TABLA DE CONTENIDO COMPLETO{C.END}\n")
    
    if not peliculas:
        print(f"{C.YELLOW}📭 No hay contenido{C.END}")
        input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")
        return
    
    items = list(peliculas.values())
    items.sort(key=lambda x: x.get('titulo', '').lower())
    
    print(f"{'No.':<4} {'Título':<40} {'Tipo':<10} {'Año':<6} {'TMDb':<8} {'Estado':<10}")
    print(f"{'='*75}")
    
    for i, item in enumerate(items, 1):
        titulo = item.get('titulo', '')[:38]
        tipo = "🎬" if item.get('tipo') == 'pelicula' else "📺"
        año = str(item.get('año', ''))[:4]
        tmdb = "✅" if item.get('tmdb_id') else "❌"
        estado = "💔 ROTO" if item.get('esta_roto') else "✅ OK"
        estado_color = C.RED if item.get('esta_roto') else C.GREEN
        
        print(f"{i:<4} {titulo:<40} {tipo:<10} {año:<6} {tmdb:<8} {estado_color}{estado:<10}{C.END}")
    
    print(f"\n{C.CYAN}Total: {len(items)} elementos{C.END}")
    print(f"{C.CYAN}Con TMDb ID: {sum(1 for p in items if p.get('tmdb_id'))}{C.END}")
    input(f"\n{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")

def limpiar_datos_invalidos(peliculas, editados):
    """Limpia datos inválidos."""
    limpiar_pantalla()
    print(f"{C.PURPLE}🧹 LIMPIANDO DATOS INVÁLIDOS{C.END}\n")
    
    eliminados = []
    
    for key, item in list(peliculas.items()):
        if not item.get('titulo') or not item.get('poster'):
            print(f"{C.YELLOW}⚠️  Eliminando: {item.get('titulo', 'Sin título')} - Datos incompletos{C.END}")
            eliminados.append(item.get('titulo', 'Sin título'))
            del peliculas[key]
    
    if eliminados:
        print(f"\n{C.GREEN}✅ Se eliminaron {len(eliminados)} elementos inválidos:{C.END}")
        for e in eliminados:
            print(f"  • {e}")
    else:
        print(f"{C.GREEN}✅ No se encontraron datos inválidos{C.END}")
    
    input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")

def buscar_sin_tmdb_id(peliculas, editados):
    """Busca contenido sin TMDb ID y permite añadirlo."""
    sin_tmdb = [item for item in peliculas.values() if not item.get('tmdb_id')]
    
    if not sin_tmdb:
        print(f"{C.GREEN}✅ Todo el contenido tiene TMDb ID{C.END}")
        input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")
        return
    
    print(f"\n{C.YELLOW}📋 Contenido sin TMDb ID ({len(sin_tmdb)}):{C.END}")
    for i, item in enumerate(sin_tmdb, 1):
        print(f"  {i}. {item.get('titulo')} ({item.get('tipo')})")
    
    if confirmar_accion("\n¿Buscar TMDb ID para estos elementos?"):
        actualizados = 0
        for item in sin_tmdb:
            print(f"\n{C.CYAN}🔍 Buscando: {item.get('titulo')}{C.END}")
            tipo = item.get('tipo', 'pelicula')
            resultados = buscar_en_tmdb_super_mejorado(item.get('titulo'), tipo)
            
            if resultados and confirmar_accion(f"¿Usar estos datos para '{item.get('titulo')}'?"):
                # Actualizar campos TMDb manteniendo los locales
                item.update({
                    'tmdb_id': resultados.get('tmdb_id', ''),
                    'titulo_original': resultados.get('titulo_original', ''),
                    'generos_lista': resultados.get('generos_lista', []),
                    'popularidad': resultados.get('popularidad', 0),
                    'tagline': resultados.get('tagline', ''),
                    'trailer': resultados.get('trailer', '')
                })
                
                if item not in editados:
                    editados.append(item)
                
                actualizados += 1
                print(f"{C.GREEN}✅ Actualizado{C.END}")
        
        print(f"\n{C.GREEN}✅ Se actualizaron {actualizados} elementos{C.END}")
    
    input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")

def marcar_contenido_roto(peliculas, editados):
    """Marca o desmarca contenido como roto."""
    limpiar_pantalla()
    print(f"{C.PURPLE}💔 MARCAR CONTENIDO ROTO{C.END}\n")
    
    print(f"  1. 🔍 Buscar por título")
    print(f"  2. 📋 Seleccionar de la lista")
    print(f"  0. ↩️  Volver")
    
    opcion = input(f"\n{C.GOLD}🎲 Elige opción: {C.END}").strip()
    
    item = None
    
    if opcion == '1':
        criterio = input(f"\n{C.CYAN}🔍 Título a buscar: {C.END}").strip().lower()
        if not criterio:
            return
            
        resultados = []
        for p in peliculas.values():
            if criterio in p.get('titulo', '').lower():
                resultados.append(p)
        
        if not resultados:
            print(f"\n{C.YELLOW}📭 No se encontraron resultados{C.END}")
            input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")
            return
            
        print(f"\n{C.GREEN}✅ Encontrados {len(resultados)} resultados:{C.END}")
        for i, res in enumerate(resultados, 1):
            estado = "💔" if res.get('esta_roto') else "✅"
            tipo = "🎬" if res.get('tipo') == 'pelicula' else "📺"
            print(f"  {i}. {tipo} {res.get('titulo')} ({res.get('año')}) {estado}")
            
        try:
            sel = input(f"\n{C.CYAN}Número a seleccionar (0 para cancelar): {C.END}").strip()
            if sel == '0': return
            idx = int(sel) - 1
            if 0 <= idx < len(resultados):
                item = resultados[idx]
        except ValueError:
            pass
            
    elif opcion == '2':
        item = seleccionar_contenido(peliculas, "marcar como roto")
    
    if not item:
        return
    
    estado_actual = item.get('esta_roto', False)
    nuevo_estado = not estado_actual
    
    item['esta_roto'] = nuevo_estado
    
    # Lógica para cambiar la imagen a no-disponible.png
    if nuevo_estado:
        # Si se marca como roto, guardar poster original y poner no-disponible.png
        if item.get('poster') and item.get('poster') != 'no-disponible.png':
            item['poster_original'] = item['poster']
        item['poster'] = 'no-disponible.png'
    else:
        # Si se marca como funcional, intentar restaurar poster original
        if item.get('poster_original'):
            item['poster'] = item['poster_original']
            del item['poster_original']

    if item not in editados:
        editados.append(item)
    
    estado_texto = "ROTO 💔" if nuevo_estado else "FUNCIONAL ✅"
    estado_color = C.RED if nuevo_estado else C.GREEN
    
    print(f"\n{estado_color}{estado_texto}{C.END} para: {item.get('titulo')}")
    if nuevo_estado:
        print(f"{C.CYAN}🖼️  Imagen cambiada a no-disponible.png{C.END}")
    elif item.get('poster') != 'no-disponible.png':
        print(f"{C.CYAN}🖼️  Imagen restaurada{C.END}")

    input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")

def enviar_notificacion():
    """Envía notificación de nuevo contenido."""
    limpiar_pantalla()
    print(f"{C.PURPLE}📢 ENVIAR NOTIFICACIÓN{C.END}\n")
    
    titulo = input(f"{C.CYAN}📝 Título del contenido: {C.END}").strip()
    portada = input(f"{C.CYAN}🖼️  URL de la portada: {C.END}").strip()
    contenido_id = input(f"{C.CYAN}🆔 ID del contenido: {C.END}").strip()
    
    if not titulo or not portada:
        print(f"{C.RED}❌ Título y portada son obligatorios{C.END}")
        input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")
        return
    
    # Crear objeto de notificación
    notificacion = {
        'id': contenido_id or generar_id_automatico({'titulo': titulo, 'año': datetime.now().year}).get('id'),
        'titulo': titulo,
        'portada': portada,
        'fecha': datetime.now().isoformat()
    }
    
    # Guardar en archivo
    try:
        js_content = f"const nuevaNotificacion = {json.dumps(notificacion, indent=2, ensure_ascii=False)};"
        
        with open(PELINOT_JS_FILE, 'w', encoding='utf-8') as f:
            f.write(js_content)
        
        print(f"\n{C.GREEN}✅ Notificación creada exitosamente{C.END}")
        print(f"{C.CYAN}Archivo: {PELINOT_JS_FILE}{C.END}")
    
    except Exception as e:
        print(f"{C.RED}❌ Error guardando notificación: {e}{C.END}")
    
    input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")

def gestionar_proximamente(proximamente, peliculas, anadidos):
    """Gestiona la lista de próximamente."""
    while True:
        limpiar_pantalla()
        print(f"{C.PURPLE}🚀 GESTIONAR PRÓXIMAMENTE{C.END}\n")
        
        if not proximamente:
            print(f"{C.YELLOW}📭 No hay contenido en próximamente{C.END}")
        else:
            for i, item in enumerate(proximamente, 1):
                titulo = item.get('titulo', 'Sin título')[:40]
                tipo = item.get('tipo', 'pelicula')
                print(f"  {C.GREEN}{i}.{C.END} {titulo} ({tipo})")
        
        print(f"\n{C.PURPLE}📋 OPCIONES:{C.END}")
        print(f"  1. ➕ Añadir")
        print(f"  2. 🗑️  Eliminar")
        print(f"  3. 🚀 Publicar en biblioteca")
        print(f"\n  0. ↩️  Volver")
        
        opcion = input(f"\n{C.GOLD}🎲 Elige: {C.END}").strip()
        
        if opcion == '0':
            break
        elif opcion == '1':
            # Añadir a próximamente
            titulo = input(f"\n{C.CYAN}📝 Título: {C.END}").strip()
            if titulo:
                proximamente.append({
                    'titulo': titulo,
                    'tipo': input(f"{C.CYAN}🎭 Tipo (pelicula/serie): {C.END}").strip() or 'pelicula',
                    'poster': input(f"{C.CYAN}🖼️  URL póster: {C.END}").strip()
                })
                print(f"{C.GREEN}✅ Añadido a próximamente{C.END}")
                time.sleep(1)
        
        elif opcion == '2':
            # Eliminar de próximamente
            if proximamente:
                try:
                    idx = int(input(f"\n{C.CYAN}Número a eliminar: {C.END}").strip()) - 1
                    if 0 <= idx < len(proximamente):
                        eliminado = proximamente.pop(idx)
                        print(f"{C.GREEN}✅ Eliminado: {eliminado.get('titulo')}{C.END}")
                        time.sleep(1)
                except ValueError:
                    print(f"{C.RED}❌ Número inválido{C.END}")
                    time.sleep(1)
        
        elif opcion == '3':
            # Publicar en biblioteca
            if proximamente:
                try:
                    idx = int(input(f"\n{C.CYAN}Número a publicar: {C.END}").strip()) - 1
                    if 0 <= idx < len(proximamente):
                        item = proximamente[idx]
                        
                        # Convertir a contenido normal
                        nuevo_contenido = {
                            'tipo': item.get('tipo', 'pelicula'),
                            'titulo': item.get('titulo', ''),
                            'poster': item.get('poster', ''),
                            'descripcion': input(f"{C.CYAN}📄 Descripción: {C.END}").strip() or "Sin descripción",
                            'año': datetime.now().year,
                            'categoria': seleccionar_categoria(),
                            'genero': normalizar_generos(input(f"{C.CYAN}🎭 Géneros: {C.END}").strip()),
                            'calificacion': 0,
                            'favorito': False,
                            'esta_roto': False,
                            'addedDate': datetime.now().isoformat()
                        }
                        
                        nuevo_contenido = generar_id_automatico(nuevo_contenido)
                        
                        # Añadir a biblioteca
                        peliculas[nuevo_contenido['id']] = nuevo_contenido
                        anadidos.append(nuevo_contenido)
                        
                        # Eliminar de próximamente
                        proximamente.pop(idx)
                        
                        print(f"{C.GREEN}✅ Publicado exitosamente{C.END}")
                        time.sleep(2)
                
                except ValueError:
                    print(f"{C.RED}❌ Número inválido{C.END}")
                    time.sleep(1)

def gestionar_borradores(base_datos, peliculas, anadidos):
    """Gestiona la base de datos de borradores."""
    while True:
        limpiar_pantalla()
        print(f"{C.PURPLE}📝 GESTIONAR BORRADORES{C.END}\n")
        
        if not base_datos:
            print(f"{C.YELLOW}📭 No hay borradores{C.END}")
        else:
            for i, borrador in enumerate(base_datos, 1):
                titulo = borrador.get('titulo', 'Sin título')[:40]
                print(f"  {C.GREEN}{i}.{C.END} {titulo}")
        
        print(f"\n{C.PURPLE}📋 OPCIONES:{C.END}")
        print(f"  1. 📄 Ver detalles")
        print(f"  2. 🗑️  Eliminar")
        print(f"  3. 🚀 Publicar como contenido")
        print(f"\n  0. ↩️  Volver")
        
        opcion = input(f"\n{C.GOLD}🎲 Elige: {C.END}").strip()
        
        if opcion == '0':
            break
        elif opcion == '1':
            # Ver detalles
            if base_datos:
                try:
                    idx = int(input(f"\n{C.CYAN}Número a ver: {C.END}").strip()) - 1
                    if 0 <= idx < len(base_datos):
                        borrador = base_datos[idx]
                        print(f"\n{C.CYAN}📄 DETALLES DEL BORRADOR:{C.END}")
                        for key, value in borrador.items():
                            print(f"  {key}: {value}")
                        input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")
                except ValueError:
                    print(f"{C.RED}❌ Número inválido{C.END}")
                    time.sleep(1)
        
        elif opcion == '2':
            # Eliminar borrador
            if base_datos:
                try:
                    idx = int(input(f"\n{C.CYAN}Número a eliminar: {C.END}").strip()) - 1
                    if 0 <= idx < len(base_datos):
                        eliminado = base_datos.pop(idx)
                        print(f"{C.GREEN}✅ Eliminado: {eliminado.get('titulo')}{C.END}")
                        guardar_base_datos(base_datos)
                        time.sleep(1)
                except ValueError:
                    print(f"{C.RED}❌ Número inválido{C.END}")
                    time.sleep(1)
        
        elif opcion == '3':
            # Publicar como contenido
            if base_datos:
                try:
                    idx = int(input(f"\n{C.CYAN}Número a publicar: {C.END}").strip()) - 1
                    if 0 <= idx < len(base_datos):
                        borrador = base_datos[idx]
                        
                        # Convertir a contenido
                        nuevo_contenido = {
                            'tipo': 'pelicula',
                            'titulo': borrador.get('titulo', ''),
                            'poster': borrador.get('poster', ''),
                            'descripcion': borrador.get('descripcion', 'Sin descripción'),
                            'año': borrador.get('año', datetime.now().year),
                            'categoria': seleccionar_categoria(),
                            'genero': normalizar_generos(borrador.get('genero', '')),
                            'calificacion': 0,
                            'favorito': False,
                            'esta_roto': False,
                            'addedDate': datetime.now().isoformat()
                        }
                        
                        nuevo_contenido = generar_id_automatico(nuevo_contenido)
                        
                        # Añadir a biblioteca
                        peliculas[nuevo_contenido['id']] = nuevo_contenido
                        anadidos.append(nuevo_contenido)
                        
                        # Eliminar de borradores
                        base_datos.pop(idx)
                        guardar_base_datos(base_datos)
                        
                        print(f"{C.GREEN}✅ Publicado como contenido{C.END}")
                        time.sleep(2)
                
                except ValueError:
                    print(f"{C.RED}❌ Número inválido{C.END}")
                    time.sleep(1)

def ver_reportes():
    """Muestra reportes de contenido roto."""
    if not os.path.exists(REPORTS_FILE):
        print(f"{C.YELLOW}📭 No hay reportes{C.END}")
        input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")
        return
    
    try:
        with open(REPORTS_FILE, 'r', encoding='utf-8') as f:
            reportes = json.load(f)
        
        if not reportes:
            print(f"{C.YELLOW}📭 No hay reportes{C.END}")
        else:
            print(f"\n{C.PURPLE}📊 REPORTES DE CONTENIDO ({len(reportes)}){C.END}")
            for i, reporte in enumerate(reportes, 1):
                print(f"\n  {C.GREEN}{i}.{C.END} {reporte.get('titulo', 'Sin título')}")
                print(f"     Fecha: {reporte.get('fecha', 'Desconocida')}")
                print(f"     Motivo: {reporte.get('motivo', 'No especificado')}")
    
    except Exception as e:
        print(f"{C.RED}❌ Error leyendo reportes: {e}{C.END}")
    
    input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")

def ver_lanzamientos():
    """Muestra lanzamientos programados."""
    try:
        if os.path.exists(NOTIFICACIONES_FILE):
            with open(NOTIFICACIONES_FILE, 'r', encoding='utf-8') as f:
                lanzamientos = json.load(f)
            
            if lanzamientos:
                print(f"\n{C.PURPLE}📅 PRÓXIMOS LANZAMIENTOS{C.END}")
                for i, lanzamiento in enumerate(lanzamientos, 1):
                    print(f"\n  {C.GREEN}{i}.{C.END} {lanzamiento.get('titulo', 'Sin título')}")
                    print(f"     Fecha: {lanzamiento.get('fecha', 'No programada')}")
                    print(f"     Tipo: {lanzamiento.get('tipo', 'Desconocido')}")
            else:
                print(f"{C.YELLOW}📭 No hay lanzamientos programados{C.END}")
        else:
            print(f"{C.YELLOW}📭 No hay lanzamientos programados{C.END}")
    
    except Exception as e:
        print(f"{C.YELLOW}📭 No hay lanzamientos programados{C.END}")
    
    input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")

def revisar_fuentes(peliculas):
    """Revisa las fuentes de un contenido específico."""
    item = seleccionar_contenido(peliculas, "revisar fuentes")
    
    if not item:
        return
    
    print(f"\n{C.PURPLE}🔍 REVISANDO FUENTES DE: {item.get('titulo', '')}{C.END}")
    print(f"Tipo: {item.get('tipo', 'Desconocido')}")
    
    if item.get('tipo') == 'pelicula':
        fuentes = item.get('fuentes', [])
        if fuentes:
            print(f"\n{C.CYAN}🎥 FUENTES DE VIDEO ({len(fuentes)}):{C.END}")
            for i, fuente in enumerate(fuentes, 1):
                print(f"\n  Fuente {i}:")
                print(f"    Idioma: {fuente.get('idioma', 'No especificado')}")
                print(f"    Calidad: {fuente.get('calidad', 'HD')}")
                print(f"    Tipo: {fuente.get('tipo', 'embed')}")
                print(f"    Activa: {'✅' if fuente.get('activa', True) else '❌'}")
                print(f"    URL: {fuente.get('url', 'No disponible')[:80]}...")
        else:
            print(f"{C.YELLOW}⚠️  No tiene fuentes de video{C.END}")
            
            # Sugerir usar trailer si está disponible
            if item.get('trailer'):
                if confirmar_accion("¿Usar el trailer como fuente temporal?"):
                    item['fuentes'] = [{
                        'idioma': 'Original',
                        'url': item['trailer'],
                        'calidad': 'HD',
                        'tipo': 'trailer',
                        'activa': True
                    }]
                    print(f"{C.GREEN}✅ Trailer añadido como fuente{C.END}")
    else:
        temporadas = item.get('temporadas', [])
        if temporadas:
            print(f"\n{C.CYAN}📺 TEMPORADAS ({len(temporadas)}):{C.END}")
            for temp in temporadas:
                print(f"\n  Temporada {temp.get('temporada', '?')}: {temp.get('nombre', '')}")
                episodios = temp.get('episodios', [])
                print(f"    Episodios: {len(episodios)}")
                for ep in episodios[:3]:  # Mostrar solo primeros 3 episodios
                    print(f"    Episodio {ep.get('episodio', '?')}: {ep.get('titulo', 'Sin título')}")
                    print(f"      URL: {ep.get('url', 'No disponible')[:80]}...")
                if len(episodios) > 3:
                    print(f"    ... y {len(episodios) - 3} episodios más")
        else:
            print(f"{C.YELLOW}⚠️  No tiene temporadas{C.END}")
    
    input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")

def herramientas_avanzadas(peliculas, editados, anadidos):
    """Herramientas avanzadas de gestión."""
    while True:
        limpiar_pantalla()
        print(f"{C.PURPLE}🛠️  HERRAMIENTAS AVANZADAS{C.END}\n")
        
        print(f"{C.CYAN}📊 ESTADÍSTICAS:{C.END}")
        print(f"  Total contenido: {len(peliculas)}")
        print(f"  Con TMDb ID: {sum(1 for p in peliculas.values() if p.get('tmdb_id'))}")
        print(f"  Cambios pendientes: {len(editados) + len(anadidos)}")
        
        print(f"\n{C.PURPLE}🛠️  HERRAMIENTAS:{C.END}")
        print(f"  1. 🧹 Limpiar caché y temporales")
        print(f"  2. 🔄 Reindexar base de datos")
        print(f"  3. 📤 Exportar a JSON")
        print(f"  4. 📥 Importar desde JSON")
        print(f"  5. 🗑️  Eliminar duplicados")
        print(f"  6. 🔍 Buscar contenido por género")
        print(f"  7. ⭐ Ordenar por calificación")
        print(f"\n  0. ↩️  Volver")
        
        opcion = input(f"\n{C.GOLD}🎲 Elige: {C.END}").strip()
        
        if opcion == '0':
            break
        elif opcion == '1':
            limpiar_cache()
        elif opcion == '2':
            reindexar_base_datos(peliculas, editados)
        elif opcion == '3':
            exportar_a_json(peliculas)
        elif opcion == '4':
            importar_desde_json(peliculas, editados, anadidos)
        elif opcion == '5':
            eliminar_duplicados(peliculas, editados)
        elif opcion == '6':
            buscar_por_genero(peliculas)
        elif opcion == '7':
            ordenar_por_calificacion(peliculas, editados)
        else:
            print(f"{C.RED}❌ Opción inválida{C.END}")
            time.sleep(1)

def buscar_por_genero(peliculas):
    """Busca contenido por género."""
    genero_buscar = input(f"\n{C.CYAN}🔍 Género a buscar: {C.END}").strip().lower()
    
    if not genero_buscar:
        return
    
    resultados = []
    for item in peliculas.values():
        generos = item.get('genero', [])
        if isinstance(generos, str):
            generos = [g.strip().lower() for g in generos.split(',')]
        
        if genero_buscar in [g.lower() for g in generos]:
            resultados.append(item)
    
    if resultados:
        print(f"\n{C.GREEN}✅ Encontrados {len(resultados)} resultados para '{genero_buscar}':{C.END}")
        for i, item in enumerate(resultados[:10], 1):
            print(f"  {i}. {item.get('titulo')} ({item.get('año')}) - {item.get('tipo')}")
        
        if len(resultados) > 10:
            print(f"  ... y {len(resultados) - 10} más")
    else:
        print(f"{C.YELLOW}📭 No se encontraron resultados{C.END}")
    
    input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")

def ordenar_por_calificacion(peliculas, editados):
    """Ordena contenido por calificación."""
    print(f"\n{C.CYAN}⭐ ORDENANDO POR CALIFICACIÓN...{C.END}")
    
    items = list(peliculas.values())
    items.sort(key=lambda x: x.get('calificacion', 0), reverse=True)
    
    print(f"\n{C.PURPLE}🏆 TOP 10 MEJOR CALIFICADOS:{C.END}")
    for i, item in enumerate(items[:10], 1):
        print(f"  {C.GOLD}{i}.{C.END} {item.get('titulo')[:40]:<40} {C.CYAN}{item.get('calificacion', 0):.1f}/10{C.END}")
    
    input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")

def limpiar_cache():
    """Limpia archivos temporales y caché."""
    print(f"\n{C.CYAN}🧹 LIMPIANDO CACHÉ...{C.END}")
    
    archivos_a_limpiar = [
        '__pycache__',
        '*.pyc',
        '*.pyo',
        '*.pyd',
        '.DS_Store',
        'Thumbs.db'
    ]
    
    for patron in archivos_a_limpiar:
        if '*' in patron:
            import glob
            for archivo in glob.glob(patron):
                try:
                    os.remove(archivo)
                    print(f"  Eliminado: {archivo}")
                except:
                    pass
        elif os.path.exists(patron):
            import shutil
            try:
                shutil.rmtree(patron)
                print(f"  Eliminado: {patron}")
            except:
                pass
    
    print(f"{C.GREEN}✅ Caché limpiado{C.END}")
    input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")

def reindexar_base_datos(peliculas, editados):
    """Reindexa la base de datos."""
    print(f"\n{C.CYAN}🔄 REINDEXANDO BASE DE DATOS...{C.END}")
    
    actualizados = 0
    peliculas_reindexadas = {}
    items_editados_ids = {id(item) for item in editados}
    
    # Generar nuevos IDs para todos
    for old_id, item in peliculas.items():
        nuevo_item = generar_id_automatico(item)
        nuevo_id = nuevo_item.get('id', old_id)
        peliculas_reindexadas[nuevo_id] = nuevo_item
        
        if nuevo_id != old_id:
            actualizados += 1
            # Si el item estaba en 'editados', actualizamos su ID
            if id(item) in items_editados_ids:
                item['id'] = nuevo_id

    # Reemplazar el diccionario original
    peliculas.clear()
    peliculas.update(peliculas_reindexadas)
    
    print(f"{C.GREEN}✅ Reindexado completado. {actualizados} IDs actualizados{C.END}")
    input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")

def exportar_a_json(peliculas):
    """Exporta la base de datos a JSON."""
    nombre_archivo = input(f"\n{C.CYAN}📝 Nombre del archivo (sin extensión): {C.END}").strip()
    if not nombre_archivo:
        nombre_archivo = f"backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    
    nombre_archivo = f"{nombre_archivo}.json"
    
    try:
        with open(nombre_archivo, 'w', encoding='utf-8') as f:
            json.dump(list(peliculas.values()), f, indent=2, ensure_ascii=False)
        
        print(f"{C.GREEN}✅ Exportado exitosamente a {nombre_archivo}{C.END}")
    
    except Exception as e:
        print(f"{C.RED}❌ Error exportando: {e}{C.END}")
    
    input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")

def importar_desde_json(peliculas, editados, anadidos):
    """Importa contenido desde JSON."""
    nombre_archivo = input(f"\n{C.CYAN}📝 Nombre del archivo JSON: {C.END}").strip()
    
    if not os.path.exists(nombre_archivo):
        print(f"{C.RED}❌ El archivo no existe{C.END}")
        input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")
        return
    
    try:
        with open(nombre_archivo, 'r', encoding='utf-8') as f:
            contenido_importado = json.load(f)
        
        if not isinstance(contenido_importado, list):
            print(f"{C.RED}❌ Formato inválido. Debe ser una lista.{C.END}")
            return
        
        importados = 0
        for item in contenido_importado:
            if 'titulo' in item:
                item = generar_id_automatico(item)
                peliculas[item['id']] = item
                anadidos.append(item)
                importados += 1
        
        print(f"{C.GREEN}✅ Importados {importados} elementos{C.END}")
    
    except Exception as e:
        print(f"{C.RED}❌ Error importando: {e}{C.END}")
    
    input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")

def eliminar_duplicados(peliculas, editados):
    """Elimina duplicados por título."""
    print(f"\n{C.CYAN}🔍 BUSCANDO DUPLICADOS...{C.END}")
    
    titulos_vistos = {}
    duplicados = []
    
    for key, item in peliculas.items():
        titulo = item.get('titulo', '').lower().strip()
        if titulo:
            if titulo in titulos_vistos:
                duplicados.append(key)
            else:
                titulos_vistos[titulo] = key
    
    if duplicados:
        print(f"{C.YELLOW}⚠️  Encontrados {len(duplicados)} duplicados:{C.END}")
        for key in duplicados:
            print(f"  • {peliculas[key].get('titulo')}")
        
        if confirmar_accion("\n¿Eliminar todos los duplicados?"):
            for key in duplicados:
                del peliculas[key]
                print(f"  Eliminado: {key}")
            
            print(f"{C.GREEN}✅ Duplicados eliminados{C.END}")
    else:
        print(f"{C.GREEN}✅ No se encontraron duplicados{C.END}")
    
    input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")

def busqueda_rapida_tmdb(peliculas, anadidos):
    """
    Realiza una búsqueda rápida en TMDb y añade el contenido directamente.
    """
    limpiar_pantalla()
    print(f"{C.PURPLE}🚀 BÚSQUEDA RÁPIDA E INTEGRACIÓN CON TMDB{C.END}\n")
    
    query = input(f"{C.CYAN}🔍 Título a buscar: {C.END}").strip()
    if not query:
        print(f"{C.RED}❌ El título no puede estar vacío.{C.END}")
        time.sleep(2)
        return False

    tipo_opcion = input(f"{C.CYAN}🎭 Tipo (1: Película, 2: Serie) [1]: {C.END}").strip() or '1'
    tipo = 'serie' if tipo_opcion == '2' else 'pelicula'
    
    datos = buscar_en_tmdb_super_mejorado(query, tipo)
    
    if datos and datos.get('success'):
        # Añadir directamente a la lista de "anadidos"
        # La función anadir_contenido se encargará de los detalles
        datos = generar_id_automatico(datos)
        peliculas[datos['id']] = datos
        anadidos.append(datos)
        print(f"\n{C.GREEN}✅ Contenido '{datos.get('titulo')}' añadido a la lista de cambios pendientes.{C.END}")
        return True
    else:
        print(f"\n{C.RED}❌ No se pudo añadir el contenido desde TMDb.{C.END}")
        return False


# --- Función principal ---
def main():
    """Función principal del programa."""
    print(f"{C.BOLD}{C.CYAN}Inicializando sistema...{C.END}")
    
    # Cargar datos
    peliculas = cargar_catalogo_completo()
    proximamente = cargar_proximamente()
    base_datos = cargar_base_datos()
    
    # Listas para seguimiento de cambios
    anadidos = []
    editados = []
    eliminados = []
    
    cambios_pendientes = False
    
    # Bucle principal
    while True:
        try:
            opcion = mostrar_menu_principal(peliculas, proximamente, cambios_pendientes)
            
            # Opciones de acción rápida
            if opcion == 'x':  # Salir
                if cambios_pendientes:
                    if confirmar_accion("⚠️  Tienes cambios sin guardar. ¿Salir de todos modos?"):
                        print(f"\n{C.GREEN}👋 ¡Hasta luego!{C.END}")
                        break
                    else:
                        continue
                else:
                    print(f"\n{C.GREEN}👋 ¡Hasta luego!{C.END}")
                    break
            
            elif opcion == 's':  # Guardar
                print(f"\n{C.CYAN}💾 GUARDANDO CAMBIOS...{C.END}")
                
                if anadidos or editados or eliminados:
                    print(f"  ➕ {len(anadidos)} nuevos")
                    print(f"  ✏️  {len(editados)} editados")
                    print(f"  🗑️  {len(eliminados)} eliminados")
                    
                    if confirmar_accion("\n¿Guardar todos los cambios?"):
                        # Guardar todo
                        guardar_peliculas(peliculas)
                        guardar_proximamente(proximamente)
                        guardar_base_datos(base_datos)
                        
                        # Resetear listas
                        anadidos.clear()
                        editados.clear()
                        eliminados.clear()
                        cambios_pendientes = False
                        
                        print(f"{C.GREEN}✅ Todos los cambios guardados{C.END}")
                    else:
                        print(f"{C.YELLOW}🚫 Guardado cancelado{C.END}")
                else:
                    print(f"{C.YELLOW}ℹ️  No hay cambios pendientes{C.END}")
                
                input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")
                continue
            
            elif opcion == 'c':  # Campaña próximamente
                if os.path.exists(CAMPAIGN_FILE):
                    os.remove(CAMPAIGN_FILE)
                    print(f"\n{C.GREEN}✅ Campaña desactivada{C.END}")
                else:
                    with open(CAMPAIGN_FILE, 'w') as f:
                        f.write('activo')
                    print(f"\n{C.GREEN}✅ Campaña activada{C.END}")
                time.sleep(1)
                continue
            
            elif opcion == 'm':  # Modo mantenimiento
                if os.path.exists(MAINTENANCE_FLAG):
                    os.remove(MAINTENANCE_FLAG)
                    print(f"\n{C.GREEN}✅ Modo mantenimiento desactivado{C.END}")
                else:
                    with open(MAINTENANCE_FLAG, 'w') as f:
                        f.write('activo')
                    print(f"\n{C.YELLOW}⚠️  Modo mantenimiento activado{C.END}")
                time.sleep(1)
                continue
            
            # Opciones numéricas
            elif opcion == 1:  # Añadir contenido
                resultado = anadir_contenido(peliculas, proximamente)
                if resultado:
                    accion, contenido = resultado
                    
                    if accion == 'AÑADIR':
                        peliculas[contenido['id']] = contenido
                        anadidos.append(contenido)
                        cambios_pendientes = True
                        print(f"{C.GREEN}✅ Añadido a cambios pendientes{C.END}")
                    
                    elif accion == 'EDITAR':
                        if contenido not in editados:
                            editados.append(contenido)
                        cambios_pendientes = True
                        print(f"{C.GREEN}✅ Marcado para edición{C.END}")
                
                input(f"\n{C.YELLOW}⏎ Presiona Enter...{C.END}")
            
            elif opcion == 2:  # Editar contenido
                editar_contenido(peliculas, editados)
                if editados:
                    cambios_pendientes = True
            
            elif opcion == 3:  # Eliminar contenido (menú)
                eliminar_contenido(peliculas, eliminados)
                if eliminados:
                    cambios_pendientes = True
            
            elif opcion == 4:  # BUSCAR CONTENIDO (NUEVO)
                buscar_contenido(peliculas, editados)
                if editados:
                    cambios_pendientes = True
            
            elif opcion == 5:  # ELIMINAR DIRECTO (NUEVO)
                eliminar_contenido_directo(peliculas, eliminados)
                if eliminados:
                    cambios_pendientes = True
            
            elif opcion == 6:  # Revisar fuentes
                revisar_fuentes(peliculas)
            
            elif opcion == 7:  # Gestionar próximamente
                gestionar_proximamente(proximamente, peliculas, anadidos)
                cambios_pendientes = True
            
            elif opcion == 8:  # Gestionar borradores
                gestionar_borradores(base_datos, peliculas, anadidos)
                cambios_pendientes = True
            
            elif opcion == 9:  # Control central
                mostrar_control_central(peliculas, editados)
            
            elif opcion == 10:  # Ver reportes
                ver_reportes()
            
            elif opcion == 11:  # Marcar contenido roto
                marcar_contenido_roto(peliculas, editados)
                cambios_pendientes = True
            
            elif opcion == 12:  # Ver lanzamientos
                ver_lanzamientos()
            
            elif opcion == 13:  # Tabla de contenido
                mostrar_tabla_completa(peliculas)
            
            elif opcion == 14:  # Herramientas avanzadas
                herramientas_avanzadas(peliculas, editados, anadidos)
                cambios_pendientes = True
            
            elif opcion == 15:  # Enviar notificación
                enviar_notificacion()
            
            elif opcion == 16:  # Búsqueda rápida TMDb
                if busqueda_rapida_tmdb(peliculas, anadidos):
                    cambios_pendientes = True
                input(f"\n{C.YELLOW}⏎ Presiona Enter para continuar...{C.END}")
            
            else:
                print(f"{C.RED}❌ Opción no reconocida{C.END}")
                time.sleep(1)
        
        except KeyboardInterrupt:
            print(f"\n\n{C.YELLOW}⚠️  Interrupción detectada{C.END}")
            if cambios_pendientes:
                if confirmar_accion("¿Quieres guardar los cambios antes de salir?"):
                    guardar_peliculas(peliculas)
                    guardar_proximamente(proximamente)
                    guardar_base_datos(base_datos)
            print(f"\n{C.GREEN}👋 ¡Hasta luego!{C.END}")
            break
        
        except Exception as e:
            print(f"\n{C.RED}💥 ERROR: {e}{C.END}")
            print(f"{C.YELLOW}Reiniciando menú...{C.END}")
            time.sleep(2)

if __name__ == "__main__":
    main()