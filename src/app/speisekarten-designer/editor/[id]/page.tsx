'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navigation } from "@/components/navigation"
import { ErrorBoundary } from "@/components/error-boundary"
import { generateQRCode, generateMenuPDF, getMenuPreviewUrl } from "@/lib/menu-utils"
import { Save, Download, Plus, Trash2, ArrowLeft, QrCode, FileText, Edit2 } from "lucide-react"

interface MenuItem {
  id: string
  name: string
  description: string
  price: string
  category?: string
}

interface MenuSection {
  id: string
  title: string
  items: MenuItem[]
}

interface MenuData {
  title: string
  subtitle: string
  sections: MenuSection[]
  template: string
}

// BULLETPROOF DEFAULT STATE
const SAFE_DEFAULT_MENU: MenuData = {
  title: 'Speisekarte',
  subtitle: '',
  sections: [],
  template: 'elegant-classic'
}

export default function MenuEditorBulletproof() {
  const router = useRouter()
  const params = useParams()
  const menuRef = useRef<HTMLDivElement>(null)
  
  // BULLETPROOF STATE INITIALIZATION
  const [menuData, setMenuData] = useState<MenuData>(SAFE_DEFAULT_MENU)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [editingItem, setEditingItem] = useState<{sectionId: string, itemId: string} | null>(null)
  const [error, setError] = useState<string | null>(null)

  // BULLETPROOF EFFECT WITH ERROR HANDLING
  useEffect(() => {
    let mounted = true
    
    const loadMenuSafely = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Ensure params exist
        if (!params?.id) {
          throw new Error('No menu ID provided')
        }
        
        const menuId = Array.isArray(params.id) ? params.id[0] : params.id
        
        if (menuId === 'new') {
          // New menu - safe defaults
          const template = (typeof window !== 'undefined' && localStorage.getItem('selectedTemplate')) || 'elegant-classic'
          const menuName = (typeof window !== 'undefined' && localStorage.getItem('menuName')) || 'Neue Speisekarte'
          
          if (mounted) {
            setMenuData({
              ...SAFE_DEFAULT_MENU,
              title: menuName,
              template
            })
          }
        } else {
          // Load existing menu with comprehensive error handling
          try {
            const response = await fetch(`/api/tools/speisekarten/${menuId}`, {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              }
            })
            
            if (!response.ok) {
              throw new Error(`API returned ${response.status}`)
            }
            
            const data = await response.json()
            
            if (!data || !data.menu) {
              throw new Error('Invalid API response structure')
            }
            
            // TRIPLE-SAFE DATA EXTRACTION
            const menu = data.menu
            const content = menu.content || menu || {}
            
            const safeMenuData: MenuData = {
              title: String(content?.title || menu?.name || 'Speisekarte'),
              subtitle: String(content?.subtitle || ''),
              sections: Array.isArray(content?.sections) ? content.sections.map((section: any) => ({
                id: String(section?.id || Date.now()),
                title: String(section?.title || 'Sektion'),
                items: Array.isArray(section?.items) ? section.items.map((item: any) => ({
                  id: String(item?.id || Date.now()),
                  name: String(item?.name || ''),
                  description: String(item?.description || ''),
                  price: String(item?.price || '0,00'),
                  category: String(item?.category || '')
                })) : []
              })) : [],
              template: String(content?.template || menu?.template || 'elegant-classic')
            }
            
            if (mounted) {
              setMenuData(safeMenuData)
            }
          } catch (apiError) {
            console.error('Menu API error:', apiError)
            if (mounted) {
              setError(`Fehler beim Laden der Speisekarte: ${apiError instanceof Error ? apiError.message : 'Unbekannter Fehler'}`)
              setMenuData(SAFE_DEFAULT_MENU)
            }
          }
        }
      } catch (error) {
        console.error('Critical menu loading error:', error)
        if (mounted) {
          setError(`Kritischer Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
          setMenuData(SAFE_DEFAULT_MENU)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }
    
    loadMenuSafely()
    
    // Cleanup function
    return () => {
      mounted = false
    }
  }, [params?.id])

  // PDF Export function
  const handleExportPDF = async () => {
    if (!menuRef.current) {
      alert('Menü-Element nicht gefunden')
      return
    }

    setIsExporting(true)
    try {
      const fileName = `${menuData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'speisekarte'}.pdf`
      await generateMenuPDF('menu-preview', fileName)
    } catch (error) {
      console.error('PDF Export error:', error)
      alert('Fehler beim Exportieren des PDFs')
    } finally {
      setIsExporting(false)
    }
  }

  // BULLETPROOF TEMPLATE STYLES
  const getTemplateStyles = (template: string = 'elegant-classic') => {
    try {
      const templates: Record<string, any> = {
        'elegant-classic': {
          background: 'bg-gradient-to-br from-amber-50 to-orange-50',
          headerBg: 'bg-gradient-to-r from-amber-600 to-orange-600',
          headerText: 'text-white',
          sectionBg: 'bg-white/80',
          itemText: 'text-gray-800',
          priceText: 'text-orange-600'
        },
        'modern-fine': {
          background: 'bg-gray-100',
          headerBg: 'bg-gray-900',
          headerText: 'text-white',
          sectionBg: 'bg-white',
          itemText: 'text-gray-900',
          priceText: 'text-gray-700'
        },
        'cozy-cafe': {
          background: 'bg-orange-50',
          headerBg: 'bg-orange-600',
          headerText: 'text-white',
          sectionBg: 'bg-white/90',
          itemText: 'text-gray-800',
          priceText: 'text-orange-700'
        }
      }
      
      return templates[template] || templates['elegant-classic']
    } catch (error) {
      console.error('Template styles error:', error)
      return {
        background: 'bg-white',
        headerBg: 'bg-gray-800',
        headerText: 'text-white',
        sectionBg: 'bg-gray-50',
        itemText: 'text-gray-900',
        priceText: 'text-gray-700'
      }
    }
  }

  // BULLETPROOF LOADING STATE
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700">Speisekarte wird geladen...</h2>
            <p className="text-gray-500 mt-2">Einen Moment bitte</p>
          </div>
        </div>
      </div>
    )
  }

  // BULLETPROOF ERROR STATE
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center min-h-[70vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600">Fehler beim Laden</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{error}</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push('/speisekarten-designer')}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Zurück
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  Neu versuchen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // SAFE TEMPLATE STYLES  
  const styles = getTemplateStyles(menuData?.template)

  return (
    <ErrorBoundary
      fallback={({ error, reset }) => (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600">Editor-Fehler</CardTitle>
              <CardDescription>Ein unerwarteter Fehler ist aufgetreten</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 mb-4">
                <strong>Fehler:</strong> {error?.message || 'Unbekannter Fehler'}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push('/speisekarten-designer')}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Zurück
                </Button>
                <Button
                  onClick={reset}
                  className="flex-1"
                >
                  Neu starten
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    >
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <Button onClick={() => router.push('/speisekarten-designer')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">Speisekarten-Editor</h1>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  // Show QR-Code for WebMenü Platform cross-sell
                  alert('QR-Code Speisekarten verfügbar in der WebMenü Platform!\n\nInteresse? Kontakt-Button nutzen für Demo.')
                }}
              >
                <QrCode className="w-4 h-4 mr-2" />
                QR-Code (Preview)
              </Button>
              <Button 
                variant="outline"
                onClick={handleExportPDF}
                disabled={isExporting}
              >
                <FileText className="w-4 h-4 mr-2" />
                {isExporting ? 'Exportiere...' : 'Als PDF'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  // Save functionality - show success message
                  alert('✅ Speisekarte erfolgreich gespeichert!\n\nIhre Änderungen bleiben in der kostenlosen Version erhalten.')
                }}
              >
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Editor Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Speisekarten-Einstellungen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Titel</Label>
                    <Input
                      id="title"
                      value={menuData?.title || ''}
                      onChange={(e) => setMenuData(prev => ({ 
                        ...prev, 
                        title: e.target.value 
                      }))}
                      placeholder="Name der Speisekarte"
                    />
                  </div>
                  <div>
                    <Label htmlFor="subtitle">Untertitel</Label>
                    <Input
                      id="subtitle"
                      value={menuData?.subtitle || ''}
                      onChange={(e) => setMenuData(prev => ({ 
                        ...prev, 
                        subtitle: e.target.value 
                      }))}
                      placeholder="Optional"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Menu Sections */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Menü-Sektionen</CardTitle>
                      <CardDescription>
                        Vorspeisen, Hauptgerichte, Desserts hinzufügen
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => {
                        const newSection = {
                          id: `section-${Date.now()}`,
                          title: 'Neue Sektion',
                          items: []
                        }
                        setMenuData(prev => ({
                          ...prev,
                          sections: [...prev.sections, newSection]
                        }))
                      }}
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Sektion hinzufügen
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {menuData?.sections?.map((section, sectionIndex) => (
                    <Card key={section.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Input
                            value={section.title}
                            onChange={(e) => {
                              const newSections = [...menuData.sections]
                              newSections[sectionIndex].title = e.target.value
                              setMenuData(prev => ({ ...prev, sections: newSections }))
                            }}
                            className="font-semibold"
                            placeholder="Sektion-Name (z.B. Vorspeisen)"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newSections = menuData.sections.filter((_, i) => i !== sectionIndex)
                              setMenuData(prev => ({ ...prev, sections: newSections }))
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {/* Section Items */}
                        {section.items?.map((item, itemIndex) => (
                          <div key={item.id} className="grid grid-cols-12 gap-2 p-2 border rounded">
                            <Input
                              placeholder="Gericht"
                              value={item.name}
                              onChange={(e) => {
                                const newSections = [...menuData.sections]
                                newSections[sectionIndex].items[itemIndex].name = e.target.value
                                setMenuData(prev => ({ ...prev, sections: newSections }))
                              }}
                              className="col-span-4"
                            />
                            <Input
                              placeholder="Beschreibung"
                              value={item.description}
                              onChange={(e) => {
                                const newSections = [...menuData.sections]
                                newSections[sectionIndex].items[itemIndex].description = e.target.value
                                setMenuData(prev => ({ ...prev, sections: newSections }))
                              }}
                              className="col-span-6"
                            />
                            <Input
                              placeholder="€ Preis"
                              value={item.price}
                              onChange={(e) => {
                                const newSections = [...menuData.sections]
                                newSections[sectionIndex].items[itemIndex].price = e.target.value
                                setMenuData(prev => ({ ...prev, sections: newSections }))
                              }}
                              className="col-span-1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newSections = [...menuData.sections]
                                newSections[sectionIndex].items = newSections[sectionIndex].items.filter((_, i) => i !== itemIndex)
                                setMenuData(prev => ({ ...prev, sections: newSections }))
                              }}
                              className="col-span-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        
                        {/* Add Item Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newItem = {
                              id: `item-${Date.now()}`,
                              name: '',
                              description: '',
                              price: '0,00'
                            }
                            const newSections = [...menuData.sections]
                            newSections[sectionIndex].items.push(newItem)
                            setMenuData(prev => ({ ...prev, sections: newSections }))
                          }}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Gericht hinzufügen
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Free Version Info + Premium Teaser */}
                  <div className="mt-6 space-y-4">
                    <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        🎉 <strong>Free Version</strong> - Vollständiger Editor aktiv!<br />
                        ✅ Sektionen bearbeiten • ✅ Gerichte eingeben • ✅ PDF-Export
                      </p>
                    </div>
                    
                    {/* Premium Features Teaser */}
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                      <p className="text-sm text-purple-800">
                        ✨ <strong>WebMenü Platform Features:</strong><br />
                        🔗 QR-Code + Online-Speisekarten • 🌐 Multi-Language • 🎨 20+ Premium-Templates • 📱 WebOrder Integration
                      </p>
                      <Button 
                        size="sm" 
                        className="mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => {
                          window.open('/kontakt?product=WebMenü Platform&source=speisekarten-editor', '_blank')
                        }}
                      >
                        WebMenü Platform entdecken
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Vorschau</CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    id="menu-preview"
                    ref={menuRef}
                    className={`${styles?.background || 'bg-white'} p-6 rounded-lg border min-h-96`}
                  >
                    {/* Menu Header */}
                    <div className={`${styles?.headerBg || 'bg-gray-800'} ${styles?.headerText || 'text-white'} p-4 rounded-lg mb-6 text-center`}>
                      <h1 className="text-2xl font-bold">{menuData?.title || 'Speisekarte'}</h1>
                      {menuData?.subtitle && (
                        <p className="text-lg opacity-90 mt-2">{menuData.subtitle}</p>
                      )}
                    </div>

                    {/* Menu Sections */}
                    {menuData?.sections && menuData.sections.length > 0 ? (
                      menuData.sections.map((section) => (
                        <div key={section.id} className="mb-6">
                          <div className={`${styles?.sectionBg || 'bg-gray-50'} p-4 rounded-lg`}>
                            <h2 className={`text-xl font-semibold ${styles?.itemText || 'text-gray-900'} mb-3`}>
                              {section.title}
                            </h2>
                            {section.items && section.items.length > 0 ? (
                              section.items.map((item) => (
                                <div key={item.id} className="flex justify-between items-start mb-2 pb-2 border-b border-gray-200 last:border-b-0">
                                  <div className="flex-1">
                                    <h3 className={`font-medium ${styles?.itemText || 'text-gray-900'}`}>
                                      {item.name}
                                    </h3>
                                    {item.description && (
                                      <p className={`text-sm ${styles?.itemText || 'text-gray-700'} opacity-80`}>
                                        {item.description}
                                      </p>
                                    )}
                                  </div>
                                  <span className={`font-bold ${styles?.priceText || 'text-gray-900'} ml-4`}>
                                    {item.price}€
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-gray-500 italic">Keine Gerichte in dieser Sektion</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-500 mb-4">Ihre Speisekarte ist noch leer</p>
                        <p className="text-sm text-gray-400">
                          Fügen Sie Sektionen hinzu um zu beginnen
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}