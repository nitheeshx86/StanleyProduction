import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CaseData, Marker } from './types';

export const generatePDFReport = (caseData: CaseData, stoneImage?: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // 1. Header (Institutional Info)
    doc.setFillColor(37, 99, 235); // Blue-600
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Govt. Stanley Medical College Hospital, Chennai', margin, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Department of Biochemistry - LithoMap Analysis Report', margin, 25);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, margin, 32);

    let currentY = 50;

    // 2. Patient Information Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Clinical Data', margin, currentY);
    currentY += 8;

    const patient = caseData.patientData || ({} as any);
    const patientDataRows = [
        ['Name', (patient as any).name || 'N/A', 'Age / Sex', `${(patient as any).age || 'N/A'} / ${(patient as any).sex || 'N/A'}`],
        ['Hospital ID', (patient as any).hospitalId || 'N/A', 'Diagnosis', (patient as any).diagnosis || 'N/A'],
        ['Stone Count', (patient as any).stoneCount || 'N/A', 'Size (mm)', (patient as any).size || 'N/A'],
        ['Shape', (patient as any).shape || 'N/A', 'Color', (patient as any).color || 'N/A'],
    ];

    autoTable(doc, {
        startY: currentY,
        head: [],
        body: patientDataRows,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 35 },
            2: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 35 },
        },
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // 3. 3D Spatial Map Image (if provided)
    if (stoneImage) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('3D Spatial Mapping Visualization', margin, currentY);
        currentY += 5;

        // Fit image within widths
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (imgWidth * 9) / 16; // 16:9 aspect ratio placeholder

        doc.addImage(stoneImage, 'PNG', margin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 15;
    }

    // 4. Detailed Composition Table
    if (currentY > 220) {
        doc.addPage();
        currentY = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Composition Marker Catalog', margin, currentY);
    currentY += 8;

    const markerRows: any[] = [];
    caseData.layers.forEach((layer, layerIdx) => {
        layer.markers.forEach((marker) => {
            const compositionStr = marker.composition
                .map(c => `${c.name}: ${c.percentage}%`)
                .join('\n');

            markerRows.push([
                marker.name,
                layer.name,
                `[${marker.position.map(p => p.toFixed(2)).join(', ')}]`,
                marker.elevation > 0 ? `+${marker.elevation.toFixed(2)}` : marker.elevation.toFixed(2),
                compositionStr || 'No data',
                marker.notes || '-'
            ]);
        });
    });

    autoTable(doc, {
        startY: currentY,
        head: [['ID', 'Layer', 'Coordinates (X,Y,Z)', 'Elev.', 'Mineral Composition', 'Notes']],
        body: markerRows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        columnStyles: {
            4: { cellWidth: 40 },
            5: { cellWidth: 40 }
        }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(
            `LithoMap System - Confidential Clinical Report - Page ${i} of ${pageCount}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
        );
    }

    doc.save(`LithoMap_Report_${caseData.name.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
};
