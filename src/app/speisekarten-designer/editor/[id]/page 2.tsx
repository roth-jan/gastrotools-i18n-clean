'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navigation } from "@/components/navigation"
import { Save, Download, Plus, Trash2, ArrowLeft, QrCode, FileText, Edit2 } from "lucide-react"
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  allergens?: string
}

interface MenuSection {
  id: string
  name: string
  items: MenuItem[]
}

interface MenuData {
  title: string
  subtitle?: string
  sections: MenuSection[]
  template: string
  qrCode?: string
}

export default function MenuEditor() {
  const router = useRouter()
  const params = useParams()
  const menuRef = useRef<HTMLDivElement>(null)
  
  const [menuData, setMenuData] = useState<MenuData>({
    title: 'Speisekarte',
    subtitle: '',
    sections: [],
    template: 'elegant-classic'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingItem, setEditingItem] = useState<{sectionId: string, itemId: string} | null>(null)

  useEffect(() => {
    loadMenu()
  }, [params.id])

  const loadMenu = async () => {
    try {
      if (params.id === 'new') {
        // New menu
        const template = localStorage.getItem('selectedTemplate') || 'elegant-classic'
        const menuName = localStorage.getItem('menuName') || 'Neue Speisekarte'
        setMenuData({
          title: menuName,
          subtitle: '',
          sections: [],
          template
        })
      } else {
        // Load existing menu
        const response = await fetch(`/api/tools/speisekarten/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setMenuData(data.menu.content)
        }
      }
    } catch (error) {
      console.error('Error loading menu:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addSection = () => {
    const newSection: MenuSection = {
      id: Date.now().toString(),
      name: 'Neue Kategorie',
      items: []
    }
    setMenuData({ ...menuData, sections: [...menuData.sections, newSection] })
  }

  const updateSection = (sectionId: string, name: string) => {
    setMenuData({
      ...menuData,
      sections: menuData.sections.map(section =>
        section.id === sectionId ? { ...section, name } : section
      )
    })
  }

  const deleteSection = (sectionId: string) => {
    setMenuData({
      ...menuData,
      sections: menuData.sections.filter(section => section.id !== sectionId)
    })
  }

  const addItem = (sectionId: string) => {
    const newItem: MenuItem = {
      id: Date.now().toString(),
      name: 'Neues Gericht',
      description: '',
      price: 0
    }
    
    setMenuData({
      ...menuData,
      sections: menuData.sections.map(section =>
        section.id === sectionId
          ? { ...section, items: [...section.items, newItem] }
          : section
      )
    })
  }

  const updateItem = (sectionId: string, itemId: string, updates: Partial<MenuItem>) => {
    setMenuData({
      ...menuData,
      sections: menuData.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
              )
            }
          : section
      )
    })
  }

  const deleteItem = (sectionId: string, itemId: string) => {
    setMenuData({
      ...menuData,
      sections: menuData.sections.map(section =>
        section.id === sectionId
          ? { ...section, items: section.items.filter(item => item.id !== itemId) }
          : section
      )
    })
  }

  const saveMenu = async () => {
    setIsSaving(true)
    try {
      const endpoint = params.id === 'new' 
        ? '/api/tools/speisekarten' 
        : `/api/tools/speisekarten/${params.id}`
      
      const method = params.id === 'new' ? 'POST' : 'PUT'
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: menuData.title,
          template: menuData.template,
          content: menuData
        })
      })

      if (response.ok) {
        const data = await response.json()
        router.push('/speisekarten-designer')
      }
    } catch (error) {
      console.error('Error saving menu:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const generateQRCode = async () => {
    try {
      const menuUrl = `https://gastrotools.de/menu/${params.id}`
      const qrDataUrl = await QRCode.toDataURL(menuUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setMenuData({ ...menuData, qrCode: qrDataUrl })
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const exportPDF = async () => {
    if (!menuRef.current) return

    try {
      const canvas = await html2canvas(menuRef.current, {
        scale: 2,
        logging: false,
        useCORS: true
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`${menuData.title}.pdf`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
    }
  }

  const getTemplateStyles = (template: string = 'elegant-classic') => {
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
      'traditional-gold': {
        background: 'bg-amber-50',
        headerBg: 'bg-amber-800',
        headerText: 'text-amber-50',
        sectionBg: 'bg-amber-100/50',
        itemText: 'text-amber-900',
        priceText: 'text-amber-700'
      },
      'cozy-cafe': {
        background: 'bg-gradient-to-br from-amber-50 to-yellow-50',
        headerBg: 'bg-gradient-to-r from-amber-700 to-yellow-700',
        headerText: 'text-white',
        sectionBg: 'bg-white/90',
        itemText: 'text-gray-800',
        priceText: 'text-yellow-700'
      },
      'modern-minimal': {
        background: 'bg-white',
        headerBg: 'bg-black',
        headerText: 'text-white',
        sectionBg: 'bg-gray-50',
        itemText: 'text-gray-900',
        priceText: 'text-black'
      }
    }
    return templates[template] || templates['elegant-classic'];
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  const styles = getTemplateStyles(menuData.template)

  return (
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
            <Button onClick={generateQRCode} variant="outline">
              <QrCode className="w-4 h-4 mr-2" />
              QR-Code
            </Button>
            <Button onClick={exportPDF} variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Als PDF
            </Button>
            <Button onClick={saveMenu} disabled={isSaving} className="btn-primary">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Speichern...' : 'Speichern'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Allgemeine Informationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Titel</Label>
                  <Input
                    id="title"
                    value={menuData.title}
                    onChange={(e) => setMenuData({ ...menuData, title: e.target.value })}
                    placeholder="z.B. Speisekarte"
                  />
                </div>
                <div>
                  <Label htmlFor="subtitle">Untertitel (optional)</Label>
                  <Input
                    id="subtitle"
                    value={menuData.subtitle}
                    onChange={(e) => setMenuData({ ...menuData, subtitle: e.target.value })}
                    placeholder="z.B. Sommer 2024"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Kategorien & Gerichte</CardTitle>
                  <Button onClick={addSection} size="sm" className="btn-primary">
                    <Plus className="w-4 h-4 mr-1" />
                    Kategorie
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {menuData.sections.map((section) => (
                  <Card key={section.id} className="bg-gray-50">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <Input
                          value={section.name}
                          onChange={(e) => updateSection(section.id, e.target.value)}
                          className="font-semibold"
                        />
                        <Button
                          onClick={() => deleteSection(section.id)}
                          size="sm"
                          variant="ghost"
                          className="text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {section.items.map((item) => (
                        <div key={item.id} className="p-3 bg-white rounded-lg space-y-2">
                          {editingItem?.sectionId === section.id && editingItem?.itemId === item.id ? (
                            <>
                              <Input
                                value={item.name}
                                onChange={(e) => updateItem(section.id, item.id, { name: e.target.value })}
                                placeholder="Gerichtname"
                              />
                              <Input
                                value={item.description}
                                onChange={(e) => updateItem(section.id, item.id, { description: e.target.value })}
                                placeholder="Beschreibung"
                              />
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) => updateItem(section.id, item.id, { price: parseFloat(e.target.value) || 0 })}
                                  placeholder="Preis"
                                  step="0.01"
                                />
                                <Button
                                  onClick={() => setEditingItem(null)}
                                  size="sm"
                                  className="btn-primary"
                                >
                                  Fertig
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium">{item.name}</div>
                                {item.description && (
                                  <div className="text-sm text-gray-600">{item.description}</div>
                                )}
                                <div className="text-sm font-semibold text-orange-600">
                                  {item.price.toFixed(2)} €
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => setEditingItem({ sectionId: section.id, itemId: item.id })}
                                  size="sm"
                                  variant="ghost"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={() => deleteItem(section.id, item.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      <Button
                        onClick={() => addItem(section.id)}
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Gericht hinzufügen
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="sticky top-4">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Vorschau</CardTitle>
                <CardDescription>So sieht Ihre Speisekarte aus</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div
                  ref={menuRef}
                  className={`${styles.background} p-8 min-h-[600px]`}
                >
                  <div className={`${styles.headerBg} ${styles.headerText} p-6 rounded-lg mb-6 text-center`}>
                    <h1 className="text-3xl font-bold mb-2">{menuData.title}</h1>
                    {menuData.subtitle && (
                      <p className="text-lg opacity-90">{menuData.subtitle}</p>
                    )}
                  </div>

                  {menuData.sections.map((section) => (
                    <div key={section.id} className={`${styles.sectionBg} p-6 rounded-lg mb-4`}>
                      <h2 className="text-xl font-bold mb-4 text-center border-b pb-2">
                        {section.name}
                      </h2>
                      <div className="space-y-3">
                        {section.items.map((item) => (
                          <div key={item.id} className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className={`font-medium ${styles.itemText}`}>
                                {item.name}
                              </div>
                              {item.description && (
                                <div className="text-sm text-gray-600 mt-1">
                                  {item.description}
                                </div>
                              )}
                            </div>
                            <div className={`font-semibold ${styles.priceText} ml-4`}>
                              {item.price.toFixed(2)} €
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {menuData.qrCode && (
                    <div className="text-center mt-8">
                      <img
                        src={menuData.qrCode}
                        alt="QR Code"
                        className="mx-auto w-32 h-32"
                      />
                      <p className="text-sm text-gray-600 mt-2">
                        Scannen Sie den QR-Code für die digitale Speisekarte
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
  )
}