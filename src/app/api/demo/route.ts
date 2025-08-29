import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Check if demo user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'demo@gastrotools.de' }
    });

    if (existingUser) {
      return NextResponse.json({ 
        message: 'Demo user already exists',
        email: 'demo@gastrotools.de',
        hint: 'Password: demo123'
      });
    }

    // Create demo user
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    const demoUser = await prisma.user.create({
      data: {
        email: 'demo@gastrotools.de',
        password: hashedPassword,
        name: 'Demo User',
        company: 'Demo Restaurant GmbH',
        plan: 'free'
      }
    });

    // Create usage tracking for current month
    const currentMonth = new Date().toISOString().slice(0, 7);
    await prisma.usageTracking.create({
      data: {
        userId: demoUser.id,
        month: currentMonth,
        speisekartenCount: 2,
        recipesCount: 8,
        exportsCount: 5
      }
    });

    // Create sample recipes
    await prisma.recipe.createMany({
      data: [
        {
          userId: demoUser.id,
          name: 'Wiener Schnitzel',
          ingredients: JSON.stringify([
            { name: 'Kalbsschnitzel', amount: 200, unit: 'g' },
            { name: 'Paniermehl', amount: 50, unit: 'g' },
            { name: 'Eier', amount: 2, unit: 'Stück' },
            { name: 'Mehl', amount: 30, unit: 'g' }
          ]),
          nutrition: JSON.stringify({
            calories: 580,
            protein: 42,
            fat: 28,
            carbs: 35,
            fiber: 2,
            sugar: 2,
            salt: 1.5
          }),
          portionSize: 1
        },
        {
          userId: demoUser.id,
          name: 'Caesar Salad',
          ingredients: JSON.stringify([
            { name: 'Römersalat', amount: 150, unit: 'g' },
            { name: 'Parmesan', amount: 30, unit: 'g' },
            { name: 'Croutons', amount: 40, unit: 'g' },
            { name: 'Caesar Dressing', amount: 50, unit: 'ml' }
          ]),
          nutrition: JSON.stringify({
            calories: 320,
            protein: 12,
            fat: 22,
            carbs: 18,
            fiber: 3,
            sugar: 3,
            salt: 1.2
          }),
          portionSize: 1
        }
      ]
    });

    // Create sample menu
    await prisma.menu.create({
      data: {
        userId: demoUser.id,
        name: 'Wochenkarte KW 51',
        template: 'elegant',
        content: JSON.stringify({
          title: 'Wochenkarte',
          sections: [
            {
              name: 'Vorspeisen',
              items: [
                { name: 'Tomatensuppe', price: 6.50, description: 'Mit frischem Basilikum' },
                { name: 'Caesar Salad', price: 8.90, description: 'Mit Parmesan und Croutons' }
              ]
            },
            {
              name: 'Hauptgerichte',
              items: [
                { name: 'Wiener Schnitzel', price: 18.90, description: 'Mit Pommes und Salat' },
                { name: 'Lachs auf Spinat', price: 22.50, description: 'Mit Kartoffelpüree' }
              ]
            }
          ]
        }),
        qrCode: 'https://gastrotools.de/menu/demo1'
      }
    });

    // Create sample inventory items
    const inventoryItems = [
      { name: 'Tomaten', category: 'Gemüse', unit: 'kg', quantity: 25, minStock: 5, maxStock: 100, price: 2.99, supplier: 'Metro', barcode: '4001234567890' },
      { name: 'Zwiebeln', category: 'Gemüse', unit: 'kg', quantity: 15, minStock: 5, maxStock: 50, price: 1.49, supplier: 'Metro', barcode: '4001234567891' },
      { name: 'Rindfleisch', category: 'Fleisch', unit: 'kg', quantity: 20, minStock: 10, maxStock: 50, price: 18.99, supplier: 'Selgros', barcode: '4001234567892' },
      { name: 'Hähnchenbrust', category: 'Fleisch', unit: 'kg', quantity: 30, minStock: 10, maxStock: 60, price: 8.99, supplier: 'Selgros', barcode: '4001234567893' },
      { name: 'Milch', category: 'Molkereiprodukte', unit: 'Liter', quantity: 40, minStock: 20, maxStock: 100, price: 0.99, supplier: 'Lokaler Bauer', barcode: '4001234567894' }
    ];

    for (const item of inventoryItems) {
      await prisma.inventoryItem.create({
        data: {
          userId: demoUser.id,
          ...item
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Demo user created successfully!',
      credentials: {
        email: 'demo@gastrotools.de',
        password: 'demo123'
      },
      data: {
        recipes: 2,
        menus: 1,
        inventoryItems: 5,
        usage: {
          menus: '2/3',
          recipes: '8/10',
          exports: '5/unlimited',
          inventory: '5/100'
        }
      }
    });

  } catch (error) {
    console.error('Error creating demo user:', error);
    return NextResponse.json(
      { error: 'Failed to create demo user', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}