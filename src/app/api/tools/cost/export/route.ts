import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth-utils';
import { checkUsageLimit, incrementUsage } from '@/lib/usage-utils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    // Check export limit
    const usage = await checkUsageLimit(user.id, 'exports');
    if (usage.exceeded && user.id !== 'demo-user-123') {
      return NextResponse.json({ 
        error: 'Monatliches Export-Limit erreicht',
        showLeadCapture: true,
        limit: usage.limit,
        used: usage.used
      }, { status: 429 });
    }

    const body = await request.json();
    const { startDate, endDate, format = 'pdf' } = body;

    // Get entries for date range
    const entries = await prisma.costEntry.findMany({
      where: {
        userId: user.id,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        category: true
      },
      orderBy: { date: 'desc' }
    });

    // Calculate totals by category
    const categoryTotals: Record<string, number> = {};
    let totalAmount = 0;

    entries.forEach(entry => {
      const catName = entry.category.name;
      categoryTotals[catName] = (categoryTotals[catName] || 0) + entry.amount;
      totalAmount += entry.amount;
    });

    if (format === 'pdf') {
      // Create PDF
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('Kostenbericht', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`${user.company || user.name}`, 20, 30);
      doc.text(`Zeitraum: ${new Date(startDate).toLocaleDateString('de-DE')} - ${new Date(endDate).toLocaleDateString('de-DE')}`, 20, 36);
      
      // Summary
      doc.setFontSize(14);
      doc.text('Zusammenfassung', 20, 50);
      
      // Category breakdown table
      const categoryData = Object.entries(categoryTotals).map(([cat, amount]) => [
        cat,
        `${amount.toFixed(2)} €`,
        `${((amount / totalAmount) * 100).toFixed(1)}%`
      ]);
      
      (doc as any).autoTable({
        startY: 55,
        head: [['Kategorie', 'Betrag', 'Anteil']],
        body: categoryData,
        foot: [['Gesamt', `${totalAmount.toFixed(2)} €`, '100%']],
        theme: 'striped',
        headStyles: { fillColor: [147, 51, 234] }
      });
      
      // Detailed entries
      const currentY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.text('Detaillierte Einträge', 20, currentY);
      
      const entriesData = entries.map(entry => [
        new Date(entry.date).toLocaleDateString('de-DE'),
        entry.category.name,
        entry.description || '-',
        entry.supplier || '-',
        `${entry.amount.toFixed(2)} €`
      ]);
      
      (doc as any).autoTable({
        startY: currentY + 5,
        head: [['Datum', 'Kategorie', 'Beschreibung', 'Lieferant', 'Betrag']],
        body: entriesData,
        theme: 'striped',
        headStyles: { fillColor: [147, 51, 234] },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 30 },
          2: { cellWidth: 60 },
          3: { cellWidth: 40 },
          4: { cellWidth: 25 }
        }
      });
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(
          `Seite ${i} von ${pageCount} | Erstellt mit GastroTools`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }
      
      // Convert to base64
      const pdfBase64 = doc.output('datauristring');
      
      // Update usage
      await incrementUsage(user.id, 'exports');
      
      return NextResponse.json({ pdf: pdfBase64 });
      
    } else if (format === 'csv') {
      // Create CSV
      const csvRows = [
        ['Datum', 'Kategorie', 'Beschreibung', 'Lieferant', 'Rechnungsnr', 'Betrag']
      ];
      
      entries.forEach(entry => {
        csvRows.push([
          new Date(entry.date).toLocaleDateString('de-DE'),
          entry.category.name,
          entry.description || '',
          entry.supplier || '',
          entry.invoiceNo || '',
          entry.amount.toFixed(2)
        ]);
      });
      
      const csvContent = csvRows.map(row => row.join(';')).join('\n');
      const csvBase64 = Buffer.from(csvContent, 'utf-8').toString('base64');
      
      // Update usage
      await incrementUsage(user.id, 'exports');
      
      return NextResponse.json({ 
        csv: `data:text/csv;base64,${csvBase64}`,
        filename: `kostenbericht_${startDate}_${endDate}.csv`
      });
    }

    return NextResponse.json({ error: 'Ungültiges Format' }, { status: 400 });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Exportieren' },
      { status: 500 }
    );
  }
}