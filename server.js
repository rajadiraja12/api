// server.js - Jalankan di local tanpa Netlify CLI
const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('.'));

// Endpoint AI chat (mock atau pake Groq langsung)
app.post('/api/chat', async (req, res) => {
    const { messages } = req.body;
    const userMsg = messages?.find(m => m.role === 'user')?.content || '';
    
    // Mock response kasar (gak butuh API key)
    const rudeResponses = [
        `Woi dasar goblok! ${userMsg.substring(0,30)}? lu pikir gue peduli? hahaha sialan!`,
        `Heh tolol, gue gak punya waktu buat lu. Cari sendiri jawabannya, bego!`,
        `Brengsek! lu nanya itu? gampang banget, tapi males gue bantu.`,
        `Dasar kampret! jawabannya: GAK TAU!`,
        `Sial, lu ganggu gue. goblok banget sih lu!`
    ];
    const randomRude = rudeResponses[Math.floor(Math.random() * rudeResponses.length)];
    
    res.json({
        choices: [{ message: { content: randomRude } }]
    });
});

app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`⚠️  Mode mock response (kasar ala Rudy AI)`);
    console.log(`💬 Buka browser ke http://localhost:${PORT}`);
});