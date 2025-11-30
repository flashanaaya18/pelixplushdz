import json
import os
import re
import time
from datetime import datetime

# --- Clases de Colores (igual que en publicar.py para consistencia) ---
class C:
    HEADER = '\033[95m'; MAGENTA = '\033[95m'; BLUE = '\033[94m'; CYAN = '\033[96m'
    GREEN = '\033[92m'; YELLOW = '\033[93m'; RED = '\033[91m'; ORANGE = '\033[38;5;208m'
    PINK = '\033[38;5;205m'; PURPLE = '\033[38;5;93m'; LIGHT_BLUE = '\033[38;5;117m'; GOLD = '\033[38;5;220m'
    GREY = '\033[90m'; WHITE = '\033[97m'; END = '\033[0m'; BOLD = '\033[1m'; UNDERLINE = '\033[4m'

# --- Constantes ---
JS_FILE = 'peliculas.js'
PROXIMAMENTE_FILE = 'proximamente.json'
REPORTS_FILE = 'reports.json'
MAINTENANCE_FLAG = 'maintenance.flag'
CAMPAIGN_FILE = 'campaña_proximamente.txt'
REFRESH_RATE = 5  # Segundos para refrescar la pantalla

# --- Funciones de Utilidad ---
def limpiar_pantalla():
    """Limpia la pantalla de la consola."""
    os.system('cls' if os.name == 'nt' else 'clear')

def cargar_datos():
    """Carga todos los datos necesarios desde los archivos de la aplicación."""
    datos = {
        'peliculas': [],
        'proximamente': [],
        'reportes': [],
        'mantenimiento': False,
        'campaña': False
    }
    try:
        # Cargar peliculas.js
        with open(JS_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        match = re.search(r'const\s+peliculas\s*=\s*(\[.*?\]);', content, re.DOTALL)
        if match:
            datos['peliculas'] = json.loads(match.group(1))
    except (FileNotFoundError, json.JSONDecodeError):
        pass  # Si falla, se queda como lista vacía

    # Cargar proximamente.json
    try:
        with open(PROXIMAMENTE_FILE, 'r', encoding='utf-8') as f:
            datos['proximamente'] = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        pass

    # Cargar reports.json
    try:
        with open(REPORTS_FILE, 'r', encoding='utf-8') as f:
            datos['reportes'] = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        pass

    # Verificar flags de estado
    datos['mantenimiento'] = os.path.exists(MAINTENANCE_FLAG)
    datos['campaña'] = os.path.exists(CAMPAIGN_FILE)
    
    return datos

def main():
    """Función principal del monitor en tiempo real."""
    try:
        while True:
            limpiar_pantalla()
            datos = cargar_datos()
            
            # --- Banner y Hora ---
            now = datetime.now()
            print(f"{C.BOLD}{C.PURPLE}╔══════════════════════════════════════════════════════════════════════════════╗{C.END}")
            print(f"{C.BOLD}{C.PURPLE}║{C.END}{C.BOLD}{C.GOLD}                      📊✨ MONITOR EN TIEMPO REAL peliXx ✨📊                     {C.END}{C.BOLD}{C.PURPLE}║{C.END}")
            print(f"{C.BOLD}{C.PURPLE}╚══════════════════════════════════════════════════════════════════════════════╝{C.END}")
            print(f"{C.GREY}Última actualización: {now.strftime('%H:%M:%S')} - Refrescando cada {REFRESH_RATE} segundos... (Ctrl+C para salir){C.END}\n")

            # --- Estadísticas Generales ---
            num_peliculas = sum(1 for p in datos['peliculas'] if p.get('tipo') == 'pelicula')
            num_series = len(datos['peliculas']) - num_peliculas
            num_proximamente = len(datos['proximamente'])
            num_reportes = len(datos['reportes'])
            
            print(f"{C.BOLD}{C.CYAN}--- ESTADÍSTICAS GENERALES ---{C.END}")
            print(f"  {C.WHITE}🎬 Películas en Biblioteca: {C.BOLD}{C.GREEN}{num_peliculas}{C.END}")
            print(f"  {C.WHITE}📺 Series en Biblioteca:    {C.BOLD}{C.GREEN}{num_series}{C.END}")
            print(f"  {C.WHITE}🍿 Próximos Estrenos:       {C.BOLD}{C.YELLOW}{num_proximamente}{C.END}")
            
            # Contar enlaces rotos
            enlaces_rotos = sum(1 for p in datos['peliculas'] if p.get('esta_roto'))
            color_rotos = C.RED if enlaces_rotos > 0 else C.GREEN
            print(f"  {C.WHITE}💔 Contenido Roto Marcado:  {C.BOLD}{color_rotos}{enlaces_rotos}{C.END}")

            # --- Estado del Sistema ---
            print(f"\n{C.BOLD}{C.CYAN}--- ESTADO DEL SISTEMA ---{C.END}")
            
            mantenimiento_str = f"{C.RED}ACTIVADO{C.END}" if datos['mantenimiento'] else f"{C.GREEN}INACTIVO{C.END}"
            print(f"  {C.WHITE}🔧 Modo Mantenimiento: {C.BOLD}{mantenimiento_str}{C.END}")
            
            campaña_str = f"{C.GREEN}ACTIVADA{C.END}" if datos['campaña'] else f"{C.YELLOW}INACTIVA{C.END}"
            print(f"  {C.WHITE}🎪 Campaña Próximamente: {C.BOLD}{campaña_str}{C.END}")
            
            color_reportes = C.RED if num_reportes > 0 else C.GREEN
            print(f"  {C.WHITE}🚨 Reportes de Usuarios: {C.BOLD}{color_reportes}{num_reportes}{C.END}")

            # --- Últimos Títulos Añadidos ---
            print(f"\n{C.BOLD}{C.CYAN}--- ÚLTIMOS 5 TÍTULOS AÑADIDOS ---{C.END}")
            if datos['peliculas']:
                ultimos_titulos = sorted(
                    [p for p in datos['peliculas'] if 'addedDate' in p], 
                    key=lambda x: x['addedDate'], 
                    reverse=True
                )[:5]
                
                if not ultimos_titulos:
                    print(f"  {C.GREY}No hay títulos con fecha de adición.{C.END}")
                else:
                    for item in ultimos_titulos:
                        icono = "🎬" if item.get('tipo', 'pelicula') == 'pelicula' else "📺"
                        try:
                            fecha = datetime.fromisoformat(item['addedDate']).strftime('%d/%m/%Y %H:%M')
                        except (ValueError, TypeError):
                            fecha = "Fecha inválida"
                        print(f"  {C.GREY}{fecha} - {icono} {item.get('titulo', 'Sin Título')}{C.END}")
            else:
                print(f"  {C.GREY}No hay contenido en la biblioteca.{C.END}")

            # --- Últimos Reportes de Usuarios ---
            print(f"\n{C.BOLD}{C.CYAN}--- ÚLTIMOS 3 REPORTES DE USUARIOS ---{C.END}")
            if datos['reportes']:
                ultimos_reportes = datos['reportes'][-3:]
                for reporte in reversed(ultimos_reportes):
                    titulo_reportado = reporte.get('movieTitle', 'Título no encontrado')
                    razon = reporte.get('reason', 'Sin razón específica')
                    print(f"  {C.RED}🚨 {titulo_reportado}{C.END} {C.GREY}(Razón: {razon}){C.END}")
            else:
                print(f"  {C.GREEN}No hay reportes pendientes. ¡Todo bien!{C.END}")

            time.sleep(REFRESH_RATE)

    except KeyboardInterrupt:
        print(f"\n\n{C.BOLD}{C.YELLOW}👋 Monitor detenido. ¡Hasta luego!{C.END}")

if __name__ == "__main__":
    main()