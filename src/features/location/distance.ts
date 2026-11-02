
export type Coordinates = {
  latitude: number;
  longitude: number;
};

/**
 * Approximate neighbourhood-centre coordinates.
 * Existing coordinates are preserved.
 * Smaller localities use their own approximate centre where available,
 * otherwise the nearest recognised parent neighbourhood is used.
 */
const MUMBAI_NEIGHBOURHOODS: Record<string, Coordinates> = {
  // DAHISAR
  "dahisar": { latitude: 19.2524, longitude: 72.8604 },
  "dahisar east": { latitude: 19.2546, longitude: 72.8697 },
  "dahisar west": { latitude: 19.2502, longitude: 72.8511 },
  "anand nagar": { latitude: 19.2530, longitude: 72.8650 },
  "ketkipada": { latitude: 19.2580, longitude: 72.8730 },
  "rawalpada": { latitude: 19.2510, longitude: 72.8750 },
  "mandapeshwar": { latitude: 19.2490, longitude: 72.8500 },

  // BORIVALI
  "borivali": { latitude: 19.2300, longitude: 72.8600 },
  "borivali east": { latitude: 19.2290, longitude: 72.8640 },
  "borivali west": { latitude: 19.2307, longitude: 72.8567 },
  "ic colony": { latitude: 19.2470, longitude: 72.8450 },
  "eksar": { latitude: 19.2400, longitude: 72.8500 },
  "shimpoli": { latitude: 19.2310, longitude: 72.8490 },
  "yogi nagar": { latitude: 19.2370, longitude: 72.8420 },
  "gorai": { latitude: 19.2400, longitude: 72.7950 },

  // KANDIVALI
  "kandivali": { latitude: 19.2047, longitude: 72.8600 },
  "kandivali east": { latitude: 19.2050, longitude: 72.8690 },
  "kandivali west": { latitude: 19.2045, longitude: 72.8510 },
  "thakur village": { latitude: 19.2100, longitude: 72.8720 },
  "thakur complex": { latitude: 19.2090, longitude: 72.8680 },
  "lokhandwala township": { latitude: 19.2070, longitude: 72.8730 },
  "mahavir nagar": { latitude: 19.2110, longitude: 72.8420 },
  "poisar": { latitude: 19.2120, longitude: 72.8500 },
  "samata nagar": { latitude: 19.2100, longitude: 72.8660 },
  "charkop": { latitude: 19.2100, longitude: 72.8230 },

  // MALAD
  "malad": { latitude: 19.1867, longitude: 72.8420 },
  "malad east": { latitude: 19.1874, longitude: 72.8484 },
  "malad west": { latitude: 19.1860, longitude: 72.8370 },
  "mindspace": { latitude: 19.1740, longitude: 72.8340 },
  "marve road": { latitude: 19.1840, longitude: 72.8170 },
  "orlem": { latitude: 19.1870, longitude: 72.8350 },
  "evershine nagar": { latitude: 19.1810, longitude: 72.8330 },
  "liberty garden": { latitude: 19.1870, longitude: 72.8420 },
  "rani sati marg": { latitude: 19.1860, longitude: 72.8520 },
  "dindoshi": { latitude: 19.1750, longitude: 72.8660 },
  "pathanwadi": { latitude: 19.1750, longitude: 72.8590 },

  // GOREGAON
  "goregaon": { latitude: 19.1655, longitude: 72.8490 },
  "goregaon east": { latitude: 19.1646, longitude: 72.8493 },
  "goregaon west": { latitude: 19.1663, longitude: 72.8490 },
  "aarey colony": { latitude: 19.1500, longitude: 72.8750 },
  "oshiwara": { latitude: 19.1500, longitude: 72.8320 },
  "gokuldham": { latitude: 19.1730, longitude: 72.8650 },
  "film city road": { latitude: 19.1570, longitude: 72.8840 },
  "motilal nagar": { latitude: 19.1640, longitude: 72.8390 },
  "bangur nagar": { latitude: 19.1630, longitude: 72.8340 },
  "jawahar nagar": { latitude: 19.1610, longitude: 72.8470 },

  // JOGESHWARI
  "jogeshwari": { latitude: 19.1360, longitude: 72.8510 },
  "jogeshwari east": { latitude: 19.1370, longitude: 72.8550 },
  "jogeshwari west": { latitude: 19.1350, longitude: 72.8480 },
  "behram baug": { latitude: 19.1420, longitude: 72.8440 },
  "shastri nagar": { latitude: 19.1430, longitude: 72.8400 },
  "sv patel nagar": { latitude: 19.1240, longitude: 72.8350 },

  // ANDHERI
  "andheri": { latitude: 19.1160, longitude: 72.8520 },
  "andheri east": { latitude: 19.1136, longitude: 72.8697 },
  "andheri west": { latitude: 19.1197, longitude: 72.8464 },
  "midc": { latitude: 19.1170, longitude: 72.8650 },
  "chakala": { latitude: 19.1100, longitude: 72.8650 },
  "marol": { latitude: 19.1080, longitude: 72.8810 },
  "jb nagar": { latitude: 19.1100, longitude: 72.8620 },
  "sakinaka": { latitude: 19.1030, longitude: 72.8870 },
  "seepz": { latitude: 19.1260, longitude: 72.8750 },
  "sher e punjab colony": { latitude: 19.1220, longitude: 72.8650 },
  "lokhandwala complex": { latitude: 19.1300, longitude: 72.8240 },
  "versova": { latitude: 19.1310, longitude: 72.8120 },
  "four bungalows": { latitude: 19.1290, longitude: 72.8190 },
  "seven bungalows": { latitude: 19.1300, longitude: 72.8130 },
  "yari road": { latitude: 19.1340, longitude: 72.8140 },
  "dn nagar": { latitude: 19.1270, longitude: 72.8290 },
  "azad nagar": { latitude: 19.1260, longitude: 72.8330 },
  "veera desai road": { latitude: 19.1400, longitude: 72.8360 },

  // VILE PARLE
  "vile parle": { latitude: 19.0990, longitude: 72.8440 },
  "vile parle east": { latitude: 19.1000, longitude: 72.8500 },
  "vile parle west": { latitude: 19.0980, longitude: 72.8370 },
  "ville parle east": { latitude: 19.1000, longitude: 72.8500 },
  "ville parle west": { latitude: 19.0980, longitude: 72.8370 },
  "irla": { latitude: 19.1030, longitude: 72.8370 },
  "hanuman road": { latitude: 19.0980, longitude: 72.8480 },

  // SANTACRUZ AND KHAR
  "santacruz": { latitude: 19.0820, longitude: 72.8470 },
  "santacruz east": { latitude: 19.0810, longitude: 72.8560 },
  "santacruz west": { latitude: 19.0840, longitude: 72.8380 },
  "vakola": { latitude: 19.0790, longitude: 72.8500 },
  "kalina": { latitude: 19.0730, longitude: 72.8610 },
  "prabhat colony": { latitude: 19.0800, longitude: 72.8430 },
  "khar": { latitude: 19.0726, longitude: 72.8370 },
  "khar east": { latitude: 19.0710, longitude: 72.8440 },
  "khar west": { latitude: 19.0726, longitude: 72.8370 },
  "khar danda": { latitude: 19.0680, longitude: 72.8200 },
  "pali hill": { latitude: 19.0660, longitude: 72.8270 },
  "union park": { latitude: 19.0680, longitude: 72.8310 },

  // BANDRA
  "bandra": { latitude: 19.0590, longitude: 72.8360 },
  "bandra east": { latitude: 19.0600, longitude: 72.8500 },
  "bandra west": { latitude: 19.0596, longitude: 72.8295 },
  "bkc": { latitude: 19.0670, longitude: 72.8690 },
  "bandra kurla complex": { latitude: 19.0670, longitude: 72.8690 },
  "kalanagar": { latitude: 19.0550, longitude: 72.8490 },
  "bandra reclamation": { latitude: 19.0470, longitude: 72.8230 },
  "carter road": { latitude: 19.0660, longitude: 72.8210 },
  "pali naka": { latitude: 19.0640, longitude: 72.8290 },
  "hill road": { latitude: 19.0550, longitude: 72.8260 },
  "mount mary": { latitude: 19.0500, longitude: 72.8240 },
  "chimbai": { latitude: 19.0510, longitude: 72.8200 },

  // MAHIM, DADAR AND MATUNGA
  "mahim": { latitude: 19.0420, longitude: 72.8400 },
  "mahim east": { latitude: 19.0410, longitude: 72.8470 },
  "mahim west": { latitude: 19.0420, longitude: 72.8340 },
  "mahim causeway": { latitude: 19.0410, longitude: 72.8390 },
  "mahim koliwada": { latitude: 19.0400, longitude: 72.8350 },
  "dadar": { latitude: 19.0178, longitude: 72.8478 },
  "dadar east": { latitude: 19.0190, longitude: 72.8500 },
  "dadar west": { latitude: 19.0170, longitude: 72.8400 },
  "dadar tt": { latitude: 19.0220, longitude: 72.8440 },
  "shivaji park": { latitude: 19.0260, longitude: 72.8390 },
  "hindu colony": { latitude: 19.0220, longitude: 72.8500 },
  "naigaon": { latitude: 19.0090, longitude: 72.8440 },
  "prabhadevi": { latitude: 19.0140, longitude: 72.8280 },
  "prabhadevi east": { latitude: 19.0140, longitude: 72.8350 },
  "prabhadevi west": { latitude: 19.0140, longitude: 72.8230 },
  "matunga": { latitude: 19.0270, longitude: 72.8500 },
  "matunga east": { latitude: 19.0270, longitude: 72.8550 },
  "matunga west": { latitude: 19.0270, longitude: 72.8440 },
  "king's circle": { latitude: 19.0260, longitude: 72.8550 },
  "king circle": { latitude: 19.0260, longitude: 72.8550 },
  "five gardens": { latitude: 19.0250, longitude: 72.8470 },

  // SION, WADALA AND CENTRAL
  "sion": { latitude: 19.0390, longitude: 72.8619 },
  "sion east": { latitude: 19.0390, longitude: 72.8690 },
  "sion west": { latitude: 19.0390, longitude: 72.8550 },
  "chunabhatti": { latitude: 19.0520, longitude: 72.8680 },
  "antop hill": { latitude: 19.0250, longitude: 72.8710 },
  "wadala": { latitude: 19.0176, longitude: 72.8580 },
  "wadala east": { latitude: 19.0170, longitude: 72.8650 },
  "wadala west": { latitude: 19.0170, longitude: 72.8510 },
  "wadala truck terminal": { latitude: 19.0200, longitude: 72.8750 },
  "gtb nagar": { latitude: 19.0400, longitude: 72.8640 },
  "cgs colony": { latitude: 19.0200, longitude: 72.8680 },

  // KURLA AND GHATKOPAR
  "kurla": { latitude: 19.0680, longitude: 72.8830 },
  "kurla east": { latitude: 19.0650, longitude: 72.8840 },
  "kurla west": { latitude: 19.0726, longitude: 72.8820 },
  "lbs marg": { latitude: 19.0710, longitude: 72.8810 },
  "nehru nagar": { latitude: 19.0640, longitude: 72.8870 },
  "vinobha bhave nagar": { latitude: 19.0690, longitude: 72.8800 },
  "ghatkopar": { latitude: 19.0860, longitude: 72.9080 },
  "ghatkopar east": { latitude: 19.0860, longitude: 72.9080 },
  "ghatkopar west": { latitude: 19.0865, longitude: 72.9080 },
  "pant nagar": { latitude: 19.0820, longitude: 72.9070 },
  "garodia nagar": { latitude: 19.0800, longitude: 72.9100 },
  "rajawadi": { latitude: 19.0830, longitude: 72.9060 },
  "asalpha": { latitude: 19.1010, longitude: 72.8880 },

  // VIKHROLI, BHANDUP AND MULUND
  "vikhroli": { latitude: 19.1111, longitude: 72.9278 },
  "vikhroli east": { latitude: 19.1110, longitude: 72.9360 },
  "vikhroli west": { latitude: 19.1110, longitude: 72.9200 },
  "kannamwar nagar": { latitude: 19.1050, longitude: 72.9380 },
  "tagore nagar": { latitude: 19.1090, longitude: 72.9340 },
  "godrej hillside colony": { latitude: 19.1060, longitude: 72.9220 },
  "bhandup": { latitude: 19.1450, longitude: 72.9370 },
  "bhandup east": { latitude: 19.1460, longitude: 72.9410 },
  "bhandup west": { latitude: 19.1450, longitude: 72.9290 },
  "kanjurmarg": { latitude: 19.1290, longitude: 72.9350 },
  "kanjurmarg east": { latitude: 19.1290, longitude: 72.9410 },
  "kanjurmarg west": { latitude: 19.1290, longitude: 72.9290 },
  "nahur": { latitude: 19.1540, longitude: 72.9410 },
  "nahur east": { latitude: 19.1540, longitude: 72.9470 },
  "nahur west": { latitude: 19.1540, longitude: 72.9350 },
  "tembhipada": { latitude: 19.1420, longitude: 72.9340 },
  "mulund": { latitude: 19.1726, longitude: 72.9565 },
  "mulund east": { latitude: 19.1720, longitude: 72.9630 },
  "mulund west": { latitude: 19.1726, longitude: 72.9490 },
  "johnson and johnson": { latitude: 19.1690, longitude: 72.9530 },

  // POWAI
  "powai": { latitude: 19.1176, longitude: 72.9060 },
  "hiranandani gardens": { latitude: 19.1190, longitude: 72.9110 },
  "chandivali": { latitude: 19.1100, longitude: 72.9010 },
  "tunga village": { latitude: 19.1150, longitude: 72.8990 },
  "lake homes": { latitude: 19.1170, longitude: 72.9050 },
  "saki vihar road": { latitude: 19.1120, longitude: 72.8950 },

  // CHEMBUR AND EASTERN SUBURBS
  "chembur": { latitude: 19.0522, longitude: 72.9005 },
  "chembur east": { latitude: 19.0530, longitude: 72.9080 },
  "chembur west": { latitude: 19.0520, longitude: 72.8920 },
  "tilak nagar": { latitude: 19.0650, longitude: 72.8970 },
  "govandi": { latitude: 19.0550, longitude: 72.9220 },
  "deonar": { latitude: 19.0460, longitude: 72.9070 },
  "shell colony": { latitude: 19.0600, longitude: 72.8990 },
  "sindhi society": { latitude: 19.0500, longitude: 72.8990 },
  "diamond garden": { latitude: 19.0530, longitude: 72.9000 },
  "subhash nagar": { latitude: 19.0580, longitude: 72.9050 },
  "trombay": { latitude: 19.0150, longitude: 72.9260 },
  "mankhurd": { latitude: 19.0480, longitude: 72.9310 },
  "shivaji nagar": { latitude: 19.0550, longitude: 72.9250 },
  "deonar farm road": { latitude: 19.0430, longitude: 72.9110 },

  // SOUTH AND CENTRAL MUMBAI
  "parel": { latitude: 18.9950, longitude: 72.8390 },
  "parel east": { latitude: 18.9950, longitude: 72.8450 },
  "parel west": { latitude: 18.9950, longitude: 72.8330 },
  "lalbaug": { latitude: 18.9900, longitude: 72.8370 },
  "lalbaug market": { latitude: 18.9900, longitude: 72.8350 },
  "kalachowki": { latitude: 18.9880, longitude: 72.8430 },
  "kala chowki": { latitude: 18.9880, longitude: 72.8430 },
  "abhyudaya nagar": { latitude: 18.9900, longitude: 72.8440 },
  "ganesh nagar lalbaug": { latitude: 18.9910, longitude: 72.8380 },
  "parsi colony parel": { latitude: 19.0000, longitude: 72.8400 },
  "sewri": { latitude: 18.9980, longitude: 72.8550 },
  "sewri east": { latitude: 18.9990, longitude: 72.8610 },
  "sewri west": { latitude: 18.9980, longitude: 72.8490 },
  "sewri fort area": { latitude: 18.9970, longitude: 72.8560 },
  "cotton green": { latitude: 18.9860, longitude: 72.8440 },
  "cotton green east": { latitude: 18.9860, longitude: 72.8490 },
  "cotton green west": { latitude: 18.9860, longitude: 72.8390 },
  "r a kidwai marg": { latitude: 19.0100, longitude: 72.8550 },
  "ambedkar nagar": { latitude: 18.9940, longitude: 72.8470 },
  "new hind mill area": { latitude: 18.9890, longitude: 72.8500 },
  "jai hind cinema area": { latitude: 18.9940, longitude: 72.8390 },

  // BYCULLA, MAZGAON AND NAGPADA
  "byculla": { latitude: 18.9766, longitude: 72.8328 },
  "byculla east": { latitude: 18.9780, longitude: 72.8400 },
  "byculla west": { latitude: 18.9760, longitude: 72.8260 },
  "byculla central": { latitude: 18.9770, longitude: 72.8330 },
  "byculla railway colony": { latitude: 18.9780, longitude: 72.8370 },
  "byculla station road": { latitude: 18.9780, longitude: 72.8340 },
  "byculla market": { latitude: 18.9760, longitude: 72.8340 },
  "jijamata udyan": { latitude: 18.9790, longitude: 72.8340 },
  "rani baug": { latitude: 18.9790, longitude: 72.8340 },
  "gloria church area": { latitude: 18.9750, longitude: 72.8350 },
  "clare road": { latitude: 18.9700, longitude: 72.8320 },
  "hansraj lane": { latitude: 18.9740, longitude: 72.8350 },
  "jacob circle": { latitude: 18.9870, longitude: 72.8310 },
  "new nagpada": { latitude: 18.9680, longitude: 72.8270 },
  "nagpada": { latitude: 18.9680, longitude: 72.8270 },
  "nagpada junction": { latitude: 18.9680, longitude: 72.8290 },
  "arab gully": { latitude: 18.9660, longitude: 72.8290 },
  "shuklaji street": { latitude: 18.9640, longitude: 72.8270 },
  "dimtimkar road": { latitude: 18.9670, longitude: 72.8290 },
  "kamathipura": { latitude: 18.9640, longitude: 72.8270 },
  "agripada": { latitude: 18.9750, longitude: 72.8250 },
  "maratha mandir area": { latitude: 18.9740, longitude: 72.8270 },
  "nm joshi marg": { latitude: 18.9900, longitude: 72.8290 },
  "arthur road": { latitude: 18.9850, longitude: 72.8290 },
  "jail road": { latitude: 18.9730, longitude: 72.8300 },
  "dagdi chawl": { latitude: 18.9700, longitude: 72.8310 },
  "chinchpokli": { latitude: 18.9870, longitude: 72.8330 },
  "chinchpokli east": { latitude: 18.9870, longitude: 72.8390 },
  "chinchpokli west": { latitude: 18.9870, longitude: 72.8270 },
  "mazgaon": { latitude: 18.9660, longitude: 72.8440 },
  "mazgaon east": { latitude: 18.9660, longitude: 72.8500 },
  "mazgaon west": { latitude: 18.9660, longitude: 72.8380 },
  "mazgaon road": { latitude: 18.9670, longitude: 72.8430 },
  "mazgaon dock": { latitude: 18.9630, longitude: 72.8450 },
  "mazgaon dockyard": { latitude: 18.9630, longitude: 72.8450 },
  "dockyard road": { latitude: 18.9630, longitude: 72.8400 },
  "dockyard railway colony": { latitude: 18.9650, longitude: 72.8400 },
  "dockyard east": { latitude: 18.9630, longitude: 72.8450 },
  "dockyard west": { latitude: 18.9630, longitude: 72.8350 },
  "wadi bunder": { latitude: 18.9580, longitude: 72.8420 },
  "princess dock": { latitude: 18.9580, longitude: 72.8430 },
  "victoria dock": { latitude: 18.9580, longitude: 72.8440 },
  "indira dock": { latitude: 18.9550, longitude: 72.8440 },
  "alexandra dock": { latitude: 18.9570, longitude: 72.8450 },
  "darukhana": { latitude: 18.9580, longitude: 72.8500 },
  "reay road": { latitude: 18.9780, longitude: 72.8440 },
  "reay road east": { latitude: 18.9780, longitude: 72.8490 },
  "reay road west": { latitude: 18.9780, longitude: 72.8390 },
  "ghodapdeo": { latitude: 18.9700, longitude: 72.8470 },
  "bhusa industrial estate": { latitude: 18.9610, longitude: 72.8490 },
  "gun powder road": { latitude: 18.9610, longitude: 72.8470 },
  "nawab tank road": { latitude: 18.9670, longitude: 72.8390 },
  "nesbit road": { latitude: 18.9690, longitude: 72.8400 },
  "rambhau bhogale marg": { latitude: 18.9670, longitude: 72.8440 },
  "barrister nath pai road": { latitude: 18.9730, longitude: 72.8420 },
  "dr mascarenhas road": { latitude: 18.9730, longitude: 72.8370 },
  "mathar pakhadi": { latitude: 18.9670, longitude: 72.8460 },
  "tadwadi": { latitude: 18.9700, longitude: 72.8430 },
  "love lane": { latitude: 18.9640, longitude: 72.8410 },
  "tank bunder": { latitude: 18.9600, longitude: 72.8440 },
  "frere road": { latitude: 18.9590, longitude: 72.8410 },
  "hay bunder": { latitude: 18.9560, longitude: 72.8460 },

  // DONGRI, UMERKHADI AND MANDVI
  "dongri": { latitude: 18.9610, longitude: 72.8330 },
  "dongri east": { latitude: 18.9610, longitude: 72.8380 },
  "dongri west": { latitude: 18.9610, longitude: 72.8280 },
  "umarkhadi": { latitude: 18.9600, longitude: 72.8360 },
  "umerkhadi": { latitude: 18.9600, longitude: 72.8360 },
  "mandvi": { latitude: 18.9560, longitude: 72.8340 },
  "mandvi koliwada": { latitude: 18.9540, longitude: 72.8340 },
  "noor baug": { latitude: 18.9570, longitude: 72.8320 },
  "imamwada": { latitude: 18.9580, longitude: 72.8300 },
  "pakmodia street": { latitude: 18.9600, longitude: 72.8290 },
  "bhendi bazaar": { latitude: 18.9580, longitude: 72.8290 },
  "bhendi bazaar east": { latitude: 18.9580, longitude: 72.8330 },
  "bhendi bazaar west": { latitude: 18.9580, longitude: 72.8250 },
  "jj marg": { latitude: 18.9580, longitude: 72.8310 },
  "sir jj road": { latitude: 18.9580, longitude: 72.8310 },
  "dr maheshwari road": { latitude: 18.9570, longitude: 72.8350 },
  "rb marg": { latitude: 18.9560, longitude: 72.8380 },
  "samantbhai nanji marg": { latitude: 18.9570, longitude: 72.8370 },
  "abdul rehman street": { latitude: 18.9520, longitude: 72.8320 },
  "yakub street": { latitude: 18.9540, longitude: 72.8300 },
  "sandhurst road": { latitude: 18.9580, longitude: 72.8390 },
  "sandhurst road east": { latitude: 18.9580, longitude: 72.8440 },
  "sandhurst road west": { latitude: 18.9580, longitude: 72.8340 },
  "khara tank road": { latitude: 18.9570, longitude: 72.8340 },
  "chinch bunder": { latitude: 18.9540, longitude: 72.8400 },
  "masjid bunder": { latitude: 18.9500, longitude: 72.8380 },
  "masjid bunder east": { latitude: 18.9500, longitude: 72.8430 },
  "masjid bunder west": { latitude: 18.9500, longitude: 72.8330 },
  "imamwada road": { latitude: 18.9580, longitude: 72.8310 },
  "null bazaar": { latitude: 18.9560, longitude: 72.8300 },
  "jama masjid area": { latitude: 18.9530, longitude: 72.8310 },
  "nagdevi street": { latitude: 18.9530, longitude: 72.8330 },
  "bhuleshwar road": { latitude: 18.9520, longitude: 72.8300 },

  // KHETWADI, GIRGAON AND GRANT ROAD
  "khetwadi": { latitude: 18.9600, longitude: 72.8190 },
  "girgaon": { latitude: 18.9550, longitude: 72.8180 },
  "girgaon east": { latitude: 18.9550, longitude: 72.8230 },
  "girgaon west": { latitude: 18.9550, longitude: 72.8130 },
  "girgaon chowpatty": { latitude: 18.9560, longitude: 72.8150 },
  "charni road": { latitude: 18.9510, longitude: 72.8190 },
  "charni road east": { latitude: 18.9510, longitude: 72.8240 },
  "charni road west": { latitude: 18.9510, longitude: 72.8140 },
  "khotachiwadi": { latitude: 18.9530, longitude: 72.8180 },
  "thakurdwar": { latitude: 18.9540, longitude: 72.8250 },
  "thakurdwar road": { latitude: 18.9540, longitude: 72.8250 },
  "chira bazaar": { latitude: 18.9510, longitude: 72.8290 },
  "fanaswadi": { latitude: 18.9500, longitude: 72.8270 },
  "phanaswadi": { latitude: 18.9500, longitude: 72.8270 },
  "cavel": { latitude: 18.9510, longitude: 72.8220 },
  "cp tank": { latitude: 18.9540, longitude: 72.8270 },
  "prarthana samaj": { latitude: 18.9560, longitude: 72.8210 },
  "opera house": { latitude: 18.9530, longitude: 72.8150 },
  "vp road": { latitude: 18.9540, longitude: 72.8240 },
  "grant road": { latitude: 18.9640, longitude: 72.8140 },
  "grant road east": { latitude: 18.9640, longitude: 72.8200 },
  "grant road west": { latitude: 18.9640, longitude: 72.8080 },
  "nana chowk": { latitude: 18.9630, longitude: 72.8120 },
  "gamdevi": { latitude: 18.9610, longitude: 72.8080 },
  "gowalia tank": { latitude: 18.9620, longitude: 72.8090 },
  "august kranti maidan": { latitude: 18.9620, longitude: 72.8090 },
  "wilson college area": { latitude: 18.9500, longitude: 72.8130 },

  // KALBADEVI AND BHULESHWAR
  "kalbadevi": { latitude: 18.9500, longitude: 72.8300 },
  "kalbadevi road": { latitude: 18.9500, longitude: 72.8300 },
  "bhuleshwar": { latitude: 18.9520, longitude: 72.8300 },
  "zaveri bazaar": { latitude: 18.9510, longitude: 72.8290 },
  "zaveri bazaar road": { latitude: 18.9510, longitude: 72.8290 },
  "chandanwadi": { latitude: 18.9470, longitude: 72.8270 },
  "kumbharwada": { latitude: 18.9540, longitude: 72.8310 },
  "khara talao": { latitude: 18.9540, longitude: 72.8340 },
  "lohar chawl": { latitude: 18.9480, longitude: 72.8300 },
  "mangaldas market": { latitude: 18.9500, longitude: 72.8300 },
  "mj market": { latitude: 18.9480, longitude: 72.8310 },
  "crawford market": { latitude: 18.9470, longitude: 72.8340 },
  "mahatma jyotiba phule mandai": { latitude: 18.9470, longitude: 72.8340 },
  "dava bazaar": { latitude: 18.9470, longitude: 72.8320 },
  "manish market": { latitude: 18.9480, longitude: 72.8330 },
  "dhanji street": { latitude: 18.9490, longitude: 72.8320 },
  "kika street": { latitude: 18.9500, longitude: 72.8290 },
  "shaikh memon street": { latitude: 18.9500, longitude: 72.8280 },
  "narayan dhuru street": { latitude: 18.9510, longitude: 72.8330 },
  "pophalwadi": { latitude: 18.9510, longitude: 72.8270 },
  "gulalwadi": { latitude: 18.9510, longitude: 72.8280 },
  "fofalwadi": { latitude: 18.9510, longitude: 72.8270 },
  "kolbhat lane": { latitude: 18.9520, longitude: 72.8250 },
  "vithalwadi": { latitude: 18.9510, longitude: 72.8260 },
  "ramwadi": { latitude: 18.9510, longitude: 72.8270 },
  "anant wadi": { latitude: 18.9510, longitude: 72.8280 },
  "champa wadi": { latitude: 18.9500, longitude: 72.8280 },
  "tambakata": { latitude: 18.9500, longitude: 72.8290 },
  "swadeshi market": { latitude: 18.9500, longitude: 72.8300 },
  "jss road": { latitude: 18.9500, longitude: 72.8270 },
  "jagannath shankarseth road": { latitude: 18.9570, longitude: 72.8270 },

  // FORT, CST, CHURCHGATE
  "fort": { latitude: 18.9322, longitude: 72.8354 },
  "fort north": { latitude: 18.9360, longitude: 72.8350 },
  "fort south": { latitude: 18.9280, longitude: 72.8350 },
  "ballard estate": { latitude: 18.9380, longitude: 72.8400 },
  "kala ghoda": { latitude: 18.9270, longitude: 72.8320 },
  "churchgate": { latitude: 18.9322, longitude: 72.8264 },
  "csmt area": { latitude: 18.9390, longitude: 72.8350 },
  "victoria terminus area": { latitude: 18.9390, longitude: 72.8350 },
  "azad maidan": { latitude: 18.9410, longitude: 72.8300 },
  "hutatma chowk": { latitude: 18.9300, longitude: 72.8330 },
  "flora fountain": { latitude: 18.9300, longitude: 72.8330 },
  "dalal street": { latitude: 18.9290, longitude: 72.8340 },
  "bse area": { latitude: 18.9290, longitude: 72.8340 },
  "stock exchange area": { latitude: 18.9290, longitude: 72.8340 },
  "nariman point": { latitude: 18.9250, longitude: 72.8230 },
  "express towers area": { latitude: 18.9250, longitude: 72.8230 },
  "free press journal marg": { latitude: 18.9280, longitude: 72.8230 },
  "mint road": { latitude: 18.9360, longitude: 72.8360 },
  "shahid bhagat singh road": { latitude: 18.9300, longitude: 72.8340 },
  "madame cama road": { latitude: 18.9250, longitude: 72.8200 },
  "veer nariman road": { latitude: 18.9320, longitude: 72.8250 },
  "dr dadabhai naoroji road": { latitude: 18.9340, longitude: 72.8330 },
  "dn road": { latitude: 18.9340, longitude: 72.8330 },
  "mg road": { latitude: 18.9310, longitude: 72.8320 },
  "samachar marg": { latitude: 18.9280, longitude: 72.8340 },
  "ropewalk lane": { latitude: 18.9280, longitude: 72.8310 },
  "mint colony": { latitude: 18.9360, longitude: 72.8360 },
  "colaba causeway": { latitude: 18.9220, longitude: 72.8320 },
  "esplanade": { latitude: 18.9340, longitude: 72.8310 },
  "bombay high court area": { latitude: 18.9290, longitude: 72.8300 },
  "mantralaya area": { latitude: 18.9260, longitude: 72.8210 },
  "azad maidan road": { latitude: 18.9400, longitude: 72.8310 },
  "fort market": { latitude: 18.9340, longitude: 72.8340 },
  "horniman circle": { latitude: 18.9300, longitude: 72.8340 },
  "st thomas cathedral area": { latitude: 18.9300, longitude: 72.8320 },
  "bombay gymkhana area": { latitude: 18.9320, longitude: 72.8280 },
  "marine lines": { latitude: 18.9440, longitude: 72.8240 },
  "marine drive south": { latitude: 18.9250, longitude: 72.8230 },

  // COLABA AND CUFFE PARADE
  "colaba": { latitude: 18.9067, longitude: 72.8147 },
  "upper colaba": { latitude: 18.9150, longitude: 72.8170 },
  "middle colaba": { latitude: 18.9100, longitude: 72.8170 },
  "lower colaba": { latitude: 18.9040, longitude: 72.8140 },
  "apollo bunder": { latitude: 18.9210, longitude: 72.8330 },
  "gateway of india area": { latitude: 18.9210, longitude: 72.8340 },
  "sassoon dock": { latitude: 18.9150, longitude: 72.8250 },
  "cuffe parade": { latitude: 18.9100, longitude: 72.8210 },
  "world trade centre area": { latitude: 18.9150, longitude: 72.8220 },
  "backbay reclamation": { latitude: 18.9200, longitude: 72.8180 },
  "nariman point south": { latitude: 18.9220, longitude: 72.8200 },
  "navy nagar": { latitude: 18.9020, longitude: 72.8090 },
  "ins shikra area": { latitude: 18.9050, longitude: 72.8170 },
  "rc church area": { latitude: 18.9100, longitude: 72.8150 },
  "cooperage": { latitude: 18.9250, longitude: 72.8250 },
  "colaba market": { latitude: 18.9070, longitude: 72.8140 },
  "strand road": { latitude: 18.9160, longitude: 72.8190 },
  "mandlik road": { latitude: 18.9150, longitude: 72.8220 },
  "woodhouse road": { latitude: 18.9130, longitude: 72.8190 },
  "garden road": { latitude: 18.9100, longitude: 72.8180 },
  "best colony colaba": { latitude: 18.9040, longitude: 72.8110 },
  "old navy nagar": { latitude: 18.9020, longitude: 72.8090 },
  "new navy nagar": { latitude: 18.9000, longitude: 72.8080 },
  "prescott road": { latitude: 18.9120, longitude: 72.8170 },

  // MALABAR HILL AND BREACH CANDY
  "malabar hill": { latitude: 18.9540, longitude: 72.8010 },
  "walkeshwar": { latitude: 18.9500, longitude: 72.7960 },
  "walkeshwar road": { latitude: 18.9500, longitude: 72.7970 },
  "banganga": { latitude: 18.9480, longitude: 72.7960 },
  "banganga tank area": { latitude: 18.9480, longitude: 72.7960 },
  "teen batti": { latitude: 18.9510, longitude: 72.8000 },
  "priyadarshini park": { latitude: 18.9660, longitude: 72.7980 },
  "raj bhavan area": { latitude: 18.9500, longitude: 72.7990 },
  "hanging gardens": { latitude: 18.9560, longitude: 72.8050 },
  "kamala nehru park": { latitude: 18.9560, longitude: 72.8050 },
  "cumballa hill": { latitude: 18.9670, longitude: 72.8050 },
  "kemps corner": { latitude: 18.9650, longitude: 72.8050 },
  "altamount road": { latitude: 18.9680, longitude: 72.8060 },
  "pedder road": { latitude: 18.9680, longitude: 72.8070 },
  "breach candy": { latitude: 18.9710, longitude: 72.8030 },
  "nepean sea road": { latitude: 18.9650, longitude: 72.8000 },
  "warden road": { latitude: 18.9700, longitude: 72.8050 },
  "little gibbs road": { latitude: 18.9580, longitude: 72.8030 },
  "ridge road": { latitude: 18.9540, longitude: 72.8020 },
  "carmichael road": { latitude: 18.9700, longitude: 72.8080 },
  "august kranti marg": { latitude: 18.9620, longitude: 72.8090 },
  "ns patkar marg": { latitude: 18.9630, longitude: 72.8060 },

  // TARDEO, MUMBAI CENTRAL AND MAHALAXMI
  "tardeo": { latitude: 18.9670, longitude: 72.8140 },
  "tardeo road": { latitude: 18.9670, longitude: 72.8140 },
  "tardeo ac market": { latitude: 18.9680, longitude: 72.8150 },
  "janta nagar tardeo": { latitude: 18.9670, longitude: 72.8170 },
  "mumbai central": { latitude: 18.9690, longitude: 72.8200 },
  "mumbai central east": { latitude: 18.9690, longitude: 72.8250 },
  "mumbai central west": { latitude: 18.9690, longitude: 72.8150 },
  "bellasis road": { latitude: 18.9700, longitude: 72.8210 },
  "saat rasta": { latitude: 18.9790, longitude: 72.8200 },
  "mahalaxmi": { latitude: 18.9820, longitude: 72.8180 },
  "mahalaxmi east": { latitude: 18.9820, longitude: 72.8240 },
  "mahalaxmi west": { latitude: 18.9820, longitude: 72.8120 },
  "mahalaxmi racecourse": { latitude: 18.9820, longitude: 72.8170 },
  "haji ali": { latitude: 18.9820, longitude: 72.8080 },
  "haji ali junction": { latitude: 18.9820, longitude: 72.8100 },
  "haji ali dargah area": { latitude: 18.9820, longitude: 72.8080 },
  "shakti mills": { latitude: 18.9910, longitude: 72.8190 },
  "jijamata nagar": { latitude: 18.9910, longitude: 72.8220 },
  "lower parel": { latitude: 18.9987, longitude: 72.8302 },
  "lower parel east": { latitude: 18.9990, longitude: 72.8370 },
  "lower parel west": { latitude: 18.9980, longitude: 72.8230 },
  "currey road": { latitude: 18.9940, longitude: 72.8330 },
  "delisle road": { latitude: 18.9940, longitude: 72.8270 },
  "byculla bridge area": { latitude: 18.9780, longitude: 72.8350 },

  // WORLI AND PRABHADEVI
  "worli": { latitude: 19.0176, longitude: 72.8162 },
  "worli east": { latitude: 19.0170, longitude: 72.8230 },
  "worli west": { latitude: 19.0170, longitude: 72.8090 },
  "worli sea face": { latitude: 19.0120, longitude: 72.8150 },
  "worli koliwada": { latitude: 19.0100, longitude: 72.8170 },
  "worli village": { latitude: 19.0120, longitude: 72.8180 },
  "worli naka": { latitude: 19.0060, longitude: 72.8170 },
  "worli dairy": { latitude: 19.0040, longitude: 72.8170 },
  "adarsh nagar worli": { latitude: 19.0120, longitude: 72.8200 },
  "century bazaar": { latitude: 19.0060, longitude: 72.8290 },
  "lovegrove": { latitude: 19.0050, longitude: 72.8240 },
  "siddhivinayak temple area": { latitude: 19.0160, longitude: 72.8300 },
  "elphinstone road": { latitude: 19.0070, longitude: 72.8350 },
  "senapati bapat marg": { latitude: 19.0040, longitude: 72.8310 },
  "appasaheb marathe marg": { latitude: 19.0140, longitude: 72.8270 },
  "annie besant road": { latitude: 19.0000, longitude: 72.8170 },
  "dr annie besant road": { latitude: 19.0000, longitude: 72.8170 },

  // THANE
  "thane": { latitude: 19.2183, longitude: 72.9781 },
  "thane west": { latitude: 19.2180, longitude: 72.9660 },
  "thane east": { latitude: 19.2180, longitude: 72.9870 },
  "ghodbunder road": { latitude: 19.2600, longitude: 72.9650 },
  "kasarvadavali": { latitude: 19.2700, longitude: 72.9700 },
  "majiwada": { latitude: 19.2050, longitude: 72.9820 },
  "manpada": { latitude: 19.2310, longitude: 72.9760 },
  "hiranandani estate": { latitude: 19.2540, longitude: 72.9780 },
  "vasant vihar": { latitude: 19.2250, longitude: 72.9630 },
  "kolshet": { latitude: 19.2300, longitude: 72.9900 },
  "balkum": { latitude: 19.2220, longitude: 72.9980 },
  "wagle estate": { latitude: 19.2020, longitude: 72.9560 },
  "naupada": { latitude: 19.1950, longitude: 72.9710 },
  "panchpakhadi": { latitude: 19.2020, longitude: 72.9700 },
  "kopri": { latitude: 19.1900, longitude: 72.9810 },
  "kalwa": { latitude: 19.1950, longitude: 73.0000 },
  "mumbra": { latitude: 19.1750, longitude: 73.0220 },
  "diva": { latitude: 19.1880, longitude: 73.0430 },
  "dhokali": { latitude: 19.2240, longitude: 72.9800 },
  "lokmanya nagar": { latitude: 19.2200, longitude: 72.9550 },
  "brahmand": { latitude: 19.2450, longitude: 72.9700 },
  "patlipada": { latitude: 19.2480, longitude: 72.9750 },

  // MIRA ROAD AND BHAYANDAR
  "mira road": { latitude: 19.2952, longitude: 72.8544 },
  "mira road east": { latitude: 19.2950, longitude: 72.8660 },
  "mira road west": { latitude: 19.2950, longitude: 72.8430 },
  "beverly park": { latitude: 19.2870, longitude: 72.8620 },
  "shanti nagar": { latitude: 19.2910, longitude: 72.8550 },
  "kanakia": { latitude: 19.2850, longitude: 72.8670 },
  "naya nagar": { latitude: 19.2860, longitude: 72.8510 },
  "hatkesh": { latitude: 19.2800, longitude: 72.8560 },
  "bhayandar": { latitude: 19.3010, longitude: 72.8510 },
  "bhayandar east": { latitude: 19.3020, longitude: 72.8640 },
  "bhayandar west": { latitude: 19.3010, longitude: 72.8400 },
  "navghar": { latitude: 19.3050, longitude: 72.8620 },
  "indralok": { latitude: 19.3100, longitude: 72.8570 },
  "uttan": { latitude: 19.2800, longitude: 72.7950 },

  // NAVI MUMBAI
  "airoli": { latitude: 19.1570, longitude: 72.9980 },
  "rabale": { latitude: 19.1450, longitude: 73.0000 },
  "ghansoli": { latitude: 19.1250, longitude: 73.0010 },
  "kopar khairane": { latitude: 19.1030, longitude: 73.0100 },
  "vashi": { latitude: 19.0770, longitude: 72.9980 },
  "sanpada": { latitude: 19.0610, longitude: 73.0090 },
  "juinagar": { latitude: 19.0510, longitude: 73.0180 },
  "nerul": { latitude: 19.0330, longitude: 73.0190 },
  "seawoods": { latitude: 19.0210, longitude: 73.0180 },
  "cbd belapur": { latitude: 19.0160, longitude: 73.0390 },
  "belapur": { latitude: 19.0160, longitude: 73.0390 },
  "kharghar": { latitude: 19.0470, longitude: 73.0690 },
  "kamothe": { latitude: 19.0160, longitude: 73.0950 },
  "kalamboli": { latitude: 19.0100, longitude: 73.1050 },
  "new panvel": { latitude: 18.9900, longitude: 73.1150 },
  "old panvel": { latitude: 18.9900, longitude: 73.1100 },
  "panvel": { latitude: 18.9900, longitude: 73.1100 },
  "taloja": { latitude: 19.0800, longitude: 73.1050 },
  "ulwe": { latitude: 18.9780, longitude: 73.0350 },
  "dronagiri": { latitude: 18.9500, longitude: 73.0400 },
  "pushpak nagar": { latitude: 18.9700, longitude: 73.0400 },
  "karanjade": { latitude: 18.9900, longitude: 73.0950 },
  "roadpali": { latitude: 19.0150, longitude: 73.1000 },

  // VASAI, NALASOPARA AND VIRAR
  "vasai": { latitude: 19.3600, longitude: 72.8000 },
  "vasai east": { latitude: 19.3700, longitude: 72.8300 },
  "vasai west": { latitude: 19.3600, longitude: 72.8000 },
  "nalasopara": { latitude: 19.4200, longitude: 72.8200 },
  "nalasopara east": { latitude: 19.4200, longitude: 72.8300 },
  "nalasopara west": { latitude: 19.4200, longitude: 72.8100 },
  "virar": { latitude: 19.4550, longitude: 72.8100 },
  "virar east": { latitude: 19.4550, longitude: 72.8200 },
  "virar west": { latitude: 19.4550, longitude: 72.8000 },
  "naigaon east": { latitude: 19.3500, longitude: 72.8500 },
  "naigaon west": { latitude: 19.3500, longitude: 72.8200 },
  "palghar": { latitude: 19.6960, longitude: 72.7650 },

  // OTHER NEARBY CITIES
  "badlapur": { latitude: 19.1550, longitude: 73.2650 },
  "ambernath": { latitude: 19.2000, longitude: 73.1900 },
  "ulhasnagar": { latitude: 19.2200, longitude: 73.1600 },
  "kalyan east": { latitude: 19.2400, longitude: 73.1500 },
  "kalyan west": { latitude: 19.2450, longitude: 73.1300 },
  "dombivli east": { latitude: 19.2160, longitude: 73.0920 },
  "dombivli west": { latitude: 19.2180, longitude: 73.0750 },
    // ADDITIONAL WESTERN SUBURBS
  "juhu": { latitude: 19.1075, longitude: 72.8263 },
  "juhu scheme": { latitude: 19.1080, longitude: 72.8240 },
  "juhu tara": { latitude: 19.0950, longitude: 72.8250 },
  "juhu beach": { latitude: 19.0980, longitude: 72.8260 },
  "madh island": { latitude: 19.1350, longitude: 72.7950 },
  "manori": { latitude: 19.2040, longitude: 72.7950 },
  "marve": { latitude: 19.1850, longitude: 72.8150 },
  "madh": { latitude: 19.1350, longitude: 72.7950 },
  "versova village": { latitude: 19.1300, longitude: 72.8110 },

  // ADDITIONAL EASTERN SUBURBS
  "vidyavihar": { latitude: 19.0790, longitude: 72.8970 },
  "vidyavihar east": { latitude: 19.0800, longitude: 72.9030 },
  "vidyavihar west": { latitude: 19.0790, longitude: 72.8910 },
  "chedda nagar": { latitude: 19.0570, longitude: 72.9100 },
  "pestom sagar": { latitude: 19.0580, longitude: 72.9060 },
  "basant park": { latitude: 19.0550, longitude: 72.9030 },
  "ghatla": { latitude: 19.0570, longitude: 72.9160 },
  "chembur camp": { latitude: 19.0550, longitude: 72.9000 },
  "suman nagar": { latitude: 19.0470, longitude: 72.8800 },
  "postal colony": { latitude: 19.0520, longitude: 72.8990 },
  "sahakar nagar": { latitude: 19.0390, longitude: 72.8780 },
  "new tilak nagar": { latitude: 19.0640, longitude: 72.8990 },
  "panjarpol": { latitude: 19.0470, longitude: 72.9130 },
  "siddharth colony": { latitude: 19.0520, longitude: 72.9100 },
  "bhakti park": { latitude: 19.0200, longitude: 72.8780 },
  "rcf": { latitude: 19.0450, longitude: 72.9220 },
  "mysore colony": { latitude: 19.0380, longitude: 72.9200 },
  "collector colony": { latitude: 19.0460, longitude: 72.9000 },
  "anushakti nagar": { latitude: 19.0420, longitude: 72.9240 },
  "vashinaka": { latitude: 19.0180, longitude: 72.9300 },
  "mahul": { latitude: 19.0000, longitude: 72.9300 },
  "mahul village": { latitude: 19.0050, longitude: 72.9270 },
  "wadavali village": { latitude: 19.0500, longitude: 72.9200 },
  "maravali": { latitude: 19.0450, longitude: 72.9190 },
  "julianwadi": { latitude: 19.0480, longitude: 72.9180 },
  "thakkar bappa colony": { latitude: 19.0520, longitude: 72.9230 },
  "pl lokhande marg": { latitude: 19.0520, longitude: 72.9240 },
  "baiganwadi": { latitude: 19.0560, longitude: 72.9270 },
  "gautam nagar": { latitude: 19.0580, longitude: 72.9250 },
  "lallubhai compound": { latitude: 19.0560, longitude: 72.9300 },
  "mandala": { latitude: 19.0400, longitude: 72.9350 },
  "trombay koliwada": { latitude: 19.0180, longitude: 72.9290 },
  "cheetah camp": { latitude: 19.0430, longitude: 72.9320 },
  "hp nagar": { latitude: 19.0390, longitude: 72.9240 },
  "bpcl": { latitude: 19.0380, longitude: 72.9250 },

  // WADALA ADDITIONAL LOCALITIES
  "sangam nagar": { latitude: 19.0210, longitude: 72.8660 },
  "bpt colony": { latitude: 19.0120, longitude: 72.8670 },
  "madhav nagar": { latitude: 19.0180, longitude: 72.8600 },
  "kidwai nagar": { latitude: 19.0250, longitude: 72.8610 },

  // SOUTH AND CENTRAL MUMBAI
  "dharavi": { latitude: 19.0440, longitude: 72.8550 },
  "dharavi koliwada": { latitude: 19.0440, longitude: 72.8500 },
  "koliwada": { latitude: 19.0400, longitude: 72.8500 },
  "pydhonie": { latitude: 18.9550, longitude: 72.8340 },
  "dhobi talao": { latitude: 18.9440, longitude: 72.8290 },
  "kalbadevi market": { latitude: 18.9500, longitude: 72.8300 },
   "koombarwara": { latitude: 18.9540, longitude: 72.8310 },
};

/**
 * Removes city/state suffixes and normalises spelling.
 */
function normalizeNeighbourhood(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.’']/g, "")
    .replace(/\b(mumbai|navi mumbai|thane|maharashtra|palghar)\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/,\s*,/g, ",")
    .replace(/^,|,$/g, "")
    .trim();
}

export function getNeighbourhoodCoordinates(
  neighbourhood: string | null
): Coordinates | null {
  if (!neighbourhood) return null;

  const normalized = normalizeNeighbourhood(neighbourhood);

  // First: exact full locality match.
  const exact = MUMBAI_NEIGHBOURHOODS[normalized];
  if (exact) return exact;

  // Second: try each comma-separated locality component.
  // Example: "Anand Nagar, Dahisar, Mumbai"
  // checks "anand nagar" and then "dahisar".
  const parts = normalized
    .split(",")
    .map(part => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const match = MUMBAI_NEIGHBOURHOODS[part];
    if (match) return match;
  }

  // Third: handle names with extra words.
  // Example: "Thakur Village, Kandivali" has its own exact anchor above.
  // Unknown micro-localities fall back to a recognised parent area.
  for (const part of parts) {
    const words = part.split(" ");

    for (let i = words.length - 1; i >= 1; i--) {
      const shorter = words.slice(0, i).join(" ");
      const match = MUMBAI_NEIGHBOURHOODS[shorter];
      if (match) return match;
    }
  }

  return null;
}

export function getDistanceKm(
  from: Coordinates,
  to: Coordinates
): number {
  const earthRadiusKm = 6371;

  const toRadians = (degrees: number) =>
    (degrees * Math.PI) / 180;

  const latitudeDifference = toRadians(
    to.latitude - from.latitude
  );

  const longitudeDifference = toRadians(
    to.longitude - from.longitude
  );

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitudeDifference / 2) ** 2;

  return (
    earthRadiusKm *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

export function getCurrentLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("GPS is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      error => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(
            new Error(
              "Location permission was denied. You can enable it in browser settings."
            )
          );
        } else if (error.code === error.TIMEOUT) {
          reject(
            new Error("Location request timed out. Please try again.")
          );
        } else {
          reject(
            new Error(
              "Could not determine your location. Please try again."
            )
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  });
}
