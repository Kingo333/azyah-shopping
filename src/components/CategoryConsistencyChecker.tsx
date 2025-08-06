
import { useCategories } from '@/hooks/useCategories';
import { CATEGORY_TREE } from '@/lib/categories';

interface CategoryConsistencyCheckerProps {
  children: React.ReactNode;
}

const CategoryConsistencyChecker: React.FC<CategoryConsistencyCheckerProps> = ({ children }) => {
  const { categories } = useCategories();
  
  // Log category consistency check for debugging
  if (process.env.NODE_ENV === 'development') {
    const dbCategories = categories.map(c => c.slug).sort();
    const staticCategories = Object.keys(CATEGORY_TREE).sort();
    
    const missingInDb = staticCategories.filter(cat => !dbCategories.includes(cat));
    const missingInStatic = dbCategories.filter(cat => !staticCategories.includes(cat));
    
    if (missingInDb.length > 0) {
      console.warn('Categories missing in DB:', missingInDb);
    }
    if (missingInStatic.length > 0) {
      console.warn('Categories missing in static list:', missingInStatic);
    }
    
    if (missingInDb.length === 0 && missingInStatic.length === 0) {
      console.log('✅ Category lists are in sync');
    }
  }
  
  return <>{children}</>;
};

export default CategoryConsistencyChecker;
