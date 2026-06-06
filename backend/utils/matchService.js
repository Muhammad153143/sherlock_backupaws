const Item = require('../models/Item');
const axios = require('axios');
const { buildErrorDetails } = require('../utils/aiService');
const { calculateOCRScore } = require('../utils/ocrHelper');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://sherlock-ai-service.onrender.com';
let aiSimilarityErrorLogged = false;

const findMatches = async (newItem) => {
    const matchType = newItem.type === 'lost' ? 'found' : 'lost';
    
    // Basic matching criteria
    const query = {
        type: matchType,
        status: { $in: ['pending', 'verified'] }, // Only match with active items
        category: newItem.category
    };

    // Find items with same category, explicitly selecting imageEmbedding
    const candidates = await Item.find(query).select('+imageEmbedding');

    // Calculate Rule-Based Scores
    let scoredMatches = candidates.map(candidate => {
        let ruleScore = 0;
        let reasons = [];

        // 1. Title/Name Match (Partial/Fuzzy/Token)
        if (candidate.title && newItem.title) {
            const t1 = candidate.title.toLowerCase();
            const t2 = newItem.title.toLowerCase();
            
            if (t1 === t2) {
                ruleScore += 3;
                reasons.push('Exact Title Match');
            } else if (t1.includes(t2) || t2.includes(t1)) {
                ruleScore += 2;
                reasons.push('Partial Title Match');
            } else {
                // Token-based matching
                const tokens1 = t1.split(/\s+/);
                const tokens2 = t2.split(/\s+/);
                const intersection = tokens1.filter(token => tokens2.includes(token));
                
                if (intersection.length > 0) {
                     if (intersection.length >= Math.min(tokens1.length, tokens2.length) / 2) {
                        ruleScore += 2;
                        reasons.push('Significant Keyword Match');
                     } else {
                        ruleScore += 1;
                        reasons.push('Minor Keyword Match');
                     }
                }
            }
        }

        // 2. Color Match (Case insensitive)
        if (candidate.color && newItem.color && 
            candidate.color.toLowerCase() === newItem.color.toLowerCase()) {
            ruleScore += 2;
            reasons.push('Color Match');
        }

        // 3. Location Match (Partial)
        if (candidate.location && newItem.location &&
            (candidate.location.toLowerCase().includes(newItem.location.toLowerCase()) || 
             newItem.location.toLowerCase().includes(candidate.location.toLowerCase()))) {
            ruleScore += 2;
            reasons.push('Location Match');
        }

        // 4. Date Proximity (e.g., within 7 days)
        const dateDiff = Math.abs(new Date(candidate.date) - new Date(newItem.date));
        const daysDiff = Math.ceil(dateDiff / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 7) {
            ruleScore += 1;
            reasons.push('Date Proximity');
        }

        return { candidate, ruleScore, reasons };
    });

    // AI Similarity Calculation
    if (newItem.imageEmbedding && newItem.imageEmbedding.length > 0) {
        // Filter candidates that have embeddings
        const candidatesWithEmbeddings = scoredMatches.filter(m => m.candidate.imageEmbedding && m.candidate.imageEmbedding.length > 0);
        
        if (candidatesWithEmbeddings.length > 0) {
            try {
                const payload = {
                    target: newItem.imageEmbedding,
                    candidates: candidatesWithEmbeddings.map(m => m.candidate.imageEmbedding)
                };

                const aiResponse = await axios.post(`${AI_SERVICE_URL}/similarity`, payload, { timeout: 8000 });
                const similarities = aiResponse.data.scores;

                // Attach similarity to candidates
                candidatesWithEmbeddings.forEach((m, index) => {
                    m.similarity = similarities[index];
                    // Thresholds from spec
                    if (m.similarity >= 0.80) {
                        m.reasons.push(`Strong Visual Match (${(m.similarity * 100).toFixed(1)}%)`);
                    } else if (m.similarity >= 0.60) {
                        m.reasons.push(`Moderate Visual Match (${(m.similarity * 100).toFixed(1)}%)`);
                    }
                });
            } catch (error) {
                const details = buildErrorDetails(error);
                if (!aiSimilarityErrorLogged) {
                    aiSimilarityErrorLogged = true;
                    console.error("AI Similarity Error:", details);
                }
            }
        }
    }

    // OCR Score Calculation
    scoredMatches = scoredMatches.map(m => {
        const ocrScorePercent = calculateOCRScore(newItem.ocrText, m.candidate.ocrText);
        m.ocrScore = ocrScorePercent / 100; // Convert to 0-1 scale
        
        if (ocrScorePercent > 0) {
            m.reasons.push(`OCR Text Match (${ocrScorePercent}%)`);
        }
        
        return m;
    });

    // Final Score Calculation
    scoredMatches = scoredMatches.map(m => {
        // Normalize Rule Score (Max 8)
        const ruleScoreNorm = Math.min(m.ruleScore / 8, 1.0);
        const similarity = m.similarity || 0;
        const ocrScore = m.ocrScore || 0;
        
        // Hybrid Matching Formula: FinalScore = (RuleScore * 0.5) + (ImageSimilarity * 0.3) + (OCR * 0.2)
        let finalScoreValue;
        if (m.similarity !== undefined) {
             finalScoreValue = (ruleScoreNorm * 0.5) + (similarity * 0.3) + (ocrScore * 0.2);
        } else {
             // If no visual data, adjust weights
             finalScoreValue = (ruleScoreNorm * 0.7) + (ocrScore * 0.3);
        }
        
        m.finalScore = finalScoreValue;
        return m;
    });

    // Filter and Sort
    // Threshold: Original was score >= 3 (approx 3/8 = 0.375). 
    // We'll use 0.35 as cutoff.
    return scoredMatches
        .filter(m => m.finalScore >= 0.35)
        .sort((a, b) => b.finalScore - a.finalScore) // Sort by highest score
        .map(m => m.candidate); // Return original items
};

module.exports = { findMatches };
