// Baseline agronomic reference data for Kenyan soil types.
// yieldPerAcreKg values are conservative average estimates (bags-to-kg converted)
// sourced from Kenya Ministry of Agriculture extension guides. Meant as a starting
// heuristic — replace/extend via the SoilProfile DB table as real regional data
// (KALRO, county agriculture office figures) is collected.

const SOIL_CROP_DATA = {
  Loam: {
    description:
      'Well-balanced sand/silt/clay mix, good drainage and nutrient retention. Common in Central and Rift Valley highlands.',
    crops: [
      { crop: 'Maize', suitability: 'Excellent', yieldPerAcreKg: 2200 },
      { crop: 'Beans', suitability: 'Excellent', yieldPerAcreKg: 600 },
      { crop: 'Irish Potato', suitability: 'Good', yieldPerAcreKg: 8000 },
      { crop: 'Tomato', suitability: 'Good', yieldPerAcreKg: 12000 },
    ],
  },
  Clay: {
    description:
      'Heavy, water-retentive soil, common in parts of Nyanza and Western Kenya. Needs good drainage management.',
    crops: [
      { crop: 'Rice', suitability: 'Excellent', yieldPerAcreKg: 1800 },
      { crop: 'Sugarcane', suitability: 'Excellent', yieldPerAcreKg: 40000 },
      { crop: 'Maize', suitability: 'Moderate', yieldPerAcreKg: 1600 },
    ],
  },
  Sandy: {
    description:
      'Fast-draining, low nutrient retention, common in parts of Eastern and Coastal Kenya. Needs organic matter/manure.',
    crops: [
      { crop: 'Cassava', suitability: 'Excellent', yieldPerAcreKg: 6000 },
      { crop: 'Groundnuts', suitability: 'Good', yieldPerAcreKg: 800 },
      { crop: 'Cashew Nut', suitability: 'Good', yieldPerAcreKg: 500 },
      { crop: 'Watermelon', suitability: 'Good', yieldPerAcreKg: 10000 },
    ],
  },
  Silt: {
    description:
      'Fertile, fine-particled, holds moisture well. Found along river valleys (e.g. Tana, Nzoia basins).',
    crops: [
      { crop: 'Sukuma Wiki (Kale)', suitability: 'Excellent', yieldPerAcreKg: 9000 },
      { crop: 'Onions', suitability: 'Excellent', yieldPerAcreKg: 7000 },
      { crop: 'Maize', suitability: 'Good', yieldPerAcreKg: 2000 },
    ],
  },
  'Volcanic (Andosol)': {
    description:
      'Rich in organic matter and minerals, found around Mt. Kenya, Rift Valley and Mt. Elgon slopes. Highly fertile.',
    crops: [
      { crop: 'Coffee', suitability: 'Excellent', yieldPerAcreKg: 800 },
      { crop: 'Tea', suitability: 'Excellent', yieldPerAcreKg: 2500 },
      { crop: 'Irish Potato', suitability: 'Excellent', yieldPerAcreKg: 9000 },
      { crop: 'Carrots', suitability: 'Good', yieldPerAcreKg: 10000 },
    ],
  },
};

const VALID_SOIL_TYPES = Object.keys(SOIL_CROP_DATA);

/**
 * Compute crop + yield recommendations scaled to the farmer's acreage.
 * @param {string} soilType
 * @param {number} acreage
 */
function getRecommendations(soilType, acreage) {
  const profile = SOIL_CROP_DATA[soilType];
  if (!profile) return null;

  const scaled = profile.crops.map((c) => ({
    crop: c.crop,
    suitability: c.suitability,
    estimatedYieldKg: Math.round(c.yieldPerAcreKg * acreage),
    perAcreReferenceKg: c.yieldPerAcreKg,
  }));

  return {
    soilType,
    description: profile.description,
    acreage,
    recommendations: scaled,
  };
}

module.exports = { SOIL_CROP_DATA, VALID_SOIL_TYPES, getRecommendations };
