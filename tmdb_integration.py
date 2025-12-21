# tmdb_integration.py - Integración con el panel principal
import json
import tmdbsimple as tmdb
from datetime import datetime

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
        # Verificar si ya existe (por título y año)
        existe = False
        for item in peliculas.values():
            if (item.get('titulo', '').lower() == resultado['titulo'].lower() and 
                item.get('año') == resultado['año']):
                existe = True
                break
        
        if existe:
            print(f"⚠️ '{resultado['titulo']}' ya existe en la biblioteca")
            continue # No añadir si ya existe
        
        # Convertir a formato del panel
        nuevo_item = {
            'tipo': resultado['tipo'],
            'titulo': resultado['titulo'],
            'poster': resultado['poster'],
            'descripcion': resultado['descripcion'],
            'año': resultado['año'],
            'genero': resultado['genero'],
            'director': resultado['director'],
            'reparto': resultado.get('reparto', []),
            'calificacion': resultado['calificacion'],
            'idioma': resultado['idioma_original'],
            'calidad': 'HD',
            'favorito': False,
            'esta_roto': False,
            'addedDate': datetime.now().isoformat(),
            'tmdb_id': resultado['tmdb_id'],
            'categoria': ['lanzamientos-recientes'], # Categoría por defecto
            'popularidad': resultado.get('popularidad', 0)
        }
        
        # Añadir fuentes vacías si es película
        if resultado['tipo'] == 'pelicula':
            nuevo_item['fuentes'] = []
        
        # Generar ID automático
        from unidecode import unidecode
        import re
        
        titulo = nuevo_item['titulo']
        año = nuevo_item['año']
        
        slug = unidecode(titulo).lower()
        slug = re.sub(r'[^a-z0-9\s-]', '', slug)
        slug = re.sub(r'\s+', '-', slug).strip('-')
        nuevo_item['id'] = f"{slug}-{año}"
        
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
    while True:
        # Limpiar pantalla para un menú más limpio
        import os
        os.system('cls' if os.name == 'nt' else 'clear')
        print("\n" + "=" * 60)
        print("🚀 BÚSQUEDA RÁPIDA TMDb")
        print("=" * 60)
        
        print("\n📋 OPCIONES DE BÚSQUEDA:")
        print("  1. 🔍 Buscar por título")
        print("  2. 🎭 Buscar por género")
        print("  3. 🔥 Tendencias del día")
        print("  4. ⭐ Contenido popular")
        print("  5. 📤 Importar desde archivo JSON")
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
            resultados = buscar_contenido_tmdb(query, tipo_tmdb, cantidad=10)
            
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
                    count = integrar_con_panel(resultados, peliculas, anadidos)
                    print(f"\n✅ Se añadieron {count} elementos")
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
                            count = integrar_con_panel(seleccionados, peliculas, anadidos)
                            print(f"\n✅ Se añadieron {count} elementos")
                    except:
                        print("❌ Formato incorrecto")
                else:
                    # Seleccionar uno
                    try:
                        idx = int(seleccion) - 1
                        if 0 <= idx < len(resultados):
                            count = integrar_con_panel([resultados[idx]], peliculas, anadidos)
                            if count > 0:
                                print(f"\n✅ Elemento añadido exitosamente")
                    except:
                        print("❌ Selección inválida")
        
        elif opcion == '2':
            # Búsqueda por género
            genero = input("\n🎭 Género a buscar (ej: Acción, Comedia, Drama): ").strip()
            if not genero:
                continue
            
            tipo = input("🎭 Tipo (1=Película, 2=Serie): ").strip()
            tipo_tmdb = 'movie' if tipo == '1' else 'tv'
            
            print(f"\n🔍 Buscando {tipo_tmdb}s de género '{genero}'...")
            resultados = buscar_por_genero_tmdb(genero, tipo_tmdb, cantidad=8)
            
            if resultados:
                print(f"\n✅ Encontrados {len(resultados)} resultados:")
                for i, item in enumerate(resultados, 1):
                    print(f"  {i}. {item['titulo']} ({item['año']}) - 🎭 {item['genero']}")
                
                # Preguntar cuántos añadir
                print(f"\n¿Cuántos elementos deseas añadir? (1-{len(resultados)})")
                cantidad = input(f"O [A] para añadir todos, [0] para cancelar: ").strip().lower()
                
                if cantidad == '0':
                    continue
                elif cantidad == 'a':
                    count = integrar_con_panel(resultados, peliculas, anadidos)
                    print(f"\n✅ Se añadieron {count} elementos")
                else:
                    try:
                        num = int(cantidad)
                        if 1 <= num <= len(resultados):
                            seleccionados = resultados[:num]
                            count = integrar_con_panel(seleccionados, peliculas, anadidos)
                            print(f"\n✅ Se añadieron {count} elementos")
                    except:
                        print("❌ Número inválido")
        
        elif opcion == '3':
            # Tendencias
            tipo = input("\n🎭 Tipo (1=Película, 2=Serie): ").strip()
            tipo_tmdb = 'movie' if tipo == '1' else 'tv'
            
            print(f"\n🔥 Buscando tendencias...")
            resultados = buscar_tendencias_tmdb(tipo_tmdb, cantidad=6)
            
            if resultados:
                print(f"\n🔥 TENDENCIAS DEL DÍA:")
                for i, item in enumerate(resultados, 1):
                    print(f"  {i}. {item['titulo']} ({item['año']}) 🔥 {item.get('popularidad', 0)}")
                
                if input("\n¿Añadir todas las tendencias? (s/n): ").lower() == 's':
                    count = integrar_con_panel(resultados, peliculas, anadidos)
                    print(f"\n✅ Se añadieron {count} tendencias")
        
        elif opcion == '4':
            # Populares
            tipo = input("\n🎭 Tipo (1=Película, 2=Serie): ").strip()
            tipo_tmdb = 'movie' if tipo == '1' else 'tv'
            
            print(f"\n⭐ Buscando contenido popular...")
            resultados = buscar_populares_tmdb(tipo_tmdb, cantidad=6)
            
            if resultados:
                print(f"\n⭐ CONTENIDO POPULAR:")
                for i, item in enumerate(resultados, 1):
                    print(f"  {i}. {item['titulo']} ({item['año']}) ⭐ {item['calificacion']}")
                
                if input("\n¿Añadir todo el contenido popular? (s/n): ").lower() == 's':
                    count = integrar_con_panel(resultados, peliculas, anadidos)
                    print(f"\n✅ Se añadieron {count} elementos populares")
        
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
                    count = integrar_con_panel(resultados, peliculas, anadidos)
                    print(f"\n✅ Se importaron {count} elementos desde {archivo}")
            
            except Exception as e:
                print(f"❌ Error al importar: {e}")
        
        input("\n⏎ Presiona Enter para continuar...")


# --- Funciones de búsqueda en TMDb (movidas aquí para encapsulación) ---

def _extraer_info_comun(item, tipo):
    """Función auxiliar para extraer datos comunes de películas y series."""
    if tipo == 'movie':
        info = tmdb.Movies(item['id']).info(language='es-ES', append_to_response='credits')
        titulo = info.get('title', 'N/A')
        año = int(info.get('release_date', '0-0-0')[:4]) if info.get('release_date') else 0
        director = next((c['name'] for c in info.get('credits', {}).get('crew', []) if c['job'] == 'Director'), 'N/A')
    else: # tv
        info = tmdb.TV(item['id']).info(language='es-ES', append_to_response='credits')
        titulo = info.get('name', 'N/A')
        año = int(info.get('first_air_date', '0-0-0')[:4]) if info.get('first_air_date') else 0
        creadores = info.get('created_by', [])
        director = creadores[0]['name'] if creadores else 'N/A'

    return {
        'tmdb_id': item['id'],
        'titulo': titulo,
        'descripcion': info.get('overview', ''),
        'poster': f"https://image.tmdb.org/t/p/w500{info.get('poster_path', '')}" if info.get('poster_path') else '',
        'año': año,
        'genero': ", ".join([g['name'] for g in info.get('genres', [])]),
        'reparto': [c['name'] for c in info.get('credits', {}).get('cast', [])[:5]],
        'calificacion': info.get('vote_average', 0),
        'idioma_original': info.get('original_language', ''),
        'popularidad': info.get('popularity', 0),
        'director': director,
        'tipo': tipo
    }

def buscar_contenido_tmdb(query, tipo='movie', cantidad=5):
    """Busca contenido por título."""
    try:
        search = tmdb.Search()
        if tipo == 'movie':
            search.movie(query=query, language='es-ES')
        else:
            search.tv(query=query, language='es-ES')
        
        resultados = []
        for item in search.results[:cantidad]:
            resultados.append(_extraer_info_comun(item, tipo))
        return resultados
    except Exception as e:
        print(f"❌ Error en TMDb (buscar_contenido): {e}")
        return []

def buscar_por_genero_tmdb(genero_nombre, tipo='movie', cantidad=5):
    """Busca contenido por género."""
    try:
        # 1. Obtener el ID del género
        genres = tmdb.Genres()
        lista_generos = genres.movie_list(language='es-ES') if tipo == 'movie' else genres.tv_list(language='es-ES')
        
        genero_id = None
        for g in lista_generos['genres']:
            if g['name'].lower() == genero_nombre.lower():
                genero_id = g['id']
                break
        
        if not genero_id:
            print(f"⚠️ Género '{genero_nombre}' no encontrado.")
            return []

        # 2. Descubrir contenido con ese género
        discover = tmdb.Discover()
        if tipo == 'movie':
            response = discover.movie(with_genres=str(genero_id), language='es-ES', sort_by='popularity.desc')
        else:
            response = discover.tv(with_genres=str(genero_id), language='es-ES', sort_by='popularity.desc')
            
        resultados = []
        for item in response['results'][:cantidad]:
            resultados.append(_extraer_info_comun(item, tipo))
        return resultados
    except Exception as e:
        print(f"❌ Error en TMDb (buscar_por_genero): {e}")
        return []

def buscar_tendencias_tmdb(tipo='movie', cantidad=5):
    """Busca las tendencias del día."""
    try:
        trending = tmdb.Trending()
        response = trending.info(media_type=tipo, time_window='day')
        
        resultados = []
        for item in response['results'][:cantidad]:
            resultados.append(_extraer_info_comun(item, tipo))
        return resultados
    except Exception as e:
        print(f"❌ Error en TMDb (buscar_tendencias): {e}")
        return []

def buscar_populares_tmdb(tipo='movie', cantidad=5):
    """Busca el contenido más popular."""
    try:
        if tipo == 'movie':
            populares = tmdb.Movies().popular(language='es-ES')
        else:
            populares = tmdb.TV().popular(language='es-ES')
            
        resultados = []
        for item in populares['results'][:cantidad]:
            resultados.append(_extraer_info_comun(item, tipo))
        return resultados
    except Exception as e:
        print(f"❌ Error en TMDb (buscar_populares): {e}")
        return []