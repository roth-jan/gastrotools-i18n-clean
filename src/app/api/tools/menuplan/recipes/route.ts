import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyAuth } from '@/lib/auth-utils'
import { checkUsageLimit, incrementUsage } from '@/lib/usage-utils'

const prisma = new PrismaClient()

// GET /api/tools/menuplan/recipes - Get all recipes for user
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle demo user
    if (user.id === 'demo-user-123') {
      const demoRecipes = [
        {
          id: 'demo-recipe-1',
          name: 'Spaghetti Carbonara',
          category: 'Hauptgang',
          time: '25 min',
          portions: '4',
          ingredients: []
        },
        {
          id: 'demo-recipe-2',
          name: 'Caesar Salat',
          category: 'Vorspeise',
          time: '15 min',
          portions: '2',
          ingredients: []
        },
        {
          id: 'demo-recipe-3',
          name: 'Tomatensuppe',
          category: 'Vorspeise',
          time: '30 min',
          portions: '4',
          ingredients: []
        },
        {
          id: 'demo-recipe-4',
          name: 'Wiener Schnitzel',
          category: 'Hauptgang',
          time: '35 min',
          portions: '4',
          ingredients: []
        },
        {
          id: 'demo-recipe-5',
          name: 'Tiramisu',
          category: 'Dessert',
          time: '20 min',
          portions: '6',
          ingredients: []
        },
        {
          id: 'demo-recipe-6',
          name: 'Gemüsepfanne',
          category: 'Hauptgang',
          time: '20 min',
          portions: '3',
          ingredients: []
        },
        {
          id: 'demo-recipe-7',
          name: 'Pfannkuchen',
          category: 'Dessert',
          time: '15 min',
          portions: '4',
          ingredients: []
        },
        {
          id: 'demo-recipe-8',
          name: 'Kartoffelgratin',
          category: 'Beilage',
          time: '45 min',
          portions: '6',
          ingredients: []
        }
      ]
      
      return NextResponse.json({ recipes: demoRecipes })
    }

    // Get real recipes from database
    const recipes = await prisma.recipe.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        category: true,
        time: true,
        portions: true,
        ingredients: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ recipes })
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/tools/menuplan/recipes - Create new recipe
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check usage limits
    const usage = await checkUsageLimit(user.id, 'recipes')
    if (usage.exceeded) {
      return NextResponse.json({ 
        error: 'Rezept-Limit erreicht', 
        showLeadCapture: true,
        limit: usage.limit,
        used: usage.used
      }, { status: 429 })
    }

    const data = await request.json()
    const { name, category, time, portions } = data

    if (!name || !category) {
      return NextResponse.json({ error: 'Name and category are required' }, { status: 400 })
    }

    // Handle demo user
    if (user.id === 'demo-user-123') {
      const demoRecipe = {
        id: `demo-recipe-${Date.now()}`,
        name,
        category,
        time: time || '30 min',
        portions: portions || '4',
        ingredients: [],
        nutrition: {},
        portionSize: 1
      }
      
      return NextResponse.json({ recipe: demoRecipe })
    }

    // Create real recipe
    const recipe = await prisma.recipe.create({
      data: {
        userId: user.id,
        name,
        category,
        time,
        portions,
        ingredients: [],
        nutrition: {},
        portionSize: parseFloat(portions) || 1
      }
    })

    // Update usage
    await incrementUsage(user.id, 'recipes')

    return NextResponse.json({ recipe })
  } catch (error) {
    console.error('Error creating recipe:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}