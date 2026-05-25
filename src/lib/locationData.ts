// Comprehensive location data for India and major world countries
// For India: country → state → city with full hierarchical data
// For other countries: country → state/province → major cities

export interface LocationEntry {
    country: string;
    states: {
        name: string;
        cities: string[];
    }[];
}

export const INDIA_STATES: { name: string; cities: string[] }[] = [
    {
        name: "Andhra Pradesh",
        cities: [
            "Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool",
            "Rajamahendravaram", "Kakinada", "Tirupati", "Anantapur", "Eluru",
            "Ongole", "Nandyal", "Kadapa", "Chittoor", "Vizianagaram",
            "Srikakulam", "Proddatur", "Bhimavaram", "Tenali", "Machilipatnam"
        ]
    },
    {
        name: "Arunachal Pradesh",
        cities: ["Itanagar", "Naharlagun", "Pasighat", "Tezpur", "Dibrugarh", "Ziro", "Bomdila"]
    },
    {
        name: "Assam",
        cities: [
            "Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon",
            "Tinsukia", "Tezpur", "Bongaigaon", "Dhubri", "Diphu",
            "North Lakhimpur", "Sivasagar", "Goalpara", "Barpeta"
        ]
    },
    {
        name: "Bihar",
        cities: [
            "Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga",
            "Bihar Sharif", "Purnia", "Arrah", "Katihar", "Begusarai",
            "Hajipur", "Dehri", "Sasaram", "Siwan", "Chapra",
            "Motihari", "Munger", "Bettiah", "Saharsa", "Buxar"
        ]
    },
    {
        name: "Chhattisgarh",
        cities: [
            "Raipur", "Bhilai", "Bilaspur", "Durg", "Rajnandgaon",
            "Korba", "Raigarh", "Jagdalpur", "Ambikapur", "Chirmiri"
        ]
    },
    {
        name: "Goa",
        cities: [
            "Panaji", "Vasco da Gama", "Margao", "Mapusa", "Ponda",
            "Bicholim", "Curchorem", "Sanquelim", "Cuncolim", "Calangute"
        ]
    },
    {
        name: "Gujarat",
        cities: [
            "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar",
            "Jamnagar", "Junagadh", "Gandhinagar", "Anand", "Navsari",
            "Morbi", "Nadiad", "Kutch", "Bharuch", "Mehsana",
            "Patan", "Porbandar", "Amreli", "Surendranagar", "Valsad"
        ]
    },
    {
        name: "Haryana",
        cities: [
            "Faridabad", "Gurgaon", "Panipat", "Ambala", "Yamunanagar",
            "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula",
            "Bhiwani", "Sirsa", "Bahadurgarh", "Rewari", "Kurukshetra",
            "Jhajjar", "Hansi", "Fatehabad", "Thanesar", "Jind"
        ]
    },
    {
        name: "Himachal Pradesh",
        cities: [
            "Shimla", "Dharamshala", "Solan", "Mandi", "Kullu",
            "Baddi", "Nahan", "Palampur", "Sundernagar", "Chamba"
        ]
    },
    {
        name: "Jharkhand",
        cities: [
            "Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar",
            "Phusro", "Hazaribagh", "Giridih", "Ramgarh", "Medininagar"
        ]
    },
    {
        name: "Karnataka",
        cities: [
            "Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi",
            "Davanagere", "Ballari", "Vijayapura", "Shivamogga", "Tumakuru",
            "Raichur", "Bidar", "Gulbarga", "Hassan", "Dharwad",
            "Udupi", "Hospet", "Gadag", "Bagalkot", "Chitradurga"
        ]
    },
    {
        name: "Kerala",
        cities: [
            "Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam",
            "Palakkad", "Alappuzha", "Malappuram", "Kannur", "Kasaragod",
            "Kottayam", "Idukki", "Wayanad", "Pathanamthitta", "Ernakulam",
            "Thrippunithura", "Aluva", "Muvattupuzha", "Perumbavoor", "Thalassery"
        ]
    },
    {
        name: "Madhya Pradesh",
        cities: [
            "Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain",
            "Sagar", "Ratlam", "Satna", "Dewas", "Murwara",
            "Singrauli", "Rewa", "Vidisha", "Guna", "Shivpuri",
            "Chhindwara", "Mandsaur", "Neemuch", "Itarsi", "Morena"
        ]
    },
    {
        name: "Maharashtra",
        cities: [
            "Mumbai", "Pune", "Nagpur", "Nashik", "Thane",
            "Aurangabad", "Solapur", "Amravati", "Navi Mumbai", "Kolhapur",
            "Akola", "Latur", "Dhule", "Ahmednagar", "Chandrapur",
            "Jalgaon", "Gondia", "Sangli", "Malegaon", "Jalna",
            "Panvel", "Pimpri-Chinchwad", "Bhiwandi", "Kalyan", "Vasai"
        ]
    },
    {
        name: "Manipur",
        cities: ["Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Senapati"]
    },
    {
        name: "Meghalaya",
        cities: ["Shillong", "Tura", "Jowai", "Baghmara", "Ampati"]
    },
    {
        name: "Mizoram",
        cities: ["Aizawl", "Lunglei", "Saiha", "Champhai", "Kolasib"]
    },
    {
        name: "Nagaland",
        cities: ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha"]
    },
    {
        name: "Odisha",
        cities: [
            "Bhubaneswar", "Cuttack", "Rourkela", "Brahmapur", "Sambalpur",
            "Puri", "Balasore", "Bhadrak", "Baripada", "Jharsuguda",
            "Jeypore", "Bargarh", "Paradip", "Angul", "Dhenkanal"
        ]
    },
    {
        name: "Punjab",
        cities: [
            "Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda",
            "Mohali", "Hoshiarpur", "Gurdaspur", "Phagwara", "Moga",
            "Firozpur", "Sangur", "Pathankot", "Fatehgarh Sahib", "Kapurthala",
            "Dera Bassi", "Zirakpur", "Khanna", "Abohar", "Barnala"
        ]
    },
    {
        name: "Rajasthan",
        cities: [
            "Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer",
            "Udaipur", "Bhilwara", "Alwar", "Sri Ganganagar", "Sikar",
            "Bharatpur", "Pali", "Beawar", "Hanumangarh", "Dhaulpur",
            "Kishangarh", "Tonk", "Barmer", "Dausa", "Bundi"
        ]
    },
    {
        name: "Sikkim",
        cities: ["Gangtok", "Namchi", "Gyalshing", "Mangan", "Jorethang"]
    },
    {
        name: "Tamil Nadu",
        cities: [
            "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem",
            "Tirunelveli", "Tiruppur", "Erode", "Vellore", "Thoothukudi",
            "Dindigul", "Thanjavur", "Ranipet", "Sivakasi", "Karur",
            "Udhagamandalam", "Hosur", "Nagercoil", "Kanchipuram", "Kumarapalayam",
            "Karaikkudi", "Neyveli", "Kumbakonam", "Tiruvannamalai", "Pollachi",
            "Rajapalayam", "Gudiyatham", "Pudukkottai", "Vaniyambadi", "Ambur",
            "Nagapattinam", "Villupuram", "Dharmapuri", "Cuddalore", "Krishnagiri",
            "Ariyalur", "Sivaganga", "Virudhunagar", "Namakkal", "Perambalur"
        ]
    },
    {
        name: "Telangana",
        cities: [
            "Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Ramagundam",
            "Khammam", "Mahbubnagar", "Secunderabad", "Nalgonda", "Adilabad",
            "Suryapet", "Miryalaguda", "Jagtial", "Mancherial", "Siddipet",
            "Sangareddy", "Wanaparthy", "Bhongir", "Palacole", "Vikarabad"
        ]
    },
    {
        name: "Tripura",
        cities: ["Agartala", "Dharmanagar", "Udaipur", "Kailashahar", "Ambassa"]
    },
    {
        name: "Uttar Pradesh",
        cities: [
            "Lucknow", "Kanpur", "Agra", "Varanasi", "Meerut",
            "Allahabad", "Ghaziabad", "Noida", "Bareilly", "Aligarh",
            "Gorakhpur", "Moradabad", "Saharanpur", "Firozabad", "Jhansi",
            "Ghazipur", "Mathura", "Muzaffarnagar", "Shahjahanpur", "Rampur",
            "Greater Noida", "Ayodhya", "Lakhimpur", "Etawah", "Bulandshahr",
            "Hapur", "Unnao", "Rae Bareli", "Banda", "Sitapur"
        ]
    },
    {
        name: "Uttarakhand",
        cities: [
            "Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur",
            "Kashipur", "Rishikesh", "Nainital", "Mussoorie", "Pithoragarh"
        ]
    },
    {
        name: "West Bengal",
        cities: [
            "Kolkata", "Asansol", "Siliguri", "Durgapur", "Bardhaman",
            "Malda", "Baharampur", "Habra", "Kharagpur", "Shantipur",
            "Dankuni", "Dhulian", "Ranaghat", "Uluberia", "Katihar",
            "Darjeeling", "Kurseong", "Haldia", "Cooch Behar", "Jalpaiguri"
        ]
    },
    // Union Territories
    {
        name: "Andaman and Nicobar Islands",
        cities: ["Port Blair", "Car Nicobar", "Diglipur"]
    },
    {
        name: "Chandigarh",
        cities: ["Chandigarh"]
    },
    {
        name: "Dadra and Nagar Haveli and Daman and Diu",
        cities: ["Silvassa", "Daman", "Diu"]
    },
    {
        name: "Delhi",
        cities: [
            "New Delhi", "Delhi", "Noida", "Gurugram", "Ghaziabad",
            "Faridabad", "South Delhi", "East Delhi", "North Delhi", "West Delhi",
            "Dwarka", "Rohini", "Pitampura", "Janakpuri", "Laxmi Nagar"
        ]
    },
    {
        name: "Jammu and Kashmir",
        cities: [
            "Srinagar", "Jammu", "Anantnag", "Sopore", "Kathua",
            "Baramulla", "Rajouri", "Poonch", "Udhampur", "Akhnoor"
        ]
    },
    {
        name: "Ladakh",
        cities: ["Leh", "Kargil", "Nubra", "Zanskar"]
    },
    {
        name: "Lakshadweep",
        cities: ["Kavaratti", "Agatti", "Amini"]
    },
    {
        name: "Puducherry",
        cities: ["Puducherry", "Karaikal", "Mahé", "Yanam"]
    }
];

// Major countries with states and cities
export const WORLD_LOCATION_DATA: LocationEntry[] = [
    {
        country: "India",
        states: INDIA_STATES
    },
    {
        country: "United States",
        states: [
            { name: "California", cities: ["Los Angeles", "San Francisco", "San Diego", "San Jose", "Sacramento", "Oakland", "Fresno", "Long Beach", "Bakersfield", "Anaheim"] },
            { name: "Texas", cities: ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth", "El Paso", "Arlington", "Corpus Christi", "Plano", "Lubbock"] },
            { name: "New York", cities: ["New York City", "Buffalo", "Yonkers", "Syracuse", "Albany", "Rochester", "New Rochelle", "Mount Vernon", "Schenectady", "Utica"] },
            { name: "Florida", cities: ["Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg", "Hialeah", "Tallahassee", "Fort Lauderdale", "Port St. Lucie", "Cape Coral"] },
            { name: "Illinois", cities: ["Chicago", "Aurora", "Joliet", "Naperville", "Rockford", "Springfield", "Elgin", "Peoria", "Champaign", "Waukegan"] },
            { name: "Pennsylvania", cities: ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading", "Scranton", "Bethlehem", "Lancaster", "Harrisburg", "Altoona"] },
            { name: "Ohio", cities: ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton", "Parma", "Canton", "Youngstown", "Lorain"] },
            { name: "Georgia", cities: ["Atlanta", "Augusta", "Columbus", "Macon", "Savannah", "Athens", "Sandy Springs", "South Fulton", "Roswell", "Macon"] },
            { name: "North Carolina", cities: ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem", "Fayetteville", "Cary", "Wilmington", "High Point", "Concord"] },
            { name: "Michigan", cities: ["Detroit", "Grand Rapids", "Warren", "Sterling Heights", "Lansing", "Ann Arbor", "Flint", "Dearborn", "Livonia", "Clinton"] },
            { name: "Washington", cities: ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue", "Kent", "Everett", "Renton", "Spokane Valley", "Federal Way"] },
            { name: "Arizona", cities: ["Phoenix", "Tucson", "Mesa", "Chandler", "Glendale", "Scottsdale", "Gilbert", "Tempe", "Peoria", "Surprise"] },
            { name: "Massachusetts", cities: ["Boston", "Worcester", "Springfield", "Lowell", "Cambridge", "New Bedford", "Brockton", "Quincy", "Lynn", "Fall River"] },
            { name: "Tennessee", cities: ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Clarksville", "Murfreesboro", "Franklin", "Jackson", "Johnson City", "Bartlett"] },
            { name: "Colorado", cities: ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Lakewood", "Thornton", "Arvada", "Westminster", "Pueblo", "Centennial"] },
            { name: "New Jersey", cities: ["Newark", "Jersey City", "Paterson", "Elizabeth", "Edison", "Woodbridge", "Lakewood", "Toms River", "Hamilton", "Trenton"] },
            { name: "Virginia", cities: ["Virginia Beach", "Norfolk", "Chesapeake", "Richmond", "Newport News", "Alexandria", "Hampton", "Roanoke", "Portsmouth", "Suffolk"] },
            { name: "Indiana", cities: ["Indianapolis", "Fort Wayne", "Evansville", "South Bend", "Carmel", "Fishers", "Bloomington", "Hammond", "Gary", "Lafayette"] },
            { name: "Missouri", cities: ["Kansas City", "St. Louis", "Springfield", "Columbia", "Independence", "Lee's Summit", "O'Fallon", "St. Joseph", "St. Charles", "Blue Springs"] },
            { name: "Nevada", cities: ["Las Vegas", "Henderson", "Reno", "North Las Vegas", "Sparks", "Carson City", "Fernley", "Elko", "Mesquite", "Boulder City"] }
        ]
    },
    {
        country: "United Kingdom",
        states: [
            { name: "England", cities: ["London", "Birmingham", "Manchester", "Leeds", "Liverpool", "Newcastle", "Sheffield", "Bristol", "Nottingham", "Leicester", "Southampton", "Oxford", "Cambridge", "Coventry", "Brighton"] },
            { name: "Scotland", cities: ["Edinburgh", "Glasgow", "Aberdeen", "Dundee", "Inverness", "Stirling", "Perth", "Livingston", "Kirkcaldy", "Ayr"] },
            { name: "Wales", cities: ["Cardiff", "Swansea", "Newport", "Bangor", "St Davids", "Wrexham", "Aberystwyth", "Merthyr Tydfil"] },
            { name: "Northern Ireland", cities: ["Belfast", "Londonderry", "Lisburn", "Newry", "Armagh", "Ballymena", "Antrim", "Omagh", "Enniskillen", "Coleraine"] }
        ]
    },
    {
        country: "Canada",
        states: [
            { name: "Ontario", cities: ["Toronto", "Ottawa", "Mississauga", "Brampton", "Hamilton", "London", "Markham", "Vaughan", "Kitchener", "Windsor", "Richmond Hill", "Oakville"] },
            { name: "British Columbia", cities: ["Vancouver", "Surrey", "Burnaby", "Richmond", "Kelowna", "Abbotsford", "Coquitlam", "Langley", "Delta", "Kamloops"] },
            { name: "Alberta", cities: ["Calgary", "Edmonton", "Red Deer", "Lethbridge", "St. Albert", "Medicine Hat", "Grande Prairie", "Airdrie", "Spruce Grove", "Leduc"] },
            { name: "Quebec", cities: ["Montreal", "Quebec City", "Laval", "Gatineau", "Longueuil", "Sherbrooke", "Saguenay", "Lévis", "Trois-Rivières", "Terrebonne"] },
            { name: "Manitoba", cities: ["Winnipeg", "Brandon", "Steinbach", "Thompson", "Portage la Prairie"] },
            { name: "Saskatchewan", cities: ["Saskatoon", "Regina", "Prince Albert", "Moose Jaw", "Swift Current"] },
            { name: "Nova Scotia", cities: ["Halifax", "Dartmouth", "Sydney", "Truro", "New Glasgow"] },
            { name: "New Brunswick", cities: ["Moncton", "Saint John", "Fredericton", "Miramichi", "Dieppe"] }
        ]
    },
    {
        country: "Australia",
        states: [
            { name: "New South Wales", cities: ["Sydney", "Newcastle", "Wollongong", "Central Coast", "Wagga Wagga", "Albury", "Port Macquarie", "Orange", "Tamworth", "Dubbo"] },
            { name: "Victoria", cities: ["Melbourne", "Geelong", "Ballarat", "Bendigo", "Launceston", "Wodonga", "Mildura", "Traralgon", "Shepparton", "Warnambool"] },
            { name: "Queensland", cities: ["Brisbane", "Gold Coast", "Sunshine Coast", "Townsville", "Cairns", "Toowoomba", "Rockhampton", "Bundaberg", "Mackay", "Gladstone"] },
            { name: "South Australia", cities: ["Adelaide", "Mount Gambier", "Whyalla", "Port Augusta", "Port Pirie", "Murray Bridge", "Victor Harbor", "Port Lincoln"] },
            { name: "Western Australia", cities: ["Perth", "Mandurah", "Bunbury", "Geraldton", "Kalgoorlie", "Albany", "Karratha", "Broome", "Port Hedland"] },
            { name: "Tasmania", cities: ["Hobart", "Launceston", "Devonport", "Burnie", "Shannon"] },
            { name: "Australian Capital Territory", cities: ["Canberra", "Tuggeranong", "Belconnen", "Woden"] },
            { name: "Northern Territory", cities: ["Darwin", "Alice Springs", "Palmerston", "Katherine"] }
        ]
    },
    {
        country: "Germany",
        states: [
            { name: "Bavaria", cities: ["Munich", "Nuremberg", "Augsburg", "Regensburg", "Ingolstadt", "Würzburg", "Erlangen", "Fürth", "Bayreuth", "Bamberg"] },
            { name: "North Rhine-Westphalia", cities: ["Cologne", "Düsseldorf", "Dortmund", "Essen", "Duisburg", "Bochum", "Wuppertal", "Bonn", "Bielefeld", "Münster"] },
            { name: "Baden-Württemberg", cities: ["Stuttgart", "Karlsruhe", "Freiburg", "Heidelberg", "Heilbronn", "Ulm", "Mannheim", "Pforzheim", "Reutlingen", "Tübingen"] },
            { name: "Berlin", cities: ["Berlin"] },
            { name: "Hamburg", cities: ["Hamburg"] },
            { name: "Hesse", cities: ["Frankfurt", "Wiesbaden", "Kassel", "Darmstadt", "Fulda", "Hanau", "Gießen", "Marburg"] },
            { name: "Lower Saxony", cities: ["Hannover", "Braunschweig", "Osnabrück", "Wolfsburg", "Göttingen", "Oldenburg", "Hildesheim"] },
            { name: "Saxony", cities: ["Leipzig", "Dresden", "Chemnitz", "Zwickau", "Erfurt", "Jena"] }
        ]
    },
    {
        country: "France",
        states: [
            { name: "Île-de-France", cities: ["Paris", "Versailles", "Boulogne-Billancourt", "Montreuil", "Saint-Denis", "Nanterre", "Créteil", "Vincennes"] },
            { name: "Auvergne-Rhône-Alpes", cities: ["Lyon", "Grenoble", "Clermont-Ferrand", "Saint-Étienne", "Villeurbanne", "Annecy", "Chambéry", "Valence"] },
            { name: "Nouvelle-Aquitaine", cities: ["Bordeaux", "Limoges", "Pau", "Bayonne", "Mérignac", "Pessac", "Angoulême"] },
            { name: "Occitanie", cities: ["Toulouse", "Montpellier", "Nîmes", "Perpignan", "Béziers", "Albi"] },
            { name: "Provence-Alpes-Côte d'Azur", cities: ["Marseille", "Nice", "Toulon", "Aix-en-Provence", "Antibes", "Cannes", "Grasse"] }
        ]
    },
    {
        country: "Singapore",
        states: [
            { name: "Central Region", cities: ["Singapore", "Central Area", "Bishan", "Bukit Merah", "Bukit Timah", "Downtown Core", "Geylang", "Kallang", "Marine Parade", "Novena", "Queenstown", "Rochor", "Singapore River", "Southern Islands", "Straits View", "Tanglin", "Toa Payoh"] },
            { name: "East Region", cities: ["Bedok", "Changi", "Pasir Ris", "Tampines"] },
            { name: "North Region", cities: ["Mandai", "Sembawang", "Simpang", "Sungei Kadut", "Woodlands", "Yishun"] },
            { name: "North-East Region", cities: ["Ang Mo Kio", "Hougang", "North-Eastern Islands", "Punggol", "Sengkang", "Serangoon"] },
            { name: "West Region", cities: ["Boon Lay", "Bukit Batok", "Bukit Panjang", "Choa Chu Kang", "Clementi", "Jurong East", "Jurong West", "Pioneer", "Tengah", "Tuas", "Western Islands", "Western Water Catchment"] }
        ]
    },
    {
        country: "UAE",
        states: [
            { name: "Dubai", cities: ["Dubai", "Deira", "Bur Dubai", "Jumeirah", "Al Quoz", "Business Bay", "Downtown Dubai", "Dubai Marina", "Palm Jumeirah", "JLT"] },
            { name: "Abu Dhabi", cities: ["Abu Dhabi", "Al Ain", "Musaffah", "Khalifa City", "Al Gharbia", "Reem Island", "Saadiyat Island"] },
            { name: "Sharjah", cities: ["Sharjah", "Khor Fakkan", "Kalba", "Dhaid"] },
            { name: "Ajman", cities: ["Ajman"] },
            { name: "Fujairah", cities: ["Fujairah", "Dibba Al Fujairah"] },
            { name: "Ras Al Khaimah", cities: ["Ras Al Khaimah", "Al Jazeera Al Hamra"] },
            { name: "Umm Al Quwain", cities: ["Umm Al Quwain"] }
        ]
    },
    {
        country: "Saudi Arabia",
        states: [
            { name: "Riyadh", cities: ["Riyadh", "Al Kharj", "Dawadmi", "Muzahmiyya"] },
            { name: "Mecca", cities: ["Mecca", "Jeddah", "Taif", "Rabigh"] },
            { name: "Medina", cities: ["Medina", "Yanbu", "Al Ula"] },
            { name: "Eastern Province", cities: ["Dammam", "Al Qatif", "Al Ahsa", "Dhahran", "Jubail", "Khobar"] }
        ]
    },
    {
        country: "Japan",
        states: [
            { name: "Tokyo", cities: ["Tokyo", "Shinjuku", "Shibuya", "Akihabara", "Harajuku", "Ikebukuro"] },
            { name: "Osaka", cities: ["Osaka", "Sakai", "Higashiosaka", "Toyonaka", "Suita"] },
            { name: "Kanagawa", cities: ["Yokohama", "Kawasaki", "Sagamihara", "Kamakura"] },
            { name: "Aichi", cities: ["Nagoya", "Toyota", "Okazaki", "Seto"] },
            { name: "Fukuoka", cities: ["Fukuoka", "Kitakyushu", "Kurume", "Kasuga"] },
            { name: "Hokkaido", cities: ["Sapporo", "Asahikawa", "Hakodate", "Kushiro"] }
        ]
    },
    {
        country: "China",
        states: [
            { name: "Guangdong", cities: ["Guangzhou", "Shenzhen", "Dongguan", "Foshan", "Zhuhai", "Huizhou"] },
            { name: "Zhejiang", cities: ["Hangzhou", "Ningbo", "Wenzhou", "Shaoxing", "Suzhou", "Jinhua"] },
            { name: "Beijing", cities: ["Beijing", "Haidian", "Chaoyang", "Dongcheng"] },
            { name: "Shanghai", cities: ["Shanghai", "Pudong", "Huangpu", "Jing'an", "Xuhui"] },
            { name: "Sichuan", cities: ["Chengdu", "Mianyang", "Deyang", "Nanchong"] },
            { name: "Jiangsu", cities: ["Nanjing", "Suzhou", "Wuxi", "Changzhou", "Xuzhou"] }
        ]
    },
    {
        country: "Pakistan",
        states: [
            { name: "Punjab", cities: ["Lahore", "Faisalabad", "Rawalpindi", "Gujranwala", "Multan", "Sialkot", "Bahawalpur", "Sargodha"] },
            { name: "Sindh", cities: ["Karachi", "Hyderabad", "Sukkur", "Larkana", "Mirpur Khas"] },
            { name: "Khyber Pakhtunkhwa", cities: ["Peshawar", "Mardan", "Swat", "Abbottabad", "Mansehra"] },
            { name: "Balochistan", cities: ["Quetta", "Turbat", "Khuzdar", "Hub"] },
            { name: "Islamabad Capital Territory", cities: ["Islamabad"] }
        ]
    },
    {
        country: "Bangladesh",
        states: [
            { name: "Dhaka Division", cities: ["Dhaka", "Narayanganj", "Gazipur", "Manikganj"] },
            { name: "Chittagong Division", cities: ["Chittagong", "Comilla", "Cox's Bazar", "Feni"] },
            { name: "Rajshahi Division", cities: ["Rajshahi", "Bogra", "Naogaon", "Pabna"] },
            { name: "Khulna Division", cities: ["Khulna", "Jessore", "Barisal", "Satkhira"] }
        ]
    },
    {
        country: "Sri Lanka",
        states: [
            { name: "Western Province", cities: ["Colombo", "Sri Jayawardenepura Kotte", "Negombo", "Gampaha"] },
            { name: "Central Province", cities: ["Kandy", "Matale", "Nuwara Eliya"] },
            { name: "Southern Province", cities: ["Galle", "Matara", "Hambantota"] },
            { name: "Northern Province", cities: ["Jaffna", "Vavuniya", "Kilinochchi"] }
        ]
    },
    {
        country: "Nepal",
        states: [
            { name: "Bagmati Province", cities: ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara", "Hetauda"] },
            { name: "Gandaki Province", cities: ["Pokhara", "Baglung", "Gorkha", "Lamjung"] },
            { name: "Lumbini Province", cities: ["Butwal", "Bhairahawa", "Kapilavastu", "Palpa"] }
        ]
    },
    {
        country: "Malaysia",
        states: [
            { name: "Kuala Lumpur", cities: ["Kuala Lumpur", "Chow Kit", "Brickfields", "Bangsar", "Petaling Jaya"] },
            { name: "Selangor", cities: ["Shah Alam", "Petaling Jaya", "Klang", "Subang Jaya", "Ampang"] },
            { name: "Penang", cities: ["George Town", "Butterworth", "Batu Feringghi", "Balik Pulau"] },
            { name: "Johor", cities: ["Johor Bahru", "Muar", "Batu Pahat", "Kulai"] },
            { name: "Sabah", cities: ["Kota Kinabalu", "Sandakan", "Tawau", "Lahad Datu"] }
        ]
    },
    {
        country: "Indonesia",
        states: [
            { name: "DKI Jakarta", cities: ["Jakarta", "North Jakarta", "South Jakarta", "East Jakarta", "West Jakarta", "Central Jakarta"] },
            { name: "West Java", cities: ["Bandung", "Bekasi", "Depok", "Bogor", "Tasikmalaya", "Cimahi"] },
            { name: "East Java", cities: ["Surabaya", "Malang", "Pasuruan", "Sidoarjo", "Blitar"] },
            { name: "Central Java", cities: ["Semarang", "Solo", "Pekalongan", "Tegal", "Magelang"] },
            { name: "Bali", cities: ["Denpasar", "Ubud", "Kuta", "Seminyak", "Sanur"] }
        ]
    }
];

// Get all countries
export const getAllCountries = (): string[] => {
    return WORLD_LOCATION_DATA.map(entry => entry.country).sort();
};

// Get states for a given country
export const getStatesForCountry = (country: string): string[] => {
    const entry = WORLD_LOCATION_DATA.find(
        e => e.country.toLowerCase() === country.toLowerCase()
    );
    if (!entry) return [];
    return entry.states.map(s => s.name).sort();
};

// Get cities for a given country and state
export const getCitiesForState = (country: string, state: string): string[] => {
    const entry = WORLD_LOCATION_DATA.find(
        e => e.country.toLowerCase() === country.toLowerCase()
    );
    if (!entry) return [];
    const stateEntry = entry.states.find(
        s => s.name.toLowerCase() === state.toLowerCase()
    );
    if (!stateEntry) return [];
    return stateEntry.cities.sort();
};

// Search across all location data
export const searchCountries = (query: string): string[] => {
    if (!query.trim()) return getAllCountries();
    const q = query.toLowerCase();
    return getAllCountries().filter(c => c.toLowerCase().includes(q));
};

export const searchStates = (country: string, query: string): string[] => {
    const states = getStatesForCountry(country);
    if (!query.trim()) return states;
    const q = query.toLowerCase();
    return states.filter(s => s.toLowerCase().includes(q));
};

export const searchCities = (country: string, state: string, query: string): string[] => {
    const cities = getCitiesForState(country, state);
    if (!query.trim()) return cities;
    const q = query.toLowerCase();
    return cities.filter(c => c.toLowerCase().includes(q));
};
