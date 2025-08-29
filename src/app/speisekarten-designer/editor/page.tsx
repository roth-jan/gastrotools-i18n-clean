"use client"

import { useState, useRef } from "react"
import { generateQRCode, generateMenuPDF, getMenuPreviewUrl } from "@/lib/menu-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  ArrowLeft, 
  Download, 
  QrCode, 
  Save, 
  Eye, 
  Plus, 
  Type, 
  Image as ImageIcon, 
  Palette, 
  Layout,
  Trash2,
  Copy,
  Move
} from "lucide-react"
import Link from "next/link"

interface MenuSection {
  id: string
  title: string
  items: MenuItem[]
}

interface MenuItem {
  id: string
  name: string
  description?: string
  price: string
  category?: string
}

const INITIAL_MENU_DATA: MenuSection[] = [
  {
    id: "appetizers",
    title: "Vorspeisen",
    items: [
      { id: "1", name: "Bruschetta", description: "Geröstetes Brot mit Tomaten und Basilikum", price: "8,50" },
      { id: "2", name: "Antipasti Platte", description: "Auswahl italienischer Köstlichkeiten", price: "12,90" }
    ]
  },
  {
    id: "mains",
    title: "Hauptgerichte", 
    items: [
      { id: "3", name: "Pasta Carbonara", description: "Hausgemachte Pasta mit Speck und Ei", price: "14,50" },
      { id: "4", name: "Pizza Margherita", description: "Klassisch mit Tomaten, Mozzarella und Basilikum", price: "11,90" }
    ]
  },
  {
    id: "desserts",
    title: "Desserts",
    items: [
      { id: "5", name: "Tiramisu", description: "Hausgemacht mit Mascarpone", price: "6,50" }
    ]
  }
]

export default function MenuEditor() {
  const [menuData, setMenuData] = useState<MenuSection[]>(INITIAL_MENU_DATA)
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [menuTitle, setMenuTitle] = useState("Restaurant Bella Vista")
  const [menuSubtitle, setMenuSubtitle] = useState("Authentische italienische Küche")
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleGenerateQR = async () => {
    try {
      setIsExporting(true)
      const menuUrl = getMenuPreviewUrl("demo-menu-123")
      const qrCode = await generateQRCode(menuUrl)
      setQrCodeUrl(qrCode)
      
      // Create download link
      const link = document.createElement('a')
      link.href = qrCode
      link.download = 'menu-qr-code.png'
      link.click()
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      alert('Fehler beim Erstellen des QR-Codes')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportPDF = async () => {
    try {
      setIsExporting(true)
      await generateMenuPDF('menu-canvas', `${menuTitle.replace(/\s+/g, '-').toLowerCase()}.pdf`)
    } catch (error) {
      console.error('Failed to export PDF:', error)
      alert('Fehler beim PDF-Export')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault()
    if (!draggedItem) return

    // Find and remove item from current section
    let draggedItemData: MenuItem | null = null
    const newMenuData = menuData.map(section => {
      const itemIndex = section.items.findIndex(item => item.id === draggedItem)
      if (itemIndex !== -1) {
        draggedItemData = section.items[itemIndex]
        return {
          ...section,
          items: section.items.filter(item => item.id !== draggedItem)
        }
      }
      return section
    })

    // Add item to target section
    if (draggedItemData) {
      const finalMenuData = newMenuData.map(section => {
        if (section.id === targetSectionId) {
          return {
            ...section,
            items: [...section.items, draggedItemData] as MenuItem[]
          }
        }
        return section
      })
      setMenuData(finalMenuData as MenuSection[])
    }

    setDraggedItem(null)
  }

  const addNewItem = (sectionId: string) => {
    const newItem: MenuItem = {
      id: Date.now().toString(),
      name: "Neues Gericht",
      description: "Beschreibung hinzufügen...",
      price: "0,00"
    }

    setMenuData(menuData.map(section => 
      section.id === sectionId 
        ? { ...section, items: [...section.items, newItem] }
        : section
    ))
  }

  const addNewSection = () => {
    const newSection: MenuSection = {
      id: Date.now().toString(),
      title: "Neue Kategorie",
      items: []
    }
    setMenuData([...menuData, newSection])
  }

  const deleteItem = (sectionId: string, itemId: string) => {
    setMenuData(menuData.map(section =>
      section.id === sectionId
        ? { ...section, items: section.items.filter(item => item.id !== itemId) }
        : section
    ))
  }

  const updateItem = (sectionId: string, itemId: string, field: keyof MenuItem, value: string) => {
    setMenuData(menuData.map(section =>
      section.id === sectionId
        ? {
            ...section,
            items: section.items.map(item =>
              item.id === itemId ? { ...item, [field]: value } : item
            )
          }
        : section
    ))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/speisekarten-designer">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold">Speisekarten Editor</h1>
                <p className="text-sm text-muted-foreground">Elegant Classic Vorlage</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Vorschau
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleGenerateQR}
                disabled={isExporting}
              >
                <QrCode className="h-4 w-4 mr-2" />
                QR-Code
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF Export
              </Button>
              <Button size="sm">
                <Save className="h-4 w-4 mr-2" />
                Speichern
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Toolbar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Design Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm">
                    <Type className="h-4 w-4 mr-2" />
                    Text
                  </Button>
                  <Button variant="outline" size="sm">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Bild
                  </Button>
                  <Button variant="outline" size="sm">
                    <Palette className="h-4 w-4 mr-2" />
                    Farben
                  </Button>
                  <Button variant="outline" size="sm">
                    <Layout className="h-4 w-4 mr-2" />
                    Layout
                  </Button>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Aktionen</h4>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={addNewSection}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Neue Kategorie
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Editor Canvas */}
          <div className="lg:col-span-2">
            <Card className="min-h-[800px]">
              <CardContent className="p-8" id="menu-canvas">
                {/* Menu Header */}
                <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
                  <input
                    type="text"
                    value={menuTitle}
                    onChange={(e) => setMenuTitle(e.target.value)}
                    className="text-3xl font-bold text-center bg-transparent border-none outline-none w-full mb-2"
                    placeholder="Restaurant Name"
                  />
                  <input
                    type="text"
                    value={menuSubtitle}
                    onChange={(e) => setMenuSubtitle(e.target.value)}
                    className="text-lg text-muted-foreground text-center bg-transparent border-none outline-none w-full"
                    placeholder="Untertitel"
                  />
                </div>

                {/* Menu Sections */}
                <div className="space-y-8">
                  {menuData.map((section) => (
                    <div 
                      key={section.id}
                      className="space-y-4"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, section.id)}
                    >
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => {
                            setMenuData(menuData.map(s => 
                              s.id === section.id ? { ...s, title: e.target.value } : s
                            ))
                          }}
                          className="text-2xl font-semibold bg-transparent border-none outline-none"
                          placeholder="Kategorie Name"
                        />
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => addNewItem(section.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Gericht hinzufügen
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {section.items.map((item) => (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.id)}
                            className={`group p-4 rounded-lg border-2 transition-all cursor-move ${
                              selectedElement === item.id 
                                ? 'border-primary bg-primary/5' 
                                : 'border-gray-200 hover:border-gray-300'
                            } ${draggedItem === item.id ? 'opacity-50' : ''}`}
                            onClick={() => setSelectedElement(item.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => updateItem(section.id, item.id, 'name', e.target.value)}
                                    className="font-medium text-lg bg-transparent border-none outline-none flex-1"
                                    placeholder="Gericht Name"
                                  />
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={item.price}
                                      onChange={(e) => updateItem(section.id, item.id, 'price', e.target.value)}
                                      className="font-semibold text-lg text-right bg-transparent border-none outline-none w-20"
                                      placeholder="0,00"
                                    />
                                    <span className="font-semibold text-lg">€</span>
                                  </div>
                                </div>
                                {item.description && (
                                  <textarea
                                    value={item.description}
                                    onChange={(e) => updateItem(section.id, item.id, 'description', e.target.value)}
                                    className="text-muted-foreground bg-transparent border-none outline-none w-full resize-none"
                                    placeholder="Beschreibung..."
                                    rows={2}
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="ghost" className="h-8 w-8">
                                  <Move className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8">
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-red-500 hover:text-red-700"
                                  onClick={() => deleteItem(section.id, item.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Properties Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Eigenschaften</CardTitle>
                <CardDescription>
                  {selectedElement ? 'Element bearbeiten' : 'Kein Element ausgewählt'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedElement ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Schriftgröße</label>
                      <select className="w-full p-2 border rounded-md">
                        <option>Klein</option>
                        <option>Normal</option>
                        <option>Groß</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Schriftart</label>
                      <select className="w-full p-2 border rounded-md">
                        <option>Standard</option>
                        <option>Elegant</option>
                        <option>Modern</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Textfarbe</label>
                      <div className="flex gap-2">
                        <div className="w-8 h-8 bg-black rounded border cursor-pointer"></div>
                        <div className="w-8 h-8 bg-gray-600 rounded border cursor-pointer"></div>
                        <div className="w-8 h-8 bg-primary rounded border cursor-pointer"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Klicken Sie auf ein Element, um es zu bearbeiten
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Vorlage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="font-medium">Aktuelle Vorlage:</span>
                    <br />
                    Elegant Classic
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Vorlage wechseln
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}