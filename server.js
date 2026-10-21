const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let gameState = {
    status: 'aguardando', // 'aguardando', 'rodando', 'votacao_encerrada', 'resultado'
    cantor: '',
    artista: '',
    musica: '',
    jurados: {}, // socketId -> { nome, virou: false }
    historico: []
};

io.on('connection', (socket) => {
    socket.emit('updateState', gameState);

    socket.on('registrarJurado', (nome) => {
        gameState.jurados[socket.id] = { nome: nome, virou: false };
        io.emit('updateState', gameState);
    });

    socket.on('iniciarRodada', (data) => {
        gameState.status = 'rodando';
        gameState.cantor = data.cantor;
        gameState.artista = data.artista;
        gameState.musica = data.musica;
        
        for (let id in gameState.jurados) {
            gameState.jurados[id].virou = false;
        }
        
        io.emit('updateState', gameState);
    });

    socket.on('virarCadeira', () => {
        if (gameState.status === 'rodando' && gameState.jurados[socket.id]) {
            gameState.jurados[socket.id].virou = true;
            io.emit('updateState', gameState);
            io.emit('cadeiraVirou', { socketId: socket.id, nome: gameState.jurados[socket.id].nome });
        }
    });

    socket.on('encerrarVotacao', () => {
        gameState.status = 'votacao_encerrada';
        io.emit('updateState', gameState);
    });

    socket.on('mostrarResultado', () => {
        gameState.status = 'resultado';
        io.emit('updateState', gameState);
        io.emit('tocarSomResultado');
    });

    socket.on('finalizarRodada', () => {
        const totalJurados = Object.keys(gameState.jurados).length;
        const viraramCount = Object.values(gameState.jurados).filter(j => j.virou).length;

        if (gameState.cantor || gameState.musica) {
            const resumoRodada = {
                cantor: gameState.cantor,
                artista: gameState.artista,
                musica: gameState.musica,
                viraramCount: viraramCount,
                totalJurados: totalJurados,
                juradosDetalhados: Object.values(gameState.jurados).map(j => ({ nome: j.nome, virou: j.virou })),
                dataHora: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            };
            gameState.historico.unshift(resumoRodada);
        }
        
        gameState.status = 'aguardando';
        gameState.cantor = '';
        gameState.artista = '';
        gameState.musica = '';

        for (let id in gameState.jurados) {
            gameState.jurados[id].virou = false;
        }

        io.emit('updateState', gameState);
    });

    socket.on('disconnect', () => {
        if (gameState.jurados[socket.id]) {
            delete gameState.jurados[socket.id];
            io.emit('updateState', gameState);
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Servidor The Voice rodando na porta ${PORT}`);
});
