const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

app.post('/analyze', async (req, res) => {
  const { image } = req.body;

  try {
    const gptResponse = await openai.createChatCompletion({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Quais produtos aparecem nessa imagem? Liste os nomes." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } },
          ],
        },
      ],
      max_tokens: 300,
    });

    const content = gptResponse.data.choices[0].message.content;
    const items = content.split('\n').filter(line => line.trim() !== '');

    let total = 0;
    for (let item of items) {
      const name = item.replace(/^\d+\.\s*/, '').trim();
      const price = await getPriceFromMercadoLivre(name);
      total += price;
    }

    res.json({ total });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Erro na análise da imagem.' });
  }
});

async function getPriceFromMercadoLivre(query) {
  try {
    const res = await axios.get(`https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}`);
    return res.data.results[0]?.price || 0;
  } catch {
    return 0;
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
