import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';

// GLOBAL shared demo menu store (same as list/create routes)
declare global {
  var demoMenuStore: Map<string, any[]> | undefined;
}

global.demoMenuStore = global.demoMenuStore || new Map();

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET: Load existing menu for editing
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // For demo user, check global store first, then fallback to samples
    if (user.id === 'demo-user-123') {
      // Check if menu exists in global store
      const storedMenus = global.demoMenuStore?.get(user.id) || [];
      const storedMenu = storedMenus.find(m => m.id === id);
      
      if (storedMenu) {
        return NextResponse.json({ 
          menu: {
            ...storedMenu,
            content: storedMenu // Ensure content field exists
          }
        });
      }
      const sampleMenus: Record<string, any> = {
        'elegante-klassik': {
          id: 'elegante-klassik',
          name: 'Elegante Klassik Speisekarte',
          template: 'elegante-klassik',
          category: 'elegant',
          sections: [
            {
              id: 'vorspeisen',
              title: 'Vorspeisen',
              items: [
                {
                  id: '1',
                  name: 'Tomaten-Mozzarella Caprese',
                  description: 'Frische Tomaten mit cremigem Mozzarella und Basilikum',
                  price: '8,90',
                  category: 'vegetarisch'
                },
                {
                  id: '2', 
                  name: 'Rindertattar klassisch',
                  description: 'Zartes Rinderfilet, handgehackt mit Kapern und Zwiebeln',
                  price: '12,90',
                  category: 'fleisch'
                }
              ]
            },
            {
              id: 'hauptgerichte',
              title: 'Hauptgerichte',
              items: [
                {
                  id: '3',
                  name: 'Wiener Schnitzel',
                  description: 'Klassisches Kalbsschnitzel mit Kartoffeln und Preiselbeeren',
                  price: '18,90',
                  category: 'fleisch'
                },
                {
                  id: '4',
                  name: 'Lachs gegrillt',
                  description: 'Norwegischer Lachs mit Gemüse und Dillsauce',
                  price: '22,90',
                  category: 'fisch'
                }
              ]
            },
            {
              id: 'desserts',
              title: 'Desserts',
              items: [
                {
                  id: '5',
                  name: 'Tiramisu hausgemacht',
                  description: 'Klassisches italienisches Dessert',
                  price: '6,90',
                  category: 'dessert'
                }
              ]
            }
          ],
          settings: {
            restaurantName: 'Demo Restaurant',
            address: 'Musterstraße 123, 12345 Berlin',
            phone: '+49 30 12345678',
            colors: {
              primary: '#8B5A3C',
              secondary: '#F5F5DC',
              accent: '#D4AF37'
            },
            fonts: {
              heading: 'serif',
              body: 'sans-serif'
            }
          },
          updatedAt: new Date().toISOString()
        },
        'moderne-einfachheit': {
          id: 'moderne-einfachheit',
          name: 'Moderne Einfachheit Speisekarte',
          template: 'moderne-einfachheit',
          category: 'modern',
          sections: [
            {
              id: 'heute',
              title: 'Heute empfehlen wir',
              items: [
                {
                  id: '1',
                  name: 'Avocado Toast',
                  description: 'Geröstetes Sauerteigbrot mit Avocado und Microgreens',
                  price: '9,50',
                  category: 'vegetarisch'
                }
              ]
            }
          ],
          settings: {
            restaurantName: 'Demo Café',
            address: 'Trendstraße 456, 10115 Berlin',
            phone: '+49 30 87654321',
            colors: {
              primary: '#2C3E50',
              secondary: '#ECF0F1',
              accent: '#3498DB'
            },
            fonts: {
              heading: 'sans-serif',
              body: 'sans-serif'
            }
          },
          updatedAt: new Date().toISOString()
        }
      };

      const menu = sampleMenus[id] || sampleMenus['elegante-klassik'];
      return NextResponse.json({ 
        menu: {
          ...menu,
          content: menu // Ensure content field exists for editor compatibility
        }
      });
    }

    // For real users, we would load from database
    // Since we don't have speisekarten table yet, return a default menu
    return NextResponse.json({
      menu: {
        id,
        name: `Speisekarte ${id}`,
        template: id,
        category: 'elegant',
        sections: [
          {
            id: 'vorspeisen',
            title: 'Vorspeisen',
            items: []
          },
          {
            id: 'hauptgerichte', 
            title: 'Hauptgerichte',
            items: []
          },
          {
            id: 'desserts',
            title: 'Desserts',
            items: []
          }
        ],
        settings: {
          restaurantName: 'Ihr Restaurant',
          address: 'Ihre Adresse',
          phone: 'Ihre Telefonnummer',
          colors: {
            primary: '#8B5A3C',
            secondary: '#F5F5DC',
            accent: '#D4AF37'
          },
          fonts: {
            heading: 'serif',
            body: 'sans-serif'
          }
        },
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error loading menu:', error);
    return NextResponse.json(
      { error: 'Failed to load menu' },
      { status: 500 }
    );
  }
}

// PUT: Update existing menu
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const menuData = await request.json();

    // For demo user, save to global store
    if (user.id === 'demo-user-123') {
      const storedMenus = global.demoMenuStore?.get(user.id) || [];
      const menuIndex = storedMenus.findIndex(m => m.id === id);
      
      const updatedMenu = {
        ...menuData,
        id,
        updatedAt: new Date().toISOString()
      };
      
      if (menuIndex >= 0) {
        storedMenus[menuIndex] = updatedMenu;
      } else {
        storedMenus.unshift(updatedMenu); // Add to beginning if not found
      }
      
      global.demoMenuStore?.set(user.id, storedMenus);
      
      console.log(`📋 DEMO MENU UPDATED: ${menuData.name} (ID: ${id})`);
      
      return NextResponse.json({
        success: true,
        menu: updatedMenu
      });
    }

    // For real users, we would save to database
    // For now, just return success
    return NextResponse.json({
      success: true,
      menu: {
        ...menuData,
        id,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating menu:', error);
    return NextResponse.json(
      { error: 'Failed to update menu' },
      { status: 500 }
    );
  }
}

// DELETE: Delete menu
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // For demo user, remove from global store
    if (user.id === 'demo-user-123') {
      const storedMenus = global.demoMenuStore?.get(user.id) || [];
      const filteredMenus = storedMenus.filter(m => m.id !== id);
      global.demoMenuStore?.set(user.id, filteredMenus);
      
      console.log(`📋 DEMO MENU DELETED: ${id}`);
      
      return NextResponse.json({ success: true });
    }

    // For real users, we would delete from database
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting menu:', error);
    return NextResponse.json(
      { error: 'Failed to delete menu' },
      { status: 500 }
    );
  }
}