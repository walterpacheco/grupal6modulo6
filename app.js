const express = require('express');
const nodemailer = require('nodemailer');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Middleware para manejar los datos enviados por el formulario
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Servir el HTML estático
app.use(express.static('public'));

// Configuración de nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',  // Usar Gmail como ejemplo, pero puedes cambiarlo
    auth: {
        user: 'tu-email@gmail.com',
        pass: 'tu-contraseña'
    }
});

// Función para obtener indicadores económicos de mindicador.cl
async function obtenerIndicadores() {
    try {
        const response = await axios.get('https://mindicador.cl/api');
        const { dolar, euro, uf, utm } = response.data;
        return { dolar: dolar.valor, euro: euro.valor, uf: uf.valor, utm: utm.valor };
    } catch (error) {
        console.error('Error al obtener indicadores:', error);
        throw error;
    }
}

// Ruta para procesar el formulario y enviar correos
app.post('/enviar-correo', async (req, res) => {
    const { correos, asunto, mensaje } = req.body;

    try {
        // Obtener indicadores
        const indicadores = await obtenerIndicadores();

        // Crear el contenido del correo concatenando los indicadores
        const contenidoCorreo = `
            ${mensaje}
            ---
            Indicadores económicos:
            - Dólar: $${indicadores.dolar}
            - Euro: €${indicadores.euro}
            - UF: ${indicadores.uf}
            - UTM: ${indicadores.utm}
        `;

        // Dividir los correos por comas
        const listaCorreos = correos.split(',');

        // Enviar correos
        const promesasEnvio = listaCorreos.map(destinatario => {
            return transporter.sendMail({
                from: 'tu-email@gmail.com',
                to: destinatario.trim(),
                subject: asunto,
                text: contenidoCorreo
            });
        });

        // Esperar a que todos los correos sean enviados
        await Promise.all(promesasEnvio);

        // Almacenar cada correo como un archivo
        const identificador = uuidv4();
        const rutaArchivo = path.join(__dirname, 'correos', `${identificador}.txt`);
        fs.writeFileSync(rutaArchivo, contenidoCorreo);

        res.status(200).send('Correos enviados exitosamente.');
    } catch (error) {
        console.error('Error al enviar los correos:', error);
        res.status(500).send('Error al enviar los correos.');
    }
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
