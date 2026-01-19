/**
 * Configuración para la detección de bloqueadores de anuncios.
 * Estos mensajes y configuraciones se usarán para advertir a los usuarios.
 */
export const adBlockConfig = {
  // Archivo señuelo que los ad-blockers suelen bloquear.
  baitFile: 'ad-detection.js',

  // Mensajes para mostrar al usuario cuando se detecta un bloqueador.
  messages: {
    title: "¡Navega con nosotros!",
    message: "Hemos detectado que podrías estar usando un bloqueador de anuncios. Para asegurar el funcionamiento completo y gratuito de nuestro sitio, te pedimos que consideres desactivarlo. ¡Gracias por tu apoyo!",
    buttonText: "Entendido"
  },

  // Opciones de visualización
  displayOptions: {
    delay: 2000, // Tiempo en milisegundos para esperar antes de verificar.
    position: 'bottom', // 'top' o 'bottom'
    backgroundColor: '#ffc107', // Amarillo advertencia
    textColor: '#333'
  }
};