import { type ChapterStepMeta, createChapteredGuide } from './chapteredGuide';

// A new shop's first listing (D-195): 'home' points at the Products card on the
// owner's own page, 'product' walks the product form field by field. Seen state
// is local, like the Buddy and Social tours.
export type ShopGuideChapter = 'home' | 'product';

export type ShopGuideStep =
  | 'home_products'
  | 'product_photos'
  | 'product_name'
  | 'product_price'
  | 'product_publish';

export const SHOP_GUIDE_STEPS: ChapterStepMeta<ShopGuideChapter, ShopGuideStep>[] = [
  { id: 'home_products', chapter: 'home', ringRadius: 22 },
  { id: 'product_photos', chapter: 'product', ringRadius: 24 },
  { id: 'product_name', chapter: 'product', ringRadius: 'pill' },
  { id: 'product_price', chapter: 'product', ringRadius: 'pill' },
  { id: 'product_publish', chapter: 'product', ringRadius: 'pill' },
];

export const shopGuide = createChapteredGuide<ShopGuideChapter, ShopGuideStep>({
  steps: SHOP_GUIDE_STEPS,
  chapters: ['home', 'product'],
  storageKey: 'postervia.shop_guide.v1',
});
