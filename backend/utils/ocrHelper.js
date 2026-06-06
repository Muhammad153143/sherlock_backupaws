const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://sherlock-ai-service.onrender.com';

async function extractTextFromImage(imagePath) {
  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));

    const response = await axios.post(`${AI_SERVICE_URL}/ocr`, formData, {
      headers: formData.getHeaders(),
      timeout: 15000
    });

    return {
      ocrText: response.data.normalizedText || response.data.text || "",
      ocrWords: response.data.words || [],
      hasTextInImage: response.data.hasText || false
    };
  } catch (error) {
    console.log('OCR failed but report will continue:', error.message);
    return {
      ocrText: "",
      ocrWords: [],
      hasTextInImage: false
    };
  }
}

function calculateOCRScore(text1, text2) {
  if (!text1 || !text2) return 0;

  const words1 = [...new Set(text1.toLowerCase().split(/\s+/).filter(Boolean))];
  const words2 = [...new Set(text2.toLowerCase().split(/\s+/).filter(Boolean))];

  if (words1.length === 0 || words2.length === 0) return 0;

  const commonWords = words1.filter(word => words2.includes(word));

  return Math.round((commonWords.length / Math.max(words1.length, words2.length)) * 100);
}

module.exports = { extractTextFromImage, calculateOCRScore };
