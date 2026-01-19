# tmdb.py - Integración con el panel principal
import json
from datetime import datetime
import requests
import re
from unidecode import unidecode
import time

# Configuración de TMDb
API_KEY = "9869fab7c867e72214c8628c6029ec74"
BASE_URL = "https://api.themoviedb.org/3"
LANGUAGE = "es-ES"

class TMDBSearch:
    def __init__(self):
        self.api_key = API_KEY
        self.base_url = BASE_URL
        self.headers = {
            "accept": "application/json",
            "Authorization": f"Bearer {API_KEY}"
        }
    
    def _make_request(self, endpoint, params=None, retries=3):
        """Realiza una petición a la API de TMDb con reintentos"""
        try:
            url = f"{self.base_url}{endpoint}"
            if params is None:
                params = {}
            
            # Añadir parámetros básicos
            params['api_key'] = self.api_key
            params['language'] = LANGUAGE
            
            for attempt in range(retries):
                try:
                    response = requests.get(url, params=params, headers=self.headers, timeout=10)
                    response.raise_for_status()
                    return response.json()
                except requests.exceptions.HTTPError as e:
                    if response.status_code == 404:
                        print(f"⚠️ Recurso no encontrado: {endpoint}")
                        return None
                    elif response.status_code == 429:  # Too Many Requests
                        wait_time = 2 ** attempt  # Exponential backoff
                        print(f"⏳ Demasiadas peticiones. Esperando {wait_time} segundos...")
                        time.sleep(wait_time)
                        continue
                    else:
                        raise e
                        
        except requests.exceptions.RequestException as e:
            print(f"❌ Error en la petición a TMDb: {e}")
            return None
        except json.JSONDecodeError as e:
            print(f"❌ Error al decodificar la respuesta: {e}")
            return None
        
        return None
    
    def _get_genre_id(self, genre_name, media_type='movie'):
        """Obtiene el ID de un género por nombre"""
        endpoint = f"/genre/{media_type}/list"
        data = self._make_request(endpoint)
        
        if data and 'genres' in data:
            for genre in data['genres']:
                if genre['name'].lower() == genre_name.lower():
                    return genre['id']
        return None
    
    def _format_result(self, item, item_type='movie'):
        """Formatea un resultado de TMDb al formato del panel"""
        try:
            # Determinar título
            if item_type == 'movie':
                titulo = item.get('title', 'Desconocido')
                año = item.get('release_date', '')[:4] if item.get('release_date') else 'N/A'
            else:  # tv
                titulo = item.get('name', 'Desconocido')
                año = item.get('first_air_date', '')[:4] if item.get('first_air_date') else 'N/A'
            
            # Obtener director y reparto
            director = "Desconocido"
            reparto = []
            
            if 'credits' in item:
                credits = item['credits']
                # Director para películas
                if item_type == 'movie':
                    crew = credits.get('crew', [])
                    directors = [person for person in crew if person.get('job') == 'Director']
                    director = directors[0]['name'] if directors else "Desconocido"
                
                # Reparto principal
                cast = credits.get('cast', [])[:5]
                reparto = [actor['name'] for actor in cast]
            
            # Obtener géneros
            generos = []
            if 'genres' in item:
                generos = [genre['name'] for genre in item['genres']]
            elif 'genre_ids' in item:
                # Si solo tenemos IDs, necesitamos mapearlos
                genre_mapping = {
                    28: 'Acción', 12: 'Aventura', 16: 'Animación', 35: 'Comedia',
                    80: 'Crimen', 99: 'Documental', 18: 'Drama', 10751: 'Familia',
                    14: 'Fantasía', 36: 'Historia', 27: 'Terror', 10402: 'Música',
                    9648: 'Misterio', 10749: 'Romance', 878: 'Ciencia ficción',
                    10770: 'Película de TV', 53: 'Suspense', 10752: 'Bélica',
                    37: 'Western', 10759: 'Acción y Aventura', 10762: 'Kids',
                    10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy',
                    10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics'
                }
                generos = [genre_mapping.get(gid, 'Desconocido') for gid in item['genre_ids']]
            
            # Imagen del poster
            poster_path = item.get('poster_path', '')
            poster = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else ""
            
            # Descripción
            descripcion = item.get('overview', 'Sin descripción disponible')
            if not descripcion or descripcion == '':
                descripcion = 'Sin descripción disponible'
            
            return {
                'tipo': 'pelicula' if item_type == 'movie' else 'serie',
                'titulo': titulo,
                'poster': poster,
                'descripcion': descripcion,
                'año': año if año else 'N/A',
                'genero': generos,
                'generos_string': ', '.join(generos) if generos else 'Desconocido',
                'director': director,
                'reparto': reparto,
                'calificacion': round(item.get('vote_average', 0), 1),
                'idioma_original': item.get('original_language', 'en'),
                'tmdb_id': item.get('id'),
                'popularidad': round(item.get('popularity', 0), 2),
                'popularidad_tendencia': f"🔥 {round(item.get('popularity', 0))}"
            }
        except Exception as e:
            print(f"⚠️ Error formateando resultado: {e}")
            return None
    
    def buscar_contenido(self, query, tipo='movie', cantidad=10):
        """Busca contenido por título"""
        endpoint = f"/search/{tipo}"
        params = {
            'query': query,
            'include_adult': False,
            'page': 1
        }
        
        data = self._make_request(endpoint, params)
        if not data or 'results' not in data:
            return []
        
        resultados = []
        for item in data['results'][:cantidad]:
            # Obtener detalles completos
            detalle = self._get_detalles(item['id'], tipo)
            if detalle:
                resultado_formateado = self._format_result(detalle, tipo)
                if resultado_formateado:
                    resultados.append(resultado_formateado)
        
        return resultados
    
    def _get_detalles(self, item_id, item_type='movie'):
        """Obtiene detalles completos de un item incluyendo créditos"""
        try:
            endpoint = f"/{item_type}/{item_id}"
            params = {
                'append_to_response': 'credits'
            }
            return self._make_request(endpoint, params)
        except Exception as e:
            print(f"⚠️ Error obteniendo detalles de {item_type} ID {item_id}: {e}")
            return None
    
    def buscar_por_genero(self, genero_nombre, tipo='movie', cantidad=8):
        """Busca contenido por género"""
        # Primero obtener el ID del género
        genre_id = self._get_genre_id(genero_nombre, tipo)
        if not genre_id:
            print(f"❌ Género '{genero_nombre}' no encontrado")
            return []
        
        endpoint = f"/discover/{tipo}"
        params = {
            'with_genres': genre_id,
            'sort_by': 'popularity.desc',
            'include_adult': False,
            'page': 1
        }
        
        data = self._make_request(endpoint, params)
        if not data or 'results' not in data:
            return []
        
        resultados = []
        for item in data['results'][:cantidad]:
            # Obtener detalles completos
            detalle = self._get_detalles(item['id'], tipo)
            if detalle:
                resultado_formateado = self._format_result(detalle, tipo)
                if resultado_formateado:
                    resultados.append(resultado_formateado)
        
        return resultados
    
    def buscar_tendencias(self, tipo='movie', cantidad=6, time_window='day'):
        """Busca tendencias (corregido endpoint)"""
        endpoint = f"/trending/{tipo}/{time_window}"
        params = {'page': 1}
        
        data = self._make_request(endpoint, params)
        if not data or 'results' not in data:
            print("⚠️ No se pudieron obtener tendencias")
            return []
        
        resultados = []
        count = 0
        
        for item in data['results']:
            if count >= cantidad:
                break
                
            # Obtener detalles completos
            detalle = self._get_detalles(item['id'], tipo)
            if detalle:
                resultado_formateado = self._format_result(detalle, tipo)
                if resultado_formateado:
                    # Añadir indicador de tendencia
                    resultado_formateado['popularidad_tendencia'] = f"🔥 {int(item.get('popularity', 0))}"
                    resultados.append(resultado_formateado)
                    count += 1
            else:
                print(f"⚠️ Saltando {tipo} ID {item['id']} - no se pudo obtener detalles")
        
        return resultados
    
    def buscar_populares(self, tipo='movie', cantidad=6):
        """Busca contenido popular"""
        endpoint = f"/{tipo}/popular"
        params = {'page': 1}
        
        data = self._make_request(endpoint, params)
        if not data or 'results' not in data:
            print(f"⚠️ No se pudieron obtener populares para {tipo}")
            return []
        
        resultados = []
        count = 0
        
        for item in data['results']:
            if count >= cantidad:
                break
                
            # Obtener detalles completos
            detalle = self._get_detalles(item['id'], tipo)
            if detalle:
                resultado_formateado = self._format_result(detalle, tipo)
                if resultado_formateado:
                    resultados.append(resultado_formateado)
                    count += 1
            else:
                print(f"⚠️ Saltando {tipo} ID {item['id']} - no se pudo obtener detalles")
        
        return resultados


def integrar_con_panel(resultados_tmdb, peliculas, anadidos):
    """
    Integra los resultados de TMDb con el panel principal.
    
    Args:
        resultados_tmdb: Lista de resultados de TMDb
        peliculas: Diccionario actual de películas del panel
        anadidos: Lista donde añadir nuevos elementos
        
    Returns:
        Número de elementos añadidos
    """
    if not resultados_tmdb:
        print("⚠️ No hay resultados para integrar")
        return 0
    
    añadidos_count = 0
    
    for resultado in resultados_tmdb:
        if not resultado:
            continue
            
        # Verificar si ya existe (por título y año)
        existe = False
        for item in peliculas.values():
            if (str(item.get('titulo', '')).lower() == str(resultado.get('titulo', '')).lower() and 
                str(item.get('año', '')) == str(resultado.get('año', ''))):
                existe = True
                break
        
        if existe:
            print(f"⚠️ '{resultado.get('titulo', 'Desconocido')}' ya existe en la biblioteca")
            continue
        
        # Convertir a formato del panel
        nuevo_item = {
            'tipo': resultado.get('tipo', 'pelicula'),
            'titulo': resultado.get('titulo', 'Desconocido'),
            'poster': resultado.get('poster', ''),
            'descripcion': resultado.get('descripcion', 'Sin descripción disponible'),
            'año': resultado.get('año', 'N/A'),
            'genero': resultado.get('genero', []),
            'director': resultado.get('director', 'Desconocido'),
            'reparto': resultado.get('reparto', []),
            'calificacion': resultado.get('calificacion', 0),
            'idioma': resultado.get('idioma_original', 'en'),
            'calidad': 'HD',
            'favorito': False,
            'esta_roto': False,
            'addedDate': datetime.now().isoformat(),
            'tmdb_id': resultado.get('tmdb_id'),
            'categoria': ['lanzamientos-recientes'],
            'popularidad': resultado.get('popularidad', 0)
        }
        
        # Añadir fuentes vacías si es película
        if resultado.get('tipo') == 'pelicula':
            nuevo_item['fuentes'] = []
        
        # Generar ID automático
        titulo = nuevo_item['titulo']
        año = nuevo_item['año']
        
        try:
            slug = unidecode(titulo).lower()
            slug = re.sub(r'[^a-z0-9\s-]', '', slug)
            slug = re.sub(r'\s+', '-', slug).strip('-')
            if año and año != 'N/A':
                nuevo_item['id'] = f"{slug}-{año}"
            else:
                nuevo_item['id'] = slug
        except:
            # Fallback: usar timestamp como ID
            nuevo_item['id'] = f"tmdb-{int(datetime.now().timestamp())}-{añadidos_count}"
        
        # Añadir a las colecciones
        peliculas[nuevo_item['id']] = nuevo_item
        anadidos.append(nuevo_item)
        añadidos_count += 1
        
        print(f"✅ Añadido: {titulo} ({año})")
    
    return añadidos_count


# Función para menú rápido de TMDb
def menu_busqueda_rapida_tmdb(peliculas, anadidos):
    """
    Menú rápido para buscar y añadir desde TMDb.
    """
    tmdb_client = TMDBSearch()
    
    while True:
        print("\n" + "=" * 60)
        print("🚀 BÚSQUEDA RÁPIDA TMDb")
        print("=" * 60)
        
        print("\n📋 OPCIONES DE BÚSQUEDA:")
        print("  1. 🔍 Buscar por título")
        print("  2. 🎭 Buscar por género")
        print("  3. 🔥 Tendencias del día")
        print("  4. ⭐ Contenido popular")
        print("  5. 📤 Importar desde archivo JSON")
        print("  6. 🧪 Probar conexión API")
        print("  0. ↩️  Volver al menú principal")
        
        opcion = input("\n🎲 Elige una opción: ").strip()
        
        if opcion == '0':
            break
        
        elif opcion == '1':
            # Búsqueda por título
            query = input("\n🔍 Título a buscar: ").strip()
            if not query:
                continue
            
            tipo = input("🎭 Tipo (1=Película, 2=Serie): ").strip()
            tipo_tmdb = 'movie' if tipo == '1' else 'tv'
            
            print(f"\n🔍 Buscando '{query}'...")
            resultados = tmdb_client.buscar_contenido(query, tipo_tmdb, cantidad=10)
            
            if resultados:
                print(f"\n✅ Encontrados {len(resultados)} resultados:")
                for i, item in enumerate(resultados, 1):
                    print(f"  {i}. {item['titulo']} ({item['año']}) - ⭐ {item['calificacion']}")
                
                print("\n📋 OPCIONES:")
                print("  [Número] - Añadir ese resultado")
                print("  [A] - Añadir todos")
                print("  [S] - Seleccionar varios (ej: 1,3,5)")
                print("  [0] - Cancelar")
                
                seleccion = input("\n🎲 Elige: ").strip().lower()
                
                if seleccion == '0':
                    continue
                elif seleccion == 'a':
                    # Añadir todos
                    añadidos_count = integrar_con_panel(resultados, peliculas, anadidos)
                    print(f"\n✅ Se añadieron {añadidos_count} elementos")
                elif seleccion == 's':
                    # Seleccionar múltiples
                    indices = input("Índices a añadir (separados por coma): ").strip()
                    try:
                        seleccionados = []
                        for idx_str in indices.split(','):
                            idx = int(idx_str.strip()) - 1
                            if 0 <= idx < len(resultados):
                                seleccionados.append(resultados[idx])
                        
                        if seleccionados:
                            añadidos_count = integrar_con_panel(seleccionados, peliculas, anadidos)
                            print(f"\n✅ Se añadieron {añadidos_count} elementos")
                    except:
                        print("❌ Formato incorrecto")
                else:
                    # Seleccionar uno
                    try:
                        idx = int(seleccion) - 1
                        if 0 <= idx < len(resultados):
                            añadidos_count = integrar_con_panel([resultados[idx]], peliculas, anadidos)
                            if añadidos_count > 0:
                                print(f"\n✅ Elemento añadido exitosamente")
                    except:
                        print("❌ Selección inválida")
            else:
                print("❌ No se encontraron resultados")
        
        elif opcion == '2':
            # Búsqueda por género
            print("\n🎭 Géneros populares: Acción, Comedia, Drama, Terror, Aventura, Ciencia ficción")
            genero = input("🎭 Género a buscar: ").strip()
            if not genero:
                continue
            
            tipo = input("🎭 Tipo (1=Película, 2=Serie): ").strip()
            tipo_tmdb = 'movie' if tipo == '1' else 'tv'
            
            print(f"\n🔍 Buscando {tipo_tmdb}s de género '{genero}'...")
            resultados = tmdb_client.buscar_por_genero(genero, tipo_tmdb, cantidad=8)
            
            if resultados:
                print(f"\n✅ Encontrados {len(resultados)} resultados:")
                for i, item in enumerate(resultados, 1):
                    print(f"  {i}. {item['titulo']} ({item['año']}) - 🎭 {item['generos_string']}")
                
                # Preguntar cuántos añadir
                print(f"\n¿Cuántos elementos deseas añadir? (1-{len(resultados)})")
                cantidad = input(f"O [A] para añadir todos, [0] para cancelar: ").strip().lower()
                
                if cantidad == '0':
                    continue
                elif cantidad == 'a':
                    añadidos_count = integrar_con_panel(resultados, peliculas, anadidos)
                    print(f"\n✅ Se añadieron {añadidos_count} elementos")
                else:
                    try:
                        num = int(cantidad)
                        if 1 <= num <= len(resultados):
                            seleccionados = resultados[:num]
                            añadidos_count = integrar_con_panel(seleccionados, peliculas, anadidos)
                            print(f"\n✅ Se añadieron {añadidos_count} elementos")
                    except:
                        print("❌ Número inválido")
            else:
                print(f"❌ No se encontraron {tipo_tmdb}s del género '{genero}'")
        
        elif opcion == '3':
            # Tendencias
            tipo = input("\n🎭 Tipo (1=Película, 2=Serie, 3=Todas): ").strip()
            
            if tipo == '1':
                tipo_tmdb = 'movie'
            elif tipo == '2':
                tipo_tmdb = 'tv'
            else:
                # Buscar ambas
                print(f"\n🔥 Buscando tendencias de películas...")
                resultados_movie = tmdb_client.buscar_tendencias('movie', cantidad=3)
                
                print(f"\n🔥 Buscando tendencias de series...")
                resultados_tv = tmdb_client.buscar_tendencias('tv', cantidad=3)
                
                resultados = resultados_movie + resultados_tv
                
                if resultados:
                    print(f"\n🔥 TENDENCIAS DEL DÍA ({len(resultados)}):")
                    for i, item in enumerate(resultados, 1):
                        tipo_str = "🎬" if item['tipo'] == 'pelicula' else "📺"
                        tendencia = item.get('popularidad_tendencia', '🔥 0')
                        print(f"  {i}. {tipo_str} {item['titulo']} ({item['año']}) {tendencia}")
                    
                    if input("\n¿Añadir todas las tendencias? (s/n): ").lower() == 's':
                        añadidos_count = integrar_con_panel(resultados, peliculas, anadidos)
                        print(f"\n✅ Se añadieron {añadidos_count} tendencias")
                else:
                    print("❌ No se pudieron obtener las tendencias")
                continue
            
            print(f"\n🔥 Buscando tendencias de {tipo_tmdb}...")
            resultados = tmdb_client.buscar_tendencias(tipo_tmdb, cantidad=6)
            
            if resultados:
                tipo_str = "🎬 Películas" if tipo_tmdb == 'movie' else "📺 Series"
                print(f"\n🔥 TENDENCIAS DEL DÍA ({tipo_str}):")
                for i, item in enumerate(resultados, 1):
                    tendencia = item.get('popularidad_tendencia', '🔥 0')
                    print(f"  {i}. {item['titulo']} ({item['año']}) {tendencia}")
                
                if input("\n¿Añadir todas las tendencias? (s/n): ").lower() == 's':
                    añadidos_count = integrar_con_panel(resultados, peliculas, anadidos)
                    print(f"\n✅ Se añadieron {añadidos_count} tendencias")
            else:
                print("❌ No se pudieron obtener las tendencias")
        
        elif opcion == '4':
            # Populares
            tipo = input("\n🎭 Tipo (1=Película, 2=Serie): ").strip()
            tipo_tmdb = 'movie' if tipo == '1' else 'tv'
            
            print(f"\n⭐ Buscando contenido popular...")
            resultados = tmdb_client.buscar_populares(tipo_tmdb, cantidad=6)
            
            if resultados:
                tipo_str = "🎬 Películas" if tipo_tmdb == 'movie' else "📺 Series"
                print(f"\n⭐ CONTENIDO POPULAR ({tipo_str}):")
                for i, item in enumerate(resultados, 1):
                    print(f"  {i}. {item['titulo']} ({item['año']}) ⭐ {item['calificacion']}")
                
                if input("\n¿Añadir todo el contenido popular? (s/n): ").lower() == 's':
                    añadidos_count = integrar_con_panel(resultados, peliculas, anadidos)
                    print(f"\n✅ Se añadieron {añadidos_count} elementos populares")
            else:
                print("❌ No se pudieron obtener los populares")
        
        elif opcion == '5':
            # Importar desde JSON
            archivo = input("\n📁 Nombre del archivo JSON (resultados_tmdb.json): ").strip()
            if not archivo:
                archivo = "resultados_tmdb.json"
            
            try:
                with open(archivo, 'r', encoding='utf-8') as f:
                    resultados = json.load(f)
                
                print(f"\n📊 Archivo cargado: {len(resultados)} elementos")
                
                if input("¿Importar todos los elementos? (s/n): ").lower() == 's':
                    añadidos_count = integrar_con_panel(resultados, peliculas, anadidos)
                    print(f"\n✅ Se importaron {añadidos_count} elementos desde {archivo}")
            
            except FileNotFoundError:
                print(f"❌ Archivo '{archivo}' no encontrado")
            except Exception as e:
                print(f"❌ Error al importar: {e}")
        
        elif opcion == '6':
            # Probar conexión API
            print("\n🧪 Probando conexión con TMDb API...")
            
            # Probar endpoint básico
            test_client = TMDBSearch()
            test_data = test_client._make_request("/configuration")
            
            if test_data:
                print("✅ Conexión API exitosa")
                print(f"   • Imágenes base: {test_data.get('images', {}).get('base_url', 'N/A')}")
                print(f"   • Idiomas soportados: {len(test_data.get('languages', []))}")
            else:
                print("❌ No se pudo conectar con TMDb API")
                
            # Probar tendencias
            print("\n🔥 Probando tendencias...")
            tendencias = test_client.buscar_tendencias('movie', cantidad=2)
            if tendencias:
                print(f"✅ Tendencias obtenidas: {len(tendencias)}")
                for item in tendencias:
                    print(f"   • {item['titulo']} ({item['año']})")
            else:
                print("⚠️ No se pudieron obtener tendencias")
        
        input("\n⏎ Presiona Enter para continuar...")


# Prueba rápida si se ejecuta directamente
if __name__ == "__main__":
    print("🎬 TMDB Integration Module")
    print("=" * 40)
    
    # Crear estructuras vacías para probar
    peliculas_de_prueba = {}
    anadidos_de_prueba = []
    
    # Ejecutar menú de prueba
    menu_busqueda_rapida_tmdb(peliculas_de_prueba, anadidos_de_prueba)