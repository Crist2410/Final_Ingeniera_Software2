const express = require('express');
require('isomorphic-fetch');

const app = express();
app.use(express.json());

const daprPort = process.env.DAPR_HTTP_PORT || 3500;
const stateStoreName = `statestore`;
const stateUrl = `http://localhost:${daprPort}/v1.0/state/${stateStoreName}`;

const secretStoreName  = "statesecrets";
const secretName = 'mysecret'
const secretsUrl = `http://localhost:${daprPort}/v1.0/secrets/${secretStoreName}`;

const port = process.env.APP_PORT ?? '3000';

let candidatos = [];
let votantes = [];
let votaciones = [];
let fase = 1;

app.post('/candidato', async (req, res) => {
    const data = req.body.data;
    const candidatoId = data.candidatoId;
    console.log("Got a new candidato! Candidato ID: " + candidatoId);

    candidatos.push(data);

    const state = [{
        key: "candidatos",
        value: candidatos
    }];

    try {

        if(fase == 1){
            const response = await fetch(stateUrl, {
                method: "POST",
                body: JSON.stringify(state),
                headers: {
                    "Content-Type": "application/json"
                }
            });
            if (!response.ok) {
                throw "Failed to persist state.";
            }
            console.log("Successfully persisted state.");
            res.status(200).send();
        }else{
            console.log("Ya se cerro la fase de votación");
            res.status(400).json({message: "Ya se cerro la fase de votación"});
        }
    } catch (error) {
        console.log(error);
        res.status(500).send({message: error});
    }
});

app.get('/candidato', async (_req, res) => {
    try {
        const response = await fetch(`${stateUrl}/candidato`);
        if (!response.ok) {
            throw "Could not get state.";
        }
        const orders = await response.text();
        res.send(orders);
    }
    catch (error) {
        console.log(error);
        res.status(500).send({message: error});
    }
});

app.get('/candidatos', async (_req, res) => {
    try {
        res.send(candidatos);
    }
    catch (error) {
        console.log(error);
        res.status(500).send({message: error});
    }
});

app.post('/voto', async (req, res) => {
    const data = req.body.data;
    const votoId = data.candidatoId;
    const ip = req.socket.remoteAddress;

    console.log(`IP origen: ${ip}`);
    console.log("Got a new voto! Voto ID: " + votoId);


    const existingVotante = votantes.find(votante => votante.dpi === req.body.dpi);

    if (existingVotante) {
        console.log(`El votante con DPI ${req.body.dpi} o IP ${ip} ya votó.`);
        res.status(400).json({message: "El votante ya votó."});
        return;
    }

    votante = {
        dpi: req.body.dpi,
        ip: ip
    }

    votantes.push(votante);

    votaciones = candidatos.map(candidato => {
        if (candidato.candidatoId === votoId) {
          return {
            ...candidato,
            votos: (candidato.votos || 0) + 1
          };
        }
        return candidato;
    });

    const state = [{
        key: "votaciones",
        value: votaciones
    }];

    try {
        if(fase == 3){
            const response = await fetch(stateUrl, {
                method: "POST",
                body: JSON.stringify(state),
                headers: {
                    "Content-Type": "application/json"
                }
            });
            if (!response.ok) {
                throw "Failed to persist state.";
            }
            console.log("Successfully persisted state.");
            res.status(200).send();
        }else{
            console.log("Aún no se cierra la fase de candidatos");
            res.status(400).json({message: "Aún no se cierra la fase de candidatos"});
        }
    } catch (error) {
        console.log(error);
        res.status(500).send({message: error});
    }
});

app.get('/voto', async (_req, res) => {
    try {
        const response = await fetch(`${stateUrl}/candidato`);
        if (!response.ok) {
            throw "Could not get state.";
        }
        const orders = await response.text();
        res.send(orders);
    }
    catch (error) {
        console.log(error);
        res.status(500).send({message: error});
    }
});

app.get('/votantes', async (_req, res) => {
    try {
        res.send(votantes);
    }
    catch (error) {
        console.log(error);
        res.status(500).send({message: error});
    }
});

app.get('/fase/:id', async (req, res) => {

    fase = req.params.id;

    try {
        res.status(200).json({fase: fase})
    }
    catch (error) {
        console.log(error);
        res.status(500).send({message: error});
    }
});

app.listen(port, () => console.log(`Node App listening on port ${port}!`));
