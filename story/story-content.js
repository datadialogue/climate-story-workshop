/* ==========================================================================
   STORY NARRATIVE & STEP DEFINITIONS
   Direct story text only (no repetitive headings). Key phrases use accent
   spans: .hl (river green), .hl-alert (rust/orange), .hl-boat (warm gold),
   .hl-water (blue), .hl-industry (amber).
   ========================================================================== */

window.STORY_STEPS = [
  {
    id: "ahvaz-city",
    bodyHtml: [
      'This is <span class="hl">Ahvaz</span>.',
      'Look at the street grid first. Neighborhoods spread out across both sides of a wide empty gap in the center.'
    ],
    sources: [
      { label: "OpenStreetMap (Ahvaz roads)", url: "https://www.openstreetmap.org/#map=12/31.320/48.680" }
    ],
    showScrollCue: true
  },
  {
    id: "ahvaz-me",
    bodyHtml: [
      '<span class="hl">I am from here.</span>'
    ]
  },
  {
    id: "ahvaz-photo-fish",
    bodyHtml: [
      'Every part of <span class="hl">Ahvaz</span> carries signs of the water running through it.'
    ]
  },
  {
    id: "ahvaz-photo-boat",
    bodyHtml: [
      'The city grew along the banks, side by side with the river.'
    ]
  },
  {
    id: "iran-zoom-out",
    bodyHtml: [
      'Ahvaz sits in <span class="hl">southwestern Iran</span>, in Khuzestan province, close to the Persian Gulf.',
      'Summers here are some of the hottest on Earth.'
    ],
    sources: [
      { label: "Natural Earth 50m", url: "https://www.naturalearthdata.com/" }
    ]
  },
  {
    id: "ahvaz-zoom-in",
    bodyHtml: [
      'Let us go back into the streets of <span class="hl">Ahvaz</span>.'
    ]
  },
  {
    id: "karun-overlay",
    bodyHtml: [
      'The <span class="hl">Karun River</span> runs straight through the heart of Ahvaz.',
      'It is Iran\'s largest river. Bridges connect both halves of the city across its water.'
    ],
    sources: [
      { label: "OpenStreetMap", url: "https://www.openstreetmap.org/#map=12/31.320/48.680" },
      { label: "Encyclopaedia Iranica", url: "https://www.iranicaonline.org/articles/karun-river" },
      { label: "Visit Iran photo", url: "https://www.visitiran.ir/visitPic/d_16/public/2019-09/%D8%B1%D9%88%D8%AF%20%DA%A9%D8%A7%D8%B1%D9%88%D9%86.jpg" }
    ]
  },
  {
    id: "karun-boats-photo",
    bodyHtml: [
      'Along the shoreline under the bridges, <span class="hl">small wooden boats</span> sit tied to the bank.'
    ],
    sources: [
      { label: "Tasnim News photo (Ali Moarref)", url: "https://newsmedia.tasnimmedia.com/Tasnim/Uploaded/Image/1396/09/26/1396092612364060212808504.jpg" }
    ]
  },
  {
    id: "karun-my-photo",
    bodyHtml: [
      'I took this photo along the Karun at the <span class="hl-boat">Seventh Bridge</span>.',
      'Small boats sit along the bank under the lit waterfall bridge.'
    ],
    note: "Pinned at Seventh Bridge (Pol-e-Haftom), Ahvaz — 31.3348°N, 48.6878°E."
  },
  {
    id: "karun-song",
    bodyHtml: [
      'The Karun is famous in a lot of <span class="hl">southern Iranian folk songs</span>.',
      'Here is Aghasi singing about the river.'
    ],
    sources: [
      { label: "YouTube — Aghasi, Labe Karoon (0:35–0:50)", url: "https://www.youtube.com/watch?v=JWoy45idGvE&t=35s" }
    ]
  },
  {
    id: "river-boat",
    bodyHtml: [
      '<span class="hl-boat">Small boats</span> move along these bends every day.',
      'For generations, local fishermen have worked this stretch of the Karun.'
    ]
  },
  {
    id: "fishing-nets",
    bodyHtml: [
      'They <span class="hl-boat">throw nets</span> across the water and pull fish up from the river.'
    ]
  },
  {
    id: "my-uncle",
    bodyHtml: [
      '<span class="hl-boat">My uncle</span> was one of those fishermen. I have been on those boats.',
      'Here he is talking about fishing with joy. <span class="hl-boat">He always loved it.</span>'
    ],
    note: "Plays seconds 0:08 to 0:12."
  },
  {
    id: "one-night",
    tone: "alert",
    bodyHtml: [
      '<span class="hl-alert">One night a year ago</span>, he decided to go fishing.',
      'His net got stuck in something under the water. He went in to take it out. He got stuck too. <span class="hl-alert">He never got out.</span>'
    ]
  },
  {
    id: "pollution-low-water",
    tone: "alert",
    bodyHtml: [
      'Two main things caused this.',
      '<span class="hl-alert">Pollution and waste</span> in the river, and <span class="hl-alert">much lower water levels</span> in the Karun.'
    ],
    sources: [
      { label: "Karun pollution & flow studies (WIT)", url: "https://www.witpress.com/elibrary/wit-transactions-on-ecology-and-the-environment/103/17510" }
    ]
  },
  {
    id: "elevation-past",
    bodyHtml: [
      'Look at the river from the side. Years ago, <span class="hl">the water ran high and deep</span>.',
      'Boats floated far above the bottom. Nets drifted clear of the riverbed.'
    ]
  },
  {
    id: "elevation-now",
    tone: "alert",
    bodyHtml: [
      'Today, <span class="hl-alert">the waterline sits much lower</span> and dry mudbanks sit exposed.',
      'Trash, metal, and tangled waste lie close to the surface. <span class="hl-alert">A net catches easily</span>, and going in to free it becomes a trap.'
    ]
  },
  {
    id: "chart-karun-history",
    bodyHtml: [
      'The drop shows up in river measurements at Ahvaz.',
      'Historically, the Karun carried around <span class="hl">700 cubic meters of water per second</span> past the city.'
    ],
    sources: [
      { label: "Encyclopaedia Iranica", url: "https://www.iranicaonline.org/articles/karun-river" },
      { label: "Salarijazi et al. (2012)", url: "https://doi.org/10.5897/AJAR12.650" }
    ]
  },
  {
    id: "chart-karun-drop",
    tone: "alert",
    bodyHtml: [
      'Look at the last <span class="hl-alert">twenty years</span> on the same scale.',
      'Average flow fell steeply as upstream dams, water transfers, and dry years stacked up.'
    ],
    sources: [
      { label: "Salarijazi et al. (2012)", url: "https://doi.org/10.5897/AJAR12.650" },
      { label: "Encyclopaedia Iranica", url: "https://www.iranicaonline.org/articles/karun-river" }
    ]
  },
  {
    id: "chart-iran-water",
    tone: "alert",
    bodyHtml: [
      'Across Iran, renewable freshwater per person fell from <span class="hl">5,808 m³</span> in 1961 to <span class="hl-alert">1,435 m³</span> in 2022.',
      'Iran crossed below the <span class="hl-alert">1,700 m³ water-stress line</span> around 2000.'
    ],
    sources: [
      { label: "World Bank / FAO AQUASTAT (ER.H2O.INTR.PC)", url: "https://data.worldbank.org/indicator/ER.H2O.INTR.PC?locations=IR-IQ-SY" }
    ]
  },
  {
    id: "iran-droughts",
    tone: "alert",
    bodyHtml: [
      '<span class="hl-alert">Drought reports</span> now cover most provinces in Iran.',
      'The country withdraws <span class="hl-alert">81.3%</span> of its available freshwater every year.'
    ],
    sources: [
      { label: "World Bank Water Stress (ER.H2O.FWST.ZS)", url: "https://data.worldbank.org/indicator/ER.H2O.FWST.ZS?locations=IR" },
      { label: "Madani (2014)", url: "https://doi.org/10.1007/s13412-014-0182-z" }
    ]
  },
  {
    id: "zayandeh-rud",
    tone: "alert",
    bodyHtml: [
      'In Isfahan, the <span class="hl-alert">Zayandeh Rud has dried up completely</span> for most of the year.',
      'Historic bridges like Si-o-se-pol now cross cracked dust.'
    ],
    sources: [
      { label: "Photo: Romain Bréget (Wikimedia)", url: "https://commons.wikimedia.org/wiki/File:Zayanderud_river_dry_with_Si-o-se-pol_on_background.jpg" }
    ]
  },
  {
    id: "kashmar-cities",
    tone: "alert",
    bodyHtml: [
      'Move east to <span class="hl-alert">Kashmar</span> in Razavi Khorasan.',
      'Low rain and heavy pumping have drained local aquifers and ancient underground qanats.'
    ],
    sources: [
      { label: "Khorasan Qanat (Wikimedia)", url: "https://commons.wikimedia.org/wiki/File:Ghasabe_Qanats_of_Gonabad.jpg" }
    ]
  },
  {
    id: "iran-urmia",
    tone: "alert",
    bodyHtml: [
      'In northwestern Iran, <span class="hl-alert">Lake Urmia</span> lost more than 80% of its surface water, leaving wide salt flats behind.'
    ],
    sources: [
      { label: "Lake Urmia photo (Wikimedia)", url: "https://commons.wikimedia.org/wiki/File:Lake_Urmia,_Iran1.jpg" }
    ]
  },
  {
    id: "world-syria",
    tone: "alert",
    bodyHtml: [
      'Zoom out beyond Iran. In <span class="hl-alert">Syria</span>, water levels in the <span class="hl-alert">Euphrates</span> dropped sharply during prolonged droughts.',
      'Upstream dams, low rain, and heat cut off farms and drinking water for millions.'
    ],
    sources: [
      { label: "World Bank (IR, IQ, SY)", url: "https://data.worldbank.org/indicator/ER.H2O.INTR.PC?locations=IR-IQ-SY" },
      { label: "Voss et al. (2013) NASA GRACE", url: "https://doi.org/10.1002/wrcr.20078" },
      { label: "Lake Assad photo (NASA)", url: "https://commons.wikimedia.org/wiki/File:Lake_Assad.jpg" }
    ]
  },
  {
    id: "world-aral",
    tone: "alert",
    bodyHtml: [
      'North of Iran, river diversions shrank the <span class="hl-alert">Aral Sea</span> to a fraction of its old size, stranding fishing boats on dry sand.'
    ],
    sources: [
      { label: "Aral Sea photo (Wikimedia)", url: "https://commons.wikimedia.org/wiki/File:AralShip.jpg" }
    ]
  },
  {
    id: "world-chad",
    tone: "alert",
    bodyHtml: [
      'In Central Africa, <span class="hl-alert">Lake Chad</span> shrank dramatically across decades of shifting rainfall and irrigation withdrawals.'
    ],
    sources: [
      { label: "NASA Earth Observatory", url: "https://commons.wikimedia.org/wiki/File:ShrinkingLakeChad-1973-1997-EO.jpg" }
    ]
  },
  {
    id: "world-po",
    tone: "alert",
    bodyHtml: [
      'In northern Italy, severe drought exposed wide dry sandbanks along the <span class="hl-alert">Po River</span>.'
    ],
    sources: [
      { label: "EU Copernicus Sentinel-2 (2022)", url: "https://commons.wikimedia.org/wiki/File:Drought_grips_northern_Italy_(Copernicus).jpg" }
    ]
  },
  {
    id: "world-mead",
    tone: "alert",
    bodyHtml: [
      'In the western United States, multi-decade drought dropped <span class="hl-alert">Lake Mead</span> by dozens of meters, leaving a stark white mineral ring on the canyon walls.'
    ],
    sources: [
      { label: "USGS photo (Wikimedia)", url: "https://commons.wikimedia.org/wiki/File:Drought_on_Lake_Mead_(11171485533).jpg" }
    ]
  },
  {
    id: "canada-bc-rain",
    bodyHtml: [
      'Now move north to <span class="hl-water">British Columbia, Canada</span>.',
      'Here, water swings the other way too. In November 2021, an <span class="hl-water">atmospheric river</span> poured months of rain in days and flooded entire valleys. <span class="hl">These types of events are happening everywhere.</span>'
    ],
    sources: [
      { label: "NASA Satellite (Nov 2021 BC Floods)", url: "https://commons.wikimedia.org/wiki/File:BC-WA_floods-2021-11-15T00_00_00Z.jpg" },
      { label: "Environment and Climate Change Canada", url: "https://climate.weather.gc.ca/" }
    ]
  },
  {
    id: "chart-bc-rain",
    bodyHtml: [
      'Across southern BC, November 2021 rain reached <span class="hl-water">two to two-and-a-half times normal</span>.',
      'Hope logged <span class="hl-water">730 mm</span> (normal 344 mm) and Abbotsford logged <span class="hl-water">541 mm</span> (normal 245 mm), overwhelming rivers and farmland.'
    ],
    sources: [
      { label: "Environment and Climate Change Canada (ECCC)", url: "https://climate.weather.gc.ca/" }
    ]
  },
  {
    id: "canada-bc-wildfire",
    tone: "alert",
    bodyHtml: [
      'Then dry summer heat hits the same province. Parched soils and forests across <span class="hl-alert">British Columbia</span> ignite into intense <span class="hl-alert">wildfires</span>.'
    ],
    sources: [
      { label: "NASA Earth Observatory (BC Wildfires)", url: "https://commons.wikimedia.org/wiki/File:Bcfires_oli_2021181.jpg" }
    ]
  },
  {
    id: "chart-bc-wildfires",
    tone: "alert",
    bodyHtml: [
      'In <span class="hl-alert">2023</span>, BC recorded <span class="hl-alert">2,293 wildfires</span> burning <span class="hl-alert">2.84 million hectares</span> — far more area than any prior season on record.'
    ],
    sources: [
      { label: "BC Wildfire Service (2014–2024)", url: "https://www2.gov.bc.ca/gov/content/safety/wildfire-status/about-bcws/wildfire-statistics/wildfire-averages" }
    ]
  },
  {
    id: "iran-policies",
    bodyHtml: [
      'Come back to <span class="hl">Iran</span>. Low rain explains only part of the loss.',
      'Dams, subsidized farming (~90% of water use), and <span class="hl-water">inter-basin tunnels</span> pull water out of the Karun headwaters and send it east to drier central provinces.'
    ],
    sources: [
      { label: "Madani (2014)", url: "https://doi.org/10.1007/s13412-014-0182-z" },
      { label: "Karun-3 Dam photo (Wikimedia)", url: "https://commons.wikimedia.org/wiki/File:Karun3-dam.jpg" }
    ]
  },
  {
    id: "iran-industry",
    tone: "industry",
    bodyHtml: [
      '<span class="hl-industry">Steel mills, refineries, petrochemical plants, and sugarcane farms</span> were built along these river basins and inside arid inland cities.',
      'They draw water upstream and send waste downstream into stretches like the Karun at Ahvaz.'
    ],
    sources: [
      { label: "Fanack Water — Iran", url: "https://water.fanack.com/iran/" },
      { label: "Mobarakeh Steel photo (Wikimedia)", url: "https://commons.wikimedia.org/wiki/File:Foolad_Mobarakeh7.jpg" }
    ]
  },
  {
    id: "closing-ahvaz",
    bodyHtml: [
      'Charts show a falling line. Maps show dams, tunnels, and factories.',
      'On the Karun in Ahvaz, all of those met in one bend of water where <span class="hl-boat">my uncle went in to free his net</span>.'
    ]
  },
  {
    id: "closing-world",
    tone: "alert",
    bodyHtml: [
      'Zoom out across the world. Droughts, floods, shrinking rivers, and wildfires repeat on every continent.',
      '<span class="hl-alert">People are affected by these on the daily.</span>'
    ],
    sources: [
      { label: "World Bank / FAO AQUASTAT", url: "https://data.worldbank.org/indicator/ER.H2O.INTR.PC" },
      { label: "BC Wildfire Service", url: "https://www2.gov.bc.ca/gov/content/safety/wildfire-status/about-bcws/wildfire-statistics/wildfire-averages" },
      { label: "NASA Earth Observatory", url: "https://earthobservatory.nasa.gov/" }
    ]
  }
];
