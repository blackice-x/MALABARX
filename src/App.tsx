import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Search, 
  MessageSquare, 
  ChevronRight, 
  Star, 
  ShieldCheck, 
  Truck, 
  ArrowRight,
  LogOut,
  User as UserIcon,
  Loader2,
  CheckCircle2,
  X,
  Home,
  LayoutGrid,
  Zap,
  MapPin,
  Phone as PhoneIcon,
  Mail,
  ShoppingCart,
  History,
  MessageCircle,
  Plus,
  Minus,
  Trash2,
  Settings as SettingsIcon,
  Music,
  Volume2,
  VolumeX
} from 'lucide-react';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { cn } from './lib/utils';

// Types
interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  category: 'Shirts' | 'Shoes' | 'Kids Wear' | 'Streetwear' | 'Vintage';
}

interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  phone?: string;
  address?: string;
  onboarded: boolean;
  role: 'user' | 'admin';
  notificationsEnabled?: boolean;
}

interface CartItem extends Product {
  quantity: number;
}

interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  createdAt: any;
  shippingAddress: string;
}

const LOGO_URL = "https://i.ibb.co/fVvSrTD1/Chat-GPT-Image-Apr-10-2026-10-47-43-PM-removebg-preview.png";

const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Urban Nomad Jacket',
    price: 2199,
    oldPrice: 3299,
    image: 'https://i.ibb.co/q3X0sd1B/b1262377b8a74d68b0d55d0f17731a84.jpg',
    category: 'Streetwear'
  },
  {
    id: '2',
    name: 'Elite Tech Parka',
    price: 3500,
    oldPrice: 5000,
    image: 'https://i.ibb.co/1JXYsFJk/e4e7f8fe5c59a81370a99e2984ed7d82.jpg',
    category: 'Streetwear'
  },
  {
    id: '3',
    name: 'Midnight Cargo Set',
    price: 2999,
    oldPrice: 4999,
    image: 'https://i.ibb.co/yBythQ6g/8389d5beef63208c6ef95c6c8121f44b.jpg',
    category: 'Streetwear'
  },
  {
    id: '4',
    name: 'Cyberpunk Windbreaker',
    price: 2999,
    oldPrice: 4999,
    image: 'https://i.ibb.co/G43MpGLg/234d1243be19c784d03ccee018a2918f.jpg',
    category: 'Streetwear'
  },
  {
    id: '5',
    name: 'Stealth Bomber Jacket',
    price: 3500,
    oldPrice: 5000,
    image: 'https://i.ibb.co/XZLtCM8V/2832c1f23c078490d5d1e879c00eb672.jpg',
    category: 'Streetwear'
  },
  {
    id: '6',
    name: 'Oversized Graphic Tee',
    price: 2999,
    oldPrice: 4999,
    image: 'https://i.ibb.co/vxqdS9vK/653ee1784861e524b476e029a708f1ee.jpg',
    category: 'Shirts'
  },
  {
    id: '7',
    name: 'Urban Street Sneakers',
    price: 2999,
    oldPrice: 4999,
    image: 'https://i.ibb.co/V65dFC8/9a112614b6225b3672649aa3fe8a1c7a.jpg',
    category: 'Shoes'
  },
  {
    id: '8',
    name: 'Mini Street Fit',
    price: 2999,
    oldPrice: 4999,
    image: 'https://i.ibb.co/Csvq6st1/d256bd43b89917b4e4e381b4373e06e8.jpg',
    category: 'Kids Wear'
  },
  {
    id: '9',
    name: 'Vintage Streetwear Set',
    price: 2999,
    oldPrice: 4999,
    image: 'https://i.ibb.co/gFZ6rh4f/Vintage-Streetwear.jpg',
    category: 'Vintage'
  }
];

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  // Cart & Orders State
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('malabar_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddressBookOpen, setIsAddressBookOpen] = useState(false);
  const [isLookbookOpen, setIsLookbookOpen] = useState(false);
  const [isMusicEnabled, setIsMusicEnabled] = useState(false);
  const [volume, setVolume] = useState(50);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | 'refund' | 'cancellation' | null>(null);

  // Onboarding Form
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingPhone, setOnboardingPhone] = useState('');
  const [onboardingAddress, setOnboardingAddress] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [tempAddress, setTempAddress] = useState('');

  // Support Form State
  const [supportName, setSupportName] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportIssue, setSupportIssue] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (profileDoc.exists()) {
          const profileData = profileDoc.data() as UserProfile;
          setProfile(profileData);
          if (!profileData.onboarded) {
            setIsOnboardingOpen(true);
          }
        } else {
          // Create initial profile
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            onboarded: false,
            role: 'user'
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setProfile(newProfile);
          setIsOnboardingOpen(true);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('malabar_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(fetchedOrders);
    } catch (error) {
      console.error('Fetch Orders Error:', error);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePlaceOrder = async () => {
    if (!user || !profile) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!profile.onboarded) {
      setIsOnboardingOpen(true);
      return;
    }
    
    setIsPlacingOrder(true);
    try {
      const orderData = {
        userId: user.uid,
        items: cart,
        total: cartTotal,
        status: 'pending',
        paymentMethod: 'WhatsApp',
        createdAt: serverTimestamp(),
        shippingAddress: profile.address || ''
      };
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Prepare WhatsApp message for payment
      const phone = "919902823251";
      const itemsList = cart.map(item => `- ${item.name} (x${item.quantity})`).join('\n');
      const message = `*NEW ORDER: #${docRef.id}*\n\n*Items:*\n${itemsList}\n\n*Total:* ₹${cartTotal}\n*Address:* ${profile.address}\n\nI'd like to proceed with the payment for this order.`;
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      
      setCart([]);
      setIsCartOpen(false);
      fetchOrders();
      
      alert('Order recorded! Redirecting to WhatsApp for payment...');
      window.open(url, '_blank');
    } catch (error) {
      console.error('Order Error:', error);
      alert('Failed to place order.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const scrollToProducts = () => {
    const el = document.getElementById('products');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const openWhatsApp = (product: Product) => {
    const phone = "919902823251"; // Updated business number
    const message = `Hello MALABAR X! I'm interested in ordering:\n\n*Product:* ${product.name}\n*Price:* ₹${product.price}\n*Category:* ${product.category}\n\nPlease let me know the availability.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setIsAuthModalOpen(false);
    } catch (error) {
      console.error('Login Error:', error);
      alert('Failed to login with Google.');
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: onboardingName,
        phone: onboardingPhone,
        address: onboardingAddress,
        onboarded: true
      });
      setProfile(prev => prev ? { ...prev, displayName: onboardingName, phone: onboardingPhone, address: onboardingAddress, onboarded: true } : null);
      setIsOnboardingOpen(false);
    } catch (error) {
      console.error('Onboarding Error:', error);
      alert('Failed to save profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setProfile(null);
      setIsSettingsOpen(false);
      setIsAddressBookOpen(false);
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  const handleToggleNotifications = async () => {
    if (!user || !profile) return;
    const newValue = !profile.notificationsEnabled;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationsEnabled: newValue
      });
      setProfile({ ...profile, notificationsEnabled: newValue });
    } catch (error) {
      console.error('Update Notifications Error:', error);
    }
  };

  const handleUpdateAddress = async () => {
    if (!user || !profile || !tempAddress.trim()) return;
    setIsSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        address: tempAddress
      });
      setProfile({ ...profile, address: tempAddress });
      setIsEditingAddress(false);
      setTempAddress('');
    } catch (error) {
      console.error('Update Address Error:', error);
      alert('Failed to update address.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTicket(true);
    try {
      await addDoc(collection(db, 'tickets'), {
        name: supportName,
        phone: supportPhone,
        issue: supportIssue,
        createdAt: serverTimestamp(),
        status: 'open'
      });
      setTicketSuccess(true);
      setSupportName('');
      setSupportPhone('');
      setSupportIssue('');
      setTimeout(() => setTicketSuccess(false), 5000);
    } catch (error) {
      console.error('Ticket Error:', error);
      alert('Failed to submit ticket. Please try again.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const filteredProducts = PRODUCTS.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white font-sans selection:bg-blue-500/30">
      {/* Hidden YouTube Player for Background Music */}
      {isMusicEnabled && (
        <div className="fixed bottom-0 right-0 w-0 h-0 overflow-hidden pointer-events-none opacity-0">
          <iframe
            width="1"
            height="1"
            src={`https://www.youtube.com/embed/sX3CLenB1ws?autoplay=1&loop=1&playlist=sX3CLenB1ws&controls=0&volume=${volume}`}
            title="Background Music"
            allow="autoplay"
          ></iframe>
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0A0F1E]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <img src={LOGO_URL} alt="MALABAR X" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
            <span className="text-xl font-bold tracking-tighter hidden sm:block">MALABAR X</span>
          </div>

          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-full focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {user && (
              <button 
                onClick={() => setIsOrdersOpen(true)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white relative"
              >
                <History className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={() => setIsCartOpen(true)}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white relative"
            >
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs text-gray-400">Welcome</span>
                  <span className="text-sm font-medium">{profile?.displayName || user.email}</span>
                </div>
                <div className="relative group/menu">
                  <button className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white">
                    <UserIcon className="w-5 h-5" />
                  </button>
                  <div className="absolute right-0 top-full pt-2 opacity-0 translate-y-2 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:translate-y-0 group-hover/menu:pointer-events-auto transition-all duration-200">
                    <div className="w-48 bg-[#12182B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                      <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-2 transition-colors"
                      >
                        <SettingsIcon className="w-4 h-4" /> Settings
                      </button>
                      <button 
                        onClick={() => setIsAddressBookOpen(true)}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-2 transition-colors"
                      >
                        <MapPin className="w-4 h-4" /> Address Book
                      </button>
                      <div className="h-px bg-white/5" />
                      <button 
                        onClick={handleLogout}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-2 text-red-400 transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full text-sm font-medium transition-all active:scale-95 flex items-center gap-2"
              >
                <UserIcon className="w-4 h-4" />
                Login
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-blue-600/10 blur-[120px] rounded-full -z-10" />
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
              ELEVATE YOUR <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">STREET STYLE</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
              Discover the latest in premium streetwear, vintage fits, and urban essentials. 
              Crafted for those who define the culture.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={scrollToProducts}
                className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all flex items-center gap-2"
              >
                Shop Collection <ArrowRight className="w-5 h-5" />
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsLookbookOpen(true)}
                className="px-8 py-4 bg-white/5 border border-white/10 font-bold rounded-full hover:bg-white/10 transition-all"
              >
                View Lookbook
              </motion.button>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="max-w-7xl mx-auto px-4 mb-12">
        <div className="flex flex-wrap gap-2 justify-center">
          {['All', 'Shirts', 'Shoes', 'Kids Wear', 'Streetwear', 'Vintage'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-bold transition-all",
                activeCategory === cat 
                  ? "bg-blue-600 text-white" 
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <main id="products" className="max-w-7xl mx-auto px-4 py-20">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              {activeCategory === 'All' ? 'Featured Products' : activeCategory}
            </h2>
            <p className="text-gray-400">Our latest drops and all-time favorites</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-white/5 mb-4">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 gap-2">
                  <button 
                    onClick={() => addToCart(product)}
                    className="w-full py-3 bg-white text-black font-bold rounded-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" /> Add to Cart
                  </button>
                  <button 
                    onClick={() => openWhatsApp(product)}
                    className="w-full py-3 bg-green-600 text-white font-bold rounded-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center gap-2 delay-75"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp Order
                  </button>
                </div>
                <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest">
                  {product.category}
                </div>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg group-hover:text-blue-400 transition-colors">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl font-black">₹{product.price}</span>
                    {product.oldPrice && (
                      <span className="text-sm text-gray-500 line-through">₹{product.oldPrice}</span>
                    )}
                  </div>
                </div>
                <button className="p-3 bg-white/5 hover:bg-blue-600 rounded-2xl transition-all group-hover:scale-110">
                  <ShoppingBag className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <p className="text-gray-500 text-lg">No products found matching your criteria.</p>
            </div>
          )}
        </div>
      </main>

      {/* About Section (Purpose) */}
      <section className="py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Truck, title: 'Free Shipping', desc: 'On all orders over ₹5000' },
            { icon: ShieldCheck, title: 'Secure Payment', desc: '100% encrypted transactions' },
            { icon: Star, title: 'Premium Quality', desc: 'Handpicked fabrics and fits' }
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-bold">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="py-20 border-t border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">About MALABAR X</h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">
                MALABAR X is a premium e-commerce destination dedicated to the urban fashion community. 
                Our mission is to provide high-quality, authentic streetwear and vintage apparel to style-conscious 
                individuals. We curate unique collections that blend contemporary urban aesthetics with timeless 
                vintage vibes, ensuring our customers always stay ahead of the curve.
              </p>
              <p className="text-gray-400 text-lg leading-relaxed">
                Whether you're looking for the latest street fits or rare vintage finds, MALABAR X offers a 
                seamless shopping experience backed by secure authentication and dedicated customer support.
              </p>
            </div>
            <div className="relative aspect-video rounded-[32px] overflow-hidden border border-white/10">
              <img 
                src="https://picsum.photos/seed/store/1200/800" 
                alt="MALABAR X Store" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-24 bg-white/[0.02] border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full text-blue-500 text-sm font-bold mb-4">
              <MessageSquare className="w-4 h-4" />
              SUPPORT CENTER
            </div>
            <h2 className="text-4xl font-bold mb-4">Need Help?</h2>
            <p className="text-gray-400">Submit a ticket and our team will get back to you within 24 hours.</p>
          </div>

          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Full Name"
                required
                value={supportName}
                onChange={(e) => setSupportName(e.target.value)}
                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 transition-colors"
              />
              <input 
                type="tel" 
                placeholder="Phone Number"
                required
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <textarea 
              placeholder="Describe your issue..."
              required
              rows={4}
              value={supportIssue}
              onChange={(e) => setSupportIssue(e.target.value)}
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
            <button 
              type="submit"
              disabled={submittingTicket}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
            >
              {submittingTicket ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : ticketSuccess ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Ticket Submitted
                </>
              ) : (
                'Submit Ticket'
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src={LOGO_URL} alt="MALABAR X" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
            <span className="font-bold tracking-tighter">MALABAR X</span>
          </div>
          <p className="text-gray-500 text-sm mb-4">© 2026 Malabar X. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-gray-500">
            <button onClick={() => setLegalModal('privacy')} className="hover:text-white transition-colors">Privacy Policy</button>
            <button onClick={() => setLegalModal('terms')} className="hover:text-white transition-colors">Terms of Service</button>
            <button onClick={() => setLegalModal('refund')} className="hover:text-white transition-colors">Refund Policy</button>
            <button onClick={() => setLegalModal('cancellation')} className="hover:text-white transition-colors">Cancellation Policy</button>
          </div>
        </div>
      </footer>

      {/* Cart Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-full bg-[#12182B] border-l border-white/10 p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6 text-blue-500" /> Your Cart
                </h3>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                      <ShoppingBag className="w-10 h-10 text-gray-600" />
                    </div>
                    <p className="text-gray-400">Your cart is empty.</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="mt-4 text-blue-500 font-bold hover:underline"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-20 h-20 object-cover rounded-xl"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-sm">{item.name}</h4>
                        <p className="text-blue-400 font-black text-sm mt-1">₹{item.price}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <button 
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 hover:bg-white/10 rounded-md transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 hover:bg-white/10 rounded-md transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="ml-auto p-1 text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                  <div className="flex justify-between items-center text-lg">
                    <span className="text-gray-400">Total Amount</span>
                    <span className="font-black text-2xl">₹{cartTotal}</span>
                  </div>
                  <button 
                    onClick={handlePlaceOrder}
                    disabled={isPlacingOrder}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {isPlacingOrder ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Checkout & Place Order'}
                  </button>
                  <p className="text-[10px] text-gray-500 text-center">
                    By clicking checkout, you agree to our Terms of Service.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Orders Modal */}
      <AnimatePresence>
        {isOrdersOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOrdersOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#12182B] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <History className="w-6 h-6 text-blue-500" /> Order History
                </h3>
                <button 
                  onClick={() => setIsOrdersOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                {orders.length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="text-gray-500">You haven't placed any orders yet.</p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Order ID</p>
                          <p className="text-xs font-mono text-gray-300">{order.id}</p>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            order.status === 'delivered' ? "bg-green-500/20 text-green-400" :
                            order.status === 'shipped' ? "bg-blue-500/20 text-blue-400" :
                            "bg-yellow-500/20 text-yellow-400"
                          )}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-400">{item.name} x {item.quantity}</span>
                            <span className="font-bold">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                        <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                          <span className="text-sm font-bold">Total Paid</span>
                          <span className="text-lg font-black text-blue-400">₹{order.total}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lookbook Modal */}
      <AnimatePresence>
        {isLookbookOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLookbookOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-5xl aspect-video bg-[#12182B] rounded-[40px] overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setIsLookbookOpen(false)}
                className="absolute top-6 right-6 z-10 p-2 bg-black/50 hover:bg-black/80 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="grid grid-cols-3 h-full">
                <img src="https://picsum.photos/seed/look1/800/1200" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                <img src="https://picsum.photos/seed/look2/800/1200" className="h-full w-full object-cover border-x border-white/10" referrerPolicy="no-referrer" />
                <img src="https://picsum.photos/seed/look3/800/1200" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="absolute bottom-12 left-12">
                <h2 className="text-6xl font-black tracking-tighter mb-2">SUMMER '26</h2>
                <p className="text-xl text-gray-300">The Urban Nomad Collection</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#12182B] border border-white/10 rounded-[32px] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <SettingsIcon className="w-6 h-6 text-blue-500" /> Settings
                </h3>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/5 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                  <span>Dark Mode</span>
                  <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                  <span>Notifications</span>
                  <button 
                    onClick={handleToggleNotifications}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-colors duration-200",
                      profile?.notificationsEnabled ? "bg-blue-600" : "bg-gray-600"
                    )}
                  >
                    <motion.div 
                      animate={{ x: profile?.notificationsEnabled ? 24 : 4 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>

                {/* Music Control */}
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-blue-400" />
                      <span>Background Music</span>
                    </div>
                    <button 
                      onClick={() => setIsMusicEnabled(!isMusicEnabled)}
                      className={cn(
                        "w-12 h-6 rounded-full relative transition-colors duration-200",
                        isMusicEnabled ? "bg-blue-600" : "bg-gray-600"
                      )}
                    >
                      <motion.div 
                        animate={{ x: isMusicEnabled ? 24 : 4 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                  {isMusicEnabled && (
                    <div className="flex items-center gap-4 px-2">
                      {volume === 0 ? <VolumeX className="w-4 h-4 text-gray-400" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={volume} 
                        onChange={(e) => setVolume(parseInt(e.target.value))}
                        className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <span className="text-[10px] font-mono text-gray-500 w-6">{volume}%</span>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => { setIsSettingsOpen(false); setIsAddressBookOpen(true); }}
                  className="w-full p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/10 transition-colors"
                >
                  <span>Address Book</span>
                  <MapPin className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Address Book Modal */}
      <AnimatePresence>
        {isAddressBookOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddressBookOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#12182B] border border-white/10 rounded-[32px] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-blue-500" /> Address Book
                </h3>
                <button onClick={() => setIsAddressBookOpen(false)} className="p-2 hover:bg-white/5 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                {isEditingAddress ? (
                  <div className="space-y-4">
                    <textarea
                      value={tempAddress}
                      onChange={(e) => setTempAddress(e.target.value)}
                      placeholder="Enter full address..."
                      className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                    <div className="flex gap-3">
                      <button 
                        onClick={() => { setIsEditingAddress(false); setTempAddress(''); }}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleUpdateAddress}
                        disabled={isSavingProfile || !tempAddress.trim()}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {isSavingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Address
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-blue-600/10 rounded-2xl border border-blue-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase text-blue-400">Default Address</span>
                        <button 
                          onClick={() => {
                            setTempAddress(profile?.address || '');
                            setIsEditingAddress(true);
                          }}
                          className="text-xs text-gray-400 hover:text-white"
                        >
                          Edit
                        </button>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {profile?.address || "No address saved yet."}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setTempAddress('');
                        setIsEditingAddress(true);
                      }}
                      className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-gray-500 hover:border-white/20 hover:text-gray-400 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add New Address
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth Modal / Login Screen */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0A0F1E]"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full h-full sm:h-auto sm:max-w-md bg-[#12182B] sm:border border-white/10 sm:rounded-[40px] p-8 flex flex-col items-center justify-center shadow-2xl"
            >
              <button 
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>

              <div className="text-center mb-12 w-full">
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="w-32 h-32 mx-auto mb-8 relative"
                >
                  <div className="absolute inset-0 bg-blue-600/20 blur-3xl rounded-full" />
                  <img src={LOGO_URL} alt="MALABAR X" className="w-full h-full object-contain relative z-10" referrerPolicy="no-referrer" />
                </motion.div>
                <h3 className="text-3xl font-black tracking-tighter mb-3">MALABAR X</h3>
                <p className="text-gray-400 max-w-[280px] mx-auto">
                  Sign in to your account to access exclusive streetwear drops and track your orders.
                </p>
              </div>

              <div className="w-full space-y-4">
                <button 
                  onClick={handleGoogleLogin}
                  className="w-full py-4 bg-white text-black hover:bg-gray-200 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-white/5 active:scale-[0.98]"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                  Continue with Google
                </button>
                
                <div className="flex items-center gap-4 py-4">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Secure Login</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                <p className="text-[10px] text-center text-gray-500 px-8 leading-relaxed">
                  By continuing, you agree to Malabar X's 
                  <button onClick={() => setLegalModal('terms')} className="text-blue-500 hover:underline mx-1">Terms of Service</button> 
                  and 
                  <button onClick={() => setLegalModal('privacy')} className="text-blue-500 hover:underline mx-1">Privacy Policy</button>.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Onboarding Modal */}
      <AnimatePresence>
        {isOnboardingOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-lg bg-[#12182B] border border-white/10 rounded-[32px] p-8 shadow-2xl"
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold">Complete Your Profile</h3>
                <p className="text-gray-400 mt-2">We need a few more details to set up your account.</p>
              </div>

              <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      type="text" 
                      required
                      placeholder="John Doe"
                      value={onboardingName}
                      onChange={(e) => setOnboardingName(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      type="tel" 
                      required
                      placeholder="+91 98765 43210"
                      value={onboardingPhone}
                      onChange={(e) => setOnboardingPhone(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Delivery Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 w-4 h-4 text-gray-500" />
                    <textarea 
                      required
                      placeholder="Enter your full address..."
                      rows={3}
                      value={onboardingAddress}
                      onChange={(e) => setOnboardingAddress(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  {isSavingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Profile & Enter Site'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Legal Modals */}
      <AnimatePresence>
        {legalModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLegalModal(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#12182B] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <h3 className="text-xl font-bold uppercase tracking-widest">
                  {legalModal === 'privacy' && 'Privacy Policy'}
                  {legalModal === 'terms' && 'Terms of Service'}
                  {legalModal === 'refund' && 'Refund Policy'}
                  {legalModal === 'cancellation' && 'Cancellation Policy'}
                </h3>
                <button 
                  onClick={() => setLegalModal(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 max-h-[70vh] overflow-y-auto text-gray-400 space-y-6 leading-relaxed">
                {legalModal === 'privacy' && (
                  <>
                    <p>At MALABAR X, we respect your privacy and are committed to protecting your personal data.</p>
                    <h4 className="text-white font-bold">1. Information We Collect</h4>
                    <p>We collect your name, email, phone number, and address when you register or make a purchase. This information is used to process orders and provide customer support.</p>
                    <h4 className="text-white font-bold">2. Data Security</h4>
                    <p>We use industry-standard encryption and secure cloud infrastructure provided by Google Firebase to ensure your data remains safe.</p>
                    <h4 className="text-white font-bold">3. Third Parties</h4>
                    <p>We do not sell your personal information to third parties. Data is only shared with logistics partners to fulfill your deliveries.</p>
                  </>
                )}
                {legalModal === 'terms' && (
                  <>
                    <p>By using MALABAR X, you agree to the following terms and conditions:</p>
                    <h4 className="text-white font-bold">1. User Accounts</h4>
                    <p>You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.</p>
                    <h4 className="text-white font-bold">2. Product Descriptions</h4>
                    <p>We attempt to be as accurate as possible. However, we do not warrant that product descriptions or other content is accurate, complete, reliable, or error-free.</p>
                    <h4 className="text-white font-bold">3. Intellectual Property</h4>
                    <p>All content included on this site, such as text, graphics, logos, and images, is the property of MALABAR X.</p>
                  </>
                )}
                {legalModal === 'refund' && (
                  <>
                    <h4 className="text-white font-bold">Refund Policy</h4>
                    <p>We want you to be completely satisfied with your purchase. If you are not happy, you may return the item within 7 days of delivery.</p>
                    <h4 className="text-white font-bold">Conditions for Refund:</h4>
                    <ul className="list-disc ml-6 space-y-2">
                      <li>Item must be in original packaging with tags.</li>
                      <li>Item must be unworn and unwashed.</li>
                      <li>Proof of purchase is required.</li>
                    </ul>
                    <p>Refunds will be processed to the original payment method within 5-7 business days after we receive the returned item.</p>
                  </>
                )}
                {legalModal === 'cancellation' && (
                  <>
                    <h4 className="text-white font-bold">Cancellation Policy</h4>
                    <p>Orders can be cancelled within 2 hours of placement for a full refund.</p>
                    <h4 className="text-white font-bold">Post-Processing Cancellation:</h4>
                    <p>Once an order has been processed and shipped, it cannot be cancelled. You may, however, return the item once it arrives following our Refund Policy.</p>
                    <h4 className="text-white font-bold">How to Cancel:</h4>
                    <p>Please contact our support team via the ticket system or email us at support@malabarx.com with your order ID.</p>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
