'use client'

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { Download, ArrowLeft } from "lucide-react"
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import Link from 'next/link'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
}

interface MenuSection {
  id: string
  name: string
  items: MenuItem[]
}

interface MenuData {
  name: string
  template: string
  sections: MenuSection[]
}

// Demo-Daten für 3 verschiedene Restaurants
const DEMO_MENUS: MenuData[] = [
  {
    name: "Restaurant Bellevue",
    template: "elegant-classic",
    sections: [
      {
        id: "1",
        name: "Vorspeisen",
        items: [
          { id: "1", name: "Carpaccio vom Rind", description: "Mit Rucola, Parmesan und Balsamico-Reduktion", price: 16.50 },
          { id: "2", name: "Gebratene Jakobsmuscheln", description: "Auf Sellerie-Püree mit Speck-Chips", price: 19.80 },
          { id: "3", name: "Burrata", description: "Mit gegrillten Pfirsichen und Prosciutto", price: 14.90 }
        ]
      },
      {
        id: "2", 
        name: "Hauptgerichte",
        items: [
          { id: "4", name: "Dry Aged Ribeye Steak", description: "300g, mit Rosmarin-Kartoffeln und Gemüse", price: 42.00 },
          { id: "5", name: "Wolfsbarsch-Filet", description: "Auf mediterranem Gemüse mit Olivenöl-Kartoffeln", price: 28.50 },
          { id: "6", name: "Lammkeule", description: "Rosa gebraten, mit Thymian-Jus und Ratatouille", price: 35.80 }
        ]
      },
      {
        id: "3",
        name: "Desserts", 
        items: [
          { id: "7", name: "Crème Brûlée", description: "Klassisch mit Vanille und karamellisiertem Zucker", price: 9.50 },
          { id: "8", name: "Schokoladen-Soufflé", description: "Mit flüssigem Kern und Vanilleeis", price: 12.80 }
        ]
      }
    ]
  },
  {
    name: "Café Luna",
    template: "cozy-cafe",
    sections: [
      {
        id: "1",
        name: "Frühstück",
        items: [
          { id: "1", name: "Eggs Benedict", description: "Pochierte Eier, Schinken, Hollandaise auf English Muffin", price: 12.90 },
          { id: "2", name: "Avocado Toast", description: "Mit Kirschtomaten, Feta und Kürbiskernen", price: 9.80 },
          { id: "3", name: "Pancakes", description: "Mit Ahornsirup, Beeren und Schlagsahne", price: 8.50 }
        ]
      },
      {
        id: "2",
        name: "Kaffeespezialitäten",
        items: [
          { id: "4", name: "Cappuccino", description: "Doppelter Espresso mit aufgeschäumter Milch", price: 3.80 },
          { id: "5", name: "Flat White", description: "Samtige Mikroschaumtextur", price: 4.20 },
          { id: "6", name: "Cold Brew", description: "12h kalt extrahiert, mit Eiswürfeln", price: 4.50 }
        ]
      },
      {
        id: "3",
        name: "Hausgemachte Kuchen",
        items: [
          { id: "7", name: "Cheesecake New York Style", description: "Mit Beerenkompott", price: 6.90 },
          { id: "8", name: "Apfelstrudel", description: "Mit Vanillesauce", price: 5.80 }
        ]
      }
    ]
  },
  {
    name: "Bistro Le Petit",
    template: "french-bistro", 
    sections: [
      {
        id: "1",
        name: "Entrées",
        items: [
          { id: "1", name: "Soupe à l'oignon", description: "Französische Zwiebelsuppe mit Gruyère überbacken", price: 8.90 },
          { id: "2", name: "Escargots de Bourgogne", description: "6 Weinbergschnecken in Knoblauch-Petersilien-Butter", price: 12.50 },
          { id: "3", name: "Pâté de Campagne", description: "Hausgemachte Landpastete mit Cornichons", price: 9.80 }
        ]
      },
      {
        id: "2",
        name: "Plats Principaux", 
        items: [
          { id: "4", name: "Coq au Vin", description: "Huhn in Rotwein geschmort mit Speck und Pilzen", price: 22.50 },
          { id: "5", name: "Bouillabaisse", description: "Mediterrane Fischsuppe mit Rouille und Baguette", price: 26.80 },
          { id: "6", name: "Steak Frites", description: "Rumpsteak mit Pommes und Café de Paris Butter", price: 24.90 }
        ]
      },
      {
        id: "3",
        name: "Fromages & Desserts",
        items: [
          { id: "7", name: "Plateau de Fromages", description: "Auswahl französischer Käse mit Walnüssen", price: 14.50 },
          { id: "8", name: "Tarte Tatin", description: "Gestürzte Apfeltarte mit Calvados-Eis", price: 8.90 }
        ]
      }
    ]
  }
]

export default function SpeisekartenDemo() {
  const [selectedMenu, setSelectedMenu] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const currentMenu = DEMO_MENUS[selectedMenu]

  const exportToPDF = async () => {
    if (!menuRef.current) return
    
    setIsExporting(true)
    try {
      const canvas = await html2canvas(menuRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff'
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

      pdf.save(`${currentMenu.name.replace(/\s+/g, '_')}_Speisekarte.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const getTemplateStyles = (template: string) => {
    switch (template) {
      case 'elegant-classic':
        return {
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          fontFamily: 'serif',
          borderColor: '#6c757d'
        }
      case 'cozy-cafe':
        return {
          background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
          fontFamily: 'sans-serif',
          borderColor: '#ff8f00'
        }
      case 'french-bistro':
        return {
          background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
          fontFamily: 'serif',
          borderColor: '#8e24aa'
        }
      default:
        return {
          background: '#ffffff',
          fontFamily: 'sans-serif',
          borderColor: '#000000'
        }
    }
  }

  const templateStyles = getTemplateStyles(currentMenu.template)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Speisekarten Demo</h1>
            <p className="text-gray-600 mt-2">3 verschiedene Restaurant-Typen</p>
          </div>
          <Link href="/speisekarten-designer">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Menu Selection */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Wähle eine Speisekarte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {DEMO_MENUS.map((menu, index) => (
                  <Button
                    key={index}
                    onClick={() => setSelectedMenu(index)}
                    variant={selectedMenu === index ? "default" : "outline"}
                    className="w-full justify-start"
                  >
                    {menu.name}
                  </Button>
                ))}
                
                <div className="pt-4 border-t">
                  <Button
                    onClick={exportToPDF}
                    disabled={isExporting}
                    className="w-full btn-primary flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {isExporting ? 'Erstelle PDF...' : 'Als PDF exportieren'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Menu Preview */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <div 
                  ref={menuRef}
                  className="p-8 min-h-[800px]"
                  style={{
                    background: templateStyles.background,
                    fontFamily: templateStyles.fontFamily
                  }}
                >
                  {/* Restaurant Header */}
                  <div className="text-center mb-8 pb-6 border-b-2" style={{ borderColor: templateStyles.borderColor }}>
                    <h1 className="text-4xl font-bold mb-2" style={{ color: templateStyles.borderColor }}>
                      {currentMenu.name}
                    </h1>
                    <p className="text-lg text-gray-600">Speisekarte</p>
                  </div>

                  {/* Menu Sections */}
                  {currentMenu.sections.map((section) => (
                    <div key={section.id} className="mb-8">
                      <h2 
                        className="text-2xl font-semibold mb-4 pb-2 border-b"
                        style={{ color: templateStyles.borderColor, borderColor: templateStyles.borderColor }}
                      >
                        {section.name}
                      </h2>
                      
                      <div className="space-y-4">
                        {section.items.map((item) => (
                          <div key={item.id} className="flex justify-between items-start">
                            <div className="flex-1 pr-4">
                              <h3 className="font-semibold text-lg text-gray-800">{item.name}</h3>
                              <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                            </div>
                            <div className="font-bold text-lg" style={{ color: templateStyles.borderColor }}>
                              €{item.price.toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Footer */}
                  <div className="text-center mt-12 pt-6 border-t text-sm text-gray-500">
                    <p>Alle Preise verstehen sich inkl. MwSt.</p>
                    <p className="mt-2">Erstellt mit GastroTools Speisekarten-Designer</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}