const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const mqtt = require('mqtt');

router.use(express.json());

const mqttClient = mqtt.connect('mqtt://localhost:1883');

mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
});

mqttClient.on('error',(err) => {
    console.log('MQTT Error:', err.message || err);
});

router.get('/', function(req, res, next) {
    res.render('index', { title: 'Data-Logger' });
});

// ==========================================
// RUTA POST
// ==========================================
router.post('/record', function(req, res, next) {
    const now = new Date();
    const payload = req.body;

    const id_nodo = payload.sensor_id;
    const datos = payload.datos;

    const mensajeMQTT = {
        id_nodo: id_nodo,
        timestamp: now.getTime(),
        temperatura: datos.temperatura,
        humedad: datos.humedad,
        co2: datos.co2,
        volatiles: datos.volatiles
    };

    mqttClient.publish('sensores/datos', JSON.stringify(mensajeMQTT), (err) => {
        if (err) console.log('Error al publicar en MQTT:', err.message);
        else console.log('Publicado en MQTT (POST):', JSON.stringify(mensajeMQTT));
    });

    const mesActual = now.getMonth() + 1;
    const logfile_name = path.join(__dirname, '../public/logs/', id_nodo + "-" + now.getFullYear() + "-" + mesActual + "-" + now.getDate() + '.csv');

    const content = `${id_nodo};${now.getTime()};${datos.temperatura};${datos.humedad};${datos.co2};${datos.volatiles}\r\n`;

    fs.stat(logfile_name, function(err, stat) {
        if(err == null) {
            append2file(logfile_name, content);
        } else if(err.code === 'ENOENT') {
            let headers = 'id_nodo;timestamp;temperatura;humedad;CO2;volatiles\r\n';
            append2file(logfile_name, headers + content);
        } else {
            console.log('Some other error: ', err.code);
        }
    });

    res.status(200).send("Datos recibidos por POST y procesados.");
});

// ==========================================
// RUTA GET
// ==========================================
router.get('/record', function(req, res, next) {
    const now = new Date();

    let payload;
    try {
        payload = JSON.parse(req.query.data);
    } catch (e) {
        return res.status(400).send("Bad Request: falta parámetro data o JSON inválido");
    }

    const id_nodo = payload.sensor_id;
    const datos = payload.datos;

    const mensajeMQTT = {
        id_nodo: id_nodo,
        timestamp: now.getTime(),
        temperatura: datos.temperatura,
        humedad: datos.humedad,
        co2: datos.co2,
        volatiles: datos.volatiles
    };

    mqttClient.publish('sensores/datos', JSON.stringify(mensajeMQTT), (err) => {
        if (err) console.log('Error al publicar en MQTT:', err.message);
        else console.log('Publicado en MQTT (GET):', JSON.stringify(mensajeMQTT));
    });

    const mesActual = now.getMonth() + 1;
    const logfile_name = path.join(__dirname, '../public/logs/', id_nodo + "-" + now.getFullYear() + "-" + mesActual + "-" + now.getDate() + '.csv');

    const content = `${id_nodo};${now.getTime()};${datos.temperatura};${datos.humedad};${datos.co2};${datos.volatiles}\r\n`;

    fs.stat(logfile_name, function(err, stat) {
        if(err == null) {
            append2file(logfile_name, content);
        } else if(err.code === 'ENOENT') {
            let headers = 'id_nodo;timestamp;temperatura;humedad;CO2;volatiles\r\n';
            append2file(logfile_name, headers + content);
        } else {
            console.log('Some other error: ', err.code);
        }
    });

    res.send("Datos recibidos por GET y procesados.");
});

function append2file(file2append, content){
    fs.appendFile(file2append, content, function (err) {
        if (err) throw err;
    });
}

module.exports = router;