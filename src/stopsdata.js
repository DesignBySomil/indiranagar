// src/stopsdata.js

export const STOP_LIST = [
  {
    name: 'Toit',
    tag: 'Brewpub',
    copyKey: 'Toit',
    order: 'Tintin Toit Witbier aur wood-fired Margherita pizza, ekdum must hai.',
    fact: '100 Feet aur CMH Road junction pe red-brick wala famous microbrewery.',
    driver: 'Guru, Friday evening illi drop maadidre 100 Feet Road full jam guaranteed!',
    brand: false
  },
  {
    name: 'Indiranagar Metro',
    tag: 'Namma Metro',
    copyKey: 'Indiranagar Metro',
    order: 'Namma Metro smart card tap karo, Purple Line se MG Road nikal jao.',
    fact: 'Purple Line ka elevated station, east se west Bengaluru jodta hai.',
    driver: 'Metro bandmele last-mile drop ge nam auto ne king, meter matra kelbedi!',
    brand: false
  },
  {
    name: 'MTR 1924',
    tag: 'South Indian',
    copyKey: 'MTR 1924',
    order: 'Crispy Masala Dosa ghee ke saath aur silver tumbler mein filter coffee, yahan ka dosa must try hai.',
    fact: '1924 se chal rahi heritage South Indian restaurant, Mavalli Tiffin Rooms.',
    driver: 'First-u bisi filter kaapi kudidre ne auto gear smooth aagi bidodu!',
    brand: false
  },
  {
    name: 'Burma Burma Restaurant & Tea Room',
    tag: 'Burmese',
    copyKey: 'Burma Burma Restaurant & Tea Room',
    order: 'Oh No Khow Suey aur Mandalay Laphet Thoke tea-leaf salad try karo.',
    fact: '12th Main pe pure veg Burmese restaurant aur tea room.',
    driver: 'Chai andre nam roadside cutting chai, ivaradu imported tea leaf salad ante!',
    brand: false
  },
  {
    name: 'Indiranagar Social',
    tag: 'Social',
    copyKey: 'Indiranagar Social',
    order: 'Gunpowder Baby Potatoes aur terrace pe iced cold brew.',
    fact: 'Din mein co-working cafe, shaam ko 80 Feet Road ka lively restobar.',
    driver: 'Laptop hidkondu hogtare, sanje aadmele party maadtare - return fare fix!',
    brand: false
  },
  {
    name: 'Arena Brewhouse',
    tag: 'Brewhouse',
    copyKey: 'Arena Brewhouse',
    order: 'Glass pyramid chhat ke neeche house craft wheat ale.',
    fact: 'Indiranagar ki pyramid wali rooftop se turant pehchan jaate ho.',
    driver: 'Egypt pyramid nodakke flight yaake sir, nam Indiranagar alle ide nodi!',
    brand: false
  },
  {
    name: 'Meghana Biryani',
    tag: 'Biryani',
    copyKey: 'Meghana Biryani',
    order: 'Spicy Meghana Special Boneless Biryani raita ke saath, bhookh mitegi.',
    fact: 'Andhra-style biryani ka mashhoor adda, CMH Road ke paas.',
    driver: 'Aa biryani vasanege hasivu start aaythu, ondu parcel namgoo heli sir!',
    brand: false
  },
  {
    name: "Pizza 4P's",
    tag: 'Pizza',
    copyKey: "Pizza 4P's",
    order: 'Ghar ka bana Burrata aur Quattro Formaggi wood-fired pizza.',
    fact: 'Japanese-Italian artisanal pizzeria, Indiranagar Double Road pe.',
    driver: 'Cheese melinda cheese haaktare, table sigoke vaara munche booking maadbeku!',
    brand: false
  },
  {
    name: 'Jamie Oliver Kitchen',
    tag: 'Italian',
    copyKey: 'Jamie Oliver Kitchen',
    order: 'Hand-rolled Tagliatelle aur garam garlic bread.',
    fact: '12th Main ke dining strip pe casual Italian jagah.',
    driver: '12th Main alli verity restaurant-galu, parking matra devare gati!',
    brand: false
  },
  {
    name: 'The Fatty Bao',
    tag: 'Asian',
    copyKey: 'The Fatty Bao',
    order: 'Fluffy baos aur smoky ramen, rooftop pe baith ke khao.',
    fact: '12th Main ke upar Asian gastrobar, rooftop wala.',
    driver: 'Idli tara kaanutte aadre bao ante, swalpa spicy chutney haakri!',
    brand: false
  },
  {
    name: 'Sri Udupi Park',
    tag: 'Tiffin',
    copyKey: 'Sri Udupi Park',
    order: 'Ghee Roast Dosa, Medu Vada aur garam By-Two filter coffee.',
    fact: '100 Feet Road ka bheed wala pure veg darshini, jaldi tiffin ke liye best.',
    driver: 'Auto driver-galige official pit-stop idu, by-two kaapi heli guru!',
    brand: false
  },
  {
    name: 'Chin Lung Brewery',
    tag: 'Brewery',
    copyKey: 'Chin Lung Brewery',
    order: 'Crispy Chilli Chicken aur khuli terrace pe thanda pitcher.',
    fact: '100 Feet Road ka purana casual restobar, doston ka adda.',
    driver: 'Old Bengaluru style adda sir, college crowd inda full lively irutte!',
    brand: false
  },
  {
    name: 'Smoke House Deli',
    tag: 'Deli',
    copyKey: 'Smoke House Deli',
    order: 'Truffle Mac & Cheese aur smoked gourmet burger.',
    fact: '100 Feet Road pe European-style cafe, safed hand-drawn interiors ke saath.',
    driver: 'Gode mele ella pen drawing maadidare, olage hodre full fancy feel!',
    brand: false
  },
  {
    name: 'Equilibrium Climbing',
    tag: 'Climbing Gym',
    copyKey: 'Equilibrium Climbing',
    order: 'Climbing shoes kiraye pe lo, chalk lagao aur overhang boulder try karo.',
    fact: 'CMH Road ke paas indoor bouldering aur climbing gym.',
    driver: 'Gode hattokke duddu kodtara?! Nam auto hintere hattidre free workout guru!',
    brand: true
  },
  {
    name: 'CRED',
    tag: 'Fintech Office',
    copyKey: 'CRED',
    order: 'Reception pe credit score dikhao aur ek artisanal espresso pakdo.',
    fact: '12th Main ke paas Bengaluru ka fintech headquarters.',
    driver: 'Full black glass building sir, illi kelasa maadovrella cashback kotyadhipatigalu!',
    brand: true
  },
  {
    name: 'The Leela Palace',
    tag: 'Luxury Hotel',
    copyKey: 'The Leela Palace',
    order: 'Porte-cochere ke neeche auto park karo aur palace courtyard mein tehlo.',
    fact: 'Old Airport Road pe Vijayanagara style ka 5-star luxury hotel.',
    driver: 'Maharaja palace olage nam yellow-green auto hogtide, salute hodiri!',
    brand: true
  },
  {
    name: 'Nike',
    tag: 'Sportswear',
    copyKey: 'Nike',
    order: 'Naye running shoes pehno, subah Cubbon Park 5K ke liye ready.',
    fact: '100 Feet Road ka multi-storey sportswear flagship store.',
    driver: 'Shoe bele kelidre nam auto tyre naalku sarti change maadbahudu sir!',
    brand: true
  },
  {
    name: 'Adidas',
    tag: 'Sportswear',
    copyKey: 'Adidas',
    order: 'Classic three-stripe track jacket aur football boots utha lo.',
    fact: '100 Feet Road shopping stretch pe sportswear aur originals ki dukaan.',
    driver: 'Mooru Patti haakidre fast aagi odtara ante, nam auto ge sticker haakona!',
    brand: true
  },
  {
    name: 'The Souled Store',
    tag: 'Merch',
    copyKey: 'The Souled Store',
    order: 'Oversized comic-book graphic tee aur superhero sneakers le lo.',
    fact: 'Indiranagar 100 Feet Road pe pop-culture kapde aur merch.',
    driver: 'Batman, Superman t-shirt ella sigutte, Auto-Man t-shirt yaavaga barutte guru?',
    brand: true
  },
  {
    name: "Levi's",
    tag: 'Denim',
    copyKey: "Levi's",
    order: 'Classic 501 selvedge jeans aur trucker jacket try karke dekho.',
    fact: '100 Feet Road pe denim aur casualwear ka showroom.',
    driver: 'Jeans pant eshtu varsha aadru hariyalla, auto seat cover gu ide batte haakbeku!',
    brand: true
  },
  {
    name: 'Hush Puppies',
    tag: 'Footwear',
    copyKey: 'Hush Puppies',
    order: 'Monday office ke liye aaramdayak leather loafers pehno.',
    fact: '100 Feet Road retail corridor pe casual aur formal footwear.',
    driver: 'Hush Puppies alli shoe thogondu, nam auto alli full cushion ride free!',
    brand: true
  }
];

export const STOP_PLACES = {
  'Equilibrium Climbing': { x: -405.0, z: -233.0, road: 'Chinmaya Mission Hospital Road' },
  'CRED': { x: -104.1, z: 667.7, road: '12th Main Road' },
  'The Leela Palace': { x: 705.1, z: 1702.3, road: 'Old Airport Road' },
  'Nike': { x: -129.1, z: -154.8, road: '100 Feet Road' },
  'Adidas': { x: -66.7, z: 1111.7, road: '100 Feet Road' },
  'The Souled Store': { x: -118.0, z: 330.0, road: '100 Feet Road' },
  "Levi's": { x: -125.0, z: -60.0, road: '100 Feet Road' },
  'Hush Puppies': { x: -120.0, z: 470.0, road: '100 Feet Road' }
};

// Approximate Old Airport Road connector spur from the south end of 100 Feet Road (~ -66, 1300)
// curving east-southeast to The Leela Palace gate at (705.1, 1702.3) so the hotel is drivable & A* reachable.
export const LEELA_ACCESS_ROAD = [
  [-66.7, 1111.7],
  [-66.0, 1300.0],
  [25.0,  1410.0],
  [165.0, 1495.0],
  [320.0, 1565.0],
  [485.0, 1625.0],
  [615.0, 1672.0],
  [705.1, 1702.3]
];
