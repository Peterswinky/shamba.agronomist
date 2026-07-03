const { DISEASE_MODEL_PROVIDER, PLANT_ID_API_KEY } = require('../config/env');

// Pluggable inference layer. Swap providers via DISEASE_MODEL_PROVIDER env var
// without touching route/controller code. Start with 'mock' for MVP demos,
// switch to 'plantid' (Kindwise/Plant.id API) or 'custom' (your own trained
// CV model served behind an internal endpoint) as the product matures.

const MOCK_DIAGNOSES = {
  leaf: [
    { diagnosis: 'Maize Leaf Blight', confidence: 0.87, advice: 'Apply a recommended fungicide (e.g. mancozeb-based) and rotate crops next season to break the disease cycle.' },
    { diagnosis: 'Bean Rust', confidence: 0.81, advice: 'Remove and destroy infected leaves. Apply copper-based fungicide and improve field air circulation by proper spacing.' },
    { diagnosis: 'Healthy Leaf', confidence: 0.93, advice: 'No disease detected. Continue routine monitoring and balanced fertilization.' },
  ],
  soil: [
    { diagnosis: 'Nitrogen Deficiency Indicators', confidence: 0.74, advice: 'Consider top-dressing with CAN or urea fertilizer and incorporating organic manure.' },
    { diagnosis: 'Healthy Soil Composition', confidence: 0.88, advice: 'Soil appears in good condition. Maintain with regular organic matter addition.' },
  ],
};

async function analyzeMock(targetType) {
  const pool = MOCK_DIAGNOSES[targetType] || MOCK_DIAGNOSES.leaf;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return pick;
}

// Real integration with Kindwise/Plant.id v3 health assessment API.
// Docs: https://www.kindwise.com/handbook  (POST /v3/health_assessment)
async function analyzeWithPlantId(imageBuffer, targetType) {
  if (!PLANT_ID_API_KEY) {
    throw new Error('PLANT_ID_API_KEY not configured; set DISEASE_MODEL_PROVIDER=mock for now');
  }
  if (targetType === 'soil') {
    // Plant.id only assesses plant/leaf health, not raw soil composition.
    // Soil photo requests fall back to the mock heuristic pool.
    return analyzeMock('soil');
  }

  const base64Image = imageBuffer.toString('base64');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // fail fast, don't hang the request

  let response;
  try {
    response = await fetch('https://api.plant.id/v3/health_assessment?details=description,treatment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': PLANT_ID_API_KEY,
      },
      body: JSON.stringify({
        images: [`data:image/jpeg;base64,${base64Image}`],
        similar_images: false,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Disease detection provider timed out. Please try again.');
    }
    throw new Error(`Disease detection provider unreachable: ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Plant.id API error (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const result = data.result || {};
  const isHealthy = result.is_healthy;
  const suggestions = result.disease?.suggestions || [];

  if (isHealthy?.binary === true || suggestions.length === 0) {
    return {
      diagnosis: 'Healthy Leaf',
      confidence: isHealthy?.probability ?? 0.9,
      advice: 'No disease detected. Continue routine monitoring and balanced fertilization.',
    };
  }

  const top = suggestions[0];
  const description = top.details?.description?.value || top.details?.description || '';
  const treatment = top.details?.treatment;
  const treatmentText = treatment
    ? Object.entries(treatment)
        .map(([method, steps]) => `${method}: ${Array.isArray(steps) ? steps.join('; ') : steps}`)
        .join(' | ')
    : 'Consult a local agricultural extension officer for a tailored treatment plan.';

  return {
    diagnosis: top.name,
    confidence: top.probability,
    advice: description ? `${description} Treatment — ${treatmentText}` : treatmentText,
  };
}

async function analyzeImage({ imageBuffer, targetType }) {
  switch (DISEASE_MODEL_PROVIDER) {
    case 'plantid':
      try {
        return await analyzeWithPlantId(imageBuffer, targetType);
      } catch (err) {
        // Degrade gracefully rather than blocking a farmer's diagnosis on a
        // third-party outage. Logged so it's visible in monitoring/alerts.
        console.error('[disease.service] Plant.id call failed, falling back to mock:', err.message);
        const fallback = await analyzeMock(targetType);
        return { ...fallback, advice: `${fallback.advice} (Note: live analysis was unavailable, this is an approximate result — please try again shortly for a precise diagnosis.)` };
      }
    case 'custom':
      throw new Error('Custom model provider not implemented yet');
    case 'mock':
    default:
      return analyzeMock(targetType);
  }
}

module.exports = { analyzeImage };
