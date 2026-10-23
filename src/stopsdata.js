// src/stopsdata.js

export const STOP_LIST = [
  {
    name: 'Toit',
    tag: 'Brewpub',
    copyKey: 'Toit',
    order: 'Tintin Toit Witbier and a wood-fired Margherita pizza, a must.',
    fact: 'Famous red-brick microbrewery at the 100 Feet and CMH Road junction.',
    driver: 'Friday evening drop-offs here mean a guaranteed jam on 100 Feet Road!',
    brand: false
  },
  {
    name: 'Indiranagar Metro',
    tag: 'Namma Metro',
    copyKey: 'Indiranagar Metro',
    order: 'Tap your Namma Metro smart card and ride the Purple Line to MG Road.',
    fact: 'Elevated Purple Line station that links east and west Bengaluru.',
    driver: 'Metro riders need a last-mile drop, and our auto is the king of that!',
    brand: false
  },
  {
    name: 'MTR 1924',
    tag: 'South Indian',
    copyKey: 'MTR 1924',
    order: 'Crispy Masala Dosa with ghee and filter coffee in a silver tumbler. The dosa is a must-try.',
    fact: 'Heritage South Indian restaurant (Mavalli Tiffin Rooms), running since 1924.',
    driver: 'A first sip of hot filter coffee makes the auto ride feel smooth!',
    brand: false
  },
  {
    name: 'Burma Burma Restaurant & Tea Room',
    tag: 'Burmese',
    copyKey: 'Burma Burma Restaurant & Tea Room',
    order: 'Try the Oh No Khow Suey and the Mandalay Laphet Thoke tea-leaf salad.',
    fact: 'Pure veg Burmese restaurant and tea room on 12th Main.',
    driver: 'Our roadside cutting chai versus their imported tea-leaf salad!',
    brand: false
  },
  {
    name: 'Indiranagar Social',
    tag: 'Social',
    copyKey: 'Indiranagar Social',
    order: 'Gunpowder Baby Potatoes and an iced cold brew on the terrace.',
    fact: 'A co-working cafe by day and a lively restobar on 80 Feet Road by night.',
    driver: 'They come with laptops and leave after partying, so the return fare is fixed!',
    brand: false
  },
  {
    name: 'Arena Brewhouse',
    tag: 'Brewhouse',
    copyKey: 'Arena Brewhouse',
    order: 'House craft wheat ale under the glass pyramid roof.',
    fact: 'You can spot the pyramid rooftop from far away in Indiranagar.',
    driver: 'Why fly to see an Egyptian pyramid when we have one right here in Indiranagar?',
    brand: false
  },
  {
    name: 'Meghana Biryani',
    tag: 'Biryani',
    copyKey: 'Meghana Biryani',
    order: 'Spicy Meghana Special Boneless Biryani with raita, guaranteed to end your hunger.',
    fact: 'Famous Andhra-style biryani spot near CMH Road.',
    driver: 'That biryani smell makes me hungry, please bring me a parcel too, sir!',
    brand: false
  },
  {
    name: "Pizza 4P's",
    tag: 'Pizza',
    copyKey: "Pizza 4P's",
    order: 'Homemade Burrata and Quattro Formaggi wood-fired pizza.',
    fact: 'Japanese-Italian artisanal pizzeria on Indiranagar Double Road.',
    driver: 'They pile on the cheese, so book a table a week ahead!',
    brand: false
  },
  {
    name: 'Jamie Oliver Kitchen',
    tag: 'Italian',
    copyKey: 'Jamie Oliver Kitchen',
    order: 'Hand-rolled Tagliatelle and hot garlic bread.',
    fact: 'Casual Italian place on the 12th Main dining strip.',
    driver: 'So many restaurants on 12th Main, and parking is the only real problem!',
    brand: false
  },
  {
    name: 'The Fatty Bao',
    tag: 'Asian',
    copyKey: 'The Fatty Bao',
    order: 'Fluffy baos and smoky ramen, eaten on the rooftop.',
    fact: 'Rooftop Asian gastrobar on 12th Main.',
    driver: 'A bao looks like an idli, so ask for some spicy chutney with it!',
    brand: false
  },
  {
    name: 'Sri Udupi Park',
    tag: 'Tiffin',
    copyKey: 'Sri Udupi Park',
    order: 'Ghee Roast Dosa, Medu Vada and hot By-Two filter coffee.',
    fact: 'Busy pure veg darshini on 100 Feet Road, best for a quick tiffin.',
    driver: 'This is the official pit-stop for auto drivers, ask for a by-two coffee, friend!',
    brand: false
  },
  {
    name: 'Chin Lung Brewery',
    tag: 'Brewery',
    copyKey: 'Chin Lung Brewery',
    order: 'Crispy Chilli Chicken and a cold pitcher on the open terrace.',
    fact: 'Old casual restobar on 100 Feet Road, a favourite hangout for friends.',
    driver: 'An old Bengaluru-style hangout, full of college crowd and energy!',
    brand: false
  },
  {
    name: 'Smoke House Deli',
    tag: 'Deli',
    copyKey: 'Smoke House Deli',
    order: 'Truffle Mac & Cheese and a smoked gourmet burger.',
    fact: 'European-style cafe on 100 Feet Road with white hand-drawn interiors.',
    driver: 'Everything is drawn by hand on the walls, and the inside feels very fancy!',
    brand: false
  },
  {
    name: 'Equilibrium Climbing',
    tag: 'Climbing Gym',
    copyKey: 'Equilibrium Climbing',
    order: 'Rent climbing shoes, chalk up and try the overhang boulder.',
    fact: 'Indoor bouldering and climbing gym near CMH Road.',
    driver: 'They pay money to climb walls?! Climbing into my auto is a free workout, friend!',
    brand: true
  },
  {
    name: 'CRED',
    tag: 'Fintech Office',
    copyKey: 'CRED',
    order: 'Show your credit score at reception and grab an artisanal espresso.',
    fact: 'Bengaluru fintech headquarters near 12th Main.',
    driver: 'A full black glass building, and everyone who works here is a cashback millionaire!',
    brand: true
  },
  {
    name: 'The Leela Palace',
    tag: 'Luxury Hotel',
    copyKey: 'The Leela Palace',
    order: 'Park the auto under the porte-cochere and stroll in the palace courtyard.',
    fact: 'Vijayanagara-style 5-star luxury hotel on Old Airport Road.',
    driver: 'Our yellow-green auto is going into a maharaja\'s palace, give it a salute!',
    brand: true
  },
  {
    name: 'Nike',
    tag: 'Sportswear',
    copyKey: 'Nike',
    order: 'Try on new running shoes, ready for a morning Cubbon Park 5K.',
    fact: 'Multi-storey sportswear flagship store on 100 Feet Road.',
    driver: 'If you ask the shoe price, you could change my auto tyres four times, sir!',
    brand: true
  },
  {
    name: 'Adidas',
    tag: 'Sportswear',
    copyKey: 'Adidas',
    order: 'Pick up a classic three-stripe track jacket and football boots.',
    fact: 'Sportswear and Originals store on the 100 Feet Road shopping stretch.',
    driver: 'They say three stripes make you run faster, so let us put stickers on our auto!',
    brand: true
  },
  {
    name: 'The Souled Store',
    tag: 'Merch',
    copyKey: 'The Souled Store',
    order: 'Grab an oversized comic-book graphic tee and superhero sneakers.',
    fact: 'Pop-culture clothing and merch on Indiranagar 100 Feet Road.',
    driver: 'You can find Batman and Superman tees here, but when does the Auto-Man tee arrive?',
    brand: true
  },
  {
    name: "Levi's",
    tag: 'Denim',
    copyKey: "Levi's",
    order: 'Try a classic 501 selvedge jean and a trucker jacket.',
    fact: 'Denim and casualwear showroom on 100 Feet Road.',
    driver: 'Jeans never wear out, and my auto seat cover should be made of denim too!',
    brand: true
  },
  {
    name: 'Hush Puppies',
    tag: 'Footwear',
    copyKey: 'Hush Puppies',
    order: 'Slip into comfortable leather loafers for Monday at the office.',
    fact: 'Casual and formal footwear on the 100 Feet Road retail corridor.',
    driver: 'Buy shoes at Hush Puppies, and my auto gives you a full cushion ride free!',
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
