
const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Crear una nueva instancia del cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// Evento que se ejecuta cuando el cliente está listo (solo una vez)
client.once('ready', async () => {
    console.log('Cliente de WhatsApp está listo!');
});

// Evento que se ejecuta cuando se recibe el código QR para escanear
client.on('qr', (qr) => {
    console.log('Escanea este código QR con tu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// Este array almacenará las fotos que se enviarán.
let fotos = [];

// Procesar los mensajes entrantes.
client.on('message', async (msg) => {
  
  // Bloque para manejar el comando '!send' y enviar las fotos acumuladas a los grupos.
  if (msg.fromMe && msg.body === '!send') {
    
    // Elimina el mensaje '!send'
    await msg.delete(true);
    
    // Itera sobre el array 'fotos' en bloques de 5 para procesar y enviar las imágenes.
    for (let i = 0; i < fotos.length; i += 5) {
      
      // Divide el array en "chunks" de hasta 5 fotos.
      const chunk = fotos.slice(i, i + 5);
      
      // Itera sobre cada foto dentro del chunk actual.
      for (const foto of chunk) {
        
        // Obtiene el objeto de medios (MediaObject) de la foto.
        const media = foto.media;
        
        // Obtiene el texto (caption) asociado a la foto.
        const caption = foto.caption;
        
        try {
          // Obtiene todos los chats del cliente de WhatsApp.
          const chats = await client.getChats();
          
          // Filtra los chats para obtener solo los que son grupos.
          const groups = chats.filter((chat) => chat.isGroup);
          
          // Itera sobre cada grupo encontrado.
          for (const group of groups) {
            // Envía la foto (media) con su texto (caption) al grupo actual.
            await client.sendMessage(group.id._serialized, media, { caption: caption });
          }
        } catch (error) {
          console.error('Error enviando mensaje:', error);
        }
      }
      
      // Introduce una pausa aleatoria entre el envío de cada chunk de fotos entre 6 y 10 segundos.
      await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * (10000 - 6000 + 1)) + 6000));
    }
    
    // Una vez que todas las fotos han sido enviadas, vacía el array 'fotos'.
    fotos = [];
    console.log('Todas las fotos han sido enviadas a los grupos.');
  }
  
  // Bloque para manejar los mensajes que contienen archivos multimedia (fotos/videos) en el chat actual.
  else if (msg.hasMedia && msg.from === client.info.wid._serialized) {
    
    try {
      // Descarga el contenido multimedia del mensaje.
      const media = await msg.downloadMedia();
      
      // Añade el objeto de medios y su texto (caption) al array 'fotos'.
      fotos.push({ media: media, caption: msg.body });
      console.log(`Foto agregada al array. Total: ${fotos.length}`);
    } catch (error) {
      console.error('Error descargando media:', error);
    }
  }
});

// Manejo de errores
client.on('auth_failure', msg => {
    console.error('Error de autenticación:', msg);
});

client.on('disconnected', (reason) => {
    console.log('Cliente desconectado:', reason);
});

console.log('Iniciando cliente de WhatsApp Web...');

// Inicializar el cliente de WhatsApp
client.initialize();
