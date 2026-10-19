const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Estado Global do Jogo
let gameState = {
    status: 'aguardando', // 'aguardando', 'rodando', 'finalizado'
    cantor: '',
    artista: '',
    musica: '',
    jurados: {}, // socketId -> { nome, virou: false }
    historico: []
};

io.on('connection', (socket) => {
    console.log(`Novo usuário conectado: ${socket.id}`);

    // Envia o estado atual assim que alguém conecta
    socket.emit('updateState', gameState);

    // Registro de Jurado
    socket.on('registrarJurado', (nome) => {
        gameState.jurados[socket.id] = { nome: nome, virou: false };
        io.emit('updateState', gameState);
    });

    // Admin inicia a rodada
    socket.on('iniciarRodada', (data) => {
        gameState.status = 'rodando';
        gameState.cantor = data.cantor;
        gameState.artista = data.artista;
        gameState.musica = data.musica;
        
        // Reseta o status de virada de todos os jurados para a nova música
        for (let id in gameState.jurados) {
            gameState.jurados[id].virou = false;
        }
        
        io.emit('updateState', gameState);
    });

    // Jurado clica para virar a cadeira
    socket.on('virarCadeira', () => {
        if (gameState.status === 'rodando' && gameState.jurados[socket.id]) {
            gameState.jurados[socket.id].virou = true;
            io.emit('updateState', gameState);
            // Avisa todas as telas para disparar o som e efeito da cadeira
            io.emit('cadeiraVirou', socket.id);
        }
    });

    // Admin finaliza a rodada
    socket.on('finalizarRodada', () => {
        gameState.status = 'finalizado';
        
        // Salva no histórico
        const resumoRodada = {
            cantor: gameState.cantor,
            artista: gameState.artista,
            musica: gameState.musica,
            dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            juradosSnapshot: { ...gameState.jurados }
        };
        gameState.historico.unshift(resumoRodada); // Adiciona no topo

        io.emit('updateState', gameState);
    });

    // Desconexão do usuário
    socket.on('disconnect', () => {
        if (gameState.jurados[socket.id]) {
            delete gameState.jurados[socket.id];
            io.emit('updateState', gameState);
        }
        console.log(`Usuário desconectado: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});