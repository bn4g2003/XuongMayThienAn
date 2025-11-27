import { router } from '@/server/core/trpc';
import materialsRouter from './materials';
import productCategoriesRouter from './productCategories';
import productsRouter from './productsRouter';

const productsDomainRouter = router({
  categories: productCategoriesRouter,
  materials: materialsRouter,
  products: productsRouter,
});

export default productsDomainRouter;