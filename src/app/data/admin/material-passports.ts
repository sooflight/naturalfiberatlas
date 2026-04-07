import type { MaterialPassportRegistry, TaxonomyAliasRegistry } from "../../types/material";

export const MATERIAL_PASSPORTS: MaterialPassportRegistry = {
  "hemp": {
    "materialId": "hemp",
    "status": "published",
    "lastUpdated": "2026-03-10",
    "performance": {
      "strength": {
        "rating": 5,
        "label": "Very High",
        "confidence": "verified",
        "source": "Textile Research Journal, 2023"
      },
      "breathability": {
        "rating": 4,
        "label": "High",
        "confidence": "verified"
      },
      "drape": {
        "rating": 2,
        "label": "Low",
        "confidence": "estimated"
      },
      "absorbency": {
        "rating": 4,
        "label": "High",
        "confidence": "verified"
      },
      "thermalRegulation": {
        "rating": 4,
        "label": "High",
        "confidence": "estimated"
      },
      "durability": {
        "rating": 5,
        "label": "Very High",
        "confidence": "verified"
      },
      "elasticity": {
        "rating": 1,
        "label": "Very Low",
        "confidence": "verified"
      },
      "uvResistance": {
        "rating": 4,
        "label": "High",
        "confidence": "estimated"
      },
      "moistureWicking": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "estimated"
      }
    },
    "process": {
      "spinning": {
        "value": "good",
        "confidence": "verified"
      },
      "weaving": {
        "value": "excellent",
        "confidence": "verified"
      },
      "knitting": {
        "value": "fair",
        "confidence": "estimated"
      },
      "finishing": {
        "value": "good",
        "confidence": "estimated"
      },
      "blending": {
        "value": "Blends well with cotton, silk, and wool",
        "confidence": "verified"
      }
    },
    "dyeing": {
      "compatibility": {
        "value": "good",
        "confidence": "verified"
      },
      "recommendedMethods": {
        "value": [
          "natural dyes",
          "fiber-reactive dyes",
          "vat dyes"
        ],
        "confidence": "verified"
      },
      "fastness": {
        "value": "good",
        "confidence": "estimated"
      },
      "naturalDyeAffinity": {
        "value": "high",
        "confidence": "verified"
      },
      "notes": "Pre-treatment with scouring improves dye uptake significantly."
    },
    "sustainability": {
      "waterUsage": {
        "rating": 4,
        "label": "Low",
        "confidence": "verified",
        "source": "Stockholm Environment Institute"
      },
      "carbonFootprint": {
        "rating": 4,
        "label": "Low",
        "confidence": "estimated"
      },
      "biodegradable": {
        "value": true,
        "confidence": "verified"
      },
      "recyclable": {
        "value": true,
        "confidence": "verified"
      },
      "chemicalProcessing": {
        "rating": 4,
        "label": "Minimal",
        "confidence": "verified"
      },
      "certifications": {
        "value": [
          "GOTS",
          "OEKO-TEX"
        ],
        "confidence": "verified"
      },
      "circularity": {
        "rating": 4,
        "label": "High",
        "confidence": "estimated"
      }
    },
    "sourcing": {
      "primaryRegions": {
        "value": [
          "China",
          "Europe",
          "Canada",
          "USA"
        ],
        "confidence": "verified"
      },
      "seasonality": {
        "value": "Harvested late summer to early autumn",
        "confidence": "verified"
      },
      "typicalMOQ": "500 kg",
      "leadTime": "4-8 weeks",
      "priceRange": {
        "value": "moderate",
        "confidence": "estimated"
      }
    },
    "endUse": {
      "apparel": {
        "value": true,
        "confidence": "verified"
      },
      "interiors": {
        "value": true,
        "confidence": "verified"
      },
      "technical": {
        "value": true,
        "confidence": "estimated"
      },
      "accessories": {
        "value": true,
        "confidence": "verified"
      },
      "industrial": {
        "value": true,
        "confidence": "verified"
      },
      "bestFor": [
        "casual apparel",
        "home textiles",
        "rope and cordage",
        "canvas"
      ]
    }
  },
  "cotton": {
    "materialId": "cotton",
    "status": "published",
    "lastUpdated": "2026-02-28",
    "performance": {
      "strength": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "verified"
      },
      "breathability": {
        "rating": 5,
        "label": "Very High",
        "confidence": "verified"
      },
      "drape": {
        "rating": 4,
        "label": "High",
        "confidence": "verified"
      },
      "absorbency": {
        "rating": 5,
        "label": "Very High",
        "confidence": "verified"
      },
      "thermalRegulation": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "verified"
      },
      "durability": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "verified"
      },
      "elasticity": {
        "rating": 2,
        "label": "Low",
        "confidence": "verified"
      },
      "moistureWicking": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "estimated"
      }
    },
    "process": {
      "spinning": {
        "value": "excellent",
        "confidence": "verified"
      },
      "weaving": {
        "value": "excellent",
        "confidence": "verified"
      },
      "knitting": {
        "value": "excellent",
        "confidence": "verified"
      },
      "finishing": {
        "value": "excellent",
        "confidence": "verified"
      },
      "blending": {
        "value": "Universal blending fiber — pairs with nearly all natural and synthetic fibers",
        "confidence": "verified"
      }
    },
    "dyeing": {
      "compatibility": {
        "value": "excellent",
        "confidence": "verified"
      },
      "recommendedMethods": {
        "value": [
          "fiber-reactive dyes",
          "natural dyes",
          "direct dyes",
          "vat dyes"
        ],
        "confidence": "verified"
      },
      "fastness": {
        "value": "good",
        "confidence": "verified"
      },
      "naturalDyeAffinity": {
        "value": "high",
        "confidence": "verified"
      }
    },
    "sustainability": {
      "waterUsage": {
        "rating": 1,
        "label": "Very High",
        "confidence": "verified",
        "source": "WWF Water Footprint Report"
      },
      "carbonFootprint": {
        "rating": 2,
        "label": "High",
        "confidence": "verified"
      },
      "biodegradable": {
        "value": true,
        "confidence": "verified"
      },
      "recyclable": {
        "value": true,
        "confidence": "verified"
      },
      "chemicalProcessing": {
        "rating": 2,
        "label": "Significant",
        "confidence": "verified"
      },
      "certifications": {
        "value": [
          "GOTS",
          "OEKO-TEX",
          "BCI"
        ],
        "confidence": "verified"
      },
      "circularity": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "estimated"
      }
    },
    "sourcing": {
      "primaryRegions": {
        "value": [
          "India",
          "China",
          "USA",
          "Pakistan",
          "Brazil"
        ],
        "confidence": "verified"
      },
      "seasonality": {
        "value": "Harvested autumn; available year-round",
        "confidence": "verified"
      },
      "typicalMOQ": "1000 kg",
      "leadTime": "2-6 weeks",
      "priceRange": {
        "value": "low",
        "confidence": "verified"
      }
    },
    "endUse": {
      "apparel": {
        "value": true,
        "confidence": "verified"
      },
      "interiors": {
        "value": true,
        "confidence": "verified"
      },
      "technical": {
        "value": false,
        "confidence": "estimated"
      },
      "accessories": {
        "value": true,
        "confidence": "verified"
      },
      "industrial": {
        "value": false,
        "confidence": "estimated"
      },
      "bestFor": [
        "everyday apparel",
        "bedding",
        "toweling",
        "denim"
      ]
    }
  },
  "flax-linen": {
    "materialId": "flax-linen",
    "status": "published",
    "lastUpdated": "2026-02-28",
    "performance": {
      "strength": {
        "rating": 5,
        "label": "Very High",
        "confidence": "verified"
      },
      "breathability": {
        "rating": 5,
        "label": "Very High",
        "confidence": "verified"
      },
      "drape": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "verified"
      },
      "absorbency": {
        "rating": 5,
        "label": "Very High",
        "confidence": "verified"
      },
      "thermalRegulation": {
        "rating": 5,
        "label": "Very High",
        "confidence": "verified"
      },
      "durability": {
        "rating": 5,
        "label": "Very High",
        "confidence": "verified"
      },
      "elasticity": {
        "rating": 1,
        "label": "Very Low",
        "confidence": "verified"
      }
    },
    "process": {
      "spinning": {
        "value": "good",
        "confidence": "verified"
      },
      "weaving": {
        "value": "excellent",
        "confidence": "verified"
      },
      "knitting": {
        "value": "fair",
        "confidence": "estimated"
      },
      "finishing": {
        "value": "good",
        "confidence": "verified"
      }
    },
    "dyeing": {
      "compatibility": {
        "value": "good",
        "confidence": "verified"
      },
      "recommendedMethods": {
        "value": [
          "natural dyes",
          "fiber-reactive dyes"
        ],
        "confidence": "verified"
      },
      "fastness": {
        "value": "good",
        "confidence": "verified"
      },
      "naturalDyeAffinity": {
        "value": "high",
        "confidence": "verified"
      }
    },
    "sustainability": {
      "waterUsage": {
        "rating": 5,
        "label": "Very Low",
        "confidence": "verified"
      },
      "carbonFootprint": {
        "rating": 4,
        "label": "Low",
        "confidence": "verified"
      },
      "biodegradable": {
        "value": true,
        "confidence": "verified"
      },
      "recyclable": {
        "value": true,
        "confidence": "verified"
      },
      "chemicalProcessing": {
        "rating": 4,
        "label": "Minimal",
        "confidence": "verified"
      },
      "certifications": {
        "value": [
          "GOTS",
          "European Flax",
          "OEKO-TEX"
        ],
        "confidence": "verified"
      },
      "circularity": {
        "rating": 4,
        "label": "High",
        "confidence": "estimated"
      }
    },
    "sourcing": {
      "primaryRegions": {
        "value": [
          "France",
          "Belgium",
          "Netherlands",
          "China"
        ],
        "confidence": "verified"
      },
      "seasonality": {
        "value": "Harvested mid-summer; retting through autumn",
        "confidence": "verified"
      },
      "typicalMOQ": "200 kg",
      "leadTime": "6-12 weeks",
      "priceRange": {
        "value": "high",
        "confidence": "verified"
      }
    },
    "endUse": {
      "apparel": {
        "value": true,
        "confidence": "verified"
      },
      "interiors": {
        "value": true,
        "confidence": "verified"
      },
      "technical": {
        "value": false,
        "confidence": "estimated"
      },
      "accessories": {
        "value": true,
        "confidence": "verified"
      },
      "industrial": {
        "value": false,
        "confidence": "estimated"
      },
      "bestFor": [
        "luxury apparel",
        "tablecloths",
        "bedding",
        "suiting"
      ]
    }
  },
  "merino": {
    "materialId": "merino",
    "status": "published",
    "lastUpdated": "2026-02-28",
    "performance": {
      "strength": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "verified"
      },
      "breathability": {
        "rating": 5,
        "label": "Very High",
        "confidence": "verified"
      },
      "drape": {
        "rating": 4,
        "label": "High",
        "confidence": "verified"
      },
      "absorbency": {
        "rating": 4,
        "label": "High",
        "confidence": "verified"
      },
      "thermalRegulation": {
        "rating": 5,
        "label": "Very High",
        "confidence": "verified"
      },
      "durability": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "verified"
      },
      "elasticity": {
        "rating": 4,
        "label": "High",
        "confidence": "verified"
      },
      "moistureWicking": {
        "rating": 5,
        "label": "Very High",
        "confidence": "verified"
      }
    },
    "process": {
      "spinning": {
        "value": "excellent",
        "confidence": "verified"
      },
      "weaving": {
        "value": "excellent",
        "confidence": "verified"
      },
      "knitting": {
        "value": "excellent",
        "confidence": "verified"
      },
      "finishing": {
        "value": "good",
        "confidence": "verified"
      }
    },
    "dyeing": {
      "compatibility": {
        "value": "excellent",
        "confidence": "verified"
      },
      "recommendedMethods": {
        "value": [
          "acid dyes",
          "natural dyes",
          "reactive dyes"
        ],
        "confidence": "verified"
      },
      "fastness": {
        "value": "excellent",
        "confidence": "verified"
      },
      "naturalDyeAffinity": {
        "value": "high",
        "confidence": "verified"
      }
    },
    "sustainability": {
      "waterUsage": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "estimated"
      },
      "carbonFootprint": {
        "rating": 2,
        "label": "High",
        "confidence": "estimated"
      },
      "biodegradable": {
        "value": true,
        "confidence": "verified"
      },
      "recyclable": {
        "value": true,
        "confidence": "verified"
      },
      "chemicalProcessing": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "estimated"
      },
      "certifications": {
        "value": [
          "ZQ Merino",
          "RWS",
          "OEKO-TEX"
        ],
        "confidence": "verified"
      },
      "circularity": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "estimated"
      }
    },
    "sourcing": {
      "primaryRegions": {
        "value": [
          "Australia",
          "New Zealand",
          "South Africa",
          "Argentina"
        ],
        "confidence": "verified"
      },
      "seasonality": {
        "value": "Shearing spring/autumn; available year-round",
        "confidence": "verified"
      },
      "typicalMOQ": "100 kg",
      "leadTime": "4-8 weeks",
      "priceRange": {
        "value": "premium",
        "confidence": "verified"
      }
    },
    "endUse": {
      "apparel": {
        "value": true,
        "confidence": "verified"
      },
      "interiors": {
        "value": true,
        "confidence": "estimated"
      },
      "technical": {
        "value": true,
        "confidence": "verified"
      },
      "accessories": {
        "value": true,
        "confidence": "verified"
      },
      "industrial": {
        "value": false,
        "confidence": "estimated"
      },
      "bestFor": [
        "base layers",
        "activewear",
        "suiting",
        "knitwear"
      ]
    }
  },
  "indigo": {
    "materialId": "indigo",
    "status": "verified",
    "lastUpdated": "2026-02-20",
    "performance": {
      "strength": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "estimated"
      },
      "durability": {
        "rating": 4,
        "label": "High",
        "confidence": "verified"
      }
    },
    "process": {
      "specialProcesses": {
        "value": [
          "vat reduction",
          "fermentation vat",
          "fructose reduction"
        ],
        "confidence": "verified"
      }
    },
    "dyeing": {
      "compatibility": {
        "value": "excellent",
        "confidence": "verified"
      },
      "recommendedMethods": {
        "value": [
          "vat dyeing",
          "fermentation vat",
          "dip-oxidize cycles"
        ],
        "confidence": "verified"
      },
      "fastness": {
        "value": "good",
        "confidence": "verified"
      },
      "naturalDyeAffinity": {
        "value": "high",
        "confidence": "verified"
      },
      "notes": "Achieves depth through repeated dip-oxidize cycles. Compatible with cellulose and protein fibers."
    },
    "sustainability": {
      "waterUsage": {
        "rating": 2,
        "label": "High",
        "confidence": "estimated"
      },
      "carbonFootprint": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "estimated"
      },
      "biodegradable": {
        "value": true,
        "confidence": "verified"
      },
      "chemicalProcessing": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "estimated"
      },
      "certifications": {
        "value": [
          "GOTS-compatible"
        ],
        "confidence": "estimated"
      }
    },
    "sourcing": {
      "primaryRegions": {
        "value": [
          "India",
          "Japan",
          "El Salvador",
          "West Africa"
        ],
        "confidence": "verified"
      },
      "seasonality": {
        "value": "Leaf harvest summer; processed year-round",
        "confidence": "estimated"
      },
      "typicalMOQ": "5 kg (powder)",
      "leadTime": "2-6 weeks",
      "priceRange": {
        "value": "high",
        "confidence": "estimated"
      }
    },
    "endUse": {
      "apparel": {
        "value": true,
        "confidence": "verified"
      },
      "interiors": {
        "value": true,
        "confidence": "estimated"
      },
      "accessories": {
        "value": true,
        "confidence": "verified"
      },
      "bestFor": [
        "denim",
        "shibori",
        "resist dyeing",
        "artisan textiles"
      ]
    }
  },
  "kapok": {
    "materialId": "kapok",
    "status": "published",
    "lastUpdated": "2026-02-28",
    "performance": {
      "strength": {
        "rating": 2,
        "label": "Moderate",
        "confidence": "estimated"
      },
      "breathability": {
        "rating": 4,
        "label": "High",
        "confidence": "estimated"
      },
      "drape": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "estimated"
      },
      "absorbency": {
        "rating": 2,
        "label": "Low",
        "confidence": "estimated"
      },
      "thermalRegulation": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "estimated"
      },
      "durability": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "estimated"
      },
      "elasticity": {
        "rating": 2,
        "label": "Low",
        "confidence": "estimated"
      },
      "uvResistance": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "estimated"
      },
      "moistureWicking": {
        "rating": 3,
        "label": "Moderate",
        "confidence": "estimated"
      }
    },
    "process": {
      "spinning": {
        "value": "fair",
        "confidence": "estimated"
      },
      "weaving": {
        "value": "poor",
        "confidence": "estimated"
      },
      "knitting": {
        "value": "not-applicable",
        "confidence": "estimated"
      },
      "finishing": {
        "value": "fair",
        "confidence": "estimated"
      },
      "blending": {
        "value": "works well with other natural fibers for insulation and filling applications.",
        "confidence": "estimated"
      }
    },
    "dyeing": {
      "compatibility": {
        "value": "fair",
        "confidence": "estimated"
      },
      "fastness": {
        "value": "moderate",
        "confidence": "estimated"
      },
      "naturalDyeAffinity": {
        "value": "low",
        "confidence": "estimated"
      },
      "recommendedMethods": {
        "value": [
          "natural dyes with mordants",
          "low-temperature dyeing"
        ],
        "confidence": "estimated"
      },
      "notes": "Preparation of the fibers is essential for successful dyeing."
    },
    "sustainability": {
      "waterUsage": {
        "rating": 2,
        "label": "Moderate",
        "confidence": "estimated"
      },
      "carbonFootprint": {
        "value": "low",
        "confidence": "estimated"
      },
      "chemicalProcessing": {
        "value": "none required",
        "confidence": "estimated"
      },
      "circularity": {
        "value": "biodegradable, but not commonly recycled",
        "confidence": "estimated"
      },
      "biodegradable": {
        "value": true,
        "confidence": "estimated"
      },
      "recyclable": {
        "value": false,
        "confidence": "estimated"
      },
      "certifications": {
        "value": [],
        "confidence": "estimated"
      }
    },
    "sourcing": {
      "primaryRegions": {
        "value": [
          "Southeast Asia",
          "Central America",
          "West Africa"
        ],
        "confidence": "estimated"
      },
      "seasonality": {
        "value": "year-round in tropical climates",
        "confidence": "estimated"
      },
      "priceRange": {
        "value": "moderate",
        "confidence": "estimated"
      },
      "typicalMOQ": "100 kg",
      "leadTime": "4-8 weeks"
    },
    "endUse": {
      "apparel": {
        "value": false,
        "confidence": "estimated"
      },
      "interiors": {
        "value": true,
        "confidence": "estimated"
      },
      "technical": {
        "value": true,
        "confidence": "estimated"
      },
      "accessories": {
        "value": true,
        "confidence": "estimated"
      },
      "industrial": {
        "value": false,
        "confidence": "estimated"
      },
      "bestFor": [
        "stuffing",
        "insulation",
        "environmentally friendly products"
      ]
    }
  },
  "milkweed": {
    "materialId": "milkweed",
    "status": "published",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {
      "primaryRegions": "North America, particularly the United States and Canada, with significant populations in the Midwest and Eastern regions.",
      "seasonality": "Milkweed plants typically bloom in late spring to summer, with harvesting occurring from late summer to early fall when the seed pods are mature and the fibers are easily extracted.",
      "priceRange": "The price of milkweed fibers can vary widely depending on the source and processing methods, typically ranging from $10 to $30 per pound for raw, unprocessed fibers."
    },
    "endUse": {}
  },
  "jute": {
    "materialId": "jute",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "nettle": {
    "materialId": "nettle",
    "lastUpdated": "2026-03-08",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "kenaf": {
    "materialId": "kenaf",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "roselle": {
    "materialId": "roselle",
    "lastUpdated": "2026-04-06",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "sisal": {
    "materialId": "sisal",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "pineapple-pina": {
    "materialId": "pineapple-pina",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "abaca": {
    "materialId": "abaca",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "ramie": {
    "materialId": "ramie",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "henequen": {
    "materialId": "henequen",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "dyes": {
    "materialId": "dyes",
    "status": "draft",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {}
  },
  "coir-coconut": {
    "materialId": "coir-coconut",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "looms": {
    "materialId": "looms",
    "lastUpdated": "2026-03-17",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "draft"
  },
  "industrial-looms": {
    "materialId": "industrial-looms",
    "lastUpdated": "2026-03-17",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "draft"
  },
  "plant-cellulose": {
    "materialId": "plant-cellulose",
    "status": "draft",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {}
  },
  "mineral-regenerated": {
    "materialId": "mineral-regenerated",
    "status": "draft",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {}
  },
  "esparto": {
    "materialId": "esparto",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "navajo-churro": {
    "materialId": "navajo-churro",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "huacaya": {
    "materialId": "huacaya",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "suri": {
    "materialId": "suri",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "mohair": {
    "materialId": "mohair",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "cashmere": {
    "materialId": "cashmere",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "llama": {
    "materialId": "llama",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "yak": {
    "materialId": "yak",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "camel": {
    "materialId": "camel",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "bison": {
    "materialId": "bison",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "qiviut": {
    "materialId": "qiviut",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "tussar": {
    "materialId": "tussar",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "peace-silk": {
    "materialId": "peace-silk",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "spider-silk": {
    "materialId": "spider-silk",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "alpaca": {
    "materialId": "alpaca",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "ayate": {
    "materialId": "ayate",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "sweetgrass": {
    "materialId": "sweetgrass",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "raffia": {
    "materialId": "raffia",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "spinning": {
    "materialId": "spinning",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "plying": {
    "materialId": "plying",
    "lastUpdated": "2026-03-17",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "draft"
  },
  "yarn-weight": {
    "materialId": "yarn-weight",
    "lastUpdated": "2026-02-28",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "draft"
  },
  "curaua": {
    "materialId": "curaua",
    "lastUpdated": "2026-03-17",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "draft"
  },
  "lincoln": {
    "materialId": "lincoln",
    "lastUpdated": "2026-03-18",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "draft"
  },
  "bombax": {
    "materialId": "bombax",
    "lastUpdated": "2026-03-18",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "draft"
  },
  "viscose-rayon": {
    "materialId": "viscose-rayon",
    "lastUpdated": "2026-03-18",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "river-reed": {
    "materialId": "river-reed",
    "lastUpdated": "2026-03-18",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "draft"
  },
  "harakeke": {
    "materialId": "harakeke",
    "lastUpdated": "2026-03-18",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "draft"
  },
  "sano": {
    "materialId": "sano",
    "lastUpdated": "2026-03-18",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "draft"
  },
  "lokta": {
    "materialId": "lokta",
    "lastUpdated": "2026-03-18",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "draft"
  },
  "sunn-hemp": {
    "materialId": "sunn-hemp",
    "lastUpdated": "2026-03-18",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "draft"
  },
  "modal": {
    "materialId": "modal",
    "lastUpdated": "2026-03-20",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "draft"
  },
  "columbia": {
    "materialId": "columbia",
    "lastUpdated": "2026-03-25",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "draft"
  },
  "tapa": {
    "materialId": "tapa",
    "lastUpdated": "2026-03-25",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  },
  "fig-barkcloth": {
    "materialId": "fig-barkcloth",
    "lastUpdated": "2026-03-25",
    "performance": {},
    "process": {},
    "dyeing": {},
    "sustainability": {},
    "sourcing": {},
    "endUse": {},
    "status": "published"
  }
};

export const TAXONOMY_ALIASES: TaxonomyAliasRegistry = {
  "hemp": [
    {
      "canonicalId": "hemp",
      "alias": "chanvre",
      "language": "fr"
    },
    {
      "canonicalId": "hemp",
      "alias": "Hanf",
      "language": "de"
    },
    {
      "canonicalId": "hemp",
      "alias": "cáñamo",
      "language": "es"
    },
    {
      "canonicalId": "hemp",
      "alias": "Cannabis sativa",
      "language": "la"
    },
    {
      "canonicalId": "hemp",
      "alias": "麻",
      "language": "zh"
    },
    {
      "canonicalId": "hemp",
      "alias": "大麻",
      "language": "ja"
    }
  ],
  "cotton": [
    {
      "canonicalId": "cotton",
      "alias": "coton",
      "language": "fr"
    },
    {
      "canonicalId": "cotton",
      "alias": "Baumwolle",
      "language": "de"
    },
    {
      "canonicalId": "cotton",
      "alias": "algodón",
      "language": "es"
    },
    {
      "canonicalId": "cotton",
      "alias": "Gossypium",
      "language": "la"
    },
    {
      "canonicalId": "cotton",
      "alias": "棉花",
      "language": "zh"
    }
  ],
  "flax-linen": [
    {
      "canonicalId": "flax-linen",
      "alias": "lin",
      "language": "fr"
    },
    {
      "canonicalId": "flax-linen",
      "alias": "Leinen",
      "language": "de"
    },
    {
      "canonicalId": "flax-linen",
      "alias": "lino",
      "language": "es"
    },
    {
      "canonicalId": "flax-linen",
      "alias": "Linum usitatissimum",
      "language": "la"
    }
  ],
  "merino": [
    {
      "canonicalId": "merino",
      "alias": "mérinos",
      "language": "fr"
    },
    {
      "canonicalId": "merino",
      "alias": "Merinowolle",
      "language": "de"
    }
  ],
  "indigo": [
    {
      "canonicalId": "indigo",
      "alias": "Indigofera tinctoria",
      "language": "la"
    },
    {
      "canonicalId": "indigo",
      "alias": "indigo",
      "language": "fr"
    },
    {
      "canonicalId": "indigo",
      "alias": "藍",
      "language": "ja"
    }
  ]
};
