import cateringPhoto from '../assets/images/packed_catering_foil_1792379888094.jpg';
import mealsPhoto from '../assets/images/packed_meal_clamshells_1792379887713.jpg';
import bakeryPhoto from '../assets/images/packed_bakery_bags_1792379888056.jpg';
import producePhoto from '../assets/images/packed_produce_crate_1792379888577.jpg';
import pantryPhoto from '../assets/images/packed_pantry_box_1792379889757.jpg';

export interface ReferenceFoodPhoto {
  id: string;
  name: string;
  category: string;
  description: string;
  url: string;
}

export const CAMPUS_SURPLUS_REFERENCE_PHOTOS: ReferenceFoodPhoto[] = [
  {
    id: 'packed_catering_foil_pans',
    name: 'Packed Catering Pans: Labeled Foil Trays',
    category: 'Prepared Meals',
    description: 'Deep aluminum pans sealed with crimped foil lids and kitchen date labels',
    url: cateringPhoto,
  },
  {
    id: 'packed_meal_clamshells',
    name: 'Packed Clamshells: Rescued Meal Boxes',
    category: 'Prepared Meals',
    description: 'Portioned meals sealed in clear snap-lid and kraft containers with pantry stickers',
    url: mealsPhoto,
  },
  {
    id: 'packed_bakery_crate',
    name: 'Packed Bakery: Bagged Loaves in Recovery Crate',
    category: 'Bakery & Bread',
    description: 'Surplus sliced bread and bagels bagged and tied in commercial transport crate',
    url: bakeryPhoto,
  },
  {
    id: 'packed_produce_box',
    name: 'Packed Produce: Fresh Fruit & Veggie Box',
    category: 'Produce & Fruit',
    description: 'Apples, oranges, and greens packed in labeled heavy-duty harvest delivery carton',
    url: producePhoto,
  },
  {
    id: 'packed_pantry_donation_box',
    name: 'Packed Pantry Box: Canned & Dry Goods',
    category: 'Packaged & Pantry',
    description: 'Sturdy food drive carton packed with canned goods, dry pasta, and pantry staples',
    url: pantryPhoto,
  },
];

export function getDefaultPhotoForFoodType(foodType: string): string {
  switch (foodType) {
    case 'Prepared Meals':
      return cateringPhoto;
    case 'Bakery & Bread':
      return bakeryPhoto;
    case 'Produce & Fruit':
      return producePhoto;
    case 'Dairy & Refrigerated':
      return mealsPhoto;
    case 'Packaged & Pantry':
      return pantryPhoto;
    default:
      return cateringPhoto;
  }
}

/** Convert legacy development URLs and expired browser blob URLs into production-safe asset URLs. */
export function resolveFoodPhotoUrl(url?: string, foodType = 'Prepared Meals'): string {
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) return getDefaultPhotoForFoodType(foodType);
  const legacyMatch = url.match(/packed_(catering_foil|meal_clamshells|bakery_bags|produce_crate|pantry_box)_\d+\.jpg$/);
  if (legacyMatch) {
    const legacyMap: Record<string, string> = {
      catering_foil: cateringPhoto,
      meal_clamshells: mealsPhoto,
      bakery_bags: bakeryPhoto,
      produce_crate: producePhoto,
      pantry_box: pantryPhoto,
    };
    return legacyMap[legacyMatch[1]] || getDefaultPhotoForFoodType(foodType);
  }
  return url;
}
