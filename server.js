const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());

// Cache para melhor performance
let cache = {
    channels: null,
    lastUpdate: null
};

// Função para parsear lista M3U
function parseM3U(content) {
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = null;

    for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('#EXTINF:')) {
            currentChannel = {
                name: '',
                logo: '',
                group: '',
                url: ''
            };

            // Extrair nome
            const nameMatch = trimmedLine.match(/,(.*)$/);
            if (nameMatch) currentChannel.name = nameMatch[1].trim();

            // Extrair logo
            const logoMatch = trimmedLine.match(/tvg-logo="([^"]*)"/);
            if (logoMatch) currentChannel.logo = logoMatch[1];

            // Extrair grupo
            const groupMatch = trimmedLine.match(/group-title="([^"]*)"/);
            if (groupMatch) currentChannel.group = groupMatch[1];

        } else if (trimmedLine.startsWith('http') && currentChannel) {
            currentChannel.url = trimmedLine;
            channels.push(currentChannel);
            currentChannel = null;
        }
    }

    return channels;
}

// Rota para buscar e analisar lista IPTV
app.get('/api/playlist', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'URL não fornecida' });
        }

        // Verificar cache (5 minutos)
        if (cache.channels && cache.lastUpdate && (Date.now() - cache.lastUpdate) < 300000) {
            return res.json(cache.channels);
        }

        const response = await axios.get(url, { timeout: 10000 });
        const channels = parseM3U(response.data);

        // Atualizar cache
        cache = {
            channels: channels,
            lastUpdate: Date.now()
        };

        res.json(channels);

    } catch (error) {
        console.error('Erro:', error.message);
        res.status(500).json({ error: 'Erro ao processar a lista' });
    }
});

// Rota para servir o frontend
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
