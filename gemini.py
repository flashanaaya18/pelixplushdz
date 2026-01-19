def obtener_info_pelicula(titulo):
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
