import os

# Configuration for all pages
# Each item: (filename_html, filename_js, title, data_page, hero_title, hero_desc, grid_id, filter_logic_js)
CONFIG = [
    {
        "html_file": "accion.html",
        "js_file": "accion.js",
        "page_title": "Acción - PELIXPLUSHD",
        "body_data_page": "accion",
        "hero_title": "Películas de Acción",
        "hero_desc": "La mejor selección de cine de acción, explosiones y adrenalina.",
        "grid_id": "accion-grid",
        "filter_logic": "const cat = Array.isArray(p.categoria) ? p.categoria : [String(p.categoria)]; return cat.map(c=>c.toLowerCase()).includes('accion');",
        "nav_active_mobile": "nav-item", # handled dynamically or hardcoded if needed
        "nav_home": "",
        "nav_series": "",
        "nav_lanzamientos": "",
        "nav_favoritos": ""
    },
    {
        "html_file": "terror.html",
        "js_file": "terror.js",
        "page_title": "Terror - PELIXPLUSHD",
        "body_data_page": "terror",
        "hero_title": "Cine de Terror",
        "hero_desc": "Las películas más aterradoras para no dormir esta noche.",
        "grid_id": "terror-grid",
        "filter_logic": "const cat = Array.isArray(p.categoria) ? p.categoria : [String(p.categoria)]; return cat.map(c=>c.toLowerCase()).includes('terror');",
        "nav_home": "", "nav_series": "", "nav_lanzamientos": "", "nav_favoritos": ""
    },
    {
        "html_file": "comedia.html",
        "js_file": "comedia.js",
        "page_title": "Comedia - PELIXPLUSHD",
        "body_data_page": "comedia",
        "hero_title": "Comedia",
        "hero_desc": "Risas aseguradas con las mejores comedias de todos los tiempos.",
        "grid_id": "comedia-grid",
        "filter_logic": "const cat = Array.isArray(p.categoria) ? p.categoria : [String(p.categoria)]; return cat.map(c=>c.toLowerCase()).includes('comedia');",
        "nav_home": "", "nav_series": "", "nav_lanzamientos": "", "nav_favoritos": ""
    },
    {
        "html_file": "aventura.html",
        "js_file": "aventura.js",
        "page_title": "Aventura - PELIXPLUSHD",
        "body_data_page": "aventura",
        "hero_title": "Aventura",
        "hero_desc": "Explora nuevos mundos y vive grandes historias.",
        "grid_id": "aventura-grid",
        "filter_logic": "const cat = Array.isArray(p.categoria) ? p.categoria : [String(p.categoria)]; return cat.map(c=>c.toLowerCase()).includes('aventura');",
        "nav_home": "", "nav_series": "", "nav_lanzamientos": "", "nav_favoritos": ""
    },
    {
        "html_file": "drama.html",
        "js_file": "drama.js",
        "page_title": "Drama - PELIXPLUSHD",
        "body_data_page": "drama",
        "hero_title": "Drama",
        "hero_desc": "Historias conmovedoras que tocan el corazón.",
        "grid_id": "drama-grid",
        "filter_logic": "const cat = Array.isArray(p.categoria) ? p.categoria : [String(p.categoria)]; return cat.map(c=>c.toLowerCase()).includes('drama');",
        "nav_home": "", "nav_series": "", "nav_lanzamientos": "", "nav_favoritos": ""
    },
    {
        "html_file": "anime.html",
        "js_file": "anime.js",
        "page_title": "Anime - PELIXPLUSHD",
        "body_data_page": "anime",
        "hero_title": "Anime",
        "hero_desc": "Lo mejor de la animación japonesa en HD.",
        "grid_id": "anime-grid",
        "filter_logic": "const cat = Array.isArray(p.categoria) ? p.categoria : [String(p.categoria)]; return cat.map(c=>c.toLowerCase()).includes('anime');",
        "nav_home": "", "nav_series": "", "nav_lanzamientos": "", "nav_favoritos": ""
    },
    {
        "html_file": "documental.html",
        "js_file": "documental.js",
        "page_title": "Documentales - PELIXPLUSHD",
        "body_data_page": "documental",
        "hero_title": "Documentales",
        "hero_desc": "Aprende y descubre la realidad de nuestro mundo.",
        "grid_id": "documental-grid",
        "filter_logic": "const cat = Array.isArray(p.categoria) ? p.categoria : [String(p.categoria)]; return cat.map(c=>c.toLowerCase()).includes('documental');",
        "nav_home": "", "nav_series": "", "nav_lanzamientos": "", "nav_favoritos": ""
    },
    {
        "html_file": "series.html",
        "js_file": "series.js",
        "page_title": "Series - PELIXPLUSHD",
        "body_data_page": "series",
        "hero_title": "Series de TV",
        "hero_desc": "Maratonea tus series favoritas sin límites.",
        "grid_id": "series-grid-new", # Preserving ID in JS/HTML but mapping it here
        "filter_logic": "return p.tipo === 'serie';",
        "nav_home": "", "nav_series": "active", "nav_lanzamientos": "", "nav_favoritos": ""
    },
    {
        "html_file": "todo-lo-nuevo-2025.html",
        "js_file": "todo-lo-nuevo-2025.js",
        "page_title": "Estrenos 2025 - PELIXPLUSHD",
        "body_data_page": "2025",
        "hero_title": "Todo lo Nuevo 2025",
        "hero_desc": "El futuro del cine, hoy. Los estrenos más esperados del 2025.",
        "grid_id": "todo-lo-nuevo-2025-grid-new",
        "filter_logic": "return p.año === 2025 && p.tipo === 'pelicula';",
        "nav_home": "", "nav_series": "", "nav_lanzamientos": "", "nav_favoritos": ""
    }
]

def main():
    with open('_generator_template.html', 'r', encoding='utf-8') as f:
        html_template = f.read()
    
    with open('_generator_template.js', 'r', encoding='utf-8') as f:
        js_template = f.read()

    for page in CONFIG:
        print(f"Generating {page['html_file']} and {page['js_file']}...")
        
        # Prepare params
        html_content = html_template.replace('{PAGE_TITLE}', page['page_title'])
        html_content = html_content.replace('{BODY_DATA_PAGE}', page['body_data_page'])
        html_content = html_content.replace('{HERO_TITLE}', page['hero_title'])
        html_content = html_content.replace('{HERO_DESC}', page['hero_desc'])
        html_content = html_content.replace('{GRID_ID}', page['grid_id'])
        html_content = html_content.replace('{SCRIPT_SRC}', page['js_file'].replace('.js', '')) # Script tag src
        
        # Nav actives
        html_content = html_content.replace('{NAV_HOME}', page['nav_home'])
        html_content = html_content.replace('{NAV_SERIES}', page['nav_series'])
        html_content = html_content.replace('{NAV_LANZAMIENTOS}', page['nav_lanzamientos'])
        html_content = html_content.replace('{NAV_FAVORITOS}', page['nav_favoritos'])
        
        # Mobile specific tweak if needed, otherwise empty
        if page['html_file'] == "lanzamientos.html":
             html_content = html_content.replace('{NAV_LANZAMIENTOS_MOBILE}', 'nav-item active')
        else:
             html_content = html_content.replace('{NAV_LANZAMIENTOS_MOBILE}', 'nav-item')

        # JS Content
        js_content = js_template.replace('{GRID_ID}', page['grid_id'])
        js_content = js_content.replace('{FILTER_LOGIC}', page['filter_logic'])
        js_content = js_content.replace('{PAGE_DESC}', page['html_file'])
        js_content = js_content.replace('{SCRIPT_NAME}', page['js_file'])

        # Write files
        with open(page['html_file'], 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        with open(page['js_file'], 'w', encoding='utf-8') as f:
            f.write(js_content)

if __name__ == "__main__":
    main()
